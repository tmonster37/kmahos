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
import HomeIcon from "@mui/icons-material/Home";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import HubIcon from "@mui/icons-material/Hub";
import { useAuth } from "../context/AuthContext";

const drawerWidth = 260;

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

    // Chuẩn hóa Menu chính xác theo Yêu Cầu Chức Năng
    const adminMenuItems = [
        { text: "Dashboard Thống Kê", icon: <DashboardIcon />, path: "/admin/dashboard" },
        { text: "Quản Lý Bệnh Nhân", icon: <PeopleAltIcon />, path: "/admin/patients" },
        { text: "Quản Lý Thanh Toán & Đối Soát", icon: <ReceiptLongIcon />, path: "/admin/transactions" },
        { text: "Quản Lý Nhân Viên & Bác Sĩ", icon: <PersonSearchIcon />, path: "/admin/doctors" },
        { text: "Quản Lý Khoa & Buồng Phòng", icon: <LocalHospitalIcon />, path: "/admin/departments" },
        { text: "Phân Lịch Trực Ca", icon: <EventIcon />, path: "/admin/schedules" },
        { text: "Quản Lý Dịch Vụ CLS", icon: <ScienceIcon />, path: "/admin/services" },
        { text: "Quản Lý Thuốc & Dược Phẩm", icon: <MedicationIcon />, path: "/admin/medicines" },
        { text: "Kho Dược Đa Cấp & FEFO", icon: <Inventory2Icon />, path: "/admin/pharmacy-inventory" },
        { text: "Cổng LIS/RIS & EHR Concept", icon: <HubIcon />, path: "/admin/ehr-gateway" },
        { text: "Quản Lý Tài Khoản & Quyền", icon: <ManageAccountsIcon />, path: "/admin/accounts" },
        { text: "Quầy Thu Ngân Viện Phí", icon: <PointOfSaleIcon />, path: "/cashier" },
        { text: "Quản Lý Buồng Bệnh Nội Trú", icon: <LocalHospitalIcon />, path: "/doctor/inpatient" },
    ];

    const deptHeadMenuItems = [
        { text: "Dashboard Thống Kê Khoa", icon: <DashboardIcon />, path: "/admin/dashboard" },
        { text: "Phân Lịch Trực Khoa", icon: <EventIcon />, path: "/admin/schedules" },
        { text: "Quản Lý Buồng Phòng Khoa", icon: <LocalHospitalIcon />, path: "/admin/departments" },
        { text: "Bàn Khám Lâm Sàng", icon: <MedicalServicesIcon />, path: "/doctor/examinations" },
        { text: "Phòng Xét Nghiệm & KQ", icon: <ScienceIcon />, path: "/doctor/lab-tests" },
        { text: "Kho Dược & Tủ Trực Khoa", icon: <Inventory2Icon />, path: "/admin/pharmacy-inventory" },
        { text: "Cổng LIS/RIS & EHR Concept", icon: <HubIcon />, path: "/admin/ehr-gateway" },
        { text: "Quản Lý Buồng Bệnh Nội Trú", icon: <LocalHospitalIcon />, path: "/doctor/inpatient" }
    ];

    const menuItems = user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? deptHeadMenuItems : adminMenuItems;

    const drawerContent = (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#FFFFFF", color: "#1E293B", borderRight: "1px solid #E2E8F0" }}>
            <Box p={2.2} sx={{ borderBottom: "1px solid #E2E8F0" }}>
                <Box display="flex" alignItems="center" gap={1.2}>
                    <Box
                        sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
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
                                background: "linear-gradient(135deg, #0088D6 0%, #005A9C 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                lineHeight: 1.1,
                                fontSize: "1.05rem"
                            }}
                        >
                            YouMed TNT
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.68rem" }}>
                            {user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "CỔNG TRƯỞNG KHOA" : "QUẢN TRỊ BỆNH VIỆN"}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <List sx={{ px: 1.5, py: 1.5, flexGrow: 1, overflowY: "auto" }}>
                {menuItems.map((item) => {
                    const isCurrent = location.pathname === item.path;
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                component={Link}
                                to={item.path}
                                onClick={() => isMobile && setMobileOpen(false)}
                                sx={{
                                    borderRadius: 2,
                                    py: 0.85,
                                    px: 1.5,
                                    bgcolor: isCurrent ? "#EBF6FE" : "transparent",
                                    color: isCurrent ? "#0088D6" : "#334155",
                                    transition: "all 0.15s ease-in-out",
                                    "&:hover": {
                                        bgcolor: isCurrent ? "#EBF6FE" : "#F1F5F9",
                                        color: "#0088D6",
                                        "& .MuiListItemIcon-root": { color: "#0088D6" }
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ color: isCurrent ? "#0088D6" : "#64748B", minWidth: 34, transition: "color 0.15s" }}>
                                    {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontSize: "0.85rem",
                                        fontWeight: isCurrent ? 700 : 500,
                                        color: "inherit"
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>

            <Box sx={{ p: 2, borderTop: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
                <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.825rem", textTransform: "none", py: 0.8 }}
                >
                    Đăng Xuất
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box display="flex" minHeight="100vh" bgcolor="#F4F7FC">
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
                        borderBottom: "1px solid #E2E8F0",
                        zIndex: (theme) => theme.zIndex.drawer + 1
                    }}
                >
                    <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 3 }, minHeight: "60px !important" }}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                            <IconButton
                                color="inherit"
                                aria-label="open drawer"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ display: { lg: "none" }, color: "#0088D6" }}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Typography variant="h6" fontWeight="bold" color="#1E293B" sx={{ fontSize: { xs: "0.95rem", sm: "1.1rem" } }}>
                                {user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "Cổng Trưởng Khoa" : "Hệ Thống Quản Trị Y Tế"}
                            </Typography>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1.5}>
                            <Button
                                component={Link}
                                to="/"
                                size="small"
                                startIcon={<HomeIcon />}
                                sx={{
                                    color: "#64748B",
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    fontSize: "0.825rem",
                                    display: { xs: "none", sm: "flex" }
                                }}
                            >
                                Trang Chủ
                            </Button>

                            <Chip
                                label={user?.role === "ROLE_ADMIN" ? "QUẢN LÝ" : user?.role === "ROLE_HEAD_OF_DEPARTMENT" ? "TRƯỞNG KHOA" : user?.role || "STAFF"}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 800, fontSize: "0.7rem", height: 24 }}
                            />

                            <Avatar
                                sx={{
                                    bgcolor: "#0088D6",
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
