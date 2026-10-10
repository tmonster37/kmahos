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
    Tooltip
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
import PaymentQRModal from "../../components/payment/PaymentQRModal";
import PaymentIcon from "@mui/icons-material/Payment";
import PrintIcon from "@mui/icons-material/Print";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import StarIcon from "@mui/icons-material/Star";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate, formatISODate, isValidPhoneNumber, isValidHealthInsurance } from "../../utils/formatters";
import { printAppointmentTicket } from "../../utils/printHelper";
import { useAuth } from "../../context/AuthContext";

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
    const [symptomTags, setSymptomTags] = useState([]);

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
    const [paymentMethod, setPaymentMethod] = useState("VIETQR"); // VIETQR, MOMO, VNPAY, WALLET, COUNTER
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [openQRModal, setOpenQRModal] = useState(false);
    const [bookingResult, setBookingResult] = useState(null);
    const [loadingBooking, setLoadingBooking] = useState(false);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [error, setError] = useState("");

    // Callback khi thanh toán VietQR / MoMo thành công
    const handleQRPaymentSuccess = (tx) => {
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
                    console.log("VietQR error:", e);
                    setActiveStep(4);
                }
            } else if (paymentMethod === "MOMO") {
                try {
                    const payRes = await axiosInstance.post(`/api/payment/momo/create?amount=${amount}&type=PAY_BOOKING`);
                    const payData = payRes?.data?.data || payRes?.data || payRes;
                    setPaymentModalData(payData);
                    setOpenQRModal(true);
                } catch (e) {
                    console.log("MoMo error:", e);
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
            } else if (paymentMethod === "VNPAY") {
                try {
                    const payRes = await axiosInstance.post(`/api/payment/vnpay/create-url?amount=${amount}&type=PAY_BOOKING`);
                    const url = typeof payRes === "string" ? payRes : (payRes?.data?.data || payRes?.data || payRes?.paymentUrl || "");
                    if (url) {
                        bookingData.paymentUrl = url;
                        setBookingResult({ ...bookingData, paymentUrl: url });
                    }
                    setActiveStep(4);
                } catch (e) {
                    console.log("VNPay generation skipped or offline", e);
                    setActiveStep(4);
                }
            } else {
                // Tiền mặt tại quầy
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
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header Title */}
            <Box mb={4} textAlign="center">
                <Chip icon={<LocalHospitalIcon />} label="HỆ THỐNG ĐẶT KHÁM CHUYÊN KHOA TRỰC TUYẾN" color="primary" sx={{ fontWeight: "bold", mb: 1.5, px: 1 }} />
                <Typography variant="h4" fontWeight="900" color="#002D5A" gutterBottom>
                    Đặt Lịch Khám Bệnh Trực Tuyến
                </Typography>
                <Typography variant="body1" color="textSecondary" maxWidth={700} mx="auto">
                    Chọn chuyên khoa, bác sĩ đầu ngành và khung giờ thuận tiện. Không cần xếp hàng chờ đợi, nhận số thứ tự và mã QR phiếu khám tức thì.
                </Typography>
            </Box>

            {/* Stepper Wizard Bar */}
            <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {STEPS.map((label, index) => (
                        <Step key={label} completed={activeStep > index}>
                            <StepLabel
                                StepIconProps={{
                                    sx: {
                                        "&.Mui-active": { color: "#0ea5e9" },
                                        "&.Mui-completed": { color: "#10b981" }
                                    }
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight={activeStep === index ? "bold" : "medium"} color={activeStep === index ? "primary.main" : "textSecondary"}>
                                    {label}
                                </Typography>
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError("")}>
                    {error}
                </Alert>
            )}

            {/* STEP 0: CHỌN CHUYÊN KHOA */}
            {activeStep === 0 && (
                <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" color="#002D5A">
                                Bước 1: Chọn Chuyên Khoa Phù Hợp
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
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
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                )
                            }}
                            sx={{ width: { xs: "100%", sm: 320 }, bgcolor: "white", borderRadius: 2 }}
                        />
                    </Box>

                    <Grid container spacing={3}>
                        {filteredDepartments.map((dept) => {
                            const isSelected = selectedDept?.departmentId === dept.departmentId;
                            return (
                                <Grid item xs={12} sm={6} md={4} key={dept.departmentId}>
                                    <Card
                                        onClick={() => setSelectedDept(dept)}
                                        sx={{
                                            height: "100%",
                                            cursor: "pointer",
                                            borderRadius: 3,
                                            transition: "all 0.3s ease",
                                            border: isSelected ? "2px solid #0ea5e9" : "1px solid #E2E8F0",
                                            bgcolor: isSelected ? "#F0F9FF" : "white",
                                            boxShadow: isSelected ? "0 10px 25px -5px rgba(14, 165, 233, 0.2)" : "0 1px 3px rgba(0,0,0,0.05)",
                                            "&:hover": {
                                                transform: "translateY(-4px)",
                                                boxShadow: "0 12px 24px -6px rgba(0,0,0,0.1)",
                                                borderColor: "#0ea5e9"
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                                <Avatar sx={{ bgcolor: isSelected ? "#0ea5e9" : "#E0F2FE", color: isSelected ? "white" : "#0284c7", width: 50, height: 50 }}>
                                                    <MedicalServicesIcon />
                                                </Avatar>
                                                {isSelected && (
                                                    <Chip label="Đang chọn" color="primary" size="small" sx={{ fontWeight: "bold" }} />
                                                )}
                                            </Box>
                                            <Typography variant="h6" fontWeight="bold" color="#002D5A" gutterBottom>
                                                {dept.departmentName}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" sx={{
                                                display: "-webkit-box",
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                                minHeight: 60
                                            }}>
                                                {dept.description || "Khám, chẩn đoán và điều trị chuyên sâu theo tiêu chuẩn quốc tế."}
                                            </Typography>
                                            <Divider sx={{ my: 2 }} />
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="caption" color="textSecondary">
                                                    Phòng khám: <b>{dept.rooms?.length || "Đầy đủ"}</b> buồng
                                                </Typography>
                                                <Button size="small" variant="text" endIcon={<ArrowForwardIcon />} sx={{ fontWeight: "bold" }}>
                                                    Chọn khoa
                                                </Button>
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
                            sx={{ px: 4, py: 1.5, borderRadius: 3, bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" }, fontWeight: "bold" }}
                        >
                            Tiếp tục: Chọn Bác Sĩ & Ngày Khám
                        </Button>
                    </Box>
                </Box>
            )}

            {/* STEP 1: CHỌN BÁC SĨ & NGÀY KHÁM */}
            {activeStep === 1 && (
                <Box>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <IconButton onClick={() => setActiveStep(0)} sx={{ bgcolor: "#F1F5F9" }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" color="#002D5A">
                                Bước 2: Chọn Ngày Khám & Bác Sĩ Chuyên Khoa
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Đang chọn chuyên khoa: <b style={{ color: "#0ea5e9" }}>{selectedDept?.departmentName}</b>
                            </Typography>
                        </Box>
                    </Box>

                    {/* Date Picker Bar with Quick Day Selectors */}
                    <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "white" }}>
                        <Typography variant="subtitle1" fontWeight="bold" color="#002D5A" mb={2}>
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
                                                color={isCurrent ? "primary" : "default"}
                                                variant={isCurrent ? "filled" : "outlined"}
                                                onClick={() => setSelectedDate(dateStr)}
                                                sx={{ py: 2.2, px: 1, fontWeight: isCurrent ? "bold" : "medium", borderRadius: 2 }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Danh sách Bác sĩ trực */}
                    <Typography variant="h6" fontWeight="bold" color="#002D5A" mb={2}>
                        Danh Sách Bác Sĩ Có Lịch Trực Ngày {formatDate(selectedDate)}:
                    </Typography>

                    {loadingSchedules ? (
                        <Box display="flex" justifyContent="center" py={6}>
                            <CircularProgress />
                        </Box>
                    ) : schedules.length === 0 ? (
                        <Alert severity="info" sx={{ p: 3, borderRadius: 3 }}>
                            Khoa <b>{selectedDept?.departmentName}</b> hiện chưa có lịch trực nào trong ngày <b>{formatDate(selectedDate)}</b>. Vui lòng chọn ngày khác hoặc chọn chuyên khoa khác.
                        </Alert>
                    ) : (
                        <Grid container spacing={3}>
                            {schedules.map((sch) => {
                                const isSelected = selectedDoctorSchedule?.scheduleId === sch.scheduleId;
                                return (
                                    <Grid item xs={12} md={6} key={sch.scheduleId}>
                                        <Card
                                            onClick={() => setSelectedDoctorSchedule(sch)}
                                            sx={{
                                                cursor: "pointer",
                                                borderRadius: 3,
                                                border: isSelected ? "2px solid #0ea5e9" : "1px solid #E2E8F0",
                                                bgcolor: isSelected ? "#F0F9FF" : "white",
                                                transition: "all 0.25s ease",
                                                "&:hover": {
                                                    borderColor: "#0ea5e9",
                                                    boxShadow: "0 8px 20px rgba(0,0,0,0.06)"
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <Box display="flex" gap={2}>
                                                    <Avatar
                                                        sx={{ width: 68, height: 68, bgcolor: "#0ea5e9", fontSize: 24, fontWeight: "bold" }}
                                                    >
                                                        {sch.doctorName ? sch.doctorName.charAt(0) : "BS"}
                                                    </Avatar>
                                                    <Box flexGrow={1}>
                                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                                            <Chip
                                                                label={sch.degree || "Bác sĩ Chuyên khoa"}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                                sx={{ fontWeight: "bold" }}
                                                            />
                                                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                                                {formatCurrency(sch.consultationFee || 200000)}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="h6" fontWeight="bold" color="#002D5A" mt={0.5}>
                                                            {sch.doctorName}
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary">
                                                            Phòng khám: <b>{sch.roomName}</b> | Ca: <b>{sch.session === "MORNING" ? "Sáng" : sch.session === "AFTERNOON" ? "Chiều" : "Tối"}</b>
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                                                            Khung giờ có sẵn: {sch.timeSlots?.length || 0} khung giờ
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}

                    <Box display="flex" justifyContent="space-between" mt={4}>
                        <Button variant="outlined" size="large" onClick={() => setActiveStep(0)} sx={{ borderRadius: 3, px: 3 }}>
                            Quay lại
                        </Button>
                        <Button
                            variant="contained"
                            size="large"
                            disabled={!selectedDoctorSchedule}
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => setActiveStep(2)}
                            sx={{ px: 4, borderRadius: 3, bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" }, fontWeight: "bold" }}
                        >
                            Tiếp tục: Chọn Khung Giờ
                        </Button>
                    </Box>
                </Box>
            )}

            {/* STEP 2: CHỌN KHUNG GIỜ KHÁM */}
            {activeStep === 2 && (
                <Box>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <IconButton onClick={() => setActiveStep(1)} sx={{ bgcolor: "#F1F5F9" }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" color="#002D5A">
                                Bước 3: Chọn Khung Giờ Khám Bệnh
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Bác sĩ: <b style={{ color: "#0ea5e9" }}>{selectedDoctorSchedule?.doctorName}</b> - Buồng: <b>{selectedDoctorSchedule?.roomName}</b> ({formatDate(selectedDate)})
                            </Typography>
                        </Box>
                    </Box>

                    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "white" }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                            <Typography variant="subtitle1" fontWeight="bold" color="#002D5A">
                                🕒 Các Khung Giờ Khám Còn Chỗ:
                            </Typography>
                            <Box display="flex" gap={1}>
                                <Chip label="Tất cả" clickable color={activeSession === "ALL" ? "primary" : "default"} onClick={() => setActiveSession("ALL")} />
                                <Chip label="🌅 Sáng" clickable color={activeSession === "MORNING" ? "primary" : "default"} onClick={() => setActiveSession("MORNING")} />
                                <Chip label="☀️ Chiều" clickable color={activeSession === "AFTERNOON" ? "primary" : "default"} onClick={() => setActiveSession("AFTERNOON")} />
                                <Chip label="🌙 Tối" clickable color={activeSession === "EVENING" ? "primary" : "default"} onClick={() => setActiveSession("EVENING")} />
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
                                            onClick={() => setSelectedSlot(slot)}
                                            sx={{
                                                py: 2,
                                                borderRadius: 3,
                                                flexDirection: "column",
                                                borderWidth: 2,
                                                borderColor: isSelected ? "#0ea5e9" : isFull ? "#CBD5E1" : "#E2E8F0",
                                                bgcolor: isSelected ? "#0ea5e9" : isFull ? "#F8FAFC" : "white",
                                                color: isSelected ? "white" : isFull ? "#94A3B8" : "#002D5A",
                                                "&:hover": {
                                                    borderWidth: 2,
                                                    borderColor: "#0ea5e9",
                                                    bgcolor: isSelected ? "#0284c7" : "#F0F9FF"
                                                }
                                            }}
                                        >
                                            <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                                <AccessTimeIcon fontSize="small" />
                                                <Typography variant="body1" fontWeight="bold">
                                                    {slot.startTime} - {slot.endTime}
                                                </Typography>
                                            </Box>
                                            <Typography variant="caption" sx={{ opacity: isSelected ? 0.9 : 0.7 }}>
                                                {isFull ? "Đã hết chỗ" : `Còn ${available}/${slot.maxCapacity} lượt`}
                                            </Typography>
                                        </Button>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Paper>

                    <Box display="flex" justifyContent="space-between" mt={4}>
                        <Button variant="outlined" size="large" onClick={() => setActiveStep(1)} sx={{ borderRadius: 3, px: 3 }}>
                            Quay lại
                        </Button>
                        <Button
                            variant="contained"
                            size="large"
                            disabled={!selectedSlot}
                            endIcon={<ArrowForwardIcon />}
                            onClick={() => setActiveStep(3)}
                            sx={{ px: 4, borderRadius: 3, bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" }, fontWeight: "bold" }}
                        >
                            Tiếp tục: Chọn Hồ Sơ Khám
                        </Button>
                    </Box>
                </Box>
            )}

            {/* STEP 3: CHỌN HỒ SƠ BỆNH NHÂN & NHẬP TRIỆU CHỨNG */}
            {activeStep === 3 && (
                <Box>
                    <Box display="flex" alignItems="center" gap={2} mb={3}>
                        <IconButton onClick={() => setActiveStep(2)} sx={{ bgcolor: "#F1F5F9" }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" color="#002D5A">
                                Bước 4: Chọn Hồ Sơ Người Khám & Triệu Chứng
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Chọn hồ sơ cá nhân hoặc người thân để bác sĩ xem trước tiền sử y tế
                            </Typography>
                        </Box>
                    </Box>

                    {!isAuthenticated ? (
                        <Alert severity="warning" sx={{ p: 3, borderRadius: 3, mb: 3 }} action={
                            <Button component={Link} to="/login?redirect=/booking" variant="contained" color="warning">
                                Đăng nhập ngay
                            </Button>
                        }>
                            Bạn cần đăng nhập tài khoản để quản lý hồ sơ y tế gia đình và nhận số thứ tự khám!
                        </Alert>
                    ) : (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={7}>
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "white", mb: 3 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="subtitle1" fontWeight="bold" color="#002D5A">
                                            👤 Danh Sách Hồ Sơ Y Tế Đã Lưu:
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            onClick={() => setOpenNewProfileModal(true)}
                                            sx={{ borderRadius: 2, fontWeight: "bold" }}
                                        >
                                            Thêm hồ sơ mới
                                        </Button>
                                    </Box>

                                    {profiles.length === 0 ? (
                                        <Box textAlign="center" py={4}>
                                            <Typography color="textSecondary" mb={2}>Chưa có hồ sơ y tế nào.</Typography>
                                            <Button variant="contained" onClick={() => setOpenNewProfileModal(true)}>
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
                                                            sx={{
                                                                cursor: "pointer",
                                                                borderRadius: 3,
                                                                border: isSelected ? "2px solid #0ea5e9" : "1px solid #E2E8F0",
                                                                bgcolor: isSelected ? "#F0F9FF" : "white",
                                                                transition: "0.2s",
                                                                "&:hover": { borderColor: "#0ea5e9" }
                                                            }}
                                                        >
                                                            <CardContent sx={{ p: 2 }}>
                                                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                                                    <Chip label={p.relationship || "Bản thân"} size="small" color={isSelected ? "primary" : "default"} />
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        {p.gender === "MALE" ? "Nam" : "Nữ"}
                                                                    </Typography>
                                                                </Box>
                                                                <Typography variant="subtitle1" fontWeight="bold" color="#002D5A">
                                                                    {p.fullName}
                                                                </Typography>
                                                                <Typography variant="body2" color="textSecondary">
                                                                    SĐT: {p.phoneNumber}
                                                                </Typography>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    Ngày sinh: {formatDate(p.dateOfBirth)}
                                                                </Typography>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    )}
                                </Paper>

                                {/* Nhập triệu chứng ban đầu */}
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "white" }}>
                                    <Typography variant="subtitle1" fontWeight="bold" color="#002D5A" mb={1}>
                                        🩺 Mô Tả Triệu Chứng / Lý Do Khám:
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" mb={2}>
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
                                    />
                                </Paper>
                            </Grid>

                            {/* Summary Card */}
                            <Grid item xs={12} md={5}>
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", position: "sticky", top: 100 }}>
                                    <Typography variant="h6" fontWeight="bold" color="#002D5A" gutterBottom>
                                        📋 Tóm Tắt Phiếu Khám
                                    </Typography>
                                    <Divider sx={{ my: 1.5 }} />
                                    <Box display="flex" flexDirection="column" gap={1.5}>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="textSecondary">Chuyên khoa:</Typography>
                                            <Typography fontWeight="bold">{selectedDept?.departmentName}</Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="textSecondary">Bác sĩ:</Typography>
                                            <Typography fontWeight="bold">{selectedDoctorSchedule?.doctorName}</Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="textSecondary">Phòng khám:</Typography>
                                            <Typography fontWeight="bold">{selectedDoctorSchedule?.roomName}</Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="textSecondary">Thời gian:</Typography>
                                            <Typography fontWeight="bold" color="primary.main">
                                                {selectedSlot?.startTime} - {selectedSlot?.endTime} ({formatDate(selectedDate)})
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography color="textSecondary">Bệnh nhân:</Typography>
                                            <Typography fontWeight="bold">{selectedProfile?.fullName || "Chưa chọn"}</Typography>
                                        </Box>
                                        <Divider sx={{ my: 1 }} />
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="subtitle1" fontWeight="bold">Phí khám:</Typography>
                                            <Typography variant="h6" fontWeight="900" color="success.main">
                                                {formatCurrency(selectedDoctorSchedule?.consultationFee || 200000)}
                                            </Typography>
                                        </Box>

                                        {/* Phương thức thanh toán */}
                                        <Box mt={2}>
                                            <Typography variant="subtitle2" fontWeight="bold" mb={1} color="#002D5A">
                                                Phương thức thanh toán viện phí:
                                            </Typography>
                                            <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1,
                                                        mb: 1,
                                                        borderRadius: 2,
                                                        borderColor: paymentMethod === "VIETQR" ? "#0ea5e9" : "#E2E8F0",
                                                        bgcolor: paymentMethod === "VIETQR" ? "#F0F9FF" : "white"
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="VIETQR"
                                                        control={<Radio size="small" />}
                                                        label={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <AccountBalanceIcon sx={{ color: "#0284c7", fontSize: 20 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        Chuyển khoản VietQR Napas 247
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        Quét mã bằng bất kỳ App Ngân hàng nào (0% phí)
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        }
                                                    />
                                                </Paper>

                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1,
                                                        mb: 1,
                                                        borderRadius: 2,
                                                        borderColor: paymentMethod === "MOMO" ? "#A50064" : "#E2E8F0",
                                                        bgcolor: paymentMethod === "MOMO" ? "#FDF2F8" : "white"
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="MOMO"
                                                        control={<Radio size="small" />}
                                                        label={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <PhoneAndroidIcon sx={{ color: "#A50064", fontSize: 20 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        Ví Điện Tử MoMo
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        Quét mã QR MoMo hoặc mở App MoMo
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        }
                                                    />
                                                </Paper>

                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1,
                                                        mb: 1,
                                                        borderRadius: 2,
                                                        borderColor: paymentMethod === "VNPAY" ? "#dc2626" : "#E2E8F0",
                                                        bgcolor: paymentMethod === "VNPAY" ? "#FEF2F2" : "white"
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="VNPAY"
                                                        control={<Radio size="small" />}
                                                        label={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <CreditCardIcon sx={{ color: "#dc2626", fontSize: 20 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        Cổng VNPay-QR
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        Thẻ ATM nội địa, Visa, Mastercard, JCB
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        }
                                                    />
                                                </Paper>

                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1,
                                                        mb: 1,
                                                        borderRadius: 2,
                                                        borderColor: paymentMethod === "WALLET" ? "#10b981" : "#E2E8F0",
                                                        bgcolor: paymentMethod === "WALLET" ? "#ECFDF5" : "white"
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="WALLET"
                                                        control={<Radio size="small" />}
                                                        label={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <AccountBalanceWalletIcon sx={{ color: "#10b981", fontSize: 20 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        Ví Viện Phí Nội Bộ
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        Trừ trực tiếp vào số dư tài khoản của bạn
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        }
                                                    />
                                                </Paper>

                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1,
                                                        borderRadius: 2,
                                                        borderColor: paymentMethod === "COUNTER" ? "#64748b" : "#E2E8F0",
                                                        bgcolor: paymentMethod === "COUNTER" ? "#F8FAFC" : "white"
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        value="COUNTER"
                                                        control={<Radio size="small" />}
                                                        label={
                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                <PointOfSaleIcon sx={{ color: "#64748b", fontSize: 20 }} />
                                                                <Box>
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        Thanh toán tiền mặt tại quầy
                                                                    </Typography>
                                                                    <Typography variant="caption" color="textSecondary">
                                                                        Nộp tiền tại Quầy Tiếp Đón Bệnh Viện khi đến khám
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
                                                mt: 2,
                                                py: 1.5,
                                                borderRadius: 3,
                                                bgcolor: "#0ea5e9",
                                                "&:hover": { bgcolor: "#0284c7" },
                                                fontWeight: "bold",
                                                fontSize: "1.05rem"
                                            }}
                                        >
                                            {loadingBooking ? <CircularProgress size={24} color="inherit" /> : "🎉 Hoàn Tất & Đặt Lịch Ngay"}
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            )}

            {/* STEP 4: XÁC NHẬN & XUẤT PHIẾU KHÁM ĐIỆN TỬ */}
            {activeStep === 4 && bookingResult && (
                <Box maxWidth={720} mx="auto">
                    <Paper
                        elevation={4}
                        sx={{
                            p: { xs: 3, md: 5 },
                            borderRadius: 4,
                            border: "2px solid #10b981",
                            bgcolor: "white",
                            textAlign: "center"
                        }}
                    >
                        <Avatar sx={{ bgcolor: "#ECFDF5", color: "#10b981", width: 80, height: 80, mx: "auto", mb: 2 }}>
                            <CheckCircleIcon sx={{ fontSize: 48 }} />
                        </Avatar>
                        <Typography variant="h4" fontWeight="900" color="#002D5A" gutterBottom>
                            ĐẶT LỊCH KHÁM THÀNH CÔNG!
                        </Typography>
                        <Typography variant="body1" color="textSecondary" mb={3}>
                            Phiếu khám điện tử của bạn đã được ghi nhận vào hệ thống điều phối hàng đợi bệnh viện.
                        </Typography>

                        {/* Queue Code Highlight Box */}
                        <Box sx={{ bgcolor: "#F0FDF4", border: "2px dashed #10b981", p: 3, borderRadius: 3, mb: 4 }}>
                            <Typography variant="body2" color="textSecondary">
                                SỐ THỨ TỰ KHÁM CỦA BẠN:
                            </Typography>
                            <Typography variant="h2" fontWeight="900" color="#10b981" my={1}>
                                #{bookingResult.queueNumber}
                            </Typography>
                            <Typography variant="h6" fontWeight="bold" color="#002D5A">
                                Mã tra cứu: <b>{bookingResult.bookingCode}</b>
                            </Typography>
                        </Box>

                        {/* Detail Info Grid */}
                        <Grid container spacing={2} sx={{ textAlign: "left", mb: 4 }}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="textSecondary">Họ và tên bệnh nhân:</Typography>
                                <Typography variant="subtitle1" fontWeight="bold">{bookingResult.patientName}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="textSecondary">Chuyên khoa:</Typography>
                                <Typography variant="subtitle1" fontWeight="bold">{bookingResult.departmentName}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="textSecondary">Bác sĩ phụ trách:</Typography>
                                <Typography variant="subtitle1" fontWeight="bold">BS. {bookingResult.doctorName}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="textSecondary">Phòng khám:</Typography>
                                <Typography variant="subtitle1" fontWeight="bold">{bookingResult.roomName}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="textSecondary">Khung giờ hẹn khám:</Typography>
                                <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                                    {bookingResult.startTime} - {bookingResult.endTime} ({formatDate(bookingResult.bookingDate)})
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="textSecondary">Phí khám:</Typography>
                                <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                                    {formatCurrency(bookingResult.price || 200000)}
                                </Typography>
                            </Grid>
                        </Grid>

                        {/* Action Buttons */}
                        <Box display="flex" flexWrap="wrap" gap={2} justifyContent="center">
                            {bookingResult.paymentUrl && (
                                <Button
                                    component="a"
                                    href={bookingResult.paymentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    variant="contained"
                                    color="error"
                                    size="large"
                                    startIcon={<PaymentIcon />}
                                    sx={{ py: 1.5, px: 3, borderRadius: 3, fontWeight: "bold" }}
                                >
                                    💳 Thanh toán VNPay-QR Ngay
                                </Button>
                            )}
                            <Button
                                component={Link}
                                to="/my-history"
                                variant="contained"
                                size="large"
                                sx={{ py: 1.5, px: 3, borderRadius: 3, bgcolor: "#0ea5e9", fontWeight: "bold" }}
                            >
                                📋 Xem Trong Lịch Sử Khám
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => printAppointmentTicket({
                                    bookingCode: bookingResult.bookingCode,
                                    patientName: bookingResult.patientName || selectedProfile?.fullName || "Bệnh nhân YouMed TNT",
                                    phoneNumber: selectedProfile?.phoneNumber || "---",
                                    departmentName: selectedDepartment?.name || "Khoa Khám Bệnh",
                                    doctorName: selectedDoctor?.fullName || "Bác sĩ chuyên khoa",
                                    bookingDate: formatDate(bookingDate),
                                    timeSlot: selectedSlot?.timeSlot || "Trong giờ hành chính",
                                    queueNumber: bookingResult.queueNumber,
                                    price: bookingResult.price || 200000
                                })}
                                startIcon={<PrintIcon />}
                                sx={{ py: 1.5, px: 3, borderRadius: 3 }}
                            >
                                In Phiếu Khám
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            )}

            {/* Modal Tạo Hồ Sơ Mới */}
            <Dialog open={openNewProfileModal} onClose={() => setOpenNewProfileModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle fontWeight="bold" color="#002D5A">
                    ➕ Thêm Hồ Sơ Khám Bệnh Mới
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} mt={0.5}>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth
                                label="Họ và tên đầy đủ"
                                value={newProfileData.fullName}
                                onChange={(e) => setNewProfileData({ ...newProfileData, fullName: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
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
                                label="Số điện thoại"
                                value={newProfileData.phoneNumber}
                                onChange={(e) => setNewProfileData({ ...newProfileData, phoneNumber: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Ngày sinh"
                                value={newProfileData.dateOfBirth}
                                onChange={(e) => setNewProfileData({ ...newProfileData, dateOfBirth: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
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
                                label="Mã thẻ BHYT (nếu có)"
                                value={newProfileData.healthInsuranceNumber}
                                onChange={(e) => setNewProfileData({ ...newProfileData, healthInsuranceNumber: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Địa chỉ cư trú"
                                value={newProfileData.address}
                                onChange={(e) => setNewProfileData({ ...newProfileData, address: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenNewProfileModal(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        disabled={creatingProfile}
                        onClick={handleCreateNewProfile}
                        sx={{ bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}
                    >
                        {creatingProfile ? <CircularProgress size={20} /> : "Lưu hồ sơ"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Quét Mã VietQR / MoMo cho Đặt Lịch Khám */}
            <PaymentQRModal
                open={openQRModal}
                onClose={() => setOpenQRModal(false)}
                paymentData={paymentModalData}
                onSuccess={handleQRPaymentSuccess}
            />
        </Container>
    );
}
