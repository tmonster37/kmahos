import React from "react";
import { Outlet, Link } from "react-router-dom";
import { Box, Container, Typography, Divider, Grid, Button, Stack } from "@mui/material";
import Navbar from "../components/navbar/Navbar";
import PatientBottomNav from "../components/navbar/PatientBottomNav";
import LiveChatWidget from "../components/chat/LiveChatWidget";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SecurityIcon from "@mui/icons-material/Security";

export default function MainLayout() {
    return (
        <Box display="flex" flexDirection="column" minHeight="100vh" position="relative" sx={{ bgcolor: "#F4F7FB" }}>
            <Navbar />
            
            <Box component="main" flexGrow={1}>
                <Outlet />
            </Box>

            {/* Floating Live Chat & AI Consultation Widget */}
            <LiveChatWidget />

            {/* YOUMED STYLE CLEAN COMPACT FOOTER */}
            <Box
                component="footer"
                sx={{
                    bgcolor: "#0F172A",
                    color: "#94A3B8",
                    pt: 6,
                    pb: 3,
                    mt: 8,
                    borderTop: "1px solid #1E293B"
                }}
            >
                <Container maxWidth="xl">
                    {/* Top Footer Banner: Hotline */}
                    <Box
                        sx={{
                            bgcolor: "#1E293B",
                            borderRadius: 3,
                            p: { xs: 2.5, md: 3 },
                            mb: 5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 2,
                            border: "1px solid #334155"
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={2}>
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2.5,
                                    bgcolor: "#0088D6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white"
                                }}
                            >
                                <PhoneInTalkIcon sx={{ fontSize: 26 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" color="white">
                                    Cần Hỗ Trợ Đặt Khám & Tra Cứu Y Khoa?
                                </Typography>
                                <Typography variant="body2" color="#94A3B8" fontSize="0.85rem">
                                    Đội ngũ y tế TNT luôn túc trực hỗ trợ người bệnh 24/7.
                                </Typography>
                            </Box>
                        </Box>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            <Button
                                component="a"
                                href="tel:19008888"
                                variant="contained"
                                startIcon={<PhoneInTalkIcon />}
                                sx={{
                                    bgcolor: "#EF4444",
                                    "&:hover": { bgcolor: "#DC2626" },
                                    fontWeight: "bold",
                                    borderRadius: 2,
                                    px: 2.5,
                                    py: 1,
                                    fontSize: "0.875rem"
                                }}
                            >
                                Hotline: 1900 8888
                            </Button>
                            <Button
                                component={Link}
                                to="/booking"
                                variant="contained"
                                color="primary"
                                sx={{
                                    fontWeight: "bold",
                                    borderRadius: 2,
                                    px: 2.5,
                                    py: 1,
                                    fontSize: "0.875rem"
                                }}
                            >
                                Đặt Lịch Khám Ngay
                            </Button>
                        </Stack>
                    </Box>

                    {/* Multi-column Footer */}
                    <Grid container spacing={4} mb={4}>
                        {/* Column 1: Hospital & Brand Info */}
                        <Grid item xs={12} md={5}>
                            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 2,
                                        background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "white"
                                    }}
                                >
                                    <LocalHospitalIcon sx={{ fontSize: 20 }} />
                                </Box>
                                <Typography variant="subtitle1" fontWeight="800" color="white">
                                    Bệnh Viện Đa Khoa Quốc Tế TNT
                                </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ lineHeight: 1.6, mb: 2, fontSize: "0.85rem" }}>
                                Nền tảng y tế số kết nối người bệnh với hệ thống khám chữa bệnh chuẩn chất lượng cao, đơn giản hóa quy trình đăng ký, khám và thanh toán viện phí.
                            </Typography>
                            <Box display="flex" flexDirection="column" gap={0.8} fontSize="0.825rem">
                                <Box display="flex" alignItems="flex-start" gap={1}>
                                    <LocationOnIcon sx={{ fontSize: 16, color: "#0088D6", mt: 0.3 }} />
                                    <span>Địa chỉ: Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội</span>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <PhoneInTalkIcon sx={{ fontSize: 16, color: "#00C292" }} />
                                    <span>Cấp cứu 24/7: (024) 3888 9999 - Hotline: 1900 8888</span>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <EmailIcon sx={{ fontSize: 16, color: "#F59E0B" }} />
                                    <span>Email hỗ trợ: hotro@tnthospital.vn</span>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Column 2: Quick Links / Dịch Vụ */}
                        <Grid item xs={6} sm={3} md={3}>
                            <Typography variant="subtitle2" fontWeight="bold" color="white" gutterBottom>
                                Chức Năng Bệnh Nhân
                            </Typography>
                            <Stack spacing={1} fontSize="0.825rem">
                                <Link to="/booking" style={{ color: "#94A3B8", textDecoration: "none" }}>Đặt lịch khám bệnh</Link>
                                <Link to="/profiles" style={{ color: "#94A3B8", textDecoration: "none" }}>Quản lý hồ sơ bệnh nhân</Link>
                                <Link to="/lookup" style={{ color: "#94A3B8", textDecoration: "none" }}>Tìm hồ sơ bệnh nhân đã mất</Link>
                                <Link to="/my-history" style={{ color: "#94A3B8", textDecoration: "none" }}>Xem phiếu khám & lịch sử</Link>
                                <Link to="/payment" style={{ color: "#94A3B8", textDecoration: "none" }}>Nạp tiền & Thanh toán viện phí</Link>
                                <Link to="/reminders" style={{ color: "#94A3B8", textDecoration: "none" }}>Nhắc uống thuốc theo đơn</Link>
                            </Stack>
                        </Grid>

                        {/* Column 3: Chuyên Khoa */}
                        <Grid item xs={6} sm={3} md={4}>
                            <Typography variant="subtitle2" fontWeight="bold" color="white" gutterBottom>
                                Khoa Khám Chuyên Sâu
                            </Typography>
                            <Stack spacing={1} fontSize="0.825rem">
                                <Link to="/booking" style={{ color: "#94A3B8", textDecoration: "none" }}>Khoa Nội Tổng Hợp & Tim Mạch</Link>
                                <Link to="/booking" style={{ color: "#94A3B8", textDecoration: "none" }}>Khoa Ngoại Tổng Quát & Chấn Thương</Link>
                                <Link to="/booking" style={{ color: "#94A3B8", textDecoration: "none" }}>Khoa Nhi & Tiêm Chủng</Link>
                                <Link to="/booking" style={{ color: "#94A3B8", textDecoration: "none" }}>Khoa Sản Phụ Khoa</Link>
                                <Link to="/booking" style={{ color: "#94A3B8", textDecoration: "none" }}>Khoa Mắt - Tai Mũi Họng - Răng Hàm Mặt</Link>
                                <Link to="/booking" style={{ color: "#94A3B8", textDecoration: "none" }}>Trung Tâm Xét Nghiệm & Chẩn Đoán Hình Ảnh</Link>
                            </Stack>
                        </Grid>
                    </Grid>

                    <Divider sx={{ borderColor: "#1E293B", my: 2.5 }} />

                    {/* Bottom Copyright & Security */}
                    <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={1.5}
                        fontSize="0.8rem"
                    >
                        <Typography variant="caption" color="#64748B">
                            © {new Date().getFullYear()} TNT Hospital System. Giấy phép hoạt động KCB số: 188/BYT-GPHĐ cấp bởi Bộ Y Tế.
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                            <SecurityIcon sx={{ fontSize: 16, color: "#00C292" }} />
                            <Typography variant="caption" color="#94A3B8">
                                Bảo mật hồ sơ bệnh án theo tiêu chuẩn Bộ Y Tế
                            </Typography>
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* Mobile Bottom Navigation for Patients */}
            <PatientBottomNav />
        </Box>
    );
}
