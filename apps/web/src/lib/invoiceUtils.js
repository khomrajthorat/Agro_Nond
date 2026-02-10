/**
 * Helper to generate invoice data structure from a record.
 * Shared between FarmerDashboard and SoldRecordCard to ensure consistent PDF generation.
 */
export const getInvoiceData = (record, farmerName = 'Farmer') => {
    // Logic derived from SoldRecordCard.jsx and FarmerDashboard.jsx

    const isParent = record.is_parent === true;
    const hasQuantity = record.quantity > 0;

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
        // 'Paid' check might be redundant if status is updated correctly, but keeping for safety
        const isSold = ['Sold', 'Completed', 'Paid'].includes(record.status) || record.farmer_payment_status === 'Paid';

        if (isSold) {
            soldQty = officialQty > 0 ? officialQty : totalQty;
            totalSaleAmount = record.sale_amount || 0;

            // If no splits but sold, create a synthetic split for display
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

    // Payment Status Logic
    let isPaymentPending = false;

    if (computedStatus === 'Sold') {
        const paymentStatus = isParent
            ? (record.aggregated_payment_status || 'Pending')
            : (record.farmer_payment_status || 'Pending');

        if (paymentStatus === 'Pending') {
            isPaymentPending = true;
        }
    }

    // Avg Rate
    const avgRate = soldQty > 0 ? (totalSaleAmount / soldQty).toFixed(1) : 0;

    // Commission Calculation
    // Priority: 1. Stored Amount, 2. Stored Rate, 3. Hardcoded Fallback
    let commissionRate = 0.04; // Default fallback for farmers
    if (record.farmer_commission_rate !== undefined && record.farmer_commission_rate > 0) {
        commissionRate = record.farmer_commission_rate;
    }

    const estimatedCommission = isParent
        ? (record.aggregated_farmer_commission || 0)
        : (record.farmer_commission !== undefined && record.farmer_commission > 0
            ? record.farmer_commission
            : (totalSaleAmount * commissionRate));

    // If we have a definitive commission amount but no stored rate, derive it
    if (isParent && totalSaleAmount > 0 && estimatedCommission > 0) {
        commissionRate = estimatedCommission / totalSaleAmount;
    }

    const netPayable = isParent
        ? (totalSaleAmount - estimatedCommission)
        : (record.net_payable_to_farmer || Math.max(0, totalSaleAmount - estimatedCommission));

    const date = record.sold_at ? new Date(record.sold_at) : new Date(record.createdAt);

    // Get farmer name from record if available, otherwise use passed name
    const actualFarmerName = record.farmer_id?.full_name || farmerName;

    // Construct Invoice Data object
    return {
        id: record._id || record.id || 'N/A',
        date: date.toISOString(),
        name: actualFarmerName,
        address: record.farmer_id?.location || record.farmer_id?.address || '',
        phone: record.farmer_id?.phone || '',
        crop: record.vegetable,
        // Use actual sold quantities
        qty: hasQuantity ? soldQty : 0,
        nag: !hasQuantity ? soldQty : 0,
        rate: parseFloat(avgRate) || 0,
        splits: splits,
        baseAmount: totalSaleAmount,
        commission: estimatedCommission,
        commissionRate: commissionRate,
        finalAmount: netPayable,
        // Invoice status string for PDF
        status: isPaymentPending ? 'Payment Pending' :
            (computedStatus === 'Sold' ? 'Full' :
                (computedStatus === 'Partial' ? 'Partial' :
                    (computedStatus === 'WeightPending' ? 'WeightPending' : 'Pending'))),
        type: 'pay',
        token: record.token || null
    };
};
