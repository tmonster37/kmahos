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
    ListItemButton,
    Tooltip
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
import ScienceIcon from "@mui/icons-material/Science";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import TvIcon from "@mui/icons-material/Tv";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import HotelIcon from "@mui/icons-material/Hotel";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import EventIcon from "@mui/icons-material/Event";
import NotificationMenu from "./NotificationMenu";
import { useAuth } from "../../context/AuthContext";
import designTokens from "../../theme/designTokens";

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [userMenuAnchor, setUserMenuAnchor] = useState(null);
    const [patientRecordsAnchor, setPatientRecordsAnchor] = useState(null);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const handleUserMenuOpen = (e) => setUserMenuAnchor(e.currentTarget);
    const handleUserMenuClose = () => setUserMenuAnchor(null);
    const handlePatientRecordsOpen = (e) => setPatientRecordsAnchor(e.currentTarget);
    const handlePatientRecordsClose = () => setPatientRecordsAnchor(null);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        handleUserMenuClose();
        logout();
        navigate("/login");
    };

    const role = user?.role || "GUEST";
    const isStaff = ["ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_NURSE", "ROLE_LAB_TECHNICIAN", "ROLE_CASHIER", "ROLE_PHARMACIST", "ROLE_ADMIN"].includes(role);

    const getNavBtnSx = (path) => ({
        color: isActive(path) ? designTokens.brand.primary : designTokens.neutral.textSecondary,
        fontWeight: isActive(path) ? 700 : 600,
        bgcolor: isActive(path) ? designTokens.brand.primaryLight : "transparent",
        borderRadius: 2,
        px: 1.5,
        py: 0.7,
        fontSize: "0.85rem",
        textTransform: "none",
        whiteSpace: "nowrap",
        letterSpacing: "-0.2px",
        transition: "all 0.15s ease-in-out",
        "&:hover": {
            bgcolor: isActive(path) ? designTokens.brand.primaryLight : designTokens.neutral.hoverBg,
            color: designTokens.brand.primary
        }
    });

    // Thông tin nút tác nghiệp y tế nhanh cho nhân viên
    const getStaffQuickAction = () => {
        switch (role) {
            case "ROLE_DOCTOR":
                return { label: "Bàn Khám Lâm Sàng", path: "/doctor/examinations", icon: <MedicalServicesIcon sx={{ fontSize: 18 }} />, color: "primary" };
            case "ROLE_HEAD_OF_DEPARTMENT":
                return { label: "Bàn Khám & Cổng Khoa", path: "/doctor/examinations", icon: <MedicalServicesIcon sx={{ fontSize: 18 }} />, color: "secondary" };
            case "ROLE_NURSE":
                return { label: "Bàn Tiếp Đón & STT", path: "/nurse/reception", icon: <HowToRegIcon sx={{ fontSize: 18 }} />, color: "info" };
            case "ROLE_LAB_TECHNICIAN":
                return { label: "Phòng Xét Nghiệm", path: "/doctor/lab-tests", icon: <ScienceIcon sx={{ fontSize: 18 }} />, color: "warning" };
            case "ROLE_PHARMACIST":
                return { label: "Kho Dược & Tủ Thuốc", path: "/admin/pharmacy-inventory", icon: <Inventory2Icon sx={{ fontSize: 18 }} />, color: "secondary" };
            case "ROLE_CASHIER":
                return { label: "Quầy Thu Ngân", path: "/cashier", icon: <PointOfSaleIcon sx={{ fontSize: 18 }} />, color: "success" };
            case "ROLE_ADMIN":
                return { label: "Cổng Quản Trị Hệ Thống", path: "/admin/dashboard", icon: <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />, color: "error" };
            default:
                return null;
        }
    };

    const staffAction = getStaffQuickAction();

    return (
        <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: "#FFFFFF", borderBottom: `1px solid ${designTokens.neutral.border}`, zIndex: 1100 }}>
            {/* 1. TOP UTILITY STRIP: Hotline y tế & Trạng thái tài khoản */}
            <Box sx={{ bgcolor: designTokens.neutral.hoverBg, borderBottom: `1px solid ${designTokens.neutral.borderLight}`, py: 0.5, fontSize: "0.825rem", color: designTokens.neutral.textSecondary }}>
                <Container maxWidth="xl" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Box display="flex" alignItems="center" gap={0.8}>
                            <LocalHospitalIcon sx={{ fontSize: 16, color: designTokens.brand.primary }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: designTokens.neutral.textSecondary }}>
                                Bệnh Viện Đa Khoa Quốc Tế TNT
                            </Typography>
                        </Box>
                        <Divider orientation="vertical" flexItem sx={{ height: 12, my: "auto" }} />
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <PhoneInTalkIcon sx={{ fontSize: 13, color: designTokens.status.danger.main }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Cấp cứu 24/7 & Hotline: <b style={{ color: designTokens.status.danger.main }}>1900 8888</b>
                            </Typography>
                        </Box>
                    </Box>

                    {/* Phía bên phải: Trạng thái vai trò nhân viên / bệnh nhân */}
                    <Box display="flex" alignItems="center" gap={1.5}>

                        {isAuthenticated && (
                            <Chip
                                label={
                                    role === "ROLE_ADMIN" ? "Quản trị viên" :
                                    role === "ROLE_DOCTOR" ? "Bác sĩ" :
                                    role === "ROLE_HEAD_OF_DEPARTMENT" ? "Trưởng khoa" :
                                    role === "ROLE_NURSE" ? "Điều dưỡng" :
                                    role === "ROLE_LAB_TECHNICIAN" ? "KTV Xét nghiệm" :
                                    role === "ROLE_CASHIER" ? "Thu ngân" : "Bệnh nhân"
                                }
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    bgcolor: designTokens.brand.primaryLight,
                                    color: designTokens.brand.primaryDark
                                }}
                            />
                        )}
                    </Box>
                </Container>
            </Box>

            {/* 2. MAIN NAVBAR: Logo & Menu Bệnh Nhân Tinh Gọn */}
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
                            component="img"
                            src="/images/logo.png"
                            alt="Logo Bệnh Viện TNT"
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: "10px",
                                objectFit: "contain",
                                filter: "drop-shadow(0 2px 8px rgba(13, 148, 136, 0.25))"
                            }}
                        />
                        <Box>
                            <Typography
                                variant="h6"
                                fontWeight="800"
                                sx={{
                                    letterSpacing: "-0.5px",
                                    color: designTokens.brand.primaryDark,
                                    lineHeight: 1.1,
                                    fontSize: "1.2rem"
                                }}
                            >
                                YouMed TNT
                            </Typography>
                            <Typography variant="caption" sx={{ color: designTokens.neutral.textMuted, fontWeight: 600, fontSize: "0.7rem", display: "block" }}>
                                Bệnh Viện Thông Minh
                            </Typography>
                        </Box>
                    </Box>

                    {/* Navigation Links - Dành cho Bệnh nhân & Khách */}
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ display: { xs: "none", md: "flex" } }}>
                        <Button component={Link} to="/" sx={getNavBtnSx("/")}>
                            Trang Chủ
                        </Button>

                        <Button component={Link} to="/booking" sx={getNavBtnSx("/booking")}>
                            Đặt Lịch Khám
                        </Button>

                        <Button component={Link} to="/lookup" sx={getNavBtnSx("/lookup")}>
                            Tra Cứu & Sơ Đồ
                        </Button>

                        <Button component={Link} to="/verify-prescription" sx={getNavBtnSx("/verify-prescription")}>
                            Xác Thực Đơn Thuốc
                        </Button>

                        <Button component={Link} to="/chat" sx={getNavBtnSx("/chat")}>
                            Tư Vấn Y Tế
                        </Button>

                        {/* Dropdown Sổ Khám Điện Tử (Chỉ dành riêng cho Bệnh nhân đã đăng nhập) */}
                        {isAuthenticated && !isStaff && (
                            <>
                                <Button
                                    onClick={handlePatientRecordsOpen}
                                    endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        ...getNavBtnSx("/patient-records"),
                                        color: (isActive("/profiles") || isActive("/my-history") || isActive("/my-bills") || isActive("/payment") || isActive("/reminders"))
                                            ? designTokens.brand.primary
                                            : designTokens.neutral.textSecondary,
                                        bgcolor: (isActive("/profiles") || isActive("/my-history") || isActive("/my-bills") || isActive("/payment") || isActive("/reminders"))
                                            ? designTokens.brand.primaryLight
                                            : "transparent"
                                    }}
                                >
                                    Sổ Khám Điện Tử
                                </Button>
                                <Menu
                                    anchorEl={patientRecordsAnchor}
                                    open={Boolean(patientRecordsAnchor)}
                                    onClose={handlePatientRecordsClose}
                                    PaperProps={{
                                        sx: {
                                            borderRadius: 2.5,
                                            minWidth: 220,
                                            mt: 1,
                                            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                                            p: 0.5
                                        }
                                    }}
                                >
                                    <MenuItem onClick={() => { handlePatientRecordsClose(); navigate("/profiles?tab=profiles"); }}>
                                        <ListItemIcon><FolderSharedIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                        <ListItemText primary="Hồ Sơ Bệnh Nhân (Gia Đình)" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handlePatientRecordsClose(); navigate("/profiles?tab=ticket"); }}>
                                        <ListItemIcon><QrCodeScannerIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                        <ListItemText primary="Phiếu Khám Bệnh (Barcode & STT)" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handlePatientRecordsClose(); navigate("/my-history"); }}>
                                        <ListItemIcon><HistoryIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                        <ListItemText primary="Sổ Bệnh Án & Lịch Sử Khám" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handlePatientRecordsClose(); navigate("/my-bills"); }}>
                                        <ListItemIcon><ReceiptLongIcon fontSize="small" sx={{ color: designTokens.status.info.main }} /></ListItemIcon>
                                        <ListItemText primary="Hóa Đơn Viện Phí" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handlePatientRecordsClose(); navigate("/payment"); }}>
                                        <ListItemIcon><AccountBalanceWalletIcon fontSize="small" sx={{ color: designTokens.status.warning.main }} /></ListItemIcon>
                                        <ListItemText primary="Ví Viện Phí PayOS" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handlePatientRecordsClose(); navigate("/reminders"); }}>
                                        <ListItemIcon><MedicationIcon fontSize="small" sx={{ color: "#EC4899" }} /></ListItemIcon>
                                        <ListItemText primary="Nhắc Uống Thuốc" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                    </MenuItem>
                                </Menu>
                            </>
                        )}

                        {/* Nút tác nghiệp nhanh nổi bật dành cho Nhân viên y tế / Admin */}
                        {staffAction && (
                            <Button
                                component={Link}
                                to={staffAction.path}
                                variant="contained"
                                color={staffAction.color}
                                startIcon={staffAction.icon}
                                sx={{
                                    ml: 1,
                                    textTransform: "none",
                                    fontWeight: 700,
                                    fontSize: "0.825rem",
                                    borderRadius: 2,
                                    px: 1.8,
                                    py: 0.7,
                                    boxShadow: "0 2px 8px rgba(0, 136, 214, 0.25)"
                                }}
                            >
                                {staffAction.label}
                            </Button>
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
                                        bgcolor: designTokens.neutral.hoverBg,
                                        cursor: "pointer",
                                        border: `1px solid ${designTokens.neutral.border}`,
                                        transition: "0.2s",
                                        "&:hover": { bgcolor: designTokens.neutral.borderLight }
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            bgcolor: designTokens.brand.primary,
                                            width: 32,
                                            height: 32,
                                            fontSize: "0.875rem",
                                            fontWeight: 700
                                        }}
                                    >
                                        {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                                    </Avatar>
                                    <Typography variant="body2" fontWeight="700" color={designTokens.neutral.textPrimary} sx={{ display: { xs: "none", sm: "block" }, fontSize: "0.85rem" }}>
                                        {user?.fullName?.split(" ").slice(-2).join(" ") || "Tài khoản"}
                                    </Typography>
                                    <KeyboardArrowDownIcon fontSize="small" sx={{ color: designTokens.neutral.textMuted, display: { xs: "none", sm: "block" } }} />
                                </Box>

                                <Menu
                                    anchorEl={userMenuAnchor}
                                    open={Boolean(userMenuAnchor)}
                                    onClose={handleUserMenuClose}
                                    PaperProps={{
                                        sx: {
                                            borderRadius: 3,
                                            minWidth: 230,
                                            mt: 1.5,
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                            p: 1
                                        }
                                    }}
                                >
                                    <Box px={2} py={1}>
                                        <Typography variant="subtitle2" fontWeight="bold" color={designTokens.brand.primary}>
                                            {user?.fullName}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {user?.phoneNumber || user?.phone || user?.username || "Thành viên"}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ my: 0.5 }} />

                                    {/* Phím tắt chức năng theo đúng phạm vi quyền hạn của từng vai trò */}
                                    {isStaff ? (
                                        <>
                                            {role === "ROLE_ADMIN" && (
                                                <>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/dashboard"); }}>
                                                        <ListItemIcon><AdminPanelSettingsIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                                        <ListItemText primary="Cổng Quản Trị Hệ Thống" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/accounts"); }}>
                                                        <ListItemIcon><ManageAccountsIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                                        <ListItemText primary="Quản Lý Tài Khoản & Quyền" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                </>
                                            )}

                                            {role === "ROLE_HEAD_OF_DEPARTMENT" && (
                                                <>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/dashboard"); }}>
                                                        <ListItemIcon><AdminPanelSettingsIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                                        <ListItemText primary="Cổng Điều Hành Trưởng Khoa" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/examinations"); }}>
                                                        <ListItemIcon><MedicalServicesIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                                        <ListItemText primary="Bàn Khám Lâm Sàng" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/schedules"); }}>
                                                        <ListItemIcon><EventIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                                        <ListItemText primary="Phân Lịch Trực Ca Khoa" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                </>
                                            )}

                                            {role === "ROLE_DOCTOR" && (
                                                <>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/examinations"); }}>
                                                        <ListItemIcon><MedicalServicesIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                                        <ListItemText primary="Bàn Khám Lâm Sàng" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/inpatient"); }}>
                                                        <ListItemIcon><HotelIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                                        <ListItemText primary="Quản Lý Điều Trị Nội Trú" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                </>
                                            )}

                                            {role === "ROLE_NURSE" && (
                                                <>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/nurse/reception"); }}>
                                                        <ListItemIcon><HowToRegIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                                        <ListItemText primary="Bàn Tiếp Đón & Cấp STT" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/inpatient"); }}>
                                                        <ListItemIcon><HotelIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                                        <ListItemText primary="Quản Lý Buồng Bệnh Nội Trú" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                </>
                                            )}

                                            {role === "ROLE_LAB_TECHNICIAN" && (
                                                <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/lab-tests"); }}>
                                                    <ListItemIcon><ScienceIcon fontSize="small" sx={{ color: "#B45309" }} /></ListItemIcon>
                                                    <ListItemText primary="Phòng Xét Nghiệm & KQ" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                </MenuItem>
                                            )}

                                            {role === "ROLE_PHARMACIST" && (
                                                <>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/pharmacy-inventory"); }}>
                                                        <ListItemIcon><Inventory2Icon fontSize="small" sx={{ color: "#7C3AED" }} /></ListItemIcon>
                                                        <ListItemText primary="Kho Dược Đa Cấp & FEFO" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/medicines"); }}>
                                                        <ListItemIcon><MedicationIcon fontSize="small" sx={{ color: "#7C3AED" }} /></ListItemIcon>
                                                        <ListItemText primary="Danh Mục Thuốc" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                    </MenuItem>
                                                </>
                                            )}

                                            {role === "ROLE_CASHIER" && (
                                                <MenuItem onClick={() => { handleUserMenuClose(); navigate("/cashier"); }}>
                                                    <ListItemIcon><PointOfSaleIcon fontSize="small" sx={{ color: designTokens.status.success.main }} /></ListItemIcon>
                                                    <ListItemText primary="Quầy Thu Ngân Viện Phí" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                                </MenuItem>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {/* Menu Sổ khám chỉ dành cho bệnh nhân */}
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/profiles"); }}>
                                                <ListItemIcon><PersonIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                                <ListItemText primary="Hồ Sơ Bệnh Nhân" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/my-history"); }}>
                                                <ListItemIcon><HistoryIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                                <ListItemText primary="Phiếu Khám & Lịch Sử" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/my-bills"); }}>
                                                <ListItemIcon><ReceiptLongIcon fontSize="small" sx={{ color: designTokens.status.info.main }} /></ListItemIcon>
                                                <ListItemText primary="Hóa Đơn Viện Phí" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/payment"); }}>
                                                <ListItemIcon><AccountBalanceWalletIcon fontSize="small" sx={{ color: designTokens.status.warning.main }} /></ListItemIcon>
                                                <ListItemText primary="Ví Viện Phí PayOS" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                            </MenuItem>
                                            <MenuItem onClick={() => { handleUserMenuClose(); navigate("/reminders"); }}>
                                                <ListItemIcon><MedicationIcon fontSize="small" sx={{ color: "#EC4899" }} /></ListItemIcon>
                                                <ListItemText primary="Nhắc Uống Thuốc" primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }} />
                                            </MenuItem>
                                        </>
                                    )}

                                    <Divider sx={{ my: 0.5 }} />

                                    <MenuItem onClick={handleLogout} sx={{ color: designTokens.status.danger.main }}>
                                        <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: designTokens.status.danger.main }} /></ListItemIcon>
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
                                color: designTokens.brand.primary,
                                bgcolor: designTokens.neutral.hoverBg,
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

            {/* 3. MOBILE NAVIGATION DRAWER: Phân nhóm rõ ràng cho điện thoại */}
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
                <Box display="flex" alignItems="center" justifyContent="space-between" pb={2} borderBottom={`1px solid ${designTokens.neutral.border}`}>
                    <Box display="flex" alignItems="center" gap={1.2}>
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "8px",
                                background: `linear-gradient(135deg, ${designTokens.brand.primary} 0%, ${designTokens.secondary.main} 100%)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#FFFFFF"
                            }}
                        >
                            <LocalHospitalIcon sx={{ fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" fontWeight="800" color={designTokens.brand.primary}>
                                YouMed TNT
                            </Typography>
                            <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                                Bệnh Viện Thông Minh
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={() => setMobileDrawerOpen(false)} size="small" sx={{ color: designTokens.neutral.textMuted }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Drawer Links */}
                <Box sx={{ overflowY: "auto", flexGrow: 1, py: 1.5 }}>
                    {/* Mục Tác Nghiệp Y Tế nếu là nhân viên */}
                    {staffAction && (
                        <Box mb={2}>
                            <Typography variant="caption" fontWeight="bold" color={designTokens.neutral.textMuted} sx={{ px: 1, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                                Khu Vực Làm Việc Y Tế
                            </Typography>
                            <ListItem disablePadding sx={{ mt: 0.5 }}>
                                <ListItemButton
                                    component={Link}
                                    to={staffAction.path}
                                    onClick={() => setMobileDrawerOpen(false)}
                                    sx={{
                                        borderRadius: 2,
                                        bgcolor: designTokens.brand.primaryLight,
                                        color: designTokens.brand.primaryDark,
                                        border: `1px solid ${designTokens.brand.primaryBorder}`
                                    }}
                                >
                                    <ListItemIcon sx={{ color: designTokens.brand.primary, minWidth: 36 }}>{staffAction.icon}</ListItemIcon>
                                    <ListItemText primary={staffAction.label} primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 700 }} />
                                </ListItemButton>
                            </ListItem>
                            <Divider sx={{ my: 1.5 }} />
                        </Box>
                    )}

                    {/* Dịch vụ Khám chữa bệnh công khai */}
                    <Typography variant="caption" fontWeight="bold" color={designTokens.neutral.textMuted} sx={{ px: 1, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                        Dịch Vụ Bệnh Viện
                    </Typography>
                    <List disablePadding sx={{ mt: 0.5 }}>
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton component={Link} to="/" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                <ListItemIcon sx={{ color: designTokens.brand.primary, minWidth: 36 }}><HomeIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Trang Chủ" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton component={Link} to="/booking" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                <ListItemIcon sx={{ color: designTokens.brand.primary, minWidth: 36 }}><EventAvailableIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Đặt Lịch Khám" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton component={Link} to="/lookup" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                <ListItemIcon sx={{ color: designTokens.neutral.textMuted, minWidth: 36 }}><SearchIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Tra Cứu Hồ Sơ & Sơ Đồ" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton component={Link} to="/verify-prescription" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                <ListItemIcon sx={{ color: designTokens.secondary.main, minWidth: 36 }}><VerifiedUserIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Xác Thực Đơn Thuốc" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton component={Link} to="/chat" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                <ListItemIcon sx={{ color: designTokens.brand.primary, minWidth: 36 }}><SupportAgentIcon fontSize="small" /></ListItemIcon>
                                <ListItemText primary="Tư Vấn Y Tế Trực Tuyến" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                            </ListItemButton>
                        </ListItem>
                    </List>

                    {/* Sổ khám điện tử (Chỉ dành riêng cho Bệnh nhân) */}
                    {isAuthenticated && !isStaff && (
                        <>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography variant="caption" fontWeight="bold" color={designTokens.neutral.textMuted} sx={{ px: 1, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                                Sổ Khám Điện Tử
                            </Typography>
                            <List disablePadding sx={{ mt: 0.5 }}>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/profiles" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: designTokens.brand.primary, minWidth: 36 }}><FolderSharedIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Hồ Sơ Bệnh Nhân" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/my-history" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: designTokens.secondary.main, minWidth: 36 }}><HistoryIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Phiếu Khám & Lịch Sử" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/my-bills" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: designTokens.status.info.main, minWidth: 36 }}><ReceiptLongIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Hóa Đơn Viện Phí" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/payment" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: designTokens.status.warning.main, minWidth: 36 }}><AccountBalanceWalletIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Ví Viện Phí PayOS" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton component={Link} to="/reminders" onClick={() => setMobileDrawerOpen(false)} sx={{ borderRadius: 2 }}>
                                        <ListItemIcon sx={{ color: "#EC4899", minWidth: 36 }}><MedicationIcon fontSize="small" /></ListItemIcon>
                                        <ListItemText primary="Nhắc Uống Thuốc" primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                            </List>
                        </>
                    )}
                </Box>

                {/* Drawer Footer */}
                <Box pt={2} borderTop={`1px solid ${designTokens.neutral.border}`}>
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
