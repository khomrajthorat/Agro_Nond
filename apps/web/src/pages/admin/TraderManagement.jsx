import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Building2, Phone, FileCheck, Filter, ChevronRight, X, AlertTriangle, IndianRupee, Package, Wheat, TrendingUp, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import api from '../../lib/api';

// --- Helper Functions ---
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

const getRateUnit = (qty, nag) => {
    const hasNag = nag && nag > 0;
    const hasQty = qty && qty > 0;
    return hasNag && !hasQty ? 'Nag' : 'kg';
};

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

// --- Sub-Component for Detailed Stats ---
function TraderAnalytics({ traderId }) {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (traderId) {
            fetchHistory();
        }
    }, [traderId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/api/committee/traders/${traderId}/history`);
            setHistory(response.records || []);
            setStats(response.stats);
        } catch (error) {
            console.error('Failed to fetch trader history:', error);
            // Fallback empty
            setHistory([]);
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 border border-emerald-100 rounded-2xl bg-slate-50">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-emerald-900">Total Purchases</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">₹{stats?.totalPurchaseValue?.toLocaleString() || 0}</p>
                </div>

                <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-blue-900">Total Quantity</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{stats?.totalQuantity?.toLocaleString() || 0} kg</p>
                </div>

                <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Wheat className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-sm font-medium text-purple-900">Varieties</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{stats?.vegetableSummary?.length || 0} types</p>
                </div>

                <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-sm font-medium text-amber-900">Pending Due</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">₹{stats?.pendingPayment?.toLocaleString() || 0}</p>
                </div>
            </div>

            {/* Vegetable Breakdown */}
            {stats?.vegetableSummary?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Vegetables Purchased</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {stats.vegetableSummary.map((veg) => {
                            const colors = getVegetableColor(veg.name);
                            const hasNag = veg.nag && veg.nag > 0;
                            const hasQty = veg.quantity && veg.quantity > 0;
                            return (
                                <div key={veg.name} className={`${colors.bg} ${colors.border} border rounded-xl p-3`}>
                                    <p className={`text-xs font-bold ${colors.text} uppercase mb-1`}>{veg.name}</p>
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
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Date</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Item</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Qty</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Rate</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                        No purchase history found.
                                    </td>
                                </tr>
                            ) : (
                                history.map((record) => {
                                    const colors = getVegetableColor(record.vegetable);
                                    const qty = record.official_qty || record.quantity || 0;
                                    const nag = record.official_nag || record.nag || 0;
                                    const rateUnit = getRateUnit(qty, nag);

                                    return (
                                        <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {new Date(record.sold_at || record.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                                                    {record.vegetable}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">
                                                {formatQtyDisplay(qty, nag)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-slate-600">
                                                {record.sale_rate ? `₹${record.sale_rate}/${rateUnit}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {record.sale_amount ? (
                                                    <span className="font-bold text-emerald-600">₹{record.sale_amount.toLocaleString()}</span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function TraderManagement() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTrader, setSelectedTrader] = useState(null);
    const queryClient = useQueryClient();

    const { data: traders, isLoading } = useQuery({
        queryKey: ['admin-traders'],
        queryFn: () => api.admin.traders()
    });

    // License Approval Mutation
    const approveMutation = useMutation({
        mutationFn: (data) => api.admin.users.update(selectedTrader._id, data),
        onSuccess: (updatedData) => {
            queryClient.invalidateQueries(['admin-traders']);

            // Optimistically update the selected trader in the modal
            setSelectedTrader(prev => ({
                ...prev,
                ...updatedData,
                // Ensure license_number is set if API doesn't return the full object in a way we expect
                license_number: updatedData.license_number || prev.license_number
            }));

            toast.success('License approved successfully!');
        },
        onError: (err) => {
            toast.error('Failed to approve license');
            console.error(err);
        }
    });

    const [licenseInput, setLicenseInput] = useState('');

    const handleApproveLicense = () => {
        toast((t) => (
            <div className="flex flex-col gap-2">
                <p className="font-medium text-slate-800">
                    Generate/Approve license for this trader?
                </p>
                <div className="flex justify-end gap-2 mt-2">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            confirmLicenseApproval();
                        }}
                        className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        Approve
                    </button>
                </div>
            </div>
        ), { duration: 5000 });
    };

    const confirmLicenseApproval = () => {
        let license_number = licenseInput.trim();

        if (!license_number) {
            const year = new Date().getFullYear();
            const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
            license_number = `TRD-${year}-${rand}`;
        }

        // Pass the new or manual license number to the mutation
        approveMutation.mutate({ license_number });
    };

    const filteredTraders = traders?.filter(trader =>
        trader.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trader.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trader.phone?.includes(searchTerm)
    );

    const handleDownloadUserReport = async () => {
        if (!selectedTrader) return;
        try {
            const blob = await api.get(`/api/admin/download-user-report/${selectedTrader._id}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `trader_report_${selectedTrader.full_name || selectedTrader.business_name}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download report');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Trader Management</h1>
                    <p className="text-gray-500 mt-1">View and manage registered traders and licenses</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input
                            type="text"
                            placeholder="Search traders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full sm:w-64 border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                        />
                    </div>
                    <button className="p-2 bg-white border border-emerald-100 rounded-xl text-emerald-600 hover:bg-emerald-50 shadow-sm transition-colors">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-emerald-50/50 border-b border-emerald-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Trader Profile</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Business Info</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">License Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-emerald-800 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-50">
                            {isLoading ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-500">Loading traders...</td></tr>
                            ) : filteredTraders?.length === 0 ? (
                                <tr><td colSpan="4" className="p-8 text-center text-slate-500">No traders found</td></tr>
                            ) : (
                                filteredTraders?.map((trader) => (
                                    <tr key={trader._id} className="hover:bg-emerald-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shadow-sm ring-2 ring-white">
                                                    {trader.business_name?.[0] || trader.full_name?.[0] || 'T'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{trader.full_name}</p>
                                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                                        <Phone className="w-3 h-3" /> {trader.phone}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="font-medium text-slate-800 flex items-center gap-2">
                                                    <Building2 className="w-3 h-3 text-slate-400" />
                                                    {trader.business_name || 'No Business Name'}
                                                </p>
                                                {trader.address && (
                                                    <p className="text-xs text-slate-500 mt-0.5">{trader.address}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {trader.license_number ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        <FileCheck className="w-3 h-3" />
                                                        {trader.license_number}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                                                        Pending License
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedTrader(trader)}
                                                className="text-slate-400 hover:text-emerald-600 transition-colors p-2 hover:bg-emerald-50 rounded-lg"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Trader Details Modal */}
            <AnimatePresence>
                {selectedTrader && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTrader(null)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, x: '100%' }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-xl font-bold text-slate-800">Trader Profile</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDownloadUserReport}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                                    >
                                        <Download size={16} />
                                        Download Report
                                    </button>
                                    <button
                                        onClick={() => setSelectedTrader(null)}
                                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            {/* ... rest of the modal ... */}

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Left Column: Basic Info */}
                                    <div className="w-full md:w-1/3 space-y-6">
                                        <div className="flex flex-col items-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <div className="w-20 h-20 rounded-full bg-white text-emerald-600 flex items-center justify-center font-bold text-2xl shadow-sm mb-3">
                                                {selectedTrader.business_name?.[0] || 'T'}
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 text-center">{selectedTrader.business_name}</h3>
                                            <p className="text-slate-500 text-sm font-medium text-center">
                                                {selectedTrader.full_name}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Business & License</h4>
                                            <div className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-semibold text-slate-500">License Status</span>
                                                    {selectedTrader.license_number ? (
                                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                                                    ) : (
                                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Under Review</span>
                                                    )}
                                                </div>
                                                {selectedTrader.license_number ? (
                                                    <p className="font-mono text-slate-800 tracking-wider">
                                                        {selectedTrader.license_number}
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-col gap-2 mt-2">
                                                        <div className="flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                                                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                                            License verification is pending.
                                                        </div>
                                                        <div className="mt-2">
                                                            <label className="text-xs font-semibold text-slate-500 mb-1 block">Enter License Number (Optional)</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. TRD-2026-001"
                                                                value={licenseInput}
                                                                onChange={(e) => setLicenseInput(e.target.value)}
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={handleApproveLicense}
                                                            disabled={approveMutation.isPending}
                                                            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2"
                                                        >
                                                            {approveMutation.isPending ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    Approving...
                                                                </>
                                                            ) : (
                                                                'Approve License'
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Contact Details</h4>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                                    <Phone className="w-5 h-5 text-slate-400" />
                                                    <div>
                                                        <p className="text-xs text-slate-500">Mobile</p>
                                                        <p className="font-medium text-slate-800">{selectedTrader.phone}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Detailed Stats & History from Committee Panel */}
                                    <div className="w-full md:w-2/3 space-y-6">
                                        <TraderAnalytics traderId={selectedTrader._id} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

        </div >
    );
}
