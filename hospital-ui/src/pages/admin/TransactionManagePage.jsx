import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Button,
    TextField,
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
    IconButton,
    Chip,
    MenuItem,
    Alert,
    Tooltip,
    InputAdornment,
    Divider,
    Stack
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PrintIcon from "@mui/icons-material/Print";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { printReceipt, printShiftReconciliation } from "../../utils/printHelper";
import designTokens from "../../theme/designTokens";

const BRAND_PRIMARY = designTokens.brand.primary;
const BRAND_DARK = designTokens.brand.primaryDark;
const BRAND_LIGHT = designTokens.brand.primaryLight;

export default function TransactionManagePage() {
    const [transactions, setTransactions] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosInstance.get("/api/payment/admin/transactions");
            const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setTransactions(list);
        } catch (err) {
            console.error("Lỗi tải đối soát giao dịch:", err);
            setError(err.message || "Không thể đồng bộ danh sách giao dịch từ hệ thống thanh toán.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetail = (txn) => {
        setSelectedTxn(txn);
        setOpenDetailModal(true);
    };

    const totalSuccess = transactions.filter(t => t.status === "SUCCESS").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalFailed = transactions.filter(t => t.status === "FAILED").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalRefunded = transactions.filter(t => t.status === "REFUNDED").reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const filtered = transactions.filter(t => {
        const matchesKeyword =
            (t.transactionId && t.transactionId.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (t.vnpayTxnRef && t.vnpayTxnRef.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (t.accountName && t.accountName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (t.description && t.description.toLowerCase().includes(searchKeyword.toLowerCase()));

        const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
        const matchesType = typeFilter === "ALL" || t.transactionType === typeFilter;
        return matchesKeyword && matchesStatus && matchesType;
    });

    const handleExportCsv = () => {
        if (!filtered || filtered.length === 0) {
            alert("Không có giao dịch nào để xuất!");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "DANH SÁCH ĐỐI SOÁT GIAO DỊCH VIỆN PHÍ - BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT\n";
        csvContent += `Thời điểm xuất: ${new Date().toLocaleString("vi-VN")} | Tổng số giao dịch: ${filtered.length}\n\n`;
        csvContent += "Mã Giao Dịch,Mã Đối Soát (TxnRef),Người Nộp Tiền,Loại Viện Phí,Kênh Thanh Toán,Số Tiền (VNĐ),Trạng Thái,Thời Gian Giao Dịch\n";

        filtered.forEach(t => {
            const timeStr = t.createdAt ? formatDateTime(t.createdAt) : "";
            csvContent += `"${t.transactionId || ""}","${t.vnpayTxnRef || t.bankTxnNo || ""}","${t.accountName || t.fullName || "Khách vãng lai"}","${t.transactionType || "PAY_BOOKING"}","${t.paymentMethod || "CASH"}","${t.amount || 0}","${t.status || "SUCCESS"}","${timeStr}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Doi_Soat_Giao_Dich_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintLedger = () => {
        if (!filtered || filtered.length === 0) {
            alert("Không có dữ liệu giao dịch để in sổ!");
            return;
        }

        const cashTxns = filtered.filter(t => t.paymentMethod === "CASH");
        const digitalTxns = filtered.filter(t => t.paymentMethod !== "CASH");
        const cashTotal = cashTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const digitalTotal = digitalTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const totalCollected = filtered.filter(t => t.status === "SUCCESS").reduce((s, t) => s + (Number(t.amount) || 0), 0);

        printShiftReconciliation({
            cashierName: "Bộ phận Thu Ngân Viện Phí",
            shiftName: `Sổ Thu Viện Phí (${filtered.length} giao dịch)`,
            totalCollected,
            cashTotal,
            cashCount: cashTxns.length,
            digitalTotal,
            digitalCount: digitalTxns.length,
            transactionCount: filtered.length,
            transactions: filtered.map(t => ({
                code: t.transactionId || t.vnpayTxnRef || "TXN",
                time: t.createdAt ? formatDateTime(t.createdAt) : "---",
                patientName: t.accountName || t.fullName || "Khách hàng",
                content: t.description || t.transactionType || "Thu viện phí",
                method: t.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản / PayOS",
                amount: Number(t.amount) || 0,
                status: t.status === "SUCCESS" ? "Thành công" : t.status
            }))
        });
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3.5 }}>
            {/* 1. Header Banner Apple HIG */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    background: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
                    <Box>
                        <Chip
                            label="QUẢN TRỊ DÒNG TIỀN VIỆN PHÍ • RECONCILIATION PRO"
                            size="small"
                            sx={{
                                height: 22,
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                bgcolor: BRAND_LIGHT,
                                color: BRAND_PRIMARY,
                                mb: 1
                            }}
                        />
                        <Typography
                            variant="h5"
                            fontWeight="800"
                            color="#0F172A"
                            sx={{ letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 1.5 }}
                        >
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 2.5,
                                    bgcolor: "#EBF6FE",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid rgba(15, 118, 110, 0.2)"
                                }}
                            >
                                <ReceiptLongIcon sx={{ color: BRAND_PRIMARY, fontSize: 24 }} />
                            </Box>
                            Đối Soát & Quản Lý Giao Dịch Thanh Toán
                        </Typography>
                        <Typography variant="body2" color="#64748B" sx={{ mt: 0.5, maxWidth: 760 }}>
                            Theo dõi dòng tiền viện phí đa kênh (VNPay QR, Thẻ nội địa / Quốc tế, Chuyển khoản VietQR, Máy POS và Quầy thu ngân tập trung)
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1.5} alignItems="center">
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={loadTransactions}
                            disabled={loading}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 700,
                                textTransform: "none",
                                px: 2.5,
                                borderColor: "rgba(15, 23, 42, 0.15)",
                                color: "#334155",
                                "&:hover": { borderColor: BRAND_PRIMARY, bgcolor: "rgba(15, 118, 110, 0.04)" }
                            }}
                        >
                            {loading ? "Đang tải..." : "Làm mới"}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportCsv}
                            disabled={filtered.length === 0}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 700,
                                textTransform: "none",
                                px: 2.5,
                                borderColor: "rgba(16, 185, 129, 0.4)",
                                color: "#059669",
                                bgcolor: "rgba(16, 185, 129, 0.04)",
                                "&:hover": { borderColor: "#059669", bgcolor: "rgba(16, 185, 129, 0.1)" }
                            }}
                        >
                            Xuất Báo Cáo CSV
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={handlePrintLedger}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: BRAND_PRIMARY,
                                "&:hover": { bgcolor: "#0070BA" },
                                px: 3,
                                boxShadow: "0 4px 14px rgba(15, 118, 110, 0.25)",
                                display: { xs: "none", sm: "inline-flex" }
                            }}
                        >
                            In Sổ Thu Viện Phí
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Error Banner */}
            {error && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 2.5, border: "1px solid rgba(245, 158, 11, 0.3)" }}
                    action={
                        <Button color="inherit" size="small" onClick={loadTransactions}>
                            Thử lại
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            {/* 2. Thẻ Thống Kê Dòng Tiền (Apple HIG KPI Cards) */}
            <Grid container spacing={2.5} mb={3}>
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
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.72rem" }}>
                                    TỔNG THU THÀNH CÔNG
                                </Typography>
                                <Typography variant="h4" fontWeight="800" color="#065F46" sx={{ mt: 0.5, letterSpacing: "-0.5px", fontSize: "1.45rem", fontFamily: "monospace" }}>
                                    {formatCurrency(totalSuccess)}
                                </Typography>
                                <Typography variant="caption" color="#059669" sx={{ mt: 0.5, display: "block" }}>
                                    Tiền viện phí đã vào tài khoản
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(16, 185, 129, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#10B981"
                                }}
                            >
                                <CheckCircleIcon />
                            </Box>
                        </Box>
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
                            borderTop: "3px solid #EF4444",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.72rem" }}>
                                    GIAO DỊCH THẤT BẠI / LỖI
                                </Typography>
                                <Typography variant="h4" fontWeight="800" color="#991B1B" sx={{ mt: 0.5, letterSpacing: "-0.5px", fontSize: "1.45rem", fontFamily: "monospace" }}>
                                    {formatCurrency(totalFailed)}
                                </Typography>
                                <Typography variant="caption" color="#DC2626" sx={{ mt: 0.5, display: "block" }}>
                                    Giao dịch huỷ hoặc lỗi mạng
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(239, 68, 68, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#EF4444"
                                }}
                            >
                                <ErrorIcon />
                            </Box>
                        </Box>
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
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="caption" sx={{ color: "#7C3AED", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.72rem" }}>
                                    TỔNG TIỀN HOÀN TRẢ
                                </Typography>
                                <Typography variant="h4" fontWeight="800" color="#5B21B6" sx={{ mt: 0.5, letterSpacing: "-0.5px", fontSize: "1.45rem", fontFamily: "monospace" }}>
                                    {formatCurrency(totalRefunded)}
                                </Typography>
                                <Typography variant="caption" color="#7C3AED" sx={{ mt: 0.5, display: "block" }}>
                                    Hoàn viện phí chênh lệch / huỷ ca
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(139, 92, 246, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#8B5CF6"
                                }}
                            >
                                <HourglassEmptyIcon />
                            </Box>
                        </Box>
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
                            borderTop: `3px solid ${BRAND_PRIMARY}`,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="caption" sx={{ color: "#0284C7", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.72rem" }}>
                                    TỔNG LƯỢT GIAO DỊCH
                                </Typography>
                                <Typography variant="h4" fontWeight="800" color="#0369A1" sx={{ mt: 0.5, letterSpacing: "-0.5px" }}>
                                    {transactions.length}
                                </Typography>
                                <Typography variant="caption" color="#0284C7" sx={{ mt: 0.5, display: "block" }}>
                                    Bản ghi phát sinh trong hệ thống
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 2.5,
                                    bgcolor: BRAND_LIGHT,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: BRAND_PRIMARY
                                }}
                            >
                                <ReceiptLongIcon />
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* 3. Bộ Lọc & Tìm Kiếm Apple HIG */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 2.5 },
                    mb: 3,
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}
            >
                <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap" flexGrow={1}>
                    <TextField
                        size="small"
                        placeholder="Tìm theo Mã GD, Mã ngân hàng, Tên người nộp..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        sx={{ minWidth: { xs: "100%", sm: 340 }, maxWidth: 440 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "#94A3B8" }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2.5, bgcolor: "#F8FAFC" }
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 180 }}
                        InputProps={{ sx: { borderRadius: 2.5, bgcolor: "#F8FAFC" } }}
                    >
                        <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                        <MenuItem value="SUCCESS">✅ Thành công</MenuItem>
                        <MenuItem value="FAILED">❌ Thất bại</MenuItem>
                        <MenuItem value="REFUNDED">↩️ Đã hoàn tiền</MenuItem>
                    </TextField>

                    <TextField
                        select
                        size="small"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        sx={{ minWidth: 190 }}
                        InputProps={{ sx: { borderRadius: 2.5, bgcolor: "#F8FAFC" } }}
                    >
                        <MenuItem value="ALL">Tất cả loại giao dịch</MenuItem>
                        <MenuItem value="PAY_BOOKING">Khám bệnh</MenuItem>
                        <MenuItem value="PAY_PRESCRIPTION">Đơn thuốc</MenuItem>
                        <MenuItem value="PAY_INPATIENT_FEE">Viện phí nội trú</MenuItem>
                        <MenuItem value="REFUND_FEE">Hoàn trả viện phí</MenuItem>
                    </TextField>
                </Box>

                <Chip
                    label={`Hiển thị: ${filtered.length} / ${transactions.length} giao dịch`}
                    size="small"
                    sx={{
                        fontWeight: 700,
                        bgcolor: "#F1F5F9",
                        color: "#475569",
                        height: 28,
                        fontSize: "0.78rem"
                    }}
                />
            </Paper>

            {/* 4. Bảng Danh Sách Giao Dịch Apple HIG */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}
            >
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>MÃ GIAO DỊCH</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>MÃ ĐỐI SOÁT (TXNREF)</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>NGƯỜI NỘP TIỀN</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>LOẠI VIỆN PHÍ</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>KÊNH THU</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, textAlign: "right" }}>SỐ TIỀN (VNĐ)</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>TRẠNG THÁI</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>THỜI GIAN</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, textAlign: "center" }}>CHI TIẾT</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                            <ReceiptLongIcon sx={{ fontSize: 48, color: "#CBD5E1" }} />
                                            <Typography variant="subtitle1" fontWeight={700} color="#64748B">
                                                {loading ? "Đang đồng bộ dữ liệu giao dịch..." : (error ? "Không thể tải danh sách giao dịch. Vui lòng bấm thử lại." : "Chưa có giao dịch thanh toán nào phù hợp.")}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Kiểm tra lại từ khóa tìm kiếm hoặc các tiêu chí bộ lọc
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((t, idx) => (
                                    <TableRow key={t.transactionId || idx} hover sx={{ "&:hover": { bgcolor: "#F8FAFC" } }}>
                                        <TableCell>
                                            <Box
                                                component="span"
                                                sx={{
                                                    fontFamily: "monospace",
                                                    fontWeight: 700,
                                                    fontSize: "0.8rem",
                                                    bgcolor: BRAND_LIGHT,
                                                    color: BRAND_PRIMARY,
                                                    px: 1,
                                                    py: 0.35,
                                                    borderRadius: 1.5,
                                                    display: "inline-block"
                                                }}
                                            >
                                                {t.transactionId}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" sx={{ fontFamily: "monospace", bgcolor: "#F1F5F9", px: 1, py: 0.35, borderRadius: 1.5, fontWeight: 600, color: "#475569" }}>
                                                {t.vnpayTxnRef || "N/A"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700} color="#0F172A">
                                                {t.accountName || "Khách hàng vãng lai"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    t.transactionType === "PAY_BOOKING" ? "Khám bệnh" :
                                                    t.transactionType === "PAY_PRESCRIPTION" ? "Đơn thuốc" :
                                                    t.transactionType === "PAY_INPATIENT_FEE" ? "Nội trú" : "Hoàn trả"
                                                }
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: "0.7rem",
                                                    fontWeight: 700,
                                                    bgcolor: "#F1F5F9",
                                                    color: "#334155"
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={t.paymentChannel || "VNPAY"}
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: "0.7rem",
                                                    fontWeight: 700,
                                                    bgcolor: t.paymentChannel === "CASH" ? "#F1F5F9" : BRAND_LIGHT,
                                                    color: t.paymentChannel === "CASH" ? "#475569" : BRAND_PRIMARY
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: t.status === "SUCCESS" ? "#059669" : "#0F172A", fontFamily: "monospace", fontSize: "0.88rem" }}>
                                                {formatCurrency(t.amount)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    t.status === "SUCCESS" ? "Thành công" :
                                                    t.status === "FAILED" ? "Thất bại" : "Đã hoàn"
                                                }
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: "0.7rem",
                                                    fontWeight: 800,
                                                    bgcolor:
                                                        t.status === "SUCCESS" ? "rgba(16, 185, 129, 0.1)" :
                                                        t.status === "FAILED" ? "rgba(239, 68, 68, 0.1)" : "rgba(139, 92, 246, 0.1)",
                                                    color:
                                                        t.status === "SUCCESS" ? "#059669" :
                                                        t.status === "FAILED" ? "#DC2626" : "#7C3AED",
                                                    border: `1px solid ${
                                                        t.status === "SUCCESS" ? "rgba(16, 185, 129, 0.3)" :
                                                        t.status === "FAILED" ? "rgba(239, 68, 68, 0.3)" : "rgba(139, 92, 246, 0.3)"
                                                    }`
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "0.82rem", color: "#64748B", fontFamily: "monospace" }}>
                                            {formatDateTime(t.createdAt)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Xem chi tiết & in biên lai">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenDetail(t)}
                                                    sx={{
                                                        bgcolor: BRAND_LIGHT,
                                                        color: BRAND_PRIMARY,
                                                        borderRadius: 2,
                                                        "&:hover": { bgcolor: "rgba(15, 118, 110, 0.16)" }
                                                    }}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* 5. MODAL XEM CHI TIẾT GIAO DỊCH Apple HIG */}
            <Dialog
                open={openDetailModal}
                onClose={() => setOpenDetailModal(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
                        overflow: "hidden"
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                        color: "#0F172A",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        py: 2,
                        bgcolor: "#F8FAFC"
                    }}
                >
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            bgcolor: BRAND_LIGHT,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <ReceiptLongIcon sx={{ color: BRAND_PRIMARY, fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} color="#0F172A">
                            Chi Tiết Giao Dịch Đối Soát
                        </Typography>
                        <Typography variant="caption" color="#64748B">
                            Biên lai hạch toán điện tử YouMed HMS
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 3, bgcolor: "#FFFFFF" }}>
                    {selectedTxn && (
                        <Stack spacing={2} mt={0.5}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="#64748B">Mã giao dịch hệ thống:</Typography>
                                <Typography variant="body2" fontWeight={800} sx={{ fontFamily: "monospace", color: BRAND_PRIMARY }}>
                                    {selectedTxn.transactionId}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="#64748B">Mã tham chiếu ngân hàng (TxnRef):</Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ fontFamily: "monospace", bgcolor: "#F1F5F9", px: 1, py: 0.3, borderRadius: 1.5 }}>
                                    {selectedTxn.vnpayTxnRef || "N/A"}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="#64748B">Người nộp tiền:</Typography>
                                <Typography variant="body2" fontWeight={700} color="#0F172A">
                                    {selectedTxn.accountName || "Khách hàng vãng lai"}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="#64748B">Kênh thanh toán & Ngân hàng:</Typography>
                                <Typography variant="body2" fontWeight={700} color="#0F172A">
                                    {selectedTxn.paymentChannel} ({selectedTxn.bankCode || "NCB"})
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="#64748B">Nội dung chuyển khoản:</Typography>
                                <Typography variant="body2" color="#334155" sx={{ maxWidth: 300, textAlign: "right" }}>
                                    {selectedTxn.description || "Thanh toán viện phí YouMed"}
                                </Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1" fontWeight={800} color="#0F172A">Số tiền thanh toán:</Typography>
                                <Typography variant="h5" fontWeight={800} color="#059669" sx={{ fontFamily: "monospace" }}>
                                    {formatCurrency(selectedTxn.amount)}
                                </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="#64748B">Trạng thái xử lý:</Typography>
                                <Chip
                                    label={selectedTxn.status === "SUCCESS" ? "GIAO DỊCH THÀNH CÔNG" : "LỖI GIAO DỊCH"}
                                    size="small"
                                    sx={{
                                        fontWeight: 800,
                                        bgcolor: selectedTxn.status === "SUCCESS" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                        color: selectedTxn.status === "SUCCESS" ? "#059669" : "#DC2626",
                                        border: `1px solid ${selectedTxn.status === "SUCCESS" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                                    }}
                                />
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, px: 3, borderTop: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#F8FAFC" }}>
                    <Button
                        onClick={() => setOpenDetailModal(false)}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#64748B" }}
                    >
                        Đóng
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={() => printReceipt({
                            receiptCode: selectedTxn.vnpayTxnRef || selectedTxn.transactionId,
                            patientName: selectedTxn.account?.fullName || selectedTxn.accountName || "Khách hàng YouMed TNT",
                            phoneNumber: selectedTxn.account?.phoneNumber || selectedTxn.phoneNumber || "---",
                            totalAmount: selectedTxn.amount,
                            paymentMethod: selectedTxn.paymentMethod,
                            description: selectedTxn.description,
                            paidAt: selectedTxn.createdAt,
                            cashierName: "Hệ thống Quản Trị Viện Phí TNT"
                        })}
                        sx={{
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 700,
                            bgcolor: BRAND_PRIMARY,
                            "&:hover": { bgcolor: "#0070BA" },
                            px: 3
                        }}
                    >
                        In Biên Lai Chứng Từ
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
