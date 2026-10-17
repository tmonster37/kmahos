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
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
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

    const handlePaymentSuccess = (tx) => {
        setOpenQRModal(false);
        loadWalletData();
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            {/* Modal Cổng Thanh Toán PayOS (VietQR) */}
            <PaymentQRModal
                open={openQRModal}
                onClose={() => { setOpenQRModal(false); loadWalletData(); }}
                paymentData={paymentModalData}
                onSuccess={handlePaymentSuccess}
            />


            {/* PayOS Return URL Notification (Theo đặc tả https://payos.vn/docs/du-lieu-tra-ve/return-url/) */}
            {payosOrderCode && (
                <Box mb={3}>
                    {payosCancel === "true" || payosStatus === "CANCELLED" ? (
                        <Alert
                            severity="info"
                            icon={<ErrorIcon fontSize="medium" />}
                            sx={{ borderRadius: 3, border: "1px solid #BAE6FD", bgcolor: "#F0F9FF" }}
                            action={
                                <Button color="inherit" size="small" onClick={() => navigate("/payment", { replace: true })}>
                                    Đóng
                                </Button>
                            }
                        >
                            <Typography variant="subtitle2" fontWeight="bold" color="#0369A1">
                                Giao dịch đã được hủy trên Cổng PayOS
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Bạn đã chọn hủy thanh toán cho đơn hàng <b>#{payosOrderCode}</b> {payosId ? `(Mã link: ${payosId})` : ""}. Tài khoản ngân hàng của bạn không bị trừ tiền. Quý khách có thể nạp tiền lại bất cứ lúc nào.
                            </Typography>
                        </Alert>
                    ) : (payosCode === "00" || payosStatus === "PAID" || payosStatus === "SUCCESS") ? (
                        <Alert
                            severity="success"
                            icon={<CheckCircleIcon fontSize="medium" />}
                            sx={{ borderRadius: 3, border: "1px solid #BBF7D0", bgcolor: "#F0FDF4" }}
                            action={
                                <Button color="inherit" size="small" onClick={() => navigate("/payment", { replace: true })}>
                                    Đóng
                                </Button>
                            }
                        >
                            <Typography variant="subtitle2" fontWeight="bold" color="#15803D">
                                🎉 Thanh toán thành công qua Cổng PayOS Open Banking!
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Đơn hàng <b>#{payosOrderCode}</b> {payosId ? `(Mã PayOS: ${payosId})` : ""} đã được ghi nhận thanh toán thành công (Mã: {payosCode || "00"} - Trạng thái: PAID).
                                Số dư ví viện phí của bạn đã được cập nhật tự động.
                            </Typography>
                        </Alert>
                    ) : (
                        <Alert
                            severity="warning"
                            icon={<ErrorIcon fontSize="medium" />}
                            sx={{ borderRadius: 3, border: "1px solid #FED7AA", bgcolor: "#FFFBEB" }}
                            action={
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        color="warning"
                                        size="small"
                                        variant="outlined"
                                        disabled={syncingReturn}
                                        onClick={() => handleSyncReturnOrder(payosOrderCode)}
                                        sx={{ textTransform: "none", fontWeight: "bold" }}
                                    >
                                        {syncingReturn ? "Đang đồng bộ..." : "Đồng bộ lại"}
                                    </Button>
                                    <Button color="inherit" size="small" onClick={() => navigate("/payment", { replace: true })}>
                                        Đóng
                                    </Button>
                                </Stack>
                            }
                        >
                            <Typography variant="subtitle2" fontWeight="bold" color="#B45309">
                                Giao dịch PayOS đang chờ xử lý hoặc chưa hoàn tất
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Đơn hàng <b>#{payosOrderCode}</b> - Trạng thái: <b>{payosStatus || "PENDING"}</b> (Mã: {payosCode || "Chờ xử lý"}).
                                Nếu bạn đã chuyển khoản trên App ngân hàng, vui lòng bấm nút <b>"Đồng bộ lại"</b> bên cạnh để hệ thống đối soát trực tiếp với PayOS.
                            </Typography>
                        </Alert>
                    )}
                </Box>
            )}

            {/* Header */}
            <Box mb={3}>
                <Typography variant="h5" fontWeight="bold" color="#0f172a">
                    💳 Ví Viện Phí & Nạp Tiền
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Hỗ trợ Cổng thanh toán PayOS (Chuyển khoản Open Banking / VietQR Napas 247) và nộp Tiền mặt tại Quầy Thu ngân
                </Typography>
            </Box>

            {walletError && (
                <Alert
                    severity="warning"
                    sx={{ mb: 2.5, borderRadius: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={loadWalletData}>
                            Thử lại
                        </Button>
                    }
                >
                    {walletError}
                </Alert>
            )}

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
                            Chọn phương thức nạp tiền:
                        </Typography>

                        {/* Channel selector tabs: Chỉ PayOS và Tiền mặt */}
                        <Grid container spacing={1.5} mb={2.5}>
                            <Grid item xs={6}>
                                <Button
                                    fullWidth
                                    size="small"
                                    variant={depositChannel === "PAYOS" ? "contained" : "outlined"}
                                    startIcon={<AccountBalanceIcon />}
                                    onClick={() => setDepositChannel("PAYOS")}
                                    sx={{
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: "700",
                                        fontSize: "0.82rem",
                                        bgcolor: depositChannel === "PAYOS" ? "#0284c7" : "transparent"
                                    }}
                                >
                                    📱 Cổng PayOS (0% phí)
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    fullWidth
                                    size="small"
                                    variant={depositChannel === "CASH" ? "contained" : "outlined"}
                                    startIcon={<PointOfSaleIcon />}
                                    onClick={() => setDepositChannel("CASH")}
                                    sx={{
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: "700",
                                        fontSize: "0.82rem",
                                        bgcolor: depositChannel === "CASH" ? "#10b981" : "transparent",
                                        borderColor: "#10b981",
                                        color: depositChannel === "CASH" ? "#fff" : "#10b981",
                                        "&:hover": { bgcolor: "#059669", color: "#fff" }
                                    }}
                                >
                                    💵 Tiền mặt tại Quầy
                                </Button>
                            </Grid>
                        </Grid>

                        {depositChannel === "CASH" ? (
                            <Box>
                                <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
                                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                                        Nộp tiền mặt trực tiếp vào ví viện phí:
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        • Quý khách vui lòng đến trực tiếp <b>Quầy Thu Ngân (Tầng 1)</b> hoặc <b>Bàn Tiếp Đón</b>.
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        • Đọc <b>Số điện thoại</b> hoặc xuất trình <b>Mã Bệnh Nhân</b> cho nhân viên tiếp đón.
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        • Nộp số tiền mặt mong muốn, nhân viên sẽ gạch nợ và nạp vào ví tức thì.
                                    </Typography>
                                </Alert>
                            </Box>
                        ) : (
                            <Box>
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
                                        bgcolor: "#0284c7",
                                        "&:hover": {
                                            bgcolor: "#0369a1"
                                        }
                                    }}
                                >
                                    {loading ? (
                                        <CircularProgress size={20} color="inherit" />
                                    ) : (
                                        "Tạo mã PayOS / VietQR Chuyển Khoản"
                                    )}
                                </Button>
                            </Box>
                        )}
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
                                    const methodLabel = (t.paymentMethod === "VIETQR" || t.paymentMethod === "PAYOS")
                                        ? "Cổng PayOS (VietQR)"
                                        : (t.paymentMethod === "CASH" || t.paymentMethod === "COUNTER_CASH")
                                        ? "Tiền mặt tại quầy"
                                        : t.paymentMethod === "INTERNAL_WALLET"
                                        ? "Ví viện phí"
                                        : "Tiền mặt";

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
