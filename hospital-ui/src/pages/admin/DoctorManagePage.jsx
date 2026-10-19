import React, { useState, useEffect } from "react";
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
    Rating,
    Avatar,
    IconButton,
    Alert,
    Tooltip,
    Stack,
    InputAdornment,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import VerifiedIcon from "@mui/icons-material/Verified";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

const DEGREE_OPTIONS = [
    { value: "BS", label: "BS - Bác sĩ Đa khoa" },
    { value: "BSCKI", label: "BS. CKI - Bác sĩ Chuyên khoa I" },
    { value: "BSCKII", label: "BS. CKII - Bác sĩ Chuyên khoa II" },
    { value: "THS", label: "ThS. BS - Thạc sĩ Y khoa" },
    { value: "TS", label: "TS. BS - Tiến sĩ Y khoa" },
    { value: "PGS_TS", label: "PGS. TS - Phó Giáo sư - Tiến sĩ" },
    { value: "GS_TS", label: "GS. TS - Giáo sư - Tiến sĩ" },
];

const defaultForm = {
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "password123",
    departmentId: 1,
    degree: "BSCKI",
    consultationFee: 200000,
    biography: "",
};

export default function DoctorManagePage() {
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
    const [licenseFilter, setLicenseFilter] = useState("ALL"); // ALL, LICENSED, UNLICENSED
    const [viewMode, setViewMode] = useState("table"); // "table" or "grid"
    const [openModal, setOpenModal] = useState(false);
    const [editingDoctorId, setEditingDoctorId] = useState(null);
    const [formData, setFormData] = useState(defaultForm);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Quản lý CCHN
    const [openLicenseModal, setOpenLicenseModal] = useState(false);
    const [licenseForm, setLicenseForm] = useState({
        doctorId: "",
        doctorName: "",
        doctorLicense: "",
        licenseIssuedDate: "2020-05-15",
        licenseScope: ""
    });
    const [licenseLoading, setLicenseLoading] = useState(false);

    // Tìm kiếm, feedback, xóa
    const [searchKeyword, setSearchKeyword] = useState("");
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, doctor: null });

    const handleOpenLicense = (doc) => {
        setLicenseForm({
            doctorId: doc.doctorId,
            doctorName: doc.fullName || "Bác sĩ",
            doctorLicense: doc.doctorLicense || "",
            licenseIssuedDate: doc.licenseIssuedDate || "2020-05-15",
            licenseScope: doc.licenseScope || "Khám bệnh, chữa bệnh chuyên khoa"
        });
        setOpenLicenseModal(true);
    };

    const handleSaveLicense = async (e) => {
        if (e) e.preventDefault();
        if (!licenseForm.doctorLicense || !licenseForm.doctorLicense.trim()) {
            setError("Vui lòng nhập số chứng chỉ hành nghề (CCHN)!");
            return;
        }

        setLicenseLoading(true);
        try {
            await axiosInstance.put(`/api/admin/doctors/${licenseForm.doctorId}/license`, {
                doctorLicense: licenseForm.doctorLicense.trim(),
                licenseIssuedDate: licenseForm.licenseIssuedDate || null,
                licenseScope: licenseForm.licenseScope?.trim() || ""
            });
            setOpenLicenseModal(false);
            setFeedback({ type: "success", message: `Đã cập nhật CCHN cho bác sĩ [${licenseForm.doctorName}] thành công!` });
            loadData();
        } catch (err) {
            console.error("Lỗi cập nhật CCHN:", err);
            setError(err.response?.data?.message || "Không thể cập nhật chứng chỉ hành nghề");
        } finally {
            setLicenseLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [docRes, deptRes] = await Promise.all([
                axiosInstance.get("/api/admin/doctors"),
                axiosInstance.get("/api/departments"),
            ]);
            const docList = Array.isArray(docRes?.data) ? docRes.data : (Array.isArray(docRes) ? docRes : []);
            const deptList = Array.isArray(deptRes?.data) ? deptRes.data : (Array.isArray(deptRes) ? deptRes : []);
            setDoctors(docList);
            setDepartments(deptList);
        } catch (err) {
            console.error("Lỗi tải danh sách bác sĩ:", err);
            setFeedback({ type: "error", message: "Không thể tải danh sách bác sĩ từ máy chủ." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenAdd = () => {
        setEditingDoctorId(null);
        setFormData({ ...defaultForm, departmentId: departments[0]?.departmentId || 1 });
        setError("");
        setOpenModal(true);
    };

    const handleOpenEdit = (doc) => {
        setEditingDoctorId(doc.doctorId);
        setFormData({
            fullName: doc.fullName || "",
            phoneNumber: doc.phoneNumber || "",
            email: doc.email || "",
            password: "",
            departmentId: doc.departmentId || 1,
            degree: doc.degree || "BSCKI",
            consultationFee: doc.consultationFee || 200000,
            biography: doc.biography || "",
        });
        setError("");
        setOpenModal(true);
    };

    const handleConfirmDelete = async () => {
        const doc = deleteConfirm.doctor;
        if (!doc) return;
        try {
            await axiosInstance.delete(`/api/admin/doctors/${doc.doctorId}`);
            setFeedback({ type: "success", message: `Đã vô hiệu hóa bác sĩ [${doc.fullName}] thành công!` });
            setDeleteConfirm({ open: false, doctor: null });
            loadData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi xóa bác sĩ!" });
            setDeleteConfirm({ open: false, doctor: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            if (editingDoctorId) {
                await axiosInstance.put(`/api/admin/doctors/${editingDoctorId}`, formData);
                setFeedback({ type: "success", message: `Đã cập nhật thông tin bác sĩ [${formData.fullName}] thành công!` });
            } else {
                await axiosInstance.post("/api/admin/doctors", formData);
                setFeedback({ type: "success", message: `Đã thêm mới bác sĩ [${formData.fullName}] thành công!` });
            }
            setOpenModal(false);
            loadData();
        } catch (err) {
            setError(err.message || "Lỗi lưu thông tin bác sĩ!");
        } finally {
            setLoading(false);
        }
    };

    const filteredDoctors = doctors.filter((d) => {
        const matchesDept = selectedDeptFilter === "ALL" || d.departmentId === Number(selectedDeptFilter);
        const matchesLicense = licenseFilter === "ALL" ||
            (licenseFilter === "LICENSED" && Boolean(d.doctorLicense && d.doctorLicense.trim())) ||
            (licenseFilter === "UNLICENSED" && (!d.doctorLicense || !d.doctorLicense.trim()));

        const kw = searchKeyword.toLowerCase().trim();
        const matchesKw = !kw ||
            (d.fullName && d.fullName.toLowerCase().includes(kw)) ||
            (d.phoneNumber && d.phoneNumber.includes(kw)) ||
            (d.doctorLicense && d.doctorLicense.toLowerCase().includes(kw)) ||
            (d.departmentName && d.departmentName.toLowerCase().includes(kw));

        return matchesDept && matchesLicense && matchesKw;
    });

    const totalDocs = doctors.length;
    const licensedDocs = doctors.filter(d => Boolean(d.doctorLicense && d.doctorLicense.trim())).length;
    const unlicensedDocs = totalDocs - licensedDocs;

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* 1. Header Tinh Gọn */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                <Box>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Typography variant="h5" fontWeight="800" color="#0F172A" sx={{ letterSpacing: "-0.5px" }}>
                            Quản Lý Bác Sĩ
                        </Typography>
                        <Chip
                            label={`${totalDocs} bác sĩ`}
                            size="small"
                            sx={{ fontWeight: 700, bgcolor: "#EBF6FE", color: "#0088D6" }}
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                        Quản lý đội ngũ bác sĩ chuyên khoa, học vị, giá khám và chứng chỉ hành nghề y tế (CCHN)
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                        variant="outlined"
                        size="medium"
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
                        disabled={loading}
                        sx={{ borderRadius: 2, fontWeight: 600, textTransform: "none", color: "#475569", borderColor: "#CBD5E1" }}
                    >
                        Làm mới
                    </Button>
                    <Button
                        variant="contained"
                        size="medium"
                        startIcon={<AddIcon />}
                        onClick={handleOpenAdd}
                        sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            textTransform: "none",
                            bgcolor: "#0088D6",
                            "&:hover": { bgcolor: "#006FA8" }
                        }}
                    >
                        + Thêm Bác Sĩ Mới
                    </Button>
                </Stack>
            </Box>

            {/* Thông báo Feedback */}
            {feedback.message && (
                <Alert
                    severity={feedback.type || "info"}
                    sx={{ mb: 2.5, borderRadius: 2 }}
                    onClose={() => setFeedback({ type: "", message: "" })}
                >
                    {feedback.message}
                </Alert>
            )}

            {/* 2. Thanh lọc và thống kê tóm tắt 1 dòng siêu gọn */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 2.5,
                    borderRadius: 2.5,
                    border: "1px solid #E2E8F0",
                    bgcolor: "#FFFFFF"
                }}
            >
                <Grid container spacing={2} alignItems="center">
                    {/* Ô Tìm kiếm */}
                    <Grid item xs={12} sm={4} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm kiếm theo Tên, SĐT, CCHN..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2, bgcolor: "#F8FAFC" }
                            }}
                        />
                    </Grid>

                    {/* Dropdown Chuyên khoa */}
                    <Grid item xs={6} sm={3} md={3}>
                        <TextField
                            fullWidth
                            select
                            size="small"
                            label="Chuyên khoa"
                            value={selectedDeptFilter}
                            onChange={(e) => setSelectedDeptFilter(e.target.value)}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        >
                            <MenuItem value="ALL">Tất cả chuyên khoa ({totalDocs})</MenuItem>
                            {departments.map((d) => (
                                <MenuItem key={d.departmentId} value={d.departmentId}>
                                    {d.departmentName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {/* Dropdown Chứng chỉ CCHN */}
                    <Grid item xs={6} sm={2.5} md={2.5}>
                        <TextField
                            fullWidth
                            select
                            size="small"
                            label="Chứng chỉ CCHN"
                            value={licenseFilter}
                            onChange={(e) => setLicenseFilter(e.target.value)}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        >
                            <MenuItem value="ALL">Tất cả CCHN</MenuItem>
                            <MenuItem value="LICENSED">Đã có CCHN ({licensedDocs})</MenuItem>
                            <MenuItem value="UNLICENSED">Chờ cấp ({unlicensedDocs})</MenuItem>
                        </TextField>
                    </Grid>

                    {/* Nút chuyển chế độ xem: Bảng (Table) / Thẻ (Grid) */}
                    <Grid item xs={12} sm={2.5} md={2.5} sx={{ display: "flex", justifyContent: { xs: "flex-start", sm: "flex-end" }, alignItems: "center", gap: 1 }}>
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            size="small"
                            onChange={(_, newMode) => newMode && setViewMode(newMode)}
                            sx={{ borderRadius: 2, bgcolor: "#F8FAFC" }}
                        >
                            <ToggleButton value="table" sx={{ px: 1.5, py: 0.5, textTransform: "none", fontWeight: 600 }}>
                                <ViewListIcon sx={{ fontSize: 18, mr: 0.5 }} /> Bảng
                            </ToggleButton>
                            <ToggleButton value="grid" sx={{ px: 1.5, py: 0.5, textTransform: "none", fontWeight: 600 }}>
                                <ViewModuleIcon sx={{ fontSize: 18, mr: 0.5 }} /> Thẻ
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>

                {/* Thanh tóm tắt trạng thái nhỏ gọn bên dưới */}
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mt={1.5} pt={1.5} sx={{ borderTop: "1px dashed #E2E8F0" }}>
                    <Typography variant="body2" color="text.secondary">
                        Hiển thị <b>{filteredDoctors.length}</b> / {totalDocs} bác sĩ
                    </Typography>
                    <Box display="flex" gap={2}>
                        <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 600 }}>
                            ● Đã có CCHN: <b>{licensedDocs}</b>
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#D97706", fontWeight: 600 }}>
                            ● Chờ bổ sung: <b>{unlicensedDocs}</b>
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* 3. Nội dung Danh Sách: DẠNG BẢNG (MẶC ĐỊNH - ĐƠN GIẢN, RÕ RÀNG) */}
            {loading ? (
                <Box textAlign="center" py={8}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                        Đang đồng bộ dữ liệu bác sĩ...
                    </Typography>
                </Box>
            ) : filteredDoctors.length === 0 ? (
                <Paper elevation={0} sx={{ p: 5, borderRadius: 2.5, border: "1px dashed #CBD5E1", textAlign: "center" }}>
                    <Typography variant="body1" color="text.secondary" fontWeight={600}>
                        Không tìm thấy bác sĩ nào phù hợp với bộ lọc hiện tại.
                    </Typography>
                    {(searchKeyword || selectedDeptFilter !== "ALL" || licenseFilter !== "ALL") && (
                        <Button
                            size="small"
                            onClick={() => { setSearchKeyword(""); setSelectedDeptFilter("ALL"); setLicenseFilter("ALL"); }}
                            sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
                        >
                            Đặt lại bộ lọc
                        </Button>
                    )}
                </Paper>
            ) : viewMode === "table" ? (
                /* === VIEW 1: DẠNG BẢNG CHUẨN QUẢN TRỊ === */
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
                    <Table sx={{ minWidth: 750 }}>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: "#475569", width: 50 }}>#</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Bác Sĩ & Học Vị</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Chuyên Khoa</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Chứng Chỉ Hành Nghề (CCHN)</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Liên Hệ</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Giá Khám</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: "#475569", pr: 3 }}>Thao Tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredDoctors.map((doc, idx) => (
                                <TableRow
                                    key={doc.doctorId}
                                    hover
                                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                                >
                                    <TableCell sx={{ color: "text.secondary", fontWeight: 600 }}>
                                        {idx + 1}
                                    </TableCell>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Avatar sx={{ width: 38, height: 38, bgcolor: "#EBF6FE", color: "#0088D6", fontWeight: 700, fontSize: "0.9rem" }}>
                                                {doc.fullName ? doc.fullName.charAt(0) : "BS"}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={700} color="#0F172A">
                                                    {doc.fullName}
                                                </Typography>
                                                <Chip
                                                    label={doc.degree || "BS"}
                                                    size="small"
                                                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700, bgcolor: "#F1F5F9", color: "#475569", mt: 0.3 }}
                                                />
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={doc.departmentName || "Khoa khám"}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 600, color: "#0088D6", borderColor: "#BAE6FD", bgcolor: "#F0F9FF" }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {doc.doctorLicense ? (
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <VerifiedIcon sx={{ color: "#16A34A", fontSize: 16 }} />
                                                <Typography variant="body2" fontWeight={600} color="#15803D">
                                                    {doc.doctorLicense}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Chip
                                                label="Chưa cấp CCHN"
                                                size="small"
                                                sx={{ height: 22, fontSize: "0.75rem", fontWeight: 600, bgcolor: "#FFFBEB", color: "#B45309" }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500} color="#334155">
                                            {doc.phoneNumber}
                                        </Typography>
                                        {doc.email && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {doc.email}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="subtitle2" fontWeight={700} color="#0088D6">
                                            {formatCurrency(doc.consultationFee)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ pr: 2 }}>
                                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                            <Tooltip title="Cấp / Sửa CCHN Bộ Y Tế">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenLicense(doc)}
                                                    sx={{ color: "#0088D6", bgcolor: "#EBF6FE", "&:hover": { bgcolor: "#D7EEFD" } }}
                                                >
                                                    <BadgeIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Chỉnh sửa thông tin">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenEdit(doc)}
                                                    sx={{ color: "#16A34A", bgcolor: "#F0FDF4", "&:hover": { bgcolor: "#DCFCE7" } }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Vô hiệu hóa">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setDeleteConfirm({ open: true, doctor: doc })}
                                                    sx={{ color: "#DC2626", bgcolor: "#FEF2F2", "&:hover": { bgcolor: "#FEE2E2" } }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                /* === VIEW 2: DẠNG THẺ (GRID) GỌN GÀNG === */
                <Grid container spacing={2}>
                    {filteredDoctors.map((doc) => (
                        <Grid item xs={12} sm={6} md={4} key={doc.doctorId}>
                            <Card
                                elevation={0}
                                sx={{
                                    height: "100%",
                                    borderRadius: 2.5,
                                    border: "1px solid #E2E8F0",
                                    display: "flex",
                                    flexDirection: "column",
                                    transition: "all 0.15s ease",
                                    "&:hover": { borderColor: "#0088D6", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                                    <Box display="flex" alignItems="center" gap={1.5} mb={1.2}>
                                        <Avatar sx={{ width: 44, height: 44, bgcolor: "#EBF6FE", color: "#0088D6", fontWeight: 700 }}>
                                            {doc.fullName ? doc.fullName.charAt(0) : "BS"}
                                        </Avatar>
                                        <Box flexGrow={1} minWidth={0}>
                                            <Typography variant="subtitle2" fontWeight={800} noWrap color="#0F172A">
                                                {doc.fullName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {doc.degree} • {doc.departmentName}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box mb={1}>
                                        {doc.doctorLicense ? (
                                            <Chip
                                                icon={<VerifiedIcon style={{ fontSize: 13 }} />}
                                                label={`CCHN: ${doc.doctorLicense}`}
                                                size="small"
                                                color="success"
                                                sx={{ height: 22, fontSize: "0.725rem", fontWeight: 600 }}
                                            />
                                        ) : (
                                            <Chip
                                                label="Chưa cấp CCHN"
                                                size="small"
                                                sx={{ height: 22, fontSize: "0.725rem", bgcolor: "#FFFBEB", color: "#B45309", fontWeight: 600 }}
                                            />
                                        )}
                                    </Box>

                                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1.5} pt={1} sx={{ borderTop: "1px dashed #E2E8F0" }}>
                                        <Typography variant="caption" color="text.secondary">{doc.phoneNumber}</Typography>
                                        <Typography variant="subtitle2" fontWeight={700} color="#0088D6">
                                            {formatCurrency(doc.consultationFee)}
                                        </Typography>
                                    </Box>
                                </CardContent>

                                <Box display="flex" justifyContent="flex-end" p={1} bgcolor="#F8FAFC" sx={{ borderTop: "1px solid #E2E8F0", gap: 0.5 }}>
                                    <Tooltip title="Cấp CCHN">
                                        <IconButton size="small" onClick={() => handleOpenLicense(doc)} sx={{ color: "#0088D6" }}>
                                            <BadgeIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Sửa">
                                        <IconButton size="small" onClick={() => handleOpenEdit(doc)} sx={{ color: "#16A34A" }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Xóa">
                                        <IconButton size="small" onClick={() => setDeleteConfirm({ open: true, doctor: doc })} sx={{ color: "#DC2626" }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Dialog xác nhận xóa bác sĩ */}
            <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, doctor: null })} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, color: "#DC2626" }}>
                    Xác nhận vô hiệu hóa bác sĩ?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Bạn có chắc chắn muốn vô hiệu hóa bác sĩ <b>{deleteConfirm.doctor?.fullName}</b> khỏi danh sách hoạt động không?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteConfirm({ open: false, doctor: null })} sx={{ textTransform: "none", borderRadius: 2 }}>
                        Hủy bỏ
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}>
                        Vô hiệu hóa
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Thêm / Sửa Bác sĩ */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle fontWeight="800" sx={{ borderBottom: "1px solid #E2E8F0", color: "#0088D6" }}>
                    {editingDoctorId ? "Cập Nhật Thông Tin Bác Sĩ" : "Thêm Bác Sĩ Mới"}
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleSubmit} id="doctor-form">
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên Bác sĩ"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                    placeholder="Ví dụ: PGS. TS Trần Văn An"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số điện thoại"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    required
                                    disabled={!!editingDoctorId}
                                    placeholder="090000000X"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="email"
                                    label="Email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="doctor@tnthospital.vn"
                                />
                            </Grid>

                            {!editingDoctorId && (
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        label="Mật khẩu đăng nhập"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        helperText="Mật khẩu tài khoản cấp cho bác sĩ để đăng nhập Portal"
                                    />
                                </Grid>
                            )}

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Chuyên khoa"
                                    value={formData.departmentId}
                                    onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) })}
                                    required
                                >
                                    {departments.map((d) => (
                                        <MenuItem key={d.departmentId} value={d.departmentId}>
                                            {d.departmentName}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Học vị / Chức danh"
                                    value={formData.degree}
                                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                    required
                                >
                                    {DEGREE_OPTIONS.map((opt) => (
                                        <MenuItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Đơn giá khám (VNĐ)"
                                    value={formData.consultationFee}
                                    onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                                    required
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Tiểu sử / Quá trình công tác"
                                    value={formData.biography}
                                    onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                                    placeholder="Hơn 15 năm kinh nghiệm chuyên môn, từng tu nghiệp tại nước ngoài..."
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenModal(false)}>Hủy</Button>
                    <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Đang lưu..." : editingDoctorId ? "Cập Nhật" : "Tạo Bác Sĩ"}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Modal Cập Nhật Chứng Chỉ Hành Nghề (CCHN) Bác Sĩ */}
            <Dialog open={openLicenseModal} onClose={() => setOpenLicenseModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle fontWeight="800" sx={{ borderBottom: "1px solid #E2E8F0", color: "#0088D6" }}>
                    Cập Nhật Chứng Chỉ Hành Nghề (CCHN) Bác Sĩ
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
                    <Box sx={{ mb: 2.5, p: 2, bgcolor: "#EBF6FE", borderRadius: 2.5, border: "1px solid #BAE6FD" }}>
                        <Typography variant="body2" color="#0062A3" fontWeight={700}>
                            Bác sĩ: {licenseForm.doctorName} (Mã BS #{licenseForm.doctorId})
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                            Căn cứ Luật Khám bệnh, chữa bệnh & Thông tư Bộ Y Tế về chuẩn hóa hồ sơ nhân viên y tế
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Số Chứng Chỉ Hành Nghề (CCHN)"
                                value={licenseForm.doctorLicense}
                                onChange={(e) => setLicenseForm({ ...licenseForm, doctorLicense: e.target.value })}
                                required
                                placeholder="VD: 012345/BYT-CCHN hoặc 04567/HNO-CCHN"
                                helperText="Mã định danh hành nghề do Bộ Y tế hoặc Sở Y tế cấp"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Ngày cấp CCHN"
                                InputLabelProps={{ shrink: true }}
                                value={licenseForm.licenseIssuedDate || ""}
                                onChange={(e) => setLicenseForm({ ...licenseForm, licenseIssuedDate: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Phạm vi hoạt động chuyên môn"
                                value={licenseForm.licenseScope}
                                onChange={(e) => setLicenseForm({ ...licenseForm, licenseScope: e.target.value })}
                                placeholder="Khám bệnh, chữa bệnh chuyên khoa Nội tim mạch, Hồi sức cấp cứu..."
                                helperText="Ghi theo phạm vi được ghi trên chứng chỉ hành nghề"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: "1px solid #E2E8F0" }}>
                    <Button onClick={() => setOpenLicenseModal(false)} sx={{ textTransform: "none", borderRadius: 2 }}>Hủy bỏ</Button>
                    <Button variant="contained" onClick={handleSaveLicense} disabled={licenseLoading} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}>
                        {licenseLoading ? "Đang lưu..." : "Lưu Chứng Chỉ"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
