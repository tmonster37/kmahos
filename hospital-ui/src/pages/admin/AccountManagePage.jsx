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
        password: "password123"
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
            setFormData({ fullName: "", phoneNumber: "", email: "", role: "ROLE_DOCTOR", password: "password123" });
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

    const getRoleBadge = (roleStr) => {
        const item = ROLE_OPTIONS.find(r => r.value === roleStr);
        return (
            <Chip
                label={item ? item.label : roleStr}
                size="small"
                color={item ? item.color : "default"}
                sx={{ fontWeight: 700, fontSize: "0.75rem" }}
            />
        );
    };

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>
            {/* 1. Header Title & Stats Cards */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: "#0088D6", display: "flex", alignItems: "center", gap: 1 }}>
                        <LockIcon sx={{ fontSize: 28, color: "#0088D6" }} /> Quản Lý Tài Khoản & Phân Quyền Hệ Thống
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
                        Quản lý toàn bộ tài khoản nhân sự bệnh viện, phân quyền vai trò chuyên môn và thiết lập bảo mật
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAccounts}
                        disabled={loading}
                        sx={{ borderRadius: 2 }}
                    >
                        Làm mới
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenAddModal(true)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                        + Tạo Tài Khoản Mới
                    </Button>
                </Stack>
            </Box>

            {/* Thống kê nhanh */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#F8FAFC" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#0088D6", width: 44, height: 44 }}>
                                <PeopleAltIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="textSecondary" fontWeight={600}>
                                    TỔNG SỐ TÀI KHOẢN
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#1E293B">
                                    {totalAccounts}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#F0FDF4" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#16A34A", width: 44, height: 44 }}>
                                <CheckCircleIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="#16A34A" fontWeight={600}>
                                    ĐANG HOẠT ĐỘNG
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#15803D">
                                    {activeCount}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FEF2F2" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#DC2626", width: 44, height: 44 }}>
                                <BlockIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="#DC2626" fontWeight={600}>
                                    ĐANG BỊ KHÓA
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="#B91C1C">
                                    {lockedCount}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {feedback.message && (
                <Alert severity={feedback.type || "info"} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {/* 2. Thanh tìm kiếm và bộ lọc */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
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
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2 }
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
                            InputProps={{ sx: { borderRadius: 2 } }}
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
                        <Typography variant="body2" color="textSecondary" fontWeight={600}>
                            Tìm thấy: <b>{filteredAccounts.length}</b> tài khoản
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* 3. Bảng danh sách Tài khoản */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                <Table>
                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Tài Khoản / Họ Tên</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Số Điện Thoại</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Email Liên Hệ</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Vai Trò Phân Quyền</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Trạng Thái</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Ngày Tạo</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, color: "#334155", py: 1.5, fontSize: "0.85rem", borderBottom: "1px solid #E2E8F0" }}>Thao Tác Quản Trị</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={32} />
                                </TableCell>
                            </TableRow>
                        ) : filteredAccounts.length > 0 ? (
                            filteredAccounts.map((acc) => (
                                <TableRow
                                    key={acc.userId}
                                    hover
                                    sx={{ opacity: acc.isActive ? 1 : 0.6 }}
                                >
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={1.2}>
                                            <Avatar sx={{ bgcolor: acc.isActive ? "#0088D6" : "#94A3B8", width: 34, height: 34, fontSize: "0.85rem", fontWeight: 700 }}>
                                                {acc.fullName ? acc.fullName.charAt(0).toUpperCase() : "U"}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="body2" fontWeight="bold" color="#1E293B">
                                                    {acc.fullName}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    ID: #{String(acc.userId).slice(0, 8)}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600} color="#0088D6">
                                            {acc.phoneNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{acc.email || <i style={{ color: "#64748B" }}>Chưa cập nhật</i>}</TableCell>
                                    <TableCell>{getRoleBadge(acc.role)}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={acc.isActive ? "Hoạt động" : "Đã khóa"}
                                            size="small"
                                            color={acc.isActive ? "success" : "error"}
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="caption" color="textSecondary">
                                            {acc.createdAt ? formatDateTime(acc.createdAt) : "—"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Stack direction="row" spacing={0.8} justifyContent="center">
                                            {/* Nút Đặt lại Mật khẩu */}
                                            <Tooltip title="Cấp / Đổi lại mật khẩu cho tài khoản này">
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => handleOpenResetPassword(acc)}
                                                    sx={{ bgcolor: "#EBF6FE", "&:hover": { bgcolor: "#D0ECFD" } }}
                                                >
                                                    <KeyIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            {/* Nút Chỉnh sửa tài khoản */}
                                            <Tooltip title="Chỉnh sửa thông tin">
                                                <IconButton
                                                    size="small"
                                                    color="info"
                                                    onClick={() => handleOpenEdit(acc)}
                                                    sx={{ bgcolor: "#F0FDF4", "&:hover": { bgcolor: "#DCFCE7" } }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            {/* Nút Khóa / Mở khóa tài khoản */}
                                            <Tooltip title={acc.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}>
                                                <IconButton
                                                    size="small"
                                                    color={acc.isActive ? "warning" : "success"}
                                                    onClick={() => handleToggleStatus(acc)}
                                                    sx={{
                                                        bgcolor: acc.isActive ? "#FEF9C3" : "#F0FDF4",
                                                        "&:hover": { bgcolor: acc.isActive ? "#FEF08A" : "#DCFCE7" }
                                                    }}
                                                >
                                                    {acc.isActive ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>

                                            {/* Nút Xóa tài khoản */}
                                            <Tooltip title="Xóa tài khoản này">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => setDeleteConfirmDialog({ open: true, account: acc })}
                                                    sx={{ bgcolor: "#FEF2F2", "&:hover": { bgcolor: "#FEE2E2" } }}
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
                                <TableCell colSpan={7} align="center" sx={{ py: 6, color: "text.secondary" }}>
                                    <PeopleAltIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#334155" }}>
                                        Không tìm thấy tài khoản nào
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
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
                                            sx={{ borderRadius: 2 }}
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
            <Dialog open={openPasswordModal} onClose={() => setOpenPasswordModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: "bold", color: "#0284C7", display: "flex", alignItems: "center", gap: 1 }}>
                    <KeyIcon /> Cấp / Đổi Lại Mật Khẩu
                </DialogTitle>
                <Box component="form" onSubmit={handleResetPassword}>
                    <DialogContent dividers>
                        <Box sx={{ p: 1.5, mb: 2, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                            <Typography variant="body2" fontWeight={700} color="#0F172A">
                                {selectedAccount?.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                SĐT: <b>{selectedAccount?.phoneNumber}</b> • Vai trò: <b>{selectedAccount?.role}</b>
                            </Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary">
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
                                sx: { borderRadius: 2 }
                            }}
                        />

                        {copied && (
                            <Alert severity="success" sx={{ mt: 1.5, py: 0, px: 1.5, fontSize: "0.75rem" }}>
                                Đã sao chép mật khẩu vào bộ nhớ tạm!
                            </Alert>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenPasswordModal(false)} disabled={saving}>Hủy</Button>
                        <Button type="submit" variant="contained" color="primary" disabled={saving || !newPassword}>
                            {saving ? "Đang lưu..." : "Xác Nhận Đổi Mật Khẩu"}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>

            {/* MODAL 2: TẠO TÀI KHOẢN MỚI */}
            <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
                    + Thêm Mới Tài Khoản Hệ Thống
                </DialogTitle>
                <Box component="form" onSubmit={handleCreateAccount}>
                    <DialogContent dividers>
                        <TextField
                            fullWidth
                            label="Họ và tên người dùng"
                            margin="normal"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
                            placeholder="Ví dụ: Bác sĩ Nguyễn Văn A"
                        />
                        <TextField
                            fullWidth
                            label="Số điện thoại đăng nhập"
                            margin="normal"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            required
                            placeholder="0987654321"
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            margin="normal"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="bacsi@hospital.com"
                        />
                        <TextField
                            fullWidth
                            select
                            label="Vai trò (Role)"
                            margin="normal"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            {ROLE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary">
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
                            placeholder="Mặc định: password123"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowAddPassword(!showAddPassword)} edge="end" size="small">
                                            {showAddPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2 }
                            }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenAddModal(false)} disabled={saving}>Hủy</Button>
                        <Button type="submit" variant="contained" disabled={saving}>
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
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: "bold", color: "error.main", display: "flex", alignItems: "center", gap: 1 }}>
                    <DeleteIcon /> Xác Nhận Xóa Tài Khoản
                </DialogTitle>
                <DialogContent dividers>
                    {deleteConfirmDialog.error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                            {deleteConfirmDialog.error}
                        </Alert>
                    )}
                    <Typography variant="body2">
                        Bạn có chắc chắn muốn xóa tài khoản <b>{deleteConfirmDialog.account?.fullName}</b> (SĐT: <b>{deleteConfirmDialog.account?.phoneNumber}</b>)?
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Lưu ý: Thao tác này sẽ vô hiệu hóa tài khoản và đưa vào trạng thái lưu trữ đã xóa.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, flexWrap: "wrap", gap: 1 }}>
                    <Button onClick={() => setDeleteConfirmDialog({ open: false, account: null, error: "" })} disabled={saving}>Hủy</Button>
                    {deleteConfirmDialog.error && (
                        <Button
                            variant="outlined"
                            color="warning"
                            disabled={saving}
                            onClick={async () => {
                                await handleToggleStatus(deleteConfirmDialog.account);
                                setDeleteConfirmDialog({ open: false, account: null, error: "" });
                            }}
                        >
                            Khóa tài khoản thay thế
                        </Button>
                    )}
                    <Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={saving}>
                        {saving ? "Đang xóa..." : "Xác Nhận Xóa"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL 3: CHỈNH SỬA TÀI KHOẢN */}
            <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: "bold", color: "primary.main" }}>
                    Chỉnh Sửa Thông Tin Tài Khoản
                </DialogTitle>
                <Box component="form" onSubmit={handleSaveEdit}>
                    <DialogContent dividers>
                        <TextField
                            fullWidth
                            label="Họ và tên"
                            margin="normal"
                            value={editFormData.fullName}
                            onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Số điện thoại"
                            margin="normal"
                            value={editFormData.phoneNumber}
                            onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Email"
                            margin="normal"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            select
                            label="Vai trò (Role)"
                            margin="normal"
                            value={editFormData.role}
                            onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        >
                            {ROLE_OPTIONS.map(opt => (
                                <MenuItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenEditModal(false)}>Hủy</Button>
                        <Button type="submit" variant="contained" disabled={saving}>
                            {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Container>
    );
}
