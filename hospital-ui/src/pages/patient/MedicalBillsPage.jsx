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
    Alert
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentIcon from "@mui/icons-material/Payment";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import QrCodeIcon from "@mui/icons-material/QrCode";
import HistoryIcon from "@mui/icons-material/History";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";
import { printReceipt } from "../../utils/printHelper";
import PaymentQRModal from "../../components/payment/PaymentQRModal";

export default function MedicalBillsPage() {
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
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: "#0088D6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(0, 136, 214, 0.2)"
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
                                    bgcolor: "#EBF5FF",
                                    color: "#0088D6",
                                    borderRadius: 1.5,
                                    border: "1px solid rgba(0, 136, 214, 0.2)"
                                }}
                            />
                            <Chip
                                label="VIETQR NAPAS 247"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(16, 185, 129, 0.1)",
                                    color: "#059669",
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
                            borderTop: "3px solid #0088D6",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748B", display: "block" }}>
                            TỔNG KHOẢN VIỆN PHÍ
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color="#0088D6" my={0.5}>
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
                            borderTop: "3px solid #10B981",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748B", display: "block" }}>
                            TỔNG TIỀN PHẢI TRẢ
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color="#10B981" my={0.5}>
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
                        "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "0.95rem" }
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
                            <Box display="flex" justifyContent="center" py={6}><CircularProgress size={32} /></Box>
                        ) : bookings.length === 0 ? (
                            <Alert severity="info" sx={{ my: 2, borderRadius: 2 }}>Bạn không có khoản viện phí nào còn nợ. Tất cả đã được thanh toán đầy đủ!</Alert>
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
                                        {bookings.map((b) => (
                                            <TableRow key={b.bookingId || b.bookingCode} hover sx={{ "&:hover": { bgcolor: "rgba(0, 136, 214, 0.02)" } }}>
                                                <TableCell>
                                                    <Typography fontWeight={700} sx={{ fontFamily: "monospace", color: "#0088D6", bgcolor: "rgba(0, 136, 214, 0.08)", px: 1, py: 0.35, borderRadius: 1.5, display: "inline-block" }}>
                                                        {b.bookingCode}
                                                    </Typography>
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
                                                    <Typography fontWeight={800} color="#10B981">
                                                        {formatCurrency(b.price != null ? b.price : (b.totalAmount != null ? b.totalAmount : 0))}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={b.status === "COMPLETED" ? "Đã khám" : b.status === "CONFIRMED" ? "Đã xác nhận" : "Chờ thanh toán"}
                                                        color={b.status === "COMPLETED" ? "success" : "primary"}
                                                        size="small"
                                                        sx={{ fontWeight: 700, borderRadius: 1.5 }}
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
                                                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", bgcolor: "#0088D6", "&:hover": { bgcolor: "#0077BE" } }}
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
                                        ))}
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
