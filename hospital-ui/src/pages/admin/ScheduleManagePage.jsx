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
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="primary.main" display="flex" alignItems="center" gap={1}>
                        <EventIcon fontSize="large" color="primary" /> Phân Lịch Trực & Ca Khám Bác Sĩ
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Quản lý lịch làm việc, phân bổ buồng khám chuyên khoa và tự động tạo khung giờ 30 phút
                    </Typography>
                </Box>
                <Box display="flex" gap={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadSchedules}
                        disabled={tableLoading}
                    >
                        Làm Mới
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleOpenAdd}
                        sx={{ px: 3, fontWeight: "bold", borderRadius: 2 }}
                    >
                        Tạo Ca Trực Mới
                    </Button>
                </Box>
            </Box>

            {/* Quick Stats Cards */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FFFFFF" }}>
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: 0.5 }}>TỔNG CA TRỰC NGÀY</Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: "#0088D6", mt: 0.5 }}>{stats.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FFFFFF" }}>
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: 0.5 }}>CA SÁNG (07:30 - 11:30)</Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: "#0288D1", mt: 0.5 }}>{stats.morning}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FFFFFF" }}>
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: 0.5 }}>CA CHIỀU (13:00 - 17:00)</Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: "#F59E0B", mt: 0.5 }}>{stats.afternoon}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FFFFFF" }}>
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: 0.5 }}>CA TỐI (17:30 - 20:30)</Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: "#8B5CF6", mt: 0.5 }}>{stats.evening}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FFFFFF" }}>
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: 0.5 }}>LƯỢT ĐẶT / SLOTS</Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: "#008C69", mt: 0.5 }}>{stats.totalBookings} / {stats.totalSlots * 5}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Thanh chọn ngày & Bộ lọc */}
            <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4} md={3}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <EventIcon color="primary" />
                            <TextField
                                type="date"
                                size="small"
                                label="Chọn ngày trực"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={8} md={3}>
                        <Box display="flex" gap={1}>
                            <Button
                                variant={selectedDate === new Date().toISOString().split("T")[0] ? "contained" : "outlined"}
                                size="small"
                                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                            >
                                Hôm nay
                            </Button>
                            <Button
                                variant={selectedDate === new Date(Date.now() + 86400000).toISOString().split("T")[0] ? "contained" : "outlined"}
                                size="small"
                                onClick={() => setSelectedDate(new Date(Date.now() + 86400000).toISOString().split("T")[0])}
                            >
                                Ngày mai
                            </Button>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            select
                            size="small"
                            fullWidth
                            label="Lọc theo Chuyên khoa"
                            value={selectedDeptFilter}
                            onChange={(e) => setSelectedDeptFilter(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FilterListIcon fontSize="small" />
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
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="Tìm tên Bác sĩ, phòng..."
                            value={searchDoctor}
                            onChange={(e) => setSearchDoctor(e.target.value)}
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

            {/* Bảng danh sách Ca trực */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
                <Table>
                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Bác sĩ phụ trách</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Chuyên khoa</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Buồng khám</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Buổi trực</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Ngày trực</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Khung giờ khám (Slots)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tableLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                                    <CircularProgress size={36} />
                                    <Typography variant="body2" color="textSecondary" mt={1}>Đang tải danh sách ca trực...</Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredSchedules.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>
                                    <EventIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        Chưa có ca trực nào phù hợp trong ngày {selectedDate}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" mb={2}>
                                        Hãy bấm "Tạo Ca Trực Mới" để lên lịch phân công cho bác sĩ!
                                    </Typography>
                                    <Button variant="outlined" color="primary" startIcon={<AddIcon />} onClick={handleOpenAdd}>
                                        Phân ca trực ngay
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSchedules.map((sch) => {
                                const sessionInfo = SESSION_OPTIONS.find((s) => s.value === sch.session) || {
                                    label: sch.session,
                                    shortLabel: sch.session,
                                    color: "default",
                                };
                                return (
                                    <TableRow key={sch.scheduleId} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <PersonIcon color="primary" fontSize="small" />
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                                                        {sch.doctorName || "Bác sĩ"}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {sch.degree || "Bác sĩ chuyên khoa"}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={<LocalHospitalIcon fontSize="small" />}
                                                label={sch.departmentName || "Đa khoa"}
                                                size="small"
                                                variant="outlined"
                                                color="info"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={<MeetingRoomIcon fontSize="small" />}
                                                label={sch.roomName || `Phòng ${sch.roomId}`}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={sessionInfo.label} color={sessionInfo.color} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{sch.scheduleDate}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" flexWrap="wrap" gap={0.5} maxWidth={420}>
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
                                                                    variant={hasBookings ? "filled" : "outlined"}
                                                                    color={isFull ? "error" : hasBookings ? "primary" : "default"}
                                                                    sx={{ fontSize: "0.75rem" }}
                                                                />
                                                            </Tooltip>
                                                        );
                                                    })
                                                ) : (
                                                    <Typography variant="caption" color="textSecondary">Tự động sinh khi tạo ca</Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Hủy ca trực này">
                                                <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ open: true, schedule: sch })}>
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

            {/* Modal Tạo ca trực */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="primary.main" display="flex" alignItems="center" gap={1}>
                    <AddIcon /> Phân Lịch Trực Mới Cho Bác Sĩ
                </DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleCreate}>
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
                                <Alert severity="info">
                                    💡 Khi tạo ca trực, hệ thống sẽ <b>tự động sinh sẵn 8 khung giờ (30 phút/slot)</b> trong ca để bệnh nhân đặt khám ngay.
                                </Alert>
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenModal(false)}>Hủy</Button>
                    <Button variant="contained" color="primary" onClick={handleCreate} disabled={loading}>
                        {loading ? "Đang xử lý..." : "Xác Nhận Tạo Ca Trực"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog xác nhận hủy ca trực */}
            <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, schedule: null })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: "error.main", display: "flex", alignItems: "center", gap: 1 }}>
                    <DeleteIcon color="error" /> Xác nhận hủy ca trực
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: "#334155" }}>
                        Bạn có chắc chắn muốn hủy ca trực của bác sĩ <b>{deleteConfirm.schedule?.doctorName}</b> vào ngày <b>{deleteConfirm.schedule?.scheduleDate}</b> không?
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
                        Lưu ý: Tất cả các khung giờ khám 30 phút chưa có bệnh nhân đặt sẽ được tự động dọn dẹp.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={() => setDeleteConfirm({ open: false, schedule: null })} color="inherit">
                        Bỏ qua
                    </Button>
                    <Button variant="contained" color="error" onClick={handleConfirmDelete}>
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
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: "100%" }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
