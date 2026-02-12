import express from 'express';
import Record from '../models/Record.js';
import User from '../models/User.js';
import DailyToken from '../models/DailyToken.js';
import FarmerToken from '../models/FarmerToken.js';
import { requireAuth } from '../middleware/auth.js';
import { createAuditLog, getClientIp, AuditDescriptions } from '../utils/auditLogger.js';

const router = express.Router();

//  1. SPECIFIC GET ROUTES (Must come first)
router.get('/my-records', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const date = req.query.date; // Expect YYYY-MM-DD

        const skip = (page - 1) * limit;

        // Base query
        const baseQuery = {
            farmer_id: req.user._id,
            parent_record_id: { $exists: false } // Exclude child records
        };

        // Date Filter
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            baseQuery.createdAt = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        // --- HELPER TO ENRICH RECORDS ---
        const enrichMethod = async (records) => {
            const parentIds = records.filter(r => r.is_parent).map(r => r._id);
            let parentMap = {};

            if (parentIds.length > 0) {
                const childRecords = await Record.find({
                    parent_record_id: { $in: parentIds },
                    status: { $in: ['Sold', 'Completed', 'RateAssigned', 'Weighed'] }
                }).sort({ createdAt: 1 });

                childRecords.forEach(child => {
                    const pId = child.parent_record_id.toString();
                    if (!parentMap[pId]) {
                        parentMap[pId] = {
                            splits: [], soldQty: 0, soldNag: 0,
                            allocatedQty: 0, allocatedNag: 0, // Track allocated vs sold separately
                            totalSaleAmount: 0,
                            childCount: 0, soldCount: 0, weightPendingQty: 0, weightPendingNag: 0, weightPendingCount: 0,
                            totalFarmerCommission: 0, totalTraderCommission: 0
                        };
                    }
                    // Weight Pending Logic
                    const isWeightPending = child.status === 'RateAssigned' &&
                        (child.official_qty || 0) === 0 && (child.official_nag || 0) === 0;

                    const childQty = isWeightPending ? (child.allocated_qty || child.quantity || 0) : (child.official_qty || child.quantity || 0);
                    const childNag = isWeightPending ? (child.allocated_nag || child.nag || 0) : (child.official_nag || child.nag || 0);
                    const amount = child.sale_amount || child.total_amount || 0;

                    // Accumulate Commissions
                    const fComm = child.farmer_commission || 0;
                    const tComm = child.trader_commission || 0;

                    if (isWeightPending) {
                        parentMap[pId].weightPendingQty += childQty;
                        parentMap[pId].weightPendingNag += childNag;
                        parentMap[pId].weightPendingCount += 1;
                    } else {
                        parentMap[pId].soldQty += childQty;
                        parentMap[pId].soldNag += childNag;
                        parentMap[pId].totalSaleAmount += amount;
                        // Only add commission for valid sales
                        if (['Sold', 'Completed'].includes(child.status)) {
                            parentMap[pId].totalFarmerCommission += fComm;
                            parentMap[pId].totalTraderCommission += tComm;
                        }
                    }

                    // Live Update Logic:
                    // Inventory used is max(allocated, weighed).
                    // If allocated 5kg, weighed 6kg -> Used 6kg.
                    // If allocated 5kg, weighed 4kg -> Used 5kg (Phantom stock prevention).
                    const allocQty = child.allocated_qty || child.quantity || 0;
                    const officialQty = child.official_qty || 0;
                    parentMap[pId].allocatedQty += Math.max(allocQty, officialQty);

                    const allocNag = child.allocated_nag || child.nag || 0;
                    const officialNag = child.official_nag || 0;
                    parentMap[pId].allocatedNag += Math.max(allocNag, officialNag);

                    parentMap[pId].childCount += 1;
                    if (['Sold', 'Completed'].includes(child.status)) parentMap[pId].soldCount += 1;

                    parentMap[pId].splits.push({
                        _id: child._id, qty: childQty, nag: childNag, rate: child.sale_rate || 0,
                        amount: amount, date: child.sold_at || child.createdAt, status: child.status,
                        isWeightPending: isWeightPending, payment_status: child.farmer_payment_status || 'Pending'
                    });
                });
            }

            return records.map(record => {
                if (record.is_parent) {
                    const data = parentMap[record._id.toString()] || {
                        splits: [], soldQty: 0, soldNag: 0, totalSaleAmount: 0,
                        childCount: 0, soldCount: 0, weightPendingQty: 0, weightPendingNag: 0, weightPendingCount: 0
                    };

                    record.aggregated_sold_qty = data.soldQty;
                    record.aggregated_sold_nag = data.soldNag;
                    record.aggregated_sale_amount = data.totalSaleAmount;
                    // ✅ Map Aggregated Commissions
                    record.aggregated_farmer_commission = data.totalFarmerCommission;
                    record.aggregated_trader_commission = data.totalTraderCommission;

                    record.child_count = data.childCount;
                    record.sold_count = data.soldCount;
                    record.splits = data.splits;

                    const totalSold = record.sale_unit === 'nag' ? data.soldNag : data.soldQty;
                    record.aggregated_avg_rate = totalSold > 0 ? (data.totalSaleAmount / totalSold) : 0;

                    record.awaiting_qty = (record.quantity || 0) - data.soldQty;
                    record.awaiting_nag = (record.nag || 0) - data.soldNag;

                    record.weight_pending_qty = data.weightPendingQty;
                    record.weight_pending_nag = data.weightPendingNag;

                    const soldSplits = data.splits.filter(s => ['Sold', 'Completed'].includes(s.status));
                    const hasUnpaid = soldSplits.some(s => s.payment_status === 'Pending');
                    record.aggregated_payment_status = hasUnpaid ? 'Pending' : 'Paid';

                    // Compute Status
                    const totalQty = record.quantity || 0;
                    const totalNag = record.nag || 0;
                    const hasWeightPending = data.weightPendingQty > 0.01 || data.weightPendingNag > 0.01;
                    const hasSoldSomething = data.soldQty > 0.01 || data.soldNag > 0.01;
                    // Fix: Use allocatedQty for remaining check to avoid phantom stock if weight < allocation
                    const hasRemaining = (totalQty > 0 && data.allocatedQty < totalQty - 0.01) ||
                        (totalNag > 0 && data.allocatedNag < totalNag - 0.01);

                    if (hasWeightPending && !hasSoldSomething) record.display_status = 'WeightPending';
                    else if (hasWeightPending && hasSoldSomething) record.display_status = 'WeightPending';
                    else if (hasSoldSomething && hasRemaining) record.display_status = 'Partial';
                    else if (hasSoldSomething && !hasRemaining) record.display_status = 'Sold';
                    else record.display_status = 'Pending';
                } else {
                    // Normal record
                    record.display_status = record.status;
                }
                return record;
            });
        };

        // --- FILTERING LOGIC ---
        // If 'All' simply use DB pagination (fastest)
        // If Filtering by status, we must fetch candidates, enrich, filter in memory, THEN paginate
        // to avoid "Partial" records showing up in "Pending" results etc.

        if (!status || status === 'All') {
            const totalRecords = await Record.countDocuments(baseQuery);
            const rawRecords = await Record.find(baseQuery)
                .populate('farmer_id', 'full_name phone farmerId location')
                .select('-trader_id -trader_payment_ref -trader_payment_mode -trader_payment_status -net_receivable_from_trader -trader_commission')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const records = await enrichMethod(rawRecords);

            return res.json({
                records,
                pagination: { totalRecords, totalPages: Math.ceil(totalRecords / limit), currentPage: page, limit }
            });
        }

        // STRICT FILTERING
        // Fetch ALL candidates that *might* match.

        let dbStatusQuery = {};

        if (status === 'Pending') {
            // Pending records are strictly 'Pending' in DB
            dbStatusQuery.status = 'Pending';
        } else if (status === 'Sold' || status === 'Payment Pending') {
            // Both Sold and Payment Pending depend on records being 'Sold' or 'Completed' in DB
            dbStatusQuery.status = { $in: ['Sold', 'Completed'] };
        } else if (status === 'Partial' || status === 'WeightPending') {
            // Partial and WeightPending records are ALWAYS Parent records (split lots)
            dbStatusQuery.is_parent = true;
        }

        // We fetch ALL matching candidates (without pagination limit) to filter correctly in memory
        const candidateRecords = await Record.find({ ...baseQuery, ...dbStatusQuery })
            .populate('farmer_id', 'full_name phone farmerId location')
            .select('-trader_id -trader_payment_ref -trader_payment_mode -trader_payment_status -net_receivable_from_trader -trader_commission')
            .sort({ createdAt: -1 })
            .lean();

        const enrichedCandidates = await enrichMethod(candidateRecords);

        // Filter based on COMPUTED display_status and Payment Status
        const filteredRecords = enrichedCandidates.filter(r => {
            if (status === 'Payment Pending') {
                // strict logic: Must be visually 'Sold' sales-wise, but 'Pending' payment-wise
                const isSold = r.display_status === 'Sold';
                // Check payment status (aggregated for parents, direct for others)
                const paymentStatus = r.is_parent ? r.aggregated_payment_status : r.farmer_payment_status;
                return isSold && paymentStatus === 'Pending';
            }
            if (status === 'Sold') {
                // strict logic: Must be visually 'Sold' sales-wise AND 'Paid' (not Pending)
                const isSold = r.display_status === 'Sold';
                const paymentStatus = r.is_parent ? r.aggregated_payment_status : r.farmer_payment_status;
                return isSold && paymentStatus !== 'Pending';
            }
            // Fallback for Pending, Partial, etc.
            return r.display_status === status;
        });

        // Paginate manually
        const totalRecords = filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / limit);
        const paginatedRecords = filteredRecords.slice(skip, skip + limit);

        res.json({
            records: paginatedRecords,
            pagination: { totalRecords, totalPages, currentPage: page, limit }
        });

    } catch (error) {
        console.error('Fetch my records error:', error);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

/**
 * GET /api/records/my-stats
 * Fetch global statistics for the logged-in farmer
 * Aggregates data across ALL records (not just paginated ones)
 */
router.get('/my-stats', requireAuth, async (req, res) => {
    try {
        const farmerId = req.user._id;

        const stats = await Record.aggregate([
            { $match: { farmer_id: farmerId } }, // Match all records for this farmer
            {
                $group: {
                    _id: null,
                    totalEarnings: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', ['Sold', 'Completed']] },
                                '$sale_amount',
                                0
                            ]
                        }
                    },
                    // Sum volume from top-level records only to avoid double-counting split lots
                    totalVolumeKg: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $ifNull: ['$parent_record_id', null] }, null] },
                                '$quantity',
                                0
                            ]
                        }
                    },
                    totalVolumeNag: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $ifNull: ['$parent_record_id', null] }, null] },
                                '$nag',
                                0
                            ]
                        }
                    },
                    // Count actual sales (excluding parent lot records)
                    totalSalesCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $in: ['$status', ['Sold', 'Completed']] },
                                        { $ne: ['$is_parent', true] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    pendingLotsCount: {
                        $sum: {
                            // Count pending if status is Pending OR (Split Lot Parent and display_status is Pending)
                            // Since display_status is computed, we rely on core status 'Pending'
                            // For accuracy with split lots, we simply count 'Pending' records
                            $cond: [
                                { $eq: ['$status', 'Pending'] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const result = stats.length > 0 ? stats[0] : { totalEarnings: 0, totalVolumeKg: 0, totalVolumeNag: 0, totalSalesCount: 0, pendingLotsCount: 0 };

        res.json(result);
    } catch (error) {
        console.error('Fetch stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

/**
 * GET /api/records/download-report
 * Download full sales history as CSV for Farmer
 */
router.get('/download-report', requireAuth, async (req, res) => {
    try {
        const farmerId = req.user._id;

        // Fetch ALL Sold/Completed records for this farmer
        // Exclude parent records to avoid duplication (show actual sales)
        const records = await Record.find({
            farmer_id: farmerId,
            status: { $in: ['Sold', 'Completed'] },
            is_parent: { $ne: true }
        })
            .sort({ sold_at: -1 })
            .populate('trader_id', 'full_name business_name');

        const formattedRecords = records.map(record => {
            const date = record.sold_at ? new Date(record.sold_at) : new Date(record.createdAt);

            // Determine payment status
            const payStatus = record.farmer_payment_status || (record.payment_status === 'paid' ? 'Paid' : 'Pending');

            return {
                date: date.toLocaleDateString('en-IN'),
                time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                crop: record.vegetable,
                qty: record.official_qty || record.quantity || 0,
                nag: record.official_nag || record.nag || 0,
                rate: record.sale_rate || 0,
                amount: record.sale_amount || 0,
                commission: record.farmer_commission || 0,
                net_payable: record.net_payable_to_farmer || ((record.sale_amount || 0) - (record.farmer_commission || 0)),
                // trader: record.trader_id?.business_name || record.trader_id?.full_name || 'Unknown', // REMOVED PRIVACY
                status: record.status,
                payment_status: payStatus
            };
        });

        const { Parser } = await import('json2csv');

        const fields = [
            { label: 'Date', value: 'date' },
            { label: 'Time', value: 'time' },
            { label: 'Crop', value: 'crop' },
            { label: 'Quantity (kg)', value: 'qty' },
            { label: 'Nag', value: 'nag' },
            { label: 'Rate/kg', value: 'rate' },
            { label: 'Sale Amount', value: 'amount' },
            { label: 'Commission', value: 'commission' },
            { label: 'Net Payable', value: 'net_payable' },
            // { label: 'Trader', value: 'trader' }, // REMOVED
            { label: 'Payment Status', value: 'payment_status' }
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(formattedRecords);

        res.header('Content-Type', 'text/csv');
        // Sanitized filename
        const safeName = req.user.full_name ? req.user.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'farmer';
        res.header('Content-Disposition', `attachment; filename=farmer_report_${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
        res.status(200).send(csv);

    } catch (error) {
        console.error('Download report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

/**
 * GET /api/records/my-purchases
 * Fetch all purchases for the logged-in trader
 * PRIVACY: Exclude farmer details
 * Supports pagination
 */
router.get('/my-purchases', requireAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        const query = { trader_id: req.user._id, status: { $in: ['Sold', 'Completed'] } };

        const [records, total] = await Promise.all([
            Record.find(query)
                .select('-farmer_id -farmer_payment_ref -farmer_payment_mode -farmer_payment_status -net_payable_to_farmer -farmer_commission')
                .sort({ sold_at: -1 })
                .skip(skip)
                .limit(limitNum),
            Record.countDocuments(query)
        ]);

        res.json({
            data: records,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            hasMore: pageNum * limitNum < total
        });
    } catch (error) {
        console.error('Fetch my purchases error:', error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
});

/**
 * PATCH /api/records/:id/payment-status
 * Update payment status (Committee Only)
 */
router.patch('/:id/payment-status', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, status, mode, ref } = req.body; // type: 'farmer' or 'trader'

        if (!['farmer', 'trader'].includes(type)) {
            return res.status(400).json({ error: 'Invalid payment type' });
        }

        const updateField = type === 'farmer' ? 'farmer_payment_status' : 'trader_payment_status';
        const modeField = type === 'farmer' ? 'farmer_payment_mode' : 'trader_payment_mode';
        const refField = type === 'farmer' ? 'farmer_payment_ref' : 'trader_payment_ref';
        const dateField = type === 'farmer' ? 'farmer_payment_date' : 'trader_payment_date';

        const updateData = {
            [updateField]: status,
            [modeField]: mode || '',
            [refField]: ref || ''
        };

        if (status === 'Paid') {
            updateData[dateField] = new Date();
        }

        const record = await Record.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // AUDIT LOG: Track payment status change
        await createAuditLog({
            user: req.user,
            action: 'update',
            entityType: 'payment',
            entityId: record._id,
            description: AuditDescriptions.paymentStatus(type, status, type === 'farmer' ? 'Farmer' : 'Trader'),
            changes: { [updateField]: { old: 'Pending', new: status }, mode, ref },
            ipAddress: getClientIp(req)
        });

        res.json(record);
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

/**
 * GET /api/records/search-farmer
 * Search farmer by phone (for weight staff)
 */
router.get('/search-farmer', requireAuth, async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ error: 'Phone number required' });
        }

        const farmer = await User.findOne({
            phone: { $regex: phone }, // Partial match
            role: 'farmer'
        });

        if (!farmer) {
            return res.status(404).json({ error: 'Farmer not found' });
        }

        res.json(farmer);
    } catch (error) {
        console.error('Search farmer error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /api/records/search-by-token
 * Search farmer and their records by today's token number (for Lilav/Weight staff)
 */
router.get('/search-by-token', requireAuth, async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ error: 'Token number required' });
        }

        const tokenNum = parseInt(token);
        if (isNaN(tokenNum) || tokenNum <= 0) {
            return res.status(400).json({ error: 'Invalid token number' });
        }

        const today = new Date().toISOString().split('T')[0];

        // Find the farmer with this token for today
        const farmerToken = await FarmerToken.findOne({ date: today, token_number: tokenNum });

        if (!farmerToken) {
            return res.status(404).json({ error: 'No farmer found with this token for today' });
        }

        // Get farmer details
        const farmer = await User.findById(farmerToken.farmer_id).select('full_name phone farmerId location');

        if (!farmer) {
            return res.status(404).json({ error: 'Farmer not found' });
        }

        // Get today's pending records for this farmer
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const pendingRecords = await Record.find({
            farmer_id: farmerToken.farmer_id,
            status: { $in: ['Pending', 'RateAssigned', 'Weighed'] },
            createdAt: { $gte: todayStart, $lte: todayEnd }
        }).sort({ createdAt: -1 });

        res.json({
            farmer: {
                _id: farmer._id,
                full_name: farmer.full_name,
                phone: farmer.phone,
                farmerId: farmer.farmerId,
                location: farmer.location,
                token: tokenNum
            },
            records: pendingRecords
        });
    } catch (error) {
        console.error('Search by token error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /api/records/my-token
 * Get the logged-in farmer's token for today
 */
router.get('/my-token', requireAuth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const farmerId = req.user._id;

        const farmerToken = await FarmerToken.findOne({ date: today, farmer_id: farmerId });

        if (!farmerToken) {
            return res.json({ token: null, message: 'No token assigned yet. Add a record to get your token.' });
        }

        res.json({ token: farmerToken.token_number, date: today });
    } catch (error) {
        console.error('Get my token error:', error);
        res.status(500).json({ error: 'Failed to fetch token' });
    }
});

/**
 * GET /api/records/pending/:farmerId
 * Get pending records for a farmer (Specific param route)
 * Also includes parent records that have remaining quantity to sell (partial sales)
 */
router.get('/pending/:farmerId', requireAuth, async (req, res) => {
    try {
        const { farmerId } = req.params;

        // Get regular pending records (not split/child records)
        const pendingRecords = await Record.find({
            farmer_id: farmerId,
            status: 'Pending',
            parent_record_id: { $exists: false } // Exclude child records
        }).sort({ createdAt: -1 }).lean();

        // Get parent records that might have remaining quantity
        const parentRecords = await Record.find({
            farmer_id: farmerId,
            is_parent: true
        }).lean();

        // For each parent record, calculate remaining quantity from children
        const enrichedParentRecords = [];
        for (const parent of parentRecords) {
            // Get child records for this parent
            const children = await Record.find({ parent_record_id: parent._id });

            // Calculate sold quantity and find previous rate
            // Calculate sold quantity and find previous rate
            let soldQty = 0;
            let soldNag = 0;
            let prevRate = 0;
            const splits = []; // New: Collect split details
            let totalAmountSum = 0; // New: Sum of all amounts

            for (const child of children) {
                // Include RateAssigned and Weighed as 'sold'/allocated so they don't show up as pending
                if (['Sold', 'Completed', 'RateAssigned', 'Weighed'].includes(child.status)) {
                    const childQty = child.official_qty || child.quantity || 0;
                    const childNag = child.official_nag || child.nag || 0;


                    soldQty += childQty;
                    soldNag += childNag;

                    // New: Calculate allocated qty for remaining check
                    // child.quantity IS the allocated/estimated quantity
                    const allocQty = child.allocated_qty || child.quantity || 0;
                    const allocNag = child.allocated_nag || child.nag || 0;

                    // We reuse the variables above but need separate tracking for pending logic?
                    // The pending logic uses soldQty to calculate remaining.
                    // Let's Override soldQty logic for the remaining calculation purpose within this loop?
                    // No, soldQty is sent to frontend as 'sold_qty'. We should keep that accurate (official).
                    // But we should use allocated for 'remaining_qty' calc.

                    child.allocated_qty_temp = allocQty; // Store temp for reduction
                    child.allocated_nag_temp = allocNag;

                    // Capture rate from first sold child to lock it for subsequent splits (legacy behavior, kept for reference)
                    if (!prevRate && child.sale_rate) {
                        prevRate = child.sale_rate;
                    }

                    // Add to splits array
                    splits.push({
                        _id: child._id,
                        qty: childQty,
                        nag: childNag,
                        rate: child.sale_rate || 0,
                        amount: child.sale_amount || child.total_amount || 0, // Fallback
                        date: child.sold_at || child.createdAt,
                        trader: child.trader_id, // Will be populated if available
                        status: child.status
                    });

                    totalAmountSum += (child.sale_amount || child.total_amount || 0);
                }
            }


            // Calculate remaining using MAX(allocated, official) quantity
            // This ensures live updates (if 6kg weighed vs 5kg allocated -> deduct 6kg)
            // And prevents phantom stock (if 4kg weighed vs 5kg allocated -> deduct 5kg)
            const totalUsedQty = children.reduce((sum, c) => {
                const alloc = c.allocated_qty || c.quantity || 0;
                const official = c.official_qty || 0;
                return sum + Math.max(alloc, official);
            }, 0);

            const totalUsedNag = children.reduce((sum, c) => {
                const alloc = c.allocated_nag || c.nag || 0;
                const official = c.official_nag || 0;
                return sum + Math.max(alloc, official);
            }, 0);

            const remainingQty = (parent.quantity || 0) - totalUsedQty;
            const remainingNag = (parent.nag || 0) - totalUsedNag;

            // Only include if there's remaining quantity to sell
            if (remainingQty > 0.01 || remainingNag > 0.01) {
                enrichedParentRecords.push({
                    ...parent,
                    remaining_qty: parseFloat(remainingQty.toFixed(2)),
                    remaining_nag: parseFloat(remainingNag.toFixed(2)),
                    sold_qty: parseFloat(soldQty.toFixed(2)),
                    sold_nag: parseFloat(soldNag.toFixed(2)),
                    has_remaining: true,
                    prev_rate: prevRate, // Send previous rate to frontend
                    splits: splits, // New: Send split details
                    total_amount_sum: totalAmountSum // New: Total amount
                });
            }
        }

        // Combine both lists
        const allRecords = [...pendingRecords, ...enrichedParentRecords];

        res.json(allRecords);
    } catch (error) {
        console.error('Fetch pending records error:', error);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

// ==========================================
//  2. POST ROUTES
// ==========================================

/**
 * POST /api/records/add
 * Farmer adds new records
 */
router.post('/add', requireAuth, async (req, res) => {
    try {
        const { market, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // --- DAILY TOKEN LOGIC ---
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const farmerId = req.user._id;
        let tokenNumber;

        // Check if farmer already has a token for today
        let existingToken = await FarmerToken.findOne({ date: today, farmer_id: farmerId });

        if (existingToken) {
            tokenNumber = existingToken.token_number;
        } else {
            // Atomically increment the daily counter and get next token
            const dailyCounter = await DailyToken.findOneAndUpdate(
                { date: today },
                { $inc: { count: 1 } },
                { upsert: true, new: true }
            );
            tokenNumber = dailyCounter.count;

            // Create the FarmerToken record
            await FarmerToken.create({
                date: today,
                farmer_id: farmerId,
                token_number: tokenNumber
            });
        }
        // --- END TOKEN LOGIC ---

        const recordsToCreate = items.map(item => ({
            farmer_id: farmerId,
            market: market,
            vegetable: item.vegetable,
            quantity: item.quantity,
            nag: item.nag || 0,
            sale_unit: (item.nag && item.nag > 0) ? 'nag' : 'kg',
            status: 'Pending',
            qtySold: 0,
            rate: 0,
            totalAmount: 0,
            trader: '-',
            token: tokenNumber // Assign daily token
        }));

        const savedRecords = await Record.insertMany(recordsToCreate);
        res.status(201).json(savedRecords);

    } catch (error) {
        console.error('Add record error:', error);
        res.status(500).json({ error: 'Failed to add records' });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { market, quantity, nag } = req.body;

        const record = await Record.findOneAndUpdate(
            { _id: req.params.id, farmer_id: req.user._id },
            { market, quantity, nag: nag || 0 },
            { new: true }
        );

        if (!record) return res.status(404).json({ error: 'Record not found' });
        res.json(record);
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

/**
 * DELETE /api/records/:id
 * Delete a pending record
 */
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const record = await Record.findOneAndDelete({
            _id: req.params.id,
            farmer_id: req.user._id
        });

        if (!record) {
            return res.status(404).json({ error: 'Record not found or unauthorized' });
        }
        res.json({ message: 'Record deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

/**
 * PATCH /api/records/:id/weight
 * Update weight (official_qty)
 */
router.patch('/:id/weight', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { official_qty, official_nag } = req.body;
        // Import notification service dynamically to avoid circular dependencies if any
        const { createNotification } = await import('../services/notificationService.js');

        if (official_qty == null && official_nag == null) {
            return res.status(400).json({ error: 'Weight or Nag required' });
        }

        const record = await Record.findByIdAndUpdate(
            id,
            {
                official_qty,
                official_nag: official_nag || 0,
                status: 'Weighed',
                weighed_by: req.user._id,
                weighed_at: new Date()
            },
            { new: true }
        );

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // TRIGGER NOTIFICATION: Weight Recorded
        if (record.farmer_id) {
            await createNotification({
                recipient: record.farmer_id,
                type: 'info',
                title: 'Weight Recorded',
                message: `Your produce (${record.vegetable}) has been weighed: ${record.official_qty} kg / ${record.official_nag} nag.`,
                data: { recordId: record._id, type: 'weight' }
            });
        }

        res.json(record);
    } catch (error) {
        console.error('Update weight error:', error);
        res.status(500).json({ error: 'Failed to update weight' });
    }
});


/**
 * GET /api/records/farmer/:farmerId/history
 * Get all history for a specific farmer (Committee View)
 */
router.get('/farmer/:farmerId/history', requireAuth, async (req, res) => {
    try {
        const { farmerId } = req.params;

        // Fetch all records for this farmer (exclude parent records)
        const records = await Record.find({
            farmer_id: farmerId,
            is_parent: { $ne: true } // Exclude parent records, show only actual sales
        })
            .populate('trader_id', 'full_name business_name phone')
            .sort({ createdAt: -1 });

        // Calculate Stats
        let totalRevenue = 0;
        let totalQuantity = 0;
        let totalNag = 0;
        let pendingPayment = 0;
        const vegetableStats = {};

        records.forEach(record => {
            // Only count Sold items for revenue
            if (record.status === 'Sold' || record.status === 'Completed') {
                // Use net_payable_to_farmer for accurate revenue (after tax deduction)
                totalRevenue += record.net_payable_to_farmer || ((record.total_amount || 0) - (record.farmer_commission || 0));

                // Track pending payments
                if (record.farmer_payment_status === 'Pending') {
                    pendingPayment += record.net_payable_to_farmer || 0;
                }
            }

            // Count quantity (official weight preferred, else estimated)
            const qty = record.official_qty || record.quantity || 0;
            const nag = record.official_nag || record.nag || 0;
            totalQuantity += qty;
            totalNag += nag;

            // Vegetable stats
            if (!vegetableStats[record.vegetable]) {
                vegetableStats[record.vegetable] = {
                    name: record.vegetable,
                    quantity: 0,
                    nag: 0,
                    count: 0,
                    revenue: 0
                };
            }
            vegetableStats[record.vegetable].quantity += qty;
            vegetableStats[record.vegetable].nag += nag;
            vegetableStats[record.vegetable].count += 1;
            if (record.status === 'Sold') {
                vegetableStats[record.vegetable].revenue += record.total_amount || 0;
            }
        });

        res.json({
            records,
            stats: {
                totalRevenue,
                totalQuantity,
                totalNag,
                pendingPayment,
                vegetableSummary: Object.values(vegetableStats)
            }
        });

    } catch (error) {
        console.error('Fetch farmer history error:', error);
        res.status(500).json({ error: 'Failed to fetch farmer history' });
    }
});


/**
 * GET /api/records/weighed/:farmerId
 * Get weighed records for a farmer (today only for Lilav)
 */
router.get('/weighed/:farmerId', requireAuth, async (req, res) => {
    try {
        const { farmerId } = req.params;

        // Get start and end of today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const records = await Record.find({
            farmer_id: farmerId,
            status: 'Weighed',
            weighed_at: { $gte: todayStart, $lte: todayEnd }
        }).sort({ createdAt: -1 });

        res.json(records);
    } catch (error) {
        console.error('Fetch weighed records error:', error);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

/**
 * GET /api/records/all-weighed
 * Get all weighed records (for Lilav dashboard)
 */
router.get('/all-weighed', requireAuth, async (req, res) => {
    try {
        const records = await Record.find({
            status: 'Weighed'
        })
            .populate('farmer_id', 'full_name phone')
            .sort({ createdAt: -1 });

        res.json(records);
    } catch (error) {
        console.error('Fetch all weighed records error:', error);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

/**
 * PATCH /api/records/:id/sell
 * Assign Rate and Trader(s) (Committee Step 1)
 * Supports multiple trader allocations - creates split records
 * Moves Status: Pending -> RateAssigned
 */
router.patch('/:id/sell', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { allocations, sale_unit, trader_id, sale_rate } = req.body;

        console.log('=== SELL ENDPOINT CALLED ===');
        console.log('Record ID:', id);
        console.log('Allocations:', JSON.stringify(allocations, null, 2));
        console.log('Sale Unit:', sale_unit);

        // Get the original record
        const record = await Record.findById(id);

        if (!record) {
            console.log('ERROR: Record not found');
            return res.status(404).json({ error: 'Record not found' });
        }

        console.log('Record found:', record.lot_id, 'Status:', record.status);

        // Allow 'Pending', 'Weighed', or 'RateAssigned' records to be assigned a rate
        // Exception: Parent records that are 'Completed' (split lots) can still be sold if they have remaining quantity
        const allowedStatuses = ['Pending', 'Weighed', 'RateAssigned'];
        if (record.is_parent) allowedStatuses.push('Completed');

        if (!allowedStatuses.includes(record.status)) {
            console.log('ERROR: Invalid status', record.status);
            return res.status(400).json({ error: `Record status is ${record.status}. Must be Pending or Weighed to assign rate.` });
        }

        // Check if we have multiple allocations (new multi-trader flow)
        if (allocations && Array.isArray(allocations) && allocations.length > 0) {
            console.log('Multi-trader flow detected with', allocations.length, 'allocations');
            // Multi-trader allocation flow

            let alreadySold = 0;
            // If it's already a parent record, subtract what's already been sold to child records
            // This `alreadySold` is a bit ambiguous as it doesn't specify unit.
            // It's used in the `availableKg` and `availableNag` calculations below
            // with an `approx check`. This might need refinement if `alreadySold`
            // needs to be unit-specific. For now, keeping it as is from the original context.
            if (record.is_parent) {
                const existingChildren = await Record.find({ parent_record_id: record._id });
                for (const child of existingChildren) {
                    if (['Sold', 'Completed', 'RateAssigned', 'Weighed'].includes(child.status)) {
                        const childQty = (child.official_qty || child.quantity || child.official_nag || child.nag || 0);
                        alreadySold += childQty;
                    }
                }
            }

            // Calculate availability for BOTH units
            const availableKg = (record.official_qty || record.quantity || 0) -
                (record.sale_unit === 'kg' && record.is_parent ? alreadySold : 0); // Approx check for alreadySold

            const availableNag = (record.official_nag || record.nag || 0) -
                (record.sale_unit === 'nag' && record.is_parent ? alreadySold : 0);

            // Determine intention
            const totalAllocated = allocations.reduce((sum, a) => sum + parseFloat(a.quantity || 0), 0);

            // Initial assumption from request or record
            let targetUnit = sale_unit || (availableNag > 0 ? 'nag' : 'kg');
            let totalAvailable = targetUnit === 'nag' ? availableNag : availableKg;

            // SMART FIX: If selected unit has 0 availability (or less than allocated) BUT other unit has enough
            // explicitly switch to the other unit.
            // This handles mismatch where frontend sends 'nag' but we only have 'kg', or vice versa.
            if (totalAvailable < totalAllocated) {
                const otherUnit = targetUnit === 'nag' ? 'kg' : 'nag';
                const otherAvailable = targetUnit === 'nag' ? availableKg : availableNag;

                console.log(`Mismatch detected! Requested ${targetUnit} (${totalAvailable}) < Allocated (${totalAllocated}). Checking ${otherUnit} (${otherAvailable})...`);

                if (otherAvailable >= totalAllocated - 0.01) {
                    console.log(`Substituted unit to ${otherUnit} to allow sale.`);
                    targetUnit = otherUnit;
                    totalAvailable = otherAvailable;
                }
            }

            const isNag = targetUnit === 'nag';

            // Use small epsilon for floating point comparison
            if (totalAllocated > totalAvailable + 0.01) {
                console.error(`FAIL: Allocated ${totalAllocated} > Available ${totalAvailable} (${targetUnit})`);
                return res.status(400).json({
                    error: `Total allocated (${totalAllocated}) exceeds available quantity (${parseFloat(totalAvailable.toFixed(2))})`
                });
            }

            // Ensure parent record has a lot_id
            let parentLotId = record.lot_id;
            if (!parentLotId) {
                const currentYear = new Date().getFullYear();
                const count = await Record.countDocuments();
                parentLotId = `LOT-${currentYear}-${(count + 1).toString().padStart(3, '0')}`;
                record.lot_id = parentLotId;
                console.log('Generated parent lot_id:', parentLotId);
            }

            // Create child records for each allocation
            const createdRecords = [];
            // isNag is already determined above

            for (let i = 0; i < allocations.length; i++) {
                const allocation = allocations[i];

                // Generate unique lot_id for this child using timestamp to ensure uniqueness
                const suffix = String.fromCharCode(65 + i); // A, B, C, etc.
                const timestamp = Date.now();
                const childLotId = `${parentLotId}-${suffix}-${timestamp}`;

                console.log(`Creating child record ${i}: lot_id=${childLotId}, trader=${allocation.trader_id}, qty=${allocation.quantity}`);

                // Create a new child record for this trader
                // NOTE: official_qty and official_nag are left as 0 - weight staff will fill them
                const childRecord = new Record({
                    farmer_id: record.farmer_id,
                    vegetable: record.vegetable,
                    market: record.market,
                    quantity: isNag ? 0 : parseFloat(allocation.quantity), // Estimated/allocated qty
                    nag: isNag ? parseFloat(allocation.quantity) : 0,
                    // official_qty/official_nag left as default 0 - to be filled by weight staff
                    allocated_qty: isNag ? 0 : parseFloat(allocation.quantity),
                    allocated_nag: isNag ? parseFloat(allocation.quantity) : 0,
                    trader_id: allocation.trader_id,
                    sale_rate: parseFloat(allocation.rate),
                    sale_unit: targetUnit,
                    status: 'RateAssigned',
                    parent_record_id: record._id,
                    is_parent: false,
                    lot_id: childLotId, // Set lot_id here so pre-save hook skips
                    token: record.token // Propagate daily token to child record
                });

                try {
                    await childRecord.save();
                    console.log(`Child record ${i} saved successfully`);
                } catch (saveError) {
                    console.error('Error saving child record:', saveError.message);
                    console.error('Full error:', saveError);
                    throw saveError;
                }

                // Populate trader info for response
                await childRecord.populate('trader_id', 'full_name phone business_name');
                createdRecords.push(childRecord);
            }

            // Mark the parent record as split and completed
            record.is_parent = true;
            record.status = 'Completed';
            await record.save();

            // AUDIT LOG: Track lilav entry
            await createAuditLog({
                user: req.user,
                action: 'create',
                entityType: 'lilav',
                entityId: record._id,
                description: AuditDescriptions.createLilav(
                    record.farmer_id?.full_name || 'Farmer',
                    record.vegetable,
                    `${allocations.length} traders`,
                    allocations.reduce((sum, a) => sum + (parseFloat(a.quantity) * parseFloat(a.rate)), 0)
                ),
                changes: { allocations: allocations.length, traders: allocations.map(a => a.trader_id) },
                ipAddress: getClientIp(req)
            });

            res.json({
                message: `Lot split successfully among ${allocations.length} traders`,
                parentRecord: record,
                childRecords: createdRecords
            });

        } else {
            // Legacy single-trader flow (backward compatible)
            if (!trader_id || sale_rate == null) {
                return res.status(400).json({ error: 'Trader and sale rate required' });
            }

            const updatedRecord = await Record.findByIdAndUpdate(
                id,
                {
                    trader_id,
                    sale_rate,
                    sale_unit: sale_unit || 'kg',
                    status: 'RateAssigned',
                },
                { new: true }
            )
                .populate('farmer_id', 'full_name phone')
                .populate('trader_id', 'full_name phone business_name');

            res.json(updatedRecord);
        }
    } catch (error) {
        console.error('Assign rate error:', error);
        res.status(500).json({ error: 'Failed to assign rate' });
    }
});

/**
 * GET /api/records/completed
 * Get completed sales (transaction history)
 * Excludes parent records (only shows actual trader assignments)
 * Supports pagination and search
 */
router.get('/completed', requireAuth, async (req, res) => {
    try {
        const { date, page = 1, limit = 50, search, paymentStatus } = req.query;

        let query = {
            status: { $in: ['Sold', 'Completed'] },
            is_parent: { $ne: true } // Exclude parent records (split lots)
        };

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.sold_at = { $gte: startDate, $lte: endDate };
        }

        // Payment status filter
        if (paymentStatus && paymentStatus !== 'all') {
            query.payment_status = paymentStatus;
        }

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        // Build aggregation pipeline for search across populated fields
        let pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: 'users',
                    localField: 'farmer_id',
                    foreignField: '_id',
                    as: 'farmer_id'
                }
            },
            { $unwind: { path: '$farmer_id', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'trader_id',
                    foreignField: '_id',
                    as: 'trader_id'
                }
            },
            { $unwind: { path: '$trader_id', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sold_by',
                    foreignField: '_id',
                    as: 'sold_by'
                }
            },
            { $unwind: { path: '$sold_by', preserveNullAndEmptyArrays: true } },
        ];

        // Add search filter if provided
        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { 'farmer_id.full_name': { $regex: search, $options: 'i' } },
                        { 'trader_id.full_name': { $regex: search, $options: 'i' } },
                        { 'trader_id.business_name': { $regex: search, $options: 'i' } },
                        { vegetable: { $regex: search, $options: 'i' } }
                    ]
                }
            });
        }

        // Get total count
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await Record.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        // Add sorting, skip, limit
        pipeline.push(
            { $sort: { sold_at: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
                $project: {
                    _id: 1,
                    farmer_id: { _id: 1, full_name: 1, phone: 1 },
                    trader_id: { _id: 1, full_name: 1, phone: 1, business_name: 1 },
                    sold_by: { _id: 1, full_name: 1 },
                    vegetable: 1,
                    quantity: 1,
                    nag: 1,
                    official_qty: 1,
                    official_nag: 1,
                    sale_rate: 1,
                    sale_amount: 1,
                    farmer_commission: 1,
                    trader_commission: 1,
                    net_payable_to_farmer: 1,
                    net_receivable_from_trader: 1,
                    status: 1,
                    payment_status: 1,
                    farmer_payment_status: 1,
                    trader_payment_status: 1,
                    sold_at: 1,
                    createdAt: 1
                }
            }
        );

        const records = await Record.aggregate(pipeline);

        res.json({
            data: records,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            hasMore: pageNum * limitNum < total
        });
    } catch (error) {
        console.error('Fetch completed records error:', error);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

export default router;
