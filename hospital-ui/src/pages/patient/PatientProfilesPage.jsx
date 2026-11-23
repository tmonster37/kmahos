import React, { useState, useEffect, useRef } from "react";
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
    Snackbar,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PersonIcon from "@mui/icons-material/Person";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import PhoneIcon from "@mui/icons-material/Phone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupIcon from "@mui/icons-material/Group";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import LinkIcon from "@mui/icons-material/Link";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { bookingApi } from "../../services/bookingApi";
import { clinicalApi } from "../../services/clinicalApi";
import { getBookingCodeDisplay, getQueueNumberDisplay } from "../customer/BookingPage";
import { printAppointmentTicket, printMedicalRecordSheet } from "../../utils/printHelper";
import designTokens, { getStatusConfig } from "../../theme/designTokens";
import PatientProfileDetailModal from "../../components/common/PatientProfileDetailModal";
import ElectronicMedicalRecordModal from "../../components/common/ElectronicMedicalRecordModal";
import LinkExistingProfileModal from "../../components/common/LinkExistingProfileModal";
import AddOrLinkPatientProfileModal from "../../components/common/AddOrLinkPatientProfileModal";
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
import axiosInstance from "../../services/AxiosInstance";

export function usePatientHistoryDetailWorkflow({
    initialSelectedHistoryDetail = null,
    clinicalApiClient = clinicalApi
} = {}) {
    const [selectedHistoryDetail, setSelectedHistoryDetailState] = useState(initialSelectedHistoryDetail);
    const historyRequestSeqRef = useRef(0);

    const setSelectedHistoryDetail = (val) => {
        if (val === null) {
            historyRequestSeqRef.current += 1;
        }
        setSelectedHistoryDetailState(val);
    };

    const handleOpenHistoryDetail = async (v) => {
        const seq = ++historyRequestSeqRef.current;
        setSelectedHistoryDetailState({ ...v, loadingClinicalRecord: true, clinicalRecordError: null });
        const rawCode = v?.rawBookingCode || (v?.bookingCode && v.bookingCode !== "Chưa có mã" && !v.bookingCode.startsWith("Chưa") ? v.bookingCode : null);
        if (!rawCode) {
            if (historyRequestSeqRef.current !== seq) return;
            setSelectedHistoryDetailState(prev => ({
                ...prev,
                loadingClinicalRecord: false,
                clinicalRecord: null,
                reExaminationDate: null
            }));
            return;
        }

        try {
            const client = clinicalApiClient || clinicalApi;
            const res = await client.getRecordByBookingCode(rawCode);
            if (historyRequestSeqRef.current !== seq) return;
            const rec = res?.data?.data || res?.data || res;
            if (rec && rec.recordId) {
                setSelectedHistoryDetailState(prev => ({
                    ...prev,
                    loadingClinicalRecord: false,
                    clinicalRecord: rec,
                    reExaminationDate: (rec.state === "DONE" && rec.reExaminationDate) ? rec.reExaminationDate : null
                }));
            } else {
                setSelectedHistoryDetailState(prev => ({
                    ...prev,
                    loadingClinicalRecord: false,
                    clinicalRecord: null,
                    reExaminationDate: null
                }));
            }
        } catch (err) {
            if (historyRequestSeqRef.current !== seq) return;
            const status = err?.response?.status;
            if (status === 404) {
                setSelectedHistoryDetailState(prev => ({
                    ...prev,
                    loadingClinicalRecord: false,
                    clinicalRecord: null,
                    reExaminationDate: null
                }));
            } else {
                setSelectedHistoryDetailState(prev => ({
                    ...prev,
                    loadingClinicalRecord: false,
                    clinicalRecordError: "Không thể tải thông tin bệnh án từ máy chủ. Vui lòng thử lại sau."
                }));
            }
        }
    };

    const handleCloseHistoryDetail = () => {
        historyRequestSeqRef.current += 1;
        setSelectedHistoryDetailState(null);
    };

    return {
        selectedHistoryDetail,
        setSelectedHistoryDetail,
        handleOpenHistoryDetail,
        handleCloseHistoryDetail,
        historyRequestSeqRef
    };
}

export default function PatientProfilesPage({
    initialActiveTab,
    initialSelectedHistoryDetail,
    initialSelectedTicketDetail = null,
    initialProfiles,
    initialBookings,
    clinicalApiClient = clinicalApi,
    bookingApiClient = bookingApi
} = {}) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    // Tab đang chọn: 0: Hồ sơ bệnh nhân (Hình 134-135), 1: Phiếu khám bệnh (Hình 136-137), 2: Lịch sử khám bệnh (Hình 138-139), 3: Thông báo
    const [activeTab, setActiveTab] = useState(() => {
        if (initialActiveTab !== undefined) return initialActiveTab;
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        if (tab === "ticket") return 1;
        if (tab === "history") return 2;
        if (tab === "notifications") return 3;
        return 0;
    });

    const [profiles, setProfiles] = useState(initialProfiles || []);
    const [bookings, setBookings] = useState(initialBookings || []);
    const [loading, setLoading] = useState(false);
    const [maskPhoneMap, setMaskPhoneMap] = useState({});

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [loadingNotifs, setLoadingNotifs] = useState(false);

    // Modals Thêm/Liên kết hồ sơ bệnh nhân (Hình 140 - 143)
    const [openAddOrLinkModal, setOpenAddOrLinkModal] = useState(false);
    const [addOrLinkInitialTab, setAddOrLinkInitialTab] = useState(0);
    const [editingProfile, setEditingProfile] = useState(null);

    // Modal / View Chi tiết Phiếu khám bệnh (Hình 137)
    const [selectedTicketDetail, setSelectedTicketDetail] = useState(initialSelectedTicketDetail);
    const [expandedTicketProfileId, setExpandedTicketProfileId] = useState(null);

    // Modal / View Chi tiết Lịch sử khám bệnh & Toa thuốc (Hình 139)
    const {
        selectedHistoryDetail,
        setSelectedHistoryDetail,
        handleOpenHistoryDetail,
        handleCloseHistoryDetail,
        historyRequestSeqRef
    } = usePatientHistoryDetailWorkflow({
        initialSelectedHistoryDetail,
        clinicalApiClient
    });
    const [expandedHistoryProfileId, setExpandedHistoryProfileId] = useState(null);

    // Modal Chi tiết Hồ sơ bệnh nhân (Hành chính & Nhân khẩu - Hình 135)
    const [selectedProfileDetail, setSelectedProfileDetail] = useState(null);

    // Modal Bệnh án điện tử EMR/EHR
    const [selectedBookingForEhr, setSelectedBookingForEhr] = useState(null);

    // Modal Chọn buổi khám bệnh
    const [openSelectSessionModal, setOpenSelectSessionModal] = useState(false);
    const [selectedSessionDate, setSelectedSessionDate] = useState("25/01/2024");
    const [chosenSessionSlot, setChosenSessionSlot] = useState("MORNING");

    // Toast
    const [toastMessage, setToastMessage] = useState("");

    useEffect(() => {
        if (initialProfiles !== undefined || initialBookings !== undefined) {
            if (initialProfiles && initialProfiles.length > 0) {
                setExpandedTicketProfileId(prev => prev || initialProfiles[0]?.patientProfileId);
                setExpandedHistoryProfileId(prev => prev || initialProfiles[0]?.patientProfileId);
            }
            return;
        }
        loadData();
    }, []);

    // Đồng bộ URL parameter với tab ngay cả khi chuyển link hoặc back/forward
    useEffect(() => {
        if (initialActiveTab !== undefined) return;
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        const bookingCode = params.get("bookingCode");
        if (tab === "ticket") {
            setActiveTab(1);
            if (!bookingCode && !initialSelectedTicketDetail) {
                setSelectedTicketDetail(null);
            }
        } else if (tab === "history") {
            setActiveTab(2);
            setSelectedHistoryDetail(null);
        } else if (tab === "notifications") {
            setActiveTab(3);
        } else if (tab === "profiles" || !tab) {
            setActiveTab(0);
            setSelectedTicketDetail(null);
            setSelectedHistoryDetail(null);
        }
    }, [location.search]);

    // Tự động mở chi tiết vé tương ứng khi URL có bookingCode (liên thông từ Đặt Khám)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");
        const bookingCode = params.get("bookingCode");
        if (tab === "ticket" && bookingCode && Array.isArray(bookings) && bookings.length > 0) {
            const match = bookings.find(b =>
                (b.rawBookingCode && b.rawBookingCode === bookingCode) ||
                (b.bookingCode && b.bookingCode === bookingCode) ||
                String(b.bookingId) === bookingCode
            );
            if (match) {
                setSelectedTicketDetail(match);
                if (match.patientProfileId) {
                    setExpandedTicketProfileId(match.patientProfileId);
                }
            }
        }
    }, [location.search, bookings]);

    // Đồng bộ URL parameter với tab
    const handleTabChange = (index) => {
        setActiveTab(index);
        setSelectedTicketDetail(null);
        setSelectedHistoryDetail(null);
        const tabKeys = ["profiles", "ticket", "history", "notifications"];
        navigate(`/profiles?tab=${tabKeys[index]}`, { replace: true });
        if (index === 3) {
            fetchNotifications();
        }
    };

    const fetchNotifications = async () => {
        setLoadingNotifs(true);
        try {
            const res = await axiosInstance.get("/api/utilities/notifications");
            const data = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
            setNotifications(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Lỗi tải thông báo:", err);
            setNotifications([]);
        } finally {
            setLoadingNotifs(false);
        }
    };

    const handleMarkNotifAsRead = async (notifId) => {
        try {
            await axiosInstance.put(`/api/utilities/notifications/${notifId}/read`);
            setNotifications(prev => (Array.isArray(prev) ? prev : []).map(n => (n?.notificationId === notifId || n?.id === notifId) ? { ...n, isRead: true, read: true } : n));
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkAllNotifsAsRead = async () => {
        try {
            await axiosInstance.put("/api/utilities/notifications/read-all");
            setNotifications(prev => (Array.isArray(prev) ? prev : []).map(n => ({ ...n, isRead: true, read: true })));
        } catch (e) {
            console.error(e);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Tải danh sách hồ sơ của tài khoản
            const profileRes = await (bookingApiClient || bookingApi).getMyProfiles().catch(() => null);
            const rawProfiles = profileRes?.data || (Array.isArray(profileRes) ? profileRes : []);
            const profileList = Array.isArray(rawProfiles) ? rawProfiles : [];
            setProfiles(profileList);

            if (profileList.length > 0) {
                setExpandedTicketProfileId(prev => prev || profileList[0]?.patientProfileId);
                setExpandedHistoryProfileId(prev => prev || profileList[0]?.patientProfileId);
            }

            // 2. Tải danh sách các phiếu khám & lịch sử khám
            const bookingRes = await (bookingApiClient || bookingApi).getMyBookings().catch(() => null);
            const rawBookings = bookingRes?.data || (Array.isArray(bookingRes) ? bookingRes : []);
            let bookingList = Array.isArray(rawBookings) ? rawBookings : [];
            
            if (bookingList.length > 0) {
                // Đảm bảo có đủ trường chi tiết để in phiếu khám
                bookingList = bookingList.map((b, idx) => ({
                    ...b,
                    rawBookingCode: b?.bookingCode || null,
                    queueNumber: b?.queueNumber != null ? b.queueNumber : null,
                    bookingCode: getBookingCodeDisplay(b?.bookingCode),
                    patientName: b?.patientName || "Bệnh nhân",
                    patientPhone: b?.patientPhone || user?.phoneNumber || "",
                    patientDob: b?.patientDob || null,
                    patientGender: b?.patientGender || "OTHER",
                    identityNumber: b?.identityNumber || "",
                    doctorName: b?.doctorName || "Chưa phân công",
                    departmentName: b?.departmentName || "Khám Chuyên Khoa",
                    roomName: b?.roomName || "Chưa xếp phòng",
                    statusLabel: b?.status === "COMPLETED" ? "Đã khám" : (b?.status === "CONFIRMED" ? "Đang chờ khám" : (b?.status === "CANCELLED" ? "Đã hủy lịch" : "Chờ tiếp nhận"))
                }));

                const params = new URLSearchParams(location.search);
                const targetBookingCode = params.get("bookingCode");
                if (targetBookingCode) {
                    const match = bookingList.find(b =>
                        (b.rawBookingCode && b.rawBookingCode === targetBookingCode) ||
                        (b.bookingCode && b.bookingCode === targetBookingCode) ||
                        String(b.bookingId) === targetBookingCode
                    );
                    if (match) {
                        setSelectedTicketDetail(match);
                        if (match.patientProfileId) {
                            setExpandedTicketProfileId(match.patientProfileId);
                        }
                    }
                }
            }
            setBookings(bookingList);
            fetchNotifications();
        } catch (err) {
            console.error("Lỗi nạp dữ liệu bệnh nhân:", err);
            setProfiles([]);
            setBookings([]);
            setNotifications([]);
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

    // Mở modal Thêm hồ sơ mới (Chưa từng khám - Hình 140)
    const handleOpenAddModal = () => {
        setEditingProfile(null);
        setAddOrLinkInitialTab(0);
        setOpenAddOrLinkModal(true);
    };

    // Mở modal Liên kết hồ sơ cũ (Đã từng khám - Hình 141)
    const handleOpenLinkModal = () => {
        setEditingProfile(null);
        setAddOrLinkInitialTab(1);
        setOpenAddOrLinkModal(true);
    };

    // Mở modal Sửa hồ sơ
    const handleOpenEditModal = (p) => {
        setEditingProfile(p);
        setAddOrLinkInitialTab(0);
        setOpenAddOrLinkModal(true);
    };

    // Xóa hồ sơ
    const handleDeleteProfile = async (p) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ bệnh nhân "${p.fullName}" không?`)) {
            return;
        }
        try {
            await bookingApi.deleteProfile(p.patientProfileId);
            setProfiles(prev => prev.filter(item => item.patientProfileId !== p.patientProfileId));
            setToastMessage(`Đã xóa hồ sơ bệnh nhân "${p.fullName}" thành công!`);
        } catch (err) {
            console.error("Lỗi xóa hồ sơ:", err);
            alert(err?.response?.data?.message || err?.message || "Không thể xóa hồ sơ bệnh nhân!");
        }
    };

    // In Phiếu Khám Bệnh & Đơn Thuốc (Hình 139)
    const handlePrintRecordSheet = (record) => {
        if (record) {
            printMedicalRecordSheet(record);
        } else if (selectedHistoryDetail) {
            printMedicalRecordSheet(selectedHistoryDetail);
        } else {
            window.print();
        }
    };

    // Hủy đặt lịch khám bệnh nhân
    const [cancellingBooking, setCancellingBooking] = useState(false);
    const handleCancelBooking = async (booking) => {
        if (!booking || !booking.bookingId) return;
        const confirmMsg = `Bạn có chắc chắn muốn hủy lịch khám (Mã: ${booking.bookingCode}) cho bệnh nhân ${booking.patientName}? Khung giờ khám sẽ được giải phóng cho bệnh nhân khác.`;
        if (!window.confirm(confirmMsg)) return;

        setCancellingBooking(true);
        try {
            await bookingApi.cancelBooking(booking.bookingId);
            setToastMessage("Đã hủy lịch khám thành công!");
            if (selectedTicketDetail?.bookingId === booking.bookingId) {
                setSelectedTicketDetail(prev => prev ? { ...prev, status: "CANCELLED", statusLabel: "Đã hủy lịch" } : null);
            }
            await loadData();
        } catch (err) {
            console.error("Lỗi hủy lịch khám:", err);
            setToastMessage(err?.response?.data?.message || err?.message || "Không thể hủy lịch khám!");
        } finally {
            setCancellingBooking(false);
        }
    };

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
                                <Breadcrumbs aria-label="breadcrumb">
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
                                        {activeTab === 2 && "Lịch sử khám bệnh"}
                                        {activeTab === 3 && "Thông báo"}
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

                        <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                                icon={<GroupIcon />}
                                label={`${profiles.length} Hồ sơ gia đình`}
                                sx={{ bgcolor: "#E0F2FE", color: "#0369A1", fontWeight: 700 }}
                            />
                            <Chip
                                icon={<ReceiptLongIcon />}
                                label={`${bookings.length} Phiếu khám` }
                                sx={{ bgcolor: "#ECFDF5", color: "#047857", fontWeight: 700 }}
                            />
                        </Box>
                    </Box>
                </Paper>

                {/* 2. KHÔNG GIAN BỐ CỤC 2 CỘT */}
                <Grid container spacing={3}>
                    {/* 2.1 CỘT TRÁI: THANH ĐIỀU HƯỚNG TÁC NGHIỆP BỆNH NHÂN */}
                    <Grid item xs={12} md={3.2}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 3.5,
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                                position: { md: "sticky" },
                                top: { md: 24 }
                            }}
                        >
                            {/* Nút Thêm hồ sơ bệnh nhân mới (Hình 134 mục 1) */}
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={handleOpenAddModal}
                                sx={{
                                    bgcolor: "#0088D6",
                                    "&:hover": { bgcolor: "#0070BA" },
                                    borderRadius: 2,
                                    py: 1.3,
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    textTransform: "none",
                                    boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                                    mb: 2
                                }}
                            >
                                + Thêm hồ sơ
                            </Button>

                            {/* Danh sách các Menu điều hướng chuẩn Hình 134, 136, 138 */}
                            <Stack spacing={1}>
                                {/* Menu 1: Hồ sơ bệnh nhân (Hình 134 mục 2) */}
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

                                {/* Menu 2: Phiếu khám bệnh (Hình 136 mục 3) */}
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

                                {/* Menu 3: Thông báo (Hình 134, 136, 138 mục thông báo) */}
                                <Button
                                    fullWidth
                                    onClick={() => handleTabChange(3)}
                                    startIcon={<NotificationsNoneIcon />}
                                    sx={{
                                        justifyContent: "flex-start",
                                        py: 1.2,
                                        px: 2,
                                        borderRadius: 2,
                                        fontWeight: activeTab === 3 ? 700 : 500,
                                        fontSize: "0.925rem",
                                        textTransform: "none",
                                        bgcolor: activeTab === 3 ? "#EBF6FE" : "transparent",
                                        color: activeTab === 3 ? "#0088D6" : "#475569",
                                        "&:hover": { bgcolor: activeTab === 3 ? "#EBF6FE" : "#F8FAFC" }
                                    }}
                                >
                                    Thông báo
                                </Button>

                                {/* Menu 4: Lịch sử khám bệnh (Hình 138 mục 4) */}
                                <Button
                                    fullWidth
                                    onClick={() => handleTabChange(2)}
                                    startIcon={<HistoryIcon />}
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
                                    Lịch sử khám bệnh
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

                    {/* 2.2 CỘT PHẢI: KHÔNG GIAN NỘI DUNG TƯƠNG ỨNG TỪNG TAB */}
                    <Grid item xs={12} md={8.8}>
                        {/* ========================================================================= */}
                        {/* TAB 0: HỒ SƠ BỆNH NHÂN (CHÍNH XÁC THEO HÌNH 134 & 135 / BẢNG 89)           */}
                        {/* ========================================================================= */}
                        {activeTab === 0 && (
                            <Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
                                    <Typography
                                        variant="h5"
                                        fontWeight="700"
                                        color="#0F172A"
                                        sx={{ letterSpacing: "-0.5px" }}
                                    >
                                        Hồ sơ bệnh nhân
                                    </Typography>
                                    <Stack direction="row" spacing={1.5}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<LinkIcon />}
                                            onClick={handleOpenLinkModal}
                                            sx={{
                                                borderColor: "#0284C7",
                                                color: "#0284C7",
                                                "&:hover": { borderColor: "#0369A1", bgcolor: "#F0F9FF" },
                                                borderRadius: 2,
                                                fontWeight: 700,
                                                fontSize: "0.875rem",
                                                textTransform: "none"
                                            }}
                                        >
                                            Liên kết hồ sơ cũ
                                        </Button>
                                        <Button
                                            variant="contained"
                                            startIcon={<PersonAddIcon />}
                                            onClick={handleOpenAddModal}
                                            sx={{
                                                bgcolor: "#0088D6",
                                                "&:hover": { bgcolor: "#0070BA" },
                                                borderRadius: 2,
                                                fontWeight: 700,
                                                fontSize: "0.875rem",
                                                textTransform: "none"
                                            }}
                                        >
                                            Thêm hồ sơ
                                        </Button>
                                    </Stack>
                                </Box>

                                {loading ? (
                                    <Box textAlign="center" py={6}>
                                        <CircularProgress size={32} />
                                        <Typography variant="body2" color="textSecondary" mt={1}>
                                            Đang đồng bộ hồ sơ bệnh nhân...
                                        </Typography>
                                    </Box>
                                ) : profiles.length === 0 ? (
                                    <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 3, bgcolor: "#FFFFFF", border: "1px dashed #CBD5E1" }}>
                                        <PersonOutlineIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
                                        <Typography variant="subtitle1" fontWeight="700" color="#334155" gutterBottom>
                                            Chưa có hồ sơ bệnh nhân
                                        </Typography>
                                        <Typography variant="body2" color="#64748B" sx={{ maxWidth: 400, mx: "auto", mb: 2 }}>
                                            Tài khoản của bạn chưa có hồ sơ bệnh nhân nào. Hãy thêm hồ sơ để thuận tiện đặt lịch khám.
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            onClick={handleOpenAddModal}
                                            startIcon={<PersonAddIcon />}
                                            sx={{ bgcolor: "#0088D6", textTransform: "none", borderRadius: 2, fontWeight: 700 }}
                                        >
                                            Thêm hồ sơ mới
                                        </Button>
                                    </Paper>
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
                                                    {/* Các dòng thông tin định danh y tế chuẩn Hình 134 */}
                                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.6 }}>
                                                        {/* Dòng 1: Họ và tên */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <PersonOutlineIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Họ và tên</Typography>
                                                            </Box>
                                                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                                <Typography variant="body1" fontWeight="700" color="#0088D6" sx={{ letterSpacing: "0.2px" }}>
                                                                    {p.fullName?.toUpperCase()}
                                                                </Typography>
                                                                {p.relationship && (
                                                                    <Chip
                                                                        label={
                                                                            p.relationship === "CHILD" ? "Con cái" :
                                                                            p.relationship === "SPOUSE" ? "Vợ / Chồng" :
                                                                            p.relationship === "PARENT" ? "Bố / Mẹ" :
                                                                            p.relationship === "OTHER" ? "Người thân" : "Bản thân"
                                                                        }
                                                                        size="small"
                                                                        sx={{
                                                                            height: 22,
                                                                            fontWeight: 700,
                                                                            fontSize: "0.725rem",
                                                                            bgcolor: p.relationship === "SELF" ? "#EBF5FF" : "#F3E8FF",
                                                                            color: p.relationship === "SELF" ? "#0088D6" : "#7E22CE"
                                                                        }}
                                                                    />
                                                                )}
                                                                {(p.isLinked || p.linked) && (
                                                                    <Chip
                                                                        label="Đã liên kết"
                                                                        size="small"
                                                                        color="primary"
                                                                        variant="outlined"
                                                                        sx={{ height: 22, fontWeight: 700, fontSize: "0.725rem" }}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </Box>

                                                        {/* Dòng 2: Mã bệnh nhân */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <ReceiptLongIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Mã bệnh nhân</Typography>
                                                            </Box>
                                                            <Typography variant="body1" fontWeight="700" color="#0F766E" sx={{ fontFamily: "monospace" }}>
                                                                {p.patientCode || "Chờ cấp mã"}
                                                            </Typography>
                                                        </Box>

                                                        {/* Dòng 3: Ngày sinh */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <CalendarMonthIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Ngày sinh</Typography>
                                                            </Box>
                                                            <Typography variant="body1" fontWeight="500" color="#1E293B">
                                                                {formatDate(p.dateOfBirth)}
                                                            </Typography>
                                                        </Box>

                                                        {/* Dòng 4: Số điện thoại */}
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

                                                        {/* Dòng 5: Giới tính */}
                                                        <Box display="flex" alignItems="center">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                                                <GroupIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Giới tính</Typography>
                                                            </Box>
                                                            <Typography variant="body1" fontWeight="500" color="#1E293B">
                                                                {p.gender === "MALE" ? "Nam" : (p.gender === "FEMALE" ? "Nữ" : "Khác")}
                                                            </Typography>
                                                        </Box>

                                                        {/* Dòng 6: Địa chỉ */}
                                                        <Box display="flex" alignItems="flex-start">
                                                            <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B", mt: 0.2 }}>
                                                                <LocationOnIcon sx={{ fontSize: 20 }} />
                                                                <Typography variant="body2" color="#64748B">Địa chỉ</Typography>
                                                            </Box>
                                                            <Typography variant="body1" fontWeight="500" color="#1E293B" sx={{ flex: 1, lineHeight: 1.5 }}>
                                                                {[p.streetAddress, p.ward, p.district, p.province].filter(Boolean).join(", ") || "Hồ sơ đăng ký điện tử"}
                                                            </Typography>
                                                        </Box>

                                                        {/* Dòng 7: Dân tộc / BHYT */}
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

                                                    {/* Các nút hành động phía dưới chuẩn Hình 134 */}
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mt={3} pt={2} borderTop="1px solid #F1F5F9">
                                                        <Stack direction="row" spacing={1}>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                startIcon={<ReceiptLongIcon />}
                                                                onClick={() => {
                                                                    setActiveTab(1);
                                                                    setExpandedTicketProfileId(p.patientProfileId);
                                                                    setSelectedTicketDetail(null);
                                                                }}
                                                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, fontSize: "0.8rem", color: "#0088D6", borderColor: "#BAE6FD" }}
                                                            >
                                                                Xem phiếu khám
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                startIcon={<HistoryIcon />}
                                                                onClick={() => {
                                                                    setActiveTab(2);
                                                                    setExpandedHistoryProfileId(p.patientProfileId);
                                                                    setSelectedHistoryDetail(null);
                                                                }}
                                                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, fontSize: "0.8rem", color: "#059669", borderColor: "#A7F3D0" }}
                                                            >
                                                                Xem lịch sử
                                                            </Button>
                                                        </Stack>

                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            {/* Nút XÓA HỒ SƠ (Hình 134 mục 7) */}
                                                            <Button
                                                                color="error"
                                                                startIcon={<DeleteOutlineIcon />}
                                                                onClick={() => handleDeleteProfile(p)}
                                                                sx={{
                                                                    textTransform: "uppercase",
                                                                    fontWeight: 700,
                                                                    fontSize: "0.825rem",
                                                                    color: "#EF4444",
                                                                    "&:hover": { bgcolor: "#FEF2F2" }
                                                                }}
                                                            >
                                                                Xóa hồ sơ
                                                            </Button>

                                                            {/* Nút CHỈNH SỬA (Hình 134 mục 6) */}
                                                            <Button
                                                                startIcon={<EditOutlinedIcon />}
                                                                onClick={() => handleOpenEditModal(p)}
                                                                sx={{
                                                                    textTransform: "uppercase",
                                                                    fontWeight: 700,
                                                                    fontSize: "0.825rem",
                                                                    color: "#0088D6",
                                                                    "&:hover": { bgcolor: "#EBF6FE" }
                                                                }}
                                                            >
                                                                Chỉnh sửa
                                                            </Button>

                                                            {/* Nút CHI TIẾT HỒ SƠ (Hình 134 mục 5 & Hình 135) */}
                                                            <Button
                                                                variant="contained"
                                                                startIcon={<InfoOutlinedIcon />}
                                                                onClick={() => setSelectedProfileDetail(p)}
                                                                sx={{
                                                                    textTransform: "uppercase",
                                                                    fontWeight: 700,
                                                                    fontSize: "0.825rem",
                                                                    bgcolor: "#0088D6",
                                                                    "&:hover": { bgcolor: "#0070BA" },
                                                                    borderRadius: 2
                                                                }}
                                                            >
                                                                Chi tiết
                                                            </Button>
                                                        </Stack>
                                                    </Box>
                                                </Card>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        )}

                        {/* ========================================================================= */}
                        {/* TAB 1: PHIẾU KHÁM BỆNH (HÌNH 136: ACCORDION & HÌNH 137: CHI TIẾT VÉ)        */}
                        {/* ========================================================================= */}
                        {activeTab === 1 && (
                            <Box>
                                {/* ------------------------------------------------------------- */}
                                {/* NẾU ĐANG XEM CHI TIẾT 1 PHIẾU KHÁM (HÌNH 137 / BẢNG 91)       */}
                                {/* ------------------------------------------------------------- */}
                                {selectedTicketDetail ? (
                                    <Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                                            <Button
                                                variant="outlined"
                                                startIcon={<ArrowBackIcon />}
                                                onClick={() => setSelectedTicketDetail(null)}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: "none",
                                                    fontWeight: 700,
                                                    color: designTokens.brand.primaryDark,
                                                    borderColor: designTokens.brand.primaryBorder,
                                                    "&:hover": { borderColor: designTokens.brand.primary, bgcolor: designTokens.brand.primaryLight }
                                                }}
                                            >
                                                Quay lại danh sách các phiếu khám bệnh
                                            </Button>

                                            <Button
                                                variant="contained"
                                                startIcon={<PrintIcon />}
                                                onClick={() => printAppointmentTicket(selectedTicketDetail)}
                                                sx={{ bgcolor: designTokens.secondary.main, "&:hover": { bgcolor: designTokens.secondary.hover }, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                            >
                                                In phiếu khám
                                            </Button>
                                        </Box>

                                        {/* THẺ VÉ BOARDING PASS CHUẨN HÌNH 137 */}
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                maxWidth: 480,
                                                mx: "auto",
                                                borderRadius: 4,
                                                bgcolor: "#FFFFFF",
                                                border: "1px solid #E2E8F0",
                                                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
                                                overflow: "hidden",
                                                position: "relative"
                                            }}
                                        >
                                            {/* Nửa trên: Header Bệnh Viện & Barcode chuẩn Hình 137 */}
                                            <Box sx={{ p: 3, textAlign: "center" }}>
                                                <Typography variant="h6" fontWeight="800" color="#0F172A" sx={{ letterSpacing: "0.5px" }}>
                                                    PHIẾU KHÁM BỆNH
                                                </Typography>
                                                <Typography variant="body2" fontWeight="700" color={designTokens.brand.primary} mt={0.5}>
                                                    {selectedTicketDetail.hospitalName || "TNT HOSPITAL"}
                                                </Typography>
                                                <Typography variant="caption" color="#64748B" display="block">
                                                    {selectedTicketDetail.hospitalAddress || "số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội"}
                                                </Typography>

                                                {/* Mục 1: Mã phiếu & Barcode SVG (Hình 137 mục 1) */}
                                                <Box sx={{ mt: 2, p: 1.5, border: "1.5px solid #E2E8F0", borderRadius: 2 }}>
                                                    <Typography variant="caption" color="#64748B" fontWeight="700" display="block" mb={0.5}>
                                                        Mã phiếu
                                                    </Typography>
                                                    <Box sx={{ my: 0.5, display: "flex", justifyContent: "center" }}>
                                                        <svg width="220" height="46" viewBox="0 0 220 46">
                                                            <rect x="10" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="15" y="5" width="4" height="36" fill="#000" />
                                                            <rect x="22" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="27" y="5" width="5" height="36" fill="#000" />
                                                            <rect x="36" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="42" y="5" width="3" height="36" fill="#000" />
                                                            <rect x="48" y="5" width="1" height="36" fill="#000" />
                                                            <rect x="52" y="5" width="4" height="36" fill="#000" />
                                                            <rect x="60" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="66" y="5" width="5" height="36" fill="#000" />
                                                            <rect x="75" y="5" width="3" height="36" fill="#000" />
                                                            <rect x="82" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="88" y="5" width="4" height="36" fill="#000" />
                                                            <rect x="96" y="5" width="1" height="36" fill="#000" />
                                                            <rect x="100" y="5" width="3" height="36" fill="#000" />
                                                            <rect x="106" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="112" y="5" width="4" height="36" fill="#000" />
                                                            <rect x="120" y="5" width="3" height="36" fill="#000" />
                                                            <rect x="127" y="5" width="1" height="36" fill="#000" />
                                                            <rect x="132" y="5" width="5" height="36" fill="#000" />
                                                            <rect x="141" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="146" y="5" width="4" height="36" fill="#000" />
                                                            <rect x="154" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="160" y="5" width="3" height="36" fill="#000" />
                                                            <rect x="167" y="5" width="5" height="36" fill="#000" />
                                                            <rect x="176" y="5" width="1" height="36" fill="#000" />
                                                            <rect x="180" y="5" width="4" height="36" fill="#000" />
                                                            <rect x="188" y="5" width="2" height="36" fill="#000" />
                                                            <rect x="194" y="5" width="3" height="36" fill="#000" />
                                                            <rect x="202" y="5" width="2" height="36" fill="#000" />
                                                        </svg>
                                                    </Box>
                                                    <Typography variant="body2" fontFamily="monospace" fontWeight="800" color="#1E293B" letterSpacing={1.5}>
                                                        {selectedTicketDetail.bookingCode}
                                                    </Typography>
                                                </Box>

                                                {/* Mục 2: Badge Trạng Thái (Hình 137 mục 2 - Chuẩn getStatusConfig TNT) */}
                                                <Box mt={2}>
                                                    {(() => {
                                                        const cfg = getStatusConfig("BOOKING", selectedTicketDetail.status);
                                                        return (
                                                            <Chip
                                                                label={cfg.label}
                                                                sx={{
                                                                    bgcolor: cfg.bgColor,
                                                                    color: cfg.color,
                                                                    border: `1px solid ${cfg.borderColor}`,
                                                                    fontWeight: 800,
                                                                    fontSize: "0.85rem",
                                                                    px: 2,
                                                                    height: 30,
                                                                    borderRadius: 2
                                                                }}
                                                            />
                                                        );
                                                    })()}
                                                </Box>

                                                {/* Mục 3: Phân định Số thứ tự Khám Bác sĩ & Số phiếu Quầy Tiếp đón */}
                                                <Grid container spacing={1.5} sx={{ mt: 2 }}>
                                                    <Grid item xs={12} sm={6}>
                                                        <Box sx={{ p: 2, border: `2px solid ${designTokens.brand.primary}`, borderRadius: 2.5, bgcolor: designTokens.brand.primaryLight, textAlign: "center" }}>
                                                            <Typography variant="caption" color={designTokens.brand.primary} fontWeight="700" textTransform="uppercase" display="block">
                                                                Số Khám Bác Sĩ
                                                            </Typography>
                                                            <Typography
                                                                variant="h3"
                                                                fontWeight="900"
                                                                color={designTokens.brand.primary}
                                                                sx={{ fontSize: "2.4rem", lineHeight: 1.1, my: 0.5 }}
                                                            >
                                                                {getQueueNumberDisplay(selectedTicketDetail.queueNumber, selectedTicketDetail.queueCode)}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" fontWeight="600" display="block">
                                                                {selectedTicketDetail.roomName || "Chưa xếp phòng"}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Box sx={{ p: 2, border: "2px solid #059669", borderRadius: 2.5, bgcolor: "#F0FDF4", textAlign: "center" }}>
                                                            <Typography variant="caption" color="#059669" fontWeight="700" textTransform="uppercase" display="block">
                                                                Phiếu Quầy Tiếp Đón
                                                            </Typography>
                                                            <Typography
                                                                variant="h3"
                                                                fontWeight="900"
                                                                color="#059669"
                                                                sx={{ fontSize: "2.4rem", lineHeight: 1.1, my: 0.5 }}
                                                            >
                                                                {selectedTicketDetail.counterTicketCode || "---"}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" fontWeight="600" display="block">
                                                                {selectedTicketDetail.counterTicketCode ? (selectedTicketDetail.counterName || "Quầy Tiếp Đón") : "Chưa lấy số quầy (Quét Kiosk khi đến)"}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                </Grid>

                                                {/* Hành trình khám 5 bước trực quan */}
                                                <Box sx={{ mt: 2, p: 2, bgcolor: "#F8FAFC", borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
                                                    <Typography variant="caption" fontWeight="800" color="#475569" textTransform="uppercase" display="block" mb={1}>
                                                        Hành Trình Khám Bệnh
                                                    </Typography>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={0.5} flexWrap="wrap">
                                                        {[
                                                            { step: 1, label: "1. Đặt lịch", done: true },
                                                            { step: 2, label: "2. Viện phí", done: Boolean(selectedTicketDetail.isPaid) },
                                                            { step: 3, label: "3. Check-in", done: Boolean(selectedTicketDetail.checkedInAt) },
                                                            { step: 4, label: "4. Vào khám", done: Boolean(selectedTicketDetail.dispatchedAt) },
                                                            { step: 5, label: "5. Hoàn tất", done: selectedTicketDetail.status === "COMPLETED" }
                                                        ].map((s) => (
                                                            <Chip
                                                                key={s.step}
                                                                size="small"
                                                                label={s.label}
                                                                color={s.done ? "success" : "default"}
                                                                variant={s.done ? "filled" : "outlined"}
                                                                sx={{ fontWeight: 700, fontSize: "0.72rem", height: 24 }}
                                                            />
                                                        ))}
                                                    </Box>
                                                </Box>

                                                {/* Hướng dẫn hành động tiếp theo (Next Action Card) */}
                                                <Box sx={{ mt: 2, p: 2, bgcolor: selectedTicketDetail.isPaid ? "#F0FDF4" : "#FFFBEB", borderRadius: 2.5, border: `1.5px solid ${selectedTicketDetail.isPaid ? "#BBF7D0" : "#FDE68A"}` }}>
                                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.8} flexWrap="wrap" gap={1}>
                                                        <Typography variant="caption" fontWeight="800" color={selectedTicketDetail.isPaid ? "#166534" : "#92400E"} textTransform="uppercase">
                                                            Chỉ dẫn tiếp theo:
                                                        </Typography>
                                                        <Chip
                                                            size="small"
                                                            label={selectedTicketDetail.isPaid ? "Viện phí: Đã thanh toán" : "Viện phí: Chờ thanh toán"}
                                                            color={selectedTicketDetail.isPaid ? "success" : "warning"}
                                                            sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                                                        />
                                                    </Box>
                                                    <Typography variant="body2" color={selectedTicketDetail.isPaid ? "#14532D" : "#78350F"} fontWeight="600" mt={0.25}>
                                                        {selectedTicketDetail.status === "CANCELLED"
                                                            ? "Lịch khám này đã được hủy."
                                                            : selectedTicketDetail.status === "COMPLETED"
                                                            ? "Lượt khám đã hoàn tất. Quý khách vui lòng bấm 'Xem Bệnh án Điện tử (EMR)' để xem đơn thuốc và lời dặn của bác sĩ."
                                                            : !selectedTicketDetail.isPaid
                                                            ? "Quý khách vui lòng hoàn tất viện phí trước giờ khám tại mục 'Hóa đơn' hoặc nộp trực tiếp tại Quầy Tiếp Đón."
                                                            : !selectedTicketDetail.checkedInAt
                                                            ? "Khi đến bệnh viện, quý khách vui lòng quét mã QR vé khám tại Kiosk tự phục vụ hoặc tới Quầy Tiếp Đón để check-in."
                                                            : selectedTicketDetail.counterTicketCode && !selectedTicketDetail.dispatchedAt
                                                            ? `Vui lòng chú ý loa gọi phiếu số ${selectedTicketDetail.counterTicketCode} tại ${selectedTicketDetail.counterName || "Quầy Tiếp Đón"}.`
                                                            : `Đã hoàn tất tiếp đón! Vui lòng có mặt trước ${selectedTicketDetail.roomName || "phòng khám"} và theo dõi số khám ${getQueueNumberDisplay(selectedTicketDetail.queueNumber, selectedTicketDetail.queueCode)} trên màn hình.`
                                                        }
                                                    </Typography>
                                                    <Box mt={1.5} display="flex" gap={1} flexWrap="wrap">
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            component={Link}
                                                            to={`/my-bills?bookingCode=${encodeURIComponent(selectedTicketDetail.rawBookingCode || selectedTicketDetail.bookingCode || "")}`}
                                                            startIcon={<ReceiptLongIcon sx={{ fontSize: 16 }} />}
                                                            sx={{
                                                                borderRadius: 2,
                                                                fontWeight: 700,
                                                                fontSize: "0.78rem",
                                                                textTransform: "none",
                                                                bgcolor: selectedTicketDetail.isPaid ? designTokens.brand.primary : designTokens.status.warning.main,
                                                                "&:hover": { bgcolor: selectedTicketDetail.isPaid ? designTokens.brand.primaryHover : "#92400E" }
                                                            }}
                                                        >
                                                            {selectedTicketDetail.isPaid ? "Mở Viện Phí & Biên Lai" : "Thanh Toán Viện Phí Qua PayOS"}
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            </Box>

                                            {/* Đường cắt rãnh khuyết tròn 2 bên */}
                                            <Box sx={{ position: "relative", my: 1 }}>
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        left: -14,
                                                        top: -14,
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: "50%",
                                                        bgcolor: "#F8FAFC",
                                                        border: "1px solid #E2E8F0"
                                                    }}
                                                />
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        right: -14,
                                                        top: -14,
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: "50%",
                                                        bgcolor: "#F8FAFC",
                                                        border: "1px solid #E2E8F0"
                                                    }}
                                                />
                                                <Box sx={{ borderTop: "2px dashed #CBD5E1", mx: 2 }} />
                                            </Box>

                                            {/* Nửa dưới: Mục 4 (Thông tin phiếu khám) & Mục 5 (Thông tin bệnh nhân) */}
                                            <Box sx={{ p: 3, pt: 1 }}>
                                                {/* Mục 4: Khối thông tin phiếu khám (Hình 137 mục 4) */}
                                                <Box sx={{ p: 2, border: "1.5px solid #EF4444", borderRadius: 2, bgcolor: "#FFFFFF", mb: 2 }}>
                                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B" fontWeight="600">MÃ PHIẾU</Typography>
                                                            <Typography variant="body2" fontWeight="800" fontFamily="monospace" color="#0F172A">
                                                                {selectedTicketDetail.bookingCode}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Dịch vụ</Typography>
                                                            <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                                {selectedTicketDetail.serviceName || "Khám dịch vụ"}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Khu vực</Typography>
                                                            <Typography variant="body2" fontWeight="600" color="#0F172A">
                                                                {selectedTicketDetail.areaName || "Khu B, lầu 2"}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Phòng khám</Typography>
                                                            <Typography variant="body2" fontWeight="700" color={designTokens.brand.primary}>
                                                                {selectedTicketDetail.roomName || "B1-202"}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Chuyên khoa</Typography>
                                                            <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                                {selectedTicketDetail.departmentName || "Khoa tim mạch"}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Bác sĩ</Typography>
                                                            <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                                {selectedTicketDetail.doctorName || "Chưa có thông tin bác sĩ"}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Ngày khám</Typography>
                                                            <Typography variant="body2" fontWeight="700" color={designTokens.brand.primary}>
                                                                {formatDate(selectedTicketDetail.bookingDate || selectedTicketDetail.appointmentDate)}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Buổi khám</Typography>
                                                            <Typography variant="body2" fontWeight="700" color="#059669">
                                                                {selectedTicketDetail.appointmentTime || selectedTicketDetail.session ? (selectedTicketDetail.appointmentTime?.includes("Chiều") || selectedTicketDetail.appointmentTime?.startsWith("13") || selectedTicketDetail.session === "AFTERNOON" ? "Chiều" : "Sáng") : "Chưa có dữ liệu"}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Phí khám</Typography>
                                                            <Typography variant="body2" fontWeight="800" color={designTokens.brand.primaryDark}>
                                                                {(selectedTicketDetail.price != null || selectedTicketDetail.totalAmount != null) ? formatCurrency(selectedTicketDetail.price ?? selectedTicketDetail.totalAmount) : "Chưa có dữ liệu"}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                {/* Mục 5: Khối thông tin bệnh nhân (Hình 137 mục 5) */}
                                                <Box sx={{ p: 2, border: "1.5px solid #EF4444", borderRadius: 2, bgcolor: "#F8FAFC" }}>
                                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Bệnh nhân:</Typography>
                                                            <Typography variant="body2" fontWeight="800" color="#0F172A">
                                                                {selectedTicketDetail.patientName}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Ngày sinh:</Typography>
                                                            <Typography variant="body2" fontWeight="600" color="#334155">
                                                                {selectedTicketDetail.patientDob ? formatDate(selectedTicketDetail.patientDob) : "10/12/1993"}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" justifyContent="space-between">
                                                            <Typography variant="body2" color="#64748B">Mã bệnh nhân:</Typography>
                                                            <Typography variant="body2" fontWeight="800" fontFamily="monospace" color={designTokens.brand.primary}>
                                                                {selectedTicketDetail.patientCode || "BN2EAAE2DD"}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                {/* Nút In phiếu, Mở Viện phí và Hủy lịch */}
                                                <Box sx={{ mt: 3, display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<PrintIcon />}
                                                        onClick={() => printAppointmentTicket(selectedTicketDetail)}
                                                        sx={{
                                                            flex: 1,
                                                            minWidth: 140,
                                                            bgcolor: designTokens.secondary.main,
                                                            "&:hover": { bgcolor: designTokens.secondary.hover },
                                                            borderRadius: 2.5,
                                                            py: 1.2,
                                                            fontWeight: 700,
                                                            textTransform: "none"
                                                        }}
                                                    >
                                                        In phiếu khám
                                                    </Button>

                                                    <Button
                                                        variant="outlined"
                                                        component={Link}
                                                        to={`/my-bills?bookingCode=${encodeURIComponent(selectedTicketDetail.rawBookingCode || selectedTicketDetail.bookingCode || "")}`}
                                                        startIcon={<ReceiptLongIcon />}
                                                        sx={{
                                                            flex: 1,
                                                            minWidth: 140,
                                                            borderRadius: 2.5,
                                                            py: 1.2,
                                                            fontWeight: 700,
                                                            textTransform: "none",
                                                            borderColor: designTokens.brand.primary,
                                                            color: designTokens.brand.primaryDark,
                                                            "&:hover": { borderColor: designTokens.brand.primaryDark, bgcolor: designTokens.brand.primaryLight }
                                                        }}
                                                    >
                                                        Mở Viện Phí
                                                    </Button>

                                                    {selectedTicketDetail.status !== "CANCELLED" && selectedTicketDetail.status !== "COMPLETED" && (
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            onClick={() => handleCancelBooking(selectedTicketDetail)}
                                                            disabled={cancellingBooking}
                                                            sx={{
                                                                borderRadius: 2.5,
                                                                px: 2,
                                                                py: 1.2,
                                                                fontWeight: 700,
                                                                textTransform: "none",
                                                                whiteSpace: "nowrap"
                                                            }}
                                                        >
                                                            Hủy lịch
                                                        </Button>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Paper>
                                    </Box>
                                ) : (
                                    /* ------------------------------------------------------------- */
                                    /* HÌNH 136: DANH SÁCH PHIẾU KHÁM BỆNH GOM NHÓM THEO ACCORDION   */
                                    /* ------------------------------------------------------------- */
                                    <Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                                            <Box>
                                                <Typography variant="h5" fontWeight="800" color="#0F172A" sx={{ letterSpacing: "-0.5px" }}>
                                                    Danh sách phiếu khám bệnh
                                                </Typography>
                                                <Typography variant="body2" color="#64748B">
                                                    Nhấn vào hồ sơ bệnh nhân để xem các phiếu khám. Nhấp vào phiếu để xem chi tiết mã vạch & số thứ tự tiếp nhận.
                                                </Typography>
                                            </Box>
                                            <Button
                                                variant="contained"
                                                startIcon={<CalendarMonthIcon />}
                                                onClick={() => navigate("/booking")}
                                                sx={{
                                                    bgcolor: designTokens.brand.primary,
                                                    "&:hover": { bgcolor: designTokens.brand.primaryHover },
                                                    borderRadius: 2,
                                                    fontWeight: 700,
                                                    fontSize: "0.875rem",
                                                    textTransform: "none"
                                                }}
                                            >
                                                + Đặt khám mới
                                            </Button>
                                        </Box>

                                        {(Array.isArray(profiles) ? profiles : []).length === 0 && (Array.isArray(bookings) ? bookings : []).length === 0 ? (
                                            <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 3, bgcolor: designTokens.brand.primaryLight, border: `1.5px dashed ${designTokens.brand.primaryBorder}` }}>
                                                <ReceiptLongIcon sx={{ fontSize: 44, color: designTokens.brand.primary, mb: 1 }} />
                                                <Typography variant="subtitle1" fontWeight="700" color="#334155" gutterBottom>
                                                    Chưa có phiếu khám bệnh nào
                                                </Typography>
                                                <Typography variant="body2" color="#64748B" sx={{ maxWidth: 420, mx: "auto", mb: 2 }}>
                                                    Bạn chưa có phiếu khám nào được phát hành. Vui lòng bấm Đặt khám để đăng ký lượt khám mới.
                                                </Typography>
                                                <Button
                                                    variant="contained"
                                                    onClick={() => navigate("/booking")}
                                                    sx={{ bgcolor: designTokens.brand.primary, "&:hover": { bgcolor: designTokens.brand.primaryHover }, textTransform: "none", borderRadius: 2, fontWeight: 700 }}
                                                >
                                                    Đặt khám ngay
                                                </Button>
                                            </Paper>
                                        ) : (
                                            <Stack spacing={2}>
                                                {(Array.isArray(profiles) ? profiles : []).map((p) => {
                                                    const pTickets = (Array.isArray(bookings) ? bookings : []).filter(b => 
                                                        b && (
                                                            (b.patientProfileId && b.patientProfileId === p.patientProfileId) ||
                                                            (!b.patientProfileId && b.patientName && p.fullName && String(b.patientName).trim().toLowerCase() === String(p.fullName).trim().toLowerCase())
                                                        )
                                                    );
                                                    const isExpanded = expandedTicketProfileId === p.patientProfileId;

                                                    return (
                                                        <Accordion
                                                            key={p.patientProfileId}
                                                            expanded={isExpanded}
                                                            onChange={() => setExpandedTicketProfileId(isExpanded ? null : p.patientProfileId)}
                                                            elevation={0}
                                                            sx={{
                                                                borderRadius: "16px !important",
                                                                border: "1px solid",
                                                                borderColor: isExpanded ? designTokens.brand.primary : "#E2E8F0",
                                                                bgcolor: "#FFFFFF",
                                                                overflow: "hidden",
                                                                "&:before": { display: "none" },
                                                                transition: "all 0.2s ease"
                                                            }}
                                                        >
                                                            <AccordionSummary
                                                                expandIcon={<ExpandMoreIcon sx={{ color: isExpanded ? designTokens.brand.primary : "#64748B" }} />}
                                                                sx={{
                                                                    bgcolor: isExpanded ? designTokens.brand.primaryLight : "#FFFFFF",
                                                                    px: 2.5,
                                                                    py: 1
                                                                }}
                                                            >
                                                                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" pr={1} flexWrap="wrap" gap={1}>
                                                                    <Box display="flex" alignItems="center" gap={1.5}>
                                                                        <Box
                                                                            sx={{
                                                                                width: 38,
                                                                                height: 38,
                                                                                borderRadius: 2,
                                                                                bgcolor: isExpanded ? designTokens.brand.primary : "#E2E8F0",
                                                                                color: isExpanded ? "#FFFFFF" : "#475569",
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "center"
                                                                            }}
                                                                        >
                                                                            <PersonIcon sx={{ fontSize: 22 }} />
                                                                        </Box>
                                                                        <Box>
                                                                            <Typography variant="subtitle1" fontWeight={800} color="#0F172A">
                                                                                {p.fullName?.toUpperCase()}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Mã BN: <b style={{ fontFamily: "monospace", color: designTokens.brand.primary }}>{p.patientCode || "---"}</b> • {p.gender === "MALE" ? "Nam" : (p.gender === "FEMALE" ? "Nữ" : "Khác")} • {formatDate(p.dateOfBirth)}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                    <Chip
                                                                        label={`${pTickets.length} phiếu khám`}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            bgcolor: pTickets.length > 0 ? designTokens.brand.primaryLight : "#F1F5F9",
                                                                            color: pTickets.length > 0 ? designTokens.brand.primaryDark : "#64748B"
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </AccordionSummary>
                                                            <AccordionDetails sx={{ p: 2.5, bgcolor: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
                                                                {pTickets.length === 0 ? (
                                                                    <Box textAlign="center" py={3}>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            Hồ sơ này hiện chưa có phiếu khám bệnh nào.
                                                                        </Typography>
                                                                        <Button
                                                                            size="small"
                                                                            onClick={() => navigate("/booking")}
                                                                            sx={{ textTransform: "none", fontWeight: 700, color: designTokens.brand.primary, mt: 1 }}
                                                                        >
                                                                            + Đặt khám cho bệnh nhân này
                                                                        </Button>
                                                                    </Box>
                                                                ) : (
                                                                    <Grid container spacing={2}>
                                                                        {pTickets.map((t, tidx) => (
                                                                            <Grid item xs={12} sm={6} key={t.bookingId || t.bookingCode || tidx}>
                                                                                <Card
                                                                                    onClick={() => setSelectedTicketDetail(t)}
                                                                                    elevation={0}
                                                                                    sx={{
                                                                                        cursor: "pointer",
                                                                                        p: 2.5,
                                                                                        borderRadius: 3,
                                                                                        bgcolor: "#FFFFFF",
                                                                                        border: "1.5px solid #E2E8F0",
                                                                                        transition: "all 0.2s ease",
                                                                                        "&:hover": {
                                                                                            borderColor: designTokens.brand.primary,
                                                                                            boxShadow: "0 6px 20px rgba(15, 118, 110, 0.12)",
                                                                                            transform: "translateY(-2px)"
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                                                                        <Chip
                                                                                            label={t.queueNumber != null ? `STT: ${String(t.queueNumber).padStart(2, "0")}` : "Chờ cấp STT"}
                                                                                            sx={{
                                                                                                fontWeight: 900,
                                                                                                fontSize: "0.85rem",
                                                                                                bgcolor: designTokens.brand.primary,
                                                                                                color: "#FFFFFF",
                                                                                                px: 0.5
                                                                                            }}
                                                                                        />
                                                                                        <Chip
                                                                                            label={t.status === "CANCELLED" ? "Đã hủy" : (t.status === "COMPLETED" ? "Đã khám" : (t.statusLabel || "Chưa khám"))}
                                                                                            size="small"
                                                                                            sx={{
                                                                                                fontWeight: 700,
                                                                                                fontSize: "0.725rem",
                                                                                                bgcolor: t.status === "CANCELLED" ? "#FEE2E2" : (t.status === "COMPLETED" ? "#E2E8F0" : "#DCFCE7"),
                                                                                                color: t.status === "CANCELLED" ? "#DC2626" : (t.status === "COMPLETED" ? "#475569" : "#166534")
                                                                                            }}
                                                                                        />
                                                                                    </Box>

                                                                                    <Typography variant="subtitle1" fontWeight={800} color="#0F172A" noWrap>
                                                                                        🏥 {t.departmentName || "Khám Chuyên Khoa"}
                                                                                    </Typography>
                                                                                    <Typography variant="body2" color="#475569" mt={0.5} noWrap>
                                                                                        👨‍⚕️ Bác sĩ: <b>{t.doctorName || "Chưa phân công"}</b>
                                                                                    </Typography>
                                                                                    <Typography variant="body2" color="#64748B" mt={0.3}>
                                                                                        📅 Ngày khám: <b>{formatDate(t.bookingDate || t.appointmentDate)}</b> • {t.roomName || "Chưa xếp phòng"}
                                                                                    </Typography>
                                                                                    <Typography variant="caption" fontFamily="monospace" color={designTokens.brand.primary} fontWeight={700} display="block" mt={0.5}>
                                                                                        Mã phiếu: {t.bookingCode}
                                                                                    </Typography>

                                                                                    <Box mt={2} pt={1.5} borderTop="1px dashed #E2E8F0" display="flex" justifyContent="flex-end">
                                                                                        <Typography variant="caption" fontWeight={700} color={designTokens.brand.primary}>
                                                                                            Xem chi tiết vé & mã vạch &rarr;
                                                                                        </Typography>
                                                                                    </Box>
                                                                                </Card>
                                                                            </Grid>
                                                                        ))}
                                                                    </Grid>
                                                                )}
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}

                        {/* ========================================================================= */}
                        {/* TAB 2: LỊCH SỬ KHÁM BỆNH (HÌNH 138: ACCORDION & HÌNH 139: TOA THUỐC)        */}
                        {/* ========================================================================= */}
                        {activeTab === 2 && (
                            <Box>
                                {/* ------------------------------------------------------------- */}
                                {/* NẾU ĐANG CHỌN XEM CHI TIẾT 1 ĐỢT KHÁM (HÌNH 139 / BẢNG 93)     */}
                                {/* ------------------------------------------------------------- */}
                                {selectedHistoryDetail ? (
                                    <Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                                            <Button
                                                variant="outlined"
                                                startIcon={<ArrowBackIcon />}
                                                onClick={() => setSelectedHistoryDetail(null)}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: "none",
                                                    fontWeight: 700,
                                                    color: "#0088D6",
                                                    borderColor: "#BAE6FD",
                                                    "&:hover": { borderColor: "#0088D6", bgcolor: "#F0F9FF" }
                                                }}
                                            >
                                                Quay lại danh sách lịch sử khám bệnh
                                            </Button>
                                            <Button
                                                variant="contained"
                                                startIcon={<PrintIcon />}
                                                onClick={() => handlePrintRecordSheet(selectedHistoryDetail)}
                                                sx={{ bgcolor: "#0088D6", borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                            >
                                                In phiếu khám & Đơn thuốc
                                            </Button>
                                        </Box>

                                        {/* PHIẾU KẾT QUẢ KHÁM BỆNH & TOA THUỐC CHUẨN HÌNH 139 */}
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: { xs: 3, md: 5 },
                                                borderRadius: 3.5,
                                                bgcolor: "#FFFFFF",
                                                border: "1px solid #E2E8F0",
                                                boxShadow: "0 6px 25px rgba(0,0,0,0.04)"
                                            }}
                                        >
                                            {/* 1. Header Bệnh Viện chuẩn Hình 139 */}
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={3}>
                                                <Box>
                                                    <Typography variant="h5" fontWeight="900" color="#0088D6" sx={{ letterSpacing: "0.5px", lineHeight: 1.2 }}>
                                                        TNT HOSPITAL
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight="700" color="#475569" sx={{ letterSpacing: "0.5px", display: "block", mt: 0.5 }}>
                                                        Hết lòng vì người bệnh - Nâng tầm chất lượng y tế
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ textAlign: { xs: "left", sm: "right" }, fontSize: "0.825rem", color: "#475569", border: "1.5px solid #0088D6", p: 1.5, borderRadius: 2, bgcolor: "#F8FAFC" }}>
                                                    <div>Hotline: <b>1900 8888</b></div>
                                                    <div>Địa chỉ: <b>số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội</b></div>
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
                                                    <b style={{ fontFamily: "monospace", color: "#0088D6" }}>{selectedHistoryDetail.patientCode || selectedHistoryDetail.bookingCode || "BN-MPI"}</b>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <span>Họ tên: </span>
                                                    <b style={{ textTransform: "uppercase" }}>{selectedHistoryDetail.patientName || "Bệnh nhân"}</b>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <span>Ngày sinh: </span>
                                                    <b>{selectedHistoryDetail.patientDob ? formatDate(selectedHistoryDetail.patientDob) : "Chưa cập nhật"}</b>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <span>Giới tính: </span>
                                                    <b>{selectedHistoryDetail.patientGender === "MALE" ? "Nam" : selectedHistoryDetail.patientGender === "FEMALE" ? "Nữ" : "Khác"}</b>
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <span>Địa chỉ: </span>
                                                    <b>{selectedHistoryDetail.patientAddress || "Việt Nam"}</b>
                                                </Grid>
                                            </Grid>

                                            {/* 3. Mục: Thông tin khám bệnh */}
                                            <Typography variant="subtitle1" fontWeight="800" color="#0F172A" mb={1.5}>
                                                Thông tin khám bệnh
                                            </Typography>
                                            <Grid container spacing={1.5} sx={{ color: "#334155", fontSize: "0.925rem", mb: 3 }}>
                                                <Grid item xs={12} sm={6}>
                                                    <span>Ngày khám: </span>
                                                    <b>{formatDate(selectedHistoryDetail.bookingDate || selectedHistoryDetail.appointmentDate)}</b>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <span>Chuyên khoa: </span>
                                                    <b>{selectedHistoryDetail.departmentName || "Khoa Khám Bệnh"}</b>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <span>Bác sĩ chữa trị: </span>
                                                    <b>{selectedHistoryDetail.doctorName || "Chưa có dữ liệu"}</b>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <span>Chẩn đoán của bác sĩ: </span>
                                                    <b style={{ color: "#047857" }}>{selectedHistoryDetail.diagnosis || "Theo dõi sức khỏe định kỳ"}</b>
                                                </Grid>
                                            </Grid>

                                            {/* 4. Mục: Bảng Đơn Thuốc chuẩn Hình 139 */}
                                            <Typography variant="subtitle1" fontWeight="800" color="#0F172A" mb={1.5}>
                                                Đơn thuốc điều trị
                                            </Typography>
                                            <TableContainer sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, mb: 2, overflow: "hidden" }}>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#475569", width: 60 }}>STT</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#475569" }}>Tên thuốc / Hàm lượng</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#475569", width: 100 }}>ĐVT</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#475569", width: 100 }}>Số lượng</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#475569", width: 130, textAlign: "right" }}>Đơn giá</TableCell>
                                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", color: "#475569", width: 140, textAlign: "right" }}>Thành tiền</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {(selectedHistoryDetail.medicines && selectedHistoryDetail.medicines.length > 0) ? (
                                                            selectedHistoryDetail.medicines.map((m, idx) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell sx={{ fontWeight: 600 }}>{idx + 1}</TableCell>
                                                                    <TableCell>
                                                                        <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                                            {m.name || m.medicineName}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="#64748B">
                                                                            {m.dosage || m.usageInstruction || "Dùng theo chỉ định"}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell sx={{ fontWeight: 500 }}>{m.unit || "Viên"}</TableCell>
                                                                    <TableCell sx={{ fontWeight: 600 }}>{m.quantity || 1}</TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                                                                        {formatCurrency(m.unitPrice || m.price || 0)}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ fontWeight: 700, color: "#0F172A" }}>
                                                                        {formatCurrency(m.totalPrice || (m.quantity * (m.unitPrice || 0)) || 0)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={6} align="center" sx={{ py: 3, color: "#64748B" }}>
                                                                    Không có đơn thuốc chỉ định cho lượt khám này.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>

                                            {/* Tổng tiền & Ngày tái khám */}
                                            <Box display="flex" justifyContent="flex-end" mb={1}>
                                                <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                                                    Tổng tiền thuốc: {formatCurrency(selectedHistoryDetail.totalAmount || selectedHistoryDetail.medicineTotal || 0)}
                                                </Typography>
                                            </Box>
                                            {/* Mục 5: Ngày tái khám & Lưu ý (Hình 139 mục 5) */}
                                            <Box sx={{ mb: 3 }}>
                                                {selectedHistoryDetail.loadingClinicalRecord ? (
                                                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, border: "1.5px solid #CBD5E1", p: 0.8, px: 1.5, borderRadius: 1.5, mb: 0.5 }}>
                                                        <CircularProgress size={16} sx={{ color: "#0284C7" }} />
                                                        <Typography variant="body2" color="text.secondary">
                                                            Đang tải thông tin tái khám...
                                                        </Typography>
                                                    </Box>
                                                ) : selectedHistoryDetail.clinicalRecordError ? (
                                                    <Alert
                                                        severity="warning"
                                                        sx={{ mb: 1, borderRadius: 1.5 }}
                                                        action={
                                                            <Button color="inherit" size="small" onClick={() => handleOpenHistoryDetail(selectedHistoryDetail)}>
                                                                Thử lại
                                                            </Button>
                                                        }
                                                    >
                                                        {selectedHistoryDetail.clinicalRecordError}
                                                    </Alert>
                                                ) : (
                                                    <Box sx={{ display: "inline-block", border: "1.5px solid #EF4444", p: 0.8, px: 1.5, borderRadius: 1.5, mb: 0.5 }}>
                                                        <Typography variant="body2" fontWeight="700" color="#DC2626">
                                                            Tái khám ngày: {selectedHistoryDetail.reExaminationDate ? formatDate(selectedHistoryDetail.reExaminationDate) : "Chưa có ngày hẹn tái khám"}
                                                        </Typography>
                                                    </Box>
                                                )}
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Lưu ý: Trẻ em cần có bố mẹ đi tái khám chung
                                                </Typography>
                                            </Box>

                                            {/* Nút In ấn và Mở EMR */}
                                            <Box display="flex" justifyContent="flex-end" gap={1.5}>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<LocalHospitalIcon />}
                                                    onClick={() => setSelectedBookingForEhr(selectedHistoryDetail)}
                                                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", color: "#0284C7", borderColor: "#BAE6FD" }}
                                                >
                                                    Mở Bệnh Án Điện Tử (EMR)
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<PrintIcon />}
                                                    onClick={() => handlePrintRecordSheet(selectedHistoryDetail)}
                                                    sx={{ bgcolor: "#0088D6", borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                                >
                                                    In phiếu khám & Đơn thuốc
                                                </Button>
                                            </Box>
                                        </Paper>
                                    </Box>
                                ) : (
                                    /* ------------------------------------------------------------- */
                                    /* HÌNH 138: DANH SÁCH LỊCH SỬ KHÁM GOM NHÓM THEO ACCORDION     */
                                    /* ------------------------------------------------------------- */
                                    <Box>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                                            <Box>
                                                <Typography variant="h5" fontWeight="800" color="#0F172A" sx={{ letterSpacing: "-0.5px" }}>
                                                    Lịch sử khám chữa bệnh & Toa thuốc
                                                </Typography>
                                                <Typography variant="body2" color="#64748B">
                                                    Nhấn vào hồ sơ bệnh nhân để xem các đợt khám quá khứ và đơn thuốc điều trị.
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {(Array.isArray(profiles) ? profiles : []).length === 0 && (Array.isArray(bookings) ? bookings : []).length === 0 ? (
                                            <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 3, bgcolor: "#FFFFFF", border: "1px dashed #CBD5E1" }}>
                                                <HistoryIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
                                                <Typography variant="subtitle1" fontWeight="700" color="#334155" gutterBottom>
                                                    Chưa có lịch sử khám bệnh
                                                </Typography>
                                                <Typography variant="body2" color="#64748B" sx={{ maxWidth: 400, mx: "auto" }}>
                                                    Khi bạn hoàn thành các đợt khám tại viện, thông tin bệnh án và toa thuốc sẽ được hiển thị tại đây.
                                                </Typography>
                                            </Paper>
                                        ) : (
                                            <Stack spacing={2}>
                                                {(Array.isArray(profiles) ? profiles : []).map((p) => {
                                                    const pVisits = (Array.isArray(bookings) ? bookings : []).filter(b => 
                                                        b && (
                                                            (b.patientProfileId && b.patientProfileId === p.patientProfileId) ||
                                                            (!b.patientProfileId && b.patientName && p.fullName && String(b.patientName).trim().toLowerCase() === String(p.fullName).trim().toLowerCase())
                                                        )
                                                    );
                                                    const isExpanded = expandedHistoryProfileId === p.patientProfileId;

                                                    return (
                                                        <Accordion
                                                            key={p.patientProfileId}
                                                            expanded={isExpanded}
                                                            onChange={() => setExpandedHistoryProfileId(isExpanded ? null : p.patientProfileId)}
                                                            elevation={0}
                                                            sx={{
                                                                borderRadius: "16px !important",
                                                                border: "1px solid",
                                                                borderColor: isExpanded ? "#059669" : "#E2E8F0",
                                                                bgcolor: "#FFFFFF",
                                                                overflow: "hidden",
                                                                "&:before": { display: "none" },
                                                                transition: "all 0.2s ease"
                                                            }}
                                                        >
                                                            <AccordionSummary
                                                                expandIcon={<ExpandMoreIcon sx={{ color: isExpanded ? "#059669" : "#64748B" }} />}
                                                                sx={{
                                                                    bgcolor: isExpanded ? "#ECFDF5" : "#FFFFFF",
                                                                    px: 2.5,
                                                                    py: 1
                                                                }}
                                                            >
                                                                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" pr={1} flexWrap="wrap" gap={1}>
                                                                    <Box display="flex" alignItems="center" gap={1.5}>
                                                                        <Box
                                                                            sx={{
                                                                                width: 38,
                                                                                height: 38,
                                                                                borderRadius: 2,
                                                                                bgcolor: isExpanded ? "#059669" : "#E2E8F0",
                                                                                color: isExpanded ? "#FFFFFF" : "#475569",
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                justifyContent: "center"
                                                                            }}
                                                                        >
                                                                            <HistoryIcon sx={{ fontSize: 22 }} />
                                                                        </Box>
                                                                        <Box>
                                                                            <Typography variant="subtitle1" fontWeight={800} color="#0F172A">
                                                                                {p.fullName?.toUpperCase()}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                Mã BN: <b style={{ fontFamily: "monospace", color: "#059669" }}>{p.patientCode || "---"}</b> • {p.gender === "MALE" ? "Nam" : (p.gender === "FEMALE" ? "Nữ" : "Khác")} • {formatDate(p.dateOfBirth)}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                    <Chip
                                                                        label={`${pVisits.length} đợt khám`}
                                                                        size="small"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            bgcolor: pVisits.length > 0 ? "#D1FAE5" : "#F1F5F9",
                                                                            color: pVisits.length > 0 ? "#065F46" : "#64748B"
                                                                        }}
                                                                    />
                                                                </Box>
                                                            </AccordionSummary>
                                                            <AccordionDetails sx={{ p: 2.5, bgcolor: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
                                                                {pVisits.length === 0 ? (
                                                                    <Box textAlign="center" py={3}>
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            Hồ sơ này chưa có lịch sử khám bệnh nào tại viện.
                                                                        </Typography>
                                                                    </Box>
                                                                ) : (
                                                                    <Stack spacing={1.5}>
                                                                        {pVisits.map((v, vidx) => (
                                                                            <Paper
                                                                                key={v.bookingId || v.bookingCode || vidx}
                                                                                elevation={0}
                                                                                sx={{
                                                                                    p: 2.5,
                                                                                    borderRadius: 2.5,
                                                                                    border: "1px solid #E2E8F0",
                                                                                    bgcolor: "#FFFFFF",
                                                                                    display: "flex",
                                                                                    justifyContent: "space-between",
                                                                                    alignItems: "center",
                                                                                    flexWrap: "wrap",
                                                                                    gap: 1.5,
                                                                                    transition: "all 0.2s ease",
                                                                                    "&:hover": {
                                                                                        borderColor: "#059669",
                                                                                        boxShadow: "0 4px 12px rgba(5, 150, 105, 0.08)"
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Box>
                                                                                    <Box display="flex" alignItems="center" gap={1.5}>
                                                                                        <Chip
                                                                                            label={getBookingCodeDisplay(v.bookingCode)}
                                                                                            size="small"
                                                                                            sx={{ fontFamily: "monospace", fontWeight: 700, bgcolor: "#ECFDF5", color: "#059669" }}
                                                                                        />
                                                                                        <Typography variant="subtitle1" fontWeight={700} color="#0F172A">
                                                                                            {v.departmentName || "Khoa Khám Bệnh"}
                                                                                        </Typography>
                                                                                        <Chip
                                                                                            label={v.status === "COMPLETED" ? "Đã khám" : (v.statusLabel || "Đang xử lý")}
                                                                                            size="small"
                                                                                            sx={{
                                                                                                height: 20,
                                                                                                fontSize: "0.7rem",
                                                                                                fontWeight: 700,
                                                                                                bgcolor: v.status === "COMPLETED" ? "#DCFCE7" : "#E0F2FE",
                                                                                                color: v.status === "COMPLETED" ? "#166534" : "#0369A1"
                                                                                            }}
                                                                                        />
                                                                                    </Box>
                                                                                    <Typography variant="body2" color="#64748B" mt={0.5}>
                                                                                        Bác sĩ: <b>{v.doctorName || "BS. Điều trị"}</b> • Ngày khám: <b>{formatDate(v.bookingDate || v.appointmentDate)}</b>
                                                                                    </Typography>
                                                                                    <Typography variant="body2" color="#047857" fontWeight={600} mt={0.3}>
                                                                                        Chẩn đoán: {v.diagnosis || "Khám tổng quát / Theo dõi sức khỏe"}
                                                                                    </Typography>
                                                                                </Box>

                                                                                <Stack direction="row" spacing={1}>
                                                                                    <Button
                                                                                        variant="contained"
                                                                                        startIcon={<VisibilityIcon />}
                                                                                        onClick={() => handleOpenHistoryDetail(v)}
                                                                                        sx={{
                                                                                            borderRadius: 2,
                                                                                            textTransform: "none",
                                                                                            fontWeight: 700,
                                                                                            bgcolor: "#059669",
                                                                                            "&:hover": { bgcolor: "#047857" },
                                                                                            fontSize: "0.825rem"
                                                                                        }}
                                                                                    >
                                                                                        Chi tiết toa thuốc & Đơn
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="outlined"
                                                                                        startIcon={<LocalHospitalIcon />}
                                                                                        onClick={() => setSelectedBookingForEhr(v)}
                                                                                        sx={{
                                                                                            borderRadius: 2,
                                                                                            textTransform: "none",
                                                                                            fontWeight: 700,
                                                                                            color: "#0284C7",
                                                                                            borderColor: "#BAE6FD",
                                                                                            fontSize: "0.825rem"
                                                                                        }}
                                                                                    >
                                                                                        EMR
                                                                                    </Button>
                                                                                </Stack>
                                                                            </Paper>
                                                                        ))}
                                                                    </Stack>
                                                                )}
                                                            </AccordionDetails>
                                                        </Accordion>
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}

                        {/* ========================================================================= */}
                        {/* TAB 3: THÔNG BÁO NGƯỜI BỆNH                                              */}
                        {/* ========================================================================= */}
                        {activeTab === 3 && (
                            <Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
                                    <Typography
                                        variant="h5"
                                        fontWeight="700"
                                        color="#0F172A"
                                        sx={{ letterSpacing: "-0.5px" }}
                                    >
                                        Thông Báo Cá Nhân
                                    </Typography>
                                    <Box display="flex" gap={1}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={fetchNotifications}
                                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                                        >
                                            Làm mới
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            onClick={handleMarkAllNotifsAsRead}
                                            disabled={!Array.isArray(notifications) || notifications.length === 0 || notifications.every(n => n.isRead || n.read)}
                                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: "#0088D6" }}
                                        >
                                            Đã đọc tất cả
                                        </Button>
                                    </Box>
                                </Box>

                                {loadingNotifs ? (
                                    <Box display="flex" justifyContent="center" py={6}><CircularProgress size={32} /></Box>
                                ) : (!Array.isArray(notifications) || notifications.length === 0) ? (
                                    <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                                        Bạn không có thông báo nào từ hệ thống bệnh viện.
                                    </Alert>
                                ) : (
                                    <Stack spacing={2}>
                                        {(Array.isArray(notifications) ? notifications : []).map((n) => {
                                            const isRead = Boolean(n.isRead || n.read);
                                            return (
                                                <Paper
                                                    key={n.notificationId || n.id}
                                                    elevation={0}
                                                    onClick={() => !isRead && handleMarkNotifAsRead(n.notificationId || n.id)}
                                                    sx={{
                                                        p: 2.5,
                                                        borderRadius: 3,
                                                        border: "1px solid",
                                                        borderColor: isRead ? "#E2E8F0" : "#BAE6FD",
                                                        bgcolor: isRead ? "#FFFFFF" : "#F0F9FF",
                                                        display: "flex",
                                                        gap: 2,
                                                        cursor: isRead ? "default" : "pointer",
                                                        transition: "all 0.2s ease",
                                                        "&:hover": { borderColor: "#0088D6" }
                                                    }}
                                                >
                                                    <Box sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 2,
                                                        bgcolor: isRead ? "#F1F5F9" : "#E0F2FE",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: isRead ? "#64748B" : "#0088D6"
                                                    }}>
                                                        <LocalHospitalIcon />
                                                    </Box>
                                                    <Box flex={1}>
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="subtitle2" fontWeight={isRead ? 600 : 800} color="#0F172A">
                                                                {n.title || "Thông báo từ bệnh viện"}
                                                            </Typography>
                                                            {!isRead && (
                                                                <Chip label="Chưa đọc" size="small" color="primary" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                                                            )}
                                                        </Box>
                                                        <Typography variant="body2" color="#475569" mt={0.5}>
                                                            {n.content || n.message || "Không có nội dung chi tiết"}
                                                        </Typography>
                                                        <Typography variant="caption" color="#94A3B8" mt={1} display="block">
                                                            {n.createdAt ? formatDateTime(n.createdAt) : "Vừa xong"}
                                                        </Typography>
                                                    </Box>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        )}
                    </Grid>
                </Grid>
            </Container>

            {/* ========================================================================= */}
            {/* MODAL HỢP NHẤT: THÊM / LIÊN KẾT / SỬA HỒ SƠ BỆNH NHÂN (HÌNH 140 - 143)   */}
            {/* ========================================================================= */}
            <AddOrLinkPatientProfileModal
                open={openAddOrLinkModal}
                onClose={() => {
                    setOpenAddOrLinkModal(false);
                    setEditingProfile(null);
                }}
                onSuccess={(msg) => {
                    setToastMessage(msg || "Thao tác thành công!");
                    loadData();
                }}
                editProfile={editingProfile}
                initialTab={addOrLinkInitialTab}
                userPhone={user?.phoneNumber || ""}
            />

            {/* MODAL: CHI TIẾT HỒ SƠ BỆNH NHÂN (HÌNH 135 / BẢNG 89) */}
            <PatientProfileDetailModal
                open={Boolean(selectedProfileDetail)}
                onClose={() => setSelectedProfileDetail(null)}
                patient={selectedProfileDetail}
                bookings={bookings}
                onEdit={(p) => {
                    setSelectedProfileDetail(null);
                    setEditingProfile(p);
                    setAddOrLinkInitialTab(0);
                    setOpenAddOrLinkModal(true);
                }}
                onViewTickets={(p) => {
                    setSelectedProfileDetail(null);
                    setActiveTab(1);
                    setExpandedTicketProfileId(p.patientProfileId);
                    setSelectedTicketDetail(null);
                }}
                onViewHistory={(p) => {
                    setSelectedProfileDetail(null);
                    setActiveTab(2);
                    setExpandedHistoryProfileId(p.patientProfileId);
                    setSelectedHistoryDetail(null);
                }}
                onViewMedicalRecord={(v) => setSelectedBookingForEhr(v)}
            />

            {/* MODAL: BỆNH ÁN ĐIỆN TỬ (EMR / EHR) */}
            <ElectronicMedicalRecordModal
                open={Boolean(selectedBookingForEhr)}
                onClose={() => setSelectedBookingForEhr(null)}
                booking={selectedBookingForEhr}
            />

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
