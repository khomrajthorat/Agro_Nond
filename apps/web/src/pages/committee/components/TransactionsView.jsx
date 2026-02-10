import React, { useState } from 'react';
import { Search, Filter, ChevronDown, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function TransactionsView({ transactions }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredData = transactions.filter(t => {
        const matchesSearch =
            t.farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.trader.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || t.paymentStatus.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
            case 'Pending': return 'text-amber-700 bg-amber-50 border-amber-100';
            case 'Partial': return 'text-amber-700 bg-amber-50 border-amber-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                </select>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Farmer</th>
                            <th className="px-4 py-3">Trader</th>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3 text-right">Rate</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map((txn) => {
                            // Determine if this transaction uses nag
                            const hasNag = txn.nag && txn.nag > 0;
                            // FIX: Use hasNag directly to determine rate unit (not relying on sale_unit field)
                            const rateUnit = hasNag ? 'Nag' : 'kg';

                            return (
                                <tr key={txn.id} className="hover:bg-emerald-50/20 transition-colors">
                                    <td className="px-4 py-3 text-slate-600">{txn.date}</td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{txn.farmer.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{txn.trader.name}</td>
                                    {/* Show both kg and Nag in Details column */}
                                    <td className="px-4 py-3 text-slate-600">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-800">{txn.crop}</span>
                                            <span className="text-xs text-slate-400">
                                                {txn.quantity} kg
                                                {hasNag && (
                                                    <span className="text-purple-600 font-medium"> | {txn.nag} Nag</span>
                                                )}
                                            </span>
                                        </div>
                                    </td>
                                    {/* FIX: Rate now shows correct unit based on hasNag */}
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        ₹{txn.rate}/{rateUnit}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-900">₹{txn.baseAmount?.toLocaleString() || 0}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(txn.paymentStatus)}`}>
                                            {txn.paymentStatus}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Feed */}
            <div className="md:hidden space-y-3">
                {filteredData.map((txn) => {
                    const hasNag = txn.nag && txn.nag > 0;
                    // FIX: Use hasNag directly to determine rate unit
                    const rateUnit = hasNag ? 'Nag' : 'kg';

                    return (
                        <div key={txn.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-medium text-slate-900">{txn.farmer.name}</p>
                                    <p className="text-xs text-slate-500">{txn.date} • {txn.trader.name}</p>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(txn.paymentStatus)}`}>
                                    {txn.paymentStatus}
                                </span>
                            </div>
                            <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500">{txn.crop}</p>
                                    {/* FIX: Show correct rate unit based on hasNag */}
                                    <p className="text-sm text-slate-700">
                                        {txn.quantity} kg
                                        {hasNag && <span className="text-purple-600"> | {txn.nag} Nag</span>}
                                        {' '}@ ₹{txn.rate}/{rateUnit}
                                    </p>
                                </div>
                                <p className="font-bold text-slate-900">₹{txn.baseAmount?.toLocaleString() || 0}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}