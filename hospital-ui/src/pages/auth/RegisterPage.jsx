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
    Divider
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
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
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");

        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})$/;
        if (!phoneRegex.test(formData.phoneNumber.trim())) {
            setError("Số điện thoại không hợp lệ! Vui lòng nhập 10 chữ số đúng định dạng (ví dụ: 0987654321).");
            return;
        }

        if (formData.password.length < 6) {
            setError("Mật khẩu phải có độ dài từ 6 ký tự trở lên!");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp!");
            return;
        }

        setLoading(true);
        try {
            const res = await axiosInstance.post("/api/auth/register", {
                fullName: formData.fullName.trim(),
                phoneNumber: formData.phoneNumber.trim(),
                email: formData.email.trim() || null,
                password: formData.password,
                role: "ROLE_PATIENT",
            });

            const authData = res?.data || res;
            if (authData?.accessToken) {
                login(authData); // Tự động đăng nhập
                navigate("/profiles"); // Chuyển tới tạo hồ sơ y tế
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
                            Tạo Tài Khoản Khám Bệnh
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748B" }}>
                            Đăng ký thành viên để lưu trữ hồ sơ y bạ điện tử và đặt hẹn ưu tiên
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
                                    placeholder="Ví dụ: Nguyễn Văn An"
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
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PhoneIphoneIcon sx={{ color: "#94A3B8" }} />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2.5, fontFamily: "monospace" }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="email"
                                    label="Địa chỉ Email (không bắt buộc)"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@example.com"
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
                            {loading ? "Đang tạo tài khoản..." : "Hoàn Tất Đăng Ký"}
                        </Button>

                        <Box textAlign="center" mt={3} pt={2} borderTop="1px solid rgba(15, 23, 42, 0.06)">
                            <Typography variant="body2" sx={{ color: "#64748B", mb: 1 }}>
                                Đã có tài khoản?{" "}
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
                                sx={{ color: "#64748B", fontWeight: 700, textTransform: "none", mt: 0.5 }}
                            >
                                Quay về trang chủ
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
