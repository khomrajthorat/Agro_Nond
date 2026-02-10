import express from 'express';
import User from '../models/User.js';
import Record from '../models/Record.js';
import CommissionRule from '../models/CommissionRule.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }
};

/**
 * GET /api/admin/metrics
 * Get system-wide metrics (User counts & aggregated Record stats)
 */
router.get('/metrics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalFarmers,
      totalTraders,
      totalUsers,
      pendingWeights,
      activeAuctions, // "Weighed" status means ready for auction
      completedToday
    ] = await Promise.all([
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'trader' }),
      User.countDocuments({}),
      Record.countDocuments({ status: 'Pending' }),
      Record.countDocuments({ status: 'Weighed' }),
      Record.countDocuments({
        status: { $in: ['Sold', 'Completed'] },
        updatedAt: { $gte: today }
      })
    ]);

    // Financial aggregation for "Total Volume" (All time)
    const financialStats = await Record.aggregate([
      { $match: { status: { $in: ['Sold', 'Completed'] } } },
      { $group: { _id: null, totalVolume: { $sum: '$sale_amount' }, totalCommission: { $sum: '$commission' } } }
    ]);

    const totalVolume = financialStats[0]?.totalVolume || 0;
    const totalCommission = financialStats[0]?.totalCommission || 0;

    res.json({
      totalFarmers,
      totalTraders,
      totalUsers,
      totalVolume,
      totalCommission,
      pendingWeights,
      activeAuctions,
      completedToday
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/admin/farmers
 * List all farmers with details
 */
router.get('/farmers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const farmers = await User.find({ role: 'farmer' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(farmers);
  } catch (error) {
    console.error('Fetch farmers error:', error);
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
});

/**
 * GET /api/admin/traders
 * List all traders with details
 */
router.get('/traders', requireAuth, requireAdmin, async (req, res) => {
  try {
    const traders = await User.find({ role: 'trader' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(traders);
  } catch (error) {
    console.error('Fetch traders error:', error);
    res.status(500).json({ error: 'Failed to fetch traders' });
  }
});

/**
 * GET /api/admin/weight-records
 * Fetch all weight records (Pending & Weighed)
 */
router.get('/weight-records', requireAuth, requireAdmin, async (req, res) => {
  try {
    const records = await Record.find({})
      .populate('farmer_id', 'full_name farmerId phone')
      .populate('weighed_by', 'full_name') // Staff who weighed it
      .sort({ createdAt: -1 })
      .limit(100); // Limit to recent 100 for performance
    res.json(records);
  } catch (error) {
    console.error('Fetch weight records error:', error);
    res.status(500).json({ error: 'Failed to fetch weight records' });
  }
});

/**
 * GET /api/admin/lilav-bids
 * Fetch all auction activity (Sold/Completed records)
 */
router.get('/lilav-bids', requireAuth, requireAdmin, async (req, res) => {
  try {
    const records = await Record.find({ status: { $in: ['Sold', 'Completed'] } })
      .populate('farmer_id', 'full_name farmerId')
      .populate('trader_id', 'full_name customId business_name')
      .populate('sold_by', 'full_name') // Auctioneer/Staff
      .sort({ sold_at: -1 })
      .limit(100);
    res.json(records);
  } catch (error) {
    console.error('Fetch lilav bids error:', error);
    res.status(500).json({ error: 'Failed to fetch auction records' });
  }
});

/**
 * GET /api/admin/committee-records
 * Fetch financial/commission records
 */
router.get('/committee-records', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Return all completed sales with commission details
    const records = await Record.find({ status: { $in: ['Sold', 'Completed'] } })
      .populate('farmer_id', 'full_name farmerId')
      .populate('trader_id', 'full_name customId business_name')
      .select('commission total_amount sale_amount vegetable market createdAt sold_at')
      .sort({ sold_at: -1 })
      .limit(100);

    res.json(records);
  } catch (error) {
    console.error('Fetch committee records error:', error);
    res.status(500).json({ error: 'Failed to fetch committee records' });
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination and filtering (Generic User Management)
 */
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) {
      query.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user role
 */
router.patch('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['farmer', 'trader', 'committee', 'admin', 'weight', 'lilav', 'accounting'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (Admin only)
 */
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { phone, role, full_name } = req.body;

    if (!phone || !role) {
      return res.status(400).json({ error: 'Phone and role are required' });
    }

    const validRoles = ['farmer', 'trader', 'committee', 'admin', 'weight', 'lilav', 'accounting'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this phone number already exists' });
    }

    const newUser = await User.create({
      phone,
      role,
      full_name: full_name || '',
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Remove a user
 */
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * Update user details
 */
router.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    // Allow updating license number from admin panel
    if (req.body.license_number !== undefined) updates.license_number = req.body.license_number;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * GET /api/admin/commission-rules
 * Get commission rules
 */
router.get('/commission-rules', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rules = await CommissionRule.find({ is_active: true })
      .sort({ createdAt: -1 });

    // If no rules exist, return defaults
    if (rules.length === 0) {
      return res.json([
        { role_type: 'farmer', crop_type: 'All', rate: 0.04, effective_date: new Date() },
        { role_type: 'trader', crop_type: 'All', rate: 0.09, effective_date: new Date() }
      ]);
    }

    res.json(rules);
  } catch (error) {
    console.error('Fetch commission rules error:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

/**
 * POST /api/admin/commission-rules
 * Create new commission rule
 */
router.post('/commission-rules', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role_type, crop_type, rate } = req.body;

    if (!role_type || rate === undefined) {
      return res.status(400).json({ error: 'Role type and rate are required' });
    }

    const newRate = parseFloat(rate); // Ensure it's a number

    const newRule = await CommissionRule.create({
      role_type,
      crop_type: crop_type || 'All',
      rate: newRate,
      created_by: req.user._id
    });

    // Retroactive update removed to preserve historical accuracy. 
    // Old records should retain their original commission rates.
    console.log(`New commission rule created: ${role_type} @ ${newRate}`);

    res.status(201).json(newRule);
  } catch (error) {
    console.error('Create commission rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});



/**
 * GET /api/admin/download-user-report/:userId
 * Download report for a specific user (Farmer/Trader)
 */
router.get('/download-user-report/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let records = [];
    let fields = [];
    let filenamePrefix = '';

    const userRole = user.role ? user.role.toLowerCase() : '';


    if (userRole === 'farmer') {
      filenamePrefix = 'farmer';
      records = await Record.find({
        farmer_id: userId,
        status: { $in: ['Sold', 'Completed'] },
        is_parent: { $ne: true }
      })
        .sort({ sold_at: -1 })
        .populate('trader_id', 'full_name business_name');

      fields = [
        { label: 'Date', value: 'date' },
        { label: 'Vegetable', value: 'vegetable' },
        { label: 'Quantity (kg)', value: 'qty' },
        { label: 'Nag', value: 'nag' },
        { label: 'Rate', value: 'rate' },
        { label: 'Sale Amount', value: 'amount' },
        { label: 'Farmer Commission', value: 'commission' },
        { label: 'Net Payable', value: 'net_payable' },
        // { label: 'Trader', value: 'trader' }, // REMOVED
        { label: 'Payment Status', value: 'payment_status' }
      ];

    } else if (userRole === 'trader') {
      filenamePrefix = 'trader';
      records = await Record.find({
        trader_id: userId,
        status: { $in: ['Sold', 'Completed'] }
      })
        .sort({ sold_at: -1 })
        .populate('farmer_id', 'full_name');

      fields = [
        { label: 'Date', value: 'date' },
        { label: 'Vegetable', value: 'vegetable' },
        { label: 'Quantity (kg)', value: 'qty' },
        { label: 'Nag', value: 'nag' },
        { label: 'Rate', value: 'rate' },
        { label: 'Sale Amount', value: 'amount' },
        { label: 'Trader Commission', value: 'commission' },
        { label: 'Net Receivable', value: 'net_receivable' },
        // { label: 'Farmer', value: 'farmer' }, // REMOVED
        { label: 'Payment Status', value: 'payment_status' }
      ];
    } else {
      return res.status(400).json({ error: 'Report download only available for Farmers and Traders' });
    }

    const formattedRecords = records.map(record => {
      const date = record.sold_at ? new Date(record.sold_at) : new Date(record.createdAt);

      // Determine payment status safely
      let payStatus = 'Pending';
      if (userRole === 'farmer') {
        payStatus = record.farmer_payment_status || (record.payment_status === 'paid' ? 'Paid' : 'Pending');
      } else {
        payStatus = record.trader_payment_status || (record.payment_status === 'paid' ? 'Paid' : 'Pending');
      }

      // Determine commission safely
      const comm = userRole === 'farmer' ? (record.farmer_commission || 0) : (record.trader_commission || 0);

      const traderName = record.trader_id?.business_name || record.trader_id?.full_name || 'Unknown';
      const farmerName = record.farmer_id?.full_name || 'Unknown';

      return {
        date: date.toLocaleDateString('en-IN'),
        vegetable: record.vegetable || '',
        qty: record.official_qty || record.quantity || 0,
        nag: record.official_nag || record.nag || 0,
        rate: record.sale_rate || 0,
        amount: record.sale_amount || 0,
        commission: comm,
        net_payable: record.net_payable_to_farmer || ((record.sale_amount || 0) - (record.farmer_commission || 0)) || 0,
        net_receivable: record.net_receivable_from_trader || ((record.sale_amount || 0) + (record.trader_commission || 0)) || 0,
        // trader: traderName, // REMOVED
        // farmer: farmerName, // REMOVED
        payment_status: payStatus
      };
    });



    const { Parser } = await import('json2csv');
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formattedRecords);

    res.header('Content-Type', 'text/csv');
    // Sanitized filename
    const safeName = user.full_name ? user.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'user';
    res.header('Content-Disposition', `attachment; filename=${filenamePrefix}_report_${safeName}_${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('Admin user report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/admin/settings
 * Fetch all system settings
 */
router.get('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const settings = await import('../models/SystemSetting.js').then(m => m.default.find({}).sort({ key: 1 }));
    res.json(settings);
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PATCH /api/admin/settings/:key
 * Update a specific setting
 */
router.patch('/settings/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const SystemSetting = (await import('../models/SystemSetting.js')).default;

    const updates = {
      value,
      updated_by: req.user._id
    };

    if (description) updates.description = description;

    const setting = await SystemSetting.findOneAndUpdate(
      { key },
      updates,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(setting);
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
