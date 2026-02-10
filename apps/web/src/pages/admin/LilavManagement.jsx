import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Gavel, User, Coins, TrendingUp, Filter, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function LilavManagement() {
    const [searchTerm, setSearchTerm] = useState('');

    const queryClient = useQueryClient();

    const { data: bids, isLoading } = useQuery({
        queryKey: ['admin-lilav'],
        queryFn: () => api.admin.lilavBids()
    });

    const { data: settings } = useQuery({
        queryKey: ['system-settings'],
        queryFn: () => api.admin.settings.list()
    });

    // Find the specific setting or default to enabled (true)
    const lilavLoginEnabled = settings?.find(s => s.key === 'lilav_login_enabled')?.value ?? true;

    const toggleLoginMutation = useMutation({
        mutationFn: (newValue) => api.admin.settings.update('lilav_login_enabled', newValue, 'Enable/Disable Lilav Staff Login'),
        onSuccess: () => {
            queryClient.invalidateQueries(['system-settings']);
            toast.success('Login access updated successfully');
        },
        onError: () => {
            toast.error('Failed to update login access');
        }
    });

    const filteredBids = bids?.filter(bid =>
        bid.farmer_id?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bid.trader_id?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bid.vegetable?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Lilav (Auction) Management</h1>
                    <p className="text-gray-500 mt-1">Real-time auction records and sales history</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Toggle Switch */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-emerald-100 shadow-sm">
                        <div className={`p-2 rounded-lg ${lilavLoginEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <Power size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500">Login Access</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={lilavLoginEnabled}
                                    onChange={(e) => toggleLoginMutation.mutate(e.target.checked)}
                                    disabled={toggleLoginMutation.isPending}
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                <span className="ml-2 text-sm font-medium text-slate-700">
                                    {lilavLoginEnabled ? 'Active' : 'Disabled'}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                            <input
                                type="text"
                                placeholder="Search crop, farmer, trader..."
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
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-emerald-50/50 border-b border-emerald-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Details</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">Buyer (Trader)</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-emerald-800 uppercase tracking-wider">Rate</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider pl-8">Auctioneer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-50">
                            {isLoading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading auction records...</td></tr>
                            ) : filteredBids?.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No auction records found</td></tr>
                            ) : (
                                filteredBids?.map((bid) => (
                                    <tr key={bid._id} className="hover:bg-emerald-50/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-700">{new Date(bid.sold_at).toLocaleDateString()}</div>
                                            <div className="text-xs text-slate-400">{new Date(bid.sold_at).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{bid.vegetable}</div>
                                            <div className="text-sm text-slate-500">
                                                {bid.official_qty > 0 ? `${bid.official_qty} kg` : (bid.nag > 0 ? `${bid.nag} Nag` : '-')} • {bid.farmer_id?.full_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                                    {bid.trader_id?.business_name?.[0] || 'T'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{bid.trader_id?.business_name || bid.trader_id?.full_name}</div>
                                                    <div className="text-xs text-slate-500">{bid.trader_id?.customId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded">
                                                ₹{bid.sale_rate} {bid.official_qty > 0 ? '/ kg' : (bid.nag > 0 ? '/ Nag' : '')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-emerald-600 text-lg">₹{bid.sale_amount?.toLocaleString()}</div>
                                        </td>
                                        <td className="px-6 py-4 pl-8">
                                            <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
                                                {bid.sold_by?.full_name || 'System'}
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
