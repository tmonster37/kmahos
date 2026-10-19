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
    InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import SearchIcon from "@mui/icons-material/Search";
import ScienceIcon from "@mui/icons-material/Science";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

export default function MedicalServiceManagePage() {
    const [services, setServices] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [openModal, setOpenModal] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState(null);
    const [formData, setFormData] = useState({
        serviceName: "",
        price: 150000,
        departmentId: 1,
        description: "Thực hiện theo chỉ định lâm sàng của Bác sĩ"
    });
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, service: null });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [servRes, deptRes] = await Promise.all([
                axiosInstance.get("/api/clinical/services").catch(() => ({ data: [] })),
                axiosInstance.get("/api/departments").catch(() => ({ data: [] }))
            ]);

            const depts = (deptRes?.data && Array.isArray(deptRes.data)) ? deptRes.data : (Array.isArray(deptRes) ? deptRes : []);
            if (depts.length > 0) setDepartments(depts);

            const list = (servRes?.data && Array.isArray(servRes.data)) ? servRes.data : (Array.isArray(servRes) ? servRes : []);
            if (list.length > 0) {
                setServices(list);
            } else {
                // Mock danh mục chuẩn y khoa nếu API trả rỗng
                setServices([
                    { serviceId: 1, serviceName: "Tổng phân tích tế bào máu ngoại vi bằng máy tự động (CBC)", price: 120000, departmentName: "Khoa Xét Nghiệm Huyết Học", description: "Đánh giá số lượng hồng cầu, bạch cầu, tiểu cầu" },
                    { serviceId: 2, serviceName: "Chụp X-Quang ngực thẳng kỹ thuật số (DR)", price: 180000, departmentName: "Khoa Chẩn Đoán Hình Ảnh", description: "Khảo sát nhu mô phổi, bóng tim, lồng ngực" },
                    { serviceId: 3, serviceName: "Siêu âm Doppler màu tim mạch chuyên sâu", price: 350000, departmentName: "Khoa Nội Tim Mạch", description: "Đánh giá hình thái, chức năng co bóp cơ tim, van tim" },
                    { serviceId: 4, serviceName: "Nội soi dạ dày - tá tràng không đau (Tiền mê)", price: 850000, departmentName: "Khoa Tiêu Hóa & Nội Soi", description: "Chẩn đoán viêm loét, polyp, vi khuẩn HP dạ dày" },
                    { serviceId: 5, serviceName: "Chụp cắt lớp vi tính lồng ngực 128 lát cắt (CT-Scanner)", price: 1450000, departmentName: "Khoa Chẩn Đoán Hình Ảnh", description: "Tầm soát nốt mờ phổi và tổn thương vi thể" },
                    { serviceId: 6, serviceName: "Chụp cộng hưởng từ sọ não (MRI 1.5 Tesla)", price: 2200000, departmentName: "Khoa Chẩn Đoán Hình Ảnh", description: "Khảo sát nhu mô não, mạch máu não chi tiết cao" }
                ]);
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
            price: 150000,
            departmentId: departments[0]?.departmentId || 1,
            description: "Thực hiện theo chỉ định lâm sàng của Bác sĩ"
        });
        setOpenModal(true);
    };

    const handleOpenEdit = (item) => {
        setEditingServiceId(item.serviceId);
        setFormData({
            serviceName: item.serviceName || "",
            price: item.price || 150000,
            departmentId: item.departmentId || departments[0]?.departmentId || 1,
            description: item.description || ""
        });
        setOpenModal(true);
    };

    const handleConfirmDelete = () => {
        const item = deleteConfirm.service;
        if (!item) return;
        setServices(prev => prev.filter(s => s.serviceId !== item.serviceId));
        setFeedback({ type: "success", message: `Đã ngừng cung cấp dịch vụ [${item.serviceName}] thành công!` });
        setDeleteConfirm({ open: false, service: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.serviceName.trim()) {
            setFeedback({ type: "warning", message: "Vui lòng nhập tên dịch vụ kỹ thuật!" });
            return;
        }

        const dept = departments.find(d => Number(d.departmentId) === Number(formData.departmentId));
        const deptName = dept ? dept.departmentName : "Khoa Cận Lâm Sàng";

        if (editingServiceId) {
            setServices(prev => prev.map(s => s.serviceId === editingServiceId ? { ...s, ...formData, departmentName: deptName } : s));
            setFeedback({ type: "success", message: `Đã cập nhật dịch vụ [${formData.serviceName}] thành công!` });
        } else {
            const newId = services.length > 0 ? Math.max(...services.map(s => s.serviceId || 0)) + 1 : 1;
            setServices(prev => [{ serviceId: newId, ...formData, departmentName: deptName }, ...prev]);
            setFeedback({ type: "success", message: `Đã thêm dịch vụ y tế [${formData.serviceName}] vào danh mục!` });
        }
        setOpenModal(false);
    };

    const filteredServices = services.filter(s => {
        const kw = searchKeyword.toLowerCase().trim();
        const matchesKw = !kw ||
            s.serviceName?.toLowerCase().includes(kw) ||
            s.departmentName?.toLowerCase().includes(kw) ||
            s.description?.toLowerCase().includes(kw);

        const matchesDept = selectedDeptFilter === "ALL" || s.departmentName === selectedDeptFilter;
        return matchesKw && matchesDept;
    });

    const totalServices = services.length;
    const uniqueDepts = Array.from(new Set(services.map(s => s.departmentName).filter(Boolean)));
    const avgPrice = totalServices > 0 ? Math.round(services.reduce((sum, s) => sum + (Number(s.price) || 0), 0) / totalServices) : 0;

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>
            {/* 1. Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight="800" color="#0F172A" sx={{ letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: "#EBF6FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <MedicalServicesIcon sx={{ color: "#0088D6", fontSize: 24 }} />
                        </Box>
                        Quản Lý Danh Mục Dịch Vụ Cận Lâm Sàng & Đơn Giá
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Cấu hình các kỹ thuật xét nghiệm, chẩn đoán hình ảnh (X-Quang, CT, MRI, Siêu âm) và đơn giá dịch vụ niêm yết
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
                        disabled={loading}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                        Làm mới
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenAdd}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                        + Thêm Dịch Vụ Mới
                    </Button>
                </Stack>
            </Box>

            {/* 2. Thống kê KPI */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#F8FAFC" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#0088D6", width: 44, height: 44, borderRadius: 2 }}>
                                <MedicalServicesIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    TỔNG DỊCH VỤ KỸ THUẬT
                                </Typography>
                                <Typography variant="h5" fontWeight="800" color="#0F172A">
                                    {totalServices} danh mục
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#F0FDF4" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#16A34A", width: 44, height: 44, borderRadius: 2 }}>
                                <ScienceIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="#16A34A" fontWeight={700}>
                                    KHOA CẬN LÂM SÀNG CUNG ỨNG
                                </Typography>
                                <Typography variant="h5" fontWeight="800" color="#15803D">
                                    {uniqueDepts.length} chuyên khoa
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 3, bgcolor: "#FFFBEB" }}>
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                            <Avatar sx={{ bgcolor: "#D97706", width: 44, height: 44, borderRadius: 2 }}>
                                <ScienceIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="#B45309" fontWeight={700}>
                                    ĐƠN GIÁ TRUNG BÌNH
                                </Typography>
                                <Typography variant="h5" fontWeight="800" color="#92400E">
                                    {formatCurrency(avgPrice)}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {feedback.message && (
                <Alert severity={feedback.type} sx={{ mb: 3, borderRadius: 2.5 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {/* 3. Thanh Tìm Kiếm & Bộ Lọc */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box display="flex" gap={1.5} flexWrap="wrap" flexGrow={1}>
                        <TextField
                            size="small"
                            placeholder="Tìm theo tên dịch vụ, chuyên khoa hoặc chỉ định..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            sx={{ minWidth: { xs: "100%", sm: 320 }, maxWidth: 440 }}
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
                            value={selectedDeptFilter}
                            onChange={(e) => setSelectedDeptFilter(e.target.value)}
                            sx={{ minWidth: 220 }}
                            InputProps={{ sx: { borderRadius: 2 } }}
                        >
                            <MenuItem value="ALL">Tất cả chuyên khoa ({totalServices})</MenuItem>
                            {uniqueDepts.map(d => (
                                <MenuItem key={d} value={d}>{d}</MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        Hiển thị: <b>{filteredServices.length}</b> / {totalServices} dịch vụ
                    </Typography>
                </Box>
            </Paper>

            {/* 4. Bảng Dịch Vụ */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
                <Table>
                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                        <TableRow>
                            <TableCell width={60} sx={{ fontWeight: 700, color: "#334155" }}>STT</TableCell>
                            <TableCell width={360} sx={{ fontWeight: 700, color: "#334155" }}>Tên dịch vụ kỹ thuật</TableCell>
                            <TableCell width={240} sx={{ fontWeight: 700, color: "#334155" }}>Chuyên khoa thực hiện</TableCell>
                            <TableCell width={160} align="right" sx={{ fontWeight: 700, color: "#334155" }}>Đơn giá niêm yết</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Mô tả / Chỉ định y khoa</TableCell>
                            <TableCell width={120} align="center" sx={{ fontWeight: 700, color: "#334155" }}>Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={32} />
                                    <Typography variant="body2" color="text.secondary" mt={1}>Đang tải danh mục dịch vụ...</Typography>
                                </TableCell>
                            </TableRow>
                        ) : filteredServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                        <ScienceIcon sx={{ fontSize: 48, color: "#CBD5E1" }} />
                                        <Typography variant="subtitle1" fontWeight={700} color="#64748B">
                                            Không tìm thấy dịch vụ cận lâm sàng nào phù hợp
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Hãy kiểm tra lại từ khóa tìm kiếm hoặc chọn chuyên khoa khác
                                        </Typography>
                                        {(searchKeyword || selectedDeptFilter !== "ALL") && (
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => { setSearchKeyword(""); setSelectedDeptFilter("ALL"); }}
                                                sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
                                            >
                                                Đặt lại bộ lọc
                                            </Button>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredServices.map((item, idx) => (
                                <TableRow key={item.serviceId || idx} hover sx={{ "&:hover": { bgcolor: "#F8FAFC" } }}>
                                    <TableCell sx={{ fontWeight: 600, color: "#64748B" }}>{idx + 1}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={700} color="#0F172A">
                                            {item.serviceName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={<ScienceIcon style={{ fontSize: 16 }} />}
                                            label={item.departmentName || "Khoa Cận Lâm Sàng"}
                                            size="small"
                                            color="info"
                                            variant="outlined"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body1" fontWeight={800} color="#16A34A">
                                            {formatCurrency(item.price)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="text.secondary">
                                            {item.description || "Thực hiện theo chỉ định của Bác sĩ"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Chỉnh sửa dịch vụ">
                                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)} sx={{ bgcolor: "#EBF6FE", borderRadius: 1.5, mr: 0.5 }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Ngừng cung cấp dịch vụ">
                                            <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ open: true, service: item })} sx={{ bgcolor: "#FEF2F2", borderRadius: 1.5 }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog xác nhận xóa dịch vụ */}
            <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, service: null })} PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, color: "#DC2626" }}>
                    Xác nhận ngừng cung cấp dịch vụ?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        Bạn có chắc chắn muốn xóa dịch vụ <b>[{deleteConfirm.service?.serviceName}]</b> khỏi danh mục hoạt động không?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteConfirm({ open: false, service: null })} sx={{ textTransform: "none", borderRadius: 2 }}>
                        Hủy bỏ
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained" sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}>
                        Ngừng cung cấp
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Thêm/Sửa Dịch Vụ */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle fontWeight="800" sx={{ borderBottom: "1px solid #E2E8F0", color: "#0088D6" }}>
                    {editingServiceId ? "Chỉnh Sửa Dịch Vụ Kỹ Thuật" : "Thêm Dịch Vụ Kỹ Thuật Mới"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogContent sx={{ pt: 2.5 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Tên dịch vụ kỹ thuật"
                                    value={formData.serviceName}
                                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                                    required
                                    placeholder="VD: Chụp X-Quang ngực thẳng kỹ thuật số"
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
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenModal(false)}>Hủy</Button>
                        <Button type="submit" variant="contained" color="primary">
                            {editingServiceId ? "Cập Nhật" : "Lưu Dịch Vụ"}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Container>
    );
}
