import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Scale, User, Clock, CheckCircle, AlertCircle, Filter } from 'lucide-react';
import api from '../../lib/api';

export default function WeightManagement() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: records, isLoading } = useQuery({
        queryKey: ['admin-weight'],
        queryFn: () => api.admin.weightRecords()
    });

    const filteredRecords = records?.filter(record =>
        record.farmer_id?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.vegetable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.farmer_id?.farmerId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Weight Management</h1>
                    <p className="text-gray-500 mt-1">Live feed of weighing station activity</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                        <input
                            type="text"
                            placeholder="Search farmer or crop..."
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
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Farmer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Commodity</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-emerald-800 uppercase tracking-wider">Weight / Qty</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider pl-8">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Weighed By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-50">
                            {isLoading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading weight records...</td></tr>
                            ) : filteredRecords?.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No records found</td></tr>
                            ) : (
                                filteredRecords?.map((record) => (
                                    <tr key={record._id} className="hover:bg-emerald-50/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-700">
                                                {new Date(record.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {new Date(record.createdAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{record.farmer_id?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">{record.farmer_id?.farmerId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-slate-100 text-slate-700 text-sm font-medium shadow-sm">
                                                {record.vegetable}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-bold text-slate-800 text-lg">
                                                {record.quantity > 0
                                                    ? `${record.quantity} kg`
                                                    : record.official_qty > 0
                                                        ? `${record.official_qty} kg`
                                                        : record.nag > 0
                                                            ? `${record.nag} Nag`
                                                            : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 pl-8">
                                            {record.status === 'Pending' ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                                                    <Clock className="w-3 h-3" /> Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                                                    <CheckCircle className="w-3 h-3" /> {record.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600 flex items-center gap-1.5">
                                                <div className="p-1 rounded-full bg-slate-100">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                </div>
                                                {record.weighed_by?.full_name || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
