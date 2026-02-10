import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Cell
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Calendar, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PERIODS = [
    { key: 'day', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' }
];

const COLORS = [
    '#10b981', // emerald-500
    '#22c55e', // green-500
    '#84cc16', // lime-500
    '#eab308', // yellow-500
    '#f97316', // orange-500
    '#ef4444', // red-500
    '#ec4899', // pink-500
    '#a855f7', // purple-500
    '#6366f1', // indigo-500
    '#3b82f6', // blue-500
];

const CustomYAxisTick = ({ x, y, payload }) => {
    const text = payload.value;
    const parts = text.split('(');
    const english = parts[0].trim();
    // Re-add parenthesis if it exists in split
    const marathi = parts.length > 1 ? `(${parts[1]}` : '';

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={-5} textAnchor="end" fill="var(--text-primary)" fontSize={12} fontWeight={500}>
                {english}
            </text>
            {marathi && (
                <text x={0} y={0} dy={10} textAnchor="end" fill="var(--text-secondary)" fontSize={11}>
                    {marathi}
                </text>
            )}
        </g>
    );
};

export default function VegetableSalesAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('day');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/analytics/vegetable-sales?period=${period}`);
            if (!response.ok) throw new Error('Failed to fetch data');
            const result = await response.json();
            setData(result);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    const formatCurrency = (value) => {
        if (value >= 100000) {
            return `₹${(value / 100000).toFixed(1)}L`;
        } else if (value >= 1000) {
            return `₹${(value / 1000).toFixed(1)}K`;
        }
        return `₹${value}`;
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const ratePerKg = item.avgRatePerKg || 0;
            const ratePerNag = item.avgRatePerNag || 0;
            return (
                <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border border-[var(--border)]">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">{item.vegetable}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Avg Rate: <span className="font-medium text-[var(--primary)]">₹{ratePerKg}/kg</span>
                        <span className="mx-1 text-[var(--text-muted)]">|</span>
                        <span className="font-medium text-[var(--primary)]">₹{ratePerNag}/Nag</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-[var(--border)] shadow-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[var(--border)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--primary-100)]">
                            <BarChart3 className="w-6 h-6 text-[var(--primary)]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Market Sales Analytics</h2>
                            <p className="text-sm text-[var(--text-muted)]">Vegetable sales performance</p>
                        </div>
                    </div>

                    {/* Period Tabs */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {PERIODS.map((p) => (
                            <button
                                key={p.key}
                                onClick={() => setPeriod(p.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p.key
                                    ? 'bg-[var(--primary)] text-white shadow-md'
                                    : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--primary-50)]'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="p-2 rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--primary-50)] transition-all"
                            title="Refresh data"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Skeleton for cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="h-28 bg-[var(--surface)] rounded-xl animate-pulse" />
                                ))}
                            </div>
                            {/* Skeleton for chart */}
                            <div className="h-64 bg-[var(--surface)] rounded-xl animate-pulse" />
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-12"
                        >
                            <p className="text-[var(--text-muted)]">Failed to load analytics data</p>
                            <button
                                onClick={fetchData}
                                className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-600)] transition-colors"
                            >
                                Try Again
                            </button>
                        </motion.div>
                    ) : !data || data.data.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-12"
                        >
                            <Calendar className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
                            <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">No Sales Data</h3>
                            <p className="text-[var(--text-muted)]">
                                No vegetable sales recorded for {PERIODS.find(p => p.key === period)?.label.toLowerCase()}.
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* High/Low Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Highest Selling */}
                                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 p-5">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                                            <span className="text-sm font-medium text-emerald-700 uppercase tracking-wide">Highest Selling</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-emerald-800 mb-1">{data.highest?.vegetable}</h3>
                                        <p className="text-sm text-emerald-600 mt-1">
                                            Avg Rate: <span className="font-semibold">₹{data.highest?.avgRatePerKg || 0}/kg</span>
                                            <span className="mx-1">|</span>
                                            <span className="font-semibold">₹{data.highest?.avgRatePerNag || 0}/Nag</span>
                                        </p>
                                        <p className="text-sm text-emerald-600/70 mt-1">
                                            {data.highest?.transactionCount} sales
                                        </p>
                                    </div>
                                </div>

                                {/* Lowest Selling */}
                                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-3">
                                            <TrendingDown className="w-5 h-5 text-amber-600" />
                                            <span className="text-sm font-medium text-amber-700 uppercase tracking-wide">Lowest Selling</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-amber-800 mb-1">{data.lowest?.vegetable}</h3>
                                        <p className="text-sm text-amber-600 mt-1">
                                            Avg Rate: <span className="font-semibold">₹{data.lowest?.avgRatePerKg || 0}/kg</span>
                                            <span className="mx-1">|</span>
                                            <span className="font-semibold">₹{data.lowest?.avgRatePerNag || 0}/Nag</span>
                                        </p>
                                        <p className="text-sm text-amber-600/70 mt-1">
                                            {data.lowest?.transactionCount} sales
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Bar Chart */}
                            <div className="bg-[var(--surface)] rounded-xl p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-[var(--text-primary)]">Sales by Vegetable</h4>
                                    <span className="text-sm text-[var(--text-muted)]">
                                        Total: ₹{data.totalMarketSales?.toLocaleString()} • {data.vegetableCount} vegetables
                                    </span>
                                </div>
                                <div style={{ height: Math.max(350, data.data.length * 60) }} className="w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <BarChart
                                            data={data.data}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.5} />
                                            <XAxis
                                                type="number"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                                tickFormatter={formatCurrency}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="vegetable"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={<CustomYAxisTick />}
                                                width={110}
                                                interval={0}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 6 }} />
                                            <Bar dataKey="totalSalesAmount" radius={[0, 4, 4, 0]} barSize={32}>
                                                {data.data.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--text-muted)] pt-2 font-medium">
                                <span>{data.vegetableCount} vegetables traded</span>
                                <span className="text-[var(--border)]">|</span>
                                <span>₹{data.totalMarketSales?.toLocaleString()} total sales</span>
                                <span className="text-[var(--border)]">|</span>
                                <span>{PERIODS.find(p => p.key === period)?.label}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
