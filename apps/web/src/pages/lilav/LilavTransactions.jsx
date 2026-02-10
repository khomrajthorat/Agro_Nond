import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Package,
    ChevronLeft,
    ArrowUpDown,
    X,
    ShoppingBasket,
    Wallet,
    ReceiptText,
    Eye,
    Scale
} from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

const cropsList = ['All Crops', 'Tomatoes', 'Onions', 'Potatoes', 'Cabbage', 'Brinjal', 'Cauliflower', 'Green Chillies', 'Carrots'];

export default function LilavTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCrop, setSelectedCrop] = useState('All Crops');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [showFilters, setShowFilters] = useState(false);

    // Date State - Default to TODAY
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date().toISOString().split('T')[0];
        return { start: today, end: today };
    });

    useEffect(() => {
        fetchTransactions();
    }, [dateRange]); // Refetch when date changes (which is initialized to today)

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            // Pass date range to API if supported, otherwise fetch all and filter client side.
            // Assuming generic list endpoint supports basic filtering or we filter manually.
            // Using a limit to avoid fetching too much history if backend doesn't filter.
            const response = await api.purchases.list({
                startDate: dateRange.start,
                endDate: dateRange.end,
                limit: 500
            });

            const data = Array.isArray(response) ? response : (response.data || []);

            // Transform data - UPDATED: Include nag values
            const formattedData = data.map(t => {
                // Get effective values (official or farmer's initial)
                const qtyValue = (t.official_qty && t.official_qty > 0)
                    ? t.official_qty
                    : (t.quantity || 0);
                const nagValue = (t.official_nag && t.official_nag > 0)
                    ? t.official_nag
                    : (t.nag || 0);

                return {
                    id: t._id,
                    lotId: t.lot_id,
                    date: t.sold_at || t.createdAt,
                    crop: t.vegetable,
                    quantity: qtyValue,
                    nag: nagValue,
                    sale_unit: t.sale_unit || 'kg',
                    rate: t.sale_rate,
                    grossAmount: t.sale_amount,
                    traderName: t.trader_id?.full_name || 'Unknown',
                    farmerName: t.farmer_id?.full_name || 'Unknown',
                    status: t.status,
                };
            });

            // Double check client-side filtering for dates to be safe
            const filteredByDate = formattedData.filter(t => {
                if (!dateRange.start && !dateRange.end) return true;
                const txnDate = new Date(t.date).toISOString().split('T')[0];
                const start = dateRange.start;
                const end = dateRange.end;
                return (!start || txnDate >= start) && (!end || txnDate <= end);
            });

            setTransactions(filteredByDate);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort transactions (Client side for other filters)
    const filteredTransactions = useMemo(() => {
        let result = [...transactions];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                (t.lotId && t.lotId.toLowerCase().includes(query)) ||
                (t.crop && t.crop.toLowerCase().includes(query)) ||
                (t.traderName && t.traderName.toLowerCase().includes(query)) ||
                (t.farmerName && t.farmerName.toLowerCase().includes(query))
            );
        }

        // Crop filter
        if (selectedCrop !== 'All Crops') {
            result = result.filter(t => t.crop === selectedCrop);
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (sortConfig.key === 'date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [transactions, searchQuery, selectedCrop, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCrop('All Crops');
        // We do NOT clear date range to empty, we reset to TODAY as per requirement
        const today = new Date().toISOString().split('T')[0];
        setDateRange({ start: today, end: today });
    };

    // Calculate totals - UPDATED: Include nag total
    const totals = useMemo(() => ({
        count: filteredTransactions.length,
        quantity: filteredTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0),
        nag: filteredTransactions.reduce((sum, t) => sum + (t.nag || 0), 0),
        amount: filteredTransactions.reduce((sum, t) => sum + (t.grossAmount || 0), 0),
    }), [filteredTransactions]);

    const isToday = () => {
        const today = new Date().toISOString().split('T')[0];
        return dateRange.start === today && dateRange.end === today;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Review Transactions</h1>
                    <p className="text-sm sm:text-base text-slate-500 mt-1">
                        {isToday() ? "Showing today's live auction records" : "Showing historical transaction records"}
                    </p>
                </div>

                {/* Date Picker - Prominent */}

            </motion.div>

            {/* Summary Stats - UPDATED: Show both kg and Nag */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-3 sm:gap-4"
            >
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute right-2 top-2 p-2 bg-slate-50 rounded-lg">
                        <ReceiptText className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Sales</p>
                    <p className="text-2xl font-bold text-slate-800">{totals.count}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute right-2 top-2 p-2 bg-slate-50 rounded-lg">
                        <ShoppingBasket className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Quantity</p>
                    {/* UPDATED: Show both kg and Nag */}
                    <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-2xl font-bold text-slate-800">
                            {totals.quantity.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-400">kg</span>
                        </p>
                        {totals.nag > 0 && (
                            <p className="text-2xl font-bold text-purple-600">
                                {totals.nag.toLocaleString('en-IN')} <span className="text-sm font-normal text-purple-400">Nag</span>
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Search & Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
                <div className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by ID, Crop, Trader or Farmer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                        {(searchQuery || selectedCrop !== 'All Crops') && (
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-red-600 hover:bg-red-50 text-sm font-medium"
                            >
                                <X className="w-4 h-4" />
                                Clear
                            </button>
                        )}
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 border-t border-slate-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Crop</label>
                                            <select
                                                value={selectedCrop}
                                                onChange={(e) => setSelectedCrop(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                            >
                                                {cropsList.map(crop => (
                                                    <option key={crop} value={crop}>{crop}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-y border-slate-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <button onClick={() => handleSort('date')} className="inline-flex items-center gap-1 hover:text-emerald-600">
                                        Time
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Lot Info</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Parties</th>
                                {/* UPDATED: Changed header to show both units */}
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty (kg/Nag)</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((txn, index) => (
                                <motion.tr
                                    key={`txn-${txn.id || index}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        <div className="font-medium text-slate-900">
                                            {new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400 font-mono mb-1">{txn.lotId}</span>
                                            <span className="inline-flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                                                <Package className="w-3 h-3" />
                                                {txn.crop}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                {txn.farmerName}
                                            </span>
                                            <span className="text-xs text-slate-900 font-medium flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                Tr: {txn.traderName}
                                            </span>
                                        </div>
                                    </td>
                                    {/* UPDATED: Show both kg and Nag in Qty column */}
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="text-sm font-medium text-slate-700">
                                                {txn.quantity?.toLocaleString('en-IN')} kg
                                            </span>
                                            {txn.nag > 0 && (
                                                <span className="text-xs font-medium text-purple-600">
                                                    {txn.nag?.toLocaleString('en-IN')} Nag
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {/* UPDATED: Show rate with unit */}
                                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                                        ₹{txn.rate}/{txn.sale_unit === 'nag' ? 'Nag' : 'kg'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                            {txn.status || 'Sold'}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredTransactions.length === 0 && (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No transactions found for {isToday() ? "today" : "this date"}</p>
                        </div>
                    )}
                </div>

                {/* Mobile Card View - UPDATED: Show both kg and Nag */}
                <div className="md:hidden space-y-3 p-4">
                    {filteredTransactions.map((txn, index) => (
                        <div
                            key={`mobile-txn-${txn.id || index}`}
                            className="bg-slate-50 rounded-xl p-4 border border-slate-100"
                        >
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-mono text-slate-400">{txn.lotId}</span>
                                <span className="text-xs font-bold text-slate-600">{new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div className="flex justify-between items-center mb-3">
                                <span className="font-bold text-slate-800">{txn.crop}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                                <div>
                                    <span className="block text-slate-400 text-[10px]">Farmer</span>
                                    {txn.farmerName}
                                </div>
                                <div className="text-right">
                                    <span className="block text-slate-400 text-[10px]">Trader</span>
                                    {txn.traderName}
                                </div>
                            </div>

                            {/* UPDATED: Show both kg and Nag with rate unit */}
                            <div className="flex justify-between border-t border-slate-200 pt-2 text-xs">
                                <div className="flex flex-col">
                                    <span className="text-slate-700">
                                        {txn.quantity} kg @ ₹{txn.rate}/{txn.sale_unit === 'nag' ? 'Nag' : 'kg'}
                                    </span>
                                    {txn.nag > 0 && (
                                        <span className="text-purple-600 font-medium">
                                            {txn.nag} Nag
                                        </span>
                                    )}
                                </div>
                                <span className="text-green-600 font-bold">{txn.status}</span>
                            </div>
                        </div>
                    ))}

                    {filteredTransactions.length === 0 && (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">No transactions found for {isToday() ? "today" : "this date"}</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}