import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Filter,
  Package,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  ShoppingBasket,
  Wallet,
  ReceiptText,
  Eye
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { api } from '../../lib/api';
import { exportToCSV } from '../../lib/csvExport';
import TransactionDetailsModal from '../../components/trader/TransactionDetailsModal';
import BillingInvoice from '../../components/committee/BillingInvoice';
import toast from 'react-hot-toast';

const cropsList = ['All Crops', 'Tomatoes', 'Onions', 'Potatoes', 'Cabbage', 'Brinjal', 'Cauliflower', 'Green Chillies', 'Carrots'];
const paymentStatuses = ['All Status', 'paid', 'pending'];

export default function TraderTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('All Crops');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All Status');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.trader.transactions({
        page: currentPage,
        limit: pageSize
      });

      // Handle paginated response
      const data = response.data || response;
      const formattedData = data.map(t => ({
        id: t._id,
        date: t.sold_at || t.createdAt,
        crop: t.vegetable,
        quantity: t.official_qty,
        nag: t.official_nag,
        rate: t.sale_rate,
        grossAmount: t.sale_amount,
        commission: t.trader_commission || Math.round((t.sale_amount || 0) * 0.09),
        totalCost: t.net_receivable_from_trader || t.total_amount || (t.sale_amount + (t.trader_commission || Math.round((t.sale_amount || 0) * 0.09))),
        status: t.status,
        paymentStatus: (t.trader_payment_status || t.payment_status || 'pending').toLowerCase()
      }));

      setTransactions(formattedData);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.total || formattedData.length);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filter and sort transactions (locally for current page)
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.crop && t.crop.toLowerCase().includes(query))
      );
    }

    // Crop filter
    if (selectedCrop !== 'All Crops') {
      result = result.filter(t => t.crop === selectedCrop);
    }

    // Payment status filter
    if (selectedPaymentStatus !== 'All Status') {
      result = result.filter(t => t.paymentStatus === selectedPaymentStatus);
    }

    // Date range filter
    if (dateRange.start) {
      result = result.filter(t => new Date(t.date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      result = result.filter(t => new Date(t.date) <= new Date(dateRange.end));
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
  }, [transactions, searchQuery, selectedCrop, selectedPaymentStatus, dateRange, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleDownloadPDF = async (txn) => {
    try {
      // Get trader profile from local storage if available for "Bill To" name
      let traderName = 'Trader';
      try {
        const storedProfile = localStorage.getItem('trader-profile');
        if (storedProfile) {
          const profile = JSON.parse(storedProfile);
          traderName = profile.business_name || profile.full_name || 'Trader';
        }
      } catch (e) {
        console.warn('Could not load trader profile for PDF');
      }

      // Prepare data for BillingInvoice
      const invoiceData = {
        id: txn.id,
        date: txn.date,
        name: traderName,
        crop: txn.crop,
        qty: txn.quantity || 0,
        nag: txn.nag || 0,
        baseAmount: txn.grossAmount || 0,
        commission: txn.commission || 0,
        finalAmount: txn.totalCost || 0,
        status: txn.paymentStatus === 'paid' ? 'Paid' : 'Pending',
        type: 'receive'
      };

      const blob = await pdf(<BillingInvoice data={invoiceData} type="trader" />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${new Date(txn.date).toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCrop('All Crops');
    setSelectedPaymentStatus('All Status');
    setDateRange({ start: '', end: '' });
  };

  const handleExport = () => {
    const headers = ['Date', 'Crop', 'Qty (kg)', 'Rate/kg', 'Gross Amount', 'Total Cost', 'Payment Status'];
    const data = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('en-IN'),
      t.crop,
      t.quantity,
      t.rate,
      t.grossAmount,
      t.totalCost,
      t.paymentStatus
    ]);

    exportToCSV(data, headers, `trader-transactions-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Calculate totals
  const totals = useMemo(() => ({
    count: totalCount,
    quantity: filteredTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0),
    nag: filteredTransactions.reduce((sum, t) => sum + (t.nag || 0), 0),
    grossAmount: filteredTransactions.reduce((sum, t) => sum + (t.grossAmount || 0), 0),
    commission: filteredTransactions.reduce((sum, t) => sum + (t.commission || 0), 0),
    totalCost: filteredTransactions.reduce((sum, t) => sum + (t.totalCost || 0), 0)
  }), [filteredTransactions, totalCount]);

  const hasActiveFilters = searchQuery || selectedCrop !== 'All Crops' || selectedPaymentStatus !== 'All Status' || dateRange.start || dateRange.end;

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
          <Link
            to="/dashboard/trader"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Transaction History</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">View and manage all your purchase transactions</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all">
          <div className="absolute right-2 top-2 p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
            <ReceiptText className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-slate-800">{totals.count}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all">
          <div className="absolute right-2 top-2 p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
            <ShoppingBasket className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Quantity</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-800">
              {totals.quantity.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-400">kg</span>
            </p>
            {totals.nag > 0 && (
              <>
                <span className="text-slate-300 text-lg font-light">|</span>
                <p className="text-2xl font-bold text-slate-800">
                  {totals.nag.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-400">Nag</span>
                </p>
              </>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all">
          <div className="absolute right-2 top-2 p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
            <Wallet className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Gross Amount</p>
          <p className="text-2xl font-bold text-slate-800">₹{totals.grossAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all">
          <div className="absolute right-2 top-2 p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
            <Wallet className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-emerald-600">₹{totals.totalCost.toLocaleString('en-IN')}</p>
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
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by crop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilters || hasActiveFilters
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Expandable Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Crop Filter */}
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

                    {/* Payment Status Filter */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Payment Status</label>
                      <select
                        value={selectedPaymentStatus}
                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      >
                        {paymentStatuses.map(status => (
                          <option key={status} value={status}>{status === 'All Status' ? status : status.charAt(0).toUpperCase() + status.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date From */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">From Date</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">To Date</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                      Clear all filters
                    </button>
                  )}
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
                    Date & Time
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <button onClick={() => handleSort('crop')} className="inline-flex items-center gap-1 hover:text-emerald-600">
                    Crop
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty (kg)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate/kg</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
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
                      {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                      <Package className="w-3 h-3" />
                      {txn.crop}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">{txn.quantity?.toLocaleString('en-IN') || 0}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">₹{txn.rate}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">₹{txn.grossAmount?.toLocaleString('en-IN') || 0}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">₹{txn.totalCost?.toLocaleString('en-IN') || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${txn.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${txn.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                      {txn.paymentStatus.charAt(0).toUpperCase() + txn.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedTransaction(txn)}
                        className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(txn);
                        }}
                        className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                        title="Download Invoice"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No transactions found</p>
              <p className="text-sm text-slate-400">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-4">
          {filteredTransactions.map((txn, index) => (
            <motion.div
              key={`mobile-txn-${txn.id || index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-50 rounded-xl p-4 border border-slate-100"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(txn.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${txn.paymentStatus === 'paid'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${txn.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                  {txn.paymentStatus.charAt(0).toUpperCase() + txn.paymentStatus.slice(1)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                  <Package className="w-3 h-3" />
                  {txn.crop}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase">Qty</p>
                  <p className="font-bold text-xs">{txn.quantity} <span className="text-[9px] font-normal">kg</span></p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase">Rate</p>
                  <p className="font-bold text-xs">₹{txn.rate}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase">Gross</p>
                  <p className="font-bold text-xs">₹{txn.grossAmount?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <div>
                  <p className="text-[9px] text-violet-500 uppercase">Commission ({txn.grossAmount ? Math.round((txn.commission / txn.grossAmount) * 100) : 0}%)</p>
                  <p className="font-medium text-xs text-violet-600">₹{txn.commission?.toLocaleString('en-IN') || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 uppercase">Total Cost</p>
                  <p className="font-bold text-sm text-emerald-600">₹{txn.totalCost?.toLocaleString('en-IN') || 0}</p>
                </div>
              </div>

              {/* Mobile Action Buttons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setSelectedTransaction(txn)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Details
                </button>
                <button
                  onClick={() => handleDownloadPDF(txn)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </motion.div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No transactions found</p>
              <p className="text-sm text-slate-400">Try adjusting your filters</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                      ? 'bg-emerald-600 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      <TransactionDetailsModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}