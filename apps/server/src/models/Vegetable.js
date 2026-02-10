import mongoose from 'mongoose';

const vegetableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    marathiName: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        default: 'Other',
        trim: true
    },
    // Allowed units for this vegetable
    // 'kg' = weight-based (kg, ton, quintal)
    // 'nag' = count-based
    units: {
        type: [String],
        enum: ['kg', 'nag'],
        default: ['kg']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for faster category lookups
vegetableSchema.index({ category: 1 });
vegetableSchema.index({ isActive: 1 });

const Vegetable = mongoose.model('Vegetable', vegetableSchema);

export default Vegetable;
