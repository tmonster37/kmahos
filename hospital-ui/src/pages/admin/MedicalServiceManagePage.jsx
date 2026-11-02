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
    Stack,
    Card,
    CardContent,
    CircularProgress
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import SearchIcon from "@mui/icons-material/Search";
import ScienceIcon from "@mui/icons-material/Science";
import RefreshIcon from "@mui/icons-material/Refresh";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon from "@mui/icons-material/Block";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

export default function MedicalServiceManagePage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ROLE_ADMIN";
    const isHeadOfDept = user?.role === "ROLE_HEAD_OF_DEPARTMENT";
    const [hodDeptId, setHodDeptId] = useState(null);

    const [services, setServices] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, LOCKED
    const [openModal, setOpenModal] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState(null);
    const [formData, setFormData] = useState({
        serviceName: "",
        price: "",
        departmentId: "",
        description: ""
    });
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, service: null });
    const [unlockConfirm, setUnlockConfirm] = useState({ open: false, service: null });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [servRes, deptRes, docRes] = await Promise.all([
                axiosInstance.get("/api/clinical/services?includeDeleted=true").catch(() => ({ data: [] })),
                axiosInstance.get("/api/departments").catch(() => ({ data: [] })),
                axiosInstance.get("/api/admin/doctors").catch(() => ({ data: [] }))
            ]);

            const depts = (deptRes?.data && Array.isArray(deptRes.data)) ? deptRes.data : (Array.isArray(deptRes) ? deptRes : []);
            if (depts.length > 0) setDepartments(depts);
            const docs = (docRes?.data && Array.isArray(docRes.data)) ? docRes.data : [];
            if (isHeadOfDept && docs.length > 0) {
                const myDoc = docs.find(d => (user?.userId && (d.userId === user.userId || d.accountId === user.userId)) || (user?.phoneNumber && (d.phoneNumber === user.phoneNumber || d.phone === user.phoneNumber)) || (user?.fullName && d.fullName === user.fullName)) || docs[0];
                if (myDoc && myDoc.departmentId) {
                    setHodDeptId(myDoc.departmentId);
                }
            }

            const list = (servRes?.data && Array.isArray(servRes.data)) ? servRes.data : (Array.isArray(servRes) ? servRes : []);
            if (list.length > 0) {
                setServices(list);
            } else {
                setServices([]);
            }
        } catch (err) {
            console.error("Lỗi tải danh mục dịch vụ:", err);
            setFeedback({ type: "error", message: "Không thể tải danh mục dịch vụ từ máy chủ." });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingServiceId(null);
        setFormData({
            serviceName: "",
            price: "",
            departmentId: isHeadOfDept && hodDeptId ? hodDeptId : (departments[0]?.departmentId || ""),
            description: ""
        });
        setOpenModal(true);
    };

    const handleOpenEdit = (item) => {
        setEditingServiceId(item.serviceId);
        setFormData({
            serviceName: item.serviceName || "",
            price: item.price != null ? item.price : "",
            departmentId: item.departmentId || (isHeadOfDept && hodDeptId ? hodDeptId : (departments[0]?.departmentId || "")),
            description: item.description || ""
        });
        setOpenModal(true);
    };

    // 2.2.38: Khóa dịch vụ y tế
    const handleConfirmLock = async () => {
        const item = deleteConfirm.service;
        if (!item) return;
        setSubmitting(true);
        try {
            await axiosInstance.put(`/api/clinical/services/${item.serviceId}/toggle-status`);
            setFeedback({ type: "success", message: `Đã khóa (ngừng cung cấp) dịch vụ [${item.serviceName}] thành công!` });
            setDeleteConfirm({ open: false, service: null });
            await loadData();
        } catch (err) {
            console.error("Lỗi khóa dịch vụ:", err);
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi khóa dịch vụ." });
        } finally {
            setSubmitting(false);
        }
    };

    // 2.2.39: Mở khóa dịch vụ y tế
    const handleConfirmUnlock = async () => {
        const item = unlockConfirm.service;
        if (!item) return;
        setSubmitting(true);
        try {
            await axiosInstance.put(`/api/clinical/services/${item.serviceId}/toggle-status`);
            setFeedback({ type: "success", message: `Đã mở khóa và kích hoạt lại dịch vụ [${item.serviceName}] thành công!` });
            setUnlockConfirm({ open: false, service: null });
            await loadData();
        } catch (err) {
            console.error("Lỗi mở khóa dịch vụ:", err);
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi mở khóa dịch vụ." });
        } finally {
            setSubmitting(false);
        }
    };

    // 2.2.36 & 2.2.37: Thêm mới & Chỉnh sửa dịch vụ y tế
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.serviceName.trim()) {
            setFeedback({ type: "warning", message: "Vui lòng nhập tên dịch vụ kỹ thuật!" });
            return;
        }

        setSubmitting(true);
        try {
            if (editingServiceId) {
                // 2.2.37: PUT /api/clinical/services/{id}
                await axiosInstance.put(`/api/clinical/services/${editingServiceId}`, {
                    serviceName: formData.serviceName.trim(),
                    price: Number(formData.price),
                    departmentId: Number(formData.departmentId),
                    description: formData.description
                });
                setFeedback({ type: "success", message: `Đã cập nhật dịch vụ [${formData.serviceName}] thành công!` });
            } else {
                // 2.2.36: POST /api/clinical/services
                await axiosInstance.post("/api/clinical/services", {
                    serviceName: formData.serviceName.trim(),
                    price: Number(formData.price),
                    departmentId: Number(formData.departmentId),
                    description: formData.description
                });
                setFeedback({ type: "success", message: `Đã thêm dịch vụ y tế [${formData.serviceName}] vào danh mục CSDL!` });
            }
            setOpenModal(false);
            await loadData();
        } catch (err) {
            console.error("Lỗi lưu dịch vụ:", err);
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi lưu dịch vụ y tế." });
        } finally {
            setSubmitting(false);
        }
    };

    const filteredServices = services.filter(s => {
        const kw = searchKeyword.toLowerCase().trim();
        const matchesKw = !kw ||
            s.serviceName?.toLowerCase().includes(kw) ||
            s.departmentName?.toLowerCase().includes(kw) ||
            s.description?.toLowerCase().includes(kw);

        const matchesDept = selectedDeptFilter === "ALL" || s.departmentName === selectedDeptFilter;
        
        let matchesStatus = true;
        if (statusFilter === "ACTIVE") matchesStatus = !s.deleted;
        if (statusFilter === "LOCKED") matchesStatus = Boolean(s.deleted);

        return matchesKw && matchesDept && matchesStatus;
    });

    const totalServices = services.length;
    const activeServicesCount = services.filter(s => !s.deleted).length;
    const lockedServicesCount = services.filter(s => s.deleted).length;
    const uniqueDepts = Array.from(new Set(services.map(s => s.departmentName).filter(Boolean)));
    const avgPrice = totalServices > 0 ? Math.round(services.reduce((sum, s) => sum + (Number(s.price) || 0), 0) / totalServices) : 0;

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* 1. Header Banner */}
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
                            color: "#0088D6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <MedicalServicesIcon sx={{ fontSize: 28 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
                            <Typography variant="h5" fontWeight={800} color="#0F172A" letterSpacing="-0.02em">
                                Quản Lý Danh Mục Dịch Vụ Cận Lâm Sàng & Đơn Giá
                            </Typography>
                            <Chip
                                label="SmartHIS Services Pro"
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
                        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.3 }}>
                            Cấu hình các kỹ thuật xét nghiệm, chẩn đoán hình ảnh (X-Quang, CT, MRI, Siêu âm) và đơn giá dịch vụ niêm yết
                        </Typography>
                    </Box>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
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
                        onClick={handleOpenAdd}
                        sx={{
                            borderRadius: 2.5,
                            fontWeight: 700,
                            textTransform: "none",
                            fontSize: "0.85rem",
                            bgcolor: "#0088D6",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                            "&:hover": { bgcolor: "#0073B7" }
                        }}
                    >
                        Thêm Dịch Vụ Mới
                    </Button>
                </Stack>
            </Paper>

            {/* 2. Thống kê KPI Cards */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={4}>
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
                                bgcolor: "#0088D6"
                            }
                        }}
                    >
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2.5 }}>
                            <Avatar sx={{ bgcolor: "rgba(0, 136, 214, 0.1)", color: "#0088D6", width: 48, height: 48, borderRadius: 2.5 }}>
                                <MedicalServicesIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    TỔNG DỊCH VỤ KỸ THUẬT
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {totalServices}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748B" }}>
                                    <b style={{ color: "#10B981" }}>{activeServicesCount}</b> đang dùng • <b style={{ color: "#EF4444" }}>{lockedServicesCount}</b> đã khóa
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
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
                                <ScienceIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    KHOA CẬN LÂM SÀNG CUNG ỨNG
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {uniqueDepts.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748B" }}>Khoa xét nghiệm & CĐHA</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
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
                                <MonetizationOnOutlinedIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" sx={{ color: "#7C3AED", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                    ĐƠN GIÁ TRUNG BÌNH
                                </Typography>
                                <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.03em" }}>
                                    {formatCurrency(avgPrice)}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64748B" }}>Giá niêm yết theo danh mục</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {feedback.message && (
                <Alert severity={feedback.type} sx={{ mb: 3, borderRadius: 3 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {/* 3. Thanh Tìm Kiếm & Bộ Lọc */}
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
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box display="flex" gap={1.5} flexWrap="wrap" flexGrow={1}>
                        <TextField
                            size="small"
                            placeholder="Tìm theo tên dịch vụ, chuyên khoa hoặc chỉ định..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            sx={{ minWidth: { xs: "100%", sm: 300 }, maxWidth: 400 }}
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
                                    "&:hover fieldset": { borderColor: "#0088D6" },
                                    "&.Mui-focused fieldset": { borderColor: "#0088D6" }
                                }
                            }}
                        />

                        <TextField
                            select
                            size="small"
                            value={selectedDeptFilter}
                            onChange={(e) => setSelectedDeptFilter(e.target.value)}
                            sx={{ minWidth: 200 }}
                            InputProps={{
                                sx: {
                                    borderRadius: 2.5,
                                    bgcolor: "#F8FAFC",
                                    "& fieldset": { borderColor: "rgba(15, 23, 42, 0.1)" },
                                    "&:hover fieldset": { borderColor: "#0088D6" },
                                    "&.Mui-focused fieldset": { borderColor: "#0088D6" }
                                }
                            }}
                        >
                            <MenuItem value="ALL">Tất cả chuyên khoa ({totalServices})</MenuItem>
                            {uniqueDepts.map(d => (
                                <MenuItem key={d} value={d}>{d}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            size="small"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ minWidth: 170 }}
                            InputProps={{
                                sx: {
                                    borderRadius: 2.5,
                                    bgcolor: "#F8FAFC",
                                    "& fieldset": { borderColor: "rgba(15, 23, 42, 0.1)" },
                                    "&:hover fieldset": { borderColor: "#0088D6" },
                                    "&.Mui-focused fieldset": { borderColor: "#0088D6" }
                                }
                            }}
                        >
                            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                            <MenuItem value="ACTIVE">Đang hoạt động ({activeServicesCount})</MenuItem>
                            <MenuItem value="LOCKED">Đã khóa ({lockedServicesCount})</MenuItem>
                        </TextField>
                    </Box>

                    <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>
                        Hiển thị: <b style={{ color: "#0F172A" }}>{filteredServices.length}</b> / {totalServices} dịch vụ
                    </Typography>
                </Box>
            </Paper>

            {/* 4. Bảng Dịch Vụ */}
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
                            <TableCell width={50} sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>STT</TableCell>
                            <TableCell width={320} sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Tên Dịch Vụ Kỹ Thuật</TableCell>
                            <TableCell width={220} sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Chuyên Khoa Thực Hiện</TableCell>
                            <TableCell width={150} align="right" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Đơn Giá Niêm Yết</TableCell>
                            <TableCell width={140} align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Trạng Thái</TableCell>
                            <TableCell sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Mô Tả / Chỉ Định Y Khoa</TableCell>
                            <TableCell width={140} align="center" sx={{ fontWeight: 800, color: "#475569", py: 1.8, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>Thao Tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                    <CircularProgress size={34} sx={{ color: "#0088D6" }} />
                                    <Typography variant="body2" sx={{ color: "#64748B", mt: 1.5, fontWeight: 600 }}>Đang tải danh mục dịch vụ...</Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredServices.length === 0 ? (
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
                                        <ScienceIcon sx={{ fontSize: 30 }} />
                                    </Box>
                                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#334155" }}>
                                        Không tìm thấy dịch vụ cận lâm sàng nào phù hợp
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
                                        Hãy kiểm tra lại từ khóa tìm kiếm hoặc chọn chuyên khoa khác
                                    </Typography>
                                    {(searchKeyword || selectedDeptFilter !== "ALL" || statusFilter !== "ALL") && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => { setSearchKeyword(""); setSelectedDeptFilter("ALL"); setStatusFilter("ALL"); }}
                                            sx={{ borderRadius: 2.2, textTransform: "none", fontWeight: 700 }}
                                        >
                                            Đặt lại bộ lọc
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredServices.map((item, idx) => {
                                const isLocked = Boolean(item.deleted);
                                return (
                                    <TableRow
                                        key={item.serviceId || idx}
                                        hover
                                        sx={{
                                            bgcolor: isLocked ? "rgba(241, 245, 249, 0.6)" : "inherit",
                                            "&:hover": { bgcolor: isLocked ? "rgba(241, 245, 249, 0.9)" : "rgba(248, 250, 252, 0.8)" },
                                            transition: "background-color 0.15s ease",
                                            opacity: isLocked ? 0.8 : 1
                                        }}
                                    >
                                        <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)", fontWeight: 700, color: "#64748B", fontFamily: "monospace" }}>{idx + 1}</TableCell>
                                        <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                            <Typography variant="body2" fontWeight={700} color={isLocked ? "#64748B" : "#0F172A"} sx={{ textDecoration: isLocked ? "line-through" : "none" }}>
                                                {item.serviceName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                            <Chip
                                                icon={<ScienceIcon style={{ fontSize: 16 }} />}
                                                label={item.departmentName || "Khoa Cận Lâm Sàng"}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: "0.72rem",
                                                    bgcolor: isLocked ? "rgba(100, 116, 139, 0.08)" : "rgba(0, 136, 214, 0.08)",
                                                    color: isLocked ? "#64748B" : "#0088D6",
                                                    border: isLocked ? "1px solid rgba(100, 116, 139, 0.2)" : "1px solid rgba(0, 136, 214, 0.2)",
                                                    borderRadius: 1.5,
                                                    height: 24
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                            <Typography variant="body2" fontWeight={800} color={isLocked ? "#64748B" : "#10B981"} sx={{ fontFamily: "monospace" }}>
                                                {formatCurrency(item.price)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                            {isLocked ? (
                                                <Chip
                                                    icon={<LockIcon style={{ fontSize: 13 }} />}
                                                    label="ĐÃ KHÓA"
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 800,
                                                        fontSize: "0.68rem",
                                                        bgcolor: "rgba(239, 68, 68, 0.1)",
                                                        color: "#DC2626",
                                                        border: "1px solid rgba(239, 68, 68, 0.3)",
                                                        borderRadius: 1.5,
                                                        height: 22
                                                    }}
                                                />
                                            ) : (
                                                <Chip
                                                    icon={<CheckCircleOutlineIcon style={{ fontSize: 13 }} />}
                                                    label="HOẠT ĐỘNG"
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 800,
                                                        fontSize: "0.68rem",
                                                        bgcolor: "rgba(16, 185, 129, 0.1)",
                                                        color: "#059669",
                                                        border: "1px solid rgba(16, 185, 129, 0.3)",
                                                        borderRadius: 1.5,
                                                        height: 22
                                                    }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                            <Typography variant="caption" sx={{ color: "#64748B" }}>
                                                {item.description || "Thực hiện theo chỉ định của Bác sĩ"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center" sx={{ py: 2, borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
                                            <Tooltip title="Chỉnh sửa dịch vụ (2.2.37)">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenEdit(item)}
                                                    sx={{
                                                        bgcolor: "rgba(0, 136, 214, 0.08)",
                                                        color: "#0088D6",
                                                        borderRadius: 2,
                                                        mr: 0.8,
                                                        "&:hover": { bgcolor: "rgba(0, 136, 214, 0.16)" }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>

                                            {isLocked ? (
                                                <Tooltip title="Mở khóa dịch vụ (2.2.39)">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setUnlockConfirm({ open: true, service: item })}
                                                        sx={{
                                                            bgcolor: "rgba(16, 185, 129, 0.08)",
                                                            color: "#10B981",
                                                            borderRadius: 2,
                                                            "&:hover": { bgcolor: "rgba(16, 185, 129, 0.18)" }
                                                        }}
                                                    >
                                                        <LockOpenIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            ) : (
                                                <Tooltip title="Khóa dịch vụ (2.2.38)">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setDeleteConfirm({ open: true, service: item })}
                                                        sx={{
                                                            bgcolor: "rgba(239, 68, 68, 0.08)",
                                                            color: "#EF4444",
                                                            borderRadius: 2,
                                                            "&:hover": { bgcolor: "rgba(239, 68, 68, 0.16)" }
                                                        }}
                                                    >
                                                        <BlockIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog xác nhận KHÓA dịch vụ (2.2.38) */}
            <Dialog
                open={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, service: null })}
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
                        <BlockIcon sx={{ fontSize: 20 }} />
                    </Box>
                    Xác Nhận Khóa Dịch Vụ Y Tế
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                    <Typography variant="body2" color="#0F172A">
                        Bạn có chắc chắn muốn khóa dịch vụ <b>[{deleteConfirm.service?.serviceName}]</b>? Dịch vụ bị khóa sẽ không thể chỉ định trong khám bệnh lâm sàng.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setDeleteConfirm({ open: false, service: null })} disabled={submitting} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}>
                        Hủy Bỏ
                    </Button>
                    <Button
                        onClick={handleConfirmLock}
                        disabled={submitting}
                        variant="contained"
                        color="error"
                        sx={{ textTransform: "none", borderRadius: 2.2, fontWeight: 700 }}
                    >
                        {submitting ? "Đang xử lý..." : "Khóa Dịch Vụ"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog xác nhận MỞ KHÓA dịch vụ (2.2.39) */}
            <Dialog
                open={unlockConfirm.open}
                onClose={() => setUnlockConfirm({ open: false, service: null })}
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)"
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#059669", display: "flex", alignItems: "center", gap: 1.2, pb: 1 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(16, 185, 129, 0.1)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <LockOpenIcon sx={{ fontSize: 20 }} />
                    </Box>
                    Xác Nhận Mở Khóa Dịch Vụ Y Tế
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)" }}>
                    <Typography variant="body2" color="#0F172A">
                        Bạn có chắc chắn muốn mở khóa và kích hoạt lại dịch vụ <b>[{unlockConfirm.service?.serviceName}]</b>? Dịch vụ sẽ sẵn sàng để Bác sĩ chỉ định trở lại.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setUnlockConfirm({ open: false, service: null })} disabled={submitting} sx={{ textTransform: "none", borderRadius: 2, fontWeight: 600 }}>
                        Hủy Bỏ
                    </Button>
                    <Button
                        onClick={handleConfirmUnlock}
                        disabled={submitting}
                        variant="contained"
                        sx={{
                            textTransform: "none",
                            borderRadius: 2.2,
                            fontWeight: 700,
                            bgcolor: "#10B981",
                            "&:hover": { bgcolor: "#059669" }
                        }}
                    >
                        {submitting ? "Đang xử lý..." : "Mở Khóa Dịch Vụ"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Thêm (2.2.36) / Sửa (2.2.37) Dịch Vụ */}
            <Dialog
                open={openModal}
                onClose={() => !submitting && setOpenModal(false)}
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
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "rgba(0, 136, 214, 0.1)", color: "#0088D6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {editingServiceId ? <EditIcon sx={{ fontSize: 20 }} /> : <AddIcon sx={{ fontSize: 20 }} />}
                    </Box>
                    {editingServiceId ? "Chỉnh Sửa Dịch Vụ Kỹ Thuật" : "Thêm Dịch Vụ Kỹ Thuật Mới"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogContent dividers sx={{ borderColor: "rgba(15, 23, 42, 0.08)", pt: 2.5 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Tên dịch vụ kỹ thuật"
                                    value={formData.serviceName}
                                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                                    required
                                    placeholder="VD: Chụp X-Quang ngực thẳng kỹ thuật số"
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Đơn giá niêm yết (VNĐ)"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    required
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                        sx: { borderRadius: 2.5 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Khoa phụ trách"
                                    value={formData.departmentId}
                                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                >
                                    {departments.map((d) => (
                                        <MenuItem key={d.departmentId} value={d.departmentId}>
                                            {d.departmentName}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Mô tả chỉ định & Hướng dẫn chuẩn bị"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Nhập lưu ý cho bệnh nhân (nhịn ăn sáng, uống nhiều nước,...)"
                                    InputProps={{ sx: { borderRadius: 2.5 } }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5 }}>
                        <Button onClick={() => setOpenModal(false)} disabled={submitting} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>Hủy</Button>
                        <Button
                            type="submit"
                            disabled={submitting}
                            variant="contained"
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: "#0088D6",
                                "&:hover": { bgcolor: "#0073B7" }
                            }}
                        >
                            {submitting ? "Đang lưu..." : (editingServiceId ? "Cập Nhật CSDL" : "Lưu CSDL")}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Container>
    );
}
