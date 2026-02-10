import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';

const router = express.Router();

// Temporary in-memory OTP store (Use Redis in production)
const otpStore = new Map();

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '30d',
    });
};

/**
 * @desc    Login/Register with Phone
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post('/login', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    // Generate Mock OTP
    const otp = '123456';
    // In a real app, generate random 6 digit number

    // Store OTP with expiration (5 minutes)
    otpStore.set(phone, { otp, expires: Date.now() + 5 * 60 * 1000 });

    console.log(`[MOCK OTP] For ${phone}: ${otp}`);

    // In real app, send SMS via Twilio/Brevo here

    res.status(200).json({
        message: 'OTP sent successfully',
        dev_hint: 'Use 123456 as OTP'
    });
});

/**
 * @desc    Verify OTP and Get Token
 * @route   POST /api/auth/verify
 * @access  Public
 */
router.post('/verify', async (req, res) => {
    console.log('[Auth Debug] Verify request received body:', req.body);
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        console.log('[Auth Debug] Missing phone or otp');
        return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const storedOtpData = otpStore.get(phone);
    console.log('[Auth Debug] Stored OTP for', phone, ':', storedOtpData);

    if (!storedOtpData) {
        console.log('[Auth Debug] No OTP found');
        return res.status(400).json({ error: 'No OTP requested for this phone' });
    }

    if (Date.now() > storedOtpData.expires) {
        console.log('[Auth Debug] OTP expired');
        otpStore.delete(phone);
        return res.status(400).json({ error: 'OTP expired' });
    }

    if (storedOtpData.otp !== otp) {
        console.log('[Auth Debug] Invalid OTP. Expected:', storedOtpData.otp, 'Got:', otp);
        return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP Valid
    otpStore.delete(phone); // Clear OTP
    console.log('[Auth Debug] OTP Valid. Searching for user...');

    try {
        console.log('[Verify] Checking user for phone:', phone);

        // Flexible lookup: Find ALL matching users (to handle duplicates like +91 vs raw)
        const rawPhone = phone.replace(/^\+91/, '');
        let users = await User.find({
            $or: [
                { phone: phone },
                { phone: rawPhone },
                { phone: `+91${rawPhone}` }
            ]
        });
        console.log('[Auth Debug] Users found:', users.length);

        // Smart selection priority: Admin > Committee > Weight > Accounting > Trader > Farmer
        const rolePriority = { 'admin': 6, 'committee': 5, 'weight': 4, 'accounting': 3, 'trader': 2, 'farmer': 1, 'lilav': 1 };

        let user = null;
        if (users.length > 0) {
            // Sort by priority and pick the highest
            user = users.sort((a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0))[0];
        }

        console.log('[Verify] User found:', user ? `Yes (${user._id}, ${user.role})` : 'No');

        // If not, create new user
        if (!user) {
            console.log('[Verify] Creating new user...');
            try {
                user = await User.create({
                    phone, // Save with the format used during login
                });
                console.log('[Verify] User created:', user._id);
            } catch (creatError) {
                console.error('[Verify] Critical Error creating user:', creatError);
                return res.status(500).json({
                    error: 'Failed to create user account',
                    details: creatError.message
                });
            }
        }

        // CHECK: Lilav Login Restricted?
        if (['lilav', 'committee', 'weight'].includes(user.role)) {
            const loginSetting = await SystemSetting.findOne({ key: 'lilav_login_enabled' });
            // Default to true (allowed) if setting missing, but if false, BLOCK.
            if (loginSetting && loginSetting.value === false) {
                console.log(`[Auth] Blocked login for ${user.role} (System Locked)`);
                return res.status(403).json({ error: 'Market staff login is currently disabled by administrator.' });
            }
        }

        // Generate Token
        console.log('[Verify] Generating token...');
        const token = generateToken(user._id);
        console.log('[Verify] Token generated.');

        return res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                phone: user.phone,
                role: user.role,
                full_name: user.full_name,
                email: user.email,
                location: user.location,
                profile_picture: user.profile_picture,
                business_name: user.business_name,
                customId: user.customId
            }
        });

    } catch (error) {
        console.error('Auth Verify Critical Error:', error);
        // Send a simple string if JSON fails
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Server error during verification: ' + error.message });
        }
    }
});

/**
 * @desc    Logout (Client side clears token)
 * @route   POST /api/auth/logout
 * @access  Public
 */
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

export default router;
