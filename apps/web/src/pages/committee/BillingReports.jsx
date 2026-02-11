import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import api from '../../lib/api';
import { exportToCSV } from '../../lib/csvExport';
import { FileText, Download, Calendar, Users, ShoppingBag, X, CheckCircle, Clock, RefreshCw, Search, ChevronLeft, ChevronRight, Edit, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import InvoiceDownloadModal from '../../components/committee/InvoiceDownloadModal';

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, onSubmit, type, amount, name, isProcessing }) => {
  const [mode, setMode] = useState('Cash');
  const [ref, setRef] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900">
            {type === 'pay' ? 'Pay Farmer' : 'Receive Payment'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500 mb-1">
              {type === 'pay' ? 'Paying to' : 'Receiving from'}
            </p>
            <p className="font-bold text-xl text-slate-900">{name}</p>
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500">Amount</span>
              <span className="text-2xl font-bold text-emerald-600">
                ₹{amount?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>UPI</option>
              <option>Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Reference / Note (Optional)</label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. Transaction ID, Cheque No."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            onClick={() => onSubmit({ mode, ref })}
            disabled={isProcessing}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <CheckCircle size={18} />
            )}
            {type === 'pay' ? 'Confirm Payment' : 'Confirm Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to format quantity display
const formatQtyDisplay = (qty, nag) => {
  const hasQty = qty && qty > 0;
  const hasNag = nag && nag > 0;

  if (hasQty && hasNag) {
    return `${qty}kg | ${nag}Nag`;
  } else if (hasNag) {
    return `${nag}Nag`;
  } else {
    return `${qty || 0}kg`;
  }
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  if (status === 'Paid') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
        <CheckCircle size={14} />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
      <Clock size={14} />
      Pending
    </span>
  );
};

// Skeleton Loading Row
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
    <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
    <td className="px-6 py-5"><div className="h-6 bg-slate-200 rounded-lg w-28"></div></td>
    <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div></td>
    <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
    <td className="px-6 py-5"><div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div></td>
    <td className="px-6 py-5"><div className="h-6 bg-slate-200 rounded-full w-16 mx-auto"></div></td>
    <td className="px-6 py-5"><div className="h-8 bg-slate-200 rounded-lg w-24 mx-auto"></div></td>
  </tr>
);

// Main Component
export default function BillingReports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('farmers');
  const [dateFilter, setDateFilter] = useState('all');
  const [specificDate, setSpecificDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Payment Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commissionRates, setCommissionRates] = useState({ farmer: 4, trader: 9 });

  // Invoice Modal State
  const [invoiceRecord, setInvoiceRecord] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);




  const fetchCommissionRates = useCallback(async () => {
    try {
      const rules = await api.finance.commissionRates.list();
      if (rules && rules.length > 0) {
        const farmerRule = rules.find(r => r.role_type === 'farmer' && r.crop_type === 'All');
        const traderRule = rules.find(r => r.role_type === 'trader' && r.crop_type === 'All');

        setCommissionRates({
          farmer: farmerRule ? parseFloat(farmerRule.rate) * 100 : 4,
          trader: traderRule ? parseFloat(traderRule.rate) * 100 : 9
        });
      }
    } catch (error) {
      console.error("Failed to fetch commission rates:", error);
    }
  }, []);

  const fetchRecords = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.finance.billingRecords.list({
        limit: 20,
        page,
        period: dateFilter
      });

      if (response && response.records) {
        setData(response.records);
        setTotalPages(response.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch billing records:", error);
      if (showLoading) toast.error("Failed to load records");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [page, dateFilter]);

  useEffect(() => {
    fetchRecords();
    fetchCommissionRates();
  }, [fetchRecords, fetchCommissionRates]);

  useAutoRefresh(() => fetchRecords(false), { interval: 60000 });

  // Process Record
  const processRecord = useCallback((record) => {
    const baseAmount = record.sale_amount || 0;

    // Get rates (default to 4% / 9% if not set)
    const farmerRate = commissionRates.farmer ? (commissionRates.farmer / 100) : 0.04;
    const traderRate = commissionRates.trader ? (commissionRates.trader / 100) : 0.09;

    let farmerComm, traderComm, netFarmer, netTrader;

    // Logic aligned with SoldRecordCard:
    // 1. Use explicit field if available
    // 2. Else calculate based on rate * baseAmount
    // 3. Fallback to legacy split only if absolutely needed (omitted here for consistency with Farmer Dashboard)

    if (record.farmer_commission !== undefined) {
      farmerComm = record.farmer_commission;
    } else {
      farmerComm = Math.round(baseAmount * farmerRate);
    }

    if (record.trader_commission !== undefined) {
      traderComm = record.trader_commission;
    } else {
      traderComm = Math.round(baseAmount * traderRate);
    }
    // Net amounts
    netFarmer = record.net_payable_to_farmer || (baseAmount - farmerComm);
    netTrader = record.net_receivable_from_trader || (baseAmount + traderComm);

    const nagValue = (record.official_nag && record.official_nag > 0)
      ? record.official_nag
      : (record.nag || 0);
    const qtyValue = record.qtySold || record.official_qty || record.quantity || 0;

    if (activeTab === 'farmers') {
      return {
        id: record._id,
        date: record.sold_at || record.createdAt,
        name: record.farmer_id?.full_name || 'Unknown Farmer',
        address: record.farmer_id?.location || record.farmer_id?.address,
        phone: record.farmer_id?.phone,
        crop: record.vegetable,
        qty: qtyValue,
        nag: nagValue,
        baseAmount: baseAmount,
        commission: farmerComm,
        commissionRate: farmerRate, // Pass explicit rate
        finalAmount: netFarmer,
        status: record.farmer_payment_status || (record.payment_status === 'paid' ? 'Paid' : 'Pending'),
        type: 'pay',
        token: record.token || null
      };
    } else {
      return {
        id: record._id,
        date: record.sold_at || record.createdAt,
        name: record.trader_id?.business_name || record.trader_id?.full_name || 'Unknown Trader',
        phone: record.trader_id?.phone,
        address: record.trader_id?.business_address || record.trader_id?.address,
        crop: record.vegetable,
        qty: qtyValue,
        nag: nagValue,
        baseAmount: baseAmount,
        commission: traderComm,
        commissionRate: traderRate, // Pass explicit rate
        finalAmount: netTrader,
        status: record.trader_payment_status || (record.payment_status === 'paid' ? 'Paid' : 'Pending'),
        type: 'receive',
        token: record.token || null
      };
    }
  }, [activeTab, commissionRates]);

  // Processed & Filtered Data
  const currentData = useMemo(() => {
    let processed = data.map(processRecord);

    // Apply specific date filter
    if (specificDate) {
      processed = processed.filter(item => {
        const itemDate = new Date(item.date).toISOString().split('T')[0];
        return itemDate === specificDate;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      processed = processed.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.crop?.toLowerCase().includes(searchLower)
      );
    }

    return processed;
  }, [data, processRecord, specificDate, searchTerm]);

  // Memoized Totals
  const { totalBase, totalCommission, totalFinal } = useMemo(() => ({
    totalBase: currentData.reduce((acc, item) => acc + item.baseAmount, 0),
    totalCommission: currentData.reduce((acc, item) => acc + item.commission, 0),
    totalFinal: currentData.reduce((acc, item) => acc + item.finalAmount, 0)
  }), [currentData]);

  const commissionLabel = activeTab === 'farmers' ? `${commissionRates.farmer}%` : `${commissionRates.trader}%`;

  const handlePayment = (record) => {
    if (record.status === 'Paid') return;
    setSelectedRecord(record);
    setShowPaymentModal(true);
  };

  const handleDownloadInvoice = (record, e) => {
    e?.stopPropagation();
    setInvoiceRecord(record);
    setShowInvoiceModal(true);
  };



  const confirmPayment = async ({ mode, ref }) => {
    if (!selectedRecord) return;

    try {
      setIsProcessing(true);
      if (selectedRecord.type === 'pay') {
        await api.post(`/api/finance/pay-farmer/${selectedRecord.id}`, { mode, ref });
        toast.success(`Paid ₹${selectedRecord.finalAmount?.toLocaleString('en-IN')} to ${selectedRecord.name}`);
      } else {
        await api.post(`/api/finance/receive-trader/${selectedRecord.id}`, { mode, ref });
        toast.success(`Received ₹${selectedRecord.finalAmount?.toLocaleString('en-IN')} from ${selectedRecord.name}`);
      }
      setShowPaymentModal(false);
      setSelectedRecord(null);
      fetchRecords();
    } catch (error) {
      console.error(error);
      toast.error("Transaction failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    const headers = ['Date', activeTab === 'farmers' ? 'Farmer' : 'Trader', 'Crop', 'Qty', 'Base Amt', 'Commission', 'Final Amt', 'Status'];

    const csvData = currentData.map(item => [
      new Date(item.date).toLocaleDateString('en-IN'),
      item.name,
      item.crop,
      formatQtyDisplay(item.qty, item.nag),
      item.baseAmount,
      item.commission,
      item.finalAmount,
      item.status
    ]);

    exportToCSV(csvData, headers, `billing-report-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Report exported successfully');
  };

  const clearAllFilters = () => {
    setSpecificDate('');
    setSearchTerm('');
    setDateFilter('all');
  };

  const hasActiveFilters = specificDate || searchTerm || dateFilter !== 'all';

  return (
    <div className="space-y-6">

      {/* Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        type={selectedRecord?.type}
        amount={selectedRecord?.finalAmount || 0}
        name={selectedRecord?.name}
        onSubmit={confirmPayment}
        isProcessing={isProcessing}
      />

      <InvoiceDownloadModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        data={invoiceRecord}
        type={activeTab === 'farmers' ? 'farmer' : 'trader'}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing Management</h1>
          <p className="text-slate-500 mt-2 text-base">Manage payments for farmers and traders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRecords()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-medium shadow-sm"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all"
          >
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-8">
        <button
          onClick={() => setActiveTab('farmers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'farmers'
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Users size={18} />
          Pay Farmers
        </button>
        <button
          onClick={() => setActiveTab('traders')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'traders'
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <ShoppingBag size={18} />
          Receive from Traders
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Base Sales</p>
              <p className="text-xs text-slate-400 mt-0.5">Total Amount</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-3">₹{totalBase.toLocaleString('en-IN')}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText size={28} className="text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                {activeTab === 'farmers' ? 'Total Payable' : 'Total Receivable'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'farmers' ? 'To Farmers' : 'From Traders'}
              </p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-3">₹{totalFinal.toLocaleString('en-IN')}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Period Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            {/* Specific Date Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
              />
              {specificDate && (
                <button
                  onClick={() => setSpecificDate('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-300 hover:bg-slate-400 rounded-full p-0.5 transition-colors"
                  title="Clear Date"
                >
                  <X size={12} className="text-slate-600" />
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search name, crop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:w-72 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-medium">Active Filters:</span>

            {dateFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                {dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}
                <button onClick={() => setDateFilter('all')} className="ml-1 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}

            {specificDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                <Calendar size={12} />
                {new Date(specificDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                <button onClick={() => setSpecificDate('')} className="ml-1 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}

            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                <Search size={12} />
                "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium ml-2"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {activeTab === 'farmers' ? 'Farmer' : 'Trader'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Crop & Qty</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Amt</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Commission</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Final Amt</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search size={28} className="text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-semibold mb-1">No records found</p>
                    <p className="text-slate-500 text-sm">Try adjusting your search or filter criteria</p>
                  </td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="font-semibold text-slate-900">
                        {new Date(item.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(item.date).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === 'farmers'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                          }`}>
                          {activeTab === 'farmers' ? 'F' : 'T'}
                        </span>
                        <span className="font-medium text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        {item.crop} • {formatQtyDisplay(item.qty, item.nag)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="font-semibold text-slate-900">₹{item.baseAmount.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className={`font-semibold ${activeTab === 'farmers' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {activeTab === 'farmers' ? '-' : '+'}₹{item.commission.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="font-bold text-emerald-600">₹{item.finalAmount.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        {item.status !== 'Paid' ? (
                          <button
                            onClick={() => handlePayment(item)}
                            className="px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            {activeTab === 'farmers' ? 'Pay' : 'Receive'}
                          </button>
                        ) : (
                          <span className="px-3.5 py-2 text-slate-400 text-xs font-medium">Settled</span>
                        )}
                        <button
                          onClick={(e) => handleDownloadInvoice(item, e)}
                          className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border border-slate-200"
                          title="Download Invoice"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                <div className="h-5 bg-slate-200 rounded w-1/2 mb-3"></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-14 bg-slate-100 rounded-lg"></div>
                  <div className="h-14 bg-slate-100 rounded-lg"></div>
                  <div className="h-14 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
            ))
          ) : currentData.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-900 font-semibold mb-1">No records found</p>
              <p className="text-slate-500 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            currentData.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 rounded-xl p-4 border border-slate-100"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-1">
                      {new Date(item.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === 'farmers'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                        }`}>
                        {activeTab === 'farmers' ? 'F' : 'T'}
                      </span>
                      <h3 className="font-bold text-slate-900">{item.name}</h3>
                    </div>
                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium mt-2">
                      {item.crop} • {formatQtyDisplay(item.qty, item.nag)}
                    </span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white rounded-lg p-3 text-center border border-slate-100">
                    <p className="text-xs text-slate-400 uppercase mb-1">Base</p>
                    <p className="font-bold text-sm text-slate-900">₹{(item.baseAmount / 1000).toFixed(1)}K</p>
                  </div>
                  <div className={`rounded-lg p-3 text-center border ${activeTab === 'farmers'
                    ? 'bg-red-50 border-red-100'
                    : 'bg-emerald-50 border-emerald-100'
                    }`}>
                    <p className={`text-xs uppercase mb-1 ${activeTab === 'farmers' ? 'text-red-600' : 'text-emerald-600'
                      }`}>Comm</p>
                    <p className={`font-bold text-sm ${activeTab === 'farmers' ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                      {activeTab === 'farmers' ? '-' : '+'}₹{item.commission.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                    <p className="text-xs text-emerald-600 uppercase mb-1">Final</p>
                    <p className="font-bold text-sm text-emerald-700">₹{(item.finalAmount / 1000).toFixed(1)}K</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {item.status !== 'Paid' ? (
                    <button
                      onClick={() => handlePayment(item)}
                      className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      {activeTab === 'farmers' ? 'Pay Now' : 'Mark Received'}
                    </button>
                  ) : (
                    <div className="flex-1 py-2.5 bg-slate-100 text-slate-500 text-sm font-medium rounded-lg text-center">
                      Settled
                    </div>
                  )}
                  <button
                    onClick={(e) => handleDownloadInvoice(item, e)}
                    className="px-4 py-2.5 bg-slate-100 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={(e) => handleEditClick(e, item)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Edit Record"
                  >
                    <Edit size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table Footer */}
        {!loading && currentData.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{currentData.length}</span> records
            </p>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <span className="px-4 py-2 text-sm text-slate-600 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  );
}