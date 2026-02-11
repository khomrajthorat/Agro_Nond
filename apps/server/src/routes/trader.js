import express from 'express';
import mongoose from 'mongoose';
import Record from '../models/Record.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to ensure user is a trader
const requireTrader = (req, res, next) => {
    if (req.user.role !== 'trader') {
        return res.status(403).json({ error: 'Access denied. Trader role required.' });
    }
    next();
};

/**
 * GET /api/trader/stats
 * Get aggregated stats for the trader dashboard
 */
router.get('/stats', requireAuth, requireTrader, async (req, res) => {
    try {
        const userId = req.user._id;

        // Aggregate stats for Completed records where this user is the trader
        const stats = await Record.aggregate([
            {
                $match: {
                    trader_id: new mongoose.Types.ObjectId(userId),
                    status: { $in: ['Sold', 'Completed'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: '$official_qty' },
                    totalNag: { $sum: '$official_nag' },
                    // Use net_receivable_from_trader if available (new logic), else fallback
                    // We need to be careful with summing calculated fields if they are 0 in old records
                    // Better approach: sum(sale_amount) + sum(commission) is generally safer if net_receivable isn't populated on old records
                    totalBaseSpend: { $sum: '$sale_amount' },
                    totalCommission: { $sum: '$commission' },
                    totalPaid: {
                        $sum: {
                            $cond: [
                                { $in: ['$trader_payment_status', ['Paid', 'paid']] },
                                {
                                    $cond: {
                                        if: { $gt: ['$net_receivable_from_trader', 0] },
                                        then: '$net_receivable_from_trader',
                                        else: { $add: ['$sale_amount', '$commission'] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Calculate pending payments
        // Logic: active traders have 'trader_payment_status' as 'Pending'
        // Logic backup: check 'payment_status' for legacy compatibility
        const pendingStats = await Record.aggregate([
            {
                $match: {
                    trader_id: new mongoose.Types.ObjectId(userId),
                    status: { $in: ['Sold', 'Completed'] },
                    $or: [
                        { trader_payment_status: 'Pending' },
                        { payment_status: { $in: ['pending', 'overdue'] } }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    // Total pending is the sum of what they owe (net_receivable_from_trader)
                    // If net_receivable is 0 (legacy), use sale_amount + commission
                    totalPending: {
                        $sum: {
                            $cond: {
                                if: { $gt: ['$net_receivable_from_trader', 0] },
                                then: '$net_receivable_from_trader',
                                else: { $add: ['$sale_amount', '$commission'] }
                            }
                        }
                    }
                }
            }
        ]);

        const totalBase = stats[0]?.totalBaseSpend || 0;
        const totalComm = stats[0]?.totalCommission || 0;

        const result = {
            totalQuantity: stats[0]?.totalQuantity || 0,
            totalNag: stats[0]?.totalNag || 0,
            totalBaseSpend: totalBase,
            totalCommission: totalComm,
            totalSpend: totalBase + totalComm,
            totalPaid: stats[0]?.totalPaid || 0,
            pendingPayments: pendingStats[0]?.totalPending || 0
        };

        res.json(result);
    } catch (error) {
        console.error('Trader stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/trader/transactions
 * Get transaction history
 */
router.get('/transactions', requireAuth, requireTrader, async (req, res) => {
    try {
        const { date, crop, payment_status, limit = 50 } = req.query;
        const userId = req.user._id;

        let query = {
            trader_id: userId,
            status: { $in: ['Sold', 'Completed'] }
        };

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.sold_at = { $gte: startDate, $lte: endDate };
        }

        if (crop && crop !== 'All Crops') {
            query.vegetable = crop;
        }

        if (payment_status && payment_status !== 'All Status') {
            if (payment_status === 'Pending') {
                // Check both fields for robustness
                query.$or = [
                    { trader_payment_status: 'Pending' },
                    { payment_status: { $in: ['pending', 'overdue'] } }
                ];
            } else {
                query.$or = [
                    { trader_payment_status: payment_status },
                    { payment_status: payment_status } // Legacy Check
                ];
            }
        }

        const transactions = await Record.find(query)
            .sort({ sold_at: -1 })
            .limit(parseInt(limit))
            .populate('farmer_id', 'full_name phone')
            .populate('sold_by', 'full_name');

        res.json(transactions);
    } catch (error) {
        console.error('Trader transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

/**
 * GET /api/trader/download-report
 * Download full transaction history as CSV
 */
router.get('/download-report', requireAuth, requireTrader, async (req, res) => {
    try {
        const userId = req.user._id;

        // Fetch ALL Sold/Completed records for this trader
        const records = await Record.find({
            trader_id: userId,
            status: { $in: ['Sold', 'Completed'] }
        })
            .sort({ sold_at: -1 })
            .populate('farmer_id', 'full_name');

        const formattedRecords = records.map(record => {
            const date = record.sold_at ? new Date(record.sold_at) : new Date(record.createdAt);

            // Determine payment status
            let payStatus = 'Pending';
            if (record.trader_payment_status) {
                payStatus = record.trader_payment_status;
            } else if (record.payment_status) {
                payStatus = record.payment_status.charAt(0).toUpperCase() + record.payment_status.slice(1);
            }

            return {
                date: date.toLocaleDateString('en-IN'),
                time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                crop: record.vegetable,
                qty: record.official_qty || 0,
                nag: record.official_nag || 0,
                rate: record.sale_rate || 0,
                amount: record.net_receivable_from_trader || ((record.sale_amount || 0) + (record.trader_commission || 0)),
                commission: record.trader_commission || 0,
                // farmer: record.farmer_id?.full_name || 'Unknown', // REMOVED PRIVACY
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
            { label: 'Total Amount', value: 'amount' },
            { label: 'Commission', value: 'commission' },
            // { label: 'Farmer Name', value: 'farmer' }, // REMOVED
            { label: 'Status', value: 'status' },
            { label: 'Payment Status', value: 'payment_status' }

        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(formattedRecords);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename=trader_report_${new Date().toISOString().split('T')[0]}.csv`);
        res.status(200).send(csv);

    } catch (error) {
        console.error('Download report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

export default router;
