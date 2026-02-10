import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

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

// Professional Color Palette - Clean Business Document Style
const colors = {
    brand: '#059669',           // AgroNond brand green
    accent: '#2980B9',          // Blue accent for links
    textDark: '#1a1a1a',        // Deep black for headings
    textMedium: '#4a4a4a',      // Dark gray for body text
    textLight: '#808080',       // Light gray for labels
    border: '#c0c0c0',          // Subtle gray borders
    borderLight: '#e0e0e0',
    tableHeader: '#f5f5f5',     // Light gray table header
    white: '#ffffff',
    // Payment status colors
    paidBg: '#dcfce7',
    paidText: '#166534',
    pendingBg: '#fef3c7',
    pendingText: '#92400e',
    partialBg: '#dbeafe',
    partialText: '#1d4ed8',
};

const styles = StyleSheet.create({
    page: {
        padding: '12mm 15mm',
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: colors.textDark,
        backgroundColor: colors.white,
    },

    // Payment Status Badge
    paymentStatusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginTop: 10,
        alignSelf: 'flex-end',
    },
    paymentStatusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Header Section - Clean Professional Layout
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 8,
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    companyInfo: {
        maxWidth: '55%',
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 4,
    },
    companyAddress: {
        fontSize: 8,
        color: colors.textMedium,
        lineHeight: 1.5,
        marginBottom: 2,
    },
    companyContact: {
        fontSize: 8,
        color: colors.accent,
        marginTop: 4,
    },
    invoiceTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textMedium,
        textAlign: 'right',
        letterSpacing: 1,
    },

    // Invoice Details Grid
    detailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    detailsColumn: {
        width: '48%',
    },
    detailsRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    detailsLabel: {
        width: 80,
        fontSize: 9,
        color: colors.textLight,
    },
    detailsValue: {
        fontSize: 9,
        color: colors.textDark,
        fontWeight: 'bold',
    },

    // Bill To Section
    billToSection: {
        marginBottom: 20,
    },
    billToLabel: {
        fontSize: 9,
        color: colors.textLight,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    billToName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textDark,
        fontFamily: 'NotoSansDevanagari',
        marginBottom: 2,
    },
    billToAddress: {
        fontSize: 9,
        color: colors.textMedium,
    },

    // Table Styles - Professional Grid
    table: {
        width: '100%',
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.tableHeader,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    th: {
        fontSize: 8,
        fontWeight: 'bold',
        color: colors.textDark,
        textTransform: 'uppercase',
    },
    thSerial: { width: 25, textAlign: 'center' },
    thDescription: { flex: 3, textAlign: 'left', paddingLeft: 8 },
    thQty: { flex: 1, textAlign: 'center' },
    thRate: { flex: 1.2, textAlign: 'right' },
    thAmount: { flex: 1.2, textAlign: 'right' },

    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingVertical: 10,
        paddingHorizontal: 8,
        minHeight: 35,
    },
    td: {
        fontSize: 9,
        color: colors.textDark,
    },
    tdSerial: { width: 25, textAlign: 'center', color: colors.textLight },
    tdDescription: { flex: 3, textAlign: 'left', paddingLeft: 8 },
    tdDescriptionMain: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.textDark,
        fontFamily: 'NotoSansDevanagari',
    },
    tdDescriptionSub: {
        fontSize: 8,
        color: colors.textLight,
        marginTop: 2,
    },
    tdQty: { flex: 1, textAlign: 'center' },
    tdRate: { flex: 1.2, textAlign: 'right' },
    tdAmount: { flex: 1.2, textAlign: 'right', fontWeight: 'bold' },

    // Totals Section - Aligned Right
    totalsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    totalsSection: {
        width: '45%',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    totalLabel: {
        fontSize: 9,
        color: colors.textMedium,
    },
    totalValue: {
        fontSize: 9,
        color: colors.textDark,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginTop: 4,
        borderTopWidth: 2,
        borderTopColor: colors.textDark,
        backgroundColor: colors.tableHeader,
        marginHorizontal: -8,
        paddingHorizontal: 8,
    },
    grandTotalLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    grandTotalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    // Amount In Words Section
    amountInWords: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    amountInWordsLabel: {
        fontSize: 8,
        color: colors.textLight,
        marginBottom: 3,
    },
    amountInWordsText: {
        fontSize: 10,
        color: colors.textDark,
        fontWeight: 'bold',
    },

    // Notes Section
    notesSection: {
        marginBottom: 20,
    },
    notesLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 8,
        color: colors.textMedium,
        lineHeight: 1.5,
    },

    // Terms & Signature Row
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    termsSection: {
        width: '55%',
    },
    termsLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 6,
    },
    termsText: {
        fontSize: 7,
        color: colors.textLight,
        lineHeight: 1.6,
    },

    // Signature Section
    signatureSection: {
        width: '35%',
        alignItems: 'center',
    },
    signatureLine: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom: 6,
        height: 50,
    },
    signatureLabel: {
        fontSize: 9,
        color: colors.textMedium,
        textAlign: 'center',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 15,
        left: 40,
        right: 40,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: 10,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 8,
        color: colors.textLight,
        textAlign: 'center',
    },
    footerBrand: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.brand,
    },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '₹0.00';
    return `₹${Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

// Convert number to words (Indian format)
const numberToWords = (num) => {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanHundred = (n) => {
        if (n < 20) return ones[n];
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    };

    const convertLessThanThousand = (n) => {
        if (n < 100) return convertLessThanHundred(n);
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanHundred(n % 100) : '');
    };

    let result = '';
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const hundred = Math.floor(num % 1000);

    if (crore > 0) result += convertLessThanHundred(crore) + ' Crore ';
    if (lakh > 0) result += convertLessThanHundred(lakh) + ' Lakh ';
    if (thousand > 0) result += convertLessThanHundred(thousand) + ' Thousand ';
    if (hundred > 0) result += convertLessThanThousand(hundred);

    return result.trim() || 'Zero';
};

const getAmountInWords = (amount) => {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let result = 'Indian Rupee ' + numberToWords(rupees);
    if (paise > 0) {
        result += ' and ' + numberToWords(paise) + ' Paise';
    }
    result += ' Only';
    return result;
};

// ─── Component ──────────────────────────────────────────────────────────────

const TransactionInvoice = ({ transaction, committeeInfo }) => {
    if (!transaction) return null;

    // ── Committee info ──
    const committee = committeeInfo || {
        name: 'AgroNond',
        address1: 'Devcode',
        address2: 'Kothrud, Pune',
        address3: 'Maharashtra',
        phone: '+91 94205 30466',
        email: 'Support@agronond.com',
        website: 'http://agronond.khomrajthorat.com',
    };

    // ── Amounts ──
    const purchaseAmount = transaction.grossAmount || 0;
    const commissionRate = 0.09;
    const commissionAmount = transaction.commission || (purchaseAmount * commissionRate);
    const totalAmount = transaction.totalCost || (purchaseAmount + commissionAmount);

    // ── Calculate commission percentage ──
    const commissionPercent = purchaseAmount > 0
        ? ((commissionAmount / purchaseAmount) * 100).toFixed(1)
        : '9.0';

    // ── Generate Invoice Number ──
    const invoiceNumber = (transaction._id || 'RCP').slice(-6).toUpperCase();

    // ── Payment Status ──
    const isPaid = (transaction.paymentStatus || '').toLowerCase() === 'paid';
    const paymentStatus = isPaid
        ? { bg: colors.paidBg, text: colors.paidText, label: 'Payment Completed' }
        : { bg: colors.pendingBg, text: colors.pendingText, label: 'Payment Pending' };

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* ─── Header ─── */}
                <View style={styles.header}>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>{committee.name}</Text>
                        <Text style={styles.companyAddress}>{committee.address1}</Text>
                        <Text style={styles.companyAddress}>{committee.address2}</Text>
                        <Text style={styles.companyAddress}>{committee.address3}</Text>
                        <Text style={styles.companyAddress}>Phone: {committee.phone}</Text>
                        <Text style={styles.companyContact}>{committee.email}</Text>
                        <Text style={styles.companyContact}>{committee.website}</Text>
                    </View>
                    <Text style={styles.invoiceTitle}>Receipt</Text>
                </View>

                {/* ─── Invoice Details Grid ─── */}
                <View style={styles.detailsGrid}>
                    <View style={styles.detailsColumn}>
                        <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>#</Text>
                            <Text style={styles.detailsValue}>RCP-{invoiceNumber}</Text>
                        </View>
                        <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Date</Text>
                            <Text style={styles.detailsValue}>{formatDate(transaction.date)}</Text>
                        </View>
                    </View>
                </View>

                {/* ─── Bill To Section ─── */}
                <View style={styles.billToSection}>
                    <Text style={styles.billToLabel}>Bill To (Trader)</Text>
                    <Text style={styles.billToName}>{transaction.traderName || 'Trader'}</Text>
                    {transaction.traderPhone && (
                        <Text style={styles.billToAddress}>Phone: {transaction.traderPhone}</Text>
                    )}
                    {transaction.traderAddress && (
                        <Text style={styles.billToAddress}>{transaction.traderAddress}</Text>
                    )}
                    {!transaction.traderPhone && !transaction.traderAddress && (
                        <Text style={styles.billToAddress}>Maharashtra, India</Text>
                    )}
                </View>

                {/* ─── Items Table ─── */}
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, styles.thSerial]}>#</Text>
                        <Text style={[styles.th, styles.thDescription]}>Item & Description</Text>
                        <Text style={[styles.th, styles.thQty]}>Qty</Text>
                        <Text style={[styles.th, styles.thRate]}>Rate</Text>
                        <Text style={[styles.th, styles.thAmount]}>Amount</Text>
                    </View>

                    {/* Table Row */}
                    <View style={styles.tableRow}>
                        <Text style={[styles.td, styles.tdSerial]}>1</Text>
                        <View style={styles.tdDescription}>
                            <Text style={styles.tdDescriptionMain}>
                                {transaction.crop || 'Agricultural Produce'}
                            </Text>
                            <Text style={styles.tdDescriptionSub}>
                                Trader purchase transaction
                            </Text>
                        </View>
                        <Text style={[styles.td, styles.tdQty]}>
                            {transaction.quantity?.toFixed(2) || '0.00'}
                        </Text>
                        <Text style={[styles.td, styles.tdRate]}>
                            {formatNumber(transaction.rate || 0)}
                        </Text>
                        <Text style={[styles.td, styles.tdAmount]}>
                            {formatNumber(purchaseAmount)}
                        </Text>
                    </View>
                </View>

                {/* ─── Totals Section ─── */}
                <View style={styles.totalsContainer}>
                    <View style={styles.totalsSection}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Sub Total</Text>
                            <Text style={styles.totalValue}>{formatNumber(purchaseAmount)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>
                                Market Fee ({commissionPercent}%)
                            </Text>
                            <Text style={styles.totalValue}>
                                +{formatNumber(commissionAmount)}
                            </Text>
                        </View>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>Total</Text>
                            <Text style={styles.grandTotalValue}>
                                ₹{formatNumber(totalAmount)}
                            </Text>
                        </View>

                        {/* Payment Status Badge */}
                        <View style={[
                            styles.paymentStatusBadge,
                            { backgroundColor: paymentStatus.bg }
                        ]}>
                            <Text style={[
                                styles.paymentStatusText,
                                { color: paymentStatus.text }
                            ]}>
                                {paymentStatus.label}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ─── Amount In Words ─── */}
                <View style={styles.amountInWords}>
                    <Text style={styles.amountInWordsLabel}>Total In Words</Text>
                    <Text style={styles.amountInWordsText}>
                        {getAmountInWords(totalAmount)}
                    </Text>
                </View>

                {/* ─── Terms Section ─── */}
                <View style={styles.termsSection}>
                    <Text style={styles.termsLabel}>Terms & Conditions</Text>
                    <Text style={styles.termsText}>
                        Payment Terms: As per APMC regulations{'\n'}
                        All disputes subject to Pune jurisdiction.{'\n'}
                        This is a computer generated receipt.
                    </Text>
                </View>

                {/* ─── Footer ─── */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Crafted with ease using <Text style={styles.footerBrand}>AgroNond</Text>
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

export default TransactionInvoice;