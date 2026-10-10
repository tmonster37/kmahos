import React, { useEffect, useState } from "react";
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
    Rating
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChatIcon from "@mui/icons-material/Chat";
import ScienceIcon from "@mui/icons-material/Science";
import MedicationIcon from "@mui/icons-material/Medication";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleIcon from "@mui/icons-material/People";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import HealingIcon from "@mui/icons-material/Healing";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import PsychologyIcon from "@mui/icons-material/Psychology";
import CoronavirusIcon from "@mui/icons-material/Coronavirus";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

export default function HomePage() {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        axiosInstance.get("/api/departments").then((res) => {
            const list = (res && res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setDepartments(list);
        }).catch(() => {});
    }, []);

    const handleQuickSearch = (e) => {
        if (e) e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/booking?symptoms=${encodeURIComponent(searchTerm.trim())}`);
        } else {
            navigate("/booking");
        }
    };

    const handleTagClick = (tag) => {
        navigate(`/booking?symptoms=${encodeURIComponent(tag)}`);
    };

    // 8 Dịch vụ Cốt lõi & Đầy đủ Tính năng Thực tế cho Người Bệnh
    const CORE_SERVICES = [
        {
            title: "Đặt Lịch Khám Bác Sĩ",
            subtitle: "Chọn bác sĩ chuyên khoa giỏi & khung giờ khám",
            to: "/booking",
            icon: <MedicalServicesIcon sx={{ fontSize: 28 }} />,
            color: "#0088D6",
            bgColor: "#EBF6FE",
            badge: "Trực tuyến"
        },
        {
            title: "Hồ Sơ Bệnh Nhân",
            subtitle: "Quản lý hồ sơ y tế cá nhân và người thân",
            to: "/profiles",
            icon: <PeopleIcon sx={{ fontSize: 28 }} />,
            color: "#8B5CF6",
            bgColor: "#F3E8FF",
            badge: "Gia đình"
        },
        {
            title: "Ví Y Tế & Nạp Tiền",
            subtitle: "Nạp tiền ví bệnh nhân & thanh toán VNPay-QR",
            to: "/payment",
            icon: <AccountBalanceWalletIcon sx={{ fontSize: 28 }} />,
            color: "#0284C7",
            bgColor: "#EFF6FF",
            badge: "VNPay-QR"
        },
        {
            title: "Sổ Khám & Bệnh Án",
            subtitle: "Xem toa thuốc, kết quả xét nghiệm và chẩn đoán",
            to: "/my-history",
            icon: <AssignmentTurnedInIcon sx={{ fontSize: 28 }} />,
            color: "#10B981",
            bgColor: "#D1FAE5",
            badge: "Bệnh án điện tử"
        },
        {
            title: "Hóa Đơn & Viện Phí",
            subtitle: "Tra cứu phiếu thu và lịch sử đóng viện phí",
            to: "/my-bills",
            icon: <ReceiptLongIcon sx={{ fontSize: 28 }} />,
            color: "#F59E0B",
            bgColor: "#FEF3C7",
            badge: "Minh bạch"
        },
        {
            title: "Nhắc Lịch Uống Thuốc",
            subtitle: "Hẹn giờ và nhận thông báo cữ thuốc mỗi ngày",
            to: "/reminders",
            icon: <MedicationIcon sx={{ fontSize: 28 }} />,
            color: "#EC4899",
            bgColor: "#FCE7F3",
            badge: "Tự động"
        },
        {
            title: "Tư Vấn Trực Tuyến & AI",
            subtitle: "Trò chuyện trực tiếp cùng Bác sĩ và Trợ lý AI",
            to: "/chat",
            icon: <ChatIcon sx={{ fontSize: 28 }} />,
            color: "#06B6D4",
            bgColor: "#ECFEFF",
            badge: "Hỗ trợ 24/7"
        },
        {
            title: "Tra Cứu Mã Hồ Sơ",
            subtitle: "Tìm lại hồ sơ khám bằng SĐT hoặc CCCD",
            to: "/lookup",
            icon: <SearchIcon sx={{ fontSize: 28 }} />,
            color: "#6366F1",
            bgColor: "#EEF2FF",
            badge: "Tra cứu nhanh"
        }
    ];

    // Đội ngũ Bác sĩ Chuyên khoa Tiêu biểu
    const FEATURED_DOCTORS = [
        {
            name: "BS. CKI Trần Đình Trọng",
            degree: "BSCKI - Trưởng Khoa Can Thiệp",
            dept: "Khoa Tim Mạch Can Thiệp",
            hospital: "Bệnh viện Đa khoa Quốc tế TNT",
            exp: "15 năm kinh nghiệm",
            rating: 4.9,
            reviewsCount: "1,250",
            fee: 250000,
            avatar: "T",
            avatarColor: "#0088D6"
        },
        {
            name: "ThS. BS Nguyễn Minh Anh",
            degree: "Thạc sĩ Y Khoa - Nhi Khoa",
            dept: "Khoa Nhi & Sơ Sinh",
            hospital: "Bệnh viện Đa khoa Quốc tế TNT",
            exp: "12 năm kinh nghiệm",
            rating: 5.0,
            reviewsCount: "980",
            fee: 200000,
            avatar: "M",
            avatarColor: "#00C292"
        },
        {
            name: "BS. CKI Hoàng Thị Thu Trang",
            degree: "BSCKI - Chuyên Gia Tiêu Hóa",
            dept: "Khoa Nội Tiêu Hóa & Gan Mật",
            hospital: "Bệnh viện Đa khoa Quốc tế TNT",
            exp: "10 năm kinh nghiệm",
            rating: 4.8,
            reviewsCount: "840",
            fee: 200000,
            avatar: "T",
            avatarColor: "#F59E0B"
        },
        {
            name: "PGS. TS Vũ Mạnh Cường",
            degree: "Phó Giáo Sư - Tiến Sĩ Ngoại Khoa",
            dept: "Khoa Ngoại Tổng Quát & Cột Sống",
            hospital: "Bệnh viện Đa khoa Quốc tế TNT",
            exp: "22 năm kinh nghiệm",
            rating: 5.0,
            reviewsCount: "2,100",
            fee: 350000,
            avatar: "C",
            avatarColor: "#8B5CF6"
        }
    ];

    // Gói khám Sức khỏe Toàn diện
    const HEALTH_PACKAGES = [
        {
            title: "Gói Khám Sức Khỏe Tổng Quát Cơ Bản",
            desc: "Đánh giá chức năng gan, thận, tim mạch, đường huyết và tầm soát sớm các bệnh lý phổ biến.",
            items: ["Khám lâm sàng đa khoa", "Xét nghiệm máu & nước tiểu 18 chỉ số", "Điện tâm đồ (ECG)", "Siêu âm ổ bụng tổng quát"],
            oldPrice: 1500000,
            price: 1190000,
            tag: "Tiết kiệm 20%",
            color: "#0088D6"
        },
        {
            title: "Gói Tầm Soát Tim Mạch & Đột Quỵ",
            desc: "Chuyên sâu cho người có tiền sử tăng huyết áp, mỡ máu, đau tức ngực hoặc người trên 40 tuổi.",
            items: ["Siêu âm tim màu Doppler", "Đo điện tim Holter 24h", "Xét nghiệm men tim & mỡ máu 4 thành phần", "Bác sĩ CKI Tim mạch tư vấn"],
            oldPrice: 2800000,
            price: 2190000,
            tag: "Phổ Biến Nhất",
            color: "#EF4444"
        },
        {
            title: "Gói Khám Sức Khỏe Toàn Diện VIP",
            desc: "Tầm soát chuyên sâu toàn thân với kỹ thuật cao, phát hiện sớm khối u và tổn thương tiềm ẩn.",
            items: ["Chụp X-Quang / CT lồng ngực", "Nội soi tiêu hóa không đau", "Tầm soát Marker ung thư", "Phòng khám VIP riêng biệt"],
            oldPrice: 5500000,
            price: 4290000,
            tag: "Gói VIP",
            color: "#8B5CF6"
        },
        {
            title: "Gói Tầm Soát Sức Khỏe Dinh Dưỡng Nhi",
            desc: "Kiểm tra toàn diện thể chất, vi chất dinh dưỡng, miễn dịch và sàng lọc phát triển cho bé.",
            items: ["Đo vi chất dinh dưỡng", "Xét nghiệm thiếu máu, canxi, kẽm", "Siêu âm tổng quát cho trẻ", "Tư vấn thực đơn cùng ThS Nhi"],
            oldPrice: 1200000,
            price: 890000,
            tag: "Dành Cho Bé",
            color: "#00C292"
        }
    ];

    return (
        <Box sx={{ bgcolor: "#F4F7FB" }}>
            {/* 1. HERO SECTION - TÌM KIẾM THÔNG MINH */}
            <Box
                sx={{
                    background: "linear-gradient(180deg, #0088D6 0%, #006FB3 50%, #005A9C 100%)",
                    color: "white",
                    pt: { xs: 5, md: 7 },
                    pb: { xs: 7, md: 10 },
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                <Container maxWidth="xl" sx={{ position: "relative", zIndex: 2 }}>
                    <Box textAlign="center" maxWidth={860} mx="auto" mb={3.5}>
                        <Chip
                            icon={<AutoAwesomeIcon sx={{ color: "#FDE047 !important", fontSize: "16px !important" }} />}
                            label="HỆ THỐNG ĐẶT KHÁM Y TẾ THÔNG MINH TNT"
                            sx={{
                                bgcolor: "rgba(255,255,255,0.18)",
                                backdropFilter: "blur(8px)",
                                color: "white",
                                fontWeight: 800,
                                mb: 2,
                                px: 1,
                                fontSize: "0.8rem",
                                border: "1px solid rgba(255,255,255,0.3)"
                            }}
                        />

                        <Typography
                            variant="h1"
                            fontWeight="900"
                            sx={{
                                fontSize: { xs: "2rem", sm: "2.6rem", md: "3.2rem" },
                                lineHeight: 1.2,
                                letterSpacing: "-0.02em",
                                mb: 1.5
                            }}
                        >
                            Đặt Lịch Khám Bệnh Nhanh Chóng <br />
                            <span style={{ color: "#67E8F9" }}>Chăm Sóc Sức Khỏe Toàn Diện</span>
                        </Typography>

                        <Typography
                            variant="body1"
                            sx={{
                                opacity: 0.92,
                                fontSize: { xs: "0.95rem", md: "1.1rem" },
                                lineHeight: 1.6,
                                maxWidth: 680,
                                mx: "auto"
                            }}
                        >
                            Chọn bác sĩ theo chuyên khoa, đặt lịch khám trước theo khung giờ. Nhận số thứ tự điện tử, không lo xếp hàng chờ đợi.
                        </Typography>
                    </Box>

                    {/* SMART SEARCH BOX */}
                    <Paper
                        elevation={6}
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: "18px",
                            maxWidth: 880,
                            mx: "auto",
                            bgcolor: "white",
                            boxShadow: "0 20px 40px -10px rgba(0, 45, 90, 0.35)",
                            border: "1px solid rgba(255,255,255,0.8)"
                        }}
                    >
                        {/* Search Bar Input */}
                        <Box
                            component="form"
                            onSubmit={handleQuickSearch}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                bgcolor: "#F8FAFC",
                                borderRadius: "12px",
                                p: { xs: 0.6, md: 0.8 },
                                border: "1.5px solid #E2E8F0",
                                transition: "0.2s",
                                "&:focus-within": {
                                    borderColor: "#0088D6",
                                    bgcolor: "white",
                                    boxShadow: "0 0 0 3px rgba(0, 136, 214, 0.12)"
                                }
                            }}
                        >
                            <InputAdornment position="start" sx={{ pl: 1.5, color: "#0088D6" }}>
                                <SearchIcon sx={{ fontSize: 24 }} />
                            </InputAdornment>
                            
                            <TextField
                                fullWidth
                                variant="standard"
                                placeholder="Nhập triệu chứng, chuyên khoa hoặc tên Bác sĩ (VD: Tim mạch, Đau ngực, BS. Trọng, Nhi khoa...)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    disableUnderline: true,
                                    sx: {
                                        fontSize: { xs: "0.9rem", md: "1rem" },
                                        fontWeight: 500,
                                        color: "#1E293B",
                                        px: 1
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
                                    py: { xs: 1, md: 1.2 },
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 14px rgba(0, 136, 214, 0.4)"
                                }}
                            >
                                Tìm Kiếm
                            </Button>
                        </Box>

                        {/* Popular Quick Keyword Pills */}
                        <Box display="flex" alignItems="center" gap={1} mt={1.8} flexWrap="wrap">
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">
                                Tìm kiếm phổ biến:
                            </Typography>
                            {["Tim mạch", "Nhi khoa", "Cơ xương khớp", "Khám tổng quát", "Da liễu", "Nội tiêu hóa", "Đau đầu", "Sốt cao"].map((tag, idx) => (
                                <Chip
                                    key={idx}
                                    label={tag}
                                    size="small"
                                    onClick={() => handleTagClick(tag)}
                                    sx={{
                                        cursor: "pointer",
                                        bgcolor: "#F1F5F9",
                                        color: "#475569",
                                        fontWeight: 600,
                                        fontSize: "0.75rem",
                                        "&:hover": { bgcolor: "#E2E8F0", color: "#0088D6" }
                                    }}
                                />
                            ))}
                        </Box>
                    </Paper>

                    {/* Trust Badges */}
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
                                100% Bác sĩ Chuyên khoa giỏi
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
                                Hồ sơ & Bệnh án điện tử bảo mật
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.8}>
                            <VerifiedIcon sx={{ color: "#34D399", fontSize: 18 }} />
                            <Typography variant="caption" fontWeight="600" sx={{ opacity: 0.95, fontSize: "0.85rem" }}>
                                Thanh toán VNPay an toàn
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* 2. CORE SERVICES 8-TILE GRID */}
            <Container maxWidth="xl" sx={{ mt: { xs: -3, md: -5 }, position: "relative", zIndex: 10 }}>
                <Paper
                    elevation={2}
                    sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: "18px",
                        bgcolor: "white",
                        border: "1px solid #E2E8F0"
                    }}
                >
                    <Grid container spacing={2}>
                        {CORE_SERVICES.map((item, index) => (
                            <Grid item xs={6} sm={4} md={3} key={index}>
                                <Box
                                    component={Link}
                                    to={item.to}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                        p: 1.8,
                                        borderRadius: "12px",
                                        textDecoration: "none",
                                        bgcolor: "#F8FAFC",
                                        border: "1px solid #EDF2F7",
                                        transition: "all 0.25s ease",
                                        height: "100%",
                                        "&:hover": {
                                            transform: "translateY(-3px)",
                                            boxShadow: "0 8px 20px -4px rgba(0, 136, 214, 0.15)",
                                            borderColor: item.color,
                                            bgcolor: "white"
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
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="800" color="#1E293B" sx={{ fontSize: "0.875rem" }}>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.3 }}>
                                            {item.subtitle}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            </Container>

            {/* 3. CHUYÊN KHOA TRỌNG ĐIỂM */}
            <Container maxWidth="xl" sx={{ py: 6 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3.5} flexWrap="wrap" gap={2}>
                    <Box>
                        <Chip label="ĐỘI NGŨ CHUYÊN SÂU" color="primary" size="small" sx={{ fontWeight: 800, mb: 0.8 }} />
                        <Typography variant="h4" fontWeight="900" color="#0F172A" sx={{ fontSize: { xs: "1.5rem", md: "1.85rem" } }}>
                            Chuyên Khoa Trọng Điểm
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Trang bị máy móc y khoa hiện đại và phác đồ điều trị chuẩn Bộ Y Tế
                        </Typography>
                    </Box>
                    <Button
                        component={Link}
                        to="/booking"
                        endIcon={<ArrowForwardIcon />}
                        sx={{ fontWeight: 700, color: "#0088D6" }}
                    >
                        Xem tất cả chuyên khoa
                    </Button>
                </Box>

                <Grid container spacing={2.5}>
                    {departments.slice(0, 6).map((dept, index) => {
                        const icons = [
                            <MonitorHeartIcon sx={{ fontSize: 26, color: "#EF4444" }} />,
                            <ChildCareIcon sx={{ fontSize: 26, color: "#00C292" }} />,
                            <HealingIcon sx={{ fontSize: 26, color: "#8B5CF6" }} />,
                            <ScienceIcon sx={{ fontSize: 26, color: "#0088D6" }} />,
                            <PsychologyIcon sx={{ fontSize: 26, color: "#F59E0B" }} />,
                            <CoronavirusIcon sx={{ fontSize: 26, color: "#EC4899" }} />
                        ];
                        const icon = icons[index % icons.length];

                        return (
                            <Grid item xs={12} sm={6} md={4} key={dept.departmentId || index}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                        borderRadius: "14px",
                                        border: "1px solid #E2E8F0",
                                        transition: "all 0.25s",
                                        "&:hover": {
                                            transform: "translateY(-3px)",
                                            borderColor: "#0088D6",
                                            boxShadow: "0 10px 24px rgba(0, 136, 214, 0.1)"
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
                                                    border: "1px solid #E2E8F0"
                                                }}
                                            >
                                                {icon}
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="800" color="#1E293B">
                                                    {dept.departmentName}
                                                </Typography>
                                                <Typography variant="caption" color="primary" fontWeight="bold">
                                                    Bác sĩ trực khám hôm nay
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2, minHeight: 40, lineHeight: 1.5, fontSize: "0.85rem" }}>
                                            {dept.description || "Khám, chẩn đoán hình ảnh kỹ thuật cao và phác đồ điều trị chuyên khoa chuẩn y tế."}
                                        </Typography>
                                    </Box>

                                    <Button
                                        component={Link}
                                        to={`/booking?departmentId=${dept.departmentId}`}
                                        variant="outlined"
                                        color="primary"
                                        fullWidth
                                        size="small"
                                        sx={{
                                            borderRadius: "8px",
                                            fontWeight: 700,
                                            py: 0.8,
                                            "&:hover": { bgcolor: "#EBF6FE" }
                                        }}
                                    >
                                        Đặt Khám Chuyên Khoa
                                    </Button>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            </Container>

            {/* 4. ĐỘI NGŨ BÁC SĨ CHUYÊN GIA */}
            <Box sx={{ bgcolor: "#FFFFFF", py: 6, borderTop: "1px solid #E2E8F0", borderBottom: "1px solid #E2E8F0" }}>
                <Container maxWidth="xl">
                    <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3.5} flexWrap="wrap" gap={2}>
                        <Box>
                            <Chip label="BÁC SĨ UY TÍN" color="secondary" size="small" sx={{ fontWeight: 800, mb: 0.8 }} />
                            <Typography variant="h4" fontWeight="900" color="#0F172A" sx={{ fontSize: { xs: "1.5rem", md: "1.85rem" } }}>
                                Đội Ngũ Bác Sĩ & Chuyên Gia Đầu Ngành
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Bác sĩ CKI, CKII, Thạc sĩ tận tâm, giàu y đức với nhiều năm kinh nghiệm
                            </Typography>
                        </Box>
                        <Button
                            component={Link}
                            to="/booking"
                            endIcon={<ArrowForwardIcon />}
                            sx={{ fontWeight: 700, color: "#0088D6" }}
                        >
                            Xem tất cả bác sĩ
                        </Button>
                    </Box>

                    <Grid container spacing={2.5}>
                        {FEATURED_DOCTORS.map((doc, idx) => (
                            <Grid item xs={12} sm={6} md={3} key={idx}>
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
                                        border: "1px solid #E2E8F0",
                                        transition: "0.25s",
                                        "&:hover": {
                                            transform: "translateY(-4px)",
                                            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                                            borderColor: "#0088D6"
                                        }
                                    }}
                                >
                                    <Box>
                                        <Box position="relative" display="inline-block" mx="auto" mb={1.5}>
                                            <Avatar
                                                sx={{
                                                    width: 76,
                                                    height: 76,
                                                    bgcolor: doc.avatarColor,
                                                    fontSize: "1.6rem",
                                                    fontWeight: 900,
                                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                                }}
                                            >
                                                {doc.avatar}
                                            </Avatar>
                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    bottom: 0,
                                                    right: 0,
                                                    bgcolor: "white",
                                                    borderRadius: "50%",
                                                    display: "flex",
                                                    p: "2px"
                                                }}
                                            >
                                                <VerifiedIcon sx={{ color: "#0088D6", fontSize: 18 }} />
                                            </Box>
                                        </Box>

                                        <Chip
                                            label={doc.degree}
                                            size="small"
                                            sx={{
                                                bgcolor: "#EBF6FE",
                                                color: "#0088D6",
                                                fontWeight: 800,
                                                fontSize: "0.7rem",
                                                mb: 0.8
                                            }}
                                        />

                                        <Typography variant="subtitle1" fontWeight="900" color="#1E293B" gutterBottom>
                                            {doc.name}
                                        </Typography>

                                        <Typography variant="caption" color="primary" fontWeight="700" display="block" sx={{ mb: 0.5 }}>
                                            {doc.dept}
                                        </Typography>

                                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} my={0.8}>
                                            <Rating value={doc.rating} precision={0.1} size="small" readOnly />
                                            <Typography variant="caption" fontWeight="bold" color="#1E293B">
                                                {doc.rating} ({doc.reviewsCount})
                                            </Typography>
                                        </Box>

                                        <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
                                            {doc.exp}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Divider sx={{ my: 1 }} />
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.2}>
                                            <Typography variant="caption" color="textSecondary">
                                                Giá khám:
                                            </Typography>
                                            <Typography variant="subtitle2" fontWeight="900" color="#10B981">
                                                {formatCurrency(doc.fee)}
                                            </Typography>
                                        </Box>

                                        <Button
                                            component={Link}
                                            to="/booking"
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            size="small"
                                            sx={{
                                                borderRadius: "8px",
                                                fontWeight: 700,
                                                py: 0.7
                                            }}
                                        >
                                            Đặt Lịch Khám
                                        </Button>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* 5. GÓI KHÁM SỨC KHỎE */}
            <Container maxWidth="xl" sx={{ py: 6 }}>
                <Box textAlign="center" maxWidth={700} mx="auto" mb={4}>
                    <Chip label="TIẾT KIỆM ĐẾN 25%" color="warning" size="small" sx={{ fontWeight: 800, mb: 0.8 }} />
                    <Typography variant="h4" fontWeight="900" color="#0F172A" sx={{ fontSize: { xs: "1.5rem", md: "1.85rem" } }}>
                        Gói Khám Sức Khỏe Toàn Diện
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Chủ động tầm soát sức khỏe định kỳ giúp phát hiện sớm các nguy cơ tiềm ẩn
                    </Typography>
                </Box>

                <Grid container spacing={2.5}>
                    {HEALTH_PACKAGES.map((pkg, idx) => (
                        <Grid item xs={12} sm={6} md={3} key={idx}>
                            <Card
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    borderRadius: "14px",
                                    border: `1.5px solid ${idx === 1 ? "#EF4444" : "#E2E8F0"}`,
                                    boxShadow: idx === 1 ? "0 8px 24px rgba(239, 68, 68, 0.1)" : "none",
                                    transition: "0.25s",
                                    "&:hover": { transform: "translateY(-3px)" }
                                }}
                            >
                                <Box>
                                    <Chip
                                        label={pkg.tag}
                                        size="small"
                                        sx={{
                                            bgcolor: `${pkg.color}15`,
                                            color: pkg.color,
                                            fontWeight: 800,
                                            fontSize: "0.7rem",
                                            mb: 1
                                        }}
                                    />

                                    <Typography variant="subtitle1" fontWeight="900" color="#1E293B" gutterBottom>
                                        {pkg.title}
                                    </Typography>

                                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: "block", minHeight: 36, lineHeight: 1.4 }}>
                                        {pkg.desc}
                                    </Typography>

                                    <Divider sx={{ my: 1 }} />

                                    <Stack spacing={0.8} mb={2}>
                                        {pkg.items.map((it, i) => (
                                            <Box key={i} display="flex" alignItems="flex-start" gap={0.8}>
                                                <CheckCircleIcon sx={{ fontSize: 14, color: "#10B981", mt: 0.3 }} />
                                                <Typography variant="caption" color="#334155" fontWeight="500">
                                                    {it}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>

                                <Box>
                                    <Box mb={1.5}>
                                        <Typography variant="caption" sx={{ textDecoration: "line-through", color: "#94A3B8" }}>
                                            {formatCurrency(pkg.oldPrice)}
                                        </Typography>
                                        <Typography variant="h6" fontWeight="900" color={pkg.color}>
                                            {formatCurrency(pkg.price)}
                                        </Typography>
                                    </Box>

                                    <Button
                                        component={Link}
                                        to="/booking"
                                        variant="contained"
                                        fullWidth
                                        size="small"
                                        sx={{
                                            bgcolor: pkg.color,
                                            "&:hover": { opacity: 0.9 },
                                            borderRadius: "8px",
                                            fontWeight: 700,
                                            py: 0.8
                                        }}
                                    >
                                        Đăng Ký Gói Khám
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* 6. QUY TRÌNH 4 BƯỚC ĐẶT KHÁM */}
            <Box sx={{ bgcolor: "#EBF6FE", py: 6 }}>
                <Container maxWidth="xl">
                    <Box textAlign="center" maxWidth={700} mx="auto" mb={4}>
                        <Chip label="TIỆN LỢI & NHANH CHÓNG" color="primary" size="small" sx={{ fontWeight: 800, mb: 0.8 }} />
                        <Typography variant="h4" fontWeight="900" color="#004D8C" sx={{ fontSize: { xs: "1.5rem", md: "1.85rem" } }}>
                            Quy Trình Đặt Khám 4 Bước Đơn Giản
                        </Typography>
                        <Typography variant="body2" color="#475569">
                            Chỉ với vài thao tác, bạn đã có ngay phiếu khám ưu tiên và khung giờ khám mong muốn
                        </Typography>
                    </Box>

                    <Grid container spacing={2.5}>
                        {[
                            {
                                step: "01",
                                title: "Tìm Bác Sĩ & Chuyên Khoa",
                                desc: "Lựa chọn bác sĩ theo chuyên khoa, kinh nghiệm hoặc triệu chứng bệnh lý.",
                                icon: <SearchIcon sx={{ fontSize: 28, color: "#0088D6" }} />
                            },
                            {
                                step: "02",
                                title: "Chọn Ngày & Khung Giờ",
                                desc: "Xem lịch trực thực tế của bác sĩ và chọn khung giờ khám phù hợp.",
                                icon: <CalendarMonthIcon sx={{ fontSize: 28, color: "#00C292" }} />
                            },
                            {
                                step: "03",
                                title: "Nhập Hồ Sơ Bệnh Nhân",
                                desc: "Điền thông tin hoặc chọn hồ sơ thành viên gia đình trong sổ khám điện tử.",
                                icon: <AssignmentTurnedInIcon sx={{ fontSize: 28, color: "#F59E0B" }} />
                            },
                            {
                                step: "04",
                                title: "Nhận Phiếu Khám Điện Tử",
                                desc: "Nhận mã đặt khám và số thứ tự ưu tiên, đến viện khám đúng giờ không cần xếp hàng.",
                                icon: <CheckCircleIcon sx={{ fontSize: 28, color: "#8B5CF6" }} />
                            }
                        ].map((s, idx) => (
                            <Grid item xs={12} sm={6} md={3} key={idx}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        borderRadius: "14px",
                                        height: "100%",
                                        bgcolor: "white",
                                        position: "relative",
                                        border: "1px solid #D0E3F5",
                                        transition: "0.2s",
                                        "&:hover": { transform: "translateY(-3px)" }
                                    }}
                                >
                                    <Typography
                                        variant="h4"
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
                                    <Typography variant="subtitle1" fontWeight="800" color="#1E293B" gutterBottom>
                                        {s.title}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ lineHeight: 1.5, fontSize: "0.85rem" }}>
                                        {s.desc}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>
        </Box>
    );
}
