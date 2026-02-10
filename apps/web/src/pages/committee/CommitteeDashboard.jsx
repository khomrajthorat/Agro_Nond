import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, TrendingUp, AlertCircle, ArrowRight, Wallet, IndianRupee } from 'lucide-react';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// Helper function for clean quantity display
const formatQtyDisplay = (qty, nag) => {
  const hasQty = qty && qty > 0;
  const hasNag = nag && nag > 0;

  if (hasQty && hasNag) {
    // Both have values - show both
    return <>{qty} kg <span className="text-purple-600 font-medium">| {nag} Nag</span></>;
  } else if (hasNag) {
    // Only nag - show nag only (no "0 kg")
    return <span className="text-purple-600 font-medium">{nag} Nag</span>;
  } else {
    // Only kg or default - show kg
    return <>{qty || 0} kg</>;
  }
};

export default function CommitteeDashboard() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalFarmers: 0,
    totalTraders: 0,
    totalVolume: 0,
    pendingPayments: 0,
    receivedPayments: 0,
    farmerCommission: 0,
    traderCommission: 0,
    totalCommission: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [commissionRates, setCommissionRates] = useState({ farmer: 4, trader: 9 });

  const fetchDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [statsResponse, transactionsResponse, ratesResponse] = await Promise.all([
        api.get('/api/committee/stats'),
        api.get('/api/committee/transactions'),
        // Use finance endpoint accessible to committee
        api.finance.commissionRates.list()
      ]);

      setStatsData(statsResponse);
      setRecentTransactions(transactionsResponse);

      if (ratesResponse && ratesResponse.length > 0) {
        const farmerRule = ratesResponse.find(r => r.role_type === 'farmer' && r.crop_type === 'All');
        const traderRule = ratesResponse.find(r => r.role_type === 'trader' && r.crop_type === 'All');

        setCommissionRates({
          farmer: farmerRule ? parseFloat(farmerRule.rate) * 100 : 4,
          trader: traderRule ? parseFloat(traderRule.rate) * 100 : 9
        });
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      if (showLoading) toast.error('Failed to load dashboard data');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ✅ Auto-refresh data every 30 seconds
  useAutoRefresh(() => fetchDashboardData(false), { interval: 30000 });
  const stats = [
    { label: 'Total Farmers', value: statsData.totalFarmers, icon: Users, isCurrency: false },
    { label: 'Total Traders', value: statsData.totalTraders, icon: ShoppingBag, isCurrency: false },
    { label: 'Received Payments', value: statsData.receivedPayments, icon: Wallet, isCurrency: true },
    { label: 'Pending Due', value: statsData.pendingPayments, icon: AlertCircle, isCurrency: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header - Clean & Simple */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Live Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Committee Dashboard</h1>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats Grid - Professional Monotone */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-emerald-500 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <stat.icon size={20} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-1">
                {stat.isCurrency && <span className="text-lg font-bold text-slate-900">₹</span>}
                <span className="text-2xl font-bold text-slate-900">
                  <AnimatedCounter value={stat.value} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Recent Transactions</h3>
            <a href="/dashboard/committee/billing" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ArrowRight size={16} />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Farmer</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Trader</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-600">Details</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-600">Rate</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-600">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((txn) => {
                    const hasQty = txn.qty && txn.qty > 0;
                    const hasNag = txn.nag && txn.nag > 0;
                    const rateUnit = hasNag ? 'Nag' : 'kg';

                    return (
                      <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-600">{new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{txn.farmer}</td>
                        <td className="px-5 py-3.5 text-slate-600">{txn.trader}</td>
                        {/* CLEAN DISPLAY: Show only kg OR nag based on which has value */}
                        <td className="px-5 py-3.5 text-slate-500">
                          {txn.crop}
                          <span className="block text-xs">
                            {formatQtyDisplay(txn.qty, txn.nag)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-600">₹{txn.rate}/{rateUnit}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900">₹{txn.amount.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${txn.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-slate-500">
                      No recent transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Column */}
        <div className="space-y-6">


          {/* Commission Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-900 mb-4">Commission Revenue</h3>
            <div className="mb-5 text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-sm font-medium text-emerald-600 mb-1">Total Collected</p>
              <p className="text-3xl font-bold text-emerald-700">₹{statsData.totalCommission.toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 text-center">
                <p className="text-xs text-slate-500 mb-1">From Farmers ({commissionRates.farmer}%)</p>
                <p className="font-bold text-slate-900">₹{statsData.farmerCommission.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 text-center">
                <p className="text-xs text-slate-500 mb-1">From Traders ({commissionRates.trader}%)</p>
                <p className="font-bold text-slate-900">₹{statsData.traderCommission.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}