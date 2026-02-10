import express from 'express';
import SystemSetting from '../models/SystemSetting.js';

const router = express.Router();

/**
 * GET /api/settings/public/:key
 * Get a specific public system setting
 * No authentication required for this route as it's used for login page configuration
 */
router.get('/public/:key', async (req, res) => {
    try {
        const { key } = req.params;

        // Whitelist allowed public keys to prevent exposing sensitive internal settings
        const PUBLIC_KEYS = ['lilav_login_enabled'];

        if (!PUBLIC_KEYS.includes(key)) {
            return res.status(403).json({ error: 'Access denied to this setting' });
        }

        const setting = await SystemSetting.findOne({ key });

        // If setting doesn't exist, we need to decide on a default.
        // For 'lilav_login_enabled', specific default is true (allow login).
        if (!setting) {
            if (key === 'lilav_login_enabled') {
                return res.json({ key, value: true, isDefault: true });
            }
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json(setting);
    } catch (error) {
        console.error(`Fetch public setting ${req.params.key} error:`, error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

export default router;
