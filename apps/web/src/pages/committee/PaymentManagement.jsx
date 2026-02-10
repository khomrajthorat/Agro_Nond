import React, { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { RefreshCw, Search, CheckCircle, Clock, IndianRupee, ArrowUpRight, ArrowDownLeft, X, ChevronRight, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import TransactionReport from '../../components/committee/TransactionReport';
import api from '../../lib/api';

const PaymentManagement = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Enhanced Date Filter State
    const [dateFilter, setDateFilter] = useState({
        type: 'all', // all, today, yesterday, week, month, year, custom
        startDate: '',
        endDate: ''
    });

    // Payment Modal
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [actionType, setActionType] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ mode: 'Cash', ref: '', amount: '' });
    const [isProcessing, setIsProcessing] = useState(false);

    // Bulk Payment State
    const [traderList, setTraderList] = useState([]);
    const [selectedTrader, setSelectedTrader] = useState('');
    const [traderPendings, setTraderPendings] = useState([]);
    const [selectedPendingIds, setSelectedPendingIds] = useState([]);
    const [bulkStep, setBulkStep] = useState(1);

    // PDF Report State
    const [isDownloading, setIsDownloading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [readyToDownload, setReadyToDownload] = useState(false);

    const handleDownloadReport = async () => {
        try {
            setIsDownloading(true);
            setReadyToDownload(false);

            // Fetch ALL records matching current filters (limit=10000)
            const params = { limit: 10000 };

            // Apply current filters
            if (searchTerm) params.search = searchTerm;
            if (filter === 'receivables') params.statusType = 'pending_trader'; // backend might need adjustment or handle client side?

            // Date Param Logic
            if (dateFilter.type !== 'all') {
                params.period = dateFilter.type;
                if (dateFilter.type === 'custom') {
                    params.startDate = dateFilter.startDate;
                    params.endDate = dateFilter.endDate;
                }
            }

            // Note: The backend finance.billingRecords.list supports 'period' but maybe not flexible search?
            // Let's check api usage: api.finance.billingRecords.list({ limit: 100 })
            // The filteredRecords logic in frontend does search/date filtering manually on the 100 records?
            // Wait, fetchRecords uses {limit: 100}. If we want ALL, we should ask backend.
            // If backend doesn't support deep search, we might need to fetch a lot and filter client side.
            // For now, let's request a large limit.

            const data = await api.finance.billingRecords.list(params);

            if (data && data.records) {
                // Apply frontend filtering to the full dataset if backend doesn't support specific filters
                // The current component filters `records` (which acts as a view/buffer) using `filteredRecords`.
                // We should replicate that filtering on the full dataset.

                let fullRecords = data.records;

                // 1. Search Filter
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    fullRecords = fullRecords.filter(record =>
                        (record.farmer_id?.full_name?.toLowerCase().includes(searchLower)) ||
                        (record.trader_id?.business_name?.toLowerCase().includes(searchLower))
                    );
                }

                // 2. Status Filter
                if (filter === 'receivables') {
                    fullRecords = fullRecords.filter(r => r.trader_payment_status === 'Pending');
                } else if (filter === 'payables') {
                    fullRecords = fullRecords.filter(r => r.farmer_payment_status === 'Pending');
                }

                setReportData(fullRecords);
                setReadyToDownload(true);
                toast.success(`Generated report for ${fullRecords.length} records`);
            }
        } catch (error) {
            console.error("Report generation failed:", error);
            toast.error("Failed to generate report");
        } finally {
            setIsDownloading(false);
        }
    };

    const fetchRecords = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);

            const params = { limit: 100 };
            // Pass date filter params to fetch initial view
            if (dateFilter.type !== 'all') {
                params.period = dateFilter.type;
                if (dateFilter.type === 'custom') {
                    params.startDate = dateFilter.startDate;
                    params.endDate = dateFilter.endDate;
                }
            }

            const data = await api.finance.billingRecords.list(params);
            if (data && data.records) {
                setRecords(data.records);
                const traders = [...new Map(data.records
                    .filter(r => r.trader_id)
                    .map(item => [item.trader_id._id, item.trader_id])).values()];
                setTraderList(traders);
            }
        } catch (error) {
            console.error(error);
            if (showLoading) toast.error("Failed to load records");
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [dateFilter]); // Refetch when date filter changes

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    useAutoRefresh(() => fetchRecords(false), { interval: 30000 });

    const handleOpenPaymentModal = (record, type) => {
        if (type === 'bulk-receive') {
            setSelectedRecord(null);
            setActionType('bulk-receive');
            setPaymentForm({ mode: 'Cash', ref: '', amount: '' });
            setSelectedTrader('');
            setTraderPendings([]);
            setSelectedPendingIds([]);
            setBulkStep(1);
        } else {
            setSelectedRecord(record);
            setActionType(type);
            setPaymentForm({ mode: 'Cash', ref: '' });
        }
    };

    const handleTraderSelect = (traderId) => {
        setSelectedTrader(traderId);
        const pendings = records.filter(r =>
            r.trader_id?._id === traderId &&
            r.trader_payment_status === 'Pending'
        );
        setTraderPendings(pendings);
        setBulkStep(2);
        setSelectedPendingIds([]);
    };

    const togglePendingRecord = (id) => {
        setSelectedPendingIds(prev => {
            if (prev.includes(id)) return prev.filter(pid => pid !== id);
            return [...prev, id];
        });
    };

    const calculatedTotal = traderPendings
        .filter(p => selectedPendingIds.includes(p._id))
        .reduce((sum, p) => sum + (p.net_receivable_from_trader || 0), 0);

    const processValidation = () => {
        if (actionType === 'bulk-receive') {
            if (bulkStep === 1 && !selectedTrader) { toast.error("Please select a trader"); return false; }
            if (bulkStep === 2 && selectedPendingIds.length === 0) { toast.error("Please select at least one invoice"); return false; }
            if (bulkStep === 3) {
                if (!paymentForm.mode) { toast.error("Select payment mode"); return false; }
                return true;
            }
        }
        return selectedRecord && actionType;
    };

    const handleProcessPayment = async () => {
        if (!processValidation()) return;

        try {
            setIsProcessing(true);

            if (actionType === 'bulk-receive') {
                const res = await api.finance.payments.bulkReceiveTrader({
                    traderId: selectedTrader,
                    amount: calculatedTotal,
                    mode: paymentForm.mode,
                    ref: paymentForm.ref,
                    recordIds: selectedPendingIds
                });

                if (res.receipt) {
                    toast.success(`Receipt Generated! Cleared ${res.processedCount} invoices.`);
                } else {
                    toast.success(res.message);
                }

            } else if (actionType === 'pay-farmer') {
                await api.finance.payments.payFarmer(selectedRecord._id, {
                    mode: paymentForm.mode,
                    ref: paymentForm.ref
                });
                toast.success(`Paid ₹${selectedRecord.net_payable_to_farmer} to Farmer`);
            } else {
                await api.finance.payments.receiveTrader(selectedRecord._id, {
                    mode: paymentForm.mode,
                    ref: paymentForm.ref
                });
                toast.success(`Received ₹${selectedRecord.net_receivable_from_trader} from Trader`);
            }

            setSelectedRecord(null);
            setActionType(null);
            fetchRecords();

        } catch (error) {
            console.error(error);
            toast.error(error.message || "Transaction failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredRecords = records.filter(record => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            (record.farmer_id?.full_name?.toLowerCase().includes(searchLower)) ||
            (record.trader_id?.business_name?.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;

        // Type Filter
        if (filter === 'receivables') {
            return record.trader_payment_status === 'Pending';
        }
        if (filter === 'payables') {
            return record.farmer_payment_status === 'Pending';
        }

        return true;
    });

    const stats = {
        receivables: records.filter(r => r.trader_payment_status === 'Pending').reduce((acc, r) => acc + (r.net_receivable_from_trader || 0), 0),
        payables: records.filter(r => r.farmer_payment_status === 'Pending').reduce((acc, r) => acc + (r.net_payable_to_farmer || 0), 0)
    };

    // Status Badge Component
    const StatusBadge = ({ status, type }) => {
        if (status === 'Paid') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <CheckCircle size={14} />
                    {type === 'trader' ? 'Received' : 'Paid'}
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

    return (
        <div className="space-y-6">


            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Payment Management</h1>
                    <p className="text-slate-500 mt-2 text-base">Track market cashflow and settle accounts</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* PDF Download Button */}
                    {readyToDownload ? (
                        <PDFDownloadLink
                            document={<TransactionReport records={reportData} filters={{ ...dateFilter, search: searchTerm, period: dateFilter.type }} />}
                            fileName={`AgroNond_Transaction_Report_${dateFilter.type}_${new Date().toISOString().split('T')[0]}.pdf`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-medium shadow-sm"
                            onClick={() => {
                                // Optional: Reset state after delay?
                                setTimeout(() => setReadyToDownload(false), 2000);
                            }}
                        >
                            {({ blob, url, loading, error }) =>
                                loading ? 'Loading Doc...' : (
                                    <>
                                        <ArrowDownLeft size={18} className="rotate-180" />
                                        Download PDF
                                    </>
                                )
                            }
                        </PDFDownloadLink>
                    ) : (
                        <button
                            onClick={handleDownloadReport}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-medium shadow-sm"
                        >
                            {isDownloading ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <ArrowDownLeft size={18} className="rotate-180" />
                            )}
                            {isDownloading ? 'Generating...' : 'Report'}
                        </button>
                    )}

                    <button
                        onClick={() => fetchRecords()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-medium shadow-sm"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={() => handleOpenPaymentModal(null, 'bulk-receive')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all"
                    >
                        <IndianRupee size={18} />
                        Bulk Receive
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pending Receivables</p>
                            <p className="text-xs text-slate-400 mt-0.5">From Traders</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-3">₹{stats.receivables.toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <ArrowDownLeft size={28} className="text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pending Payables</p>
                            <p className="text-xs text-slate-400 mt-0.5">To Farmers</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-3">₹{stats.payables.toLocaleString('en-IN')}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <ArrowUpRight size={28} className="text-emerald-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'receivables', label: 'Receivables' },
                            { key: 'payables', label: 'Payables' }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.key
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Enhanced Date Filter */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                            <select
                                value={dateFilter.type}
                                onChange={(e) => setDateFilter({ ...dateFilter, type: e.target.value })}
                                className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none px-3 py-1.5 cursor-pointer"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="year">This Year</option>
                                <option value="custom">Custom Range</option>
                            </select>

                            {dateFilter.type === 'custom' && (
                                <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                                    <input
                                        type="date"
                                        value={dateFilter.startDate}
                                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                                        className="bg-transparent text-xs focus:outline-none w-28"
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                        type="date"
                                        value={dateFilter.endDate}
                                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                                        className="bg-transparent text-xs focus:outline-none w-28"
                                    />
                                </div>
                            )}

                            {(dateFilter.type !== 'all') && (
                                <button
                                    onClick={() => setDateFilter({ type: 'all', startDate: '', endDate: '' })}
                                    className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                                    title="Reset Date"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 lg:flex-none">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search farmer, trader..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full lg:w-72 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Active Filters Display */}
                {(dateFilter.type !== 'all' || searchTerm) && (
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 font-medium">Active Filters:</span>
                        {dateFilter.type !== 'all' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                                <Calendar size={12} />
                                {dateFilter.type === 'custom'
                                    ? `${new Date(dateFilter.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(dateFilter.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                    : dateFilter.type.charAt(0).toUpperCase() + dateFilter.type.slice(1)
                                }
                                <button onClick={() => setDateFilter({ type: 'all', startDate: '', endDate: '' })} className="ml-1 hover:text-red-500">
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
                            onClick={() => { setDateFilter({ type: 'all', startDate: '', endDate: '' }); setSearchTerm(''); }}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium ml-2"
                        >
                            Clear All
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Parties</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amounts</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Farmer Status</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Trader Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <RefreshCw className="animate-spin mx-auto text-emerald-600 mb-3" size={32} />
                                        <p className="text-slate-500 font-medium">Loading records...</p>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search size={28} className="text-slate-400" />
                                        </div>
                                        <p className="text-slate-900 font-semibold mb-1">No records found</p>
                                        <p className="text-slate-500 text-sm">Try adjusting your search or filter criteria</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map(record => (
                                    <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="font-semibold text-slate-900">
                                                {new Date(record.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">
                                                {new Date(record.createdAt).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">F</span>
                                                    <span className="text-sm font-medium text-slate-900">{record.farmer_id?.full_name || 'Unknown'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">T</span>
                                                    <span className="text-sm font-medium text-slate-700">{record.trader_id?.business_name || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="space-y-1">
                                                <div className="font-bold text-slate-900">
                                                    ₹{record.net_receivable_from_trader?.toLocaleString('en-IN')}
                                                    <span className="text-xs text-slate-400 font-normal ml-1">In</span>
                                                </div>
                                                <div className="font-medium text-slate-500">
                                                    ₹{record.net_payable_to_farmer?.toLocaleString('en-IN')}
                                                    <span className="text-xs text-slate-400 font-normal ml-1">Out</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <StatusBadge status={record.farmer_payment_status} type="farmer" />
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <StatusBadge status={record.trader_payment_status} type="trader" />
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {record.trader_payment_status !== 'Paid' && (
                                                    <button
                                                        onClick={() => handleOpenPaymentModal(record, 'receive-trader')}
                                                        className="px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                                                    >
                                                        Receive
                                                    </button>
                                                )}
                                                {record.farmer_payment_status !== 'Paid' && (
                                                    <button
                                                        onClick={() => handleOpenPaymentModal(record, 'pay-farmer')}
                                                        className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                                                    >
                                                        Pay Farmer
                                                    </button>
                                                )}
                                                {record.trader_payment_status === 'Paid' && record.farmer_payment_status === 'Paid' && (
                                                    <span className="px-3.5 py-2 text-slate-400 text-xs font-medium">Settled</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                {!loading && filteredRecords.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{filteredRecords.length}</span> of{' '}
                            <span className="font-semibold text-slate-700">{records.length}</span> records
                        </p>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {(selectedRecord || actionType === 'bulk-receive') && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        {/* Modal Header */}
                        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">
                                    {actionType === 'receive-trader' ? 'Receive Payment' :
                                        actionType === 'bulk-receive' ? 'Bulk Payment Receive' : 'Process Payout'}
                                </h3>
                                {actionType === 'bulk-receive' && (
                                    <div className="flex items-center gap-2 mt-2">
                                        {[1, 2, 3].map(step => (
                                            <div key={step} className="flex items-center">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${bulkStep >= step
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-200 text-slate-500'
                                                    }`}>
                                                    {step}
                                                </div>
                                                {step < 3 && (
                                                    <ChevronRight size={16} className={`mx-1 ${bulkStep > step ? 'text-emerald-600' : 'text-slate-300'}`} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => { setSelectedRecord(null); setActionType(null); }}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">

                            {actionType === 'bulk-receive' ? (
                                <>
                                    {/* Step 1: Select Trader */}
                                    {bulkStep === 1 && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Trader</label>
                                                <select
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-slate-900"
                                                    onChange={e => handleTraderSelect(e.target.value)}
                                                    value={selectedTrader}
                                                >
                                                    <option value="">-- Select Trader --</option>
                                                    {traderList.map(t => (
                                                        <option key={t._id} value={t._id}>{t.business_name} ({t.full_name})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="p-4 bg-slate-50 text-slate-600 rounded-xl text-sm border border-slate-200">
                                                <p className="font-medium">💡 Quick Tip</p>
                                                <p className="mt-1">Select a trader to view and settle their pending invoices in bulk.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Select Invoices */}
                                    {bulkStep === 2 && (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-semibold text-slate-700">Pending Invoices</label>
                                                <button onClick={() => setBulkStep(1)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                                                    Change Trader
                                                </button>
                                            </div>

                                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 sticky top-0">
                                                        <tr className="border-b border-slate-100">
                                                            <th className="p-3 w-12">
                                                                <input
                                                                    type="checkbox"
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setSelectedPendingIds(traderPendings.map(p => p._id));
                                                                        else setSelectedPendingIds([]);
                                                                    }}
                                                                    checked={selectedPendingIds.length === traderPendings.length && traderPendings.length > 0}
                                                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                                />
                                                            </th>
                                                            <th className="p-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                                            <th className="p-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                                        {traderPendings.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="3" className="p-6 text-center text-slate-500">
                                                                    No pending invoices
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            traderPendings.map(p => (
                                                                <tr
                                                                    key={p._id}
                                                                    className={`cursor-pointer transition-colors ${selectedPendingIds.includes(p._id) ? 'bg-emerald-50' : 'hover:bg-slate-50'
                                                                        }`}
                                                                    onClick={() => togglePendingRecord(p._id)}
                                                                >
                                                                    <td className="p-3">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedPendingIds.includes(p._id)}
                                                                            onChange={() => togglePendingRecord(p._id)}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                                        />
                                                                    </td>
                                                                    <td className="p-3 font-medium text-slate-900">
                                                                        {new Date(p.createdAt).toLocaleDateString('en-IN', {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </td>
                                                                    <td className="p-3 text-right font-bold text-slate-900">
                                                                        ₹{p.net_receivable_from_trader?.toLocaleString('en-IN')}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <span className="text-emerald-800 font-medium">Selected Total</span>
                                                <span className="text-2xl font-bold text-emerald-700">₹{calculatedTotal.toLocaleString('en-IN')}</span>
                                            </div>

                                            <button
                                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => setBulkStep(3)}
                                                disabled={selectedPendingIds.length === 0}
                                            >
                                                Continue to Payment Details
                                            </button>
                                        </div>
                                    )}

                                    {/* Step 3: Payment Details */}
                                    {bulkStep === 3 && (
                                        <div className="space-y-4">
                                            <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                                                <p className="text-sm text-emerald-700 font-medium mb-1">Total Amount</p>
                                                <span className="text-3xl font-bold text-emerald-700">₹{calculatedTotal.toLocaleString('en-IN')}</span>
                                                <p className="text-xs text-emerald-600 mt-1">{selectedPendingIds.length} invoice(s) selected</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Mode</label>
                                                <select
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                                    value={paymentForm.mode}
                                                    onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                                                >
                                                    <option>Cash</option>
                                                    <option>Bank Transfer</option>
                                                    <option>UPI</option>
                                                    <option>Cheque</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Reference (Optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Transaction ID, Cheque No."
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                                    value={paymentForm.ref}
                                                    onChange={e => setPaymentForm({ ...paymentForm, ref: e.target.value })}
                                                />
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={() => setBulkStep(2)}
                                                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                                >
                                                    Back
                                                </button>
                                                <button
                                                    onClick={handleProcessPayment}
                                                    disabled={isProcessing}
                                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {isProcessing ? (
                                                        <RefreshCw className="animate-spin" size={18} />
                                                    ) : (
                                                        <CheckCircle size={18} />
                                                    )}
                                                    Confirm & Generate Receipt
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Single Payment Flow */
                                <div className="space-y-5">
                                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-sm text-slate-500 mb-1">
                                            {actionType === 'receive-trader' ? 'Receiving from' : 'Paying to'}
                                        </p>
                                        <p className="font-bold text-xl text-slate-900">
                                            {actionType === 'receive-trader'
                                                ? selectedRecord?.trader_id?.business_name
                                                : selectedRecord?.farmer_id?.full_name}
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-500">Amount</span>
                                            <span className="text-2xl font-bold text-emerald-600">
                                                ₹{actionType === 'receive-trader'
                                                    ? selectedRecord?.net_receivable_from_trader?.toLocaleString('en-IN')
                                                    : selectedRecord?.net_payable_to_farmer?.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Mode</label>
                                        <select
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            value={paymentForm.mode}
                                            onChange={e => setPaymentForm({ ...paymentForm, mode: e.target.value })}
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
                                            placeholder="e.g. Transaction ID, Cheque No."
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            value={paymentForm.ref}
                                            onChange={e => setPaymentForm({ ...paymentForm, ref: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        onClick={handleProcessPayment}
                                        disabled={isProcessing}
                                        className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <RefreshCw className="animate-spin" size={18} />
                                        ) : (
                                            <CheckCircle size={18} />
                                        )}
                                        {actionType === 'receive-trader' ? 'Confirm Receipt' : 'Confirm Payment'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentManagement;