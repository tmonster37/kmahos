import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Tabs,
    Tab,
    Paper,
    Grid,
    MenuItem,
    Alert,
    CircularProgress,
    Chip,
    IconButton,
    Divider,
    Stack,
    Autocomplete
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import BadgeIcon from "@mui/icons-material/Badge";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SecurityIcon from "@mui/icons-material/Security";
import EditIcon from "@mui/icons-material/Edit";
import { bookingApi } from "../../services/bookingApi";
import { VIETNAM_PROVINCES_34, getWardsByProvince } from "../../utils/administrativeDivisions";
import { formatDate, formatISODate, isValidPhoneNumber } from "../../utils/formatters";

const defaultFormData = {
    fullName: "",
    phoneNumber: "",
    identityNumber: "",
    healthInsuranceNumber: "",
    gender: "FEMALE",
    dateOfBirth: "",
    streetAddress: "",
    province: "",
    district: "",
    ward: "",
    ethnicity: "Kinh",
    occupation: "",
    email: "",
    relationship: "SELF"
};

/**
 * AddOrLinkPatientProfileModal
 * Hợp nhất luồng Tạo mới & Liên kết hồ sơ bệnh nhân chuẩn theo Hình 140 - 143 (Bảng 94 - 97):
 * - Tab 0: "Chưa từng khám" (Hình 140) -> Nhập thông tin hành chính tạo mới hồ sơ
 * - Tab 1: "Đã từng khám" (Hình 141) -> Tìm bằng Mã bệnh nhân hoặc CCCD
 *   + Sub-view 1: Tìm theo Mã bệnh nhân (Hình 141) kèm link "> Tôi mất mã bệnh nhân của mình"
 *   + Sub-view 2: Tìm khi mất mã bệnh nhân (Hình 142) kèm nút "Quay lại"
 *   + Sub-view 3: Kết quả tìm kiếm hồ sơ bệnh nhân (Hình 143) che SĐT *******428 & Bước xác thực SĐT/OTP
 * - Chế độ Edit: Nếu có editProfile thì mở thẳng form chỉnh sửa thông tin.
 */
export default function AddOrLinkPatientProfileModal({
    open,
    onClose,
    onSuccess,
    editProfile = null,
    initialTab = 0,
    userPhone = ""
}) {
    // 0: Chưa từng khám (Hình 140), 1: Đã từng khám (Hình 141)
    const [mainTab, setMainTab] = useState(initialTab);

    // Chế độ luồng Đã từng khám: 'SEARCH_CODE' (Hình 141), 'FORGOT_CODE' (Hình 142), 'SEARCH_RESULTS' (Hình 143)
    const [linkSubView, setLinkSubView] = useState("SEARCH_CODE");

    // Form Tạo mới / Chỉnh sửa (Hình 140)
    const [formData, setFormData] = useState(defaultFormData);
    const [validationError, setValidationError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [submittingCreate, setSubmittingCreate] = useState(false);

    // Form Tìm theo mã bệnh nhân (Hình 141)
    const [patientCode, setPatientCode] = useState("");

    // Form Tìm khi quên mã bệnh nhân (Hình 142)
    const [forgotForm, setForgotForm] = useState({
        fullName: "",
        dateOfBirth: "",
        gender: "MALE",
        province: "",
        identityNumber: ""
    });

    // Trạng thái tìm kiếm & kết quả (Hình 143)
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [candidates, setCandidates] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Bước xác thực liên kết số điện thoại
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [verifyPhone, setVerifyPhone] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState("");

    useEffect(() => {
        if (open) {
            if (editProfile) {
                setMainTab(0);
                setFormData({
                    fullName: editProfile.fullName || "",
                    phoneNumber: editProfile.phoneNumber || "",
                    identityNumber: editProfile.identityNumber || "",
                    healthInsuranceNumber: editProfile.healthInsuranceNumber || "",
                    gender: editProfile.gender || "FEMALE",
                    dateOfBirth: editProfile.dateOfBirth ? formatISODate(editProfile.dateOfBirth) : "",
                    streetAddress: editProfile.streetAddress || "",
                    province: editProfile.province || "",
                    district: editProfile.district || "",
                    ward: editProfile.ward || "",
                    ethnicity: editProfile.ethnicity || "Kinh",
                    occupation: editProfile.occupation || "",
                    email: editProfile.email || "",
                    relationship: editProfile.relationship || "SELF"
                });
            } else {
                setMainTab(initialTab);
                setFormData({
                    ...defaultFormData,
                    phoneNumber: userPhone || ""
                });
                resetLinkFlow();
            }
            setValidationError("");
        }
    }, [open, editProfile, initialTab, userPhone]);

    const resetLinkFlow = () => {
        setLinkSubView("SEARCH_CODE");
        setPatientCode("");
        setForgotForm({
            fullName: "",
            dateOfBirth: "",
            gender: "MALE",
            province: "",
            identityNumber: ""
        });
        setCandidates([]);
        setSearchError("");
        setHasSearched(false);
        setSelectedCandidate(null);
        setVerifyPhone("");
        setVerifyError("");
    };

    const handleCloseModal = () => {
        resetLinkFlow();
        onClose();
    };

    // -------------------------------------------------------------
    // 1. TẠO MỚI / CHỈNH SỬA HỒ SƠ BỆNH NHÂN (Hình 140)
    // -------------------------------------------------------------
    const handleSaveProfile = async (e) => {
        if (e) e.preventDefault();
        setValidationError("");
        setFieldErrors({});

        const errors = {};
        const cleanName = formData.fullName.trim();
        if (!cleanName || cleanName.length < 2) {
            errors.fullName = "Họ và tên bệnh nhân phải có ít nhất 2 ký tự!";
        } else if (cleanName.length > 100) {
            errors.fullName = "Họ và tên bệnh nhân tối đa 100 ký tự!";
        }

        if (!formData.dateOfBirth) {
            errors.dateOfBirth = "Vui lòng chọn ngày sinh của bệnh nhân!";
        } else {
            const dob = new Date(formData.dateOfBirth);
            const now = new Date();
            if (dob > now) {
                errors.dateOfBirth = "Ngày sinh không thể lớn hơn ngày hiện tại!";
            } else if (now.getFullYear() - dob.getFullYear() > 130) {
                errors.dateOfBirth = "Năm sinh không hợp lệ (vượt quá 130 tuổi)!";
            }
        }

        if (formData.phoneNumber && !isValidPhoneNumber(formData.phoneNumber.trim())) {
            errors.phoneNumber = "Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (03, 05, 07, 08, 09).";
        }

        const cleanIdentity = formData.identityNumber?.trim();
        if (cleanIdentity && !/^\d{9}(\d{3})?$/.test(cleanIdentity)) {
            errors.identityNumber = "Số CMND/CCCD phải là 9 hoặc 12 chữ số!";
        }

        const cleanBHYT = formData.healthInsuranceNumber?.trim();
        if (cleanBHYT && !/^[A-Z0-9]{10,15}$/i.test(cleanBHYT)) {
            errors.healthInsuranceNumber = "Mã thẻ BHYT gồm 10-15 ký tự chữ và số!";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setValidationError("Vui lòng kiểm tra lại các trường thông tin có viền đỏ bên dưới!");
            return;
        }

        setSubmittingCreate(true);
        try {
            const payload = {
                ...formData,
                fullName: cleanName.toUpperCase(),
                phoneNumber: formData.phoneNumber?.trim() || "",
                identityNumber: cleanIdentity || "",
                healthInsuranceNumber: cleanBHYT ? cleanBHYT.toUpperCase() : "",
                streetAddress: formData.streetAddress?.trim() || "",
                province: formData.province?.trim() || "Thành phố Hà Nội",
                district: formData.district?.trim() || "",
                ward: formData.ward?.trim() || ""
            };

            if (editProfile?.patientProfileId) {
                await bookingApi.updateProfile(editProfile.patientProfileId, payload);
                if (onSuccess) onSuccess("Cập nhật hồ sơ bệnh nhân thành công!");
            } else {
                await bookingApi.createProfile(payload);
                if (onSuccess) onSuccess("Tạo mới hồ sơ bệnh nhân thành công!");
            }
            handleCloseModal();
        } catch (err) {
            console.error("Lỗi lưu hồ sơ:", err);
            setValidationError(err?.response?.data?.message || err?.message || "Lỗi khi lưu hồ sơ bệnh nhân!");
        } finally {
            setSubmittingCreate(false);
        }
    };

    // -------------------------------------------------------------
    // 2. TÌM HỒ SƠ THEO MÃ BỆNH NHÂN (Hình 141)
    // -------------------------------------------------------------
    const handleSearchByCode = async (e) => {
        if (e) e.preventDefault();
        setSearchError("");
        setHasSearched(false);
        setSelectedCandidate(null);

        const clean = patientCode.trim().toUpperCase();
        if (!clean) {
            setSearchError("Vui lòng nhập mã bệnh nhân (ví dụ: BN-XXXXXX hoặc số CCCD)!");
            return;
        }

        setSearching(true);
        try {
            const res = await bookingApi.searchProfileByCode(clean);
            if (res.data?.data) {
                setCandidates([res.data.data]);
            } else {
                setCandidates([]);
            }
            setHasSearched(true);
            setLinkSubView("SEARCH_RESULTS");
        } catch (err) {
            console.error("Lỗi tìm kiếm theo mã:", err);
            setCandidates([]);
            setHasSearched(true);
            setSearchError(err?.response?.data?.message || err?.message || "Không tìm thấy hồ sơ bệnh nhân phù hợp với mã đã nhập!");
            setLinkSubView("SEARCH_RESULTS");
        } finally {
            setSearching(false);
        }
    };

    // -------------------------------------------------------------
    // 3. TÌM HỒ SƠ KHI QUÊN MÃ BỆNH NHÂN (Hình 142)
    // -------------------------------------------------------------
    const handleSearchByInfo = async (e) => {
        if (e) e.preventDefault();
        setSearchError("");
        setHasSearched(false);
        setSelectedCandidate(null);

        if (!forgotForm.fullName.trim() || forgotForm.fullName.trim().length < 2) {
            setSearchError("Vui lòng nhập đầy đủ họ và tên bệnh nhân!");
            return;
        }
        if (!forgotForm.dateOfBirth) {
            setSearchError("Vui lòng chọn ngày tháng năm sinh của bệnh nhân!");
            return;
        }

        setSearching(true);
        try {
            const payload = {
                fullName: forgotForm.fullName.trim(),
                dateOfBirth: forgotForm.dateOfBirth,
                gender: forgotForm.gender,
                province: forgotForm.province?.trim() || null,
                identityNumber: forgotForm.identityNumber?.trim() || null
            };
            const res = await bookingApi.searchProfilesByInfo(payload);
            const data = res.data?.data || [];
            setCandidates(data);
            setHasSearched(true);
            if (data.length === 0) {
                setSearchError("Không tìm thấy hồ sơ nào khớp với thông tin đã nhập. Vui lòng kiểm tra lại họ tên, ngày sinh hoặc tỉnh thành.");
            }
            setLinkSubView("SEARCH_RESULTS");
        } catch (err) {
            console.error("Lỗi tìm kiếm theo thông tin:", err);
            setCandidates([]);
            setHasSearched(true);
            setSearchError(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi khi tìm kiếm hồ sơ bệnh nhân!");
            setLinkSubView("SEARCH_RESULTS");
        } finally {
            setSearching(false);
        }
    };

    // -------------------------------------------------------------
    // 4. XÁC THỰC SĐT & LIÊN KẾT HỒ SƠ (Hình 143)
    // -------------------------------------------------------------
    const handleVerifyAndLink = async (e) => {
        if (e) e.preventDefault();
        setVerifyError("");

        const cleanPhone = verifyPhone.trim();
        if (!cleanPhone || cleanPhone.length < 9) {
            setVerifyError("Vui lòng nhập số điện thoại hợp lệ (10 chữ số) đã đăng ký với hồ sơ này!");
            return;
        }

        setVerifying(true);
        try {
            const payload = {
                patientProfileId: selectedCandidate.patientProfileId,
                verificationPhoneNumber: cleanPhone
            };
            await bookingApi.verifyAndLinkProfile(payload);
            handleCloseModal();
            if (onSuccess) {
                onSuccess("Liên kết hồ sơ bệnh nhân thành công! Hồ sơ đã được đồng bộ vào tài khoản của bạn.");
            }
        } catch (err) {
            console.error("Lỗi xác thực liên kết:", err);
            setVerifyError(err?.response?.data?.message || err?.message || "Số điện thoại xác thực không khớp với hồ sơ bệnh nhân!");
        } finally {
            setVerifying(false);
        }
    };

    const availableWards = getWardsByProvince(formData.province);

    return (
        <Dialog
            open={open}
            onClose={handleCloseModal}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3.5,
                    boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
                    overflow: "hidden"
                }
            }}
        >
            {/* Header Dialog */}
            <DialogTitle
                sx={{
                    background: "linear-gradient(135deg, #0088D6 0%, #0062A3 100%)",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 2,
                    px: 3
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    {editProfile ? (
                        <EditIcon sx={{ fontSize: 26, color: "#BAE6FD" }} />
                    ) : (
                        <PersonAddIcon sx={{ fontSize: 26, color: "#BAE6FD" }} />
                    )}
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                            {editProfile ? "Chỉnh Sửa Hồ Sơ Bệnh Nhân" : "Tạo Hồ Sơ Bệnh Nhân"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
                            {editProfile
                                ? `Cập nhật thông tin hành chính • Mã BN: ${editProfile.patientCode || "---"}`
                                : "Chọn tạo mới người chưa từng khám hoặc liên kết hồ sơ cũ đã có"}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={handleCloseModal} sx={{ color: "#FFFFFF" }} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            {/* Thanh Tabs 2 Lựa Chọn (Hình 140 vs 141) - Chỉ hiển thị khi thêm mới, không hiện khi sửa */}
            {!editProfile && (
                <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#FFFFFF", px: 2 }}>
                    <Tabs
                        value={mainTab}
                        onChange={(_, val) => {
                            setMainTab(val);
                            resetLinkFlow();
                            setValidationError("");
                        }}
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{
                            "& .MuiTab-root": {
                                fontWeight: 700,
                                fontSize: "0.92rem",
                                py: 1.5,
                                textTransform: "none"
                            }
                        }}
                    >
                        <Tab
                            icon={<PersonAddIcon sx={{ fontSize: 19 }} />}
                            iconPosition="start"
                            label="Chưa từng khám"
                        />
                        <Tab
                            icon={<BadgeIcon sx={{ fontSize: 19 }} />}
                            iconPosition="start"
                            label="Đã từng khám"
                        />
                    </Tabs>
                </Box>
            )}

            <DialogContent sx={{ p: 3, bgcolor: "#F8FAFC" }}>
                {/* ========================================================================= */}
                {/* TAB 0: CHƯA TỪNG KHÁM (HÌNH 140 / BẢNG 94) & CHỈNH SỬA HỒ SƠ             */}
                {/* ========================================================================= */}
                {(editProfile || mainTab === 0) && (
                    <Box component="form" onSubmit={handleSaveProfile}>
                        {validationError && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                                {validationError}
                            </Alert>
                        )}

                        {/* Tiêu đề & Thông báo lưu ý chuẩn Hình 140 */}
                        <Typography variant="subtitle1" fontWeight={800} color="#0088D6" textAlign="center" mb={1} sx={{ letterSpacing: "0.5px" }}>
                            {editProfile ? "CẬP NHẬT THÔNG TIN BỆNH NHÂN" : "NHẬP THÔNG TIN BỆNH NHÂN"}
                        </Typography>

                        <Paper elevation={0} sx={{ p: 2, bgcolor: "#EBF6FE", borderRadius: 2, border: "1px solid #BAE6FD", mb: 2 }}>
                            <Typography variant="body2" color="#0369A1" sx={{ lineHeight: 1.6 }}>
                                Vui lòng cung cấp thông tin chính xác để được phục vụ tốt nhất. Trong trường hợp cung cấp sai thông tin bệnh nhân &amp; điện thoại, việc xác nhận cuộc hẹn sẽ không hiệu lực trước khi đặt khám.
                            </Typography>
                        </Paper>

                        <Typography variant="caption" color="error" fontWeight={700} display="block" mb={2}>
                            (*) Thông tin bắt buộc
                        </Typography>

                        <Grid container spacing={2}>
                            {/* Hàng 1: Họ và tên * & Ngày sinh * (Hình 140) */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên *"
                                    value={formData.fullName}
                                    onChange={(e) => {
                                        setFormData({ ...formData, fullName: e.target.value });
                                        if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: "" });
                                    }}
                                    placeholder="NGUYỄN GIA VĂN"
                                    required
                                    size="small"
                                    error={Boolean(fieldErrors.fullName)}
                                    helperText={fieldErrors.fullName || "Nhập đầy đủ họ và tên có dấu"}
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Ngày sinh *"
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => {
                                        setFormData({ ...formData, dateOfBirth: e.target.value });
                                        if (fieldErrors.dateOfBirth) setFieldErrors({ ...fieldErrors, dateOfBirth: "" });
                                    }}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ max: formatISODate(new Date()) }}
                                    required
                                    size="small"
                                    error={Boolean(fieldErrors.dateOfBirth)}
                                    helperText={fieldErrors.dateOfBirth || "Không được lớn hơn ngày hiện tại"}
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                />
                            </Grid>

                            {/* Hàng 2: Số điện thoại * & Giới tính * (Hình 140) */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số điện thoại *"
                                    value={formData.phoneNumber}
                                    onChange={(e) => {
                                        setFormData({ ...formData, phoneNumber: e.target.value });
                                        if (fieldErrors.phoneNumber) setFieldErrors({ ...fieldErrors, phoneNumber: "" });
                                    }}
                                    placeholder="0987654321"
                                    required
                                    size="small"
                                    error={Boolean(fieldErrors.phoneNumber)}
                                    helperText={fieldErrors.phoneNumber || "10 chữ số liên hệ chính xác"}
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
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
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                >
                                    <MenuItem value="MALE">Nam</MenuItem>
                                    <MenuItem value="FEMALE">Nữ</MenuItem>
                                    <MenuItem value="OTHER">Khác</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Quan hệ với chủ tài khoản *"
                                    value={formData.relationship || "SELF"}
                                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                                    size="small"
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                >
                                    <MenuItem value="SELF">Bản thân (Chủ tài khoản)</MenuItem>
                                    <MenuItem value="CHILD">Con cái</MenuItem>
                                    <MenuItem value="SPOUSE">Vợ / Chồng</MenuItem>
                                    <MenuItem value="PARENT">Bố / Mẹ</MenuItem>
                                    <MenuItem value="OTHER">Người thân khác</MenuItem>
                                </TextField>
                            </Grid>

                            {/* Hàng 3: Số CMND/CCCD & Dân tộc (Hình 140) */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số CMND/CCCD"
                                    value={formData.identityNumber}
                                    onChange={(e) => {
                                        setFormData({ ...formData, identityNumber: e.target.value });
                                        if (fieldErrors.identityNumber) setFieldErrors({ ...fieldErrors, identityNumber: "" });
                                    }}
                                    placeholder="12 chữ số CCCD gắn chip"
                                    size="small"
                                    error={Boolean(fieldErrors.identityNumber)}
                                    helperText={fieldErrors.identityNumber || "9 hoặc 12 chữ số (tùy chọn)"}
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Dân tộc"
                                    value={formData.ethnicity}
                                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                                    placeholder="Kinh"
                                    size="small"
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                />
                            </Grid>

                            {/* Hàng 4: Tỉnh/Thành * & Quận/Huyện * (Hình 140) */}
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
                                        <TextField {...params} label="Tỉnh/Thành *" size="small" required sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }} />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Quận/Huyện *"
                                    value={formData.district}
                                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                    placeholder="Huyện Cờ Đỏ"
                                    size="small"
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                />
                            </Grid>

                            {/* Hàng 5: Xã/Phường * & Địa chỉ * (Hình 140) */}
                            <Grid item xs={12} sm={6}>
                                {availableWards.length > 0 ? (
                                    <Autocomplete
                                        freeSolo
                                        options={availableWards}
                                        value={formData.ward || ""}
                                        onInputChange={(_, newValue) => setFormData({ ...formData, ward: newValue })}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Xã/Phường *" size="small" placeholder="Thị trấn Cờ Đỏ" sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }} />
                                        )}
                                    />
                                ) : (
                                    <TextField
                                        fullWidth
                                        label="Xã/Phường *"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        placeholder="Thị trấn Cờ Đỏ"
                                        size="small"
                                        InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                    />
                                )}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Địa chỉ *"
                                    value={formData.streetAddress}
                                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                    placeholder="Nhập địa chỉ"
                                    required
                                    size="small"
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                />
                            </Grid>

                            {/* Hàng 6: Email (Hình 140) & BHYT nếu có */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Email"
                                    size="small"
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Mã thẻ BHYT (Nếu có)"
                                    value={formData.healthInsuranceNumber}
                                    onChange={(e) => {
                                        setFormData({ ...formData, healthInsuranceNumber: e.target.value.toUpperCase() });
                                        if (fieldErrors.healthInsuranceNumber) setFieldErrors({ ...fieldErrors, healthInsuranceNumber: "" });
                                    }}
                                    placeholder="DN4010900123456"
                                    size="small"
                                    error={Boolean(fieldErrors.healthInsuranceNumber)}
                                    helperText={fieldErrors.healthInsuranceNumber || "10-15 ký tự chữ/số (tùy chọn)"}
                                    InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                />
                            </Grid>
                        </Grid>

                        <Box mt={3} display="flex" justifyContent="flex-end" gap={1.5}>
                            <Button
                                variant="outlined"
                                onClick={handleCloseModal}
                                disabled={submittingCreate}
                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={submittingCreate}
                                startIcon={submittingCreate ? <CircularProgress size={18} color="inherit" /> : <PersonAddIcon />}
                                sx={{
                                    bgcolor: "#0088D6",
                                    "&:hover": { bgcolor: "#0070BA" },
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    px: 3
                                }}
                            >
                                {editProfile ? "Cập nhật hồ sơ" : "+ Tạo hồ sơ"}
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* ========================================================================= */}
                {/* TAB 1: ĐÃ TỪNG KHÁM (HÌNH 141 - 143)                                      */}
                {/* ========================================================================= */}
                {!editProfile && mainTab === 1 && (
                    <Box>
                        {/* ------------------------------------------------------------- */}
                        {/* SUB-VIEW 1: TÌM THEO MÃ BỆNH NHÂN (HÌNH 141 / BẢNG 95)        */}
                        {/* ------------------------------------------------------------- */}
                        {linkSubView === "SEARCH_CODE" && (
                            <Box component="form" onSubmit={handleSearchByCode}>
                                <Typography variant="subtitle1" fontWeight={800} color="#0088D6" textAlign="center" mb={1} sx={{ letterSpacing: "0.5px" }}>
                                    NHẬP MÃ SỐ BỆNH NHÂN
                                </Typography>
                                <Typography variant="body2" color="text.secondary" textAlign="center" mb={2.5}>
                                    Vui lòng nhập mã bệnh nhân (in trên sổ hoặc phiếu khám cũ, ví dụ: <code>BN2EAAE2DD</code>) để tìm kiếm:
                                </Typography>

                                <Box sx={{ maxWidth: 460, mx: "auto" }}>
                                    <TextField
                                        fullWidth
                                        size="medium"
                                        placeholder="Nhập mã bệnh nhân"
                                        value={patientCode}
                                        onChange={(e) => setPatientCode(e.target.value)}
                                        autoFocus
                                        InputProps={{
                                            sx: { bgcolor: "#FFFFFF", borderRadius: 2, fontFamily: "monospace", mb: 2 }
                                        }}
                                    />
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        type="submit"
                                        disabled={searching}
                                        startIcon={searching ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                                        sx={{
                                            bgcolor: "#0088D6",
                                            "&:hover": { bgcolor: "#0070BA" },
                                            py: 1.2,
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: 700,
                                            fontSize: "0.95rem"
                                        }}
                                    >
                                        Tìm kiếm
                                    </Button>

                                    {/* Dòng liên kết text: > Tôi mất mã bệnh nhân của mình (Hình 141 mục 5) */}
                                    <Box mt={2.5} textAlign="center">
                                        <Button
                                            variant="text"
                                            onClick={() => {
                                                setSearchError("");
                                                setLinkSubView("FORGOT_CODE");
                                            }}
                                            sx={{
                                                textTransform: "none",
                                                color: "#0F172A",
                                                fontWeight: 600,
                                                fontSize: "0.9rem",
                                                "&:hover": { bgcolor: "transparent", color: "#0088D6", textDecoration: "underline" }
                                            }}
                                        >
                                            &gt; Tôi mất mã bệnh nhân của mình
                                        </Button>
                                    </Box>
                                </Box>
                            </Box>
                        )}

                        {/* ------------------------------------------------------------- */}
                        {/* SUB-VIEW 2: TÌM KHI QUÊN MÃ BỆNH NHÂN (HÌNH 142 / BẢNG 96)    */}
                        {/* ------------------------------------------------------------- */}
                        {linkSubView === "FORGOT_CODE" && (
                            <Box component="form" onSubmit={handleSearchByInfo}>
                                <Typography variant="h6" fontWeight={800} color="#0088D6" textAlign="center" mb={2.5}>
                                    Tìm lại mã bệnh nhân
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Họ và tên *"
                                            placeholder="Nguyễn Gia Văn"
                                            value={forgotForm.fullName}
                                            onChange={(e) => setForgotForm({ ...forgotForm, fullName: e.target.value })}
                                            required
                                            InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Năm sinh *"
                                            placeholder="Năm sinh hoặc YYYY-MM-DD"
                                            value={forgotForm.dateOfBirth}
                                            onChange={(e) => setForgotForm({ ...forgotForm, dateOfBirth: e.target.value })}
                                            required
                                            InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            select
                                            fullWidth
                                            size="small"
                                            label="Giới tính *"
                                            value={forgotForm.gender}
                                            onChange={(e) => setForgotForm({ ...forgotForm, gender: e.target.value })}
                                            InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                        >
                                            <MenuItem value="MALE">Nam</MenuItem>
                                            <MenuItem value="FEMALE">Nữ</MenuItem>
                                            <MenuItem value="OTHER">Khác</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            options={VIETNAM_PROVINCES_34.map(p => p.name)}
                                            value={forgotForm.province}
                                            onChange={(_, val) => setForgotForm({ ...forgotForm, province: val || "" })}
                                            renderInput={(params) => (
                                                <TextField {...params} label="Tỉnh/Thành *" size="small" required sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }} />
                                            )}
                                        />
                                    </Grid>
                                </Grid>

                                <Box mt={3} display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
                                    <Button
                                        variant="text"
                                        onClick={() => {
                                            setSearchError("");
                                            setLinkSubView("SEARCH_CODE");
                                        }}
                                        sx={{ textTransform: "none", fontWeight: 700, color: "#64748B" }}
                                    >
                                        Quay lại
                                    </Button>
                                    <Button
                                        variant="contained"
                                        type="submit"
                                        disabled={searching}
                                        startIcon={searching ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                                        sx={{
                                            bgcolor: "#0088D6",
                                            "&:hover": { bgcolor: "#0070BA" },
                                            px: 4,
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: 700
                                        }}
                                    >
                                        Tìm kiếm
                                    </Button>
                                </Box>
                            </Box>
                        )}

                        {/* ------------------------------------------------------------- */}
                        {/* SUB-VIEW 3: KẾT QUẢ TÌM KIẾM HỒ SƠ (HÌNH 143 / BẢNG 97)        */}
                        {/* ------------------------------------------------------------- */}
                        {linkSubView === "SEARCH_RESULTS" && (
                            <Box>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                    <Typography variant="caption" color="text.secondary">
                                        Trang chủ &rsaquo; <b>Xác thực thông tin</b>
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<ArrowBackIcon />}
                                        onClick={() => {
                                            setSelectedCandidate(null);
                                            setLinkSubView(patientCode ? "SEARCH_CODE" : "FORGOT_CODE");
                                        }}
                                        sx={{ textTransform: "none", fontWeight: 700, color: "#0088D6" }}
                                    >
                                        Quay lại
                                    </Button>
                                </Box>

                                <Typography variant="h6" fontWeight={800} color="#0088D6" textAlign="center" mb={2}>
                                    Hồ Sơ Bệnh Nhân
                                </Typography>

                                {searchError && (
                                    <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
                                        {searchError}
                                    </Alert>
                                )}

                                {/* DANH SÁCH ỨNG VIÊN TÌM THẤY (Hình 143 mục 2) */}
                                {!selectedCandidate ? (
                                    <Stack spacing={2}>
                                        {candidates.length === 0 && !searchError && (
                                            <Paper elevation={0} sx={{ p: 3, textAlign: "center", bgcolor: "#FFFFFF", borderRadius: 3, border: "1px dashed #CBD5E1" }}>
                                                <PersonSearchIcon sx={{ fontSize: 40, color: "#94A3B8", mb: 1 }} />
                                                <Typography variant="body2" fontWeight={700} color="#475569">
                                                    Không tìm thấy hồ sơ bệnh nhân phù hợp
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Vui lòng quay lại kiểm tra chính xác Mã bệnh nhân hoặc Họ tên, Ngày sinh.
                                                </Typography>
                                            </Paper>
                                        )}

                                        {candidates.map((c) => (
                                            <Paper
                                                key={c.patientProfileId}
                                                elevation={0}
                                                onClick={() => {
                                                    if (!c.isAlreadyMine) {
                                                        setSelectedCandidate(c);
                                                        setVerifyPhone("");
                                                        setVerifyError("");
                                                    }
                                                }}
                                                sx={{
                                                    p: 2.5,
                                                    borderRadius: 3,
                                                    border: "1.5px solid",
                                                    borderColor: "#0088D6",
                                                    borderLeft: "6px solid #0088D6",
                                                    bgcolor: "#FFFFFF",
                                                    boxShadow: "0 4px 14px rgba(0, 136, 214, 0.08)",
                                                    cursor: c.isAlreadyMine ? "default" : "pointer",
                                                    transition: "all 0.2s ease",
                                                    "&:hover": c.isAlreadyMine ? {} : {
                                                        boxShadow: "0 8px 24px rgba(0, 136, 214, 0.16)",
                                                        transform: "translateY(-2px)"
                                                    }
                                                }}
                                            >
                                                <Box display="flex" flexDirection="column" gap={1.2}>
                                                    <Box display="flex" alignItems="center">
                                                        <Box sx={{ width: 130, color: "#64748B" }}>
                                                            <Typography variant="body2" color="#64748B">Họ và tên:</Typography>
                                                        </Box>
                                                        <Typography variant="subtitle1" fontWeight={800} color="#0088D6">
                                                            {c.fullName?.toUpperCase()}
                                                        </Typography>
                                                    </Box>
                                                    <Box display="flex" alignItems="center">
                                                        <Box sx={{ width: 130, color: "#64748B" }}>
                                                            <Typography variant="body2" color="#64748B">Ngày sinh:</Typography>
                                                        </Box>
                                                        <Typography variant="body2" fontWeight="600" color="#1E293B">
                                                            {formatDate(c.dateOfBirth)}
                                                        </Typography>
                                                    </Box>
                                                    <Box display="flex" alignItems="flex-start">
                                                        <Box sx={{ width: 130, color: "#64748B" }}>
                                                            <Typography variant="body2" color="#64748B">Địa chỉ:</Typography>
                                                        </Box>
                                                        <Typography variant="body2" fontWeight="500" color="#1E293B" sx={{ flex: 1 }}>
                                                            {[c.streetAddress, c.ward, c.district, c.province].filter(Boolean).join(", ") || c.province || "Việt Nam"}
                                                        </Typography>
                                                    </Box>
                                                    <Box display="flex" alignItems="center">
                                                        <Box sx={{ width: 130, color: "#64748B" }}>
                                                            <Typography variant="body2" color="#64748B">Số điện thoại:</Typography>
                                                        </Box>
                                                        <Typography variant="body2" fontWeight="700" color="#0088D6" fontFamily="monospace">
                                                            {c.maskedPhoneNumber || "*******428"}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Box mt={2} pt={1.5} borderTop="1px dashed #E2E8F0" display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                                        * Nhấn vào để nhập số điện thoại xác thực và thêm vào tài khoản
                                                    </Typography>
                                                    {c.isAlreadyMine ? (
                                                        <Chip icon={<CheckCircleIcon />} label="Đã liên kết" color="success" size="small" sx={{ fontWeight: 700 }} />
                                                    ) : (
                                                        <Button size="small" variant="contained" sx={{ bgcolor: "#0088D6", textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}>
                                                            Chọn xác thực &rarr;
                                                        </Button>
                                                    )}
                                                </Box>
                                            </Paper>
                                        ))}

                                        <Box mt={2} display="flex" justifyContent="flex-start">
                                            <Button
                                                variant="outlined"
                                                startIcon={<ArrowBackIcon />}
                                                onClick={() => {
                                                    setSelectedCandidate(null);
                                                    setLinkSubView(patientCode ? "SEARCH_CODE" : "FORGOT_CODE");
                                                }}
                                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                                            >
                                                Quay lại tìm kiếm
                                            </Button>
                                        </Box>
                                    </Stack>
                                ) : (
                                    /* BƯỚC XÁC THỰC SỐ ĐIỆN THOẠI TRƯỚC KHI LIÊN KẾT (BẢO VỆ DỮ LIỆU) */
                                    <Box component="form" onSubmit={handleVerifyAndLink} sx={{ p: 2.5, bgcolor: "#FFFFFF", borderRadius: 3, border: "1px solid #E2E8F0" }}>
                                        <Typography variant="subtitle2" fontWeight={800} color="#0F172A" mb={1}>
                                            Xác thực quyền sở hữu hồ sơ: {selectedCandidate.fullName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" mb={2}>
                                            Để bảo vệ quyền riêng tư người bệnh, vui lòng nhập chính xác <b>Số điện thoại</b> đã đăng ký với hồ sơ này (gợi ý: đuôi số <code>{selectedCandidate.maskedPhoneNumber?.slice(-4) || "428"}</code>):
                                        </Typography>

                                        {verifyError && (
                                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                                {verifyError}
                                            </Alert>
                                        )}

                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Số điện thoại đăng ký hồ sơ *"
                                            placeholder="Ví dụ: 0987654428"
                                            value={verifyPhone}
                                            onChange={(e) => setVerifyPhone(e.target.value)}
                                            autoFocus
                                            InputProps={{ sx: { bgcolor: "#F8FAFC", borderRadius: 2 } }}
                                        />

                                        <Box mt={3} display="flex" justifyContent="space-between" alignItems="center">
                                            <Button
                                                variant="outlined"
                                                onClick={() => setSelectedCandidate(null)}
                                                disabled={verifying}
                                                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                                            >
                                                Chọn hồ sơ khác
                                            </Button>
                                            <Button
                                                variant="contained"
                                                type="submit"
                                                disabled={verifying}
                                                startIcon={verifying ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                                                sx={{
                                                    bgcolor: "#0088D6",
                                                    "&:hover": { bgcolor: "#0070BA" },
                                                    borderRadius: 2,
                                                    textTransform: "none",
                                                    fontWeight: 700,
                                                    px: 3
                                                }}
                                            >
                                                Xác nhận & Thêm hồ sơ
                                            </Button>
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}

