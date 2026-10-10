import React, { useState, useEffect } from "react";
import {
    IconButton,
    Badge,
    Popover,
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Button,
    Chip,
    Tooltip
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ScienceIcon from "@mui/icons-material/Science";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import InfoIcon from "@mui/icons-material/Info";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import axiosInstance from "../../services/AxiosInstance";
import { formatDateTime } from "../../utils/formatters";
import { useNavigate } from "react-router-dom";

export default function NotificationMenu() {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);

    const open = Boolean(anchorEl);

    const loadCombinedNotifications = async () => {
        // Lấy thông tin user hiện tại
        let currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            currentUser = null;
        }

        if (!currentUser) {
            setNotifications([]);
            return;
        }

        const userPhone = String(currentUser.phoneNumber || "").trim();
        const userId = String(currentUser.userId || currentUser.id || "").trim();

        let serverNotifs = [];
        try {
            const res = await axiosInstance.get("/api/utilities/notifications");
            serverNotifs = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        } catch {
            serverNotifs = [];
        }

        // Lấy thông báo hàng đợi nội bộ (In-App Local Queue Notifications)
        let localNotifs = [];
        try {
            // 1. Đọc từ storage dành riêng cho user này
            const userSpecificKey = `tnt_local_notifications_${userPhone}`;
            localNotifs = JSON.parse(localStorage.getItem(userSpecificKey) || "[]");

            // 2. Dọn dẹp key cũ dùng chung "tnt_local_notifications" nếu có chứa thông báo của bệnh nhân khác
            const legacyNotifs = JSON.parse(localStorage.getItem("tnt_local_notifications") || "[]");
            if (Array.isArray(legacyNotifs) && legacyNotifs.length > 0) {
                // Chỉ giữ lại thông báo nếu đúng là của người dùng này
                const validForMe = legacyNotifs.filter(n => {
                    const notifPhone = String(n.patientPhone || n.phoneNumber || "").trim();
                    return userPhone && notifPhone && userPhone === notifPhone;
                });
                if (validForMe.length > 0) {
                    localNotifs = [...localNotifs, ...validForMe];
                }
                // Xóa triệt để key dùng chung để tránh lộ dữ liệu giữa các bệnh nhân
                localStorage.removeItem("tnt_local_notifications");
                if (localNotifs.length > 0) {
                    localStorage.setItem(userSpecificKey, JSON.stringify(localNotifs));
                }
            }
        } catch {
            localNotifs = [];
        }

        // 3. Lọc nghiêm ngặt: BẤT KỲ thông báo nào không thuộc về người dùng này đều bị loại trừ
        const filteredLocalNotifs = localNotifs.filter(n => {
            const notifPhone = String(n.patientPhone || n.phoneNumber || "").trim();
            if (userPhone && notifPhone && userPhone === notifPhone) return true;
            const notifAccountId = String(n.accountId || n.userId || "").trim();
            if (userId && notifAccountId && userId === notifAccountId) return true;
            return false;
        });

        // Hợp nhất và sắp xếp thông báo mới nhất lên đầu
        const combined = [...filteredLocalNotifs, ...serverNotifs].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        setNotifications(combined);
    };

    useEffect(() => {
        loadCombinedNotifications();

        // Lắng nghe sự kiện phát thông báo gọi số nội bộ thời gian thực
        const handleNewNotif = () => {
            loadCombinedNotifications();
        };
        window.addEventListener("tnt_new_notification", handleNewNotif);

        // Polling định kỳ mỗi 15 giây
        const interval = setInterval(loadCombinedNotifications, 15000);
        return () => {
            window.removeEventListener("tnt_new_notification", handleNewNotif);
            clearInterval(interval);
        };
    }, []);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
        loadCombinedNotifications();
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAsRead = async (notifId, type) => {
        let currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem("user") || "null");
        } catch {}
        const userPhone = currentUser?.phoneNumber;

        // Cập nhật state & local storage nếu là thông báo local
        if (String(notifId).startsWith("INAPP-")) {
            try {
                const userKey = `tnt_local_notifications_${userPhone}`;
                const locals = JSON.parse(localStorage.getItem(userKey) || "[]");
                const updated = locals.map(n => n.notificationId === notifId ? { ...n, read: true, isRead: true } : n);
                localStorage.setItem(userKey, JSON.stringify(updated));
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                await axiosInstance.put(`/api/utilities/notifications/${notifId}/read`).catch(() => {});
            } catch (err) {
                console.error("Lỗi đánh dấu đã đọc:", err);
            }
        }

        setNotifications(prev => prev.map(n => n.notificationId === notifId ? { ...n, read: true, isRead: true } : n));
        handleClose();

        // Điều hướng thông minh theo loại thông báo
        if (type?.includes("QUEUE") || type?.includes("BOOKING") || type?.includes("EXAMINATION")) {
            navigate("/my-history");
        } else if (type?.includes("PAYMENT") || type?.includes("WALLET")) {
            navigate("/payment");
        } else if (type?.includes("REMINDER")) {
            navigate("/reminders");
        }
    };

    const handleMarkAllRead = async () => {
        let currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem("user") || "null");
        } catch {}
        const userPhone = currentUser?.phoneNumber;

        // Đánh dấu đã đọc trong local storage
        try {
            const userKey = `tnt_local_notifications_${userPhone}`;
            const locals = JSON.parse(localStorage.getItem(userKey) || "[]");
            const updated = locals.map(n => ({ ...n, read: true, isRead: true }));
            localStorage.setItem(userKey, JSON.stringify(updated));
        } catch {}

        try {
            await axiosInstance.put("/api/utilities/notifications/read-all").catch(() => {});
        } catch {}

        setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    };

    const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

    const getIconByType = (type) => {
        if (!type) return <InfoIcon color="primary" fontSize="small" />;
        const t = type.toUpperCase();
        if (t.includes("QUEUE")) return <HourglassTopIcon sx={{ color: "#F59E0B" }} fontSize="small" />;
        if (t.includes("BOOKING")) return <EventAvailableIcon sx={{ color: "#0088D6" }} fontSize="small" />;
        if (t.includes("TEST") || t.includes("LAB")) return <ScienceIcon sx={{ color: "#8B5CF6" }} fontSize="small" />;
        if (t.includes("PAYMENT") || t.includes("WALLET")) return <AccountBalanceWalletIcon sx={{ color: "#10B981" }} fontSize="small" />;
        return <CheckCircleIcon sx={{ color: "#0284C7" }} fontSize="small" />;
    };

    return (
        <>
            <Tooltip title="Thông báo của bạn">
                <IconButton
                    onClick={handleOpen}
                    sx={{
                        color: open ? "#0088D6" : "#475569",
                        bgcolor: open ? "#E0F2FE" : "transparent",
                        "&:hover": { bgcolor: "#F1F5F9", color: "#0088D6" }
                    }}
                >
                    <Badge badgeContent={unreadCount} color="error" max={99}>
                        <NotificationsIcon fontSize="small" />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                    sx: {
                        width: 380,
                        maxHeight: 480,
                        borderRadius: 3,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                        mt: 1.5,
                        display: "flex",
                        flexDirection: "column"
                    }
                }}
            >
                {/* Header */}
                <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0" }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="bold" color="textPrimary">
                            Thông Báo Của Bạn
                        </Typography>
                        {unreadCount > 0 && (
                            <Chip label={`${unreadCount} mới`} size="small" color="error" sx={{ height: 20, fontSize: "0.7rem", fontWeight: "bold" }} />
                        )}
                    </Box>
                    {unreadCount > 0 && (
                        <Button
                            size="small"
                            startIcon={<DoneAllIcon fontSize="small" />}
                            onClick={handleMarkAllRead}
                            sx={{ fontSize: "0.75rem", textTransform: "none" }}
                        >
                            Đọc tất cả
                        </Button>
                    )}
                </Box>

                {/* Danh sách thông báo */}
                <Box sx={{ overflowY: "auto", flex: 1 }}>
                    {notifications.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                            <NotificationsIcon sx={{ fontSize: 40, color: "#CBD5E1", mb: 1 }} />
                            <Typography variant="body2">Bạn chưa có thông báo nào</Typography>
                        </Box>
                    ) : (
                        <List disablePadding>
                            {notifications.map((notif, idx) => {
                                const isUnread = !notif.isRead && !notif.read;
                                const isQueueAlert = notif.type === "QUEUE_ALERT";

                                return (
                                    <React.Fragment key={notif.notificationId || idx}>
                                        <ListItem
                                            button
                                            onClick={() => handleMarkAsRead(notif.notificationId, notif.type)}
                                            sx={{
                                                p: 1.8,
                                                bgcolor: isUnread ? (isQueueAlert ? "#FFFBEB" : "#F0F9FF") : "transparent",
                                                borderLeft: isUnread ? (isQueueAlert ? "4px solid #F59E0B" : "4px solid #0088D6") : "4px solid transparent",
                                                "&:hover": { bgcolor: "#F8FAFC" }
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                {getIconByType(notif.type)}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                                        <Typography
                                                            variant="subtitle2"
                                                            fontWeight={isUnread ? 700 : 600}
                                                            color={isUnread ? (isQueueAlert ? "warning.dark" : "primary.main") : "textPrimary"}
                                                            fontSize="0.85rem"
                                                        >
                                                            {notif.title || "Thông báo từ Bệnh viện"}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box mt={0.3}>
                                                        <Typography variant="body2" color="textSecondary" fontSize="0.8rem" sx={{ wordBreak: "break-word" }}>
                                                            {notif.content || notif.message}
                                                        </Typography>
                                                        {notif.createdAt && (
                                                            <Typography variant="caption" color="text.disabled" display="block" mt={0.5} fontSize="0.7rem">
                                                                {formatDateTime(notif.createdAt)}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        {idx < notifications.length - 1 && <Divider component="li" />}
                                    </React.Fragment>
                                );
                            })}
                        </List>
                    )}
                </Box>
            </Popover>
        </>
    );
}
