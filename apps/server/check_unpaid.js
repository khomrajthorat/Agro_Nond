import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Record from './src/models/Record.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (error) {
        process.exit(1);
    }
};

const inspectUnpaid = async () => {
    await connectDB();

    console.log('\n--- Inspecting Unpaid Sold/Completed Records ---');
    const unpaid = await Record.find({
        status: { $in: ['Sold', 'Completed'] },
        payment_status: { $ne: 'paid' }
    }).select('sale_amount total_amount status payment_status quantity nag');

    console.table(unpaid.map(r => ({
        id: r._id,
        sale_amount: r.sale_amount,
        total_amount: r.total_amount,
        status: r.status,
        payment_status: r.payment_status,
        qty: r.quantity,
        nag: r.nag
    })));

    process.exit();
};

inspectUnpaid();
