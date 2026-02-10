import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Record from '../src/models/Record.js';

// Setup dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from parent directory (server root)
dotenv.config({ path: path.join(__dirname, '../.env') });

const debugRecord = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const recordId = '697db164ab07a6044a6eb9c9';
        console.log(`Fetching record: ${recordId}`);

        const record = await Record.findById(recordId);

        if (!record) {
            console.log('Record NOT FOUND');
        } else {
            console.log('Record Found:');
            console.log('Vegetable:', record.vegetable);
            console.log('Quantity:', record.quantity);
            console.log('Official Qty:', record.official_qty);
            console.log('Nag:', record.nag);
            console.log('Official Nag:', record.official_nag);
            console.log('Sale Unit:', record.sale_unit);
            console.log('Is Parent:', record.is_parent);
            console.log('Parent Record ID:', record.parent_record_id);
            console.log('Status:', record.status);

            // Check children if parent
            if (record.is_parent) {
                console.log('Checking children...');
                const children = await Record.find({ parent_record_id: record._id });
                console.log(`Found ${children.length} children.`);
                children.forEach((c, i) => {
                    console.log(`Child ${i}: Status=${c.status} Qty=${c.official_qty || c.quantity} Nag=${c.official_nag || c.nag}`);
                });
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    }
};

debugRecord();
