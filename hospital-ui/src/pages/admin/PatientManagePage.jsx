import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Alert,
    Tooltip,
    InputAdornment,
    Avatar,
    Divider,
    CircularProgress,
    MenuItem,
    Card,
    CardContent,
    Stack,
    Snackbar
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PhoneIcon from "@mui/icons-material/Phone";
import BadgeIcon from "@mui/icons-material/Badge";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import HistoryIcon from "@mui/icons-material/History";
import ReceiptIcon from "@mui/icons-material/Receipt";
import EmailIcon from "@mui/icons-material/Email";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MaleIcon from "@mui/icons-material/Male";
import FemaleIcon from "@mui/icons-material/Female";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/AxiosInstance";
import { formatDate, formatDateTime, formatCurrency, isValidPhoneNumber, isValidIdentityNumber, isValidHealthInsurance } from "../../utils/formatters";
import PatientProfileDetailModal from "../../components/common/PatientProfileDetailModal";
import ElectronicMedicalRecordModal from "../../components/common/ElectronicMedicalRecordModal";
import designTokens from "../../theme/designTokens";

const BRAND_PRIMARY = designTokens.brand.primary;
const BRAND_DARK = designTokens.brand.primaryDark;
const BRAND_LIGHT = designTokens.brand.primaryLight;

const defaultFormData = {
    fullName: "",
    phoneNumber: "",
    identityNumber: "",
    healthInsuranceNumber: "",
    gender: "MALE",
    dateOfBirth: "",
    streetAddress: "",
    province: "",
    district: "",
    ward: "",
    email: ""
};

export default function PatientManagePage() {
    const { user } = useAuth();
    const isHeadOfDept = user?.role === "ROLE_HEAD_OF_DEPARTMENT";
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successToast, setSuccessToast] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");

    // Bộ lọc
    const [insuranceFilter, setInsuranceFilter] = useState("ALL"); // ALL, HAS_INSURANCE, NO_INSURANCE
    const [genderFilter, setGenderFilter] = useState("ALL"); // ALL, MALE, FEMALE, OTHER

    // Modals
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [selectedBookingForEhr, setSelectedBookingForEhr] = useState(null);

    const [openFormModal, setOpenFormModal] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadPatients();
    }, []);

    // 1. Tải danh sách bệnh nhân từ API chuyên dụng cho Admin
    const loadPatients = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const res = await axiosInstance.get("/api/admin/patients");
            const raw = res?.data !== undefined ? res.data : res;
            const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.content) ? raw.content : []);
            setPatients(list);
        } catch (err) {
            console.error("Lỗi tải danh sách bệnh nhân:", err);
            const msg = err.response?.data?.message || err.message || "Không thể đồng bộ danh sách bệnh nhân từ máy chủ.";
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    // 2. Mở modal thêm mới
    const handleOpenAdd = () => {
        setEditingPatient(null);
        setFormData(defaultFormData);
        setFormError("");
        setOpenFormModal(true);
    };

    // 3. Mở modal chỉnh sửa
    const handleOpenEdit = (p) => {
        setEditingPatient(p);
        setFormData({
            fullName: p.fullName || "",
            phoneNumber: p.phoneNumber || "",
            identityNumber: p.identityNumber && p.identityNumber !== "Chưa cập nhật" ? p.identityNumber : "",
            healthInsuranceNumber: p.healthInsuranceNumber || "",
            gender: p.gender || "MALE",
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.substring(0, 10) : "",
            streetAddress: p.streetAddress || "",
            province: p.province || "",
            district: p.district || "",
            ward: p.ward || "",
            email: p.email || ""
        });
        setFormError("");
        setOpenFormModal(true);
    };

    // 4. Mở modal xác nhận xóa
    const handleOpenDelete = (p) => {
        setPatientToDelete(p);
        setOpenDeleteModal(true);
    };

    // 5. Lưu hồ sơ (Thêm mới hoặc Cập nhật)
    const handleSavePatient = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
            setFormError("Họ và tên bệnh nhân phải có ít nhất 2 ký tự!");
            return;
        }

        if (!formData.phoneNumber.trim() || !isValidPhoneNumber(formData.phoneNumber.trim())) {
            setFormError("Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (03, 05, 07, 08, 09).");
            return;
        }

        if (formData.identityNumber && !isValidIdentityNumber(formData.identityNumber.trim())) {
            setFormError("Số CCCD/CMND không hợp lệ! Vui lòng nhập 12 chữ số CCCD (hoặc 9 số CMND).");
            return;
        }

        if (formData.healthInsuranceNumber && !isValidHealthInsurance(formData.healthInsuranceNumber.trim())) {
            setFormError("Mã thẻ BHYT không hợp lệ! Vui lòng nhập đúng 10-15 ký tự chữ và số.");
            return;
        }

        if (!formData.dateOfBirth) {
            setFormError("Vui lòng chọn ngày tháng năm sinh!");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                fullName: formData.fullName.trim(),
                phoneNumber: formData.phoneNumber.trim(),
                identityNumber: formData.identityNumber?.trim() || null,
                healthInsuranceNumber: formData.healthInsuranceNumber?.trim() || null,
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth,
                streetAddress: formData.streetAddress?.trim() || "",
                province: formData.province?.trim() || "Thành phố Hà Nội",
                district: formData.district?.trim() || "",
                ward: formData.ward?.trim() || "",
                email: formData.email?.trim() || null
            };

            if (editingPatient) {
                await axiosInstance.put(`/api/admin/patients/${editingPatient.patientProfileId}`, payload);
                setSuccessToast(`Đã cập nhật hồ sơ bệnh nhân [${payload.fullName}] thành công!`);
            } else {
                await axiosInstance.post("/api/admin/patients", payload);
                setSuccessToast(`Đã thêm mới hồ sơ bệnh nhân [${payload.fullName}] vào hệ thống!`);
            }

            setOpenFormModal(false);
            loadPatients();
        } catch (err) {
            console.error("Lỗi lưu hồ sơ bệnh nhân:", err);
            setFormError(err.message || "Đã xảy ra lỗi khi lưu hồ sơ bệnh nhân!");
        } finally {
            setSubmitting(false);
        }
    };

    // 6. Xác nhận xóa hồ sơ
    const handleConfirmDelete = async () => {
        if (!patientToDelete) return;
        setDeleting(true);
        try {
            await axiosInstance.delete(`/api/admin/patients/${patientToDelete.patientProfileId}`);
            setSuccessToast(`Đã xóa hồ sơ bệnh nhân [${patientToDelete.fullName}] thành công!`);
            setOpenDeleteModal(false);
            setPatientToDelete(null);
            loadPatients();
        } catch (err) {
            console.error("Lỗi xóa hồ sơ:", err);
            alert(err.message || "Không thể xóa hồ sơ bệnh nhân!");
        } finally {
            setDeleting(false);
        }
    };

    // Lọc danh sách bệnh nhân
    const filteredPatients = patients.filter((p) => {
        const kw = searchKeyword.toLowerCase().trim();
        const matchesKw =
            !kw ||
            p.fullName?.toLowerCase().includes(kw) ||
            p.phoneNumber?.includes(kw) ||
            p.identityNumber?.toLowerCase().includes(kw) ||
            p.healthInsuranceNumber?.toLowerCase().includes(kw) ||
            p.patientCode?.toLowerCase().includes(kw);

        const hasIns = Boolean(p.healthInsuranceNumber);
        const matchesIns =
            insuranceFilter === "ALL" ||
            (insuranceFilter === "HAS_INSURANCE" && hasIns) ||
            (insuranceFilter === "NO_INSURANCE" && !hasIns);

        const matchesGender = genderFilter === "ALL" || p.gender === genderFilter;

        return matchesKw && matchesIns && matchesGender;
    });

    // Thống kê nhanh
    const totalPatients = patients.length;
    const insuredCount = patients.filter((p) => Boolean(p.healthInsuranceNumber)).length;
    const totalVisitsCount = patients.reduce((sum, p) => sum + (Number(p.totalVisits) || 0), 0);
    const totalBalance = patients.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);

    return (
        <Container maxWidth="xl" sx={{ py: 3.5 }}>
            {/* 1. Header Banner Apple HIG */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    background: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Chip
                            label="HỆ THỐNG QUẢN LÝ DÂN SỐ Y TẾ • SMARTHIS REGISTRY PRO"
                            size="small"
                            sx={{
                                height: 22,
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                bgcolor: BRAND_LIGHT,
                                color: BRAND_PRIMARY,
                                mb: 1
                            }}
                        />
                        <Typography
                            variant="h5"
                            fontWeight="800"
                            color="#0F172A"
                            sx={{ letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 1.5 }}
                        >
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 2.5,
                                    bgcolor: "#EBF6FE",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid rgba(15, 118, 110, 0.2)"
                                }}
                            >
                                <PeopleAltIcon sx={{ color: BRAND_PRIMARY, fontSize: 24 }} />
                            </Box>
                            Quản Lý Danh Sách & Hồ Sơ Bệnh Nhân
                        </Typography>
                        <Typography variant="body2" color="#64748B" sx={{ mt: 0.5, maxWidth: 760 }}>
                            Cơ sở dữ liệu bệnh nhân tập trung, định danh CCCD/VNeID, tra cứu thẻ BHYT quốc gia và theo dõi lịch sử khám lâm sàng
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={loadPatients}
                            disabled={loading}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 700,
                                textTransform: "none",
                                px: 2.5,
                                borderColor: "rgba(15, 23, 42, 0.15)",
                                color: "#334155",
                                "&:hover": { borderColor: BRAND_PRIMARY, bgcolor: "rgba(15, 118, 110, 0.04)" }
                            }}
                        >
                            {loading ? "Đang tải..." : "Làm mới"}
                        </Button>
                        {!isHeadOfDept && (
                            <Button
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={handleOpenAdd}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: BRAND_PRIMARY,
                                "&:hover": { bgcolor: "#0070BA" },
                                px: 3,
                                boxShadow: "0 4px 14px rgba(15, 118, 110, 0.25)"
                            }}
                        >
                            Thêm Bệnh Nhân Mới
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Paper>

            {/* 2. Thống kê nhanh (Apple HIG KPI Cards with Color Accents) */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderTop: `3px solid ${BRAND_PRIMARY}`,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.72rem" }}>
                                    TỔNG BỆNH NHÂN
                                </Typography>
                                <Typography variant="h4" fontWeight="800" color="#0F172A" sx={{ mt: 0.5, letterSpacing: "-0.5px" }}>
                                    {totalPatients}
                                </Typography>
                                <Typography variant="caption" color="#64748B" sx={{ mt: 0.5, display: "block" }}>
                                    Hồ sơ đăng ký trong hệ thống
                                </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: BRAND_LIGHT, color: BRAND_PRIMARY, width: 48, height: 48, borderRadius: 2.5 }}>
                                <PeopleAltIcon />
                            </Avatar>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderTop: "3px solid #10B981",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.72rem" }}>
                                    CÓ THẺ BHYT HỢP LỆ
                                </Typography>
                                <Typography variant="h4" fontWeight="800" color="#065F46" sx={{ mt: 0.5, letterSpacing: "-0.5px" }}>
                                    {insuredCount}
                                </Typography>
                                <Typography variant="caption" color="#059669" sx={{ mt: 0.5, display: "block", fontWeight: 600 }}>
                                    Tỷ lệ: {totalPatients > 0 ? Math.round((insuredCount / totalPatients) * 100) : 0}% tổng hồ sơ
                                </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: "rgba(16, 185, 129, 0.1)", color: "#10B981", width: 48, height: 48, borderRadius: 2.5 }}>
                                <ReceiptIcon />
                            </Avatar>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderTop: "3px solid #8B5CF6",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="caption" sx={{ color: "#7C3AED", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.72rem" }}>
                                    LƯỢT KHÁM LÂM SÀNG
                                </Typography>
                                <Typography variant="h4" fontWeight="800" color="#5B21B6" sx={{ mt: 0.5, letterSpacing: "-0.5px" }}>
                                    {totalVisitsCount}
                                </Typography>
                                <Typography variant="caption" color="#7C3AED" sx={{ mt: 0.5, display: "block" }}>
                                    Lượt tiếp đón & thăm khám
                                </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", width: 48, height: 48, borderRadius: 2.5 }}>
                                <MedicalServicesIcon />
                            </Avatar>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderTop: "3px solid #F59E0B",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="caption" sx={{ color: "#D97706", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.72rem" }}>
                                    SỐ DƯ VÍ TẠM ỨNG
                                </Typography>
                                <Typography variant="h4" fontWeight="800" color="#92400E" sx={{ mt: 0.5, letterSpacing: "-0.5px", fontSize: "1.5rem" }}>
                                    {formatCurrency(totalBalance)}
                                </Typography>
                                <Typography variant="caption" color="#B45309" sx={{ mt: 0.5, display: "block" }}>
                                    Tài khoản ký quỹ bệnh viện
                                </Typography>
                            </Box>
                            <Avatar sx={{ bgcolor: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", width: 48, height: 48, borderRadius: 2.5 }}>
                                <AccountBalanceWalletIcon />
                            </Avatar>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Error Banner */}
            {errorMsg && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 2.5, border: "1px solid rgba(245, 158, 11, 0.3)" }}
                    action={
                        <Button color="inherit" size="small" onClick={loadPatients}>
                            Thử lại
                        </Button>
                    }
                >
                    {errorMsg}
                </Alert>
            )}

            {/* 3. Bảng Dữ Liệu & Bộ Lọc Apple HIG */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 2.5 },
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}
            >
                <Box mb={2.5} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box display="flex" gap={1.5} flexWrap="wrap" flexGrow={1}>
                        <TextField
                            size="small"
                            placeholder="Tìm kiếm theo Tên, SĐT, CCCD, Mã BHYT, Mã BN..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            sx={{ minWidth: { xs: "100%", sm: 340 }, maxWidth: 460 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94A3B8" }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2.5, bgcolor: "#F8FAFC" }
                            }}
                        />

                        <TextField
                            select
                            size="small"
                            value={insuranceFilter}
                            onChange={(e) => setInsuranceFilter(e.target.value)}
                            sx={{ minWidth: 170 }}
                            InputProps={{ sx: { borderRadius: 2.5, bgcolor: "#F8FAFC" } }}
                        >
                            <MenuItem value="ALL">Tất cả bảo hiểm</MenuItem>
                            <MenuItem value="HAS_INSURANCE">Đã có thẻ BHYT</MenuItem>
                            <MenuItem value="NO_INSURANCE">Chưa có BHYT</MenuItem>
                        </TextField>

                        <TextField
                            select
                            size="small"
                            value={genderFilter}
                            onChange={(e) => setGenderFilter(e.target.value)}
                            sx={{ minWidth: 150 }}
                            InputProps={{ sx: { borderRadius: 2.5, bgcolor: "#F8FAFC" } }}
                        >
                            <MenuItem value="ALL">Tất cả giới tính</MenuItem>
                            <MenuItem value="MALE">Nam</MenuItem>
                            <MenuItem value="FEMALE">Nữ</MenuItem>
                            <MenuItem value="OTHER">Khác</MenuItem>
                        </TextField>
                    </Box>

                    <Chip
                        label={`Hiển thị: ${filteredPatients.length} / ${totalPatients} hồ sơ`}
                        size="small"
                        sx={{
                            fontWeight: 700,
                            bgcolor: "#F1F5F9",
                            color: "#475569",
                            height: 28,
                            fontSize: "0.78rem"
                        }}
                    />
                </Box>

                <TableContainer sx={{ borderRadius: 2.5, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>MÃ BN</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>HỌ VÀ TÊN</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>SỐ ĐIỆN THOẠI</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>CCCD / BHYT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>NGÀY SINH / GIỚI TÍNH</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, textAlign: "center" }}>LƯỢT KHÁM</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, textAlign: "right" }}>SỐ DƯ VÍ</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>KHÁM GẦN NHẤT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5, textAlign: "center" }}>THAO TÁC</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                        <CircularProgress size={32} />
                                        <Typography variant="body2" color="text.secondary" mt={1}>
                                            Đang đồng bộ hồ sơ bệnh nhân từ cơ sở dữ liệu...
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredPatients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                            <PeopleAltIcon sx={{ fontSize: 48, color: "#CBD5E1" }} />
                                            <Typography variant="subtitle1" fontWeight={700} color="#64748B">
                                                Không tìm thấy hồ sơ bệnh nhân nào phù hợp
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Hãy kiểm tra lại từ khóa tìm kiếm hoặc đặt lại các bộ lọc
                                            </Typography>
                                            {(searchKeyword || insuranceFilter !== "ALL" || genderFilter !== "ALL") && (
                                                <Button
                                                    size="small"
                                                    variant="text"
                                                    onClick={() => {
                                                        setSearchKeyword("");
                                                        setInsuranceFilter("ALL");
                                                        setGenderFilter("ALL");
                                                    }}
                                                    sx={{ mt: 1, textTransform: "none" }}
                                                >
                                                    Xóa bộ lọc
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPatients.map((p) => {
                                    const hasInsurance = Boolean(p.healthInsuranceNumber);
                                    return (
                                        <TableRow key={p.patientProfileId} hover sx={{ "&:hover": { bgcolor: "#F8FAFC" } }}>
                                            <TableCell>
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        fontFamily: "monospace",
                                                        fontWeight: 700,
                                                        fontSize: "0.8rem",
                                                        bgcolor: BRAND_LIGHT,
                                                        color: BRAND_PRIMARY,
                                                        px: 1,
                                                        py: 0.4,
                                                        borderRadius: 1.5,
                                                        display: "inline-block"
                                                    }}
                                                >
                                                    {p.patientCode || (p.patientProfileId ? "BN-" + String(p.patientProfileId).substring(0, 6).toUpperCase() : "BN-NEW")}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex" alignItems="center" gap={1.5}>
                                                    <Avatar
                                                        sx={{
                                                            width: 34,
                                                            height: 34,
                                                            bgcolor: p.gender === "FEMALE" ? "rgba(236, 72, 153, 0.12)" : "rgba(15, 118, 110, 0.12)",
                                                            color: p.gender === "FEMALE" ? "#DB2777" : BRAND_PRIMARY,
                                                            fontSize: "0.85rem",
                                                            fontWeight: 800
                                                        }}
                                                    >
                                                        {p.fullName?.charAt(0) || "B"}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={700} color="#0F172A">
                                                            {p.fullName}
                                                        </Typography>
                                                        {p.email && (
                                                            <Typography variant="caption" color="#94A3B8" sx={{ display: "block" }}>
                                                                {p.email}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600, color: "#334155", fontFamily: "monospace", fontSize: "0.85rem" }}>
                                                {p.phoneNumber}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontSize="0.82rem" fontWeight={600} color="#334155" sx={{ fontFamily: "monospace" }}>
                                                    {p.identityNumber || "Chưa cập nhật"}
                                                </Typography>
                                                <Chip
                                                    label={hasInsurance ? `BHYT: ${p.healthInsuranceNumber}` : "Chưa BHYT"}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: "0.68rem",
                                                        fontWeight: 700,
                                                        mt: 0.5,
                                                        bgcolor: hasInsurance ? "rgba(16, 185, 129, 0.1)" : "#F1F5F9",
                                                        color: hasInsurance ? "#059669" : "#64748B",
                                                        border: `1px solid ${hasInsurance ? "rgba(16, 185, 129, 0.3)" : "rgba(100, 116, 139, 0.2)"}`
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: "0.85rem", color: "#334155" }}>
                                                {formatDate(p.dateOfBirth)}{" "}
                                                <Chip
                                                    icon={p.gender === "FEMALE" ? <FemaleIcon sx={{ fontSize: "14px !important" }} /> : <MaleIcon sx={{ fontSize: "14px !important" }} />}
                                                    label={p.gender === "MALE" ? "Nam" : p.gender === "FEMALE" ? "Nữ" : "Khác"}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: "0.68rem",
                                                        fontWeight: 700,
                                                        bgcolor: p.gender === "FEMALE" ? "rgba(236, 72, 153, 0.08)" : "rgba(59, 130, 246, 0.08)",
                                                        color: p.gender === "FEMALE" ? "#DB2777" : "#2563EB",
                                                        ml: 0.5
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={`${p.totalVisits || 0} lần`}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 700,
                                                        height: 22,
                                                        fontSize: "0.75rem",
                                                        bgcolor: (p.totalVisits || 0) > 0 ? BRAND_LIGHT : "#F1F5F9",
                                                        color: (p.totalVisits || 0) > 0 ? BRAND_PRIMARY : "#64748B"
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" sx={{ fontWeight: 700, color: (p.balance || 0) > 0 ? "#059669" : "#64748B", fontFamily: "monospace" }}>
                                                    {formatCurrency(p.balance || 0)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ fontSize: "0.82rem", color: "#64748B" }}>
                                                {p.lastVisitDate || "---"}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={1} justifyContent="center">
                                                    <Tooltip title="Xem chi tiết hồ sơ & lịch sử khám">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setSelectedPatient(p);
                                                                setOpenDetailModal(true);
                                                            }}
                                                            sx={{
                                                                bgcolor: BRAND_LIGHT,
                                                                color: BRAND_PRIMARY,
                                                                borderRadius: 2,
                                                                "&:hover": { bgcolor: "rgba(15, 118, 110, 0.16)" }
                                                            }}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {!isHeadOfDept && (
                                                        <Tooltip title="Chỉnh sửa thông tin">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenEdit(p)}
                                                            sx={{
                                                                bgcolor: "rgba(139, 92, 246, 0.08)",
                                                                color: "#7C3AED",
                                                                borderRadius: 2,
                                                                "&:hover": { bgcolor: "rgba(139, 92, 246, 0.16)" }
                                                            }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    )}
                                                    {!isHeadOfDept && (
                                                        <Tooltip title="Xóa hồ sơ">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenDelete(p)}
                                                            sx={{
                                                                bgcolor: "rgba(239, 68, 68, 0.08)",
                                                                color: "#DC2626",
                                                                borderRadius: 2,
                                                                "&:hover": { bgcolor: "rgba(239, 68, 68, 0.16)" }
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                        </Tooltip>
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
            </Paper>

            {/* 4. Modal Chi Tiết Hồ Sơ Bệnh Nhân (Master Patient Index - Dossier Nhân Khẩu) */}
            <PatientProfileDetailModal
                open={openDetailModal}
                onClose={() => setOpenDetailModal(false)}
                patient={selectedPatient}
                profile={selectedPatient}
                onViewMedicalRecord={(booking) => setSelectedBookingForEhr(booking)}
                onOpenEhr={(booking) => setSelectedBookingForEhr(booking)}
            />

            {/* Modal Bệnh Án Điện Tử (EMR) chuẩn Bộ Y Tế TT 46/2018/TT-BYT */}
            <ElectronicMedicalRecordModal
                open={Boolean(selectedBookingForEhr)}
                onClose={() => setSelectedBookingForEhr(null)}
                booking={selectedBookingForEhr}
            />

            {/* 5. Modal Thêm / Chỉnh Sửa Hồ Sơ Bệnh Nhân Apple HIG */}
            <Dialog
                open={openFormModal}
                onClose={() => !submitting && setOpenFormModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)",
                        overflow: "hidden"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid rgba(15, 23, 42, 0.08)", color: "#0F172A", bgcolor: "#F8FAFC", py: 2 }}>
                    {editingPatient ? `Chỉnh Sửa Hồ Sơ Bệnh Nhân: ${editingPatient.fullName}` : "Thêm Mới Hồ Sơ Bệnh Nhân"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSavePatient}>
                    <DialogContent sx={{ p: 3, bgcolor: "#FFFFFF" }}>
                        {formError && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }}>
                                {formError}
                            </Alert>
                        )}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên bệnh nhân *"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Ví dụ: NGUYỄN VĂN AN"
                                    required
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số điện thoại liên hệ *"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="Ví dụ: 0987654321"
                                    required
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số CCCD / Định danh cá nhân"
                                    value={formData.identityNumber}
                                    onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                                    placeholder="12 chữ số CCCD (hoặc 9 số CMND)"
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Mã thẻ BHYT (Nếu có)"
                                    value={formData.healthInsuranceNumber}
                                    onChange={(e) => setFormData({ ...formData, healthInsuranceNumber: e.target.value })}
                                    placeholder="Ví dụ: DN4010900123456"
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Ngày tháng năm sinh *"
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Giới tính *"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                >
                                    <MenuItem value="MALE">Nam</MenuItem>
                                    <MenuItem value="FEMALE">Nữ</MenuItem>
                                    <MenuItem value="OTHER">Khác</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Tỉnh / Thành phố"
                                    value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Quận / Huyện"
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Phường / Xã"
                                    value={formData.ward}
                                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    label="Địa chỉ chi tiết (Số nhà, tên đường, thôn xóm)"
                                    value={formData.streetAddress}
                                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Email (Không bắt buộc)"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    size="small"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5, borderTop: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#F8FAFC" }}>
                        <Button
                            onClick={() => setOpenFormModal(false)}
                            disabled={submitting}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#64748B" }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                            sx={{
                                borderRadius: 2.5,
                                textTransform: "none",
                                fontWeight: 700,
                                bgcolor: BRAND_PRIMARY,
                                "&:hover": { bgcolor: "#0070BA" },
                                px: 3
                            }}
                        >
                            {submitting ? "Đang lưu..." : editingPatient ? "Cập Nhật Hồ Sơ" : "Tạo Mới Hồ Sơ"}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* 6. Modal Xác Nhận Xóa Hồ Sơ Apple HIG */}
            <Dialog
                open={openDeleteModal}
                onClose={() => !deleting && setOpenDeleteModal(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12)"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#DC2626", bgcolor: "#FEF2F2", py: 2 }}>
                    Xác Nhận Xóa Hồ Sơ Bệnh Nhân
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Typography variant="body1">
                        Bạn có chắc chắn muốn xóa hồ sơ bệnh nhân <b>{patientToDelete?.fullName}</b> (Mã BN:{" "}
                        <b>{patientToDelete?.patientCode}</b>, SĐT: <b>{patientToDelete?.phoneNumber}</b>)?
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Hồ sơ sẽ được chuyển vào trạng thái ngừng hoạt động mà không làm mất lịch sử các đơn thuốc hay xét nghiệm đã thực hiện.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(15, 23, 42, 0.08)", bgcolor: "#F8FAFC" }}>
                    <Button
                        onClick={() => setOpenDeleteModal(false)}
                        disabled={deleting}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#64748B" }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={deleting}
                        sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700, px: 2.5 }}
                    >
                        {deleting ? "Đang xóa..." : "Xác Nhận Xóa"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast Thông Báo */}
            <Snackbar
                open={Boolean(successToast)}
                autoHideDuration={4000}
                onClose={() => setSuccessToast("")}
                message={successToast}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            />
        </Container>
    );
}
