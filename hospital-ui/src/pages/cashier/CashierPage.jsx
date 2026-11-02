import React, { useState, useEffect, useRef } from "react";
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
    CircularProgress,
    ToggleButton,
    ToggleButtonGroup
} from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReconciliationModal from "./ReconciliationModal";
import designTokens from "../../theme/designTokens";
import SearchIcon from "@mui/icons-material/Search";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RefreshIcon from "@mui/icons-material/Refresh";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import MedicationIcon from "@mui/icons-material/Medication";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SyncIcon from "@mui/icons-material/Sync";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import CheckIcon from "@mui/icons-material/Check";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import CloseIcon from "@mui/icons-material/Close";
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
    const [billTypeFilter, setBillTypeFilter] = useState("ALL"); // ALL, EXAM, TREATMENT
    const [viewMode, setViewMode] = useState("TABLE"); // TABLE (Bảng danh sách), GRID (Thẻ thẻ)
    const [shiftFilter, setShiftFilter] = useState("ALL"); // ALL, MORNING, AFTERNOON, EVENING
    const [openReconciliationModal, setOpenReconciliationModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [pageError, setPageError] = useState("");

    // Payment Processing States
    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("CASH"); // CASH, QR (PayOS), POS
    const [cashGiven, setCashGiven] = useState("");
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [qrImgError, setQrImgError] = useState(false);

    // PayOS Real-time States
    const [payosData, setPayosData] = useState(null);
    const [payosLoading, setPayosLoading] = useState(false);
    const [payosSyncing, setPayosSyncing] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const pollingTimerRef = useRef(null);

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

    // Cleanup polling timer khi unmount
    useEffect(() => {
        return () => {
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
            }
        };
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
        }

        // 2. Tải lịch sử giao dịch thu ngân
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
            console.error("Lỗi tải lịch sử giao dịch:", err);
            const msg = err.message || err.response?.data?.message || "Không thể tải lịch sử giao dịch từ máy chủ.";
            setHistoryError(msg);
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

    // Khởi tạo link thanh toán PayOS thật từ cổng Open Banking
    const initPayOSPayment = async (bill) => {
        if (!bill) return;
        setPayosLoading(true);
        setPayosData(null);
        setQrImgError(false);

        try {
            const targetBookingCode = bill.billId || bill.bookingCode;
            const res = await axiosInstance.post("/api/payment/payos/create-link", {
                amount: bill.totalAmount,
                type: targetBookingCode?.startsWith('BILL-INPATIENT-') ? "PAY_INPATIENT_FEE" : "PAY_BOOKING",
                description: `VP ${targetBookingCode}`
            });

            const gatewayData = res.data?.data || res.data;
            if (gatewayData) {
                setPayosData(gatewayData);
                // Bắt đầu polling theo dõi trạng thái thanh toán thời gian thực
                startPollingPayOS(gatewayData.txnRef, bill);
            }
        } catch (err) {
            console.error("Lỗi khởi tạo link PayOS:", err);
            setPayosData(null);
            const msg = err.response?.data?.message || err.message || "Không thể khởi tạo cổng PayOS. Vui lòng thử lại hoặc chọn Tiền mặt / POS.";
            setErrorMessage(msg);
        } finally {
            setPayosLoading(false);
        }
    };

    // Polling tự động kiểm tra giao dịch PayOS mỗi 2.5s
    const startPollingPayOS = (txnRef, bill) => {
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
        }

        if (!txnRef) return;

        pollingTimerRef.current = setInterval(async () => {
            if (typeof document !== "undefined" && document.hidden) return;
            try {
                const statusRes = await axiosInstance.get(`/api/payment/status/${txnRef}`);
                const statusData = statusRes.data?.data || statusRes.data;

                if (statusData && statusData.status === "SUCCESS") {
                    clearInterval(pollingTimerRef.current);
                    pollingTimerRef.current = null;
                    // Tự động hoàn tất thu ngân và xuất biên lai
                    await finalizeDigitalPayment(bill, "PAYOS", statusData.vnpayTxnRef || txnRef);
                }
            } catch (pollErr) {
                // Polling thầm lặng, không spam lỗi
                console.warn("[PayOS Polling] Kiểm tra trạng thái:", pollErr?.message);
            }
        }, 2500);
    };

    // Nút chủ động Đồng bộ ngay từ cổng PayOS Open Banking
    const handleSyncPayOS = async () => {
        if (!payosData?.orderCode) return;
        setPayosSyncing(true);
        setErrorMessage("");

        try {
            const syncRes = await axiosInstance.post(`/api/payment/payos/sync/${payosData.orderCode}`);
            const syncData = syncRes.data?.data || syncRes.data;

            if (syncData && syncData.status === "SUCCESS") {
                if (pollingTimerRef.current) {
                    clearInterval(pollingTimerRef.current);
                }
                await finalizeDigitalPayment(selectedBill, "PAYOS", syncData.vnpayTxnRef || payosData.txnRef);
            } else {
                setErrorMessage("Cổng PayOS chưa nhận được biến động số dư. Vui lòng kiểm tra lại sau khi người bệnh bấm chuyển khoản.");
            }
        } catch (err) {
            console.error("Lỗi đồng bộ PayOS:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi đồng bộ giao dịch từ PayOS.";
            setErrorMessage(msg);
        } finally {
            setPayosSyncing(false);
        }
    };

    // Hoàn tất biên lai khi phát hiện giao dịch số thành công
    const finalizeDigitalPayment = async (bill, method, txnRef) => {
        if (!bill) return;
        setSubmitting(true);
        setErrorMessage("");

        try {
            const targetBookingCode = bill.billId || bill.bookingCode;
            const res = await axiosInstance.post("/api/cashier/pay", {
                bookingCode: targetBookingCode,
                paymentMethod: method || "PAYOS",
                amountGiven: Number(bill.totalAmount),
                notes: `Thanh toán thành công qua ${method} (Mã GD: ${txnRef || "N/A"})`
            });

            const receipt = res.data?.data || res.data;
            setReceiptData(receipt);
            setPaymentSuccess(true);
            await loadData();
        } catch (err) {
            console.error("Lỗi hoàn tất thanh toán số:", err);
            const msg = err.response?.data?.message || err.message || "Lỗi cập nhật biên lai.";
            setErrorMessage(msg);
        } finally {
            setSubmitting(false);
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
        setPayosData(null);
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
        }
        setOpenPaymentModal(true);
    };

    const handleClosePaymentModal = () => {
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
        }
        setOpenPaymentModal(false);
    };

    const handleMethodChange = (newMethod) => {
        setPaymentMethod(newMethod);
        setErrorMessage("");
        if (newMethod === "QR") {
            if (!payosData && selectedBill) {
                initPayOSPayment(selectedBill);
            }
        } else {
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
            }
        }
    };

    const handleConfirmPayment = async () => {
        if (!selectedBill) return;

        setSubmitting(true);
        setErrorMessage("");

        try {
            const methodToSend = paymentMethod === "QR" ? "PAYOS" : paymentMethod;
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
            if (pollingTimerRef.current) {
                clearInterval(pollingTimerRef.current);
            }
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

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(String(text)).then(() => {
                setCopiedField(fieldName);
                setTimeout(() => setCopiedField(null), 2000);
            }).catch(() => {});
        } else {
            try {
                const ta = document.createElement("textarea");
                ta.value = String(text);
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                setCopiedField(fieldName);
                setTimeout(() => setCopiedField(null), 2000);
            } catch {}
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

    // Đếm số lượng theo loại hóa đơn
    const examBillsCount = pendingBills.filter(b => b.billId?.endsWith("-EXAM")).length;
    const treatmentBillsCount = pendingBills.filter(b => b.billId?.endsWith("-TREATMENT") || b.billType === "TEST" || b.billType === "PRESCRIPTION").length;
    const inpatientBillsCount = pendingBills.filter(b => b.billId?.startsWith("BILL-INPATIENT-") || b.billType === "INPATIENT").length;

    // Lọc danh sách chờ thu
    const filteredPending = pendingBills.filter(b => {
        const matchesSearch = !searchKeyword ||
            b.patientName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            b.phoneNumber?.includes(searchKeyword) ||
            b.billId?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            b.bookingCode?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (b.identityNumber && b.identityNumber.includes(searchKeyword));

        if (!matchesSearch) return false;

        if (billTypeFilter === "EXAM") {
            return b.billId?.endsWith("-EXAM");
        }
        if (billTypeFilter === "TREATMENT") {
            return b.billId?.endsWith("-TREATMENT") || b.billType === "TEST" || b.billType === "PRESCRIPTION" || b.billType === "ALL";
        }
        if (billTypeFilter === "INPATIENT") {
            return b.billId?.startsWith("BILL-INPATIENT-") || b.billType === "INPATIENT";
        }
        return true;
    });

    // Lọc lịch sử
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
        const qrItems = filteredHistory.filter(p => p.paymentMethod === "VIETQR" || p.paymentMethod === "PAYOS" || p.paymentMethod === "QR");
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
            {/* Header Banner Cao Cấp (Apple HIG + Linear) */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)",
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
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: "#0088D6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <PointOfSaleIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" fontWeight={800} color="#0F172A" letterSpacing="-0.02em">
                                Quầy Thu Ngân & Viện Phí Điện Tử
                            </Typography>
                            <Chip
                                label="PayOS VietQR Napas 247"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(16, 185, 129, 0.1)",
                                    color: "#059669",
                                    border: "1px solid rgba(16, 185, 129, 0.2)"
                                }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.2 }}>
                            Tiếp nhận thanh toán viện phí tức thì: Tiền mặt tại quầy, Thẻ POS & Cổng Open Banking PayOS tự động gạch nợ.
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1.2} alignItems="center">
                    <Button
                        variant="outlined"
                        size="small"
                        sx={{
                            borderRadius: 2.2,
                            borderColor: "rgba(245, 158, 11, 0.4)",
                            color: "#B45309",
                            bgcolor: "#FFFBEB",
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            px: 1.8,
                            "&:hover": { bgcolor: "#FEF3C7", borderColor: "#F59E0B" }
                        }}
                        startIcon={<AssessmentIcon />}
                        onClick={() => setOpenReconciliationModal(true)}
                    >
                        Đối Soát Ca Trực
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        sx={{
                            borderRadius: 2.2,
                            bgcolor: "#0088D6",
                            color: "white",
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            px: 2,
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                            "&:hover": { bgcolor: "#0073B7" }
                        }}
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
                        disabled={loading}
                    >
                        {loading ? "Đang tải..." : "Làm Mới"}
                    </Button>
                </Box>
            </Paper>

            {pageError && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
                    {pageError}
                </Alert>
            )}

            {pendingError && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2.5 }}>
                    {pendingError}
                </Alert>
            )}

            {/* Thẻ Thống Kê Ca Trực Thu Ngân (Apple HIG Metric Cards) */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: "#0088D6" }} />
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", display: "block" }}>
                            TỔNG THU TRONG CA
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#0088D6", mt: 0.8 }}>
                            {shiftStats.hasError ? "--" : formatCurrency(shiftStats.totalCollected)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: "#10B981" }} />
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", display: "block" }}>
                            TIỀN MẶT TẠI KÉT
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#059669", mt: 0.8 }}>
                            {shiftStats.hasError ? "--" : formatCurrency(shiftStats.cashTotal)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: "#6366F1" }} />
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", display: "block" }}>
                            CỔNG PAYOS & THẺ POS
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#4F46E5", mt: 0.8 }}>
                            {shiftStats.hasError ? "--" : formatCurrency(shiftStats.digitalTotal)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: "#F59E0B" }} />
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", display: "block" }}>
                            SỐ LƯỢT GIAO DỊCH
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#D97706", mt: 0.8 }}>
                            {shiftStats.hasError ? "--" : `${shiftStats.transactionCount} lượt`}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Thanh Điều Hướng & Tìm Kiếm */}
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    sx={{
                        "& .MuiTabs-indicator": {
                            height: 3,
                            borderRadius: 3,
                            bgcolor: "#0088D6"
                        }
                    }}
                >
                    <Tab
                        label={`Chờ Thu Tiền (${pendingBills.length})`}
                        icon={<ReceiptLongIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        sx={{
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.9rem",
                            color: activeTab === 0 ? "#0088D6 !important" : "#64748B"
                        }}
                    />
                    <Tab
                        label={`Lịch Sử Đã Thu (${paidHistory.length})`}
                        icon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                        sx={{
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.9rem",
                            color: activeTab === 1 ? "#0088D6 !important" : "#64748B"
                        }}
                    />
                </Tabs>

                <TextField
                    size="small"
                    placeholder="Quét mã vạch hoặc tìm Tên BN, SĐT, Mã phiếu..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    sx={{
                        width: { xs: "100%", md: 380 },
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 2.2,
                            bgcolor: "#F8FAFC"
                        }
                    }}
                    helperText={activeTab === 0 && filteredPending.length === 1 ? "💡 Nhấn [Enter] để mở ngay phiếu thu" : ""}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: "#94A3B8" }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {/* TAB 0: DANH SÁCH VIỆN PHÍ CHỜ THU TIỀN */}
            {activeTab === 0 && (
                <Box>
                    {/* Thanh Công Cụ Bộ Lọc & Chuyển Đổi View Mode */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={2.5}>
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="body2" fontWeight="bold" color="text.secondary">
                                Phân loại hóa đơn:
                            </Typography>
                            <Chip
                                label={`Tất Cả (${pendingBills.length})`}
                                clickable
                                color={billTypeFilter === "ALL" ? "primary" : "default"}
                                variant={billTypeFilter === "ALL" ? "filled" : "outlined"}
                                onClick={() => setBillTypeFilter("ALL")}
                                sx={{ fontWeight: "bold" }}
                            />
                            <Chip
                                label={`HĐ 01: Công Khám (${examBillsCount})`}
                                clickable
                                color={billTypeFilter === "EXAM" ? "primary" : "default"}
                                variant={billTypeFilter === "EXAM" ? "filled" : "outlined"}
                                onClick={() => setBillTypeFilter("EXAM")}
                                sx={{ fontWeight: "bold" }}
                            />
                            <Chip
                                label={`HĐ 02: Cận Lâm Sàng & Thuốc (${treatmentBillsCount})`}
                                clickable
                                color={billTypeFilter === "TREATMENT" ? "secondary" : "default"}
                                variant={billTypeFilter === "TREATMENT" ? "filled" : "outlined"}
                                onClick={() => setBillTypeFilter("TREATMENT")}
                                sx={{ fontWeight: "bold" }}
                            />
                            <Chip
                                label={`HĐ 03: Xuất Viện Nội Trú (${inpatientBillsCount})`}
                                clickable
                                color={billTypeFilter === "INPATIENT" ? "warning" : "default"}
                                variant={billTypeFilter === "INPATIENT" ? "filled" : "outlined"}
                                onClick={() => setBillTypeFilter("INPATIENT")}
                                sx={{ fontWeight: "bold" }}
                            />
                        </Box>

                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">CHẾ ĐỘ HIỂN THỊ:</Typography>
                            <ToggleButtonGroup
                                size="small"
                                value={viewMode}
                                exclusive
                                onChange={(_, nextView) => { if (nextView) setViewMode(nextView); }}
                            >
                                <ToggleButton value="TABLE" sx={{ fontWeight: "bold", px: 1.5 }}>
                                    <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> Dạng Bảng
                                </ToggleButton>
                                <ToggleButton value="GRID" sx={{ fontWeight: "bold", px: 1.5 }}>
                                    <ViewModuleIcon fontSize="small" sx={{ mr: 0.5 }} /> Dạng Thẻ
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    </Box>

                    {loading ? (
                        <Box textAlign="center" py={6}>
                            <CircularProgress size={36} />
                            <Typography variant="body2" color="text.secondary" mt={1}>Đang đồng bộ danh sách viện phí...</Typography>
                        </Box>
                    ) : filteredPending.length === 0 ? (
                        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
                            <CheckCircleIcon sx={{ fontSize: 52, color: "success.main", mb: 1.5 }} />
                            <Typography variant="h6" color="text.secondary" fontWeight="bold">
                                Không có phiếu viện phí nào đang chờ thu tiền!
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                                Tất cả ca khám đã được thanh toán hoặc chưa có chỉ định phát sinh từ bác sĩ.
                            </Typography>
                        </Paper>
                    ) : viewMode === "TABLE" ? (
                        /* CHẾ ĐỘ DẠNG BẢNG (TABLE VIEW - TỐI ƯU POS & THAO TÁC NHANH) */
                        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
                            <Table sx={{ minWidth: 800 }}>
                                <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>Mã Phiếu & Loại HĐ</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>Bệnh Nhân</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>Khoa & Bác Sĩ</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>Danh Mục Khoản Thu</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: "bold", color: "#334155" }}>Số Tiền Phải Thu</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: "bold", color: "#334155" }}>Thao Tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredPending.map((bill) => {
                                        const isExam = bill.billId?.endsWith("-EXAM");
                                        const isTreatment = bill.billId?.endsWith("-TREATMENT");
                                        const isInpatient = bill.billId?.startsWith("BILL-INPATIENT-") || bill.billType === "INPATIENT";

                                        return (
                                            <TableRow key={bill.billId} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                        {bill.billId}
                                                    </Typography>
                                                    <Chip
                                                        label={
                                                            isInpatient ? "HĐ 03: Viện phí nội trú" :
                                                            isExam ? "HĐ 01: Khám ban đầu" :
                                                            isTreatment ? "HĐ 02: CLS & Thuốc" :
                                                            bill.billType === "ALL" ? "Khám & CLS & Thuốc" : "Viện phí ca khám"
                                                        }
                                                        size="small"
                                                        color={isInpatient ? "warning" : isExam ? "primary" : isTreatment ? "secondary" : "info"}
                                                        sx={{ fontWeight: "bold", fontSize: "0.7rem", height: 22, mt: 0.5 }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Avatar sx={{ width: 34, height: 34, bgcolor: "#E0F2FE", color: "#0369A1", fontSize: "0.85rem", fontWeight: "bold" }}>
                                                            {bill.patientName?.charAt(0) || "P"}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="bold" color="#0F766E">
                                                                {bill.patientName}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                SĐT: <b>{bill.phoneNumber}</b> {bill.identityNumber ? `• CCCD: ${bill.identityNumber}` : ""}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">{bill.departmentName || "Khoa Khám Bệnh"}</Typography>
                                                    <Typography variant="caption" color="text.secondary">BS: {bill.doctorName || "Bác sĩ phụ trách"}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Stack spacing={0.3}>
                                                        {bill.items?.slice(0, 2).map((it, idx) => (
                                                            <Typography key={idx} variant="caption" noWrap sx={{ maxWidth: 220, display: "block" }}>
                                                                • {it.name} ({it.qty || it.quantity || 1} {it.unit || "lượt"})
                                                            </Typography>
                                                        ))}
                                                        {bill.items?.length > 2 && (
                                                            <Tooltip title={bill.items.map(i => `${i.name}: ${formatCurrency(i.totalPrice || i.price)}`).join("\n")}>
                                                                <Typography variant="caption" color="primary.main" sx={{ cursor: "pointer", fontWeight: "bold" }}>
                                                                    + {bill.items.length - 2} dịch vụ khác (di chuột xem)
                                                                </Typography>
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography variant="subtitle1" fontWeight="bold" color="error.main" sx={{ fontSize: "1.1rem" }}>
                                                        {formatCurrency(bill.totalAmount)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">Chưa thanh toán</Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        startIcon={<PointOfSaleIcon />}
                                                        onClick={() => handleOpenPayment(bill)}
                                                        sx={{
                                                            borderRadius: 2,
                                                            fontWeight: "bold",
                                                            px: 2,
                                                            py: 0.8,
                                                            bgcolor: "#0D9488",
                                                            "&:hover": { bgcolor: "#0F766E" },
                                                            whiteSpace: "nowrap"
                                                        }}
                                                    >
                                                        Thu Tiền
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        /* CHẾ ĐỘ DẠNG THẺ (CARD GRID VIEW) */
                        <Grid container spacing={3}>
                            {filteredPending.map((bill) => {
                                const isExam = bill.billId?.endsWith("-EXAM");
                                const isTreatment = bill.billId?.endsWith("-TREATMENT");
                                const isInpatient = bill.billId?.startsWith("BILL-INPATIENT-") || bill.billType === "INPATIENT";

                                return (
                                    <Grid item xs={12} md={6} lg={4} key={bill.billId}>
                                        <Card
                                            elevation={2}
                                            sx={{
                                                borderRadius: 3,
                                                borderTop: isInpatient ? "5px solid #F59E0B" : isExam ? "5px solid #0088D6" : isTreatment ? "5px solid #9333EA" : "5px solid #0D9488",
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
                                                            isInpatient ? "HĐ 03: Xuất viện nội trú" :
                                                            isExam ? "HĐ 01: Công khám" :
                                                            isTreatment ? "HĐ 02: CLS & Thuốc" : "Tổng hợp"
                                                        }
                                                        size="small"
                                                        color={isInpatient ? "warning" : isExam ? "primary" : isTreatment ? "secondary" : "default"}
                                                        sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                                                    />
                                                </Box>

                                                <Typography variant="h6" fontWeight="bold" color="#0F766E">
                                                    {bill.patientName}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    SĐT: <b>{bill.phoneNumber}</b> {bill.identityNumber ? `• CCCD: ${bill.identityNumber}` : ""}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                                                    {bill.departmentName} ({bill.doctorName})
                                                </Typography>

                                                <Divider sx={{ my: 1.5 }} />

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
                                                    startIcon={<PointOfSaleIcon />}
                                                    onClick={() => handleOpenPayment(bill)}
                                                    sx={{
                                                        borderRadius: 2.5,
                                                        py: 1.2,
                                                        fontWeight: "bold",
                                                        bgcolor: "#0D9488",
                                                        "&:hover": { bgcolor: "#0F766E" }
                                                    }}
                                                >
                                                    Thu Viện Phí & In Biên Lai
                                                </Button>
                                            </Box>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </Box>
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
                        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
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
                                                            : "📱 Cổng PayOS (VietQR)"
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

            {/* MODAL THU TIỀN & XUẤT BIÊN LAI (SẮP XẾP BỐ CỤC 2 CỘT HIỆN ĐẠI CHUẨN POS Y TẾ) */}
            <Dialog
                open={openPaymentModal}
                onClose={handleClosePaymentModal}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: "bold", color: "#0F766E", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0" }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <PointOfSaleIcon color="primary" />
                        <span>Thanh Toán Viện Phí & Xuất Biên Lai</span>
                    </Box>
                    <IconButton size="small" onClick={handleClosePaymentModal}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    {paymentSuccess && receiptData ? (
                        <Box textAlign="center" py={2}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 68, mb: 1.5 }} />
                            <Typography variant="h5" fontWeight="bold" color="success.dark">
                                Thu Viện Phí Thành Công!
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={3}>
                                Hệ thống đã ghi nhận thanh toán và cập nhật viện phí sang trạng thái <b>ĐÃ THANH TOÁN (PAID)</b>
                            </Typography>

                            <Paper variant="outlined" sx={{ p: 2.5, textAlign: "left", bgcolor: "#F8FAFC", borderRadius: 3, mb: 2.5, maxWidth: 540, mx: "auto" }}>
                                <Typography variant="subtitle2" fontWeight="bold" color="primary">Mã biên lai: {receiptData.receiptCode}</Typography>
                                <Typography variant="body2" mt={0.5}>Bệnh nhân: <b>{receiptData.patientName}</b> ({receiptData.phoneNumber})</Typography>
                                <Typography variant="body2">
                                    Phương thức: <b>{
                                        receiptData.paymentMethod === "CASH" || receiptData.paymentMethod === "COUNTER_CASH"
                                            ? "💵 Tiền mặt tại quầy"
                                            : receiptData.paymentMethod === "POS"
                                            ? "💳 Quẹt thẻ POS"
                                            : "📱 Cổng PayOS (VietQR Napas 247)"
                                    }</b>
                                </Typography>
                                <Divider sx={{ my: 1.5 }} />
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" fontWeight="bold">Tổng số tiền đã thu:</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="success.main">{formatCurrency(receiptData.totalAmount)}</Typography>
                                </Box>
                                {receiptData.paymentMethod === "CASH" && (
                                    <Box display="flex" justifyContent="space-between" mt={1}>
                                        <Typography variant="body2" color="text.secondary">Tiền thối lại:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="primary.main">{formatCurrency(receiptData.amountChange || receiptData.cashChange || 0)}</Typography>
                                    </Box>
                                )}
                            </Paper>

                            {Boolean(
                                selectedBill?.items?.some(i => i.type === 'MEDICINE' || i.itemType === 'MEDICINE' || i.category === 'MEDICINE') ||
                                selectedBill?.billType === 'MEDICINE' ||
                                selectedBill?.billType === 'ALL' ||
                                selectedBill?.prescriptionCode ||
                                receiptData?.hasMedicine
                            ) && (
                                <Alert severity="info" icon={<MedicationIcon />} sx={{ mb: 3, textAlign: "left", borderRadius: 2, maxWidth: 540, mx: "auto" }}>
                                    <b>Khoản thu có đơn thuốc ngoại trú:</b> Hướng dẫn người bệnh cầm biên lai này đến <b>Quầy Dược Ngoại Trú (Tầng 1)</b> để nhận thuốc theo quy chuẩn FEFO.
                                </Alert>
                            )}

                            <Stack direction="row" spacing={2} justifyContent="center">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PrintIcon />}
                                    onClick={() => handlePrintReceipt(receiptData)}
                                    sx={{ py: 1.2, px: 3, borderRadius: 2.5, fontWeight: "bold" }}
                                >
                                    In Biên Lai Thu Tiền
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleClosePaymentModal}
                                    sx={{ py: 1.2, px: 3, borderRadius: 2.5 }}
                                >
                                    Đóng & Tiếp Tục
                                </Button>
                            </Stack>
                        </Box>
                    ) : (
                        <Box>
                            {errorMessage && (
                                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                                    {errorMessage}
                                </Alert>
                            )}

                            {selectedBill && (
                                <Grid container spacing={3}>
                                    {/* CỘT TRÁI: TÓM TẮT HÓA ĐƠN & CHI TIẾT KHOẢN THU */}
                                    <Grid item xs={12} md={5}>
                                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: "#F8FAFC", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                            <Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                    <Typography variant="subtitle2" fontWeight="bold" color="primary">
                                                        {selectedBill.billId}
                                                    </Typography>
                                                    <Chip
                                                        label={
                                                            selectedBill.billId?.endsWith("-EXAM") ? "HĐ 01: Khám" :
                                                            selectedBill.billId?.endsWith("-TREATMENT") ? "HĐ 02: CLS & Thuốc" : "Viện phí"
                                                        }
                                                        size="small"
                                                        color="primary"
                                                        sx={{ fontWeight: "bold", fontSize: "0.7rem" }}
                                                    />
                                                </Box>

                                                <Typography variant="h6" fontWeight="bold" color="#0F766E">
                                                    {selectedBill.patientName}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    SĐT: <b>{selectedBill.phoneNumber}</b>
                                                </Typography>
                                                {selectedBill.identityNumber && (
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        CCCD: {selectedBill.identityNumber}
                                                    </Typography>
                                                )}
                                                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                                                    Phòng/Khoa: {selectedBill.departmentName} ({selectedBill.doctorName})
                                                </Typography>

                                                <Divider sx={{ my: 1.5 }} />

                                                <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
                                                    CHI TIẾT DỊCH VỤ ({selectedBill.items?.length || 0}):
                                                </Typography>

                                                <Box sx={{ maxHeight: 200, overflowY: "auto", pr: 0.5 }}>
                                                    <Stack spacing={0.8}>
                                                        {selectedBill.items?.map((it, idx) => (
                                                            <Box key={idx} display="flex" justifyContent="space-between" alignItems="center">
                                                                <Typography variant="body2" noWrap sx={{ maxWidth: 170 }}>
                                                                    {it.name} <span style={{ color: "#64748B", fontSize: "0.8rem" }}>x{it.qty || it.quantity || 1}</span>
                                                                </Typography>
                                                                <Typography variant="body2" fontWeight="bold">
                                                                    {formatCurrency(it.totalPrice || (it.price * (it.qty || it.quantity || 1)) || it.unitPrice || 0)}
                                                                </Typography>
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            </Box>

                                            <Box mt={2} p={2} bgcolor="#EFF6FF" borderRadius={2} border="1.5px solid #BFDBFE">
                                                <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block">
                                                    TỔNG TIỀN PHẢI THU:
                                                </Typography>
                                                <Typography variant="h5" fontWeight="bold" color="primary.main">
                                                    {formatCurrency(selectedBill.totalAmount)}
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    </Grid>

                                    {/* CỘT PHẢI: PHƯƠNG THỨC THANH TOÁN (PAYOS, TIỀN MẶT, POS) */}
                                    <Grid item xs={12} md={7}>
                                        <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
                                            Chọn phương thức thanh toán:
                                        </Typography>

                                        <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
                                            <RadioGroup
                                                row
                                                value={paymentMethod}
                                                onChange={(e) => handleMethodChange(e.target.value)}
                                            >
                                                <FormControlLabel value="CASH" control={<Radio />} label="💵 Tiền mặt" />
                                                <FormControlLabel value="QR" control={<Radio />} label="📱 Cổng PayOS (VietQR)" />
                                                <FormControlLabel value="POS" control={<Radio />} label="💳 Thẻ POS" />
                                            </RadioGroup>
                                        </FormControl>

                                        {/* 1. THANH TOÁN TIỀN MẶT (CASH) */}
                                        {paymentMethod === "CASH" && (
                                            <Box p={2} bgcolor="#F8FAFC" borderRadius={3} border="1px solid #E2E8F0">
                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Tiền khách đưa (VNĐ)"
                                                    value={cashGiven}
                                                    onChange={(e) => setCashGiven(e.target.value)}
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>,
                                                    }}
                                                    sx={{ mb: 1.5 }}
                                                />

                                                {/* Nút bấm nhanh mệnh giá tiền khách đưa */}
                                                <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.8}>
                                                    Gợi ý nhanh số tiền khách đưa:
                                                </Typography>
                                                <Box display="flex" flexWrap="wrap" gap={0.8} mb={2}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => setCashGiven(String(selectedBill.totalAmount || 0))}
                                                        sx={{ fontSize: "0.75rem", borderRadius: 1.5 }}
                                                    >
                                                        Đủ Tiền ({formatCurrency(selectedBill.totalAmount)})
                                                    </Button>
                                                    {[100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                                                        <Button
                                                            key={amt}
                                                            size="small"
                                                            variant={Number(cashGiven) === amt ? "contained" : "outlined"}
                                                            onClick={() => setCashGiven(String(amt))}
                                                            sx={{ fontSize: "0.75rem", borderRadius: 1.5 }}
                                                        >
                                                            {amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                                                        </Button>
                                                    ))}
                                                </Box>

                                                <Box
                                                    display="flex"
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                    p={1.5}
                                                    borderRadius={2}
                                                    bgcolor={Number(cashGiven) >= (selectedBill?.totalAmount || 0) ? "#F0FDF4" : "#FEF2F2"}
                                                    border={Number(cashGiven) >= (selectedBill?.totalAmount || 0) ? "1px solid #BBF7D0" : "1px solid #FECACA"}
                                                >
                                                    <Typography variant="body2" color="text.secondary">
                                                        {Number(cashGiven) >= (selectedBill?.totalAmount || 0) ? "Tiền thối lại cho khách:" : "Khách đưa còn thiếu:"}
                                                    </Typography>
                                                    <Typography
                                                        variant="subtitle1"
                                                        fontWeight="bold"
                                                        color={Number(cashGiven) >= (selectedBill?.totalAmount || 0) ? "success.main" : "error.main"}
                                                    >
                                                        {formatCurrency(Math.abs(cashChange))}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* 2. THANH TOÁN CỔNG PAYOS (VIETQR NAPAS 24/7) */}
                                        {paymentMethod === "QR" && (
                                            <Box p={2} bgcolor="#F0FDFA" borderRadius={3} border="1.5px dashed #0D9488">
                                                {payosLoading ? (
                                                    <Box textAlign="center" py={4}>
                                                        <CircularProgress size={32} color="primary" />
                                                        <Typography variant="body2" color="text.secondary" mt={1.5}>
                                                            Đang kết nối cổng PayOS tạo mã thanh toán VietQR...
                                                        </Typography>
                                                    </Box>
                                                ) : !payosData ? (
                                                    <Box textAlign="center" py={3}>
                                                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                                            {errorMessage || "Không thể khởi tạo mã thanh toán PayOS VietQR. Vui lòng thử lại hoặc chọn hình thức Tiền mặt / Thẻ POS."}
                                                        </Alert>
                                                        <Button
                                                            variant="contained"
                                                            color="primary"
                                                            size="small"
                                                            onClick={() => initPayOSPayment(selectedBill)}
                                                            sx={{ textTransform: "none", fontWeight: 700 }}
                                                        >
                                                            Thử lại tạo mã PayOS
                                                        </Button>
                                                    </Box>
                                                ) : (
                                                    <Box>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                                            <Box display="flex" gap={1}>
                                                                <Chip label="Napas 247" size="small" color="primary" sx={{ fontWeight: "bold" }} />
                                                                <Chip label="PayOS Open Banking" size="small" color="success" sx={{ fontWeight: "bold" }} />
                                                            </Box>
                                                            {payosData?.orderCode && (
                                                                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                                    Đơn PayOS: #{payosData.orderCode}
                                                                </Typography>
                                                            )}
                                                        </Box>

                                                        {/* Khu vực hiển thị QR Code */}
                                                        <Box display="flex" flexDirection={{ xs: "column", sm: "row" }} gap={2} alignItems="center">
                                                            <Box textAlign="center">
                                                                {qrImgError || !payosData?.qrImageUrl ? (
                                                                    <Box sx={{ p: 1.5, bgcolor: "white", display: "inline-block", borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                                                                        <QRCodeCanvas
                                                                            value={payosData?.rawQrCode || `https://pay.hospital.vn/bill/${selectedBill.billId}?amount=${selectedBill.totalAmount}`}
                                                                            size={150}
                                                                            level="H"
                                                                        />
                                                                    </Box>
                                                                ) : (
                                                                    <Box
                                                                        component="img"
                                                                        src={payosData.qrImageUrl}
                                                                        alt="VietQR PayOS"
                                                                        onError={() => setQrImgError(true)}
                                                                        sx={{
                                                                            width: 160,
                                                                            height: 160,
                                                                            borderRadius: 2,
                                                                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                                                            bgcolor: "white",
                                                                            p: 0.8
                                                                        }}
                                                                    />
                                                                )}
                                                                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                                                    Quét bằng mọi App Ngân Hàng
                                                                </Typography>
                                                            </Box>

                                                            {/* Thông tin chuyển khoản 1-click copy */}
                                                            <Box flex={1} width="100%">
                                                                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "white", borderRadius: 2 }}>
                                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                                        <Typography variant="caption" color="text.secondary">Ngân hàng:</Typography>
                                                                        <Typography variant="caption" fontWeight="bold">{payosData?.bankName || "MBBank"}</Typography>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                                        <Typography variant="caption" color="text.secondary">Số tài khoản:</Typography>
                                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                                            <Typography variant="caption" fontWeight="bold">{payosData?.accountNumber || "0987654321"}</Typography>
                                                                            <Tooltip title={copiedField === "acc" ? "Đã chép!" : "Sao chép"}>
                                                                                <IconButton size="small" onClick={() => handleCopy(payosData?.accountNumber || "0987654321", "acc")} sx={{ p: 0.2 }}>
                                                                                    {copiedField === "acc" ? <CheckIcon fontSize="inherit" color="success" /> : <ContentCopyIcon fontSize="inherit" />}
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                                        <Typography variant="caption" color="text.secondary">Chủ TK:</Typography>
                                                                        <Typography variant="caption" fontWeight="bold">{payosData?.accountHolder || "BENH VIEN DA KHOA QUOC TE TNT"}</Typography>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                                        <Typography variant="caption" color="text.secondary">Số tiền:</Typography>
                                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                                            <Typography variant="caption" fontWeight="bold" color="primary.main">{formatCurrency(selectedBill.totalAmount)}</Typography>
                                                                            <Tooltip title={copiedField === "amt" ? "Đã chép!" : "Sao chép"}>
                                                                                <IconButton size="small" onClick={() => handleCopy(selectedBill.totalAmount, "amt")} sx={{ p: 0.2 }}>
                                                                                    {copiedField === "amt" ? <CheckIcon fontSize="inherit" color="success" /> : <ContentCopyIcon fontSize="inherit" />}
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                                                        <Typography variant="caption" color="text.secondary">Nội dung CK:</Typography>
                                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                                            <Typography variant="caption" fontWeight="bold" color="error.main">{payosData?.transferContent || `VP ${selectedBill.billId}`}</Typography>
                                                                            <Tooltip title={copiedField === "desc" ? "Đã chép!" : "Sao chép"}>
                                                                                <IconButton size="small" onClick={() => handleCopy(payosData?.transferContent || `VP ${selectedBill.billId}`, "desc")} sx={{ p: 0.2 }}>
                                                                                    {copiedField === "desc" ? <CheckIcon fontSize="inherit" color="success" /> : <ContentCopyIcon fontSize="inherit" />}
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    </Box>
                                                                </Paper>
                                                            </Box>
                                                        </Box>

                                                        {/* Thanh trạng thái thời gian thực & Nút thao tác nhanh */}
                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} flexWrap="wrap" gap={1}>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <CircularProgress size={16} color="primary" />
                                                                <Typography variant="caption" color="primary.main" fontWeight="bold">
                                                                    Hệ thống đang tự động lắng nghe thanh toán từ ngân hàng...
                                                                </Typography>
                                                            </Box>

                                                            <Box display="flex" gap={1}>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    startIcon={payosSyncing ? <CircularProgress size={14} /> : <SyncIcon />}
                                                                    onClick={handleSyncPayOS}
                                                                    disabled={payosSyncing || !payosData?.orderCode}
                                                                    sx={{ borderRadius: 1.5, fontSize: "0.75rem" }}
                                                                >
                                                                    {payosSyncing ? "Đang đồng bộ..." : "Đồng Bộ PayOS Ngay"}
                                                                </Button>
                                                                {payosData?.checkoutUrl && (
                                                                    <Button
                                                                        size="small"
                                                                        variant="text"
                                                                        color="secondary"
                                                                        endIcon={<OpenInNewIcon />}
                                                                        href={payosData.checkoutUrl}
                                                                        target="_blank"
                                                                        sx={{ borderRadius: 1.5, fontSize: "0.75rem" }}
                                                                    >
                                                                        Mở Cổng PayOS
                                                                    </Button>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}

                                        {/* 3. THANH TOÁN THẺ POS */}
                                        {paymentMethod === "POS" && (
                                            <Box p={2.5} bgcolor="#F8FAFC" borderRadius={3} border="1.5px dashed #64748B" textAlign="center">
                                                <CreditCardIcon sx={{ fontSize: 44, color: "#475569", mb: 1 }} />
                                                <Typography variant="subtitle1" fontWeight="bold" color="#1E293B">
                                                    Thiết Bị Quẹt Thẻ POS Tại Quầy
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" mb={1.5}>
                                                    Yêu cầu người bệnh cắm thẻ chip hoặc chạm thẻ không tiếp xúc (NFC) vào đầu đọc POS.
                                                </Typography>
                                                <Box display="inline-block" p={1.5} bgcolor="#F1F5F9" borderRadius={2} border="1px solid #CBD5E1">
                                                    <Typography variant="caption" color="text.secondary" display="block">Số tiền quẹt thẻ:</Typography>
                                                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                                                        {formatCurrency(selectedBill.totalAmount)}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                                                    Sau khi hóa đơn máy POS in ra thành công, bấm nút <b>"Xác Nhận & Xuất Biên Lai"</b> bên dưới.
                                                </Typography>
                                            </Box>
                                        )}
                                    </Grid>
                                </Grid>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
                    <Button onClick={handleClosePaymentModal}>
                        {paymentSuccess ? "Đóng" : "Hủy"}
                    </Button>
                    {!paymentSuccess && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleConfirmPayment}
                            disabled={submitting}
                            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                            sx={{ px: 3, fontWeight: "bold", borderRadius: 2 }}
                        >
                            {submitting ? "Đang xử lý..." : "Xác Nhận & Xuất Biên Lai"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* MODAL ĐỐI SOÁT & BÀN GIAO CA TRỰC */}
            <ReconciliationModal
                open={openReconciliationModal}
                onClose={() => setOpenReconciliationModal(false)}
                shiftFilter={shiftFilter}
                shiftReconData={shiftReconData}
                formatCurrency={formatCurrency}
                formatDateTime={formatDateTime}
                handlePrintShiftRecon={handlePrintShiftRecon}
            />
        </Container>
    );
}
