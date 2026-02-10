import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionsData, calculateSummary } from './accountingData';
import OverviewStats from './components/OverviewStats';
import TransactionsView from './components/TransactionsView';
import api from '../../lib/api';

export default function AccountingOverview() {
  const [summary, setSummary] = useState({
    totalBaseAmount: 0,
    totalTransactions: 0,
    totalCommission: 0,
    receivedPayments: 0,
    farmerPaymentsPaid: 0,
    pendingCount: 0,
    farmerPaymentsDue: 0
  });

  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, billingData] = await Promise.all([
          api.finance.stats(),
          api.finance.billingRecords.list({ limit: 10 })
        ]);

        setSummary(statsResponse);

        // UPDATED: Include nag and sale_unit in transformation
        const formattedTransactions = billingData.records.map(t => {
          // Get effective values (official or farmer's initial)
          const qtyValue = (t.official_qty && t.official_qty > 0)
            ? t.official_qty
            : (t.quantity || 0);
          const nagValue = (t.official_nag && t.official_nag > 0)
            ? t.official_nag
            : (t.nag || 0);
          const inferredSaleUnit = t.sale_unit || (nagValue > 0 ? 'nag' : 'kg');

          return {
            id: t._id,
            date: new Date(t.sold_at || t.createdAt).toISOString().split('T')[0],
            farmer: { name: t.farmer_id?.full_name || 'Unknown' },
            trader: { name: t.trader_id?.business_name || t.trader_id?.full_name || 'Unknown' },
            crop: t.vegetable,
            quantity: qtyValue,
            nag: nagValue,
            sale_unit: inferredSaleUnit,
            rate: t.sale_rate,
            baseAmount: t.sale_amount,
            paymentStatus: t.trader_payment_status === 'Paid' ? 'Completed' : t.status
          };
        });

        setTransactions(formattedTransactions);
      } catch (error) {
        console.error("Failed to fetch accounting data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Accounting Overview</h1>
        <p className="text-slate-500 mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <OverviewStats summary={summary} />

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
          <Link
            to="/dashboard/committee/accounting/transactions"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            View All &rarr;
          </Link>
        </div>
        <TransactionsView transactions={transactions} />
      </div>
    </div>
  );
}