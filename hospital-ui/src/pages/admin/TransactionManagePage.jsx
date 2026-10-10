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
import { printReceipt } from "../../utils/printHelper";

export default function TransactionManagePage() {
    const [transactions, setTransactions] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/api/payment/admin/transactions").catch(() => ({ data: [] }));
            const list = (res && Array.isArray(res.data)) ? res.data : [];

            if (list.length > 0) {
                setTransactions(list);
            } else {
                // Mock dữ liệu đối soát phong phú
                setTransactions([
                    {
                        transactionId: "TXN-882101",
                        vnpayTxnRef: "VNP2026092701",
                        accountName: "Trần Minh Quân (0918273645)",
                        amount: 530000,
                        transactionType: "PAY_BOOKING",
                        paymentChannel: "VNPAY_QR",
                        status: "SUCCESS",
                        description: "Thanh toán phiếu khám tim mạch & xét nghiệm",
                        bankCode: "NCB",
                        createdAt: "2026-09-27T08:15:30Z"
                    },
                    {
                        transactionId: "TXN-882102",
                        vnpayTxnRef: "POS2026092702",
                        accountName: "Phạm Thị Thu Trang (0983123456)",
                        amount: 115000,
                        transactionType: "PAY_PRESCRIPTION",
                        paymentChannel: "POS_CARD",
                        status: "SUCCESS",
                        description: "Thanh toán đơn thuốc ngoại trú",
                        bankCode: "VIETCOMBANK",
                        createdAt: "2026-09-27T09:00:15Z"
                    },
                    {
                        transactionId: "TXN-882103",
                        vnpayTxnRef: "CASH2026092703",
                        accountName: "Nguyễn Văn Hùng (0905123987)",
                        amount: 2000000,
                        transactionType: "PAY_INPATIENT_FEE",
                        paymentChannel: "CASH",
                        status: "SUCCESS",
                        description: "Tạm ứng viện phí nội trú phòng 301",
                        bankCode: "QUẦY THU NGÂN 01",
                        createdAt: "2026-09-27T09:30:00Z"
                    },
                    {
                        transactionId: "TXN-882104",
                        vnpayTxnRef: "VNP2026092704",
                        accountName: "Lê Văn Tuấn (0971239988)",
                        amount: 200000,
                        transactionType: "PAY_BOOKING",
                        paymentChannel: "VNPAY_QR",
                        status: "FAILED",
                        description: "Khách hàng hủy giao dịch trên App Ngân hàng",
                        bankCode: "MBBANK",
                        createdAt: "2026-09-27T10:05:22Z"
                    },
                    {
                        transactionId: "TXN-882105",
                        vnpayTxnRef: "REF2026092705",
                        accountName: "Đỗ Bích Ngọc (0933445566)",
                        amount: 350000,
                        transactionType: "REFUND_FEE",
                        paymentChannel: "BANK_TRANSFER",
                        status: "REFUNDED",
                        description: "Hoàn phí khám do bác sĩ có ca mổ cấp cứu đột xuất",
                        bankCode: "TECHCOMBANK",
                        createdAt: "2026-09-27T10:45:10Z"
                    }
                ]);
            }
        } catch (err) {
            console.error("Lỗi tải đối soát giao dịch:", err);
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

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                        📑 Đối Soát & Quản Lý Giao Dịch Thanh Toán
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Theo dõi dòng tiền thu viện phí trực tuyến (VNPay, MoMo), máy POS và Quầy thu ngân
                    </Typography>
                </Box>
                <Box display="flex" gap={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadTransactions}
                        sx={{ borderRadius: 2 }}
                    >
                        Làm Mới
                    </Button>
                </Box>
            </Box>

            {/* Thẻ Thống Kê Dòng Tiền */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, borderLeft: "5px solid #16A34A" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">TỔNG THU THÀNH CÔNG</Typography>
                        <Typography variant="h5" fontWeight="bold" color="#16A34A" mt={0.5}>
                            {formatCurrency(totalSuccess)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, borderLeft: "5px solid #DC2626" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">GIAO DỊCH THẤT BẠI / LỖI</Typography>
                        <Typography variant="h5" fontWeight="bold" color="#DC2626" mt={0.5}>
                            {formatCurrency(totalFailed)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, borderLeft: "5px solid #8B5CF6" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">TỔNG TIỀN HOÀN TRẢ</Typography>
                        <Typography variant="h5" fontWeight="bold" color="#8B5CF6" mt={0.5}>
                            {formatCurrency(totalRefunded)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2.5, borderRadius: 3, borderLeft: "5px solid #0284C7" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">TỔNG LƯỢT GIAO DỊCH</Typography>
                        <Typography variant="h5" fontWeight="bold" color="#0284C7" mt={0.5}>
                            {transactions.length} giao dịch
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Bộ Lọc & Tìm Kiếm */}
            <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <TextField
                        size="small"
                        placeholder="Tìm theo Mã GD, Mã ngân hàng, Tên người nộp..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        sx={{ width: 340 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <TextField
                        select
                        size="small"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        sx={{ minWidth: 180 }}
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
                    >
                        <MenuItem value="ALL">Tất cả loại giao dịch</MenuItem>
                        <MenuItem value="PAY_BOOKING">Khám bệnh</MenuItem>
                        <MenuItem value="PAY_PRESCRIPTION">Đơn thuốc</MenuItem>
                        <MenuItem value="PAY_INPATIENT_FEE">Viện phí nội trú</MenuItem>
                        <MenuItem value="REFUND_FEE">Hoàn trả viện phí</MenuItem>
                    </TextField>
                </Box>

                <Typography variant="body2" color="text.secondary">
                    Kết quả: <b>{filtered.length} giao dịch</b>
                </Typography>
            </Paper>

            {/* Bảng Danh Sách Giao Dịch */}
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                        <TableRow>
                            <TableCell><b>Mã giao dịch</b></TableCell>
                            <TableCell><b>Mã đối soát (TxnRef)</b></TableCell>
                            <TableCell><b>Người thanh toán</b></TableCell>
                            <TableCell><b>Loại viện phí</b></TableCell>
                            <TableCell><b>Kênh thu</b></TableCell>
                            <TableCell align="right"><b>Số tiền (VNĐ)</b></TableCell>
                            <TableCell><b>Trạng thái</b></TableCell>
                            <TableCell><b>Thời gian</b></TableCell>
                            <TableCell align="center"><b>Chi tiết</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((t, idx) => (
                            <TableRow key={t.transactionId || idx} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                        {t.transactionId}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption" sx={{ fontFamily: "monospace", bgcolor: "#F1F5F9", p: 0.5, borderRadius: 1 }}>
                                        {t.vnpayTxnRef || "N/A"}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold">
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
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={t.paymentChannel || "VNPAY"}
                                        size="small"
                                        color={t.paymentChannel === "CASH" ? "default" : "info"}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight="bold" color={t.status === "SUCCESS" ? "success.main" : "text.primary"}>
                                        {formatCurrency(t.amount)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={
                                            t.status === "SUCCESS" ? "Thành công" :
                                            t.status === "FAILED" ? "Thất bại" : "Đã hoàn"
                                        }
                                        color={
                                            t.status === "SUCCESS" ? "success" :
                                            t.status === "FAILED" ? "error" : "secondary"
                                        }
                                        size="small"
                                        sx={{ fontWeight: "bold" }}
                                    />
                                </TableCell>
                                <TableCell>{formatDateTime(t.createdAt)}</TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" color="primary" onClick={() => handleOpenDetail(t)}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL XEM CHI TIẾT GIAO DỊCH */}
            <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="primary.main">
                    🧾 Chi Tiết Giao Dịch Đối Soát
                </DialogTitle>
                <DialogContent dividers>
                    {selectedTxn && (
                        <Stack spacing={1.8}>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Mã giao dịch hệ thống:</Typography>
                                <Typography variant="body2" fontWeight="bold">{selectedTxn.transactionId}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Mã tham chiếu ngân hàng (TxnRef):</Typography>
                                <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "monospace" }}>{selectedTxn.vnpayTxnRef}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Người nộp tiền:</Typography>
                                <Typography variant="body2" fontWeight="bold">{selectedTxn.accountName}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Kênh thanh toán & Ngân hàng:</Typography>
                                <Typography variant="body2" fontWeight="bold">{selectedTxn.paymentChannel} ({selectedTxn.bankCode || "NCB"})</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Nội dung chuyển khoản:</Typography>
                                <Typography variant="body2">{selectedTxn.description}</Typography>
                            </Box>
                            <Divider />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1" fontWeight="bold">Số tiền thanh toán:</Typography>
                                <Typography variant="h6" fontWeight="bold" color="success.main">{formatCurrency(selectedTxn.amount)}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Trạng thái xử lý:</Typography>
                                <Chip
                                    label={selectedTxn.status === "SUCCESS" ? "GIAO DỊCH THÀNH CÔNG" : "LỖI GIAO DỊCH"}
                                    color={selectedTxn.status === "SUCCESS" ? "success" : "error"}
                                    size="small"
                                    sx={{ fontWeight: "bold" }}
                                />
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDetailModal(false)}>Đóng</Button>
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
                    >
                        In Biên Lai Chứng Từ
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
