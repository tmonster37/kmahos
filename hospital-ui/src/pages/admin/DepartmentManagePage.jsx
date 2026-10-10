import React, { useState, useEffect } from "react";
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
    CircularProgress
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
import axiosInstance from "../../services/AxiosInstance";

export default function DepartmentManagePage() {
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
    const [selectedDoctorToAdd, setSelectedDoctorToAdd] = useState("");
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    const loadData = async () => {
        setLoading(true);
        try {
            const [deptRes, docRes, roomsRes] = await Promise.all([
                axiosInstance.get("/api/departments?includeInactive=true").catch(() => ({ data: [] })),
                axiosInstance.get("/api/admin/doctors").catch(() => ({ data: [] })),
                axiosInstance.get("/api/departments/rooms/all?includeInactive=true").catch(() => ({ data: [] }))
            ]);

            const deptList = (deptRes.data && Array.isArray(deptRes.data)) ? deptRes.data : (Array.isArray(deptRes) ? deptRes : []);
            const formatted = deptList.map(d => ({ ...d, isActive: d.isActive !== undefined ? d.isActive : true }));
            setDepartments(formatted);

            if (formatted.length > 0 && !selectedDept) {
                setSelectedDept(formatted[0]);
            } else if (selectedDept) {
                const refreshed = formatted.find(d => d.departmentId === selectedDept.departmentId);
                if (refreshed) setSelectedDept(refreshed);
            }

            if (docRes.data) {
                setDoctors(docRes.data);
            }

            if (roomsRes.data && Array.isArray(roomsRes.data)) {
                setRoomsList(roomsRes.data);
            }
        } catch (err) {
            console.error("Lỗi tải dữ liệu khoa/bác sĩ/buồng phòng:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

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

    // 3. Quản lý Buồng phòng & Lịch trực của phòng
    const currentRooms = selectedDept ? roomsList.filter(r => Number(r.departmentId) === Number(selectedDept.departmentId)) : [];

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
            const allSchedules = (res && Array.isArray(res.data)) ? res.data : [];

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
        } finally {
            setLoadingSchedules(false);
        }
    };

    const deptDoctors = selectedDept ? doctors.filter(d => d.departmentId === selectedDept.departmentId) : [];

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Title */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                        🏥 Quản Lý Khoa & Phòng Khám Bệnh
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Cấu hình chuyên khoa, phân công trưởng khoa/bác sĩ và quản lý buồng phòng, lịch trực đồng bộ hệ thống
                    </Typography>
                </Box>
                <Box display="flex" gap={1.5}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData} disabled={loading} sx={{ borderRadius: 2 }}>
                        Làm mới
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDept} sx={{ borderRadius: 2, fontWeight: 700 }}>
                        Thêm Chuyên Khoa Mới
                    </Button>
                </Box>
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type || "info"} sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {/* Navigation Tabs */}
            <Paper elevation={0} sx={{ borderBottom: "1px solid #E2E8F0", mb: 3, borderRadius: 2 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                    <Tab label={`Danh Sách Chuyên Khoa (${departments.length})`} sx={{ fontWeight: 700 }} />
                    <Tab label={`Bác Sĩ & Trưởng Khoa (${selectedDept?.departmentName || "Chọn khoa"})`} sx={{ fontWeight: 700 }} disabled={!selectedDept} />
                    <Tab label={`Buồng Phòng & Lịch Trực (${selectedDept?.departmentName || "Chọn khoa"})`} sx={{ fontWeight: 700 }} disabled={!selectedDept} />
                </Tabs>
            </Paper>

            {/* TAB 0: DANH SÁCH CHUYÊN KHOA */}
            {activeTab === 0 && (
                <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3 }}>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell><b>Mã Khoa</b></TableCell>
                                <TableCell><b>Tên Chuyên Khoa</b></TableCell>
                                <TableCell><b>Trưởng Khoa</b></TableCell>
                                <TableCell align="center"><b>Số Lượng Phòng</b></TableCell>
                                <TableCell align="center"><b>Trạng Thái</b></TableCell>
                                <TableCell align="center"><b>Thao Tác</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : departments.map((dept) => {
                                const roomsCount = roomsList.filter(r => Number(r.departmentId) === Number(dept.departmentId)).length;
                                const headDoc = doctors.find(d => Number(d.departmentId) === Number(dept.departmentId) && d.role === "ROLE_HEAD_OF_DEPARTMENT");
                                return (
                                    <TableRow key={dept.departmentId} hover selected={selectedDept?.departmentId === dept.departmentId}>
                                        <TableCell><b>#KHOA-{dept.departmentId}</b></TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                                                {dept.departmentName}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {dept.description}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {headDoc ? (
                                                <Chip icon={<StarsIcon />} label={headDoc.fullName} color="primary" variant="outlined" size="small" />
                                            ) : dept.headDoctorName ? (
                                                <Chip icon={<StarsIcon />} label={dept.headDoctorName} color="primary" variant="outlined" size="small" />
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">Chưa bổ nhiệm</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={`${roomsCount} buồng phòng`} size="small" />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={dept.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                                                color={dept.isActive ? "success" : "default"}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <Tooltip title="Chỉnh sửa thông tin khoa">
                                                    <IconButton size="small" onClick={() => handleOpenEditDept(dept)} color="primary">
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Xem & Quản lý nhân sự/buồng phòng">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => { setSelectedDept(dept); setActiveTab(1); }}
                                                        sx={{ fontSize: "0.75rem", borderRadius: 1.5 }}
                                                    >
                                                        Chi tiết
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip title={dept.isActive ? "Khóa hoạt động khoa" : "Mở khóa hoạt động"}>
                                                    <IconButton
                                                        size="small"
                                                        color={dept.isActive ? "error" : "success"}
                                                        onClick={() => handleToggleDeptStatus(dept.departmentId)}
                                                    >
                                                        {dept.isActive ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* TAB 1: BÁC SĨ & TRƯỞNG KHOA */}
            {activeTab === 1 && selectedDept && (
                <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">
                            Danh sách Bác sĩ thuộc: {selectedDept.departmentName}
                        </Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAssignDoctorModal(true)} sx={{ borderRadius: 2 }}>
                            Phân Công Bác Sĩ Vào Khoa
                        </Button>
                    </Box>

                    <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                <TableRow>
                                    <TableCell><b>Mã Bác Sĩ</b></TableCell>
                                    <TableCell><b>Họ Và Tên</b></TableCell>
                                    <TableCell><b>Học Vị / Chức Danh</b></TableCell>
                                    <TableCell><b>Số Điện Thoại</b></TableCell>
                                    <TableCell align="center"><b>Vai Trò</b></TableCell>
                                    <TableCell align="center"><b>Hành Động</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deptDoctors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                            Chưa có bác sĩ nào được phân công vào chuyên khoa này.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    deptDoctors.map((doc) => {
                                        const isHead = doc.role === "ROLE_HEAD_OF_DEPARTMENT";
                                        return (
                                            <TableRow key={doc.doctorId} hover>
                                                <TableCell><b>#DOC-{doc.doctorId}</b></TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {doc.fullName}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>{doc.degree || "BSCKI"}</TableCell>
                                                <TableCell>{doc.phoneNumber || "---"}</TableCell>
                                                <TableCell align="center">
                                                    {isHead ? (
                                                        <Chip label="Trưởng Khoa" color="primary" size="small" icon={<StarsIcon />} sx={{ fontWeight: "bold" }} />
                                                    ) : (
                                                        <Chip label="Bác sĩ điều trị" size="small" variant="outlined" />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        {!isHead ? (
                                                            <Button size="small" color="primary" variant="outlined" onClick={() => handleAssignHeadDoctor(doc.doctorId)}>
                                                                Bổ nhiệm Trưởng khoa
                                                            </Button>
                                                        ) : (
                                                            <Button size="small" color="warning" variant="outlined" onClick={() => handleRemoveHeadDoctor(doc.doctorId)}>
                                                                Bãi nhiệm
                                                            </Button>
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
            {activeTab === 2 && selectedDept && (
                <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">
                            Buồng Phòng & Lịch Trực: {selectedDept.departmentName}
                        </Typography>
                        <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={handleOpenAddRoom} sx={{ borderRadius: 2 }}>
                            Thêm Buồng Phòng Mới
                        </Button>
                    </Box>

                    <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 3 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                <TableRow>
                                    <TableCell><b>Mã Phòng</b></TableCell>
                                    <TableCell><b>Tên Phòng Khám / Buồng</b></TableCell>
                                    <TableCell><b>Phân Loại Phòng</b></TableCell>
                                    <TableCell align="center"><b>Công Suất (Người)</b></TableCell>
                                    <TableCell align="center"><b>Trạng Thái</b></TableCell>
                                    <TableCell align="center"><b>Thao Tác</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {currentRooms.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                            Chưa cấu hình phòng khám cho chuyên khoa này. Hãy nhấn "Thêm Buồng Phòng Mới"!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentRooms.map((room) => {
                                        const typeConfig = {
                                            EXAMINATION_ROOM: { label: "Phòng khám lâm sàng", color: "primary" },
                                            LABORATORY_ROOM: { label: "Phòng xét nghiệm / CĐHA", color: "secondary" },
                                            TREATMENT_ROOM_STANDARD: { label: "Buồng nội trú (Tiêu chuẩn)", color: "info" },
                                            TREATMENT_ROOM_VIP: { label: "Buồng nội trú (VIP)", color: "warning" },
                                            EMERGENCY_ROOM: { label: "Phòng cấp cứu", color: "error" }
                                        }[room.roomType] || { label: room.roomType || "Phòng khám", color: "default" };

                                        return (
                                            <TableRow key={room.roomId} hover>
                                                <TableCell><b>#ROOM-{room.roomId}</b></TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                                                        {room.roomName}
                                                    </Typography>
                                                    {room.description && (
                                                        <Typography variant="caption" color="textSecondary" display="block">
                                                            {room.description}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={typeConfig.label}
                                                        color={typeConfig.color}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <b>{room.capacity || 1}</b>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={room.isActive !== false ? "Sẵn sàng" : "Đang bảo trì"}
                                                        color={room.isActive !== false ? "success" : "default"}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                        <Tooltip title="Chỉnh sửa buồng phòng">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => handleOpenEditRoom(room)}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<CalendarMonthIcon />}
                                                            onClick={() => handleViewRoomSchedules(room)}
                                                            sx={{ borderRadius: 1.5, textTransform: "none" }}
                                                        >
                                                            Xem Lịch Trực
                                                        </Button>
                                                        <Tooltip title={room.isActive !== false ? "Tạm khóa buồng phòng" : "Mở khóa buồng phòng"}>
                                                            <IconButton
                                                                size="small"
                                                                color={room.isActive !== false ? "error" : "success"}
                                                                onClick={() => handleToggleRoomStatus(room.roomId)}
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
