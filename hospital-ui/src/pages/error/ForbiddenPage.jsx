import React from "react";
import { Container, Paper, Typography, Box, Button, Stack } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import LockPersonIcon from "@mui/icons-material/LockPerson";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContactSupportIcon from "@mui/icons-material/ContactSupport";
import { useAuth } from "../../context/AuthContext";

export default function ForbiddenPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <Container maxWidth="md" sx={{ py: 8, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "75vh" }}>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 4, md: 6 },
                    borderRadius: 4,
                    textAlign: "center",
                    border: "1px solid #e2e8f0",
                    bgcolor: "#ffffff",
                    boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.05)"
                }}
            >
                <Box
                    sx={{
                        width: 90,
                        height: 90,
                        borderRadius: "50%",
                        bgcolor: "#fee2e2",
                        color: "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 3
                    }}
                >
                    <LockPersonIcon sx={{ fontSize: 52 }} />
                </Box>

                <Typography variant="overline" sx={{ color: "#ef4444", fontWeight: 800, fontSize: "1rem", letterSpacing: "1.5px" }}>
                    LỖI 403 • TRUY CẬP BỊ TỪ CHỐI
                </Typography>

                <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", mt: 1, mb: 2 }}>
                    Bạn Không Có Quyền Truy Cập Khu Vực Này
                </Typography>

                <Typography variant="body1" sx={{ color: "#64748b", maxWidth: 520, mx: "auto", mb: 3 }}>
                    Tài khoản hiện tại của bạn ({user?.fullName || "Người dùng"} - <b>{user?.role || "GUEST"}</b>) không có thẩm quyền truy cập trang hoặc chức năng này theo quy định phân quyền bệnh viện.
                </Typography>

                <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2.5, mb: 4, border: "1px solid #f1f5f9", maxWidth: 460, mx: "auto" }}>
                    <Typography variant="caption" sx={{ color: "#475569", display: "block" }}>
                        Nếu bạn cho rằng đây là sự nhầm lẫn về quyền hạn ca trực, vui lòng liên hệ <b>Bộ phận Quản Trị Hệ Thống (IT Admin)</b> để được cấp quyền.
                    </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
                    <Button
                        variant="outlined"
                        size="large"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(-1)}
                        sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: "none", px: 3 }}
                    >
                        Quay lại trang trước
                    </Button>
                    <Button
                        component={Link}
                        to="/"
                        variant="contained"
                        size="large"
                        startIcon={<HomeIcon />}
                        sx={{
                            bgcolor: "#0284c7",
                            borderRadius: 2.5,
                            fontWeight: 800,
                            textTransform: "none",
                            px: 3.5,
                            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                            "&:hover": { bgcolor: "#0369a1" }
                        }}
                    >
                        Về Trang Chủ Bệnh Viện
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
}
