import mongoose from 'mongoose';

/**
 * DailyToken Schema
 * Tracks the last issued token number for a given date.
 * Used for atomic token counter increments.
 */
const dailyTokenSchema = new mongoose.Schema({
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        unique: true,
        index: true
    },
    count: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const DailyToken = mongoose.model('DailyToken', dailyTokenSchema);

export default DailyToken;
