import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts (same as BillingInvoice)
Font.register({
    family: 'NotoSansDevanagari',
    fonts: [
        {
            src: '/fonts/noto-sans-devanagari-devanagari-400-normal.woff',
            fontWeight: 'normal',
        },
        {
            src: '/fonts/noto-sans-devanagari-devanagari-700-normal.woff',
            fontWeight: 'bold',
        },
    ],
});

const colors = {
    brand: '#059669',
    textDark: '#1a1a1a',
    textMedium: '#4a4a4a',
    textLight: '#808080',
    border: '#c0c0c0',
    borderLight: '#e0e0e0',
    tableHeader: '#f5f5f5',
    white: '#ffffff',
    oddRow: '#fafafa',
};

const styles = StyleSheet.create({
    page: {
        padding: '10mm',
        fontFamily: 'Helvetica',
        fontSize: 9,
        color: colors.textDark,
        backgroundColor: colors.white,
        flexDirection: 'column',
    },
    header: {
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.brand,
        paddingBottom: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.brand,
    },
    subtitle: {
        fontSize: 10,
        color: colors.textMedium,
        marginTop: 2,
    },
    metaInfo: {
        textAlign: 'right',
    },
    metaText: {
        fontSize: 8,
        color: colors.textLight,
    },
    filterInfo: {
        marginBottom: 10,
        padding: 5,
        backgroundColor: colors.tableHeader,
        borderRadius: 4,
        flexDirection: 'row',
        gap: 15,
    },
    filterText: {
        fontSize: 8,
        color: colors.textMedium,
    },
    // Table
    table: {
        display: 'table',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableColHeader: {
        width: '11.1%', // 9 columns approx
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: colors.borderLight,
        backgroundColor: colors.tableHeader,
        padding: 5,
    },
    tableCol: {
        width: '11.1%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: colors.borderLight,
        padding: 4,
    },
    tableCellHeader: {
        fontSize: 7,
        fontWeight: 'bold',
        color: colors.textDark,
        textAlign: 'center',
    },
    tableCell: {
        fontSize: 7,
        color: colors.textDark,
        textAlign: 'center',
    },
    tableCellLeft: {
        fontSize: 7,
        color: colors.textDark,
        textAlign: 'left',
    },
    tableCellRight: {
        fontSize: 7,
        color: colors.textDark,
        textAlign: 'right',
    },
    // Footer / Totals
    footer: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.brand,
        paddingTop: 5,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20,
    },
    totalBox: {
        alignItems: 'flex-end',
    },
    totalLabel: {
        fontSize: 8,
        color: colors.textLight,
        marginBottom: 2,
    },
    totalValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.brand,
    },
    pageNumber: {
        position: 'absolute',
        fontSize: 8,
        bottom: 10,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: colors.textLight,
    },
});

// Helper formatters
const formatCurrency = (amount) => Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
});

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: '2-digit'
});

const TransactionReport = ({ records, filters }) => {
    // Calculate Totals
    const totals = records.reduce((acc, r) => ({
        amount: acc.amount + (r.sale_amount || 0),
        commission: acc.commission + (r.commission || 0),
        farmerPayable: acc.farmerPayable + (r.net_payable_to_farmer || 0),
        traderReceivable: acc.traderReceivable + (r.net_receivable_from_trader || 0),
    }), { amount: 0, commission: 0, farmerPayable: 0, traderReceivable: 0 });

    return (
        <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>AgroNond - Market Report</Text>
                        <Text style={styles.subtitle}>Consolidated Transaction Statement</Text>
                    </View>
                    <View style={styles.metaInfo}>
                        <Text style={styles.metaText}>Generated: {new Date().toLocaleString('en-IN')}</Text>
                        <Text style={styles.metaText}>Total Records: {records.length}</Text>
                    </View>
                </View>

                {/* Filters Applied */}
                <View style={styles.filterInfo}>
                    <Text style={styles.filterText}>
                        Period: {filters.period === 'all' ? 'All Time' : filters.period}
                    </Text>
                    {filters.date && (
                        <Text style={styles.filterText}>Specific Date: {formatDate(filters.date)}</Text>
                    )}
                    {filters.search && (
                        <Text style={styles.filterText}>Search: "{filters.search}"</Text>
                    )}
                </View>

                {/* Table Header */}
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={[styles.tableColHeader, { width: '8%' }]}><Text style={styles.tableCellHeader}>Date</Text></View>
                        <View style={[styles.tableColHeader, { width: '15%' }]}><Text style={styles.tableCellHeader}>Farmer</Text></View>
                        <View style={[styles.tableColHeader, { width: '15%' }]}><Text style={styles.tableCellHeader}>Trader</Text></View>
                        <View style={[styles.tableColHeader, { width: '10%' }]}><Text style={styles.tableCellHeader}>Item</Text></View>
                        <View style={[styles.tableColHeader, { width: '8%' }]}><Text style={styles.tableCellHeader}>Qty</Text></View>
                        <View style={[styles.tableColHeader, { width: '8%' }]}><Text style={styles.tableCellHeader}>Rate</Text></View>
                        <View style={[styles.tableColHeader, { width: '10%' }]}><Text style={styles.tableCellHeader}>Total Amt</Text></View>
                        <View style={[styles.tableColHeader, { width: '8%' }]}><Text style={styles.tableCellHeader}>Comm.</Text></View>
                        <View style={[styles.tableColHeader, { width: '9%' }]}><Text style={styles.tableCellHeader}>Net Farmer</Text></View>
                        <View style={[styles.tableColHeader, { width: '9%' }]}><Text style={styles.tableCellHeader}>Net Trader</Text></View>
                    </View>

                    {/* Table Body */}
                    {records.map((record, index) => (
                        <View style={[styles.tableRow, index % 2 === 1 ? { backgroundColor: colors.oddRow } : {}]} key={record._id || index}>
                            {/* Date */}
                            <View style={[styles.tableCol, { width: '8%' }]}>
                                <Text style={styles.tableCell}>{formatDate(record.createdAt)}</Text>
                            </View>

                            {/* Farmer */}
                            <View style={[styles.tableCol, { width: '15%' }]}>
                                <Text style={styles.tableCellLeft}>
                                    {record.farmer_id?.full_name || 'Unknown'}
                                    {record.token ? ` (#${record.token})` : ''}
                                </Text>
                            </View>

                            {/* Trader */}
                            <View style={[styles.tableCol, { width: '15%' }]}>
                                <Text style={styles.tableCellLeft}>
                                    {record.trader_id?.business_name || record.trader_id?.full_name || 'Unknown'}
                                </Text>
                            </View>

                            {/* Item */}
                            <View style={[styles.tableCol, { width: '10%' }]}>
                                <Text style={styles.tableCell}>{record.vegetable || record.crop}</Text>
                            </View>

                            {/* Qty */}
                            <View style={[styles.tableCol, { width: '8%' }]}>
                                <Text style={styles.tableCellRight}>
                                    {record.sale_unit === 'nag'
                                        ? `${record.official_nag || record.nag} Nag`
                                        : `${(record.official_qty || record.quantity)?.toFixed(1)} Kg`
                                    }
                                </Text>
                            </View>

                            {/* Rate */}
                            <View style={[styles.tableCol, { width: '8%' }]}>
                                <Text style={styles.tableCellRight}>{formatCurrency(record.sale_rate || record.rate)}</Text>
                            </View>

                            {/* Total Amount */}
                            <View style={[styles.tableCol, { width: '10%' }]}>
                                <Text style={styles.tableCellRight}>{formatCurrency(record.sale_amount || record.totalAmount)}</Text>
                            </View>

                            {/* Commission */}
                            <View style={[styles.tableCol, { width: '8%' }]}>
                                <Text style={styles.tableCellRight}>{formatCurrency(record.commission)}</Text>
                            </View>

                            {/* Net Farmer */}
                            <View style={[styles.tableCol, { width: '9%' }]}>
                                <Text style={styles.tableCellRight}>{formatCurrency(record.net_payable_to_farmer)}</Text>
                                <Text style={[styles.tableCellRight, { fontSize: 6, color: record.farmer_payment_status === 'Paid' ? colors.brand : colors.textMedium }]}>
                                    {record.farmer_payment_status}
                                </Text>
                            </View>

                            {/* Net Trader */}
                            <View style={[styles.tableCol, { width: '9%' }]}>
                                <Text style={styles.tableCellRight}>{formatCurrency(record.net_receivable_from_trader)}</Text>
                                <Text style={[styles.tableCellRight, { fontSize: 6, color: record.trader_payment_status === 'Paid' ? colors.brand : colors.textMedium }]}>
                                    {record.trader_payment_status}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Footer Totals */}
                <View style={styles.footer}>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Total Turnover</Text>
                        <Text style={styles.totalValue}>₹{formatCurrency(totals.amount)}</Text>
                    </View>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Total Commission</Text>
                        <Text style={styles.totalValue}>₹{formatCurrency(totals.commission)}</Text>
                    </View>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Unpaid to Farmers</Text>
                        <Text style={[styles.totalValue, { color: colors.textDark }]}>₹{formatCurrency(records.filter(r => r.farmer_payment_status === 'Pending').reduce((sum, r) => sum + (r.net_payable_to_farmer || 0), 0))}</Text>
                    </View>
                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Receivable from Traders</Text>
                        <Text style={[styles.totalValue, { color: colors.textDark }]}>₹{formatCurrency(records.filter(r => r.trader_payment_status === 'Pending').reduce((sum, r) => sum + (r.net_receivable_from_trader || 0), 0))}</Text>
                    </View>
                </View>

                <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                    `${pageNumber} / ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
};

export default TransactionReport;
