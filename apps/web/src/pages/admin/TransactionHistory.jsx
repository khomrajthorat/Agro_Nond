import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { motion } from 'framer-motion';
import {
  Search,
  Calendar,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../../lib/api';
import { exportToCSV } from '../../lib/csvExport';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTransactions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const params = {
        page: currentPage,
        limit: pageSize,
      };

      // Add search if provided
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      // Add date filter if provided
      if (dateFrom) {
        params.date = dateFrom;
      }

      // Add payment status filter
      if (paymentFilter !== 'all') {
        params.paymentStatus = paymentFilter;
      }

      const response = await api.purchases.list(params);

      // Handle paginated response
      const data = response.data || response;
      const formattedData = data.map(t => ({
        id: t._id,
        date: t.sold_at || t.date || t.createdAt,
        farmerName: t.farmer_id?.full_name || 'Unknown Farmer',
        traderName: t.trader_id?.business_name || t.trader_id?.full_name || 'Unknown Trader',
        crop: t.vegetable,
        quantity: t.official_qty || t.quantity || 0,
        nag: t.nag || 0,
        rate: t.sale_rate || t.rate || 0,
        grossAmount: t.sale_amount || t.amount || 0,
        commission: (t.farmer_commission || 0) + (t.trader_commission || 0),
        paymentStatus: t.payment_status || 'pending'
      }));

      setTransactions(formattedData);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.total || formattedData.length);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [currentPage, debouncedSearch, dateFrom, paymentFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Auto-refresh transactions every 30 seconds
  useAutoRefresh(() => fetchTransactions(false), { interval: 30000 });

  // Client-side sorting (for the current page only)
  const sortedTransactions = useMemo(() => {
    let result = [...transactions];

    // Date range filter (client-side for dateTo since backend only supports single date)
    if (dateTo) {
      result = result.filter(txn => new Date(txn.date) <= new Date(dateTo));
    }

    // Sorting
    result.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'date':
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case 'amount':
          aVal = a.grossAmount;
          bVal = b.grossAmount;
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        default:
          aVal = a[sortField];
          bVal = b[sortField];
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [transactions, dateTo, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const stats = useMemo(() => {
    return {
      totalTransactions: totalCount,
      totalVolume: sortedTransactions.reduce((sum, t) => sum + t.quantity, 0),
      totalAmount: sortedTransactions.reduce((sum, t) => sum + t.grossAmount, 0),
      totalCommission: sortedTransactions.reduce((sum, t) => sum + t.commission, 0)
    };
  }, [sortedTransactions, totalCount]);

  const handleExport = () => {
    const headers = ['Date', 'Farmer', 'Trader', 'Crop', 'Qty / Weight', 'Rate', 'Amount', 'Commission', 'Status'];
    const data = sortedTransactions.map(txn => [
      new Date(txn.date).toLocaleDateString('en-IN'),
      txn.farmerName,
      txn.traderName,
      txn.crop,
      txn.quantity > 0 ? `${txn.quantity} kg` : (txn.nag > 0 ? `${txn.nag} Nag` : '-'),
      txn.rate,
      txn.grossAmount,
      txn.commission,
      txn.paymentStatus
    ]);

    exportToCSV(data, headers, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transaction History</h1>
          <p className="text-gray-500 mt-1">View and search all transactions</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
          <p className="text-2xl font-bold text-slate-800">{stats.totalTransactions}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Page Volume</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.totalVolume.toLocaleString()} kg</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Page Amount</p>
          <p className="text-2xl font-bold text-slate-800">₹{stats.totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Page Commission</p>
          <p className="text-2xl font-bold text-emerald-700">₹{stats.totalCommission.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by farmer, trader, crop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
            />
          </div>

          {/* Date From */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
            />
          </div>

          {/* Payment Status */}
          <div className="relative">
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all bg-white"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th
                  className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Farmer</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Trader</th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Crop</th>
                <th
                  className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Qty / Weight
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Rate</th>
                <th
                  className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Commission</th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((txn) => (
                  <tr key={txn.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(txn.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{txn.farmerName}</td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{txn.traderName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                        {txn.crop}
                      </span>
                    </td>
                    <td className="text-right text-slate-800 font-medium text-sm px-6 py-4">
                      {txn.quantity > 0 ? `${txn.quantity.toLocaleString()} kg` : (txn.nag > 0 ? `${txn.nag} Nag` : '-')}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 text-sm">
                      ₹{txn.rate}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800 text-sm">
                      ₹{txn.grossAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium text-sm">
                      ₹{txn.commission.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border
                        ${txn.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                      >
                        {txn.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
            <div className="flex items-center gap-1">
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
    </div>
  );
}