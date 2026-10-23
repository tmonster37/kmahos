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
    Divider,
    Tooltip
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import SecurityIcon from "@mui/icons-material/Security";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

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
    const [depositChannel, setDepositChannel] = useState("PAYOS"); // 'PAYOS', 'CASH'
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [openQRModal, setOpenQRModal] = useState(false);
    const [walletError, setWalletError] = useState("");

    const queryParams = new URLSearchParams(location.search);
    const payosCode = queryParams.get("code");
    const payosId = queryParams.get("id");
    const payosCancel = queryParams.get("cancel");
    const payosStatus = queryParams.get("status");
    const payosOrderCode = queryParams.get("orderCode");
    const [syncingReturn, setSyncingReturn] = useState(false);

    useEffect(() => {
        loadWalletData();
        if (payosOrderCode && payosCancel !== "true") {
            handleSyncReturnOrder(payosOrderCode);
        }
    }, [payosOrderCode, payosCancel]);

    const handleSyncReturnOrder = async (orderCode) => {
        if (!orderCode) return;
        setSyncingReturn(true);
        try {
            await axiosInstance.post(`/api/payment/payos/sync/${orderCode}`);
            await loadWalletData();
        } catch (e) {
            console.warn("PayOS sync error:", e);
        } finally {
            setSyncingReturn(false);
        }
    };

    const loadWalletData = async () => {
        setLoadingHistory(true);
        setWalletError("");
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
            setWalletError(err.message || "Không thể đồng bộ số dư ví và lịch sử giao dịch từ máy chủ.");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDeposit = async () => {
        if (depositChannel === "CASH") {
            alert("Quý khách vui lòng đến trực tiếp Quầy Thu Ngân tầng 1 để nộp tiền mặt vào ví.");
            return;
        }

        if (amount < 10000) {
            alert("Số tiền nạp tối thiểu là 10.000 VNĐ");
            return;
        }

        setLoading(true);
        try {
            const res = await axiosInstance.post(`/api/payment/vietqr/create?amount=${amount}&type=DEPOSIT_WALLET`);
            const data = res?.data?.data || res?.data || res;
            setPaymentModalData(data);
            setOpenQRModal(true);
        } catch (err) {
            alert(err.message || "Lỗi khởi tạo thanh toán PayOS!");
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        setOpenQRModal(false);
        loadWalletData();
    };

    return (
        <Box sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", py: { xs: 3, md: 5 } }}>
            <Container maxWidth="lg">
                {/* Modal Cổng Thanh Toán PayOS (VietQR) */}
                <PaymentQRModal
                    open={openQRModal}
                    onClose={() => { setOpenQRModal(false); loadWalletData(); }}
                    paymentData={paymentModalData}
                    onSuccess={handlePaymentSuccess}
                />

                {/* PayOS Return URL Notification */}
                {payosOrderCode && (
                    <Box mb={3}>
                        {payosCancel === "true" || payosStatus === "CANCELLED" ? (
                            <Alert
                                severity="info"
                                icon={<ErrorIcon fontSize="medium" />}
                                sx={{
                                    borderRadius: 3,
                                    border: "1px solid #BAE6FD",
                                    bgcolor: "#F0F9FF"
                                }}
                                action={
                                    <Button color="inherit" size="small" onClick={() => navigate("/payment", { replace: true })}>
                                        Đóng
                                    </Button>
                                }
                            >
                                <Typography variant="subtitle2" fontWeight={800} color="#0369A1">
                                    Giao dịch đã hủy trên Cổng PayOS
                                </Typography>
                                <Typography variant="body2" color="#64748B">
                                    Bạn đã hủy giao dịch cho đơn hàng <b>#{payosOrderCode}</b> {payosId ? `(Mã link: ${payosId})` : ""}. Tài khoản ngân hàng của quý khách không bị trừ tiền.
                                </Typography>
                            </Alert>
                        ) : (payosCode === "00" || payosStatus === "PAID" || payosStatus === "SUCCESS") ? (
                            <Alert
                                severity="success"
                                icon={<CheckCircleIcon fontSize="medium" />}
                                sx={{
                                    borderRadius: 3,
                                    border: "1px solid #BBF7D0",
                                    bgcolor: "#F0FDF4"
                                }}
                                action={
                                    <Button color="inherit" size="small" onClick={() => navigate("/payment", { replace: true })}>
                                        Đóng
                                    </Button>
                                }
                            >
                                <Typography variant="subtitle2" fontWeight={800} color="#15803D">
                                    Thanh toán thành công qua Cổng PayOS Open Banking!
                                </Typography>
                                <Typography variant="body2" color="#166534">
                                    Đơn hàng <b>#{payosOrderCode}</b> {payosId ? `(Mã: ${payosId})` : ""} đã ghi nhận thanh toán thành công. Số dư ví viện phí đã được cộng tự động.
                                </Typography>
                            </Alert>
                        ) : (
                            <Alert
                                severity="warning"
                                icon={<ErrorIcon fontSize="medium" />}
                                sx={{
                                    borderRadius: 3,
                                    border: "1px solid #FED7AA",
                                    bgcolor: "#FFFBEB"
                                }}
                                action={
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            color="warning"
                                            size="small"
                                            variant="outlined"
                                            disabled={syncingReturn}
                                            onClick={() => handleSyncReturnOrder(payosOrderCode)}
                                            sx={{ textTransform: "none", fontWeight: 700 }}
                                        >
                                            {syncingReturn ? "Đang đối soát..." : "Đồng bộ lại"}
                                        </Button>
                                        <Button color="inherit" size="small" onClick={() => navigate("/payment", { replace: true })}>
                                            Đóng
                                        </Button>
                                    </Stack>
                                }
                            >
                                <Typography variant="subtitle2" fontWeight={800} color="#B45309">
                                    Giao dịch đang chờ đối soát với Cổng PayOS
                                </Typography>
                                <Typography variant="body2" color="#92400E">
                                    Đơn hàng <b>#{payosOrderCode}</b> - Trạng thái: <b>{payosStatus || "PENDING"}</b>. Nếu bạn đã chuyển khoản thành công, vui lòng bấm nút "Đồng bộ lại" bên cạnh.
                                </Typography>
                            </Alert>
                        )}
                    </Box>
                )}

                {/* Header Section */}
                <Box mb={4}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "8px",
                                bgcolor: "rgba(0, 136, 214, 0.1)",
                                color: "#0088D6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <AccountBalanceWalletIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Typography variant="h5" fontWeight={800} color="#0F172A" letterSpacing="-0.02em">
                            Ví Viện Phí & Nạp Tiền Trực Tuyến
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="#64748B">
                        Hỗ trợ Cổng PayOS (Chuyển khoản Open Banking / VietQR Napas 247 tức thì) và nộp Tiền mặt tại Quầy Thu ngân Bệnh viện TNT.
                    </Typography>
                </Box>

                {walletError && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 3, borderRadius: 2.5 }}
                        action={
                            <Button color="inherit" size="small" onClick={loadWalletData}>
                                Thử lại
                            </Button>
                        }
                    >
                        {walletError}
                    </Alert>
                )}

                {/* Top Grid: Balance & Top-up */}
                <Grid container spacing={3} mb={4}>
                    {/* Apple-style Balance Card */}
                    <Grid item xs={12} md={5}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3.5,
                                borderRadius: 4,
                                bgcolor: "#0F172A",
                                color: "#FFFFFF",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                position: "relative",
                                overflow: "hidden",
                                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
                                border: "1px solid rgba(255, 255, 255, 0.08)"
                            }}
                        >
                            {/* Ambient Glow */}
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: -40,
                                    right: -40,
                                    width: 140,
                                    height: 140,
                                    borderRadius: 999,
                                    bgcolor: "rgba(56, 189, 248, 0.15)",
                                    filter: "blur(40px)",
                                    pointerEvents: "none"
                                }}
                            />

                            <Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                                    <Box display="flex" alignItems="center" gap={1.2}>
                                        <Box
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: "10px",
                                                bgcolor: "rgba(56, 189, 248, 0.12)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "#38BDF8"
                                            }}
                                        >
                                            <CreditCardIcon sx={{ fontSize: 20 }} />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, letterSpacing: "0.05em" }}>
                                            VÍ VIỆN PHÍ ĐIỆN TỬ
                                        </Typography>
                                    </Box>
                                    <Chip
                                        icon={<FlashOnIcon sx={{ fontSize: "14px !important", color: "#10B981 !important" }} />}
                                        label="Sẵn sàng"
                                        size="small"
                                        sx={{
                                            height: 24,
                                            fontSize: "0.72rem",
                                            fontWeight: 700,
                                            bgcolor: "rgba(16, 185, 129, 0.15)",
                                            color: "#34D399",
                                            border: "1px solid rgba(16, 185, 129, 0.3)"
                                        }}
                                    />
                                </Box>

                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, display: "block", mb: 0.5 }}>
                                    SỐ DƯ HIỆN KHẢ DỤNG:
                                </Typography>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: 900,
                                        fontFamily: "monospace",
                                        letterSpacing: "-0.03em",
                                        color: "#38BDF8",
                                        mb: 1
                                    }}
                                >
                                    {formatCurrency(balance)}
                                </Typography>
                            </Box>

                            <Box mt={3} pt={2} borderTop="1px solid rgba(255, 255, 255, 0.08)">
                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                    <SecurityIcon sx={{ color: "#10B981", fontSize: 16 }} />
                                    <Typography variant="caption" sx={{ color: "#CBD5E1", fontWeight: 600 }}>
                                        Bảo mật tiêu chuẩn PCI-DSS & Napas 247
                                    </Typography>
                                </Box>
                                <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                                    Tự động gạch nợ tiền khám, thuốc và xét nghiệm trong 0 giây không cần xếp hàng quầy viện phí.
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Top-up Box */}
                    <Grid item xs={12} md={7}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3.5,
                                borderRadius: 4,
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)"
                            }}
                        >
                            <Typography variant="subtitle1" fontWeight={800} color="#0F172A" mb={2}>
                                Chọn phương thức nạp tiền:
                            </Typography>

                            {/* Channel Selector Buttons */}
                            <Grid container spacing={2} mb={3}>
                                <Grid item xs={6}>
                                    <Button
                                        fullWidth
                                        variant={depositChannel === "PAYOS" ? "contained" : "outlined"}
                                        startIcon={<AccountBalanceIcon />}
                                        onClick={() => setDepositChannel("PAYOS")}
                                        sx={{
                                            py: 1.3,
                                            borderRadius: 2.5,
                                            textTransform: "none",
                                            fontWeight: 800,
                                            fontSize: "0.85rem",
                                            bgcolor: depositChannel === "PAYOS" ? "#0088D6" : "transparent",
                                            color: depositChannel === "PAYOS" ? "white" : "#334155",
                                            borderColor: depositChannel === "PAYOS" ? "#0088D6" : "rgba(15, 23, 42, 0.15)",
                                            boxShadow: depositChannel === "PAYOS" ? "0 4px 14px rgba(0, 136, 214, 0.25)" : "none",
                                            "&:hover": {
                                                bgcolor: depositChannel === "PAYOS" ? "#0073B7" : "rgba(15, 23, 42, 0.03)"
                                            }
                                        }}
                                    >
                                        Cổng PayOS (0% phí)
                                    </Button>
                                </Grid>
                                <Grid item xs={6}>
                                    <Button
                                        fullWidth
                                        variant={depositChannel === "CASH" ? "contained" : "outlined"}
                                        startIcon={<PointOfSaleIcon />}
                                        onClick={() => setDepositChannel("CASH")}
                                        sx={{
                                            py: 1.3,
                                            borderRadius: 2.5,
                                            textTransform: "none",
                                            fontWeight: 800,
                                            fontSize: "0.85rem",
                                            bgcolor: depositChannel === "CASH" ? "#10B981" : "transparent",
                                            color: depositChannel === "CASH" ? "white" : "#059669",
                                            borderColor: depositChannel === "CASH" ? "#10B981" : "rgba(16, 185, 129, 0.3)",
                                            boxShadow: depositChannel === "CASH" ? "0 4px 14px rgba(16, 185, 129, 0.25)" : "none",
                                            "&:hover": {
                                                bgcolor: depositChannel === "CASH" ? "#059669" : "rgba(16, 185, 129, 0.05)"
                                            }
                                        }}
                                    >
                                        Tiền mặt tại Quầy
                                    </Button>
                                </Grid>
                            </Grid>

                            {depositChannel === "CASH" ? (
                                <Alert severity="info" sx={{ borderRadius: 3, border: "1px solid #BAE6FD", bgcolor: "#F0F9FF" }}>
                                    <Typography variant="subtitle2" fontWeight={800} color="#0369A1" gutterBottom>
                                        Hướng dẫn nộp tiền mặt vào ví viện phí:
                                    </Typography>
                                    <Typography variant="body2" color="#0284C7" component="div">
                                        • Quý khách vui lòng đến trực tiếp <b>Quầy Thu Ngân (Tầng 1)</b> hoặc <b>Bàn Tiếp Đón</b>.<br />
                                        • Đọc <b>Số điện thoại</b> hoặc xuất trình <b>Mã Bệnh Nhân</b> cho nhân viên thu ngân.<br />
                                        • Nộp số tiền mặt mong muốn, nhân viên sẽ gạch nợ và nạp vào ví viện phí tức thì.
                                    </Typography>
                                </Alert>
                            ) : (
                                <Box>
                                    {/* Fast Amount Preset Chips */}
                                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block", mb: 1 }}>
                                        CHỌN NHANH SỐ TIỀN CẦN NẠP:
                                    </Typography>
                                    <Grid container spacing={1.5} mb={2.5}>
                                        {[100000, 200000, 500000, 1000000, 2000000].map((val) => (
                                            <Grid item xs={6} sm={2.4} key={val}>
                                                <Button
                                                    fullWidth
                                                    size="small"
                                                    variant={amount === val ? "contained" : "outlined"}
                                                    onClick={() => setAmount(val)}
                                                    sx={{
                                                        py: 0.9,
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        fontWeight: 800,
                                                        fontSize: "0.82rem",
                                                        fontFamily: "monospace",
                                                        bgcolor: amount === val ? "#0F172A" : "transparent",
                                                        color: amount === val ? "white" : "#334155",
                                                        borderColor: amount === val ? "#0F172A" : "rgba(15, 23, 42, 0.12)",
                                                        "&:hover": {
                                                            bgcolor: amount === val ? "#1E293B" : "rgba(15, 23, 42, 0.04)"
                                                        }
                                                    }}
                                                >
                                                    {val >= 1000000 ? `${val / 1000000} Triệu` : `${val / 1000}k`}
                                                </Button>
                                            </Grid>
                                        ))}
                                    </Grid>

                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Số tiền nạp tùy chỉnh (VNĐ)"
                                        value={amount}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                        helperText={`Số tiền quy đổi: ${formatCurrency(amount)}`}
                                        sx={{
                                            mb: 2.5,
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: 2.5,
                                                fontFamily: "monospace",
                                                fontWeight: 800,
                                                fontSize: "1.1rem"
                                            }
                                        }}
                                    />

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        startIcon={<QrCodeScannerIcon />}
                                        disabled={loading}
                                        onClick={handleDeposit}
                                        sx={{
                                            py: 1.4,
                                            borderRadius: 2.5,
                                            fontWeight: 800,
                                            fontSize: "0.95rem",
                                            textTransform: "none",
                                            bgcolor: "#0088D6",
                                            boxShadow: "0 6px 20px rgba(0, 136, 214, 0.3)",
                                            "&:hover": { bgcolor: "#0073B7" }
                                        }}
                                    >
                                        {loading ? (
                                            <CircularProgress size={22} color="inherit" />
                                        ) : (
                                            "Tạo Mã PayOS / VietQR Chuyển Khoản Tức Thì"
                                        )}
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>

                {/* Transaction Ledger Table */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        borderRadius: 4,
                        bgcolor: "#FFFFFF",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)"
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                        <Box display="flex" alignItems="center" gap={1.2}>
                            <Box
                                sx={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "8px",
                                    bgcolor: "rgba(15, 23, 42, 0.06)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#0F172A"
                                }}
                            >
                                <HistoryIcon fontSize="small" />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0F172A">
                                    Lịch Sử Biến Động Số Dư
                                </Typography>
                                <Typography variant="caption" color="#64748B">
                                    Tổng số {transactions.length} giao dịch được ghi nhận
                                </Typography>
                            </Box>
                        </Box>
                        <Tooltip title="Làm mới lịch sử giao dịch">
                            <IconButton onClick={loadWalletData} size="small" sx={{ border: "1px solid rgba(15, 23, 42, 0.1)" }}>
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {loadingHistory ? (
                        <Box textAlign="center" py={5}>
                            <CircularProgress size={28} sx={{ color: "#0088D6" }} />
                            <Typography variant="body2" sx={{ color: "#64748B", mt: 1.5, fontWeight: 600 }}>
                                Đang đồng bộ sổ cái giao dịch...
                            </Typography>
                        </Box>
                    ) : transactions.length === 0 ? (
                        <Box textAlign="center" py={5}>
                            <Typography variant="body2" color="#64748B" fontWeight={600}>
                                Chưa có biến động số dư nào trong tài khoản của bạn.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer sx={{ borderRadius: 2.5, border: "1px solid rgba(15, 23, 42, 0.06)" }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.4 }}>MÃ GIAO DỊCH</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: "#475569" }}>LOẠI BIẾN ĐỘNG</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: "#475569" }}>PHƯƠNG THỨC</TableCell>
                                        <TableCell sx={{ fontWeight: 800, color: "#475569" }}>THỜI GIAN</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 800, color: "#475569" }}>SỐ TIỀN</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800, color: "#475569" }}>TRẠNG THÁI</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map((t, idx) => {
                                        const isDeposit = t.transactionType === "DEPOSIT_WALLET";
                                        const isSuccess = t.status === "SUCCESS";
                                        const methodLabel = (t.paymentMethod === "VIETQR" || t.paymentMethod === "PAYOS")
                                            ? "Cổng PayOS (VietQR)"
                                            : (t.paymentMethod === "CASH" || t.paymentMethod === "COUNTER_CASH")
                                            ? "Tiền mặt tại quầy"
                                            : t.paymentMethod === "INTERNAL_WALLET"
                                            ? "Ví viện phí"
                                            : "Tiền mặt";

                                        return (
                                            <TableRow key={t.transactionId || idx} hover sx={{ "&:last-child td": { border: 0 } }}>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#0F172A" }}>
                                                        {t.vnpayTxnRef || `GD-${idx + 1}`}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700} color={isDeposit ? "#059669" : "#0F172A"}>
                                                        {isDeposit ? "Nạp tiền ví" : "Thanh toán viện phí"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={methodLabel}
                                                        size="small"
                                                        sx={{
                                                            fontSize: "0.72rem",
                                                            height: 22,
                                                            fontWeight: 600,
                                                            bgcolor: "rgba(15, 23, 42, 0.05)"
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                                                        {t.createdAt ? formatDateTime(t.createdAt) : "Vừa xong"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            fontWeight: 800,
                                                            fontFamily: "monospace",
                                                            color: isSuccess ? (isDeposit ? "#059669" : "#0088D6") : "#DC2626"
                                                        }}
                                                    >
                                                        {isDeposit ? "+" : "-"}{formatCurrency(t.amount)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={isSuccess ? "Thành công" : "Thất bại"}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            fontSize: "0.72rem",
                                                            fontWeight: 800,
                                                            bgcolor: isSuccess ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                                            color: isSuccess ? "#059669" : "#DC2626"
                                                        }}
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
        </Box>
    );
}
