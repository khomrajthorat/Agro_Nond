import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Calendar,
    Package,
    User,
    Store,
    TrendingUp,
    ChevronRight,
    RefreshCw,
    Download,
    IndianRupee,
    Loader2,
    X,
    Edit,
    Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState(() => {
        // Default to today's date
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        weight: '',
        nag: '',
        rate: ''
    });
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchTransactions = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const params = dateFilter ? `?date=${dateFilter}` : '';
            const response = await api.get(`/api/records/completed${params}`);

            // Safe extraction of records array, handling various potential API formats
            let data = [];
            if (Array.isArray(response)) {
                data = response;
            } else if (response && Array.isArray(response.records)) {
                data = response.records;
            } else if (response && Array.isArray(response.data)) {
                data = response.data;
            }

            setTransactions(data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            if (showLoading) toast.error('Failed to load transactions');
            // Ensure transactions is always an array on error
            setTransactions([]);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [dateFilter]);

    useEffect(() => {
        fetchTransactions();
    }, [dateFilter, fetchTransactions]);

    // ✅ Auto-refresh transactions every 30 seconds
    useAutoRefresh(() => fetchTransactions(false), { interval: 30000 });

    const filteredTransactions = useMemo(() => {
        if (!Array.isArray(transactions)) return [];
        if (!searchTerm.trim()) return transactions;
        return transactions.filter(t =>
            t.vegetable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.farmer_id?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.trader_id?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.trader_id?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [transactions, searchTerm]);

    // Stats calculations
    const stats = useMemo(() => {
        if (!Array.isArray(transactions)) return { count: 0, totalAmount: 0, totalQty: 0, avgRate: 0 };

        const total = transactions.reduce((sum, t) => sum + (t.sale_amount || 0), 0);
        const totalQty = transactions.reduce((sum, t) => sum + (t.official_qty || 0), 0);
        return {
            count: transactions.length,
            totalAmount: total,
            totalQty: totalQty,
            avgRate: totalQty > 0 ? (total / totalQty).toFixed(2) : 0
        };
    }, [transactions]);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleEditClick = (e, tx) => {
        e.stopPropagation();
        setEditFormData({
            weight: tx.official_qty || '',
            nag: tx.nag || '',
            rate: tx.sale_rate || ''
        });
        setSelectedTransaction(tx);
        setIsEditModalOpen(true);
    };

    const handleUpdateRecord = async () => {
        if (!selectedTransaction) return;

        setIsUpdating(true);
        try {
            const updates = {
                official_qty: parseFloat(editFormData.weight),
                nag: parseFloat(editFormData.nag),
                sale_rate: parseFloat(editFormData.rate)
            };

            await api.records.update(selectedTransaction._id, updates);

            toast.success('Record updated successfully');
            setIsEditModalOpen(false);
            fetchTransactions(false); // Refresh list
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update record');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">History</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Transaction History</h1>
                    <p className="text-sm text-slate-500 mt-1 hidden sm:block">View completed auction sales and transactions</p>
                </div>

                <button
                    onClick={fetchTransactions}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by crop, farmer, or trader..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                </div>

                {/* Date Filter */}
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                </div>

                {dateFilter && (
                    <button
                        onClick={() => setDateFilter('')}
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors"
                    >
                        Clear Date
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 rounded-xl p-4 border border-emerald-100"
                >
                    <p className="text-xs text-emerald-600 font-medium uppercase">Total Sales</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.count}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-blue-50 rounded-xl p-4 border border-blue-100"
                >
                    <p className="text-xs text-blue-600 font-medium uppercase">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">₹{stats.totalAmount.toLocaleString()}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-purple-50 rounded-xl p-4 border border-purple-100"
                >
                    <p className="text-xs text-purple-600 font-medium uppercase">Total Qty</p>
                    <p className="text-2xl font-bold text-purple-700 mt-1">{stats.totalQty.toLocaleString()} kg</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-amber-50 rounded-xl p-4 border border-amber-100"
                >
                    <p className="text-xs text-amber-600 font-medium uppercase">Avg Rate</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">₹{stats.avgRate}/kg</p>
                </motion.div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredTransactions.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 bg-white rounded-xl border border-slate-200"
                >
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Transactions Found</h3>
                    <p className="text-slate-500">
                        {dateFilter ? `No transactions for ${new Date(dateFilter).toLocaleDateString()}` : 'No completed transactions yet'}
                    </p>
                </motion.div>
            )}

            {/* Transactions Table - Desktop */}
            {!loading && filteredTransactions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Crop</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Farmer</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Trader</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Qty</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Rate</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Amount</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Time</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((tx) => (
                                <tr
                                    key={tx._id}
                                    onClick={() => setSelectedTransaction(tx)}
                                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-slate-900">{tx.vegetable}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">
                                        {tx.farmer_id?.full_name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">
                                        {tx.trader_id?.business_name || tx.trader_id?.full_name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                                        {tx.official_qty} kg
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-slate-600">
                                        ₹{tx.sale_rate}/kg
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-emerald-600">₹{tx.sale_amount?.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-slate-500">
                                        {formatTime(tx.sold_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        <button
                                            onClick={(e) => handleEditClick(e, tx)}
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors"
                                            title="Edit Record"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            )}

            {/* Transactions Cards - Mobile */}
            {!loading && filteredTransactions.length > 0 && (
                <div className="md:hidden space-y-3">
                    {filteredTransactions.map((tx, index) => (
                        <motion.div
                            key={tx._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => setSelectedTransaction(tx)}
                            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={(e) => handleEditClick(e, tx)}
                                        className="p-2 bg-slate-50 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 pr-12">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{tx.vegetable}</h3>
                                        <p className="text-xs text-slate-500">{formatTime(tx.sold_at)}</p>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-emerald-600">₹{tx.sale_amount?.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 rounded-lg p-2">
                                    <p className="text-[10px] text-slate-400 uppercase">Qty</p>
                                    <p className="font-bold text-sm text-slate-700">{tx.official_qty} kg</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2">
                                    <p className="text-[10px] text-slate-400 uppercase">Rate</p>
                                    <p className="font-bold text-sm text-slate-700">₹{tx.sale_rate}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-2">
                                    <p className="text-[10px] text-slate-400 uppercase">Trader</p>
                                    <p className="font-bold text-sm text-slate-700 truncate">{tx.trader_id?.full_name?.split(' ')[0] || '-'}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Transaction Detail Modal */}
            <AnimatePresence>
                {selectedTransaction && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setSelectedTransaction(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-5 border-b border-slate-100 bg-emerald-50 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">Transaction Details</h3>
                                    <p className="text-sm text-slate-500">{formatDate(selectedTransaction.sold_at)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTransaction(null)}
                                    className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 space-y-4">
                                {/* Crop Info */}
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-900 text-lg">{selectedTransaction.vegetable}</p>
                                        <p className="text-sm text-slate-500">{selectedTransaction.official_qty} kg @ ₹{selectedTransaction.sale_rate}/kg</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-emerald-600">₹{selectedTransaction.sale_amount?.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Farmer */}
                                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium uppercase">Farmer</p>
                                        <p className="font-semibold text-slate-900">{selectedTransaction.farmer_id?.full_name || 'Unknown'}</p>
                                        <p className="text-sm text-slate-500">{selectedTransaction.farmer_id?.phone || '-'}</p>
                                    </div>
                                </div>

                                {/* Trader */}
                                <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <Store className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-purple-600 font-medium uppercase">Trader</p>
                                        <p className="font-semibold text-slate-900">
                                            {selectedTransaction.trader_id?.business_name || selectedTransaction.trader_id?.full_name || 'Unknown'}
                                        </p>
                                        <p className="text-sm text-slate-500">{selectedTransaction.trader_id?.phone || '-'}</p>
                                    </div>
                                </div>

                                {/* Sold By */}
                                {selectedTransaction.sold_by && (
                                    <div className="text-center text-sm text-slate-400">
                                        Processed by: {selectedTransaction.sold_by?.full_name || 'System'}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-slate-100 bg-slate-50">
                                <button
                                    onClick={() => setSelectedTransaction(null)}
                                    className="w-full px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg text-slate-900">Edit Record</h3>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
                                    <input
                                        type="number"
                                        value={editFormData.weight}
                                        onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nag</label>
                                    <input
                                        type="number"
                                        value={editFormData.nag}
                                        onChange={(e) => setEditFormData({ ...editFormData, nag: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rate (₹/kg or ₹/nag)</label>
                                    <input
                                        type="number"
                                        value={editFormData.rate}
                                        onChange={(e) => setEditFormData({ ...editFormData, rate: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-gray-50 flex gap-3">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateRecord}
                                    disabled={isUpdating}
                                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}