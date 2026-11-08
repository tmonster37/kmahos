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
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    CircularProgress
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/AxiosInstance";
import designTokens from "../../theme/designTokens";

const GOOGLE_CLIENT_ID = (import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) || "1038814592004-8fua2p0vpn2988932qe6jnhef73drop2.apps.googleusercontent.com";

export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [expiredNotice, setExpiredNotice] = useState(false);

    // Google OpenID Connect State
    const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [customGoogleMode, setCustomGoogleMode] = useState(false);
    const [customEmail, setCustomEmail] = useState("");

    // Account Linking Confirmation State (Khi email đã tồn tại và cần xác minh OTP)
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkOtpCode, setLinkOtpCode] = useState("");
    const [linkPendingIdToken, setLinkPendingIdToken] = useState("");
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkNotice, setLinkNotice] = useState("");

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get("expired") === "true") {
            setExpiredNotice(true);
        }
    }, [location]);

    // Khởi tạo Google Identity Services (GIS) Button
    useEffect(() => {
        const renderGoogleBtn = () => {
            if (window.google?.accounts?.id) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: GOOGLE_CLIENT_ID,
                        callback: (res) => {
                            if (res?.credential) {
                                handleGoogleIdTokenAuth(res.credential);
                            }
                        }
                    });

                    const container = document.getElementById("g-signin-container");
                    if (container) {
                        container.innerHTML = "";
                        window.google.accounts.id.renderButton(container, {
                            theme: "outline",
                            size: "large",
                            width: 320,
                            text: "continue_with",
                            shape: "rectangular"
                        });
                    }
                } catch (e) {
                    console.warn("GIS initialization notice:", e);
                }
            }
        };

        if (window.google?.accounts?.id) {
            renderGoogleBtn();
        } else {
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval);
                    renderGoogleBtn();
                }
            }, 300);
            return () => clearInterval(interval);
        }
    }, []);

    const redirectAfterLogin = (role) => {
        const redirectUrl = sessionStorage.getItem("redirectUrl");
        if (redirectUrl) {
            sessionStorage.removeItem("redirectUrl");
            navigate(redirectUrl);
            return;
        }

        // Điều hướng mặc định theo vai trò
        if (role === "ROLE_DOCTOR" || role === "ROLE_HEAD_OF_DEPARTMENT") {
            navigate("/doctor/examinations");
        } else if (role === "ROLE_ADMIN") {
            navigate("/admin/dashboard");
        } else if (role === "ROLE_LAB_TECHNICIAN") {
            navigate("/doctor/lab-tests");
        } else if (role === "ROLE_NURSE") {
            navigate("/nurse/reception");
        } else if (role === "ROLE_CASHIER") {
            navigate("/cashier");
        } else {
            navigate("/booking");
        }
    };

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await axiosInstance.post("/api/auth/login", { phoneNumber, password });
            if (res.success) {
                login(res.data);
                redirectAfterLogin(res.data.role);
            }
        } catch (err) {
            setError(err.message || "Số điện thoại hoặc mật khẩu không chính xác!");
        } finally {
            setLoading(false);
        }
    };

    // Gửi ID Token OpenID Connect lên Backend để xác thực chữ ký số
    const handleGoogleIdTokenAuth = async (idToken, otpCode = null) => {
        setGoogleLoading(true);
        setError("");
        try {
            const res = await axiosInstance.post("/api/auth/google", {
                idToken,
                otpCode
            });

            const authData = res.data || res;
            if (authData.accessToken) {
                setGoogleDialogOpen(false);
                setLinkModalOpen(false);
                login(authData);
                redirectAfterLogin(authData.role);
            } else {
                setError("Đăng nhập Google không thành công, vui lòng thử lại.");
            }
        } catch (err) {
            const msg = err.message || "";
            // Nếu phát hiện tài khoản đã tồn tại và backend yêu cầu xác minh quyền sở hữu
            if (msg.includes("NEEDS_LINK_CONFIRM") || msg.includes("Mã OTP xác nhận liên kết")) {
                setGoogleDialogOpen(false);
                setLinkPendingIdToken(idToken);
                setLinkNotice(msg.replace("NEEDS_LINK_CONFIRM:", "").trim());
                setLinkModalOpen(true);
            } else {
                setError(msg || "Không thể xác minh Google OpenID Connect ID Token!");
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleConfirmLinkWithOtp = async () => {
        if (!linkOtpCode || linkOtpCode.trim().length !== 6) {
            setError("Vui lòng nhập đủ 6 chữ số mã OTP xác nhận gửi về email!");
            return;
        }
        setLinkLoading(true);
        setError("");
        try {
            await handleGoogleIdTokenAuth(linkPendingIdToken, linkOtpCode.trim());
        } finally {
            setLinkLoading(false);
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
                position: "relative",
                overflow: "hidden"
            }}
        >
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
                            component="img"
                            src="/images/logo.png"
                            alt="Logo Bệnh Viện TNT"
                            sx={{
                                width: 56,
                                height: 56,
                                objectFit: "contain",
                                filter: "drop-shadow(0 4px 12px rgba(15, 118, 110, 0.2))"
                            }}
                        />
                    </Box>

                    <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: "-0.03em", color: "#0F172A", mb: 0.5 }}>
                        Đăng Nhập Cổng Y Tế
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                        Nền tảng tiếp đón & chăm sóc sức khỏe  TNT HOSPITAL
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
                            label="Số điện thoại hoặc Email"
                            margin="normal"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="0987654321 hoặc email@example.com"
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PhoneIphoneIcon sx={{ color: "#94A3B8" }} />
                                    </InputAdornment>
                                ),
                                sx: {
                                    borderRadius: 2.5,
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
                                bgcolor: designTokens.brand.primary,
                                boxShadow: "0 6px 20px rgba(15, 118, 110, 0.3)",
                                "&:hover": { bgcolor: designTokens.brand.primaryHover }
                            }}
                        >
                            {loading ? "Đang xác thực..." : "Đăng Nhập"}
                        </Button>

                        <Box display="flex" alignItems="center" my={2.5}>
                            <Box flexGrow={1} height="1px" bgcolor="rgba(15, 23, 42, 0.08)" />
                            <Typography variant="caption" sx={{ color: "#94A3B8", px: 1.5, fontWeight: 700 }}>
                                HOẶC DÀNH CHO BỆNH NHÂN (GOOGLE SIGN-IN)
                            </Typography>
                            <Box flexGrow={1} height="1px" bgcolor="rgba(15, 23, 42, 0.08)" />
                        </Box>

                        <Stack spacing={1.5}>
                            {/* Google Official GSI Button Container */}
                            <Box id="g-signin-container" sx={{ display: "flex", justifyContent: "center", minHeight: 44 }} />

                            {/* Thử nghiệm dev-mock chỉ hiển thị trong môi trường phát triển cục bộ */}
                            {import.meta.env.DEV && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setGoogleDialogOpen(true)}
                                    startIcon={
                                        <Box component="svg" width="16" height="16" viewBox="0 0 48 48">
                                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                        </Box>
                                    }
                                    sx={{
                                        py: 0.9,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        color: "#64748B",
                                        borderColor: "rgba(15, 23, 42, 0.12)",
                                        fontSize: "0.8rem",
                                        fontWeight: 600,
                                        "&:hover": { bgcolor: "#F8FAFC", borderColor: "#4285F4", color: "#1E293B" }
                                    }}
                                >
                                    Tuỳ chọn Google khác (Dev Mode)
                                </Button>
                            )}
                        </Stack>

                        <Box textAlign="center" mt={3} pt={2} borderTop="1px solid rgba(15, 23, 42, 0.06)">
                            <Typography variant="body2" sx={{ color: "#64748B", mb: 1.5 }}>
                                Chưa có tài khoản bệnh nhân?{" "}
                                <Typography
                                    component={Link}
                                    to="/register"
                                    variant="body2"
                                    sx={{
                                        color: designTokens.brand.primary,
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

            {/* Google OIDC ID Token Selector Modal */}
            {/* Dialog Tùy chọn / Thử nghiệm Google Token - Chỉ có trong môi trường phát triển DEV */}
            {import.meta.env.DEV && (
                <Dialog
                    open={googleDialogOpen}
                    onClose={() => !googleLoading && setGoogleDialogOpen(false)}
                    maxWidth="xs"
                    fullWidth
                    PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
                >
                    <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
                        <Box display="flex" justifyContent="center" mb={1}>
                            <Box component="svg" width="32" height="32" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            </Box>
                        </Box>
                        <Typography variant="h6" fontWeight={800} color="#0F172A">
                            Google Sign-In (Dev Sandbox)
                        </Typography>
                        <Typography variant="caption" color="#64748B">
                            Chỉ khả dụng trong môi trường phát triển cục bộ với Whitelist tài khoản cố định
                        </Typography>
                    </DialogTitle>

                    <DialogContent>
                        {googleLoading ? (
                            <Box py={4} textAlign="center">
                                <CircularProgress size={36} sx={{ color: "#4285F4", mb: 2 }} />
                                <Typography variant="body2" color="#64748B" fontWeight={600}>
                                    Đang kiểm tra chữ ký số token và khởi tạo phiên JWT...
                                </Typography>
                            </Box>
                        ) : (
                            <List sx={{ pt: 0 }}>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemButton
                                        onClick={() => handleGoogleIdTokenAuth("dev-mock-nguyenvanan.patient@gmail.com")}
                                        sx={{
                                            borderRadius: 2,
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            "&:hover": { bgcolor: "#F1F5F9" }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: "#4285F4" }}>A</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={<Typography variant="subtitle2" fontWeight={700}>Nguyễn Văn An</Typography>}
                                            secondary="nguyenvanan.patient@gmail.com (Whitelist)"
                                        />
                                    </ListItemButton>
                                </ListItem>

                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemButton
                                        onClick={() => handleGoogleIdTokenAuth("dev-mock-tranbaongoc.patient@gmail.com")}
                                        sx={{
                                            borderRadius: 2,
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            "&:hover": { bgcolor: "#F1F5F9" }
                                        }}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: "#EA4335" }}>N</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={<Typography variant="subtitle2" fontWeight={700}>Trần Bảo Ngọc</Typography>}
                                            secondary="tranbaongoc.patient@gmail.com (Whitelist)"
                                        />
                                    </ListItemButton>
                                </ListItem>
                            </List>
                        )}
                    </DialogContent>
                </Dialog>
            )}



            {/* Modal Xác nhận Liên kết Tài khoản qua Email OTP khi phát hiện Email đã có sẵn */}
            <Dialog
                open={linkModalOpen}
                onClose={() => !linkLoading && setLinkModalOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3, p: 1.5 } }}
            >
                <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
                    <Box display="flex" justifyContent="center" mb={1}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: "12px",
                                bgcolor: designTokens.brand.primaryLight,
                                color: designTokens.brand.primary,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <MarkEmailReadIcon sx={{ fontSize: 28 }} />
                        </Box>
                    </Box>
                    <Typography variant="h6" fontWeight={800} color="#0F172A">
                        Xác Nhận Quyền Sở Hữu Tài Khoản
                    </Typography>
                    <Typography variant="caption" color="#64748B">
                        Bảo vệ hồ sơ y tế chống truy cập trái phép
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                        {linkNotice || "Email của bạn đã tồn tại trên hệ thống. Vui lòng nhập mã OTP gửi tới email để xác nhận liên kết Google ID với tài khoản này."}
                    </Alert>

                    <TextField
                        fullWidth
                        size="small"
                        label="Nhập mã OTP (6 số từ Email)"
                        value={linkOtpCode}
                        onChange={(e) => setLinkOtpCode(e.target.value)}
                        placeholder="123456"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <VpnKeyIcon sx={{ color: "#94A3B8" }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2, fontFamily: "monospace", letterSpacing: 3, fontWeight: 700 }
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
                    <Button
                        size="small"
                        onClick={() => setLinkModalOpen(false)}
                        disabled={linkLoading}
                        sx={{ textTransform: "none", color: "#64748B" }}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmLinkWithOtp}
                        disabled={linkLoading || !linkOtpCode}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            bgcolor: designTokens.brand.primary,
                            "&:hover": { bgcolor: designTokens.brand.primaryHover }
                        }}
                    >
                        {linkLoading ? "Đang xác minh..." : "Xác nhận liên kết"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
