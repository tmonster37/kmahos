import React, { useState } from "react";
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
    Stack
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import LinkIcon from "@mui/icons-material/Link";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import BadgeIcon from "@mui/icons-material/Badge";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import { bookingApi } from "../../services/bookingApi";
import { VIETNAM_PROVINCES_34 } from "../../utils/administrativeDivisions";
import { formatDate } from "../../utils/formatters";

export default function LinkExistingProfileModal({ open, onClose, onSuccess }) {
    // Tab: 0: Tìm bằng Mã bệnh nhân (Hình 2.16), 1: Tìm khi quên mã (Hình 2.17)
    const [tabIndex, setTabIndex] = useState(0);

    // Form 1: Mã bệnh nhân
    const [patientCode, setPatientCode] = useState("");

    // Form 2: Thông tin cá nhân khi quên mã
    const [infoForm, setInfoForm] = useState({
        fullName: "",
        dateOfBirth: "",
        gender: "MALE",
        identityNumber: "",
        province: ""
    });

    // Trạng thái tìm kiếm
    const [searching, setSearching] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [candidates, setCandidates] = useState([]); // Danh sách hồ sơ tìm thấy
    const [hasSearched, setHasSearched] = useState(false);

    // Hồ sơ được chọn để tiến hành bước xác thực SĐT
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [verifyPhone, setVerifyPhone] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState("");

    const handleReset = () => {
        setPatientCode("");
        setInfoForm({
            fullName: "",
            dateOfBirth: "",
            gender: "MALE",
            identityNumber: "",
            province: ""
        });
        setCandidates([]);
        setSelectedProfile(null);
        setVerifyPhone("");
        setErrorMessage("");
        setVerifyError("");
        setHasSearched(false);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    // 1. Tìm theo Mã bệnh nhân (Hình 2.16)
    const handleSearchByCode = async (e) => {
        if (e) e.preventDefault();
        setErrorMessage("");
        setHasSearched(false);
        setSelectedProfile(null);

        const clean = patientCode.trim();
        if (!clean) {
            setErrorMessage("Vui lòng nhập mã bệnh nhân (ví dụ: BN-XXXXXX hoặc số CCCD)!");
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
        } catch (err) {
            console.error("Lỗi tìm kiếm hồ sơ theo mã:", err);
            setCandidates([]);
            setHasSearched(true);
            setErrorMessage(err?.response?.data?.message || err?.message || "Không tìm thấy hồ sơ bệnh nhân phù hợp với mã đã nhập!");
        } finally {
            setSearching(false);
        }
    };

    // 2. Tìm theo thông tin cá nhân khi quên mã (Hình 2.17)
    const handleSearchByInfo = async (e) => {
        if (e) e.preventDefault();
        setErrorMessage("");
        setHasSearched(false);
        setSelectedProfile(null);

        if (!infoForm.fullName.trim() || infoForm.fullName.trim().length < 2) {
            setErrorMessage("Vui lòng nhập đầy đủ họ và tên bệnh nhân!");
            return;
        }
        if (!infoForm.dateOfBirth) {
            setErrorMessage("Vui lòng chọn ngày tháng năm sinh của bệnh nhân!");
            return;
        }

        setSearching(true);
        try {
            const payload = {
                fullName: infoForm.fullName.trim(),
                dateOfBirth: infoForm.dateOfBirth,
                gender: infoForm.gender,
                identityNumber: infoForm.identityNumber?.trim() || null,
                province: infoForm.province?.trim() || null
            };
            const res = await bookingApi.searchProfilesByInfo(payload);
            const data = res.data?.data || [];
            setCandidates(data);
            setHasSearched(true);
            if (data.length === 0) {
                setErrorMessage("Không tìm thấy hồ sơ nào khớp với thông tin đã nhập. Vui lòng kiểm tra lại họ tên, ngày sinh hoặc số CCCD.");
            }
        } catch (err) {
            console.error("Lỗi tìm kiếm theo thông tin:", err);
            setCandidates([]);
            setHasSearched(true);
            setErrorMessage(err?.response?.data?.message || err?.message || "Đã xảy ra lỗi khi tìm kiếm hồ sơ bệnh nhân!");
        } finally {
            setSearching(false);
        }
    };

    // 3. Tiến hành xác thực số điện thoại & liên kết hồ sơ
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
                patientProfileId: selectedProfile.patientProfileId,
                verificationPhoneNumber: cleanPhone
            };
            const res = await bookingApi.verifyAndLinkProfile(payload);
            const linkedProfile = res.data?.data;
            handleClose();
            if (onSuccess) {
                onSuccess(linkedProfile, "Liên kết hồ sơ bệnh nhân thành công! Toàn bộ lịch sử khám đã được đồng bộ.");
            }
        } catch (err) {
            console.error("Lỗi xác thực và liên kết:", err);
            setVerifyError(err?.response?.data?.message || err?.message || "Số điện thoại xác thực không khớp với hồ sơ bệnh nhân!");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3.5,
                    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.15)",
                    overflow: "hidden"
                }
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    bgcolor: "#0F766E",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 2,
                    px: 3
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <LinkIcon sx={{ fontSize: 28, color: "#5EEAD4" }} />
                    <Box>
                        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                            Liên Kết Hồ Sơ Bệnh Nhân Cũ
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                            Đã từng khám tại bệnh viện • Đồng bộ vào tài khoản của bạn
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={handleClose} sx={{ color: "#FFFFFF" }} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, bgcolor: "#F8FAFC" }}>
                {/* Nếu chưa chọn hồ sơ cụ thể -> Hiển thị tabs tìm kiếm */}
                {!selectedProfile ? (
                    <Box>
                        {/* Tabs chuyển đổi giữa Hình 2.16 và Hình 2.17 */}
                        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#FFFFFF", px: 2 }}>
                            <Tabs
                                value={tabIndex}
                                onChange={(e, val) => {
                                    setTabIndex(val);
                                    setErrorMessage("");
                                    setCandidates([]);
                                    setHasSearched(false);
                                }}
                                textColor="primary"
                                indicatorColor="primary"
                                sx={{
                                    "& .MuiTab-root": {
                                        fontWeight: 600,
                                        fontSize: "0.92rem",
                                        py: 1.5,
                                        textTransform: "none"
                                    }
                                }}
                            >
                                <Tab
                                    icon={<BadgeIcon sx={{ fontSize: 20 }} />}
                                    iconPosition="start"
                                    label="Tôi có mã bệnh nhân"
                                />
                                <Tab
                                    icon={<PersonSearchIcon sx={{ fontSize: 20 }} />}
                                    iconPosition="start"
                                    label="Quên mã bệnh nhân"
                                />
                            </Tabs>
                        </Box>

                        <Box p={3}>
                            {errorMessage && (
                                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
                                    {errorMessage}
                                </Alert>
                            )}

                            {/* TAB 0: Tìm bằng Mã bệnh nhân (Hình 2.16) */}
                            {tabIndex === 0 && (
                                <Box component="form" onSubmit={handleSearchByCode}>
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        Nhập <b>Mã bệnh nhân</b> (in trên sổ khám bệnh, phiếu khám hoặc đơn thuốc cũ, ví dụ: <code>BN-XXXXXX</code>) để tra cứu hồ sơ:
                                    </Typography>
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Mã bệnh nhân / Số CCCD / Mã BHYT"
                                            placeholder="Ví dụ: BN-8C0943 hoặc 001090012345"
                                            value={patientCode}
                                            onChange={(e) => setPatientCode(e.target.value)}
                                            autoFocus
                                            InputProps={{
                                                sx: { bgcolor: "#FFFFFF", borderRadius: 2, fontFamily: "monospace" }
                                            }}
                                        />
                                        <Button
                                            variant="contained"
                                            type="submit"
                                            disabled={searching}
                                            startIcon={searching ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                                            sx={{
                                                bgcolor: "#0F766E",
                                                "&:hover": { bgcolor: "#0D9488" },
                                                px: 3,
                                                whiteSpace: "nowrap",
                                                borderRadius: 2,
                                                textTransform: "none",
                                                fontWeight: 600
                                            }}
                                        >
                                            Tìm kiếm
                                        </Button>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                        * Bạn cũng có thể nhấn sang tab <b>"Quên mã bệnh nhân"</b> nếu không giữ phiếu khám cũ.
                                    </Typography>
                                </Box>
                            )}

                            {/* TAB 1: Tìm khi quên mã (Hình 2.17) */}
                            {tabIndex === 1 && (
                                <Box component="form" onSubmit={handleSearchByInfo}>
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        Nhập thông tin nhân khẩu học của bệnh nhân để hệ thống đối soát và tìm lại hồ sơ cũ:
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Họ và tên bệnh nhân *"
                                                placeholder="Ví dụ: NGUYỄN VĂN AN"
                                                value={infoForm.fullName}
                                                onChange={(e) => setInfoForm({ ...infoForm, fullName: e.target.value })}
                                                InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="date"
                                                label="Ngày sinh *"
                                                InputLabelProps={{ shrink: true }}
                                                value={infoForm.dateOfBirth}
                                                onChange={(e) => setInfoForm({ ...infoForm, dateOfBirth: e.target.value })}
                                                InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                select
                                                fullWidth
                                                size="small"
                                                label="Giới tính *"
                                                value={infoForm.gender}
                                                onChange={(e) => setInfoForm({ ...infoForm, gender: e.target.value })}
                                                InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                            >
                                                <MenuItem value="MALE">Nam</MenuItem>
                                                <MenuItem value="FEMALE">Nữ</MenuItem>
                                                <MenuItem value="OTHER">Khác</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Số CCCD / CMND (nếu có)"
                                                placeholder="12 chữ số căn cước"
                                                value={infoForm.identityNumber}
                                                onChange={(e) => setInfoForm({ ...infoForm, identityNumber: e.target.value })}
                                                InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                select
                                                fullWidth
                                                size="small"
                                                label="Tỉnh / Thành phố"
                                                value={infoForm.province}
                                                onChange={(e) => setInfoForm({ ...infoForm, province: e.target.value })}
                                                InputProps={{ sx: { bgcolor: "#FFFFFF", borderRadius: 2 } }}
                                            >
                                                <MenuItem value="">-- Tất cả tỉnh thành --</MenuItem>
                                                {VIETNAM_PROVINCES_34.map((p) => (
                                                    <MenuItem key={p} value={p}>{p}</MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>
                                    </Grid>

                                    <Box mt={2.5} display="flex" justifyContent="flex-end">
                                        <Button
                                            variant="contained"
                                            type="submit"
                                            disabled={searching}
                                            startIcon={searching ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                                            sx={{
                                                bgcolor: "#0F766E",
                                                "&:hover": { bgcolor: "#0D9488" },
                                                px: 3.5,
                                                borderRadius: 2,
                                                textTransform: "none",
                                                fontWeight: 600
                                            }}
                                        >
                                            Tìm kiếm hồ sơ
                                        </Button>
                                    </Box>
                                </Box>
                            )}

                            {/* Danh sách kết quả tìm thấy */}
                            {candidates.length > 0 && (
                                <Box mt={3}>
                                    <Divider sx={{ mb: 2 }} />
                                    <Typography variant="subtitle2" fontWeight={700} color="#0F766E" mb={1.5}>
                                        Kết quả tìm thấy ({candidates.length} hồ sơ):
                                    </Typography>
                                    <Stack spacing={1.5}>
                                        {candidates.map((c) => (
                                            <Paper
                                                key={c.patientProfileId}
                                                elevation={0}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2.5,
                                                    border: "1.5px solid",
                                                    borderColor: c.isAlreadyMine ? "#10B981" : (c.isOwnedByOtherAccount ? "#F59E0B" : "#0D9488"),
                                                    bgcolor: "#FFFFFF",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 1
                                                }}
                                            >
                                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight={700} color="#1E293B">
                                                            {c.fullName}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Mã BN: <b style={{ fontFamily: "monospace", color: "#0F766E" }}>{c.patientCode}</b> • Ngày sinh: <b>{formatDate(c.dateOfBirth)}</b> ({c.gender === "MALE" ? "Nam" : (c.gender === "FEMALE" ? "Nữ" : "Khác")})
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Số ĐT đã lưu: <b>{c.maskedPhoneNumber}</b> {c.maskedIdentityNumber && `• CCCD: ${c.maskedIdentityNumber}`}
                                                        </Typography>
                                                        {c.province && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                Địa chỉ: {c.ward ? `${c.ward}, ` : ""}{c.district ? `${c.district}, ` : ""}{c.province}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    <Box textAlign={{ xs: "left", sm: "right" }}>
                                                        {c.isAlreadyMine ? (
                                                            <Chip
                                                                icon={<CheckCircleOutlineIcon />}
                                                                label="Đã trong tài khoản của bạn"
                                                                color="success"
                                                                size="small"
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                        ) : c.isOwnedByOtherAccount ? (
                                                            <Chip
                                                                label="Đã liên kết tài khoản khác"
                                                                color="warning"
                                                                size="small"
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                        ) : (
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                startIcon={<VerifiedUserIcon />}
                                                                onClick={() => {
                                                                    setSelectedProfile(c);
                                                                    setVerifyError("");
                                                                    setVerifyPhone("");
                                                                }}
                                                                sx={{
                                                                    bgcolor: "#0F766E",
                                                                    "&:hover": { bgcolor: "#0D9488" },
                                                                    borderRadius: 2,
                                                                    textTransform: "none",
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                Chọn hồ sơ này
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </Box>
                                                {c.totalVisits > 0 && (
                                                    <Typography variant="caption" sx={{ color: "#0369A1", bgcolor: "#E0F2FE", px: 1, py: 0.5, borderRadius: 1, width: "fit-content" }}>
                                                        🏥 Đã có {c.totalVisits} lượt khám chữa bệnh trong hệ thống
                                                    </Typography>
                                                )}
                                            </Paper>
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </Box>
                ) : (
                    /* Bước xác thực số điện thoại (Sau khi chọn hồ sơ ở Hình 2.16 / 2.17) */
                    <Box p={3} component="form" onSubmit={handleVerifyAndLink}>
                        <Button
                            size="small"
                            startIcon={<ArrowBackIcon />}
                            onClick={() => setSelectedProfile(null)}
                            sx={{ mb: 2, textTransform: "none", color: "#64748B" }}
                        >
                            Quay lại danh sách tìm kiếm
                        </Button>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                bgcolor: "#F0FDFA",
                                border: "1px solid #99F6E4",
                                mb: 3
                            }}
                        >
                            <Typography variant="caption" color="#0F766E" fontWeight={700} textTransform="uppercase">
                                Hồ sơ đã chọn để liên kết:
                            </Typography>
                            <Typography variant="h6" fontWeight={700} color="#0F766E">
                                {selectedProfile.fullName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Mã bệnh nhân: <b style={{ fontFamily: "monospace" }}>{selectedProfile.patientCode}</b> • Ngày sinh: <b>{formatDate(selectedProfile.dateOfBirth)}</b>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Số điện thoại lưu trên hồ sơ: <b>{selectedProfile.maskedPhoneNumber}</b>
                            </Typography>
                        </Paper>

                        {verifyError && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                                {verifyError}
                            </Alert>
                        )}

                        <Box sx={{ bgcolor: "#FFFFFF", p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                <PhoneIphoneIcon color="primary" />
                                <Typography variant="subtitle2" fontWeight={700} color="#1E293B">
                                    Xác thực quyền sở hữu số điện thoại:
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Để bảo mật dữ liệu y tế, vui lòng nhập chính xác <b>Số điện thoại</b> đã được dùng khi đăng ký hồ sơ bệnh nhân này trước đây:
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                label="Số điện thoại xác thực *"
                                placeholder="Nhập đúng số điện thoại (ví dụ: 0987654321)"
                                value={verifyPhone}
                                onChange={(e) => setVerifyPhone(e.target.value)}
                                autoFocus
                                InputProps={{
                                    sx: { borderRadius: 2 }
                                }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                                * Hệ thống sẽ đối soát chuỗi số điện thoại đầy đủ để chứng minh bạn là chủ sở hữu hoặc người thân được ủy quyền quản lý hồ sơ này.
                            </Typography>
                        </Box>

                        <Box mt={3} display="flex" justifyContent="flex-end" gap={1.5}>
                            <Button
                                variant="outlined"
                                onClick={() => setSelectedProfile(null)}
                                sx={{ borderRadius: 2, textTransform: "none", color: "#64748B" }}
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                variant="contained"
                                type="submit"
                                disabled={verifying}
                                startIcon={verifying ? <CircularProgress size={18} color="inherit" /> : <VerifiedUserIcon />}
                                sx={{
                                    bgcolor: "#0F766E",
                                    "&:hover": { bgcolor: "#0D9488" },
                                    px: 3.5,
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: 600
                                }}
                            >
                                {verifying ? "Đang xác thực..." : "Xác thực & Liên kết ngay"}
                            </Button>
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
