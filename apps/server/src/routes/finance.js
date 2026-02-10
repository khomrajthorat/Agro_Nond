import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Record from '../models/Record.js';
import { createAuditLog, getClientIp, AuditDescriptions } from '../utils/auditLogger.js';

const router = express.Router();
// Middleware to require auth
router.use(requireAuth);

/**
 * POST /api/finance/pay-farmer/:id
 * Process payment to farmer
 */
router.post('/pay-farmer/:id', async (req, res) => {
    try {
        // Import notification service dynamically
        const { createNotification } = await import('../services/notificationService.js');
        const { mode, ref, date } = req.body;

        if (!mode) return res.status(400).json({ error: 'Payment mode required' });

        const record = await Record.findByIdAndUpdate(
            req.params.id,
            {
                farmer_payment_status: 'Paid',
                farmer_payment_mode: mode,
                farmer_payment_ref: ref,
                farmer_payment_date: date || new Date(),
                // If the overall payment is done when both are paid, check that?
                // For now, let's keep them independent.
                payment_status: 'pending' // Keep overall pending until trader pays too? Or modify logic.
            },
            { new: true }
        );

        if (!record) return res.status(404).json({ error: 'Record not found' });

        // AUDIT LOG: Track payment status change
        await createAuditLog({
            user: req.user,
            action: 'update',
            entityType: 'payment',
            entityId: record._id,
            description: AuditDescriptions.paymentStatus('farmer', 'Paid', record.farmer_id?.full_name || 'Farmer'),
            changes: { farmer_payment_status: { old: 'Pending', new: 'Paid' }, mode },
            ipAddress: getClientIp(req)
        });

        // TRIGGER NOTIFICATION: Payment Sent
        if (record.farmer_id) {
            await createNotification({
                recipient: record.farmer_id,
                type: 'success',
                title: 'Payment Received',
                message: `Your payment of ₹${record.net_payable_to_farmer} has been processed via ${mode}.`,
                data: { recordId: record._id, type: 'payment' }
            });
        }

        res.json(record);
    } catch (error) {
        console.error('Pay farmer error:', error);
        res.status(500).json({ error: 'Payment failed' });
    }
});

/**
 * POST /api/finance/receive-trader/:id
 * Process payment from trader
 */
router.post('/receive-trader/:id', async (req, res) => {
    try {
        const { mode, ref, date } = req.body;

        if (!mode) return res.status(400).json({ error: 'Payment mode required' });

        const record = await Record.findByIdAndUpdate(
            req.params.id,
            {
                trader_payment_status: 'Paid',
                trader_payment_mode: mode,
                trader_payment_ref: ref,
                trader_payment_date: date || new Date(),
                payment_status: 'paid' // Mark main status as paid when Money is Received
            },
            { new: true }
        );

        if (!record) return res.status(404).json({ error: 'Record not found' });

        // AUDIT LOG: Track trader payment received
        await createAuditLog({
            user: req.user,
            action: 'update',
            entityType: 'payment',
            entityId: record._id,
            description: AuditDescriptions.paymentStatus('trader', 'Received', record.trader_id?.business_name || 'Trader'),
            changes: { trader_payment_status: { old: 'Pending', new: 'Paid' }, mode },
            ipAddress: getClientIp(req)
        });

        res.json(record);
    } catch (error) {
        console.error('Receive trader error:', error);
        res.status(500).json({ error: 'Payment processing failed' });
    }
});

/**
 * POST /api/finance/bulk-receive-trader
 * Process bulk payment from trader (Allocates to oldest pending records)
 */
router.post('/bulk-receive-trader', async (req, res) => {
    try {
        // Import notification service dynamically
        const { createNotification } = await import('../services/notificationService.js');
        // Import PaymentReceipt dynamically (or at top if preferred, but doing here to minimize file diffs elsewhere)
        const PaymentReceipt = (await import('../models/PaymentReceipt.js')).default;

        const { traderId, amount, mode, ref, date, recordIds } = req.body;

        if (!traderId || !amount || !mode) {
            return res.status(400).json({ error: 'Trader ID, Amount and Mode are required' });
        }

        let remainingAmount = Number(amount);
        let processedCount = 0;
        let recordsUpdated = [];

        // 1. Fetch pending records
        let query = {
            trader_id: traderId,
            trader_payment_status: 'Pending',
            status: { $in: ['Sold', 'Completed'] }
        };

        // If specific records selected, filter by them
        if (recordIds && Array.isArray(recordIds) && recordIds.length > 0) {
            query._id = { $in: recordIds };
        }

        const pendingRecords = await Record.find(query).sort({ createdAt: 1 });

        if (pendingRecords.length === 0) {
            return res.status(400).json({ error: 'No pending records found for this trader' });
        }

        // 2. Allocate payment
        for (const record of pendingRecords) {
            if (remainingAmount <= 0) break;

            const payableAmount = record.net_receivable_from_trader;

            // We only settle FULL records as per current design limitation (no partial tracking)
            if (remainingAmount >= payableAmount) {
                // Mark as Paid
                record.trader_payment_status = 'Paid';
                record.trader_payment_mode = mode;
                record.trader_payment_ref = ref;
                record.trader_payment_date = date || new Date();

                // If farmer is also paid, mark overall as paid? 
                // Using existing logic:
                // record.payment_status = 'paid'; // This seems to be the convention in single payment

                // Let's check if we should update payment_status
                // In single 'receive-trader', it sets payment_status: 'paid'. 
                // We should probably check farmer status too effectively, but let's mimic single payment for now.
                record.payment_status = 'paid';

                await record.save();

                recordsUpdated.push(record._id);
                remainingAmount -= payableAmount;
                processedCount++;
            } else {
                // Partial amount remaining, but not enough to clear next invoice.
                // Stop here.
                break;
            }
        }

        // 3. Notification
        if (processedCount > 0) {
            await createNotification({
                recipient: traderId, // Assuming trader is a user
                type: 'success',
                title: 'Bulk Payment Received',
                message: `We received ₹${amount - remainingAmount} via ${mode}. ${processedCount} invoices cleared.`,
                data: { type: 'payment' }
            });
        }

        res.json({
            success: true,
            processedCount,
            totalAllocated: amount - remainingAmount,
            remainingUnallocated: remainingAmount,
            message: `Successfully cleared ${processedCount} invoices. ₹${remainingAmount} remaining.`
        });

    } catch (error) {
        console.error('Bulk receive error:', error);
        res.status(500).json({ error: 'Bulk payment failed' });
    }
});

/**
 * GET /api/finance/stats
 * Get financial statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalCommission,
            pendingReceivables, // Amount
            collectedToday,
            totalCount,
            // New Aggregations
            totalBaseAmount,
            receivedPayments,
            farmerPaymentsPaid,
            farmerPaymentsDue,
            pendingCount // Count of pending trader payments
        ] = await Promise.all([
            // 1. Total Commission
            Record.aggregate([
                { $match: { status: { $in: ['Sold', 'Completed'] } } },
                { $group: { _id: null, total: { $sum: '$commission' } } }
            ]),
            // 2. Pending Receivables (Traders) - Amount
            Record.aggregate([
                { $match: { status: { $in: ['Sold', 'Completed'] }, trader_payment_status: 'Pending' } },
                { $group: { _id: null, total: { $sum: '$net_receivable_from_trader' } } }
            ]),
            // 3. Collected Today (Commission Only?) - Maybe keep as is
            Record.aggregate([
                { $match: { status: { $in: ['Sold', 'Completed'] }, trader_payment_status: 'Paid', trader_payment_date: { $gte: today } } },
                { $group: { _id: null, total: { $sum: '$commission' } } }
            ]),
            // 4. Total Count
            Record.countDocuments({ status: { $in: ['Sold', 'Completed'] } }),

            // 5. Total Base Amount (Sale Amount)
            Record.aggregate([
                { $match: { status: { $in: ['Sold', 'Completed'] } } },
                { $group: { _id: null, total: { $sum: '$sale_amount' } } }
            ]),
            // 6. Received Payments (Traders) - Total Amount Received
            Record.aggregate([
                { $match: { status: { $in: ['Sold', 'Completed'] }, trader_payment_status: 'Paid' } },
                { $group: { _id: null, total: { $sum: '$net_receivable_from_trader' } } }
            ]),
            // 7. Farmer Payments Paid
            Record.aggregate([
                { $match: { status: { $in: ['Sold', 'Completed'] }, farmer_payment_status: 'Paid' } },
                { $group: { _id: null, total: { $sum: '$net_payable_to_farmer' } } }
            ]),
            // 8. Farmer Payments Due
            Record.aggregate([
                { $match: { status: { $in: ['Sold', 'Completed'] }, farmer_payment_status: 'Pending' } },
                { $group: { _id: null, total: { $sum: '$net_payable_to_farmer' } } }
            ]),
            // 9. Pending Count (Traders)
            Record.countDocuments({ status: { $in: ['Sold', 'Completed'] }, trader_payment_status: 'Pending' })
        ]);

        res.json({
            totalRevenue: totalCommission[0]?.total || 0, // Keep for compatibility if used elsewhere
            totalCommission: totalCommission[0]?.total || 0,
            pendingPayments: Math.round(pendingReceivables[0]?.total || 0),
            collectedToday: collectedToday[0]?.total || 0,
            transactionsCount: totalCount,

            // New Fields for AccountingOverview
            totalBaseAmount: totalBaseAmount[0]?.total || 0,
            totalTransactions: totalCount,
            receivedPayments: receivedPayments[0]?.total || 0,
            farmerPaymentsPaid: farmerPaymentsPaid[0]?.total || 0,
            farmerPaymentsDue: farmerPaymentsDue[0]?.total || 0,
            pendingCount: pendingCount || 0
        });
    } catch (error) {
        console.error("Finance stats error:", error);
        res.status(500).json({ error: "Failed to fetch finance stats" });
    }
});

/**
 * GET /api/finance/cashflow
 * Get cash flow records (received and pending)
 */
router.get('/cashflow', async (req, res) => {
    try {
        const records = await Record.find({ status: { $in: ['Sold', 'Completed'] } })
            .populate('farmer_id', 'full_name')
            .populate('trader_id', 'business_name full_name')
            .sort({ sold_at: -1 })
            .limit(50);

        const received = [];
        const pending = [];

        records.forEach(record => {
            const date = record.sold_at || record.createdAt;
            const ref = `TXN-${record.lot_id || record._id.toString().slice(-6)}`;

            // 1. Trader Transaction (Receivable)
            if (record.trader_payment_status === 'Paid') {
                received.push({
                    id: `${record._id}-trader`,
                    date: record.trader_payment_date || date,
                    from: record.trader_id?.business_name || 'Unknown Trader',
                    type: 'trader',
                    amount: record.net_receivable_from_trader, // Full amount received
                    reference: ref,
                    mode: record.trader_payment_mode
                });
            } else {
                const dueDate = new Date(date);
                dueDate.setDate(dueDate.getDate() + 7);
                const isOverdue = new Date() > dueDate;

                pending.push({
                    id: `${record._id}-trader`,
                    dueDate: dueDate,
                    from: record.trader_id?.business_name || 'Unknown Trader',
                    type: 'trader',
                    label: 'Receivable from Trader',
                    amount: record.net_receivable_from_trader,
                    daysOverdue: isOverdue ? 1 : 0,
                    reference: ref,
                    recordId: record._id
                });
            }

            // 2. Farmer Transaction (Payable)
            // Note: "Received" list usually shows Money In. Money Out is "Expenses/Payouts".
            // The prompt asks for "Cashflow". 
            // If they want to see "Paid to Farmer", it might belong in a separate list or "Paid" section.
            // But if the UI has "Received" and "Pending", "Pending" usually implies Action Items.
            // Pending Payables are Action Items.

            if (record.farmer_payment_status === 'Pending') {
                const dueDate = new Date(date);
                dueDate.setDate(dueDate.getDate() + 1); // Pay farmer next day?

                pending.push({
                    id: `${record._id}-farmer`,
                    dueDate: dueDate,
                    from: record.farmer_id?.full_name || 'Unknown Farmer',
                    type: 'farmer', // Logic: "from" is usually "Party". Here Party is Farmer.
                    label: 'Payable to Farmer',
                    amount: record.net_payable_to_farmer,
                    daysOverdue: 0,
                    reference: ref,
                    recordId: record._id
                });
            } else {
                // If we want to show "Paid to Farmer" history, we could add to a 'paid' list?
                // For now, let's just show Receivables in 'Received' tab if that's what it means.
                // Or maybe 'Received' is 'Completed Transactions'.
                // Let's include Farmer Payments in 'Received' but with negative amount or type indication if UI supports it?
                // The current UI seems to be "Cashflow" -> Money In / Money Out?
                // Let's assume 'Received' tab = Completed Transactions.
            }
        });

        res.json({ received, pending });
    } catch (error) {
        console.error("Cashflow error:", error);
        res.status(500).json({ error: "Failed to fetch cashflow" });
    }
});

/**
 * GET /api/finance/billing-records
 * Get billing records list
 */
router.get('/billing-records', async (req, res) => {
    try {
        const { limit = 10, page = 1, period = 'all', role } = req.query;

        const query = {
            status: { $in: ['Sold', 'Completed'] },
            is_parent: { $ne: true } // Exclude parent records (split lot containers)
        };

        // Date Filter
        if (period && period !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (period === 'today') {
                query.sold_at = { $gte: today };
            } else if (period === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                query.sold_at = { $gte: weekAgo };
            } else if (period === 'month') {
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                query.sold_at = { $gte: monthStart };
            }
        }

        const skip = (page - 1) * limit;

        const [records, total] = await Promise.all([
            Record.find(query)
                .populate('farmer_id', 'full_name farmerId phone location')
                .populate('trader_id', 'full_name business_name customId')
                .sort({ sold_at: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Record.countDocuments(query)
        ]);

        // UPDATED: Transform records to ensure sale_unit is set correctly
        const transformedRecords = records.map(record => {
            const recordObj = record.toObject();

            // If sale_unit is not set, infer from nag data
            if (!recordObj.sale_unit) {
                const nagValue = recordObj.official_nag || recordObj.nag || 0;
                recordObj.sale_unit = nagValue > 0 ? 'nag' : 'kg';
            }

            return recordObj;
        });

        res.json({
            records: transformedRecords,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Billing records error:", error);
        res.status(500).json({ error: "Failed to fetch billing records" });
    }
});

/**
 * GET /api/finance/commission-rates
 * Get current commission rates
 */
router.get('/commission-rates', async (req, res) => {
    try {
        // Import dynamically to avoid circular dependency issues if any, or just consistent with other dynamic imports
        const CommissionRule = (await import('../models/CommissionRule.js')).default;

        const rules = await CommissionRule.find({ is_active: true })
            .sort({ createdAt: -1 });

        // If no rules exist, return defaults
        if (rules.length === 0) {
            return res.json([
                { role_type: 'farmer', crop_type: 'All', rate: 0.04 },
                { role_type: 'trader', crop_type: 'All', rate: 0.09 }
            ]);
        }

        res.json(rules);
    } catch (error) {
        console.error('Fetch commission rules error:', error);
        res.status(500).json({ error: 'Failed to fetch rules' });
    }
});

export default router;
