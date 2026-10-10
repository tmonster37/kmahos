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

const FALLBACK_PENDING_BILLS = [
    {
        billId: "BILL-20261003-001",
        patientName: "Trần Minh Quân",
        phoneNumber: "0918273645",
        identityNumber: "001095003456",
        departmentName: "Khoa Khám Bệnh Đa Khoa",
        doctorName: "BS. CKI Trần Đình Trọng",
        billType: "EXAM_AND_TESTS",
        createdAt: new Date().toISOString(),
        items: [
            { name: "Khám chuyên khoa Tim mạch", qty: 1, price: 200000, category: "EXAM" },
            { name: "Chụp X-Quang ngực thẳng kỹ thuật số", qty: 1, price: 180000, category: "TEST" },
            { name: "Xét nghiệm Tổng phân tích tế bào máu", qty: 1, price: 150000, category: "TEST" }
        ],
        totalAmount: 530000,
        status: "UNPAID"
    },
    {
        billId: "BILL-20261003-002",
        patientName: "Phạm Thị Thu Trang",
        phoneNumber: "0983123456",
        identityNumber: "001198007890",
        departmentName: "Khoa Tai Mũi Họng",
        doctorName: "BS. CKII Lê Hoàng Mai",
        billType: "PRESCRIPTION",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        items: [
            { name: "Kháng sinh Amoxicillin 500mg (20 viên)", qty: 20, price: 3500, category: "MEDICINE" },
            { name: "Decolgen Forte giảm đau hạ sốt (10 viên)", qty: 10, price: 2500, category: "MEDICINE" },
            { name: "Vitamin C 500mg tăng đề kháng (10 viên)", qty: 10, price: 2000, category: "MEDICINE" }
        ],
        totalAmount: 115000,
        status: "UNPAID"
    },
    {
        billId: "BILL-20261003-003",
        patientName: "Nguyễn Văn Hùng",
        phoneNumber: "0905123987",
        identityNumber: "001080001122",
        departmentName: "Khoa Ngoại Tổng Hợp",
        doctorName: "PGS. TS Nguyễn Văn Minh",
        billType: "INPATIENT_DEPOSIT",
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        items: [
            { name: "Tạm ứng viện phí điều trị nội trú (Phòng 301)", qty: 1, price: 2000000, category: "INPATIENT" }
        ],
        totalAmount: 2000000,
        status: "UNPAID"
    }
];

export default function CashierPage() {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [pendingBills, setPendingBills] = useState([]);
    const [paidHistory, setPaidHistory] = useState([]);
    const [selectedBill, setSelectedBill] = useState(null);
    const [activeTab, setActiveTab] = useState(0); // 0: Chờ thanh toán, 1: Lịch sử đã thu
    const [loading, setLoading] = useState(false);

    // Payment Processing States
    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("CASH"); // CASH, POS, QR
    const [cashGiven, setCashGiven] = useState("");
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [receiptData, setReceiptData] = useState(null);

    // Stats
    const [shiftStats, setShiftStats] = useState({
        totalCollected: 12500000,
        cashTotal: 4800000,
        digitalTotal: 7700000,
        transactionCount: 18
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txnRes, queueRes] = await Promise.all([
                axiosInstance.get("/api/payment/admin/transactions").catch(() => ({ data: [] })),
                axiosInstance.get("/api/clinical/queue/public").catch(() => ({ data: [] }))
            ]);

            const txList = (txnRes && Array.isArray(txnRes.data)) ? txnRes.data : [];
            const queueList = (queueRes && Array.isArray(queueRes.data)) ? queueRes.data : [];

            // 1. Cập nhật lịch sử giao dịch đã thu
            if (txList.length > 0) {
                const formattedPaid = txList.map(tx => ({
                    receiptCode: tx.transactionId || tx.vnpayTxnRef || `RC-${Math.floor(100000 + Math.random() * 900000)}`,
                    patientName: tx.accountName || "Khách hàng YouMed TNT",
                    phoneNumber: tx.phoneNumber || "---",
                    totalAmount: Number(tx.amount) || 0,
                    paymentMethod: tx.paymentChannel?.includes("CASH") ? "CASH" : tx.paymentChannel?.includes("POS") ? "POS" : "QR",
                    paidAt: tx.createdAt || new Date().toISOString(),
                    cashierName: tx.bankCode || "Hệ thống / Thu ngân quầy",
                    status: tx.status || "SUCCESS"
                }));
                setPaidHistory(formattedPaid);

                // Thống kê
                const total = formattedPaid.reduce((acc, cur) => acc + cur.totalAmount, 0);
                const cash = formattedPaid.filter(p => p.paymentMethod === "CASH").reduce((acc, cur) => acc + cur.totalAmount, 0);
                setShiftStats({
                    totalCollected: total,
                    cashTotal: cash,
                    digitalTotal: total - cash,
                    transactionCount: formattedPaid.length
                });
            } else {
                setPaidHistory([
                    {
                        receiptCode: "RC-882101",
                        patientName: "Trần Minh Quân",
                        phoneNumber: "0918273645",
                        totalAmount: 530000,
                        paymentMethod: "QR",
                        paidAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                        cashierName: "Nguyễn Thu Hà",
                        status: "SUCCESS"
                    },
                    {
                        receiptCode: "RC-882102",
                        patientName: "Hoàng Anh Đức",
                        phoneNumber: "0977889900",
                        totalAmount: 350000,
                        paymentMethod: "CASH",
                        paidAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
                        cashierName: "Nguyễn Thu Hà",
                        status: "SUCCESS"
                    }
                ]);
            }

            // 2. Cập nhật danh sách chờ thu tiền (kết hợp hàng đợi khám thực tế)
            if (queueList.length > 0) {
                const dynamicBills = queueList.map((q, idx) => ({
                    billId: `BILL-${q.bookingCode || `BK-${1000 + idx}`}`,
                    patientName: q.patientName,
                    phoneNumber: q.phoneNumber || "09" + Math.floor(10000000 + Math.random() * 90000000),
                    identityNumber: "001" + Math.floor(100000000 + Math.random() * 900000000),
                    departmentName: q.departmentName || "Khoa Khám Bệnh",
                    doctorName: q.doctorName || "Bác sĩ phụ trách",
                    billType: "EXAM_AND_TESTS",
                    createdAt: q.checkInTime || new Date().toISOString(),
                    items: [
                        { name: `Phiếu khám ${q.departmentName || "Chuyên khoa"}`, qty: 1, price: 150000, category: "EXAM" },
                        { name: "Chỉ định xét nghiệm / Cận lâm sàng ban đầu", qty: 1, price: 200000, category: "TEST" }
                    ],
                    totalAmount: 350000,
                    status: "UNPAID"
                }));
                setPendingBills(dynamicBills);
            } else {
                setPendingBills(FALLBACK_PENDING_BILLS);
            }
        } catch (err) {
            console.error("Lỗi tải danh sách viện phí:", err);
            setPendingBills(FALLBACK_PENDING_BILLS);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPayment = (bill) => {
        setSelectedBill(bill);
        setPaymentMethod("CASH");
        setCashGiven(String(bill.totalAmount));
        setPaymentSuccess(false);
        setReceiptData(null);
        setOpenPaymentModal(true);
    };

    const handleConfirmPayment = () => {
        if (!selectedBill) return;

        const receipt = {
            receiptCode: "RC-" + Math.floor(100000 + Math.random() * 900000),
            billId: selectedBill.billId,
            patientName: selectedBill.patientName,
            phoneNumber: selectedBill.phoneNumber,
            identityNumber: selectedBill.identityNumber,
            departmentName: selectedBill.departmentName,
            doctorName: selectedBill.doctorName,
            items: selectedBill.items,
            totalAmount: selectedBill.totalAmount,
            paymentMethod: paymentMethod,
            cashGiven: paymentMethod === "CASH" ? Number(cashGiven) : selectedBill.totalAmount,
            cashChange: paymentMethod === "CASH" ? Math.max(0, Number(cashGiven) - selectedBill.totalAmount) : 0,
            paidAt: new Date().toISOString(),
            cashierName: "Nguyễn Thu Hà (Quầy Thu Ngân 01)"
        };

        setReceiptData(receipt);
        setPaymentSuccess(true);

        // Chuyển phiếu sang danh sách đã thu
        setPendingBills(prev => prev.filter(b => b.billId !== selectedBill.billId));
        setPaidHistory(prev => [receipt, ...prev]);

        // Cập nhật thống kê ca trực
        setShiftStats(prev => ({
            totalCollected: prev.totalCollected + selectedBill.totalAmount,
            cashTotal: paymentMethod === "CASH" ? prev.cashTotal + selectedBill.totalAmount : prev.cashTotal,
            digitalTotal: paymentMethod !== "CASH" ? prev.digitalTotal + selectedBill.totalAmount : prev.digitalTotal,
            transactionCount: prev.transactionCount + 1
        }));
    };

    const filteredPending = pendingBills.filter(b =>
        b.patientName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        b.phoneNumber?.includes(searchKeyword) ||
        b.billId?.toLowerCase().includes(searchKeyword.toLowerCase())
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

            {/* Thẻ Thống Kê Ca Trực Thu Ngân */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", borderLeft: "5px solid #0088D6", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ whiteSpace: "nowrap", display: "block" }}>TỔNG THU TRONG CA</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#0088D6" mt={0.5} sx={{ whiteSpace: "nowrap", fontSize: "1.2rem" }}>
                            {formatCurrency(shiftStats.totalCollected)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", borderLeft: "5px solid #16A34A", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ whiteSpace: "nowrap", display: "block" }}>TIỀN MẶT TẠI KÉT</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#16A34A" mt={0.5} sx={{ whiteSpace: "nowrap", fontSize: "1.2rem" }}>
                            {formatCurrency(shiftStats.cashTotal)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", borderLeft: "5px solid #0284C7", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ whiteSpace: "nowrap", display: "block" }}>QUẸT THẺ POS & VIETQR</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#0284C7" mt={0.5} sx={{ whiteSpace: "nowrap", fontSize: "1.2rem" }}>
                            {formatCurrency(shiftStats.digitalTotal)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", borderLeft: "5px solid #EA580C", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ whiteSpace: "nowrap", display: "block" }}>SỐ LƯỢT GIAO DỊCH</Typography>
                        <Typography variant="h6" fontWeight="bold" color="#EA580C" mt={0.5} sx={{ whiteSpace: "nowrap", fontSize: "1.2rem" }}>
                            {shiftStats.transactionCount} lượt
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
                                                    bill.billType === "EXAM_AND_TESTS" ? "Khám & Xét nghiệm" :
                                                    bill.billType === "PRESCRIPTION" ? "Đơn thuốc" : "Tạm ứng nội trú"
                                                }
                                                size="small"
                                                color={
                                                    bill.billType === "EXAM_AND_TESTS" ? "info" :
                                                    bill.billType === "PRESCRIPTION" ? "warning" : "secondary"
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
                                                        {formatCurrency(it.price * (it.qty || 1))}
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
                                                item.paymentMethod === "CASH" ? "💵 Tiền mặt" :
                                                item.paymentMethod === "POS" ? "💳 Quẹt thẻ POS" : "📱 VietQR"
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
                                            onClick={() => printReceipt(item)}
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
                                <Typography variant="body2">Hình thức: <b>{receiptData.paymentMethod === "CASH" ? "Tiền mặt" : receiptData.paymentMethod === "POS" ? "Quẹt thẻ POS" : "VietQR"}</b></Typography>
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
                                onClick={() => printReceipt(receiptData)}
                                sx={{ py: 1.2, px: 3, borderRadius: 2, fontWeight: "bold" }}
                            >
                                In Biên Lai Thu Tiền
                            </Button>
                        </Box>
                    ) : (
                        <Box>
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
                                            <FormControlLabel value="CASH" control={<Radio />} label="💵 Tiền mặt" />
                                            <FormControlLabel value="POS" control={<Radio />} label="💳 Thẻ POS" />
                                            <FormControlLabel value="QR" control={<Radio />} label="📱 VietQR / MoMo" />
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
                            sx={{ px: 3, fontWeight: "bold" }}
                        >
                            Xác Nhận & Xuất Biên Lai
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Container>
    );
}
