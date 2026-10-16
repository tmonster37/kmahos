import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Divider,
    Button,
    Avatar,
    IconButton,
    AppBar,
    Toolbar,
    Chip,
    Tooltip,
    useMediaQuery,
    useTheme
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MedicationIcon from "@mui/icons-material/Medication";
import EventIcon from "@mui/icons-material/Event";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import ScienceIcon from "@mui/icons-material/Science";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import LogoutIcon from "@mui/icons-material/Logout";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import MenuIcon from "@mui/icons-material/Menu";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import HubIcon from "@mui/icons-material/Hub";
import HotelIcon from "@mui/icons-material/Hotel";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import TvIcon from "@mui/icons-material/Tv";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useAuth } from "../context/AuthContext";
import designTokens from "../theme/designTokens";

const drawerWidth = 270;

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Phân nhóm danh mục quản trị theo 5 khối nghiệp vụ y tế chuẩn mực
    const adminMenuGroups = [
        {
            title: "Tổng Quan & Điều Hành",
            items: [
                { text: "Dashboard Thống Kê", icon: <DashboardIcon />, path: "/admin/dashboard" }
            ]
        },
        {
            title: "Khám Chữa Bệnh & Lâm Sàng",
            items: [
                { text: "Quản Lý Bệnh Nhân", icon: <PeopleAltIcon />, path: "/admin/patients" },
                { text: "Quản Lý Buồng Bệnh Nội Trú", icon: <HotelIcon />, path: "/doctor/inpatient" },
                { text: "Quầy Thu Ngân Viện Phí", icon: <PointOfSaleIcon />, path: "/cashier" }
            ]
        },
        {
            title: "Tiếp Đón & Thiết Bị Sảnh",
            items: [
                { text: "Bàn Tiếp Đón & STT", icon: <HowToRegIcon />, path: "/nurse/reception" },
                { text: "Cây Kiosk Bốc Số Sảnh", icon: <QrCodeScannerIcon />, path: "/kiosk", external: true },
                { text: "Màn Hình LED TV Gọi Số", icon: <TvIcon />, path: "/queue-display", external: true }
            ]
        },
        {
            title: "Nhân Lực & Khoa Phòng",
            items: [
                { text: "Quản Lý Nhân Viên & Bác Sĩ", icon: <PersonSearchIcon />, path: "/admin/doctors" },
                { text: "Phân Lịch Trực Ca", icon: <EventIcon />, path: "/admin/schedules" },
                { text: "Quản Lý Khoa Khám", icon: <LocalHospitalIcon />, path: "/admin/departments" },
                { text: "Quản Lý Buồng Phòng", icon: <MeetingRoomIcon />, path: "/admin/rooms" }
            ]
        },
        {
            title: "Dược & Vật Tư Y Tế",
            items: [
                { text: "Quản Lý Thuốc & Dược Phẩm", icon: <MedicationIcon />, path: "/admin/medicines" },
                { text: "Kho Dược Đa Cấp & FEFO", icon: <Inventory2Icon />, path: "/admin/pharmacy-inventory" }
            ]
        },
        {
            title: "Tài Chính & Hệ Thống",
            items: [
                { text: "Quản Lý Dịch Vụ CLS", icon: <ScienceIcon />, path: "/admin/services" },
                { text: "Quản Lý Thanh Toán & Đối Soát", icon: <ReceiptLongIcon />, path: "/admin/transactions" },
                { text: "Cổng LIS/RIS & EHR Concept", icon: <HubIcon />, path: "/admin/ehr-gateway" },
                { text: "Quản Lý Tài Khoản & Quyền", icon: <ManageAccountsIcon />, path: "/admin/accounts" }
            ]
        }
    ];

    // Phân nhóm danh mục cho Trưởng Khoa (Chỉ giới hạn trong phạm vi chuyên môn & khoa phòng)
    const deptHeadMenuGroups = [
        {
            title: "Điều Hành & Báo Cáo Khoa",
            items: [
                { text: "Dashboard Thống Kê Khoa", icon: <DashboardIcon />, path: "/admin/dashboard" },
                { text: "Phân Lịch Trực Khoa", icon: <EventIcon />, path: "/admin/schedules" },
                { text: "Quản Lý Khoa Phòng", icon: <LocalHospitalIcon />, path: "/admin/departments" },
                { text: "Danh Sách Phòng Khám", icon: <MeetingRoomIcon />, path: "/admin/rooms" }
            ]
        },
        {
            title: "Tác Nghiệp Chuyên Môn",
            items: [
                { text: "Bàn Khám Lâm Sàng", icon: <MedicalServicesIcon />, path: "/doctor/examinations" },
                { text: "Quản Lý Buồng Bệnh Nội Trú", icon: <HotelIcon />, path: "/doctor/inpatient" },
                { text: "Phòng Xét Nghiệm & KQ", icon: <ScienceIcon />, path: "/doctor/lab-tests" }
            ]
        },
        {
            title: "Vật Tư & Kỹ Thuật Khoa",
            items: [
                { text: "Kho Dược & Tủ Trực Khoa", icon: <Inventory2Icon />, path: "/admin/pharmacy-inventory" },
                { text: "Cổng LIS/RIS & EHR Concept", icon: <HubIcon />, path: "/admin/ehr-gateway" }
            ]
        }
    ];

    // Phân nhóm danh mục cho Dược Sĩ (Chỉ quản lý kho dược và danh mục thuốc)
    const pharmacistMenuGroups = [
        {
            title: "Dược & Vật Tư Y Tế",
            items: [
                { text: "Kho Dược Đa Cấp & FEFO", icon: <Inventory2Icon />, path: "/admin/pharmacy-inventory" },
                { text: "Quản Lý Thuốc & Dược Phẩm", icon: <MedicationIcon />, path: "/admin/medicines" }
            ]
        }
    ];

    let menuGroups = adminMenuGroups;
    if (user?.role === "ROLE_HEAD_OF_DEPARTMENT") {
        menuGroups = deptHeadMenuGroups;
    } else if (user?.role === "ROLE_PHARMACIST") {
        menuGroups = pharmacistMenuGroups;
    }

    const drawerContent = (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#FFFFFF", color: designTokens.neutral.textPrimary, borderRight: `1px solid ${designTokens.neutral.border}` }}>
            {/* Header Brand Sidebar */}
            <Box p={2.2} sx={{ borderBottom: `1px solid ${designTokens.neutral.border}` }}>
                <Box display="flex" alignItems="center" gap={1.2}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            background: `linear-gradient(135deg, ${designTokens.brand.primary} 0%, ${designTokens.secondary.main} 100%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            boxShadow: "0 4px 10px rgba(0, 136, 214, 0.25)"
                        }}
                    >
                        <LocalHospitalIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography
                            variant="subtitle1"
                            fontWeight="800"
                            sx={{
                                letterSpacing: "-0.3px",
                                color: designTokens.brand.primaryDark,
                                lineHeight: 1.1,
                                fontSize: "1.05rem"
                            }}
                        >
                            YouMed TNT
                        </Typography>
                        <Typography variant="caption" sx={{ color: designTokens.neutral.textMuted, fontWeight: 700, fontSize: "0.68rem" }}>
                            {user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "CỔNG TRƯỞNG KHOA" : "QUẢN TRỊ BỆNH VIỆN"}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Menu List phân nhóm */}
            <Box sx={{ px: 1.5, py: 1.5, flexGrow: 1, overflowY: "auto" }}>
                {menuGroups.map((group, groupIdx) => (
                    <Box key={group.title} sx={{ mb: 1.8 }}>
                        <Typography
                            variant="caption"
                            sx={{
                                px: 1.2,
                                py: 0.4,
                                display: "block",
                                fontWeight: 800,
                                fontSize: "0.67rem",
                                letterSpacing: "0.5px",
                                color: designTokens.neutral.textMuted,
                                textTransform: "uppercase"
                            }}
                        >
                            {group.title}
                        </Typography>
                        <List disablePadding sx={{ mt: 0.3 }}>
                            {group.items.map((item) => {
                                const isCurrent = location.pathname === item.path;
                                return (
                                    <ListItem key={item.text} disablePadding sx={{ mb: 0.4 }}>
                                        <ListItemButton
                                            component={item.external ? "a" : Link}
                                            {...(item.external ? { href: item.path, target: "_blank", rel: "noreferrer" } : { to: item.path })}
                                            onClick={() => isMobile && setMobileOpen(false)}
                                            sx={{
                                                borderRadius: 2,
                                                py: 0.75,
                                                px: 1.2,
                                                bgcolor: isCurrent ? designTokens.brand.primaryLight : "transparent",
                                                color: isCurrent ? designTokens.brand.primary : designTokens.neutral.textSecondary,
                                                border: isCurrent ? `1px solid ${designTokens.brand.primaryBorder}` : "1px solid transparent",
                                                transition: "all 0.15s ease-in-out",
                                                "&:hover": {
                                                    bgcolor: isCurrent ? designTokens.brand.primaryLight : designTokens.neutral.hoverBg,
                                                    color: designTokens.brand.primary,
                                                    "& .MuiListItemIcon-root": { color: designTokens.brand.primary }
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ color: isCurrent ? designTokens.brand.primary : designTokens.neutral.textMuted, minWidth: 32, transition: "color 0.15s" }}>
                                                {React.cloneElement(item.icon, { sx: { fontSize: 19 } })}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={item.text}
                                                primaryTypographyProps={{
                                                    fontSize: "0.825rem",
                                                    fontWeight: isCurrent ? 700 : 500,
                                                    color: "inherit"
                                                }}
                                            />
                                            {item.external && (
                                                <OpenInNewIcon sx={{ fontSize: 13, color: designTokens.neutral.textMuted, ml: 0.5, opacity: 0.7 }} />
                                            )}
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                        {groupIdx < menuGroups.length - 1 && <Divider sx={{ my: 1, borderColor: designTokens.neutral.borderLight }} />}
                    </Box>
                ))}
            </Box>

            {/* Bottom Logout Button */}
            <Box sx={{ p: 1.8, borderTop: `1px solid ${designTokens.neutral.border}`, bgcolor: designTokens.neutral.hoverBg }}>
                <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.825rem", textTransform: "none", py: 0.8 }}
                >
                    Đăng Xuất Phiên
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box display="flex" minHeight="100vh" bgcolor={designTokens.neutral.bg}>
            {/* 1. Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", lg: "none" },
                    "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* 2. Desktop Permanent Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: "none", lg: "block" },
                    width: drawerWidth,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", borderRight: "none" },
                }}
                open
            >
                {drawerContent}
            </Drawer>

            {/* 3. Main Content Container */}
            <Box display="flex" flexDirection="column" flexGrow={1} sx={{ width: { lg: `calc(100% - ${drawerWidth}px)` }, minHeight: "100vh" }}>
                {/* Admin Header Bar */}
                <AppBar
                    position="sticky"
                    color="inherit"
                    elevation={0}
                    sx={{
                        bgcolor: "#FFFFFF",
                        borderBottom: `1px solid ${designTokens.neutral.border}`,
                        zIndex: (th) => th.zIndex.drawer + 1
                    }}
                >
                    <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 3 }, minHeight: "56px !important" }}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                            <IconButton
                                color="inherit"
                                aria-label="open drawer"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ display: { lg: "none" }, color: designTokens.brand.primary }}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Typography variant="h6" fontWeight="bold" color={designTokens.neutral.textPrimary} sx={{ fontSize: { xs: "0.95rem", sm: "1.05rem" } }}>
                                {user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "Cổng Điều Hành Trưởng Khoa" : user?.role === "ROLE_PHARMACIST" ? "Cổng Quản Lý Dược Phẩm" : "Cổng Quản Trị Hệ Thống Y Tế"}
                            </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1.2}>
                            {/* Phím tắt sang Bàn Khám Lâm Sàng cho Bác sĩ / Trưởng khoa */}
                            {(user?.role === "ROLE_DOCTOR" || user?.role === "ROLE_HEAD_OF_DEPARTMENT" || user?.role === "ROLE_ADMIN") && (
                                <Tooltip title="Mở Bàn Khám Lâm Sàng">
                                    <Button
                                        component={Link}
                                        to="/doctor/examinations"
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<MedicalServicesIcon />}
                                        sx={{
                                            textTransform: "none",
                                            fontWeight: 700,
                                            borderRadius: 2,
                                            fontSize: "0.78rem",
                                            display: { xs: "none", sm: "inline-flex" }
                                        }}
                                    >
                                        Bàn Khám
                                    </Button>
                                </Tooltip>
                            )}


                            <Chip
                                label={user?.role === "ROLE_ADMIN" ? "QUẢN TRỊ VIÊN" : user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "TRƯỞNG KHOA" : user?.role === "ROLE_PHARMACIST" ? "DƯỢC SĨ" : user?.role || "STAFF"}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 800, fontSize: "0.7rem", height: 24 }}
                            />

                            <Avatar
                                sx={{
                                    bgcolor: designTokens.brand.primary,
                                    width: 32,
                                    height: 32,
                                    fontSize: "0.85rem",
                                    fontWeight: 700
                                }}
                            >
                                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "A"}
                            </Avatar>
                        </Box>
                    </Toolbar>
                </AppBar>

                {/* Body Content Area */}
                <Box component="main" flexGrow={1} p={{ xs: 2, sm: 3 }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
