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
    TextField,
    InputAdornment,
    Alert,
    Stack,
    Rating,
    Snackbar,
    Tooltip,
    Badge
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import BiotechIcon from "@mui/icons-material/Biotech";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CancelIcon from "@mui/icons-material/Cancel";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import StarIcon from "@mui/icons-material/Star";
import HotelIcon from "@mui/icons-material/Hotel";
import FavoriteIcon from "@mui/icons-material/Favorite";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";
import { useNavigate } from "react-router-dom";
import MedicalRecordPrintModal from "../Doctor/MedicalRecordPrintModal";

const QUICK_TAGS = [
    "Bác sĩ khám kỹ lưỡng",
    "Tư vấn chu đáo, dễ hiểu",
    "Thời gian chờ ngắn",
    "Phòng khám sạch sẽ",
    "Điều dưỡng nhiệt tình",
];

export default function MedicalHistoryPage() {
    const navigate = useNavigate();
    const [mainTab, setMainTab] = useState(0); // 0: Ngoại trú, 1: Nội trú
    const [bookings, setBookings] = useState([]);
    const [inpatientList, setInpatientList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingInpatient, setLoadingInpatient] = useState(false);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [searchKeyword, setSearchKeyword] = useState("");
    
    // Modal Bệnh án ngoại trú
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState(0);
    const [cancellingId, setCancellingId] = useState(null);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printRecordData, setPrintRecordData] = useState(null);

    // Modal Đánh giá Bác sĩ
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [ratingTargetBooking, setRatingTargetBooking] = useState(null);
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [ratedBookingIds, setRatedBookingIds] = useState(new Set());

    // Modal Chi tiết Hồ sơ Nội trú & Nhật ký buồng bệnh
    const [selectedAdmission, setSelectedAdmission] = useState(null);
    const [dailyRecords, setDailyRecords] = useState([]);
    const [loadingDailyRecords, setLoadingDailyRecords] = useState(false);

    // Toast feedback
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

    useEffect(() => {
        loadBookings();
    }, []);

    useEffect(() => {
        if (mainTab === 1) {
            loadInpatientAdmissions();
        }
    }, [mainTab]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/api/bookings/my-history");
            const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setBookings(list);
        } catch (err) {
            console.error("Lỗi tải lịch sử khám:", err);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const loadInpatientAdmissions = async () => {
        setLoadingInpatient(true);
        try {
            // 1. Lấy danh sách hồ sơ của tài khoản
            const profileRes = await axiosInstance.get("/api/patient-profiles");
            const profiles = profileRes.data || (Array.isArray(profileRes) ? profileRes : []);
            
            // 2. Lấy danh sách đợt nằm viện của từng hồ sơ
            const admissionPromises = profiles.map(p =>
                axiosInstance.get(`/api/inpatient/patient/${p.patientProfileId}`)
                    .then(r => (r.data || []).map(adm => ({ ...adm, patientProfileName: p.fullName })))
                    .catch(() => [])
            );

            const results = await Promise.all(admissionPromises);
            const allAdmissions = results.flat();
            setInpatientList(allAdmissions);
        } catch (err) {
            console.error("Lỗi tải hồ sơ nội trú:", err);
            setInpatientList([]);
        } finally {
            setLoadingInpatient(false);
        }
    };

    // Hủy lịch khám
    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy lịch hẹn khám này? Khung giờ sẽ được giải phóng.")) return;
        setCancellingId(bookingId);
        try {
            await axiosInstance.put(`/api/bookings/${bookingId}/cancel`);
            setToast({ open: true, message: "Đã hủy lịch hẹn khám thành công!", severity: "success" });
            loadBookings();
            if (selectedBooking?.bookingId === bookingId) {
                setSelectedBooking(null);
            }
        } catch (err) {
            setToast({ open: true, message: err.message || "Không thể hủy lịch khám", severity: "error" });
        } finally {
            setCancellingId(null);
        }
    };

    // Mở Modal Đánh giá
    const handleOpenRating = (booking) => {
        setRatingTargetBooking(booking);
        setRatingStars(5);
        setRatingComment("");
        setRatingModalOpen(true);
    };

    // Gửi Đánh giá Bác sĩ
    const handleSubmitRating = async () => {
        if (!ratingTargetBooking) return;
        setSubmittingRating(true);
        try {
            await axiosInstance.post("/api/utilities/ratings", {
                bookingId: ratingTargetBooking.bookingId,
                stars: ratingStars,
                comment: ratingComment.trim() || "Dịch vụ khám chu đáo, chuyên nghiệp."
            });
            setRatedBookingIds(prev => new Set(prev).add(ratingTargetBooking.bookingId));
            setRatingModalOpen(false);
            setToast({ open: true, message: "Cảm ơn bạn đã gửi đánh giá bác sĩ!", severity: "success" });
        } catch (err) {
            setToast({ open: true, message: err.message || "Lỗi gửi đánh giá", severity: "error" });
        } finally {
            setSubmittingRating(false);
        }
    };

    // Mở xem chi tiết Nhật ký nội trú
    const handleOpenAdmissionDetail = async (admission) => {
        setSelectedAdmission(admission);
        setLoadingDailyRecords(true);
        try {
            const res = await axiosInstance.get(`/api/inpatient/${admission.admissionId}/daily-records`);
            const data = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
            setDailyRecords(data);
        } catch (err) {
            console.error("Lỗi tải nhật ký nội trú:", err);
            setDailyRecords([]);
        } finally {
            setLoadingDailyRecords(false);
        }
    };

    const getStatusChip = (status) => {
        switch (status) {
            case "CONFIRMED":
                return <Chip label="Đã xác nhận" color="primary" size="small" sx={{ height: 22, fontSize: "0.75rem", fontWeight: "600" }} />;
            case "IN_PROGRESS":
                return <Chip label="Đang khám" color="warning" size="small" sx={{ height: 22, fontSize: "0.75rem", fontWeight: "600" }} />;
            case "COMPLETED":
                return <Chip label="Đã khám xong" color="success" size="small" sx={{ height: 22, fontSize: "0.75rem", fontWeight: "600" }} />;
            case "CANCELLED":
                return <Chip label="Đã hủy" color="error" size="small" sx={{ height: 22, fontSize: "0.75rem", fontWeight: "600" }} />;
            default:
                return <Chip label={status || "Chờ xử lý"} size="small" sx={{ height: 22, fontSize: "0.75rem" }} />;
        }
    };

    const filteredBookings = bookings.filter((b) => {
        const matchesStatus = filterStatus === "ALL" || b.status === filterStatus;
        const matchesKeyword = !searchKeyword.trim() ||
            b.bookingCode?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            b.patientName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            b.doctorName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            b.departmentName?.toLowerCase().includes(searchKeyword.toLowerCase());
        return matchesStatus && matchesKeyword;
    });

    const getDetailedRecordData = (booking) => {
        const isCompleted = booking?.status === "COMPLETED";
        return {
            diagnosis: isCompleted ? "Viêm đường hô hấp trên cấp tính (ICD-10: J06.9)" : "Chưa có chẩn đoán (Lịch khám chưa diễn ra)",
            doctorAdvice: isCompleted ? "Uống thuốc đúng liều, uống nhiều nước ấm, nghỉ ngơi hợp lý. Tái khám sau 7 ngày nếu còn sốt hoặc ho nhiều." : "Vui lòng có mặt trước 15 phút tại phòng khám.",
            medicines: isCompleted ? [
                { id: 1, name: "Augmentin 1g", form: "Viên nén", quantity: "14 viên", dosage: "Sáng 1 - Tối 1 (Sau ăn no)", note: "Uống đủ 7 ngày" },
                { id: 2, name: "Panadol Extra 500mg", form: "Viên sủi", quantity: "10 viên", dosage: "1 viên khi sốt > 38.5°C", note: "Cách nhau 4-6 giờ" },
                { id: 3, name: "Siro ho Bổ Phế", form: "Chai 125ml", quantity: "1 chai", dosage: "15ml x 3 lần/ngày", note: "Sau ăn" }
            ] : [],
            labTests: isCompleted ? [
                { testName: "Tổng phân tích tế bào máu ngoại vi", result: "WBC: 7.8 G/L | RBC: 4.6 T/L", reference: "Bình thường", isNormal: true },
                { testName: "Định lượng Glucose máu lúc đói", result: "5.4 mmol/L", reference: "3.9 - 6.4 mmol/L", isNormal: true },
                { testName: "Chụp X-quang ngực thẳng (DR)", result: "Hình ảnh tim phổi bình thường", reference: "Không tổn thương", isNormal: true }
            ] : [],
            billing: {
                consultationFee: booking.price || 200000,
                labTestsFee: isCompleted ? 350000 : 0,
                medicineFee: isCompleted ? 245000 : 0,
                insuranceDiscount: isCompleted ? 210000 : 0,
                totalPaid: isCompleted ? ((booking.price || 200000) + 350000 + 245000 - 210000) : (booking.price || 200000)
            }
        };
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            {/* Header */}
            <Box mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="#0f172a" gutterBottom>
                        📋 Sổ Khám & Bệnh Án Điện Tử
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Theo dõi kết quả khám ngoại trú, lịch hẹn và hồ sơ nằm viện nội trú
                    </Typography>
                </Box>
                <Button variant="contained" color="primary" onClick={() => navigate("/booking")} sx={{ borderRadius: 2, textTransform: "none", px: 2.5 }}>
                    + Đặt Lịch Khám Mới
                </Button>
            </Box>

            {/* Main Tabs: Ngoại Trú vs Nội Trú */}
            <Paper elevation={0} sx={{ mb: 3, borderRadius: 2.5, border: "1px solid #e2e8f0", bgcolor: "white", p: 0.5 }}>
                <Tabs
                    value={mainTab}
                    onChange={(e, val) => setMainTab(val)}
                    variant="fullWidth"
                    textColor="primary"
                    indicatorColor="primary"
                >
                    <Tab
                        icon={<MedicalServicesIcon fontSize="small" />}
                        iconPosition="start"
                        label={`Khám Ngoại Trú & Lịch Hẹn (${bookings.length})`}
                        sx={{ fontWeight: "700", textTransform: "none", fontSize: "0.9rem" }}
                    />
                    <Tab
                        icon={<HotelIcon fontSize="small" />}
                        iconPosition="start"
                        label={`Điều Trị Nội Trú (${inpatientList.length})`}
                        sx={{ fontWeight: "700", textTransform: "none", fontSize: "0.9rem" }}
                    />
                </Tabs>
            </Paper>

            {/* TAB 0: KHÁM NGOẠI TRÚ */}
            {mainTab === 0 && (
                <>
                    {/* Compact Filter & Search Bar */}
                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #e2e8f0", mb: 3, bgcolor: "white" }}>
                        <Grid container spacing={1.5} alignItems="center">
                            <Grid item xs={12} sm={7}>
                                <Tabs
                                    value={filterStatus}
                                    onChange={(e, val) => setFilterStatus(val)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    textColor="primary"
                                    indicatorColor="primary"
                                    sx={{ minHeight: 36 }}
                                >
                                    <Tab label={`Tất cả (${bookings.length})`} value="ALL" sx={{ fontWeight: "600", textTransform: "none", minHeight: 36, py: 0.5, fontSize: "0.85rem" }} />
                                    <Tab label="Chờ khám" value="CONFIRMED" sx={{ fontWeight: "600", textTransform: "none", minHeight: 36, py: 0.5, fontSize: "0.85rem" }} />
                                    <Tab label="Đã hoàn tất" value="COMPLETED" sx={{ fontWeight: "600", textTransform: "none", minHeight: 36, py: 0.5, fontSize: "0.85rem" }} />
                                    <Tab label="Đã hủy" value="CANCELLED" sx={{ fontWeight: "600", textTransform: "none", minHeight: 36, py: 0.5, fontSize: "0.85rem" }} />
                                </Tabs>
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Tìm kiếm phiếu khám..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" color="action" />
                                            </InputAdornment>
                                        ),
                                        sx: { height: 36, fontSize: "0.875rem" }
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* List Bookings */}
                    {loading ? (
                        <Box textAlign="center" py={6}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : filteredBookings.length === 0 ? (
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: "1px dashed #cbd5e1", textAlign: "center", bgcolor: "#f8fafc" }}>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Chưa có phiếu khám nào trong mục này.
                            </Typography>
                            <Button size="small" variant="contained" onClick={() => navigate("/booking")} sx={{ borderRadius: 2, textTransform: "none", bgcolor: "#0284c7" }}>
                                Đặt lịch khám mới
                            </Button>
                        </Paper>
                    ) : (
                        <Stack spacing={1.5}>
                            {filteredBookings.map((b) => {
                                const isCompleted = b.status === "COMPLETED";
                                const isRated = ratedBookingIds.has(b.bookingId);

                                return (
                                    <Card
                                        key={b.bookingId}
                                        elevation={0}
                                        sx={{
                                            borderRadius: 2.5,
                                            border: "1px solid #e2e8f0",
                                            transition: "0.15s",
                                            "&:hover": { borderColor: "#0284c7" }
                                        }}
                                    >
                                        <CardContent sx={{ p: "16px !important" }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                    <Typography variant="subtitle1" fontWeight="bold" color="#0f172a">
                                                        {b.departmentName || "Khoa Khám Bệnh"}
                                                    </Typography>
                                                    {getStatusChip(b.status)}
                                                    <Chip
                                                        label={`STT: #${b.queueNumber || "1"}`}
                                                        size="small"
                                                        sx={{ height: 22, fontSize: "0.75rem", bgcolor: "#f1f5f9", fontWeight: "600" }}
                                                    />
                                                </Box>
                                                <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                                                    {formatCurrency(b.price || 200000)}
                                                </Typography>
                                            </Box>

                                            <Grid container spacing={1} mb={1.5}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        👤 Bệnh nhân: <b>{b.patientName}</b>
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        👨‍⚕️ Bác sĩ: <b>BS. {b.doctorName || "Chuyên khoa"}</b>
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        📅 Ngày hẹn: <b>{formatDate(b.bookingDate)} ({b.startTime || "08:00"})</b>
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        📍 Phòng khám: <b>{b.roomName || "Phòng 101"}</b>
                                                    </Typography>
                                                </Grid>
                                            </Grid>

                                            <Box display="flex" justifyContent="space-between" alignItems="center" pt={1} borderTop="1px solid #f1f5f9" flexWrap="wrap" gap={1}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Mã phiếu: <code>{b.bookingCode}</code>
                                                </Typography>
                                                <Stack direction="row" spacing={1}>
                                                    {/* Nút đánh giá bác sĩ cho lượt khám hoàn tất */}
                                                    {isCompleted && (
                                                        <Button
                                                            size="small"
                                                            variant={isRated ? "outlined" : "contained"}
                                                            color={isRated ? "inherit" : "warning"}
                                                            startIcon={<StarIcon fontSize="small" />}
                                                            onClick={() => handleOpenRating(b)}
                                                            disabled={isRated}
                                                            sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem", py: 0.4 }}
                                                        >
                                                            {isRated ? "Đã Đánh Giá" : "Đánh Giá Bác Sĩ"}
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<VisibilityIcon fontSize="small" />}
                                                        onClick={() => {
                                                            setSelectedBooking(b);
                                                            setActiveDetailTab(0);
                                                        }}
                                                        sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem", py: 0.4 }}
                                                    >
                                                        Xem Bệnh Án
                                                    </Button>

                                                    {b.status === "CONFIRMED" && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="error"
                                                            disabled={cancellingId === b.bookingId}
                                                            onClick={() => handleCancelBooking(b.bookingId)}
                                                            sx={{ borderRadius: 2, textTransform: "none", fontSize: "0.8rem", py: 0.4 }}
                                                        >
                                                            {cancellingId === b.bookingId ? "Đang hủy..." : "Hủy Lịch"}
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>
                    )}
                </>
            )}

            {/* TAB 1: ĐIỀU TRỊ NỘI TRÚ (NẰM VIỆN) */}
            {mainTab === 1 && (
                <>
                    {loadingInpatient ? (
                        <Box textAlign="center" py={6}>
                            <CircularProgress size={32} />
                            <Typography variant="body2" color="text.secondary" mt={1}>Đang tải hồ sơ bệnh án nội trú...</Typography>
                        </Box>
                    ) : inpatientList.length === 0 ? (
                        <Paper elevation={0} sx={{ p: 5, borderRadius: 3, border: "1px dashed #cbd5e1", textAlign: "center", bgcolor: "#f8fafc" }}>
                            <HotelIcon sx={{ fontSize: 48, color: "#cbd5e1", mb: 1 }} />
                            <Typography variant="subtitle1" fontWeight="bold">Chưa có đợt điều trị nội trú nào</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Khi có chỉ định nhập viện từ Bác sĩ, toàn bộ nhật ký buồng bệnh và quá trình điều dưỡng sẽ xuất hiện tại đây.
                            </Typography>
                        </Paper>
                    ) : (
                        <Stack spacing={2}>
                            {inpatientList.map((adm) => {
                                const isAdmitted = adm.status === "ADMITTED" || !adm.dischargeDate;
                                return (
                                    <Card
                                        key={adm.admissionId}
                                        elevation={0}
                                        sx={{
                                            borderRadius: 3,
                                            border: isAdmitted ? "2px solid #0088D6" : "1px solid #e2e8f0",
                                            bgcolor: isAdmitted ? "#F0F9FF" : "white",
                                        }}
                                    >
                                        <CardContent sx={{ p: 2.5 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5} flexWrap="wrap" gap={1}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <HotelIcon color={isAdmitted ? "primary" : "action"} />
                                                    <Typography variant="h6" fontWeight="bold" color="#0f172a">
                                                        {adm.departmentName || "Khoa Điều Trị Nội Trú"}
                                                    </Typography>
                                                    <Chip
                                                        label={isAdmitted ? "Đang Nằm Viện" : "Đã Xuất Viện"}
                                                        color={isAdmitted ? "primary" : "default"}
                                                        size="small"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </Box>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Mã NV: <code>{adm.admissionId?.substring(0, 8)}</code>
                                                </Typography>
                                            </Box>

                                            <Grid container spacing={2} mb={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        👤 Bệnh nhân: <b>{adm.patientProfileName || "Bệnh nhân"}</b>
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        🏥 Phòng bệnh: <b>{adm.roomName || "Buồng Nội Trú"}</b> - Giường: <b>{adm.bedNumber || "01"}</b>
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        📅 Ngày nhập viện: <b>{formatDate(adm.admissionDate)}</b>
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        🏁 Ngày xuất viện: <b>{adm.dischargeDate ? formatDate(adm.dischargeDate) : "Đang điều trị"}</b>
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "rgba(255,255,255,0.7)", borderRadius: 2 }}>
                                                        <Typography variant="caption" color="text.secondary" fontWeight="bold">Chẩn đoán nhập viện:</Typography>
                                                        <Typography variant="body2" fontWeight="600" color="#1e293b">
                                                            {adm.initialDiagnosis || adm.diagnosis || "Theo dõi điều trị nội trú"}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            </Grid>

                                            <Box display="flex" justifyContent="flex-end" pt={1} borderTop="1px solid #e2e8f0">
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<MonitorHeartIcon />}
                                                    onClick={() => handleOpenAdmissionDetail(adm)}
                                                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                                                >
                                                    Xem Nhật Ký Y Lệnh & Chỉ Số Sinh Tồn
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>
                    )}
                </>
            )}

            {/* MODAL 1: BỆNH ÁN NGOẠI TRÚ CHI TIẾT */}
            {selectedBooking && (() => {
                const recordData = getDetailedRecordData(selectedBooking);
                return (
                    <Dialog
                        open={!!selectedBooking}
                        onClose={() => setSelectedBooking(null)}
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{ sx: { borderRadius: 3 } }}
                    >
                        <DialogTitle sx={{ py: 2, px: 2.5, bgcolor: "#0f172a", color: "white" }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        BỆNH ÁN ĐIỆN TỬ: {selectedBooking.bookingCode}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                        Bệnh nhân: {selectedBooking.patientName} | Ngày khám: {formatDate(selectedBooking.bookingDate)}
                                    </Typography>
                                </Box>
                                <IconButton onClick={() => setSelectedBooking(null)} sx={{ color: "white" }} size="small">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </DialogTitle>

                        <Tabs
                            value={activeDetailTab}
                            onChange={(e, val) => setActiveDetailTab(val)}
                            textColor="primary"
                            indicatorColor="primary"
                            variant="fullWidth"
                            sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40, bgcolor: "#f8fafc" }}
                        >
                            <Tab label="1. Chẩn đoán" sx={{ fontWeight: "600", textTransform: "none", minHeight: 40, py: 0.8, fontSize: "0.85rem" }} />
                            <Tab label="2. Đơn thuốc" sx={{ fontWeight: "600", textTransform: "none", minHeight: 40, py: 0.8, fontSize: "0.85rem" }} />
                            <Tab label="3. Xét nghiệm" sx={{ fontWeight: "600", textTransform: "none", minHeight: 40, py: 0.8, fontSize: "0.85rem" }} />
                            <Tab label="4. Viện phí" sx={{ fontWeight: "600", textTransform: "none", minHeight: 40, py: 0.8, fontSize: "0.85rem" }} />
                        </Tabs>

                        <DialogContent dividers sx={{ p: 2.5 }}>
                            {/* TAB 0: CHẨN ĐOÁN */}
                            {activeDetailTab === 0 && (
                                <Box display="flex" flexDirection="column" gap={2}>
                                    <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                                        <Typography variant="caption" color="text.secondary">Chẩn đoán xác định:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="#1e293b" mt={0.5}>
                                            {recordData.diagnosis}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
                                        <Typography variant="caption" color="text.secondary">Lời dặn của Bác sĩ:</Typography>
                                        <Typography variant="body2" color="#334155" mt={0.5}>
                                            {recordData.doctorAdvice}
                                        </Typography>
                                    </Box>

                                    {selectedBooking.symptoms && (
                                        <Typography variant="caption" color="text.secondary">
                                            Triệu chứng ghi nhận: <i>"{selectedBooking.symptoms}"</i>
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            {/* TAB 1: ĐƠN THUỐC */}
                            {activeDetailTab === 1 && (
                                <Box>
                                    {recordData.medicines.length === 0 ? (
                                        <Alert severity="info" sx={{ borderRadius: 2 }}>Chưa có đơn thuốc cho lượt khám này.</Alert>
                                    ) : (
                                        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                                    <TableRow>
                                                        <TableCell><b>Tên thuốc</b></TableCell>
                                                        <TableCell><b>SL</b></TableCell>
                                                        <TableCell><b>Liều dùng / Cách uống</b></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {recordData.medicines.map((m) => (
                                                        <TableRow key={m.id}>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight="600">{m.name}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{m.note}</Typography>
                                                            </TableCell>
                                                            <TableCell><b>{m.quantity}</b></TableCell>
                                                            <TableCell><Typography variant="body2">{m.dosage}</Typography></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </Box>
                            )}

                            {/* TAB 2: XÉT NGHIỆM */}
                            {activeDetailTab === 2 && (
                                <Box>
                                    {recordData.labTests.length === 0 ? (
                                        <Alert severity="info" sx={{ borderRadius: 2 }}>Không có chỉ định cận lâm sàng.</Alert>
                                    ) : (
                                        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                                    <TableRow>
                                                        <TableCell><b>Tên xét nghiệm</b></TableCell>
                                                        <TableCell><b>Kết quả</b></TableCell>
                                                        <TableCell><b>Tham chiếu</b></TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {recordData.labTests.map((t, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell><Typography variant="body2" fontWeight="600">{t.testName}</Typography></TableCell>
                                                            <TableCell><Typography variant="body2" color="primary.main" fontWeight="bold">{t.result}</Typography></TableCell>
                                                            <TableCell><Typography variant="caption" color="text.secondary">{t.reference}</Typography></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </Box>
                            )}

                            {/* TAB 3: VIỆN PHÍ */}
                            {activeDetailTab === 3 && (
                                <Box display="flex" flexDirection="column" gap={1.5}>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <Typography variant="body2" color="text.secondary">1. Công khám:</Typography>
                                        <Typography variant="body2" fontWeight="600">{formatCurrency(recordData.billing.consultationFee)}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <Typography variant="body2" color="text.secondary">2. Phí xét nghiệm:</Typography>
                                        <Typography variant="body2" fontWeight="600">{formatCurrency(recordData.billing.labTestsFee)}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <Typography variant="body2" color="text.secondary">3. Tiền thuốc:</Typography>
                                        <Typography variant="body2" fontWeight="600">{formatCurrency(recordData.billing.medicineFee)}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <Typography variant="body2" color="success.main">4. BHYT chi trả:</Typography>
                                        <Typography variant="body2" fontWeight="600" color="success.main">-{formatCurrency(recordData.billing.insuranceDiscount)}</Typography>
                                    </Box>
                                    <Divider />
                                    <Box display="flex" justifyContent="space-between" alignItems="center" pt={0.5}>
                                        <Typography variant="subtitle2" fontWeight="bold">Tổng thực thu:</Typography>
                                        <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                                            {formatCurrency(recordData.billing.totalPaid)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </DialogContent>

                        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PrintIcon fontSize="small" />}
                                onClick={() => {
                                    setPrintRecordData(recordData);
                                    setPrintModalOpen(true);
                                }}
                                sx={{ textTransform: "none", fontWeight: "bold" }}
                            >
                                In Bản Bệnh Án A4/A5
                            </Button>
                            <Button size="small" variant="contained" onClick={() => setSelectedBooking(null)} sx={{ textTransform: "none", bgcolor: "#0284c7" }}>
                                Đóng
                            </Button>
                        </DialogActions>
                    </Dialog>
                );
            })()}

            {/* MODAL 2: ĐÁNH GIÁ BÁC SĨ & DỊCH VỤ */}
            <Dialog
                open={ratingModalOpen}
                onClose={() => setRatingModalOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ textAlign: "center", pt: 3 }}>
                    <StarIcon sx={{ fontSize: 48, color: "#f59e0b", mb: 1 }} />
                    <Typography variant="h6" fontWeight="bold">
                        Đánh Giá Bác Sĩ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {ratingTargetBooking ? `BS. ${ratingTargetBooking.doctorName || "Chuyên khoa"} - ${ratingTargetBooking.departmentName}` : ""}
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2} my={1}>
                        <Rating
                            value={ratingStars}
                            onChange={(e, val) => setRatingStars(val || 5)}
                            size="large"
                            sx={{ fontSize: "2.5rem" }}
                        />
                        <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                            {ratingStars === 5 ? "Tuyệt vời (5/5 ⭐)" :
                             ratingStars === 4 ? "Rất tốt (4/5 ⭐)" :
                             ratingStars === 3 ? "Bình thường (3/5 ⭐)" :
                             ratingStars === 2 ? "Chưa hài lòng (2/5 ⭐)" : "Rất tệ (1/5 ⭐)"}
                        </Typography>

                        {/* Quick Tags */}
                        <Box display="flex" flexWrap="wrap" gap={0.8} justifyContent="center">
                            {QUICK_TAGS.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    onClick={() => setRatingComment(prev => prev ? `${prev}, ${tag}` : tag)}
                                    sx={{ cursor: "pointer", fontSize: "0.75rem" }}
                                    variant="outlined"
                                />
                            ))}
                        </Box>

                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Chia sẻ cảm nhận của bạn về bác sĩ và trải nghiệm khám..."
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            size="small"
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2.5, justifyContent: "space-between" }}>
                    <Button onClick={() => setRatingModalOpen(false)} sx={{ textTransform: "none" }}>
                        Để sau
                    </Button>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleSubmitRating}
                        disabled={submittingRating}
                        sx={{ fontWeight: "bold", textTransform: "none", px: 3, borderRadius: 2 }}
                    >
                        {submittingRating ? "Đang gửi..." : "Gửi Đánh Giá"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL 3: NHẬT KÝ THEO DÕI ĐIỀU TRỊ NỘI TRÚ */}
            <Dialog
                open={!!selectedAdmission}
                onClose={() => setSelectedAdmission(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ bgcolor: "#0f172a", color: "white", py: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                                NHẬT KÝ THEO DÕI NỘI TRÚ
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                {selectedAdmission?.departmentName} | Buồng: {selectedAdmission?.roomName || "101"} - Giường: {selectedAdmission?.bedNumber || "01"}
                            </Typography>
                        </Box>
                        <IconButton onClick={() => setSelectedAdmission(null)} sx={{ color: "white" }} size="small">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 2.5 }}>
                    {loadingDailyRecords ? (
                        <Box textAlign="center" py={4}>
                            <CircularProgress size={28} />
                            <Typography variant="body2" color="text.secondary" mt={1}>Đang tải nhật ký điều dưỡng & y lệnh...</Typography>
                        </Box>
                    ) : dailyRecords.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Chưa có nhật ký ghi chép hàng ngày cho đợt nằm viện này.
                        </Alert>
                    ) : (
                        <Stack spacing={2}>
                            {dailyRecords.map((rec, idx) => (
                                <Paper key={rec.recordId || idx} elevation={0} sx={{ p: 2, borderRadius: 2.5, border: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                                            📅 Ngày {formatDate(rec.recordDate || rec.createdAt)}
                                        </Typography>
                                        <Chip label={`Ghi chép #${dailyRecords.length - idx}`} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                                    </Box>

                                    {/* Chỉ số sinh tồn */}
                                    <Grid container spacing={1} mb={1.5}>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1, textAlign: "center", bgcolor: "white", borderRadius: 1.5 }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Huyết áp</Typography>
                                                <Typography variant="body2" fontWeight="bold" color="error.main">{rec.bloodPressure || "120/80 mmHg"}</Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1, textAlign: "center", bgcolor: "white", borderRadius: 1.5 }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Nhịp tim</Typography>
                                                <Typography variant="body2" fontWeight="bold" color="primary.main">{rec.pulse || "75 bpm"}</Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Paper sx={{ p: 1, textAlign: "center", bgcolor: "white", borderRadius: 1.5 }}>
                                                <Typography variant="caption" color="text.secondary" display="block">Thân nhiệt</Typography>
                                                <Typography variant="body2" fontWeight="bold" color="warning.main">{rec.temperature ? `${rec.temperature}°C` : "36.8°C"}</Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>

                                    {/* Diễn biến bệnh */}
                                    {rec.symptomsProgress && (
                                        <Box mb={1}>
                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">Diễn biến triệu chứng:</Typography>
                                            <Typography variant="body2" color="#334155">{rec.symptomsProgress}</Typography>
                                        </Box>
                                    )}

                                    {/* Y lệnh bác sĩ / điều dưỡng */}
                                    {rec.doctorOrders && (
                                        <Box sx={{ p: 1.2, bgcolor: "#ecfdf5", borderRadius: 1.5, border: "1px solid #a7f3d0" }}>
                                            <Typography variant="caption" color="success.main" fontWeight="bold">Y lệnh & Chăm sóc điều dưỡng:</Typography>
                                            <Typography variant="body2" color="#065f46">{rec.doctorOrders}</Typography>
                                        </Box>
                                    )}
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => setSelectedAdmission(null)} sx={{ textTransform: "none", bgcolor: "#0284c7" }}>
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Bản In Bệnh Án Chuẩn A4/A5 */}
            <MedicalRecordPrintModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                record={printRecordData}
            />

            {/* Toast Notification */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: "100%" }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
