import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
    farmer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vegetable: {
        type: String,
        required: true
    },
    market: {
        type: String,
        required: true
    },
    // The quantity farmer says they have (Estimated)
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    // The quantity actually sold (confirmed by trader/weight)
    qtySold: {
        type: Number,
        default: 0
    },
    // Financials
    rate: {
        type: Number, // Price per unit
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    // Logistics
    trader: {
        type: String,
    },
    status: {
        type: String,
        enum: ['Pending', 'RateAssigned', 'Weighed', 'Sold', 'Completed'],
        default: 'Pending'
    },
    // Official weight checks (for Weight Dashboard)
    official_qty: {
        type: Number,
        default: 0
    },
    weighed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    weighed_at: {
        type: Date
    },
    // Sale/Auction fields
    trader_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sale_rate: {
        type: Number,
        default: 0
    },
    sale_amount: {
        type: Number,
        default: 0
    },
    sold_at: {
        type: Date
    },
    sold_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    payment_status: {
        type: String,
        enum: ['paid', 'pending', 'overdue'],
        default: 'pending'
    },
    lot_id: {
        type: String,
        unique: true,
        sparse: true
    },
    // Daily Token for quick farmer lookup
    token: {
        type: Number,
        default: null
    },
    commission: {
        type: Number,
        default: 0
    },
    total_amount: {
        type: Number,
        default: 0
    },
    // Split Commission & Net Amounts
    farmer_commission: {
        type: Number,
        default: 0
    },
    trader_commission: {
        type: Number,
        default: 0
    },
    net_payable_to_farmer: {
        type: Number,
        default: 0
    },
    net_receivable_from_trader: {
        type: Number,
        default: 0
    },
    // Captured Commission Rates (at time of sale)
    farmer_commission_rate: {
        type: Number,
        default: 0
    },
    trader_commission_rate: {
        type: Number,
        default: 0
    },
    // Detailed Payment Status
    farmer_payment_status: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    trader_payment_status: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    farmer_payment_mode: {
        type: String, // 'Cash', 'Cheque', 'Online'
    },
    trader_payment_mode: {
        type: String,
    },
    farmer_payment_ref: {
        type: String, // Cheque No / Transaction ID
    },
    trader_payment_ref: {
        type: String,
    },
    farmer_payment_date: {
        type: Date
    },
    trader_payment_date: {
        type: Date
    },
    // Nag Logic (single unit count, e.g., 1 apple = 1 Nag)
    nag: {
        type: Number,
        default: 0
    },
    official_nag: {
        type: Number,
        default: 0
    },
    sale_unit: {
        type: String,
        enum: ['kg', 'nag'],
        default: 'kg'
    },
    // Split Record Fields (for multi-trader lot splitting)
    parent_record_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Record'
    },
    is_parent: {
        type: Boolean,
        default: false
    },
    allocated_qty: {
        type: Number,
        default: 0
    },
    allocated_nag: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Pre-save hook to generate lot_id
recordSchema.pre('save', async function () {
    if (!this.isNew || this.lot_id) {
        return;
    }

    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(`${currentYear}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${currentYear}-12-31T23:59:59.999Z`);

        const count = await this.constructor.countDocuments({
            createdAt: { $gte: startOfYear, $lte: endOfYear }
        });

        const sequenceNumber = (count + 1).toString().padStart(3, '0');
        this.lot_id = `LOT-${currentYear}-${sequenceNumber}`;
    } catch (error) {
        throw error;
    }
});

const Record = mongoose.model('Record', recordSchema);

export default Record;