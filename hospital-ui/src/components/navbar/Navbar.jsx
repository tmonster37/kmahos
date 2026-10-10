import React, { useState } from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Container,
    Avatar,
    Menu,
    MenuItem,
    Chip,
    IconButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Drawer,
    List,
    ListItem,
    ListItemButton
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import HistoryIcon from "@mui/icons-material/History";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import MedicationIcon from "@mui/icons-material/Medication";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ScienceIcon from "@mui/icons-material/Science";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import TvIcon from "@mui/icons-material/Tv";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import HotelIcon from "@mui/icons-material/Hotel";
import ChatIcon from "@mui/icons-material/Chat";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import NotificationMenu from "./NotificationMenu";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [userMenuAnchor, setUserMenuAnchor] = useState(null);
    const [utilityMenuAnchor, setUtilityMenuAnchor] = useState(null);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const handleUserMenuOpen = (e) => setUserMenuAnchor(e.currentTarget);
    const handleUserMenuClose = () => setUserMenuAnchor(null);
    const handleUtilityMenuOpen = (e) => setUtilityMenuAnchor(e.currentTarget);
    const handleUtilityMenuClose = () => setUtilityMenuAnchor(null);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        handleUserMenuClose();
        logout();
        navigate("/login");
    };

    const role = user?.role || "GUEST";

    const getNavBtnSx = (path) => ({
        color: isActive(path) ? "#0088D6" : "#334155",
        fontWeight: isActive(path) ? 700 : 600,
        bgcolor: isActive(path) ? "#EBF6FE" : "transparent",
        borderRadius: 2,
        px: 1.5,
        py: 0.7,
        fontSize: "0.85rem",
        textTransform: "none",
        whiteSpace: "nowrap",
        letterSpacing: "-0.2px",
        transition: "all 0.15s ease-in-out",
        "&:hover": { bgcolor: "#F1F5F9", color: "#0088D6" }
    });

    return (
        <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: "white", borderBottom: "1px solid #E2E8F0", zIndex: 1100 }}>
            {/* 1. TOP UTILITY STRIP - Tiện ích sảnh & Hotline */}
            <Box sx={{ bgcolor: "#F8FAFC", borderBottom: "1px solid #EDF2F7", py: 0.5, fontSize: "0.825rem", color: "#475569" }}>
                <Container maxWidth="xl" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box display="flex" alignItems="center" gap={0.8}>
                            <LocalHospitalIcon sx={{ fontSize: 16, color: "#0088D6" }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569" }}>
                                Bệnh Viện Đa Khoa Quốc Tế TNT
                            </Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem sx={{ height: 12, my: "auto" }} />
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <PhoneInTalkIcon sx={{ fontSize: 13, color: "#EF4444" }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Hotline: <b style={{ color: "#EF4444" }}>1900 8888</b>
                            </Typography>
                        </Box>
                    </Box>

                    {/* Phím tắt tiện ích sảnh thông minh & Badge vai trò */}
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                            component={Link}
                            to="/kiosk"
                            target="_blank"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                color: "#D97706",
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                "&:hover": { color: "#B45309" }
                            }}
                        >
                            <QrCodeScannerIcon sx={{ fontSize: 14 }} />
                            <span>Kiosk Sảnh</span>
                        </Box>

                        <Divider orientation="vertical" flexItem sx={{ height: 12, my: "auto" }} />

                        <Box
                            component={Link}
                            to="/queue-display"
                            target="_blank"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                color: "#6366F1",
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                "&:hover": { color: "#4F46E5" }
                            }}
                        >
                            <TvIcon sx={{ fontSize: 14 }} />
                            <span>Màn Hình LED TV</span>
                        </Box>

                        {isAuthenticated && (
                            <>
                                <Divider orientation="vertical" flexItem sx={{ height: 12, my: "auto" }} />
                                <Chip
                                    label={
                                        role === "ROLE_ADMIN" ? "Quản trị viên" :
                                        role === "ROLE_DOCTOR" ? "Bác sĩ" :
                                        role === "ROLE_HEAD_OF_DEPARTMENT" ? "Trưởng khoa" :
                                        role === "ROLE_NURSE" ? "Điều dưỡng" :
                                        role === "ROLE_LAB_TECHNICIAN" ? "Bác sĩ xét nghiệm" :
                                        role === "ROLE_CASHIER" ? "Thu ngân" : "Bệnh nhân"
                                    }
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        bgcolor: "#E0F2FE",
                                        color: "#0369A1"
                                    }}
                                />
                            </>
                        )}
                    </Box>
                </Container>
            </Box>

            {/* 2. MAIN NAVBAR */}
            <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ justifyContent: "space-between", py: 0.8, minHeight: "64px !important" }}>
                    {/* Brand Logo */}
                    <Box
                        display="flex"
                        alignItems="center"
                        gap={1.2}
                        component={Link}
                        to="/"
                        sx={{ textDecoration: "none", mr: 2 }}
                    >
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                boxShadow: "0 4px 12px rgba(0, 136, 214, 0.2)"
                            }}
                        >
                            <LocalHospitalIcon sx={{ fontSize: 24, m: "auto" }} />
                        </Box>
                        <Box>
                            <Typography
                                variant="h6"
                                fontWeight="800"
                                sx={{
                                    letterSpacing: "-0.5px",
                                    background: "linear-gradient(135deg, #0088D6 0%, #005A9C 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    lineHeight: 1.1,
                                    fontSize: "1.2rem"
                                }}
                            >
                                YouMed TNT
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, fontSize: "0.7rem", display: "block" }}>
                                Bệnh Viện Thông Minh
                            </Typography>
                        </Box>
                    </Box>

                    {/* Navigation Links - Role Based */}
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ display: { xs: "none", md: "flex" } }}>
                        {/* 1. KHÁCH HOẶC BỆNH NHÂN */}
                        {(!isAuthenticated || role === "ROLE_PATIENT") && (
                            <>
                                <Button
                                    component={Link}
                                    to="/"
                                    sx={getNavBtnSx("/")}
                                >
                                    Trang Chủ
                                </Button>

                                <Button
                                    component={Link}
                                    to="/booking"
                                    sx={getNavBtnSx("/booking")}
                                >
                                    Đặt Lịch Khám
                                </Button>

                                {isAuthenticated && (
                                    <>
                                        <Button
                                            component={Link}
                                            to="/profiles"
                                            sx={getNavBtnSx("/profiles")}
                                        >
                                            Hồ Sơ Bệnh Nhân
                                        </Button>

                                        <Button
                                            component={Link}
                                            to="/my-history"
                                            sx={getNavBtnSx("/my-history")}
                                        >
                                            Phiếu Khám & Lịch Sử
                                        </Button>
                                    </>
                                )}

                                <Button
                                    component={Link}
                                    to="/lookup"
                                    sx={getNavBtnSx("/lookup")}
                                >
                                    Tra Cứu & Sơ Đồ
                                </Button>

                                <Button
                                    component={Link}
                                    to="/chat"
                                    sx={getNavBtnSx("/chat")}
                                >
                                    Tư Vấn Y Tế
                                </Button>

                                {isAuthenticated && (
                                    <>
                                        <Button
                                            onClick={handleUtilityMenuOpen}
                                            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                            sx={{
                                                ...getNavBtnSx("/utilities"),
                                                color: (isActive("/payment") || isActive("/reminders")) ? "#0088D6" : "#334155",
                                                bgcolor: (isActive("/payment") || isActive("/reminders")) ? "#EBF6FE" : "transparent"
                                            }}
                                        >
                                            Tiện Ích
                                        </Button>
                                        <Menu
                                            anchorEl={utilityMenuAnchor}
                                            open={Boolean(utilityMenuAnchor)}
                                            onClose={handleUtilityMenuClose}
                                            PaperProps={{
                                                sx: {
                                                    borderRadius: 2.5,
                                                    minWidth: 200,
                                                    mt: 1,
                                                    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                                                    p: 0.5
                                                }
                                            }}
                                        >
                                            <MenuItem onClick={() => { handleUtilityMenuClose(); navigate("/payment"); }}>
                                                <ListItemIcon><AccountBalanceWalletIcon fontSize="small" sx={{ color: "#F59E0B" }} /></ListItemIcon>
                                                <ListItemText primary="Ví Viện Phí VNPay" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUtilityMenuClose(); navigate("/reminders"); }}>
                                                <ListItemIcon><MedicationIcon fontSize="small" sx={{ color: "#EC4899" }} /></ListItemIcon>
                                                <ListItemText primary="Nhắc Uống Thuốc" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                            </MenuItem>
                                        </Menu>
                                    </>
                                )}
                            </>
                        )}

                        {/* 2. ĐIỀU DƯỠNG */}
                        {role === "ROLE_NURSE" && (
                            <>
                                <Button
                                    component={Link}
                                    to="/nurse/reception"
                                    startIcon={<HowToRegIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/nurse/reception")}
                                >
                                    Tiếp Đón & Cấp STT
                                </Button>
                                <Button
                                    component={Link}
                                    to="/doctor/inpatient"
                                    startIcon={<HotelIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/doctor/inpatient")}
                                >
                                    Quản Lý Buồng Bệnh
                                </Button>
                                <Button
                                    component={Link}
                                    to="/profiles"
                                    startIcon={<PersonIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/profiles")}
                                >
                                    Hồ Sơ Bệnh Nhân
                                </Button>
                            </>
                        )}

                        {/* 3. BÁC SĨ & TRƯỞNG KHOA */}
                        {(role === "ROLE_DOCTOR" || role === "ROLE_HEAD_OF_DEPARTMENT") && (
                            <>
                                <Button
                                    component={Link}
                                    to="/doctor/examinations"
                                    startIcon={<MedicalServicesIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/doctor/examinations")}
                                >
                                    Bàn Khám Lâm Sàng
                                </Button>

                                <Button
                                    component={Link}
                                    to="/doctor/inpatient"
                                    startIcon={<HotelIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/doctor/inpatient")}
                                >
                                    Nội Trú & Buồng Bệnh
                                </Button>

                                <Button
                                    component={Link}
                                    to="/doctor/lab-tests"
                                    startIcon={<ScienceIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/doctor/lab-tests")}
                                >
                                    Cận Lâm Sàng
                                </Button>

                                {role === "ROLE_HEAD_OF_DEPARTMENT" && (
                                    <>
                                        <Button
                                            component={Link}
                                            to="/admin/schedules"
                                            startIcon={<EventNoteIcon sx={{ fontSize: 18 }} />}
                                            sx={getNavBtnSx("/admin/schedules")}
                                        >
                                            Phân Lịch Trực
                                        </Button>

                                        <Button
                                            component={Link}
                                            to="/admin/departments"
                                            startIcon={<LocalHospitalIcon sx={{ fontSize: 18 }} />}
                                            sx={getNavBtnSx("/admin/departments")}
                                        >
                                            Phòng Khám
                                        </Button>
                                    </>
                                )}

                                <Button
                                    component={Link}
                                    to="/doctor/chat"
                                    startIcon={<ChatIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/doctor/chat")}
                                >
                                    Chat Tư Vấn
                                </Button>
                            </>
                        )}

                        {/* 4. BÁC SĨ XÉT NGHIỆM */}
                        {role === "ROLE_LAB_TECHNICIAN" && (
                            <Button
                                component={Link}
                                to="/doctor/lab-tests"
                                startIcon={<ScienceIcon sx={{ fontSize: 18 }} />}
                                sx={getNavBtnSx("/doctor/lab-tests")}
                            >
                                Phòng Xét Nghiệm & KQ
                            </Button>
                        )}

                        {/* 5. THU NGÂN */}
                        {role === "ROLE_CASHIER" && (
                            <Button
                                component={Link}
                                to="/cashier"
                                startIcon={<PointOfSaleIcon sx={{ fontSize: 18 }} />}
                                sx={getNavBtnSx("/cashier")}
                            >
                                Thu Ngân Viện Phí
                            </Button>
                        )}

                        {/* 6. QUẢN LÝ / ADMIN */}
                        {role === "ROLE_ADMIN" && (
                            <>
                                <Button
                                    component={Link}
                                    to="/admin/dashboard"
                                    startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/admin/dashboard")}
                                >
                                    Quản Trị Hệ Thống
                                </Button>
                                <Button
                                    component={Link}
                                    to="/doctor/examinations"
                                    startIcon={<MedicalServicesIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/doctor/examinations")}
                                >
                                    Bàn Khám
                                </Button>
                                <Button
                                    component={Link}
                                    to="/doctor/inpatient"
                                    startIcon={<HotelIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/doctor/inpatient")}
                                >
                                    Nội Trú
                                </Button>
                                <Button
                                    component={Link}
                                    to="/nurse/reception"
                                    startIcon={<HowToRegIcon sx={{ fontSize: 18 }} />}
                                    sx={getNavBtnSx("/nurse/reception")}
                                >
                                    Tiếp Đón
                                </Button>
                            </>
                        )}
                    </Box>

                    {/* Right Action: Auth Buttons & User Menu */}
                    <Box display="flex" alignItems="center" gap={1.2}>
                        {isAuthenticated ? (
                            <>
                                <NotificationMenu />
                                <Box
                                    onClick={handleUserMenuOpen}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        p: "4px 10px 4px 4px",
                                        borderRadius: "30px",
                                        bgcolor: "#F1F5F9",
                                        cursor: "pointer",
                                        border: "1px solid #E2E8F0",
                                        transition: "0.2s",
                                        "&:hover": { bgcolor: "#E2E8F0" }
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            bgcolor: "#0088D6",
                                            width: 32,
                                            height: 32,
                                            fontSize: "0.875rem",
                                            fontWeight: 700
                                        }}
                                    >
                                        {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                                    </Avatar>
                                    <Typography variant="body2" fontWeight="700" color="#1E293B" sx={{ display: { xs: "none", sm: "block" }, fontSize: "0.85rem" }}>
                                        {user?.fullName?.split(" ").slice(-2).join(" ") || "Tài khoản"}
                                    </Typography>
                                    <KeyboardArrowDownIcon fontSize="small" sx={{ color: "#64748B", display: { xs: "none", sm: "block" } }} />
                                </Box>

                                <Menu
                                    anchorEl={userMenuAnchor}
                                    open={Boolean(userMenuAnchor)}
                                    onClose={handleUserMenuClose}
                                    PaperProps={{
                                        sx: {
                                            borderRadius: 3,
                                            minWidth: 220,
                                            mt: 1.5,
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                            p: 1
                                        }
                                    }}
                                >
                                    <Box px={2} py={1}>
                                        <Typography variant="subtitle2" fontWeight="bold" color="#0088D6">
                                            {user?.fullName}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {user?.phone || user?.username || "Thành viên"}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ my: 0.5 }} />

                                    {role === "ROLE_PATIENT" && (
                                        <>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/profiles"); }}>
                                                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Hồ sơ bệnh nhân" primaryTypographyProps={{ fontSize: "0.875rem" }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/my-history"); }}>
                                                <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Phiếu khám & Lịch sử" primaryTypographyProps={{ fontSize: "0.875rem" }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/payment"); }}>
                                                <ListItemIcon><AccountBalanceWalletIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Ví nạp tiền VNPay" primaryTypographyProps={{ fontSize: "0.875rem" }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/reminders"); }}>
                                                <ListItemIcon><MedicationIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Nhắc uống thuốc" primaryTypographyProps={{ fontSize: "0.875rem" }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/chat"); }}>
                                                <ListItemIcon><SupportAgentIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Tư vấn y tế & Chat Bác sĩ" primaryTypographyProps={{ fontSize: "0.875rem" }} />
                                            </MenuItem>
                                            <Divider sx={{ my: 0.5 }} />
                                        </>
                                    )}

                                    <MenuItem onClick={handleLogout} sx={{ color: "#EF4444" }}>
                                        <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: "#EF4444" }} /></ListItemIcon>
                                        <ListItemText primary="Đăng xuất" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 700 }} />
                                    </MenuItem>
                                </Menu>
                            </>
                        ) : (
                            <Box display="flex" gap={1}>
                                <Button
                                    component={Link}
                                    to="/login"
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    sx={{ fontWeight: 700, borderRadius: 2, px: 2, fontSize: "0.85rem" }}
                                >
                                    Đăng Nhập
                                </Button>
                                <Button
                                    component={Link}
                                    to="/register"
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    sx={{ fontWeight: 700, borderRadius: 2, px: 2, fontSize: "0.85rem" }}
                                >
                                    Đăng Ký
                                </Button>
                            </Box>
                        )}

                        {/* Hamburger Button for Mobile */}
                        <IconButton
                            onClick={() => setMobileDrawerOpen(true)}
                            sx={{
                                display: { xs: "flex", md: "none" },
                                color: "#0088D6",
                                bgcolor: "#F1F5F9",
                                p: 0.8,
                                borderRadius: 2
                            }}
                            aria-label="open navigation drawer"
                        >
                            <MenuIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </Container>

            {/* 3. MOBILE NAVIGATION DRAWER */}
            <Drawer
                anchor="left"
                open={mobileDrawerOpen}
                onClose={() => setMobileDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: "80vw", sm: 320 },
                        bgcolor: "#FFFFFF",
                        display: "flex",
                        flexDirection: "column",
                        p: 2.5
                    }
                }}
            >
                {/* Drawer Header */}
                <Box display="flex" alignItems="center" justifyContent="space-between" pb={2} borderBottom="1px solid #E2E8F0">
                    <Box display="flex" alignItems="center" gap={1.2}>
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "8px",
                                background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white"
                            }}
                        >
                            <LocalHospitalIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="800" color="#0088D6">
                                YouMed TNT
                            </Typography>
                            <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                                Hospital Management
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setMobileDrawerOpen(false)} size="small" sx={{ color: "#64748B" }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Drawer Links */}
                <Box sx={{ overflowY: "auto", flexGrow: 1, py: 1.5 }}>
                    <List disablePadding>
                        {(!isAuthenticated || role === "ROLE_PATIENT") && (
                            <>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><HomeIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Trang Chủ" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/booking" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><EventAvailableIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Đặt Lịch Khám" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                {isAuthenticated && (
                                    <>
                                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton component={Link} to="/profiles" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                                <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><PersonIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Hồ Sơ Bệnh Nhân" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                            </ListItemButton>
                                        </ListItem>
                                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton component={Link} to="/my-history" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                                <ListItemIcon sx={{ color: "#00C292", minWidth: 36 }}><HistoryIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Phiếu Khám & Lịch Sử" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                            </ListItemButton>
                                        </ListItem>
                                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton component={Link} to="/payment" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                                <ListItemIcon sx={{ color: "#F59E0B", minWidth: 36 }}><AccountBalanceWalletIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Ví Viện Phí VNPay" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                            </ListItemButton>
                                        </ListItem>
                                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton component={Link} to="/reminders" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                                <ListItemIcon sx={{ color: "#EC4899", minWidth: 36 }}><MedicationIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Nhắc Uống Thuốc" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                            </ListItemButton>
                                        </ListItem>
                                    </>
                                )}
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/lookup" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#64748B", minWidth: 36 }}><SearchIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Tìm Hồ Sơ Đã Mất" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/chat" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><SupportAgentIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Tư Vấn Y Tế & Chat Bác Sĩ" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                            </>
                        )}

                        {role === "ROLE_NURSE" && (
                            <>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/nurse/reception" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><HowToRegIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Tiếp Đón & Cấp STT" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/doctor/inpatient" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><HotelIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Quản Lý Buồng Bệnh" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/profiles" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><PersonIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Hồ Sơ Bệnh Nhân" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                            </>
                        )}

                        {(role === "ROLE_DOCTOR" || role === "ROLE_HEAD_OF_DEPARTMENT") && (
                            <>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/doctor/examinations" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><MedicalServicesIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Bàn Khám Lâm Sàng" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/doctor/inpatient" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><HotelIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Nội Trú & Buồng Bệnh" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/doctor/lab-tests" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><ScienceIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Cận Lâm Sàng" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                {role === "ROLE_HEAD_OF_DEPARTMENT" && (
                                    <>
                                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton component={Link} to="/admin/schedules" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                                <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><EventNoteIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Phân Lịch Trực Khoa" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                            </ListItemButton>
                                        </ListItem>
                                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton component={Link} to="/admin/departments" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                                <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><LocalHospitalIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText primary="Quản Lý Phòng Khám" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                            </ListItemButton>
                                        </ListItem>
                                    </>
                                )}
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/doctor/chat" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><ChatIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Phòng Chat Tư Vấn Bệnh Nhân" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                            </>
                        )}

                        {role === "ROLE_LAB_TECHNICIAN" && (
                            <ListItem disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton component={Link} to="/doctor/lab-tests" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                    <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><ScienceIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Phòng Xét Nghiệm & KQ" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                </ListItemButton>
                            </ListItem>
                        )}

                        {role === "ROLE_CASHIER" && (
                            <ListItem disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton component={Link} to="/cashier" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                    <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><PointOfSaleIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Quầy Thu Ngân Viện Phí" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                </ListItemButton>
                            </ListItem>
                        )}

                        {role === "ROLE_ADMIN" && (
                            <>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/admin/dashboard" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Portal Quản Trị Hệ Thống" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/doctor/examinations" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><MedicalServicesIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Bàn Khám Lâm Sàng" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/doctor/inpatient" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><HotelIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Nội Trú & Buồng Bệnh" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/nurse/reception" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#0088D6", minWidth: 36 }}><HowToRegIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Tiếp Đón & Cấp STT" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                            </>
                        )}

                        {/* Tiện ích thiết bị sảnh */}
                        <Divider sx={{ my: 1 }} />
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton component={Link} to="/kiosk" target="_blank" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                <ListItemIcon sx={{ color: "#D97706", minWidth: 36 }}><QrCodeScannerIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Kiosk Lấy Số Sảnh Tự Phục Vụ" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton component={Link} to="/queue-display" target="_blank" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                <ListItemIcon sx={{ color: "#6366F1", minWidth: 36 }}><TvIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Màn Hình LED TV Gọi Số" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>

                {/* Drawer Footer */}
                <Box pt={2} borderTop="1px solid #E2E8F0">
                    {isAuthenticated ? (
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            startIcon={<LogoutIcon />}
                            onClick={handleLogout}
                            sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                            Đăng Xuất
                        </Button>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={1}>
                            <Button
                                fullWidth
                                component={Link}
                                to="/login"
                                variant="contained"
                                color="primary"
                                onClick={() => setMobileDrawerOpen(false)}
                                sx={{ borderRadius: 2, fontWeight: 700 }}
                            >
                                Đăng Nhập
                            </Button>
                            <Button
                                fullWidth
                                component={Link}
                                to="/register"
                                variant="outlined"
                                color="primary"
                                onClick={() => setMobileDrawerOpen(false)}
                                sx={{ borderRadius: 2, fontWeight: 700 }}
                            >
                                Đăng Ký Tài Khoản
                            </Button>
                        </Box>
                    )}
                </Box>
            </Drawer>
        </AppBar>
    );
}
