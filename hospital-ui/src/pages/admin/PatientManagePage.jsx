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
import axiosInstance from "../../services/AxiosInstance";
import { formatDate, formatDateTime, formatCurrency, isValidPhoneNumber, isValidIdentityNumber, isValidHealthInsurance } from "../../utils/formatters";

const defaultFormData = {
    fullName: "",
    phoneNumber: "",
    identityNumber: "",
    healthInsuranceNumber: "",
    gender: "MALE",
    dateOfBirth: "1990-01-01",
    streetAddress: "",
    province: "Thành phố Hà Nội",
    district: "Thanh Trì",
    ward: "Tân Triều",
    email: ""
};

export default function PatientManagePage() {
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
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.substring(0, 10) : "1990-01-01",
            streetAddress: p.streetAddress || "",
            province: p.province || "Thành phố Hà Nội",
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
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* 1. Header Title & Actions */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                <Box>
                    <Typography
                        variant="h5"
                        fontWeight="800"
                        color="#0F172A"
                        sx={{ letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2.5,
                                bgcolor: "#EBF6FE",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <PeopleAltIcon sx={{ color: "#0088D6", fontSize: 26 }} />
                        </Box>
                        Quản Lý Danh Sách & Hồ Sơ Bệnh Nhân
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Cơ sở dữ liệu bệnh nhân bệnh viện, lịch sử khám bệnh, định danh CCCD và thẻ BHYT quốc gia
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadPatients}
                        disabled={loading}
                        sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: "none", px: 2.5 }}
                    >
                        {loading ? "Đang tải..." : "Làm mới"}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={handleOpenAdd}
                        sx={{
                            borderRadius: 2.5,
                            fontWeight: 700,
                            textTransform: "none",
                            bgcolor: "#0088D6",
                            "&:hover": { bgcolor: "#0070BA" },
                            px: 3,
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)"
                        }}
                    >
                        Thêm Bệnh Nhân Mới
                    </Button>
                </Stack>
            </Box>

            {/* 2. Thống kê nhanh (KPI Bento Cards) */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#F8FAFC" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#0088D6", width: 46, height: 46, borderRadius: 2 }}>
                                <PeopleAltIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    TỔNG BỆNH NHÂN
                                </Typography>
                                <Typography variant="h5" fontWeight="800" color="#0F172A">
                                    {totalPatients}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#F0FDF4" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#16A34A", width: 46, height: 46, borderRadius: 2 }}>
                                <ReceiptIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="#16A34A" fontWeight={700}>
                                    CÓ THẺ BHYT
                                </Typography>
                                <Typography variant="h5" fontWeight="800" color="#15803D">
                                    {insuredCount}{" "}
                                    <Typography component="span" variant="body2" color="#16A34A">
                                        ({totalPatients > 0 ? Math.round((insuredCount / totalPatients) * 100) : 0}%)
                                    </Typography>
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#EFF6FF" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#3B82F6", width: 46, height: 46, borderRadius: 2 }}>
                                <MedicalServicesIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="#1E40AF" fontWeight={700}>
                                    TỔNG LƯỢT KHÁM BỆNH
                                </Typography>
                                <Typography variant="h5" fontWeight="800" color="#1E3A8A">
                                    {totalVisitsCount}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FFFBEB" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#D97706", width: 46, height: 46, borderRadius: 2 }}>
                                <AccountBalanceWalletIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="#B45309" fontWeight={700}>
                                    TỔNG SỐ DƯ KÝ QUỸ
                                </Typography>
                                <Typography variant="h5" fontWeight="800" color="#92400E">
                                    {formatCurrency(totalBalance)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Error Banner */}
            {errorMsg && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 2.5 }}
                    action={
                        <Button color="inherit" size="small" onClick={loadPatients}>
                            Thử lại
                        </Button>
                    }
                >
                    {errorMsg}
                </Alert>
            )}

            {/* 3. Bảng Dữ Liệu & Bộ Lọc */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
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
                                sx: { borderRadius: 2 }
                            }}
                        />

                        <TextField
                            select
                            size="small"
                            value={insuranceFilter}
                            onChange={(e) => setInsuranceFilter(e.target.value)}
                            sx={{ minWidth: 160 }}
                            InputProps={{ sx: { borderRadius: 2 } }}
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
                            sx={{ minWidth: 140 }}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        >
                            <MenuItem value="ALL">Tất cả giới tính</MenuItem>
                            <MenuItem value="MALE">Nam</MenuItem>
                            <MenuItem value="FEMALE">Nữ</MenuItem>
                            <MenuItem value="OTHER">Khác</MenuItem>
                        </TextField>
                    </Box>

                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Hiển thị: <b>{filteredPatients.length}</b> / {totalPatients} hồ sơ
                    </Typography>
                </Box>

                <TableContainer sx={{ borderRadius: 2, border: "1px solid #F1F5F9" }}>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Mã BN</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Họ Và Tên</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Số Điện Thoại</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155" }}>CCCD / BHYT</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Ngày Sinh / Giới Tính</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155", textAlign: "center" }}>Lượt Khám</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155", textAlign: "center" }}>Số Dư Ví</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Khám Gần Nhất</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: "#334155", textAlign: "center" }}>Thao Tác</TableCell>
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
                                            <TableCell sx={{ fontWeight: 800, color: "#0088D6" }}>
                                                {p.patientCode || "BN-" + p.patientProfileId.substring(0, 6).toUpperCase()}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                {p.fullName}
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>
                                                {p.phoneNumber}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontSize="0.85rem" fontWeight={500}>
                                                    {p.identityNumber || "Chưa cập nhật"}
                                                </Typography>
                                                <Chip
                                                    label={hasInsurance ? `BHYT: ${p.healthInsuranceNumber}` : "Chưa BHYT"}
                                                    size="small"
                                                    color={hasInsurance ? "info" : "default"}
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700, mt: 0.5 }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(p.dateOfBirth)} (
                                                {p.gender === "MALE" ? "Nam" : p.gender === "FEMALE" ? "Nữ" : "Khác"})
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={`${p.totalVisits || 0} lần`}
                                                    size="small"
                                                    color={(p.totalVisits || 0) > 0 ? "primary" : "default"}
                                                    sx={{ fontWeight: 700, height: 22 }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={formatCurrency(p.balance || 0)}
                                                    size="small"
                                                    color={(p.balance || 0) > 0 ? "success" : "default"}
                                                    variant="outlined"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: "0.85rem", color: "#64748B" }}>
                                                {p.lastVisitDate || "---"}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={1} justifyContent="center">
                                                    <Tooltip title="Xem chi tiết hồ sơ & lịch sử khám">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => {
                                                                setSelectedPatient(p);
                                                                setOpenDetailModal(true);
                                                            }}
                                                            sx={{ bgcolor: "#EBF6FE", borderRadius: 1.5, "&:hover": { bgcolor: "#BAE6FD" } }}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Chỉnh sửa thông tin">
                                                        <IconButton
                                                            size="small"
                                                            color="secondary"
                                                            onClick={() => handleOpenEdit(p)}
                                                            sx={{ bgcolor: "#F5F3FF", borderRadius: 1.5, "&:hover": { bgcolor: "#EDE9FE" } }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Xóa hồ sơ">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleOpenDelete(p)}
                                                            sx={{ bgcolor: "#FEF2F2", borderRadius: 1.5, "&:hover": { bgcolor: "#FEE2E2" } }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
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
            </Paper>

            {/* 4. Modal Chi Tiết Hồ Sơ Bệnh Nhân (Bento Grid) */}
            <Dialog
                open={openDetailModal}
                onClose={() => setOpenDetailModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 800,
                        borderBottom: "1px solid #E2E8F0",
                        color: "#0088D6",
                        display: "flex",
                        alignItems: "center",
                        gap: 1
                    }}
                >
                    <PeopleAltIcon /> Chi Tiết Hồ Sơ Bệnh Nhân: {selectedPatient?.fullName}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selectedPatient && (
                        <Grid container spacing={3} mt={0.5}>
                            {/* Cột trái: Thông tin hành chính & liên hệ */}
                            <Grid item xs={12} md={5}>
                                <Paper elevation={0} sx={{ p: 2.5, bgcolor: "#F8FAFC", borderRadius: 3, border: "1px solid #E2E8F0" }}>
                                    <Box textAlign="center" mb={2}>
                                        <Avatar
                                            sx={{
                                                width: 64,
                                                height: 64,
                                                mx: "auto",
                                                bgcolor: "#0088D6",
                                                fontSize: "1.5rem",
                                                fontWeight: "bold"
                                            }}
                                        >
                                            {selectedPatient.fullName?.charAt(0) || "B"}
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="bold" mt={1}>
                                            {selectedPatient.fullName}
                                        </Typography>
                                        <Chip
                                            label={selectedPatient.patientCode || "BN-HỒ SƠ"}
                                            size="small"
                                            color="primary"
                                            sx={{ fontWeight: "bold", mt: 0.5 }}
                                        />
                                    </Box>
                                    <Divider sx={{ my: 1.5 }} />
                                    <Typography variant="body2" sx={{ mb: 1.2, display: "flex", alignItems: "center", gap: 1 }}>
                                        <PhoneIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>SĐT:</b>{" "}
                                        {selectedPatient.phoneNumber}
                                    </Typography>
                                    {selectedPatient.email && (
                                        <Typography variant="body2" sx={{ mb: 1.2, display: "flex", alignItems: "center", gap: 1 }}>
                                            <EmailIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>Email:</b>{" "}
                                            {selectedPatient.email}
                                        </Typography>
                                    )}
                                    <Typography variant="body2" sx={{ mb: 1.2, display: "flex", alignItems: "center", gap: 1 }}>
                                        <BadgeIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>CCCD:</b>{" "}
                                        {selectedPatient.identityNumber || "Chưa cập nhật"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1.2, display: "flex", alignItems: "center", gap: 1 }}>
                                        <ReceiptIcon fontSize="small" sx={{ color: "#64748B" }} /> <b>BHYT:</b>{" "}
                                        {selectedPatient.healthInsuranceNumber ? (
                                            <Chip label={selectedPatient.healthInsuranceNumber} color="info" size="small" sx={{ fontWeight: "bold", height: 20 }} />
                                        ) : (
                                            "Chưa đăng ký"
                                        )}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 1.2, display: "flex", alignItems: "center", gap: 1 }}>
                                        <AccountBalanceWalletIcon fontSize="small" sx={{ color: "#D97706" }} /> <b>Ví viện phí:</b>{" "}
                                        {formatCurrency(selectedPatient.balance || 0)}
                                    </Typography>
                                    <Typography variant="body2" sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                                        <LocationOnIcon fontSize="small" sx={{ color: "#64748B", mt: 0.2 }} /> <b>Địa chỉ:</b>{" "}
                                        {selectedPatient.fullAddress || [selectedPatient.streetAddress, selectedPatient.ward, selectedPatient.district, selectedPatient.province].filter(Boolean).join(", ") || "Chưa cập nhật"}
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Cột phải: Lịch sử khám bệnh thực tế */}
                            <Grid item xs={12} md={7}>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight={800}
                                    color="#0F172A"
                                    sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
                                >
                                    <HistoryIcon sx={{ color: "#0088D6" }} />
                                    Lịch Sử Khám Bệnh & Chỉ Định Cận Lâm Sàng
                                </Typography>
                                {selectedPatient.history && selectedPatient.history.length > 0 ? (
                                    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>Ngày</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Khoa & Bác Sĩ</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>Chẩn Đoán</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, textAlign: "right" }}>Viện Phí</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedPatient.history.map((h, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell sx={{ fontWeight: 600 }}>{h.visitDate}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={600}>
                                                                {h.departmentName}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {h.doctorName}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ color: "#0088D6", fontWeight: 500 }}>
                                                            {h.diagnosis}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: "#16A34A" }}>
                                                            {formatCurrency(h.cost)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Box
                                        sx={{
                                            p: 4,
                                            border: "1px dashed #CBD5E1",
                                            borderRadius: 2.5,
                                            textAlign: "center",
                                            bgcolor: "#F8FAFC"
                                        }}
                                    >
                                        <HistoryIcon sx={{ fontSize: 40, color: "#94A3B8", mb: 1 }} />
                                        <Typography variant="body2" fontWeight={700} color="#475569">
                                            Chưa ghi nhận ca khám lâm sàng hoàn tất
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Bệnh nhân đã có hồ sơ đăng ký tại viện nhưng chưa phát sinh hồ sơ khám bệnh hoặc chưa xuất viện
                                        </Typography>
                                    </Box>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: "1px solid #E2E8F0" }}>
                    <Button
                        onClick={() => setOpenDetailModal(false)}
                        variant="contained"
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                        Đóng cửa sổ
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 5. Modal Thêm / Chỉnh Sửa Hồ Sơ Bệnh Nhân */}
            <Dialog
                open={openFormModal}
                onClose={() => !submitting && setOpenFormModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #E2E8F0", color: "#0088D6" }}>
                    {editingPatient ? `Chỉnh Sửa Hồ Sơ Bệnh Nhân: ${editingPatient.fullName}` : "Thêm Mới Hồ Sơ Bệnh Nhân"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSavePatient}>
                    <DialogContent sx={{ pt: 3 }}>
                        {formError && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
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
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Quận / Huyện"
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Phường / Xã"
                                    value={formData.ward}
                                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    label="Địa chỉ chi tiết (Số nhà, tên đường, thôn xóm)"
                                    value={formData.streetAddress}
                                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                    size="small"
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
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
                        <Button
                            onClick={() => setOpenFormModal(false)}
                            disabled={submitting}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                            sx={{
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 700,
                                bgcolor: "#0088D6",
                                "&:hover": { bgcolor: "#0070BA" },
                                px: 3
                            }}
                        >
                            {submitting ? "Đang lưu..." : editingPatient ? "Cập Nhật Hồ Sơ" : "Tạo Mới Hồ Sơ"}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* 6. Modal Xác Nhận Xóa Hồ Sơ */}
            <Dialog
                open={openDeleteModal}
                onClose={() => !deleting && setOpenDeleteModal(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#DC2626" }}>
                    Xác Nhận Xóa Hồ Sơ Bệnh Nhân
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Bạn có chắc chắn muốn xóa hồ sơ bệnh nhân <b>{patientToDelete?.fullName}</b> (Mã BN:{" "}
                        <b>{patientToDelete?.patientCode}</b>, SĐT: <b>{patientToDelete?.phoneNumber}</b>)?
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Hồ sơ sẽ được chuyển vào trạng thái ngừng hoạt động mà không làm mất lịch sử các đơn thuốc hay xét nghiệm đã thực hiện.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: "1px solid #E2E8F0" }}>
                    <Button
                        onClick={() => setOpenDeleteModal(false)}
                        disabled={deleting}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={deleting}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
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
