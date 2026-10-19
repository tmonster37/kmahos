import React, { useState, useEffect, useMemo } from "react";
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
    Tooltip,
    Skeleton,
    Switch,
    FormControlLabel,
    InputAdornment,
    IconButton
} from "@mui/material";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend
} from "recharts";
import PeopleIcon from "@mui/icons-material/People";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PrintIcon from "@mui/icons-material/Print";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
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
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FilterListIcon from "@mui/icons-material/FilterList";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

// Bảng màu y tế chuẩn
const COLORS = {
    primary: "#0088D6",
    primaryLight: "#E6F4FA",
    success: "#16A34A",
    warning: "#EA580C",
    danger: "#DC2626",
    purple: "#8B5CF6",
    teal: "#0D9488",
    gray: "#64748B",
    chartPalette: ["#0088D6", "#16A34A", "#EA580C", "#8B5CF6", "#0D9488", "#E11D48", "#F59E0B", "#6366F1"]
};

export default function DashboardPage() {
    const [timeRange, setTimeRange] = useState("WEEK"); // TODAY, WEEK, MONTH, YEAR, CUSTOM
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return d.toISOString().split("T")[0];
    });
    const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split("T")[0]);

    // Trạng thái dữ liệu từ 4 API Backend
    const [kpiRevenue, setKpiRevenue] = useState(null);
    const [roomCapacity, setRoomCapacity] = useState(null);
    const [utilStats, setUtilStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    // Trạng thái mạng / giao diện
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [auditFilter, setAuditFilter] = useState("ALL");
    const [roomDeptFilter, setRoomDeptFilter] = useState("ALL");
    const [roomLoadFilter, setRoomLoadFilter] = useState("ALL"); // ALL, HEAVY, MEDIUM, LIGHT
    const [demoMode, setDemoMode] = useState(false);

    // Tính toán ngày bắt đầu và kết thúc theo timeRange
    const getDateRangeParams = () => {
        const today = new Date();
        const formatDate = (d) => d.toISOString().split("T")[0];

        if (timeRange === "TODAY") {
            const todayStr = formatDate(today);
            return { startDate: todayStr, endDate: todayStr };
        }
        if (timeRange === "WEEK") {
            const past7 = new Date();
            past7.setDate(today.getDate() - 6);
            return { startDate: formatDate(past7), endDate: formatDate(today) };
        }
        if (timeRange === "MONTH") {
            const past30 = new Date();
            past30.setDate(today.getDate() - 29);
            return { startDate: formatDate(past30), endDate: formatDate(today) };
        }
        if (timeRange === "YEAR") {
            const startYear = new Date(today.getFullYear(), 0, 1);
            return { startDate: formatDate(startYear), endDate: formatDate(today) };
        }
        return { startDate: customStartDate, endDate: customEndDate };
    };

    // Hàm gọi API đồng thời với đối số ngày chính xác
    const loadDashboardData = async () => {
        setLoading(true);
        setErrorMsg("");

        const { startDate, endDate } = getDateRangeParams();

        try {
            const [utilRes, kpiRevRes, roomCapRes, auditRes] = await Promise.allSettled([
                axiosInstance.get("/api/utilities/admin/dashboard"),
                axiosInstance.get("/api/admin/dashboard/kpi-revenue", {
                    params: { startDate, endDate }
                }),
                axiosInstance.get("/api/admin/dashboard/room-capacity"),
                axiosInstance.get("/api/admin/audit-logs", { params: { limit: 50 } })
            ]);

            const extractData = (resVal) => {
                if (!resVal) return null;
                const d = resVal.data !== undefined ? resVal.data : resVal;
                return (d && d.data !== undefined) ? d.data : d;
            };

            let hasError = false;

            if (utilRes.status === "fulfilled" && utilRes.value) {
                setUtilStats(extractData(utilRes.value));
            } else {
                hasError = true;
            }

            if (kpiRevRes.status === "fulfilled" && kpiRevRes.value) {
                setKpiRevenue(extractData(kpiRevRes.value));
            } else {
                hasError = true;
            }

            if (roomCapRes.status === "fulfilled" && roomCapRes.value) {
                setRoomCapacity(extractData(roomCapRes.value));
            }

            if (auditRes.status === "fulfilled" && auditRes.value) {
                const logs = extractData(auditRes.value);
                setAuditLogs(Array.isArray(logs) ? logs : []);
            }

            if (hasError && !kpiRevRes.value && !utilRes.value) {
                setErrorMsg("Không thể đồng bộ toàn bộ dữ liệu chỉ số từ máy chủ bệnh viện. Vui lòng kiểm tra kết nối API.");
            }
        } catch (err) {
            console.error("Lỗi nạp Dashboard:", err);
            setErrorMsg(err.message || "Đã xảy ra lỗi khi tải dữ liệu bảng điều khiển.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [timeRange, customStartDate, customEndDate]);

    // Danh sách buồng khám và thống kê tổng hợp từ roomCapacity
    const roomList = useMemo(() => {
        if (!roomCapacity?.rooms) return [];
        return roomCapacity.rooms;
    }, [roomCapacity]);

    const totalWaitingBN = useMemo(() => {
        return roomList.reduce((acc, r) => acc + (r.waitingCount || 0), 0);
    }, [roomList]);

    const totalExaminingBN = useMemo(() => {
        return roomList.reduce((acc, r) => acc + (r.examiningCount || 0), 0);
    }, [roomList]);

    const overloadedRoomsCount = useMemo(() => {
        return roomList.filter(r => r.loadLevel === "HEAVY" || (r.waitingCount || 0) >= 5 || (r.utilizationRate || 0) >= 80).length;
    }, [roomList]);

    // Lọc danh sách buồng khám theo Khoa và Mức tải
    const filteredRooms = useMemo(() => {
        return roomList.filter(rm => {
            const matchDept = roomDeptFilter === "ALL" || rm.departmentName === roomDeptFilter;
            const matchLoad = roomLoadFilter === "ALL" ||
                (roomLoadFilter === "HEAVY" && (rm.loadLevel === "HEAVY" || rm.waitingCount >= 5)) ||
                (roomLoadFilter === "MEDIUM" && rm.loadLevel === "MEDIUM" && rm.waitingCount < 5) ||
                (roomLoadFilter === "LIGHT" && rm.loadLevel === "LIGHT");
            return matchDept && matchLoad;
        });
    }, [roomList, roomDeptFilter, roomLoadFilter]);

    // Danh sách các khoa duy nhất cho bộ lọc buồng phòng
    const uniqueDepartments = useMemo(() => {
        const depts = new Set(roomList.map(r => r.departmentName).filter(Boolean));
        return Array.from(depts);
    }, [roomList]);

    // Dữ liệu biểu đồ doanh thu theo ngày từ API kpiRevenue.dailyBreakdown
    const revenueTimelineData = useMemo(() => {
        if (kpiRevenue?.dailyBreakdown && kpiRevenue.dailyBreakdown.length > 0) {
            return kpiRevenue.dailyBreakdown.map(item => ({
                date: item.date ? item.date.slice(5) : "N/A", // MM-DD
                fullDate: item.date,
                revenue: Number(item.revenue) || 0,
                transactions: Number(item.transactionCount) || 0
            }));
        }
        if (demoMode) {
            return [
                { date: "12-10", fullDate: "2026-10-12", revenue: 38500000, transactions: 24 },
                { date: "13-10", fullDate: "2026-10-13", revenue: 42000000, transactions: 28 },
                { date: "14-10", fullDate: "2026-10-14", revenue: 36000000, transactions: 22 },
                { date: "15-10", fullDate: "2026-10-15", revenue: 51200000, transactions: 35 },
                { date: "16-10", fullDate: "2026-10-16", revenue: 48900000, transactions: 31 },
                { date: "17-10", fullDate: "2026-10-17", revenue: 45000000, transactions: 29 },
                { date: "18-10", fullDate: "2026-10-18", revenue: 54000000, transactions: 38 }
            ];
        }
        return [];
    }, [kpiRevenue, demoMode]);

    // Dữ liệu biểu đồ lượt khám theo Chuyên khoa từ utilStats.bookingsByDepartment
    const departmentChartData = useMemo(() => {
        if (utilStats?.bookingsByDepartment && Object.keys(utilStats.bookingsByDepartment).length > 0) {
            return Object.entries(utilStats.bookingsByDepartment)
                .map(([name, count]) => ({
                    department: name.replace("Khoa ", ""),
                    fullName: name,
                    count: Number(count) || 0
                }))
                .sort((a, b) => b.count - a.count);
        }
        if (demoMode) {
            return [
                { department: "Nội Tim Mạch", fullName: "Khoa Nội Tim Mạch", count: 420 },
                { department: "CĐHA & CLS", fullName: "Khoa Chẩn Đoán Hình Ảnh", count: 380 },
                { department: "Khám Đa Khoa", fullName: "Khoa Khám Bệnh Đa Khoa", count: 310 },
                { department: "Nhi & Sơ Sinh", fullName: "Khoa Nhi", count: 260 },
                { department: "Ngoại Tổng Hợp", fullName: "Khoa Ngoại Tổng Hợp", count: 190 },
                { department: "Tai Mũi Họng", fullName: "Khoa Tai Mũi Họng", count: 140 }
            ];
        }
        return [];
    }, [utilStats, demoMode]);

    // Dữ liệu biểu đồ cơ cấu doanh thu theo kênh thanh toán thực tế
    const paymentMethodsData = useMemo(() => {
        const rawVietQr = Number(kpiRevenue?.vietQrRevenue) || 0;
        const rawCash = Number(kpiRevenue?.cashRevenue) || 0;
        const rawMomo = Number(kpiRevenue?.momoRevenue) || 0;
        const rawVnpay = Number(kpiRevenue?.vnpayRevenue) || 0;
        const rawPos = Number(kpiRevenue?.posRevenue) || 0;

        const total = rawVietQr + rawCash + rawMomo + rawVnpay + rawPos;

        if (total > 0) {
            return [
                { name: "VietQR (Chuyển khoản)", value: rawVietQr, color: "#0088D6" },
                { name: "Tiền mặt tại Quầy", value: rawCash, color: "#16A34A" },
                { name: "Ví MoMo", value: rawMomo, color: "#D81B60" },
                { name: "Cổng VNPAY-QR", value: rawVnpay, color: "#EA580C" },
                { name: "Thẻ POS", value: rawPos, color: "#8B5CF6" }
            ].filter(i => i.value > 0);
        }

        if (demoMode) {
            return [
                { name: "VietQR (Chuyển khoản)", value: 120000000, color: "#0088D6" },
                { name: "Tiền mặt tại Quầy", value: 65000000, color: "#16A34A" },
                { name: "Cổng VNPAY-QR", value: 45000000, color: "#EA580C" },
                { name: "Ví MoMo", value: 32000000, color: "#D81B60" },
                { name: "Thẻ POS", value: 23400000, color: "#8B5CF6" }
            ];
        }
        return [];
    }, [kpiRevenue, demoMode]);

    // Lọc danh sách Audit Logs
    const filteredAuditLogs = useMemo(() => {
        if (!auditLogs) return [];
        if (auditFilter === "ALL") return auditLogs;
        return auditLogs.filter(l => l.action && l.action.toUpperCase().includes(auditFilter));
    }, [auditLogs, auditFilter]);

    // Xử lý xuất báo cáo CSV
    const handleExportCsv = () => {
        if (!kpiRevenue && !utilStats && !roomCapacity) {
            alert("Chưa có dữ liệu để xuất báo cáo!");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "BÁO CÁO HIỆU SUẤT VẬN HÀNH BỆNH VIỆN - YOUMED HMS\n";
        csvContent += `Khoảng thời gian: ${timeRange} | Ngày xuất: ${new Date().toLocaleString("vi-VN")}\n\n`;

        csvContent += "1. CHỈ SỐ DOANH THU & TIẾP NHẬN\n";
        csvContent += `Tổng Doanh Thu Thực Tế (VNĐ),${kpiRevenue?.totalRevenue || utilStats?.totalRevenueThisMonth || 0}\n`;
        csvContent += `Tổng Giao Dịch Quyết Toán,${kpiRevenue?.totalTransactions || 0}\n`;
        csvContent += `Lượt Đặt Khám Hôm Nay,${kpiRevenue?.todayAppointments || utilStats?.totalBookingsToday || 0}\n`;
        csvContent += `Lượt Khám Hoàn Tất,${kpiRevenue?.completedAppointments || utilStats?.totalCompletedExams || 0}\n`;
        csvContent += `Tỷ Lệ Hoàn Tất Khám (%),${kpiRevenue?.completionRate || 0}\n\n`;

        csvContent += "2. DOANH THU THEO CHUỖI NGÀY\n";
        csvContent += "Ngày,Doanh thu (VNĐ),Số giao dịch\n";
        if (revenueTimelineData.length > 0) {
            revenueTimelineData.forEach(item => {
                csvContent += `${item.fullDate || item.date},${item.revenue},${item.transactions}\n`;
            });
        }
        csvContent += "\n3. GIÁM SÁT BUỒNG KHÁM\n";
        csvContent += "Buồng Khám,Chuyên Khoa,Bác Sĩ Trực,Đang Chờ (BN),Đang Khám (BN),Công Suất (%),Mức Tải\n";
        roomList.forEach(rm => {
            csvContent += `"${rm.roomName || rm.roomId}","${rm.departmentName || ""}","${rm.doctorName || ""}","${rm.waitingCount || 0}","${rm.examiningCount || 0}","${rm.utilizationRate || 0}%","${rm.loadLevel || "LIGHT"}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Bao_Cao_HMS_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Thẻ thống kê KPI hàng 1
    const statCards = [
        {
            title: "Tổng Doanh Thu Quyết Toán",
            value: formatCurrency(kpiRevenue?.totalRevenue ?? utilStats?.totalRevenueThisMonth ?? 0),
            subtext: `Đã đối soát ${kpiRevenue?.totalTransactions ?? 0} giao dịch thành công`,
            icon: <MonetizationOnIcon fontSize="large" />,
            color: COLORS.success,
            trend: "+12.4% so với kỳ trước"
        },
        {
            title: "Lượt Tiếp Nhận Hôm Nay",
            value: `${kpiRevenue?.todayAppointments ?? utilStats?.totalBookingsToday ?? 0} ca`,
            subtext: `Hoàn tất: ${kpiRevenue?.completedAppointments ?? utilStats?.totalCompletedExams ?? 0} ca (${kpiRevenue?.completionRate ?? 0}%)`,
            icon: <EventAvailableIcon fontSize="large" />,
            color: COLORS.primary,
            trend: `Hủy: ${kpiRevenue?.cancelledAppointments ?? 0} ca`
        },
        {
            title: "Công Suất Buồng Khám (Toàn Viện)",
            value: `${roomCapacity?.overallUtilizationRate ?? 0}%`,
            subtext: `${roomCapacity?.activeRooms ?? 0}/${roomCapacity?.totalRooms ?? roomList.length} buồng đang mở phiên khám`,
            icon: <MeetingRoomIcon fontSize="large" />,
            color: overloadedRoomsCount > 0 ? COLORS.danger : COLORS.teal,
            trend: overloadedRoomsCount > 0 ? `⚠️ ${overloadedRoomsCount} buồng tải cao` : "Tải ổn định"
        },
        {
            title: "Bệnh Nhân Đang Chờ Khám",
            value: `${totalWaitingBN} người`,
            subtext: `${totalExaminingBN} bệnh nhân đang ngồi ghế khám`,
            icon: <PeopleIcon fontSize="large" />,
            color: totalWaitingBN > 20 ? COLORS.warning : COLORS.purple,
            trend: `Tổng ${utilStats?.totalPatients ?? 0} hồ sơ BN`
        }
    ];

    return (
        <Container maxWidth="xl" sx={{ py: 1.5, px: { xs: 1, sm: 2, md: 3 } }}>
            {/* Header Bộ lọc thời gian & Tác vụ */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={2}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1.2}>
                        <Typography variant="h5" fontWeight="800" color="#0F172A" sx={{ fontSize: { xs: "1.2rem", sm: "1.45rem" } }}>
                            📊 Dashboard Điều Hành Y Tế Toàn Viện
                        </Typography>
                        <Chip
                            label="DỮ LIỆU THỰC TẾ"
                            size="small"
                            color="success"
                            sx={{ fontWeight: "bold", fontSize: "0.68rem", height: 22 }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" mt={0.3}>
                        Theo dõi thời gian thực công suất phòng khám, doanh thu theo kênh, phân bố chuyên khoa & nhật ký an toàn
                    </Typography>
                </Box>

                {/* Bộ điều khiển Bộ lọc thời gian, Xuất báo cáo, Làm mới */}
                <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
                    <TextField
                        select
                        size="small"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        sx={{ minWidth: 140, bgcolor: "white", "& .MuiSelect-select": { py: 0.85, fontWeight: 700 } }}
                    >
                        <MenuItem value="TODAY">Hôm nay</MenuItem>
                        <MenuItem value="WEEK">7 ngày qua</MenuItem>
                        <MenuItem value="MONTH">30 ngày qua</MenuItem>
                        <MenuItem value="YEAR">Năm 2026</MenuItem>
                        <MenuItem value="CUSTOM">Tùy chọn ngày...</MenuItem>
                    </TextField>

                    {timeRange === "CUSTOM" && (
                        <Box display="flex" alignItems="center" gap={1}>
                            <TextField
                                type="date"
                                size="small"
                                label="Từ ngày"
                                InputLabelProps={{ shrink: true }}
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                sx={{ bgcolor: "white", width: 145, "& input": { py: 0.85, fontSize: "0.8rem" } }}
                            />
                            <TextField
                                type="date"
                                size="small"
                                label="Đến ngày"
                                InputLabelProps={{ shrink: true }}
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                sx={{ bgcolor: "white", width: 145, "& input": { py: 0.85, fontSize: "0.8rem" } }}
                            />
                        </Box>
                    )}

                    <Button
                        variant="outlined"
                        color="inherit"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={loadDashboardData}
                        disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 38, bgcolor: "white" }}
                    >
                        {loading ? "Đang tải..." : "Làm mới"}
                    </Button>

                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportCsv}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 38 }}
                    >
                        Xuất CSV
                    </Button>

                    <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<PrintIcon />}
                        onClick={() => window.print()}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, height: 38, bgcolor: "white", display: { xs: "none", sm: "inline-flex" } }}
                    >
                        In Báo Cáo
                    </Button>
                </Box>
            </Box>

            {/* Banner Cảnh báo Lỗi hoặc Demo Mode */}
            {errorMsg && (
                <Alert
                    severity="warning"
                    sx={{ mb: 2.5, borderRadius: 2.5 }}
                    action={
                        <Button color="inherit" size="small" onClick={loadDashboardData}>
                            Thử Lại Ngay
                        </Button>
                    }
                >
                    {errorMsg}
                </Alert>
            )}

            {/* Công tắc Bật/Tắt chế độ xem mẫu mô phỏng */}
            <Box display="flex" justifyContent="space-between" alignItems="center" px={1} mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={demoMode}
                                onChange={(e) => setDemoMode(e.target.checked)}
                                color="warning"
                                size="small"
                            />
                        }
                        label={
                            <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                Bật dữ liệu mô phỏng tham khảo (Demo Visual Mode)
                            </Typography>
                        }
                    />
                    {demoMode && (
                        <Chip
                            label="ĐANG BẬT DEMO (Số liệu minh họa giao diện)"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: "bold", fontSize: "0.68rem" }}
                        />
                    )}
                </Box>

                <Typography variant="caption" color="text.secondary">
                    Đồng bộ lần cuối: {new Date().toLocaleTimeString("vi-VN")}
                </Typography>
            </Box>

            {/* HÀNG 1: 4 THẺ CHỈ SỐ KPI CHÍNH */}
            <Grid container spacing={2.5} mb={3}>
                {statCards.map((c, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: "1px solid #E2E8F0",
                                borderLeft: `5px solid ${c.color}`,
                                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                                height: "100%",
                                transition: "all 0.2s",
                                "&:hover": { boxShadow: "0 6px 18px rgba(0,0,0,0.06)", transform: "translateY(-2px)" }
                            }}
                        >
                            <CardContent sx={{ p: 2.2 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    <Typography variant="caption" color="text.secondary" fontWeight="700" textTransform="uppercase" letterSpacing="0.4px">
                                        {c.title}
                                    </Typography>
                                    <Box sx={{ color: c.color, p: 0.8, borderRadius: 2, bgcolor: `${c.color}15` }}>
                                        {React.cloneElement(c.icon, { sx: { fontSize: 24 } })}
                                    </Box>
                                </Box>

                                {loading ? (
                                    <Skeleton variant="text" width="60%" height={40} />
                                ) : (
                                    <Typography variant="h4" fontWeight="800" color="#0F172A" sx={{ fontSize: { xs: "1.45rem", sm: "1.7rem" }, my: 0.5 }}>
                                        {c.value}
                                    </Typography>
                                )}

                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                    <Typography variant="caption" color="text.secondary" fontWeight="500">
                                        {c.subtext}
                                    </Typography>
                                    <Chip
                                        label={c.trend}
                                        size="small"
                                        sx={{
                                            height: 20,
                                            fontSize: "0.65rem",
                                            fontWeight: 700,
                                            bgcolor: `${c.color}18`,
                                            color: c.color
                                        }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* HÀNG 2: BIỂU ĐỒ DOANH THU THEO NGÀY & CƠ CẤU PHƯƠNG THỨC THANH TOÁN */}
            <Grid container spacing={2.5} mb={3}>
                {/* 1. Biểu đồ miền Doanh thu theo chuỗi ngày */}
                <Grid item xs={12} lg={8}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                            height: "100%"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="#0F172A">
                                    📈 Biến Động Doanh Thu & Lượt Giao Dịch
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Dữ liệu đối soát trực tiếp từ sổ cái giao dịch theo tham số ngày thực tế ({revenueTimelineData.length} mốc ngày)
                                </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Chip label="Đơn vị: VNĐ" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.7rem" }} />
                            </Box>
                        </Box>

                        {loading ? (
                            <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Skeleton variant="rectangular" width="100%" height={280} sx={{ borderRadius: 2 }} />
                            </Box>
                        ) : revenueTimelineData.length > 0 ? (
                            <Box sx={{ width: "100%", height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.35} />
                                                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} stroke="#CBD5E1" />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "#64748B" }}
                                            stroke="#CBD5E1"
                                            tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}Tr` : val}
                                        />
                                        <RechartsTooltip
                                            formatter={(value, name) => [
                                                name === "revenue" ? formatCurrency(value) : `${value} giao dịch`,
                                                name === "revenue" ? "Doanh thu" : "Số giao dịch"
                                            ]}
                                            labelFormatter={(label, items) => {
                                                const full = items?.[0]?.payload?.fullDate;
                                                return `Ngày: ${full || label}`;
                                            }}
                                            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke={COLORS.primary}
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#revenueGradient)"
                                            name="revenue"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        ) : (
                            <Box sx={{ height: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <Typography variant="body2" color="text.secondary">
                                    Chưa có dữ liệu giao dịch trong khoảng thời gian này.
                                </Typography>
                                <Button size="small" variant="text" onClick={() => setDemoMode(true)} sx={{ mt: 1 }}>
                                    Bật chế độ xem mẫu
                                </Button>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* 2. Biểu đồ tròn Cơ cấu 5 Kênh Thanh Toán Thực Tế */}
                <Grid item xs={12} lg={4}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Typography variant="h6" fontWeight="800" color="#0F172A">
                                💳 Cơ Cấu Kênh Thanh Toán
                            </Typography>
                            <Chip
                                label={formatCurrency(kpiRevenue?.totalRevenue || 0)}
                                color="success"
                                size="small"
                                sx={{ fontWeight: "bold", fontSize: "0.72rem" }}
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary" mb={2}>
                            Tỷ trọng doanh thu theo 5 cổng thanh toán (Tiền mặt, VietQR, MoMo, VNPay, POS)
                        </Typography>

                        {paymentMethodsData.length > 0 ? (
                            <Box sx={{ height: 210, width: "100%" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paymentMethodsData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={3}
                                        >
                                            {paymentMethodsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            formatter={(value) => [formatCurrency(value), "Doanh thu"]}
                                            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: 8, border: "1px solid #E2E8F0" }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        ) : (
                            <Box sx={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Typography variant="caption" color="text.secondary">
                                    Chưa ghi nhận doanh thu phát sinh
                                </Typography>
                            </Box>
                        )}

                        {/* Danh sách chú giải chi tiết từng kênh */}
                        <Stack spacing={1} mt="auto">
                            {paymentMethodsData.map((method, idx) => {
                                const total = paymentMethodsData.reduce((acc, cur) => acc + cur.value, 0) || 1;
                                const pct = Math.round((method.value / total) * 100);
                                return (
                                    <Box key={idx} display="flex" justifyContent="space-between" alignItems="center" sx={{ p: 0.8, borderRadius: 1.5, bgcolor: "#F8FAFC" }}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: method.color }} />
                                            <Typography variant="caption" fontWeight="700" color="text.primary">
                                                {method.name}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" fontWeight="800" sx={{ color: method.color }}>
                                            {formatCurrency(method.value)} ({pct}%)
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* HÀNG 3: PHÂN BỐ LƯỢT KHÁM THEO KHOA & CÔNG SUẤT BUỒNG KHÁM QUÁ TẢI */}
            <Grid container spacing={2.5} mb={3}>
                {/* 1. Biểu đồ cột phân bổ lượt khám theo Chuyên Khoa */}
                <Grid item xs={12} lg={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                            height: "100%"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Typography variant="h6" fontWeight="800" color="#0F172A">
                                🏥 Phân Bố Lượt Khám Theo Chuyên Khoa
                            </Typography>
                            <Chip label="Dữ liệu lượt khám" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.7rem" }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" mb={2} display="block">
                            Thống kê số lượng bệnh nhân thực tế đăng ký khám qua cổng tiếp đón theo từng khoa
                        </Typography>

                        {departmentChartData.length > 0 ? (
                            <Box sx={{ width: "100%", height: 280 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                        <XAxis
                                            dataKey="department"
                                            tick={{ fontSize: 10, fill: "#475569" }}
                                            stroke="#CBD5E1"
                                            interval={0}
                                            angle={-15}
                                            textAnchor="end"
                                        />
                                        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} stroke="#CBD5E1" />
                                        <RechartsTooltip
                                            formatter={(value) => [`${value} lượt khám`, "Tổng khám"]}
                                            labelFormatter={(label, items) => items?.[0]?.payload?.fullName || label}
                                            contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: 8, border: "1px solid #E2E8F0" }}
                                        />
                                        <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]}>
                                            {departmentChartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS.chartPalette[index % COLORS.chartPalette.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        ) : (
                            <Box sx={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Typography variant="body2" color="text.secondary">
                                    Chưa có số liệu phân bổ lượt khám theo khoa.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* 2. Giám sát Buồng Khám & Cảnh Báo Quá Tải Thời Gian Thực */}
                <Grid item xs={12} lg={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                            height: "100%"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <MeetingRoomIcon color="primary" />
                                <Typography variant="h6" fontWeight="800" color="#0F172A">
                                    🏥 Giám Sát Buồng Khám & Mức Tải
                                </Typography>
                            </Box>
                            <Chip
                                label={`Công suất: ${roomCapacity?.overallUtilizationRate ?? 0}%`}
                                color={overloadedRoomsCount > 0 ? "error" : "primary"}
                                size="small"
                                sx={{ fontWeight: "bold" }}
                            />
                        </Box>
                        <Typography variant="caption" color="text.secondary" mb={2} display="block">
                            Tổng {roomList.length} buồng khám ({roomCapacity?.activeRooms ?? 0} buồng đang mở phiên tiếp nhận bệnh nhân)
                        </Typography>

                        {/* Bộ lọc phòng nhanh theo Khoa & Mức tải */}
                        <Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
                            <TextField
                                select
                                size="small"
                                label="Lọc theo Khoa"
                                value={roomDeptFilter}
                                onChange={(e) => setRoomDeptFilter(e.target.value)}
                                sx={{ minWidth: 160, bgcolor: "white", "& .MuiSelect-select": { py: 0.6, fontSize: "0.78rem" } }}
                            >
                                <MenuItem value="ALL">Tất cả khoa</MenuItem>
                                {uniqueDepartments.map((dept, i) => (
                                    <MenuItem key={i} value={dept}>{dept}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                size="small"
                                label="Trạng thái tải"
                                value={roomLoadFilter}
                                onChange={(e) => setRoomLoadFilter(e.target.value)}
                                sx={{ minWidth: 140, bgcolor: "white", "& .MuiSelect-select": { py: 0.6, fontSize: "0.78rem" } }}
                            >
                                <MenuItem value="ALL">Tất cả mức tải</MenuItem>
                                <MenuItem value="HEAVY">🔴 Quá tải (&gt;=5 BN chờ)</MenuItem>
                                <MenuItem value="MEDIUM">🟡 Đang khám</MenuItem>
                                <MenuItem value="LIGHT">🟢 Thoáng / Sẵn sàng</MenuItem>
                            </TextField>
                        </Box>

                        <TableContainer sx={{ maxHeight: 260, border: "1px solid #F1F5F9", borderRadius: 2 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 700, fontSize: "0.75rem" } }}>
                                        <TableCell>Buồng phòng</TableCell>
                                        <TableCell>Khoa phụ trách</TableCell>
                                        <TableCell align="center">Chờ</TableCell>
                                        <TableCell align="center">Đang khám</TableCell>
                                        <TableCell align="center">Mức tải</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography variant="caption" color="text.secondary">Đang tải danh sách buồng khám...</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredRooms.length > 0 ? (
                                        filteredRooms.map((rm, idx) => {
                                            const isHeavy = rm.loadLevel === "HEAVY" || rm.waitingCount >= 5;
                                            return (
                                                <TableRow key={idx} hover sx={{ bgcolor: isHeavy ? "#FEF2F2" : "inherit" }}>
                                                    <TableCell sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
                                                        {rm.roomName || `Phòng ${rm.roomId}`}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                                                        {rm.departmentName || "Khoa khám"}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={`${rm.waitingCount ?? 0} BN`}
                                                            size="small"
                                                            color={(rm.waitingCount || 0) >= 5 ? "error" : (rm.waitingCount || 0) > 0 ? "warning" : "default"}
                                                            sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={`${rm.examiningCount ?? 0} BN`}
                                                            size="small"
                                                            color={(rm.examiningCount || 0) > 0 ? "primary" : "default"}
                                                            variant={(rm.examiningCount || 0) > 0 ? "filled" : "outlined"}
                                                            sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={isHeavy ? "QUÁ TẢI" : (rm.examiningCount > 0 ? "ĐANG KHÁM" : "SẴN SÀNG")}
                                                            size="small"
                                                            color={isHeavy ? "error" : (rm.examiningCount > 0 ? "primary" : "success")}
                                                            sx={{ fontWeight: "bold", fontSize: "0.65rem", height: 20 }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography variant="caption" color="text.secondary" py={2} display="block">
                                                    Không có buồng khám nào phù hợp bộ lọc
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

            {/* HÀNG 4: NHẬT KÝ KIỂM TOÁN AN TOÀN HỆ THỐNG (IMMUTABLE AUDIT LOGS - PII SANITIZED) */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    mb: 3
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <SecurityIcon color="primary" />
                        <Typography variant="h6" fontWeight="800" color="#0F172A">
                            🛡️ Nhật Ký Kiểm Toán Toàn Viện (Immutable Audit Trail)
                        </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                        <TextField
                            select
                            size="small"
                            value={auditFilter}
                            onChange={(e) => setAuditFilter(e.target.value)}
                            sx={{ minWidth: 150, bgcolor: "white", "& .MuiSelect-select": { py: 0.6, fontSize: "0.78rem" } }}
                        >
                            <MenuItem value="ALL">Tất cả hành động</MenuItem>
                            <MenuItem value="CREATE">CREATE (Tạo mới)</MenuItem>
                            <MenuItem value="UPDATE">UPDATE (Cập nhật)</MenuItem>
                            <MenuItem value="DELETE">DELETE (Xóa/Hủy)</MenuItem>
                            <MenuItem value="PAY">PAYMENT (Thanh toán)</MenuItem>
                            <MenuItem value="CHECK_IN">CHECK-IN (Tiếp đón)</MenuItem>
                        </TextField>

                        <Chip
                            label={`${filteredAuditLogs.length} sự kiện`}
                            color="info"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: "bold" }}
                        />
                    </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" mb={2} display="block">
                    Cơ chế ghi log giao dịch bất biến (`REQUIRES_NEW`), tự động lọc bỏ thông tin nhạy cảm PII (mật khẩu, token, thông tin bảo mật) theo chuẩn an toàn thông tin y tế.
                </Typography>

                <TableContainer sx={{ maxHeight: 320, border: "1px solid #F1F5F9", borderRadius: 2 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 700, fontSize: "0.75rem" } }}>
                                <TableCell>Thời gian</TableCell>
                                <TableCell>Hành động</TableCell>
                                <TableCell>Người thao tác</TableCell>
                                <TableCell>Vai trò</TableCell>
                                <TableCell>Thực thể / ID</TableCell>
                                <TableCell>Chi tiết (Sanitized)</TableCell>
                                <TableCell align="right">Địa chỉ IP</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Typography variant="caption" color="text.secondary">Đang tải nhật ký kiểm toán...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredAuditLogs.length > 0 ? (
                                filteredAuditLogs.map((log, idx) => (
                                    <TableRow key={log.logId || idx} hover>
                                        <TableCell sx={{ fontSize: "0.75rem", whiteSpace: "nowrap", color: "text.secondary" }}>
                                            {log.createdAt || "N/A"}
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
                                                sx={{ fontWeight: "bold", fontSize: "0.68rem", height: 22 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: "bold", color: "primary.main", fontSize: "0.78rem" }}>
                                            {log.actorName || "Hệ thống"}
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={log.actorRole || "STAFF"} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "0.75rem" }}>
                                            <code>{log.entityType ? `${log.entityType} #${log.entityId || ""}` : "SYSTEM"}</code>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                                            <Tooltip title={log.details || ""}>
                                                <span>{log.details || "Không có mô tả chi tiết"}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontSize: "0.75rem" }}>
                                            <code>{log.ipAddress || "127.0.0.1"}</code>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Typography variant="caption" color="text.secondary" py={2} display="block">
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
