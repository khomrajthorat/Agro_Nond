import express from 'express';
import Record from '../models/Record.js';

const router = express.Router();

/**
 * GET /api/analytics/vegetable-sales
 * Get aggregated vegetable sales data
 * Public endpoint - no authentication required
 * 
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'year' (default: 'day')
 * - date: ISO date string (default: today)
 */
router.get('/vegetable-sales', async (req, res) => {
    try {
        const { period = 'day', date } = req.query;

        // Calculate date range based on period
        const now = date ? new Date(date) : new Date();
        let startDate, endDate;

        switch (period) {
            case 'week':
                // Start from Sunday of current week
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay());
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'day':
            default:
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
        }

        // Aggregate sales data by vegetable
        const salesData = await Record.aggregate([
            {
                $match: {
                    status: { $in: ['Sold', 'Completed'] },
                    sold_at: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: '$vegetable',
                    totalSalesAmount: { $sum: '$sale_amount' },
                    totalQuantity: { $sum: { $ifNull: ['$official_qty', '$quantity'] } },
                    totalNag: { $sum: { $ifNull: ['$official_nag', '$nag'] } },
                    transactionCount: { $sum: 1 },
                    // Calculate average rate for kg sales only
                    avgRatePerKg: {
                        $avg: {
                            $cond: [
                                { $or: [{ $eq: ['$sale_unit', 'kg'] }, { $eq: ['$sale_unit', null] }] },
                                '$sale_rate',
                                null
                            ]
                        }
                    },
                    // Calculate average rate for nag sales only
                    avgRatePerNag: {
                        $avg: {
                            $cond: [
                                { $eq: ['$sale_unit', 'nag'] },
                                '$sale_rate',
                                null
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    vegetable: '$_id',
                    totalSalesAmount: { $round: ['$totalSalesAmount', 2] },
                    totalQuantity: { $round: ['$totalQuantity', 2] },
                    totalNag: { $round: ['$totalNag', 2] },
                    transactionCount: 1,
                    avgRatePerKg: { $round: [{ $ifNull: ['$avgRatePerKg', 0] }, 2] },
                    avgRatePerNag: { $round: [{ $ifNull: ['$avgRatePerNag', 0] }, 2] }
                }
            },
            {
                $sort: { totalSalesAmount: -1 }
            }
        ]);

        // Determine highest and lowest
        const highest = salesData.length > 0 ? salesData[0] : null;
        const lowest = salesData.length > 0 ? salesData[salesData.length - 1] : null;

        // Calculate total market sales
        const totalMarketSales = salesData.reduce((sum, item) => sum + item.totalSalesAmount, 0);

        res.json({
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            data: salesData,
            highest,
            lowest,
            totalMarketSales: Math.round(totalMarketSales * 100) / 100,
            vegetableCount: salesData.length
        });

    } catch (error) {
        console.error('Error fetching vegetable sales analytics:', error);
        res.status(500).json({ error: 'Failed to fetch sales analytics' });
    }
});

/**
 * GET /api/analytics/vegetable-sales/history
 * Get historical sales data for trend analysis
 * 
 * Query params:
 * - vegetable: vegetable name (optional, if not provided returns all)
 * - days: number of days of history (default: 7)
 */
router.get('/vegetable-sales/history', async (req, res) => {
    try {
        const { vegetable, days = 7 } = req.query;

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days) + 1);
        startDate.setHours(0, 0, 0, 0);

        const matchStage = {
            status: { $in: ['Sold', 'Completed'] },
            sold_at: { $gte: startDate, $lte: endDate }
        };

        if (vegetable) {
            matchStage.vegetable = vegetable;
        }

        const historyData = await Record.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$sold_at' } },
                        vegetable: '$vegetable'
                    },
                    totalSalesAmount: { $sum: '$sale_amount' },
                    totalQuantity: { $sum: { $ifNull: ['$official_qty', '$quantity'] } },
                    transactionCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id.date',
                    vegetable: '$_id.vegetable',
                    totalSalesAmount: { $round: ['$totalSalesAmount', 2] },
                    totalQuantity: { $round: ['$totalQuantity', 2] },
                    transactionCount: 1
                }
            },
            { $sort: { date: 1, vegetable: 1 } }
        ]);

        res.json({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            days: parseInt(days),
            data: historyData
        });

    } catch (error) {
        console.error('Error fetching sales history:', error);
        res.status(500).json({ error: 'Failed to fetch sales history' });
    }
});

export default router;
