import React, { useState, useEffect, useMemo } from "react";
import {
    Container,
    Paper,
    Typography,
    Button,
    Grid,
    Box,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Alert,
    Tooltip,
    InputAdornment,
    Snackbar,
    CircularProgress,
    Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import PersonIcon from "@mui/icons-material/Person";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import axiosInstance from "../../services/AxiosInstance";
import { formatISODate } from "../../utils/formatters";

const SESSION_OPTIONS = [
    { value: "MORNING", label: "Buổi Sáng (07:30 - 11:30)", shortLabel: "Sáng", color: "primary" },
    { value: "AFTERNOON", label: "Buổi Chiều (13:00 - 17:00)", shortLabel: "Chiều", color: "warning" },
    { value: "EVENING", label: "Buổi Tối (17:30 - 20:30)", shortLabel: "Tối", color: "secondary" },
];

export default function ScheduleManagePage() {
    const [schedules, setSchedules] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
    const [searchDoctor, setSearchDoctor] = useState("");
    const [openModal, setOpenModal] = useState(false);
    const [formData, setFormData] = useState({
        doctorId: "",
        departmentId: "",
        roomId: "",
        scheduleDate: new Date().toISOString().split("T")[0],
        session: "MORNING",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, schedule: null });

    // Tải danh sách ca trực theo ngày
    const loadSchedules = async () => {
        setTableLoading(true);
        try {
            const res = await axiosInstance.get(`/api/schedules/all?date=${selectedDate}`);
            const data = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
            setSchedules(data);
        } catch (err) {
            console.error("Lỗi tải lịch trực:", err);
            setSchedules([]);
        } finally {
            setTableLoading(false);
        }
    };

    // Tải danh sách Bác sĩ, Chuyên khoa, và Phòng khám
    const loadMeta = async () => {
        try {
            const [docRes, deptRes] = await Promise.all([
                axiosInstance.get("/api/admin/doctors").catch(() => ({ data: [] })),
                axiosInstance.get("/api/departments").catch(() => ({ data: [] })),
            ]);

            const docData = docRes.data || (Array.isArray(docRes) ? docRes : []);
            const deptData = deptRes.data || (Array.isArray(deptRes) ? deptRes : []);
            setDoctors(docData);
            setDepartments(deptData);

            // Thử lấy danh sách tất cả phòng
            try {
                const roomRes = await axiosInstance.get("/api/departments/rooms/all");
                const roomList = roomRes.data || (Array.isArray(roomRes) ? roomRes : []);
                setRooms(roomList);
            } catch {
                // Fallback nếu API /rooms/all chưa hỗ trợ: lấy phòng từ từng khoa
                const roomPromises = deptData.map(d =>
                    axiosInstance.get(`/api/departments/${d.departmentId}/rooms`)
                        .then(r => r.data || [])
                        .catch(() => [])
                );
                const results = await Promise.all(roomPromises);
                const allRooms = results.flat();
                setRooms(allRooms);
            }
        } catch (err) {
            console.error("Lỗi tải metadata:", err);
        }
    };

    useEffect(() => {
        loadMeta();
    }, []);

    useEffect(() => {
        loadSchedules();
    }, [selectedDate]);

    // Khi mở modal tạo mới: tự động chọn bác sĩ đầu tiên và phòng tương ứng
    const handleOpenAdd = () => {
        const firstDoc = doctors[0];
        const docDeptId = firstDoc?.departmentId || "";
        const deptRooms = rooms.filter(r => docDeptId ? r.departmentId === docDeptId : true);
        const defaultRoomId = deptRooms[0]?.roomId || rooms[0]?.roomId || "";

        setFormData({
            doctorId: firstDoc?.doctorId || "",
            departmentId: docDeptId,
            roomId: defaultRoomId,
            scheduleDate: selectedDate,
            session: "MORNING",
        });
        setError("");
        setOpenModal(true);
    };

    // Khi chọn Bác sĩ: cập nhật khoa và lọc phòng tương ứng
    const handleDoctorChange = (doctorId) => {
        const doc = doctors.find(d => d.doctorId === doctorId);
        const docDeptId = doc?.departmentId || "";
        const deptRooms = rooms.filter(r => docDeptId ? r.departmentId === docDeptId : true);
        const targetRoomId = deptRooms[0]?.roomId || rooms[0]?.roomId || "";

        setFormData(prev => ({
            ...prev,
            doctorId,
            departmentId: docDeptId,
            roomId: targetRoomId,
        }));
    };

    // Khi chọn Khoa trong modal (tùy chọn chuyển khoa / lọc phòng)
    const handleDepartmentChange = (departmentId) => {
        const deptRooms = rooms.filter(r => departmentId ? r.departmentId === Number(departmentId) : true);
        const targetRoomId = deptRooms[0]?.roomId || rooms[0]?.roomId || "";
        
        // Tìm bác sĩ thuộc khoa này nếu có
        const docsInDept = doctors.filter(d => d.departmentId === Number(departmentId));
        const newDoctorId = docsInDept.length > 0 ? docsInDept[0].doctorId : formData.doctorId;

        setFormData(prev => ({
            ...prev,
            departmentId: Number(departmentId),
            doctorId: newDoctorId,
            roomId: targetRoomId,
        }));
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirm.schedule) return;
        const scheduleId = deleteConfirm.schedule.scheduleId;
        try {
            await axiosInstance.delete(`/api/schedules/${scheduleId}`);
            setToast({ open: true, message: "Đã hủy ca trực thành công!", severity: "success" });
            setDeleteConfirm({ open: false, schedule: null });
            loadSchedules();
        } catch (err) {
            setToast({ open: true, message: err.message || "Lỗi xóa ca trực!", severity: "error" });
        }
    };

    const handleCreate = async (e) => {
        if (e) e.preventDefault();
        if (!formData.doctorId) {
            setError("Vui lòng chọn bác sĩ phụ trách ca trực!");
            return;
        }
        if (!formData.roomId) {
            setError("Vui lòng chọn buồng / phòng khám cho ca trực!");
            return;
        }

        setLoading(true);
        setError("");
        try {
            await axiosInstance.post("/api/schedules", {
                doctorId: formData.doctorId,
                roomId: Number(formData.roomId),
                scheduleDate: formatISODate(formData.scheduleDate),
                session: formData.session,
            });
            setOpenModal(false);
            setToast({ open: true, message: "Phân lịch ca trực thành công!", severity: "success" });
            loadSchedules();
        } catch (err) {
            setError(err.message || "Lỗi tạo ca trực (Bác sĩ hoặc phòng đã có ca trực trong buổi này)!");
        } finally {
            setLoading(false);
        }
    };

    // Danh sách ca trực đã qua lọc
    const filteredSchedules = useMemo(() => {
        return schedules.filter(sch => {
            const matchesDept = selectedDeptFilter === "ALL" || 
                (sch.departmentName && sch.departmentName.toLowerCase().includes(selectedDeptFilter.toLowerCase())) ||
                departments.some(d => d.departmentId === Number(selectedDeptFilter) && d.departmentName === sch.departmentName);
            
            const matchesSearch = !searchDoctor.trim() || 
                (sch.doctorName && sch.doctorName.toLowerCase().includes(searchDoctor.toLowerCase())) ||
                (sch.roomName && sch.roomName.toLowerCase().includes(searchDoctor.toLowerCase()));

            return matchesDept && matchesSearch;
        });
    }, [schedules, selectedDeptFilter, searchDoctor, departments]);

    // Thống kê nhanh
    const stats = useMemo(() => {
        const morning = schedules.filter(s => s.session === "MORNING").length;
        const afternoon = schedules.filter(s => s.session === "AFTERNOON").length;
        const evening = schedules.filter(s => s.session === "EVENING").length;
        const totalSlots = schedules.reduce((sum, s) => sum + (s.timeSlots?.length || 0), 0);
        const totalBookings = schedules.reduce((sum, s) => 
            sum + (s.timeSlots?.reduce((slotSum, slot) => slotSum + (slot.currentBookings || 0), 0) || 0), 0
        );
        return { total: schedules.length, morning, afternoon, evening, totalSlots, totalBookings };
    }, [schedules]);

    // Danh sách phòng khả dụng theo khoa của bác sĩ đang chọn trong modal
    const availableRoomsForModal = useMemo(() => {
        if (!formData.departmentId) return rooms;
        const filtered = rooms.filter(r => r.departmentId === Number(formData.departmentId));
        return filtered.length > 0 ? filtered : rooms;
    }, [rooms, formData.departmentId]);

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Banner (Apple HIG + Linear) */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: "#0088D6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <EventIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" fontWeight={800} color="#0F172A" letterSpacing="-0.02em">
                                Phân Lịch Trực & Ca Khám Bác Sĩ
                            </Typography>
                            <Chip
                                label="SmartHIS Rostering Pro"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(0, 136, 214, 0.1)",
                                    color: "#0088D6",
                                    border: "1px solid rgba(0, 136, 214, 0.2)"
                                }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.2 }}>
                            Quản lý lịch làm việc, phân bổ buồng khám chuyên khoa và tự động sinh khung giờ 30 phút đặt khám
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1.2}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadSchedules}
                        disabled={tableLoading}
                        sx={{
                            borderRadius: 2.2,
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            color: "#475569",
                            borderColor: "rgba(15, 23, 42, 0.15)",
                            "&:hover": { borderColor: "#0F172A", bgcolor: "rgba(15, 23, 42, 0.04)" }
                        }}
                    >
                        Làm Mới
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenAdd}
                        sx={{
                            borderRadius: 2.2,
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            bgcolor: "#0088D6",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                            "&:hover": { bgcolor: "#0073B7" }
                        }}
                    >
                        Tạo Ca Trực Mới
                    </Button>
                </Box>
            </Paper>

            {/* Quick Stats Cards (Apple HIG + Linear Accent Lines) */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                bgcolor: "#0088D6"
                            }
                        }}
                    >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Tổng Ca Trực Ngày
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#0F172A", mt: 0.5, fontFamily: "monospace" }}>
                                {stats.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                bgcolor: "#0288D1"
                            }
                        }}
                    >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Ca Sáng (07:30 - 11:30)
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#0288D1", mt: 0.5, fontFamily: "monospace" }}>
                                {stats.morning}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                bgcolor: "#F59E0B"
                            }
                        }}
                    >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Ca Chiều (13:00 - 17:00)
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#D97706", mt: 0.5, fontFamily: "monospace" }}>
                                {stats.afternoon}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                bgcolor: "#8B5CF6"
                            }
                        }}
                    >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Ca Tối (17:30 - 20:30)
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#8B5CF6", mt: 0.5, fontFamily: "monospace" }}>
                                {stats.evening}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 3,
                                bgcolor: "#10B981"
                            }
                        }}
                    >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Lượt Đặt / Tổng Slots
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ color: "#059669", mt: 0.5, fontFamily: "monospace" }}>
                                {stats.totalBookings} / {stats.totalSlots * 5}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Thanh chọn ngày & Bộ lọc */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.2,
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)"
                }}
            >
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5} md={3.5}>
                        <Box display="flex" alignItems="center" gap={1.2}>
                            <TextField
                                type="date"
                                size="small"
                                label="Ngày trực"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                            />
                            <Button
                                variant={selectedDate === new Date().toISOString().split("T")[0] ? "contained" : "outlined"}
                                size="small"
                                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    ...(selectedDate === new Date().toISOString().split("T")[0]
                                        ? { bgcolor: "#0088D6" }
                                        : { color: "#475569", borderColor: "rgba(15, 23, 42, 0.2)" })
                                }}
                            >
                                Hôm nay
                            </Button>
                            <Button
                                variant={selectedDate === new Date(Date.now() + 86400000).toISOString().split("T")[0] ? "contained" : "outlined"}
                                size="small"
                                onClick={() => setSelectedDate(new Date(Date.now() + 86400000).toISOString().split("T")[0])}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                    ...(selectedDate === new Date(Date.now() + 86400000).toISOString().split("T")[0]
                                        ? { bgcolor: "#0088D6" }
                                        : { color: "#475569", borderColor: "rgba(15, 23, 42, 0.2)" })
                                }}
                            >
                                Ngày mai
                            </Button>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={4} md={4.5}>
                        <TextField
                            select
                            size="small"
                            fullWidth
                            label="Lọc theo Chuyên khoa"
                            value={selectedDeptFilter}
                            onChange={(e) => setSelectedDeptFilter(e.target.value)}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FilterListIcon fontSize="small" sx={{ color: "#64748B" }} />
                                    </InputAdornment>
                                ),
                            }}
                        >
                            <MenuItem value="ALL">-- Tất cả chuyên khoa --</MenuItem>
                            {departments.map((dept) => (
                                <MenuItem key={dept.departmentId} value={dept.departmentName}>
                                    {dept.departmentName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={3} md={4}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="Tìm tên Bác sĩ, phòng khám..."
                            value={searchDoctor}
                            onChange={(e) => setSearchDoctor(e.target.value)}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: "#64748B" }} />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Bảng danh sách Ca trực (Apple HIG + Linear) */}
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)",
                    overflow: "hidden"
                }}
            >
                <Table>
                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bác Sĩ Phụ Trách</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Chuyên Khoa</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Buồng Khám</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Buổi Trực</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ngày Trực</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Khung Giờ Khám (Slots)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Thao Tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tableLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={36} sx={{ color: "#0088D6" }} />
                                    <Typography variant="body2" sx={{ color: "#64748B", mt: 1 }}>Đang tải danh sách ca trực...</Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredSchedules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#64748B" }}>
                                    <EventIcon sx={{ fontSize: 48, color: "#CBD5E1", mb: 1 }} />
                                    <Typography variant="subtitle1" fontWeight={700} color="#0F172A">
                                        Chưa có ca trực nào phù hợp trong ngày {selectedDate}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
                                        Hãy bấm "Tạo Ca Trực Mới" để lên lịch phân công cho bác sĩ!
                                    </Typography>
                                    <Button 
                                        variant="outlined" 
                                        startIcon={<AddIcon />} 
                                        onClick={handleOpenAdd}
                                        sx={{ 
                                            borderRadius: 2, 
                                            textTransform: "none", 
                                            fontWeight: 700,
                                            borderColor: "rgba(0, 136, 214, 0.3)",
                                            color: "#0088D6"
                                        }}
                                    >
                                        Phân ca trực ngay
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSchedules.map((sch) => {
                                const sessionConfig = {
                                    MORNING: { label: "Buổi Sáng (07:30 - 11:30)", color: "#0288D1", bg: "rgba(2, 136, 209, 0.08)" },
                                    AFTERNOON: { label: "Buổi Chiều (13:00 - 17:00)", color: "#D97706", bg: "rgba(217, 119, 6, 0.08)" },
                                    EVENING: { label: "Buổi Tối (17:30 - 20:30)", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.08)" }
                                }[sch.session] || { label: sch.session, color: "#64748B", bg: "rgba(100, 116, 139, 0.08)" };

                                return (
                                    <TableRow key={sch.scheduleId} hover sx={{ "&:hover": { bgcolor: "rgba(0, 136, 214, 0.02) !important" } }}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1.2}>
                                                <Box
                                                    sx={{
                                                        width: 34,
                                                        height: 34,
                                                        borderRadius: "10px",
                                                        bgcolor: "rgba(0, 136, 214, 0.08)",
                                                        color: "#0088D6",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 700,
                                                        fontSize: "0.8rem"
                                                    }}
                                                >
                                                    BS
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700} color="#0F172A">
                                                        {sch.doctorName || "Bác sĩ"}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: "#64748B" }}>
                                                        {sch.degree || "Bác sĩ chuyên khoa"}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={<LocalHospitalIcon sx={{ fontSize: "15px !important", color: "#0088D6 !important" }} />}
                                                label={sch.departmentName || "Đa khoa"}
                                                size="small"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: "0.75rem",
                                                    bgcolor: "rgba(0, 136, 214, 0.08)",
                                                    color: "#0088D6",
                                                    border: "1px solid rgba(0, 136, 214, 0.2)"
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={<MeetingRoomIcon sx={{ fontSize: "15px !important", color: "#475569 !important" }} />}
                                                label={sch.roomName || `Phòng ${sch.roomId}`}
                                                size="small"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: "0.75rem",
                                                    bgcolor: "#F1F5F9",
                                                    color: "#334155"
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={sessionConfig.label}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: "0.75rem",
                                                    bgcolor: sessionConfig.bg,
                                                    color: sessionConfig.color,
                                                    border: `1px solid ${sessionConfig.color}40`
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: "monospace", fontWeight: 600, color: "#475569" }}>
                                            {sch.scheduleDate}
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" flexWrap="wrap" gap={0.6} maxWidth={440}>
                                                {sch.timeSlots && sch.timeSlots.length > 0 ? (
                                                    sch.timeSlots.map((slot) => {
                                                        const isFull = slot.currentBookings >= slot.maxCapacity;
                                                        const hasBookings = slot.currentBookings > 0;
                                                        return (
                                                            <Tooltip
                                                                key={slot.timeSlotId}
                                                                title={`Đã đặt: ${slot.currentBookings}/${slot.maxCapacity} lượt`}
                                                            >
                                                                <Chip
                                                                    label={`${slot.startTime?.substring(0, 5)} - ${slot.endTime?.substring(0, 5)} (${slot.currentBookings}/${slot.maxCapacity})`}
                                                                    size="small"
                                                                    sx={{
                                                                        fontSize: "0.72rem",
                                                                        fontWeight: 600,
                                                                        fontFamily: "monospace",
                                                                        bgcolor: isFull ? "rgba(239, 68, 68, 0.1)" : hasBookings ? "rgba(0, 136, 214, 0.08)" : "#F8FAFC",
                                                                        color: isFull ? "#EF4444" : hasBookings ? "#0088D6" : "#64748B",
                                                                        border: `1px solid ${isFull ? "rgba(239, 68, 68, 0.25)" : hasBookings ? "rgba(0, 136, 214, 0.25)" : "rgba(15, 23, 42, 0.08)"}`
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        );
                                                    })
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: "#94A3B8" }}>Tự động sinh khi tạo ca</Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Hủy ca trực này">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => setDeleteConfirm({ open: true, schedule: sch })}
                                                    sx={{
                                                        bgcolor: "rgba(239, 68, 68, 0.08)",
                                                        color: "#EF4444",
                                                        "&:hover": { bgcolor: "rgba(239, 68, 68, 0.18)" }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal Tạo ca trực (Apple HIG Style) */}
            <Dialog 
                open={openModal} 
                onClose={() => setOpenModal(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3.5,
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 1 }}>
                    <AddIcon sx={{ color: "#0088D6" }} /> Phân Lịch Trực Mới Cho Bác Sĩ
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleCreate} sx={{ mt: 1 }}>
                        <Grid container spacing={2}>
                            {/* Chọn bác sĩ */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Chọn Bác sĩ phụ trách"
                                    value={formData.doctorId}
                                    onChange={(e) => handleDoctorChange(e.target.value)}
                                    required
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    helperText={
                                        formData.doctorId
                                            ? `Chuyên khoa: ${doctors.find(d => d.doctorId === formData.doctorId)?.departmentName || "Chưa rõ"}`
                                            : "Vui lòng chọn bác sĩ để phân ca"
                                    }
                                >
                                    {doctors.map((doc) => (
                                        <MenuItem key={doc.doctorId} value={doc.doctorId}>
                                            {doc.degree} {doc.fullName} - ({doc.departmentName || "Khoa"})
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {/* Ngày trực */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Ngày trực"
                                    value={formData.scheduleDate}
                                    onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                                    required
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                />
                            </Grid>

                            {/* Buổi trực */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Buổi trực"
                                    value={formData.session}
                                    onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                                    required
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                >
                                    {SESSION_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {/* Buồng / Phòng khám */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Buồng / Phòng khám"
                                    value={formData.roomId}
                                    onChange={(e) => setFormData({ ...formData, roomId: Number(e.target.value) })}
                                    required
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                    helperText="Hệ thống tự động lọc các phòng phù hợp với chuyên khoa của bác sĩ"
                                >
                                    {availableRoomsForModal.map((r) => (
                                        <MenuItem key={r.roomId} value={r.roomId}>
                                            Phòng {r.roomId}: {r.roomName} ({r.departmentName || r.roomType || "Khám bệnh"})
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                <Alert 
                                    severity="info" 
                                    sx={{ 
                                        borderRadius: 2.5, 
                                        bgcolor: "rgba(0, 136, 214, 0.06)", 
                                        color: "#0369A1", 
                                        border: "1px solid rgba(0, 136, 214, 0.15)" 
                                    }}
                                >
                                    💡 Khi tạo ca trực, hệ thống sẽ <b>tự động sinh sẵn 8 khung giờ (30 phút/slot)</b> trong ca để bệnh nhân đặt khám ngay.
                                </Alert>
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, borderColor: "rgba(15, 23, 42, 0.08)" }}>
                    <Button 
                        onClick={() => setOpenModal(false)}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#64748B" }}
                    >
                        Hủy
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleCreate} 
                        disabled={loading}
                        sx={{ 
                            borderRadius: 2, 
                            textTransform: "none", 
                            fontWeight: 700, 
                            bgcolor: "#0088D6",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                            "&:hover": { bgcolor: "#0073B7" }
                        }}
                    >
                        {loading ? "Đang xử lý..." : "Xác Nhận Tạo Ca Trực"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog xác nhận hủy ca trực */}
            <Dialog 
                open={deleteConfirm.open} 
                onClose={() => setDeleteConfirm({ open: false, schedule: null })} 
                maxWidth="xs" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3.5,
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#EF4444", display: "flex", alignItems: "center", gap: 1 }}>
                    <DeleteIcon sx={{ color: "#EF4444" }} /> Xác Nhận Hủy Ca Trực
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: "#334155", lineHeight: 1.6 }}>
                        Bạn có chắc chắn muốn hủy ca trực của bác sĩ <b>{deleteConfirm.schedule?.doctorName}</b> vào ngày <b>{deleteConfirm.schedule?.scheduleDate}</b> không?
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 1.5, p: 1, bgcolor: "#F8FAFC", borderRadius: 1.5 }}>
                        Lưu ý: Tất cả các khung giờ khám 30 phút chưa có bệnh nhân đặt sẽ được tự động dọn dẹp.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 0 }}>
                    <Button 
                        onClick={() => setDeleteConfirm({ open: false, schedule: null })}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#64748B" }}
                    >
                        Bỏ qua
                    </Button>
                    <Button 
                        variant="contained" 
                        color="error" 
                        onClick={handleConfirmDelete}
                        sx={{ 
                            borderRadius: 2, 
                            textTransform: "none", 
                            fontWeight: 700,
                            bgcolor: "#EF4444",
                            boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)",
                            "&:hover": { bgcolor: "#DC2626" }
                        }}
                    >
                        Xác nhận hủy
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast Notification */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: "100%", borderRadius: 2 }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
