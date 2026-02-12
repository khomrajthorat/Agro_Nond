import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Record from './src/models/Record.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const verifyStats = async () => {
    try {
        await connectDB();

        // aggregate again to be sure
        const pipeline = [
            { $match: { status: { $in: ['Sold', 'Completed'] }, payment_status: 'paid' } },
            {
                $group: {
                    _id: null,
                    sum_total_amount: { $sum: '$total_amount' },
                    sum_sale_amount: { $sum: '$sale_amount' },
                    sum_commission: { $sum: '$commission' },
                    sum_net_receivable: { $sum: '$net_receivable_from_trader' },
                }
            }
        ];
        const stats = await Record.aggregate(pipeline);
        const stat = stats[0];

        if (stat) {
            console.log(`\n--- DATABASE STATS (Status: Sold/Completed, Payment: Paid) ---`);
            console.log(`Sum Total Amount: ${stat.sum_total_amount}`);
            console.log(`Sum Sale Amount: ${stat.sum_sale_amount}`);
            console.log(`Sum Commission: ${stat.sum_commission}`);
            console.log(`Sum Net Receivable: ${stat.sum_net_receivable}`);
            console.log('--------------------------------------------------');

            const diff = stat.sum_total_amount - (stat.sum_sale_amount + stat.sum_commission);
            console.log(`Diff (TotalAmount - (Sale + Comm)): ${diff}`);
        } else {
            console.log("No paid records found.");
        }

        console.log('\n--- SAMPLE RECORD ---');
        const sample = await Record.findOne({ status: 'Sold', payment_status: 'paid' }).select('sale_amount commission total_amount net_receivable_from_trader');
        if (sample) {
            console.log('Sample Record:', JSON.stringify(sample, null, 2));
        }

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        process.exit();
    }
};

verifyStats();
