import React, { useState, lazy, Suspense } from 'react';
import { Download, CheckCircle, Clock, X } from 'lucide-react';
import { getInvoiceData } from '../../lib/invoiceUtils';

// Lazy load PDF components
const PDFDownloadLink = lazy(() =>
  import('@react-pdf/renderer').then(module => ({ default: module.PDFDownloadLink }))
);
const BillingInvoice = lazy(() => import('../committee/BillingInvoice'));

// Download Modal
const DownloadModal = ({ isOpen, onClose, invoiceData, recordId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Download Invoice</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">Invoice Details:</p>
            <p className="font-semibold text-gray-800">{invoiceData.crop}</p>
            <p className="text-sm text-gray-500">
              {invoiceData.qty > 0 && `${invoiceData.qty} kg`}
              {invoiceData.qty > 0 && invoiceData.nag > 0 && ' | '}
              {invoiceData.nag > 0 && `${invoiceData.nag} Nag`}
            </p>
            <p className="text-lg font-bold text-emerald-600 mt-2">
              ₹{invoiceData.finalAmount?.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">
              Status: {invoiceData.status}
            </p>
          </div>

          <Suspense fallback={
            <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-200 text-gray-500 font-medium">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Preparing PDF...
            </button>
          }>
            <PDFDownloadLink
              document={<BillingInvoice data={invoiceData} type="farmer" />}
              fileName={`farmer-bill-${(recordId || 'unknown').slice(-6)}.pdf`}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition"
            >
              {({ loading }) => (
                <>
                  {loading ? 'Generating PDF...' : <><Download size={18} /> Download Invoice</>}
                </>
              )}
            </PDFDownloadLink>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

const SoldRecordCard = ({ record, farmerName }) => {
  const [showModal, setShowModal] = useState(false);

  // --- LOGIC PORTED FROM DASHBOARD ---
  const isParent = record.is_parent === true;
  const hasQuantity = record.quantity > 0;
  const unit = hasQuantity ? 'kg' : 'Nag';

  const totalQty = hasQuantity ? record.quantity : record.nag;
  const officialQty = hasQuantity ? (record.official_qty || 0) : (record.official_nag || 0);

  let soldQty = 0;
  let awaitingQty = 0;
  let totalSaleAmount = 0;
  let splits = record.splits || [];

  if (isParent) {
    soldQty = hasQuantity ? (record.aggregated_sold_qty || 0) : (record.aggregated_sold_nag || 0);
    awaitingQty = hasQuantity ? (record.awaiting_qty || 0) : (record.awaiting_nag || 0);
    totalSaleAmount = record.aggregated_sale_amount || 0;
  } else {
    // Legacy or single record logic
    const isSold = ['Sold', 'Completed', 'Paid'].includes(record.status) || record.farmer_payment_status === 'Paid';
    if (isSold) {
      soldQty = officialQty > 0 ? officialQty : totalQty;
      totalSaleAmount = record.sale_amount || 0;
      if (splits.length === 0) {
        splits = [{
          qty: soldQty,
          rate: record.sale_rate,
          amount: record.sale_amount,
          date: record.sold_at || record.createdAt
        }];
      }
    }
    awaitingQty = Math.max(0, totalQty - soldQty);
  }

  // Correct Status Logic - Use backend's display_status when available
  let computedStatus = record.display_status || 'Pending';
  // Fallback computation if display_status not provided
  if (!record.display_status) {
    if (soldQty > 0 && awaitingQty <= 0.01) computedStatus = 'Sold';
    else if (soldQty > 0 && awaitingQty > 0.01) computedStatus = 'Partial';
  }

  // ✅ NEW: Payment Status Logic
  let isPaymentPending = false;

  if (computedStatus === 'Sold') {
    const paymentStatus = isParent
      ? (record.aggregated_payment_status || 'Pending')
      : (record.farmer_payment_status || 'Pending');

    if (paymentStatus === 'Pending') {
      isPaymentPending = true;
    }
  }

  const progressPercent = Math.min(100, (soldQty / totalQty) * 100);

  // Avg Rate
  const avgRate = soldQty > 0 ? (totalSaleAmount / soldQty).toFixed(1) : 0;

  // Commission Calculation
  // Priority: 1. Stored Amount, 2. Stored Rate, 3. Hardcoded Fallback
  let commissionRate = 0.04; // Default fallback
  if (record.farmer_commission_rate !== undefined && record.farmer_commission_rate > 0) {
    commissionRate = record.farmer_commission_rate;
  }

  const estimatedCommission = isParent
    ? (record.aggregated_farmer_commission || 0)
    : (record.farmer_commission !== undefined && record.farmer_commission > 0
      ? record.farmer_commission
      : (totalSaleAmount * commissionRate));

  // If we have a definitive commission amount (e.g. from parent aggregation) but no stored rate, derive it
  if (isParent && totalSaleAmount > 0 && estimatedCommission > 0) {
    commissionRate = estimatedCommission / totalSaleAmount;
  }

  const netPayable = isParent
    ? (totalSaleAmount - estimatedCommission)
    : (record.net_payable_to_farmer || Math.max(0, totalSaleAmount - estimatedCommission));

  const date = record.sold_at ? new Date(record.sold_at) : new Date(record.createdAt);
  const isPaid = computedStatus === 'Sold' && !isPaymentPending; // Strictly used for UI color toggling if needed

  // Get farmer name from record or prop
  const actualFarmerName = record.farmer_id?.full_name || farmerName || 'Farmer';

  // Invoice Data - Use shared helper to ensure PDF consistency (includes address, phone, token, etc.)
  const invoiceData = getInvoiceData(record, actualFarmerName);



  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{date.toLocaleDateString('en-GB')}</span>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${isPaymentPending
            ? 'bg-orange-100 text-orange-700 border-orange-200'
            : computedStatus === 'Sold'
              ? 'bg-green-100 text-green-700 border-green-200'
              : computedStatus === 'Partial'
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : computedStatus === 'WeightPending'
                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
            }`}>
            {isPaymentPending ? 'PAYMENT PENDING' :
              computedStatus === 'Sold' ? 'PAYMENT RECEIVED' :
                computedStatus === 'WeightPending' ? 'WEIGHT PENDING' :
                  `${computedStatus} PAYMENT`}
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {record.vegetable.split(' (')[0]}
                {record.vegetable.includes(' (') && (
                  <span className="block text-base font-bold text-gray-600 font-hindi">
                    ({record.vegetable.split(' (')[1]}
                  </span>
                )}
              </h3>
              <div className="text-sm text-gray-500 mt-1">
                {soldQty > 0 ? (
                  <span>{parseFloat(soldQty.toFixed(2))} {unit} × ₹{parseFloat(avgRate)}/{unit}</span>
                ) : (
                  <span className="text-amber-600 italic">Waiting for sale...</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Net Payable</p>
              <p className={`text-xl font-bold ${netPayable > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                ₹{netPayable.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5 font-medium">
              <span className={soldQty > 0 ? "text-green-700" : "text-gray-500"}>
                {parseFloat(soldQty.toFixed(2))} {unit} Sold
              </span>
              <span className="text-gray-400">
                / {parseFloat(totalQty.toFixed(2))} {unit}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${isPaymentPending ? 'bg-orange-500' :
                  computedStatus === 'Sold' ? 'bg-green-500' :
                    computedStatus === 'Partial' ? 'bg-blue-500' :
                      computedStatus === 'WeightPending' ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2 mb-4 mt-auto">
            <div className="flex justify-between items-center text-gray-600">
              <span>Gross Amount</span>
              <span className="font-medium">₹{totalSaleAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-red-500">
              <span>Commission ({totalSaleAmount > 0 ? ((estimatedCommission / totalSaleAmount) * 100).toFixed(1) : 0}%)</span>
              <span className="font-medium">- ₹{estimatedCommission.toLocaleString('en-IN')}</span>
            </div>
            {isPaid && record.farmer_payment_mode && (
              <div className="flex justify-between items-center text-gray-500 pt-2 border-t border-gray-200 mt-2">
                <span>Paid via:</span>
                <span className="font-medium text-gray-700 max-w-[150px] truncate">{record.farmer_payment_mode}</span>
              </div>
            )}
          </div>

          {/* Download Button */}
          <button
            onClick={() => setShowModal(true)}
            disabled={soldQty <= 0}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium transition text-sm ${soldQty > 0
              ? 'border-gray-200 hover:bg-gray-50 text-gray-600'
              : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
          >
            <Download size={16} />
            Download Bill
          </button>
        </div>
      </div>

      <DownloadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        invoiceData={invoiceData}
        recordId={record._id || record.id}
      />
    </>
  );
};

export default SoldRecordCard;