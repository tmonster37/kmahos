import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    Container,
    Grid,
    Typography,
    Button,
    Box,
    Paper,
    Card,
    Avatar,
    Chip,
    Stack,
    Divider,
    TextField,
    InputAdornment,
    Skeleton,
    Alert,
    IconButton,
    Tooltip
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ShieldIcon from "@mui/icons-material/Shield";
import RefreshIcon from "@mui/icons-material/Refresh";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import PersonIcon from "@mui/icons-material/Person";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import HealingIcon from "@mui/icons-material/Healing";
import ScienceIcon from "@mui/icons-material/Science";
import PsychologyIcon from "@mui/icons-material/Psychology";
import CoronavirusIcon from "@mui/icons-material/Coronavirus";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ClearIcon from "@mui/icons-material/Clear";
import SparklesIcon from "@mui/icons-material/AutoAwesome";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SecurityIcon from "@mui/icons-material/Security";

import axiosInstance from "../../services/AxiosInstance";
import { formatISODate, formatDate } from "../../utils/formatters";
import designTokens from "../../theme/designTokens";
import { useAuth } from "../../context/AuthContext";
import { getDoctorInitials } from "../customer/BookingPage";

/**
 * Ánh xạ icon đại diện theo tên chuyên khoa (Chuẩn hóa màu Teal và Heart Red)
 */
const getDepartmentIcon = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("tim")) return <MonitorHeartIcon sx={{ fontSize: 24, color: designTokens.brand.accent }} />; // Heart Red từ logo
    if (n.includes("nhi")) return <ChildCareIcon sx={{ fontSize: 24, color: designTokens.brand.primary }} />; // Teal từ logo
    if (n.includes("ngoại") || n.includes("chấn thương") || n.includes("xương")) return <HealingIcon sx={{ fontSize: 24, color: "#8B5CF6" }} />;
    if (n.includes("xét nghiệm") || n.includes("hình ảnh") || n.includes("lab")) return <ScienceIcon sx={{ fontSize: 24, color: "#0284C7" }} />;
    if (n.includes("thần kinh") || n.includes("tâm thần")) return <PsychologyIcon sx={{ fontSize: 24, color: "#F59E0B" }} />;
    if (n.includes("nhiễm") || n.includes("dịch")) return <CoronavirusIcon sx={{ fontSize: 24, color: "#EC4899" }} />;
    return <LocalHospitalIcon sx={{ fontSize: 24, color: designTokens.brand.primary }} />;
};

/**
 * Chuẩn hóa nhãn học vị y khoa từ enum backend
 */
const formatDegree = (deg) => {
    switch (deg) {
        case "GS_TS": return "GS. Tiến sĩ";
        case "PGS_TS": return "PGS. Tiến sĩ";
        case "TS": return "Tiến sĩ Y khoa";
        case "THS": return "Thạc sĩ Y khoa";
        case "BSCKII": return "BS. Chuyên khoa II";
        case "BSCKI": return "BS. Chuyên khoa I";
        case "BS": return "Bác sĩ Đa khoa";
        default: return deg || "Bác sĩ Chuyên khoa";
    }
};

/**
 * Chuẩn hóa ca trực theo enum ScheduleSession (Chuẩn hóa màu Teal và Heart Red)
 */
const formatSession = (session) => {
    switch (session) {
        case "MORNING":
            return {
                label: "Ca Sáng (07:30 - 11:30)",
                color: "#0D9488",
                bg: "#F0FDFA",
                border: "#CCFBF1"
            };
        case "AFTERNOON":
            return {
                label: "Ca Chiều (13:00 - 17:00)",
                color: "#047857",
                bg: "#D1FAE5",
                border: "#A7F3D0"
            };
        case "EVENING":
            return {
                label: "Ca Tối (17:30 - 20:30)",
                color: "#E11D48",
                bg: "#FFF1F2",
                border: "#FECDD3"
            };
        default:
            return {
                label: "Ca Trực Khám",
                color: "#475569",
                bg: "#F1F5F9",
                border: "#E2E8F0"
            };
    }
};

export default function HomePage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // 1. Dữ liệu Chuyên khoa từ API
    const [departments, setDepartments] = useState([]);
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [deptError, setDeptError] = useState("");
    const [deptFilterTerm, setDeptFilterTerm] = useState("");

    // 2. Tìm kiếm ở Hero
    const [heroSearchTerm, setHeroSearchTerm] = useState("");

    // 3. Dữ liệu Lịch trực bác sĩ trong ngày (Dữ liệu thật từ /api/schedules/by-department)
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [scheduleError, setScheduleError] = useState("");

    const todayIso = useMemo(() => formatISODate(new Date()), []);
    const todayFormatted = useMemo(() => formatDate(new Date()), []);

    // Tải danh sách Chuyên khoa
    const loadDepartments = useCallback(async () => {
        setLoadingDepts(true);
        setDeptError("");
        try {
            const res = await axiosInstance.get("/api/departments");
            const list = (res && res.data && Array.isArray(res.data))
                ? res.data
                : (Array.isArray(res) ? res : []);
            setDepartments(list);
            if (list.length > 0 && !selectedDeptId) {
                setSelectedDeptId(list[0].departmentId);
            }
        } catch (err) {
            setDeptError("Không thể tải danh mục chuyên khoa từ máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.");
        } finally {
            setLoadingDepts(false);
        }
    }, [selectedDeptId]);

    useEffect(() => {
        loadDepartments();
    }, [loadDepartments]);

    // Tải lịch trực bác sĩ thực tế khi đổi khoa
    useEffect(() => {
        if (!selectedDeptId) return;

        let isCancelled = false;
        setLoadingSchedules(true);
        setScheduleError("");

        axiosInstance.get(`/api/schedules/by-department?departmentId=${selectedDeptId}&date=${todayIso}`)
            .then((res) => {
                if (isCancelled) return;
                const list = (res && res.data && Array.isArray(res.data))
                    ? res.data
                    : (Array.isArray(res) ? res : []);
                setSchedules(list);
            })
            .catch(() => {
                if (isCancelled) return;
                setScheduleError("Không thể tải lịch trực hôm nay của chuyên khoa này. Bạn vẫn có thể đặt lịch hẹn trực tiếp qua trang Đặt khám.");
            })
            .finally(() => {
                if (!isCancelled) setLoadingSchedules(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [selectedDeptId, todayIso]);

    // Lọc chuyên khoa ở danh mục
    const filteredDepartments = useMemo(() => {
        if (!deptFilterTerm.trim()) return departments;
        const kw = deptFilterTerm.toLowerCase().trim();
        return departments.filter(d =>
            (d.departmentName && d.departmentName.toLowerCase().includes(kw)) ||
            (d.description && d.description.toLowerCase().includes(kw))
        );
    }, [departments, deptFilterTerm]);

    // Xử lý tìm kiếm nhanh từ Hero Bar
    const handleHeroSearch = (e) => {
        if (e) e.preventDefault();
        const term = heroSearchTerm.trim();
        if (term) {
            navigate(`/booking?symptoms=${encodeURIComponent(term)}`);
        } else {
            navigate("/booking");
        }
    };

    const handleQuickTagClick = (tag) => {
        navigate(`/booking?symptoms=${encodeURIComponent(tag)}`);
    };

    // 4 Dịch vụ Cốt lõi & Lối tắt thực tế của dự án (Chuẩn hóa màu Teal và Heart Red)
    const CORE_SERVICES = [
        {
            title: "Đặt Lịch Khám Bệnh",
            desc: "Chọn chuyên khoa, bác sĩ và khung giờ hẹn trước trực tuyến không cần xếp hàng",
            to: "/booking",
            icon: <EventAvailableIcon sx={{ fontSize: 26 }} />,
            color: "#0D9488",
            bgColor: "#F0FDFA",
            border: "#CCFBF1",
            badge: "Trực tuyến 24/7"
        },
        {
            title: "Tra Cứu Hồ Sơ & Lịch Hẹn",
            desc: "Tìm lại mã bệnh nhân, phiếu số thứ tự điện tử và sơ đồ khoa phòng điều trị",
            to: "/lookup",
            icon: <SearchIcon sx={{ fontSize: 26 }} />,
            color: "#6366F1",
            bgColor: "#EEF2FF",
            border: "#C7D2FE",
            badge: "Tra cứu nhanh"
        },
        {
            title: "Xác Thực Đơn Thuốc",
            desc: "Kiểm tra đơn thuốc điện tử chính hãng, phác đồ điều trị chuẩn Bộ Y Tế",
            to: "/verify-prescription",
            icon: <VerifiedUserIcon sx={{ fontSize: 26 }} />,
            color: "#F43F5E",
            bgColor: "#FFF1F2",
            border: "#FECDD3",
            badge: "Chuẩn BYT"
        },
        {
            title: "Ví Viện Phí & Nạp Tiền",
            desc: "Thanh toán viện phí minh bạch, không tiền mặt qua Cổng PayOS (VietQR)",
            to: "/payment",
            icon: <AccountBalanceWalletIcon sx={{ fontSize: 26 }} />,
            color: "#D97706",
            bgColor: "#FEF3C7",
            border: "#FDE68A",
            badge: "PayOS VietQR"
        }
    ];

    // Chuyên khoa đang được chọn để xem bác sĩ trực
    const currentSelectedDept = useMemo(() => {
        return departments.find(d => d.departmentId === selectedDeptId);
    }, [departments, selectedDeptId]);

    return (
        <Box
            sx={{
                bgcolor: "#F8FAFC",
                minHeight: "100vh",
                // Chừa khoảng đệm chân trang để không bị PatientBottomNav che khuất trên điện thoại
                pb: { xs: 11, md: 6 }
            }}
        >
            {/* =========================================================================
                1. HERO SECTION: 2 Cột Modern Medical - Logo & Visual Bác Sĩ Cao Cấp
            ========================================================================= */}
            <Box
                component="section"
                aria-label="Giới thiệu bệnh viện"
                sx={{
                    position: "relative",
                    background: "linear-gradient(180deg, #F0FDFA 0%, #F8FAFC 60%, #FFFFFF 100%)",
                    color: "#0F172A",
                    pt: { xs: 4, sm: 5, md: 7 },
                    pb: { xs: 9, sm: 10, md: 12 },
                    overflow: "hidden",
                    borderBottom: "1px solid #E2E8F0"
                }}
            >
                {/* Subtle Background Mesh Ornaments (Teal & Heart Red Glow) */}
                <Box
                    sx={{
                        position: "absolute",
                        top: -100,
                        left: "30%",
                        width: 700,
                        height: 500,
                        background: "radial-gradient(circle, rgba(13, 148, 136, 0.08) 0%, rgba(244, 63, 94, 0.04) 50%, rgba(0, 0, 0, 0) 75%)",
                        pointerEvents: "none",
                        zIndex: 1
                    }}
                />

                <Container maxWidth="xl" sx={{ position: "relative", zIndex: 2 }}>
                    <Grid container spacing={{ xs: 4, lg: 5 }} alignItems="center">
                        {/* CỘT TRÁI: THÔNG ĐIỆP & TÌM KIẾM ĐẶT KHÁM */}
                        <Grid item xs={12} lg={7}>
                            {/* Status Beacon Chip with Brand Logo */}
                            <Box
                                display="inline-flex"
                                alignItems="center"
                                gap={1}
                                sx={{
                                    bgcolor: "#FFFFFF",
                                    border: "1px solid #99F6E4",
                                    borderRadius: "9999px",
                                    px: 2,
                                    py: 0.6,
                                    mb: 2.5,
                                    boxShadow: "0 2px 8px rgba(13, 148, 136, 0.1)"
                                }}
                            >
                                <Box
                                    component="img"
                                    src="/images/logo.png"
                                    alt="Logo Bệnh Viện TNT"
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        objectFit: "contain",
                                        borderRadius: "6px"
                                    }}
                                />
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        bgcolor: "#0D9488",
                                        boxShadow: "0 0 10px rgba(13, 148, 136, 0.5)"
                                    }}
                                />
                                <Typography
                                    sx={{
                                        fontSize: "0.78rem",
                                        fontWeight: 800,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "#0F766E"
                                    }}
                                >
                                    HỆ THỐNG Y TẾ SỐ YOUMED TNT · ĐA KHOA QUỐC TẾ
                                </Typography>
                            </Box>

                            {/* Title with Gradient Text (Teal to Soft Rose Pink) */}
                            <Typography
                                variant="h1"
                                component="h1"
                                sx={{
                                    fontSize: { xs: "2rem", sm: "2.75rem", md: "3.4rem" },
                                    fontWeight: 900,
                                    lineHeight: 1.18,
                                    letterSpacing: "-0.03em",
                                    mb: 2,
                                    color: "#0F172A"
                                }}
                            >
                                Chăm Sóc Sức Khỏe Toàn Diện{" "}
                                <Box
                                    component="span"
                                    sx={{
                                        display: "block",
                                        background: "linear-gradient(90deg, #0D9488 0%, #0F766E 50%, #E11D48 100%)",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent"
                                    }}
                                >
                                    Đặt Khám Nhanh, Không Chờ Đợi
                                </Box>
                            </Typography>

                            <Typography
                                variant="body1"
                                sx={{
                                    color: "#475569",
                                    fontSize: { xs: "0.95rem", sm: "1.05rem", md: "1.12rem" },
                                    lineHeight: 1.65,
                                    maxWidth: 620,
                                    mb: 3.5,
                                    fontWeight: 500
                                }}
                            >
                                Chủ động chọn chuyên khoa, bác sĩ và khung giờ khám trước. Nhận phiếu số thứ tự điện tử, thủ tục tinh gọn và thanh toán viện phí trực tuyến qua PayOS VietQR.
                            </Typography>

                            {/* Action Buttons */}
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={2}
                                alignItems={{ xs: "stretch", sm: "center" }}
                                mb={3.5}
                            >
                                <Button
                                    component={Link}
                                    to="/booking"
                                    variant="contained"
                                    size="large"
                                    startIcon={<CalendarMonthIcon sx={{ fontSize: 20 }} />}
                                    sx={{
                                        bgcolor: "#0D9488 !important",
                                        color: "#FFFFFF !important",
                                        fontWeight: 800,
                                        fontSize: "0.98rem",
                                        px: 3.6,
                                        py: 1.3,
                                        borderRadius: "12px",
                                        boxShadow: "0 8px 20px rgba(13, 148, 136, 0.3)",
                                        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                        "&:hover": {
                                            bgcolor: "#0F766E !important",
                                            transform: "translateY(-2px)",
                                            boxShadow: "0 12px 28px rgba(13, 148, 136, 0.4)"
                                        }
                                    }}
                                >
                                    Đặt Lịch Khám Ngay
                                </Button>

                                <Button
                                    component={Link}
                                    to="/lookup"
                                    variant="outlined"
                                    size="large"
                                    startIcon={<SearchIcon sx={{ fontSize: 20 }} />}
                                    sx={{
                                        borderColor: "#CBD5E1",
                                        color: "#334155",
                                        fontWeight: 700,
                                        fontSize: "0.95rem",
                                        px: 3.2,
                                        py: 1.3,
                                        borderRadius: "12px",
                                        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                        "&:hover": {
                                            borderColor: "#0D9488",
                                            color: "#0D9488",
                                            bgcolor: "#F0FDFA",
                                            transform: "translateY(-2px)"
                                        }
                                    }}
                                >
                                    Tra Cứu Hồ Sơ & Sơ Đồ
                                </Button>
                            </Stack>

                            {/* HỘP TÌM KIẾM THÔNG MINH (Apple Frosted Glass Container) */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 1.8, md: 2.2 },
                                    borderRadius: "18px",
                                    maxWidth: 640,
                                    bgcolor: "#FFFFFF",
                                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.06)",
                                    border: "1px solid #E2E8F0"
                                }}
                            >
                                <Box
                                    component="form"
                                    onSubmit={handleHeroSearch}
                                    role="search"
                                    aria-label="Tìm kiếm chuyên khoa hoặc triệu chứng"
                                    sx={{
                                        display: "flex",
                                        flexDirection: { xs: "column", sm: "row" },
                                        alignItems: "stretch",
                                        gap: 1.2,
                                        bgcolor: "#F8FAFC",
                                        borderRadius: "14px",
                                        p: 0.8,
                                        border: "1.5px solid #E2E8F0",
                                        transition: "all 0.2s ease",
                                        "&:focus-within": {
                                            borderColor: "#0D9488",
                                            bgcolor: "#FFFFFF",
                                            boxShadow: "0 0 0 4px rgba(13, 148, 136, 0.16)"
                                        }
                                    }}
                                >
                                    <TextField
                                        fullWidth
                                        variant="standard"
                                        placeholder="Nhập triệu chứng, bệnh lý (VD: Tim mạch, Đau ngực, Khám Nhi...)"
                                        value={heroSearchTerm}
                                        onChange={(e) => setHeroSearchTerm(e.target.value)}
                                        InputProps={{
                                            disableUnderline: true,
                                            startAdornment: (
                                                 <InputAdornment position="start" sx={{ pl: 1, color: "#0D9488" }}>
                                                    <SearchIcon sx={{ fontSize: 24 }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: heroSearchTerm ? (
                                                <InputAdornment position="end">
                                                    <IconButton size="small" onClick={() => setHeroSearchTerm("")} sx={{ mr: 0.5 }}>
                                                        <ClearIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </InputAdornment>
                                            ) : null,
                                            sx: {
                                                fontSize: { xs: "0.92rem", md: "0.98rem" },
                                                fontWeight: 500,
                                                color: "#0F172A",
                                                px: 1,
                                                py: 0.6
                                            }
                                        }}
                                    />

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        sx={{
                                            borderRadius: "10px",
                                            px: { xs: 2.5, md: 3.2 },
                                            py: { xs: 1.2, md: 1.2 },
                                            fontWeight: 700,
                                            fontSize: "0.95rem",
                                            whiteSpace: "nowrap",
                                            bgcolor: "#0D9488",
                                            boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
                                            "&:hover": {
                                                bgcolor: "#0F766E"
                                            }
                                        }}
                                    >
                                        Tìm Kiếm
                                    </Button>
                                </Box>

                                {/* Các từ khóa gợi ý */}
                                <Box display="flex" alignItems="center" gap={1} mt={1.5} flexWrap="wrap">
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "#64748B",
                                            fontWeight: 700,
                                            fontSize: "0.76rem"
                                        }}
                                    >
                                        Gợi ý:
                                    </Typography>
                                    {["Khám tổng quát", "Tim mạch", "Nhi khoa", "Cơ xương khớp", "Đau ngực", "Sốt cao", "Tai mũi họng"].map((tag, idx) => (
                                        <Chip
                                            key={idx}
                                            label={tag}
                                            size="small"
                                            onClick={() => handleQuickTagClick(tag)}
                                            sx={{
                                                cursor: "pointer",
                                                bgcolor: "#F1F5F9",
                                                color: "#334155",
                                                fontWeight: 600,
                                                fontSize: "0.74rem",
                                                borderRadius: "6px",
                                                transition: "all 0.15s ease",
                                                border: "1px solid #E2E8F0",
                                                "&:hover": {
                                                    bgcolor: "#F0FDFA",
                                                    color: "#0D9488",
                                                    borderColor: "#CCFBF1"
                                                }
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Paper>
                        </Grid>

                        {/* CỘT PHẢI: VISUAL CARD BÁC SĨ CAO CẤP & FLOATING GLASS BADGES */}
                        <Grid item xs={12} lg={5}>
                            <Box
                                sx={{
                                    position: "relative",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    pt: { xs: 2, lg: 0 }
                                }}
                            >
                                {/* Glow Halo Backdrop */}
                                <Box
                                    sx={{
                                        position: "absolute",
                                        width: { xs: 280, sm: 380, md: 440 },
                                        height: { xs: 280, sm: 380, md: 440 },
                                        borderRadius: "50%",
                                        background: "radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, rgba(244, 63, 94, 0.05) 50%, transparent 70%)",
                                        filter: "blur(20px)",
                                        zIndex: 1
                                    }}
                                />

                                {/* Healthcare Portal Highlights Card (Chuẩn thương hiệu TNT, không dùng ảnh stock) */}
                                <Box
                                    sx={{
                                        position: "relative",
                                        zIndex: 2,
                                        width: "100%",
                                        maxWidth: 420,
                                        borderRadius: "28px",
                                        p: { xs: 3, sm: 3.5 },
                                        background: "linear-gradient(180deg, #FFFFFF 0%, #F0FDFA 100%)",
                                        border: `1.5px solid ${designTokens.brand.primaryBorder}`,
                                        boxShadow: "0 24px 48px -12px rgba(15, 118, 110, 0.18)"
                                    }}
                                >
                                    <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                                        <Avatar
                                            src="/images/logo.png"
                                            alt="TNT Hospital"
                                            sx={{
                                                width: 52,
                                                height: 52,
                                                bgcolor: "#F0FDFA",
                                                border: `2px solid ${designTokens.brand.primaryBorder}`,
                                                p: 0.5
                                            }}
                                        />
                                        <Box>
                                            <Typography variant="caption" sx={{ color: designTokens.brand.primary, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                                HỆ THỐNG Y TẾ SỐ
                                            </Typography>
                                            <Typography variant="h6" fontWeight="900" color="#0F172A" sx={{ fontSize: "1.1rem", lineHeight: 1.2 }}>
                                                Bệnh Viện Đa Khoa TNT
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Feature items */}
                                    <Stack spacing={2} mb={3}>
                                        <Box display="flex" alignItems="center" gap={1.5} p={1.5} sx={{ bgcolor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
                                            <Box sx={{ width: 40, height: 40, borderRadius: "10px", bgcolor: "#F0FDFA", color: designTokens.brand.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <CalendarMonthIcon sx={{ fontSize: 22 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={800} color="#0F172A">
                                                    Đặt Khám Chuyên Khoa
                                                </Typography>
                                                <Typography variant="caption" color="#64748B">
                                                    Chủ động chọn ngày, giờ và bác sĩ
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Box display="flex" alignItems="center" gap={1.5} p={1.5} sx={{ bgcolor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
                                            <Box sx={{ width: 40, height: 40, borderRadius: "10px", bgcolor: "#FEF3C7", color: "#B45309", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <AccessTimeIcon sx={{ fontSize: 22 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={800} color="#0F172A">
                                                    Cấp Số Thứ Tự Tự Động
                                                </Typography>
                                                <Typography variant="caption" color="#64748B">
                                                    Giảm thiểu tối đa thời gian chờ tại viện
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Box display="flex" alignItems="center" gap={1.5} p={1.5} sx={{ bgcolor: "#FFFFFF", borderRadius: "14px", border: "1px solid #E2E8F0" }}>
                                            <Box sx={{ width: 40, height: 40, borderRadius: "10px", bgcolor: "#F0FDFA", color: designTokens.brand.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <CalendarMonthIcon sx={{ fontSize: 22 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={800} color="#0F172A">
                                                    Đặt Lịch Khám Trực Tuyến
                                                </Typography>
                                                <Typography variant="caption" color="#64748B">
                                                    Lựa chọn chuyên khoa và thời gian phù hợp
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Stack>

                                    <Button
                                        component={Link}
                                        to="/booking"
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        endIcon={<ArrowForwardIcon />}
                                        sx={{
                                            bgcolor: designTokens.brand.primary,
                                            fontWeight: 800,
                                            borderRadius: "14px",
                                            py: 1.4,
                                            "&:hover": { bgcolor: designTokens.brand.primaryHover }
                                        }}
                                    >
                                        Bắt Đầu Đặt Lịch Ngay
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
            {/* =========================================================================
                2. DỊCH VỤ CỐT LÕI (Bento Grid 4 Highlights)
            ========================================================================= */}
            <Container maxWidth="xl" sx={{ mt: { xs: -4, md: -6 }, position: "relative", zIndex: 10 }}>
                <Grid container spacing={2.5}>
                    {CORE_SERVICES.map((item, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card
                                component={Link}
                                to={item.to}
                                elevation={0}
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    p: 2.5,
                                    borderRadius: "16px",
                                    textDecoration: "none",
                                    bgcolor: "#FFFFFF",
                                    border: `1px solid ${item.border}`,
                                    boxShadow: "0 8px 24px -6px rgba(15, 23, 42, 0.08)",
                                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                    height: "100%",
                                    minHeight: 140,
                                    "&:hover": {
                                        transform: "translateY(-4px)",
                                        boxShadow: "0 16px 32px -8px rgba(0, 136, 214, 0.18)",
                                        borderColor: item.color,
                                        "& .arrow-icon": {
                                            transform: "translateX(4px)",
                                            color: item.color
                                        }
                                    }
                                }}
                            >
                                <Box>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                                        <Box
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: "12px",
                                                bgcolor: item.bgColor,
                                                color: item.color,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                border: `1px solid ${item.border}`
                                            }}
                                        >
                                            {item.icon}
                                        </Box>
                                        <Chip
                                            label={item.badge}
                                            size="small"
                                            sx={{
                                                fontSize: "0.68rem",
                                                fontWeight: 800,
                                                bgcolor: item.bgColor,
                                                color: item.color,
                                                borderRadius: "6px",
                                                height: 22,
                                                border: `1px solid ${item.border}`
                                            }}
                                        />
                                    </Box>

                                    <Typography
                                        variant="subtitle1"
                                        fontWeight="800"
                                        color="#0F172A"
                                        sx={{ fontSize: "0.98rem", mb: 0.5 }}
                                    >
                                        {item.title}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="#64748B"
                                        sx={{
                                            fontSize: "0.82rem",
                                            lineHeight: 1.5,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden"
                                        }}
                                    >
                                        {item.desc}
                                    </Typography>
                                </Box>

                                <Box display="flex" alignItems="center" justifyContent="flex-end" mt={1.5}>
                                    <ArrowForwardIcon
                                        className="arrow-icon"
                                        sx={{
                                            fontSize: 18,
                                            color: "#94A3B8",
                                            transition: "all 0.2s ease"
                                        }}
                                    />
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
            {/* =========================================================================
                3. CHUYÊN KHOA NỔI BẬT (DỮ LIỆU THẬT TỪ /api/departments)
            ========================================================================= */}
            <Container maxWidth="xl" component="section" aria-label="Chuyên khoa nổi bật" sx={{ pt: { xs: 6, md: 8 }, pb: { xs: 6, md: 8 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3.5} flexWrap="wrap" gap={2}>
                    <Box maxWidth={720}>
                        <Box display="inline-flex" alignItems="center" gap={1} mb={1}>
                            <LocalHospitalIcon sx={{ color: "#0D9488", fontSize: 18 }} />
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 800,
                                    color: "#0D9488",
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase"
                                }}
                            >
                                CHUYÊN KHOA TRỌNG ĐIỂM
                            </Typography>
                        </Box>
                        <Typography
                            variant="h2"
                            component="h2"
                            fontWeight="900"
                            color="#0F172A"
                            sx={{ fontSize: { xs: "1.6rem", md: "2.1rem" }, letterSpacing: "-0.02em" }}
                        >
                            Hệ Thống Chuyên Khoa Thăm Khám & Điều Trị
                        </Typography>
                        <Typography variant="body2" color="#64748B" sx={{ mt: 0.5, fontSize: "0.92rem" }}>
                            Trang thiết bị chẩn đoán hình ảnh kỹ thuật cao, phòng khám chuyên sâu và phác đồ điều trị chuẩn y tế.
                        </Typography>
                    </Box>

                    <Button
                        component={Link}
                        to="/booking"
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                            fontWeight: 700,
                            color: "#0D9488",
                            bgcolor: "#F0FDFA",
                            borderRadius: "10px",
                            px: 2,
                            py: 0.8,
                            fontSize: "0.88rem",
                            border: "1px solid #CCFBF1",
                            "&:hover": { bgcolor: "#CCFBF1" }
                        }}
                    >
                        Tất cả chuyên khoa ({departments.length})
                    </Button>
                </Box>

                {/* Bộ lọc chuyên khoa tại chỗ */}
                <Box mb={3.5} maxWidth={440}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Tìm theo tên chuyên khoa (VD: Tim mạch, Nhi, Ngoại...)"
                        value={deptFilterTerm}
                        onChange={(e) => setDeptFilterTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" sx={{ color: "#0D9488" }} />
                                </InputAdornment>
                            ),
                            endAdornment: deptFilterTerm ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setDeptFilterTerm("")}>
                                        <ClearIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                            sx: {
                                borderRadius: "10px",
                                bgcolor: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                fontSize: "0.88rem",
                                "&.Mui-focused": {
                                    borderColor: "#0D9488"
                                }
                            }
                        }}
                    />
                </Box>

                {/* TRẠNG THÁI LOADING CHUYÊN KHOA */}
                {loadingDepts && (
                    <Grid container spacing={2.5}>
                        {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <Grid item xs={12} sm={6} md={4} key={idx}>
                                <Card sx={{ p: 2.5, borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                                    <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                                        <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: "12px" }} />
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Skeleton variant="text" width="60%" height={24} />
                                            <Skeleton variant="text" width="40%" height={16} />
                                        </Box>
                                    </Box>
                                    <Skeleton variant="text" width="100%" height={20} />
                                    <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
                                    <Skeleton variant="rounded" width="100%" height={40} sx={{ borderRadius: "10px" }} />
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* TRẠNG THÁI LỖI TẢI CHUYÊN KHOA */}
                {!loadingDepts && deptError && (
                    <Alert
                        severity="error"
                        action={
                            <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={loadDepartments}>
                                Thử lại
                            </Button>
                        }
                        sx={{ borderRadius: "12px", mb: 3 }}
                    >
                        {deptError}
                    </Alert>
                )}

                {/* TRẠNG THÁI EMPTY STATE CHUYÊN KHOA */}
                {!loadingDepts && !deptError && filteredDepartments.length === 0 && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 5,
                            textAlign: "center",
                            borderRadius: "16px",
                            bgcolor: "#FFFFFF",
                            border: "1.5px dashed #CBD5E1"
                        }}
                    >
                        <InfoOutlinedIcon sx={{ fontSize: 48, color: "#94A3B8", mb: 1.5 }} />
                        <Typography variant="subtitle1" fontWeight="800" color="#0F172A" gutterBottom>
                            Không tìm thấy chuyên khoa phù hợp với từ khóa "{deptFilterTerm}"
                        </Typography>
                        <Typography variant="body2" color="#64748B" mb={2.5}>
                            Vui lòng thử tìm với từ khóa khác hoặc nhấn nút dưới để xóa bộ lọc.
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setDeptFilterTerm("")}
                            sx={{ borderRadius: "8px", fontWeight: 700, color: "#0D9488", borderColor: "#0D9488" }}
                        >
                            Xóa bộ lọc
                        </Button>
                    </Paper>
                )}

                {/* DANH SÁCH CHUYÊN KHOA THỰC TẾ (Apple HIG Clean Cards) */}
                {!loadingDepts && !deptError && filteredDepartments.length > 0 && (
                    <Grid container spacing={2.5}>
                        {filteredDepartments.map((dept) => {
                            const icon = getDepartmentIcon(dept.departmentName);
                            const totalRooms = dept.totalRooms || 0;

                            return (
                                <Grid item xs={12} sm={6} md={4} key={dept.departmentId}>
                                    <Card
                                        elevation={0}
                                        sx={{
                                            p: 2.8,
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            borderRadius: "18px",
                                            bgcolor: "#FFFFFF",
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
                                            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                            "&:hover": {
                                                transform: "translateY(-4px)",
                                                borderColor: "#0D9488",
                                                boxShadow: "0 14px 30px rgba(13, 148, 136, 0.14)"
                                            }
                                        }}
                                    >
                                        <Box>
                                            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                                                <Box
                                                    sx={{
                                                        width: 50,
                                                        height: 50,
                                                        borderRadius: "14px",
                                                        bgcolor: "#F0FDFA",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        border: "1px solid #CCFBF1"
                                                    }}
                                                >
                                                    {icon}
                                                </Box>
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    <Typography
                                                        variant="subtitle1"
                                                        fontWeight="800"
                                                        color="#0F172A"
                                                        noWrap
                                                        title={dept.departmentName}
                                                        sx={{ fontSize: "1.02rem" }}
                                                    >
                                                        {dept.departmentName}
                                                    </Typography>
                                                    <Box display="flex" alignItems="center" gap={1} mt={0.3}>
                                                        <Chip
                                                            icon={<MeetingRoomIcon sx={{ fontSize: "14px !important", color: "#0D9488 !important" }} />}
                                                            label={totalRooms > 0 ? `${totalRooms} phòng khám` : "Đang cập nhật phòng"}
                                                            size="small"
                                                            sx={{
                                                                height: 22,
                                                                fontSize: "0.72rem",
                                                                fontWeight: 700,
                                                                bgcolor: "#F0FDFA",
                                                                color: "#0F766E",
                                                                borderRadius: "6px",
                                                                border: "1px solid #CCFBF1"
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </Box>

                                            <Typography
                                                variant="body2"
                                                color="#64748B"
                                                sx={{
                                                    mb: 2.5,
                                                    minHeight: 42,
                                                    lineHeight: 1.55,
                                                    fontSize: "0.86rem",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden"
                                                }}
                                            >
                                                {dept.description || "Khám, chẩn đoán hình ảnh kỹ thuật cao và phác đồ điều trị chuyên khoa chuẩn y tế."}
                                            </Typography>
                                        </Box>

                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                component={Link}
                                                to={`/booking?departmentId=${dept.departmentId}`}
                                                variant="contained"
                                                fullWidth
                                                size="medium"
                                                sx={{
                                                    bgcolor: "#0D9488",
                                                    borderRadius: "10px",
                                                    fontWeight: 700,
                                                    py: 1,
                                                    fontSize: "0.88rem",
                                                    boxShadow: "none",
                                                    "&:hover": {
                                                        bgcolor: "#0F766E",
                                                        boxShadow: "0 4px 12px rgba(13, 148, 136, 0.28)"
                                                    }
                                                }}
                                            >
                                                Đặt Khám Khoa Này
                                            </Button>

                                            <Tooltip title="Xem lịch trực bác sĩ hôm nay tại khoa">
                                                <Button
                                                    variant="outlined"
                                                    size="medium"
                                                    onClick={() => {
                                                        setSelectedDeptId(dept.departmentId);
                                                        const el = document.getElementById("doctor-schedule-section");
                                                        if (el) el.scrollIntoView({ behavior: "smooth" });
                                                    }}
                                                    sx={{
                                                        minWidth: 44,
                                                        px: 1.5,
                                                        borderRadius: "10px",
                                                        borderColor: "#CBD5E1",
                                                        color: "#475569",
                                                        "&:hover": {
                                                            borderColor: "#0D9488",
                                                            color: "#0D9488",
                                                            bgcolor: "#F0FDFA"
                                                        }
                                                    }}
                                                    aria-label={`Xem lịch trực hôm nay của ${dept.departmentName}`}
                                                >
                                                    <CalendarMonthIcon sx={{ fontSize: 18 }} />
                                                </Button>
                                            </Tooltip>
                                        </Stack>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Container>

            {/* =========================================================================
                4. ĐỘI NGŨ BÁC SĨ & LỊCH TRỰC HÔM NAY (MINH HỌA HÌNH ẢNH BÁC SĨ THỰC TẾ)
            ========================================================================= */}
            <Box
                id="doctor-schedule-section"
                component="section"
                aria-label="Lịch trực bác sĩ hôm nay"
                sx={{
                    bgcolor: "#FFFFFF",
                    py: { xs: 6, md: 8 },
                    borderTop: "1px solid #E2E8F0",
                    borderBottom: "1px solid #E2E8F0"
                }}
            >
                <Container maxWidth="xl">
                    <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3.5} flexWrap="wrap" gap={2}>
                        <Box maxWidth={720}>
                            <Box display="inline-flex" alignItems="center" gap={1} mb={1}>
                                <AccessTimeIcon sx={{ color: "#0D9488", fontSize: 18 }} />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 800,
                                        color: "#0D9488",
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase"
                                    }}
                                >
                                    LỊCH CÔNG TÁC CÔNG KHAI
                                </Typography>
                            </Box>
                            <Typography
                                variant="h2"
                                component="h2"
                                fontWeight="900"
                                color="#0F172A"
                                sx={{ fontSize: { xs: "1.6rem", md: "2.1rem" }, letterSpacing: "-0.02em" }}
                            >
                                Bác Sĩ & Ca Trực Thực Tế Hôm Nay ({todayFormatted})
                            </Typography>
                            <Typography variant="body2" color="#64748B" sx={{ mt: 0.5, fontSize: "0.92rem" }}>
                                Lịch trực và ca tiếp nhận bệnh nhân thực tế được điều phối bởi hệ thống bệnh viện.
                            </Typography>
                        </Box>

                        <Button
                            component={Link}
                            to="/booking"
                            endIcon={<ArrowForwardIcon />}
                            sx={{
                                fontWeight: 700,
                                color: "#0D9488",
                                bgcolor: "#F0FDFA",
                                borderRadius: "10px",
                                px: 2,
                                py: 0.8,
                                fontSize: "0.88rem",
                                border: "1px solid #CCFBF1",
                                "&:hover": { bgcolor: "#CCFBF1" }
                            }}
                        >
                            Xem lịch các ngày tiếp theo
                        </Button>
                    </Box>

                    {/* Bộ chọn Chuyên khoa để xem lịch trực (Pill Strip) */}
                    <Box mb={3.5} sx={{ overflowX: "auto", pb: 1 }}>
                        <Typography
                            variant="caption"
                            fontWeight="bold"
                            color="#64748B"
                            sx={{ mb: 1.2, display: "block", textTransform: "uppercase", fontSize: "0.75rem" }}
                        >
                            Chọn chuyên khoa xem lịch trực:
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ minWidth: "max-content" }}>
                            {departments.map((dept) => {
                                const isSelected = dept.departmentId === selectedDeptId;
                                return (
                                    <Chip
                                        key={dept.departmentId}
                                        label={dept.departmentName}
                                        onClick={() => setSelectedDeptId(dept.departmentId)}
                                        clickable
                                        sx={{
                                            fontWeight: isSelected ? 800 : 600,
                                            borderRadius: "8px",
                                            px: 1,
                                            py: 2.2,
                                            fontSize: "0.85rem",
                                            border: "1px solid",
                                            borderColor: isSelected ? "#0D9488" : "#E2E8F0",
                                            bgcolor: isSelected ? "#0D9488" : "#F8FAFC",
                                            color: isSelected ? "#FFFFFF" : "#334155",
                                            transition: "all 0.15s ease",
                                            "&:hover": {
                                                bgcolor: isSelected ? "#0F766E" : "#E2E8F0"
                                            }
                                        }}
                                    />
                                );
                            })}
                        </Stack>
                    </Box>

                    {/* TRẠNG THÁI LOADING LỊCH BÁC SĨ */}
                    {loadingSchedules && (
                        <Grid container spacing={2.5}>
                            {[1, 2, 3, 4].map((i) => (
                                <Grid item xs={12} sm={6} md={3} key={i}>
                                    <Card sx={{ p: 3, borderRadius: "16px", border: "1px solid #E2E8F0" }}>
                                        <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                                            <Skeleton variant="circular" width={80} height={80} sx={{ mb: 1.5 }} />
                                            <Skeleton variant="text" width="70%" height={24} />
                                            <Skeleton variant="text" width="50%" height={18} />
                                        </Box>
                                        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: "8px", mb: 1.5 }} />
                                        <Skeleton variant="rectangular" height={38} sx={{ borderRadius: "10px" }} />
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* TRẠNG THÁI LỖI LỊCH BÁC SĨ */}
                    {!loadingSchedules && scheduleError && (
                        <Alert severity="info" sx={{ borderRadius: "12px", mb: 2 }}>
                            {scheduleError}
                        </Alert>
                    )}

                    {/* EMPTY STATE: Khi hôm nay khoa chưa có ca trực nào được xếp */}
                    {!loadingSchedules && !scheduleError && schedules.length === 0 && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 5,
                                textAlign: "center",
                                borderRadius: "16px",
                                bgcolor: "#F8FAFC",
                                border: "1.5px dashed #CBD5E1"
                            }}
                        >
                            <CalendarMonthIcon sx={{ fontSize: 48, color: "#94A3B8", mb: 1.5 }} />
                            <Typography variant="subtitle1" fontWeight="800" color="#0F172A" gutterBottom>
                                Chưa có ca trực công khai hôm nay tại khoa {currentSelectedDept?.departmentName || ""}
                            </Typography>
                            <Typography variant="body2" color="#64748B" sx={{ maxWidth: 560, mx: "auto", mb: 2.5 }}>
                                Chuyên khoa hiện chưa có lịch phân công trực tiếp nhận hôm nay, hoặc các ca trực đã hoàn tất. Quý bệnh nhân vui lòng kiểm tra lịch khám các ngày tiếp theo trong tuần.
                            </Typography>
                            <Button
                                component={Link}
                                to={selectedDeptId ? `/booking?departmentId=${selectedDeptId}` : "/booking"}
                                variant="contained"
                                startIcon={<CalendarMonthIcon />}
                                sx={{
                                    bgcolor: "#0D9488",
                                    fontWeight: 700,
                                    borderRadius: "10px",
                                    px: 3,
                                    py: 1,
                                    "&:hover": { bgcolor: "#0F766E" }
                                }}
                            >
                                Xem Lịch Khám Các Ngày Tới
                            </Button>
                        </Paper>
                    )}

                    {/* DANH SÁCH BÁC SĨ & CA TRỰC THỰC TẾ TRONG NGÀY (CÓ ẢNH BÁC SĨ THỰC TẾ) */}
                    {!loadingSchedules && !scheduleError && schedules.length > 0 && (
                        <Grid container spacing={2.5}>
                            {schedules.map((sch, idx) => {
                                const sessionInfo = formatSession(sch.session);
                                const availableSlots = sch.timeSlots ? sch.timeSlots.filter(s => !s.isFull).length : 0;
                                const totalSlots = sch.timeSlots ? sch.timeSlots.length : 0;
                                const doctorPhoto = sch.avatar || null;

                                return (
                                    <Grid item xs={12} sm={6} md={3} key={sch.scheduleId}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: "18px",
                                                p: 3,
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "space-between",
                                                textAlign: "center",
                                                bgcolor: "#FFFFFF",
                                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
                                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                                "&:hover": {
                                                    transform: "translateY(-4px)",
                                                    boxShadow: "0 14px 28px rgba(13, 148, 136, 0.12)",
                                                    borderColor: "#0D9488"
                                                }
                                            }}
                                        >
                                            <Box>
                                                {/* Doctor Portrait Image or Neutral Initials Avatar */}
                                                <Box position="relative" display="inline-block" mx="auto" mb={1.8}>
                                                    {doctorPhoto ? (
                                                        <Box
                                                            component="img"
                                                            src={doctorPhoto}
                                                            alt={sch.doctorName || "Bác sĩ phụ trách"}
                                                            sx={{
                                                                width: 82,
                                                                height: 82,
                                                                borderRadius: "50%",
                                                                objectFit: "cover",
                                                                objectPosition: "top center",
                                                                border: `3px solid ${designTokens.brand.primaryBorder}`,
                                                                boxShadow: "0 6px 16px rgba(15, 118, 110, 0.2)",
                                                                background: "radial-gradient(circle at 50% 30%, #CCFBF1 0%, #F0FDFA 70%, #E2E8F0 100%)"
                                                            }}
                                                        />
                                                    ) : (
                                                        <Avatar
                                                            sx={{
                                                                width: 82,
                                                                height: 82,
                                                                bgcolor: designTokens.brand.primary,
                                                                color: "#FFFFFF",
                                                                fontSize: "1.8rem",
                                                                fontWeight: 800,
                                                                border: `3px solid ${designTokens.brand.primaryBorder}`,
                                                                boxShadow: "0 6px 16px rgba(15, 118, 110, 0.2)"
                                                            }}
                                                        >
                                                            {getDoctorInitials(sch.doctorName)}
                                                        </Avatar>
                                                    )}
                                                    <Box
                                                        sx={{
                                                            position: "absolute",
                                                            bottom: 0,
                                                            right: 0,
                                                            bgcolor: "#FFFFFF",
                                                            borderRadius: "50%",
                                                            display: "flex",
                                                            p: "2px",
                                                            boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
                                                        }}
                                                    >
                                                        <VerifiedIcon sx={{ color: designTokens.brand.primary, fontSize: 20 }} />
                                                    </Box>
                                                </Box>

                                                <Chip
                                                    label={formatDegree(sch.degree)}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: "#F0FDFA",
                                                        color: "#0D9488",
                                                        fontWeight: 800,
                                                        fontSize: "0.72rem",
                                                        borderRadius: "6px",
                                                        mb: 1,
                                                        border: "1px solid #CCFBF1"
                                                    }}
                                                />

                                                <Typography variant="subtitle1" fontWeight="900" color="#0F172A" sx={{ fontSize: "1.05rem" }} gutterBottom>
                                                    {sch.doctorName || "Bác sĩ phụ trách"}
                                                </Typography>

                                                <Typography variant="caption" color="#0D9488" fontWeight="700" display="block" sx={{ mb: 0.5, fontSize: "0.82rem" }}>
                                                    {sch.departmentName}
                                                </Typography>

                                                {sch.roomName && (
                                                    <Chip
                                                        icon={<MeetingRoomIcon sx={{ fontSize: "14px !important" }} />}
                                                        label={`Phòng: ${sch.roomName}`}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            fontSize: "0.72rem",
                                                            fontWeight: 600,
                                                            bgcolor: "#F1F5F9",
                                                            color: "#475569",
                                                            mb: 1.5
                                                        }}
                                                    />
                                                )}

                                                <Divider sx={{ my: 1.5 }} />

                                                {/* Khung ca trực */}
                                                <Box
                                                    sx={{
                                                        bgcolor: sessionInfo.bg,
                                                        color: sessionInfo.color,
                                                        border: `1px solid ${sessionInfo.border}`,
                                                        p: 1,
                                                        borderRadius: "8px",
                                                        fontWeight: 700,
                                                        fontSize: "0.75rem",
                                                        mb: 1.5,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 0.8
                                                    }}
                                                >
                                                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                                                    <span>{sessionInfo.label}</span>
                                                </Box>

                                                {totalSlots > 0 && (
                                                    <Typography
                                                        variant="caption"
                                                        color={availableSlots > 0 ? "#15803D" : "#DC2626"}
                                                        fontWeight="700"
                                                        display="block"
                                                        mb={1.5}
                                                        sx={{ fontFamily: "monospace", fontSize: "0.82rem" }}
                                                    >
                                                        {availableSlots > 0 ? `Còn ${availableSlots}/${totalSlots} khung giờ khám` : "Đã kín lịch ca này"}
                                                    </Typography>
                                                )}
                                            </Box>

                                            <Button
                                                component={Link}
                                                to={`/booking?departmentId=${sch.departmentId || selectedDeptId}`}
                                                variant="contained"
                                                fullWidth
                                                size="medium"
                                                sx={{
                                                    bgcolor: "#0D9488",
                                                    borderRadius: "10px",
                                                    fontWeight: 700,
                                                    py: 1,
                                                    fontSize: "0.88rem",
                                                    boxShadow: "none",
                                                    "&:hover": {
                                                        bgcolor: "#0F766E",
                                                        boxShadow: "0 4px 12px rgba(13, 148, 136, 0.28)"
                                                    }
                                                }}
                                            >
                                                Đặt Khám Bác Sĩ
                                            </Button>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}

                    {/* =========================================================================
                        ONLINE BOOKING CALL TO ACTION BANNER (Trung thực, không dữ liệu giả)
                    ========================================================================= */}
                    <Box
                        mt={6}
                        p={{ xs: 3.5, md: 5 }}
                        sx={{
                            borderRadius: "24px",
                            background: `linear-gradient(135deg, ${designTokens.brand.primary} 0%, ${designTokens.brand.primaryDark} 100%)`,
                            color: "#FFFFFF",
                            boxShadow: "0 12px 32px -8px rgba(15, 118, 110, 0.35)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} md={8}>
                                <Chip
                                    label="DỊCH VỤ Y TẾ SỐ TNT HOSPITAL"
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(255, 255, 255, 0.15)",
                                        color: "#FFFFFF",
                                        fontWeight: 800,
                                        fontSize: "0.75rem",
                                        mb: 1.5,
                                        backdropFilter: "blur(4px)"
                                    }}
                                />
                                <Typography variant="h3" fontWeight="900" sx={{ fontSize: { xs: "1.45rem", md: "1.9rem" }, mb: 1.2 }}>
                                    Đặt Lịch Khám Trực Tuyến & Cấp Số Thứ Tự Tự Động
                                </Typography>
                                <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 640 }}>
                                    Chủ động lựa chọn chuyên khoa, bác sĩ phụ trách và khung giờ thuận tiện. Nhận ngay phiếu khám điện tử có mã vạch định danh để làm thủ tục nhanh chóng khi đến viện.
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4} sx={{ textAlign: { xs: "left", md: "right" } }}>
                                <Button
                                    component={Link}
                                    to="/booking"
                                    variant="contained"
                                    size="large"
                                    endIcon={<ArrowForwardIcon />}
                                    sx={{
                                        bgcolor: "#FFFFFF",
                                        color: designTokens.brand.primaryDark,
                                        fontWeight: 800,
                                        px: 3.5,
                                        py: 1.6,
                                        borderRadius: "14px",
                                        fontSize: "1rem",
                                        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
                                        "&:hover": {
                                            bgcolor: "#F0FDFA",
                                            transform: "translateY(-2px)"
                                        }
                                    }}
                                >
                                    Đặt Lịch Khám Ngay
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>

                    <Box mt={4} p={2} sx={{ bgcolor: "#F0FDFA", borderRadius: "14px", border: "1px solid #CCFBF1" }}>
                        <Typography variant="caption" color="#0F766E" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 18, color: "#0D9488", flexShrink: 0 }} />
                            <span>
                                <b>Minh bạch thông tin:</b> Danh bạ bác sĩ và lịch trực được đồng bộ trực tiếp từ phân hệ quản lý nhân sự y tế. Mọi lượt đặt trực tuyến sẽ được cấp mã số thứ tự điện tử chính thức, không cần bốc số tại quầy.
                            </span>
                        </Typography>
                    </Box>
                </Container>
            </Box>

            {/* =========================================================================
                5. QUY TRÌNH 4 BƯỚC ĐẶT KHÁM THỰC TẾ
            ========================================================================= */}
            <Box component="section" aria-label="Quy trình khám bệnh" sx={{ bgcolor: "#F8FAFC", py: { xs: 6, md: 8 } }}>
                <Container maxWidth="xl">
                    <Box textAlign="center" maxWidth={720} mx="auto" mb={5}>
                        <Box display="inline-flex" alignItems="center" gap={1} mb={1}>
                            <SparklesIcon sx={{ color: "#0D9488", fontSize: 18 }} />
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 800,
                                    color: "#0D9488",
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase"
                                }}
                            >
                                TIỆN LỢI & NHANH CHÓNG
                            </Typography>
                        </Box>
                        <Typography
                            variant="h2"
                            component="h2"
                            fontWeight="900"
                            color="#0F172A"
                            sx={{ fontSize: { xs: "1.6rem", md: "2.1rem" }, letterSpacing: "-0.02em" }}
                        >
                            Quy Trình Khám Chữa Bệnh 4 Bước Đơn Giản
                        </Typography>
                        <Typography variant="body2" color="#64748B" sx={{ mt: 0.5, fontSize: "0.92rem" }}>
                            Chỉ với vài thao tác trực tuyến, bạn đã có ngay phiếu khám ưu tiên và khung giờ mong muốn
                        </Typography>
                    </Box>

                    <Grid container spacing={2.5}>
                        {[
                            {
                                step: "01",
                                title: "Đặt Lịch & Chọn Khung Giờ",
                                desc: "Lựa chọn chuyên khoa, bác sĩ và khung giờ khám trực tuyến phù hợp qua website hoặc ứng dụng.",
                                icon: <EventAvailableIcon sx={{ fontSize: 26, color: "#0D9488" }} />,
                                color: "#0D9488"
                            },
                            {
                                step: "02",
                                title: "Check-in Kiosk & Lấy STT",
                                desc: "Đến viện đúng giờ, quét mã QR đặt khám tại cây Kiosk hoặc quầy tiếp đón để nhận STT ưu tiên.",
                                icon: <HowToRegIcon sx={{ fontSize: 26, color: "#059669" }} />,
                                color: "#059669"
                            },
                            {
                                step: "03",
                                title: "Khám & Cận Lâm Sàng",
                                desc: "Bác sĩ chuyên khoa thăm khám lâm sàng, thực hiện xét nghiệm hoặc chẩn đoán hình ảnh kỹ thuật cao.",
                                icon: <MedicalServicesIcon sx={{ fontSize: 26, color: "#D97706" }} />,
                                color: "#D97706"
                            },
                            {
                                step: "04",
                                title: "Thanh Toán VietQR & Sổ Khám Số",
                                desc: "Thanh toán viện phí không tiền mặt qua PayOS (VietQR) và theo dõi kết quả, đơn thuốc trên điện thoại.",
                                icon: <AssignmentTurnedInIcon sx={{ fontSize: 26, color: "#F43F5E" }} />,
                                color: "#F43F5E"
                            }
                        ].map((s, idx) => (
                            <Grid item xs={12} sm={6} md={3} key={idx}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3.2,
                                        borderRadius: "18px",
                                        height: "100%",
                                        bgcolor: "#FFFFFF",
                                        position: "relative",
                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
                                        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                        "&:hover": {
                                            transform: "translateY(-4px)",
                                            boxShadow: "0 12px 24px rgba(13, 148, 136, 0.12)",
                                            borderColor: s.color
                                        }
                                    }}
                                >
                                    <Typography
                                        variant="h3"
                                        component="span"
                                        fontWeight="900"
                                        sx={{
                                            position: "absolute",
                                            top: 16,
                                            right: 18,
                                            color: "#E2E8F0",
                                            fontSize: "2rem",
                                            fontFamily: "monospace",
                                            userSelect: "none"
                                        }}
                                    >
                                        {s.step}
                                    </Typography>
                                    <Box
                                        sx={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: "14px",
                                            bgcolor: "#F8FAFC",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            mb: 2.2,
                                            border: "1px solid #E2E8F0"
                                        }}
                                    >
                                        {s.icon}
                                    </Box>
                                    <Typography variant="subtitle1" fontWeight="800" color="#0F172A" gutterBottom sx={{ fontSize: "1rem" }}>
                                        {s.title}
                                    </Typography>
                                    <Typography variant="body2" color="#64748B" sx={{ lineHeight: 1.6, fontSize: "0.86rem" }}>
                                        {s.desc}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    <Box textAlign="center" mt={4.5}>
                        <Button
                            component={Link}
                            to="/booking"
                            variant="contained"
                            size="large"
                            startIcon={<CalendarMonthIcon />}
                            sx={{
                                bgcolor: "#0D9488",
                                fontWeight: 800,
                                px: 4,
                                py: 1.3,
                                borderRadius: "12px",
                                boxShadow: "0 8px 20px rgba(13, 148, 136, 0.3)",
                                "&:hover": {
                                    bgcolor: "#0F766E"
                                }
                            }}
                        >
                            Bắt Đầu Đặt Lịch Khám Ngay
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* =========================================================================
                6. THÔNG TIN TẠO NIỀM TIN & QUY CHUẨN HOẠT ĐỘNG
            ========================================================================= */}
            <Container maxWidth="xl" component="section" aria-label="Thông tin uy tín bệnh viện" sx={{ py: { xs: 6, md: 8 } }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3.5, md: 5 },
                        borderRadius: "24px",
                        bgcolor: "#FFFFFF",
                        border: "1px solid rgba(13, 148, 136, 0.15)",
                        boxShadow: "0 12px 36px rgba(15, 23, 42, 0.05)"
                    }}
                >
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={7}>
                            <Box display="flex" alignItems="center" gap={1.2} mb={1}>
                                <ShieldIcon sx={{ color: "#0D9488", fontSize: 24 }} />
                                <Typography variant="subtitle2" fontWeight="800" color="#0D9488">
                                    TIÊU CHUẨN Y KHOA ĐÃ XÁC MINH
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="h3" fontWeight="900" color="#0F172A" gutterBottom sx={{ fontSize: { xs: "1.45rem", md: "1.85rem" } }}>
                                TNT HOSPITAL
                            </Typography>
                            <Typography variant="body2" color="#64748B" sx={{ lineHeight: 1.65, mb: 3, fontSize: "0.92rem" }}>
                                Hoạt động dưới sự quản lý chuyên môn của Bộ Y Tế, cung cấp dịch vụ thăm khám và điều trị chất lượng cao, ứng dụng công nghệ y tế số nhằm mang lại trải nghiệm khám chữa bệnh chu đáo, minh bạch cho mọi người dân.
                            </Typography>

                            <Stack spacing={1.5} fontSize="0.88rem" mb={3}>
                                <Box display="flex" alignItems="flex-start" gap={1.2}>
                                    <VerifiedIcon sx={{ fontSize: 20, color: "#0D9488", mt: 0.2 }} />
                                    <Typography variant="body2" color="#0F172A">
                                        <b>Giấy phép hoạt động KCB:</b> Số 188/BYT-GPHĐ cấp bởi Bộ Y Tế.
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="flex-start" gap={1.2}>
                                    <LocationOnIcon sx={{ fontSize: 20, color: "#0D9488", mt: 0.2 }} />
                                    <Typography variant="body2" color="#0F172A">
                                        <b>Địa chỉ bệnh viện:</b> số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội.
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="flex-start" gap={1.2}>
                                    <PhoneInTalkIcon sx={{ fontSize: 20, color: "#F43F5E", mt: 0.2 }} />
                                    <Typography variant="body2" color="#0F172A">
                                        <b>Hotline tư vấn & Cấp cứu 24/7:</b> 1900 8888 & (024) 3888 9999.
                                    </Typography>
                                </Box>
                            </Stack>

                            <Stack spacing={1.5}>
                                <Box display="flex" alignItems="flex-start" gap={1.2}>
                                    <CheckCircleIcon sx={{ fontSize: 20, color: "#0D9488", mt: 0.2, flexShrink: 0 }} />
                                    <Typography variant="caption" color="#475569" lineHeight={1.55} sx={{ fontSize: "0.84rem" }}>
                                        <b>Bảo mật thông tin:</b> Dữ liệu bệnh án điện tử và kết quả xét nghiệm được lưu trữ mã hóa an toàn theo tiêu chuẩn BYT.
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="flex-start" gap={1.2}>
                                    <CheckCircleIcon sx={{ fontSize: 20, color: "#0D9488", mt: 0.2, flexShrink: 0 }} />
                                    <Typography variant="caption" color="#475569" lineHeight={1.55} sx={{ fontSize: "0.84rem" }}>
                                        <b>Minh bạch viện phí:</b> Hóa đơn điện tử và bảng kê chi phí được xuất tức thì sau thanh toán qua cổng PayOS VietQR.
                                    </Typography>
                                </Box>
                            </Stack>
                        </Grid>

                        {/* CỘT PHẢI: QUY CHUẨN HOẠT ĐỘNG VÀ AN TOÀN Y TẾ */}
                        <Grid item xs={12} md={5}>
                            <Box
                                sx={{
                                    height: "100%",
                                    minHeight: { xs: 260, sm: 320 },
                                    borderRadius: "20px",
                                    p: { xs: 3, sm: 4 },
                                    background: `linear-gradient(135deg, ${designTokens.brand.primary} 0%, ${designTokens.brand.primaryDark} 100%)`,
                                    color: "#FFFFFF",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    boxShadow: "0 16px 40px rgba(15, 118, 110, 0.25)",
                                    border: `1px solid ${designTokens.brand.primaryHover}`
                                }}
                            >
                                <Box>
                                    <Chip
                                        label="THÔNG TIN BỆNH VIỆN"
                                        size="small"
                                        sx={{
                                            bgcolor: "rgba(255, 255, 255, 0.15)",
                                            color: "#FFFFFF",
                                            fontWeight: 800,
                                            fontSize: "0.72rem",
                                            mb: 2,
                                            backdropFilter: "blur(4px)"
                                        }}
                                    />
                                    <Typography variant="h5" fontWeight="900" sx={{ fontSize: { xs: "1.25rem", md: "1.45rem" }, mb: 1.5, color: "#FFFFFF" }}>
                                        Bệnh Viện Đa Khoa Quốc Tế TNT
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.88)", lineHeight: 1.6, fontSize: "0.85rem" }}>
                                        Cung cấp dịch vụ thăm khám và điều trị theo quy định chuyên môn, hỗ trợ người dân và gia đình với tinh thần trách nhiệm và chu đáo.
                                    </Typography>
                                </Box>

                                <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid rgba(255, 255, 255, 0.2)", display: "flex", alignItems: "center", gap: 1.5 }}>
                                    <LocalHospitalIcon sx={{ fontSize: 24, color: "#5EEAD4" }} />
                                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#F0FDFA" }}>
                                        Hỗ trợ tiếp đón và hướng dẫn người bệnh tại viện
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Container>

            {/* =========================================================================
                7. CTA CUỐI TRANG (Closing Banner Kêu Gọi Đặt Khám 24/7)
            ========================================================================= */}
            <Container maxWidth="xl" component="section" aria-label="Kêu gọi đặt khám" sx={{ mb: 4 }}>
                <Box
                    sx={{
                        background: "radial-gradient(ellipse 90% 70% at 50% 20%, #0F766E 0%, #042F2E 60%, #021E1E 100%)",
                        borderRadius: "28px",
                        p: { xs: 3.5, sm: 4.5, md: 5.5 },
                        color: "#FFFFFF",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 24px 50px rgba(4, 47, 46, 0.35)",
                        border: "1px solid rgba(255, 255, 255, 0.12)"
                    }}
                >
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <Box maxWidth={650}>
                                <Chip
                                    label="ĐẶT HẸN TIỆN LỢI 24/7"
                                    size="small"
                                    sx={{
                                        bgcolor: "rgba(255,255,255,0.16)",
                                        backdropFilter: "blur(8px)",
                                        color: "#FFFFFF",
                                        fontWeight: 800,
                                        mb: 2,
                                        fontSize: "0.75rem",
                                        border: "1px solid rgba(255,255,255,0.25)"
                                    }}
                                />
                                <Typography variant="h3" component="h3" fontWeight="900" sx={{ fontSize: { xs: "1.5rem", md: "2.1rem" }, mb: 1.2, color: "#FFFFFF !important" }}>
                                    Bạn Cần Thăm Khám Sức Khỏe Hôm Nay?
                                </Typography>
                                <Typography variant="body2" sx={{ color: "rgba(240, 253, 250, 0.92) !important", lineHeight: 1.65, fontSize: "0.95rem", mb: 3 }}>
                                    Hệ thống tiếp nhận đặt hẹn trực tuyến 24/7. Hãy đăng ký trước để được ưu tiên phục vụ, chủ động thời gian và nhận hỗ trợ tận tình từ đội ngũ y bác sĩ.
                                </Typography>

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ width: { xs: "100%", md: "auto" } }}>
                                    <Button
                                        component={Link}
                                        to="/booking"
                                        variant="contained"
                                        size="large"
                                        startIcon={<CalendarMonthIcon />}
                                        sx={{
                                            background: "#FFFFFF !important",
                                            bgcolor: "#FFFFFF !important",
                                            backgroundImage: "none !important",
                                            color: "#0D9488 !important",
                                            fontWeight: 800,
                                            px: 3.8,
                                            py: 1.3,
                                            borderRadius: "12px",
                                            fontSize: "0.95rem",
                                            boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
                                            "&:hover": {
                                                background: "#F0FDFA !important",
                                                bgcolor: "#F0FDFA !important",
                                                backgroundImage: "none !important",
                                                color: "#0F766E !important",
                                                transform: "translateY(-2px)"
                                            }
                                        }}
                                    >
                                        Đặt Lịch Khám Ngay
                                    </Button>

                                    <Button
                                        component={Link}
                                        to="/lookup"
                                        variant="outlined"
                                        size="large"
                                        startIcon={<SearchIcon />}
                                        sx={{
                                            borderColor: "rgba(255,255,255,0.5)",
                                            color: "#FFFFFF",
                                            fontWeight: 700,
                                            px: 3.2,
                                            py: 1.3,
                                            borderRadius: "12px",
                                            fontSize: "0.95rem",
                                            backdropFilter: "blur(6px)",
                                            "&:hover": {
                                                borderColor: "#FFFFFF",
                                                bgcolor: "rgba(255,255,255,0.12)",
                                                transform: "translateY(-2px)"
                                            }
                                        }}
                                    >
                                        Tra Cứu Hồ Sơ & Lịch Hẹn
                                    </Button>

                                    <Button
                                        component="a"
                                        href="tel:19008888"
                                        variant="text"
                                        size="large"
                                        startIcon={<PhoneInTalkIcon />}
                                        sx={{
                                            color: "#FDE047",
                                            fontWeight: 800,
                                            px: 2,
                                            fontSize: "0.95rem",
                                            "&:hover": {
                                                bgcolor: "rgba(255,255,255,0.08)"
                                            }
                                        }}
                                    >
                                        Hotline: 1900 8888
                                    </Button>
                                </Stack>
                            </Box>
                        </Grid>

                        {/* CỘT PHẢI: BIỂU TƯỢNG HỖ TRỢ Y TẾ 24/7 */}
                        <Grid item xs={12} md={4} sx={{ display: { xs: "none", md: "flex" }, justifyContent: "center", alignItems: "center" }}>
                            <Box
                                sx={{
                                    width: 140,
                                    height: 140,
                                    borderRadius: "50%",
                                    bgcolor: "rgba(255, 255, 255, 0.12)",
                                    border: "2px dashed rgba(255, 255, 255, 0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)"
                                }}
                            >
                                <LocalHospitalIcon sx={{ fontSize: 64, color: "#FFFFFF", opacity: 0.95 }} />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </Box>
    );
}
