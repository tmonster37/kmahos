import React from "react";
import { Container, Paper, Typography, Box, Button, Stack } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import ExploreOffIcon from "@mui/icons-material/ExploreOff";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function NotFoundPage() {
    const navigate = useNavigate();

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
                        bgcolor: "#e0f2fe",
                        color: "#0284c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 3
                    }}
                >
                    <ExploreOffIcon sx={{ fontSize: 52 }} />
                </Box>

                <Typography variant="overline" sx={{ color: "#0284c7", fontWeight: 800, fontSize: "1rem", letterSpacing: "1.5px" }}>
                    LỖI 404 • KHÔNG TÌM THẤY TRANG
                </Typography>

                <Typography variant="h4" fontWeight={900} sx={{ color: "#0f172a", mt: 1, mb: 2 }}>
                    Trang Bạn Tìm Kiếm Không Tồn Tại
                </Typography>

                <Typography variant="body1" sx={{ color: "#64748b", maxWidth: 500, mx: "auto", mb: 4 }}>
                    Đường dẫn bạn vừa truy cập có thể đã bị đổi tên, tạm khóa hoặc không tồn tại trên Cổng Thông Tin Bệnh Viện Đa Khoa TNT.
                </Typography>

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
