import express from 'express';
import User from '../models/User.js';
import Record from '../models/Record.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users
 * Get all users (with optional filtering and pagination)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;

    // Build query
    const query = {};

    // Filter by role if provided
    if (role) {
      query.role = role;
    }

    // Search by name or phone if provided
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { business_name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query)
    ]);

    // Return paginated response
    res.json({
      data: users,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      hasMore: pageNum * limitNum < total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Map Backend Database fields -> Frontend State fields
    res.json({
      id: user._id,
      phone: user.phone,
      role: user.role,
      // Profile Data
      name: user.full_name,
      farmerId: user.farmerId,
      location: user.location,
      photo: user.profile_picture, // Frontend expects 'photo', DB has 'profile_picture'
      initials: user.initials,
      license_number: user.license_number,
      business_name: user.business_name
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { role, full_name, email, location, profile_picture, business_name, gst_number, license_number, business_address, operating_locations } = req.body;

    const user = req.user; // This comes from requireAuth middleware

    // Update User Fields
    if (role) user.role = role;
    if (full_name) {
      user.full_name = full_name;
      // Auto-generate initials from full name
      const nameParts = full_name.trim().split(' ');
      if (nameParts.length >= 2) {
        user.initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      } else if (nameParts.length === 1) {
        user.initials = nameParts[0].slice(0, 2).toUpperCase();
      }
    }
    if (email) user.email = email;
    if (location) user.location = location;
    if (profile_picture) user.profile_picture = profile_picture;
    if (business_name) user.business_name = business_name;
    if (gst_number) user.gst_number = gst_number;
    if (license_number) user.license_number = license_number;
    if (business_address) user.business_address = business_address;
    if (operating_locations) user.operating_locations = operating_locations;


    // Save to Database
    await user.save();
    res.json({
      user: {
        name: user.full_name,
        phone: user.phone,
        location: user.location,
        farmerId: user.farmerId,
        photo: user.profile_picture,
        initials: user.initials,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({
      error: 'Failed to update profile',
      details: error.message
    });
  }
});

/**
 * POST /api/users/add
 * Add a new user (farmer, trader, weight) - for committee use
 */
router.post('/add', requireAuth, async (req, res) => {
  try {
    const { role, full_name, phone, location, business_name, gst_number, license_number, business_address, initialRecords } = req.body;

    // Validate required fields
    if (!role || !full_name || !phone) {
      return res.status(400).json({ error: 'Role, full name, and phone are required' });
    }

    // Validate role
    const allowedRoles = ['farmer', 'trader', 'weight'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed: farmer, trader, weight' });
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: 'A user with this phone number already exists' });
    }

    // Create user object
    const userData = {
      role,
      full_name,
      phone,
      location: location || '',
    };

    // Add trader-specific fields
    if (role === 'trader') {
      userData.business_name = business_name || '';
      userData.gst_number = gst_number || '';
      userData.license_number = license_number || '';
      userData.business_address = business_address || '';
    }

    // Generate initials
    const nameParts = full_name.trim().split(' ');
    if (nameParts.length >= 2) {
      userData.initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    } else if (nameParts.length === 1) {
      userData.initials = nameParts[0].slice(0, 2).toUpperCase();
    }

    const user = await User.create(userData);

    // Create initial records if provided (for farmers)
    let createdRecords = [];
    if (initialRecords && initialRecords.length > 0 && role === 'farmer') {
      // Determine market name from the creator (Committee/Admin)
      const marketName = req.user.business_name || req.user.full_name || 'AgroNond Market';

      for (const item of initialRecords) {
        try {
          const record = await Record.create({
            farmer_id: user._id,
            vegetable: item.vegetable,
            market: marketName, // Required field
            quantity: item.quantity || 0,
            nag: item.nag || 0,
            sale_unit: (item.nag && item.nag > 0) ? 'nag' : 'kg',
            status: 'Pending',
            qtySold: 0,
            rate: 0,
            totalAmount: 0,
            trader: '-'
          });
          createdRecords.push(record);
        } catch (recError) {
          console.error("Failed to create initial record:", recError);
          // Continue creating other records even if one fails
        }
      }
    }

    res.status(201).json({
      message: 'User added successfully',
      user: {
        id: user._id,
        _id: user._id,
        customId: user.customId,
        farmerId: user.farmerId,
        phone: user.phone,
        role: user.role,
        full_name: user.full_name,
        location: user.location,
        initials: user.initials,
        business_name: user.business_name,
        createdAt: user.createdAt
      },
      recordsCreated: createdRecords.length
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ error: 'Failed to add user', details: error.message });
  }
});

router.post('/set-role', requireAuth, async (req, res) => {
  try {
    const { role } = req.body;

    const validRoles = ['farmer', 'trader', 'committee', 'admin', 'weight', 'accounting', 'lilav'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        validRoles
      });
    }

    const user = req.user;

    if (user.role && user.role !== 'farmer') {
      // Optional: Allow changing from default 'farmer' but restrict others if needed
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'Role set successfully',
      profile: user
    });
  } catch (error) {
    console.error('Set role error:', error);
    res.status(500).json({ error: 'Failed to set role' });
  }
});


/**
 * PATCH /api/users/:id
 * Update a specific user (Admin/Committee)
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating critical fields like password directly here if needed
    delete updates.password;
    delete updates._id;

    // Auto-generate initials if name changes
    if (updates.full_name) {
      const nameParts = updates.full_name.trim().split(' ');
      if (nameParts.length >= 2) {
        updates.initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      } else if (nameParts.length === 1) {
        updates.initials = nameParts[0].slice(0, 2).toUpperCase();
      }
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user (Admin/Committee)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;