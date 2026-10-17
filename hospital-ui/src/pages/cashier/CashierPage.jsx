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
import AssessmentIcon from "@mui/icons-material/Assessment";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import MedicationIcon from "@mui/icons-material/Medication";
import { QRCodeCanvas } from "qrcode.react";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { printReceipt, printShiftReconciliation } from "../../utils/printHelper";

export default function CashierPage() {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [pendingBills, setPendingBills] = useState([]);
    const [paidHistory, setPaidHistory] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [activeTab, setActiveTab] = useState(0); // 0: Chờ thanh toán, 1: Lịch sử đã thu
    const [shiftFilter, setShiftFilter] = useState("ALL"); // ALL, MORNING, AFTERNOON, EVENING
    const [openReconciliationModal, setOpenReconciliationModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [pageError, setPageError] = useState("");

    // Payment Processing States
    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("CASH"); // CASH, QR, POS
    const [cashGiven, setCashGiven] = useState("");
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [qrImgError, setQrImgError] = useState(false);

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
        setQrImgError(false);
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
        b.bookingCode?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (b.identityNumber && b.identityNumber.includes(searchKeyword))
    );

    const filteredHistory = paidHistory.filter(item => {
        const matchesSearch = !searchKeyword ||
            item.patientName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            item.phoneNumber?.includes(searchKeyword) ||
            item.receiptCode?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            item.billId?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            item.bookingCode?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (item.identityNumber && item.identityNumber.includes(searchKeyword));

        if (!matchesSearch) return false;

        if (shiftFilter === "ALL") return true;
        if (!item.paidAt) return true;
        const paidHour = new Date(item.paidAt).getHours();
        if (shiftFilter === "MORNING") return paidHour >= 6 && paidHour < 12;
        if (shiftFilter === "AFTERNOON") return paidHour >= 12 && paidHour < 18;
        if (shiftFilter === "EVENING") return paidHour >= 18 || paidHour < 6;
        return true;
    });

    const shiftReconData = React.useMemo(() => {
        const cashItems = filteredHistory.filter(p => p.paymentMethod === "CASH" || p.paymentMethod === "COUNTER_CASH");
        const qrItems = filteredHistory.filter(p => p.paymentMethod === "VIETQR" || p.paymentMethod === "QR");
        const posItems = filteredHistory.filter(p => p.paymentMethod === "POS");

        const cashSum = cashItems.reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);
        const qrSum = qrItems.reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);
        const posSum = posItems.reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);

        return {
            totalCollected: cashSum + qrSum + posSum,
            cashTotal: cashSum,
            cashCount: cashItems.length,
            digitalTotal: qrSum,
            digitalCount: qrItems.length,
            posTotal: posSum,
            posCount: posItems.length,
            transactionCount: filteredHistory.length,
            transactions: filteredHistory
        };
    }, [filteredHistory]);

    const handlePrintShiftRecon = () => {
        printShiftReconciliation({
            ...shiftReconData,
            cashierName: "Thu ngân quầy",
            shiftName: shiftFilter === "MORNING" ? "Ca Sáng (06:00 - 12:00)" :
                       shiftFilter === "AFTERNOON" ? "Ca Chiều (12:00 - 18:00)" :
                       shiftFilter === "EVENING" ? "Ca Tối (18:00 - 23:59)" : "Toàn bộ ca làm việc"
        });
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === "Enter") {
            if (activeTab === 0 && filteredPending.length === 1) {
                handleOpenPayment(filteredPending[0]);
            }
        }
    };

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
                <Box display="flex" gap={1.5} alignItems="center">
                    <Button
                        variant="contained"
                        size="small"
                        sx={{ bgcolor: "#F59E0B", color: "white", fontWeight: "bold", whiteSpace: "nowrap", "&:hover": { bgcolor: "#D97706" } }}
                        startIcon={<AssessmentIcon />}
                        onClick={() => setOpenReconciliationModal(true)}
                    >
                        Đối Soát Ca Trực
                    </Button>
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
                    placeholder="Quét mã vạch hoặc tìm BN, SĐT, Mã phiếu..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    sx={{ width: 380 }}
                    helperText={activeTab === 0 && filteredPending.length === 1 ? "💡 Nhấn [Enter] để mở ngay phiếu thu" : ""}
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

                    {/* Thanh lọc theo ca trực & In biên bản đối soát ca */}
                    <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body2" fontWeight="bold" color="text.secondary">
                                Lọc theo ca trực:
                            </Typography>
                            <Chip
                                label={`Tất cả (${paidHistory.length})`}
                                clickable
                                color={shiftFilter === "ALL" ? "primary" : "default"}
                                variant={shiftFilter === "ALL" ? "filled" : "outlined"}
                                onClick={() => setShiftFilter("ALL")}
                                sx={{ fontWeight: "bold" }}
                            />
                            <Chip
                                label="🌅 Ca Sáng (06:00 - 12:00)"
                                clickable
                                color={shiftFilter === "MORNING" ? "primary" : "default"}
                                variant={shiftFilter === "MORNING" ? "filled" : "outlined"}
                                onClick={() => setShiftFilter("MORNING")}
                                sx={{ fontWeight: "bold" }}
                            />
                            <Chip
                                label="☀️ Ca Chiều (12:00 - 18:00)"
                                clickable
                                color={shiftFilter === "AFTERNOON" ? "primary" : "default"}
                                variant={shiftFilter === "AFTERNOON" ? "filled" : "outlined"}
                                onClick={() => setShiftFilter("AFTERNOON")}
                                sx={{ fontWeight: "bold" }}
                            />
                            <Chip
                                label="🌙 Ca Tối (18:00 - 06:00)"
                                clickable
                                color={shiftFilter === "EVENING" ? "primary" : "default"}
                                variant={shiftFilter === "EVENING" ? "filled" : "outlined"}
                                onClick={() => setShiftFilter("EVENING")}
                                sx={{ fontWeight: "bold" }}
                            />
                        </Box>
                        <Button
                            variant="contained"
                            color="warning"
                            size="small"
                            startIcon={<AssessmentIcon />}
                            onClick={() => setOpenReconciliationModal(true)}
                            sx={{ fontWeight: "bold", borderRadius: 2 }}
                        >
                            Xem & In Biên Bản Kết Ca
                        </Button>
                    </Paper>

                    {loading ? (
                        <Box textAlign="center" py={6}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : filteredHistory.length === 0 ? (
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
                                        Không tìm thấy biên lai nào phù hợp với bộ lọc ca trực hoặc từ khóa tìm kiếm.
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
                                    {filteredHistory.map((item, idx) => (
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
                                                        item.paymentMethod === "CASH" || item.paymentMethod === "COUNTER_CASH"
                                                            ? "💵 Tiền mặt"
                                                            : item.paymentMethod === "POS"
                                                            ? "💳 Quẹt thẻ POS"
                                                            : "📱 Cổng PayOS"
                                                    }
                                                    size="small"
                                                    color={
                                                        item.paymentMethod === "CASH" || item.paymentMethod === "COUNTER_CASH"
                                                            ? "default"
                                                            : item.paymentMethod === "POS"
                                                            ? "secondary"
                                                            : "primary"
                                                    }
                                                    sx={{ fontWeight: "bold" }}
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
                                <Typography variant="body2">
                                    Hình thức: <b>{
                                        receiptData.paymentMethod === "CASH" || receiptData.paymentMethod === "COUNTER_CASH"
                                            ? "Tiền mặt tại quầy"
                                            : receiptData.paymentMethod === "POS"
                                            ? "Quẹt thẻ POS"
                                            : "Cổng PayOS (VietQR)"
                                    }</b>
                                </Typography>
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

                            {Boolean(
                                selectedBill?.items?.some(i => i.type === 'MEDICINE' || i.itemType === 'MEDICINE') ||
                                selectedBill?.billType === 'MEDICINE' ||
                                selectedBill?.prescriptionCode ||
                                receiptData?.hasMedicine
                            ) && (
                                <Alert severity="info" icon={<MedicationIcon />} sx={{ mb: 2, textAlign: "left", borderRadius: 2 }}>
                                    <b>Khoản viện phí có đơn thuốc:</b> Hướng dẫn người bệnh mang biên lai thu tiền này qua <b>Quầy Dược Ngoại Trú (Tầng 1)</b> để nhận thuốc theo chuẩn FEFO.
                                </Alert>
                            )}

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
                                            <FormControlLabel value="POS" control={<Radio />} label="💳 Quẹt thẻ POS" />
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

                                    {paymentMethod === "POS" && (
                                        <Box p={2.5} bgcolor="#F8FAFC" borderRadius={3} mt={2} border="1.5px dashed #64748B" textAlign="center">
                                            <CreditCardIcon sx={{ fontSize: 44, color: "#475569", mb: 1 }} />
                                            <Typography variant="subtitle1" fontWeight="bold" color="#1E293B">
                                                Thanh toán qua Thiết bị quẹt thẻ POS
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" mb={1.5}>
                                                Yêu cầu bệnh nhân cắm hoặc chạm thẻ ATM / Visa / Mastercard vào đầu đọc POS
                                            </Typography>
                                            <Box display="inline-block" p={1.5} bgcolor="#F1F5F9" borderRadius={2} border="1px solid #CBD5E1">
                                                <Typography variant="caption" color="text.secondary" display="block">Số tiền quẹt thẻ:</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="primary.main">
                                                    {formatCurrency(selectedBill.totalAmount)}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                                                Sau khi máy POS in hóa đơn cà thẻ thành công, bấm nút <b>"Xác Nhận & Xuất Biên Lai"</b> bên dưới.
                                            </Typography>
                                        </Box>
                                    )}

                                    {paymentMethod === "QR" && (
                                        <Box textAlign="center" p={2.5} bgcolor="#F0FDFA" borderRadius={3} mt={2} border="1.5px dashed #0D9488">
                                            <Box display="flex" justifyContent="center" alignItems="center" gap={1} mb={1.5}>
                                                <Chip label="Napas 247" size="small" color="primary" sx={{ fontWeight: "bold" }} />
                                                <Chip label="VietQR 0% Phí" size="small" color="success" sx={{ fontWeight: "bold" }} />
                                            </Box>
                                            {qrImgError ? (
                                                <Box sx={{ p: 2, bgcolor: "white", display: "inline-block", borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                                                    <QRCodeCanvas
                                                        value={`https://pay.hospital.vn/bill/${selectedBill.billId}?amount=${selectedBill.totalAmount}&desc=VP${selectedBill.billId}`}
                                                        size={200}
                                                        level="H"
                                                    />
                                                </Box>
                                            ) : (
                                                <Box
                                                    component="img"
                                                    src={`https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${selectedBill.totalAmount}&addInfo=VP ${selectedBill.billId}&accountName=BENH VIEN DA KHOA QUOC TE TNT`}
                                                    alt="VietQR Thu Ngân"
                                                    onError={() => setQrImgError(true)}
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
                                            )}
                                            <Typography variant="subtitle2" fontWeight="bold" color="#0F766E" mt={1.5}>
                                                Quét mã VietQR bằng bất kỳ App Ngân Hàng hoặc Ví điện tử nào
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Nội dung chuyển khoản tự động: <b>VP {selectedBill.billId}</b>
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                STK MBBank: <b>0987 654 321</b> - BENH VIEN DA KHOA QUOC TE TNT (VietQR)
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

            {/* MODAL ĐỐI SOÁT & BÀN GIAO CA TRỰC */}
            <Dialog
                open={openReconciliationModal}
                onClose={() => setOpenReconciliationModal(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: "bold", bgcolor: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 1 }}>
                    <AssessmentIcon color="primary" /> Bảng Đối Soát & Bàn Giao Ca Trực Thu Ngân
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    <Box mb={2.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Phạm vi ca đối soát: <b>{
                                shiftFilter === "MORNING" ? "Ca Sáng (06:00 - 12:00)" :
                                shiftFilter === "AFTERNOON" ? "Ca Chiều (12:00 - 18:00)" :
                                shiftFilter === "EVENING" ? "Ca Tối (18:00 - 23:59)" : "Toàn bộ ca làm việc trong ngày"
                            }</b>
                        </Typography>
                    </Box>

                    <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#F0F9FF", borderColor: "#BAE6FD" }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">TỔNG THU CA TRỰC</Typography>
                                <Typography variant="h6" fontWeight="bold" color="#0369A1" mt={0.5}>
                                    {formatCurrency(shiftReconData.totalCollected)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{shiftReconData.transactionCount} lượt thu</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#F0FDF4", borderColor: "#BBF7D0" }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">TIỀN MẶT (TẠI KÉT)</Typography>
                                <Typography variant="h6" fontWeight="bold" color="#15803D" mt={0.5}>
                                    {formatCurrency(shiftReconData.cashTotal)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{shiftReconData.cashCount} lượt tiền mặt</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#FAF5FF", borderColor: "#E9D5FF" }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">CỔNG VIETQR / PAYOS</Typography>
                                <Typography variant="h6" fontWeight="bold" color="#7E22CE" mt={0.5}>
                                    {formatCurrency(shiftReconData.digitalTotal)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{shiftReconData.digitalCount} lượt chuyển khoản</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "#FFF7ED", borderColor: "#FED7AA" }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">QUẸT THẺ POS</Typography>
                                <Typography variant="h6" fontWeight="bold" color="#C2410C" mt={0.5}>
                                    {formatCurrency(shiftReconData.posTotal)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">{shiftReconData.posCount} lượt quẹt thẻ</Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                        Danh sách các biên lai thu tiền ({shiftReconData.transactions.length}):
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320, borderRadius: 2 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell><b>Mã biên lai</b></TableCell>
                                    <TableCell><b>Bệnh nhân</b></TableCell>
                                    <TableCell><b>Phương thức</b></TableCell>
                                    <TableCell align="right"><b>Số tiền</b></TableCell>
                                    <TableCell><b>Thời gian</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {shiftReconData.transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                            Không có biên lai thu tiền nào trong ca trực này.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    shiftReconData.transactions.map((t, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell sx={{ fontWeight: "bold", color: "primary.main" }}>{t.receiptCode || t.billId}</TableCell>
                                            <TableCell>{t.patientName}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={
                                                        t.paymentMethod === "CASH" || t.paymentMethod === "COUNTER_CASH"
                                                            ? "Tiền mặt"
                                                            : t.paymentMethod === "POS"
                                                            ? "Quẹt thẻ POS"
                                                            : "VietQR (PayOS)"
                                                    }
                                                    size="small"
                                                    color={
                                                        t.paymentMethod === "CASH" || t.paymentMethod === "COUNTER_CASH"
                                                            ? "default"
                                                            : t.paymentMethod === "POS"
                                                            ? "secondary"
                                                            : "primary"
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: "bold", color: "success.main" }}>
                                                {formatCurrency(t.totalAmount)}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                                                {formatDateTime(t.paidAt)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
                    <Button onClick={() => setOpenReconciliationModal(false)}>
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={<PrintIcon />}
                        onClick={handlePrintShiftRecon}
                        sx={{ fontWeight: "bold" }}
                    >
                        In Biên Bản Bàn Giao Ca (A4)
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
