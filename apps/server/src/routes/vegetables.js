import express from 'express';
import Vegetable from '../models/Vegetable.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Default vegetables to seed (from original hardcoded data)
const DEFAULT_VEGETABLES = [
    // Onion-Potato
    { name: 'Onion', marathiName: 'कांदा', category: 'Onion-Potato', units: ['kg'] },
    { name: 'Potato', marathiName: 'बटाटा', category: 'Onion-Potato', units: ['kg'] },
    { name: 'Garlic', marathiName: 'लसूण', category: 'Onion-Potato', units: ['kg'] },
    { name: 'Ginger', marathiName: 'आले / अद्रक', category: 'Onion-Potato', units: ['kg'] },
    { name: 'Sweet Potato', marathiName: 'रताळे', category: 'Onion-Potato', units: ['kg'] },

    // Daily Veg
    { name: 'Tomato', marathiName: 'टोमॅटो', category: 'Daily Veg', units: ['kg'] },
    { name: 'Brinjal / Eggplant', marathiName: 'वांगी', category: 'Daily Veg', units: ['kg'] },
    { name: 'Lady Finger / Okra', marathiName: 'भेंडी', category: 'Daily Veg', units: ['kg'] },
    { name: 'Green Chili', marathiName: 'हिरवी मिरची', category: 'Daily Veg', units: ['kg'] },
    { name: 'Capsicum', marathiName: 'ढोबळी मिरची', category: 'Daily Veg', units: ['kg'] },
    { name: 'Drumstick', marathiName: 'शेवगा', category: 'Daily Veg', units: ['kg'] },
    { name: 'Cucumber', marathiName: 'काकडी', category: 'Daily Veg', units: ['kg'] },
    { name: 'Lemon', marathiName: 'लिंबू', category: 'Daily Veg', units: ['kg', 'nag'] },

    // Leafy Veg
    { name: 'Coriander', marathiName: 'कोथिंबीर', category: 'Leafy Veg', units: ['kg', 'nag'] },
    { name: 'Fenugreek', marathiName: 'मेथी', category: 'Leafy Veg', units: ['kg', 'nag'] },
    { name: 'Spinach', marathiName: 'पालक', category: 'Leafy Veg', units: ['kg', 'nag'] },
    { name: 'Dill Leaves', marathiName: 'शेपू', category: 'Leafy Veg', units: ['kg', 'nag'] },
    { name: 'Amaranth', marathiName: 'लाल माठ', category: 'Leafy Veg', units: ['kg', 'nag'] },
    { name: 'Mint', marathiName: 'पुदिना', category: 'Leafy Veg', units: ['kg', 'nag'] },
    { name: 'Curry Leaves', marathiName: 'कढीपत्ता', category: 'Leafy Veg', units: ['kg', 'nag'] },
    { name: 'Spring Onion', marathiName: 'कांद्याची पात', category: 'Leafy Veg', units: ['kg', 'nag'] },

    // Vine Veg / Gourds
    { name: 'Bottle Gourd', marathiName: 'दुधी भोपळा', category: 'Vine Veg / Gourds', units: ['kg'] },
    { name: 'Bitter Gourd', marathiName: 'कारले', category: 'Vine Veg / Gourds', units: ['kg'] },
    { name: 'Ridge Gourd', marathiName: 'डोडका', category: 'Vine Veg / Gourds', units: ['kg'] },
    { name: 'Sponge Gourd', marathiName: 'घोसाळे', category: 'Vine Veg / Gourds', units: ['kg'] },
    { name: 'Snake Gourd', marathiName: 'पडवळ', category: 'Vine Veg / Gourds', units: ['kg'] },
    { name: 'Pumpkin', marathiName: 'लाल भोपळा / डांगर', category: 'Vine Veg / Gourds', units: ['kg'] },
    { name: 'Ash Gourd', marathiName: 'कोहळा', category: 'Vine Veg / Gourds', units: ['kg'] },

    // Beans / Pods
    { name: 'Cluster Beans', marathiName: 'गवार', category: 'Beans / Pods', units: ['kg'] },
    { name: 'French Beans', marathiName: 'फरसबी', category: 'Beans / Pods', units: ['kg'] },
    { name: 'Green Peas', marathiName: 'मटार / ओला वाटाणा', category: 'Beans / Pods', units: ['kg'] },
    { name: 'Flat Beans', marathiName: 'घेवडा / वाल', category: 'Beans / Pods', units: ['kg'] },
    { name: 'Double Beans', marathiName: 'डबल बी', category: 'Beans / Pods', units: ['kg'] },
    { name: 'Cowpea', marathiName: 'चवळी', category: 'Beans / Pods', units: ['kg'] },

    // Roots & Salad
    { name: 'Cabbage', marathiName: 'कोबी', category: 'Roots & Salad', units: ['kg'] },
    { name: 'Cauliflower', marathiName: 'फ्लॉवर', category: 'Roots & Salad', units: ['kg'] },
    { name: 'Carrot', marathiName: 'गाजर', category: 'Roots & Salad', units: ['kg'] },
    { name: 'Radish', marathiName: 'मुळा', category: 'Roots & Salad', units: ['kg'] },
    { name: 'Beetroot', marathiName: 'बीट', category: 'Roots & Salad', units: ['kg'] },
    { name: 'Elephant Foot Yam', marathiName: 'सुरण', category: 'Roots & Salad', units: ['kg'] },

    // Fruits
    { name: 'Banana', marathiName: 'केळी', category: 'Fruits', units: ['kg', 'nag'] },
    { name: 'Apple', marathiName: 'सफरचंद', category: 'Fruits', units: ['kg'] },
    { name: 'Pomegranate', marathiName: 'डाळिंब', category: 'Fruits', units: ['kg'] },
    { name: 'Guava', marathiName: 'पेरू', category: 'Fruits', units: ['kg'] },
    { name: 'Orange', marathiName: 'संत्री', category: 'Fruits', units: ['kg'] },
    { name: 'Sweet Lime', marathiName: 'मोसंबी', category: 'Fruits', units: ['kg'] },
    { name: 'Papaya', marathiName: 'पपई', category: 'Fruits', units: ['kg'] },
    { name: 'Watermelon', marathiName: 'कलिंगड', category: 'Fruits', units: ['kg'] },
    { name: 'Grapes', marathiName: 'द्राक्षे', category: 'Fruits', units: ['kg'] },
    { name: 'Custard Apple', marathiName: 'सीताफळ', category: 'Fruits', units: ['kg'] },
    { name: 'Mango', marathiName: 'आंबा', category: 'Fruits', units: ['kg'] },
    { name: 'Sapodilla', marathiName: 'चिकू', category: 'Fruits', units: ['kg'] },
    { name: 'Pineapple', marathiName: 'अननस', category: 'Fruits', units: ['kg', 'nag'] }
];

// GET /api/vegetables - List all vegetables (public)
router.get('/', async (req, res) => {
    try {
        const { category, active } = req.query;
        const filter = {};

        if (category) filter.category = category;
        if (active !== undefined) filter.isActive = active === 'true';

        const vegetables = await Vegetable.find(filter).sort({ category: 1, name: 1 });

        // Group by category for easier frontend consumption
        const grouped = vegetables.reduce((acc, veg) => {
            if (!acc[veg.category]) {
                acc[veg.category] = [];
            }
            acc[veg.category].push(veg);
            return acc;
        }, {});

        res.json({
            vegetables,
            grouped,
            count: vegetables.length
        });
    } catch (error) {
        console.error('Error fetching vegetables:', error);
        res.status(500).json({ error: 'Failed to fetch vegetables' });
    }
});

// POST /api/vegetables - Create new vegetable (admin/committee only)
router.post('/', requireAuth, requireRole('admin', 'committee'), async (req, res) => {
    try {
        const { name, marathiName, category, units } = req.body;

        if (!name || !marathiName) {
            return res.status(400).json({ error: 'Name and Marathi name are required' });
        }

        // Check for duplicate
        const existing = await Vegetable.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            return res.status(400).json({ error: 'Vegetable with this name already exists' });
        }

        const vegetable = new Vegetable({
            name: name.trim(),
            marathiName: marathiName.trim(),
            category: category?.trim() || 'Other',
            units: units || ['kg']
        });

        await vegetable.save();
        res.status(201).json({ message: 'Vegetable added successfully', vegetable });
    } catch (error) {
        console.error('Error creating vegetable:', error);
        res.status(500).json({ error: 'Failed to create vegetable' });
    }
});

// POST /api/vegetables/bulk - Bulk create vegetables (admin/committee only)
router.post('/bulk', requireAuth, requireRole('admin', 'committee'), async (req, res) => {
    try {
        const { vegetables } = req.body;

        if (!Array.isArray(vegetables) || vegetables.length === 0) {
            return res.status(400).json({ error: 'Vegetables array is required' });
        }

        const results = { added: 0, skipped: 0, errors: [] };

        for (const veg of vegetables) {
            try {
                if (!veg.name || !veg.marathiName) {
                    results.skipped++;
                    results.errors.push(`Missing name or marathiName for entry`);
                    continue;
                }

                const existing = await Vegetable.findOne({ name: { $regex: new RegExp(`^${veg.name}$`, 'i') } });
                if (existing) {
                    results.skipped++;
                    continue;
                }

                await Vegetable.create({
                    name: veg.name.trim(),
                    marathiName: veg.marathiName.trim(),
                    category: veg.category?.trim() || 'Other',
                    units: veg.units || ['kg']
                });
                results.added++;
            } catch (err) {
                results.errors.push(`Failed to add ${veg.name}: ${err.message}`);
            }
        }

        res.json({
            message: `Bulk import complete. Added: ${results.added}, Skipped: ${results.skipped}`,
            results
        });
    } catch (error) {
        console.error('Error bulk creating vegetables:', error);
        res.status(500).json({ error: 'Failed to bulk create vegetables' });
    }
});

// POST /api/vegetables/seed - Seed default vegetables (admin/committee only)
router.post('/seed', requireAuth, requireRole('admin', 'committee'), async (req, res) => {
    try {
        const existingCount = await Vegetable.countDocuments();

        if (existingCount > 0) {
            return res.status(400).json({
                error: 'Database already has vegetables. Clear them first or use bulk import.',
                existingCount
            });
        }

        await Vegetable.insertMany(DEFAULT_VEGETABLES);

        res.json({
            message: `Successfully seeded ${DEFAULT_VEGETABLES.length} default vegetables`,
            count: DEFAULT_VEGETABLES.length
        });
    } catch (error) {
        console.error('Error seeding vegetables:', error);
        res.status(500).json({ error: 'Failed to seed vegetables' });
    }
});

// POST /api/vegetables/bulk-delete - Bulk delete vegetables (admin/committee only)
router.post('/bulk-delete', requireAuth, requireRole('admin', 'committee'), async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs array is required' });
        }

        const result = await Vegetable.deleteMany({ _id: { $in: ids } });

        res.json({
            message: `Successfully deleted ${result.deletedCount} vegetables`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error bulk deleting vegetables:', error);
        res.status(500).json({ error: 'Failed to bulk delete vegetables' });
    }
});

// POST /api/vegetables/bulk-update - Bulk update vegetables (admin/committee only)
router.post('/bulk-update', requireAuth, requireRole('admin', 'committee'), async (req, res) => {
    try {
        const { ids, updates } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs array is required' });
        }

        if (!updates) {
            return res.status(400).json({ error: 'Updates object is required' });
        }

        const result = await Vegetable.updateMany(
            { _id: { $in: ids } },
            { $set: updates }
        );

        res.json({
            message: `Successfully updated ${result.modifiedCount} vegetables`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error bulk updating vegetables:', error);
        res.status(500).json({ error: 'Failed to bulk update vegetables' });
    }
});

// DELETE /api/vegetables/:id - Delete a vegetable (admin/committee only)
router.delete('/:id', requireAuth, requireRole('admin', 'committee'), async (req, res) => {
    try {
        const { id } = req.params;

        const vegetable = await Vegetable.findByIdAndDelete(id);
        if (!vegetable) {
            return res.status(404).json({ error: 'Vegetable not found' });
        }

        res.json({ message: 'Vegetable deleted successfully' });
    } catch (error) {
        console.error('Error deleting vegetable:', error);
        res.status(500).json({ error: 'Failed to delete vegetable' });
    }
});

// PUT /api/vegetables/:id - Update a vegetable (admin/committee only)
router.put('/:id', requireAuth, requireRole('admin', 'committee'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, marathiName, category, units, isActive } = req.body;

        const vegetable = await Vegetable.findById(id);
        if (!vegetable) {
            return res.status(404).json({ error: 'Vegetable not found' });
        }

        if (name) vegetable.name = name.trim();
        if (marathiName) vegetable.marathiName = marathiName.trim();
        if (category) vegetable.category = category.trim();
        if (units) vegetable.units = units;
        if (isActive !== undefined) vegetable.isActive = isActive;

        await vegetable.save();
        res.json({ message: 'Vegetable updated successfully', vegetable });
    } catch (error) {
        console.error('Error updating vegetable:', error);
        res.status(500).json({ error: 'Failed to update vegetable' });
    }
});

export default router;
