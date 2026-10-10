import React, { useState } from "react";
import { Container, Paper, TextField, Button, Typography, Box, Alert, Grid } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
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

            if (res.success || res.data?.accessToken) {
                login(res.data); // Tự động đăng nhập
                navigate("/profiles"); // Chuyển tới tạo hồ sơ y tế
            }
        } catch (err) {
            const errorMsg = err?.message || (typeof err === "string" ? err : "Đăng ký thất bại. Số điện thoại hoặc email đã tồn tại!");
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 6 }}>
            <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
                <Typography variant="h5" fontWeight="bold" color="primary.main" textAlign="center" gutterBottom>
                    TẠO TÀI KHOẢN TNT HOSPITAL
                </Typography>
                <Typography variant="body2" color="textSecondary" textAlign="center" mb={3}>
                    Đăng ký để đặt lịch khám bệnh và quản lý hồ sơ sức khỏe
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleRegister}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Họ và tên" name="fullName" value={formData.fullName} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Số điện thoại" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required placeholder="0987654321" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="email" label="Email (không bắt buộc)" name="email" value={formData.email} onChange={handleChange} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="password" label="Mật khẩu" name="password" value={formData.password} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="password" label="Xác nhận mật khẩu" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                        </Grid>
                    </Grid>

                    <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3, py: 1.5 }} disabled={loading}>
                        {loading ? "Đang xử lý..." : "Đăng ký tài khoản"}
                    </Button>

                    <Box textAlign="center" mt={2}>
                        <Typography variant="body2">
                            Đã có tài khoản? <Link to="/login" style={{ color: "#0066CC", fontWeight: "bold", textDecoration: "none" }}>Đăng nhập ngay</Link>
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
}
