import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    Box,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    RadioGroup,
    FormControlLabel,
    Radio,
    Tabs,
    Tab
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import PaymentQRModal from "../../components/payment/PaymentQRModal";

export default function PaymentPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [amount, setAmount] = useState(200000);
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [depositChannel, setDepositChannel] = useState("VIETQR"); // 'VIETQR', 'MOMO', 'VNPAY'
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [openQRModal, setOpenQRModal] = useState(false);

    const queryParams = new URLSearchParams(location.search);
    const responseCode = queryParams.get("vnp_ResponseCode");
    const txnRef = queryParams.get("vnp_TxnRef");

    useEffect(() => {
        loadWalletData();
    }, []);

    const loadWalletData = async () => {
        setLoadingHistory(true);
        try {
            const meRes = await axiosInstance.get("/api/auth/me").catch(() => null);
            const user = meRes?.data?.data || meRes?.data || meRes;
            if (user?.balance !== undefined) {
                setBalance(Number(user.balance));
            }

            const txRes = await axiosInstance.get("/api/payment/history");
            const list = (txRes?.data?.data || txRes?.data || (Array.isArray(txRes) ? txRes : []));
            setTransactions(Array.isArray(list) ? list : []);

            if (Array.isArray(list) && list.length > 0 && user?.balance === undefined) {
                const totalDeposit = list.filter(t => t.status === "SUCCESS" && t.transactionType === "DEPOSIT_WALLET").reduce((s, t) => s + Number(t.amount || 0), 0);
                const totalSpent = list.filter(t => t.status === "SUCCESS" && t.transactionType !== "DEPOSIT_WALLET").reduce((s, t) => s + Number(t.amount || 0), 0);
                setBalance(Math.max(0, totalDeposit - totalSpent));
            }
        } catch (err) {
            console.error("Lỗi tải dữ liệu ví:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDeposit = async () => {
        if (amount < 10000) {
            alert("Số tiền nạp tối thiểu là 10.000 VNĐ");
            return;
        }

        setLoading(true);
        try {
            if (depositChannel === "VIETQR") {
                const res = await axiosInstance.post(`/api/payment/vietqr/create?amount=${amount}&type=DEPOSIT_WALLET`);
                const data = res?.data?.data || res?.data || res;
                setPaymentModalData(data);
                setOpenQRModal(true);
            } else if (depositChannel === "MOMO") {
                const res = await axiosInstance.post(`/api/payment/momo/create?amount=${amount}&type=DEPOSIT_WALLET`);
                const data = res?.data?.data || res?.data || res;
                setPaymentModalData(data);
                setOpenQRModal(true);
            } else if (depositChannel === "VNPAY") {
                const res = await axiosInstance.post(`/api/payment/vnpay/create-url?amount=${amount}&type=DEPOSIT_WALLET`);
                const paymentUrl = typeof res === "string" ? res : (res?.data?.data || res?.data || res?.paymentUrl || "");
                if (paymentUrl) {
                    window.location.href = paymentUrl;
                } else {
                    alert("Không thể khởi tạo cổng thanh toán VNPay");
                }
            }
        } catch (err) {
            alert(err.message || "Lỗi khởi tạo thanh toán nạp tiền!");
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = (tx) => {
        setOpenQRModal(false);
        loadWalletData();
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            {/* Modal Quét mã VietQR / MoMo */}
            <PaymentQRModal
                open={openQRModal}
                onClose={() => { setOpenQRModal(false); loadWalletData(); }}
                paymentData={paymentModalData}
                onSuccess={handlePaymentSuccess}
            />

            {/* VNPay Callback Notification */}
            {responseCode && (
                <Box mb={3}>
                    {responseCode === "00" ? (
                        <Alert
                            severity="success"
                            icon={<CheckCircleIcon fontSize="medium" />}
                            sx={{ borderRadius: 2 }}
                            action={
                                <Button color="inherit" size="small" onClick={() => navigate("/payment", { replace: true })}>
                                    Đóng
                                </Button>
                            }
                        >
                            <Typography variant="body2" fontWeight="bold">
                                Nạp tiền VNPay thành công! Số dư đã được cập nhật (Mã GD: {txnRef}).
                            </Typography>
                        </Alert>
                    ) : (
                        <Alert
                            severity="error"
                            icon={<ErrorIcon fontSize="medium" />}
                            sx={{ borderRadius: 2 }}
                            action={
                                <Button color="inherit" size="small" onClick={() => navigate("/payment", { replace: true })}>
                                    Đóng
                                </Button>
                            }
                        >
                            <Typography variant="body2" fontWeight="bold">
                                Giao dịch VNPay không thành công hoặc đã bị hủy (Mã: {responseCode}).
                            </Typography>
                        </Alert>
                    )}
                </Box>
            )}

            {/* Header */}
            <Box mb={3}>
                <Typography variant="h5" fontWeight="bold" color="#0f172a">
                    💳 Ví Viện Phí & Nạp Tiền Đa Kênh
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Hỗ trợ chuyển khoản VietQR Napas 247, Ví MoMo, VNPay-QR và Tiền mặt tại quầy
                </Typography>
            </Box>

            <Grid container spacing={2.5} mb={4}>
                {/* Balance Card */}
                <Grid item xs={12} sm={5}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            bgcolor: "#0f172a",
                            color: "white",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between"
                        }}
                    >
                        <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <AccountBalanceWalletIcon sx={{ color: "#38bdf8", fontSize: 28 }} />
                                <Chip label="Sẵn sàng" size="small" color="success" sx={{ height: 20, fontSize: "0.7rem", fontWeight: "600" }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                SỐ DƯ HIỆN TẠI:
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" sx={{ color: "#38bdf8", my: 0.5 }}>
                                {formatCurrency(balance)}
                            </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                            Dùng để thanh toán lịch khám, tiền thuốc và xét nghiệm trực tiếp 0 giây.
                        </Typography>
                    </Paper>
                </Grid>

                {/* Top-up Box */}
                <Grid item xs={12} sm={7}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="#0f172a" mb={1.5}>
                            Chọn kênh nạp tiền vào ví:
                        </Typography>

                        {/* Channel selector tabs */}
                        <Grid container spacing={1} mb={2}>
                            <Grid item xs={4}>
                                <Button
                                    fullWidth
                                    size="small"
                                    variant={depositChannel === "VIETQR" ? "contained" : "outlined"}
                                    startIcon={<AccountBalanceIcon />}
                                    onClick={() => setDepositChannel("VIETQR")}
                                    sx={{
                                        py: 0.8,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: "700",
                                        fontSize: "0.78rem",
                                        bgcolor: depositChannel === "VIETQR" ? "#0284c7" : "transparent"
                                    }}
                                >
                                    VietQR (0%)
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button
                                    fullWidth
                                    size="small"
                                    variant={depositChannel === "MOMO" ? "contained" : "outlined"}
                                    startIcon={<PhoneAndroidIcon />}
                                    onClick={() => setDepositChannel("MOMO")}
                                    sx={{
                                        py: 0.8,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: "700",
                                        fontSize: "0.78rem",
                                        bgcolor: depositChannel === "MOMO" ? "#A50064" : "transparent",
                                        borderColor: "#A50064",
                                        color: depositChannel === "MOMO" ? "#fff" : "#A50064",
                                        "&:hover": { bgcolor: "#80004d", color: "#fff" }
                                    }}
                                >
                                    Ví MoMo
                                </Button>
                            </Grid>
                            <Grid item xs={4}>
                                <Button
                                    fullWidth
                                    size="small"
                                    variant={depositChannel === "VNPAY" ? "contained" : "outlined"}
                                    startIcon={<CreditCardIcon />}
                                    onClick={() => setDepositChannel("VNPAY")}
                                    sx={{
                                        py: 0.8,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: "700",
                                        fontSize: "0.78rem",
                                        bgcolor: depositChannel === "VNPAY" ? "#dc2626" : "transparent",
                                        borderColor: "#dc2626",
                                        color: depositChannel === "VNPAY" ? "#fff" : "#dc2626",
                                        "&:hover": { bgcolor: "#b91c1c", color: "#fff" }
                                    }}
                                >
                                    VNPay-QR
                                </Button>
                            </Grid>
                        </Grid>

                        {/* Fast Amount Selectors */}
                        <Grid container spacing={1} mb={2}>
                            {[100000, 200000, 500000, 1000000].map((val) => (
                                <Grid item xs={6} sm={3} key={val}>
                                    <Button
                                        fullWidth
                                        size="small"
                                        variant={amount === val ? "contained" : "outlined"}
                                        onClick={() => setAmount(val)}
                                        sx={{
                                            py: 0.6,
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: "600",
                                            fontSize: "0.78rem",
                                            bgcolor: amount === val ? "#334155" : "transparent",
                                            borderColor: "#cbd5e1"
                                        }}
                                    >
                                        {val >= 1000000 ? `${val / 1000000} Triệu` : `${val / 1000}k`}
                                    </Button>
                                </Grid>
                            ))}
                        </Grid>

                        <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Số tiền nạp (VNĐ)"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            sx={{ mb: 2 }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            size="medium"
                            startIcon={<QrCodeScannerIcon />}
                            disabled={loading}
                            onClick={handleDeposit}
                            sx={{
                                py: 1.1,
                                borderRadius: 2,
                                fontWeight: "bold",
                                textTransform: "none",
                                bgcolor: depositChannel === "MOMO" ? "#A50064" : depositChannel === "VNPAY" ? "#dc2626" : "#0284c7",
                                "&:hover": {
                                    bgcolor: depositChannel === "MOMO" ? "#80004d" : depositChannel === "VNPAY" ? "#b91c1c" : "#0369a1"
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : depositChannel === "VIETQR" ? (
                                "Tạo mã VietQR Chuyển Khoản"
                            ) : depositChannel === "MOMO" ? (
                                "Mở Thanh Toán MoMo"
                            ) : (
                                "Nạp tiền qua VNPAY-QR"
                            )}
                        </Button>
                    </Paper>
                </Grid>
            </Grid>

            {/* History Table */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <HistoryIcon fontSize="small" color="action" />
                        <Typography variant="subtitle1" fontWeight="bold" color="#0f172a">
                            Lịch Sử Giao Dịch ({transactions.length})
                        </Typography>
                    </Box>
                    <IconButton onClick={loadWalletData} size="small">
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </Box>

                {loadingHistory ? (
                    <Box textAlign="center" py={3}>
                        <CircularProgress size={24} />
                    </Box>
                ) : transactions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                        Chưa có biến động số dư nào.
                    </Typography>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                <TableRow>
                                    <TableCell><b>Mã GD</b></TableCell>
                                    <TableCell><b>Loại giao dịch</b></TableCell>
                                    <TableCell><b>Phương thức</b></TableCell>
                                    <TableCell><b>Thời gian</b></TableCell>
                                    <TableCell align="right"><b>Số tiền</b></TableCell>
                                    <TableCell align="center"><b>Trạng thái</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactions.map((t, idx) => {
                                    const isDeposit = t.transactionType === "DEPOSIT_WALLET";
                                    const isSuccess = t.status === "SUCCESS";
                                    const methodLabel = t.paymentMethod === "VIETQR"
                                        ? "VietQR Napas 247"
                                        : t.paymentMethod === "MOMO"
                                        ? "Ví MoMo"
                                        : t.paymentMethod === "VNPAY"
                                        ? "VNPay-QR"
                                        : t.paymentMethod === "INTERNAL_WALLET"
                                        ? "Ví nội bộ"
                                        : "Tiền mặt quầy";

                                    return (
                                        <TableRow key={t.transactionId || idx} hover>
                                            <TableCell>
                                                <code>{t.vnpayTxnRef || `GD-${idx + 1}`}</code>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="600">
                                                    {isDeposit ? "Nạp tiền ví" : "Thanh toán viện phí"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={methodLabel}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: "0.7rem", height: 22 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {t.createdAt ? formatDateTime(t.createdAt) : "Vừa xong"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography
                                                    variant="body2"
                                                    fontWeight="bold"
                                                    color={isSuccess ? (isDeposit ? "success.main" : "primary.main") : "error.main"}
                                                >
                                                    {isDeposit ? "+" : "-"}{formatCurrency(t.amount)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={isSuccess ? "Thành công" : "Thất bại"}
                                                    color={isSuccess ? "success" : "error"}
                                                    size="small"
                                                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: "600" }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Container>
    );
}
