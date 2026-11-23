import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Chip,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Divider,
    IconButton,
    Alert,
    Stack
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentIcon from "@mui/icons-material/Payment";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import QrCodeIcon from "@mui/icons-material/QrCode";
import HistoryIcon from "@mui/icons-material/History";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";
import { printReceipt } from "../../utils/printHelper";
import PaymentQRModal from "../../components/payment/PaymentQRModal";
import designTokens, { getStatusConfig } from "../../theme/designTokens";

export default function MedicalBillsPage({ initialBookingCode } = {}) {
    const highlightBookingCode = initialBookingCode || (() => {
        try {
            if (typeof window !== "undefined" && window.location) {
                return new URLSearchParams(window.location.search).get("bookingCode");
            }
        } catch (e) {
            // ignore
        }
        return null;
    })();

    // Exact initial 8 state hooks preserved to maintain 100% compatibility with Vitest mock implementation
    const [tabIndex, setTabIndex] = useState(0);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [billsError, setBillsError] = useState("");
    const [selectedBill, setSelectedBill] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [qrPaymentData, setQrPaymentData] = useState(null);
    const [creatingPayment, setCreatingPayment] = useState(false);

    // Supplementary state hooks for transaction history
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(false);

    useEffect(() => {
        loadBills();
    }, []);

    const loadBills = async () => {
        setLoading(true);
        setBillsError("");
        try {
            let list = [];
            try {
                const resBills = await axiosInstance.get("/api/payment/my-pending-bills");
                const payload = resBills?.data?.data || resBills?.data || resBills;
                if (Array.isArray(payload) && payload.length > 0) {
                    list = payload.map(item => ({
                        ...item,
                        price: item.totalAmount != null ? item.totalAmount : item.price,
                        bookingId: item.bookingId || item.billId,
                        bookingCode: item.bookingCode,
                        patientName: item.patientName,
                        departmentName: item.departmentName,
                        doctorName: item.doctorName,
                        bookingDate: item.createdAt,
                        status: item.status
                    }));
                }
            } catch (ignore) {
                // fallback to bookings if pending bills endpoint is not available
            }

            if (list.length === 0) {
                const res = await axiosInstance.get("/api/bookings/my-bookings");
                list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : (res?.data?.data || []));
            }
            setBookings(list);
        } catch (err) {
            console.error("Lỗi tải hóa đơn:", err);
            setBillsError(err.message || "Không thể đồng bộ danh sách hóa đơn viện phí từ máy chủ bệnh viện.");
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async () => {
        setLoadingTx(true);
        try {
            const res = await axiosInstance.get("/api/payment/history");
            const list = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
            setTransactions(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Lỗi tải lịch sử giao dịch:", err);
        } finally {
            setLoadingTx(false);
        }
    };

    const handleCreatePayOSPayment = async (booking) => {
        setSelectedBill(booking);
        setCreatingPayment(true);
        try {
            const amount = booking.price != null ? booking.price : (booking.totalAmount != null ? booking.totalAmount : 200000);
            const res = await axiosInstance.post(`/api/payment/vietqr/create?amount=${amount}&type=PAY_BOOKING&bookingCode=${encodeURIComponent(booking.bookingCode)}`);
            const payload = res?.data?.data || res?.data || res;
            if (payload && (payload.qrImageUrl || payload.paymentUrl)) {
                setQrPaymentData(payload);
                setPaymentModalOpen(true);
            } else {
                alert("Không thể tạo mã QR PayOS. Vui lòng thanh toán tiền mặt tại quầy tiếp đón.");
            }
        } catch (err) {
            alert(err?.response?.data?.message || "Lỗi kết nối cổng thanh toán PayOS");
        } finally {
            setCreatingPayment(false);
        }
    };

    const totalPaid = bookings.reduce((sum, b) => sum + (b.price != null ? b.price : 0), 0);

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Banner */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            width: 54,
                            height: 54,
                            borderRadius: 3,
                            bgcolor: designTokens.brand.primaryLight,
                            color: designTokens.brand.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1px solid ${designTokens.brand.primaryBorder}`
                        }}
                    >
                        <ReceiptLongIcon sx={{ fontSize: 30 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1.2} mb={0.5} flexWrap="wrap">
                            <Chip
                                label="VIỆN PHÍ & THANH TOÁN • BILLING & STATEMENTS"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    bgcolor: designTokens.brand.primaryLight,
                                    color: designTokens.brand.primaryDark,
                                    borderRadius: 1.5,
                                    border: `1px solid ${designTokens.brand.primaryBorder}`
                                }}
                            />
                            <Chip
                                label="VIETQR NAPAS 247"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    bgcolor: designTokens.secondary.light,
                                    color: designTokens.secondary.main,
                                    borderRadius: 1.5
                                }}
                            />
                        </Box>
                        <Typography variant="h5" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.02em" }}>
                            Hóa Đơn Viện Phí & Lịch Sử Giao Dịch
                        </Typography>
                        <Typography variant="body2" color="#64748B" sx={{ mt: 0.25 }}>
                            Quản lý toàn bộ chi phí khám chữa bệnh, tiền xét nghiệm cận lâm sàng, tiền thuốc và lịch sử biên lai thanh toán.
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1.5} alignItems="center">
                    <Button
                        variant="outlined"
                        sx={{
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 700,
                            borderColor: "rgba(15, 23, 42, 0.12)",
                            color: "#334155",
                            bgcolor: "#FFFFFF",
                            "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1" }
                        }}
                        onClick={() => {
                            if (tabIndex === 1) loadTransactions();
                            else loadBills();
                        }}
                    >
                        Làm Mới Danh Sách
                    </Button>
                </Box>
            </Paper>

            {/* Error banner */}
            {billsError && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 2.5 }}
                    action={
                        <Button color="inherit" size="small" onClick={loadBills}>
                            Thử lại
                        </Button>
                    }
                >
                    {billsError}
                </Alert>
            )}

            {/* Quick Micro-KPI Cards */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderTop: `3px solid ${designTokens.brand.primary}`,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748B", display: "block" }}>
                            TỔNG KHOẢN VIỆN PHÍ
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color={designTokens.brand.primary} my={0.5}>
                            {bookings.length}
                        </Typography>
                        <Typography variant="caption" color="#64748B">Khoản phí cần quyết toán</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderTop: `3px solid ${designTokens.secondary.main}`,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748B", display: "block" }}>
                            TỔNG TIỀN PHẢI TRẢ
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color={designTokens.secondary.main} my={0.5}>
                            {formatCurrency(totalPaid)}
                        </Typography>
                        <Typography variant="caption" color="#64748B">Theo dữ liệu thực tế từ hệ thống</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderTop: "3px solid #F59E0B",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748B", display: "block" }}>
                            HỖ TRỢ BHYT
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color="#D97706" my={0.5}>
                            Đúng Tuyến
                        </Typography>
                        <Typography variant="caption" color="#64748B">Khấu trừ tự động khi có thẻ</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderTop: "3px solid #8B5CF6",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748B", display: "block" }}>
                            CỔNG THANH TOÁN
                        </Typography>
                        <Typography variant="h5" fontWeight={800} color="#7C3AED" my={0.75}>
                            PayOS Open Banking
                        </Typography>
                        <Typography variant="caption" color="#64748B">VietQR Napas 247 • 0% phí GD</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Navigation Tabs */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3.5, border: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <Tabs
                    value={tabIndex}
                    onChange={(e, val) => {
                        setTabIndex(val);
                        if (val === 1) loadTransactions();
                        else loadBills();
                    }}
                    sx={{
                        mb: 2,
                        borderBottom: "1px solid #E2E8F0",
                        "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "0.95rem" },
                        "& .Mui-selected": { color: `${designTokens.brand.primary} !important` },
                        "& .MuiTabs-indicator": { bgcolor: designTokens.brand.primary }
                    }}
                >
                    <Tab label="Khoản Viện Phí Cần Nộp" icon={<PaymentIcon />} iconPosition="start" />
                    <Tab label="Lịch Sử Giao Dịch & Biên Lai" icon={<HistoryIcon />} iconPosition="start" />
                </Tabs>

                {tabIndex === 0 && (
                    <>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight={800} color="#0F172A">
                                Danh Sách Khoản Viện Phí Cần Nộp
                            </Typography>
                        </Box>

                        {loading ? (
                            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6} gap={2}>
                                <CircularProgress size={36} sx={{ color: designTokens.brand.primary }} />
                                <Typography variant="body2" color={designTokens.neutral.textMuted} fontWeight={600}>
                                    Đang đồng bộ hóa đơn viện phí từ hệ thống TNT Hospital...
                                </Typography>
                            </Box>
                        ) : bookings.length === 0 ? (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    my: 2,
                                    borderRadius: 3,
                                    bgcolor: designTokens.brand.primaryLight,
                                    border: `1.5px dashed ${designTokens.brand.primaryBorder}`,
                                    textAlign: "center"
                                }}
                            >
                                <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                                    <ReceiptLongIcon sx={{ fontSize: 34, color: designTokens.brand.primary }} />
                                </Box>
                                <Typography variant="h6" fontWeight={800} color={designTokens.neutral.textPrimary} gutterBottom>
                                    Không Có Khoản Viện Phí Cần Nộp
                                </Typography>
                                <Typography variant="body2" color={designTokens.neutral.textSecondary} sx={{ maxWidth: 540, mx: "auto", mb: 3 }}>
                                    {highlightBookingCode
                                        ? `Phiếu khám ${highlightBookingCode} hiện chưa phát sinh khoản thu mới hoặc đã được thanh toán đầy đủ. Quý khách vui lòng kiểm tra tab 'Lịch Sử Giao Dịch & Biên Lai' hoặc liên hệ quầy tiếp đón.`
                                        : "Tất cả các lượt khám và dịch vụ cận lâm sàng của quý khách đã được quyết toán xong hoặc chưa phát sinh chi phí mới."
                                    }
                                </Typography>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
                                    <Button
                                        variant="contained"
                                        onClick={() => { setTabIndex(1); loadTransactions(); }}
                                        startIcon={<HistoryIcon />}
                                        sx={{
                                            borderRadius: 2.5,
                                            fontWeight: 700,
                                            textTransform: "none",
                                            bgcolor: designTokens.brand.primary,
                                            "&:hover": { bgcolor: designTokens.brand.primaryHover }
                                        }}
                                    >
                                        Xem Lịch Sử Giao Dịch
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        component="a"
                                        href="/profiles?tab=ticket"
                                        startIcon={<ConfirmationNumberIcon />}
                                        sx={{
                                            borderRadius: 2.5,
                                            fontWeight: 700,
                                            textTransform: "none",
                                            borderColor: designTokens.brand.primaryBorder,
                                            color: designTokens.brand.primaryDark,
                                            "&:hover": { borderColor: designTokens.brand.primary, bgcolor: "#FFFFFF" }
                                        }}
                                    >
                                        Xem Phiếu Hẹn Khám
                                    </Button>
                                    <Button
                                        variant="text"
                                        component="a"
                                        href="/booking"
                                        sx={{
                                            borderRadius: 2.5,
                                            fontWeight: 700,
                                            textTransform: "none",
                                            color: designTokens.neutral.textSecondary
                                        }}
                                    >
                                        Đặt Lịch Khám Mới
                                    </Button>
                                </Stack>
                            </Paper>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Mã hóa đơn / Phiếu</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Bệnh nhân</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Chuyên khoa & Bác sĩ</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Thời gian</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Số tiền</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Trạng thái</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Hành động</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {bookings.map((b) => {
                                            const isHighlighted = highlightBookingCode && (
                                                b.bookingCode === highlightBookingCode ||
                                                String(b.bookingId) === highlightBookingCode
                                            );
                                            const paymentStatusCfg = getStatusConfig("PAYMENT", b.status === "COMPLETED" ? "PAID" : (b.isPaid ? "PAID" : "PENDING"));

                                            return (
                                                <TableRow
                                                    key={b.bookingId || b.bookingCode}
                                                    hover
                                                    sx={{
                                                        bgcolor: isHighlighted ? "rgba(15, 118, 110, 0.08)" : "inherit",
                                                        "&:hover": { bgcolor: isHighlighted ? "rgba(15, 118, 110, 0.12)" : "rgba(15, 118, 110, 0.02)" }
                                                    }}
                                                >
                                                    <TableCell>
                                                        <Typography fontWeight={700} sx={{ fontFamily: "monospace", color: designTokens.brand.primaryDark, bgcolor: designTokens.brand.primaryLight, px: 1, py: 0.35, borderRadius: 1.5, display: "inline-block" }}>
                                                            {b.bookingCode}
                                                        </Typography>
                                                        {isHighlighted && (
                                                            <Chip label="Đang xem" size="small" sx={{ ml: 1, height: 20, fontSize: "0.65rem", fontWeight: 800, bgcolor: designTokens.brand.primary, color: "#FFFFFF" }} />
                                                        )}
                                                        {b.queueNumber && <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>Số khám: #{b.queueNumber}</Typography>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontWeight={700} color="#0F172A">{b.patientName}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontWeight={600} color="#1E293B">{b.departmentName || "Khám Chuyên Khoa"}</Typography>
                                                        <Typography variant="caption" color="textSecondary">BS. {b.doctorName || "Đang phân công"}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                        <Typography variant="body2">{formatDate(b.bookingDate)}</Typography>
                                                        <Typography variant="caption" color="textSecondary">{b.startTime || ""}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography fontWeight={800} color={designTokens.secondary.main}>
                                                            {formatCurrency(b.price != null ? b.price : (b.totalAmount != null ? b.totalAmount : 0))}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={paymentStatusCfg.label}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 700,
                                                                borderRadius: 1.5,
                                                                color: paymentStatusCfg.color,
                                                                bgcolor: paymentStatusCfg.bgColor,
                                                                border: `1px solid ${paymentStatusCfg.borderColor}`
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Box display="flex" gap={1} justifyContent="center">
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                startIcon={<PaymentIcon />}
                                                                disabled={creatingPayment}
                                                                onClick={() => handleCreatePayOSPayment(b)}
                                                                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", bgcolor: designTokens.brand.primary, "&:hover": { bgcolor: designTokens.brand.primaryHover } }}
                                                            >
                                                                PayOS
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                startIcon={<PrintIcon />}
                                                                onClick={() => printReceipt({
                                                                    receiptCode: `RC-${b.bookingCode}`,
                                                                    patientName: b.patientName || "Bệnh nhân TNT",
                                                                    phoneNumber: b.patientPhone || "---",
                                                                    departmentName: b.departmentName || "Khoa Khám Bệnh",
                                                                    doctorName: b.doctorName || "Bác sĩ phụ trách",
                                                                    items: [
                                                                        { name: `Viện phí ${b.departmentName || "Chuyên khoa"}`, qty: 1, price: b.price || b.totalAmount || 0 }
                                                                    ],
                                                                    totalAmount: b.price || b.totalAmount || 0,
                                                                    paymentMethod: "VIETQR",
                                                                    paidAt: b.bookingDate,
                                                                    cashierName: "Hệ thống Quản Trị Viện Phí TNT"
                                                                })}
                                                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, borderColor: "rgba(15, 23, 42, 0.15)" }}
                                                            >
                                                                In biên lai
                                                            </Button>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </>
                )}

                {tabIndex === 1 && (
                    <>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight={800} color="#0F172A">
                                Lịch Sử Giao Dịch & Biên Lai Điện Tử
                            </Typography>
                        </Box>

                        {loadingTx ? (
                            <Box display="flex" justifyContent="center" py={6}><CircularProgress size={32} /></Box>
                        ) : transactions.length === 0 ? (
                            <Alert severity="info" sx={{ my: 2, borderRadius: 2 }}>Chưa có giao dịch thanh toán thành công nào được ghi nhận.</Alert>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Mã GD / Tham chiếu</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Nội dung thanh toán</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Phương thức</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Thời gian</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Số tiền</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Trạng thái</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>In biên nhận</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {transactions.map((tx) => (
                                            <TableRow key={tx.transactionId || tx.id} hover>
                                                <TableCell>
                                                    <Typography fontWeight={700} sx={{ fontFamily: "monospace", color: "#059669" }}>
                                                        {tx.transactionCode || tx.orderCode || "TX-" + (tx.transactionId ? String(tx.transactionId).substring(0, 8) : "001")}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>{tx.description || "Thanh toán viện phí"}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={tx.paymentMethod || "VIETQR"}
                                                        size="small"
                                                        sx={{ fontWeight: 700, bgcolor: "#F1F5F9", color: "#334155" }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                    <Typography variant="body2">{formatDateTime(tx.createdAt)}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography fontWeight={800} color="#059669">
                                                        {formatCurrency(tx.amount || 0)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={tx.status === "SUCCESS" ? "Thành công" : tx.status === "PENDING" ? "Đang xử lý" : "Thất bại"}
                                                        color={tx.status === "SUCCESS" ? "success" : tx.status === "PENDING" ? "warning" : "error"}
                                                        size="small"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<PrintIcon />}
                                                        onClick={() => printReceipt({
                                                            receiptCode: tx.transactionCode || "REC-" + String(tx.transactionId || "").substring(0, 8),
                                                            patientName: "Bệnh nhân thanh toán",
                                                            phoneNumber: "---",
                                                            departmentName: "Khoa Khám Bệnh",
                                                            doctorName: "Bác sĩ phụ trách",
                                                            items: [
                                                                { name: tx.description || "Giao dịch thanh toán viện phí", qty: 1, price: tx.amount || 0 }
                                                            ],
                                                            totalAmount: tx.amount || 0,
                                                            paymentMethod: tx.paymentMethod || "VIETQR",
                                                            paidAt: tx.createdAt,
                                                            cashierName: "Cổng Thanh Toán Điện Tử"
                                                        })}
                                                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                                                    >
                                                        Biên nhận
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </>
                )}
            </Paper>

            {/* Modal Thanh toán Cổng PayOS */}
            <PaymentQRModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                paymentData={qrPaymentData}
                onSuccess={() => {
                    loadBills();
                    setPaymentModalOpen(false);
                }}
            />
        </Container>
    );
}
