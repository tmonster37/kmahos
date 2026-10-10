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
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { printReceipt } from "../../utils/printHelper";

export default function MedicalBillsPage() {
    const [tabIndex, setTabIndex] = useState(0);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [vnpayUrl, setVnpayUrl] = useState("");
    const [generatingUrl, setGeneratingUrl] = useState(false);

    useEffect(() => {
        loadBills();
    }, []);

    const loadBills = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/api/bookings/my-bookings");
            const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setBookings(list);
        } catch (err) {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateVNPayPayment = async (booking) => {
        setSelectedBill(booking);
        setGeneratingUrl(true);
        setPaymentModalOpen(true);
        try {
            const amount = booking.price || 200000;
            const res = await axiosInstance.post(`/api/payment/vnpay/create-url?amount=${amount}&type=PAY_BOOKING`);
            const url = typeof res === "string" ? res : (res.data || res.paymentUrl || "");
            setVnpayUrl(url);
        } catch (err) {
            setVnpayUrl("");
        } finally {
            setGeneratingUrl(false);
        }
    };

    const totalPaid = bookings.reduce((sum, b) => sum + (b.price || 200000), 0);

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box mb={4}>
                <Typography variant="h4" fontWeight="900" color="#002D5A" gutterBottom>
                    🧾 Hóa Đơn Viện Phí & Lịch Sử Giao Dịch
                </Typography>
                <Typography variant="body1" color="textSecondary">
                    Quản lý toàn bộ chi phí khám chữa bệnh, tiền xét nghiệm cận lâm sàng, tiền thuốc và thanh toán trực tuyến qua cổng VNPay-QR.
                </Typography>
            </Box>

            {/* Quick KPI Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#F0F9FF" }}>
                        <CardContent>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">TỔNG HÓA ĐƠN ĐÃ LẬP</Typography>
                            <Typography variant="h4" fontWeight="900" color="#0284c7" my={0.5}>
                                {bookings.length}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">Bao gồm khám và dịch vụ</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#ECFDF5" }}>
                        <CardContent>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">TỔNG CHI PHÍ KHÁM</Typography>
                            <Typography variant="h4" fontWeight="900" color="#10b981" my={0.5}>
                                {formatCurrency(totalPaid)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">Đã bao gồm thuế & khấu trừ BHYT</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FEF3C7" }}>
                        <CardContent>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">HỖ TRỢ BẢO HIỂM</Typography>
                            <Typography variant="h4" fontWeight="900" color="#D97706" my={0.5}>
                                80% - 100%
                            </Typography>
                            <Typography variant="caption" color="textSecondary">Áp dụng đúng tuyến BHYT</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
                        <CardContent>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">CỔNG THANH TOÁN</Typography>
                            <Typography variant="h5" fontWeight="900" color="#002D5A" my={0.5}>
                                VNPay-QR 24/7
                            </Typography>
                            <Typography variant="caption" color="textSecondary">Chiết khấu tức thì 0% phí GD</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Table Bills */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold" color="#002D5A">
                        Danh Sách Viện Phí & Phiếu Khám
                    </Typography>
                    <Button variant="outlined" size="small" onClick={loadBills}>
                        Làm mới danh sách
                    </Button>
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
                ) : bookings.length === 0 ? (
                    <Alert severity="info" sx={{ my: 2 }}>Bạn chưa có hóa đơn hoặc giao dịch viện phí nào.</Alert>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                <TableRow>
                                    <TableCell><b>Mã hóa đơn / Phiếu</b></TableCell>
                                    <TableCell><b>Bệnh nhân</b></TableCell>
                                    <TableCell><b>Chuyên khoa & Bác sĩ</b></TableCell>
                                    <TableCell><b>Ngày khám</b></TableCell>
                                    <TableCell><b>Số tiền</b></TableCell>
                                    <TableCell align="center"><b>Trạng thái</b></TableCell>
                                    <TableCell align="center"><b>Hành động</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bookings.map((b) => (
                                    <TableRow key={b.bookingId} hover>
                                        <TableCell>
                                            <Typography fontWeight="bold" color="#0ea5e9">{b.bookingCode}</Typography>
                                            <Typography variant="caption" color="textSecondary">Số thứ tự: #{b.queueNumber}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontWeight="bold">{b.patientName}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography>{b.departmentName}</Typography>
                                            <Typography variant="caption" color="textSecondary">BS. {b.doctorName || "Đang phân công"}</Typography>
                                        </TableCell>
                                        <TableCell>{formatDate(b.bookingDate)} ({b.startTime || "N/A"})</TableCell>
                                        <TableCell>
                                            <Typography fontWeight="bold" color="success.main">
                                                {formatCurrency(b.price || 200000)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={b.status === "COMPLETED" ? "Đã khám" : b.status === "CONFIRMED" ? "Đã xác nhận" : "Chờ xử lý"}
                                                color={b.status === "COMPLETED" ? "success" : "primary"}
                                                size="small"
                                                sx={{ fontWeight: "bold" }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box display="flex" gap={1} justifyContent="center">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="error"
                                                    startIcon={<PaymentIcon />}
                                                    onClick={() => handleCreateVNPayPayment(b)}
                                                    sx={{ borderRadius: 2, fontWeight: "bold" }}
                                                >
                                                    VNPay
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    startIcon={<PrintIcon />}
                                                    onClick={() => printReceipt({
                                                        receiptCode: `RC-${b.bookingCode}`,
                                                        patientName: b.patientName || "Bệnh nhân YouMed TNT",
                                                        phoneNumber: b.patientPhone || "---",
                                                        departmentName: b.departmentName || "Khoa Khám Bệnh",
                                                        doctorName: b.doctorName || "Bác sĩ phụ trách",
                                                        items: [
                                                            { name: `Phiếu khám ${b.departmentName || "Chuyên khoa"}`, qty: 1, price: b.price || 200000 }
                                                        ],
                                                        totalAmount: b.price || 200000,
                                                        paymentMethod: b.paymentStatus === "PAID" ? "VIETQR" : "CASH",
                                                        paidAt: b.bookingDate,
                                                        cashierName: "Hệ thống Quản Trị Viện Phí TNT"
                                                    })}
                                                    sx={{ borderRadius: 2 }}
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
            </Paper>

            {/* Modal Thanh toán VNPay */}
            <Dialog open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="#002D5A">
                    💳 Cổng Thanh Toán VNPay-QR Trực Tuyến
                </DialogTitle>
                <DialogContent dividers sx={{ textAlign: "center", py: 4 }}>
                    {generatingUrl ? (
                        <Box py={4}>
                            <CircularProgress />
                            <Typography mt={2}>Đang tạo liên kết thanh toán an toàn...</Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="h6" fontWeight="bold" color="#002D5A">
                                Hóa đơn: {selectedBill?.bookingCode}
                            </Typography>
                            <Typography variant="h4" fontWeight="900" color="error.main" my={1.5}>
                                {formatCurrency(selectedBill?.price || 200000)}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mb={3}>
                                Quét mã QR bằng ứng dụng Ngân hàng (Vietcombank, MB, BIDV, Techcombank...) hoặc ví VNPAY để hoàn tất thanh toán.
                            </Typography>

                            {vnpayUrl ? (
                                <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                                    <Button
                                        component="a"
                                        href={vnpayUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        variant="contained"
                                        color="error"
                                        size="large"
                                        sx={{ py: 1.5, px: 4, borderRadius: 3, fontWeight: "bold" }}
                                    >
                                        👉 Chuyển Đến Cổng VNPay Để Thanh Toán
                                    </Button>
                                </Box>
                            ) : (
                                <Alert severity="info">Không thể kết nối cổng VNPay Sandbox. Vui lòng thanh toán trực tiếp tại quầy tiếp đón.</Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setPaymentModalOpen(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
