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

import axiosInstance from "../../services/AxiosInstance";
import { formatISODate, formatDate } from "../../utils/formatters";
import designTokens from "../../theme/designTokens";
import { useAuth } from "../../context/AuthContext";

/**
 * Ánh xạ icon đại diện theo tên chuyên khoa
 */
const getDepartmentIcon = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("tim")) return <MonitorHeartIcon sx={{ fontSize: 26, color: "#EF4444" }} />;
    if (n.includes("nhi")) return <ChildCareIcon sx={{ fontSize: 26, color: "#008C69" }} />;
    if (n.includes("ngoại") || n.includes("chấn thương") || n.includes("xương")) return <HealingIcon sx={{ fontSize: 26, color: "#8B5CF6" }} />;
    if (n.includes("xét nghiệm") || n.includes("hình ảnh") || n.includes("lab")) return <ScienceIcon sx={{ fontSize: 26, color: "#0088D6" }} />;
    if (n.includes("thần kinh") || n.includes("tâm thần")) return <PsychologyIcon sx={{ fontSize: 26, color: "#F59E0B" }} />;
    if (n.includes("nhiễm") || n.includes("dịch")) return <CoronavirusIcon sx={{ fontSize: 26, color: "#EC4899" }} />;
    return <LocalHospitalIcon sx={{ fontSize: 26, color: "#0088D6" }} />;
};

/**
 * Chuẩn hóa nhãn học vị y khoa từ enum backend
 */
const formatDegree = (deg) => {
    switch (deg) {
        case "GS_TS": return "Giáo sư, Tiến sĩ";
        case "PGS_TS": return "Phó Giáo sư, Tiến sĩ";
        case "TS": return "Tiến sĩ Y khoa";
        case "THS": return "Thạc sĩ Y khoa";
        case "BSCKII": return "Bác sĩ CKII";
        case "BSCKI": return "Bác sĩ CKI";
        case "BS": return "Bác sĩ Đa khoa";
        default: return deg || "Bác sĩ Chuyên khoa";
    }
};

/**
 * Chuẩn hóa ca trực theo enum ScheduleSession
 */
const formatSession = (session) => {
    switch (session) {
        case "MORNING":
            return { label: "Ca Sáng (07:30 - 11:30)", color: designTokens.brand.primaryDark, bg: designTokens.brand.primaryLight };
        case "AFTERNOON":
            return { label: "Ca Chiều (13:00 - 17:00)", color: designTokens.secondary.main, bg: designTokens.secondary.light };
        case "EVENING":
            return { label: "Ca Tối (17:30 - 20:30)", color: "#7C3AED", bg: "#F3E8FF" };
        default:
            return { label: "Ca Trực Khám", color: designTokens.neutral.textSecondary, bg: designTokens.neutral.borderLight };
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

    // 4 Dịch vụ Cốt lõi & Lối tắt thực tế của dự án
    const CORE_SERVICES = [
        {
            title: "Đặt Lịch Khám Bệnh",
            desc: "Chọn chuyên khoa, bác sĩ và khung giờ hẹn trước trực tuyến",
            to: "/booking",
            icon: <EventAvailableIcon sx={{ fontSize: 28 }} />,
            color: designTokens.brand.primary,
            bgColor: designTokens.brand.primaryLight,
            badge: "Trực tuyến 24/7"
        },
        {
            title: "Tra Cứu Hồ Sơ & Lịch Hẹn",
            desc: "Tìm lại mã bệnh nhân, phiếu hẹn và sơ đồ khoa phòng",
            to: "/lookup",
            icon: <SearchIcon sx={{ fontSize: 28 }} />,
            color: "#6366F1",
            bgColor: "#EEF2FF",
            badge: "Tra cứu nhanh"
        },
        {
            title: "Xác Thực Đơn Thuốc",
            desc: "Kiểm tra đơn thuốc điện tử hợp lệ theo chuẩn Bộ Y Tế",
            to: "/verify-prescription",
            icon: <VerifiedUserIcon sx={{ fontSize: 28 }} />,
            color: designTokens.secondary.main,
            bgColor: designTokens.secondary.light,
            badge: "Chuẩn BYT"
        },
        {
            title: "Ví Viện Phí & Nạp Tiền",
            desc: "Thanh toán viện phí minh bạch qua Cổng PayOS (VietQR)",
            to: "/payment",
            icon: <AccountBalanceWalletIcon sx={{ fontSize: 28 }} />,
            color: designTokens.status.info.main,
            bgColor: designTokens.status.info.bg,
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
                bgcolor: designTokens.neutral.bg,
                minHeight: "100vh",
                // Chừa khoảng đệm chân trang để không bị PatientBottomNav che khuất trên điện thoại
                pb: { xs: 9, md: 5 }
            }}
        >
            {/* =========================================================================
                1. HERO SECTION: Giới thiệu bệnh viện, thông điệp uy tín, CTA & Tìm kiếm
            ========================================================================= */}
            <Box
                component="section"
                aria-label="Giới thiệu bệnh viện"
                sx={{
                    background: `linear-gradient(180deg, ${designTokens.brand.primary} 0%, #006FB3 55%, ${designTokens.brand.primaryDark} 100%)`,
                    color: "#FFFFFF",
                    pt: { xs: 4, sm: 5, md: 7 },
                    pb: { xs: 6, sm: 7, md: 9 },
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                <Container maxWidth="xl" sx={{ position: "relative", zIndex: 2 }}>
                    <Box textAlign="center" maxWidth={860} mx="auto" mb={3.5}>
                        <Chip
                            icon={<VerifiedIcon sx={{ color: "#FDE047 !important", fontSize: "16px !important" }} />}
                            label="HỆ THỐNG Y TẾ SỐ YOU MED TNT - BỆNH VIỆN ĐA KHOA QUỐC TẾ"
                            sx={{
                                bgcolor: "rgba(255,255,255,0.16)",
                                backdropFilter: "blur(8px)",
                                color: "#FFFFFF",
                                fontWeight: 800,
                                mb: 2,
                                px: 1,
                                fontSize: "0.78rem",
                                border: "1px solid rgba(255,255,255,0.3)"
                            }}
                        />

                        <Typography
                            variant="h1"
                            component="h1"
                            sx={{
                                fontSize: { xs: "1.85rem", sm: "2.4rem", md: "3.1rem" },
                                fontWeight: 900,
                                lineHeight: 1.25,
                                letterSpacing: "-0.02em",
                                mb: 1.5,
                                color: "#FFFFFF"
                            }}
                        >
                            Chăm Sóc Sức Khỏe Toàn Diện <br />
                            <Box component="span" sx={{ color: "#67E8F9" }}>
                                Đặt Khám Nhanh Chóng & Chu Đáo
                            </Box>
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                opacity: 0.95,
                                fontSize: { xs: "0.95rem", sm: "1.05rem", md: "1.1rem" },
                                lineHeight: 1.6,
                                maxWidth: 680,
                                mx: "auto",
                                color: "#F1F5F9"
                            }}
                        >
                            Chủ động chọn chuyên khoa, bác sĩ và khung giờ khám trước. Nhận phiếu số thứ tự điện tử, thủ tục tinh gọn và không lo xếp hàng chờ đợi.
                        </Typography>

                        {/* CTA HÀNG ĐẦU: Đặt lịch & Tra cứu */}
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            justifyContent="center"
                            alignItems="center"
                            mt={3}
                        >
                            <Button
                                component={Link}
                                to="/booking"
                                variant="contained"
                                size="large"
                                startIcon={<CalendarMonthIcon />}
                                sx={{
                                    bgcolor: "#FFFFFF",
                                    color: designTokens.brand.primaryDark,
                                    fontWeight: 800,
                                    fontSize: "1rem",
                                    px: 3.5,
                                    py: 1.3,
                                    borderRadius: 3,
                                    width: { xs: "100%", sm: "auto" },
                                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                                    "&:hover": {
                                        bgcolor: "#F8FAFC",
                                        boxShadow: "0 10px 28px rgba(0, 0, 0, 0.25)"
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
                                    borderColor: "rgba(255, 255, 255, 0.6)",
                                    color: "#FFFFFF",
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    px: 3,
                                    py: 1.3,
                                    borderRadius: 3,
                                    width: { xs: "100%", sm: "auto" },
                                    backdropFilter: "blur(4px)",
                                    "&:hover": {
                                        borderColor: "#FFFFFF",
                                        bgcolor: "rgba(255, 255, 255, 0.12)"
                                    }
                                }}
                            >
                                Tra Cứu Hồ Sơ & Sơ Đồ
                            </Button>
                        </Stack>
                    </Box>

                    {/* HỘP TÌM KIẾM THÔNG MINH */}
                    <Paper
                        elevation={4}
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: "18px",
                            maxWidth: 880,
                            mx: "auto",
                            bgcolor: "#FFFFFF",
                            boxShadow: "0 20px 40px -10px rgba(0, 45, 90, 0.35)",
                            border: "1px solid rgba(255,255,255,0.8)"
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
                                gap: 1,
                                bgcolor: "#F8FAFC",
                                borderRadius: "12px",
                                p: 0.8,
                                border: "1.5px solid #E2E8F0",
                                transition: "all 0.2s",
                                "&:focus-within": {
                                    borderColor: designTokens.brand.primary,
                                    bgcolor: "#FFFFFF",
                                    boxShadow: "0 0 0 3px rgba(0, 136, 214, 0.12)"
                                }
                            }}
                        >
                            <TextField
                                fullWidth
                                variant="standard"
                                placeholder="Nhập triệu chứng, bệnh lý hoặc chuyên khoa (VD: Tim mạch, Đau ngực, Khám Nhi...)"
                                value={heroSearchTerm}
                                onChange={(e) => setHeroSearchTerm(e.target.value)}
                                InputProps={{
                                    disableUnderline: true,
                                    startAdornment: (
                                        <InputAdornment position="start" sx={{ pl: 1, color: designTokens.brand.primary }}>
                                            <SearchIcon sx={{ fontSize: 24 }} />
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        fontSize: { xs: "0.9rem", md: "0.98rem" },
                                        fontWeight: 500,
                                        color: designTokens.neutral.textPrimary,
                                        px: 1,
                                        py: 0.5
                                    }
                                }}
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                size="large"
                                sx={{
                                    borderRadius: "10px",
                                    px: { xs: 2.5, md: 3.5 },
                                    py: { xs: 1.2, md: 1.2 },
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 14px rgba(0, 136, 214, 0.35)"
                                }}
                            >
                                Tìm Kiếm
                            </Button>
                        </Box>

                        {/* Các từ khóa triệu chứng phổ biến */}
                        <Box display="flex" alignItems="center" gap={1} mt={1.8} flexWrap="wrap">
                            <Typography variant="caption" sx={{ color: designTokens.neutral.textSecondary, fontWeight: 700 }}>
                                Gợi ý tìm nhanh:
                            </Typography>
                            {["Khám tổng quát", "Tim mạch", "Nhi khoa", "Cơ xương khớp", "Nội tiêu hóa", "Tai Mũi Họng", "Đau đầu", "Sốt cao"].map((tag, idx) => (
                                <Chip
                                    key={idx}
                                    label={tag}
                                    size="small"
                                    onClick={() => handleQuickTagClick(tag)}
                                    sx={{
                                        cursor: "pointer",
                                        bgcolor: "#F1F5F9",
                                        color: designTokens.neutral.textSecondary,
                                        fontWeight: 600,
                                        fontSize: "0.75rem",
                                        "&:hover": { bgcolor: designTokens.brand.primaryLight, color: designTokens.brand.primary }
                                    }}
                                />
                            ))}
                        </Box>
                    </Paper>

                    {/* 4 Cam kết minh bạch */}
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        gap={{ xs: 2, md: 4 }}
                        flexWrap="wrap"
                        mt={3.5}
                    >
                        <Box display="flex" alignItems="center" gap={0.8}>
                            <VerifiedIcon sx={{ color: "#34D399", fontSize: 18 }} />
                            <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.95, fontSize: "0.85rem" }}>
                                Bác sĩ chuyên khoa chuẩn chứng chỉ hành nghề
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.8}>
                            <VerifiedIcon sx={{ color: "#34D399", fontSize: 18 }} />
                            <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.95, fontSize: "0.85rem" }}>
                                Lấy số trực tuyến, không chờ đợi
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.8}>
                            <VerifiedIcon sx={{ color: "#34D399", fontSize: 18 }} />
                            <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.95, fontSize: "0.85rem" }}>
                                Bệnh án điện tử bảo mật chuẩn Bộ Y Tế
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.8}>
                            <VerifiedIcon sx={{ color: "#34D399", fontSize: 18 }} />
                            <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.95, fontSize: "0.85rem" }}>
                                Cổng thanh toán viện phí PayOS & VietQR
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* =========================================================================
                2. DỊCH VỤ CỐT LÕI (4 TIỆN ÍCH TRỌNG TÂM CỦA HỆ THỐNG)
            ========================================================================= */}
            <Container maxWidth="xl" sx={{ mt: { xs: -3, md: -4.5 }, position: "relative", zIndex: 10 }}>
                <Paper
                    elevation={2}
                    sx={{
                        p: { xs: 2, sm: 2.5, md: 3 },
                        borderRadius: "18px",
                        bgcolor: "#FFFFFF",
                        border: `1px solid ${designTokens.neutral.border}`
                    }}
                >
                    <Grid container spacing={2}>
                        {CORE_SERVICES.map((item, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <Box
                                    component={Link}
                                    to={item.to}
                                    sx={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 1.8,
                                        p: 2,
                                        borderRadius: "14px",
                                        textDecoration: "none",
                                        bgcolor: "#F8FAFC",
                                        border: "1px solid #EDF2F7",
                                        transition: "all 0.25s ease",
                                        height: "100%",
                                        minHeight: 96,
                                        "&:hover": {
                                            transform: "translateY(-3px)",
                                            boxShadow: "0 8px 22px -4px rgba(0, 136, 214, 0.16)",
                                            borderColor: item.color,
                                            bgcolor: "#FFFFFF"
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: "12px",
                                            bgcolor: item.bgColor,
                                            color: item.color,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0
                                        }}
                                    >
                                        {item.icon}
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.4}>
                                            <Typography variant="subtitle2" fontWeight="800" color={designTokens.neutral.textPrimary} sx={{ fontSize: "0.92rem" }}>
                                                {item.title}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color={designTokens.neutral.textSecondary} sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
                                            {item.desc}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            </Container>

            {/* =========================================================================
                3. CHUYÊN KHOA NỔI BẬT (DỮ LIỆU THẬT TỪ /api/departments)
            ========================================================================= */}
            <Container maxWidth="xl" component="section" aria-label="Chuyên khoa nổi bật" sx={{ py: { xs: 5, md: 7 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3} flexWrap="wrap" gap={2}>
                    <Box maxWidth={720}>
                        <Chip
                            label="CHUYÊN KHOA TRỌNG ĐIỂM"
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 800, mb: 0.8 }}
                        />
                        <Typography
                            variant="h2"
                            component="h2"
                            fontWeight="900"
                            color={designTokens.neutral.textPrimary}
                            sx={{ fontSize: { xs: "1.45rem", md: "1.9rem" }, letterSpacing: "-0.01em" }}
                        >
                            Hệ Thống Chuyên Khoa Thăm Khám & Điều Trị
                        </Typography>
                        <Typography variant="body2" color={designTokens.neutral.textSecondary}>
                            Trang thiết bị chẩn đoán hình ảnh, phòng khám chuyên sâu và phác đồ điều trị chuẩn Bộ Y Tế.
                        </Typography>
                    </Box>

                    <Button
                        component={Link}
                        to="/booking"
                        endIcon={<ArrowForwardIcon />}
                        sx={{ fontWeight: 700, color: designTokens.brand.primary, whiteSpace: "nowrap" }}
                    >
                        Tất cả chuyên khoa ({departments.length})
                    </Button>
                </Box>

                {/* Bộ lọc chuyên khoa tại chỗ */}
                <Box mb={3} maxWidth={400}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Lọc chuyên khoa (VD: Tim mạch, Nhi...)"
                        value={deptFilterTerm}
                        onChange={(e) => setDeptFilterTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" sx={{ color: designTokens.neutral.textMuted }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: "10px", bgcolor: "#FFFFFF" }
                        }}
                    />
                </Box>

                {/* TRẠNG THÁI LOADING CHUYÊN KHOA */}
                {loadingDepts && (
                    <Grid container spacing={2.5}>
                        {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <Grid item xs={12} sm={6} md={4} key={idx}>
                                <Card sx={{ p: 2.5, borderRadius: "14px" }}>
                                    <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                                        <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: "10px" }} />
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Skeleton variant="text" width="60%" height={24} />
                                            <Skeleton variant="text" width="40%" height={16} />
                                        </Box>
                                    </Box>
                                    <Skeleton variant="text" width="100%" height={20} />
                                    <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
                                    <Skeleton variant="rounded" width="100%" height={36} sx={{ borderRadius: "8px" }} />
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
                        sx={{ borderRadius: "12px", mb: 2 }}
                    >
                        {deptError}
                    </Alert>
                )}

                {/* TRẠNG THÁI EMPTY STATE CHUYÊN KHOA */}
                {!loadingDepts && !deptError && filteredDepartments.length === 0 && (
                    <Paper
                        sx={{
                            p: 4,
                            textAlign: "center",
                            borderRadius: "14px",
                            bgcolor: "#FFFFFF",
                            border: `1px dashed ${designTokens.neutral.border}`
                        }}
                    >
                        <InfoOutlinedIcon sx={{ fontSize: 40, color: designTokens.neutral.textMuted, mb: 1 }} />
                        <Typography variant="subtitle1" fontWeight="700" color={designTokens.neutral.textPrimary}>
                            Không tìm thấy chuyên khoa phù hợp
                        </Typography>
                        <Typography variant="body2" color={designTokens.neutral.textSecondary} mb={2}>
                            Vui lòng thử tìm với từ khóa khác hoặc bấm nút bên dưới để xóa lọc.
                        </Typography>
                        <Button variant="outlined" size="small" onClick={() => setDeptFilterTerm("")}>
                            Xóa bộ lọc
                        </Button>
                    </Paper>
                )}

                {/* DANH SÁCH CHUYÊN KHOA THỰC TẾ */}
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
                                            p: 2.5,
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            borderRadius: "14px",
                                            bgcolor: "#FFFFFF",
                                            border: `1px solid ${designTokens.neutral.border}`,
                                            transition: "all 0.25s ease",
                                            "&:hover": {
                                                transform: "translateY(-3px)",
                                                borderColor: designTokens.brand.primary,
                                                boxShadow: "0 10px 24px rgba(0, 136, 214, 0.12)"
                                            }
                                        }}
                                    >
                                        <Box>
                                            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                                <Box
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: "10px",
                                                        bgcolor: "#F8FAFC",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        border: `1px solid ${designTokens.neutral.border}`
                                                    }}
                                                >
                                                    {icon}
                                                </Box>
                                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                    <Typography
                                                        variant="subtitle1"
                                                        fontWeight="800"
                                                        color={designTokens.neutral.textPrimary}
                                                        noWrap
                                                        title={dept.departmentName}
                                                    >
                                                        {dept.departmentName}
                                                    </Typography>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Chip
                                                            icon={<MeetingRoomIcon sx={{ fontSize: "14px !important" }} />}
                                                            label={totalRooms > 0 ? `${totalRooms} phòng khám` : "Đang cập nhật phòng"}
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: "0.68rem",
                                                                fontWeight: 600,
                                                                bgcolor: designTokens.brand.primaryLight,
                                                                color: designTokens.brand.primaryDark
                                                            }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </Box>

                                            <Typography
                                                variant="body2"
                                                color={designTokens.neutral.textSecondary}
                                                sx={{
                                                    mb: 2,
                                                    minHeight: 42,
                                                    lineHeight: 1.5,
                                                    fontSize: "0.85rem",
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
                                                color="primary"
                                                fullWidth
                                                size="medium"
                                                sx={{
                                                    borderRadius: "9px",
                                                    fontWeight: 700,
                                                    py: 0.9,
                                                    fontSize: "0.85rem"
                                                }}
                                            >
                                                Đặt Khám Khoa Này
                                            </Button>

                                            <Tooltip title="Xem lịch trực hôm nay của khoa">
                                                <Button
                                                    variant="outlined"
                                                    color="primary"
                                                    size="medium"
                                                    onClick={() => {
                                                        setSelectedDeptId(dept.departmentId);
                                                        const el = document.getElementById("doctor-schedule-section");
                                                        if (el) el.scrollIntoView({ behavior: "smooth" });
                                                    }}
                                                    sx={{
                                                        minWidth: 44,
                                                        px: 1.5,
                                                        borderRadius: "9px"
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
                4. ĐỘI NGŨ BÁC SĨ & LỊCH TRỰC HÔM NAY (DỮ LIỆU THẬT TỪ /api/schedules/by-department)
            ========================================================================= */}
            <Box
                id="doctor-schedule-section"
                component="section"
                aria-label="Lịch trực bác sĩ hôm nay"
                sx={{
                    bgcolor: "#FFFFFF",
                    py: { xs: 5, md: 7 },
                    borderTop: `1px solid ${designTokens.neutral.border}`,
                    borderBottom: `1px solid ${designTokens.neutral.border}`
                }}
            >
                <Container maxWidth="xl">
                    <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3} flexWrap="wrap" gap={2}>
                        <Box maxWidth={720}>
                            <Chip
                                label="LỊCH CÔNG TÁC CÔNG KHAI"
                                color="secondary"
                                size="small"
                                sx={{ fontWeight: 800, mb: 0.8 }}
                            />
                            <Typography
                                variant="h2"
                                component="h2"
                                fontWeight="900"
                                color={designTokens.neutral.textPrimary}
                                sx={{ fontSize: { xs: "1.45rem", md: "1.9rem" }, letterSpacing: "-0.01em" }}
                            >
                                Bác Sĩ & Ca Trực Thực Tế Hôm Nay ({todayFormatted})
                            </Typography>
                            <Typography variant="body2" color={designTokens.neutral.textSecondary}>
                                Lịch trực và ca tiếp nhận bệnh nhân thực tế được điều phối bởi hệ thống bệnh viện.
                            </Typography>
                        </Box>

                        <Button
                            component={Link}
                            to="/booking"
                            endIcon={<ArrowForwardIcon />}
                            sx={{ fontWeight: 700, color: designTokens.brand.primary, whiteSpace: "nowrap" }}
                        >
                            Xem lịch các ngày tiếp theo
                        </Button>
                    </Box>

                    {/* Bộ chọn Chuyên khoa để xem lịch trực */}
                    <Box mb={3} sx={{ overflowX: "auto", pb: 1 }}>
                        <Typography variant="caption" fontWeight="bold" color={designTokens.neutral.textMuted} sx={{ mb: 1, display: "block" }}>
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
                                        variant={isSelected ? "filled" : "outlined"}
                                        color={isSelected ? "primary" : "default"}
                                        sx={{
                                            fontWeight: isSelected ? 800 : 600,
                                            borderRadius: "8px",
                                            px: 0.5,
                                            py: 2,
                                            fontSize: "0.82rem",
                                            borderColor: isSelected ? designTokens.brand.primary : designTokens.neutral.border,
                                            bgcolor: isSelected ? designTokens.brand.primary : "#FFFFFF",
                                            color: isSelected ? "#FFFFFF" : designTokens.neutral.textPrimary,
                                            "&:hover": {
                                                bgcolor: isSelected ? designTokens.brand.primaryHover : designTokens.neutral.hoverBg
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
                                    <Card sx={{ p: 2.5, borderRadius: "14px" }}>
                                        <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                                            <Skeleton variant="circular" width={68} height={68} sx={{ mb: 1.5 }} />
                                            <Skeleton variant="text" width="70%" height={24} />
                                            <Skeleton variant="text" width="50%" height={18} />
                                        </Box>
                                        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: "8px", mb: 1 }} />
                                        <Skeleton variant="rectangular" height={36} sx={{ borderRadius: "8px" }} />
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
                                p: 4,
                                textAlign: "center",
                                borderRadius: "14px",
                                bgcolor: "#F8FAFC",
                                border: `1.5px dashed ${designTokens.neutral.border}`
                            }}
                        >
                            <CalendarMonthIcon sx={{ fontSize: 44, color: designTokens.neutral.textMuted, mb: 1 }} />
                            <Typography variant="subtitle1" fontWeight="800" color={designTokens.neutral.textPrimary} gutterBottom>
                                Chưa có ca trực công khai hôm nay tại khoa {currentSelectedDept?.departmentName || ""}
                            </Typography>
                            <Typography variant="body2" color={designTokens.neutral.textSecondary} sx={{ maxWidth: 560, mx: "auto", mb: 2.5 }}>
                                Chuyên khoa hiện chưa có lịch phân công trực tiếp nhận hôm nay, hoặc các ca trực đã hoàn tất. Quý bệnh nhân vui lòng kiểm tra lịch khám các ngày tiếp theo trong tuần.
                            </Typography>
                            <Button
                                component={Link}
                                to={selectedDeptId ? `/booking?departmentId=${selectedDeptId}` : "/booking"}
                                variant="contained"
                                color="primary"
                                startIcon={<CalendarMonthIcon />}
                                sx={{ fontWeight: 700, borderRadius: "10px", px: 3 }}
                            >
                                Xem Lịch Khám Các Ngày Tới
                            </Button>
                        </Paper>
                    )}

                    {/* DANH SÁCH BÁC SĨ & CA TRỰC THỰC TẾ TRONG NGÀY */}
                    {!loadingSchedules && !scheduleError && schedules.length > 0 && (
                        <Grid container spacing={2.5}>
                            {schedules.map((sch) => {
                                const sessionInfo = formatSession(sch.session);
                                const availableSlots = sch.timeSlots ? sch.timeSlots.filter(s => !s.isFull).length : 0;
                                const totalSlots = sch.timeSlots ? sch.timeSlots.length : 0;
                                const doctorInitial = sch.doctorName ? sch.doctorName.charAt(0).toUpperCase() : "B";

                                return (
                                    <Grid item xs={12} sm={6} md={3} key={sch.scheduleId}>
                                        <Card
                                            elevation={0}
                                            sx={{
                                                borderRadius: "14px",
                                                p: 2.5,
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "space-between",
                                                textAlign: "center",
                                                border: `1px solid ${designTokens.neutral.border}`,
                                                transition: "all 0.25s ease",
                                                "&:hover": {
                                                    transform: "translateY(-4px)",
                                                    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                                                    borderColor: designTokens.brand.primary
                                                }
                                            }}
                                        >
                                            <Box>
                                                <Box position="relative" display="inline-block" mx="auto" mb={1.5}>
                                                    <Avatar
                                                        sx={{
                                                            width: 72,
                                                            height: 72,
                                                            bgcolor: designTokens.brand.primary,
                                                            fontSize: "1.5rem",
                                                            fontWeight: 900,
                                                            boxShadow: "0 4px 12px rgba(0, 136, 214, 0.25)"
                                                        }}
                                                    >
                                                        {doctorInitial}
                                                    </Avatar>
                                                    <Box
                                                        sx={{
                                                            position: "absolute",
                                                            bottom: -2,
                                                            right: -2,
                                                            bgcolor: "#FFFFFF",
                                                            borderRadius: "50%",
                                                            display: "flex",
                                                            p: "2px"
                                                        }}
                                                    >
                                                        <VerifiedIcon sx={{ color: designTokens.secondary.main, fontSize: 18 }} />
                                                    </Box>
                                                </Box>

                                                <Chip
                                                    label={formatDegree(sch.degree)}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: designTokens.brand.primaryLight,
                                                        color: designTokens.brand.primaryDark,
                                                        fontWeight: 800,
                                                        fontSize: "0.72rem",
                                                        mb: 1
                                                    }}
                                                />

                                                <Typography variant="subtitle1" fontWeight="900" color={designTokens.neutral.textPrimary} gutterBottom>
                                                    {sch.doctorName || "Bác sĩ phụ trách"}
                                                </Typography>

                                                <Typography variant="caption" color={designTokens.brand.primary} fontWeight="700" display="block" sx={{ mb: 0.5 }}>
                                                    {sch.departmentName}
                                                </Typography>

                                                {sch.roomName && (
                                                    <Typography variant="caption" color={designTokens.neutral.textMuted} display="block" mb={1.5}>
                                                        Phòng: <b>{sch.roomName}</b>
                                                    </Typography>
                                                )}

                                                <Divider sx={{ my: 1 }} />

                                                {/* Khung ca trực */}
                                                <Box
                                                    sx={{
                                                        bgcolor: sessionInfo.bg,
                                                        color: sessionInfo.color,
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
                                                    <Typography variant="caption" color={availableSlots > 0 ? designTokens.status.success.main : designTokens.status.danger.main} fontWeight="700" display="block" mb={1.5}>
                                                        {availableSlots > 0 ? `Còn ${availableSlots}/${totalSlots} khung giờ khám` : "Đã kín lịch ca này"}
                                                    </Typography>
                                                )}
                                            </Box>

                                            <Button
                                                component={Link}
                                                to={`/booking?departmentId=${sch.departmentId || selectedDeptId}`}
                                                variant="contained"
                                                color="primary"
                                                fullWidth
                                                size="medium"
                                                sx={{
                                                    borderRadius: "8px",
                                                    fontWeight: 700,
                                                    py: 0.8,
                                                    fontSize: "0.85rem"
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

                    <Box mt={3} p={2} sx={{ bgcolor: "#F8FAFC", borderRadius: "10px", border: `1px solid ${designTokens.neutral.border}` }}>
                        <Typography variant="caption" color={designTokens.neutral.textMuted} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: designTokens.brand.primary }} />
                            <span>
                                <b>Minh bạch thông tin:</b> Danh bạ bác sĩ tổng quát và lịch làm việc được đồng bộ từ phân hệ quản lý nhân sự y tế. Mọi lịch hẹn đặt trực tuyến sẽ được cấp mã số thứ tự điện tử chính thức.
                            </span>
                        </Typography>
                    </Box>
                </Container>
            </Box>

            {/* =========================================================================
                5. QUY TRÌNH 4 BƯỚC ĐẶT KHÁM THỰC TẾ
            ========================================================================= */}
            <Box component="section" aria-label="Quy trình khám bệnh" sx={{ bgcolor: "#EBF6FE", py: { xs: 5, md: 7 } }}>
                <Container maxWidth="xl">
                    <Box textAlign="center" maxWidth={720} mx="auto" mb={4}>
                        <Chip label="TIỆN LỢI & NHANH CHÓNG" color="primary" size="small" sx={{ fontWeight: 800, mb: 0.8 }} />
                        <Typography
                            variant="h2"
                            component="h2"
                            fontWeight="900"
                            color="#004D8C"
                            sx={{ fontSize: { xs: "1.45rem", md: "1.9rem" } }}
                        >
                            Quy Trình Khám Chữa Bệnh 4 Bước Đơn Giản
                        </Typography>
                        <Typography variant="body2" color="#475569">
                            Chỉ với vài thao tác trực tuyến, bạn đã có ngay phiếu khám ưu tiên và khung giờ mong muốn
                        </Typography>
                    </Box>

                    <Grid container spacing={2.5}>
                        {[
                            {
                                step: "01",
                                title: "Đặt Lịch & Chọn Khung Giờ",
                                desc: "Lựa chọn chuyên khoa, bác sĩ và khung giờ khám trực tuyến phù hợp qua website hoặc ứng dụng.",
                                icon: <EventAvailableIcon sx={{ fontSize: 28, color: designTokens.brand.primary }} />
                            },
                            {
                                step: "02",
                                title: "Check-in Kiosk & Lấy Số Thứ Tự",
                                desc: "Đến viện đúng giờ, quét mã đặt khám tại cây Kiosk hoặc quầy tiếp đón để nhận STT ưu tiên.",
                                icon: <HowToRegIcon sx={{ fontSize: 28, color: designTokens.secondary.main }} />
                            },
                            {
                                step: "03",
                                title: "Khám Chuyên Khoa & Cận Lâm Sàng",
                                desc: "Bác sĩ chuyên khoa thăm khám lâm sàng, thực hiện xét nghiệm hoặc chẩn đoán hình ảnh nếu cần.",
                                icon: <MedicalServicesIcon sx={{ fontSize: 28, color: designTokens.status.warning.main }} />
                            },
                            {
                                step: "04",
                                title: "Thanh Toán PayOS & Sổ Khám Số",
                                desc: "Thanh toán viện phí không tiền mặt qua PayOS (VietQR) và theo dõi kết quả, toa thuốc trên điện thoại.",
                                icon: <AssignmentTurnedInIcon sx={{ fontSize: 28, color: "#8B5CF6" }} />
                            }
                        ].map((s, idx) => (
                            <Grid item xs={12} sm={6} md={3} key={idx}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        borderRadius: "14px",
                                        height: "100%",
                                        bgcolor: "#FFFFFF",
                                        position: "relative",
                                        border: "1px solid #D0E3F5",
                                        transition: "all 0.25s ease",
                                        "&:hover": {
                                            transform: "translateY(-3px)",
                                            boxShadow: "0 8px 20px rgba(0, 136, 214, 0.12)"
                                        }
                                    }}
                                >
                                    <Typography
                                        variant="h3"
                                        component="span"
                                        fontWeight="900"
                                        sx={{
                                            position: "absolute",
                                            top: 14,
                                            right: 16,
                                            color: "#E2E8F0",
                                            userSelect: "none"
                                        }}
                                    >
                                        {s.step}
                                    </Typography>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: "10px",
                                            bgcolor: "#F8FAFC",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            mb: 2,
                                            border: "1px solid #E2E8F0"
                                        }}
                                    >
                                        {s.icon}
                                    </Box>
                                    <Typography variant="subtitle1" fontWeight="800" color={designTokens.neutral.textPrimary} gutterBottom>
                                        {s.title}
                                    </Typography>
                                    <Typography variant="body2" color={designTokens.neutral.textSecondary} sx={{ lineHeight: 1.5, fontSize: "0.85rem" }}>
                                        {s.desc}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    <Box textAlign="center" mt={4}>
                        <Button
                            component={Link}
                            to="/booking"
                            variant="contained"
                            color="primary"
                            size="large"
                            startIcon={<CalendarMonthIcon />}
                            sx={{
                                fontWeight: 800,
                                px: 4,
                                py: 1.2,
                                borderRadius: "10px",
                                boxShadow: "0 4px 16px rgba(0, 136, 214, 0.3)"
                            }}
                        >
                            Bắt Đầu Đặt Lịch Khám Ngay
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* =========================================================================
                6. THÔNG TIN TẠO NIỀM TIN & PHÁP LÝ Y TẾ
            ========================================================================= */}
            <Container maxWidth="xl" component="section" aria-label="Thông tin uy tín bệnh viện" sx={{ py: { xs: 5, md: 6 } }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, md: 4 },
                        borderRadius: "18px",
                        bgcolor: "#FFFFFF",
                        border: `1px solid ${designTokens.neutral.border}`
                    }}
                >
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={7}>
                            <Box display="flex" alignItems="center" gap={1.2} mb={1}>
                                <ShieldIcon sx={{ color: designTokens.secondary.main, fontSize: 24 }} />
                                <Typography variant="subtitle2" fontWeight="800" color={designTokens.secondary.main}>
                                    TIÊU CHUẨN Y KHOA ĐÃ XÁC MINH
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="h3" fontWeight="900" color={designTokens.neutral.textPrimary} gutterBottom sx={{ fontSize: { xs: "1.3rem", md: "1.6rem" } }}>
                                Bệnh Viện Đa Khoa Quốc Tế YouMed TNT
                            </Typography>
                            <Typography variant="body2" color={designTokens.neutral.textSecondary} sx={{ lineHeight: 1.6, mb: 2 }}>
                                Hoạt động dưới sự quản lý chuyên môn của Bộ Y Tế, cung cấp dịch vụ thăm khám và điều trị chất lượng cao, ứng dụng công nghệ y tế số nhằm mang lại trải nghiệm khám chữa bệnh chu đáo, minh bạch cho mọi người dân.
                            </Typography>

                            <Stack spacing={1.2} fontSize="0.875rem">
                                <Box display="flex" alignItems="flex-start" gap={1}>
                                    <VerifiedIcon sx={{ fontSize: 18, color: designTokens.brand.primary, mt: 0.2 }} />
                                    <Typography variant="body2" color={designTokens.neutral.textPrimary}>
                                        <b>Giấy phép hoạt động KCB:</b> Số 188/BYT-GPHĐ cấp bởi Bộ Y Tế.
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="flex-start" gap={1}>
                                    <LocationOnIcon sx={{ fontSize: 18, color: designTokens.brand.primary, mt: 0.2 }} />
                                    <Typography variant="body2" color={designTokens.neutral.textPrimary}>
                                        <b>Địa chỉ bệnh viện:</b> 141 Chiến Thắng, Tân Triều, Thanh Trì, Hà Nội.
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="flex-start" gap={1}>
                                    <PhoneInTalkIcon sx={{ fontSize: 18, color: designTokens.status.danger.main, mt: 0.2 }} />
                                    <Typography variant="body2" color={designTokens.neutral.textPrimary}>
                                        <b>Hotline tư vấn & Cấp cứu 24/7:</b> 1900 8888 & (024) 3888 9999.
                                    </Typography>
                                </Box>
                            </Stack>
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <Box
                                sx={{
                                    bgcolor: "#F8FAFC",
                                    borderRadius: "14px",
                                    p: 2.5,
                                    border: `1px solid ${designTokens.neutral.border}`
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight="800" color={designTokens.neutral.textPrimary} gutterBottom>
                                    Cam Kết Bảo Vệ Quyền Lợi Người Bệnh
                                </Typography>
                                <Stack spacing={1.2} mt={1.5}>
                                    <Box display="flex" alignItems="flex-start" gap={1}>
                                        <CheckCircleIcon sx={{ fontSize: 18, color: designTokens.secondary.main, mt: 0.2 }} />
                                        <Typography variant="caption" color={designTokens.neutral.textSecondary} lineHeight={1.5}>
                                            <b>Bảo mật thông tin:</b> Dữ liệu bệnh án điện tử và kết quả xét nghiệm được lưu trữ mã hóa tuyệt đối.
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="flex-start" gap={1}>
                                        <CheckCircleIcon sx={{ fontSize: 18, color: designTokens.secondary.main, mt: 0.2 }} />
                                        <Typography variant="caption" color={designTokens.neutral.textSecondary} lineHeight={1.5}>
                                            <b>Minh bạch viện phí:</b> Phiếu thu và hóa đơn điện tử được xuất tức thì sau thanh toán qua cổng PayOS.
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="flex-start" gap={1}>
                                        <CheckCircleIcon sx={{ fontSize: 18, color: designTokens.secondary.main, mt: 0.2 }} />
                                        <Typography variant="caption" color={designTokens.neutral.textSecondary} lineHeight={1.5}>
                                            <b>Hỗ trợ đa kênh:</b> Tiếp nhận thông tin bệnh nhân qua Kiosk tự phục vụ, quầy điều dưỡng và hỗ trợ trực tuyến.
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Container>

            {/* =========================================================================
                7. CTA CUỐI TRANG (CLOSING CALL-TO-ACTION BANNER)
            ========================================================================= */}
            <Container maxWidth="xl" component="section" aria-label="Kêu gọi đặt khám" sx={{ mt: 1, mb: 4 }}>
                <Box
                    sx={{
                        background: `linear-gradient(135deg, ${designTokens.brand.primaryDark} 0%, ${designTokens.brand.primary} 100%)`,
                        borderRadius: "20px",
                        p: { xs: 3.5, sm: 4, md: 5 },
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 3,
                        boxShadow: "0 12px 32px rgba(0, 77, 140, 0.2)"
                    }}
                >
                    <Box maxWidth={650}>
                        <Chip
                            label="ĐẶT HẸN TIỆN LỢI"
                            size="small"
                            sx={{
                                bgcolor: "rgba(255,255,255,0.2)",
                                color: "#FFFFFF",
                                fontWeight: 800,
                                mb: 1.5,
                                fontSize: "0.75rem"
                            }}
                        />
                        <Typography variant="h3" component="h3" fontWeight="900" sx={{ fontSize: { xs: "1.4rem", md: "1.85rem" }, mb: 1 }}>
                            Bạn Cần Thăm Khám Sức Khỏe Hôm Nay?
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.6, fontSize: "0.95rem" }}>
                            Hệ thống tiếp nhận đặt hẹn trực tuyến 24/7. Hãy đăng ký trước để được ưu tiên phục vụ, chủ động thời gian và nhận hỗ trợ tận tình từ đội ngũ y bác sĩ.
                        </Typography>
                    </Box>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: { xs: "100%", md: "auto" } }}>
                        <Button
                            component={Link}
                            to="/booking"
                            variant="contained"
                            size="large"
                            startIcon={<CalendarMonthIcon />}
                            sx={{
                                bgcolor: "#FFFFFF",
                                color: designTokens.brand.primaryDark,
                                fontWeight: 800,
                                px: 3.5,
                                py: 1.2,
                                borderRadius: "10px",
                                fontSize: "0.95rem",
                                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                                "&:hover": {
                                    bgcolor: "#F8FAFC"
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
                                borderColor: "rgba(255,255,255,0.6)",
                                color: "#FFFFFF",
                                fontWeight: 700,
                                px: 3,
                                py: 1.2,
                                borderRadius: "10px",
                                fontSize: "0.95rem",
                                "&:hover": {
                                    borderColor: "#FFFFFF",
                                    bgcolor: "rgba(255,255,255,0.12)"
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
            </Container>
        </Box>
    );
}
