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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import VerifiedIcon from "@mui/icons-material/Verified";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import { useAuth } from "../../context/AuthContext";
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
    password: "",
    departmentId: "",
    degree: "BSCKI",
    consultationFee: "",
    biography: "",
};

export default function DoctorManagePage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ROLE_ADMIN";
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

    // Quản lý Chứng chỉ hành nghề (CCHN)
    const [openLicenseModal, setOpenLicenseModal] = useState(false);
    const [licenseForm, setLicenseForm] = useState({
        doctorId: "",
        doctorName: "",
        doctorLicense: "",
        licenseIssuedDate: "2020-05-15",
        licenseScope: ""
    });
    const [licenseLoading, setLicenseLoading] = useState(false);

    // Tìm kiếm, phản hồi, xác nhận xóa
    const [searchKeyword, setSearchKeyword] = useState("");
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, doctor: null });

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
            setFeedback({ type: "error", message: "Không thể kết nối đến máy chủ để tải dữ liệu bác sĩ." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenLicense = (doc) => {
        setLicenseForm({
            doctorId: doc.doctorId,
            doctorName: doc.fullName || "Bác sĩ",
            doctorLicense: doc.doctorLicense || "",
            licenseIssuedDate: doc.licenseIssuedDate || "2020-05-15",
            licenseScope: doc.licenseScope || "Khám bệnh, chữa bệnh chuyên khoa"
        });
        setError("");
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
            setFeedback({ type: "success", message: `Đã vô hiệu hóa bác sĩ [${doc.fullName}] khỏi danh sách hoạt động.` });
            setDeleteConfirm({ open: false, doctor: null });
            loadData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi vô hiệu hóa bác sĩ!" });
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
                setFeedback({ type: "success", message: `Cập nhật thông tin bác sĩ [${formData.fullName}] thành công!` });
            } else {
                await axiosInstance.post("/api/admin/doctors", formData);
                setFeedback({ type: "success", message: `Thêm mới hồ sơ bác sĩ [${formData.fullName}] thành công!` });
            }
            setOpenModal(false);
            loadData();
        } catch (err) {
            setError(err.message || "Lỗi lưu thông tin bác sĩ!");
        } finally {
            setLoading(false);
        }
    };

    // Lọc danh sách bác sĩ
    const filteredDoctors = useMemo(() => {
        return doctors.filter((d) => {
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
    }, [doctors, selectedDeptFilter, licenseFilter, searchKeyword]);

    // Thống kê nhanh
    const totalDocs = doctors.length;
    const licensedDocs = doctors.filter(d => Boolean(d.doctorLicense && d.doctorLicense.trim())).length;
    const unlicensedDocs = totalDocs - licensedDocs;
    const licenseRate = totalDocs > 0 ? Math.round((licensedDocs / totalDocs) * 100) : 0;
    const avgFee = useMemo(() => {
        if (!doctors.length) return 0;
        const total = doctors.reduce((acc, cur) => acc + (Number(cur.consultationFee) || 0), 0);
        return Math.round(total / doctors.length);
    }, [doctors]);

    return (
        <Box sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", pb: 6 }}>
            <Container maxWidth="xl" sx={{ pt: 3.5 }}>

                {/* 1. Command Header Bar (Apple HIG + Linear Style) */}
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    flexDirection={{ xs: "column", sm: "row" }}
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
                                Quản Lý Bác Sĩ
                            </Typography>
                            <Chip
                                label="Hồ Sơ Y Tế"
                                size="small"
                                sx={{
                                    bgcolor: "rgba(0, 136, 214, 0.08)",
                                    color: "#0088D6",
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    borderRadius: "6px",
                                    height: "24px"
                                }}
                            />
                        </Stack>
                        <Typography
                            variant="body2"
                            sx={{
                                color: "#64748B",
                                mt: 0.5,
                                fontSize: "0.925rem",
                                fontWeight: 450
                            }}
                        >
                            Chuẩn hóa hồ sơ chuyên môn, cấp phép CCHN Bộ Y Tế và định cấu hình biểu phí khám lâm sàng
                        </Typography>
                    </Box>

                    {/* Action buttons */}
                    <Stack direction="row" spacing={1.5} alignItems="center" alignSelf={{ xs: "stretch", sm: "auto" }}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
                            onClick={loadData}
                            disabled={loading}
                            sx={{
                                borderRadius: "10px",
                                fontWeight: 600,
                                textTransform: "none",
                                color: "#334155",
                                borderColor: "rgba(15, 23, 42, 0.12)",
                                bgcolor: "#FFFFFF",
                                px: 2,
                                py: 0.9,
                                transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                                "&:hover": {
                                    bgcolor: "#F1F5F9",
                                    borderColor: "rgba(15, 23, 42, 0.2)"
                                }
                            }}
                        >
                            Làm mới
                        </Button>
                        {isAdmin && (
<Button
                            variant="contained"
                            startIcon={<AddIcon sx={{ fontSize: 20 }} />}
                            onClick={handleOpenAdd}
                            sx={{
                                borderRadius: "10px",
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: "#0088D6",
                                px: 2.5,
                                py: 0.9,
                                boxShadow: "0 2px 8px rgba(0, 136, 214, 0.25)",
                                transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                                "&:hover": {
                                    bgcolor: "#0070B3",
                                    boxShadow: "0 4px 14px rgba(0, 136, 214, 0.35)",
                                    transform: "translateY(-1px)"
                                }
                            }}
                        >
                            Thêm Bác Sĩ Mới
                        </Button>
)}
                    </Stack>
                </Box>

                {/* Feedback Notification Alert */}
                {feedback.message && (
                    <Alert
                        severity={feedback.type || "info"}
                        sx={{
                            mb: 3,
                            borderRadius: "12px",
                            border: "1px solid",
                            borderColor: feedback.type === "success" ? "rgba(0, 168, 120, 0.2)" : "rgba(220, 38, 38, 0.2)",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.02)"
                        }}
                        onClose={() => setFeedback({ type: "", message: "" })}
                    >
                        {feedback.message}
                    </Alert>
                )}

                {/* 2. Micro-KPI Highlights (Linear Style Stats) */}
                <Grid container spacing={2} mb={3}>
                    {/* Thống kê 1: Tổng Bác Sĩ */}
                    <Grid item xs={12} sm={4}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.2,
                                borderRadius: "14px",
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                "&:hover": {
                                    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
                                    borderColor: "rgba(15, 23, 42, 0.15)"
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    width: 46,
                                    height: 46,
                                    borderRadius: "12px",
                                    bgcolor: "rgba(0, 136, 214, 0.08)",
                                    color: "#0088D6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <MedicalServicesIcon />
                            </Box>
                            <Box flexGrow={1}>
                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Đội Ngũ Bác Sĩ
                                </Typography>
                                <Stack direction="row" alignItems="baseline" spacing={1}>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
                                        {totalDocs}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 500 }}>
                                        nhân sự hoạt động
                                    </Typography>
                                </Stack>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Thống kê 2: Tỷ lệ CCHN đạt chuẩn Bộ Y Tế */}
                    <Grid item xs={12} sm={4}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.2,
                                borderRadius: "14px",
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                "&:hover": {
                                    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
                                    borderColor: "rgba(15, 23, 42, 0.15)"
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    width: 46,
                                    height: 46,
                                    borderRadius: "12px",
                                    bgcolor: "rgba(0, 168, 120, 0.08)",
                                    color: "#00A878",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <ShieldOutlinedIcon />
                            </Box>
                            <Box flexGrow={1}>
                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Chuẩn Hóa CCHN
                                </Typography>
                                <Stack direction="row" alignItems="baseline" spacing={1}>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: "#00A878", letterSpacing: "-0.02em" }}>
                                        {licensedDocs}/{totalDocs}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                                        ({licenseRate}% đạt chuẩn)
                                    </Typography>
                                </Stack>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Thống kê 3: Đơn giá khám trung bình */}
                    <Grid item xs={12} sm={4}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.2,
                                borderRadius: "14px",
                                bgcolor: "#FFFFFF",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                "&:hover": {
                                    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
                                    borderColor: "rgba(15, 23, 42, 0.15)"
                                }
                            }}
                        >
                            <Box
                                sx={{
                                    width: 46,
                                    height: 46,
                                    borderRadius: "12px",
                                    bgcolor: "rgba(245, 158, 11, 0.08)",
                                    color: "#D97706",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <MonetizationOnOutlinedIcon />
                            </Box>
                            <Box flexGrow={1}>
                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                    Biểu Phí Khám TB
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
                                    {formatCurrency(avgFee)}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {/* 3. Toolbar & Unified Filter Strip (Linear Toolstrip) */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 3,
                        borderRadius: "14px",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        bgcolor: "#FFFFFF"
                    }}
                >
                    <Grid container spacing={2} alignItems="center">
                        {/* Search Input */}
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Tìm kiếm theo Tên, Số điện thoại, CCHN..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchKeyword && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchKeyword("")}>
                                                <ClearIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: "10px",
                                        bgcolor: "#F8FAFC",
                                        "& fieldset": { borderColor: "rgba(15, 23, 42, 0.08)" }
                                    }
                                }}
                            />
                        </Grid>

                        {/* Dropdown Chuyên khoa */}
                        <Grid item xs={6} sm={4} md={3}>
                            <TextField
                                fullWidth
                                select
                                size="small"
                                label="Chuyên khoa"
                                value={selectedDeptFilter}
                                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "10px",
                                        bgcolor: "#F8FAFC",
                                        "& fieldset": { borderColor: "rgba(15, 23, 42, 0.08)" }
                                    }
                                }}
                            >
                                <MenuItem value="ALL">Tất cả khoa khám ({totalDocs})</MenuItem>
                                {departments.map((d) => (
                                    <MenuItem key={d.departmentId} value={d.departmentId}>
                                        {d.departmentName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Dropdown Chứng chỉ CCHN */}
                        <Grid item xs={6} sm={4} md={2.5}>
                            <TextField
                                fullWidth
                                select
                                size="small"
                                label="Trạng thái CCHN"
                                value={licenseFilter}
                                onChange={(e) => setLicenseFilter(e.target.value)}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "10px",
                                        bgcolor: "#F8FAFC",
                                        "& fieldset": { borderColor: "rgba(15, 23, 42, 0.08)" }
                                    }
                                }}
                            >
                                <MenuItem value="ALL">Tất cả ({totalDocs})</MenuItem>
                                <MenuItem value="LICENSED">Đã có CCHN ({licensedDocs})</MenuItem>
                                <MenuItem value="UNLICENSED">Chờ cấp ({unlicensedDocs})</MenuItem>
                            </TextField>
                        </Grid>

                        {/* Toggle View Mode: Bảng (Table) vs Thẻ (Grid) */}
                        <Grid item xs={12} sm={4} md={2.5} sx={{ display: "flex", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
                            <ToggleButtonGroup
                                value={viewMode}
                                exclusive
                                size="small"
                                onChange={(_, newMode) => newMode && setViewMode(newMode)}
                                sx={{
                                    borderRadius: "10px",
                                    bgcolor: "#F8FAFC",
                                    border: "1px solid rgba(15, 23, 42, 0.08)",
                                    p: "2px",
                                    "& .MuiToggleButton-root": {
                                        border: "none",
                                        borderRadius: "8px",
                                        px: 1.5,
                                        py: 0.6,
                                        textTransform: "none",
                                        fontWeight: 600,
                                        fontSize: "0.85rem",
                                        color: "#64748B",
                                        "&.Mui-selected": {
                                            bgcolor: "#FFFFFF",
                                            color: "#0F172A",
                                            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)"
                                        }
                                    }
                                }}
                            >
                                <ToggleButton value="table">
                                    <ViewListIcon sx={{ fontSize: 18, mr: 0.5 }} /> Bảng
                                </ToggleButton>
                                <ToggleButton value="grid">
                                    <ViewModuleIcon sx={{ fontSize: 18, mr: 0.5 }} /> Thẻ
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>

                    {/* Quick Filter Clickable Pills */}
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={1}
                        mt={2}
                        pt={1.5}
                        sx={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 500, mr: 0.5 }}>
                                Lọc nhanh:
                            </Typography>
                            <Chip
                                label={`Tất cả (${totalDocs})`}
                                size="small"
                                onClick={() => setLicenseFilter("ALL")}
                                sx={{
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    borderRadius: "6px",
                                    bgcolor: licenseFilter === "ALL" ? "#0088D6" : "#F1F5F9",
                                    color: licenseFilter === "ALL" ? "#FFFFFF" : "#475569"
                                }}
                            />
                            <Chip
                                icon={<CheckCircleOutlineIcon style={{ fontSize: 14 }} />}
                                label={`Đã cấp CCHN (${licensedDocs})`}
                                size="small"
                                onClick={() => setLicenseFilter("LICENSED")}
                                sx={{
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    borderRadius: "6px",
                                    bgcolor: licenseFilter === "LICENSED" ? "rgba(0, 168, 120, 0.15)" : "#F1F5F9",
                                    color: licenseFilter === "LICENSED" ? "#00A878" : "#475569"
                                }}
                            />
                            <Chip
                                icon={<WarningAmberOutlinedIcon style={{ fontSize: 14 }} />}
                                label={`Chờ cấp CCHN (${unlicensedDocs})`}
                                size="small"
                                onClick={() => setLicenseFilter("UNLICENSED")}
                                sx={{
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    borderRadius: "6px",
                                    bgcolor: licenseFilter === "UNLICENSED" ? "rgba(245, 158, 11, 0.15)" : "#F1F5F9",
                                    color: licenseFilter === "UNLICENSED" ? "#D97706" : "#475569"
                                }}
                            />
                        </Stack>

                        <Typography variant="caption" sx={{ color: "#64748B" }}>
                            Hiển thị <b>{filteredDoctors.length}</b> trên {totalDocs} bác sĩ
                        </Typography>
                    </Box>
                </Paper>

                {/* 4. Main Content: Table or Grid */}
                {loading ? (
                    <Box textAlign="center" py={10}>
                        <CircularProgress size={36} sx={{ color: "#0088D6" }} />
                        <Typography variant="body2" color="#64748B" mt={2} fontWeight={500}>
                            Đang đồng bộ dữ liệu bác sĩ từ máy chủ...
                        </Typography>
                    </Box>
                ) : filteredDoctors.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 6,
                            borderRadius: "16px",
                            border: "1px dashed rgba(15, 23, 42, 0.15)",
                            textAlign: "center",
                            bgcolor: "#FFFFFF"
                        }}
                    >
                        <Typography variant="h6" color="#0F172A" fontWeight={700}>
                            Không tìm thấy hồ sơ bác sĩ phù hợp
                        </Typography>
                        <Typography variant="body2" color="#64748B" mt={0.5} mb={2}>
                            Hãy thử thay đổi từ khóa tìm kiếm hoặc làm mới bộ lọc chuyên khoa.
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => { setSearchKeyword(""); setSelectedDeptFilter("ALL"); setLicenseFilter("ALL"); }}
                            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600 }}
                        >
                            Đặt lại toàn bộ lọc
                        </Button>
                    </Paper>
                ) : viewMode === "table" ? (
                    /* === VIEW 1: DATA TABLE (Linear High-Precision) === */
                    <TableContainer
                        component={Paper}
                        elevation={0}
                        sx={{
                            borderRadius: "14px",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            overflow: "hidden"
                        }}
                    >
                        <Table sx={{ minWidth: 800 }}>
                            <TableHead sx={{ bgcolor: "#F8FAFC", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.8, width: 60 }}>
                                        #
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.8 }}>
                                        Bác Sĩ & Học Vị
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.8 }}>
                                        Chuyên Khoa
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.8 }}>
                                        Chứng Chỉ CCHN
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.8 }}>
                                        Liên Hệ
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", py: 1.8 }}>
                                        Giá Khám
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", pr: 3, py: 1.8 }}>
                                        Thao Tác
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredDoctors.map((doc, idx) => (
                                    <TableRow
                                        key={doc.doctorId}
                                        sx={{
                                            borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                                            transition: "background-color 0.12s ease",
                                            "&:hover": { bgcolor: "rgba(241, 245, 249, 0.6)" },
                                            "&:last-child": { borderBottom: 0 }
                                        }}
                                    >
                                        <TableCell sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "0.85rem" }}>
                                            {idx + 1}
                                        </TableCell>

                                        {/* Bác sĩ & Học vị */}
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1.8}>
                                                <Avatar
                                                    sx={{
                                                        width: 42,
                                                        height: 42,
                                                        bgcolor: "rgba(0, 136, 214, 0.1)",
                                                        color: "#0088D6",
                                                        fontWeight: 700,
                                                        fontSize: "0.95rem",
                                                        border: "1px solid rgba(0, 136, 214, 0.2)"
                                                    }}
                                                >
                                                    {doc.fullName ? doc.fullName.charAt(0) : "BS"}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F172A", fontSize: "0.925rem" }}>
                                                        {doc.fullName}
                                                    </Typography>
                                                    <Stack direction="row" spacing={1} alignItems="center" mt={0.3}>
                                                        <Chip
                                                            label={doc.degree || "BS"}
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: "0.7rem",
                                                                fontWeight: 700,
                                                                bgcolor: "rgba(15, 23, 42, 0.05)",
                                                                color: "#334155",
                                                                borderRadius: "4px"
                                                            }}
                                                        />
                                                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.75rem" }}>
                                                            Mã #{doc.doctorId}
                                                        </Typography>
                                                    </Stack>
                                                </Box>
                                            </Box>
                                        </TableCell>

                                        {/* Chuyên khoa */}
                                        <TableCell>
                                            <Chip
                                                label={doc.departmentName || "Khoa khám"}
                                                size="small"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: "#0088D6",
                                                    bgcolor: "rgba(0, 136, 214, 0.08)",
                                                    border: "1px solid rgba(0, 136, 214, 0.15)",
                                                    borderRadius: "6px"
                                                }}
                                            />
                                        </TableCell>

                                        {/* Chứng chỉ CCHN */}
                                        <TableCell>
                                            {doc.doctorLicense ? (
                                                <Tooltip title={`Ngày cấp: ${doc.licenseIssuedDate || "Không rõ"} | Phạm vi: ${doc.licenseScope || "Chuyên môn"}`}>
                                                    <Box display="inline-flex" alignItems="center" gap={0.8} sx={{ cursor: "pointer" }}>
                                                        <VerifiedIcon sx={{ color: "#00A878", fontSize: 17 }} />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontFamily: "monospace",
                                                                fontWeight: 700,
                                                                color: "#00A878",
                                                                fontSize: "0.85rem"
                                                            }}
                                                        >
                                                            {doc.doctorLicense}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Chip
                                                    label="Chờ cấp CCHN"
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: "0.75rem",
                                                        fontWeight: 600,
                                                        bgcolor: "rgba(245, 158, 11, 0.1)",
                                                        color: "#D97706",
                                                        borderRadius: "6px"
                                                    }}
                                                />
                                            )}
                                        </TableCell>

                                        {/* Liên hệ */}
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155", fontSize: "0.875rem" }}>
                                                {doc.phoneNumber}
                                            </Typography>
                                            {doc.email && (
                                                <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                                                    {doc.email}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Đơn giá */}
                                        <TableCell>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0088D6", fontSize: "0.925rem" }}>
                                                {formatCurrency(doc.consultationFee)}
                                            </Typography>
                                        </TableCell>

                                        {/* Thao tác */}
                                        <TableCell align="right" sx={{ pr: 3 }}>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                {isAdmin && (
<Tooltip title="Cập nhật CCHN Bộ Y Tế">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenLicense(doc)}
                                                        sx={{
                                                            color: "#0088D6",
                                                            bgcolor: "rgba(0, 136, 214, 0.08)",
                                                            borderRadius: "8px",
                                                            "&:hover": { bgcolor: "rgba(0, 136, 214, 0.16)" }
                                                        }}
                                                    >
                                                        <BadgeOutlinedIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
)}
                                                {isAdmin && (
                                                <Tooltip title="Sửa thông tin hồ sơ">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenEdit(doc)}
                                                        sx={{
                                                            color: "#334155",
                                                            bgcolor: "#F1F5F9",
                                                            borderRadius: "8px",
                                                            "&:hover": { bgcolor: "#E2E8F0" }
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                )}
                                                {isAdmin && (
                                                <Tooltip title="Vô hiệu hóa hồ sơ">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setDeleteConfirm({ open: true, doctor: doc })}
                                                        sx={{
                                                            color: "#DC2626",
                                                            bgcolor: "rgba(220, 38, 38, 0.08)",
                                                            borderRadius: "8px",
                                                            "&:hover": { bgcolor: "rgba(220, 38, 38, 0.16)" }
                                                        }}
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    /* === VIEW 2: CARD GRID (Apple HIG Gallery Stage) === */
                    <Grid container spacing={2.5}>
                        {filteredDoctors.map((doc) => (
                            <Grid item xs={12} sm={6} md={4} key={doc.doctorId}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        height: "100%",
                                        borderRadius: "14px",
                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                        bgcolor: "#FFFFFF",
                                        display: "flex",
                                        flexDirection: "column",
                                        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                        "&:hover": {
                                            transform: "translateY(-2px)",
                                            borderColor: "rgba(0, 136, 214, 0.4)",
                                            boxShadow: "0 10px 24px -4px rgba(15, 23, 42, 0.08)"
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                                        {/* Avatar & Header */}
                                        <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                                            <Avatar
                                                sx={{
                                                    width: 48,
                                                    height: 48,
                                                    bgcolor: "rgba(0, 136, 214, 0.1)",
                                                    color: "#0088D6",
                                                    fontWeight: 800,
                                                    fontSize: "1.1rem",
                                                    border: "1px solid rgba(0, 136, 214, 0.2)"
                                                }}
                                            >
                                                {doc.fullName ? doc.fullName.charAt(0) : "BS"}
                                            </Avatar>
                                            <Box flexGrow={1} minWidth={0}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#0F172A", lineHeight: 1.3 }} noWrap>
                                                    {doc.fullName}
                                                </Typography>
                                                <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                                                    <Chip
                                                        label={doc.degree || "BS"}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: "0.7rem",
                                                            fontWeight: 700,
                                                            bgcolor: "#F1F5F9",
                                                            color: "#334155",
                                                            borderRadius: "4px"
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ color: "#64748B" }}>
                                                        {doc.departmentName}
                                                    </Typography>
                                                </Stack>
                                            </Box>
                                        </Box>

                                        {/* CCHN Badge */}
                                        <Box mb={2}>
                                            {doc.doctorLicense ? (
                                                <Box
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 0.8,
                                                        px: 1.2,
                                                        py: 0.4,
                                                        borderRadius: "6px",
                                                        bgcolor: "rgba(0, 168, 120, 0.08)",
                                                        border: "1px solid rgba(0, 168, 120, 0.2)"
                                                    }}
                                                >
                                                    <VerifiedIcon sx={{ color: "#00A878", fontSize: 16 }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#00A878", fontFamily: "monospace" }}>
                                                        CCHN: {doc.doctorLicense}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Box
                                                    sx={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 0.8,
                                                        px: 1.2,
                                                        py: 0.4,
                                                        borderRadius: "6px",
                                                        bgcolor: "rgba(245, 158, 11, 0.08)",
                                                        border: "1px solid rgba(245, 158, 11, 0.2)"
                                                    }}
                                                >
                                                    <WarningAmberOutlinedIcon sx={{ color: "#D97706", fontSize: 16 }} />
                                                    <Typography variant="caption" sx={{ fontWeight: 600, color: "#D97706" }}>
                                                        Chưa cấp chứng chỉ hành nghề
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Contact & Price */}
                                        <Box
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            pt={1.5}
                                            sx={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}
                                        >
                                            <Stack direction="row" spacing={0.6} alignItems="center">
                                                <PhoneIcon sx={{ fontSize: 15, color: "#94A3B8" }} />
                                                <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569" }}>
                                                    {doc.phoneNumber}
                                                </Typography>
                                            </Stack>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0088D6" }}>
                                                {formatCurrency(doc.consultationFee)}
                                            </Typography>
                                        </Box>
                                    </CardContent>

                                    {/* Action Bar at Bottom */}
                                    <Box
                                        display="flex"
                                        justifyContent="flex-end"
                                        alignItems="center"
                                        gap={1}
                                        px={2}
                                        py={1.2}
                                        sx={{
                                            bgcolor: "#F8FAFC",
                                            borderTop: "1px solid rgba(15, 23, 42, 0.06)"
                                        }}
                                    >
                                        {isAdmin && (
<Tooltip title="Cấp / Sửa CCHN">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenLicense(doc)}
                                                sx={{ color: "#0088D6", bgcolor: "#FFFFFF", borderRadius: "8px", border: "1px solid rgba(15, 23, 42, 0.08)" }}
                                            >
                                                <BadgeOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
)}
                                        {isAdmin && (
                                        <Tooltip title="Sửa thông tin">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenEdit(doc)}
                                                sx={{ color: "#334155", bgcolor: "#FFFFFF", borderRadius: "8px", border: "1px solid rgba(15, 23, 42, 0.08)" }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        )}
                                        {isAdmin && (
                                        <Tooltip title="Vô hiệu hóa">
                                            <IconButton
                                                size="small"
                                                onClick={() => setDeleteConfirm({ open: true, doctor: doc })}
                                                sx={{ color: "#DC2626", bgcolor: "#FFFFFF", borderRadius: "8px", border: "1px solid rgba(15, 23, 42, 0.08)" }}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        )}
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* 5. Modal Cập Nhật Chứng Chỉ Hành Nghề (CCHN) */}
                <Dialog
                    open={openLicenseModal}
                    onClose={() => setOpenLicenseModal(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: "18px",
                            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.16)",
                            border: "1px solid rgba(15, 23, 42, 0.08)"
                        }
                    }}
                >
                    <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: "10px",
                                    bgcolor: "rgba(0, 136, 214, 0.1)",
                                    color: "#0088D6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <WorkspacePremiumIcon />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.15rem" }}>
                                    Cập Nhật Chứng Chỉ Hành Nghề (CCHN)
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748B" }}>
                                    Chuẩn hóa pháp lý nhân sự theo quy định Bộ Y Tế
                                </Typography>
                            </Box>
                        </Stack>
                    </DialogTitle>

                    <DialogContent sx={{ px: 2.5, py: 2 }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
                                {error}
                            </Alert>
                        )}

                        <Box
                            sx={{
                                mb: 2.5,
                                p: 2,
                                bgcolor: "rgba(0, 136, 214, 0.05)",
                                borderRadius: "12px",
                                border: "1px solid rgba(0, 136, 214, 0.15)"
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ color: "#0070B3", fontWeight: 700 }}>
                                Bác sĩ: {licenseForm.doctorName} (Mã định danh #{licenseForm.doctorId})
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.3 }}>
                                Căn cứ Luật Khám bệnh, chữa bệnh về chuẩn hóa hồ sơ nhân viên y tế hoạt động tại cơ sở.
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
                                    helperText="Mã số định danh do Bộ Y tế hoặc Sở Y tế cấp phép"
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                                    helperText="Ghi chính xác phạm vi chuyên môn được ghi nhận trên chứng chỉ"
                                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>

                    <DialogActions sx={{ p: 2.5, borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
                        <Button
                            onClick={() => setOpenLicenseModal(false)}
                            sx={{ textTransform: "none", borderRadius: "10px", color: "#64748B", fontWeight: 600 }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSaveLicense}
                            disabled={licenseLoading}
                            sx={{
                                textTransform: "none",
                                borderRadius: "10px",
                                fontWeight: 700,
                                bgcolor: "#0088D6",
                                px: 3,
                                "&:hover": { bgcolor: "#0070B3" }
                            }}
                        >
                            {licenseLoading ? "Đang lưu..." : "Lưu Chứng Chỉ"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* 6. Modal Thêm / Sửa Hồ Sơ Bác Sĩ */}
                <Dialog
                    open={openModal}
                    onClose={() => setOpenModal(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: "18px",
                            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.16)",
                            border: "1px solid rgba(15, 23, 42, 0.08)"
                        }
                    }}
                >
                    <DialogTitle sx={{ p: 2.5, pb: 1.5, borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.15rem" }}>
                            {editingDoctorId ? "Cập Nhật Hồ Sơ Bác Sĩ" : "Thêm Hồ Sơ Bác Sĩ Mới"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
                            Điền đầy đủ thông tin định danh và chuyên khoa phụ trách
                        </Typography>
                    </DialogTitle>

                    <DialogContent sx={{ px: 2.5, py: 2.5 }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: "10px" }}>
                                {error}
                            </Alert>
                        )}

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
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="email"
                                        label="Email liên hệ"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="doctor@tnthospital.vn"
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                                    />
                                </Grid>

                                {!editingDoctorId && (
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            type="password"
                                            label="Mật khẩu đăng nhập cổng portal"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            helperText="Mật khẩu mặc định cấp cho tài khoản bác sĩ"
                                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                                        />
                                    </Grid>
                                )}

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        select
                                        label="Chuyên khoa công tác"
                                        value={formData.departmentId}
                                        onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) })}
                                        required
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                                        label="Đơn giá khám lâm sàng (VNĐ)"
                                        value={formData.consultationFee}
                                        onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                                        required
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
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
                                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ p: 2.5, borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
                        <Button
                            onClick={() => setOpenModal(false)}
                            sx={{ textTransform: "none", borderRadius: "10px", color: "#64748B", fontWeight: 600 }}
                        >
                            Hủy
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={loading}
                            sx={{
                                textTransform: "none",
                                borderRadius: "10px",
                                fontWeight: 700,
                                bgcolor: "#0088D6",
                                px: 3,
                                "&:hover": { bgcolor: "#0070B3" }
                            }}
                        >
                            {loading ? "Đang lưu..." : editingDoctorId ? "Cập Nhật Hồ Sơ" : "Tạo Mới"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* 7. Dialog Xác Nhận Vô Hiệu Hóa */}
                <Dialog
                    open={deleteConfirm.open}
                    onClose={() => setDeleteConfirm({ open: false, doctor: null })}
                    PaperProps={{
                        sx: {
                            borderRadius: "16px",
                            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.16)",
                            border: "1px solid rgba(15, 23, 42, 0.08)"
                        }
                    }}
                >
                    <DialogTitle sx={{ fontWeight: 800, color: "#DC2626", p: 2.5, pb: 1 }}>
                        Xác nhận vô hiệu hóa bác sĩ?
                    </DialogTitle>
                    <DialogContent sx={{ px: 2.5, py: 1.5 }}>
                        <Typography variant="body1" color="#334155">
                            Bạn có chắc chắn muốn vô hiệu hóa hoạt động của bác sĩ <b>{deleteConfirm.doctor?.fullName}</b> không? Bác sĩ này sẽ tạm ngừng tiếp nhận đặt lịch khám mới.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5, borderTop: "1px solid rgba(15, 23, 42, 0.08)" }}>
                        <Button
                            onClick={() => setDeleteConfirm({ open: false, doctor: null })}
                            sx={{ textTransform: "none", borderRadius: "10px", color: "#64748B", fontWeight: 600 }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            color="error"
                            variant="contained"
                            sx={{ textTransform: "none", borderRadius: "10px", fontWeight: 700, px: 2.5 }}
                        >
                            Xác nhận vô hiệu hóa
                        </Button>
                    </DialogActions>
                </Dialog>

            </Container>
        </Box>
    );
}
