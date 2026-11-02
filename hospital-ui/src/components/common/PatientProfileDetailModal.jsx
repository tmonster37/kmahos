import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Grid,
    Paper,
    Chip,
    Avatar,
    Divider,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Tooltip,
    Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BadgeIcon from "@mui/icons-material/Badge";
import ContactEmergencyIcon from "@mui/icons-material/ContactEmergency";
import BloodtypeIcon from "@mui/icons-material/Bloodtype";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SimCardIcon from "@mui/icons-material/SimCard";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import HistoryIcon from "@mui/icons-material/History";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupIcon from "@mui/icons-material/Group";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import { formatDate, formatCurrency } from "../../utils/formatters";

/**
 * PatientProfileDetailModal
 * Phân hệ Hồ Sơ Hành Chính & Nhân Khẩu Bệnh Nhân (Master Patient Profile - MPI).
 * Phân định rõ ràng: Đây là hồ sơ hành chính, nhân thân, giấy tờ tùy thân CCCD, thẻ BHYT,
 * thân nhân liên hệ khẩn cấp và lịch sử đến viện.
 * Khi cần xem chuyên môn y khoa (chẩn đoán, xét nghiệm, đơn thuốc) của đợt khám nào,
 * người dùng bấm nút "Xem Bệnh Án Điện Tử Đợt Này".
 */
export default function PatientProfileDetailModal({
    open,
    onClose,
    patient: propPatient,
    profile,
    onEdit,
    onViewMedicalRecord, // Hàm callback mở Bệnh án điện tử: (bookingOrRecord) => void
    onOpenEhr, // Alias callback mở Bệnh án điện tử
    onViewTickets, // Callback chuyển sang xem phiếu khám của hồ sơ này
    onViewHistory, // Callback chuyển sang xem lịch sử khám của hồ sơ này
    bookings = []
}) {
    const patient = propPatient || profile;
    const handleViewEhr = onViewMedicalRecord || onOpenEhr;
    if (!patient) return null;

    // Lọc danh sách các đợt khám của chính bệnh nhân này
    const patientVisits = (Array.isArray(bookings) ? bookings : []).filter(b => {
        if (!b) return false;
        if (patient.patientProfileId && b.patientProfileId === patient.patientProfileId) return true;
        if (patient.fullName && b.patientName && b.patientName.trim().toLowerCase() === patient.fullName.trim().toLowerCase()) return true;
        return false;
    });

    // Tính tuổi
    const calculateAge = (dobString) => {
        if (!dobString) return null;
        try {
            const birthDate = new Date(dobString);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age > 0 ? `${age} tuổi` : "Dưới 1 tuổi";
        } catch (e) {
            return null;
        }
    };

    const patientAge = calculateAge(patient.dateOfBirth);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
                    overflow: "hidden"
                }
            }}
        >
            {/* Header Modal chuẩn Hình 135 */}
            <DialogTitle
                sx={{
                    bgcolor: "#FFFFFF",
                    color: "#0F172A",
                    py: 2,
                    px: 3,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #E2E8F0"
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <PersonOutlineIcon sx={{ color: "#0088D6", fontSize: 28 }} />
                    <Box>
                        <Typography variant="h6" fontWeight={800} color="#0088D6" sx={{ letterSpacing: "0.2px" }}>
                            Hồ sơ bệnh nhân
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
                            Thông tin chi tiết hồ sơ bệnh nhân • Mã BN: <b style={{ color: "#0088D6", fontFamily: "monospace" }}>{patient.patientCode || "---"}</b>
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: "#64748B", "&:hover": { color: "#0F172A", bgcolor: "#F1F5F9" } }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, bgcolor: "#F8FAFC" }}>
                <Stack spacing={3}>
                    {/* KHỐI THÔNG TIN CHI TIẾT HỒ SƠ BỆNH NHÂN CHUẨN HÌNH 135 / BẢNG 89 */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}>
                            {/* Họ và tên */}
                            <Box display="flex" alignItems="center">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                    <PersonOutlineIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">Họ và tên</Typography>
                                </Box>
                                <Typography variant="subtitle1" fontWeight={800} color="#0088D6">
                                    {patient.fullName?.toUpperCase()}
                                </Typography>
                            </Box>

                            {/* Ngày sinh */}
                            <Box display="flex" alignItems="center">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                    <CalendarMonthIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">Ngày sinh</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={500} color="#1E293B">
                                    {formatDate(patient.dateOfBirth)}
                                </Typography>
                            </Box>

                            {/* Số điện thoại */}
                            <Box display="flex" alignItems="center">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                    <PhoneIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">Số điện thoại</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={600} color="#1E293B" sx={{ fontFamily: "monospace" }}>
                                    {patient.phoneNumber ? (patient.phoneNumber.length > 3 ? `*******${patient.phoneNumber.slice(-3)}` : patient.phoneNumber) : "---"}
                                </Typography>
                            </Box>

                            {/* Giới tính */}
                            <Box display="flex" alignItems="center">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                    <GroupIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">Giới tính</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={500} color="#1E293B">
                                    {patient.gender === "MALE" ? "Nam" : (patient.gender === "FEMALE" ? "Nữ" : "Khác")}
                                </Typography>
                            </Box>

                            {/* Địa chỉ */}
                            <Box display="flex" alignItems="flex-start">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B", mt: 0.2 }}>
                                    <LocationOnIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">Địa chỉ</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={500} color="#1E293B" sx={{ flex: 1, lineHeight: 1.5 }}>
                                    {[patient.streetAddress, patient.ward, patient.district, patient.province].filter(Boolean).join(", ") || patient.province || "Việt Nam"}
                                </Typography>
                            </Box>

                            {/* Dân tộc */}
                            <Box display="flex" alignItems="center">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                    <BookmarkBorderIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">Dân tộc</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={500} color="#1E293B">
                                    {patient.ethnicity || "Kinh"}
                                </Typography>
                            </Box>

                            {/* CCCD */}
                            <Box display="flex" alignItems="center">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                    <CreditCardIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">CCCD</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={600} fontFamily="monospace" color="#1E293B">
                                    {patient.identityNumber || "Chưa cập nhật"}
                                </Typography>
                            </Box>

                            {/* Mã bệnh nhân */}
                            <Box display="flex" alignItems="center">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                    <ReceiptLongIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">Mã bệnh nhân</Typography>
                                </Box>
                                <Typography variant="body1" fontWeight={800} fontFamily="monospace" color="#0088D6">
                                    {patient.patientCode || "BN-MPI"}
                                </Typography>
                            </Box>

                            {/* Email */}
                            <Box display="flex" alignItems="center">
                                <Box sx={{ width: 140, display: "flex", alignItems: "center", gap: 1, color: "#64748B" }}>
                                    <EmailIcon sx={{ fontSize: 20 }} />
                                    <Typography variant="body2" color="#64748B">Email</Typography>
                                </Box>
                                <Typography variant="body1" color={patient.email ? "#1E293B" : "#94A3B8"}>
                                    {patient.email || "Chưa cập nhật email"}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    {/* Băng thông báo phân định vai trò chuyên môn y khoa */}
                    <Alert
                        severity="info"
                        icon={<MedicalInformationIcon fontSize="inherit" />}
                        sx={{
                            borderRadius: 2.5,
                            bgcolor: "#EFF6FF",
                            border: "1px solid #BFDBFE",
                            color: "#1E3A8A",
                            fontSize: "0.85rem",
                            py: 0.5
                        }}
                    >
                        Để xem chi tiết chuyên môn y khoa (chẩn đoán ICD-10, kết quả xét nghiệm, toa thuốc điều trị), vui lòng sử dụng nút <b>Xem phiếu khám</b> hoặc <b>Xem lịch sử khám</b> bên dưới.
                    </Alert>

                    {/* KHU VỰC 1: MOCKUP THẺ CĂN CƯỚC & THẺ BẢO HIỂM Y TẾ (BENTO CARDS) */}
                    <Grid container spacing={2.5}>
                        {/* 1.1 Thẻ Căn Cước Công Dân Gắn Chip (Mô phỏng chuẩn) */}
                        <Grid item xs={12} md={6}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 3,
                                    bgcolor: "#FFFFFF",
                                    color: "#0F172A",
                                    border: "1px solid #CBD5E1",
                                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
                                    position: "relative",
                                    overflow: "hidden"
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: "#64748B", letterSpacing: "1px", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: 700 }}>
                                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} sx={{ color: "#0F172A", letterSpacing: "0.5px" }}>
                                            CĂN CƯỚC CÔNG DÂN / CITIZEN IDENTITY CARD
                                        </Typography>
                                    </Box>
                                    <SimCardIcon sx={{ color: "#D97706", fontSize: 28 }} />
                                </Box>

                                <Box display="flex" gap={2} alignItems="center" my={1.5}>
                                    <Avatar
                                        sx={{
                                            width: 56,
                                            height: 56,
                                            bgcolor: patient.gender === "FEMALE" ? "#FDF2F8" : "#F0FDFA",
                                            color: patient.gender === "FEMALE" ? "#DB2777" : "#0D9488",
                                            fontSize: "1.35rem",
                                            fontWeight: 800,
                                            border: "2px solid #E2E8F0"
                                        }}
                                    >
                                        {patient.fullName?.charAt(0) || "B"}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                                            Số / No:
                                        </Typography>
                                        <Typography variant="h6" fontWeight={900} sx={{ color: "#0D9488", fontFamily: "monospace", letterSpacing: "1px" }}>
                                            {patient.identityNumber || "Chưa cập nhật"}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} sx={{ color: "#0F172A", textTransform: "uppercase" }}>
                                            {patient.fullName}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Divider sx={{ borderColor: "#E2E8F0", my: 1 }} />

                                <Grid container spacing={1} sx={{ fontSize: "0.78rem" }}>
                                    <Grid item xs={6}>
                                        <span style={{ color: "#64748B" }}>Ngày sinh: </span>
                                        <b style={{ color: "#0F172A" }}>{formatDate(patient.dateOfBirth)}</b>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <span style={{ color: "#64748B" }}>Giới tính: </span>
                                        <b style={{ color: "#0F172A" }}>{patient.gender === "MALE" ? "Nam" : (patient.gender === "FEMALE" ? "Nữ" : "Khác")}</b>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <span style={{ color: "#64748B" }}>Quốc tịch: </span>
                                        <b style={{ color: "#0F172A" }}>Việt Nam</b>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <span style={{ color: "#64748B" }}>Dân tộc: </span>
                                        <b style={{ color: "#0F172A" }}>{patient.ethnicity || "Chưa cập nhật"}</b>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>

                        {/* 1.2 Thẻ Bảo Hiểm Y Tế Chuẩn Bộ Y Tế */}
                        <Grid item xs={12} md={6}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 3,
                                    bgcolor: "#FFFFFF",
                                    color: "#0F172A",
                                    border: "1px solid #CBD5E1",
                                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
                                    position: "relative",
                                    overflow: "hidden"
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                    <Box>
                                        <Typography variant="caption" sx={{ color: "#64748B", letterSpacing: "1px", textTransform: "uppercase", fontSize: "0.68rem", fontWeight: 700 }}>
                                            BẢO HIỂM XÃ HỘI VIỆT NAM
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} sx={{ color: "#0F172A", letterSpacing: "0.5px" }}>
                                            THẺ BẢO HIỂM Y TẾ (BHYT)
                                        </Typography>
                                    </Box>
                                    <HealthAndSafetyIcon sx={{ color: "#0D9488", fontSize: 28 }} />
                                </Box>

                                {patient.healthInsuranceNumber ? (
                                    <>
                                        <Box my={1.5}>
                                            <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                                                Mã số thẻ BHYT:
                                            </Typography>
                                            <Typography variant="h6" fontWeight={900} sx={{ color: "#0D9488", fontFamily: "monospace", letterSpacing: "1.5px" }}>
                                                {patient.healthInsuranceNumber}
                                            </Typography>
                                            <Box display="flex" gap={1} mt={0.5}>
                                                <Chip
                                                    label="Thẻ BHYT hợp lệ"
                                                    size="small"
                                                    sx={{ bgcolor: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC", fontWeight: 700, fontSize: "0.72rem", height: 22 }}
                                                />
                                            </Box>
                                        </Box>
                                        <Divider sx={{ borderColor: "#E2E8F0", my: 1 }} />
                                        <Grid container spacing={1} sx={{ fontSize: "0.78rem" }}>
                                            <Grid item xs={12}>
                                                <span style={{ color: "#64748B" }}>Nơi ĐK KCB ban đầu: </span>
                                                <b style={{ color: "#0F172A" }}>{patient.initialHealthcareFacility || "Theo phân tuyến BHYT"}</b>
                                            </Grid>
                                        </Grid>
                                    </>
                                ) : (
                                    <Box my={3} py={2} textAlign="center" sx={{ bgcolor: "#F8FAFC", borderRadius: 2, border: "1px dashed #CBD5E1" }}>
                                        <Typography variant="body2" sx={{ color: "#64748B", fontStyle: "italic" }}>
                                            Người bệnh chưa cập nhật thông tin thẻ BHYT
                                        </Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* KHU VỰC 2: THÔNG TIN HÀNH CHÍNH & NƠI CƯ TRÚ */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid #E2E8F0"
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight={800} color="#0F172A" display="flex" alignItems="center" gap={1} mb={2}>
                            <HomeIcon sx={{ color: "#0284C7", fontSize: 20 }} />
                            THÔNG TIN LIÊN LẠC & ĐỊA CHỈ HỘ KHẨU
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Số điện thoại liên hệ</Typography>
                                <Typography variant="body2" fontWeight={700} color="#0F172A" display="flex" alignItems="center" gap={0.8} mt={0.3}>
                                    <PhoneIcon fontSize="small" sx={{ color: "#0284C7" }} />
                                    <span style={{ fontFamily: "monospace" }}>{patient.phoneNumber || "---"}</span>
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Tuổi & Ngày sinh</Typography>
                                <Typography variant="body2" fontWeight={700} color="#0F172A" mt={0.3}>
                                    {patientAge ? `${patientAge} (${formatDate(patient.dateOfBirth)})` : formatDate(patient.dateOfBirth)}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Dân tộc / Nghề nghiệp</Typography>
                                <Typography variant="body2" fontWeight={700} color="#0F172A" mt={0.3}>
                                    {patient.ethnicity || "Chưa cập nhật"}{patient.occupation ? ` • ${patient.occupation}` : ""}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Số dư ví viện phí</Typography>
                                <Typography variant="body2" fontWeight={800} color="#059669" mt={0.3} sx={{ fontFamily: "monospace" }}>
                                    {formatCurrency(patient.balance || 0)}
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="caption" color="text.secondary">Hộ khẩu thường trú</Typography>
                                <Typography variant="body2" color="#334155" fontWeight={600} display="flex" alignItems="flex-start" gap={0.8} mt={0.3}>
                                    <LocationOnIcon fontSize="small" sx={{ color: "#64748B", mt: 0.1 }} />
                                    {[patient.streetAddress, patient.ward, patient.district, patient.province].filter(Boolean).join(", ") || "Chưa cập nhật địa chỉ"}
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="caption" color="text.secondary">Nơi ở hiện tại / Tạm trú</Typography>
                                <Typography variant="body2" color="#334155" fontWeight={600} display="flex" alignItems="flex-start" gap={0.8} mt={0.3}>
                                    <HomeIcon fontSize="small" sx={{ color: "#64748B", mt: 0.1 }} />
                                    {[patient.streetAddress, patient.ward, patient.district, patient.province].filter(Boolean).join(", ") || "Cùng hộ khẩu thường trú"}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* KHU VỰC 3: NGƯỜI LIÊN HỆ KHẨN CẤP & CẢNH BÁO Y TẾ NỀN (2 BENTO BOXES) */}
                    <Grid container spacing={2.5}>
                        {/* 3.1 Người liên hệ khẩn cấp / Giám hộ */}
                        <Grid item xs={12} md={6}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 3,
                                    bgcolor: "#FFFBEB",
                                    border: "1px solid #FDE68A",
                                    height: "100%"
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={800} color="#92400E" display="flex" alignItems="center" gap={1} mb={1.5}>
                                    <ContactEmergencyIcon sx={{ color: "#D97706", fontSize: 20 }} />
                                    NGƯỜI LIÊN HỆ KHẨN CẤP / THÂN NHÂN
                                </Typography>
                                <Box sx={{ fontSize: "0.85rem", color: "#78350F" }}>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <span style={{ color: "#92400E" }}>Họ tên thân nhân:</span>
                                        <b>{patient.guardianName || "Chưa cập nhật"}</b>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <span style={{ color: "#92400E" }}>Mối quan hệ:</span>
                                        <b>{patient.guardianRelation || "Chưa cập nhật"}</b>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <span style={{ color: "#92400E" }}>Số điện thoại khẩn:</span>
                                        <b style={{ fontFamily: "monospace", color: "#B45309" }}>{patient.guardianPhone || "Chưa cập nhật"}</b>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <span style={{ color: "#92400E" }}>Địa chỉ liên hệ:</span>
                                        <span>{[patient.ward, patient.province].filter(Boolean).join(", ") || "Chưa cập nhật"}</span>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* 3.2 Cảnh báo y tế nền tảng (Baseline Medical Flags) */}
                        <Grid item xs={12} md={6}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 3,
                                    bgcolor: "#FEF2F2",
                                    border: "1px solid #FECACA",
                                    height: "100%"
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={800} color="#991B1B" display="flex" alignItems="center" gap={1} mb={1.5}>
                                    <WarningAmberIcon sx={{ color: "#DC2626", fontSize: 20 }} />
                                    CẢNH BÁO Y TẾ CƠ BẢN & DỊ ỨNG
                                </Typography>
                                <Stack spacing={1}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <BloodtypeIcon sx={{ color: "#DC2626", fontSize: 18 }} />
                                        <Typography variant="body2" color="#7F1D1D">
                                            <b>Nhóm máu:</b> {patient.bloodType ? (
                                                <Chip label={patient.bloodType} size="small" sx={{ height: 20, fontWeight: 800, bgcolor: "#FEE2E2", color: "#991B1B" }} />
                                            ) : (
                                                <span>Chưa xác định</span>
                                            )}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="flex-start" gap={1}>
                                        <WarningAmberIcon sx={{ color: "#DC2626", fontSize: 18, mt: 0.2 }} />
                                        <Typography variant="body2" color="#7F1D1D">
                                            <b>Cảnh báo dị ứng:</b> {patient.allergies || "Chưa ghi nhận tiền sử dị ứng thuốc/thực phẩm."}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" alignItems="flex-start" gap={1}>
                                        <MedicalInformationIcon sx={{ color: "#DC2626", fontSize: 18, mt: 0.2 }} />
                                        <Typography variant="body2" color="#7F1D1D">
                                            <b>Bệnh mạn tính nền:</b> {patient.medicalHistory || "Chưa ghi nhận bệnh mạn tính nền."}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* KHU VỰC 4: LỊCH SỬ CÁC LẦN ĐẾN VIỆN & NÚT MỞ BỆNH ÁN ĐIỆN TỬ TƯƠNG ỨNG */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid #E2E8F0"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} color="#0F172A" display="flex" alignItems="center" gap={1}>
                                    <HistoryEduIcon sx={{ color: "#0284C7", fontSize: 22 }} />
                                    NHẬT KÝ ĐẾN VIỆN & CÁC ĐỢT KHÁM BỆNH ({patientVisits.length} đợt)
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Danh sách lịch hẹn và đợt khám tại viện. Bấm nút <b>"Mở Bệnh Án Điện Tử"</b> để xem hồ sơ chuyên môn lâm sàng.
                                </Typography>
                            </Box>
                        </Box>

                        {patientVisits.length > 0 ? (
                            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 2 }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>MÃ ĐỢT KHÁM</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>NGÀY KHÁM</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>KHOA & PHÒNG KHÁM</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>BÁC SĨ PHỤ TRÁCH</TableCell>
                                            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>TRẠNG THÁI</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#475569" }}>HÀNH ĐỘNG</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {patientVisits.map((v, idx) => (
                                            <TableRow key={v.bookingId || v.bookingCode || idx} hover>
                                                <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#0284C7" }}>
                                                    {v.bookingCode || `BK-${v.bookingId?.substring(0, 8)?.toUpperCase()}`}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
                                                    {formatDate(v.bookingDate || v.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={700} color="#1E293B">
                                                        {v.departmentName || "Khám Chuyên Khoa"}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {v.roomName || "Phòng khám"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: "#334155" }}>
                                                    {v.doctorName || "BS. Điều trị"}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={v.status === "COMPLETED" ? "Đã khám xong" : (v.status === "CONFIRMED" ? "Đã tiếp nhận" : (v.status === "CANCELLED" ? "Đã hủy" : "Chờ khám"))}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            fontWeight: 700,
                                                            fontSize: "0.7rem",
                                                            bgcolor: v.status === "COMPLETED" ? "#DCFCE7" : (v.status === "CANCELLED" ? "#FEE2E2" : "#E0F2FE"),
                                                            color: v.status === "COMPLETED" ? "#166534" : (v.status === "CANCELLED" ? "#DC2626" : "#0369A1")
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<VisibilityIcon fontSize="small" />}
                                                        onClick={() => {
                                                            if (handleViewEhr) {
                                                                handleViewEhr(v);
                                                            }
                                                        }}
                                                        sx={{
                                                            borderRadius: 2,
                                                            textTransform: "none",
                                                            fontWeight: 700,
                                                            fontSize: "0.78rem",
                                                            bgcolor: "#0284C7",
                                                            "&:hover": { bgcolor: "#0369A1" }
                                                        }}
                                                    >
                                                        Xem Bệnh Án Điện Tử
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box
                                sx={{
                                    p: 3,
                                    borderRadius: 2,
                                    bgcolor: "#F8FAFC",
                                    border: "1px dashed #CBD5E1",
                                    textAlign: "center"
                                }}
                            >
                                <HistoryEduIcon sx={{ fontSize: 36, color: "#94A3B8", mb: 0.5 }} />
                                <Typography variant="body2" fontWeight={700} color="#475569">
                                    Chưa phát sinh lượt khám lâm sàng tại viện
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Hồ sơ bệnh nhân đã sẵn sàng. Khi bệnh nhân đăng ký và hoàn thành đợt khám, hồ sơ bệnh án điện tử sẽ tự động đồng bộ vào đây.
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Stack>
            </DialogContent>

            {/* Footer Modal */}
            <DialogActions
                sx={{
                    p: 2,
                    px: 3,
                    bgcolor: "#F8FAFC",
                    borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1.5
                }}
            >
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                    {onEdit && (
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => {
                                onClose();
                                onEdit(patient);
                            }}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#0284C7", borderColor: "#BAE6FD" }}
                        >
                            Chỉnh sửa
                        </Button>
                    )}
                    {onViewTickets && (
                        <Button
                            variant="outlined"
                            startIcon={<ReceiptLongIcon />}
                            onClick={() => {
                                onClose();
                                onViewTickets(patient);
                            }}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#0088D6", borderColor: "#BAE6FD" }}
                        >
                            Xem phiếu khám
                        </Button>
                    )}
                    {onViewHistory && (
                        <Button
                            variant="outlined"
                            startIcon={<HistoryIcon />}
                            onClick={() => {
                                onClose();
                                onViewHistory(patient);
                            }}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#059669", borderColor: "#A7F3D0" }}
                        >
                            Xem lịch sử khám
                        </Button>
                    )}
                </Stack>

                <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, px: 3, bgcolor: "#0088D6", "&:hover": { bgcolor: "#0062A3" } }}
                >
                    Đóng cửa sổ
                </Button>
            </DialogActions>
        </Dialog>
    );
}
