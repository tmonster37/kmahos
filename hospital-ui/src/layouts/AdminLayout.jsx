import React, { useState, useEffect } from "react";
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
    useTheme,
    Badge
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
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import HubIcon from "@mui/icons-material/Hub";
import HotelIcon from "@mui/icons-material/Hotel";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import TvIcon from "@mui/icons-material/Tv";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CircleIcon from "@mui/icons-material/Circle";
import { useAuth } from "../context/AuthContext";
import designTokens from "../theme/designTokens";

const DRAWER_WIDTH_EXPANDED = 280;
const DRAWER_WIDTH_COLLAPSED = 76;

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem("hms_admin_sidebar_collapsed") === "true";
        } catch {
            return false;
        }
    });

    const currentDrawerWidth = isMobile ? DRAWER_WIDTH_EXPANDED : (collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleToggleCollapse = () => {
        const next = !collapsed;
        setCollapsed(next);
        try {
            localStorage.setItem("hms_admin_sidebar_collapsed", String(next));
        } catch {
            // ignore
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Phân nhóm danh mục quản trị theo khối nghiệp vụ y tế chuẩn mực Enterprise HIS
    const adminMenuGroups = [
        {
            title: "Tổng Quan & Điều Hành",
            items: [
                { text: "Dashboard Chỉ Huy", icon: <DashboardIcon />, path: "/admin/dashboard" },
                { text: "Quản Lý Lịch Hẹn", icon: <EventIcon />, path: "/admin/bookings" }
            ]
        },
        {
            title: "Khám Chữa Bệnh & Lâm Sàng",
            items: [
                { text: "Bàn Khám Lâm Sàng", icon: <MedicalServicesIcon />, path: "/doctor/examinations" },
                { text: "Buồng Bệnh Nội Trú", icon: <HotelIcon />, path: "/doctor/inpatient" },
                { text: "Xét Nghiệm & CĐHA", icon: <ScienceIcon />, path: "/doctor/lab-tests" },
                { text: "Hồ Sơ Bệnh Nhân", icon: <PeopleAltIcon />, path: "/admin/patients" }
            ]
        },
        {
            title: "Tiếp Đón & Thiết Bị Sảnh",
            items: [
                { text: "Bàn Tiếp Đón & STT", icon: <HowToRegIcon />, path: "/nurse/reception" },
                { text: "Cây Kiosk Bốc Số", icon: <QrCodeScannerIcon />, path: "/kiosk", external: true },
                { text: "Màn Hình LED Gọi Số", icon: <TvIcon />, path: "/queue-display", external: true }
            ]
        },
        {
            title: "Dược Phẩm & Kho FEFO",
            items: [
                { text: "Kho Dược Đa Cấp & FEFO", icon: <Inventory2Icon />, path: "/admin/pharmacy-inventory" },
                { text: "Danh Mục Thuốc & Dược", icon: <MedicationIcon />, path: "/admin/medicines" }
            ]
        },
        {
            title: "Nhân Lực & Khoa Phòng",
            items: [
                { text: "Bác Sĩ & CCHN", icon: <PersonSearchIcon />, path: "/admin/doctors" },
                { text: "Phân Lịch Trực Ca", icon: <EventIcon />, path: "/admin/schedules" },
                { text: "Danh Mục Khoa & Buồng", icon: <LocalHospitalIcon />, path: "/admin/departments" }
            ]
        },
        {
            title: "Tài Chính & Viện Phí",
            items: [
                { text: "Quầy Thu Ngân Viện Phí", icon: <PointOfSaleIcon />, path: "/cashier" },
                { text: "Đối Soát Giao Dịch", icon: <ReceiptLongIcon />, path: "/admin/transactions" },
                { text: "Bảng Giá Dịch Vụ Khám", icon: <ScienceIcon />, path: "/admin/services" }
            ]
        },
        {
            title: "Hạ Tầng Kỹ Thuật & Bảo Mật",
            items: [
                { text: "Cổng LIS/RIS & EHR", icon: <HubIcon />, path: "/admin/ehr-gateway" },
                { text: "Tài Khoản & Phân Quyền", icon: <ManageAccountsIcon />, path: "/admin/accounts" }
            ]
        }
    ];

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
                { text: "Cổng LIS/RIS & Concept", icon: <HubIcon />, path: "/admin/ehr-gateway" }
            ]
        }
    ];

    const pharmacistMenuGroups = [
        {
            title: "Dược & Vật Tư Y Tế",
            items: [
                { text: "Kho Dược Đa Cấp & FEFO", icon: <Inventory2Icon />, path: "/admin/pharmacy-inventory" },
                { text: "Danh Mục Thuốc & Dược", icon: <MedicationIcon />, path: "/admin/medicines" }
            ]
        }
    ];

    let menuGroups = adminMenuGroups;
    if (user?.role === "ROLE_HEAD_OF_DEPARTMENT") {
        menuGroups = deptHeadMenuGroups;
    } else if (user?.role === "ROLE_PHARMACIST") {
        menuGroups = pharmacistMenuGroups;
    }

    // Tiêu đề trang hiện tại
    const getCurrentPageTitle = () => {
        for (const grp of menuGroups) {
            const found = grp.items.find(it => it.path === location.pathname);
            if (found) return found.text;
        }
        if (location.pathname.startsWith("/admin/rooms")) return "Quản Lý Buồng Phòng";
        return user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "Cổng Điều Hành Trưởng Khoa" : "Cổng Quản Trị Hệ Thống Y Tế";
    };

    const drawerContent = (
        <Box sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            bgcolor: "#FFFFFF",
            color: designTokens.neutral.textPrimary,
            borderRight: `1px solid ${designTokens.neutral.border}`,
            transition: "width 0.2s ease-in-out"
        }}>
            {/* Header Brand Sidebar */}
            <Box
                p={collapsed && !isMobile ? 1.5 : 2}
                sx={{
                    borderBottom: `1px solid ${designTokens.neutral.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed && !isMobile ? "center" : "space-between",
                    minHeight: 64
                }}
            >
                <Box display="flex" alignItems="center" gap={1.2}>
                    <Box
                        component="img"
                        src="/images/logo.png"
                        alt="Logo Bệnh Viện TNT"
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            objectFit: "contain",
                            filter: "drop-shadow(0 2px 6px rgba(13, 148, 136, 0.25))",
                            flexShrink: 0
                        }}
                    />
                    {(!collapsed || isMobile) && (
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
                                TNT Hospital
                            </Typography>
                            <Typography variant="caption" sx={{ color: designTokens.neutral.textMuted, fontWeight: 700, fontSize: "0.68rem" }}>
                                {user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "CỔNG TRƯỞNG KHOA" : "QUẢN TRỊ BỆNH VIỆN"}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {!isMobile && (
                    <IconButton
                        size="small"
                        onClick={handleToggleCollapse}
                        sx={{
                            color: designTokens.neutral.textMuted,
                            p: 0.5,
                            "&:hover": { color: designTokens.brand.primary, bgcolor: designTokens.brand.primaryLight }
                        }}
                        title={collapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
                    >
                        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
                    </IconButton>
                )}
            </Box>

            {/* Menu List phân nhóm */}
            <Box sx={{ px: collapsed && !isMobile ? 1 : 1.5, py: 1.5, flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
                {menuGroups.map((group, groupIdx) => (
                    <Box key={group.title} sx={{ mb: 1.5 }}>
                        {(!collapsed || isMobile) && (
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
                        )}
                        <List disablePadding sx={{ mt: 0.3 }}>
                            {group.items.map((item) => {
                                const isCurrent = location.pathname === item.path || (item.path === "/admin/rooms" && location.pathname.startsWith("/admin/rooms"));
                                const buttonContent = (
                                    <ListItemButton
                                        component={item.external ? "a" : Link}
                                        {...(item.external ? { href: item.path, target: "_blank", rel: "noreferrer" } : { to: item.path })}
                                        onClick={() => isMobile && setMobileOpen(false)}
                                        sx={{
                                            borderRadius: 2,
                                            py: 0.75,
                                            px: collapsed && !isMobile ? 1 : 1.2,
                                            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
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
                                        <ListItemIcon sx={{
                                            color: isCurrent ? designTokens.brand.primary : designTokens.neutral.textMuted,
                                            minWidth: collapsed && !isMobile ? "auto" : 32,
                                            transition: "color 0.15s",
                                            justifyContent: "center"
                                        }}>
                                            {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                                        </ListItemIcon>
                                        {(!collapsed || isMobile) && (
                                            <>
                                                <ListItemText
                                                    primary={item.text}
                                                    primaryTypographyProps={{
                                                        fontSize: "0.825rem",
                                                        fontWeight: isCurrent ? 700 : 500,
                                                        color: "inherit",
                                                        noWrap: true
                                                    }}
                                                />
                                                {item.external && (
                                                    <OpenInNewIcon sx={{ fontSize: 13, color: designTokens.neutral.textMuted, ml: 0.5, opacity: 0.7 }} />
                                                )}
                                            </>
                                        )}
                                    </ListItemButton>
                                );

                                return (
                                    <ListItem key={item.text} disablePadding sx={{ mb: 0.4 }}>
                                        {collapsed && !isMobile ? (
                                            <Tooltip title={item.text} placement="right" arrow>
                                                <Box sx={{ width: "100%" }}>{buttonContent}</Box>
                                            </Tooltip>
                                        ) : (
                                            buttonContent
                                        )}
                                    </ListItem>
                                );
                            })}
                        </List>
                        {groupIdx < menuGroups.length - 1 && <Divider sx={{ my: 1, borderColor: designTokens.neutral.borderLight }} />}
                    </Box>
                ))}
            </Box>

            {/* Bottom Section */}
            <Box sx={{ p: collapsed && !isMobile ? 1 : 1.8, borderTop: `1px solid ${designTokens.neutral.border}`, bgcolor: designTokens.neutral.hoverBg }}>
                {(!collapsed || isMobile) ? (
                    <Box display="flex" flexDirection="column" gap={1}>
                        <Box display="flex" alignItems="center" gap={1} px={0.5}>
                            <CircleIcon sx={{ fontSize: 10, color: "#16A34A" }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize="0.72rem">
                                Máy chủ HMS: Đang hoạt động
                            </Typography>
                        </Box>
                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<LogoutIcon />}
                            onClick={handleLogout}
                            sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.8rem", textTransform: "none", py: 0.7 }}
                        >
                            Đăng Xuất
                        </Button>
                    </Box>
                ) : (
                    <Tooltip title="Đăng Xuất Phiên" placement="right">
                        <IconButton
                            color="error"
                            onClick={handleLogout}
                            sx={{ width: "100%", borderRadius: 2 }}
                        >
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
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
                    "& .MuiDrawer-paper": { width: DRAWER_WIDTH_EXPANDED, boxSizing: "border-box" },
                }}
            >
                {drawerContent}
            </Drawer>

            {/* 2. Desktop Permanent Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: "none", lg: "block" },
                    width: currentDrawerWidth,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: currentDrawerWidth,
                        boxSizing: "border-box",
                        borderRight: "none",
                        transition: "width 0.2s ease-in-out"
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>

            {/* 3. Main Content Container */}
            <Box
                display="flex"
                flexDirection="column"
                flexGrow={1}
                sx={{
                    width: { lg: `calc(100% - ${currentDrawerWidth}px)` },
                    minHeight: "100vh",
                    transition: "width 0.2s ease-in-out"
                }}
            >
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
                            <Box>
                                <Typography variant="h6" fontWeight="800" color={designTokens.neutral.textPrimary} sx={{ fontSize: { xs: "0.95rem", sm: "1.08rem" }, lineHeight: 1.2 }}>
                                    {getCurrentPageTitle()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, fontSize: "0.72rem" }}>
                                    Hệ Thống Quản Lý Bệnh Viện Thông Minh TNT Hospital
                                </Typography>
                            </Box>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1.2}>
                            {/* Phím tắt sang Bàn Khám Lâm Sàng cho Bác sĩ / Trưởng khoa / Admin */}
                            {(user?.role === "ROLE_DOCTOR" || user?.role === "ROLE_HEAD_OF_DEPARTMENT" || user?.role === "ROLE_ADMIN") && (
                                <Tooltip title="Mở Bàn Khám Lâm Sàng Chuyên Môn">
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
                                            display: { xs: "none", md: "inline-flex" }
                                        }}
                                    >
                                        Bàn Khám
                                    </Button>
                                </Tooltip>
                            )}

                            {/* Phím tắt mở nhanh LED TV hoặc Kiosk */}
                            <Tooltip title="Mở Màn hình Gọi số LED TV Sảnh">
                                <IconButton
                                    component="a"
                                    href="/queue-display"
                                    target="_blank"
                                    rel="noreferrer"
                                    size="small"
                                    sx={{
                                        color: designTokens.brand.primary,
                                        bgcolor: designTokens.brand.primaryLight,
                                        display: { xs: "none", sm: "inline-flex" }
                                    }}
                                >
                                    <TvIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>

                            <Chip
                                label={user?.role === "ROLE_ADMIN" ? "QUẢN TRỊ VIÊN" : user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "TRƯỞNG KHOA" : user?.role === "ROLE_PHARMACIST" ? "DƯỢC SĨ" : user?.role || "STAFF"}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 800, fontSize: "0.7rem", height: 24 }}
                            />

                            <Tooltip title={user?.fullName || "Tài khoản quản trị"}>
                                <Avatar
                                    sx={{
                                        bgcolor: designTokens.brand.primary,
                                        width: 32,
                                        height: 32,
                                        fontSize: "0.85rem",
                                        fontWeight: 700,
                                        cursor: "pointer"
                                    }}
                                >
                                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "A"}
                                </Avatar>
                            </Tooltip>
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

