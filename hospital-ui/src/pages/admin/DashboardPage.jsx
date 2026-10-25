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
    Stack,
    TextField,
    MenuItem,
    Skeleton,
    Switch,
    FormControlLabel,
    Tooltip,
    ToggleButton,
    ToggleButtonGroup
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
    Tooltip as RechartsTooltip
} from "recharts";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import ShowChartOutlinedIcon from "@mui/icons-material/ShowChartOutlined";
import PieChartOutlineOutlinedIcon from "@mui/icons-material/PieChartOutlineOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";

import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

// Bảng màu y tế tối ưu chuẩn WCAG AAA
const COLORS = {
    primary: "#0088D6",
    primaryLight: "rgba(0, 136, 214, 0.08)",
    success: "#00A878",
    warning: "#F59E0B",
    danger: "#EF4444",
    purple: "#7C3AED",
    teal: "#0D9488",
    slate: "#64748B",
    chartPalette: ["#0088D6", "#00A878", "#7C3AED", "#F59E0B", "#0D9488", "#E11D48", "#6366F1", "#0284C7"]
};

// Custom Tooltip cho Recharts phong cách Linear
const CustomChartTooltip = ({ active, payload, label, isCurrency = true }) => {
    if (active && payload && payload.length) {
        return (
            <Box
                sx={{
                    bgcolor: "rgba(15, 23, 42, 0.95)",
                    backdropFilter: "blur(8px)",
                    color: "#FFFFFF",
                    p: 1.5,
                    borderRadius: "10px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    fontSize: "0.8rem",
                    minWidth: 140
                }}
            >
                <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mb: 0.5, fontWeight: 600 }}>
                    {label}
                </Typography>
                {payload.map((entry, index) => (
                    <Box key={`item-${index}`} display="flex" justifyContent="space-between" alignItems="center" gap={1.5}>
                        <Typography variant="caption" sx={{ color: "#E2E8F0", fontWeight: 500 }}>
                            {entry.name === "revenue" ? "Doanh thu" : (entry.name === "transactions" ? "Giao dịch" : entry.name)}:
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#38BDF8", fontWeight: 700, fontFamily: "monospace" }}>
                            {isCurrency && entry.name === "revenue"
                                ? formatCurrency(entry.value)
                                : `${entry.value} ${entry.name === "count" ? "lượt" : ""}`}
                        </Typography>
                    </Box>
                ))}
            </Box>
        );
    }
    return null;
};

export default function DashboardPage() {
    const [timeRange, setTimeRange] = useState("WEEK"); // TODAY, WEEK, MONTH, YEAR, CUSTOM
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return d.toISOString().split("T")[0];
    });
    const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split("T")[0]);

    // Trạng thái dữ liệu Backend
    const [kpiRevenue, setKpiRevenue] = useState(null);
    const [roomCapacity, setRoomCapacity] = useState(null);
    const [utilStats, setUtilStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    // Trạng thái mạng / bộ lọc
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [auditFilter, setAuditFilter] = useState("ALL");
    const [roomDeptFilter, setRoomDeptFilter] = useState("ALL");
    const [roomLoadFilter, setRoomLoadFilter] = useState("ALL");
    const [demoMode, setDemoMode] = useState(false);

    // Tính toán tham số ngày
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
                setErrorMsg("Không thể đồng bộ một số dữ liệu chỉ số từ máy chủ. Kiểm tra kết nối API.");
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

    // Thống kê buồng khám
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

    // Lọc buồng khám
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

    const uniqueDepartments = useMemo(() => {
        const depts = new Set(roomList.map(r => r.departmentName).filter(Boolean));
        return Array.from(depts);
    }, [roomList]);

    // Dữ liệu dòng thời gian doanh thu
    const revenueTimelineData = useMemo(() => {
        if (kpiRevenue?.dailyBreakdown && kpiRevenue.dailyBreakdown.length > 0) {
            return kpiRevenue.dailyBreakdown.map(item => {
                let formattedDate = "N/A";
                if (item.date) {
                    const parts = item.date.split("-");
                    formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date;
                }
                return {
                    date: formattedDate,
                    fullDate: item.date,
                    revenue: Number(item.revenue) || 0,
                    transactions: Number(item.transactionCount) || 0
                };
            });
        }
        if (demoMode) {
            return [
                { date: "12/10", fullDate: "2026-10-12", revenue: 38500000, transactions: 24 },
                { date: "13/10", fullDate: "2026-10-13", revenue: 42000000, transactions: 28 },
                { date: "14/10", fullDate: "2026-10-14", revenue: 36000000, transactions: 22 },
                { date: "15/10", fullDate: "2026-10-15", revenue: 51200000, transactions: 35 },
                { date: "16/10", fullDate: "2026-10-16", revenue: 48900000, transactions: 31 },
                { date: "17/10", fullDate: "2026-10-17", revenue: 45000000, transactions: 29 },
                { date: "18/10", fullDate: "2026-10-18", revenue: 54000000, transactions: 38 }
            ];
        }
        return [];
    }, [kpiRevenue, demoMode]);

    // Dữ liệu phân bổ lượt khám theo khoa
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

    // Cơ cấu phương thức thanh toán
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
                { name: "Tiền mặt tại Quầy", value: rawCash, color: "#00A878" },
                { name: "Ví MoMo", value: rawMomo, color: "#D81B60" },
                { name: "Cổng VNPAY-QR", value: rawVnpay, color: "#F59E0B" },
                { name: "Thẻ POS", value: rawPos, color: "#7C3AED" }
            ].filter(i => i.value > 0);
        }

        if (demoMode) {
            return [
                { name: "VietQR (Chuyển khoản)", value: 120000000, color: "#0088D6" },
                { name: "Tiền mặt tại Quầy", value: 65000000, color: "#00A878" },
                { name: "Cổng VNPAY-QR", value: 45000000, color: "#F59E0B" },
                { name: "Ví MoMo", value: 32000000, color: "#D81B60" },
                { name: "Thẻ POS", value: 23400000, color: "#7C3AED" }
            ];
        }
        return [];
    }, [kpiRevenue, demoMode]);

    // Lọc Audit Logs
    const filteredAuditLogs = useMemo(() => {
        if (!auditLogs) return [];
        if (auditFilter === "ALL") return auditLogs;
        return auditLogs.filter(l => l.action && l.action.toUpperCase().includes(auditFilter));
    }, [auditLogs, auditFilter]);

    // Xuất CSV
    const handleExportCsv = () => {
        if (!kpiRevenue && !utilStats && !roomCapacity) {
            alert("Chưa có dữ liệu để xuất báo cáo!");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "BÁO CÁO HIỆU SUẤT VẬN HÀNH BỆNH VIỆN - TNT HOSPITAL\n";
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

    // 4 Thẻ KPI hàng đầu
    const statCards = [
        {
            title: "Tổng Doanh Thu Quyết Toán",
            value: formatCurrency(kpiRevenue?.totalRevenue ?? utilStats?.totalRevenueThisMonth ?? 0),
            subtext: `Đã đối soát ${kpiRevenue?.totalTransactions ?? 0} giao dịch`,
            icon: <MonetizationOnOutlinedIcon />,
            color: COLORS.success,
            bgColor: "rgba(0, 168, 120, 0.08)",
            trend: "+12.4% chu kỳ"
        },
        {
            title: timeRange === "TODAY" ? "Lượt Tiếp Nhận (Hôm nay)" : `Lượt Tiếp Nhận (${timeRange === "WEEK" ? "7 ngày qua" : (timeRange === "MONTH" ? "30 ngày" : (timeRange === "YEAR" ? "Năm 2026" : "Kỳ chọn"))})`,
            value: `${kpiRevenue?.todayAppointments ?? utilStats?.totalBookingsToday ?? 0} ca`,
            subtext: `Hoàn tất: ${kpiRevenue?.completedAppointments ?? utilStats?.totalCompletedExams ?? 0} ca (${kpiRevenue?.completionRate ?? 0}%)`,
            icon: <EventAvailableOutlinedIcon />,
            color: COLORS.primary,
            bgColor: "rgba(0, 136, 214, 0.08)",
            trend: `Hủy: ${kpiRevenue?.cancelledAppointments ?? 0} ca`
        },
        {
            title: "Công Suất Buồng Khám",
            value: `${roomCapacity?.overallUtilizationRate ?? 0}%`,
            subtext: `${roomCapacity?.activeRooms ?? 0}/${roomCapacity?.totalRooms ?? roomList.length} buồng đang mở phiên`,
            icon: <MeetingRoomOutlinedIcon />,
            color: overloadedRoomsCount > 0 ? COLORS.danger : COLORS.teal,
            bgColor: overloadedRoomsCount > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(13, 148, 136, 0.08)",
            trend: overloadedRoomsCount > 0 ? `${overloadedRoomsCount} buồng quá tải` : "Tải ổn định"
        },
        {
            title: "Bệnh Nhân Chờ Khám",
            value: `${totalWaitingBN} người`,
            subtext: `${totalExaminingBN} bệnh nhân đang ngồi ghế khám`,
            icon: <PeopleAltOutlinedIcon />,
            color: totalWaitingBN > 20 ? COLORS.warning : COLORS.purple,
            bgColor: totalWaitingBN > 20 ? "rgba(245, 158, 11, 0.08)" : "rgba(124, 58, 237, 0.08)",
            trend: `${utilStats?.totalPatients ?? 0} hồ sơ BN`
        }
    ];

    return (
        <Box sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", pb: 6 }}>
            <Container maxWidth="xl" sx={{ pt: 3.5 }}>

                {/* Print-only Hospital Header */}
                <Box
                    sx={{
                        display: "none",
                        "@media print": {
                            display: "block !important",
                            mb: 3,
                            pb: 2,
                            borderBottom: "2px solid #002D5A"
                        }
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                            <Typography variant="h6" fontWeight="bold" sx={{ color: "#002D5A", fontSize: "14pt" }}>
                                BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: "9.5pt" }}>
                                Địa chỉ: Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội • Hotline: 1900 8888
                            </Typography>
                        </Box>
                        <Box textAlign="right">
                            <Typography variant="caption" fontStyle="italic" sx={{ fontSize: "9pt", display: "block" }}>
                                Thời điểm in báo cáo: {new Date().toLocaleString("vi-VN")}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: "8.5pt", color: "#64748B" }}>
                                Hệ thống Thông tin Bệnh viện EMR - HIS TNT
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* 1. Header & Unified Time Range Controls */}
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", lg: "center" }}
                    flexDirection={{ xs: "column", lg: "row" }}
                    gap={2.5}
                    mb={3}
                >
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{
                                    fontWeight: 800,
                                    color: "#0F172A",
                                    letterSpacing: "-0.03em",
                                    fontSize: { xs: "1.5rem", sm: "1.85rem" }
                                }}
                            >
                                Dashboard Điều Hành Toàn Viện
                            </Typography>
                            <Chip
                                label="Live Analytics"
                                size="small"
                                sx={{
                                    bgcolor: "rgba(0, 168, 120, 0.08)",
                                    color: "#00A878",
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    borderRadius: "6px",
                                    height: "24px"
                                }}
                            />
                        </Stack>
                        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5, fontSize: "0.925rem" }}>
                            Giám sát thời gian thực công suất phòng khám, doanh thu theo chu kỳ, phân bổ chuyên khoa và an toàn dữ liệu
                        </Typography>
                    </Box>

                    {/* Time Range Selector & Action Buttons */}
                    <Stack
                        className="no-print"
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        alignSelf={{ xs: "stretch", lg: "auto" }}
                        flexWrap="wrap"
                    >
                        {/* Segmented Time Range Pills */}
                        <ToggleButtonGroup
                            value={timeRange}
                            exclusive
                            size="small"
                            onChange={(_, newRange) => newRange && setTimeRange(newRange)}
                            sx={{
                                borderRadius: "10px",
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                p: "2px",
                                "& .MuiToggleButton-root": {
                                    border: "none",
                                    borderRadius: "8px",
                                    px: 1.5,
                                    py: 0.7,
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.825rem",
                                    color: "#64748B",
                                    "&.Mui-selected": {
                                        bgcolor: "#0F172A",
                                        color: "#FFFFFF",
                                        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)"
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="TODAY">Hôm nay</ToggleButton>
                            <ToggleButton value="WEEK">7 ngày</ToggleButton>
                            <ToggleButton value="MONTH">30 ngày</ToggleButton>
                            <ToggleButton value="YEAR">Năm 2026</ToggleButton>
                            <ToggleButton value="CUSTOM">Tùy chọn</ToggleButton>
                        </ToggleButtonGroup>

                        {timeRange === "CUSTOM" && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    type="date"
                                    size="small"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    sx={{ width: 140, bgcolor: "#FFFFFF", "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                                />
                                <TextField
                                    type="date"
                                    size="small"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    sx={{ width: 140, bgcolor: "#FFFFFF", "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                                />
                            </Stack>
                        )}

                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
                            onClick={loadDashboardData}
                            disabled={loading}
                            sx={{
                                borderRadius: "10px",
                                fontWeight: 600,
                                textTransform: "none",
                                color: "#334155",
                                borderColor: "rgba(15, 23, 42, 0.12)",
                                bgcolor: "#FFFFFF",
                                px: 1.8,
                                py: 0.8
                            }}
                        >
                            Làm mới
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
                            onClick={handleExportCsv}
                            sx={{
                                borderRadius: "10px",
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: "#0088D6",
                                px: 2,
                                py: 0.8,
                                boxShadow: "0 2px 8px rgba(0, 136, 214, 0.25)",
                                "&:hover": { bgcolor: "#0070B3" }
                            }}
                        >
                            Xuất CSV
                        </Button>

                        <Button
                            variant="outlined"
                            startIcon={<PrintOutlinedIcon sx={{ fontSize: 18 }} />}
                            onClick={() => window.print()}
                            sx={{
                                borderRadius: "10px",
                                fontWeight: 600,
                                textTransform: "none",
                                color: "#334155",
                                borderColor: "rgba(15, 23, 42, 0.12)",
                                bgcolor: "#FFFFFF",
                                px: 1.8,
                                py: 0.8,
                                display: { xs: "none", sm: "inline-flex" }
                            }}
                        >
                            In
                        </Button>
                    </Stack>
                </Box>

                {/* Banner Thông báo Lỗi / Cảnh báo */}
                {errorMsg && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 2.5, borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.2)" }}
                        action={
                            <Button color="inherit" size="small" onClick={loadDashboardData} sx={{ fontWeight: 700 }}>
                                Thử Lại
                            </Button>
                        }
                    >
                        {errorMsg}
                    </Alert>
                )}

                {/* Demo Mode & Đồng bộ trạng thái */}
                <Box display="flex" justifyContent="space-between" alignItems="center" px={0.5} mb={2.5}>
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
                            <Typography variant="caption" fontWeight="600" color="#64748B">
                                Chế độ số liệu mô phỏng minh họa (Demo Visual Mode)
                            </Typography>
                        }
                    />
                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                        Cập nhật: {new Date().toLocaleTimeString("vi-VN")}
                    </Typography>
                </Box>

                {/* 2. Hàng 4 Thẻ Chỉ Số KPI (Linear Metric Stage) */}
                <Grid container spacing={2.5} mb={3}>
                    {statCards.map((c, i) => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: "14px",
                                    bgcolor: "#FFFFFF",
                                    border: "1px solid rgba(15, 23, 42, 0.08)",
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                    "&:hover": {
                                        transform: "translateY(-2px)",
                                        boxShadow: "0 8px 20px -4px rgba(15, 23, 42, 0.06)",
                                        borderColor: "rgba(15, 23, 42, 0.15)"
                                    }
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "#64748B",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.04em",
                                            fontSize: "0.75rem"
                                        }}
                                    >
                                        {c.title}
                                    </Typography>
                                    <Box
                                        sx={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: "10px",
                                            bgcolor: c.bgColor,
                                            color: c.color,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        {React.cloneElement(c.icon, { sx: { fontSize: 20 } })}
                                    </Box>
                                </Box>

                                <Box my={0.5}>
                                    {loading ? (
                                        <Skeleton variant="text" width="70%" height={40} />
                                    ) : (
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                fontWeight: 800,
                                                color: "#0F172A",
                                                letterSpacing: "-0.03em",
                                                fontSize: { xs: "1.45rem", sm: "1.75rem" }
                                            }}
                                        >
                                            {c.value}
                                        </Typography>
                                    )}
                                </Box>

                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 500 }}>
                                        {c.subtext}
                                    </Typography>
                                    <Chip
                                        label={c.trend}
                                        size="small"
                                        sx={{
                                            height: 20,
                                            fontSize: "0.68rem",
                                            fontWeight: 700,
                                            bgcolor: c.bgColor,
                                            color: c.color,
                                            borderRadius: "6px"
                                        }}
                                    />
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                {/* 3. Hàng Biểu Đồ Doanh Thu & Cơ Cấu Kênh Thanh Toán */}
                <Grid container spacing={2.5} mb={3}>
                    {/* AreaChart Doanh Thu */}
                    <Grid item xs={12} lg={8}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: "14px",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                bgcolor: "#FFFFFF",
                                height: "100%"
                            }}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <ShowChartOutlinedIcon sx={{ color: "#0088D6" }} />
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.05rem" }}>
                                        Biến Động Doanh Thu & Số Giao Dịch
                                    </Typography>
                                </Stack>
                                <Chip
                                    label="Đơn vị: VNĐ"
                                    size="small"
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: "0.72rem",
                                        borderRadius: "6px",
                                        bgcolor: "#F1F5F9",
                                        color: "#475569"
                                    }}
                                />
                            </Box>

                            {loading ? (
                                <Box sx={{ height: 290, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Skeleton variant="rectangular" width="100%" height={270} sx={{ borderRadius: "10px" }} />
                                </Box>
                            ) : revenueTimelineData.length > 0 ? (
                                <Box sx={{ width: "100%", height: 290 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueTimelineData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="revenueLinearGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.05)" vertical={false} />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} stroke="rgba(15, 23, 42, 0.1)" />
                                            <YAxis
                                                width={48}
                                                tick={{ fontSize: 11, fill: "#64748B" }}
                                                stroke="rgba(15, 23, 42, 0.1)"
                                                tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}Tr` : val}
                                            />
                                            <RechartsTooltip
                                                content={<CustomChartTooltip isCurrency={true} />}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke={COLORS.primary}
                                                strokeWidth={2.5}
                                                dot={{ r: 3.5, fill: COLORS.primary, stroke: "#FFFFFF", strokeWidth: 1.5 }}
                                                activeDot={{ r: 6, fill: COLORS.primary }}
                                                fillOpacity={1}
                                                fill="url(#revenueLinearGradient)"
                                                name="revenue"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Box>
                            ) : (
                                <Box sx={{ height: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                    <Typography variant="body2" color="#64748B">
                                        Chưa có dữ liệu giao dịch trong khoảng thời gian này.
                                    </Typography>
                                    <Button size="small" onClick={() => setDemoMode(true)} sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}>
                                        Bật chế độ xem mẫu mô phỏng
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    </Grid>

                    {/* Donut Chart Kênh Thanh Toán */}
                    <Grid item xs={12} lg={4}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: "14px",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                bgcolor: "#FFFFFF",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column"
                            }}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <PieChartOutlineOutlinedIcon sx={{ color: "#00A878" }} />
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.05rem" }}>
                                        Cơ Cấu Kênh Thu
                                    </Typography>
                                </Stack>
                                <Chip
                                    label={formatCurrency(kpiRevenue?.totalRevenue || 0)}
                                    size="small"
                                    sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "rgba(0, 168, 120, 0.08)", color: "#00A878", borderRadius: "6px" }}
                                />
                            </Box>
                            <Typography variant="caption" sx={{ color: "#64748B", mb: 2 }}>
                                Tỷ trọng phân bổ theo kênh thanh toán (VietQR, Tiền mặt, MoMo, VNPay, POS)
                            </Typography>

                            {paymentMethodsData.length > 0 ? (
                                <Box sx={{ height: 190, width: "100%" }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentMethodsData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={3}
                                            >
                                                {paymentMethodsData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip content={<CustomChartTooltip isCurrency={true} />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            ) : (
                                <Box sx={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Typography variant="caption" color="#64748B">
                                        Chưa ghi nhận doanh thu phát sinh
                                    </Typography>
                                </Box>
                            )}

                            {/* Legend Breakdown */}
                            <Stack spacing={0.8} mt="auto">
                                {paymentMethodsData.map((method, idx) => {
                                    const total = paymentMethodsData.reduce((acc, cur) => acc + cur.value, 0) || 1;
                                    const pct = Math.round((method.value / total) * 100);
                                    return (
                                        <Box
                                            key={idx}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            sx={{
                                                p: 0.8,
                                                borderRadius: "8px",
                                                bgcolor: "#F8FAFC",
                                                border: "1px solid rgba(15, 23, 42, 0.04)"
                                            }}
                                        >
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: method.color }} />
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: "#334155" }}>
                                                    {method.name}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: method.color, fontFamily: "monospace" }}>
                                                {pct}% ({formatCurrency(method.value)})
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>

                {/* 4. Hàng Phân Bổ Chuyên Khoa & Giám Sát Buồng Khám */}
                <Grid container spacing={2.5} mb={3}>
                    {/* BarChart Lượt khám theo khoa */}
                    <Grid item xs={12} lg={6}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: "14px",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                bgcolor: "#FFFFFF",
                                height: "100%"
                            }}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <BarChartOutlinedIcon sx={{ color: "#7C3AED" }} />
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.05rem" }}>
                                        Lượt Khám Theo Chuyên Khoa
                                    </Typography>
                                </Stack>
                                <Chip
                                    label="Thăm khám"
                                    size="small"
                                    sx={{ fontWeight: 600, fontSize: "0.72rem", borderRadius: "6px", bgcolor: "#F1F5F9" }}
                                />
                            </Box>
                            <Typography variant="caption" sx={{ color: "#64748B", mb: 2, display: "block" }}>
                                Thống kê số lượng bệnh nhân thực tế đăng ký khám qua cổng tiếp đón theo từng khoa
                            </Typography>

                            {departmentChartData.length > 0 ? (
                                <Box sx={{ width: "100%", height: 270 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={departmentChartData} margin={{ top: 10, right: 15, left: 5, bottom: 35 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.05)" vertical={false} />
                                            <XAxis
                                                dataKey="department"
                                                tick={{ fontSize: 10, fill: "#475569" }}
                                                stroke="rgba(15, 23, 42, 0.1)"
                                                interval={0}
                                                angle={-18}
                                                textAnchor="end"
                                                height={35}
                                            />
                                            <YAxis width={35} tick={{ fontSize: 11, fill: "#64748B" }} stroke="rgba(15, 23, 42, 0.1)" />
                                            <RechartsTooltip content={<CustomChartTooltip isCurrency={false} />} />
                                            <Bar dataKey="count" fill={COLORS.primary} radius={[6, 6, 0, 0]}>
                                                {departmentChartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS.chartPalette[index % COLORS.chartPalette.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            ) : (
                                <Box sx={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Typography variant="body2" color="#64748B">
                                        Chưa có số liệu phân bổ lượt khám theo khoa.
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    </Grid>

                    {/* Giám Sát Buồng Khám */}
                    <Grid item xs={12} lg={6}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: "14px",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                bgcolor: "#FFFFFF",
                                height: "100%"
                            }}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <MeetingRoomOutlinedIcon sx={{ color: "#0088D6" }} />
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.05rem" }}>
                                        Giám Sát Buồng Khám & Mức Tải
                                    </Typography>
                                </Stack>
                                <Chip
                                    label={`Công suất: ${roomCapacity?.overallUtilizationRate ?? 0}%`}
                                    size="small"
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: "0.72rem",
                                        borderRadius: "6px",
                                        bgcolor: overloadedRoomsCount > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(0, 136, 214, 0.08)",
                                        color: overloadedRoomsCount > 0 ? "#EF4444" : "#0088D6"
                                    }}
                                />
                            </Box>
                            <Typography variant="caption" sx={{ color: "#64748B", mb: 2, display: "block" }}>
                                {roomList.length} buồng khám ({roomCapacity?.activeRooms ?? 0} buồng đang mở phiên tiếp nhận)
                            </Typography>

                            {/* Lọc nhanh theo khoa & mức tải */}
                            <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap">
                                <TextField
                                    select
                                    size="small"
                                    label="Lọc theo Khoa"
                                    value={roomDeptFilter}
                                    onChange={(e) => setRoomDeptFilter(e.target.value)}
                                    sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: "10px", fontSize: "0.8rem" } }}
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
                                    sx={{ minWidth: 140, "& .MuiOutlinedInput-root": { borderRadius: "10px", fontSize: "0.8rem" } }}
                                >
                                    <MenuItem value="ALL">Tất cả</MenuItem>
                                    <MenuItem value="HEAVY">Quá tải (&gt;=5 BN)</MenuItem>
                                    <MenuItem value="MEDIUM">Đang khám</MenuItem>
                                    <MenuItem value="LIGHT">Thoáng / Sẵn sàng</MenuItem>
                                </TextField>
                            </Stack>

                            <TableContainer sx={{ maxHeight: 250, border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: "10px" }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 700, fontSize: "0.72rem", color: "#64748B" } }}>
                                            <TableCell>Buồng phòng</TableCell>
                                            <TableCell>Khoa phụ trách</TableCell>
                                            <TableCell align="center">Chờ</TableCell>
                                            <TableCell align="center">Đang khám</TableCell>
                                            <TableCell align="center">Mức tải</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredRooms.length > 0 ? (
                                            filteredRooms.map((rm, idx) => {
                                                const isHeavy = rm.loadLevel === "HEAVY" || rm.waitingCount >= 5;
                                                return (
                                                    <TableRow key={idx} sx={{ "&:hover": { bgcolor: "rgba(241, 245, 249, 0.6)" } }}>
                                                        <TableCell sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#0F172A" }}>
                                                            {rm.roomName || `Phòng ${rm.roomId}`}
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: "0.75rem", color: "#64748B" }}>
                                                            {rm.departmentName || "Khoa khám"}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={`${rm.waitingCount ?? 0} BN`}
                                                                size="small"
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: "0.68rem",
                                                                    fontWeight: 700,
                                                                    borderRadius: "4px",
                                                                    bgcolor: (rm.waitingCount || 0) >= 5 ? "rgba(239, 68, 68, 0.1)" : "rgba(15, 23, 42, 0.05)",
                                                                    color: (rm.waitingCount || 0) >= 5 ? "#EF4444" : "#475569"
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={`${rm.examiningCount ?? 0} BN`}
                                                                size="small"
                                                                sx={{
                                                                    height: 20,
                                                                    fontSize: "0.68rem",
                                                                    fontWeight: 700,
                                                                    borderRadius: "4px",
                                                                    bgcolor: (rm.examiningCount || 0) > 0 ? "rgba(0, 136, 214, 0.1)" : "#F1F5F9",
                                                                    color: (rm.examiningCount || 0) > 0 ? "#0088D6" : "#94A3B8"
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={isHeavy ? "QUÁ TẢI" : (rm.examiningCount > 0 ? "ĐANG KHÁM" : "SẴN SÀNG")}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    fontSize: "0.65rem",
                                                                    height: 20,
                                                                    borderRadius: "4px",
                                                                    bgcolor: isHeavy ? "rgba(239, 68, 68, 0.1)" : (rm.examiningCount > 0 ? "rgba(0, 136, 214, 0.1)" : "rgba(0, 168, 120, 0.1)"),
                                                                    color: isHeavy ? "#EF4444" : (rm.examiningCount > 0 ? "#0088D6" : "#00A878")
                                                                }}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center">
                                                    <Typography variant="caption" color="#64748B" py={2} display="block">
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

                {/* 5. Nhật Ký Kiểm Toán Toàn Viện (Immutable Audit Logs - PII Sanitized) */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: "14px",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        bgcolor: "#FFFFFF"
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <SecurityOutlinedIcon sx={{ color: "#0088D6" }} />
                            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.05rem" }}>
                                Nhật Ký Kiểm Toán Toàn Viện (Immutable Audit Trail)
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <TextField
                                select
                                size="small"
                                value={auditFilter}
                                onChange={(e) => setAuditFilter(e.target.value)}
                                sx={{ minWidth: 150, "& .MuiOutlinedInput-root": { borderRadius: "10px", fontSize: "0.8rem" } }}
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
                                size="small"
                                sx={{ fontWeight: 700, borderRadius: "6px", bgcolor: "#F1F5F9", color: "#334155" }}
                            />
                        </Stack>
                    </Box>

                    <Typography variant="caption" sx={{ color: "#64748B", mb: 2, display: "block" }}>
                        Cơ chế ghi nhật ký bất biến (`REQUIRES_NEW`), tự động ẩn thông tin nhạy cảm PII theo quy chuẩn an toàn dữ liệu y tế.
                    </Typography>

                    <TableContainer sx={{ maxHeight: 300, border: "1px solid rgba(15, 23, 42, 0.06)", borderRadius: "10px" }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 700, fontSize: "0.72rem", color: "#64748B" } }}>
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
                                {filteredAuditLogs.length > 0 ? (
                                    filteredAuditLogs.map((log, idx) => (
                                        <TableRow key={log.logId || idx} sx={{ "&:hover": { bgcolor: "rgba(241, 245, 249, 0.6)" } }}>
                                            <TableCell sx={{ fontSize: "0.75rem", whiteSpace: "nowrap", color: "#64748B", fontFamily: "monospace" }}>
                                                {log.createdAt || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.action}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 700,
                                                        fontSize: "0.68rem",
                                                        height: 22,
                                                        borderRadius: "4px",
                                                        bgcolor: log.action?.includes("DELETE") || log.action?.includes("CANCEL") ? "rgba(239, 68, 68, 0.1)" :
                                                            log.action?.includes("UPDATE") || log.action?.includes("PAY") ? "rgba(245, 158, 11, 0.1)" :
                                                            log.action?.includes("CREATE") || log.action?.includes("CHECK_IN") ? "rgba(0, 168, 120, 0.1)" : "rgba(0, 136, 214, 0.1)",
                                                        color: log.action?.includes("DELETE") || log.action?.includes("CANCEL") ? "#EF4444" :
                                                            log.action?.includes("UPDATE") || log.action?.includes("PAY") ? "#D97706" :
                                                            log.action?.includes("CREATE") || log.action?.includes("CHECK_IN") ? "#00A878" : "#0088D6"
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: "#0088D6", fontSize: "0.78rem" }}>
                                                {log.actorName || "Hệ thống"}
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={log.actorRole || "STAFF"} size="small" sx={{ height: 20, fontSize: "0.65rem", borderRadius: "4px" }} />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                                                {log.entityType ? `${log.entityType} #${log.entityId || ""}` : "SYSTEM"}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                                                <Tooltip title={log.details || ""}>
                                                    <span>{log.details || "Không có mô tả chi tiết"}</span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748B" }}>
                                                {log.ipAddress || "127.0.0.1"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Typography variant="caption" color="#64748B" py={2} display="block">
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
        </Box>
    );
}
