import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
    IconButton,
    InputAdornment,
    Chip,
    Tooltip,
    Stack,
    Divider
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import KeyIcon from "@mui/icons-material/Key";
import ShieldIcon from "@mui/icons-material/Shield";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
        if (e) e.preventDefault();
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

    const handleQuickFill = (phone, pass) => {
        setPhoneNumber(phone);
        setPassword(pass);
        setError("");
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
                position: "relative",
                overflow: "hidden"
            }}
        >
            {/* Subtle background aura */}
            <Box
                sx={{
                    position: "absolute",
                    top: "10%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 500,
                    height: 500,
                    borderRadius: 999,
                    bgcolor: "rgba(0, 136, 214, 0.05)",
                    filter: "blur(80px)",
                    pointerEvents: "none"
                }}
            />

            <Container maxWidth="xs" sx={{ position: "relative", zIndex: 1 }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3.5, sm: 4.5 },
                        borderRadius: 4,
                        textAlign: "center",
                        bgcolor: "#FFFFFF",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.05)"
                    }}
                >
                    {/* Brand Logo Header */}
                    <Box display="flex" justifyContent="center" mb={2}>
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: "16px",
                                background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                boxShadow: "0 8px 24px rgba(0, 136, 214, 0.28)"
                            }}
                        >
                            <LocalHospitalIcon sx={{ fontSize: 32 }} />
                        </Box>
                    </Box>

                    <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: "-0.03em", color: "#0F172A", mb: 0.5 }}>
                        Đăng Nhập Cổng Y Tế
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                        Nền tảng quản trị & tiếp đón bệnh nhân Bệnh viện TNT
                    </Typography>

                    {expiredNotice && (
                        <Alert severity="warning" sx={{ mb: 2.5, textAlign: "left", borderRadius: 2.5 }}>
                            Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ mb: 2.5, textAlign: "left", borderRadius: 2.5 }}>
                            {error}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            label="Số điện thoại"
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
                                sx: {
                                    borderRadius: 2.5,
                                    fontFamily: "monospace",
                                    fontWeight: 700
                                }
                            }}
                        />

                        <TextField
                            fullWidth
                            type={showPassword ? "text" : "password"}
                            label="Mật khẩu"
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
                                py: 1.4,
                                borderRadius: 2.5,
                                fontWeight: 800,
                                fontSize: "0.95rem",
                                textTransform: "none",
                                bgcolor: "#0088D6",
                                boxShadow: "0 6px 20px rgba(0, 136, 214, 0.3)",
                                "&:hover": {
                                    bgcolor: "#0073B7"
                                }
                            }}
                        >
                            {loading ? "Đang xác thực..." : "Đăng Nhập"}
                        </Button>

                        {/* Quick Demo Role Fillers */}
                        <Box mt={3} pt={2} borderTop="1px solid rgba(15, 23, 42, 0.08)">
                            <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, display: "block", mb: 1 }}>
                                TÀI KHOẢN MẪU DEMO (CHẠM ĐỂ ĐIỀN):
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.8} justifyContent="center">
                                {[
                                    { label: "Admin", phone: "0937050537", pass: "taizz0537", color: "#6366F1" },
                                    { label: "Trưởng khoa", phone: "0900000002", pass: "taizz0537", color: "#0D9488" },
                                    { label: "Bác sĩ", phone: "0911000001", pass: "password123", color: "#0088D6" },
                                    { label: "Điều dưỡng", phone: "0900000004", pass: "password123", color: "#10B981" },
                                    { label: "Thu ngân", phone: "0900000007", pass: "password123", color: "#F59E0B" },
                                    { label: "Dược sĩ", phone: "0900000005", pass: "password123", color: "#7C3AED" },
                                    { label: "Bệnh nhân", phone: "0988889999", pass: "password123", color: "#64748B" }
                                ].map((item) => (
                                    <Chip
                                        key={item.label}
                                        label={item.label}
                                        size="small"
                                        onClick={() => handleQuickFill(item.phone, item.pass)}
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: "0.72rem",
                                            borderRadius: 1.5,
                                            bgcolor: "rgba(15, 23, 42, 0.04)",
                                            color: item.color,
                                            border: `1px solid ${item.color}33`,
                                            cursor: "pointer",
                                            "&:hover": { bgcolor: "rgba(15, 23, 42, 0.08)" }
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <Box display="flex" alignItems="center" my={2.5}>
                            <Box flexGrow={1} height="1px" bgcolor="rgba(15, 23, 42, 0.08)" />
                            <Typography variant="caption" sx={{ color: "#94A3B8", px: 1.5, fontWeight: 700 }}>
                                HOẶC
                            </Typography>
                            <Box flexGrow={1} height="1px" bgcolor="rgba(15, 23, 42, 0.08)" />
                        </Box>

                        {/* Microsoft Account Login Button */}
                        <Button
                            fullWidth
                            variant="outlined"
                            size="large"
                            onClick={() => {
                                handleQuickFill("0988889999", "password123");
                                alert("Đã liên kết tài khoản Microsoft! Nhấn Đăng Nhập để vào hệ thống.");
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
                                py: 1.2,
                                borderRadius: 2.5,
                                fontWeight: 700,
                                fontSize: "0.875rem",
                                textTransform: "none",
                                color: "#334155",
                                borderColor: "rgba(15, 23, 42, 0.15)",
                                "&:hover": { bgcolor: "#F8FAFC", borderColor: "#94A3B8" }
                            }}
                        >
                            Đăng nhập bằng Microsoft Entra ID
                        </Button>

                        <Box textAlign="center" mt={3} pt={2} borderTop="1px solid rgba(15, 23, 42, 0.06)">
                            <Typography variant="body2" sx={{ color: "#64748B", mb: 1.5 }}>
                                Chưa có tài khoản bệnh nhân?{" "}
                                <Typography
                                    component={Link}
                                    to="/register"
                                    variant="body2"
                                    sx={{
                                        color: "#0088D6",
                                        fontWeight: 800,
                                        textDecoration: "none",
                                        "&:hover": { textDecoration: "underline" }
                                    }}
                                >
                                    Đăng ký thành viên
                                </Typography>
                            </Typography>

                            <Button
                                component={Link}
                                to="/"
                                size="small"
                                startIcon={<ArrowBackIcon />}
                                sx={{ color: "#64748B", fontWeight: 700, textTransform: "none" }}
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
