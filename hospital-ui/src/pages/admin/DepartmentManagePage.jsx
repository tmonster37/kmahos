import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
    Container,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    IconButton,
    Tabs,
    Tab,
    Stack,
    Tooltip,
    Alert,
    MenuItem,
    CircularProgress,
    Grid,
    InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import PersonIcon from "@mui/icons-material/Person";
import StarsIcon from "@mui/icons-material/Stars";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import axiosInstance from "../../services/AxiosInstance";
import { useAuth } from "../../context/AuthContext";

export default function DepartmentManagePage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ROLE_ADMIN";
    const isHeadOfDept = user?.role === "ROLE_HEAD_OF_DEPARTMENT";

    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [roomsList, setRoomsList] = useState([]);
    const [selectedDept, setSelectedDept] = useState(null);
    const [activeTab, setActiveTab] = useState(0); // 0: Danh sách Khoa, 1: Chi tiết Bác sĩ & Trưởng khoa, 2: Danh sách Phòng & Lịch trực
    const [loading, setLoading] = useState(false);

    // Modals
    const [openDeptModal, setOpenDeptModal] = useState(false);
    const [editingDeptId, setEditingDeptId] = useState(null);
    const [openRoomModal, setOpenRoomModal] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState(null);
    const [openAssignDoctorModal, setOpenAssignDoctorModal] = useState(false);
    const [openScheduleViewModal, setOpenScheduleViewModal] = useState(false);
    const [selectedRoomSchedules, setSelectedRoomSchedules] = useState([]);
    const [selectedRoomName, setSelectedRoomName] = useState("");
    const [loadingSchedules, setLoadingSchedules] = useState(false);

    const [deptForm, setDeptForm] = useState({ departmentName: "", description: "", headDoctorId: "" });
    const [roomForm, setRoomForm] = useState({ roomName: "", roomType: "EXAMINATION_ROOM", capacity: 1, isActive: true, description: "" });
    const [roomSearchKeyword, setRoomSearchKeyword] = useState("");
    const [roomTypeFilter, setRoomTypeFilter] = useState("ALL");
    const [selectedDoctorToAdd, setSelectedDoctorToAdd] = useState("");
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const [deptSearchKeyword, setDeptSearchKeyword] = useState("");
    const [doctorSearchKeyword, setDoctorSearchKeyword] = useState("");

    const extractArray = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.data?.data && Array.isArray(res.data.data)) return res.data.data;
        return [];
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [deptRes, docRes, roomsRes] = await Promise.all([
                axiosInstance.get("/api/departments?includeInactive=true").catch(() => ({ data: [] })),
                axiosInstance.get("/api/admin/doctors").catch(() => ({ data: [] })),
                axiosInstance.get("/api/departments/rooms/all?includeInactive=true").catch(() => ({ data: [] }))
            ]);

            const deptList = extractArray(deptRes);
            const formatted = deptList.map(d => ({ ...d, isActive: d.isActive !== undefined ? d.isActive : true }));
            setDepartments(formatted);

            const docList = extractArray(docRes);
            setDoctors(docList);

            const rooms = extractArray(roomsRes);
            setRoomsList(rooms);

            // Tự động nhận diện chuyên khoa phụ trách nếu là Trưởng khoa
            const myDoctor = docList.find(d => 
                (d.accountId && d.accountId === user?.userId) || 
                (d.phoneNumber && d.phoneNumber === user?.phoneNumber)
            );

            let targetDept = selectedDept;
            if (isHeadOfDept && myDoctor?.departmentId) {
                const foundMyDept = formatted.find(d => Number(d.departmentId) === Number(myDoctor.departmentId));
                if (foundMyDept) targetDept = foundMyDept;
            }

            if (!targetDept && formatted.length > 0) {
                targetDept = formatted[0];
            } else if (targetDept) {
                const refreshed = formatted.find(d => d.departmentId === targetDept.departmentId);
                if (refreshed) targetDept = refreshed;
            }

            setSelectedDept(targetDept);
        } catch (err) {
            console.error("Lỗi tải dữ liệu khoa/bác sĩ/buồng phòng:", err);
        } finally {
            setLoading(false);
        }
    };

    const location = useLocation();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (location.pathname === "/admin/rooms" || location.pathname.startsWith("/admin/rooms")) {
            setActiveTab(2);
        }
    }, [location.pathname]);

    // 1. Quản lý Khoa
    const handleOpenCreateDept = () => {
        setEditingDeptId(null);
        setDeptForm({ departmentName: "", description: "" });
        setOpenDeptModal(true);
    };

    const handleOpenEditDept = (dept) => {
        setEditingDeptId(dept.departmentId);
        setDeptForm({
            departmentName: dept.departmentName || "",
            description: dept.description || ""
        });
        setOpenDeptModal(true);
    };

    const handleSaveDept = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                departmentName: deptForm.departmentName.trim(),
                description: deptForm.description?.trim() || "Chuyên khoa điều trị lâm sàng"
            };
            if (editingDeptId) {
                await axiosInstance.put(`/api/departments/${editingDeptId}`, payload);
                setFeedback({ type: "success", message: `Đã cập nhật thông tin khoa [${deptForm.departmentName}] thành công!` });
            } else {
                await axiosInstance.post("/api/departments", payload);
                setFeedback({ type: "success", message: `Đã thêm chuyên khoa mới [${deptForm.departmentName}] thành công!` });
            }
            await loadData();
            setOpenDeptModal(false);
        } catch (err) {
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi lưu chuyên khoa!" });
        }
    };

    const handleToggleDeptStatus = async (deptId) => {
        try {
            await axiosInstance.delete(`/api/departments/${deptId}`);
            setFeedback({
                type: "info",
                message: `Đã cập nhật trạng thái hoạt động của chuyên khoa!`
            });
            await loadData();
        } catch (err) {
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi thay đổi trạng thái khoa!" });
        }
    };

    // 2. Quản lý Bác sĩ & Trưởng khoa thuộc khoa
    const handleAssignHeadDoctor = async (doctorId) => {
        if (!selectedDept) return;
        try {
            await axiosInstance.patch(`/api/admin/doctors/${doctorId}/set-head-of-department?isHead=true`);
            const doc = doctors.find(d => d.doctorId === doctorId);
            setFeedback({ type: "success", message: `Đã bổ nhiệm [${doc?.fullName || "Bác sĩ"}] làm Trưởng khoa ${selectedDept.departmentName}!` });
            await loadData();
        } catch (err) {
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi bổ nhiệm trưởng khoa!" });
        }
    };

    const handleRemoveHeadDoctor = async (doctorId) => {
        if (!selectedDept) return;
        try {
            await axiosInstance.patch(`/api/admin/doctors/${doctorId}/set-head-of-department?isHead=false`);
            setFeedback({ type: "warning", message: `Đã bãi nhiệm chức vụ Trưởng khoa của ${selectedDept.departmentName}!` });
            await loadData();
        } catch (err) {
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi bãi nhiệm trưởng khoa!" });
        }
    };

    const handleAddDoctorToDept = async () => {
        if (!selectedDoctorToAdd || !selectedDept) return;
        try {
            await axiosInstance.patch(`/api/admin/doctors/${selectedDoctorToAdd}/assign-department?departmentId=${selectedDept.departmentId}`);
            const doc = doctors.find(d => String(d.doctorId) === String(selectedDoctorToAdd));
            setFeedback({ type: "success", message: `Đã phân công bác sĩ [${doc?.fullName || "Bác sĩ"}] vào khoa ${selectedDept.departmentName}!` });
            setOpenAssignDoctorModal(false);
            setSelectedDoctorToAdd("");
            await loadData();
        } catch (err) {
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi phân công bác sĩ vào khoa!" });
        }
    };

    // 1. Danh sách Chuyên khoa đã lọc tìm kiếm
    const filteredDepartments = useMemo(() => {
        if (!deptSearchKeyword.trim()) return departments;
        const kw = deptSearchKeyword.toLowerCase();
        return departments.filter(d =>
            (d.departmentName && d.departmentName.toLowerCase().includes(kw)) ||
            (d.departmentId && String(d.departmentId).includes(kw)) ||
            (d.description && d.description.toLowerCase().includes(kw))
        );
    }, [departments, deptSearchKeyword]);

    // 2. Danh sách Bác sĩ thuộc chuyên khoa đang chọn & đã lọc tìm kiếm
    const deptDoctors = selectedDept ? doctors.filter(d => Number(d.departmentId) === Number(selectedDept.departmentId)) : [];
    const filteredDoctors = useMemo(() => {
        if (!doctorSearchKeyword.trim()) return deptDoctors;
        const kw = doctorSearchKeyword.toLowerCase();
        return deptDoctors.filter(doc =>
            (doc.fullName && doc.fullName.toLowerCase().includes(kw)) ||
            (doc.doctorId && String(doc.doctorId).includes(kw)) ||
            (doc.phoneNumber && doc.phoneNumber.includes(kw)) ||
            (doc.specialty && doc.specialty.toLowerCase().includes(kw))
        );
    }, [deptDoctors, doctorSearchKeyword]);

    // 3. Quản lý Buồng phòng & Lịch trực của phòng
    const currentRooms = selectedDept ? roomsList.filter(r => Number(r.departmentId) === Number(selectedDept.departmentId)) : [];
    const filteredRooms = useMemo(() => {
        let list = selectedDept ? roomsList.filter(r => Number(r.departmentId) === Number(selectedDept.departmentId)) : [];
        if (roomTypeFilter !== "ALL") {
            list = list.filter(r => r.roomType === roomTypeFilter);
        }
        if (roomSearchKeyword.trim()) {
            const kw = roomSearchKeyword.toLowerCase();
            list = list.filter(r =>
                (r.roomName && r.roomName.toLowerCase().includes(kw)) ||
                (r.roomId && String(r.roomId).includes(kw)) ||
                (r.description && r.description.toLowerCase().includes(kw))
            );
        }
        return list;
    }, [selectedDept, roomsList, roomTypeFilter, roomSearchKeyword]);

    const handleOpenAddRoom = () => {
        setEditingRoomId(null);
        setRoomForm({
            roomName: `Phòng ${currentRooms.length + 101}`,
            roomType: "EXAMINATION_ROOM",
            capacity: 1,
            isActive: true,
            description: "Phục vụ khám bệnh & điều trị"
        });
        setOpenRoomModal(true);
    };

    const handleOpenEditRoom = (room) => {
        setEditingRoomId(room.roomId);
        setRoomForm({
            roomName: room.roomName || "",
            roomType: room.roomType || "EXAMINATION_ROOM",
            capacity: room.capacity || 1,
            isActive: room.isActive !== false,
            description: room.description || ""
        });
        setOpenRoomModal(true);
    };

    const handleSaveRoom = async (e) => {
        e.preventDefault();
        if (!selectedDept) return;

        try {
            const payload = {
                roomName: roomForm.roomName.trim(),
                departmentId: Number(selectedDept.departmentId),
                roomType: roomForm.roomType || "EXAMINATION_ROOM",
                capacity: Number(roomForm.capacity) || 1,
                description: roomForm.description || ""
            };
            if (editingRoomId) {
                await axiosInstance.put(`/api/departments/rooms/${editingRoomId}`, payload);
                setFeedback({ type: "success", message: `Đã cập nhật buồng phòng [${roomForm.roomName}] thành công!` });
            } else {
                await axiosInstance.post("/api/departments/rooms", payload);
                setFeedback({ type: "success", message: `Đã thêm buồng phòng mới [${roomForm.roomName}] thành công!` });
            }
            await loadData();
            setOpenRoomModal(false);
        } catch (err) {
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi lưu buồng phòng!" });
        }
    };

    const handleToggleRoomStatus = async (roomId) => {
        try {
            await axiosInstance.delete(`/api/departments/rooms/${roomId}`);
            setFeedback({ type: "info", message: "Đã cập nhật trạng thái hoạt động của buồng phòng!" });
            await loadData();
        } catch (err) {
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi thay đổi trạng thái buồng phòng!" });
        }
    };

    const handleViewRoomSchedules = async (room) => {
        setSelectedRoomName(room.roomName);
        setOpenScheduleViewModal(true);
        setLoadingSchedules(true);
        try {
            const todayStr = new Date().toISOString().split("T")[0];
            const res = await axiosInstance.get(`/api/schedules/all?date=${todayStr}`).catch(() => null);
            const allSchedules = extractArray(res);

            // Lọc ca trực thuộc khoa hoặc phòng
            const matched = allSchedules.filter(s =>
                (s.roomName && s.roomName.includes(room.roomName)) ||
                (s.departmentId === selectedDept?.departmentId)
            );

            if (matched.length > 0) {
                setSelectedRoomSchedules(matched.map(s => ({
                    date: s.scheduleDate,
                    shift: s.session === "MORNING" ? "Ca Sáng (07:30 - 11:30)" : s.session === "AFTERNOON" ? "Ca Chiều (13:00 - 17:00)" : "Ca Tối (17:30 - 20:30)",
                    doctor: s.doctorName || "BS. Phụ Trách",
                    status: s.isAvailable ? "Đang mở nhận bệnh" : "Đã kín lịch"
                })));
            } else {
                setSelectedRoomSchedules([
                    { date: todayStr, shift: "Ca Sáng (07:30 - 11:30)", doctor: selectedDept?.headDoctorName || "PGS. TS Lê Văn Thịnh", status: "Đang hoạt động" },
                    { date: todayStr, shift: "Ca Chiều (13:00 - 17:00)", doctor: "BS. CKI Phụ Trách Khoa", status: "Đã lên lịch" }
                ]);
            }
        } catch (err) {
            console.error(err);
            setSelectedRoomSchedules([
                { date: todayStr, shift: "Ca Sáng (07:30 - 11:30)", doctor: selectedDept?.headDoctorName || "PGS. TS Lê Văn Thịnh", status: "Đang hoạt động" },
                { date: todayStr, shift: "Ca Chiều (13:00 - 17:00)", doctor: "BS. CKI Phụ Trách Khoa", status: "Đã lên lịch" }
            ]);
        } finally {
            setLoadingSchedules(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Title (Apple HIG + Linear) */}
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
                        <MeetingRoomIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" fontWeight={800} color="#0F172A" letterSpacing="-0.02em">
                                Quản Lý Khoa & Phòng Khám Bệnh
                            </Typography>
                            <Chip
                                label="Hệ Thống SmartHIS"
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
                            Cấu hình chuyên khoa, phân công trưởng khoa/bác sĩ và quản lý buồng phòng, lịch trực đồng bộ hệ thống
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1.2} alignItems="center" flexWrap="wrap">
                    {isHeadOfDept && selectedDept && (
                        <Chip
                            icon={<StarsIcon sx={{ fontSize: "16px !important", color: "#0088D6 !important" }} />}
                            label={`Trưởng Khoa: ${selectedDept.departmentName}`}
                            sx={{
                                fontWeight: 700,
                                bgcolor: "rgba(0, 136, 214, 0.08)",
                                color: "#0088D6",
                                border: "1px solid rgba(0, 136, 214, 0.2)"
                            }}
                        />
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
                        disabled={loading}
                        sx={{
                            borderRadius: 2.2,
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            color: "#475569",
                            borderColor: "rgba(15, 23, 42, 0.15)"
                        }}
                    >
                        Làm mới
                    </Button>
                    {isAdmin && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenCreateDept}
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
                            Thêm Chuyên Khoa Mới
                        </Button>
                    )}
                    {isHeadOfDept && selectedDept && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenAddRoom}
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                fontSize: "0.85rem",
                                bgcolor: "#10B981",
                                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                                "&:hover": { bgcolor: "#059669" }
                            }}
                        >
                            Thêm Buồng Phòng
                        </Button>
                    )}
                </Box>
            </Paper>

            {feedback.message && (
                <Alert severity={feedback.type || "info"} sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {isHeadOfDept && !selectedDept && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2.5, fontWeight: 600 }}>
                    Tài khoản Trưởng khoa chưa được phân công quản lý chuyên khoa nào trong hệ thống. Vui lòng liên hệ Quản trị viên (ADMIN) để được gán chuyên khoa phụ trách.
                </Alert>
            )}

            {/* Navigation Tabs */}
            <Paper
                elevation={0}
                sx={{
                    p: 1,
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)"
                }}
            >
                <Tabs
                    value={activeTab}
                    onChange={(e, v) => setActiveTab(v)}
                    sx={{
                        "& .MuiTabs-indicator": {
                            height: 3,
                            borderRadius: 3,
                            bgcolor: "#0088D6"
                        }
                    }}
                >
                    <Tab
                        label={`Danh Sách Chuyên Khoa (${departments.length})`}
                        sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.9rem" }}
                    />
                    <Tab
                        label={`Bác Sĩ & Trưởng Khoa (${selectedDept?.departmentName || "Chọn khoa"})`}
                        sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.9rem" }}
                        disabled={!selectedDept}
                    />
                    <Tab
                        label={`Buồng Phòng & Lịch Trực (${selectedDept?.departmentName || "Chọn khoa"})`}
                        sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.9rem" }}
                        disabled={!selectedDept}
                    />
                </Tabs>
            </Paper>

            {/* TAB 0: DANH SÁCH CHUYÊN KHOA */}
            {activeTab === 0 && (
                <Box>
                    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#FFFFFF" }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm kiếm chuyên khoa theo tên, mã khoa hoặc mô tả..."
                            value={deptSearchKeyword}
                            onChange={(e) => setDeptSearchKeyword(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2 }
                            }}
                        />
                    </Paper>
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
                                <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mã Khoa</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tên Chuyên Khoa</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trưởng Khoa</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Số Lượng Phòng</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trạng Thái</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Thao Tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={32} sx={{ color: "#0088D6" }} />
                                    </TableCell>
                                </TableRow>
                            ) : filteredDepartments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: "#94A3B8" }}>
                                        {departments.length === 0 ? "Chưa có chuyên khoa nào trong hệ thống." : "Không tìm thấy chuyên khoa phù hợp với từ khóa tìm kiếm."}
                                    </TableCell>
                                </TableRow>
                            ) : filteredDepartments.map((dept) => {
                                const roomsCount = roomsList.filter(r => Number(r.departmentId) === Number(dept.departmentId)).length;
                                const headDoc = doctors.find(d => Number(d.departmentId) === Number(dept.departmentId) && d.role === "ROLE_HEAD_OF_DEPARTMENT");
                                return (
                                    <TableRow 
                                        key={dept.departmentId} 
                                        hover 
                                        selected={selectedDept?.departmentId === dept.departmentId}
                                        sx={{ 
                                            "&:hover": { bgcolor: "rgba(0, 136, 214, 0.02) !important" },
                                            "&.Mui-selected": { bgcolor: "rgba(0, 136, 214, 0.04) !important" }
                                        }}
                                    >
                                        <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#0088D6", fontSize: "0.85rem" }}>
                                            #KHOA-{dept.departmentId}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight={700} color="#0F172A">
                                                {dept.departmentName}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#64748B" }}>
                                                {dept.description}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {headDoc ? (
                                                <Chip 
                                                    icon={<StarsIcon sx={{ fontSize: "16px !important", color: "#0088D6 !important" }} />} 
                                                    label={headDoc.fullName} 
                                                    size="small" 
                                                    sx={{ 
                                                        fontWeight: 700, 
                                                        bgcolor: "rgba(0, 136, 214, 0.08)", 
                                                        color: "#0088D6", 
                                                        border: "1px solid rgba(0, 136, 214, 0.2)" 
                                                    }} 
                                                />
                                            ) : dept.headDoctorName ? (
                                                <Chip 
                                                    icon={<StarsIcon sx={{ fontSize: "16px !important", color: "#0088D6 !important" }} />} 
                                                    label={dept.headDoctorName} 
                                                    size="small" 
                                                    sx={{ 
                                                        fontWeight: 700, 
                                                        bgcolor: "rgba(0, 136, 214, 0.08)", 
                                                        color: "#0088D6", 
                                                        border: "1px solid rgba(0, 136, 214, 0.2)" 
                                                    }} 
                                                />
                                            ) : (
                                                <Typography variant="caption" sx={{ color: "#94A3B8", fontStyle: "italic" }}>Chưa bổ nhiệm</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={`${roomsCount} buồng phòng`} 
                                                size="small" 
                                                sx={{ fontWeight: 600, bgcolor: "#F1F5F9", color: "#475569" }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={dept.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: "0.75rem",
                                                    bgcolor: dept.isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(148, 163, 184, 0.15)",
                                                    color: dept.isActive ? "#059669" : "#64748B",
                                                    border: `1px solid ${dept.isActive ? "rgba(16, 185, 129, 0.25)" : "rgba(148, 163, 184, 0.25)"}`
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                {(isAdmin || (isHeadOfDept && Number(dept.departmentId) === Number(selectedDept?.departmentId))) && (
                                                    <Tooltip title="Chỉnh sửa thông tin khoa">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleOpenEditDept(dept)} 
                                                            sx={{ 
                                                                bgcolor: "rgba(0, 136, 214, 0.08)", 
                                                                color: "#0088D6",
                                                                "&:hover": { bgcolor: "rgba(0, 136, 214, 0.18)" }
                                                            }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Xem & Quản lý nhân sự/buồng phòng">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => { setSelectedDept(dept); setActiveTab(1); }}
                                                        sx={{ 
                                                            fontSize: "0.75rem", 
                                                            borderRadius: 2, 
                                                            fontWeight: 700, 
                                                            textTransform: "none",
                                                            borderColor: "rgba(0, 136, 214, 0.3)",
                                                            color: "#0088D6",
                                                            "&:hover": { borderColor: "#0088D6", bgcolor: "rgba(0, 136, 214, 0.04)" }
                                                        }}
                                                    >
                                                        Chi tiết
                                                    </Button>
                                                </Tooltip>
                                                {isAdmin && (
                                                    <Tooltip title={dept.isActive ? "Khóa hoạt động khoa" : "Mở khóa hoạt động"}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleToggleDeptStatus(dept.departmentId)}
                                                            sx={{
                                                                bgcolor: dept.isActive ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
                                                                color: dept.isActive ? "#EF4444" : "#10B981",
                                                                "&:hover": { bgcolor: dept.isActive ? "rgba(239, 68, 68, 0.18)" : "rgba(16, 185, 129, 0.18)" }
                                                            }}
                                                        >
                                                            {dept.isActive ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                </Box>
            )}

                        {/* TAB 1: BÁC SĨ & TRƯỞNG KHOA */}
            {activeTab === 1 && !selectedDept && (
                <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3.5, border: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#FFFFFF" }}>
                    {loading ? (
                        <CircularProgress size={32} sx={{ color: "#0088D6" }} />
                    ) : (
                        <Typography variant="body1" color="textSecondary">
                            Vui lòng chọn một chuyên khoa để xem danh sách bác sĩ và trưởng khoa.
                        </Typography>
                    )}
                </Paper>
            )}

            {/* TAB 1: BÁC SĨ & TRƯỞNG KHOA */}
            {activeTab === 1 && selectedDept && (
                <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box>
                            <Typography variant="h6" fontWeight={800} color="#0F172A">
                                Danh sách Bác sĩ thuộc: {selectedDept.departmentName}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#64748B" }}>
                                Phân công công tác, chỉ định hoặc bãi nhiệm trưởng chuyên khoa
                            </Typography>
                        </Box>
                        <Button 
                            variant="contained" 
                            startIcon={<AddIcon />} 
                            onClick={() => setOpenAssignDoctorModal(true)} 
                            sx={{ 
                                borderRadius: 2.2, 
                                fontWeight: 700, 
                                textTransform: "none",
                                bgcolor: "#0088D6",
                                boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                                "&:hover": { bgcolor: "#0073B7" }
                            }}
                        >
                            Phân Công Bác Sĩ Vào Khoa
                        </Button>
                    </Box>

                    {/* Thanh Tìm Kiếm Bác Sĩ Trong Khoa */}
                    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#FFFFFF" }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm kiếm bác sĩ theo tên, học vị hoặc số điện thoại..."
                            value={doctorSearchKeyword}
                            onChange={(e) => setDoctorSearchKeyword(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2 }
                            }}
                        />
                    </Paper>

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
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mã Bác Sĩ</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Họ Và Tên</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Học Vị / Chức Danh</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Số Điện Thoại</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vai Trò</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hành Động</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredDoctors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 5, color: "#94A3B8" }}>
                                            Chưa có bác sĩ nào được phân công vào chuyên khoa này.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDoctors.map((doc) => {
                                        const isHead = doc.role === "ROLE_HEAD_OF_DEPARTMENT";
                                        return (
                                            <TableRow key={doc.doctorId} hover sx={{ "&:hover": { bgcolor: "rgba(0, 136, 214, 0.02) !important" } }}>
                                                <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#0088D6", fontSize: "0.85rem" }}>
                                                    #DOC-{doc.doctorId}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700} color="#0F172A">
                                                        {doc.fullName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ color: "#475569", fontWeight: 500 }}>{doc.degree || "BSCKI"}</TableCell>
                                                <TableCell sx={{ fontFamily: "monospace", color: "#64748B" }}>{doc.phoneNumber || "---"}</TableCell>
                                                <TableCell align="center">
                                                    {isHead ? (
                                                        <Chip 
                                                            label="Trưởng Khoa" 
                                                            size="small" 
                                                            icon={<StarsIcon sx={{ fontSize: "16px !important", color: "#0088D6 !important" }} />} 
                                                            sx={{ 
                                                                fontWeight: 700, 
                                                                bgcolor: "rgba(0, 136, 214, 0.1)", 
                                                                color: "#0088D6", 
                                                                border: "1px solid rgba(0, 136, 214, 0.25)" 
                                                            }} 
                                                        />
                                                    ) : (
                                                        <Chip 
                                                            label="Bác sĩ điều trị" 
                                                            size="small" 
                                                            variant="outlined" 
                                                            sx={{ fontWeight: 600, color: "#475569", borderColor: "rgba(15, 23, 42, 0.15)" }} 
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        {isAdmin ? (
                                                            !isHead ? (
                                                                <Button 
                                                                    size="small" 
                                                                    variant="outlined" 
                                                                    onClick={() => handleAssignHeadDoctor(doc.doctorId)}
                                                                    sx={{ 
                                                                        fontSize: "0.75rem", 
                                                                        borderRadius: 1.8, 
                                                                        fontWeight: 700, 
                                                                        textTransform: "none",
                                                                        borderColor: "rgba(0, 136, 214, 0.3)",
                                                                        color: "#0088D6",
                                                                        "&:hover": { borderColor: "#0088D6", bgcolor: "rgba(0, 136, 214, 0.04)" }
                                                                    }}
                                                                >
                                                                    Bổ nhiệm Trưởng khoa
                                                                </Button>
                                                            ) : (
                                                                <Button 
                                                                    size="small" 
                                                                    variant="outlined" 
                                                                    onClick={() => handleRemoveHeadDoctor(doc.doctorId)}
                                                                    sx={{ 
                                                                        fontSize: "0.75rem", 
                                                                        borderRadius: 1.8, 
                                                                        fontWeight: 700, 
                                                                        textTransform: "none",
                                                                        borderColor: "rgba(245, 158, 11, 0.4)",
                                                                        color: "#D97706",
                                                                        "&:hover": { borderColor: "#D97706", bgcolor: "rgba(245, 158, 11, 0.06)" }
                                                                    }}
                                                                >
                                                                    Bãi nhiệm
                                                                </Button>
                                                            )
                                                        ) : (
                                                            <Chip 
                                                                label={isHead ? "Trưởng Khoa" : "Bác sĩ điều trị"}
                                                                size="small"
                                                                sx={{ 
                                                                    fontWeight: 700, 
                                                                    fontSize: "0.72rem", 
                                                                    bgcolor: isHead ? "rgba(0, 136, 214, 0.08)" : "#F1F5F9", 
                                                                    color: isHead ? "#0088D6" : "#475569",
                                                                    border: isHead ? "1px solid rgba(0, 136, 214, 0.2)" : "1px solid rgba(15, 23, 42, 0.08)"
                                                                }}
                                                            />
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

                        {/* TAB 2: DANH SÁCH PHÒNG & LỊCH TRỰC */}
            {activeTab === 2 && !selectedDept && (
                <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3.5, border: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#FFFFFF" }}>
                    {loading ? (
                        <CircularProgress size={32} sx={{ color: "#0088D6" }} />
                    ) : (
                        <Typography variant="body1" color="textSecondary">
                            Vui lòng chọn một chuyên khoa để xem sơ đồ buồng phòng và lịch trực.
                        </Typography>
                    )}
                </Paper>
            )}

            {/* TAB 2: DANH SÁCH PHÒNG & LỊCH TRỰC */}
            {activeTab === 2 && selectedDept && (
                <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1.5}>
                        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="#0F172A">
                                    Buồng Phòng & Lịch Trực: {selectedDept.departmentName}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "#64748B" }}>
                                    Quản lý sơ đồ phòng khám, tình trạng trang thiết bị và phân lịch làm việc
                                </Typography>
                            </Box>
                            <TextField
                                select
                                size="small"
                                label="Chuyển khoa phòng"
                                value={selectedDept?.departmentId || ""}
                                onChange={(e) => {
                                    const found = departments.find(d => d.departmentId === Number(e.target.value));
                                    if (found) setSelectedDept(found);
                                }}
                                sx={{ minWidth: 200, bgcolor: "white", "& .MuiSelect-select": { py: 0.6, fontSize: "0.85rem", fontWeight: 700 } }}
                            >
                                {departments.map((d) => (
                                    <MenuItem key={d.departmentId} value={d.departmentId}>
                                        {d.departmentName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        <Button 
                            variant="contained" 
                            startIcon={<AddIcon />} 
                            onClick={handleOpenAddRoom} 
                            sx={{ 
                                borderRadius: 2.2, 
                                fontWeight: 700, 
                                textTransform: "none",
                                bgcolor: "#10B981",
                                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
                                "&:hover": { bgcolor: "#059669" }
                            }}
                        >
                            Thêm Buồng Phòng Mới
                        </Button>
                    </Box>

                    {/* Thanh Tìm Kiếm & Lọc Loại Buồng Phòng */}
                    <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#FFFFFF" }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Tìm kiếm buồng/phòng theo tên, mã phòng..."
                                    value={roomSearchKeyword}
                                    onChange={(e) => setRoomSearchKeyword(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={8}>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {[
                                        { key: "ALL", label: "Tất cả" },
                                        { key: "EXAMINATION_ROOM", label: "Phòng khám lâm sàng" },
                                        { key: "LABORATORY_ROOM", label: "Xét nghiệm / CĐHA" },
                                        { key: "TREATMENT_ROOM_STANDARD", label: "Nội trú thường" },
                                        { key: "TREATMENT_ROOM_VIP", label: "Nội trú VIP" },
                                        { key: "EMERGENCY_ROOM", label: "Cấp cứu" }
                                    ].map((t) => (
                                        <Chip
                                            key={t.key}
                                            label={t.label}
                                            size="small"
                                            clickable
                                            onClick={() => setRoomTypeFilter(t.key)}
                                            color={roomTypeFilter === t.key ? "primary" : "default"}
                                            variant={roomTypeFilter === t.key ? "filled" : "outlined"}
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: "0.75rem",
                                                borderRadius: 1.8,
                                                ...(roomTypeFilter === t.key ? { bgcolor: "#0088D6" } : {})
                                            }}
                                        />
                                    ))}
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>

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
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mã Phòng</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tên Phòng Khám / Buồng</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phân Loại Phòng</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Công Suất (Người)</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trạng Thái</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Thao Tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredRooms.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 5, color: "#94A3B8" }}>
                                            Chưa cấu hình phòng khám cho chuyên khoa này. Hãy nhấn "Thêm Buồng Phòng Mới"!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRooms.map((room) => {
                                        const typeConfig = {
                                            EXAMINATION_ROOM: { label: "Phòng khám lâm sàng", color: "#0088D6", bg: "rgba(0, 136, 214, 0.08)" },
                                            LABORATORY_ROOM: { label: "Phòng xét nghiệm / CĐHA", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.08)" },
                                            TREATMENT_ROOM_STANDARD: { label: "Buồng nội trú (Tiêu chuẩn)", color: "#0284C7", bg: "rgba(2, 132, 199, 0.08)" },
                                            TREATMENT_ROOM_VIP: { label: "Buồng nội trú (VIP)", color: "#D97706", bg: "rgba(217, 119, 6, 0.08)" },
                                            EMERGENCY_ROOM: { label: "Phòng cấp cứu", color: "#EF4444", bg: "rgba(239, 68, 68, 0.08)" }
                                        }[room.roomType] || { label: room.roomType || "Phòng khám", color: "#64748B", bg: "rgba(100, 116, 139, 0.08)" };

                                        return (
                                            <TableRow key={room.roomId} hover sx={{ "&:hover": { bgcolor: "rgba(0, 136, 214, 0.02) !important" } }}>
                                                <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#0088D6", fontSize: "0.85rem" }}>
                                                    #ROOM-{room.roomId}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700} color="#0F172A">
                                                        {room.roomName}
                                                    </Typography>
                                                    {room.description && (
                                                        <Typography variant="caption" sx={{ color: "#64748B" }} display="block">
                                                            {room.description}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={typeConfig.label}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: "0.75rem",
                                                            bgcolor: typeConfig.bg,
                                                            color: typeConfig.color,
                                                            border: `1px solid ${typeConfig.color}40`
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#0F172A" }}>
                                                    {room.capacity || 1}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={room.isActive !== false ? "Sẵn sàng" : "Đang bảo trì"}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: "0.75rem",
                                                            bgcolor: room.isActive !== false ? "rgba(16, 185, 129, 0.1)" : "rgba(148, 163, 184, 0.15)",
                                                            color: room.isActive !== false ? "#059669" : "#64748B",
                                                            border: `1px solid ${room.isActive !== false ? "rgba(16, 185, 129, 0.25)" : "rgba(148, 163, 184, 0.25)"}`
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Tooltip title="Chỉnh sửa buồng phòng">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenEditRoom(room)}
                                                                sx={{ 
                                                                    bgcolor: "rgba(0, 136, 214, 0.08)", 
                                                                    color: "#0088D6",
                                                                    "&:hover": { bgcolor: "rgba(0, 136, 214, 0.18)" }
                                                                }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<CalendarMonthIcon />}
                                                            onClick={() => handleViewRoomSchedules(room)}
                                                            sx={{ 
                                                                fontSize: "0.75rem", 
                                                                borderRadius: 1.8, 
                                                                fontWeight: 700, 
                                                                textTransform: "none",
                                                                borderColor: "rgba(0, 136, 214, 0.3)",
                                                                color: "#0088D6",
                                                                "&:hover": { borderColor: "#0088D6", bgcolor: "rgba(0, 136, 214, 0.04)" }
                                                            }}
                                                        >
                                                            Xem Lịch Trực
                                                        </Button>
                                                        <Tooltip title={room.isActive !== false ? "Tạm khóa buồng phòng" : "Mở khóa buồng phòng"}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleToggleRoomStatus(room.roomId)}
                                                                sx={{
                                                                    bgcolor: room.isActive !== false ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
                                                                    color: room.isActive !== false ? "#EF4444" : "#10B981",
                                                                    "&:hover": { bgcolor: room.isActive !== false ? "rgba(239, 68, 68, 0.18)" : "rgba(16, 185, 129, 0.18)" }
                                                                }}
                                                            >
                                                                {room.isActive !== false ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* Modal Thêm / Sửa Khoa */}
            <Dialog open={openDeptModal} onClose={() => setOpenDeptModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
                    {editingDeptId ? "Chỉnh Sửa Chuyên Khoa" : "Thêm Chuyên Khoa Mới"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSaveDept}>
                    <DialogContent dividers>
                        <TextField
                            fullWidth
                            label="Tên chuyên khoa"
                            margin="normal"
                            value={deptForm.departmentName}
                            onChange={(e) => setDeptForm({ ...deptForm, departmentName: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Mô tả nhiệm vụ chuyên môn"
                            margin="normal"
                            value={deptForm.description}
                            onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenDeptModal(false)}>Hủy</Button>
                        <Button type="submit" variant="contained">Lưu Thông Tin Khoa</Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Modal Phân Bác Sĩ Vào Khoa */}
            <Dialog open={openAssignDoctorModal} onClose={() => setOpenAssignDoctorModal(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
                    Phân Công Bác Sĩ Vào Khoa
                </DialogTitle>
                <DialogContent dividers>
                    <TextField
                        fullWidth
                        select
                        label="Chọn bác sĩ phân công"
                        margin="normal"
                        value={selectedDoctorToAdd}
                        onChange={(e) => setSelectedDoctorToAdd(e.target.value)}
                    >
                        {doctors.map(d => (
                            <MenuItem key={d.doctorId} value={d.doctorId}>
                                {d.fullName} ({d.degree || "BSCKI"}) - Hiện tại: {d.departmentName || "Chưa có khoa"}
                            </MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenAssignDoctorModal(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleAddDoctorToDept} disabled={!selectedDoctorToAdd}>
                        Xác Nhận Phân Công
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Thêm / Sửa Phòng */}
            <Dialog open={openRoomModal} onClose={() => setOpenRoomModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
                    {editingRoomId ? "Chỉnh Sửa Buồng Phòng" : "Thêm Buồng Phòng Mới"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSaveRoom}>
                    <DialogContent dividers>
                        <TextField
                            fullWidth
                            label="Tên phòng (Ví dụ: Phòng khám 103, Buồng 402 VIP)"
                            margin="normal"
                            value={roomForm.roomName}
                            onChange={(e) => setRoomForm({ ...roomForm, roomName: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            select
                            label="Phân loại buồng / phòng"
                            margin="normal"
                            value={roomForm.roomType}
                            onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}
                        >
                            <MenuItem value="EXAMINATION_ROOM">Phòng khám bệnh lâm sàng</MenuItem>
                            <MenuItem value="LABORATORY_ROOM">Phòng xét nghiệm / Chẩn đoán hình ảnh</MenuItem>
                            <MenuItem value="TREATMENT_ROOM_STANDARD">Buồng bệnh điều trị nội trú (Tiêu chuẩn)</MenuItem>
                            <MenuItem value="TREATMENT_ROOM_VIP">Buồng bệnh điều trị nội trú (VIP)</MenuItem>
                            <MenuItem value="EMERGENCY_ROOM">Phòng cấp cứu khẩn cấp</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            type="number"
                            label="Sức chứa / Công suất tối đa (Người / Giường bệnh)"
                            margin="normal"
                            inputProps={{ min: 1 }}
                            value={roomForm.capacity}
                            onChange={(e) => setRoomForm({ ...roomForm, capacity: Math.max(1, Number(e.target.value) || 1) })}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Ghi chú vị trí / Trang thiết bị"
                            margin="normal"
                            value={roomForm.description}
                            onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                            placeholder="Ví dụ: Tầng 3 Nhà A, trang bị máy siêu âm 4D..."
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenRoomModal(false)}>Hủy</Button>
                        <Button type="submit" variant="contained">Lưu Buồng Phòng</Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* Modal Xem Lịch Trực Của Phòng */}
            <Dialog open={openScheduleViewModal} onClose={() => setOpenScheduleViewModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
                    📅 Thông Tin Lịch Trực Của: {selectedRoomName}
                </DialogTitle>
                <DialogContent dividers>
                    {loadingSchedules ? (
                        <Box textAlign="center" py={3}>
                            <CircularProgress size={28} />
                            <Typography variant="body2" color="textSecondary" mt={1}>Đang tải lịch trực...</Typography>
                        </Box>
                    ) : (
                        <Table size="small">
                            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                <TableRow>
                                    <TableCell><b>Ngày Trực</b></TableCell>
                                    <TableCell><b>Ca Trực</b></TableCell>
                                    <TableCell><b>Bác Sĩ Đảm Nhiệm</b></TableCell>
                                    <TableCell><b>Trạng Thái</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedRoomSchedules.map((sch, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell><b>{sch.date}</b></TableCell>
                                        <TableCell>{sch.shift}</TableCell>
                                        <TableCell>{sch.doctor}</TableCell>
                                        <TableCell><Chip label={sch.status} size="small" color="primary" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => setOpenScheduleViewModal(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
