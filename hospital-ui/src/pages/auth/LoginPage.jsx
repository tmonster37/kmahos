import React, { useState, useEffect } from "react";
import { Container, Paper, TextField, Button, Typography, Box, Alert, IconButton, InputAdornment } from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/AxiosInstance";

export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [expiredNotice, setExpiredNotice] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get("expired") === "true") {
            setExpiredNotice(true);
        }
    }, [location]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await axiosInstance.post("/api/auth/login", { phoneNumber, password });
            if (res.success) {
                login(res.data);
                
                // Kiểm tra xem có URL đang dở trước đó không
                const redirectUrl = sessionStorage.getItem("redirectUrl");
                if (redirectUrl) {
                    sessionStorage.removeItem("redirectUrl");
                    navigate(redirectUrl);
                    return;
                }

                // Điều hướng mặc định theo vai trò
                if (res.data.role === "ROLE_DOCTOR" || res.data.role === "ROLE_HEAD_OF_DEPARTMENT") {
                    navigate("/doctor/examinations");
                } else if (res.data.role === "ROLE_ADMIN") {
                    navigate("/admin/dashboard");
                } else if (res.data.role === "ROLE_LAB_TECHNICIAN") {
                    navigate("/doctor/lab-tests");
                } else if (res.data.role === "ROLE_NURSE") {
                    navigate("/nurse/reception");
                } else if (res.data.role === "ROLE_CASHIER") {
                    navigate("/cashier");
                } else {
                    navigate("/booking");
                }
            }
        } catch (err) {
            setError(err.message || "Số điện thoại hoặc mật khẩu không chính xác!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", py: 4, bgcolor: "#F8FAFC" }}>
            <Container maxWidth="xs">
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, sm: 4 },
                        borderRadius: 4,
                        textAlign: "center",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
                        bgcolor: "#FFFFFF"
                    }}
                >
                    {/* Brand Logo Header */}
                    <Box display="flex" justifyContent="center" mb={1.5}>
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: "14px",
                                background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                boxShadow: "0 8px 20px rgba(0, 136, 214, 0.3)"
                            }}
                        >
                            <LocalHospitalIcon sx={{ fontSize: 32 }} />
                        </Box>
                    </Box>

                    <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: "-0.5px", color: "#0F172A", mb: 0.5 }}>
                        Đăng Nhập Cổng Y Tế
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={3}>
                        Nền tảng quản trị & chăm sóc sức khỏe YouMed TNT
                    </Typography>

                    {expiredNotice && (
                        <Alert severity="warning" sx={{ mb: 2.5, textAlign: "left", borderRadius: 2 }}>
                            Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 2.5, textAlign: "left", borderRadius: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            label="Số điện thoại"
                            variant="outlined"
                            margin="normal"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="0987654321"
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PhoneIphoneIcon sx={{ color: "#94A3B8" }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2.5 }
                            }}
                        />

                        <TextField
                            fullWidth
                            type={showPassword ? "text" : "password"}
                            label="Mật khẩu"
                            variant="outlined"
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon sx={{ color: "#94A3B8" }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            size="small"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2.5 }
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{
                                mt: 2.5,
                                py: 1.3,
                                borderRadius: 2.5,
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                boxShadow: "0 6px 18px rgba(0, 136, 214, 0.35)",
                                "&:hover": {
                                    boxShadow: "0 8px 24px rgba(0, 136, 214, 0.45)"
                                }
                            }}
                        >
                            {loading ? "Đang xử lý..." : "Đăng Nhập Bằng Số Điện Thoại"}
                        </Button>

                        <Box display="flex" alignItems="center" my={2}>
                            <Box flexGrow={1} height="1px" bgcolor="#E2E8F0" />
                            <Typography variant="caption" color="textSecondary" px={1.5} fontWeight={600}>
                                HOẶC
                            </Typography>
                            <Box flexGrow={1} height="1px" bgcolor="#E2E8F0" />
                        </Box>

                        {/* Microsoft Account Login Button */}
                        <Button
                            fullWidth
                            variant="outlined"
                            size="large"
                            onClick={() => {
                                // Giả lập Microsoft SSO hoặc chuyển hướng Microsoft OAuth
                                setPhoneNumber("0988889999");
                                setPassword("password123");
                                setError("");
                                alert("Đã kết nối tài khoản Microsoft! Nhấn Đăng Nhập để vào hệ thống.");
                            }}
                            startIcon={
                                <Box component="svg" width="18" height="18" viewBox="0 0 21 21" fill="none">
                                    <path d="M1 1h9v9H1V1z" fill="#f25022"/>
                                    <path d="M11 1h9v9h-9V1z" fill="#7fba00"/>
                                    <path d="M1 11h9v9H1v-9z" fill="#00a4ef"/>
                                    <path d="M11 11h9v9h-9v-9z" fill="#ffb900"/>
                                </Box>
                            }
                            sx={{
                                py: 1.1,
                                borderRadius: 2.5,
                                fontWeight: 700,
                                fontSize: "0.875rem",
                                color: "#334155",
                                borderColor: "#CBD5E1",
                                "&:hover": { bgcolor: "#F8FAFC", borderColor: "#94A3B8" }
                            }}
                        >
                            Đăng nhập bằng Microsoft
                        </Button>

                        <Box textAlign="center" mt={3} pt={2} borderTop="1px solid #F1F5F9">
                            <Typography variant="body2" color="textSecondary" mb={1}>
                                Chưa có tài khoản?{" "}
                                <Typography
                                    component={Link}
                                    to="/register"
                                    variant="body2"
                                    color="primary"
                                    fontWeight="bold"
                                    sx={{ textDecoration: "none" }}
                                >
                                    Đăng ký thành viên
                                </Typography>
                            </Typography>

                            <Button
                                component={Link}
                                to="/"
                                size="small"
                                startIcon={<ArrowBackIcon />}
                                sx={{ color: "#64748B", fontWeight: 600, mt: 1 }}
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
