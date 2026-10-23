import React, { useState, useEffect } from "react";
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    TextField,
    Alert,
    Stepper,
    Step,
    StepLabel,
    Avatar,
    Divider,
    IconButton,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
    Select,
    MenuItem,
    InputLabel,
    Tooltip,
    Stack
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PaymentIcon from "@mui/icons-material/Payment";
import PrintIcon from "@mui/icons-material/Print";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import StarIcon from "@mui/icons-material/Star";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import VerifiedIcon from "@mui/icons-material/Verified";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ClearIcon from "@mui/icons-material/Clear";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import PaymentQRModal from "../../components/payment/PaymentQRModal";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate, formatISODate, isValidPhoneNumber, isValidHealthInsurance } from "../../utils/formatters";
import { printAppointmentTicket } from "../../utils/printHelper";
import { useAuth } from "../../context/AuthContext";
import designTokens from "../../theme/designTokens";

const STEPS = [
    "Chọn Chuyên Khoa",
    "Bác Sĩ & Ngày Khám",
    "Khung Giờ Khám",
    "Hồ Sơ Bệnh Nhân",
    "Xác Nhận & Cấp Phiếu"
];

export default function BookingPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const queryParams = new URLSearchParams(location.search);
    const paramDeptId = queryParams.get("departmentId");
    const paramSymptoms = queryParams.get("symptoms");

    // Stepper State
    const [activeStep, setActiveStep] = useState(0);

    // Data States
    const [departments, setDepartments] = useState([]);
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [deptSearch, setDeptSearch] = useState("");
    const [selectedDept, setSelectedDept] = useState(null);

    // Date & Schedule States
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [schedules, setSchedules] = useState([]);
    const [selectedDoctorSchedule, setSelectedDoctorSchedule] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [activeSession, setActiveSession] = useState("ALL"); // ALL, MORNING, AFTERNOON, EVENING

    // Profile & Symptoms States
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [symptoms, setSymptoms] = useState(paramSymptoms ? decodeURIComponent(paramSymptoms) : "");

    // New Profile Modal
    const [openNewProfileModal, setOpenNewProfileModal] = useState(false);
    const [newProfileData, setNewProfileData] = useState({
        fullName: "",
        relationship: "Bản thân",
        phoneNumber: "",
        dateOfBirth: "1990-01-01",
        gender: "MALE",
        address: "Hà Nội",
        healthInsuranceNumber: ""
    });
    const [creatingProfile, setCreatingProfile] = useState(false);

    // Payment & Confirmation States
    const [paymentMethod, setPaymentMethod] = useState("VIETQR"); // VIETQR (PayOS), WALLET, COUNTER
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [openQRModal, setOpenQRModal] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [loadingBooking, setLoadingBooking] = useState(false);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [error, setError] = useState("");

    // Holding Slot TTL 600s (10 phút)
    const [reservationId, setReservationId] = useState(null);
    const [holdingSecondsLeft, setHoldingSecondsLeft] = useState(null);

    useEffect(() => {
        if (!holdingSecondsLeft || holdingSecondsLeft <= 0) return;
        const interval = setInterval(() => {
            setHoldingSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setSelectedSlot(null);
                    setReservationId(null);
                    setError("Hết thời gian giữ chỗ (10 phút). Khung giờ khám đã được giải phóng tự động.");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [holdingSecondsLeft]);

    const handleSelectSlot = async (slot) => {
        if (selectedSlot?.timeSlotId === slot.timeSlotId) return;

        if (reservationId) {
            try {
                await axiosInstance.post(`/api/bookings/release-slot/${reservationId}`);
            } catch (e) {
                console.log("Giải phóng slot cũ:", e);
            }
        }

        try {
            const res = await axiosInstance.post("/api/bookings/reserve-slot", {
                timeSlotId: slot.timeSlotId,
                patientProfileId: selectedProfile?.patientProfileId
            });
            const resData = res?.data?.data || res?.data || res;
            setSelectedSlot(slot);
            setReservationId(resData.reservationId);
            setHoldingSecondsLeft(resData.ttlSeconds || 600);
            setError("");
        } catch (err) {
            console.error("Lỗi giữ chỗ slot:", err);
            setError(err.response?.data?.message || "Không thể giữ chỗ khung giờ này, vui lòng chọn khung giờ khác.");
        }
    };

    // Callback khi thanh toán Cổng PayOS (VietQR) thành công
    const handleQRPaymentSuccess = () => {
        setOpenQRModal(false);
        setActiveStep(4);
    };

    // 1. Tải danh mục Chuyên khoa & Hồ sơ
    useEffect(() => {
        axiosInstance.get("/api/departments").then((res) => {
            const list = (res && res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setDepartments(list);
            setFilteredDepartments(list);

            if (paramDeptId) {
                const found = list.find(d => String(d.departmentId) === String(paramDeptId));
                if (found) {
                    setSelectedDept(found);
                    setActiveStep(1);
                }
            }
        }).catch(() => {});

        if (isAuthenticated) {
            loadPatientProfiles();
        }
    }, [paramDeptId, isAuthenticated]);

    const loadPatientProfiles = () => {
        axiosInstance.get("/api/patient-profiles").then((res) => {
            const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setProfiles(list);
            if (list.length > 0 && !selectedProfile) {
                setSelectedProfile(list[0]);
            }
        }).catch(() => {});
    };

    // Filter departments by keyword
    useEffect(() => {
        if (!deptSearch.trim()) {
            setFilteredDepartments(departments);
        } else {
            const kw = deptSearch.toLowerCase();
            setFilteredDepartments(departments.filter(d =>
                d.departmentName?.toLowerCase().includes(kw) ||
                d.description?.toLowerCase().includes(kw)
            ));
        }
    }, [deptSearch, departments]);

    // Tải ca trực khi chọn Khoa hoặc Ngày
    useEffect(() => {
        if (selectedDept && selectedDate) {
            fetchSchedules();
        }
    }, [selectedDept, selectedDate]);

    const fetchSchedules = async () => {
        if (!selectedDept) return;
        setLoadingSchedules(true);
        setError("");
        try {
            const res = await axiosInstance.get(`/api/schedules/by-department?departmentId=${selectedDept.departmentId}&date=${selectedDate}`);
            const data = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setSchedules(data);
            if (data.length > 0) {
                setSelectedDoctorSchedule(data[0]);
            } else {
                setSelectedDoctorSchedule(null);
            }
            setSelectedSlot(null);
        } catch (err) {
            setSchedules([]);
            setSelectedDoctorSchedule(null);
            setError(err.response?.data?.message || err.message || "Không thể tải lịch khám của chuyên khoa. Vui lòng thử lại sau.");
        } finally {
            setLoadingSchedules(false);
        }
    };

    // Tạo hồ sơ mới nhanh
    const handleCreateNewProfile = async () => {
        if (!newProfileData.fullName || newProfileData.fullName.trim().length < 2) {
            setError("Vui lòng nhập họ và tên đầy đủ của bệnh nhân!");
            return;
        }
        if (!newProfileData.phoneNumber || !isValidPhoneNumber(newProfileData.phoneNumber)) {
            setError("Số điện thoại không hợp lệ! Vui lòng nhập đúng 10 số (bắt đầu bằng 03, 05, 07, 08, 09).");
            return;
        }
        if (newProfileData.healthInsuranceNumber && !isValidHealthInsurance(newProfileData.healthInsuranceNumber)) {
            setError("Mã thẻ BHYT không hợp lệ! Vui lòng nhập 10-15 ký tự chữ số.");
            return;
        }
        if (newProfileData.dateOfBirth) {
            const dob = new Date(newProfileData.dateOfBirth);
            if (dob > new Date()) {
                setError("Ngày sinh không thể lớn hơn ngày hiện tại!");
                return;
            }
        }

        setCreatingProfile(true);
        setError("");
        try {
            const payload = {
                ...newProfileData,
                dateOfBirth: formatISODate(newProfileData.dateOfBirth),
            };
            const res = await axiosInstance.post("/api/patient-profiles", payload);
            const created = res.data;
            setProfiles(prev => [created, ...prev]);
            setSelectedProfile(created);
            setOpenNewProfileModal(false);
            setNewProfileData({
                fullName: "",
                relationship: "Bản thân",
                phoneNumber: "",
                dateOfBirth: "1990-01-01",
                gender: "MALE",
                address: "Hà Nội",
                healthInsuranceNumber: ""
            });
        } catch (err) {
            setError(err.message || "Tạo hồ sơ thất bại");
        } finally {
            setCreatingProfile(false);
        }
    };

    // Đặt khám & Cấp phiếu
    const handleFinalBooking = async () => {
        if (!isAuthenticated) {
            navigate("/login?redirect=/booking");
            return;
        }
        if (!selectedProfile) {
            setError("Vui lòng chọn hồ sơ người khám bệnh!");
            return;
        }
        if (!selectedSlot) {
            setError("Vui lòng chọn khung giờ khám!");
            return;
        }

        setLoadingBooking(true);
        setError("");
        try {
            const res = await axiosInstance.post("/api/bookings", {
                patientProfileId: selectedProfile.patientProfileId,
                timeSlotId: selectedSlot.timeSlotId,
                symptoms: symptoms || "Khám tổng quát và tư vấn sức khỏe",
                reservationId: reservationId
            });
            const bookingData = res?.data?.data || res?.data || res;
            setBookingResult(bookingData);

            const amount = bookingData.price || selectedDoctorSchedule?.consultationFee || 200000;

            if (paymentMethod === "VIETQR") {
                try {
                    const payRes = await axiosInstance.post(`/api/payment/vietqr/create?amount=${amount}&type=PAY_BOOKING`);
                    const payData = payRes?.data?.data || payRes?.data || payRes;
                    setPaymentModalData(payData);
                    setOpenQRModal(true);
                } catch (e) {
                    console.log("PayOS / VietQR error:", e);
                    setActiveStep(4);
                }
            } else if (paymentMethod === "WALLET") {
                try {
                    await axiosInstance.post(`/api/payment/wallet/pay?amount=${amount}&type=PAY_BOOKING`);
                    setActiveStep(4);
                } catch (e) {
                    alert(e.message || "Số dư ví không đủ, vui lòng nạp thêm tiền hoặc chọn phương thức khác!");
                    return;
                }
            } else {
                // Tiền mặt tại quầy (COUNTER)
                setActiveStep(4);
            }
        } catch (err) {
            setError(err.message || "Đặt lịch thất bại, vui lòng thử lại!");
        } finally {
            setLoadingBooking(false);
        }
    };

    // Quick tag suggestions
    const QUICK_SYMPTOMS = [
        "Đau đầu, chóng mặt",
        "Tức ngực, hồi hộp",
        "Sốt cao, ho có đờm",
        "Đau bụng âm ỉ",
        "Đau nhức xương khớp",
        "Viêm họng rát cổ",
        "Khám sức khỏe tổng quát",
        "Tái khám theo hẹn"
    ];

    const addSymptomTag = (tag) => {
        if (symptoms.includes(tag)) return;
        setSymptoms(prev => prev ? `${prev}, ${tag}` : tag);
    };

    return (
        <Box sx={{ bgcolor: "#F8FAFC", minHeight: "100vh", py: { xs: 3, md: 5 }, pb: { xs: 12, md: 6 } }}>
            <Container maxWidth="xl">
                {/* Header Title Section */}
                <Box mb={3.5} textAlign="center">
                    <Box
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        sx={{
                            bgcolor: "#E0F2FE",
                            border: "1px solid #BAE6FD",
                            borderRadius: "9999px",
                            px: 2,
                            py: 0.5,
                            mb: 1.5
                        }}
                    >
                        <LocalHospitalIcon sx={{ color: "#0284C7", fontSize: 16 }} />
                        <Typography
                            sx={{
                                fontSize: "0.78rem",
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "#0369A1"
                            }}
                        >
                            HỆ THỐNG ĐẶT KHÁM CHUYÊN KHOA TRỰC TUYẾN 24/7
                        </Typography>
                    </Box>

                    <Typography
                        variant="h1"
                        component="h1"
                        sx={{
                            fontSize: { xs: "1.75rem", sm: "2.3rem", md: "2.6rem" },
                            fontWeight: 900,
                            letterSpacing: "-0.025em",
                            color: "#0F172A",
                            mb: 1
                        }}
                    >
                        Đặt Lịch Khám Bệnh Thông Minh
                    </Typography>

                    <Typography variant="body1" color="#64748B" maxWidth={680} mx="auto" sx={{ fontSize: "0.95rem" }}>
                        Chủ động chọn bác sĩ, khung giờ và nhận phiếu số thứ tự điện tử. Không cần bốc số xếp hàng, tích hợp thanh toán VietQR Napas 24/7.
                    </Typography>
                </Box>

                {/* Apple HIG Segmented Stepper */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, md: 2.5 },
                        mb: 3.5,
                        borderRadius: "16px",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        bgcolor: "#FFFFFF",
                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)"
                    }}
                >
                    <Stepper activeStep={activeStep} alternativeLabel>
                        {STEPS.map((label, index) => (
                            <Step key={label} completed={activeStep > index}>
                                <StepLabel
                                    StepIconProps={{
                                        sx: {
                                            "&.Mui-active": { color: "#0284C7" },
                                            "&.Mui-completed": { color: "#10B981" },
                                            fontSize: { xs: "1.3rem", md: "1.5rem" }
                                        }
                                    }}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        fontWeight={activeStep === index ? 800 : 600}
                                        color={activeStep === index ? "#0284C7" : activeStep > index ? "#0F172A" : "#94A3B8"}
                                        sx={{ fontSize: { xs: "0.72rem", sm: "0.82rem" } }}
                                    >
                                        {label}
                                    </Typography>
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Paper>

                {/* Holding Slot Alert Beacon */}
                {holdingSecondsLeft > 0 && selectedSlot && (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1.5,
                            p: 2,
                            mb: 3,
                            borderRadius: "14px",
                            bgcolor: "#FEF3C7",
                            border: "1px solid #FDE68A",
                            color: "#92400E"
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={1.2}>
                            <LockOutlinedIcon sx={{ color: "#D97706", fontSize: 20 }} />
                            <Typography variant="body2" fontWeight="600" sx={{ fontSize: "0.88rem" }}>
                                Đang giữ chỗ khung giờ <b>{selectedSlot.startTime} - {selectedSlot.endTime}</b> cho bạn. Thời gian còn lại:
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                bgcolor: "#FFFFFF",
                                px: 1.8,
                                py: 0.4,
                                borderRadius: "8px",
                                border: "1px solid #FCD34D",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.8
                            }}
                        >
                            <TimerOutlinedIcon sx={{ fontSize: 16, color: "#D97706" }} />
                            <Typography
                                variant="body2"
                                fontWeight="900"
                                color="#D97706"
                                sx={{ fontFamily: "monospace", fontSize: "0.95rem" }}
                            >
                                {String(Math.floor(holdingSecondsLeft / 60)).padStart(2, "0")}:{String(holdingSecondsLeft % 60).padStart(2, "0")}
                            </Typography>
                        </Box>
                    </Box>
                )}

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 3, borderRadius: "12px", border: "1px solid #FECACA" }}
                        onClose={() => setError("")}
                    >
                        {error}
                    </Alert>
                )}

                {/* =========================================================================
                    STEP 0: CHỌN CHUYÊN KHOA
                ========================================================================= */}
                {activeStep === 0 && (
                    <Box>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap={2} mb={3}>
                            <Box>
                                <Typography variant="h5" fontWeight="900" color="#0F172A" sx={{ fontSize: "1.35rem" }}>
                                    Bước 1: Chọn Chuyên Khoa Phù Hợp
                                </Typography>
                                <Typography variant="body2" color="#64748B">
                                    Tìm kiếm hoặc chọn chuyên khoa bạn cần thăm khám
                                </Typography>
                            </Box>
                            <TextField
                                size="small"
                                placeholder="Tìm kiếm chuyên khoa..."
                                value={deptSearch}
                                onChange={(e) => setDeptSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: "#94A3B8" }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: deptSearch ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setDeptSearch("")}>
                                                <ClearIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                    sx: { borderRadius: "10px", bgcolor: "#FFFFFF", width: { xs: "100%", sm: 300 } }
                                }}
                            />
                        </Box>

                        <Grid container spacing={2.5}>
                            {filteredDepartments.map((dept) => {
                                const isSelected = selectedDept?.departmentId === dept.departmentId;
                                return (
                                    <Grid item xs={12} sm={6} md={4} key={dept.departmentId}>
                                        <Card
                                            onClick={() => setSelectedDept(dept)}
                                            elevation={0}
                                            sx={{
                                                height: "100%",
                                                cursor: "pointer",
                                                borderRadius: "16px",
                                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                                border: isSelected ? "2px solid #0284C7" : "1px solid rgba(15, 23, 42, 0.08)",
                                                bgcolor: isSelected ? "#F0F9FF" : "#FFFFFF",
                                                boxShadow: isSelected ? "0 10px 25px -4px rgba(2, 132, 199, 0.16)" : "0 2px 8px rgba(15, 23, 42, 0.03)",
                                                "&:hover": {
                                                    transform: "translateY(-3px)",
                                                    borderColor: "#0284C7",
                                                    boxShadow: "0 12px 24px -6px rgba(2, 132, 199, 0.14)"
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 2.8 }}>
                                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                                                    <Avatar
                                                        sx={{
                                                            bgcolor: isSelected ? "#0284C7" : "#E0F2FE",
                                                            color: isSelected ? "#FFFFFF" : "#0284C7",
                                                            width: 46,
                                                            height: 46,
                                                            borderRadius: "12px",
                                                            border: `1px solid ${isSelected ? "#0284C7" : "#BAE6FD"}`
                                                        }}
                                                    >
                                                        <MedicalServicesIcon sx={{ fontSize: 22 }} />
                                                    </Avatar>
                                                    {isSelected && (
                                                        <Chip
                                                            label="Đang chọn"
                                                            size="small"
                                                            sx={{
                                                                bgcolor: "#0284C7",
                                                                color: "#FFFFFF",
                                                                fontWeight: 800,
                                                                fontSize: "0.72rem",
                                                                borderRadius: "6px"
                                                            }}
                                                        />
                                                    )}
                                                </Box>

                                                <Typography variant="h6" fontWeight="800" color="#0F172A" sx={{ fontSize: "1.02rem", mb: 0.5 }}>
                                                    {dept.departmentName}
                                                </Typography>

                                                <Typography
                                                    variant="body2"
                                                    color="#64748B"
                                                    sx={{
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                        minHeight: 40,
                                                        fontSize: "0.85rem",
                                                        lineHeight: 1.5
                                                    }}
                                                >
                                                    {dept.description || "Khám, chẩn đoán và điều trị chuyên sâu theo tiêu chuẩn quốc tế."}
                                                </Typography>

                                                <Divider sx={{ my: 1.5 }} />

                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Chip
                                                        icon={<MeetingRoomIcon sx={{ fontSize: "14px !important" }} />}
                                                        label={`Phòng: ${dept.rooms?.length || dept.totalRooms || 0} buồng`}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            fontSize: "0.7rem",
                                                            fontWeight: 600,
                                                            bgcolor: "#F1F5F9",
                                                            color: "#475569"
                                                        }}
                                                    />
                                                    <Typography variant="caption" fontWeight="700" color="#0284C7">
                                                        Chọn chuyên khoa →
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>

                        <Box display="flex" justifyContent="flex-end" mt={4}>
                            <Button
                                variant="contained"
                                size="large"
                                disabled={!selectedDept}
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => setActiveStep(1)}
                                sx={{
                                    bgcolor: "#0284C7",
                                    px: 4,
                                    py: 1.3,
                                    borderRadius: "12px",
                                    fontWeight: 800,
                                    fontSize: "0.95rem",
                                    boxShadow: "0 6px 16px rgba(2, 132, 199, 0.25)",
                                    "&:hover": { bgcolor: "#0369A1" }
                                }}
                            >
                                Tiếp tục: Bác Sĩ & Ngày Khám
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* =========================================================================
                    STEP 1: CHỌN BÁC SĨ & NGÀY KHÁM
                ========================================================================= */}
                {activeStep === 1 && (
                    <Box>
                        <Box display="flex" alignItems="center" gap={2} mb={3}>
                            <IconButton onClick={() => setActiveStep(0)} sx={{ bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                                <Typography variant="h5" fontWeight="900" color="#0F172A" sx={{ fontSize: "1.35rem" }}>
                                    Bước 2: Chọn Ngày Khám & Bác Sĩ Chuyên Khoa
                                </Typography>
                                <Typography variant="body2" color="#64748B">
                                    Chuyên khoa đã chọn: <b style={{ color: "#0284C7" }}>{selectedDept?.departmentName}</b>
                                </Typography>
                            </Box>
                        </Box>

                        {/* Date Picker Bar with Quick Day Selectors */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                mb: 3.5,
                                borderRadius: "16px",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                bgcolor: "#FFFFFF"
                            }}
                        >
                            <Typography variant="subtitle1" fontWeight="800" color="#0F172A" mb={1.8}>
                                📅 Chọn Ngày Thăm Khám
                            </Typography>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label="Ngày khám bệnh"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{ min: new Date().toISOString().split("T")[0] }}
                                        size="small"
                                        sx={{ bgcolor: "#F8FAFC" }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={8}>
                                    <Box display="flex" flexWrap="wrap" gap={1}>
                                        {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                                            const d = new Date();
                                            d.setDate(d.getDate() + offset);
                                            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                            const isToday = offset === 0;
                                            const isTomorrow = offset === 1;
                                            const labelText = isToday ? "Hôm nay" : isTomorrow ? "Ngày mai" : `Thứ ${d.getDay() === 0 ? "CN" : d.getDay() + 1} (${d.getDate()}/${d.getMonth() + 1})`;
                                            const isCurrent = selectedDate === dateStr;

                                            return (
                                                <Chip
                                                    key={dateStr}
                                                    label={labelText}
                                                    clickable
                                                    onClick={() => setSelectedDate(dateStr)}
                                                    sx={{
                                                        py: 2,
                                                        px: 0.5,
                                                        fontWeight: isCurrent ? 800 : 600,
                                                        borderRadius: "8px",
                                                        fontSize: "0.82rem",
                                                        border: "1px solid",
                                                        borderColor: isCurrent ? "#0284C7" : "#E2E8F0",
                                                        bgcolor: isCurrent ? "#0284C7" : "#F8FAFC",
                                                        color: isCurrent ? "#FFFFFF" : "#334155",
                                                        "&:hover": {
                                                            bgcolor: isCurrent ? "#0369A1" : "#E2E8F0"
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </Box>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Danh sách Bác sĩ trực */}
                        <Typography variant="h6" fontWeight="800" color="#0F172A" mb={2} sx={{ fontSize: "1.1rem" }}>
                            Danh Sách Bác Sĩ Có Lịch Trực ({formatDate(selectedDate)}):
                        </Typography>

                        {loadingSchedules ? (
                            <Box display="flex" justifyContent="center" py={6}>
                                <CircularProgress size={36} />
                            </Box>
                        ) : schedules.length === 0 ? (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    borderRadius: "16px",
                                    bgcolor: "#FFFFFF",
                                    border: "1px dashed #CBD5E1",
                                    textAlign: "center"
                                }}
                            >
                                <CalendarMonthIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
                                <Typography variant="subtitle1" fontWeight="800" color="#0F172A" gutterBottom>
                                    Khoa {selectedDept?.departmentName} chưa có lịch trực trong ngày {formatDate(selectedDate)}
                                </Typography>
                                <Typography variant="body2" color="#64748B" mb={2}>
                                    Vui lòng chọn ngày khác trong tuần hoặc chuyển sang chuyên khoa khác.
                                </Typography>
                            </Paper>
                        ) : (
                            <Grid container spacing={2.5}>
                                {schedules.map((sch) => {
                                    const isSelected = selectedDoctorSchedule?.scheduleId === sch.scheduleId;
                                    return (
                                        <Grid item xs={12} md={6} key={sch.scheduleId}>
                                            <Card
                                                onClick={() => setSelectedDoctorSchedule(sch)}
                                                elevation={0}
                                                sx={{
                                                    cursor: "pointer",
                                                    borderRadius: "16px",
                                                    p: 2.5,
                                                    border: isSelected ? "2px solid #0284C7" : "1px solid rgba(15, 23, 42, 0.08)",
                                                    bgcolor: isSelected ? "#F0F9FF" : "#FFFFFF",
                                                    boxShadow: isSelected ? "0 10px 24px -4px rgba(2, 132, 199, 0.16)" : "0 2px 8px rgba(15, 23, 42, 0.03)",
                                                    transition: "all 0.25s ease",
                                                    "&:hover": {
                                                        borderColor: "#0284C7",
                                                        transform: "translateY(-2px)"
                                                    }
                                                }}
                                            >
                                                <Box display="flex" gap={2}>
                                                    <Box position="relative">
                                                        <Avatar
                                                            sx={{
                                                                width: 64,
                                                                height: 64,
                                                                bgcolor: "#0284C7",
                                                                fontSize: "1.4rem",
                                                                fontWeight: 900
                                                            }}
                                                        >
                                                            {sch.doctorName ? sch.doctorName.charAt(0) : "BS"}
                                                        </Avatar>
                                                        <Box
                                                            sx={{
                                                                position: "absolute",
                                                                bottom: -2,
                                                                right: -2,
                                                                bgcolor: "#FFFFFF",
                                                                borderRadius: "50%",
                                                                display: "flex",
                                                                p: "2px"
                                                            }}
                                                        >
                                                            <VerifiedIcon sx={{ color: "#008C69", fontSize: 16 }} />
                                                        </Box>
                                                    </Box>

                                                    <Box flexGrow={1}>
                                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                                            <Chip
                                                                label={sch.degree || "Bác sĩ Chuyên khoa"}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    fontSize: "0.7rem",
                                                                    bgcolor: "#E0F2FE",
                                                                    color: "#0369A1",
                                                                    borderRadius: "6px"
                                                                }}
                                                            />
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight="900"
                                                                color="#15803D"
                                                                sx={{ fontFamily: "monospace", fontSize: "0.95rem" }}
                                                            >
                                                                {formatCurrency(sch.consultationFee || 200000)}
                                                            </Typography>
                                                        </Box>

                                                        <Typography variant="h6" fontWeight="800" color="#0F172A" sx={{ fontSize: "1.05rem" }}>
                                                            {sch.doctorName}
                                                        </Typography>

                                                        <Typography variant="body2" color="#64748B" sx={{ fontSize: "0.85rem", mt: 0.3 }}>
                                                            Phòng: <b>{sch.roomName}</b> | Ca: <b>{sch.session === "MORNING" ? "Sáng" : sch.session === "AFTERNOON" ? "Chiều" : "Tối"}</b>
                                                        </Typography>

                                                        <Typography variant="caption" color="#0284C7" fontWeight="700" display="block" mt={0.5}>
                                                            Khung giờ có sẵn: {sch.timeSlots?.length || 0} lượt
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        )}

                        <Box display="flex" justifyContent="space-between" mt={4}>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => setActiveStep(0)}
                                sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
                            >
                                Quay lại
                            </Button>
                            <Button
                                variant="contained"
                                size="large"
                                disabled={!selectedDoctorSchedule}
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => setActiveStep(2)}
                                sx={{
                                    bgcolor: "#0284C7",
                                    px: 4,
                                    borderRadius: "12px",
                                    fontWeight: 800,
                                    "&:hover": { bgcolor: "#0369A1" }
                                }}
                            >
                                Tiếp tục: Chọn Khung Giờ
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* =========================================================================
                    STEP 2: CHỌN KHUNG GIỜ KHÁM
                ========================================================================= */}
                {activeStep === 2 && (
                    <Box>
                        <Box display="flex" alignItems="center" gap={2} mb={3}>
                            <IconButton onClick={() => setActiveStep(1)} sx={{ bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                                <Typography variant="h5" fontWeight="900" color="#0F172A" sx={{ fontSize: "1.35rem" }}>
                                    Bước 3: Chọn Khung Giờ Khám Bệnh
                                </Typography>
                                <Typography variant="body2" color="#64748B">
                                    Bác sĩ: <b style={{ color: "#0284C7" }}>{selectedDoctorSchedule?.doctorName}</b> - Phòng: <b>{selectedDoctorSchedule?.roomName}</b> ({formatDate(selectedDate)})
                                </Typography>
                            </Box>
                        </Box>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 3.5,
                                borderRadius: "16px",
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                bgcolor: "#FFFFFF"
                            }}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                                <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                                    🕒 Khung Giờ Thăm Khám Còn Chỗ:
                                </Typography>
                                <Box display="flex" gap={1}>
                                    {[
                                        { id: "ALL", label: "Tất cả" },
                                        { id: "MORNING", label: "🌅 Sáng" },
                                        { id: "AFTERNOON", label: "☀️ Chiều" },
                                        { id: "EVENING", label: "🌙 Tối" }
                                    ].map(s => (
                                        <Chip
                                            key={s.id}
                                            label={s.label}
                                            clickable
                                            onClick={() => setActiveSession(s.id)}
                                            sx={{
                                                fontWeight: activeSession === s.id ? 800 : 600,
                                                borderRadius: "8px",
                                                bgcolor: activeSession === s.id ? "#0284C7" : "#F1F5F9",
                                                color: activeSession === s.id ? "#FFFFFF" : "#334155"
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>

                            <Grid container spacing={2}>
                                {selectedDoctorSchedule?.timeSlots?.map((slot) => {
                                    const isSelected = selectedSlot?.timeSlotId === slot.timeSlotId;
                                    const isFull = slot.isFull || (slot.currentBookings >= slot.maxCapacity);
                                    const available = Math.max(0, slot.maxCapacity - slot.currentBookings);

                                    return (
                                        <Grid item xs={6} sm={4} md={3} key={slot.timeSlotId}>
                                            <Button
                                                fullWidth
                                                disabled={isFull}
                                                variant={isSelected ? "contained" : "outlined"}
                                                onClick={() => handleSelectSlot(slot)}
                                                sx={{
                                                    py: 1.8,
                                                    borderRadius: "12px",
                                                    flexDirection: "column",
                                                    borderWidth: 1.5,
                                                    borderColor: isSelected ? "#0284C7" : isFull ? "#E2E8F0" : "#CBD5E1",
                                                    bgcolor: isSelected ? "#0284C7" : isFull ? "#F8FAFC" : "#FFFFFF",
                                                    color: isSelected ? "#FFFFFF" : isFull ? "#94A3B8" : "#0F172A",
                                                    transition: "all 0.2s ease",
                                                    "&:hover": {
                                                        borderWidth: 1.5,
                                                        borderColor: "#0284C7",
                                                        bgcolor: isSelected ? "#0369A1" : "#E0F2FE"
                                                    }
                                                }}
                                            >
                                                <Box display="flex" alignItems="center" gap={0.6} mb={0.4}>
                                                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                                                    <Typography variant="body2" fontWeight="800" sx={{ fontFamily: "monospace" }}>
                                                        {slot.startTime} - {slot.endTime}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" sx={{ opacity: isSelected ? 0.95 : 0.75, fontSize: "0.72rem" }}>
                                                    {isFull ? "Đã hết chỗ" : `Còn ${available}/${slot.maxCapacity} lượt`}
                                                </Typography>
                                            </Button>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Paper>

                        <Box display="flex" justifyContent="space-between" mt={4}>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => setActiveStep(1)}
                                sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
                            >
                                Quay lại
                            </Button>
                            <Button
                                variant="contained"
                                size="large"
                                disabled={!selectedSlot}
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => setActiveStep(3)}
                                sx={{
                                    bgcolor: "#0284C7",
                                    px: 4,
                                    borderRadius: "12px",
                                    fontWeight: 800,
                                    "&:hover": { bgcolor: "#0369A1" }
                                }}
                            >
                                Tiếp tục: Chọn Hồ Sơ Khám
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* =========================================================================
                    STEP 3: CHỌN HỒ SƠ BỆNH NHÂN & NHẬP TRIỆU CHỨNG
                ========================================================================= */}
                {activeStep === 3 && (
                    <Box>
                        <Box display="flex" alignItems="center" gap={2} mb={3}>
                            <IconButton onClick={() => setActiveStep(2)} sx={{ bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Box>
                                <Typography variant="h5" fontWeight="900" color="#0F172A" sx={{ fontSize: "1.35rem" }}>
                                    Bước 4: Chọn Hồ Sơ Người Khám & Triệu Chứng
                                </Typography>
                                <Typography variant="body2" color="#64748B">
                                    Chọn hồ sơ cá nhân hoặc người thân để bác sĩ xem trước tiền sử y tế
                                </Typography>
                            </Box>
                        </Box>

                        {!isAuthenticated ? (
                            <Alert
                                severity="warning"
                                sx={{ p: 3, borderRadius: "14px", mb: 3 }}
                                action={
                                    <Button
                                        component={Link}
                                        to="/login?redirect=/booking"
                                        variant="contained"
                                        color="warning"
                                        sx={{ fontWeight: 800, borderRadius: "8px" }}
                                    >
                                        Đăng nhập ngay
                                    </Button>
                                }
                            >
                                Bạn cần đăng nhập tài khoản để quản lý hồ sơ y tế gia đình và nhận số thứ tự khám!
                            </Alert>
                        ) : (
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={7}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            borderRadius: "16px",
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            bgcolor: "#FFFFFF",
                                            mb: 3
                                        }}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                                                👤 Danh Sách Hồ Sơ Y Tế Đã Lưu:
                                            </Typography>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<AddIcon />}
                                                onClick={() => setOpenNewProfileModal(true)}
                                                sx={{ borderRadius: "8px", fontWeight: 700, borderColor: "#CBD5E1" }}
                                            >
                                                Thêm hồ sơ mới
                                            </Button>
                                        </Box>

                                        {profiles.length === 0 ? (
                                            <Box textAlign="center" py={4}>
                                                <Typography color="#64748B" mb={2}>Chưa có hồ sơ y tế nào.</Typography>
                                                <Button
                                                    variant="contained"
                                                    onClick={() => setOpenNewProfileModal(true)}
                                                    sx={{ bgcolor: "#0284C7", borderRadius: "10px", fontWeight: 700 }}
                                                >
                                                    Tạo hồ sơ bệnh nhân đầu tiên
                                                </Button>
                                            </Box>
                                        ) : (
                                            <Grid container spacing={2}>
                                                {profiles.map((p) => {
                                                    const isSelected = selectedProfile?.patientProfileId === p.patientProfileId;
                                                    return (
                                                        <Grid item xs={12} sm={6} key={p.patientProfileId}>
                                                            <Card
                                                                onClick={() => setSelectedProfile(p)}
                                                                elevation={0}
                                                                sx={{
                                                                    cursor: "pointer",
                                                                    borderRadius: "14px",
                                                                    border: isSelected ? "2px solid #0284C7" : "1px solid rgba(15, 23, 42, 0.08)",
                                                                    bgcolor: isSelected ? "#F0F9FF" : "#FFFFFF",
                                                                    p: 2,
                                                                    transition: "0.2s",
                                                                    "&:hover": { borderColor: "#0284C7" }
                                                                }}
                                                            >
                                                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                                                    <Chip
                                                                        label={p.relationship || "Bản thân"}
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: isSelected ? "#0284C7" : "#E2E8F0",
                                                                            color: isSelected ? "#FFFFFF" : "#334155",
                                                                            fontWeight: 800,
                                                                            borderRadius: "6px",
                                                                            fontSize: "0.7rem"
                                                                        }}
                                                                    />
                                                                    <Typography variant="caption" color="#64748B">
                                                                        {p.gender === "MALE" ? "Nam" : "Nữ"}
                                                                    </Typography>
                                                                </Box>
                                                                <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                                                                    {p.fullName}
                                                                </Typography>
                                                                <Typography variant="body2" color="#64748B" sx={{ fontSize: "0.82rem" }}>
                                                                    SĐT: <b>{p.phoneNumber}</b>
                                                                </Typography>
                                                                <Typography variant="caption" color="#64748B">
                                                                    Ngày sinh: {formatDate(p.dateOfBirth)}
                                                                </Typography>
                                                            </Card>
                                                        </Grid>
                                                    );
                                                })}
                                            </Grid>
                                        )}
                                    </Paper>

                                    {/* Nhập triệu chứng ban đầu */}
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            borderRadius: "16px",
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            bgcolor: "#FFFFFF"
                                        }}
                                    >
                                        <Typography variant="subtitle1" fontWeight="800" color="#0F172A" mb={1}>
                                            🩺 Mô Tả Triệu Chứng / Lý Do Khám:
                                        </Typography>
                                        <Typography variant="body2" color="#64748B" mb={2} sx={{ fontSize: "0.85rem" }}>
                                            Bấm vào các gợi ý nhanh bên dưới hoặc nhập chi tiết tình trạng sức khỏe:
                                        </Typography>
                                        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                                            {QUICK_SYMPTOMS.map((tag) => (
                                                <Chip
                                                    key={tag}
                                                    label={tag}
                                                    clickable
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => addSymptomTag(tag)}
                                                    sx={{ borderRadius: "6px", fontSize: "0.75rem", borderColor: "#CBD5E1" }}
                                                />
                                            ))}
                                        </Box>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            placeholder="Ví dụ: Đau đầu nhiều ngày, tức ngực bên trái khi gắng sức, đã uống thuốc giảm đau nhưng không đỡ..."
                                            value={symptoms}
                                            onChange={(e) => setSymptoms(e.target.value)}
                                            sx={{ bgcolor: "#F8FAFC" }}
                                        />
                                    </Paper>
                                </Grid>

                                {/* Sticky Summary Card */}
                                <Grid item xs={12} md={5}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3.5,
                                            borderRadius: "18px",
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            bgcolor: "#FFFFFF",
                                            position: "sticky",
                                            top: 90,
                                            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)"
                                        }}
                                    >
                                        <Typography variant="h6" fontWeight="900" color="#0F172A" gutterBottom sx={{ fontSize: "1.1rem" }}>
                                            📋 Tóm Tắt Phiếu Khám
                                        </Typography>
                                        <Divider sx={{ my: 1.5 }} />

                                        <Stack spacing={1.2}>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography color="#64748B" variant="body2">Chuyên khoa:</Typography>
                                                <Typography fontWeight="700" color="#0F172A" variant="body2">{selectedDept?.departmentName}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography color="#64748B" variant="body2">Bác sĩ:</Typography>
                                                <Typography fontWeight="700" color="#0F172A" variant="body2">{selectedDoctorSchedule?.doctorName}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography color="#64748B" variant="body2">Phòng khám:</Typography>
                                                <Typography fontWeight="700" color="#0F172A" variant="body2">{selectedDoctorSchedule?.roomName}</Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography color="#64748B" variant="body2">Thời gian:</Typography>
                                                <Typography fontWeight="800" color="#0284C7" variant="body2">
                                                    {selectedSlot?.startTime} - {selectedSlot?.endTime} ({formatDate(selectedDate)})
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <Typography color="#64748B" variant="body2">Bệnh nhân:</Typography>
                                                <Typography fontWeight="700" color="#0F172A" variant="body2">{selectedProfile?.fullName || "Chưa chọn"}</Typography>
                                            </Box>
                                        </Stack>

                                        <Divider sx={{ my: 1.8 }} />

                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle2" fontWeight="800" color="#0F172A">
                                                Phí khám chuyên khoa:
                                            </Typography>
                                            <Typography
                                                variant="h6"
                                                fontWeight="900"
                                                color="#15803D"
                                                sx={{ fontFamily: "monospace", fontSize: "1.15rem" }}
                                            >
                                                {formatCurrency(selectedDoctorSchedule?.consultationFee || 200000)}
                                            </Typography>
                                        </Box>

                                        {/* Phương thức thanh toán */}
                                        <Box mt={2.5}>
                                            <Typography variant="subtitle2" fontWeight="800" mb={1.2} color="#0F172A" sx={{ fontSize: "0.85rem" }}>
                                                Phương thức thanh toán viện phí:
                                            </Typography>
                                            <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        p: 1.2,
                                                        mb: 1,
                                                        borderRadius: "10px",
                                                        border: "1px solid",
                                                        borderColor: paymentMethod === "VIETQR" ? "#0284C7" : "#E2E8F0",
                                                        bgcolor: paymentMethod === "VIETQR" ? "#F0F9FF" : "#FFFFFF"
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="VIETQR"
                                                        control={<Radio size="small" />}
                                                        label={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <AccountBalanceIcon sx={{ color: "#0284C7", fontSize: 20 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="800" color="#0F172A">
                                                                        PayOS VietQR (Napas 24/7)
                                                                    </Typography>
                                                                    <Typography variant="caption" color="#64748B">
                                                                        Chuyển khoản Open Banking mọi ngân hàng (0% phí)
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        }
                                                    />
                                                </Paper>

                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        p: 1.2,
                                                        mb: 1,
                                                        borderRadius: "10px",
                                                        border: "1px solid",
                                                        borderColor: paymentMethod === "WALLET" ? "#10B981" : "#E2E8F0",
                                                        bgcolor: paymentMethod === "WALLET" ? "#ECFDF5" : "#FFFFFF"
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="WALLET"
                                                        control={<Radio size="small" />}
                                                        label={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <AccountBalanceWalletIcon sx={{ color: "#10B981", fontSize: 20 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="800" color="#0F172A">
                                                                        Ví Viện Phí Nội Bộ
                                                                    </Typography>
                                                                    <Typography variant="caption" color="#64748B">
                                                                        Trừ trực tiếp vào số dư ví của bạn
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        }
                                                    />
                                                </Paper>

                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        p: 1.2,
                                                        borderRadius: "10px",
                                                        border: "1px solid",
                                                        borderColor: paymentMethod === "COUNTER" ? "#64748B" : "#E2E8F0",
                                                        bgcolor: paymentMethod === "COUNTER" ? "#F8FAFC" : "#FFFFFF"
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="COUNTER"
                                                        control={<Radio size="small" />}
                                                        label={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <PointOfSaleIcon sx={{ color: "#64748B", fontSize: 20 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="800" color="#0F172A">
                                                                        Thanh toán tiền mặt tại quầy
                                                                    </Typography>
                                                                    <Typography variant="caption" color="#64748B">
                                                                        Nộp tiền tại Quầy Tiếp Đón khi đến khám
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        }
                                                    />
                                                </Paper>
                                            </RadioGroup>
                                        </Box>

                                        <Button
                                            fullWidth
                                            variant="contained"
                                            size="large"
                                            disabled={loadingBooking || !selectedProfile}
                                            onClick={handleFinalBooking}
                                            sx={{
                                                mt: 2.5,
                                                py: 1.4,
                                                borderRadius: "12px",
                                                bgcolor: "#0284C7",
                                                fontWeight: 800,
                                                fontSize: "0.98rem",
                                                boxShadow: "0 6px 16px rgba(2, 132, 199, 0.25)",
                                                "&:hover": { bgcolor: "#0369A1" }
                                            }}
                                        >
                                            {loadingBooking ? <CircularProgress size={24} color="inherit" /> : "🎉 Hoàn Tất & Nhận STT Khám"}
                                        </Button>
                                    </Paper>
                                </Grid>
                            </Grid>
                        )}
                    </Box>
                )}

                {/* =========================================================================
                    STEP 4: XÁC NHẬN & XUẤT PHIẾU KHÁM ĐIỆN TỬ
                ========================================================================= */}
                {activeStep === 4 && bookingResult && (
                    <Box maxWidth={720} mx="auto">
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 3, md: 5 },
                                borderRadius: "24px",
                                border: "2px solid #10B981",
                                bgcolor: "#FFFFFF",
                                textAlign: "center",
                                boxShadow: "0 12px 36px rgba(16, 185, 129, 0.12)"
                            }}
                        >
                            <Avatar
                                sx={{
                                    bgcolor: "#ECFDF5",
                                    color: "#10B981",
                                    width: 76,
                                    height: 76,
                                    mx: "auto",
                                    mb: 2,
                                    border: "2px solid #A7F3D0"
                                }}
                            >
                                <CheckCircleIcon sx={{ fontSize: 44 }} />
                            </Avatar>

                            <Typography variant="h4" fontWeight="900" color="#0F172A" gutterBottom sx={{ fontSize: { xs: "1.6rem", md: "2rem" } }}>
                                ĐẶT LỊCH KHÁM THÀNH CÔNG!
                            </Typography>
                            <Typography variant="body2" color="#64748B" mb={3.5}>
                                Phiếu khám điện tử của bạn đã được ghi nhận vào hệ thống điều phối hàng đợi bệnh viện.
                            </Typography>

                            {/* Queue Code Highlight Box */}
                            <Box
                                sx={{
                                    bgcolor: "#F0FDF4",
                                    border: "2px dashed #10B981",
                                    p: 3,
                                    borderRadius: "16px",
                                    mb: 3.5
                                }}
                            >
                                <Typography variant="caption" color="#15803D" fontWeight="800" sx={{ letterSpacing: "0.06em" }}>
                                    SỐ THỨ TỰ KHÁM CỦA BẠN HÔM NAY:
                                </Typography>
                                <Typography
                                    variant="h1"
                                    fontWeight="900"
                                    color="#10B981"
                                    my={0.5}
                                    sx={{ fontFamily: "monospace", fontSize: { xs: "3.2rem", md: "4.2rem" } }}
                                >
                                    #{bookingResult.queueNumber}
                                </Typography>
                                <Typography variant="body2" fontWeight="700" color="#0F172A">
                                    Mã phiếu khám: <b style={{ color: "#0284C7" }}>{bookingResult.bookingCode}</b>
                                </Typography>
                            </Box>

                            {/* Detail Info Grid */}
                            <Grid container spacing={2} sx={{ textAlign: "left", mb: 3.5 }}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="#64748B">Bệnh nhân:</Typography>
                                    <Typography variant="subtitle2" fontWeight="800" color="#0F172A">{bookingResult.patientName}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="#64748B">Chuyên khoa:</Typography>
                                    <Typography variant="subtitle2" fontWeight="800" color="#0F172A">{bookingResult.departmentName}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="#64748B">Bác sĩ phụ trách:</Typography>
                                    <Typography variant="subtitle2" fontWeight="800" color="#0F172A">BS. {bookingResult.doctorName}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="#64748B">Phòng khám:</Typography>
                                    <Typography variant="subtitle2" fontWeight="800" color="#0F172A">{bookingResult.roomName}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="#64748B">Khung giờ hẹn khám:</Typography>
                                    <Typography variant="subtitle2" fontWeight="800" color="#0284C7">
                                        {bookingResult.startTime} - {bookingResult.endTime} ({formatDate(bookingResult.bookingDate)})
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="#64748B">Phí khám:</Typography>
                                    <Typography variant="subtitle2" fontWeight="900" color="#15803D" sx={{ fontFamily: "monospace" }}>
                                        {formatCurrency(bookingResult.price || 200000)}
                                    </Typography>
                                </Grid>
                            </Grid>

                            {/* Action Buttons */}
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
                                {bookingResult.paymentUrl && (
                                    <Button
                                        component="a"
                                        href={bookingResult.paymentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        variant="contained"
                                        size="large"
                                        startIcon={<PaymentIcon />}
                                        sx={{
                                            py: 1.3,
                                            px: 3,
                                            borderRadius: "12px",
                                            fontWeight: 800,
                                            bgcolor: "#0284C7",
                                            "&:hover": { bgcolor: "#0369A1" }
                                        }}
                                    >
                                        Mở Cổng Thanh Toán PayOS
                                    </Button>
                                )}
                                <Button
                                    component={Link}
                                    to="/my-history"
                                    variant="outlined"
                                    size="large"
                                    sx={{ py: 1.3, px: 3, borderRadius: "12px", fontWeight: 700 }}
                                >
                                    Xem Lịch Sử Khám
                                </Button>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    size="large"
                                    onClick={() => printAppointmentTicket({
                                        bookingCode: bookingResult.bookingCode,
                                        patientName: bookingResult.patientName || selectedProfile?.fullName || "Bệnh nhân YouMed TNT",
                                        phoneNumber: selectedProfile?.phoneNumber || "---",
                                        departmentName: bookingResult.departmentName || selectedDept?.departmentName || "Khoa Khám Bệnh",
                                        doctorName: bookingResult.doctorName || selectedDoctorSchedule?.doctorName || "Bác sĩ chuyên khoa",
                                        bookingDate: formatDate(bookingResult.bookingDate || selectedDate),
                                        timeSlot: selectedSlot?.timeSlot || (bookingResult.startTime && bookingResult.endTime ? `${bookingResult.startTime} - ${bookingResult.endTime}` : "Trong giờ hành chính"),
                                        queueNumber: bookingResult.queueNumber,
                                        price: bookingResult.price || 200000
                                    })}
                                    startIcon={<PrintIcon />}
                                    sx={{ py: 1.3, px: 3, borderRadius: "12px", fontWeight: 800 }}
                                >
                                    In Phiếu Khám
                                </Button>
                            </Stack>
                        </Paper>
                    </Box>
                )}

                {/* Modal Tạo Hồ Sơ Mới */}
                <Dialog
                    open={openNewProfileModal}
                    onClose={() => setOpenNewProfileModal(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: "18px" } }}
                >
                    <DialogTitle fontWeight="800" color="#0F172A" sx={{ borderBottom: "1px solid #E2E8F0" }}>
                        ➕ Thêm Hồ Sơ Khám Bệnh Mới
                    </DialogTitle>
                    <DialogContent sx={{ pt: 2.5 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Họ và tên đầy đủ"
                                    value={newProfileData.fullName}
                                    onChange={(e) => setNewProfileData({ ...newProfileData, fullName: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Quan hệ</InputLabel>
                                    <Select
                                        value={newProfileData.relationship}
                                        label="Quan hệ"
                                        onChange={(e) => setNewProfileData({ ...newProfileData, relationship: e.target.value })}
                                    >
                                        <MenuItem value="Bản thân">Bản thân</MenuItem>
                                        <MenuItem value="Bố">Bố</MenuItem>
                                        <MenuItem value="Mẹ">Mẹ</MenuItem>
                                        <MenuItem value="Vợ/Chồng">Vợ/Chồng</MenuItem>
                                        <MenuItem value="Con">Con</MenuItem>
                                        <MenuItem value="Người thân khác">Khác</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Số điện thoại"
                                    value={newProfileData.phoneNumber}
                                    onChange={(e) => setNewProfileData({ ...newProfileData, phoneNumber: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Ngày sinh"
                                    value={newProfileData.dateOfBirth}
                                    onChange={(e) => setNewProfileData({ ...newProfileData, dateOfBirth: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Giới tính</InputLabel>
                                    <Select
                                        value={newProfileData.gender}
                                        label="Giới tính"
                                        onChange={(e) => setNewProfileData({ ...newProfileData, gender: e.target.value })}
                                    >
                                        <MenuItem value="MALE">Nam</MenuItem>
                                        <MenuItem value="FEMALE">Nữ</MenuItem>
                                        <MenuItem value="OTHER">Khác</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Mã thẻ BHYT (nếu có)"
                                    value={newProfileData.healthInsuranceNumber}
                                    onChange={(e) => setNewProfileData({ ...newProfileData, healthInsuranceNumber: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Địa chỉ cư trú"
                                    value={newProfileData.address}
                                    onChange={(e) => setNewProfileData({ ...newProfileData, address: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
                        <Button onClick={() => setOpenNewProfileModal(false)} sx={{ fontWeight: 600 }}>Hủy</Button>
                        <Button
                            variant="contained"
                            disabled={creatingProfile}
                            onClick={handleCreateNewProfile}
                            sx={{ bgcolor: "#0284C7", borderRadius: "10px", fontWeight: 700, "&:hover": { bgcolor: "#0369A1" } }}
                        >
                            {creatingProfile ? <CircularProgress size={20} /> : "Lưu hồ sơ"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Modal Cổng Thanh Toán PayOS (VietQR) cho Đặt Lịch Khám */}
                <PaymentQRModal
                    open={openQRModal}
                    onClose={() => setOpenQRModal(false)}
                    paymentData={paymentModalData}
                    onSuccess={handleQRPaymentSuccess}
                />
            </Container>
        </Box>
    );
}
