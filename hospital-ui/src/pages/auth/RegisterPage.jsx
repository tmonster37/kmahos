import React, { useState } from "react";
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    Grid,
    InputAdornment,
    Divider,
    CircularProgress
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/AxiosInstance";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: "",
        phoneNumber: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        
        const errors = {};
        const cleanName = formData.fullName.trim();
        if (!cleanName || cleanName.length < 2) {
            errors.fullName = "Họ và tên bệnh nhân phải có ít nhất 2 ký tự!";
        } else if (cleanName.length > 100) {
            errors.fullName = "Họ và tên bệnh nhân không vượt quá 100 ký tự!";
        }

        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})$/;
        const cleanPhone = formData.phoneNumber.trim();
        if (!phoneRegex.test(cleanPhone)) {
            errors.phoneNumber = "Số điện thoại không hợp lệ! Vui lòng nhập 10 chữ số (ví dụ: 0987654321).";
        }

        const cleanEmail = formData.email.trim();
        if (cleanEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanEmail)) {
                errors.email = "Định dạng email không hợp lệ (ví dụ: hotro@example.com)!";
            }
        }

        if (!formData.password || formData.password.length < 6) {
            errors.password = "Mật khẩu phải có độ dài từ 6 ký tự trở lên!";
        }

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = "Mật khẩu xác nhận không khớp!";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError("Vui lòng kiểm tra và sửa các thông tin chưa chính xác bên dưới!");
            return;
        }

        setFieldErrors({});
        setLoading(true);
        try {
            // Tự đăng ký chỉ tạo tài khoản bệnh nhân (ROLE_PATIENT được gán cố định tại backend)
            const res = await axiosInstance.post("/api/auth/register", {
                fullName: cleanName,
                phoneNumber: cleanPhone,
                email: cleanEmail || null,
                password: formData.password
            });

            const authData = res?.data || res;
            if (authData?.accessToken) {
                login(authData);
                navigate("/profiles");
            } else {
                navigate("/login");
            }
        } catch (err) {
            const errorMsg = err?.message || (typeof err === "string" ? err : "Đăng ký thất bại. Số điện thoại hoặc email đã tồn tại!");
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "90vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: { xs: 4, md: 6 },
                bgcolor: "#F8FAFC",
                position: "relative"
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3.5, sm: 5 },
                        borderRadius: 4,
                        bgcolor: "#FFFFFF",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.05)"
                    }}
                >
                    {/* Header */}
                    <Box textAlign="center" mb={3.5}>
                        <Box display="flex" justifyContent="center" mb={2}>
                            <Box
                                sx={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: "15px",
                                    background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    boxShadow: "0 8px 20px rgba(0, 136, 214, 0.28)"
                                }}
                            >
                                <LocalHospitalIcon sx={{ fontSize: 30 }} />
                            </Box>
                        </Box>
                        <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: "-0.03em", color: "#0F172A", mb: 0.5 }}>
                            Đăng Ký Tài Khoản Bệnh Nhân
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>
                            TNT HOSPITAL
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mt: 0.5 }}>
                            Tạo tài khoản thành viên để đặt lịch hẹn và theo dõi hồ sơ y tế
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleRegister}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên bệnh nhân"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ví dụ: NGUYỄN VĂN AN"
                                    error={Boolean(fieldErrors.fullName)}
                                    helperText={fieldErrors.fullName || "Nhập đầy đủ họ và tên theo CCCD/BHYT"}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonOutlineIcon sx={{ color: "#94A3B8" }} />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2.5 }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số điện thoại di động"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    required
                                    placeholder="0987654321"
                                    error={Boolean(fieldErrors.phoneNumber)}
                                    helperText={fieldErrors.phoneNumber || "10 chữ số dùng đăng nhập & nhận OTP"}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PhoneIphoneIcon sx={{ color: "#94A3B8" }} />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2.5, fontFamily: "monospace", fontWeight: 700 }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="email"
                                    label="Địa chỉ Email (Nhận thông báo)"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@example.com"
                                    error={Boolean(fieldErrors.email)}
                                    helperText={fieldErrors.email || "Không bắt buộc, dùng để nhận phiếu khám"}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MailOutlineIcon sx={{ color: "#94A3B8" }} />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2.5 }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Mật khẩu"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ít nhất 6 ký tự"
                                    error={Boolean(fieldErrors.password)}
                                    helperText={fieldErrors.password || "Tối thiểu 6 ký tự bảo mật"}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon sx={{ color: "#94A3B8" }} />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2.5 }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Xác nhận mật khẩu"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="Nhập lại mật khẩu"
                                    error={Boolean(fieldErrors.confirmPassword)}
                                    helperText={fieldErrors.confirmPassword || "Nhập lại chính xác mật khẩu"}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon sx={{ color: "#94A3B8" }} />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2.5 }
                                    }}
                                />
                            </Grid>
                        </Grid>

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{
                                mt: 3.5,
                                py: 1.4,
                                borderRadius: 2.5,
                                fontWeight: 800,
                                fontSize: "0.95rem",
                                textTransform: "none",
                                bgcolor: "#0088D6",
                                boxShadow: "0 6px 20px rgba(0, 136, 214, 0.3)",
                                "&:hover": { bgcolor: "#0073B7" }
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : "Đăng Ký Thành Viên"}
                        </Button>

                        <Box textAlign="center" mt={3}>
                            <Typography variant="body2" sx={{ color: "#64748B", mb: 1.5 }}>
                                Đã có tài khoản y tế?{" "}
                                <Typography
                                    component={Link}
                                    to="/login"
                                    variant="body2"
                                    sx={{
                                        color: "#0088D6",
                                        fontWeight: 800,
                                        textDecoration: "none",
                                        "&:hover": { textDecoration: "underline" }
                                    }}
                                >
                                    Đăng nhập ngay
                                </Typography>
                            </Typography>

                            <Button
                                component={Link}
                                to="/"
                                size="small"
                                startIcon={<ArrowBackIcon />}
                                sx={{ color: "#64748B", fontWeight: 700, textTransform: "none" }}
                            >
                                Quay lại Trang Chủ
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
