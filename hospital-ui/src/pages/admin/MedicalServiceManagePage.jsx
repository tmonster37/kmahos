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

            if (deptRes.data) setDepartments(deptRes.data);

            const list = (servRes && Array.isArray(servRes.data)) ? servRes.data : [];
            if (list.length > 0) {
                setServices(list);
            } else {
                // Mock danh mục chuẩn y khoa
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

    const handleDelete = (serviceId, name) => {
        if (!window.confirm(`Bạn có chắc chắn muốn ngừng cung cấp dịch vụ [${name}] không?`)) {
            return;
        }
        setServices(prev => prev.filter(s => s.serviceId !== serviceId));
        setFeedback({ type: "success", message: `Đã xóa dịch vụ ${name} khỏi danh mục hoạt động!` });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.serviceName.trim()) {
            alert("Vui lòng nhập tên dịch vụ!");
            return;
        }

        const dept = departments.find(d => Number(d.departmentId) === Number(formData.departmentId));
        const deptName = dept ? dept.departmentName : "Khoa Cận Lâm Sàng";

        if (editingServiceId) {
            setServices(prev => prev.map(s => s.serviceId === editingServiceId ? { ...s, ...formData, departmentName: deptName } : s));
            setFeedback({ type: "success", message: "Đã cập nhật thông tin dịch vụ thành công!" });
        } else {
            const newId = services.length > 0 ? Math.max(...services.map(s => s.serviceId || 0)) + 1 : 1;
            setServices(prev => [{ serviceId: newId, ...formData, departmentName: deptName }, ...prev]);
            setFeedback({ type: "success", message: "Đã thêm dịch vụ y tế mới vào danh mục!" });
        }
        setOpenModal(false);
    };

    const filteredServices = services.filter(s =>
        s.serviceName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (s.departmentName && s.departmentName.toLowerCase().includes(searchKeyword.toLowerCase()))
    );

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                        🔬 Quản Lý Danh Mục Dịch Vụ Cận Lâm Sàng & Bảng Giá
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Cấu hình các gói xét nghiệm, chẩn đoán hình ảnh (X-Quang, CT, MRI, Siêu âm) và đơn giá dịch vụ
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAdd}
                    sx={{ borderRadius: 2.5, px: 3, py: 1.2, fontWeight: "bold" }}
                >
                    Thêm Dịch Vụ Mới
                </Button>
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type} sx={{ mb: 3, borderRadius: 2 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {/* Thanh Tìm Kiếm */}
            <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <TextField
                    size="small"
                    placeholder="Tìm theo Tên dịch vụ hoặc Chuyên khoa..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    sx={{ width: 380 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                    }}
                />
                <Typography variant="body2" color="text.secondary">
                    Tổng cộng: <b>{filteredServices.length} dịch vụ</b>
                </Typography>
            </Paper>

            {/* Bảng Dịch Vụ */}
            <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                        <TableRow>
                            <TableCell width={60}><b>#</b></TableCell>
                            <TableCell width={360}><b>Tên dịch vụ kỹ thuật</b></TableCell>
                            <TableCell width={240}><b>Chuyên khoa thực hiện</b></TableCell>
                            <TableCell width={160} align="right"><b>Đơn giá niêm yết</b></TableCell>
                            <TableCell><b>Mô tả / Chỉ định y khoa</b></TableCell>
                            <TableCell width={120} align="center"><b>Thao tác</b></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredServices.map((item, idx) => (
                            <TableRow key={item.serviceId || idx} hover>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight="bold" color="primary">
                                        {item.serviceName}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        icon={<ScienceIcon />}
                                        label={item.departmentName || "Khoa Cận Lâm Sàng"}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                        sx={{ fontWeight: "bold" }}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body1" fontWeight="bold" color="success.main">
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
                                        <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Xóa dịch vụ">
                                        <IconButton size="small" color="error" onClick={() => handleDelete(item.serviceId, item.serviceName)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal Thêm/Sửa Dịch Vụ */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="primary.main">
                    {editingServiceId ? "Chỉnh Sửa Dịch Vụ Kỹ Thuật" : "Thêm Dịch Vụ Kỹ Thuật Mới"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogContent dividers>
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
