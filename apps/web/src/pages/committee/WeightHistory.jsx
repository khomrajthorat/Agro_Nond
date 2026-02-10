import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Toaster, toast } from 'react-hot-toast';
import {
    CheckCircle, Clock, X, Eye,
    Trash2, Calendar, Search, Scale, Package, RefreshCw, Loader2, Save, Pencil
} from 'lucide-react';
import api from '../../lib/api';
import { motion } from 'framer-motion';

// --- INLINE WEIGHT INPUT COMPONENT (Adapted for Edit) ---
const InlineWeightEdit = ({ record, onSave }) => {
    const [value, setValue] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef(null);

    const isNag = record.est_nag > 0 || record.updated_nag > 0;
    const currentVal = record.updated_weight || record.updated_nag || 0;
    const unit = isNag ? 'Nag' : 'kg';

    useEffect(() => {
        if (isEditing) {
            setValue(currentVal);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isEditing, currentVal]);

    const handleSave = async () => {
        if (!value || isNaN(parseFloat(value))) {
            setIsEditing(false);
            return;
        }

        if (parseFloat(value) === parseFloat(currentVal)) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(record.id, parseFloat(value), isNag);
            setIsEditing(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') setIsEditing(false);
    };

    if (isSaving) {
        return <Loader2 size={16} className="animate-spin text-emerald-600" />;
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <input
                    ref={inputRef}
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="w-20 px-2 py-1 text-sm border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500">{unit}</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className={`font-bold ${isNag ? 'text-purple-600' : 'text-emerald-600'}`}>
                {currentVal} {unit}
            </span>
            <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200 flex items-center gap-1"
                title="Edit Weight"
            >
                <Pencil size={14} />
                <span className="text-xs font-medium">Edit</span>
            </button>
        </div>
    );
};

export default function WeightHistory() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Fetch all weight records (History)
    const fetchHistory = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            // Using weight records endpoint (accessible to committee/weight roles)
            const response = await api.weight.records();

            // Normalize data
            const data = Array.isArray(response) ? response : (response.records || response.data || []);

            const mapped = data.map(r => ({
                id: r._id,
                date: r.createdAt,
                farmer_id: r.farmer_id?.farmerId || r.farmer_id?.full_name || 'Unknown',
                farmer_name: r.farmer_id?.full_name || 'Unknown',
                item: r.vegetable,
                est_weight: r.quantity,
                est_nag: r.nag,
                updated_weight: r.official_qty,
                updated_nag: r.official_nag,
                status: r.status,
            }));

            setRecords(mapped);
        } catch (error) {
            console.error('Failed to fetch weight history:', error);
            if (showLoading) toast.error('Failed to load weight history');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useAutoRefresh(() => fetchHistory(false), { interval: 30000 });

    // Filter Logic
    const filteredRecords = records.filter(r => {
        const matchesSearch =
            r.farmer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.item.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDate = dateFilter ? new Date(r.date).toISOString().split('T')[0] === dateFilter : true;

        return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Edit Handler
    const handleWeightUpdate = async (id, value, isNag) => {
        try {
            const updates = {
                official_qty: isNag ? null : value,
                official_nag: isNag ? value : null
            };

            // Use api.weight.updateRecord which uses PUT (correct method for this endpoint)
            await api.weight.updateRecord(id, updates);

            toast.success('Weight updated successfully');
            fetchHistory(false);
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update weight');
        }
    };

    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="space-y-6">
            <Toaster />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Live Feed</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Weight History</h1>
                    <p className="text-slate-500 text-sm mt-1">View and correct all weight records</p>
                </div>
                <button
                    onClick={fetchHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by farmer ID, name, or crop..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    />
                </div>
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
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium uppercase">Total Records</p>
                    <p className="text-2xl font-bold text-emerald-700">{filteredRecords.length}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium uppercase">Today's Records</p>
                    <p className="text-2xl font-bold text-blue-700">
                        {filteredRecords.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).length}
                    </p>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No Records Found</h3>
                    <p className="text-slate-500">No weight records match your criteria</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Desktop Table */}
                    <table className="w-full hidden md:table">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Date</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Farmer</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Item</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Est. Weight</th>
                                <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-4">Official Weight</th>
                                <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.map(record => (
                                <tr key={record.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                        <span className="text-slate-900 block font-medium">{formatDate(record.date)}</span>
                                        <span className="text-slate-400 text-xs">{formatTime(record.date)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{record.farmer_name}</div>
                                        <div className="text-xs text-slate-500">{record.farmer_id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 text-xs font-medium">
                                            {record.item}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">
                                        {record.est_weight > 0 ? `${record.est_weight} kg` : `${record.est_nag} Nag`}
                                    </td>
                                    <td className="px-6 py-4">
                                        <InlineWeightEdit record={record} onSave={handleWeightUpdate} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1
                                    ${['Done', 'Sold'].includes(record.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}
                                `}>
                                            {['Done', 'Sold'].includes(record.status) ? <CheckCircle size={12} /> : <Clock size={12} />}
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filteredRecords.map(record => (
                            <div key={record.id} className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="text-xs text-slate-400">{formatDate(record.date)} • {formatTime(record.date)}</span>
                                        <p className="font-semibold text-slate-900">{record.farmer_name}</p>
                                        <p className="text-xs text-slate-500">{record.farmer_id}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1
                                    ${['Done', 'Sold'].includes(record.status) ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}
                                `}>
                                        {record.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <span className="text-xs text-slate-400 block">Item</span>
                                        <span className="text-sm font-medium text-slate-700">{record.item}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-slate-400 block mb-1">Official Weight</span>
                                        <div className="flex justify-end">
                                            <InlineWeightEdit record={record} onSave={handleWeightUpdate} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
