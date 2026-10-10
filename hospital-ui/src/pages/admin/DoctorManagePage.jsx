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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
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
    const [openModal, setOpenModal] = useState(false);
    const [editingDoctorId, setEditingDoctorId] = useState(null);
    const [formData, setFormData] = useState(defaultForm);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        try {
            const [docRes, deptRes] = await Promise.all([
                axiosInstance.get("/api/admin/doctors"),
                axiosInstance.get("/api/departments"),
            ]);
            if (docRes.data) setDoctors(docRes.data);
            if (deptRes.data) setDepartments(deptRes.data);
        } catch (err) {
            console.error("Lỗi tải danh sách bác sĩ:", err);
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

    const handleDelete = async (doctorId, name) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa/vô hiệu hóa Bác sĩ "${name}" không?`)) {
            return;
        }
        try {
            await axiosInstance.delete(`/api/admin/doctors/${doctorId}`);
            loadData();
        } catch (err) {
            alert(err.message || "Lỗi xóa bác sĩ!");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            if (editingDoctorId) {
                await axiosInstance.put(`/api/admin/doctors/${editingDoctorId}`, formData);
            } else {
                await axiosInstance.post("/api/admin/doctors", formData);
            }
            setOpenModal(false);
            loadData();
        } catch (err) {
            setError(err.message || "Lỗi lưu thông tin bác sĩ!");
        } finally {
            setLoading(false);
        }
    };

    const filteredDoctors = selectedDeptFilter === "ALL"
        ? doctors
        : doctors.filter((d) => d.departmentId === Number(selectedDeptFilter));

    return (
        <Container maxWidth="xl">
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                        🩺 Quản Lý Đội Ngũ Y Bác Sĩ
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Danh sách chuyên gia, bác sĩ chuyên khoa, học vị và phân khoa trực thuộc
                    </Typography>
                </Box>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ py: 1.2, px: 3, borderRadius: 2 }}>
                    Thêm Bác Sĩ Mới
                </Button>
            </Box>

            {/* Bộ lọc theo Chuyên khoa */}
            <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
                <Chip
                    label="Tất cả Chuyên khoa"
                    color={selectedDeptFilter === "ALL" ? "primary" : "default"}
                    onClick={() => setSelectedDeptFilter("ALL")}
                    clickable
                />
                {departments.map((dept) => (
                    <Chip
                        key={dept.departmentId}
                        label={dept.departmentName}
                        color={selectedDeptFilter === dept.departmentId ? "primary" : "default"}
                        onClick={() => setSelectedDeptFilter(dept.departmentId)}
                        clickable
                    />
                ))}
            </Box>

            {/* Danh sách Bác sĩ (Cards Grid) */}
            <Grid container spacing={3}>
                {filteredDoctors.map((doc) => (
                    <Grid item xs={12} sm={6} md={4} key={doc.doctorId}>
                        <Card elevation={2} sx={{ height: "100%", borderRadius: 3, display: "flex", flexDirection: "column", transition: "0.3s", "&:hover": { transform: "translateY(-4px)", boxShadow: 4 } }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Box display="flex" alignItems="center" gap={2} mb={2}>
                                    <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", fontWeight: "bold" }}>
                                        {doc.fullName ? doc.fullName.charAt(0) : "BS"}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                                            {doc.fullName}
                                        </Typography>
                                        <Chip label={doc.degree} color="secondary" size="small" sx={{ fontWeight: "bold", mr: 0.5 }} />
                                        <Chip label={doc.departmentName} size="small" variant="outlined" />
                                    </Box>
                                </Box>

                                <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5, minHeight: 40, fontStyle: "italic" }}>
                                    "{doc.biography || "Chuyên gia giàu kinh nghiệm tại Bệnh viện TNT."}"
                                </Typography>

                                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                    <PhoneIcon fontSize="small" color="action" />
                                    <Typography variant="body2">{doc.phoneNumber}</Typography>
                                </Box>
                                {doc.email && (
                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        <EmailIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{doc.email}</Typography>
                                    </Box>
                                )}

                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} pt={1} sx={{ borderTop: "1px dashed #E0E0E0" }}>
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">Giá khám</Typography>
                                        <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                                            {formatCurrency(doc.consultationFee)}
                                        </Typography>
                                    </Box>
                                    <Box textAlign="right">
                                        <Rating value={doc.ratingAverage || 5} precision={0.5} size="small" readOnly />
                                    </Box>
                                </Box>
                            </CardContent>

                            <Box display="flex" justifyContent="flex-end" p={1.5} bgcolor="#F9FBFD" sx={{ borderTop: "1px solid #ECEFF1" }}>
                                <Tooltip title="Chỉnh sửa thông tin">
                                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(doc)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Xóa bác sĩ">
                                    <IconButton size="small" color="error" onClick={() => handleDelete(doc.doctorId, doc.fullName)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Modal Thêm / Sửa Bác sĩ */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="primary.main">
                    {editingDoctorId ? "✏️ Cập Nhật Thông Tin Bác Sĩ" : "➕ Thêm Bác Sĩ Mới"}
                </DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleSubmit}>
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
        </Container>
    );
}
