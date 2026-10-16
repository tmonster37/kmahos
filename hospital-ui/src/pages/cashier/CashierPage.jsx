import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    TextField,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    IconButton,
    Alert,
    Avatar,
    Tooltip,
    Tabs,
    Tab,
    Stack,
    InputAdornment,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    CircularProgress
} from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import SearchIcon from "@mui/icons-material/Search";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RefreshIcon from "@mui/icons-material/Refresh";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { printReceipt } from "../../utils/printHelper";

export default function CashierPage() {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [pendingBills, setPendingBills] = useState([]);
    const [paidHistory, setPaidHistory] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [activeTab, setActiveTab] = useState(0); // 0: Chờ thanh toán, 1: Lịch sử đã thu
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [pageError, setPageError] = useState("");

    // Payment Processing States
    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("CASH"); // CASH, QR (PayOS)
    const [cashGiven, setCashGiven] = useState("");
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [receiptData, setReceiptData] = useState(null);

    // Stats
    const [shiftStats, setShiftStats] = useState({
        totalCollected: 0,
        cashTotal: 0,
        digitalTotal: 0,
        transactionCount: 0,
        hasError: false
    });

    const [historyError, setHistoryError] = useState("");
    const [pendingError, setPendingError] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setPageError("");
        setHistoryError("");
        setPendingError("");

        // 1. Tải danh sách chờ thu tiền
        try {
            const pendingRes = await axiosInstance.get("/api/cashier/pending-bills");
            const bills = pendingRes.data?.data || pendingRes.data || [];
            setPendingBills(Array.isArray(bills) ? bills : []);
        } catch (err) {
            console.error("Lỗi tải danh sách chờ thu tiền:", err);
            const msg = err.message || err.response?.data?.message || "Không thể kết nối máy chủ để tải danh sách viện phí chờ thu.";
            setPendingError(msg);
            // Giữ nguyên pendingBills hiện có, không xóa rỗng khi refresh lỗi
        }

        // 2. Tải lịch sử giao dịch thu ngân
        try {
            const historyRes = await axiosInstance.get("/api/cashier/history");
            const history = historyRes.data?.data || historyRes.data || [];
            const formattedHistory = Array.isArray(history) ? history : [];
            setPaidHistory(formattedHistory);

            // Cập nhật thống kê ca trực khi lịch sử tải thành công
            const total = formattedHistory.reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);
            const cash = formattedHistory
                .filter(p => p.paymentMethod === "CASH" || p.paymentMethod === "COUNTER_CASH")
                .reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);

            setShiftStats({
                totalCollected: total,
                cashTotal: cash,
                digitalTotal: total - cash,
                transactionCount: formattedHistory.length,
                hasError: false
            });
        } catch (err) {
            console.error("Lỗi tải lịch sử giao dịch:", err);
            const msg = err.message || err.response?.data?.message || "Không thể tải lịch sử giao dịch từ máy chủ.";
            setHistoryError(msg);
            // Giữ nguyên paidHistory hiện có, đánh dấu hasError để không hiển thị số liệu 0 VNĐ gây hiểu nhầm
            setShiftStats(prev => ({
                ...prev,
                hasError: true
            }));
        } finally {
            setLoading(false);
        }
    };

    const handleRetryHistory = async () => {
        setHistoryError("");
        try {
            const historyRes = await axiosInstance.get("/api/cashier/history");
            const history = historyRes.data?.data || historyRes.data || [];
            const formattedHistory = Array.isArray(history) ? history : [];
            setPaidHistory(formattedHistory);

            const total = formattedHistory.reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);
            const cash = formattedHistory
                .filter(p => p.paymentMethod === "CASH" || p.paymentMethod === "COUNTER_CASH")
                .reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);

            setShiftStats({
                totalCollected: total,
                cashTotal: cash,
                digitalTotal: total - cash,
                transactionCount: formattedHistory.length,
                hasError: false
            });
        } catch (err) {
            const msg = err.message || err.response?.data?.message || "Tải lại lịch sử thất bại.";
            setHistoryError(msg);
        }
    };

    const handleOpenPayment = (bill) => {
        setSelectedBill(bill);
        setPaymentMethod("CASH");
        setCashGiven(String(bill.totalAmount || 0));
        setPaymentSuccess(false);
        setReceiptData(null);
        setErrorMessage("");
        setOpenPaymentModal(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedBill) return;

        setSubmitting(true);
        setErrorMessage("");

        try {
            const methodToSend = paymentMethod === "QR" ? "VIETQR" : paymentMethod;
            const targetBookingCode = selectedBill.billId || selectedBill.bookingCode;

            const res = await axiosInstance.post("/api/cashier/pay", {
                bookingCode: targetBookingCode,
                paymentMethod: methodToSend,
                amountGiven: paymentMethod === "CASH" ? Number(cashGiven) : Number(selectedBill.totalAmount),
                notes: `Thu viện phí tại quầy cho ${targetBookingCode} qua ${methodToSend}`
            });

            const receipt = res.data?.data || res.data;
            setReceiptData(receipt);
            setPaymentSuccess(true);

            // Tải lại danh sách chờ thu và lịch sử thật từ backend để đồng bộ
            await loadData();
        } catch (err) {
            console.error("Lỗi xác nhận thu tiền viện phí:", err);
            const status = err.status || err.statusCode || err.response?.status;
            let msg = err.message || err.response?.data?.message || err.response?.data?.error;
            if (status === 409) {
                msg = `[XUNG ĐỘT - HTTP 409] ${msg || "Khoản viện phí cho ca khám này đã được ghi nhận thanh toán trước đó!"}`;
            } else if (!msg) {
                msg = "Giao dịch thất bại. Vui lòng kiểm tra lại trạng thái ca khám.";
            }
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrintReceipt = (receipt) => {
        if (!receipt) return;
        const mapped = {
            ...receipt,
            items: receipt.items && receipt.items.length > 0
                ? receipt.items.map(it => ({
                    name: it.name,
                    qty: it.quantity || it.qty || 1,
                    price: it.unitPrice || it.price || it.totalPrice || 0
                }))
                : [{ name: "Thanh toán viện phí", qty: 1, price: receipt.totalAmount || 0 }]
        };
        printReceipt(mapped);
    };

    const filteredPending = pendingBills.filter(b =>
        b.patientName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        b.phoneNumber?.includes(searchKeyword) ||
        b.billId?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        b.bookingCode?.toLowerCase().includes(searchKeyword.toLowerCase())
    );

    const cashChange = Number(cashGiven) >= (selectedBill?.totalAmount || 0)
        ? Number(cashGiven) - (selectedBill?.totalAmount || 0)
        : 0;

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Banner */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #0088D6 0%, #005A9C 100%)",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    boxShadow: "0 10px 25px -5px rgba(0, 136, 214, 0.25)"
                }}
            >
                <Box display="flex" alignItems="center" gap={1.8}>
                    <Avatar sx={{ width: 46, height: 46, bgcolor: "rgba(255,255,255,0.2)" }}>
                        <PointOfSaleIcon sx={{ fontSize: 26 }} />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontSize: "1.1rem" }}>
                            💳 Quầy Thu Ngân & Thanh Toán Viện Phí Tại Chỗ
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.825rem" }}>
                            Đồng bộ danh sách ca khám từ hệ thống điều dưỡng, viện phí cận lâm sàng, thuốc và tạm ứng nội trú
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1.5}>
                    <Button
                        variant="contained"
                        size="small"
                        sx={{ bgcolor: "white", color: "#0088D6", fontWeight: "bold", whiteSpace: "nowrap", "&:hover": { bgcolor: "#F0F9FF" } }}
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
                        disabled={loading}
                    >
                        {loading ? "Đang tải..." : "Làm Mới"}
                    </Button>
                </Box>
            </Paper>

            {pageError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {pageError}
                </Alert>
            )}

            {pendingError && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    {pendingError}
                </Alert>
            )}

            {/* Thẻ Thống Kê Ca Trực Thu Ngân */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", borderLeft: "5px solid #0088D6", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ whiteSpace: "nowrap", display: "block" }}>TỔNG THU TRONG CA</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#0088D6" mt={0.5} sx={{ whiteSpace: "nowrap", fontSize: "1.2rem" }}>
                            {shiftStats.hasError ? "-- (Chưa xác định)" : formatCurrency(shiftStats.totalCollected)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", borderLeft: "5px solid #16A34A", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ whiteSpace: "nowrap", display: "block" }}>TIỀN MẶT TẠI KÉT</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#16A34A" mt={0.5} sx={{ whiteSpace: "nowrap", fontSize: "1.2rem" }}>
                            {shiftStats.hasError ? "-- (Chưa xác định)" : formatCurrency(shiftStats.cashTotal)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", borderLeft: "5px solid #0284C7", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ whiteSpace: "nowrap", display: "block" }}>QUẸT THẺ POS & VIETQR</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#0284C7" mt={0.5} sx={{ whiteSpace: "nowrap", fontSize: "1.2rem" }}>
                            {shiftStats.hasError ? "-- (Chưa xác định)" : formatCurrency(shiftStats.digitalTotal)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", borderLeft: "5px solid #EA580C", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ whiteSpace: "nowrap", display: "block" }}>SỐ LƯỢT GIAO DỊCH</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#EA580C" mt={0.5} sx={{ whiteSpace: "nowrap", fontSize: "1.2rem" }}>
                            {shiftStats.hasError ? "--" : `${shiftStats.transactionCount} lượt`}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Thanh Tìm Kiếm & Tabs */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                    <Tab label={`⏳ Chờ Thu Tiền (${pendingBills.length})`} icon={<ReceiptLongIcon />} iconPosition="start" sx={{ fontWeight: "bold" }} />
                    <Tab label={`✅ Lịch Sử Đã Thu (${paidHistory.length})`} icon={<CheckCircleIcon />} iconPosition="start" sx={{ fontWeight: "bold" }} />
                </Tabs>

                <TextField
                    size="small"
                    placeholder="Tìm theo Tên BN, SĐT hoặc Mã phiếu..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    sx={{ width: 320 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* TAB 0: DANH SÁCH VIỆN PHÍ CHỜ THU TIỀN */}
            {activeTab === 0 && (
                <Grid container spacing={3}>
                    {loading ? (
                        <Grid item xs={12} textAlign="center" py={6}>
                            <CircularProgress size={32} />
                        </Grid>
                    ) : filteredPending.length === 0 ? (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
                                <CheckCircleIcon sx={{ fontSize: 48, color: "success.main", mb: 1 }} />
                                <Typography variant="h6" color="text.secondary">
                                    Không có phiếu viện phí nào đang chờ thu tiền!
                                </Typography>
                            </Paper>
                        </Grid>
                    ) : (
                        filteredPending.map((bill) => (
                            <Grid item xs={12} md={6} lg={4} key={bill.billId}>
                                <Card
                                    elevation={2}
                                    sx={{
                                        borderRadius: 3,
                                        borderTop: "5px solid #0D9488",
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="subtitle2" fontWeight="bold" color="primary">
                                                {bill.billId}
                                            </Typography>
                                            <Chip
                                                label={
                                                    bill.billId?.endsWith("-EXAM") ? "HĐ 01: Công khám ban đầu" :
                                                    bill.billId?.endsWith("-TREATMENT") ? "HĐ 02: CLS & Thuốc phát sinh" :
                                                    bill.billType === "ALL" ? "Khám, CLS & Thuốc" :
                                                    bill.billType === "EXAM_AND_TESTS" ? "Khám & Xét nghiệm" :
                                                    bill.billType === "PRESCRIPTION" ? "Đơn thuốc phát sinh" :
                                                    bill.billType === "TEST" ? "Xét nghiệm & CĐHA" : "Công khám"
                                                }
                                                size="small"
                                                color={
                                                    bill.billId?.endsWith("-EXAM") ? "primary" :
                                                    bill.billId?.endsWith("-TREATMENT") ? "secondary" :
                                                    bill.billType === "ALL" ? "success" :
                                                    bill.billType === "EXAM_AND_TESTS" ? "info" :
                                                    bill.billType === "PRESCRIPTION" ? "warning" : "primary"
                                                }
                                                sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                                            />
                                        </Box>

                                        <Typography variant="h6" fontWeight="bold" color="#0F766E">
                                            {bill.patientName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            SĐT: <b>{bill.phoneNumber}</b> - CCCD: {bill.identityNumber}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                                            Phòng/Khoa: {bill.departmentName} ({bill.doctorName})
                                        </Typography>

                                        <Divider sx={{ my: 1.5 }} />

                                        {/* Chi tiết khoản thu */}
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
                                            CÁC MỤC VIỆN PHÍ ({bill.items?.length || 0}):
                                        </Typography>
                                        <Stack spacing={0.8} mb={2}>
                                            {bill.items?.map((it, idx) => (
                                                <Box key={idx} display="flex" justifyContent="space-between">
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                                                        • {it.name}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {formatCurrency(it.totalPrice || (it.price * (it.qty || it.quantity || 1)) || it.unitPrice || 0)}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Stack>

                                        <Box
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            p={1.5}
                                            sx={{ bgcolor: "#F0FDFA", borderRadius: 2, border: "1px solid #CCFBF1" }}
                                        >
                                            <Typography variant="subtitle2" fontWeight="bold" color="#0F766E">
                                                Tổng thanh toán:
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold" color="#0F766E">
                                                {formatCurrency(bill.totalAmount)}
                                            </Typography>
                                        </Box>
                                    </CardContent>

                                    <Box p={2} pt={0}>
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            color="primary"
                                            startIcon={<PointOfSaleIcon />}
                                            onClick={() => handleOpenPayment(bill)}
                                            sx={{ borderRadius: 2.5, py: 1.2, fontWeight: "bold", bgcolor: "#0D9488", "&:hover": { bgcolor: "#0F766E" } }}
                                        >
                                            Thu Viện Phí & In Biên Lai
                                        </Button>
                                    </Box>
                                </Card>
                            </Grid>
                        ))
                    )}
                </Grid>
            )}

            {/* TAB 1: LỊCH SỬ CÁC BIÊN LAI ĐÃ THU TIỀN */}
            {activeTab === 1 && (
                <Box>
                    {historyError && (
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={handleRetryHistory} startIcon={<RefreshIcon />}>
                                    Thử Lại
                                </Button>
                            }
                            sx={{ mb: 2.5, borderRadius: 2 }}
                        >
                            {historyError}
                        </Alert>
                    )}

                    {loading ? (
                        <Box textAlign="center" py={6}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : paidHistory.length === 0 ? (
                        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
                            {historyError ? (
                                <Box>
                                    <Alert severity="error" sx={{ mb: 2, display: "inline-flex" }}>
                                        Không thể tải dữ liệu lịch sử từ máy chủ. Vui lòng bấm "Thử Lại" để kết nối lại.
                                    </Alert>
                                    <Box mt={1}>
                                        <Button variant="outlined" onClick={handleRetryHistory} startIcon={<RefreshIcon />}>
                                            Thử Lại Tải Lịch Sử
                                        </Button>
                                    </Box>
                                </Box>
                            ) : (
                                <Box>
                                    <ReceiptLongIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                                    <Typography variant="h6" color="text.secondary">
                                        Chưa có biên lai viện phí nào được thu trong ca làm việc này.
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    ) : (
                        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                            <Table>
                                <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                    <TableRow>
                                        <TableCell><b>Mã biên lai</b></TableCell>
                                        <TableCell><b>Bệnh nhân</b></TableCell>
                                        <TableCell><b>Số tiền thu</b></TableCell>
                                        <TableCell><b>Hình thức thanh toán</b></TableCell>
                                        <TableCell><b>Thời gian thu</b></TableCell>
                                        <TableCell><b>Thu ngân / Kênh thu</b></TableCell>
                                        <TableCell align="center"><b>Thao tác</b></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paidHistory.map((item, idx) => (
                                        <TableRow key={idx} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold" color="primary">
                                                    {item.receiptCode || item.billId}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold">{item.patientName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{item.phoneNumber}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body1" fontWeight="bold" color="success.main">
                                                    {formatCurrency(item.totalAmount)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={
                                                        item.paymentMethod === "CASH" ? "💵 Tiền mặt" : "📱 Cổng PayOS"
                                                    }
                                                    size="small"
                                                    color={item.paymentMethod === "CASH" ? "default" : "primary"}
                                                />
                                            </TableCell>
                                            <TableCell>{formatDateTime(item.paidAt)}</TableCell>
                                            <TableCell>{item.cashierName || "Thu ngân ca 1"}</TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<PrintIcon />}
                                                    onClick={() => handlePrintReceipt(item)}
                                                    sx={{ borderRadius: 2 }}
                                                >
                                                    In Lại
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}

            {/* MODAL THU TIỀN & IN BIÊN LAI */}
            <Dialog open={openPaymentModal} onClose={() => setOpenPaymentModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="primary.main">
                    💵 Thanh Toán Viện Phí & In Biên Lai
                </DialogTitle>
                <DialogContent dividers>
                    {paymentSuccess && receiptData ? (
                        <Box textAlign="center" py={2}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 1 }} />
                            <Typography variant="h5" fontWeight="bold" color="success.dark">
                                Thu Viện Phí Thành Công!
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Đã cập nhật trạng thái viện phí sang <b>ĐÃ THANH TOÁN (PAID)</b>
                            </Typography>

                            <Paper variant="outlined" sx={{ p: 2.5, textAlign: "left", bgcolor: "#F8FAFC", borderRadius: 2, mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight="bold" color="primary">Mã biên lai: {receiptData.receiptCode}</Typography>
                                <Typography variant="body2">Bệnh nhân: <b>{receiptData.patientName}</b> ({receiptData.phoneNumber})</Typography>
                                <Typography variant="body2">Hình thức: <b>{receiptData.paymentMethod === "CASH" ? "Tiền mặt" : "Cổng PayOS (VietQR)"}</b></Typography>
                                <Divider sx={{ my: 1 }} />
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2">Tổng số tiền đã thu:</Typography>
                                    <Typography variant="h6" fontWeight="bold" color="success.main">{formatCurrency(receiptData.totalAmount)}</Typography>
                                </Box>
                                {receiptData.paymentMethod === "CASH" && (
                                    <Box display="flex" justifyContent="space-between" mt={0.5}>
                                        <Typography variant="caption" color="text.secondary">Tiền thối lại:</Typography>
                                        <Typography variant="caption" fontWeight="bold">{formatCurrency(receiptData.cashChange)}</Typography>
                                    </Box>
                                )}
                            </Paper>

                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<PrintIcon />}
                                onClick={() => handlePrintReceipt(receiptData)}
                                sx={{ py: 1.2, px: 3, borderRadius: 2, fontWeight: "bold" }}
                            >
                                In Biên Lai Thu Tiền
                            </Button>
                        </Box>
                    ) : (
                        <Box>
                            {errorMessage && (
                                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                    {errorMessage}
                                </Alert>
                            )}
                            {selectedBill && (
                                <Box mb={2.5}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="#0F766E">
                                        {selectedBill.patientName} - SĐT: {selectedBill.phoneNumber}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Mã phiếu: <b>{selectedBill.billId}</b>
                                    </Typography>

                                    <Paper variant="outlined" sx={{ p: 2, my: 2, bgcolor: "#F8FAFC", borderRadius: 2 }}>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2">Tổng số tiền cần thu:</Typography>
                                            <Typography variant="h6" fontWeight="bold" color="error.main">
                                                {formatCurrency(selectedBill.totalAmount)}
                                            </Typography>
                                        </Box>
                                    </Paper>

                                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                                        Chọn phương thức thanh toán:
                                    </Typography>
                                    <FormControl component="fieldset" fullWidth>
                                        <RadioGroup row value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                            <FormControlLabel value="CASH" control={<Radio />} label="💵 Tiền mặt tại quầy" />
                                            <FormControlLabel value="QR" control={<Radio />} label="📱 Cổng PayOS (VietQR)" />
                                        </RadioGroup>
                                    </FormControl>

                                    {paymentMethod === "CASH" && (
                                        <Box mt={2}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="Tiền khách đưa (VNĐ)"
                                                value={cashGiven}
                                                onChange={(e) => setCashGiven(e.target.value)}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                                }}
                                            />
                                            <Box display="flex" justifyContent="space-between" mt={1.5} p={1.5} bgcolor="#FEF2F2" borderRadius={2}>
                                                <Typography variant="body2" color="text.secondary">Tiền thối lại cho khách:</Typography>
                                                <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                                    {formatCurrency(cashChange)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}

                                    {paymentMethod === "QR" && (
                                        <Box textAlign="center" p={2.5} bgcolor="#F0FDFA" borderRadius={3} mt={2} border="1.5px dashed #0D9488">
                                            <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1.5}>
                                                <Chip label="Napas 247" size="small" color="primary" sx={{ fontWeight: "bold" }} />
                                                <Chip label="VietQR 0% Phí" size="small" color="success" sx={{ fontWeight: "bold" }} />
                                            </Box>
                                            <Box
                                                component="img"
                                                src={`https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${selectedBill.totalAmount}&addInfo=VP ${selectedBill.billId}&accountName=BENH VIEN DA KHOA QUOC TE TNT`}
                                                alt="VietQR Thu Ngân"
                                                sx={{
                                                    width: 220,
                                                    height: 220,
                                                    mx: "auto",
                                                    display: "block",
                                                    borderRadius: 2,
                                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                                    bgcolor: "white",
                                                    p: 1
                                                }}
                                            />
                                            <Typography variant="subtitle2" fontWeight="bold" color="#0F766E" mt={1.5}>
                                                Quét mã VietQR bằng bất kỳ App Ngân Hàng hoặc Ví điện tử nào
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Nội dung chuyển khoản tự động: <b>VP {selectedBill.billId}</b>
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                STK MBBank: <b>0987654321</b> - Bệnh viện Đa Khoa Quốc Tế TNT
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenPaymentModal(false)}>
                        {paymentSuccess ? "Đóng" : "Hủy"}
                    </Button>
                    {!paymentSuccess && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleConfirmPayment}
                            disabled={submitting}
                            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                            sx={{ px: 3, fontWeight: "bold" }}
                        >
                            {submitting ? "Đang xử lý..." : "Xác Nhận & Xuất Biên Lai"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Container>
    );
}
