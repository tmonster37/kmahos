import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
    TextField,
    Chip,
    CircularProgress,
    Divider,
    Grid,
    MenuItem,
    Paper,
    Stack,
    RadioGroup,
    FormControlLabel,
    Radio
} from "@mui/material";
import HotelIcon from "@mui/icons-material/Hotel";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonIcon from "@mui/icons-material/Person";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

export default function InpatientAdmitModal({ open, onClose, patient, record, onSuccess }) {
    const [departments, setDepartments] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [doctors, setDoctors] = useState([]);

    const [selectedDeptId, setSelectedDeptId] = useState("");
    const [selectedRoomId, setSelectedRoomId] = useState("");
    const [selectedDoctorId, setSelectedDoctorId] = useState("");
    const [initialDiagnosis, setInitialDiagnosis] = useState("");
    const [priorityLevel, setPriorityLevel] = useState("NORMAL"); // NORMAL or URGENT

    const [loadingData, setLoadingData] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setError("");
            loadInitialData();

            // Điền sẵn chẩn đoán từ hồ sơ khám
            const defaultDx = record?.finalDiagnosis || record?.initialDiagnosis || patient?.symptoms || "Cần theo dõi và điều trị nội trú";
            setInitialDiagnosis(defaultDx);
        }
    }, [open]);

    // Load Khoa và Bác sĩ ban đầu
    const loadInitialData = async () => {
        if (departments.length > 0 && doctors.length > 0) {
            return;
        }
        setLoadingData(true);
        try {
            const [deptRes, docRes] = await Promise.all([
                axiosInstance.get("/api/departments").catch(() => ({ data: [] })),
                axiosInstance.get("/api/doctors").catch(() => axiosInstance.get("/api/admin/doctors").catch(() => ({ data: [] })))
            ]);

            const deptList = Array.isArray(deptRes?.data) ? deptRes.data : (Array.isArray(deptRes) ? deptRes : []);
            const docList = Array.isArray(docRes?.data) ? docRes.data : (Array.isArray(docRes) ? docRes : []);

            setDepartments(deptList);
            setDoctors(docList);

            if (deptList.length > 0) {
                // Mặc định chọn khoa đầu tiên hoặc khoa Tim Mạch / Cấp cứu
                const firstDept = deptList.find(d => d.departmentName?.includes("Cấp Cứu") || d.departmentName?.includes("Nội")) || deptList[0];
                setSelectedDeptId(firstDept.departmentId);
                fetchRoomsForDepartment(firstDept.departmentId);
            }

            if (docList.length > 0) {
                setSelectedDoctorId(docList[0].doctorId);
            }
        } catch (err) {
            console.error("Lỗi tải danh mục nhập viện:", err);
            setError("Không thể tải danh sách khoa phòng.");
        } finally {
            setLoadingData(false);
        }
    };

    // Khi thay đổi Khoa -> tải lại danh sách phòng nội trú
    const handleDeptChange = (deptId) => {
        setSelectedDeptId(deptId);
        fetchRoomsForDepartment(deptId);
    };

    const fetchRoomsForDepartment = async (deptId) => {
        setLoadingRooms(true);
        try {
            const res = await axiosInstance.get(`/api/departments/${deptId}/rooms`).catch(() => ({ data: [] }));
            const roomList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            
            if (roomList.length > 0) {
                const mapped = roomList.map(r => ({
                    ...r,
                    roomNumber: r.roomName || r.roomNumber || `Phòng ${r.roomId}`,
                    description: r.description || `Phòng ${r.roomName || r.roomId}`
                }));
                setRooms(mapped);
                setSelectedRoomId(mapped[0].roomId);
            } else {
                setRooms([]);
                setSelectedRoomId("");
                setError("Khoa này hiện chưa có buồng bệnh nội trú được cấu hình trên hệ thống.");
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách phòng:", err);
            setRooms([]);
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleConfirmAdmit = async () => {
        let patientProfileId = patient?.patientProfileId || record?.patientProfileId || patient?.profileId || patient?.patientId;
        if (!patientProfileId && patient?.patientPhone) {
            try {
                const lookupRes = await axiosInstance.get(`/api/patient-profiles/lookup?keyword=${encodeURIComponent(patient.patientPhone)}`);
                const matched = lookupRes?.data?.[0];
                if (matched?.patientProfileId) {
                    patientProfileId = matched.patientProfileId;
                }
            } catch (e) {}
        }
        if (!patientProfileId) {
            setError("Không tìm thấy mã hồ sơ bệnh nhân. Vui lòng chọn bệnh nhân từ hàng đợi khám.");
            return;
        }
        if (!selectedRoomId) {
            setError("Vui lòng chọn Buồng/Phòng nội trú điều trị!");
            return;
        }
        const doctorIdToUse = selectedDoctorId || record?.doctorId || doctors[0]?.doctorId;
        if (!doctorIdToUse) {
            setError("Vui lòng chỉ định Bác sĩ phụ trách điều trị nội trú!");
            return;
        }
        if (!initialDiagnosis || initialDiagnosis.trim().length < 5) {
            setError("Vui lòng nhập lý do nhập viện & chẩn đoán ban đầu rõ ràng (ít nhất 5 ký tự).");
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            const payload = {
                patientProfileId: patientProfileId,
                roomId: Number(selectedRoomId),
                doctorId: doctorIdToUse,
                initialDiagnosis: priorityLevel === "URGENT" ? `[CẤP CỨU KHẨN CẤP] ${initialDiagnosis}` : initialDiagnosis
            };

            const res = await axiosInstance.post("/api/inpatient/admit", payload);
            const admission = res?.data?.data || res?.data;

            if (onSuccess) {
                onSuccess(admission);
            }
            onClose();
        } catch (err) {
            console.error("Lỗi lập phiếu nhập viện:", err);
            setError(err.response?.data?.message || err.message || "Lỗi tạo phiếu nhập viện. Vui lòng kiểm tra lại dữ liệu.");
        } finally {
            setSubmitting(false);
        }
    };

    const selectedRoomObj = rooms.find(r => r.roomId === Number(selectedRoomId));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
            <DialogTitle
                sx={{
                    bgcolor: "#b91c1c",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    py: 1.4,
                    px: 2.5,
                    boxShadow: "0 2px 8px rgba(185, 28, 28, 0.3)"
                }}
            >
                <HotelIcon sx={{ fontSize: 24 }} />
                <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: "0.3px", fontSize: "0.95rem" }}>
                        CHỈ ĐỊNH NHẬP VIỆN ĐIỀU TRỊ NỘI TRÚ
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, fontSize: "0.75rem", display: "block" }}>
                        Lập phiếu chỉ định và chuyển bệnh nhân từ Phòng khám Ngoại trú sang Khoa Nội trú
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 1 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600 }}>
                        {error}
                    </Alert>
                )}

                {/* Patient Summary Card */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 3,
                        borderRadius: 2.5,
                        bgcolor: "#fef2f2",
                        border: "1px solid #fecaca",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 2
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                bgcolor: "#b91c1c",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <PersonIcon />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#991b1b" }}>
                                {patient?.patientName || "Bệnh nhân"}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#7f1d1d" }}>
                                Giới tính: <b>{patient?.patientGender === "FEMALE" ? "Nữ" : "Nam"}</b> • SĐT: <b>{patient?.patientPhone || "Chưa có"}</b> • Mã khám: <b>{patient?.bookingCode}</b>
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        icon={<LocalHospitalIcon />}
                        label="Chỉ Định Từ Bàn Khám"
                        color="error"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                    />
                </Paper>

                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" py={5}>
                        <CircularProgress color="error" />
                        <Typography sx={{ ml: 2, color: "#64748b", fontWeight: 600 }}>
                            Đang tải sơ đồ Khoa & Buồng bệnh...
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={2.5}>
                        {/* Mức độ ưu tiên */}
                        <Grid item xs={12}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: "#475569", textTransform: "uppercase" }}>
                                Phân loại mức độ ưu tiên tiếp nhận:
                            </Typography>
                            <RadioGroup
                                row
                                value={priorityLevel}
                                onChange={(e) => setPriorityLevel(e.target.value)}
                                sx={{ mt: 0.5 }}
                            >
                                <FormControlLabel
                                    value="NORMAL"
                                    control={<Radio color="primary" />}
                                    label={<Typography variant="body2" fontWeight={600}>Theo dõi & Điều trị thông thường</Typography>}
                                />
                                <FormControlLabel
                                    value="URGENT"
                                    control={<Radio color="error" />}
                                    label={
                                        <Box display="flex" alignItems="center" gap={0.5}>
                                            <WarningAmberIcon fontSize="small" color="error" />
                                            <Typography variant="body2" fontWeight={800} color="error">
                                                CẤP CỨU / ƯU TIÊN KHẨN CẤP
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </RadioGroup>
                        </Grid>

                        {/* Khoa nội trú */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                required
                                label="Khoa Điều Trị Nội Trú Tiếp Nhận"
                                value={selectedDeptId}
                                onChange={(e) => handleDeptChange(e.target.value)}
                                InputProps={{ sx: { borderRadius: 2 } }}
                            >
                                {departments.map((dept) => (
                                    <MenuItem key={dept.departmentId} value={dept.departmentId}>
                                        {dept.departmentName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Buồng/Phòng nội trú */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                required
                                disabled={loadingRooms || rooms.length === 0}
                                label={loadingRooms ? "Đang tải phòng..." : "Chọn Buồng / Phòng Bệnh"}
                                value={selectedRoomId}
                                onChange={(e) => setSelectedRoomId(e.target.value)}
                                InputProps={{ sx: { borderRadius: 2 } }}
                                helperText={selectedRoomObj ? `${selectedRoomObj.description || "Phòng điều trị"} • Đơn vị giá: ${formatCurrency(selectedRoomObj.pricePerDay || 350000)}/ngày` : ""}
                            >
                                {rooms.map((r) => (
                                    <MenuItem key={r.roomId} value={r.roomId}>
                                        {r.roomNumber} - {r.roomType || "Nội trú"} ({formatCurrency(r.pricePerDay || 350000)}/ngày)
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Bác sĩ điều trị */}
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                required
                                label="Bác Sĩ Phụ Trách Điều Trị Nội Trú"
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                InputProps={{ sx: { borderRadius: 2 } }}
                            >
                                {doctors.map((doc) => (
                                    <MenuItem key={doc.doctorId} value={doc.doctorId}>
                                        {doc.fullName || doc.name} - {doc.specialty || doc.academicTitle || "Bác sĩ điều trị"} ({doc.departmentName || "Khoa khám"})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Lý do nhập viện & Chẩn đoán */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                multiline
                                rows={3}
                                label="Lý Do Nhập Viện & Chẩn Đoán Sơ Bộ Ban Đầu"
                                placeholder="Ghi rõ tình trạng diễn biến bệnh nặng, chỉ số sinh tồn bất thường, nguy cơ biến chứng cần theo dõi sát tại buồng bệnh..."
                                value={initialDiagnosis}
                                onChange={(e) => setInitialDiagnosis(e.target.value)}
                                InputProps={{ sx: { borderRadius: 2 } }}
                            />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <Divider />

            <DialogActions sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    disabled={submitting}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                >
                    Hủy bỏ
                </Button>
                <Button
                    onClick={handleConfirmAdmit}
                    variant="contained"
                    disabled={submitting || loadingData}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <HotelIcon />}
                    sx={{
                        bgcolor: "#b91c1c",
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 800,
                        px: 3,
                        boxShadow: "0 4px 12px rgba(185, 28, 28, 0.3)",
                        "&:hover": { bgcolor: "#991b1b" }
                    }}
                >
                    {submitting ? "Đang chuyển bệnh nhân..." : "Xác Nhận & Lập Phiếu Nhập Viện"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
