import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import BillingInvoice from '../../components/committee/BillingInvoice';


export default function TransactionDetailsModal({ transaction, onClose }) {
    const [isDownloading, setIsDownloading] = useState(false);

    if (!transaction) return null;

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            // Get trader profile for name
            let traderName = 'Trader';
            try {
                const storedProfile = localStorage.getItem('trader-profile');
                if (storedProfile) {
                    const profile = JSON.parse(storedProfile);
                    traderName = profile.business_name || profile.full_name || 'Trader';
                }
            } catch (e) {
                console.warn('Could not load trader profile');
            }

            // Map data for BillingInvoice
            const invoiceData = {
                id: transaction.id || transaction._id,
                date: transaction.date,
                name: traderName,
                crop: transaction.crop,
                qty: transaction.quantity || 0,
                nag: transaction.nag || transaction.official_nag || 0,
                baseAmount: transaction.grossAmount || 0,
                commission: transaction.commission || 0,
                finalAmount: transaction.totalCost || 0,
                status: (transaction.paymentStatus || '').toLowerCase() === 'paid' ? 'Paid' : 'Pending',
                type: 'receive'
            };

            const blob = await pdf(<BillingInvoice data={invoiceData} type="trader" />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice_${new Date(transaction.date).toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('Invoice downloaded successfully!');
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Transaction Details</h3>
                            <p className="text-sm text-slate-500">
                                {new Date(transaction.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-medium mb-1">Date</p>
                                <p className="font-semibold text-slate-800">
                                    {new Date(transaction.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-medium mb-1">Time</p>
                                <p className="font-semibold text-slate-800">
                                    {new Date(transaction.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-emerald-800 font-medium flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    {transaction.crop}
                                </span>
                                <span className="text-sm font-bold text-emerald-700">
                                    {transaction.quantity} kg
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-emerald-700">Rate per kg</span>
                                <span className="font-semibold text-emerald-800">₹{transaction.rate}</span>
                            </div>
                        </div>

                        {/* Billing Info */}
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Base Amount</span>
                                <span className="font-semibold text-slate-800">₹{transaction.grossAmount?.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Market Commission ({transaction.grossAmount ? Math.round((transaction.commission / transaction.grossAmount) * 100) : 0}%)</span>
                                <span className="font-medium text-emerald-600">+₹{transaction.commission?.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="h-px bg-slate-100 my-2" />
                            <div className="flex justify-between text-base">
                                <span className="font-bold text-slate-800">Total Payable</span>
                                <span className="font-bold text-emerald-600">₹{transaction.totalCost?.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="pt-2">
                            {(() => {
                                const status = (transaction.paymentStatus || '').toLowerCase();
                                const isPaid = status === 'paid';
                                const isPending = status === 'pending';

                                const colorClasses = isPaid
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : isPending
                                        ? 'bg-amber-50 border-amber-100 text-amber-700'
                                        : 'bg-red-50 border-red-100 text-red-700';

                                const dotClasses = isPaid
                                    ? 'bg-emerald-500'
                                    : isPending
                                        ? 'bg-amber-500'
                                        : 'bg-red-500';

                                return (
                                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${colorClasses}`}>
                                        <div className={`w-2 h-2 rounded-full ${dotClasses}`} />
                                        <span className="font-medium capitalize">
                                            Payment Status: {transaction.paymentStatus}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            {isDownloading ? 'Generating...' : 'Download Invoice'}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}