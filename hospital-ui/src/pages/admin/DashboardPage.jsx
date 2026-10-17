import React, { useState, useEffect } from "react";
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Alert,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    LinearProgress,
    Stack,
    TextField,
    MenuItem,
    Avatar,
    Tooltip
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PrintIcon from "@mui/icons-material/Print";
import HotelIcon from "@mui/icons-material/Hotel";
import ScienceIcon from "@mui/icons-material/Science";
import MedicationIcon from "@mui/icons-material/Medication";
import StarIcon from "@mui/icons-material/Star";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import TimerIcon from "@mui/icons-material/Timer";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SecurityIcon from "@mui/icons-material/Security";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

export default function DashboardPage() {
    const [timeRange, setTimeRange] = useState("TODAY"); // TODAY, WEEK, MONTH, YEAR
    const [kpiRevenue, setKpiRevenue] = useState(null);
    const [roomCapacity, setRoomCapacity] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingKpi, setLoadingKpi] = useState(true);

    const [stats, setStats] = useState({
        totalPatients: 1450,
        totalDoctors: 48,
        totalBookingsToday: 128,
        totalCompletedExams: 112,
        totalRevenue: 285400000,
        inpatientOccupancyRate: 78.5, // %

        // Thống kê Thời gian Chờ Khám & Hiệu Suất Phân Luồng (Wait-Time Analytics)
        waitTimeMetrics: {
            avgWaitTimeMinutes: 14.5,
            avgExamDurationMinutes: 18.2,
            avgLabTurnaroundMinutes: 25.6,
            avgPharmacyMinutes: 6.4,
            totalJourneyMinutes: 64.7,
            targetWaitTimeMinutes: 20.0,
            onTimeRate: 91.8
        },

        departmentWaitTimes: [
            { departmentName: "Khoa Khám Bệnh Đa Khoa", waitingCount: 14, avgWaitMin: 12.0, status: "GOOD", load: "Bình thường" },
            { departmentName: "Khoa Nội Tim Mạch", waitingCount: 19, avgWaitMin: 18.5, status: "GOOD", load: "Bình thường" },
            { departmentName: "Khoa Nhi & Sơ Sinh", waitingCount: 24, avgWaitMin: 23.0, status: "WARNING", load: "Tải cao (Cần tăng cường BS)" },
            { departmentName: "Khoa Ngoại Tổng Hợp", waitingCount: 8, avgWaitMin: 10.5, status: "GOOD", load: "Thoáng" },
            { departmentName: "Khoa Chẩn Đoán Hình Ảnh (X-Quang/CT)", waitingCount: 31, avgWaitMin: 26.0, status: "WARNING", load: "Tải cao" },
            { departmentName: "Khoa Tai Mũi Họng", waitingCount: 11, avgWaitMin: 13.2, status: "GOOD", load: "Bình thường" }
        ],

        revenueStructure: [
            { category: "Tiền khám chuyên khoa", amount: 65000000, percent: 23, color: "#0284C7" },
            { category: "Xét nghiệm & Cận lâm sàng", amount: 98400000, percent: 34, color: "#0D9488" },
            { category: "Kho dược & Đơn thuốc", amount: 72000000, percent: 25, color: "#EA580C" },
            { category: "Viện phí giường nội trú", amount: 50000000, percent: 18, color: "#8B5CF6" },
        ],
        departmentRevenues: [
            { departmentName: "Khoa Nội Tim Mạch", examsCount: 420, revenue: 78500000, color: "#0284C7" },
            { departmentName: "Khoa Chẩn Đoán Hình Ảnh & CLS", examsCount: 680, revenue: 64200000, color: "#0D9488" },
            { departmentName: "Khoa Ngoại Tổng Hợp & Phẫu Thuật", examsCount: 290, revenue: 58900000, color: "#8B5CF6" },
            { departmentName: "Khoa Khám Bệnh Đa Khoa", examsCount: 550, revenue: 45000000, color: "#16A34A" },
            { departmentName: "Khoa Nhi & Sơ Sinh", examsCount: 310, revenue: 26800000, color: "#F59E0B" },
            { departmentName: "Khoa Tai Mũi Họng", examsCount: 240, revenue: 12000000, color: "#EC4899" },
        ],
        topDoctors: [
            { doctorName: "PGS. TS Nguyễn Văn Minh", departmentName: "Khoa Ngoại Tổng Hợp", examCount: 142, rating: 4.9, satisfactionRate: 99 },
            { doctorName: "BS. CKI Trần Đình Trọng", departmentName: "Khoa Nội Tim Mạch", examCount: 135, rating: 4.8, satisfactionRate: 98 },
            { doctorName: "BS. CKII Lê Hoàng Mai", departmentName: "Khoa Tai Mũi Họng", examCount: 118, rating: 4.8, satisfactionRate: 97 },
            { doctorName: "ThS. BS Phạm Hải Yến", departmentName: "Khoa Nhi", examCount: 105, rating: 4.9, satisfactionRate: 99 },
        ]
    });

    const loadDashboardData = async () => {
        setLoadingKpi(true);
        try {
            const [utilRes, kpiRevRes, roomCapRes, auditRes] = await Promise.allSettled([
                axiosInstance.get("/api/utilities/admin/dashboard"),
                axiosInstance.get("/api/admin/dashboard/kpi-revenue"),
                axiosInstance.get("/api/admin/dashboard/room-capacity"),
                axiosInstance.get("/api/admin/audit-logs")
            ]);

            const extractData = (resVal) => {
                if (!resVal) return null;
                const d = resVal.data !== undefined ? resVal.data : resVal;
                return (d && d.data !== undefined) ? d.data : d;
            };

            if (utilRes.status === "fulfilled" && utilRes.value) {
                const d = extractData(utilRes.value);
                if (d) setStats(prev => ({ ...prev, ...d }));
            }
            if (kpiRevRes.status === "fulfilled" && kpiRevRes.value) {
                const d = extractData(kpiRevRes.value);
                if (d) setKpiRevenue(d);
            }
            if (roomCapRes.status === "fulfilled" && roomCapRes.value) {
                const d = extractData(roomCapRes.value);
                if (d) setRoomCapacity(d);
            }
            if (auditRes.status === "fulfilled" && auditRes.value) {
                const d = extractData(auditRes.value);
                if (d) setAuditLogs(d);
            }
        } catch (err) {
            console.error("Lỗi nạp Dashboard:", err);
        } finally {
            setLoadingKpi(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [timeRange]);

    const roomList = roomCapacity?.rooms || roomCapacity?.roomDetails || [];
    const totalWaitingBN = roomList.reduce((acc, r) => acc + (r.waitingCount || 0), 0) || roomCapacity?.totalPatientsWaiting || 0;
    const totalExaminingBN = roomList.reduce((acc, r) => acc + (r.examiningCount || 0), 0) || roomCapacity?.totalPatientsExamining || 0;

    const statCards = [
        {
            title: "Tổng Doanh Thu Thực Tế (KPI)",
            value: kpiRevenue ? formatCurrency(kpiRevenue.totalRevenue) : formatCurrency(stats.totalRevenue),
            subtext: kpiRevenue ? `Đã quyết toán ${kpiRevenue.totalTransactions ?? kpiRevenue.totalCompletedInvoices ?? 0} giao dịch` : "Đạt 105% chỉ tiêu",
            icon: <MonetizationOnIcon fontSize="large" />,
            color: "#16A34A"
        },
        {
            title: "Tỷ Lệ Hoàn Tất Khám",
            value: kpiRevenue ? `${kpiRevenue.completionRate ?? 0}%` : "88.4%",
            subtext: kpiRevenue ? `Hủy/vắng: ${kpiRevenue.cancelledAppointments ?? kpiRevenue.totalCanceledAppointments ?? 0} ca (${kpiRevenue.cancellationRate ?? 0}%)` : "Tỷ lệ xử lý cao",
            icon: <CheckCircleIcon fontSize="large" />,
            color: "#0284C7"
        },
        {
            title: "Công Suất Buồng Khám (Real-time)",
            value: roomCapacity ? `${roomCapacity.overallUtilizationRate ?? roomCapacity.occupancyRate ?? 0}%` : "75.0%",
            subtext: roomCapacity ? `${roomCapacity.activeRooms || 0}/${roomCapacity.totalRooms ?? roomCapacity.totalExamRooms ?? 0} buồng đang khám` : "Tải ổn định",
            icon: <MeetingRoomIcon fontSize="large" />,
            color: ((roomCapacity?.overallUtilizationRate ?? 0) > 80 || roomCapacity?.utilizationStatus === "HEAVY") ? "#DC2626" : "#EA580C"
        },
        {
            title: "Bệnh Nhân Đang Chờ Khám",
            value: roomCapacity ? `${totalWaitingBN} người` : "14 người",
            subtext: roomCapacity ? `${totalExaminingBN} ca đang ngồi ghế khám` : "Luồng phân bổ nhịp nhàng",
            icon: <PeopleIcon fontSize="large" />,
            color: "#8B5CF6"
        },
    ];

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                        📊 Dashboard & Phân Tích Hiệu Suất Toàn Viện
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Giám sát thời gian chờ khám, công suất buồng bệnh, cơ cấu doanh thu & chất lượng phục vụ
                    </Typography>
                </Box>
                <Box display="flex" gap={1.5}>
                    <TextField
                        select
                        size="small"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        sx={{ minWidth: 160, bgcolor: "white" }}
                    >
                        <MenuItem value="TODAY">Hôm nay</MenuItem>
                        <MenuItem value="WEEK">Tuần này</MenuItem>
                        <MenuItem value="MONTH">Tháng này</MenuItem>
                        <MenuItem value="YEAR">Năm 2026</MenuItem>
                    </TextField>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
                        Làm mới
                    </Button>
                </Box>
            </Box>

            {/* Hàng 1: Thẻ thống kê tổng quan */}
            <Grid container spacing={3} mb={3}>
                {statCards.map((c, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Card sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderLeft: `5px solid ${c.color}` }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="body2" color="textSecondary" fontWeight="bold">
                                        {c.title}
                                    </Typography>
                                    <Box sx={{ color: c.color }}>{c.icon}</Box>
                                </Box>
                                <Typography variant="h4" fontWeight="bold" color="#0F172A">
                                    {c.value}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: "block" }}>
                                    {c.subtext}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* KHỐI MỚI: PHÂN TÍCH THỜI GIAN CHỜ KHÁM & HIỆU SUẤT PHÂN LUỒNG BUỒNG BỆNH */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 3, border: "1px solid #E2E8F0", borderTop: "4px solid #0088D6", boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <AccessTimeIcon color="primary" sx={{ fontSize: 30 }} />
                        <Box>
                            <Typography variant="h6" fontWeight="bold" color="#0F172A">
                                ⏱️ Đo Lường Thời Gian Chờ Khám & Hành Trình Người Bệnh (Wait-Time Analytics)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Dữ liệu tính từ lúc Cấp số thứ tự sảnh chờ ➔ Bàn khám Bác sĩ ➔ Trả KQ Xét nghiệm ➔ Lĩnh thuốc tại quầy
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: "16px !important", color: "#fff !important" }} />}
                        label={`Đạt chuẩn phục vụ: ${stats.waitTimeMetrics.onTimeRate}%`}
                        color="success"
                        sx={{ fontWeight: "bold" }}
                    />
                </Box>

                {/* 4 Chỉ số khâu thời gian */}
                <Grid container spacing={2.5} mb={3}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "#F0F9FF", borderColor: "#BAE6FD" }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block">
                                1. Thời gian chờ vào buồng khám
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main" my={0.5}>
                                {stats.waitTimeMetrics.avgWaitTimeMinutes} <span style={{ fontSize: "1rem" }}>phút</span>
                            </Typography>
                            <Typography variant="caption" color="success.dark" fontWeight="bold">
                                ✓ Mục tiêu &lt; {stats.waitTimeMetrics.targetWaitTimeMinutes}p (Đạt chuẩn xanh)
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "#F8FAFC" }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block">
                                2. Thời gian khám & tư vấn
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="text.primary" my={0.5}>
                                {stats.waitTimeMetrics.avgExamDurationMinutes} <span style={{ fontSize: "1rem" }}>phút</span>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Bác sĩ thăm khám lâm sàng kỹ lưỡng
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "#FEFCE8", borderColor: "#FEF08A" }}>
                            <Typography variant="caption" color="warning.dark" fontWeight="bold" display="block">
                                3. Thời gian trả kết quả CLS / X-Quang
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="warning.main" my={0.5}>
                                {stats.waitTimeMetrics.avgLabTurnaroundMinutes} <span style={{ fontSize: "1rem" }}>phút</span>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Chụp chiếu, xét nghiệm & đọc kết quả
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "#F0FDF4", borderColor: "#BBF7D0" }}>
                            <Typography variant="caption" color="success.dark" fontWeight="bold" display="block">
                                4. Tổng hành trình khám ngoại trú
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="success.main" my={0.5}>
                                {stats.waitTimeMetrics.totalJourneyMinutes} <span style={{ fontSize: "1rem" }}>phút</span>
                            </Typography>
                            <Typography variant="caption" color="success.dark" fontWeight="bold">
                                Tiêu chuẩn BV Thông minh (&lt; 90 phút)
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Bảng phân tích thời gian chờ theo Chuyên khoa */}
                <Typography variant="subtitle2" fontWeight="bold" color="#0F172A" mb={1.5}>
                    📊 Chi Tiết Thời Gian Chờ & Mức Độ Tải Từng Buồng Khám (Real-time Flow)
                </Typography>
                <TableContainer variant="outlined" component={Paper} sx={{ borderRadius: 2 }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell><b>Chuyên khoa / Buồng khám</b></TableCell>
                                <TableCell align="center"><b>Bệnh nhân đang chờ</b></TableCell>
                                <TableCell align="center"><b>Thời gian chờ TB</b></TableCell>
                                <TableCell><b>Tiến độ đối chiếu mục tiêu (20 phút)</b></TableCell>
                                <TableCell align="center"><b>Trạng thái tải</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {stats.departmentWaitTimes.map((row, idx) => {
                                const percent = Math.min((row.avgWaitMin / 30) * 100, 100);
                                const isWarning = row.status === "WARNING";
                                return (
                                    <TableRow key={idx} hover sx={{ bgcolor: isWarning ? "#FFFBEB" : "inherit" }}>
                                        <TableCell><b>{row.departmentName}</b></TableCell>
                                        <TableCell align="center">
                                            <Chip label={`${row.waitingCount} người`} size="small" color={row.waitingCount > 20 ? "warning" : "default"} />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography variant="body2" fontWeight="bold" color={isWarning ? "warning.main" : "success.main"}>
                                                {row.avgWaitMin} phút
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 200 }}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={percent}
                                                    sx={{
                                                        flexGrow: 1,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        bgcolor: "#E2E8F0",
                                                        "& .MuiLinearProgress-bar": { bgcolor: isWarning ? "#F59E0B" : "#10B981" }
                                                    }}
                                                />
                                                <Typography variant="caption">{Math.round(percent)}%</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={row.load}
                                                size="small"
                                                color={isWarning ? "warning" : "success"}
                                                variant={isWarning ? "filled" : "outlined"}
                                                sx={{ fontWeight: "bold" }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Hàng 2: Biểu đồ doanh thu theo khoa & cơ cấu nguồn thu */}
            <Grid container spacing={3} mb={3}>
                {/* Doanh thu theo chuyên khoa */}
                <Grid item xs={12} md={7}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", height: "100%" }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight="bold" color="#0F172A">
                                🏥 Doanh Thu Theo Chuyên Khoa Khám
                            </Typography>
                            <Chip label="Đơn vị: VNĐ" size="small" variant="outlined" />
                        </Box>

                        <Stack spacing={2.5}>
                            {stats.departmentRevenues.map((dept, idx) => {
                                const maxRev = 80000000;
                                const percent = Math.min((dept.revenue / maxRev) * 100, 100);
                                return (
                                    <Box key={idx}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                            <Typography variant="body2" fontWeight="bold">
                                                {dept.departmentName} ({dept.examsCount} lượt khám)
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold" sx={{ color: dept.color }}>
                                                {formatCurrency(dept.revenue)}
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={percent}
                                            sx={{
                                                height: 10,
                                                borderRadius: 5,
                                                bgcolor: "#F1F5F9",
                                                "& .MuiLinearProgress-bar": { bgcolor: dept.color, borderRadius: 5 }
                                            }}
                                        />
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid>

                {/* Cơ cấu nguồn thu viện phí */}
                <Grid item xs={12} md={5}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", height: "100%" }}>
                        <Typography variant="h6" fontWeight="bold" color="#0F172A" mb={2}>
                            🥧 Cơ Cấu Nguồn Thu Viện Phí
                        </Typography>

                        <Stack spacing={2} mb={3}>
                            {stats.revenueStructure.map((item, idx) => (
                                <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderLeft: `5px solid ${item.color}` }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">{item.category}</Typography>
                                            <Typography variant="caption" color="text.secondary">{item.percent}% tổng doanh thu</Typography>
                                        </Box>
                                        <Typography variant="body1" fontWeight="bold" sx={{ color: item.color }}>
                                            {formatCurrency(item.amount)}
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>

                        <Alert severity="success" sx={{ borderRadius: 2 }}>
                            Doanh thu cận lâm sàng & xét nghiệm chiếm tỷ trọng cao nhất <b>(34%)</b>, phản ánh hiệu suất phân luồng y tế tối ưu.
                        </Alert>
                    </Paper>
                </Grid>
            </Grid>

            {/* Hàng 3: Bảng Xếp Hạng Năng Suất & Đánh Giá Bác Sĩ */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold" color="#0F172A">
                        ⭐ Bảng Xếp Hạng Năng Suất & Mức Độ Hài Lòng Bác Sĩ
                    </Typography>
                    <Chip label="Đánh giá từ người bệnh" size="small" color="warning" icon={<StarIcon />} />
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell><b>#</b></TableCell>
                                <TableCell><b>Bác sĩ điều trị</b></TableCell>
                                <TableCell><b>Chuyên khoa phụ trách</b></TableCell>
                                <TableCell align="center"><b>Số ca khám hoàn thành</b></TableCell>
                                <TableCell align="center"><b>Đánh giá trung bình</b></TableCell>
                                <TableCell align="right"><b>Tỷ lệ hài lòng (%)</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {stats.topDoctors.map((doc, idx) => (
                                <TableRow key={idx} hover>
                                    <TableCell>
                                        <Chip label={`#${idx + 1}`} size="small" color={idx === 0 ? "primary" : "default"} sx={{ fontWeight: "bold" }} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold" color="primary">
                                            {doc.doctorName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{doc.departmentName}</TableCell>
                                    <TableCell align="center"><b>{doc.examCount} ca</b></TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                            <StarIcon sx={{ color: "#F59E0B", fontSize: 18 }} />
                                            <Typography variant="body2" fontWeight="bold">{doc.rating} / 5.0</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip label={`${doc.satisfactionRate}%`} color="success" size="small" sx={{ fontWeight: "bold" }} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* HÀNG 4 (PHASE 4): DOANH THU THỰC TẾ THEO 6 KÊNH & CÔNG SUẤT BUỒNG KHÁM CHI TIẾT */}
            <Grid container spacing={3} my={1}>
                {/* 1. Doanh thu theo 6 kênh thanh toán */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <AccountBalanceWalletIcon color="success" />
                                <Typography variant="h6" fontWeight="bold" color="#0F172A">
                                    💳 Doanh Thu Thực Tế Theo 6 Kênh Thanh Toán
                                </Typography>
                            </Box>
                            <Chip
                                label={`Tổng: ${kpiRevenue ? formatCurrency(kpiRevenue.totalRevenue) : "0 VNĐ"}`}
                                color="success"
                                size="small"
                                sx={{ fontWeight: "bold" }}
                            />
                        </Box>
                        <Typography variant="body2" color="textSecondary" mb={2}>
                            Dữ liệu đối soát trực tiếp từ sổ cái giao dịch Payment (Hoàn tất: {kpiRevenue?.completionRate || 0}%)
                        </Typography>

                        <Stack spacing={2}>
                            {[
                                { name: "VietQR (Chuyển khoản động)", amount: kpiRevenue?.vietQrRevenue ?? kpiRevenue?.revenueByMethod?.vietQrRevenue ?? 0, color: "#0284C7", icon: <QrCode2Icon fontSize="small" /> },
                                { name: "Tiền mặt tại Quầy (COUNTER_CASH)", amount: kpiRevenue?.cashRevenue ?? kpiRevenue?.revenueByMethod?.counterCashRevenue ?? 0, color: "#16A34A", icon: <MonetizationOnIcon fontSize="small" /> },
                                { name: "Ví MoMo", amount: kpiRevenue?.momoRevenue ?? kpiRevenue?.revenueByMethod?.momoRevenue ?? 0, color: "#D81B60", icon: <AccountBalanceWalletIcon fontSize="small" /> },
                                { name: "Cổng VNPAY-QR", amount: kpiRevenue?.vnpayRevenue ?? kpiRevenue?.revenueByMethod?.vnpayRevenue ?? 0, color: "#EA580C", icon: <QrCode2Icon fontSize="small" /> },
                                { name: "Cà thẻ POS", amount: kpiRevenue?.posRevenue ?? kpiRevenue?.revenueByMethod?.posRevenue ?? 0, color: "#8B5CF6", icon: <PointOfSaleIcon fontSize="small" /> },
                                { name: "Ví nội bộ Bệnh viện", amount: kpiRevenue?.internalWalletRevenue ?? kpiRevenue?.revenueByMethod?.internalWalletRevenue ?? 0, color: "#0D9488", icon: <AccountBalanceWalletIcon fontSize="small" /> },
                            ].map((ch, idx) => {
                                const total = kpiRevenue?.totalRevenue || 1;
                                const pct = total > 0 ? Math.round((ch.amount / total) * 100) : 0;
                                return (
                                    <Box key={idx} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Box sx={{ color: ch.color }}>{ch.icon}</Box>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {ch.name}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" fontWeight="bold" sx={{ color: ch.color }}>
                                                {formatCurrency(ch.amount)} ({pct}%)
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={pct}
                                            sx={{
                                                height: 6,
                                                borderRadius: 3,
                                                bgcolor: "#E2E8F0",
                                                "& .MuiLinearProgress-bar": { bgcolor: ch.color }
                                            }}
                                        />
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid>

                {/* 2. Chi tiết buồng khám và trạng thái tải */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <MeetingRoomIcon color="primary" />
                                <Typography variant="h6" fontWeight="bold" color="#0F172A">
                                    🏥 Giám Sát Buồng Khám Thời Gian Thực
                                </Typography>
                            </Box>
                            <Chip
                                label={`Công suất: ${roomCapacity?.overallUtilizationRate ?? roomCapacity?.occupancyRate ?? 0}%`}
                                color={((roomCapacity?.overallUtilizationRate ?? 0) > 80 || roomCapacity?.utilizationStatus === "HEAVY") ? "error" : "primary"}
                                size="small"
                                sx={{ fontWeight: "bold" }}
                            />
                        </Box>
                        <Typography variant="body2" color="textSecondary" mb={2}>
                            Tổng {roomCapacity?.totalRooms ?? roomCapacity?.totalExamRooms ?? roomList.length} buồng khám ({roomCapacity?.activeRooms ?? roomList.filter(r => r.examiningCount > 0).length} buồng đang mở phiên)
                        </Typography>

                        <TableContainer sx={{ maxHeight: 380 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                                        <TableCell><b>Phòng</b></TableCell>
                                        <TableCell><b>Chuyên khoa</b></TableCell>
                                        <TableCell align="center"><b>Đang đợi</b></TableCell>
                                        <TableCell align="center"><b>Đang khám</b></TableCell>
                                        <TableCell align="center"><b>Trạng thái tải</b></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loadingKpi ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography variant="body2" color="textSecondary" py={2}>
                                                    Đang tải danh sách buồng khám...
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : roomList.length > 0 ? (
                                        roomList.map((rm, idx) => (
                                            <TableRow key={idx} hover>
                                                <TableCell><b>{rm.roomName || rm.roomNumber || `Phòng ${rm.roomId}`}</b></TableCell>
                                                <TableCell>{rm.departmentName || "Khoa khám"}</TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${rm.waitingCount ?? 0} BN`}
                                                        size="small"
                                                        color={(rm.waitingCount || 0) > 5 ? "warning" : "default"}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${rm.examiningCount ?? 0} BN`}
                                                        size="small"
                                                        color={(rm.examiningCount || 0) > 0 ? "success" : "default"}
                                                        variant={(rm.examiningCount || 0) > 0 ? "filled" : "outlined"}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={rm.loadLevel === "HEAVY" ? "QUÁ TẢI" : rm.loadLevel === "LIGHT" ? "THOÁNG" : (rm.examiningCount > 0 ? "ĐANG KHÁM" : "SẴN SÀNG")}
                                                        size="small"
                                                        color={rm.loadLevel === "HEAVY" ? "error" : (rm.examiningCount > 0 ? "primary" : "success")}
                                                        sx={{ fontWeight: "bold", fontSize: "0.7rem" }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography variant="body2" color="textSecondary" py={2}>
                                                    Chưa có buồng khám nào được ghi nhận hôm nay.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* HÀNG 5 (PHASE 4): NHẬT KÝ KIỂM TOÁN BẤT BIẾN (IMMUTABLE AUDIT LOGS - PII SANITIZED) */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", my: 3, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <SecurityIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold" color="#0F172A">
                            🛡️ Nhật Ký Kiểm Toán Toàn Viện (Immutable Audit Logs)
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Chip
                            label="Append-Only & Che Giấu PII"
                            color="info"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: "bold" }}
                        />
                        <Chip
                            label={`${auditLogs.length} sự kiện gần nhất`}
                            color="default"
                            size="small"
                        />
                    </Box>
                </Box>
                <Typography variant="body2" color="textSecondary" mb={2}>
                    Cơ chế ghi log giao dịch bất biến (`REQUIRES_NEW`), tự động lọc bỏ thông tin bảo mật (mật khẩu, token, OTP) theo chuẩn an toàn thông tin y tế.
                </Typography>

                <TableContainer sx={{ maxHeight: 360 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                                <TableCell><b>Thời gian</b></TableCell>
                                <TableCell><b>Hành động</b></TableCell>
                                <TableCell><b>Người thao tác</b></TableCell>
                                <TableCell><b>Vai trò</b></TableCell>
                                <TableCell><b>Thực thể / ID</b></TableCell>
                                <TableCell><b>Chi tiết (Sanitized)</b></TableCell>
                                <TableCell align="right"><b>Địa chỉ IP</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {auditLogs && auditLogs.length > 0 ? (
                                auditLogs.map((log) => (
                                    <TableRow key={log.auditId} hover>
                                        <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                                            {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "Vừa xong"}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={log.action}
                                                size="small"
                                                color={
                                                    log.action?.includes("DELETE") || log.action?.includes("CANCEL") ? "error" :
                                                    log.action?.includes("UPDATE") || log.action?.includes("PAY") ? "warning" :
                                                    log.action?.includes("CREATE") || log.action?.includes("CHECK_IN") ? "success" : "primary"
                                                }
                                                sx={{ fontWeight: "bold", fontSize: "0.7rem" }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "primary.main" }}>
                                            {log.actorUsername || "system"}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={log.actorRole || "N/A"} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <code>{log.targetEntity} #{log.targetId}</code>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            <Tooltip title={log.details || ""}>
                                                <span>{log.details || "Không có ghi chú"}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">
                                            <code>{log.ipAddress || "127.0.0.1"}</code>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Typography variant="body2" color="textSecondary" py={3}>
                                            Chưa ghi nhận sự kiện kiểm toán nào
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}
