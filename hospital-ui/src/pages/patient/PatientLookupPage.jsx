import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    TextField,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Alert,
    InputAdornment,
    Tabs,
    Tab,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Avatar,
    Stack,
    CircularProgress,
    IconButton,
    Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import MapIcon from "@mui/icons-material/Map";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PrintIcon from "@mui/icons-material/Print";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import ElevatorIcon from "@mui/icons-material/Elevator";
import FilterListIcon from "@mui/icons-material/FilterList";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import BadgeIcon from "@mui/icons-material/Badge";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RouteIcon from "@mui/icons-material/Route";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import HealingIcon from "@mui/icons-material/Healing";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";

import axiosInstance from "../../services/AxiosInstance";
import { formatDate, formatDateTime, formatCurrency } from "../../utils/formatters";

export default function PatientLookupPage() {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [activeTab, setActiveTab] = useState(0); // 0: Tra cứu hồ sơ, 1: Sơ đồ chỉ dẫn bệnh viện, 2: Hướng dẫn khám bệnh
    const [searchResult, setSearchResult] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    // Map & Room state
    const [rooms, setRooms] = useState([]);
    const [selectedFloor, setSelectedFloor] = useState("ALL"); // ALL, 1, 2, 3, 4
    const [roomSearch, setRoomSearch] = useState("");
    const [loadingRooms, setLoadingRooms] = useState(false);

    // Route generator state
    const [toRoom, setToRoom] = useState("");
    const [routeGuide, setRouteGuide] = useState(null);

    useEffect(() => {
        if (activeTab === 1) {
            loadHospitalRooms();
        }
    }, [activeTab]);

    const loadHospitalRooms = async () => {
        setLoadingRooms(true);
        try {
            const res = await axiosInstance.get("/api/departments/rooms/all").catch(() => null);
            if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
                setRooms(res.data);
            } else {
                // Fallback structured data
                setRooms([
                    { roomId: 101, roomName: "Khoa Cấp Cứu 115 (Trực 24/7)", departmentName: "Cấp Cứu & Hồi Sức", floor: 1, type: "EMERGENCY" },
                    { roomId: 102, roomName: "Cây Kiosk Tự Phục Vụ Lấy Số Thứ Tự", departmentName: "Sảnh Tiếp Đón", floor: 1, type: "KIOSK" },
                    { roomId: 103, roomName: "Quầy Thu Ngân Viện Phí (Quầy 01-04)", departmentName: "Tài Chính - Viện Phí", floor: 1, type: "CASHIER" },
                    { roomId: 104, roomName: "Nhà Thuốc Bệnh Viện (Quầy Dược)", departmentName: "Khoa Dược", floor: 1, type: "PHARMACY" },
                    { roomId: 201, roomName: "Phòng Khám Nội Tim Mạch 201", departmentName: "Nội Tim Mạch", floor: 2, type: "CLINIC" },
                    { roomId: 202, roomName: "Phòng Can Thiệp Tim & Điện Tâm Đồ 202", departmentName: "Nội Tim Mạch", floor: 2, type: "CLINIC" },
                    { roomId: 203, roomName: "Phòng Khám Tiêu Hóa & Nội Soi 203", departmentName: "Nội Tiêu Hóa", floor: 2, type: "CLINIC" },
                    { roomId: 204, roomName: "Phòng Khám Nhi & Sơ Sinh 204", departmentName: "Nhi Khoa", floor: 2, type: "CLINIC" },
                    { roomId: 205, roomName: "Phòng Khám Răng Hàm Mặt 205", departmentName: "Răng Hàm Mặt", floor: 2, type: "CLINIC" },
                    { roomId: 206, roomName: "Phòng Khám Tai Mũi Họng 206", departmentName: "Tai Mũi Họng", floor: 2, type: "CLINIC" },
                    { roomId: 301, roomName: "Khu Buồng Bệnh Nội Trú VIP 301-305", departmentName: "Điều Trị Nội Trú", floor: 3, type: "INPATIENT" },
                    { roomId: 302, roomName: "Buồng Bệnh Tiêu Chuẩn 306-310", departmentName: "Điều Trị Nội Trú", floor: 3, type: "INPATIENT" },
                    { roomId: 303, roomName: "Trạm Trực Điều Dưỡng Trung Tâm Tầng 3", departmentName: "Điều Dưỡng", floor: 3, type: "NURSE_STATION" },
                    { roomId: 304, roomName: "Khoa Hồi Sức Tích Cực (ICU)", departmentName: "Hồi Sức Cấp Cứu", floor: 3, type: "ICU" },
                    { roomId: 401, roomName: "Trung Tâm Xét Nghiệm Huyết Học & Sinh Hóa", departmentName: "Khoa Xét Nghiệm", floor: 4, type: "LAB" },
                    { roomId: 402, roomName: "Phòng Chụp X-Quang Kỹ Thuật Số (DR)", departmentName: "CĐHA", floor: 4, type: "XRAY" },
                    { roomId: 403, roomName: "Phòng Chụp Cắt Lớp Vi Tính CT-Scanner 128 Dãy", departmentName: "CĐHA", floor: 4, type: "CT" },
                    { roomId: 404, roomName: "Phòng Cộng Hưởng Từ MRI 1.5 Tesla", departmentName: "CĐHA", floor: 4, type: "MRI" },
                    { roomId: 405, roomName: "Khu Nhà Mổ Vô Trùng & Phẫu Thuật Ngoại Khoa", departmentName: "Ngoại Khoa", floor: 4, type: "SURGERY" },
                ]);
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách phòng:", err);
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        const cleanKw = searchKeyword.trim();
        if (!cleanKw) {
            alert("Vui lòng nhập Số điện thoại, CCCD, Mã BHYT hoặc Mã phiếu khám!");
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            // 1. Kiểm tra nếu keyword có định dạng mã phiếu đặt khám (BK... hoặc có dấu gạch ngang)
            const isBookingCode = /^BK/i.test(cleanKw) || (cleanKw.length >= 8 && cleanKw.toUpperCase().includes("BK"));

            let foundFromBooking = null;
            if (isBookingCode) {
                const bkRes = await axiosInstance.get(`/api/bookings/code/${encodeURIComponent(cleanKw)}`).catch(() => null);
                const bkData = bkRes?.data?.data || bkRes?.data || bkRes;
                if (bkData && (bkData.bookingCode || bkData.bookingId)) {
                    foundFromBooking = bkData;
                }
            }

            if (foundFromBooking) {
                setSearchResult({
                    fullName: foundFromBooking.patientName || "Bệnh nhân",
                    phoneNumber: "Đã liên kết phiếu khám",
                    identityNumber: "Bảo mật thông tin",
                    healthInsuranceNumber: "Theo phiếu đăng ký",
                    gender: "OTHER",
                    dateOfBirth: null,
                    address: "Đăng ký khám tại Bệnh viện TNT",
                    latestBooking: {
                        bookingCode: foundFromBooking.bookingCode,
                        queueNumber: foundFromBooking.queueCode || (foundFromBooking.queueNumber ? `#${foundFromBooking.queueNumber}` : "-"),
                        departmentName: foundFromBooking.departmentName || "Khoa Khám Bệnh",
                        doctorName: foundFromBooking.doctorName || "Bác sĩ phụ trách",
                        roomName: foundFromBooking.roomName || "Phòng khám chuyên khoa",
                        timeSlot: foundFromBooking.startTime ? `${String(foundFromBooking.startTime).substring(0, 5)} - ${foundFromBooking.endTime ? String(foundFromBooking.endTime).substring(0, 5) : ""}` : "Hôm nay",
                        bookingDate: foundFromBooking.bookingDate,
                        status: foundFromBooking.status || "CONFIRMED"
                    },
                    medicalHistory: foundFromBooking.symptoms ? [
                        {
                            date: foundFromBooking.bookingDate || "Hôm nay",
                            diagnosis: foundFromBooking.symptoms,
                            doctor: foundFromBooking.doctorName || "Bác sĩ phụ trách",
                            result: `Trạng thái phiếu: ${foundFromBooking.status || "CONFIRMED"}`
                        }
                    ] : []
                });
                return;
            }

            // 2. Tra cứu hồ sơ bệnh nhân qua /api/patient-profiles/lookup
            const res = await axiosInstance.get(`/api/patient-profiles/lookup?keyword=${encodeURIComponent(cleanKw)}`).catch(() => null);
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));

            if (list.length > 0) {
                const found = list[0];
                setSearchResult({
                    ...found,
                    latestBooking: found.lastVisitDate ? {
                        bookingCode: "LẦN KHÁM GẦN NHẤT",
                        queueNumber: "-",
                        departmentName: found.lastDepartmentName || "Khoa Khám Bệnh",
                        doctorName: found.lastDoctorName || "Bác sĩ phụ trách",
                        roomName: "Phòng khám chuyên khoa",
                        timeSlot: "Giờ hành chính",
                        bookingDate: found.lastVisitDate,
                        status: "COMPLETED"
                    } : null,
                    medicalHistory: found.lastDiagnosis ? [
                        {
                            date: found.lastVisitDate || "Gần đây",
                            diagnosis: found.lastDiagnosis,
                            doctor: found.lastDoctorName || "Bác sĩ phụ trách",
                            result: `Tổng số lần khám: ${found.totalVisits || 1}`
                        }
                    ] : []
                });
            } else {
                // 3. Fallback: Nếu không tìm thấy hồ sơ, thử tìm theo mã phiếu khám nếu chưa tìm
                if (!isBookingCode && cleanKw.length >= 4) {
                    const bkRes = await axiosInstance.get(`/api/bookings/code/${encodeURIComponent(cleanKw)}`).catch(() => null);
                    const bkData = bkRes?.data?.data || bkRes?.data || bkRes;
                    if (bkData && (bkData.bookingCode || bkData.bookingId)) {
                        setSearchResult({
                            fullName: bkData.patientName || "Bệnh nhân",
                            phoneNumber: "Đã liên kết phiếu khám",
                            identityNumber: "Bảo mật thông tin",
                            healthInsuranceNumber: "Theo phiếu đăng ký",
                            gender: "OTHER",
                            dateOfBirth: null,
                            address: "Đăng ký khám tại Bệnh viện TNT",
                            latestBooking: {
                                bookingCode: bkData.bookingCode,
                                queueNumber: bkData.queueCode || (bkData.queueNumber ? `#${bkData.queueNumber}` : "-"),
                                departmentName: bkData.departmentName || "Khoa Khám Bệnh",
                                doctorName: bkData.doctorName || "Bác sĩ phụ trách",
                                roomName: bkData.roomName || "Phòng khám chuyên khoa",
                                timeSlot: bkData.startTime ? `${String(bkData.startTime).substring(0, 5)} - ${bkData.endTime ? String(bkData.endTime).substring(0, 5) : ""}` : "Hôm nay",
                                bookingDate: bkData.bookingDate,
                                status: bkData.status || "CONFIRMED"
                            },
                            medicalHistory: bkData.symptoms ? [
                                {
                                    date: bkData.bookingDate || "Hôm nay",
                                    diagnosis: bkData.symptoms,
                                    doctor: bkData.doctorName || "Bác sĩ phụ trách",
                                    result: `Trạng thái phiếu: ${bkData.status || "CONFIRMED"}`
                                }
                            ] : []
                        });
                        return;
                    }
                }
                setSearchResult(null);
            }
        } catch (err) {
            console.error("Lỗi tra cứu:", err);
            setSearchResult(null);
        } finally {
            setLoading(false);
        }
    };

    // Tạo chỉ dẫn đường đi thông minh
    const handleGenerateRoute = (targetRoom) => {
        setToRoom(targetRoom.roomName);
        const floor = targetRoom.floor || (targetRoom.roomId ? Math.floor(targetRoom.roomId / 100) : 1);

        let steps = [];
        if (floor === 1) {
            steps = [
                "Từ Cổng chính sảnh Bệnh viện TNT, đi thẳng qua cửa kiểm soát số 1.",
                "Rẽ vào hành lang Tầng 1 (Khu khám tiếp đón & viện phí).",
                `Đến trước cửa [${targetRoom.roomName}] (Vị trí phòng bên tay phải).`
            ];
        } else {
            steps = [
                "Từ Cổng chính sảnh Bệnh viện TNT, đi thẳng 15m đến Cụm Thang máy Trung tâm (Thang A & B).",
                `Bấm thang máy hoặc đi thang bộ lên TẦNG ${floor}.`,
                `Bước ra khỏi thang máy, rẽ theo bảng biển chỉ dẫn màu xanh về hướng [${targetRoom.departmentName}].`,
                `Di chuyển 20m đến trước cửa [${targetRoom.roomName}] (Phòng số ${targetRoom.roomId}).`
            ];
        }

        setRouteGuide({
            targetRoom: targetRoom.roomName,
            floor,
            distance: floor === 1 ? "30 mét (~1 phút đi bộ)" : `${floor * 25 + 20} mét (~2 phút đi thang máy)`,
            steps
        });
    };

    const handleNavigateToRoom = (roomName) => {
        setActiveTab(1);
        const found = rooms.find(r => r.roomName?.toLowerCase().includes(roomName.toLowerCase()) || String(r.roomId) === roomName);
        if (found) {
            handleGenerateRoute(found);
        } else {
            setRoomSearch(roomName);
        }
    };

    const filteredRooms = rooms.filter(r => {
        const floor = r.floor || (r.roomId ? Math.floor(r.roomId / 100) : 1);
        const matchesFloor = selectedFloor === "ALL" || floor === Number(selectedFloor);
        const matchesSearch = !roomSearch.trim() ||
            r.roomName?.toLowerCase().includes(roomSearch.toLowerCase()) ||
            r.departmentName?.toLowerCase().includes(roomSearch.toLowerCase()) ||
            String(r.roomId).includes(roomSearch);
        return matchesFloor && matchesSearch;
    });

    const floorNames = {
        "ALL": "Tất Cả Tầng",
        "1": "Tầng 1 (Cấp cứu & Tiếp đón)",
        "2": "Tầng 2 (Khám chuyên khoa)",
        "3": "Tầng 3 (Nội trú & Hồi sức ICU)",
        "4": "Tầng 4 (CĐHA & Xét nghiệm)"
    };

    return (
        <Box sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", py: { xs: 3, md: 5 } }}>
            <Container maxWidth="lg">
                {/* Hero Header */}
                <Box textAlign="center" mb={4}>
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            px: 2,
                            py: 0.6,
                            borderRadius: 999,
                            bgcolor: "rgba(0, 136, 214, 0.08)",
                            border: "1px solid rgba(0, 136, 214, 0.2)",
                            color: "#0088D6",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            mb: 1.5
                        }}
                    >
                        <LocalHospitalIcon sx={{ fontSize: 16 }} />
                        CỔNG TRA CỨU Y TẾ & CHỈ DẪN THÔNG MINH
                    </Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 800,
                            color: "#0F172A",
                            letterSpacing: "-0.03em",
                            mb: 1,
                            fontSize: { xs: "1.75rem", md: "2.25rem" }
                        }}
                    >
                        Tra Cứu Hồ Sơ & Điều Hướng Bệnh Viện TNT
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#64748B", maxWidth: 640, mx: "auto" }}>
                        Quét nhanh phiếu đặt khám, xem số thứ tự trực tiếp, tra cứu lịch sử khám bệnh và nhận lộ trình di chuyển tới từng buồng phòng theo thời gian thực.
                    </Typography>
                </Box>

                {/* Segmented Control Navigation Tabs */}
                <Paper
                    elevation={0}
                    sx={{
                        mb: 4,
                        p: 0.6,
                        borderRadius: 3.5,
                        bgcolor: "#FFFFFF",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)"
                    }}
                >
                    <Tabs
                        value={activeTab}
                        onChange={(e, val) => setActiveTab(val)}
                        variant="fullWidth"
                        sx={{
                            "& .MuiTabs-indicator": {
                                height: "100%",
                                borderRadius: 3,
                                bgcolor: "rgba(0, 136, 214, 0.09)",
                                zIndex: 0
                            }
                        }}
                    >
                        <Tab
                            icon={<PersonSearchIcon sx={{ fontSize: 20 }} />}
                            iconPosition="start"
                            label="Tra Cứu Hồ Sơ & Phiếu Khám"
                            sx={{
                                fontWeight: 700,
                                textTransform: "none",
                                fontSize: "0.92rem",
                                minHeight: 48,
                                zIndex: 1,
                                color: activeTab === 0 ? "#0088D6 !important" : "#64748B"
                            }}
                        />
                        <Tab
                            icon={<MapIcon sx={{ fontSize: 20 }} />}
                            iconPosition="start"
                            label="Sơ Đồ Buồng Phòng & Chỉ Dẫn"
                            sx={{
                                fontWeight: 700,
                                textTransform: "none",
                                fontSize: "0.92rem",
                                minHeight: 48,
                                zIndex: 1,
                                color: activeTab === 1 ? "#0088D6 !important" : "#64748B"
                            }}
                        />
                        <Tab
                            icon={<HelpOutlineIcon sx={{ fontSize: 20 }} />}
                            iconPosition="start"
                            label="Quy Trình Khám Bệnh 5 Bước"
                            sx={{
                                fontWeight: 700,
                                textTransform: "none",
                                fontSize: "0.92rem",
                                minHeight: 48,
                                zIndex: 1,
                                color: activeTab === 2 ? "#0088D6 !important" : "#64748B"
                            }}
                        />
                    </Tabs>
                </Paper>

                {/* TAB 0: TRA CỨU HỒ SƠ & PHIẾU KHÁM */}
                {activeTab === 0 && (
                    <Box>
                        {/* Search Card */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 3, md: 4 },
                                mb: 4,
                                borderRadius: 4,
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                boxShadow: "0 8px 30px rgba(15, 23, 42, 0.04)"
                            }}
                        >
                            <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                                <Box
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: "10px",
                                        bgcolor: "rgba(0, 136, 214, 0.1)",
                                        color: "#0088D6",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <SearchIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight={800} color="#0F172A">
                                        Nhập thông tin định danh bệnh nhân:
                                    </Typography>
                                    <Typography variant="body2" color="#64748B">
                                        Tìm kiếm bằng Số điện thoại, Số CCCD, Mã thẻ BHYT hoặc Mã phiếu khám (BK...)
                                    </Typography>
                                </Box>
                            </Box>

                            <Box component="form" onSubmit={handleSearch} mt={3}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={9}>
                                        <TextField
                                            fullWidth
                                            placeholder="Ví dụ: 0987654321, 001201012345, DN401..., hoặc BK2026101901"
                                            value={searchKeyword}
                                            onChange={(e) => setSearchKeyword(e.target.value)}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ color: "#94A3B8" }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: searchKeyword ? (
                                                    <InputAdornment position="end">
                                                        <IconButton size="small" onClick={() => setSearchKeyword("")}>
                                                            <ClearIcon fontSize="small" />
                                                        </IconButton>
                                                    </InputAdornment>
                                                ) : null,
                                                sx: {
                                                    borderRadius: 2.5,
                                                    bgcolor: "#F8FAFC",
                                                    fontSize: "0.95rem",
                                                    "& fieldset": { borderColor: "rgba(15, 23, 42, 0.12)" },
                                                    "&:hover fieldset": { borderColor: "#0088D6" }
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            disabled={loading}
                                            sx={{
                                                height: 54,
                                                borderRadius: 2.5,
                                                fontWeight: 800,
                                                fontSize: "0.95rem",
                                                textTransform: "none",
                                                bgcolor: "#0088D6",
                                                boxShadow: "0 6px 18px rgba(0, 136, 214, 0.25)",
                                                "&:hover": { bgcolor: "#0073B7" }
                                            }}
                                        >
                                            {loading ? <CircularProgress size={22} color="inherit" /> : "Tra Cứu Tức Thì"}
                                        </Button>
                                    </Grid>
                                </Grid>

                                {/* Quick preset suggestion chips */}
                                <Box display="flex" alignItems="center" gap={1} mt={2} flexWrap="wrap">
                                    <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                                        GỢI Ý TÌM NHANH:
                                    </Typography>
                                    {["0987654321", "0912345678", "BK2026101901"].map((chipKw) => (
                                        <Chip
                                            key={chipKw}
                                            label={chipKw}
                                            size="small"
                                            onClick={() => {
                                                setSearchKeyword(chipKw);
                                            }}
                                            sx={{
                                                borderRadius: 1.5,
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                                fontFamily: "monospace",
                                                bgcolor: "#F1F5F9",
                                                color: "#334155",
                                                cursor: "pointer",
                                                "&:hover": { bgcolor: "#E2E8F0" }
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        </Paper>

                        {/* Search Results Display */}
                        {hasSearched && searchResult && (
                            <Grid container spacing={3}>
                                {/* Left Column: Patient Profile Card */}
                                <Grid item xs={12} md={5}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            borderRadius: 3.5,
                                            height: "100%",
                                            bgcolor: "#FFFFFF",
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)"
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={2} mb={2.5}>
                                            <Avatar
                                                sx={{
                                                    width: 56,
                                                    height: 56,
                                                    bgcolor: "#0088D6",
                                                    fontWeight: 800,
                                                    fontSize: "1.2rem",
                                                    boxShadow: "0 4px 12px rgba(0, 136, 214, 0.25)"
                                                }}
                                            >
                                                {searchResult.fullName ? searchResult.fullName.charAt(0).toUpperCase() : "P"}
                                            </Avatar>
                                            <Box>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="h6" fontWeight={800} color="#0F172A">
                                                        {searchResult.fullName}
                                                    </Typography>
                                                    <VerifiedUserIcon sx={{ color: "#10B981", fontSize: 18 }} />
                                                </Box>
                                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                                                    HỒ SƠ BỆNH NHÂN CHÍNH THỨC
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ mb: 2, borderColor: "rgba(15, 23, 42, 0.06)" }} />

                                        <Stack spacing={1.6}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" sx={{ color: "#64748B" }}>Số điện thoại:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace", color: "#0F172A" }}>
                                                    {searchResult.phoneNumber}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" sx={{ color: "#64748B" }}>Số CCCD / Định danh:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace", color: "#0F172A" }}>
                                                    {searchResult.identityNumber || "Chưa cập nhật"}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" sx={{ color: "#64748B" }}>Mã thẻ BHYT:</Typography>
                                                <Chip
                                                    label={searchResult.healthInsuranceNumber || "Không có BHYT"}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: searchResult.healthInsuranceNumber ? "rgba(16, 185, 129, 0.1)" : "rgba(148, 163, 184, 0.1)",
                                                        color: searchResult.healthInsuranceNumber ? "#059669" : "#64748B",
                                                        fontWeight: 700,
                                                        fontSize: "0.75rem",
                                                        fontFamily: "monospace"
                                                    }}
                                                />
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" sx={{ color: "#64748B" }}>Ngày sinh & Giới tính:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: "#0F172A" }}>
                                                    {formatDate(searchResult.dateOfBirth) || "Chưa cập nhật"} ({searchResult.gender === "MALE" ? "Nam" : searchResult.gender === "FEMALE" ? "Nữ" : "Khác"})
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                <Typography variant="body2" sx={{ color: "#64748B", flexShrink: 0 }}>Địa chỉ cư trú:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: "#334155", textAlign: "right", ml: 2 }}>
                                                    {searchResult.address || "Hà Nội"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Grid>

                                {/* Right Column: Ticket Card & History */}
                                <Grid item xs={12} md={7}>
                                    <Stack spacing={3}>
                                        {searchResult.latestBooking && (
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    borderRadius: 3.5,
                                                    bgcolor: "#FFFFFF",
                                                    border: "1.5px solid rgba(16, 185, 129, 0.4)",
                                                    boxShadow: "0 8px 30px rgba(16, 185, 129, 0.08)",
                                                    position: "relative",
                                                    overflow: "hidden"
                                                }}
                                            >
                                                {/* Top accent badge */}
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 4,
                                                        bgcolor: "#10B981"
                                                    }}
                                                />

                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <CalendarMonthIcon sx={{ color: "#10B981" }} />
                                                        <Typography variant="h6" fontWeight={800} color="#065F46">
                                                            Phiếu Khám Hôm Nay
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={searchResult.latestBooking.status === "COMPLETED" ? "ĐÃ HOÀN TẤT" : "ĐÃ XÁC NHẬN"}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: "#ECFDF5",
                                                            color: "#059669",
                                                            border: "1px solid #A7F3D0",
                                                            fontWeight: 800,
                                                            fontSize: "0.75rem"
                                                        }}
                                                    />
                                                </Box>

                                                <Grid container spacing={2} sx={{ bgcolor: "#F8FAFC", p: 2, borderRadius: 2.5, mb: 2 }}>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>MÃ PHIẾU KHÁM:</Typography>
                                                        <Typography variant="body1" sx={{ fontWeight: 800, color: "#0088D6", fontFamily: "monospace" }}>
                                                            {searchResult.latestBooking.bookingCode}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>SỐ THỨ TỰ (STT):</Typography>
                                                        <Typography variant="h5" sx={{ fontWeight: 900, color: "#DC2626", fontFamily: "monospace" }}>
                                                            {searchResult.latestBooking.queueNumber}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={4}>
                                                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>KHUNG GIỜ HẸN:</Typography>
                                                        <Typography variant="body1" sx={{ fontWeight: 700, color: "#0F172A" }}>
                                                            {searchResult.latestBooking.timeSlot}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>CHUYÊN KHOA:</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                                                            {searchResult.latestBooking.departmentName}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={12} sm={6}>
                                                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>BÁC SĨ PHỤ TRÁCH:</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>
                                                            {searchResult.latestBooking.doctorName}
                                                        </Typography>
                                                    </Grid>
                                                </Grid>

                                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <MeetingRoomIcon sx={{ color: "#0088D6", fontSize: 20 }} />
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0088D6" }}>
                                                            Vị trí: {searchResult.latestBooking.roomName}
                                                        </Typography>
                                                    </Box>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<DirectionsWalkIcon />}
                                                        onClick={() => handleNavigateToRoom(searchResult.latestBooking.roomName)}
                                                        sx={{
                                                            borderRadius: 2,
                                                            fontWeight: 700,
                                                            fontSize: "0.8rem",
                                                            textTransform: "none",
                                                            bgcolor: "#10B981",
                                                            "&:hover": { bgcolor: "#059669" }
                                                        }}
                                                    >
                                                        Chỉ Đường Đến Phòng Này
                                                    </Button>
                                                </Box>
                                            </Paper>
                                        )}

                                        {/* Medical History */}
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 3,
                                                borderRadius: 3.5,
                                                bgcolor: "#FFFFFF",
                                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                                boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)"
                                            }}
                                        >
                                            <Typography variant="h6" fontWeight={800} color="#0F172A" mb={2}>
                                                Lịch Sử Khám Bệnh ({searchResult.medicalHistory?.length || 0})
                                            </Typography>
                                            {searchResult.medicalHistory?.length === 0 ? (
                                                <Typography variant="body2" color="#64748B" textAlign="center" py={2}>
                                                    Bệnh nhân chưa có lịch sử khám bệnh trước đó.
                                                </Typography>
                                            ) : (
                                                <Stack spacing={1.5}>
                                                    {searchResult.medicalHistory.map((hist, idx) => (
                                                        <Box
                                                            key={idx}
                                                            sx={{
                                                                p: 2,
                                                                borderRadius: 2.5,
                                                                bgcolor: "#F8FAFC",
                                                                border: "1px solid rgba(15, 23, 42, 0.06)",
                                                                transition: "0.15s ease",
                                                                "&:hover": { bgcolor: "#F1F5F9" }
                                                            }}
                                                        >
                                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                                <Typography variant="subtitle2" fontWeight={800} color="#0088D6">
                                                                    Ngày khám: {formatDate(hist.date)}
                                                                </Typography>
                                                                <Chip label={hist.doctor} size="small" sx={{ fontWeight: 600, fontSize: "0.72rem" }} />
                                                            </Box>
                                                            <Typography variant="body2" sx={{ color: "#334155", mb: 0.5 }}>
                                                                <b>Chẩn đoán:</b> {hist.diagnosis}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                                                                {hist.result}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            )}
                                        </Paper>
                                    </Stack>
                                </Grid>
                            </Grid>
                        )}

                        {hasSearched && !searchResult && !loading && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 5,
                                    textAlign: "center",
                                    borderRadius: 4,
                                    bgcolor: "#FFFFFF",
                                    border: "1.5px dashed #F59E0B"
                                }}
                            >
                                <Typography variant="h6" fontWeight={800} color="#B45309" mb={1}>
                                    Không tìm thấy hồ sơ hoặc phiếu khám tương ứng
                                </Typography>
                                <Typography variant="body2" color="#64748B" maxWidth={500} mx="auto">
                                    Không có dữ liệu nào khớp với từ khóa "<b>{searchKeyword}</b>". Vui lòng kiểm tra lại Số điện thoại, Số định danh CCCD hoặc Mã phiếu hẹn (BK...).
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                )}

                {/* TAB 1: SƠ ĐỒ CHỈ DẪN KHOA PHÒNG & CHỈ ĐƯỜNG ĐI */}
                {activeTab === 1 && (
                    <Box>
                        {/* Floor Navigation Pills & Search Bar */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                mb: 3.5,
                                borderRadius: 3.5,
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)"
                            }}
                        >
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={7}>
                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mr={0.5}>
                                            Chọn tầng:
                                        </Typography>
                                        {["ALL", "1", "2", "3", "4"].map((fl) => (
                                            <Button
                                                key={fl}
                                                variant={selectedFloor === fl ? "contained" : "outlined"}
                                                size="small"
                                                onClick={() => setSelectedFloor(fl)}
                                                sx={{
                                                    borderRadius: 2,
                                                    fontWeight: 700,
                                                    textTransform: "none",
                                                    fontSize: "0.82rem",
                                                    px: 1.8,
                                                    py: 0.6,
                                                    bgcolor: selectedFloor === fl ? "#0088D6" : "transparent",
                                                    color: selectedFloor === fl ? "white" : "#475569",
                                                    borderColor: selectedFloor === fl ? "#0088D6" : "rgba(15, 23, 42, 0.15)",
                                                    "&:hover": {
                                                        bgcolor: selectedFloor === fl ? "#0073B7" : "rgba(15, 23, 42, 0.04)"
                                                    }
                                                }}
                                            >
                                                {fl === "ALL" ? "Tất Cả Tầng" : `Tầng ${fl}`}
                                            </Button>
                                        ))}
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={5}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Tìm theo tên phòng, khoa (101, Cấp cứu, X-quang)..."
                                        value={roomSearch}
                                        onChange={(e) => setRoomSearch(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon fontSize="small" sx={{ color: "#94A3B8" }} />
                                                </InputAdornment>
                                            ),
                                            sx: { borderRadius: 2, bgcolor: "#F8FAFC" }
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Route Guide Box if generated */}
                        {routeGuide && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    mb: 3.5,
                                    borderRadius: 3.5,
                                    bgcolor: "#ECFDF5",
                                    border: "1.5px solid #10B981",
                                    boxShadow: "0 8px 30px rgba(16, 185, 129, 0.1)"
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: "10px",
                                                bgcolor: "#10B981",
                                                color: "white",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            <RouteIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={800} color="#065F46">
                                                Lộ Trình Chỉ Dẫn: {routeGuide.targetRoom}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#047857", fontWeight: 600 }}>
                                                Ước tính khoảng cách: {routeGuide.distance}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="inherit"
                                        onClick={() => setRouteGuide(null)}
                                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                                    >
                                        Đóng Lộ Trình
                                    </Button>
                                </Box>

                                <Divider sx={{ my: 1.5, borderColor: "rgba(16, 185, 129, 0.2)" }} />

                                <Stack spacing={1}>
                                    {routeGuide.steps.map((step, sIdx) => (
                                        <Box key={sIdx} display="flex" alignItems="flex-start" gap={1.5}>
                                            <Box
                                                sx={{
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: 999,
                                                    bgcolor: "#059669",
                                                    color: "white",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 800,
                                                    flexShrink: 0,
                                                    mt: 0.2
                                                }}
                                            >
                                                {sIdx + 1}
                                            </Box>
                                            <Typography variant="body2" sx={{ color: "#065F46", fontWeight: 600 }}>
                                                {step}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Paper>
                        )}

                        {/* Room Grid */}
                        {loadingRooms ? (
                            <Box textAlign="center" py={6}>
                                <CircularProgress size={36} sx={{ color: "#0088D6" }} />
                                <Typography variant="body2" sx={{ color: "#64748B", mt: 2, fontWeight: 600 }}>
                                    Đang tải sơ đồ các buồng phòng bệnh viện...
                                </Typography>
                            </Box>
                        ) : filteredRooms.length === 0 ? (
                            <Paper elevation={0} sx={{ p: 5, borderRadius: 3.5, border: "1.5px dashed rgba(15, 23, 42, 0.15)", textAlign: "center" }}>
                                <Typography variant="body2" color="#64748B" fontWeight={600}>
                                    Không tìm thấy buồng phòng nào phù hợp với bộ lọc hiện tại.
                                </Typography>
                            </Paper>
                        ) : (
                            <Grid container spacing={2.5}>
                                {filteredRooms.map((room) => {
                                    const floor = room.floor || (room.roomId ? Math.floor(room.roomId / 100) : 1);
                                    const isSelected = toRoom === room.roomName;
                                    return (
                                        <Grid item xs={12} sm={6} md={4} key={room.roomId}>
                                            <Card
                                                elevation={0}
                                                sx={{
                                                    borderRadius: 3,
                                                    border: isSelected ? "2px solid #10B981" : "1px solid rgba(15, 23, 42, 0.08)",
                                                    bgcolor: isSelected ? "#F0FDF4" : "#FFFFFF",
                                                    height: "100%",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    justifyContent: "space-between",
                                                    transition: "0.2s ease",
                                                    boxShadow: isSelected ? "0 8px 24px rgba(16, 185, 129, 0.15)" : "0 2px 10px rgba(15, 23, 42, 0.02)",
                                                    "&:hover": {
                                                        borderColor: "#0088D6",
                                                        transform: "translateY(-3px)",
                                                        boxShadow: "0 8px 25px rgba(0, 136, 214, 0.1)"
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: 2.5 }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                                        <Chip
                                                            label={`TẦNG ${floor}`}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 800,
                                                                fontSize: "0.7rem",
                                                                height: 22,
                                                                bgcolor: floor === 1 ? "rgba(239, 68, 68, 0.1)" : floor === 2 ? "rgba(0, 136, 214, 0.1)" : floor === 3 ? "rgba(168, 85, 247, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                                                color: floor === 1 ? "#DC2626" : floor === 2 ? "#0088D6" : floor === 3 ? "#9333EA" : "#059669"
                                                            }}
                                                        />
                                                        <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#64748B" }}>
                                                            Phòng #{room.roomId}
                                                        </Typography>
                                                    </Box>

                                                    <Typography variant="subtitle1" fontWeight={800} color="#0F172A" mb={0.5} lineHeight={1.3}>
                                                        {room.roomName}
                                                    </Typography>

                                                    <Typography variant="caption" sx={{ color: "#0088D6", fontWeight: 700, display: "block", mb: 2 }}>
                                                        {room.departmentName || "Khoa Khám Bệnh"}
                                                    </Typography>

                                                    <Button
                                                        fullWidth
                                                        size="small"
                                                        variant={isSelected ? "contained" : "outlined"}
                                                        startIcon={<DirectionsWalkIcon />}
                                                        onClick={() => handleGenerateRoute(room)}
                                                        sx={{
                                                            borderRadius: 2,
                                                            textTransform: "none",
                                                            fontSize: "0.8rem",
                                                            fontWeight: 700,
                                                            py: 0.6,
                                                            bgcolor: isSelected ? "#10B981" : "transparent",
                                                            color: isSelected ? "white" : "#0088D6",
                                                            borderColor: isSelected ? "#10B981" : "rgba(0, 136, 214, 0.3)",
                                                            "&:hover": {
                                                                bgcolor: isSelected ? "#059669" : "rgba(0, 136, 214, 0.05)",
                                                                borderColor: "#0088D6"
                                                            }
                                                        }}
                                                    >
                                                        {isSelected ? "Đang Chọn Phòng Này" : "Chỉ Đường Đi"}
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        )}
                    </Box>
                )}

                {/* TAB 2: QUY TRÌNH KHÁM BỆNH & BHYT */}
                {activeTab === 2 && (
                    <Box maxWidth={860} mx="auto">
                        <Box textAlign="center" mb={4}>
                            <Typography variant="h5" fontWeight={800} color="#0F172A" mb={0.5}>
                                Hướng Dẫn Quy Trình Khám Bệnh Chuẩn Y Khoa
                            </Typography>
                            <Typography variant="body2" color="#64748B">
                                5 bước đơn giản giúp quý khách tiết kiệm 60% thời gian chờ đợi tại Bệnh viện TNT
                            </Typography>
                        </Box>

                        <Stack spacing={2}>
                            {[
                                {
                                    step: "01",
                                    title: "Đặt hẹn Online hoặc Bấm lấy số tại Cây Kiosk sảnh",
                                    desc: "Người bệnh có thể đặt lịch trước trên website để chọn Bác sĩ và khung giờ mong muốn, hoặc đến trực tiếp sảnh bệnh viện chạm vào Cây Kiosk cảm ứng để nhận phiếu STT và mã QR tức thì.",
                                    tip: "Mẹo hay: Đặt hẹn trước sẽ được ưu tiên vào khám đúng khung giờ, giảm thiểu thời gian chờ sảnh."
                                },
                                {
                                    step: "02",
                                    title: "Chờ gọi số tại sảnh & Theo dõi Màn hình LED TV",
                                    desc: "Ngồi tại khu vực sảnh chờ rộng rãi, hệ thống loa thông minh AI và Màn hình LED TV sẽ tự động phát âm thanh chuông ding-dong và gọi tên người bệnh vào đúng buồng khám của Bác sĩ.",
                                    tip: "Quý khách có thể xem số thứ tự đang khám trực tiếp trên điện thoại qua cổng tra cứu này."
                                },
                                {
                                    step: "03",
                                    title: "Khám lâm sàng & Thực hiện cận lâm sàng (nếu có)",
                                    desc: "Bác sĩ thăm khám, nếu có chỉ định xét nghiệm hoặc chụp X-quang/Siêu âm, người bệnh di chuyển lên Tầng 4. Kết quả sẽ được Kỹ thuật viên đồng bộ điện tử trực tiếp về máy Bác sĩ mà không cần chờ cầm giấy kết quả.",
                                    tip: "Thời gian trả kết quả xét nghiệm tự động thông báo qua màn hình chờ khám."
                                },
                                {
                                    step: "04",
                                    title: "Nhận chẩn đoán & Toa thuốc điện tử",
                                    desc: "Bác sĩ đưa ra kết luận chẩn đoán, tư vấn phác đồ và xuất đơn thuốc điện tử. Đơn thuốc được tự động chuyển đến Nhà thuốc bệnh viện.",
                                    tip: "Toa thuốc điện tử được lưu vĩnh viễn trong tài khoản sức khỏe cá nhân của quý khách."
                                },
                                {
                                    step: "05",
                                    title: "Thanh toán viện phí & Nhận thuốc",
                                    desc: "Người bệnh đến Quầy Thu ngân tầng 1 thanh toán viện phí bằng Tiền mặt hoặc Quét mã Cổng PayOS (VietQR Napas 247), sau đó nhận thuốc tại quầy Dược và ra về.",
                                    tip: "Quý khách cũng có thể nạp sẵn tiền vào Ví Viện Phí để trừ tiền tự động 0 giây."
                                }
                            ].map((item, idx) => (
                                <Accordion
                                    key={idx}
                                    defaultExpanded={idx === 0}
                                    sx={{
                                        borderRadius: "16px !important",
                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                                        "&:before": { display: "none" },
                                        overflow: "hidden"
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ExpandMoreIcon sx={{ color: "#0088D6" }} />}
                                        sx={{ px: 3, py: 1 }}
                                    >
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Box
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: "10px",
                                                    bgcolor: "rgba(0, 136, 214, 0.09)",
                                                    color: "#0088D6",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 800,
                                                    fontFamily: "monospace",
                                                    fontSize: "0.95rem"
                                                }}
                                            >
                                                {item.step}
                                            </Box>
                                            <Typography variant="subtitle1" fontWeight={800} color="#0F172A">
                                                {item.title}
                                            </Typography>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ px: 3, pt: 0, pb: 2.5 }}>
                                        <Typography variant="body2" sx={{ color: "#475569", lineHeight: 1.6, mb: 1.5 }}>
                                            {item.desc}
                                        </Typography>
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor: "#F0FDF4",
                                                border: "1px solid #BBF7D0",
                                                color: "#166534",
                                                fontSize: "0.82rem",
                                                fontWeight: 600
                                            }}
                                        >
                                            💡 {item.tip}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Container>
        </Box>
    );
}
