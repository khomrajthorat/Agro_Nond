import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, IndianRupee, PieChart, Filter, Coins, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import api from '../../lib/api';

export default function CommitteeManagement() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: records, isLoading } = useQuery({
        queryKey: ['admin-committee'],
        queryFn: () => api.admin.committeeRecords()
    });

    const { data: stats } = useQuery({
        queryKey: ['finance-stats'],
        queryFn: () => api.finance.stats()
    });

    const filteredRecords = records?.filter(record => {
        const hasValidDate = record.sold_at && !isNaN(new Date(record.sold_at).getTime());
        const hasValidAmount = record.sale_amount > 0;
        const matchesSearch = record.farmer_id?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.trader_id?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());

        return hasValidDate && hasValidAmount && matchesSearch;
    });

    const StatCard = ({ title, value, icon: Icon, subtext }) => (
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <Icon size={24} />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {subtext}
                </span>
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                    ₹{value?.toLocaleString() || '0'}
                </h3>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Committee Records</h1>
                    <p className="text-gray-500 mt-1">Market fees, commissions, and financial logs</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full sm:w-64 border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Financial Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Commission"
                    value={stats?.totalCommission}
                    icon={Coins}
                    subtext="All Time"
                />
                <StatCard
                    title="Pending from Traders"
                    value={stats?.pendingPayments}
                    icon={ArrowDownLeft}
                    subtext="Receivable"
                />
                <StatCard
                    title="Due to Farmers"
                    value={stats?.farmerPaymentsDue}
                    icon={ArrowUpRight}
                    subtext="Payable"
                />
                <StatCard
                    title="Collected Today"
                    value={stats?.collectedToday}
                    icon={TrendingUp}
                    subtext="Today"
                />
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-emerald-50/50 border-b border-emerald-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Farmer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Trader</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-emerald-800 uppercase tracking-wider">Sale Amount</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Commission</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-50">
                            {isLoading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading committee records...</td></tr>
                            ) : filteredRecords?.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No records found</td></tr>
                            ) : (
                                filteredRecords?.map((record) => (
                                    <tr key={record._id} className="hover:bg-emerald-50/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-700">
                                                {new Date(record.sold_at).toLocaleDateString('en-GB', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {new Date(record.sold_at).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">F</span>
                                                {record.farmer_id?.full_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">T</span>
                                                {record.trader_id?.business_name || record.trader_id?.full_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-slate-600 font-medium">₹{record.sale_amount?.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded inline-block min-w-[60px] text-center">
                                                + ₹{record.commission?.toLocaleString()}
                                            </span>
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
