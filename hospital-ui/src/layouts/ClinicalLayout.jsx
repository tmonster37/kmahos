import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
    AppBar,
    Toolbar,
    Box,
    Typography,
    Button,
    IconButton,
    Chip,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Tooltip,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    useMediaQuery,
    useTheme
} from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import ScienceIcon from "@mui/icons-material/Science";
import HotelIcon from "@mui/icons-material/Hotel";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ChatIcon from "@mui/icons-material/Chat";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MedicationIcon from "@mui/icons-material/Medication";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EventIcon from "@mui/icons-material/Event";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import TvIcon from "@mui/icons-material/Tv";
import DevicesIcon from "@mui/icons-material/Devices";
import NotificationMenu from "../components/navbar/NotificationMenu";
import { useAuth } from "../context/AuthContext";
import designTokens from "../theme/designTokens";

export default function ClinicalLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const [userMenuAnchor, setUserMenuAnchor] = useState(null);
    const [deviceMenuAnchor, setDeviceMenuAnchor] = useState(null);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleUserMenuOpen = (e) => setUserMenuAnchor(e.currentTarget);
    const handleUserMenuClose = () => setUserMenuAnchor(null);
    const handleDeviceMenuOpen = (e) => setDeviceMenuAnchor(e.currentTarget);
    const handleDeviceMenuClose = () => setDeviceMenuAnchor(null);

    const handleLogout = () => {
        handleUserMenuClose();
        logout();
        navigate("/login");
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
                setIsFullscreen(false);
            }
        }
    };

    const role = user?.role || "";

    // Xây dựng danh sách điều hướng tác nghiệp (Nhãn ngắn gọn, súc tích, không wrap chữ)
    const getClinicalNavItems = () => {
        const items = [];

        // 1. Phân hệ Tiếp Đón (Điều dưỡng, Admin)
        if (role === "ROLE_NURSE" || role === "ROLE_ADMIN") {
            items.push({
                text: "Tiếp đón",
                fullName: "Bàn Tiếp Đón & Cấp STT",
                path: "/nurse/reception",
                icon: <HowToRegIcon sx={{ fontSize: 17 }} />
            });
        }

        // 2. Phân hệ Bàn Khám (Bác sĩ, Trưởng khoa, Admin)
        if (role === "ROLE_DOCTOR" || role === "ROLE_HEAD_OF_DEPARTMENT" || role === "ROLE_ADMIN") {
            items.push({
                text: "Khám bệnh",
                fullName: "Bàn Khám Lâm Sàng",
                path: "/doctor/examinations",
                icon: <MedicalServicesIcon sx={{ fontSize: 17 }} />
            });
        }

        // 3. Phân hệ Buồng Bệnh Nội Trú (Bác sĩ, Điều dưỡng, Trưởng khoa, Admin)
        if (role === "ROLE_DOCTOR" || role === "ROLE_HEAD_OF_DEPARTMENT" || role === "ROLE_NURSE" || role === "ROLE_ADMIN") {
            items.push({
                text: "Nội trú",
                fullName: "Quản Lý Điều Trị Nội Trú",
                path: "/doctor/inpatient",
                icon: <HotelIcon sx={{ fontSize: 17 }} />
            });
        }

        // 4. Phân hệ Xét Nghiệm CLS (KTV Xét nghiệm, Bác sĩ, Trưởng khoa, Admin)
        if (role === "ROLE_LAB_TECHNICIAN" || role === "ROLE_DOCTOR" || role === "ROLE_HEAD_OF_DEPARTMENT" || role === "ROLE_ADMIN") {
            items.push({
                text: "Xét nghiệm",
                fullName: "Phòng Xét Nghiệm & Kết Quả",
                path: "/doctor/lab-tests",
                icon: <ScienceIcon sx={{ fontSize: 17 }} />
            });
        }

        // 5. Phân hệ Quầy Thu Ngân (Thu ngân, Admin)
        if (role === "ROLE_CASHIER" || role === "ROLE_ADMIN") {
            items.push({
                text: "Thu ngân",
                fullName: "Quầy Thu Ngân Viện Phí",
                path: "/cashier",
                icon: <PointOfSaleIcon sx={{ fontSize: 17 }} />
            });
        }

        // 6. Phân hệ Chat Bác Sĩ (Bác sĩ, Trưởng khoa)
        if (role === "ROLE_DOCTOR" || role === "ROLE_HEAD_OF_DEPARTMENT") {
            items.push({
                text: "Tư vấn",
                fullName: "Phòng Tư Vấn Bệnh Nhân",
                path: "/doctor/chat",
                icon: <ChatIcon sx={{ fontSize: 17 }} />
            });
        }


        // 8. Phân hệ Dược sĩ & Kho Dược (Dược sĩ, Admin)
        if (role === "ROLE_PHARMACIST" || role === "ROLE_ADMIN") {
            items.push({
                text: "Kho dược",
                fullName: "Kho Dược Đa Cấp & FEFO",
                path: "/admin/pharmacy-inventory",
                icon: <Inventory2Icon sx={{ fontSize: 17 }} />
            });
            items.push({
                text: "Danh mục thuốc",
                fullName: "Quản Lý Thuốc & Dược Phẩm",
                path: "/admin/medicines",
                icon: <MedicationIcon sx={{ fontSize: 17 }} />
            });
        }

        return items;
    };

    const navItems = getClinicalNavItems();

    // Nhãn vai trò với màu sắc y tế hài hòa, trang nhã (không dùng màu cảnh báo chói)
    const getRoleBadge = () => {
        switch (role) {
            case "ROLE_DOCTOR":
                return { label: "Bác Sĩ", bgColor: "#EBF6FE", textColor: "#0088D6", borderColor: "#BAE6FD" };
            case "ROLE_HEAD_OF_DEPARTMENT":
                return { label: "Trưởng Khoa", bgColor: "#E6FAF4", textColor: "#008C69", borderColor: "#A7F3D0" };
            case "ROLE_NURSE":
                return { label: "Điều Dưỡng", bgColor: "#E0F2FE", textColor: "#0284C7", borderColor: "#BAE6FD" };
            case "ROLE_LAB_TECHNICIAN":
                return { label: "KTV Lab", bgColor: "#FEF3C7", textColor: "#B45309", borderColor: "#FDE68A" };
            case "ROLE_CASHIER":
                return { label: "Thu Ngân", bgColor: "#DCFCE7", textColor: "#15803D", borderColor: "#BBF7D0" };
            case "ROLE_PHARMACIST":
                return { label: "Dược Sĩ", bgColor: "#F5F3FF", textColor: "#7C3AED", borderColor: "#DDD6FE" };
            case "ROLE_ADMIN":
                return { label: "Quản Trị", bgColor: "#FEE2E2", textColor: "#DC2626", borderColor: "#FECACA" };
            default:
                return { label: "Nhân Viên", bgColor: "#F1F5F9", textColor: "#475569", borderColor: "#E2E8F0" };
        }
    };

    const roleBadge = getRoleBadge();

    // Rút gọn tên nhân viên hiển thị thông minh (tránh lỗi ngắt chữ "Viên (Tài)")
    const getDisplayName = () => {
        if (!user?.fullName) return "Nhân viên";
        const cleanName = user.fullName.replace(/\s*\(.*?\)\s*/g, "").trim();
        const parts = cleanName.split(/\s+/);
        if (parts.length >= 2) {
            return parts.slice(-2).join(" ");
        }
        return parts[0] || "Tài khoản";
    };

    const isActive = (path) => location.pathname === path;

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                bgcolor: designTokens.neutral.bg,
                color: designTokens.neutral.textPrimary
            }}
        >
            {/* 1. THANH TÁC VỤ Y TẾ CHUYÊN DỤNG (CLINICAL WORKSPACE APP BAR) */}
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: "#FFFFFF",
                    borderBottom: `1px solid ${designTokens.neutral.border}`,
                    zIndex: (th) => th.zIndex.appBar,
                    color: designTokens.neutral.textPrimary
                }}
            >
                <Toolbar
                    variant="dense"
                    sx={{
                        minHeight: "52px !important",
                        height: "52px",
                        px: { xs: 1.5, sm: 2 },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5
                    }}
                >
                    {/* CỤM TRÁI: Logo & Các phân hệ tác vụ chính */}
                    <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0, flexShrink: 1 }}>
                        {isMobile && (
                            <IconButton
                                size="small"
                                onClick={() => setMobileDrawerOpen(true)}
                                sx={{ color: designTokens.brand.primary, p: 0.5 }}
                                aria-label="open clinical menu"
                            >
                                <MenuIcon fontSize="small" />
                            </IconButton>
                        )}

                        {/* Brand Logo & Tiêu đề ngữ cảnh */}
                        <Box
                            component={Link}
                            to={navItems[0]?.path || "/"}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                textDecoration: "none",
                                flexShrink: 0
                            }}
                        >
                            <Box
                                sx={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: "8px",
                                    background: `linear-gradient(135deg, ${designTokens.brand.primary} 0%, ${designTokens.secondary.main} 100%)`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#FFFFFF",
                                    boxShadow: "0 2px 6px rgba(0, 136, 214, 0.25)"
                                }}
                            >
                                <LocalHospitalIcon sx={{ fontSize: 18 }} />
                            </Box>
                            <Box sx={{ display: { xs: "none", sm: "block" } }}>
                                <Typography
                                    variant="subtitle2"
                                    fontWeight="800"
                                    sx={{
                                        letterSpacing: "-0.3px",
                                        color: designTokens.brand.primaryDark,
                                        lineHeight: 1.1,
                                        fontSize: "0.95rem",
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    YouMed TNT
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: designTokens.neutral.textMuted,
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                        display: "block",
                                        lineHeight: 1,
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    LÂM SÀNG
                                </Typography>
                            </Box>
                        </Box>

                        <Divider orientation="vertical" flexItem sx={{ height: 22, my: "auto", display: { xs: "none", md: "block" } }} />

                        {/* Thanh Tab / Nút phân hệ tác vụ: Luôn giữ trên 1 dòng, có tooltip đầy đủ */}
                        <Box
                            sx={{
                                display: { xs: "none", md: "flex" },
                                alignItems: "center",
                                gap: 0.6,
                                overflowX: "auto",
                                scrollbarWidth: "none",
                                "&::-webkit-scrollbar": { display: "none" }
                            }}
                        >
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <Tooltip key={item.path} title={item.fullName} arrow enterDelay={400}>
                                        <Button
                                            component={Link}
                                            to={item.path}
                                            size="small"
                                            startIcon={item.icon}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: active ? 700 : 600,
                                                fontSize: "0.825rem",
                                                borderRadius: "20px",
                                                px: 1.5,
                                                py: 0.45,
                                                minHeight: "32px",
                                                whiteSpace: "nowrap",
                                                flexShrink: 0,
                                                bgcolor: active ? designTokens.brand.primaryLight : "transparent",
                                                color: active ? designTokens.brand.primaryDark : designTokens.neutral.textSecondary,
                                                border: active ? `1px solid ${designTokens.brand.primaryBorder}` : "1px solid transparent",
                                                boxShadow: active ? "0 1px 3px rgba(0, 136, 214, 0.12)" : "none",
                                                transition: "all 0.15s ease-in-out",
                                                "&:hover": {
                                                    bgcolor: active ? designTokens.brand.primaryLight : designTokens.neutral.hoverBg,
                                                    color: designTokens.brand.primary
                                                }
                                            }}
                                        >
                                            {item.text}
                                        </Button>
                                    </Tooltip>
                                );
                            })}
                        </Box>
                    </Box>

                    {/* CỤM PHẢI: Chuyển cổng, Toàn màn hình, Thông báo, Tài khoản (Gọn gàng, không tràn mép) */}
                    <Box display="flex" alignItems="center" gap={1} sx={{ flexShrink: 0 }}>
                        {/* Nút sang Cổng Quản Trị dành riêng cho Admin / Trưởng khoa */}
                        {(role === "ROLE_ADMIN" || role === "ROLE_HEAD_OF_DEPARTMENT") && (
                            <Tooltip title="Mở Cổng Quản Trị Hệ Thống">
                                <Button
                                    component={Link}
                                    to="/admin/dashboard"
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 700,
                                        fontSize: "0.78rem",
                                        py: 0.4,
                                        px: 1.2,
                                        height: "30px",
                                        borderRadius: "8px",
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                        display: { xs: "none", sm: "inline-flex" }
                                    }}
                                >
                                    Cổng Quản Trị
                                </Button>
                            </Tooltip>
                        )}

                        {/* Phím mở Thiết Bị Sảnh (Kiosk & Màn hình LED TV) */}
                        {(role === "ROLE_NURSE" || role === "ROLE_CASHIER" || role === "ROLE_ADMIN" || role === "ROLE_HEAD_OF_DEPARTMENT") && (
                            <>
                                <Tooltip title="Mở thiết bị sảnh tiếp đón (Kiosk cảm ứng & Màn hình LED TV)">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={handleDeviceMenuOpen}
                                        startIcon={<DevicesIcon sx={{ fontSize: 16 }} />}
                                        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
                                        sx={{
                                            textTransform: "none",
                                            fontWeight: 700,
                                            fontSize: "0.78rem",
                                            py: 0.4,
                                            px: 1.2,
                                            height: "30px",
                                            borderRadius: "8px",
                                            color: "#D97706",
                                            borderColor: "#FDE68A",
                                            bgcolor: "#FFFBEB",
                                            "&:hover": {
                                                bgcolor: "#FEF3C7",
                                                borderColor: "#F59E0B"
                                            },
                                            display: { xs: "none", sm: "inline-flex" }
                                        }}
                                    >
                                        Thiết Bị Sảnh
                                    </Button>
                                </Tooltip>
                                <Menu
                                    anchorEl={deviceMenuAnchor}
                                    open={Boolean(deviceMenuAnchor)}
                                    onClose={handleDeviceMenuClose}
                                    PaperProps={{
                                        sx: {
                                            borderRadius: 2.5,
                                            minWidth: 230,
                                            mt: 1,
                                            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                                            p: 0.5
                                        }
                                    }}
                                >
                                    <MenuItem
                                        component="a"
                                        href="/kiosk"
                                        target="_blank"
                                        onClick={handleDeviceMenuClose}
                                    >
                                        <ListItemIcon><QrCodeScannerIcon fontSize="small" sx={{ color: "#D97706" }} /></ListItemIcon>
                                        <ListItemText
                                            primary="Cây Kiosk Bốc Số"
                                            secondary="Màn hình chạm sảnh tầng 1"
                                            primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 700 }}
                                            secondaryTypographyProps={{ fontSize: "0.72rem" }}
                                        />
                                    </MenuItem>
                                    <MenuItem
                                        component="a"
                                        href="/queue-display"
                                        target="_blank"
                                        onClick={handleDeviceMenuClose}
                                    >
                                        <ListItemIcon><TvIcon fontSize="small" sx={{ color: "#6366F1" }} /></ListItemIcon>
                                        <ListItemText
                                            primary="Màn Hình LED TV"
                                            secondary="Hiển thị & Loa gọi STT sảnh"
                                            primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 700 }}
                                            secondaryTypographyProps={{ fontSize: "0.72rem" }}
                                        />
                                    </MenuItem>
                                </Menu>
                            </>
                        )}

                        {/* Nút Toàn màn hình */}
                        <Tooltip title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình (F11)"}>
                            <IconButton
                                size="small"
                                onClick={toggleFullscreen}
                                sx={{ color: designTokens.neutral.textMuted, p: 0.6, display: { xs: "none", sm: "inline-flex" } }}
                            >
                                {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>

                        {/* Chuông thông báo */}
                        <NotificationMenu />

                        {/* Huy hiệu vai trò trang nhã */}
                        <Chip
                            label={roleBadge.label}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                height: 22,
                                px: 0.5,
                                bgcolor: roleBadge.bgColor,
                                color: roleBadge.textColor,
                                border: `1px solid ${roleBadge.borderColor}`,
                                display: { xs: "none", lg: "inline-flex" }
                            }}
                        />

                        {/* User Profile Pill Dropdown */}
                        <Box
                            onClick={handleUserMenuOpen}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.8,
                                p: "2px 8px 2px 3px",
                                borderRadius: "20px",
                                bgcolor: designTokens.neutral.hoverBg,
                                border: `1px solid ${designTokens.neutral.border}`,
                                cursor: "pointer",
                                transition: "0.15s",
                                "&:hover": { bgcolor: designTokens.neutral.borderLight }
                            }}
                        >
                            <Avatar
                                sx={{
                                    bgcolor: designTokens.brand.primary,
                                    width: 26,
                                    height: 26,
                                    fontSize: "0.75rem",
                                    fontWeight: 700
                                }}
                            >
                                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                            </Avatar>
                            <Typography
                                variant="caption"
                                fontWeight="700"
                                color={designTokens.neutral.textPrimary}
                                sx={{
                                    display: { xs: "none", sm: "block" },
                                    maxWidth: 100,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    fontSize: "0.78rem"
                                }}
                            >
                                {getDisplayName()}
                            </Typography>
                            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: designTokens.neutral.textMuted }} />
                        </Box>

                        {/* Menu thả xuống của người dùng */}
                        <Menu
                            anchorEl={userMenuAnchor}
                            open={Boolean(userMenuAnchor)}
                            onClose={handleUserMenuClose}
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
                            <Box px={1.5} py={1}>
                                <Typography variant="subtitle2" fontWeight="700" color={designTokens.brand.primary}>
                                    {user?.fullName}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" display="block">
                                    {roleBadge.label} • {user?.phoneNumber || user?.phone || user?.username || "Nhân viên"}
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 0.5 }} />

                            {/* Phím tắt chức năng theo đúng phạm vi quyền của từng vai trò */}
                            {role === "ROLE_ADMIN" && (
                                <>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/dashboard"); }}>
                                        <ListItemIcon><AdminPanelSettingsIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                        <ListItemText primary="Cổng Quản Trị Hệ Thống" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/accounts"); }}>
                                        <ListItemIcon><ManageAccountsIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                        <ListItemText primary="Quản Lý Tài Khoản & Quyền" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                </>
                            )}

                            {role === "ROLE_HEAD_OF_DEPARTMENT" && (
                                <>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/dashboard"); }}>
                                        <ListItemIcon><AdminPanelSettingsIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                        <ListItemText primary="Cổng Điều Hành Trưởng Khoa" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/examinations"); }}>
                                        <ListItemIcon><MedicalServicesIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                        <ListItemText primary="Bàn Khám Lâm Sàng" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/schedules"); }}>
                                        <ListItemIcon><EventIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                        <ListItemText primary="Phân Lịch Trực Ca Khoa" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                </>
                            )}

                            {role === "ROLE_DOCTOR" && (
                                <>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/examinations"); }}>
                                        <ListItemIcon><MedicalServicesIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                        <ListItemText primary="Bàn Khám Lâm Sàng" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/inpatient"); }}>
                                        <ListItemIcon><HotelIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                        <ListItemText primary="Quản Lý Điều Trị Nội Trú" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                </>
                            )}

                            {role === "ROLE_NURSE" && (
                                <>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/nurse/reception"); }}>
                                        <ListItemIcon><HowToRegIcon fontSize="small" sx={{ color: designTokens.brand.primary }} /></ListItemIcon>
                                        <ListItemText primary="Bàn Tiếp Đón & Cấp STT" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/inpatient"); }}>
                                        <ListItemIcon><HotelIcon fontSize="small" sx={{ color: designTokens.secondary.main }} /></ListItemIcon>
                                        <ListItemText primary="Quản Lý Buồng Bệnh Nội Trú" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                </>
                            )}

                            {role === "ROLE_LAB_TECHNICIAN" && (
                                <MenuItem onClick={() => { handleUserMenuClose(); navigate("/doctor/lab-tests"); }}>
                                    <ListItemIcon><ScienceIcon fontSize="small" sx={{ color: "#B45309" }} /></ListItemIcon>
                                    <ListItemText primary="Phòng Xét Nghiệm & KQ" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                </MenuItem>
                            )}

                            {role === "ROLE_PHARMACIST" && (
                                <>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/pharmacy-inventory"); }}>
                                        <ListItemIcon><Inventory2Icon fontSize="small" sx={{ color: "#7C3AED" }} /></ListItemIcon>
                                        <ListItemText primary="Kho Dược Đa Cấp & FEFO" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem onClick={() => { handleUserMenuClose(); navigate("/admin/medicines"); }}>
                                        <ListItemIcon><MedicationIcon fontSize="small" sx={{ color: "#7C3AED" }} /></ListItemIcon>
                                        <ListItemText primary="Danh Mục Thuốc" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                    </MenuItem>
                                </>
                            )}

                            {role === "ROLE_CASHIER" && (
                                <MenuItem onClick={() => { handleUserMenuClose(); navigate("/cashier"); }}>
                                    <ListItemIcon><PointOfSaleIcon fontSize="small" sx={{ color: designTokens.status.success.main }} /></ListItemIcon>
                                    <ListItemText primary="Quầy Thu Ngân Viện Phí" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 600 }} />
                                </MenuItem>
                            )}

                            <Divider sx={{ my: 0.5 }} />

                            <MenuItem onClick={handleLogout} sx={{ color: designTokens.status.danger.main }}>
                                <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: designTokens.status.danger.main }} /></ListItemIcon>
                                <ListItemText primary="Đăng Xuất Phiên Làm Việc" primaryTypographyProps={{ fontSize: "0.825rem", fontWeight: 700 }} />
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* 2. DRAWER ĐIỀU HƯỚNG TÁC NGHIỆP TRÊN DI ĐỘNG / MÁY TÍNH BẢNG */}
            <Drawer
                anchor="left"
                open={mobileDrawerOpen}
                onClose={() => setMobileDrawerOpen(false)}
                PaperProps={{
                    sx: {
                        width: 270,
                        bgcolor: "#FFFFFF",
                        display: "flex",
                        flexDirection: "column",
                        p: 2
                    }
                }}
            >
                <Box display="flex" alignItems="center" gap={1.2} pb={2} borderBottom={`1px solid ${designTokens.neutral.border}`}>
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "8px",
                            bgcolor: designTokens.brand.primary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#FFFFFF"
                        }}
                    >
                        <LocalHospitalIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" fontWeight="800" color={designTokens.brand.primary}>
                            YouMed TNT
                        </Typography>
                        <Typography variant="caption" color="textSecondary" fontSize="0.7rem">
                            {roleBadge.label}
                        </Typography>
                    </Box>
                </Box>

                <List disablePadding sx={{ py: 1.5, flexGrow: 1 }}>
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton
                                    component={Link}
                                    to={item.path}
                                    onClick={() => setMobileDrawerOpen(false)}
                                    sx={{
                                        borderRadius: 2,
                                        bgcolor: active ? designTokens.brand.primaryLight : "transparent",
                                        color: active ? designTokens.brand.primary : designTokens.neutral.textPrimary
                                    }}
                                >
                                    <ListItemIcon sx={{ color: active ? designTokens.brand.primary : designTokens.neutral.textMuted, minWidth: 32 }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.fullName || item.text}
                                        primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: active ? 700 : 500 }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>

                <Box pt={1.5} borderTop={`1px solid ${designTokens.neutral.border}`}>
                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                        Đăng Xuất
                    </Button>
                </Box>
            </Drawer>

            {/* 3. KHU VỰC THAO TÁC NGHIỆP VỤ CHÍNH (OUTLET) - KHÔNG FOOTER, KHÔNG FLOATING CHAT WIDGET */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "calc(100vh - 52px)",
                    position: "relative"
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
}
