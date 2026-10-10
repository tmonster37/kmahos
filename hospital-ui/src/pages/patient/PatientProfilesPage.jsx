import React, { useState, useEffect } from "react";
import {
    Container,
    Grid,
    Paper,
    Typography,
    Button,
    Box,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    IconButton,
    Tooltip,
    Alert,
    Autocomplete
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import { bookingApi } from "../../services/bookingApi";
import {
    formatDate,
    isValidPhoneNumber,
    isValidIdentityNumber,
    isValidHealthInsurance,
    formatISODate,
} from "../../utils/formatters";
import {
    VIETNAM_PROVINCES_34,
    getWardsByProvince
} from "../../utils/administrativeDivisions";

const defaultFormData = {
    fullName: "",
    phoneNumber: "",
    identityNumber: "",
    healthInsuranceNumber: "",
    gender: "MALE",
    dateOfBirth: "2000-01-01",
    streetAddress: "",
    province: "Thành phố Hà Nội",
    district: "Thanh Trì",
    ward: "Phường Ba Đình",
};

export default function PatientProfilesPage() {
    const [profiles, setProfiles] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [validationError, setValidationError] = useState("");
    const [loading, setLoading] = useState(false);

    const loadProfiles = () => {
        bookingApi
            .getMyProfiles()
            .then((res) => {
                if (res.data) setProfiles(res.data);
            })
            .catch((err) => {
                console.error("Lỗi tải hồ sơ:", err);
            });
    };

    useEffect(() => {
        loadProfiles();
    }, []);

    const handleOpenAddModal = () => {
        setEditingProfileId(null);
        setFormData(defaultFormData);
        setValidationError("");
        setOpenModal(true);
    };

    const handleOpenEditModal = (profile) => {
        setEditingProfileId(profile.patientProfileId);
        setFormData({
            fullName: profile.fullName || "",
            phoneNumber: profile.phoneNumber || "",
            identityNumber: profile.identityNumber || "",
            healthInsuranceNumber: profile.healthInsuranceNumber || "",
            gender: profile.gender || "MALE",
            dateOfBirth: profile.dateOfBirth ? formatISODate(profile.dateOfBirth) : "2000-01-01",
            streetAddress: profile.streetAddress || "",
            province: profile.province || "Thành phố Hà Nội",
            district: profile.district || "",
            ward: profile.ward || "",
        });
        setValidationError("");
        setOpenModal(true);
    };

    const handleDelete = async (profileId, fullName) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ của "${fullName}" không?`)) {
            return;
        }
        try {
            await bookingApi.deleteProfile(profileId);
            loadProfiles();
        } catch (err) {
            alert(err?.message || "Lỗi khi xóa hồ sơ!");
        }
    };

    const validateForm = () => {
        if (!formData.fullName || formData.fullName.trim().length < 2) {
            return "Họ và tên bệnh nhân phải có ít nhất 2 ký tự!";
        }

        if (formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber)) {
            return "Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (bắt đầu bằng 03, 05, 07, 08, 09).";
        }

        if (formData.identityNumber && !isValidIdentityNumber(formData.identityNumber)) {
            return "Số CCCD/CMND không hợp lệ! Vui lòng nhập đúng 12 chữ số CCCD (hoặc 9 số CMND).";
        }

        if (formData.healthInsuranceNumber && !isValidHealthInsurance(formData.healthInsuranceNumber)) {
            return "Mã thẻ BHYT không hợp lệ! Vui lòng nhập đúng 10-15 ký tự chữ số.";
        }

        if (formData.dateOfBirth) {
            const dob = new Date(formData.dateOfBirth);
            const now = new Date();
            if (isNaN(dob.getTime())) {
                return "Ngày sinh không đúng định dạng!";
            }
            if (dob > now) {
                return "Ngày sinh không thể lớn hơn ngày hiện tại!";
            }
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validateForm();
        if (err) {
            setValidationError(err);
            return;
        }

        setValidationError("");
        setLoading(true);
        try {
            const payload = {
                ...formData,
                fullName: formData.fullName.trim(),
                streetAddress: formData.streetAddress?.trim() || "",
                province: formData.province?.trim() || "Thành phố Hà Nội",
                district: formData.district?.trim() || "",
                ward: formData.ward?.trim() || "",
            };

            if (editingProfileId) {
                await bookingApi.updateProfile(editingProfileId, payload);
            } else {
                await bookingApi.createProfile(payload);
            }

            setOpenModal(false);
            loadProfiles();
        } catch (err) {
            setValidationError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi khi lưu hồ sơ!");
        } finally {
            setLoading(false);
        }
    };

    const availableWards = getWardsByProvince(formData.province);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                        📋 Sổ Khám Bệnh Điện Tử & Danh Sách Hồ Sơ
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Dữ liệu địa giới hành chính đồng bộ trực tiếp theo cơ sở dữ liệu 34 Tỉnh/Thành sáp nhập (07/2025)
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddModal}
                    sx={{ borderRadius: 2.5, px: 3, fontWeight: "bold" }}
                >
                    Tạo Hồ Sơ Mới
                </Button>
            </Box>

            {/* Danh sách thẻ hồ sơ */}
            <Grid container spacing={3}>
                {profiles.length === 0 ? (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
                            <PersonIcon sx={{ fontSize: 64, color: "text.secondary", mb: 1 }} />
                            <Typography variant="h6" color="text.secondary">
                                Bạn chưa có hồ sơ bệnh nhân nào.
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mb={2}>
                                Hãy tạo hồ sơ để dễ dàng đặt khám và theo dõi lịch sử điều trị tại bệnh viện.
                            </Typography>
                            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenAddModal}>
                                Thêm hồ sơ đầu tiên
                            </Button>
                        </Paper>
                    </Grid>
                ) : (
                    profiles.map((p) => (
                        <Grid item xs={12} md={6} key={p.patientProfileId}>
                            <Card elevation={2} sx={{ borderRadius: 3, borderLeft: "5px solid #0088D6" }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <PersonIcon color="primary" />
                                            <Typography variant="h6" fontWeight="bold">{p.fullName}</Typography>
                                        </Box>
                                        <Box>
                                            <Tooltip title="Chỉnh sửa hồ sơ">
                                                <IconButton size="small" color="primary" onClick={() => handleOpenEditModal(p)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Xóa hồ sơ">
                                                <IconButton size="small" color="error" onClick={() => handleDelete(p.patientProfileId, p.fullName)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" color="textSecondary">Giới tính: <b>{p.gender === "MALE" ? "Nam" : "Nữ"}</b></Typography>
                                    <Typography variant="body2" color="textSecondary">Ngày sinh: <b>{formatDate(p.dateOfBirth)}</b></Typography>
                                    <Typography variant="body2" color="textSecondary">CCCD / Định danh: <b>{p.identityNumber || "Chưa cập nhật"}</b></Typography>
                                    <Typography variant="body2" color="textSecondary">Mã BHYT: <b>{p.healthInsuranceNumber || "Không có"}</b></Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Địa chỉ: {[p.streetAddress, p.ward, p.district, p.province].filter(Boolean).join(", ")}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>

            {/* Modal Thêm/Sửa hồ sơ */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="primary.main">
                    {editingProfileId ? "Cập Nhật Hồ Sơ Bệnh Nhân" : "Thêm Hồ Sơ Bệnh Nhân Mới"}
                </DialogTitle>
                <Box component="form" onSubmit={handleSubmit}>
                    <DialogContent dividers>
                        {validationError && (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                {validationError}
                            </Alert>
                        )}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên bệnh nhân"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                    placeholder="VD: NGUYỄN VĂN AN"
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Giới tính"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <MenuItem value="MALE">Nam</MenuItem>
                                    <MenuItem value="FEMALE">Nữ</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Ngày sinh"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ max: formatISODate(new Date()) }}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số điện thoại"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="0987654321"
                                    helperText="10 chữ số bắt đầu bằng 0"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số CCCD / Định danh (12 số)"
                                    value={formData.identityNumber}
                                    onChange={(e) => setFormData({ ...formData, identityNumber: e.target.value })}
                                    placeholder="001200001234"
                                    helperText="12 số CCCD gắn chip"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Mã thẻ BHYT"
                                    value={formData.healthInsuranceNumber}
                                    onChange={(e) => setFormData({ ...formData, healthInsuranceNumber: e.target.value.toUpperCase() })}
                                    placeholder="DN4010123456789"
                                    helperText="10 - 15 ký tự chữ số"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Địa chỉ chi tiết (Số nhà, tên đường)"
                                    value={formData.streetAddress}
                                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                    placeholder="141 Chiến Thắng"
                                />
                            </Grid>
                            
                            {/* Tỉnh / Thành phố theo danh mục 34 Tỉnh Thành (Foxi Digital Repo) */}
                            <Grid item xs={12} sm={6}>
                                <Autocomplete
                                    options={VIETNAM_PROVINCES_34.map(p => p.name)}
                                    value={formData.province || "Thành phố Hà Nội"}
                                    onChange={(_, newValue) => {
                                        const newProv = newValue || "Thành phố Hà Nội";
                                        const newWards = getWardsByProvince(newProv);
                                        setFormData({
                                            ...formData,
                                            province: newProv,
                                            ward: newWards[0] || ""
                                        });
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Tỉnh / Thành phố (34 Tỉnh)" required />
                                    )}
                                />
                            </Grid>

                            {/* Xã / Phường theo dữ liệu 3,319 Wards */}
                            <Grid item xs={12} sm={6}>
                                {availableWards.length > 0 ? (
                                    <Autocomplete
                                        freeSolo
                                        options={availableWards}
                                        value={formData.ward || ""}
                                        onInputChange={(_, newValue) => setFormData({ ...formData, ward: newValue })}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Xã / Phường" placeholder="Chọn hoặc nhập tên phường/xã" />
                                        )}
                                    />
                                ) : (
                                    <TextField
                                        fullWidth
                                        label="Xã / Phường"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        placeholder="Nhập tên xã/phường"
                                    />
                                )}
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button onClick={() => setOpenModal(false)} disabled={loading}>Hủy</Button>
                        <Button type="submit" variant="contained" disabled={loading}>
                            {loading ? "Đang lưu..." : (editingProfileId ? "Cập nhật" : "Lưu hồ sơ")}
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </Container>
    );
}
