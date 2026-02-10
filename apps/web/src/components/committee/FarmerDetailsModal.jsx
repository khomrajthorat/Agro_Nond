import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MapPin, Calendar, IndianRupee, Package, Wheat, TrendingUp, Edit2, Trash2, Check, Save, AlertTriangle, Download } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// Helper function for clean quantity display
const formatQtyDisplay = (qty, nag) => {
    const hasQty = qty && qty > 0;
    const hasNag = nag && nag > 0;

    if (hasQty && hasNag) {
        return <>{qty} kg <span className="text-purple-600 font-medium">| {nag} Nag</span></>;
    } else if (hasNag) {
        return <span className="text-purple-600 font-medium">{nag} Nag</span>;
    } else {
        return <>{qty || 0} kg</>;
    }
};

// Helper to get rate unit
const getRateUnit = (qty, nag) => {
    const hasNag = nag && nag > 0;
    const hasQty = qty && qty > 0;
    return hasNag && !hasQty ? 'Nag' : 'kg';
};

export default function FarmerDetailsModal({ isOpen, onClose, farmer }) {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && farmer?._id) {
            fetchHistory();
            setEditForm({
                full_name: farmer.full_name,
                phone: farmer.phone,
                location: farmer.location || ''
            });
            setIsEditing(false);
            setShowDeleteConfirm(false);
        }
    }, [isOpen, farmer]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/records/farmer/${farmer._id}/history`);
            setHistory(response.records || []);
            setStats(response.stats);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditToggle = () => {
        if (isEditing) {
            setEditForm({
                full_name: farmer.full_name,
                phone: farmer.phone,
                location: farmer.location || ''
            });
        }
        setIsEditing(!isEditing);
    };

    const handleSave = async () => {
        try {
            await api.patch(`/api/users/${farmer._id}`, editForm);
            toast.success('Farmer details updated');
            setIsEditing(false);
            window.location.reload();
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update details');
        }
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await api.delete(`/api/users/${farmer._id}`);
            toast.success('Farmer deleted successfully');
            onClose();
            window.location.reload();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete farmer');
        }
    };

    const handleDownloadReport = async () => {
        try {
            const blob = await api.get(`/api/committee/download-user-report/${farmer._id}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `farmer_report_${farmer.full_name}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download report');
        }
    };

    if (!isOpen || !farmer) return null;

    // Vegetable color mapping
    const vegetableColors = {
        'Tomato': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        'Onion': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
        'Potato': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        'Cabbage': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
        'Cauliflower': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
        'Green Chilli': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200' },
        'Capsicum': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
        'Garlic': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
        'Ginger': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
        'Brinjal': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    };

    const getVegetableColor = (veg) => vegetableColors[veg] || { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="max-w-5xl w-[95%] max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
                        >
                            {/* Delete Confirmation Overlay */}
                            {showDeleteConfirm && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center max-w-sm"
                                    >
                                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertTriangle className="text-red-600 w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Farmer?</h3>
                                        <p className="text-slate-500 mb-6">
                                            Are you sure you want to delete <span className="font-semibold text-slate-700">{farmer.full_name}</span>? This action cannot be undone.
                                        </p>
                                        <div className="flex gap-3 justify-center">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmDelete}
                                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-200 transition-colors"
                                            >
                                                Yes, Delete
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-emerald-500/20">
                                        {farmer.initials || (farmer.full_name ? farmer.full_name[0] : 'F')}
                                    </div>
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <div className="space-y-2 max-w-md">
                                                <input
                                                    type="text"
                                                    value={editForm.full_name}
                                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                    className="w-full px-2 py-1 text-2xl font-bold border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={editForm.phone}
                                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                        placeholder="Phone"
                                                        className="w-1/2 px-2 py-1 text-sm border border-slate-300 rounded focus:border-emerald-500 outline-none"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editForm.location}
                                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                        placeholder="Location"
                                                        className="w-1/2 px-2 py-1 text-sm border border-slate-300 rounded focus:border-emerald-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <h2 className="text-2xl font-bold text-slate-800">{farmer.full_name}</h2>
                                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1.5">
                                                        <Phone className="w-4 h-4" />
                                                        {farmer.phone}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin className="w-4 h-4" />
                                                        {farmer.location || 'Location not set'}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                                        ID: {farmer.farmerId || 'N/A'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!isEditing && (
                                        <button
                                            onClick={handleDownloadReport}
                                            className="p-2 mr-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2"
                                            title="Download Report"
                                        >
                                            <Download className="w-5 h-5" />
                                            <span className="text-sm font-medium hidden sm:inline">Report</span>
                                        </button>
                                    )}

                                    {isEditing ? (
                                        <button
                                            onClick={handleSave}
                                            className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                            title="Save Changes"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleEditToggle}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                            title="Edit Farmer"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                    )}

                                    {isEditing && (
                                        <button
                                            onClick={handleEditToggle}
                                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                            title="Cancel Edit"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}

                                    {!isEditing && (
                                        <>
                                            <button
                                                onClick={handleDelete}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                                                title="Delete Farmer"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                            <button
                                                onClick={onClose}
                                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="w-6 h-6" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Content Scrollable Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {loading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Stats Cards */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                        <IndianRupee className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <p className="text-sm font-medium text-emerald-900">Total Revenue</p>
                                                </div>
                                                <p className="text-2xl font-bold text-emerald-700">₹{stats?.totalRevenue?.toLocaleString() || 0}</p>
                                            </div>

                                            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                                        <Package className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <p className="text-sm font-medium text-blue-900">Total Quantity</p>
                                                </div>
                                                <p className="text-2xl font-bold text-blue-700">
                                                    {stats?.totalQuantity > 0 && stats?.totalNag > 0 ? (
                                                        <>{stats.totalQuantity.toLocaleString()} kg <span className="text-purple-600">| {stats.totalNag.toLocaleString()} Nag</span></>
                                                    ) : stats?.totalNag > 0 ? (
                                                        <span className="text-purple-600">{stats.totalNag.toLocaleString()} Nag</span>
                                                    ) : (
                                                        <>{stats?.totalQuantity?.toLocaleString() || 0} kg</>
                                                    )}
                                                </p>
                                            </div>

                                            <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                                        <Wheat className="w-5 h-5 text-purple-600" />
                                                    </div>
                                                    <p className="text-sm font-medium text-purple-900">Vegetables</p>
                                                </div>
                                                <p className="text-2xl font-bold text-purple-700">{stats?.vegetableSummary?.length || 0} types</p>
                                            </div>

                                            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                                        <TrendingUp className="w-5 h-5 text-amber-600" />
                                                    </div>
                                                    <p className="text-sm font-medium text-amber-900">Pending Payment</p>
                                                </div>
                                                <p className="text-2xl font-bold text-amber-600">₹{stats?.pendingPayment?.toLocaleString() || 0}</p>
                                            </div>
                                        </div>

                                        {/* Vegetable Breakdown */}
                                        {stats?.vegetableSummary?.length > 0 && (
                                            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Vegetables Brought</h3>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                                    {stats.vegetableSummary.map((veg) => {
                                                        const colors = getVegetableColor(veg.name);
                                                        // Check for nag in vegetable summary
                                                        const hasNag = veg.nag && veg.nag > 0;
                                                        const hasQty = veg.quantity && veg.quantity > 0;
                                                        return (
                                                            <div key={veg.name} className={`${colors.bg} ${colors.border} border rounded-xl p-3`}>
                                                                <p className={`text-xs font-bold ${colors.text} uppercase mb-1`}>{veg.name}</p>
                                                                {/* CLEAN DISPLAY */}
                                                                <p className="text-lg font-bold text-slate-800">
                                                                    {hasQty && hasNag ? (
                                                                        <>{veg.quantity} kg <span className="text-purple-600">| {veg.nag} Nag</span></>
                                                                    ) : hasNag ? (
                                                                        <span className="text-purple-600">{veg.nag} Nag</span>
                                                                    ) : (
                                                                        <>{veg.quantity || 0} kg</>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-slate-500 opacity-80">{veg.count} lots</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Transaction History Table */}
                                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Transaction History</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-slate-50 border-b border-slate-100">
                                                        <tr>
                                                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Date</th>
                                                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Item</th>
                                                            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Trader</th>
                                                            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Qty</th>
                                                            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Rate</th>
                                                            <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Total</th>
                                                            <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {history.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                                                    No sales history found for this farmer.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            history.map((record) => {
                                                                const colors = getVegetableColor(record.vegetable);
                                                                // Get qty and nag values
                                                                const qty = record.official_qty || record.quantity || 0;
                                                                const nag = record.official_nag || record.nag || 0;
                                                                const rateUnit = getRateUnit(qty, nag);

                                                                return (
                                                                    <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                                                                        <td className="px-6 py-4 text-sm text-slate-600">
                                                                            {new Date(record.createdAt).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                                                                                {record.vegetable}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-sm text-slate-600">
                                                                            {record.trader_id?.business_name || record.trader_id?.full_name || '-'}
                                                                        </td>
                                                                        {/* CLEAN QTY DISPLAY */}
                                                                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">
                                                                            {formatQtyDisplay(qty, nag)}
                                                                        </td>
                                                                        {/* DYNAMIC RATE UNIT */}
                                                                        <td className="px-6 py-4 text-right text-sm text-slate-600">
                                                                            {record.sale_rate ? `₹${record.sale_rate}/${rateUnit}` : '-'}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            {record.total_amount ? (
                                                                                <span className="font-bold text-emerald-600">₹{record.total_amount.toLocaleString()}</span>
                                                                            ) : '-'}
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex justify-center">
                                                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.status === 'Sold' || record.status === 'Completed'
                                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                                    : record.status === 'Weighed'
                                                                                        ? 'bg-blue-100 text-blue-700'
                                                                                        : 'bg-amber-100 text-amber-700'
                                                                                    }`}>
                                                                                    {record.status}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}