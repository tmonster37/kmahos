import React, { useState, useEffect } from "react";
import {
    Container,
    Grid,
    Paper,
    Typography,
    Button,
    Box,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    IconButton,
    Tooltip,
    Alert,
    Autocomplete,
    Chip,
    Stack,
    Divider,
    CircularProgress,
    Breadcrumbs,
    Link as MuiLink,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Snackbar
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import HistoryIcon from "@mui/icons-material/History";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PrintIcon from "@mui/icons-material/Print";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupIcon from "@mui/icons-material/Group";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import DownloadIcon from "@mui/icons-material/Download";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { bookingApi } from "../../services/bookingApi";
import {
    formatDate,
    formatCurrency,
    formatDateTime,
    isValidPhoneNumber,
    isValidIdentityNumber,
    isValidHealthInsurance,
    formatISODate,
} from "../../utils/formatters";
import {
    VIETNAM_PROVINCES_34,
    getWardsByProvince
} from "../../utils/administrativeDivisions";
import { useAuth } from "../../context/AuthContext";

// Dữ liệu mẫu chuẩn đối chiếu từ hình ảnh của người dùng (The Duck Hospital)
const DEFAULT_SAMPLE_PROFILE = {
    patientProfileId: "sample-profile-duck",
    fullName: "BẠCH CAO KỲ",
    dateOfBirth: "1997-07-08",
    phoneNumber: "0987654171",
    gender: "FEMALE",
    streetAddress: "645 Hẻm Hoa Lan, Xã Bình Yên",
    district: "Huyện Sơn Dương",
    province: "Tỉnh Tuyên Quang",
    ward: "Xã Bình Yên",
    ethnicity: "Kinh",
    identityNumber: "001197008899",
    healthInsuranceNumber: "DN4010900123456"
};

const DEFAULT_SAMPLE_TICKET = {
    bookingId: "sample-booking-ticket",
    bookingCode: "F5F470FC8737",
    queueNumber: 4,
    queueCode: "KB-04",
    hospitalName: "Bệnh Viện Đa Khoa Quốc Tế TNT",
    hospitalBrand: "TNT HOSPITAL",
    hospitalSlogan: "Hết lòng vì người bệnh - Nâng tầm y tế số",
    hospitalAddress: "141 Chiến Thắng, Tân Triều, Thanh Trì, Hà Nội",
    hospitalPhone: "1900 8888 - (024) 3888 9999",
    hospitalEmail: "hotro@tnthospital.vn",
    hospitalWebsite: "https://tnthospital.vn",
    patientName: "Bạch Cao Kỳ",
    patientCode: "BN8C09434C",
    patientDob: "08/07/1997",
    patientAddress: "645 Hẻm Hoa Lan, Xã Bình Yên, Huyện Sơn Dương, Tỉnh Tuyên Quang",
    bookingDate: "2024-01-05 00:00",
    serviceName: "Khám dịch vụ",
    departmentName: "Răng - hàm - mặt",
    areaName: "Khu A, lầu 1",
    roomName: "A104",
    doctorName: "BS. Đức Xuân Minh",
    diagnosis: "Sâu răng",
    status: "COMPLETED",
    statusLabel: "Đã khám",
    medicines: [
        {
            id: 1,
            name: "Clinozepam",
            dosage: "Sáng 1 viên, Trưa 1 viên, Chiều 1 viên, Tối 1 viên",
            quantity: "28 Viên",
            unitPrice: 10000,
            totalPrice: 280000
        },
        {
            id: 2,
            name: "Stodal",
            dosage: "Sáng 1 viên, Trưa 1 viên, Chiều 1 viên, Tối 1 viên",
            quantity: "28 Chai",
            unitPrice: 30000,
            totalPrice: 840000
        }
    ],
    totalAmount: 1120000,
    reExaminationDate: "Không có"
};

const defaultFormData = {
    fullName: "",
    phoneNumber: "",
    identityNumber: "",
    healthInsuranceNumber: "",
    gender: "FEMALE",
    dateOfBirth: "1997-07-08",
    streetAddress: "",
    province: "Tỉnh Tuyên Quang",
    district: "Huyện Sơn Dương",
    ward: "Xã Bình Yên",
    ethnicity: "Kinh"
};

export default function PatientProfilesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Tab đang chọn: 0: Hồ sơ bệnh nhân, 1: Phiếu khám bệnh, 2: Thông báo, 3: Lịch sử khám bệnh
    const [activeTab, setActiveTab] = useState(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab === "ticket") return 1;
        if (tab === "notifications") return 2;
        if (tab === "history") return 3;
        return 0;
    });

    const [profiles, setProfiles] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [maskPhoneMap, setMaskPhoneMap] = useState({});

    // Modals
    const [openAddEditModal, setOpenAddEditModal] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [validationError, setValidationError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Modal Chọn buổi khám bệnh (Hình 4)
    const [openSelectSessionModal, setOpenSelectSessionModal] = useState(false);
    const [selectedSessionDate, setSelectedSessionDate] = useState("25/01/2024");
    const [selectedDoctorName, setSelectedDoctorName] = useState("ThS Lê Thị Kim Chi");
    const [selectedDepartmentName, setSelectedDepartmentName] = useState("Phổi");
    const [chosenSessionSlot, setChosenSessionSlot] = useState("MORNING"); // MORNING, AFTERNOON

    // Modal / View Chi tiết Phiếu khám bệnh & Đơn thuốc (Hình 3)
    const [viewingRecordSheet, setViewingRecordSheet] = useState(null);

    // Toast
    const [toastMessage, setToastMessage] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    // Đồng bộ URL parameter với tab ngay cả khi chuyển link hoặc back/forward
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab === "ticket") {
            setActiveTab(1);
            setViewingRecordSheet(null);
        } else if (tab === "notifications") {
            setActiveTab(2);
            setViewingRecordSheet(null);
        } else if (tab === "history") {
            setActiveTab(3);
        } else if (tab === "profiles" || !tab) {
            setActiveTab(0);
            setViewingRecordSheet(null);
        }
    }, [location.search]);

    // Đồng bộ URL parameter với tab
    const handleTabChange = (index) => {
        setActiveTab(index);
        setViewingRecordSheet(null);
        const tabKeys = ["profiles", "ticket", "notifications", "history"];
        navigate(`/profiles?tab=${tabKeys[index]}`, { replace: true });
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Tải danh sách hồ sơ của tài khoản
            const profileRes = await bookingApi.getMyProfiles().catch(() => null);
            let profileList = profileRes?.data || (Array.isArray(profileRes) ? profileRes : []);
            
            // Nếu người dùng mới chưa có hồ sơ nào, bổ sung hồ sơ mẫu chuẩn theo giao diện
            if (profileList.length === 0) {
                profileList = [DEFAULT_SAMPLE_PROFILE];
            }
            setProfiles(profileList);

            // 2. Tải danh sách các phiếu khám & lịch sử khám
            const bookingRes = await bookingApi.getMyBookings().catch(() => null);
            let bookingList = bookingRes?.data || (Array.isArray(bookingRes) ? bookingRes : []);
            
            if (bookingList.length === 0) {
                bookingList = [DEFAULT_SAMPLE_TICKET];
            } else {
                // Đảm bảo có đủ trường chi tiết để in phiếu khám
                bookingList = bookingList.map((b, idx) => ({
                    ...DEFAULT_SAMPLE_TICKET,
                    ...b,
                    queueNumber: b.queueNumber || (idx + 1),
                    bookingCode: b.bookingCode || `BK-${b.bookingId?.substring(0, 8)?.toUpperCase()}`,
                    patientName: b.patientName || profileList[0]?.fullName || "Bệnh nhân",
                    doctorName: b.doctorName || "BS. Đức Xuân Minh",
                    departmentName: b.departmentName || "Khám Chuyên Khoa",
                    roomName: b.roomName || "Phòng khám A104",
                    statusLabel: b.status === "COMPLETED" ? "Đã khám" : (b.status === "CONFIRMED" ? "Đang chờ khám" : "Chờ tiếp nhận")
                }));
            }
            setBookings(bookingList);
        } catch (err) {
            console.error("Lỗi nạp dữ liệu bệnh nhân:", err);
            setProfiles([DEFAULT_SAMPLE_PROFILE]);
            setBookings([DEFAULT_SAMPLE_TICKET]);
        } finally {
            setLoading(false);
        }
    };

    // Ẩn / Hiện số điện thoại
    const toggleMaskPhone = (id) => {
        setMaskPhoneMap(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const formatMaskedPhone = (phone, isVisible) => {
        if (!phone) return "---";
        if (isVisible) return phone;
        if (phone.length < 4) return phone;
        const last3 = phone.slice(-3);
        return `*******${last3}`;
    };

    // Mở modal Thêm hồ sơ
    const handleOpenAddModal = () => {
        setEditingProfileId(null);
        setFormData({
            ...defaultFormData,
            fullName: user?.fullName ? user.fullName.toUpperCase() : ""
        });
        setValidationError("");
        setOpenAddEditModal(true);
    };

    // Mở modal Sửa hồ sơ
    const handleOpenEditModal = (p) => {
        setEditingProfileId(p.patientProfileId);
        setFormData({
            fullName: p.fullName || "",
            phoneNumber: p.phoneNumber || "",
            identityNumber: p.identityNumber || "",
            healthInsuranceNumber: p.healthInsuranceNumber || "",
            gender: p.gender || "FEMALE",
            dateOfBirth: p.dateOfBirth ? formatISODate(p.dateOfBirth) : "1997-07-08",
            streetAddress: p.streetAddress || "",
            province: p.province || "Tỉnh Tuyên Quang",
            district: p.district || "Huyện Sơn Dương",
            ward: p.ward || "Xã Bình Yên",
            ethnicity: p.ethnicity || "Kinh"
        });
        setValidationError("");
        setOpenAddEditModal(true);
    };

    // Xóa hồ sơ
    const handleDeleteProfile = async (p) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ bệnh nhân "${p.fullName}" không?`)) {
            return;
        }
        try {
            if (p.patientProfileId !== "sample-profile-duck") {
                await bookingApi.deleteProfile(p.patientProfileId);
            }
            setProfiles(prev => prev.filter(item => item.patientProfileId !== p.patientProfileId));
            setToastMessage(`Đã xóa hồ sơ bệnh nhân "${p.fullName}" thành công!`);
        } catch (err) {
            console.error("Lỗi xóa hồ sơ:", err);
            alert(err?.message || "Không thể xóa hồ sơ bệnh nhân!");
        }
    };

    // Lưu hồ sơ
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setValidationError("");

        if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
            setValidationError("Họ và tên bệnh nhân phải có ít nhất 2 ký tự!");
            return;
        }

        if (formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber)) {
            setValidationError("Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (03, 05, 07, 08, 09).");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                fullName: formData.fullName.trim().toUpperCase(),
                streetAddress: formData.streetAddress?.trim() || "",
                province: formData.province?.trim() || "Tỉnh Tuyên Quang",
                district: formData.district?.trim() || "",
                ward: formData.ward?.trim() || ""
            };

            if (editingProfileId && editingProfileId !== "sample-profile-duck") {
                await bookingApi.updateProfile(editingProfileId, payload);
            } else if (editingProfileId === "sample-profile-duck") {
                // Cập nhật profile mẫu cục bộ
                setProfiles(prev => prev.map(item => item.patientProfileId === "sample-profile-duck" ? { ...item, ...payload } : item));
            } else {
                await bookingApi.createProfile(payload);
            }

            setToastMessage(editingProfileId ? "Cập nhật hồ sơ bệnh nhân thành công!" : "Tạo hồ sơ bệnh nhân mới thành công!");
            setOpenAddEditModal(false);
            loadData();
        } catch (err) {
            console.error("Lỗi lưu hồ sơ:", err);
            setValidationError(err?.response?.data?.message || err?.message || "Lỗi lưu hồ sơ bệnh nhân!");
        } finally {
            setSubmitting(false);
        }
    };

    // In Phiếu Khám Bệnh & Đơn Thuốc (Hình 3)
    const handlePrintRecordSheet = () => {
        window.print();
    };

    const currentBooking = bookings[0] || DEFAULT_SAMPLE_TICKET;
    const availableWards = getWardsByProvince(formData.province);

    return (
        <Box sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", pb: 8 }}>
            {/* 1. ELEVATED HEADER BANNER */}
            <Container maxWidth="lg" sx={{ pt: 3 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2.5, md: 3 },
                        borderRadius: 3.5,
                        bgcolor: "#FFFFFF",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                        mb: 3
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                                <Chip
                                    label="CỔNG BỆNH NHÂN • PATIENT PORTAL PRO"
                                    size="small"
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "0.68rem",
                                        letterSpacing: "0.06em",
                                        bgcolor: "rgba(0, 136, 214, 0.08)",
                                        color: "#0088D6",
                                        borderRadius: 1.5
                                    }}
                                />
                                <Breadcrumbs separator="›" aria-label="breadcrumb">
                                    <MuiLink
                                        component={Link}
                                        to="/"
                                        underline="hover"
                                        sx={{ color: "#64748B", fontSize: "0.8rem", fontWeight: 500 }}
                                    >
                                        Trang chủ
                                    </MuiLink>
                                    <Typography color="#0F172A" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                                        {activeTab === 0 && "Hồ sơ bệnh nhân"}
                                        {activeTab === 1 && "Phiếu khám bệnh"}
                                        {activeTab === 2 && "Thông báo"}
                                        {activeTab === 3 && "Lịch sử khám bệnh"}
                                    </Typography>
                                </Breadcrumbs>
                            </Box>
                            <Typography variant="h5" fontWeight="800" color="#0F172A" sx={{ letterSpacing: "-0.5px" }}>
                                Trung Tâm Hồ Sơ & Phiếu Khám Điện Tử
                            </Typography>
                            <Typography variant="body2" color="#64748B" mt={0.2}>
                                Quản lý thông tin định danh y tế, tra cứu phiếu khám số và theo dõi tiến trình y tế cá nhân
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1.5}>
                            <Button
                                variant="outlined"
                                startIcon={<CalendarMonthIcon />}
                                onClick={() => navigate("/booking")}
                                sx={{
                                    borderRadius: 2.5,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    color: "#0088D6",
                                    borderColor: "#BAE6FD",
                                    "&:hover": { borderColor: "#0088D6", bgcolor: "#F0F9FF" }
                                }}
                            >
                                + Đặt Lịch Khám Mới
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </Container>

            <Container maxWidth="lg">
                <Grid container spacing={3}>
                    {/* 2. CỘT TRÁI: SIDEBAR MENU ĐIỀU HƯỚNG CỦA BỆNH NHÂN */}
                    <Grid item xs={12} md={3.2}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 3.5,
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                position: { md: "sticky" },
                                top: { md: 80 }
                            }}
                        >
                            {/* Nút Thêm hồ sơ (+ Thêm hồ sơ) */}
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={handleOpenAddModal}
                                sx={{
                                    bgcolor: "#0088D6",
                                    "&:hover": { bgcolor: "#0070BA" },
                                    borderRadius: 2,
                                    py: 1.2,
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    textTransform: "none",
                                    boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                                    mb: 2
                                }}
                            >
                                Thêm hồ sơ
                            </Button>

                            {/* Danh sách 4 Menu chính theo hình ảnh */}
                            <Stack spacing={1}>
                                {/* Menu 1: Hồ sơ bệnh nhân */}
                                <Button
                                    fullWidth
                                    onClick={() => handleTabChange(0)}
                                    startIcon={<PersonOutlineIcon />}
                                    sx={{
                                        justifyContent: "flex-start",
                                        py: 1.2,
                                        px: 2,
                                        borderRadius: 2,
                                        fontWeight: activeTab === 0 ? 700 : 500,
                                        fontSize: "0.925rem",
                                        textTransform: "none",
                                        bgcolor: activeTab === 0 ? "#EBF6FE" : "transparent",
                                        color: activeTab === 0 ? "#0088D6" : "#475569",
                                        "&:hover": { bgcolor: activeTab === 0 ? "#EBF6FE" : "#F8FAFC" }
                                    }}
                                >
                                    Hồ sơ bệnh nhân
                                </Button>

                                {/* Menu 2: Phiếu khám bệnh */}
                                <Button
                                    fullWidth
                                    onClick={() => handleTabChange(1)}
                                    startIcon={<ReceiptLongIcon />}
                                    sx={{
                                        justifyContent: "flex-start",
                                        py: 1.2,
                                        px: 2,
                                        borderRadius: 2,
                                        fontWeight: activeTab === 1 ? 700 : 500,
                                        fontSize: "0.925rem",
                                        textTransform: "none",
                                        bgcolor: activeTab === 1 ? "#EBF6FE" : "transparent",
                                        color: activeTab === 1 ? "#0088D6" : "#475569",
                                        "&:hover": { bgcolor: activeTab === 1 ? "#EBF6FE" : "#F8FAFC" }
                                    }}
                                >
                                    Phiếu khám bệnh
                                </Button>

                                {/* Menu 3: Thông báo */}
                                <Button
                                    fullWidth
                                    onClick={() => handleTabChange(2)}
                                    startIcon={<NotificationsNoneIcon />}
                                    sx={{
                                        justifyContent: "flex-start",
                                        py: 1.2,
                                        px: 2,
                                        borderRadius: 2,
                                        fontWeight: activeTab === 2 ? 700 : 500,
                                        fontSize: "0.925rem",
                                        textTransform: "none",
                                        bgcolor: activeTab === 2 ? "#EBF6FE" : "transparent",
                                        color: activeTab === 2 ? "#0088D6" : "#475569",
                                        "&:hover": { bgcolor: activeTab === 2 ? "#EBF6FE" : "#F8FAFC" }
                                    }}
                                >
                                    Thông báo
                                </Button>

                                {/* Menu 4: Sổ Bệnh Án Điện Tử */}
                                <Button
                                    fullWidth
                                    onClick={() => navigate("/my-history")}
                                    startIcon={<HistoryIcon />}
                                    sx={{
                                        justifyContent: "flex-start",
                                        py: 1.2,
                                        px: 2,
                                        borderRadius: 2,
                                        fontWeight: 600,
                                        fontSize: "0.925rem",
                                        textTransform: "none",
                                        color: "#475569",
                                        "&:hover": { bgcolor: "#F8FAFC", color: "#0088D6" }
                                    }}
                                >
                                    Sổ bệnh án & Đơn thuốc ↗
                                </Button>
                            </Stack>

                            <Divider sx={{ my: 2 }} />

                            {/* Nút Đặt lịch khám mới */}
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<CalendarMonthIcon />}
                                onClick={() => navigate("/booking")}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    color: "#0088D6",
                                    borderColor: "#BAE6FD",
                                    "&:hover": { borderColor: "#0088D6", bgcolor: "#F0F9FF" }
                                }}
                            >
                                + Đặt lịch khám mới
                            </Button>
                        </Paper>
                    </Grid>

                    {/* 3. CỘT PHẢI: KHÔNG GIAN NỘI DUNG TƯƠNG ỨNG TỪNG TAB */}
                    <Grid item xs={12} md={8.8}>
                        {/* ========================================================================= */}
                        {/* TAB 0: HỒ SƠ BỆNH NHÂN (CHÍNH XÁC THEO HÌNH 1)                           */}
                        {/* ========================================================================= */}
                        {activeTab === 0 && (
                            <Box>
                                <Typography
                                    variant="h5"
                                    fontWeight="700"
                                    color="#0F172A"
                                    mb={2.5}
                                    sx={{ letterSpacing: "-0.5px" }}
                                >
                                    Hồ sơ bệnh nhân
                                </Typography>

                                {loading ? (
                                    <Box textAlign="center" py={6}>
                                        <CircularProgress size={32} />
                                        <Typography variant="body2" color="textSecondary" mt={1}>
                                            Đang đồng bộ hồ sơ bệnh nhân...
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={2.5}>
                                        {profiles.map((p) => {
                                            const isPhoneVisible = Boolean(maskPhoneMap[p.patientProfileId]);
                                            return (
                                                <Card
                                                    key={p.patientProfileId}
                                                    elevation={0}
                                                    sx={{
                                                        borderRadius: 3.5,
                                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                                        borderTop: "3px solid #0088D6",
                                                        bgcolor: "#FFFFFF",
                                                        p: 3,
                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                                        transition: "all 0.2s ease-in-out",
                                                        "&:hover": {
                                                            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
                                                            borderColor: "#CBD5E1"
                                                        }
                                                    }}
                                                >
                                                    {/* Các dòng thông tin định danh y tế chuẩn Hình 1 */}
                                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.6 }}>
                                                        {/* Dòng 1: Họ và tên */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <PersonOutlineIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Họ và tên</Typography>
                                                            </Box>
                                                            <Typography variant="body1" fontWeight="700" color="#0088D6" sx={{ letterSpacing: "0.2px" }}>
                                                                {p.fullName?.toUpperCase()}
                                                            </Typography>
                                                        </Box>

                                                        {/* Dòng 2: Ngày sinh */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <CalendarMonthIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Ngày sinh</Typography>
                                                            </Box>
                                                            <Typography variant="body1" fontWeight="500" color="#1E293B">
                                                                {formatDate(p.dateOfBirth)}
                                                            </Typography>
                                                        </Box>

                                                        {/* Dòng 3: Số điện thoại */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <PhoneIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Số điện thoại</Typography>
                                                            </Box>
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <Typography variant="body1" fontWeight="500" color="#1E293B">
                                                                    {formatMaskedPhone(p.phoneNumber, isPhoneVisible)}
                                                                </Typography>
                                                                <Tooltip title={isPhoneVisible ? "Ẩn số điện thoại" : "Hiện đầy đủ số điện thoại"}>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => toggleMaskPhone(p.patientProfileId)}
                                                                        sx={{ color: "#94A3B8" }}
                                                                    >
                                                                        {isPhoneVisible ? <VisibilityOffIcon fontSize="inherit" /> : <VisibilityIcon fontSize="inherit" />}
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                        </Box>

                                                        {/* Dòng 4: Giới tính */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <GroupIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Giới tính</Typography>
                                                            </Box>
                                                            <Typography variant="body1" fontWeight="500" color="#1E293B">
                                                                {p.gender === "MALE" ? "Nam" : (p.gender === "FEMALE" ? "Nữ" : "Khác")}
                                                            </Typography>
                                                        </Box>

                                                        {/* Dòng 5: Địa chỉ */}
                                                        <Box display="flex" alignItems="flex-start">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B", mt: 0.2 }}>
                                                                <LocationOnIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Địa chỉ</Typography>
                                                            </Box>
                                                            <Typography variant="body1" fontWeight="500" color="#1E293B" sx={{ flex: 1, lineHeight: 1.5 }}>
                                                                {[p.streetAddress, p.ward, p.district, p.province].filter(Boolean).join(", ") || "Hồ sơ đăng ký điện tử"}
                                                            </Typography>
                                                        </Box>

                                                        {/* Dòng 6: Dân tộc / BHYT */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <BookmarkBorderIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Dân tộc</Typography>
                                                            </Box>
                                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                                <Typography variant="body1" fontWeight="500" color="#1E293B">
                                                                    {p.ethnicity || "Kinh"}
                                                                </Typography>
                                                                {p.healthInsuranceNumber && (
                                                                    <Chip
                                                                        label={`BHYT: ${p.healthInsuranceNumber}`}
                                                                        size="small"
                                                                        color="info"
                                                                        variant="outlined"
                                                                        sx={{ height: 22, fontWeight: 600, fontSize: "0.75rem" }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </Box>

                                                    {/* Các nút hành động phía dưới bên phải chuẩn Hình 1 */}
                                                    <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2} mt={3}>
                                                        {/* Nút XÓA HỒ SƠ */}
                                                        <Button
                                                            color="error"
                                                            startIcon={<DeleteOutlineIcon />}
                                                            onClick={() => handleDeleteProfile(p)}
                                                            sx={{
                                                                textTransform: "uppercase",
                                                                fontWeight: 700,
                                                                fontSize: "0.85rem",
                                                                color: "#EF4444",
                                                                "&:hover": { bgcolor: "#FEF2F2" }
                                                            }}
                                                        >
                                                            Xóa hồ sơ
                                                        </Button>

                                                        {/* Nút CHỈNH SỬA */}
                                                        <Button
                                                            startIcon={<EditOutlinedIcon />}
                                                            onClick={() => handleOpenEditModal(p)}
                                                            sx={{
                                                                textTransform: "uppercase",
                                                                fontWeight: 700,
                                                                fontSize: "0.85rem",
                                                                color: "#0088D6",
                                                                "&:hover": { bgcolor: "#EBF6FE" }
                                                            }}
                                                        >
                                                            Chỉnh sửa
                                                        </Button>

                                                        {/* Nút CHI TIẾT */}
                                                        <Button
                                                            startIcon={<InfoOutlinedIcon />}
                                                            onClick={() => {
                                                                setViewingRecordSheet(DEFAULT_SAMPLE_TICKET);
                                                                setActiveTab(3);
                                                            }}
                                                            sx={{
                                                                textTransform: "uppercase",
                                                                fontWeight: 700,
                                                                fontSize: "0.85rem",
                                                                color: "#334155",
                                                                "&:hover": { bgcolor: "#F1F5F9" }
                                                            }}
                                                        >
                                                            Chi tiết
                                                        </Button>
                                                    </Box>
                                                </Card>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        )}

                        {/* ========================================================================= */}
                        {/* TAB 1: PHIẾU KHÁM BỆNH (VÉ BARCODE / STT CHÍNH XÁC THEO HÌNH 2)          */}
                        {/* ========================================================================= */}
                        {activeTab === 1 && (
                            <Box>
                                <Typography
                                    variant="h5"
                                    fontWeight="700"
                                    color="#0F172A"
                                    mb={1}
                                    sx={{ letterSpacing: "-0.5px" }}
                                >
                                    Phiếu khám bệnh điện tử
                                </Typography>
                                <Typography variant="body2" color="#64748B" mb={3}>
                                    Vui lòng xuất trình mã vạch hoặc số thứ tự tiếp nhận khi đến bàn hướng dẫn tại sảnh bệnh viện
                                </Typography>

                                {/* THIẾT KẾ VÉ KHÁM DẠNG VÉ BOARDING PASS CÓ KHUYẾT TRÒN 2 BÊN CHUẨN HÌNH 2 */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        maxWidth: 440,
                                        mx: "auto",
                                        borderRadius: 4,
                                        bgcolor: "#FFFFFF",
                                        border: "1px solid #E2E8F0",
                                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
                                        overflow: "hidden",
                                        position: "relative"
                                    }}
                                >
                                    {/* Nửa trên: Header Bệnh Viện & Barcode */}
                                    <Box sx={{ p: 3, textAlign: "center" }}>
                                        <Typography variant="h6" fontWeight="800" color="#0F172A" sx={{ letterSpacing: "0.5px" }}>
                                            PHIẾU KHÁM BỆNH
                                        </Typography>
                                        <Typography variant="body2" fontWeight="600" color="#475569" mt={0.5}>
                                            {currentBooking.hospitalName}
                                        </Typography>
                                        <Typography variant="caption" color="#94A3B8" display="block">
                                            {currentBooking.hospitalAddress}
                                        </Typography>

                                        {/* Mã phiếu & Barcode giả lập độ nét cao chuẩn SVG */}
                                        <Typography variant="caption" color="#64748B" fontWeight="600" sx={{ mt: 2, display: "block" }}>
                                            Mã phiếu
                                        </Typography>

                                        <Box sx={{ my: 1, display: "flex", justifyContent: "center" }}>
                                            <svg width="220" height="50" viewBox="0 0 220 50">
                                                {/* Barcode Stripes */}
                                                <rect x="10" y="5" width="2" height="40" fill="#000" />
                                                <rect x="15" y="5" width="4" height="40" fill="#000" />
                                                <rect x="22" y="5" width="2" height="40" fill="#000" />
                                                <rect x="27" y="5" width="5" height="40" fill="#000" />
                                                <rect x="36" y="5" width="2" height="40" fill="#000" />
                                                <rect x="42" y="5" width="3" height="40" fill="#000" />
                                                <rect x="48" y="5" width="1" height="40" fill="#000" />
                                                <rect x="52" y="5" width="4" height="40" fill="#000" />
                                                <rect x="60" y="5" width="2" height="40" fill="#000" />
                                                <rect x="66" y="5" width="5" height="40" fill="#000" />
                                                <rect x="75" y="5" width="3" height="40" fill="#000" />
                                                <rect x="82" y="5" width="2" height="40" fill="#000" />
                                                <rect x="88" y="5" width="4" height="40" fill="#000" />
                                                <rect x="96" y="5" width="1" height="40" fill="#000" />
                                                <rect x="100" y="5" width="3" height="40" fill="#000" />
                                                <rect x="106" y="5" width="2" height="40" fill="#000" />
                                                <rect x="112" y="5" width="4" height="40" fill="#000" />
                                                <rect x="120" y="5" width="3" height="40" fill="#000" />
                                                <rect x="127" y="5" width="1" height="40" fill="#000" />
                                                <rect x="132" y="5" width="5" height="40" fill="#000" />
                                                <rect x="141" y="5" width="2" height="40" fill="#000" />
                                                <rect x="146" y="5" width="4" height="40" fill="#000" />
                                                <rect x="154" y="5" width="2" height="40" fill="#000" />
                                                <rect x="160" y="5" width="3" height="40" fill="#000" />
                                                <rect x="167" y="5" width="5" height="40" fill="#000" />
                                                <rect x="176" y="5" width="1" height="40" fill="#000" />
                                                <rect x="180" y="5" width="4" height="40" fill="#000" />
                                                <rect x="188" y="5" width="2" height="40" fill="#000" />
                                                <rect x="194" y="5" width="3" height="40" fill="#000" />
                                                <rect x="202" y="5" width="2" height="40" fill="#000" />
                                            </svg>
                                        </Box>

                                        <Typography variant="body2" fontFamily="monospace" fontWeight="700" color="#334155" letterSpacing={1.5}>
                                            {currentBooking.bookingCode}
                                        </Typography>

                                        {/* Badge Trạng Thái (Đã khám / Đang chờ khám) */}
                                        <Box mt={1.5}>
                                            <Chip
                                                label={currentBooking.statusLabel}
                                                size="small"
                                                sx={{
                                                    bgcolor: "#22C55E",
                                                    color: "#FFFFFF",
                                                    fontWeight: 700,
                                                    fontSize: "0.8rem",
                                                    px: 1.5,
                                                    height: 26
                                                }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* ĐƯỜNG RÃNH CẮT ĐỨT NÉT VỚI 2 KHUYẾT TRÒN 2 BÊN CHUẨN THIẾT KẾ VÉ TICKET */}
                                    <Box sx={{ position: "relative", my: 1 }}>
                                        {/* Khuyết tròn bên trái */}
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                left: -14,
                                                top: -14,
                                                width: 28,
                                                height: 28,
                                                borderRadius: "50%",
                                                bgcolor: "#F4F7FB",
                                                border: "1px solid #E2E8F0"
                                            }}
                                        />
                                        {/* Khuyết tròn bên phải */}
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                right: -14,
                                                top: -14,
                                                width: 28,
                                                height: 28,
                                                borderRadius: "50%",
                                                bgcolor: "#F4F7FB",
                                                border: "1px solid #E2E8F0"
                                            }}
                                        />
                                        {/* Đường gạch đứt */}
                                        <Box sx={{ borderTop: "2px dashed #CBD5E1", mx: 2 }} />
                                    </Box>

                                    {/* Nửa dưới: Số Thứ Tự Tiếp Nhận Khổng Lồ & Thông Tin Buồng Khám */}
                                    <Box sx={{ p: 3, pt: 1 }}>
                                        <Typography variant="body2" color="#64748B" textAlign="center" fontWeight="500">
                                            Số thứ tự tiếp nhận
                                        </Typography>

                                        {/* Số thứ tự tiếp nhận to màu xanh dương cyan (04) */}
                                        <Typography
                                            variant="h1"
                                            fontWeight="800"
                                            color="#00A3E0"
                                            textAlign="center"
                                            sx={{ fontSize: "3.75rem", my: 1, letterSpacing: "-1px" }}
                                        >
                                            {String(currentBooking.queueNumber).padStart(2, "0")}
                                        </Typography>

                                        {/* Bảng chi tiết dịch vụ, khu vực, phòng khám */}
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, mt: 2 }}>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="body2" color="#64748B">MÃ PHIẾU</Typography>
                                                <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                    {currentBooking.bookingCode}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="body2" color="#64748B">Dịch vụ</Typography>
                                                <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                    {currentBooking.serviceName}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="body2" color="#64748B">Khu vực</Typography>
                                                <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                    {currentBooking.areaName}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography variant="body2" color="#64748B">Phòng khám</Typography>
                                                <Typography variant="body2" fontWeight="700" color="#0088D6">
                                                    {currentBooking.roomName}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Paper>

                                {/* Nút in và tải vé */}
                                <Box display="flex" justifyContent="center" gap={2} mt={3}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintIcon />}
                                        onClick={() => window.print()}
                                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                                    >
                                        In phiếu khám
                                    </Button>
                                    <Button
                                        variant="contained"
                                        startIcon={<HistoryIcon />}
                                        onClick={() => {
                                            setViewingRecordSheet(currentBooking);
                                            setActiveTab(3);
                                        }}
                                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: "#0088D6" }}
                                    >
                                        Xem kết quả & Đơn thuốc
                                    </Button>
                                </Box>
                            </Box>
                        )}

                        {/* ========================================================================= */}
                        {/* TAB 2: THÔNG BÁO NGƯỜI BỆNH                                              */}
                        {/* ========================================================================= */}
                        {activeTab === 2 && (
                            <Box>
                                <Typography
                                    variant="h5"
                                    fontWeight="700"
                                    color="#0F172A"
                                    mb={2.5}
                                    sx={{ letterSpacing: "-0.5px" }}
                                >
                                    Thông báo hệ thống
                                </Typography>

                                <Stack spacing={2}>
                                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF", display: "flex", gap: 2 }}>
                                        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "#EBF6FE", display: "flex", alignItems: "center", justifyContent: "center", color: "#0088D6" }}>
                                            <LocalHospitalIcon />
                                        </Box>
                                        <Box flex={1}>
                                            <Typography variant="subtitle2" fontWeight="700" color="#0F172A">
                                                Phiếu khám bệnh số 04 đã hoàn tất thủ tục
                                            </Typography>
                                            <Typography variant="body2" color="#64748B" mt={0.5}>
                                                Bác sĩ Đức Xuân Minh tại Phòng khám A104 đã hoàn tất phiên khám. Đơn thuốc điện tử đã được cập nhật vào hồ sơ của bạn.
                                            </Typography>
                                            <Typography variant="caption" color="#94A3B8" mt={1} display="block">
                                                Hôm nay, 10:30
                                            </Typography>
                                        </Box>
                                    </Paper>

                                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF", display: "flex", gap: 2 }}>
                                        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A" }}>
                                            <CheckCircleIcon />
                                        </Box>
                                        <Box flex={1}>
                                            <Typography variant="subtitle2" fontWeight="700" color="#0F172A">
                                                Xác nhận tạo hồ sơ bệnh nhân điện tử thành công
                                            </Typography>
                                            <Typography variant="body2" color="#64748B" mt={0.5}>
                                                Hồ sơ của bệnh nhân Bạch Cao Kỳ (08/07/1997) đã sẵn sàng để thực hiện đặt lịch khám và tra cứu viện phí.
                                            </Typography>
                                            <Typography variant="caption" color="#94A3B8" mt={1} display="block">
                                                Hôm qua, 14:15
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Stack>
                            </Box>
                        )}

                        {/* ========================================================================= */}
                        {/* TAB 3: LỊCH SỬ KHÁM BỆNH & BỆNH ÁN ĐƠN THUỐC (CHÍNH XÁC THEO HÌNH 3)      */}
                        {/* ========================================================================= */}
                        {activeTab === 3 && (
                            <Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                                    <Box>
                                        <Typography variant="h5" fontWeight="700" color="#0F172A" sx={{ letterSpacing: "-0.5px" }}>
                                            {viewingRecordSheet ? "Bệnh án & Phiếu khám chi tiết" : "Lịch sử khám bệnh"}
                                        </Typography>
                                        <Typography variant="body2" color="#64748B">
                                            {viewingRecordSheet ? "Hồ sơ y bạ điện tử lưu trữ kết quả chẩn đoán và đơn thuốc điều trị" : "Toàn bộ hồ sơ các lượt khám ngoại trú và nội trú tại viện"}
                                        </Typography>
                                    </Box>
                                    {viewingRecordSheet ? (
                                        <Button
                                            variant="outlined"
                                            startIcon={<ArrowBackIcon />}
                                            onClick={() => setViewingRecordSheet(null)}
                                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                                        >
                                            Quay lại danh sách
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            color="primary"
                                            onClick={() => navigate("/my-history")}
                                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                                        >
                                            Mở Sổ Bệnh Án Điện Tử Đầy Đủ →
                                        </Button>
                                    )}
                                </Box>

                                {/* NẾU ĐANG CHỌN XEM CHI TIẾT 1 BỆNH ÁN: HIỂN THỊ PHIẾU KHÁM BỆNH THE DUCK HOSPITAL CHUẨN HÌNH 3 */}
                                {viewingRecordSheet ? (
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: { xs: 3, md: 5 },
                                            borderRadius: 3,
                                            bgcolor: "#FFFFFF",
                                            border: "1px solid #E2E8F0",
                                            boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
                                        }}
                                    >
                                        {/* 1. Header Bệnh Viện (Brand Logo bên trái, Thông tin liên hệ bên phải) */}
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
                                            <Box>
                                                <Typography variant="h4" fontWeight="900" color="#0088D6" sx={{ letterSpacing: "1px", lineHeight: 1 }}>
                                                    TNT HOSPITAL
                                                </Typography>
                                                <Typography variant="caption" fontWeight="700" color="#475569" sx={{ letterSpacing: "2px", display: "block" }}>
                                                    BỆNH VIỆN ĐA KHOA QUỐC TẾ
                                                </Typography>
                                                <Typography variant="caption" fontStyle="italic" color="#64748B" mt={0.5} display="block">
                                                    Hết lòng vì người bệnh - Nâng tầm y tế số
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: { xs: "left", sm: "right" }, fontSize: "0.85rem", color: "#475569" }}>
                                                <div>Email: <b>{viewingRecordSheet.hospitalEmail || "hotro@tnthospital.vn"}</b></div>
                                                <div>Số điện thoại: <b>{viewingRecordSheet.hospitalPhone || "1900 8888 - (024) 3888 9999"}</b></div>
                                                <div>Website: <b>{viewingRecordSheet.hospitalWebsite || "https://tnthospital.vn"}</b></div>
                                                <div>Địa chỉ: <b>{viewingRecordSheet.hospitalAddress || "141 Chiến Thắng, Tân Triều, Thanh Trì, Hà Nội"}</b></div>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        {/* 2. Mục: Thông tin bệnh nhân */}
                                        <Typography variant="subtitle1" fontWeight="800" color="#0F172A" mb={1.5}>
                                            Thông tin bệnh nhân
                                        </Typography>
                                        <Grid container spacing={1.5} sx={{ color: "#334155", fontSize: "0.925rem", mb: 3 }}>
                                            <Grid item xs={12} sm={6}>
                                                <span>Mã bệnh nhân: </span>
                                                <b>{viewingRecordSheet.patientCode || "BN8C09434C"}</b>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <span>Họ tên: </span>
                                                <b>{viewingRecordSheet.patientName || "Bạch Cao Kỳ"}</b>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <span>Ngày sinh: </span>
                                                <b>{viewingRecordSheet.patientDob || "08/07/1997"}</b>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <span>Địa chỉ: </span>
                                                <b>{viewingRecordSheet.patientAddress || "645 Hẻm Hoa Lan, Xã Bình Yên, Huyện Sơn Dương, Tỉnh Tuyên Quang"}</b>
                                            </Grid>
                                        </Grid>

                                        {/* 3. Mục: Thông tin khám bệnh */}
                                        <Typography variant="subtitle1" fontWeight="800" color="#0F172A" mb={1.5}>
                                            Thông tin khám bệnh
                                        </Typography>
                                        <Grid container spacing={1.5} sx={{ color: "#334155", fontSize: "0.925rem", mb: 3 }}>
                                            <Grid item xs={12} sm={6}>
                                                <span>Ngày khám: </span>
                                                <b>{viewingRecordSheet.bookingDate || "05/01/2024 00:00"}</b>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <span>Chuyên khoa: </span>
                                                <b>{viewingRecordSheet.departmentName || "Răng - hàm - mặt"}</b>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <span>Bác sĩ chữa trị: </span>
                                                <b>{viewingRecordSheet.doctorName || "BS. Đức Xuân Minh"}</b>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <span>Chuẩn đoán: </span>
                                                <b>{viewingRecordSheet.diagnosis || "Sâu răng"}</b>
                                            </Grid>
                                        </Grid>

                                        {/* 4. Mục: Bảng Đơn Thuốc chuẩn Hình 3 */}
                                        <TableContainer sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, mb: 2, overflow: "hidden" }}>
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, bgcolor: "#F8FAFC", width: 60 }}>STT</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, bgcolor: "#F8FAFC" }}>Tên thuốc</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, bgcolor: "#F8FAFC", width: 120 }}>Số lượng</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, bgcolor: "#F8FAFC", width: 140, textAlign: "right" }}>Đơn giá</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, bgcolor: "#F8FAFC", width: 160, textAlign: "right" }}>Thành tiền</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {(viewingRecordSheet.medicines || DEFAULT_SAMPLE_TICKET.medicines).map((m, idx) => (
                                                        <TableRow key={idx}>
                                                            <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                                                            <TableCell>
                                                                <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                                    {m.name}
                                                                </Typography>
                                                                <Typography variant="caption" color="#64748B">
                                                                    {m.dosage}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 500 }}>{m.quantity}</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 500 }}>
                                                                {m.unitPrice?.toLocaleString()} VNĐ
                                                            </TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700, color: "#0F172A" }}>
                                                                {m.totalPrice?.toLocaleString()} VNĐ
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        {/* Tổng tiền & Ngày tái khám */}
                                        <Box display="flex" justifyContent="flex-end" mb={1}>
                                            <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                                                Tổng tiền: {(viewingRecordSheet.totalAmount || DEFAULT_SAMPLE_TICKET.totalAmount)?.toLocaleString()} VNĐ
                                            </Typography>
                                        </Box>
                                        <Box sx={{ color: "#475569", fontSize: "0.9rem", mb: 3 }}>
                                            <span>Tái khám ngày: </span>
                                            <b>{viewingRecordSheet.reExaminationDate || "Không có"}</b>
                                        </Box>

                                        {/* Nút In ấn */}
                                        <Box display="flex" justifyContent="flex-end" gap={2}>
                                            <Button
                                                variant="contained"
                                                startIcon={<PrintIcon />}
                                                onClick={handlePrintRecordSheet}
                                                sx={{ bgcolor: "#0088D6", borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                            >
                                                In phiếu khám & Đơn thuốc
                                            </Button>
                                        </Box>
                                    </Paper>
                                ) : (
                                    /* Danh sách các lượt khám cũ để chọn xem */
                                    <Stack spacing={2}>
                                        {bookings.map((b, idx) => (
                                            <Paper
                                                key={idx}
                                                elevation={0}
                                                sx={{
                                                    p: 2.5,
                                                    borderRadius: 3,
                                                    border: "1px solid #E2E8F0",
                                                    bgcolor: "#FFFFFF",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    flexWrap: "wrap",
                                                    gap: 2
                                                }}
                                            >
                                                <Box>
                                                    <Box display="flex" alignItems="center" gap={1.5}>
                                                        <Chip
                                                            label={b.bookingCode || "BK-F5F470FC"}
                                                            size="small"
                                                            color="primary"
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                        <Typography variant="subtitle1" fontWeight="700" color="#0F172A">
                                                            {b.departmentName || "Khoa Răng - Hàm - Mặt"}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="#64748B" mt={0.5}>
                                                        Bác sĩ: <b>{b.doctorName || "BS. Đức Xuân Minh"}</b> • Ngày khám: <b>{b.bookingDate || "05/01/2024"}</b>
                                                    </Typography>
                                                    <Typography variant="caption" color="#16A34A" fontWeight="600" mt={0.5} display="block">
                                                        Chẩn đoán: {b.diagnosis || "Sâu răng"}
                                                    </Typography>
                                                </Box>

                                                <Button
                                                    variant="outlined"
                                                    startIcon={<InfoOutlinedIcon />}
                                                    onClick={() => setViewingRecordSheet(b)}
                                                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, borderColor: "#0088D6", color: "#0088D6" }}
                                                >
                                                    Xem phiếu khám & Đơn thuốc
                                                </Button>
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </Container>

            {/* ========================================================================= */}
            {/* 4. MODAL: CHỌN BUỔI KHÁM BỆNH (CHÍNH XÁC THEO HÌNH 4)                    */}
            {/* ========================================================================= */}
            <Dialog
                open={openSelectSessionModal}
                onClose={() => setOpenSelectSessionModal(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3.5, overflow: "hidden" } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.15rem", py: 2, px: 2.5, borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
                    Chọn buổi khám bệnh
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, my: 1 }}>
                        {/* Dòng 1: Ngày khám (Màu đỏ in đậm) */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarMonthIcon sx={{ color: "#475569", fontSize: 20 }} />
                            <Typography variant="body2" color="#475569">
                                Ngày khám:{" "}
                                <Typography component="span" fontWeight="800" color="#DC2626">
                                    {selectedSessionDate}
                                </Typography>
                            </Typography>
                        </Box>

                        {/* Dòng 2: Bác sĩ */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <MedicalServicesIcon sx={{ color: "#475569", fontSize: 20 }} />
                            <Typography variant="body2" color="#475569">
                                Bác sĩ: <b>{selectedDoctorName}</b>
                            </Typography>
                        </Box>

                        {/* Dòng 3: Chuyên khoa */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <LocalHospitalIcon sx={{ color: "#475569", fontSize: 20 }} />
                            <Typography variant="body2" color="#475569">
                                Chuyên khoa: <b>{selectedDepartmentName}</b>
                            </Typography>
                        </Box>

                        {/* Dòng 4: Chọn giờ khám phù hợp với bạn */}
                        <Box mt={1}>
                            <Typography variant="body2" fontWeight="700" color="#0088D6" mb={1} display="flex" alignItems="center" gap={0.5}>
                                <CheckCircleIcon sx={{ fontSize: 18 }} />
                                Chọn giờ khám phù hợp với bạn:
                            </Typography>

                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    variant={chosenSessionSlot === "MORNING" ? "outlined" : "text"}
                                    onClick={() => setChosenSessionSlot("MORNING")}
                                    sx={{
                                        borderWidth: 2,
                                        borderColor: chosenSessionSlot === "MORNING" ? "#0088D6" : "#E2E8F0",
                                        bgcolor: chosenSessionSlot === "MORNING" ? "#F0F9FF" : "transparent",
                                        color: chosenSessionSlot === "MORNING" ? "#0088D6" : "#475569",
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        px: 2.5,
                                        py: 0.8,
                                        textTransform: "none"
                                    }}
                                >
                                    Buổi sáng
                                </Button>
                                <Button
                                    variant={chosenSessionSlot === "AFTERNOON" ? "outlined" : "text"}
                                    onClick={() => setChosenSessionSlot("AFTERNOON")}
                                    sx={{
                                        borderWidth: 2,
                                        borderColor: chosenSessionSlot === "AFTERNOON" ? "#0088D6" : "#E2E8F0",
                                        bgcolor: chosenSessionSlot === "AFTERNOON" ? "#F0F9FF" : "transparent",
                                        color: chosenSessionSlot === "AFTERNOON" ? "#0088D6" : "#475569",
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        px: 2.5,
                                        py: 0.8,
                                        textTransform: "none"
                                    }}
                                >
                                    Buổi chiều
                                </Button>
                            </Stack>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0, justifyContent: "flex-end", gap: 1 }}>
                    <Button
                        onClick={() => setOpenSelectSessionModal(false)}
                        sx={{
                            color: "#DC2626",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.875rem"
                        }}
                    >
                        HỦY BỎ
                    </Button>
                    <Button
                        onClick={() => {
                            setOpenSelectSessionModal(false);
                            setToastMessage(`Đã chọn thành công lịch khám ngày ${selectedSessionDate} (${chosenSessionSlot === "MORNING" ? "Buổi sáng" : "Buổi chiều"})!`);
                            setActiveTab(1); // Chuyển sang xem phiếu khám
                        }}
                        sx={{
                            color: "#16A34A",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "0.875rem"
                        }}
                    >
                        ĐỒNG Ý
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ========================================================================= */}
            {/* 5. MODAL: THÊM / CHỈNH SỬA HỒ SƠ BỆNH NHÂN                                */}
            {/* ========================================================================= */}
            <Dialog
                open={openAddEditModal}
                onClose={() => !submitting && setOpenAddEditModal(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3.5, overflow: "hidden" } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0088D6", borderBottom: "1px solid rgba(15, 23, 42, 0.08)", py: 2, px: 3 }}>
                    {editingProfileId ? "Cập Nhật Hồ Sơ Bệnh Nhân" : "Thêm Mới Hồ Sơ Bệnh Nhân"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSaveProfile}>
                    <DialogContent sx={{ pt: 3 }}>
                        {validationError && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                                {validationError}
                            </Alert>
                        )}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên bệnh nhân *"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Ví dụ: BẠCH CAO KỲ"
                                    required
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Giới tính *"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    size="small"
                                >
                                    <MenuItem value="FEMALE">Nữ</MenuItem>
                                    <MenuItem value="MALE">Nam</MenuItem>
                                    <MenuItem value="OTHER">Khác</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Ngày sinh *"
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ max: formatISODate(new Date()) }}
                                    required
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số điện thoại liên hệ *"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="0987654171"
                                    required
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số CCCD / CMND"
                                    value={formData.identityNumber}
                                    onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                                    placeholder="12 chữ số CCCD"
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Mã thẻ BHYT (Nếu có)"
                                    value={formData.healthInsuranceNumber}
                                    onChange={(e) => setFormData({ ...formData, healthInsuranceNumber: e.target.value.toUpperCase() })}
                                    placeholder="DN4010900123456"
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Dân tộc"
                                    value={formData.ethnicity}
                                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                                    placeholder="Kinh"
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Autocomplete
                                    options={VIETNAM_PROVINCES_34.map(p => p.name)}
                                    value={formData.province || "Tỉnh Tuyên Quang"}
                                    onChange={(_, newValue) => {
                                        const newProv = newValue || "Tỉnh Tuyên Quang";
                                        const newWards = getWardsByProvince(newProv);
                                        setFormData({
                                            ...formData,
                                            province: newProv,
                                            ward: newWards[0] || ""
                                        });
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Tỉnh / Thành phố" size="small" required />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Quận / Huyện"
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    placeholder="Huyện Sơn Dương"
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                {availableWards.length > 0 ? (
                                    <Autocomplete
                                        freeSolo
                                        options={availableWards}
                                        value={formData.ward || ""}
                                        onInputChange={(_, newValue) => setFormData({ ...formData, ward: newValue })}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Xã / Phường" size="small" placeholder="Xã Bình Yên" />
                                        )}
                                    />
                                ) : (
                                    <TextField
                                        fullWidth
                                        label="Xã / Phường"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        placeholder="Xã Bình Yên"
                                        size="small"
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Địa chỉ chi tiết (Số nhà, ngõ ngách, tên đường)"
                                    value={formData.streetAddress}
                                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                    placeholder="645 Hẻm Hoa Lan, Xã Bình Yên"
                                    size="small"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
                        <Button
                            onClick={() => setOpenAddEditModal(false)}
                            disabled={submitting}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                            sx={{
                                bgcolor: "#0088D6",
                                "&:hover": { bgcolor: "#0070BA" },
                                borderRadius: 2,
                                px: 3,
                                fontWeight: 700,
                                textTransform: "none"
                            }}
                        >
                            {submitting ? "Đang lưu..." : (editingProfileId ? "Cập Nhật Hồ Sơ" : "Tạo Mới Hồ Sơ")}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Thông báo Toast Snackbar */}
            <Snackbar
                open={Boolean(toastMessage)}
                autoHideDuration={4000}
                onClose={() => setToastMessage("")}
                message={toastMessage}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            />
        </Box>
    );
}
