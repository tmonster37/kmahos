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
    MenuItem,
    Alert,
    Tooltip,
    InputAdornment,
    Avatar,
    Switch,
    CircularProgress,
    Card,
    CardContent,
    Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import SearchIcon from "@mui/icons-material/Search";
import KeyIcon from "@mui/icons-material/Key";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import RefreshIcon from "@mui/icons-material/Refresh";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import axiosInstance from "../../services/AxiosInstance";
import { formatDateTime } from "../../utils/formatters";
import designTokens from "../../theme/designTokens";

const BRAND_PRIMARY = designTokens.brand.primary;
const BRAND_DARK = designTokens.brand.primaryDark;
const BRAND_LIGHT = designTokens.brand.primaryLight;

const ROLE_OPTIONS = [
    { value: "ROLE_ADMIN", label: "Quản trị viên (Admin)", color: "error" },
    { value: "ROLE_DOCTOR", label: "Bác sĩ khám bệnh", color: "primary" },
    { value: "ROLE_HEAD_OF_DEPARTMENT", label: "Trưởng khoa", color: "secondary" },
    { value: "ROLE_LAB_TECHNICIAN", label: "Kỹ thuật viên Xét nghiệm", color: "info" },
    { value: "ROLE_PHARMACIST", label: "Dược sĩ cấp phát thuốc", color: "secondary" },
    { value: "ROLE_NURSE", label: "Điều dưỡng viên", color: "warning" },
    { value: "ROLE_CASHIER", label: "Thu ngân viện phí", color: "success" },
    { value: "ROLE_PATIENT", label: "Bệnh nhân", color: "default" },
];

export default function AccountManagePage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");

    // Modal States
    const [openAddModal, setOpenAddModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [openPasswordModal, setOpenPasswordModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Form States
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(true);
    const [showAddPassword, setShowAddPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, account: null, error: "" });
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        fullName: "",
        phoneNumber: "",
        email: "",
        role: "ROLE_DOCTOR",
        password: `Hospital@${Math.floor(1000 + Math.random() * 9000)}`
    });

    const [editFormData, setEditFormData] = useState({
        fullName: "",
        phoneNumber: "",
        email: "",
        role: "ROLE_DOCTOR"
    });

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/api/admin/accounts");
            const list = res?.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
            setAccounts(list);
        } catch (err) {
            console.error("Lỗi tải danh sách tài khoản:", err);
            const msg = err.response?.data?.message || err.message || "Không thể tải danh sách tài khoản từ máy chủ.";
            setFeedback({ type: "error", message: msg });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    // Tạo mật khẩu ngẫu nhiên dễ nhớ nhưng đủ mạnh (ví dụ: Hospital@8392)
    const generateRandomPassword = (target) => {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        const pass = `Hospital@${randNum}`;
        if (target === "add") {
            setFormData(prev => ({ ...prev, password: pass }));
            setShowAddPassword(true);
        } else {
            setNewPassword(pass);
            setShowPassword(true);
        }
        setFeedback({
            type: "info",
            message: `Đã tự động tạo mật khẩu ngẫu nhiên: [${pass}]. Bạn có thể sao chép để gửi cho nhân viên.`
        });
    };

    // Sao chép mật khẩu vào bộ nhớ tạm
    const handleCopyPassword = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 1. Khóa / Mở khóa tài khoản
    const handleToggleStatus = async (account) => {
        try {
            const res = await axiosInstance.put(`/api/admin/accounts/${account.userId}/toggle-status`);
            const updated = res?.data || res;
            const nextStatus = updated?.isActive !== undefined ? updated.isActive : !account.isActive;
            setAccounts(prev => prev.map(a => a.userId === account.userId ? { ...a, isActive: nextStatus } : a));
            setFeedback({
                type: nextStatus ? "success" : "warning",
                message: `Đã ${nextStatus ? "MỞ KHÓA" : "KHÓA"} tài khoản [${account.fullName} - ${account.phoneNumber}] thành công!`
            });
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Lỗi thay đổi trạng thái tài khoản!";
            setFeedback({ type: "error", message: msg });
        }
    };

    // 2. Mở Modal Đặt lại Mật khẩu
    const handleOpenResetPassword = (acc) => {
        setSelectedAccount(acc);
        setNewPassword("");
        setShowPassword(true);
        setCopied(false);
        setOpenPasswordModal(true);
    };

    // 3. Thực hiện Đặt lại Mật khẩu
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
            return;
        }
        setSaving(true);
        try {
            await axiosInstance.put(`/api/admin/accounts/${selectedAccount.userId}/reset-password`, {
                newPassword: newPassword
            });

            setFeedback({
                type: "success",
                message: `Đã đặt lại mật khẩu mới cho tài khoản [${selectedAccount?.fullName} - ${selectedAccount?.phoneNumber}] thành công! Mật khẩu mới: ${newPassword}`
            });
            setOpenPasswordModal(false);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Lỗi đặt lại mật khẩu!";
            setFeedback({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
    };

    // 4. Tạo tài khoản mới
    const handleCreateAccount = async (e) => {
        e.preventDefault();
        if (!formData.phoneNumber || !formData.fullName || !formData.password) {
            alert("Vui lòng điền đầy đủ số điện thoại, họ tên và mật khẩu!");
            return;
        }
        setSaving(true);
        try {
            const res = await axiosInstance.post("/api/admin/accounts", formData);
            const created = res?.data || res;
            setAccounts(prev => [created, ...prev]);
            setFeedback({ type: "success", message: `Đã tạo tài khoản mới [${formData.fullName} - ${formData.phoneNumber}] thành công!` });
            setOpenAddModal(false);
            setFormData({ fullName: "", phoneNumber: "", email: "", role: "ROLE_DOCTOR", password: `Hospital@${Math.floor(1000 + Math.random() * 9000)}` });
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Lỗi tạo tài khoản mới!";
            setFeedback({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
    };

    // 5. Mở Modal Chỉnh sửa tài khoản
    const handleOpenEdit = (acc) => {
        setSelectedAccount(acc);
        setEditFormData({
            fullName: acc.fullName || "",
            phoneNumber: acc.phoneNumber || "",
            email: acc.email || "",
            role: acc.role || "ROLE_PATIENT"
        });
        setOpenEditModal(true);
    };

    // 6. Lưu Cập nhật tài khoản
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axiosInstance.put(`/api/admin/accounts/${selectedAccount.userId}`, editFormData);
            const updated = res?.data || res;
            setAccounts(prev => prev.map(a => a.userId === selectedAccount.userId ? { ...a, ...editFormData, ...updated } : a));
            setFeedback({ type: "success", message: `Đã cập nhật thông tin tài khoản [${editFormData.fullName}] thành công!` });
            setOpenEditModal(false);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Lỗi cập nhật tài khoản!";
            setFeedback({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
    };

    // 7. Xóa tài khoản (Soft Delete)
    const handleConfirmDelete = async () => {
        const acc = deleteConfirmDialog.account;
        if (!acc) return;
        setSaving(true);
        setDeleteConfirmDialog(prev => ({ ...prev, error: "" }));

        try {
            let res;
            try {
                // Ưu tiên gọi API DELETE chuẩn
                res = await axiosInstance.delete(`/api/admin/accounts/${acc.userId}`);
            } catch (errFirst) {
                // Nếu backend trả về 404 hoặc 405 (do routing chưa load), tự động thử fallback sang POST /{userId}/delete
                if (errFirst.response?.status === 404 || errFirst.response?.status === 405) {
                    res = await axiosInstance.post(`/api/admin/accounts/${acc.userId}/delete`);
                } else {
                    throw errFirst;
                }
            }

            setAccounts(prev => prev.filter(a => a.userId !== acc.userId));
            setFeedback({ type: "success", message: `Đã xóa tài khoản [${acc.fullName}] thành công!` });
            setDeleteConfirmDialog({ open: false, account: null, error: "" });
        } catch (err) {
            console.error("Lỗi xóa tài khoản:", err);
            const status = err.response?.status;
            let msg = err.response?.data?.message || err.message || "Lỗi xóa tài khoản!";
            if (status === 404 || status === 405) {
                msg = "Máy chủ Backend chưa nhận diện API Xóa (mã " + status + " do tiến trình Java chưa được Restart lại). Hãy bấm Rerun / Restart lại Backend trong IDE để áp dụng endpoint mới, hoặc bấm nút 'Khóa tài khoản' bên dưới.";
            }
            setDeleteConfirmDialog(prev => ({ ...prev, error: msg }));
            setFeedback({ type: "error", message: msg });
        } finally {
            setSaving(false);
        }
    };

    // Lọc tài khoản theo từ khóa & vai trò
    const filteredAccounts = accounts.filter(acc => {
        const kw = searchKeyword.toLowerCase().trim();
        const matchesKeyword = !kw ||
            (acc.fullName && acc.fullName.toLowerCase().includes(kw)) ||
            (acc.phoneNumber && acc.phoneNumber.includes(kw)) ||
            (acc.email && acc.email.toLowerCase().includes(kw));

        const matchesRole = selectedRoleFilter === "ALL" || acc.role === selectedRoleFilter;
        return matchesKeyword && matchesRole;
    });

    const totalAccounts = accounts.length;
    const activeCount = accounts.filter(a => a.isActive).length;
    const lockedCount = accounts.filter(a => !a.isActive).length;

    const doctorCount = accounts.filter(a => a.role === "ROLE_DOCTOR" || a.role === "ROLE_HEAD_OF_DEPARTMENT").length;

    const getRoleBadge = (roleStr) => {
        const item = ROLE_OPTIONS.find(r => r.value === roleStr);
        const roleColorMap = {
            ROLE_ADMIN: { bg: "rgba(239, 68, 68, 0.08)", text: "#DC2626", border: "rgba(239, 68, 68, 0.2)" },
            ROLE_DOCTOR: { bg: BRAND_LIGHT, text: BRAND_PRIMARY, border: "rgba(15, 118, 110, 0.2)" },
            ROLE_HEAD_OF_DEPARTMENT: { bg: "rgba(139, 92, 246, 0.08)", text: "#7C3AED", border: "rgba(139, 92, 246, 0.2)" },
            ROLE_LAB_TECHNICIAN: { bg: "rgba(6, 182, 212, 0.08)", text: "#0891B2", border: "rgba(6, 182, 212, 0.2)" },
            ROLE_PHARMACIST: { bg: "rgba(168, 85, 247, 0.08)", text: "#9333EA", border: "rgba(168, 85, 247, 0.2)" },
            ROLE_NURSE: { bg: "rgba(245, 158, 11, 0.08)", text: "#D97706", border: "rgba(245, 158, 11, 0.2)" },
            ROLE_CASHIER: { bg: "rgba(16, 185, 129, 0.08)", text: "#059669", border: "rgba(16, 185, 129, 0.2)" },
            ROLE_PATIENT: { bg: "rgba(100, 116, 139, 0.08)", text: "#475569", border: "rgba(100, 116, 139, 0.2)" }
        };
        const style = roleColorMap[roleStr] || { bg: "rgba(100, 116, 139, 0.08)", text: "#475569", border: "rgba(100, 116, 139, 0.2)" };

        return (
            <Chip
                label={item ? item.label : roleStr}
                size="small"
                sx={{
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    bgcolor: style.bg,
                    color: style.text,
                    border: `1px solid ${style.border}`,
                    borderRadius: 1.5,
                    height: 24
                }}
            />
        );
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* 1. Header Banner (Apple HIG Paper) */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 4,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { xs: "flex-start", md: "center" },
                    justifyContent: "space-between",
                    gap: 2.5,
                    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.03)"
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "16px",
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: BRAND_PRIMARY,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <LockIcon sx={{ fontSize: 28 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
                            <Typography variant="h5" fontWeight={800} color="#0F172A" letterSpacing="-0.02em">
                                Quản Lý Tài Khoản & Định Danh Nhân Sự
                            </Typography>
                            <Chip
                                label="SmartHIS Identity Pro"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(0, 136, 214, 0.1)",
                                    color: BRAND_PRIMARY,
                                    border: "1px solid rgba(0, 136, 214, 0.2)"
                                }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.3 }}>
                            Kiểm soát tài khoản toàn viện, phân quyền vai trò chuyên môn RBAC, bảo mật xác thực & cấp phát mật khẩu an toàn
                        </Typography>
                    </Box>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAccounts}
                        disabled={loading}
                        sx={{
                            borderRadius: 2.5,
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
                        onClick={() => setOpenAddModal(true)}
                        sx={{
                            borderRadius: 2.5,
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            bgcolor: BRAND_PRIMARY,
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                            "&:hover": { bgcolor: BRAND_DARK }
                        }}
                    >
                        Tạo Tài Khoản Mới
                    </Button>
                </Stack>
            </Paper>

            {/* 2. Thống kê nhanh KPI Cards (Apple HIG with Colored Top Accent Lines) */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(0, 136, 214, 0.08)" },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "3.5px",
                                bgcolor: BRAND_PRIMARY
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Avatar sx={{ bgcolor: "rgba(0, 136, 214, 0.1)", color: BRAND_PRIMARY, width: 48, height: 48, borderRadius: 2.5 }}>
                                <PeopleAltIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    TỔNG SỐ TÀI KHOẢN
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {totalAccounts}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(16, 185, 129, 0.08)" },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "3.5px",
                                bgcolor: "#10B981"
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Avatar sx={{ bgcolor: "rgba(16, 185, 129, 0.1)", color: "#10B981", width: 48, height: 48, borderRadius: 2.5 }}>
                                <CheckCircleIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    ĐANG HOẠT ĐỘNG
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {activeCount}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(139, 92, 246, 0.08)" },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "3.5px",
                                bgcolor: "#8B5CF6"
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Avatar sx={{ bgcolor: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", width: 48, height: 48, borderRadius: 2.5 }}>
                                <LockOpenIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#7C3AED", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    BÁC SĨ & LÂM SÀNG
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {doctorCount}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        elevation={0}
                        sx={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            position: "relative",
                            overflow: "hidden",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(239, 68, 68, 0.08)" },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: "3.5px",
                                bgcolor: "#EF4444"
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Avatar sx={{ bgcolor: "rgba(239, 68, 68, 0.1)", color: "#EF4444", width: 48, height: 48, borderRadius: 2.5 }}>
                                <BlockIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    ĐANG TẠM KHÓA
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {lockedCount}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {feedback.message && (
                <Alert
                    severity={feedback.type || "info"}
                    sx={{ mb: 3, borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)" }}
                    onClose={() => setFeedback({ type: "", message: "" })}
                >
                    {feedback.message}
                </Alert>
            )}

            {/* 3. Thanh tìm kiếm và bộ lọc */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)"
                }}
            >
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm theo Tên, Số điện thoại hoặc Email..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94A3B8" }} />
                                    </InputAdornment>
                                ),
                                sx: {
                                    borderRadius: 2.5,
                                    bgcolor: "#F8FAFC",
                                    "& fieldset": { borderColor: "rgba(15, 23, 42, 0.1)" },
                                    "&:hover fieldset": { borderColor: BRAND_PRIMARY },
                                    "&.Mui-focused fieldset": { borderColor: BRAND_PRIMARY }
                                }
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            select
                            label="Lọc theo Vai trò"
                            value={selectedRoleFilter}
                            onChange={(e) => setSelectedRoleFilter(e.target.value)}
                            InputProps={{
                                sx: {
                                    borderRadius: 2.5,
                                    bgcolor: "#F8FAFC",
                                    "& fieldset": { borderColor: "rgba(15, 23, 42, 0.1)" },
                                    "&:hover fieldset": { borderColor: BRAND_PRIMARY },
                                    "&.Mui-focused fieldset": { borderColor: BRAND_PRIMARY }
                                }
                            }}
                        >
                            <MenuItem value="ALL">Tất cả vai trò ({totalAccounts})</MenuItem>
                            {ROLE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={2} textAlign={{ xs: "left", md: "right" }}>
                        <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>
                            Tìm thấy: <b style={{ color: "#0F172A" }}>{filteredAccounts.length}</b> tài khoản
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* 4. Bảng danh sách Tài khoản (Apple HIG Table) */}
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    overflow: "hidden",
                    boxShadow: "0 2px 12px rgba(15, 23, 42, 0.02)"
                }}
            >
                <Table>
                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Tài Khoản / Họ Tên</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Số Điện Thoại</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Email Liên Hệ</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Vai Trò Phân Quyền</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Trạng Thái</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Ngày Tạo</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Thao Tác Quản Trị</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                    <CircularProgress size={34} sx={{ color: BRAND_PRIMARY }} />
                                    <Typography variant="body2" sx={{ color: "#64748B", mt: 1.5, fontWeight: 600 }}>
                                        Đang tải dữ liệu tài khoản...
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredAccounts.length > 0 ? (
                            filteredAccounts.map((acc) => (
                                <TableRow
                                    key={acc.userId}
                                    hover
                                    sx={{
                                        opacity: acc.isActive ? 1 : 0.65,
                                        "&:hover": { bgcolor: "rgba(248, 250, 252, 0.8)" },
                                        transition: "background-color 0.15s ease"
                                    }}
                                >
                                    <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                        <Box display="flex" alignItems="center" gap={1.5}>
                                            <Avatar
                                                sx={{
                                                    bgcolor: acc.isActive ? "rgba(0, 136, 214, 0.1)" : "rgba(148, 163, 184, 0.2)",
                                                    color: acc.isActive ? BRAND_PRIMARY : "#64748B",
                                                    width: 38,
                                                    height: 38,
                                                    fontSize: "0.9rem",
                                                    fontWeight: 800,
                                                    borderRadius: 2
                                                }}
                                            >
                                                {acc.fullName ? acc.fullName.charAt(0).toUpperCase() : "U"}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight={700} color="#0F172A">
                                                    {acc.fullName}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: "#94A3B8", fontFamily: "monospace" }}>
                                                    ID: #{String(acc.userId).slice(0, 8)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                        <Typography variant="body2" fontWeight={700} color={BRAND_PRIMARY} sx={{ fontFamily: "monospace" }}>
                                            {acc.phoneNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                        <Typography variant="body2" color="#334155">
                                            {acc.email || <i style={{ color: "#94A3B8" }}>Chưa cập nhật</i>}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                        {getRoleBadge(acc.role)}
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                        <Chip
                                            label={acc.isActive ? "Hoạt động" : "Đã khóa"}
                                            size="small"
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: "0.72rem",
                                                bgcolor: acc.isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                                color: acc.isActive ? "#10B981" : "#EF4444",
                                                border: `1px solid ${acc.isActive ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                                                borderRadius: 1.5,
                                                height: 24
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                        <Typography variant="caption" sx={{ color: "#64748B", fontFamily: "monospace" }}>
                                            {acc.createdAt ? formatDateTime(acc.createdAt) : "—"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                        <Stack direction="row" spacing={0.8} justifyContent="center">
                                            {/* Nút Đặt lại Mật khẩu */}
                                            <Tooltip title="Cấp / Đổi lại mật khẩu cho tài khoản này">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenResetPassword(acc)}
                                                    sx={{
                                                        bgcolor: "rgba(0, 136, 214, 0.08)",
                                                        color: BRAND_PRIMARY,
                                                        borderRadius: 2,
                                                        "&:hover": { bgcolor: "rgba(0, 136, 214, 0.16)" }
                                                    }}
                                                >
                                                    <KeyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            {/* Nút Chỉnh sửa tài khoản */}
                                            <Tooltip title="Chỉnh sửa thông tin">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenEdit(acc)}
                                                    sx={{
                                                        bgcolor: "rgba(16, 185, 129, 0.08)",
                                                        color: "#10B981",
                                                        borderRadius: 2,
                                                        "&:hover": { bgcolor: "rgba(16, 185, 129, 0.16)" }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            {/* Nút Khóa / Mở khóa tài khoản */}
                                            <Tooltip title={acc.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleToggleStatus(acc)}
                                                    sx={{
                                                        bgcolor: acc.isActive ? "rgba(245, 158, 11, 0.08)" : "rgba(16, 185, 129, 0.08)",
                                                        color: acc.isActive ? "#D97706" : "#10B981",
                                                        borderRadius: 2,
                                                        "&:hover": {
                                                            bgcolor: acc.isActive ? "rgba(245, 158, 11, 0.16)" : "rgba(16, 185, 129, 0.16)"
                                                        }
                                                    }}
                                                >
                                                    {acc.isActive ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>

                                            {/* Nút Xóa tài khoản */}
                                            <Tooltip title="Xóa tài khoản này">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setDeleteConfirmDialog({ open: true, account: acc })}
                                                    sx={{
                                                        bgcolor: "rgba(239, 68, 68, 0.08)",
                                                        color: "#EF4444",
                                                        borderRadius: 2,
                                                        "&:hover": { bgcolor: "rgba(239, 68, 68, 0.16)" }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                    <Box
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: "16px",
                                            bgcolor: "rgba(100, 116, 139, 0.08)",
                                            color: "#94A3B8",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            mx: "auto",
                                            mb: 1.5
                                        }}
                                    >
                                        <PeopleAltIcon sx={{ fontSize: 30 }} />
                                    </Box>
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#334155" }}>
                                        Không tìm thấy tài khoản nào
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
                                        {searchKeyword || selectedRoleFilter !== "ALL"
                                            ? "Không có tài khoản nào khớp với bộ lọc hiện tại."
                                            : "Hệ thống chưa có tài khoản người dùng nào."}
                                    </Typography>
                                    {(searchKeyword || selectedRoleFilter !== "ALL") && (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                setSearchKeyword("");
                                                setSelectedRoleFilter("ALL");
                                            }}
                                            sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 700 }}
                                        >
                                            Xóa bộ lọc tìm kiếm
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL 1: ĐẶT LẠI MẬT KHẨU (RESET PASSWORD) */}
            <Dialog
                open={openPasswordModal}
                onClose={() => setOpenPasswordModal(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 1.2, pb: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(0, 136, 214, 0.1)", color: BRAND_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <KeyIcon sx={{ fontSize: 20 }} />
                    </Box>
                    Cấp / Đổi Lại Mật Khẩu
                </DialogTitle>
                <Box component="form" onSubmit={handleResetPassword}>
                    <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                        <Box sx={{ p: 2, mb: 2.5, bgcolor: "#F8FAFC", borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                            <Typography variant="body2" fontWeight={800} color="#0F172A">
                                {selectedAccount?.fullName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.3 }}>
                                SĐT: <b style={{ color: BRAND_PRIMARY }}>{selectedAccount?.phoneNumber}</b> • Vai trò: <b>{selectedAccount?.role}</b>
                            </Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="caption" fontWeight={700} color="#475569">
                                Mật khẩu mới:
                            </Typography>
                            <Button
                                size="small"
                                variant="text"
                                color="primary"
                                startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                                onClick={() => generateRandomPassword("reset")}
                                sx={{ textTransform: "none", fontSize: "0.75rem", fontWeight: 700 }}
                            >
                                Tạo ngẫu nhiên
                            </Button>
                        </Box>

                        <TextField
                            fullWidth
                            type={showPassword ? "text" : "password"}
                            label="Mật khẩu mới (tối thiểu 6 ký tự)"
                            variant="outlined"
                            size="small"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="Nhập hoặc tạo ngẫu nhiên..."
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        {newPassword && (
                                            <Tooltip title={copied ? "Đã sao chép!" : "Sao chép mật khẩu"}>
                                                <IconButton onClick={() => handleCopyPassword(newPassword)} edge="end" size="small" color={copied ? "success" : "default"}>
                                                    <ContentCopyIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                            {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2.5 }
                            }}
                        />

                        {copied && (
                            <Alert severity="success" sx={{ mt: 1.5, py: 0.5, px: 1.5, fontSize: "0.78rem", borderRadius: 2 }}>
                                Đã sao chép mật khẩu vào bộ nhớ tạm!
                            </Alert>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setOpenPasswordModal(false)} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>Hủy</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving || !newPassword}
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: BRAND_PRIMARY,
                                "&:hover": { bgcolor: BRAND_DARK }
                            }}
                        >
                            {saving ? "Đang lưu..." : "Xác Nhận Đổi Mật Khẩu"}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* MODAL 2: TẠO TÀI KHOẢN MỚI */}
            <Dialog
                open={openAddModal}
                onClose={() => setOpenAddModal(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 1.2, pb: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(0, 136, 214, 0.1)", color: BRAND_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <AddIcon sx={{ fontSize: 22 }} />
                    </Box>
                    Thêm Mới Tài Khoản Hệ Thống
                </DialogTitle>
                <Box component="form" onSubmit={handleCreateAccount}>
                    <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                        <TextField
                            fullWidth
                            label="Họ và tên người dùng"
                            margin="normal"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                            placeholder="Ví dụ: Bác sĩ Nguyễn Văn A"
                            InputProps={{ sx: { borderRadius: 2.5 } }}
                        />
                        <TextField
                            fullWidth
                            label="Số điện thoại đăng nhập"
                            margin="normal"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            required
                            placeholder="0987654321"
                            InputProps={{ sx: { borderRadius: 2.5 } }}
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            margin="normal"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="bacsi@hospital.com"
                            InputProps={{ sx: { borderRadius: 2.5 } }}
                        />
                        <TextField
                            fullWidth
                            select
                            label="Vai trò (Role)"
                            margin="normal"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            InputProps={{ sx: { borderRadius: 2.5 } }}
                        >
                            {ROLE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={0.5}>
                            <Typography variant="caption" fontWeight={700} color="#475569">
                                Mật khẩu khởi tạo:
                            </Typography>
                            <Button
                                size="small"
                                variant="text"
                                color="primary"
                                startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                                onClick={() => generateRandomPassword("add")}
                                sx={{ textTransform: "none", fontSize: "0.75rem", fontWeight: 700 }}
                            >
                                Tạo ngẫu nhiên
                            </Button>
                        </Box>

                        <TextField
                            fullWidth
                            type={showAddPassword ? "text" : "password"}
                            label="Mật khẩu khởi tạo"
                            margin="dense"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="Ví dụ: Hospital@8392"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowAddPassword(!showAddPassword)} edge="end" size="small">
                                            {showAddPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2.5 }
                            }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setOpenAddModal(false)} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>Hủy</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: BRAND_PRIMARY,
                                "&:hover": { bgcolor: BRAND_DARK }
                            }}
                        >
                            {saving ? "Đang tạo..." : "Tạo Tài Khoản"}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* DIALOG XÁC NHẬN XÓA TÀI KHOẢN */}
            <Dialog
                open={deleteConfirmDialog.open}
                onClose={() => setDeleteConfirmDialog({ open: false, account: null, error: "" })}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#DC2626", display: "flex", alignItems: "center", gap: 1.2, pb: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(239, 68, 68, 0.1)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <DeleteIcon sx={{ fontSize: 20 }} />
                    </Box>
                    Xác Nhận Xóa Tài Khoản
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                    {deleteConfirmDialog.error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5 }}>
                            {deleteConfirmDialog.error}
                        </Alert>
                    )}
                    <Typography variant="body2" color="#0F172A">
                        Bạn có chắc chắn muốn xóa tài khoản <b>{deleteConfirmDialog.account?.fullName}</b> (SĐT: <b>{deleteConfirmDialog.account?.phoneNumber}</b>)?
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 1 }}>
                        Lưu ý: Thao tác này sẽ vô hiệu hóa tài khoản và đưa vào trạng thái lưu trữ đã xóa.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, flexWrap: "wrap", gap: 1 }}>
                    <Button onClick={() => setDeleteConfirmDialog({ open: false, account: null, error: "" })} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>Hủy</Button>
                    {deleteConfirmDialog.error && (
                        <Button
                            variant="outlined"
                            color="warning"
                            disabled={saving}
                            onClick={async () => {
                                await handleToggleStatus(deleteConfirmDialog.account);
                                setDeleteConfirmDialog({ open: false, account: null, error: "" });
                            }}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                        >
                            Khóa tài khoản thay thế
                        </Button>
                    )}
                    <Button
                        onClick={handleConfirmDelete}
                        variant="contained"
                        color="error"
                        disabled={saving}
                        sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 700 }}
                    >
                        {saving ? "Đang xóa..." : "Xác Nhận Xóa"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL 3: CHỈNH SỬA TÀI KHOẢN */}
            <Dialog
                open={openEditModal}
                onClose={() => setOpenEditModal(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", gap: 1.2, pb: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(0, 136, 214, 0.1)", color: BRAND_PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <EditIcon sx={{ fontSize: 20 }} />
                    </Box>
                    Chỉnh Sửa Thông Tin Tài Khoản
                </DialogTitle>
                <Box component="form" onSubmit={handleSaveEdit}>
                    <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                        <TextField
                            fullWidth
                            label="Họ và tên"
                            margin="normal"
                            value={editFormData.fullName}
                            onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                            required
                            InputProps={{ sx: { borderRadius: 2.5 } }}
                        />
                        <TextField
                            fullWidth
                            label="Số điện thoại"
                            margin="normal"
                            value={editFormData.phoneNumber}
                            onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                            required
                            InputProps={{ sx: { borderRadius: 2.5 } }}
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            margin="normal"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            InputProps={{ sx: { borderRadius: 2.5 } }}
                        />
                        <TextField
                            fullWidth
                            select
                            label="Vai trò (Role)"
                            margin="normal"
                            value={editFormData.role}
                            onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                            InputProps={{ sx: { borderRadius: 2.5 } }}
                        >
                            {ROLE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setOpenEditModal(false)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>Hủy</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: BRAND_PRIMARY,
                                "&:hover": { bgcolor: BRAND_DARK }
                            }}
                        >
                            {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Container>
    );
}
