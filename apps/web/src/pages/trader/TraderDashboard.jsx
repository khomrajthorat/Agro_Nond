import { ShoppingBasket, Wallet, ReceiptText, Clock, TrendingUp, Download, Filter } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import { api } from '../../lib/api';
import TransactionDetailsModal from '../../components/trader/TransactionDetailsModal';
import toast from 'react-hot-toast';

export default function TraderDashboard() {
  const [stats, setStats] = useState({
    totalQuantity: 0,
    totalBaseSpend: 0,
    totalCommission: 0,
    totalSpend: 0,
    pendingPayments: 0
  });
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      const [statsData, transactionsData] = await Promise.all([
        api.trader.stats(),
        api.trader.transactions({ limit: 5 })
      ]);

      setStats(statsData);
      setTransactionHistory(transactionsData.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ Auto-refresh data every 30 seconds
  useAutoRefresh(() => fetchData(false), { interval: 30000 });

  // Calculate Average Rate
  const avgRate = stats.totalQuantity > 0 ? (stats.totalSpend / stats.totalQuantity) : 0;

  const handleDownloadReport = async () => {
    try {
      const blob = await api.get('/api/trader/download-report', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trader_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  // Single Color Theme - Emerald / Slate Icons
  const statCards = [
    { label: 'Total Purchased', value: stats.totalQuantity, unit: 'kg', icon: <ShoppingBasket className="w-6 h-6 text-emerald-600" /> },
    { label: 'Total Spend', value: stats.totalSpend, unit: '₹', icon: <Wallet className="w-6 h-6 text-emerald-600" />, isCurrency: true },
    { label: 'Average Rate', value: Math.round(avgRate), unit: '₹/kg', icon: <TrendingUp className="w-6 h-6 text-emerald-600" />, isCurrency: true },
    { label: 'Pending Payments', value: stats.pendingPayments, unit: '₹', icon: <Clock className="w-6 h-6 text-emerald-600" />, isCurrency: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Dashboard
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Trader Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your market activity and finances</p>

      </div>

      {/* Stats Grid - Professional Clean Look */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-emerald-500 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                {stat.icon}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-1">
                {stat.isCurrency && <span className="text-lg font-bold text-slate-900">₹</span>}
                <span className="text-2xl font-bold text-slate-900">
                  <AnimatedCounter value={stat.value} duration={1500} />
                </span>
                {!stat.isCurrency && <span className="text-sm font-medium text-slate-400 ml-1">{stat.unit}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Purchases Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Recent Purchases</h2>
            <p className="text-slate-500 text-sm">Track your orders and invoices</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition text-sm font-medium"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download Report</span>
            </button>
            <Link to="/dashboard/trader/transactions" className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2">
              <Filter size={16} />
              Filter
            </Link>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-slate-600">Date & Time</th>

                <th className="px-5 py-3 text-left font-semibold text-slate-600">Crop</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Qty / Nag</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Rate/kg</th>
                <th className="px-5 py-3 text-right font-semibold text-slate-600">Total Amount</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Status</th>
                <th className="px-5 py-3 text-center font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionHistory.length > 0 ? (
                transactionHistory.map((item) => {
                  const rawStatus = item.trader_payment_status || 'pending';
                  const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
                  const baseAmount = item.sale_amount || 0;
                  const commission = item.trader_commission || 0;
                  const total = item.net_receivable_from_trader || (baseAmount + commission);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {item.sold_at ? new Date(item.sold_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.sold_at ? new Date(item.sold_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">{item.vegetable}</td>
                      <td className="px-5 py-4 text-right font-medium text-slate-700">
                        {item.official_nag > 0 ? (
                          <div className="text-purple-600">{item.official_nag} Nag</div>
                        ) : (
                          <div>{(item.official_qty || 0).toLocaleString('en-IN')} kg</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-600">₹{item.sale_rate}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-slate-900">₹{Math.round(total).toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-slate-400">Base: {baseAmount} + Comm: {commission}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => {
                            // Normalize data for the modal
                            setSelectedTransaction({
                              id: item._id,
                              // lotId removed from here
                              date: item.sold_at || item.createdAt,
                              crop: item.vegetable,
                              quantity: item.official_qty || 0,
                              rate: item.sale_rate,
                              grossAmount: baseAmount,
                              commission: commission,
                              totalCost: total,
                              status: 'completed',
                              paymentStatus: status
                            });
                          }}
                          className="text-emerald-600 hover:text-emerald-700 font-medium text-xs hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-5 py-8 text-center text-slate-500">
                    No recent purchases found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-3 p-3">
          {transactionHistory.length > 0 ? (
            transactionHistory.map((item) => {
              const status = item.payment_status ? item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1) : 'Pending';
              const total = item.total_amount || (item.sale_amount + item.commission);
              return (
                <div key={item._id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      {/* Replaced item.lot_id with Date since Lot ID is removed */}
                      <h3 className="font-bold text-sm text-slate-800">
                        {item.sold_at ? new Date(item.sold_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </h3>
                      <p className="text-xs text-slate-500">{item.vegetable}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                      {status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-500">Total</span>
                    <span className="font-bold text-slate-900">₹{Math.round(total).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">No recent purchases found.</div>
          )}
        </div>
      </div>


      <TransactionDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div >
  );
}