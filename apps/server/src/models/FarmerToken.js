import mongoose from 'mongoose';

/**
 * FarmerToken Schema
 * Maps a Farmer to their unique Token Number for a specific date.
 * Ensures each farmer gets one token per day.
 */
const farmerTokenSchema = new mongoose.Schema({
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        index: true
    },
    farmer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token_number: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient lookups
farmerTokenSchema.index({ date: 1, farmer_id: 1 }, { unique: true });
farmerTokenSchema.index({ date: 1, token_number: 1 }, { unique: true });

const FarmerToken = mongoose.model('FarmerToken', farmerTokenSchema);

export default FarmerToken;
