import express from 'express';
import Record from '../models/Record.js';
import User from '../models/User.js';
import CommissionRule from '../models/CommissionRule.js';
import { requireAuth } from '../middleware/auth.js';
import { createAuditLog, getClientIp, AuditDescriptions } from '../utils/auditLogger.js';

const router = express.Router();

// GET /api/weight/stats
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [completed, pending, todayRecs] = await Promise.all([
            Record.countDocuments({
                status: { $in: ['Weighed', 'Completed', 'Sold'] },
                is_parent: { $ne: true }
            }),
            Record.countDocuments({
                status: 'Pending',
                is_parent: { $ne: true }
            }),
            Record.countDocuments({
                updatedAt: { $gte: today, $lt: tomorrow },
                status: { $in: ['Weighed', 'Completed', 'Sold'] },
                is_parent: { $ne: true }
            })
        ]);

        res.json({ completed, pending, today: todayRecs });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/weight/records (The main list)
router.get('/records', requireAuth, async (req, res) => {
    try {
        const records = await Record.find({
            status: { $in: ['Weighed', 'Completed', 'Sold'] },
            is_parent: { $ne: true } // Exclude parent records
        })
            .populate('farmer_id', 'farmerId full_name phone')
            .sort({ updatedAt: -1 });
        res.json(records);
    } catch (error) {
        console.error('Fetch records error:', error);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

// GET /api/weight/pending (For dropdown)
router.get('/pending', requireAuth, async (req, res) => {
    try {
        // Fetch records that have been assigned a rate by Committee (Lilav)
        const records = await Record.find({ status: 'RateAssigned' })
            .populate('farmer_id', 'farmerId full_name phone')
            .sort({ createdAt: -1 });
        res.json(records);
    } catch (error) {
        console.error('Pending records error:', error);
        res.status(500).json({ error: 'Failed to fetch pending records' });
    }
});



// HELPER: Calculate Sale
const calculateSale = async (record, qty, nag) => {
    let sale_amount = 0;
    if (record.sale_unit === 'nag') {
        sale_amount = nag * record.sale_rate;
    } else {
        sale_amount = qty * record.sale_rate;
    }

    // 1. Determine Rates: Check if already stored, otherwise fetch current
    let farmerRate, traderRate;

    // Check if we are re-calculating an old record that already has rates
    if (record.farmer_commission_rate > 0 || record.trader_commission_rate > 0) {
        farmerRate = record.farmer_commission_rate || 0.04;
        traderRate = record.trader_commission_rate || 0.09;
    } else {
        // Fetch active commission rules
        // Try specific crop first, if not found, try 'All'
        const [farmerSpecific, farmerAll, traderSpecific, traderAll] = await Promise.all([
            CommissionRule.findOne({ role_type: 'farmer', is_active: true, crop_type: record.vegetable }).sort({ createdAt: -1 }),
            CommissionRule.findOne({ role_type: 'farmer', is_active: true, crop_type: 'All' }).sort({ createdAt: -1 }),
            CommissionRule.findOne({ role_type: 'trader', is_active: true, crop_type: record.vegetable }).sort({ createdAt: -1 }),
            CommissionRule.findOne({ role_type: 'trader', is_active: true, crop_type: 'All' }).sort({ createdAt: -1 })
        ]);

        farmerRate = farmerSpecific ? farmerSpecific.rate : (farmerAll ? farmerAll.rate : 0.04);
        traderRate = traderSpecific ? traderSpecific.rate : (traderAll ? traderAll.rate : 0.09);
    }

    const farmer_commission = Math.round(sale_amount * farmerRate);
    const trader_commission = Math.round(sale_amount * traderRate);

    return {
        sale_amount,
        farmer_commission,
        trader_commission,
        // Save the rates used for this transaction
        farmer_commission_rate: farmerRate,
        trader_commission_rate: traderRate,
        commission: farmer_commission + trader_commission,
        net_payable_to_farmer: sale_amount - farmer_commission,
        net_receivable_from_trader: sale_amount + trader_commission,
        total_amount: sale_amount + trader_commission,
        status: 'Sold',
        sold_at: new Date(),
        sold_by: record.sold_by,
        farmer_payment_status: 'Pending',
        trader_payment_status: 'Pending'
    };
};

// POST /api/weight/record (Add/Update)
router.post('/record', requireAuth, async (req, res) => {
    try {
        const { recordRefId, farmerId, item, estWeight, estNag, updatedWeight, updatedNag, date } = req.body;

        let record;
        const official_qty = updatedWeight ? parseFloat(updatedWeight) : 0;
        const official_nag = updatedNag ? parseFloat(updatedNag) : 0;

        if (recordRefId) {
            // Updating existing record (likely RateAssigned)
            record = await Record.findById(recordRefId);
            if (!record) return res.status(404).json({ error: 'Record not found' });

            record.official_qty = official_qty;
            record.official_nag = official_nag;
            record.weighed_by = req.user._id;
            record.weighed_at = new Date();

            // If Rate is Assigned, Finalize Sale!
            if (record.status === 'RateAssigned' && (official_qty > 0 || official_nag > 0)) {
                const saleData = await calculateSale(record, official_qty, official_nag);
                Object.assign(record, saleData);
                record.sold_by = req.user._id; // Weight person completes the sale
            } else {
                // Fallback for just weighing (if ever needed)
                record.status = (official_qty || official_nag) ? 'Weighed' : 'Pending';
            }

            if (date) {
                // record.createdAt = new Date(date); 
            }

            await record.save();

            // Notify if Sold
            if (record.status === 'Sold' && record.farmer_id) {
                const { createNotification } = await import('../services/notificationService.js');
                await createNotification({
                    recipient: record.farmer_id,
                    type: 'success',
                    title: 'Produce Sold',
                    message: `Your ${record.vegetable} has been weighed (${official_qty}kg / ${official_nag} nag) and sold. Total: ₹${record.total_amount}.`,
                    data: { recordId: record._id, type: 'sold' }
                });
            }

        } else {
            // Creating new manual record
            // NOTE: Ideally new records come from Lilav -> Weight flow. 
            // If manual, it won't have RateAssigned, so it will stay Pending/Weighed until Rate is added.

            let farmerObjectId = farmerId;
            const isValidObjectId = (id) => id.match(/^[0-9a-fA-F]{24}$/);

            if (!isValidObjectId(farmerId)) {
                const f = await User.findOne({ farmerId: farmerId });
                if (f) farmerObjectId = f._id;
                else return res.status(400).json({ error: 'Invalid Farmer ID' });
            }

            record = new Record({
                farmer_id: farmerObjectId,
                vegetable: item,
                quantity: estWeight || 0,
                nag: estNag || 0,
                official_qty,
                official_nag,
                status: (official_qty || official_nag) ? 'Weighed' : 'Pending',
                weighed_by: req.user._id,
                weighed_at: new Date(),
                market: 'Manual',
            });
            if (date) record.createdAt = new Date(date);
            await record.save();
        }

        // AUDIT LOG: Track weight entry
        await createAuditLog({
            user: req.user,
            action: recordRefId ? 'update' : 'create',
            entityType: 'weight',
            entityId: record._id,
            description: AuditDescriptions.createWeight(
                record.farmer_id?.full_name || 'Farmer',
                record.vegetable,
                official_qty || official_nag
            ),
            changes: { official_qty, official_nag, status: record.status },
            ipAddress: getClientIp(req)
        });

        res.json(record);
    } catch (e) {
        console.error('Save record error:', e);
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/weight/record/:id (Update existing weight record)
router.put('/record/:id', requireAuth, async (req, res) => {
    try {
        const { updatedWeight, official_nag } = req.body;

        const record = await Record.findById(req.params.id);
        if (!record) return res.status(404).json({ error: 'Record not found' });

        const official_qty = updatedWeight ? parseFloat(updatedWeight) : 0;
        const o_nag = official_nag ? parseFloat(official_nag) : 0;

        record.official_qty = official_qty;
        record.official_nag = o_nag;
        record.weighed_by = req.user._id;
        record.weighed_at = new Date();

        // If it was already Sold or RateAssigned, re-calculate
        if ((record.status === 'RateAssigned' || record.status === 'Sold') && (official_qty > 0 || o_nag > 0)) {
            // Only if we have rate info
            if (record.sale_rate && record.sale_rate > 0) {
                const saleData = await calculateSale(record, official_qty, o_nag);
                Object.assign(record, saleData);
            } else {
                record.status = 'Weighed'; // Downgrade if no rate? Shouldn't happen in new flow
            }
        } else {
            record.status = (official_qty || o_nag) ? 'Weighed' : 'Pending';
        }

        await record.save();
        res.json(record);
    } catch (e) {
        console.error("Update error: ", e);
        res.status(500).json({ error: 'Update failed' });
    }
});

// DELETE /api/weight/record/:id
router.delete('/record/:id', requireAuth, async (req, res) => {
    try {
        await Record.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// GET /api/weight/profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('full_name phone location initials customId');
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: 'Profile fetch error' });
    }
});

// PUT /api/weight/profile
router.put('/profile', requireAuth, async (req, res) => {
    try {
        const { name, phone, location } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.full_name = name;
        user.phone = phone;
        user.location = location;

        await user.save(); // Triggers customId generation if missing

        res.json(user);
    } catch (e) {
        res.status(500).json({ error: 'Profile update error' });
    }
});

export default router;
