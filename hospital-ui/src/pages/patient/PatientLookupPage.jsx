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
    CircularProgress
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
    const [fromPoint, setFromPoint] = useState("SANH_CHINH");
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
        if (!searchKeyword.trim()) {
            alert("Vui lòng nhập Số điện thoại hoặc Số CCCD!");
            return;
        }

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await axiosInstance.get(`/api/patient-profiles/lookup?keyword=${encodeURIComponent(searchKeyword)}`).catch(() => null);
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
                "1. Từ Cổng chính sảnh Bệnh viện TNT, đi thẳng qua cửa kiểm soát số 1.",
                `2. Rẽ vào hành lang Tầng 1 (Khu khám tiếp đón).`,
                `3. Đến trước cửa [${targetRoom.roomName}] (Vị trí phòng bên tay phải).`
            ];
        } else {
            steps = [
                "1. Từ Cổng chính sảnh Bệnh viện TNT, đi thẳng 15m đến Cụm Thang máy Trung tâm (Thang A & B).",
                `2. Bấm thang máy hoặc thang bộ lên TẦNG ${floor}.`,
                `3. Bước ra khỏi thang máy, rẽ theo bảng biển chỉ dẫn màu xanh về hướng [${targetRoom.departmentName}].`,
                `4. Di chuyển 20m đến trước cửa [${targetRoom.roomName}] (Phòng số ${targetRoom.roomId}).`
            ];
        }

        setRouteGuide({
            targetRoom: targetRoom.roomName,
            floor,
            distance: floor === 1 ? "30 mét (khoảng 1 phút đi bộ)" : `${floor * 25 + 20} mét (khoảng 2 phút đi thang máy)`,
            steps
        });
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

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Page Header */}
            <Box textAlign="center" mb={4}>
                <Typography variant="h4" fontWeight="800" color="primary.main" gutterBottom>
                    🔍 Tra Cứu Y Tế & Chỉ Dẫn Bệnh Viện TNT
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Tra cứu hồ sơ bệnh án cũ, xem phiếu đặt khám và sơ đồ chỉ dẫn buồng phòng thông minh
                </Typography>
            </Box>

            {/* Navigation Tabs */}
            <Paper elevation={0} sx={{ mb: 4, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "white", p: 0.5 }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, val) => setActiveTab(val)}
                    variant="fullWidth"
                    textColor="primary"
                    indicatorColor="primary"
                >
                    <Tab icon={<PersonSearchIcon />} iconPosition="start" label="Tra Cứu Hồ Sơ & Phiếu Khám" sx={{ fontWeight: "700", textTransform: "none", fontSize: "0.95rem" }} />
                    <Tab icon={<MapIcon />} iconPosition="start" label="Sơ Đồ Buồng Phòng & Chỉ Dẫn Đường Đi" sx={{ fontWeight: "700", textTransform: "none", fontSize: "0.95rem" }} />
                    <Tab icon={<HelpOutlineIcon />} iconPosition="start" label="Quy Trình & Hướng Dẫn Khám Bệnh" sx={{ fontWeight: "700", textTransform: "none", fontSize: "0.95rem" }} />
                </Tabs>
            </Paper>

            {/* TAB 0: TRA CỨU HỒ SƠ & PHIẾU KHÁM */}
            {activeTab === 0 && (
                <Box>
                    <Paper elevation={2} sx={{ p: 4, mb: 4, borderRadius: 3, bgcolor: "#F8FAFC" }}>
                        <Typography variant="h6" fontWeight="bold" color="#002D5A" mb={1}>
                            Nhập thông tin bệnh nhân cần tìm kiếm:
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={3}>
                            Hệ thống sẽ tự động quét thông tin hồ sơ, lượt hẹn khám hôm nay và lịch sử điều trị
                        </Typography>

                        <Box component="form" onSubmit={handleSearch} display="flex" gap={2} flexWrap="wrap">
                            <TextField
                                fullWidth
                                placeholder="Nhập Số điện thoại (ví dụ: 0912345678) hoặc Số CCCD/Định danh..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                sx={{ flexGrow: 1, bgcolor: "white" }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="primary" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                sx={{ px: 4, fontWeight: "bold", borderRadius: 2 }}
                                disabled={loading}
                            >
                                {loading ? "Đang tìm..." : "Tra Cứu"}
                            </Button>
                        </Box>
                    </Paper>

                    {hasSearched && searchResult && (
                        <Grid container spacing={3}>
                            {/* Thông tin bệnh nhân */}
                            <Grid item xs={12} md={5}>
                                <Paper elevation={2} sx={{ p: 3, borderRadius: 3, height: "100%", borderLeft: "6px solid #0066CC" }}>
                                    <Typography variant="h6" fontWeight="bold" color="primary.main" mb={2}>
                                        👤 Thông Tin Bệnh Nhân
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />

                                    <Box display="flex" justifyContent="space-between" mb={1.5}>
                                        <Typography variant="body2" color="text.secondary">Họ và tên:</Typography>
                                        <Typography variant="body1" fontWeight="bold">{searchResult.fullName}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" mb={1.5}>
                                        <Typography variant="body2" color="text.secondary">Số điện thoại:</Typography>
                                        <Typography variant="body1" fontWeight="bold">{searchResult.phoneNumber}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" mb={1.5}>
                                        <Typography variant="body2" color="text.secondary">Số CCCD / Định danh:</Typography>
                                        <Typography variant="body1">{searchResult.identityNumber || "Chưa cập nhật"}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" mb={1.5}>
                                        <Typography variant="body2" color="text.secondary">Mã thẻ BHYT:</Typography>
                                        <Typography variant="body1" color="primary" fontWeight="bold">{searchResult.healthInsuranceNumber || "Không có"}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" mb={1.5}>
                                        <Typography variant="body2" color="text.secondary">Ngày sinh:</Typography>
                                        <Typography variant="body1">{formatDate(searchResult.dateOfBirth)} ({searchResult.gender === "MALE" ? "Nam" : "Nữ"})</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" mb={1.5}>
                                        <Typography variant="body2" color="text.secondary">Địa chỉ:</Typography>
                                        <Typography variant="body2" textAlign="right">{searchResult.address || "Hà Nội"}</Typography>
                                    </Box>
                                </Paper>
                            </Grid>

                            {/* Phiếu khám gần nhất & Lịch sử */}
                            <Grid item xs={12} md={7}>
                                <Stack spacing={3}>
                                    {searchResult.latestBooking && (
                                        <Paper elevation={2} sx={{ p: 3, borderRadius: 3, borderLeft: "6px solid #16A34A", bgcolor: "#F0FDF4" }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="h6" fontWeight="bold" color="success.dark">
                                                    🎫 Phiếu Đặt Khám Gần Nhất
                                                </Typography>
                                                <Chip label="ĐÃ XÁC NHẬN" color="success" size="small" sx={{ fontWeight: "bold" }} />
                                            </Box>
                                            <Divider sx={{ my: 1.5 }} />

                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">MÃ TIẾP NHẬN:</Typography>
                                                    <Typography variant="h6" fontWeight="bold" color="primary.main">{searchResult.latestBooking.bookingCode}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">SỐ THỨ TỰ (STT):</Typography>
                                                    <Typography variant="h4" fontWeight="900" color="error.main">#{searchResult.latestBooking.queueNumber}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">CHUYÊN KHOA:</Typography>
                                                    <Typography variant="body2" fontWeight="bold">{searchResult.latestBooking.departmentName}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">BÁC SĨ PHỤ TRÁCH:</Typography>
                                                    <Typography variant="body2" fontWeight="bold">{searchResult.latestBooking.doctorName}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">BUỒNG KHÁM:</Typography>
                                                    <Typography variant="body2" fontWeight="bold" color="primary">{searchResult.latestBooking.roomName}</Typography>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" color="text.secondary">KHUNG GIỜ HẸN:</Typography>
                                                    <Typography variant="body2" fontWeight="bold">{searchResult.latestBooking.timeSlot} (Hôm nay)</Typography>
                                                </Grid>
                                            </Grid>
                                        </Paper>
                                    )}

                                    {/* Lịch sử khám */}
                                    <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                                        <Typography variant="h6" fontWeight="bold" color="#002D5A" mb={1.5}>
                                            📋 Lịch Sử Khám Bệnh Đã Qua
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            {searchResult.medicalHistory.map((hist, idx) => (
                                                <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                                                            📅 Ngày khám: {formatDate(hist.date)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">{hist.doctor}</Typography>
                                                    </Box>
                                                    <Typography variant="body2"><b>Chẩn đoán:</b> {hist.diagnosis}</Typography>
                                                    <Typography variant="caption" color="text.secondary"><b>Kết luận:</b> {hist.result}</Typography>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Paper>
                                </Stack>
                            </Grid>
                        </Grid>
                    )}

                    {hasSearched && !searchResult && !loading && (
                        <Paper elevation={1} sx={{ p: 4, textAlign: "center", borderRadius: 3, bgcolor: "#FFFBEB", border: "1px dashed #F59E0B" }}>
                            <Typography variant="h6" fontWeight="bold" color="#B45309" mb={1}>
                                ⚠️ Không tìm thấy hồ sơ bệnh nhân
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Không có hồ sơ bệnh nhân nào khớp với từ khóa "{searchKeyword}". Vui lòng kiểm tra lại số điện thoại (tối thiểu 9 chữ số) hoặc số CCCD chính xác.
                            </Typography>
                        </Paper>
                    )}
                </Box>
            )}

            {/* TAB 1: SƠ ĐỒ CHỈ DẪN KHOA PHÒNG & CHỈ ĐƯỜNG ĐI */}
            {activeTab === 1 && (
                <Box>
                    {/* Floor Selector & Filter */}
                    <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={7}>
                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                    <Typography variant="subtitle2" fontWeight="bold">Chọn tầng:</Typography>
                                    {["ALL", "1", "2", "3", "4"].map((fl) => (
                                        <Button
                                            key={fl}
                                            variant={selectedFloor === fl ? "contained" : "outlined"}
                                            size="small"
                                            onClick={() => setSelectedFloor(fl)}
                                            sx={{ borderRadius: 2, fontWeight: 700, minWidth: 60 }}
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
                                    placeholder="Tìm phòng, khoa, khu vực (ví dụ: 201, Cấp cứu, X-quang)..."
                                    value={roomSearch}
                                    onChange={(e) => setRoomSearch(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Route Guide Box if generated */}
                    {routeGuide && (
                        <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3, borderLeft: "6px solid #10B981", bgcolor: "#ECFDF5" }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="subtitle1" fontWeight="bold" color="success.dark" display="flex" alignItems="center" gap={1}>
                                    <DirectionsWalkIcon /> Hướng Dẫn Đường Đi Đến: <b>{routeGuide.targetRoom}</b>
                                </Typography>
                                <Chip label={`Khoảng cách: ${routeGuide.distance}`} size="small" color="success" sx={{ fontWeight: "bold" }} />
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <List dense disablePadding>
                                {routeGuide.steps.map((step, sIdx) => (
                                    <ListItem key={sIdx} sx={{ py: 0.5 }}>
                                        <ListItemText primary={<Typography variant="body2" color="#065F46" fontWeight={500}>{step}</Typography>} />
                                    </ListItem>
                                ))}
                            </List>
                        </Paper>
                    )}

                    {/* Room Grid */}
                    {loadingRooms ? (
                        <Box textAlign="center" py={6}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : filteredRooms.length === 0 ? (
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: "1px dashed #cbd5e1", textAlign: "center" }}>
                            <Typography variant="body2" color="text.secondary">Không tìm thấy phòng khám phù hợp.</Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={2}>
                            {filteredRooms.map((room) => {
                                const floor = room.floor || (room.roomId ? Math.floor(room.roomId / 100) : 1);
                                const isSelected = toRoom === room.roomName;
                                return (
                                    <Grid item xs={12} sm={6} md={4} key={room.roomId}>
                                        <Card
                                            elevation={1}
                                            sx={{
                                                borderRadius: 2.5,
                                                border: isSelected ? "2px solid #10B981" : "1px solid #E2E8F0",
                                                bgcolor: isSelected ? "#F0FDF4" : "white",
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "space-between",
                                                transition: "0.2s",
                                                "&:hover": { borderColor: "#0088D6", transform: "translateY(-2px)" }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2 }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                    <Chip
                                                        label={`TẦNG ${floor}`}
                                                        size="small"
                                                        color={floor === 1 ? "error" : floor === 2 ? "primary" : floor === 3 ? "secondary" : "success"}
                                                        sx={{ fontWeight: "bold", fontSize: "0.7rem", height: 20 }}
                                                    />
                                                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                                        Phòng #{room.roomId}
                                                    </Typography>
                                                </Box>

                                                <Typography variant="subtitle2" fontWeight="bold" color="#0F172A" mb={0.5}>
                                                    {room.roomName}
                                                </Typography>

                                                <Typography variant="caption" color="primary.main" fontWeight="600" display="block" mb={1.5}>
                                                    {room.departmentName || "Khoa Khám Bệnh"}
                                                </Typography>

                                                <Button
                                                    fullWidth
                                                    size="small"
                                                    variant={isSelected ? "contained" : "outlined"}
                                                    color={isSelected ? "success" : "primary"}
                                                    startIcon={<DirectionsWalkIcon fontSize="small" />}
                                                    onClick={() => handleGenerateRoute(room)}
                                                    sx={{ borderRadius: 1.5, textTransform: "none", fontSize: "0.75rem", py: 0.4 }}
                                                >
                                                    {isSelected ? "Đang Chọn Điểm Này" : "Chỉ Đường Đi"}
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
                <Box maxWidth={900} mx="auto">
                    <Typography variant="h5" fontWeight="bold" color="primary.main" mb={3} textAlign="center">
                        📋 Hướng Dẫn Quy Trình Khám Bệnh 5 Bước
                    </Typography>

                    <Accordion defaultExpanded sx={{ mb: 2, borderRadius: "12px !important", overflow: "hidden" }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                Bước 1: Đặt hẹn Online hoặc Bấm lấy số tại Cây Kiosk sảnh
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                Người bệnh có thể đặt lịch trước trên website để chọn Bác sĩ và khung giờ mong muốn, hoặc đến trực tiếp sảnh bệnh viện chạm vào <b>Cây Kiosk cảm ứng</b> để nhận phiếu STT và mã QR tức thì.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 2, borderRadius: "12px !important", overflow: "hidden" }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                Bước 2: Chờ gọi số tại sảnh & Theo dõi Màn hình LED TV
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                Ngồi tại khu vực sảnh chờ, hệ thống loa thông minh AI và Màn hình LED TV sẽ tự động phát âm thanh chuông ding-dong và gọi tên người bệnh vào đúng buồng khám của Bác sĩ.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 2, borderRadius: "12px !important", overflow: "hidden" }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                Bước 3: Khám lâm sàng & Thực hiện cận lâm sàng (nếu có)
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                Bác sĩ thăm khám, nếu có chỉ định xét nghiệm hoặc chụp X-quang/Siêu âm, người bệnh di chuyển lên <b>Tầng 4</b>. Kết quả sẽ được Kỹ thuật viên đồng bộ điện tử trực tiếp về máy Bác sĩ mà không cần chờ cầm giấy kết quả.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 2, borderRadius: "12px !important", overflow: "hidden" }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                Bước 4: Nhận chẩn đoán & Toa thuốc điện tử
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                Bác sĩ đưa ra kết luận chẩn đoán, tư vấn phác đồ và xuất đơn thuốc điện tử. Đơn thuốc được tự động chuyển đến Nhà thuốc bệnh viện.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 2, borderRadius: "12px !important", overflow: "hidden" }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle1" fontWeight="bold" color="primary">
                                Bước 5: Thanh toán tại Quầy thu ngân & Nhận thuốc
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary">
                                Người bệnh đến Quầy Thu ngân tầng 1 thanh toán viện phí bằng Tiền mặt hoặc Quét mã Cổng PayOS (VietQR Napas 247), sau đó nhận thuốc tại quầy Dược và ra về.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                </Box>
            )}
        </Container>
    );
}
