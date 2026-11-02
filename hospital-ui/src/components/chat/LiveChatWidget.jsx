import React, { useState, useEffect, useRef } from "react";
import {
    Box,
    Fab,
    Badge,
    Paper,
    Typography,
    IconButton,
    TextField,
    Button,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Chip,
    CircularProgress,
    Stack,
    Tabs,
    Tab,
    Alert,
    Tooltip
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/AxiosInstance";
import { useNavigate } from "react-router-dom";

export default function LiveChatWidget() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [tabIndex, setTabIndex] = useState(0); // 0: AI 24/7, 1: Bác sĩ trực tuyến

    // AI Chat state
    const [aiMessages, setAiMessages] = useState([
        {
            id: "welcome-ai",
            isAi: true,
            text: "Xin chào! Tôi là **Trợ Lý Y Tế AI 24/7 của Bệnh viện Đa khoa TNT**. Hãy chia sẻ các triệu chứng hoặc vấn đề sức khỏe bạn đang gặp phải, tôi sẽ tư vấn sơ bộ và gợi ý Chuyên khoa khám bệnh phù hợp nhất cho bạn!",
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        }
    ]);
    const [aiInput, setAiInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [quickPrompts, setQuickPrompts] = useState([
        "Đau tức ngực khó thở khi gắng sức",
        "Đau đầu dữ dội kèm chóng mặt",
        "Trẻ 3 tuổi sốt 39 độ, ho có đờm",
        "Đau khớp gối khi co duỗi",
        "Đau thượng vị, ợ chua đầy bụng"
    ]);

    // Human Doctor Chat state
    const [consultants, setConsultants] = useState([]);
    const [activePartner, setActivePartner] = useState(null);
    const [doctorMessages, setDoctorMessages] = useState([]);
    const [doctorInput, setDoctorInput] = useState("");
    const [doctorLoading, setDoctorLoading] = useState(false);
    const [doctorSending, setDoctorSending] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);

    const aiMessagesBoxRef = useRef(null);
    const doctorMessagesBoxRef = useRef(null);

    // Fetch quick prompts on mount
    useEffect(() => {
        fetchQuickPrompts();
    }, []);

    // Polling for doctors if authenticated
    useEffect(() => {
        if (isAuthenticated) {
            fetchConsultants();
            const interval = setInterval(() => {
                if (typeof document !== "undefined" && document.hidden) return;
                fetchConsultants();
            }, 12000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    // Polling for doctor messages
    useEffect(() => {
        if (open && activePartner && isAuthenticated && tabIndex === 1) {
            fetchDoctorMessages();
            const interval = setInterval(() => {
                if (typeof document !== "undefined" && document.hidden) return;
                fetchDoctorMessages();
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [open, activePartner, isAuthenticated, tabIndex]);

    // Auto scroll inside chat box only when open
    useEffect(() => {
        if (open) {
            if (tabIndex === 0 && aiMessagesBoxRef.current) {
                aiMessagesBoxRef.current.scrollTop = aiMessagesBoxRef.current.scrollHeight;
            } else if (tabIndex === 1 && doctorMessagesBoxRef.current) {
                doctorMessagesBoxRef.current.scrollTop = doctorMessagesBoxRef.current.scrollHeight;
            }
        }
    }, [aiMessages, doctorMessages, aiLoading, open, tabIndex]);

    const fetchQuickPrompts = async () => {
        try {
            const res = await axiosInstance.get("/api/ai/prompts");
            const prompts = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            if (prompts.length > 0) {
                setQuickPrompts(prompts);
            }
        } catch (e) {
            console.log("Using default prompts");
        }
    };

    const fetchConsultants = async () => {
        try {
            const res = await axiosInstance.get("/api/chat/consultants");
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            setConsultants(list);
            const unreadSum = list.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0);
            setTotalUnread(unreadSum);
        } catch (err) {
            console.log("Lỗi tải danh sách tư vấn viên:", err);
        }
    };

    const fetchDoctorMessages = async () => {
        if (!activePartner) return;
        try {
            const res = await axiosInstance.get(`/api/chat/messages/${activePartner.partnerId}`);
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            setDoctorMessages(list);
        } catch (err) {
            console.error("Lỗi tải tin nhắn bác sĩ:", err);
        }
    };

    // Send message to AI
    const handleSendAi = async (textToSend) => {
        const query = (textToSend || aiInput).trim();
        if (!query || aiLoading) return;

        setAiInput("");
        const userMsg = {
            id: "user-" + Date.now(),
            isAi: false,
            text: query,
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        };
        setAiMessages(prev => [...prev, userMsg]);
        setAiLoading(true);

        try {
            const res = await axiosInstance.post("/api/ai/consult", { message: query });
            const data = (res?.data && res.data.replyText) ? res.data : (res?.replyText ? res : (res?.data?.data || res?.data || {}));
            if (data && data.replyText) {
                const aiMsg = {
                    id: "ai-" + Date.now(),
                    isAi: true,
                    text: data.replyText,
                    triageLevel: data.triageLevel,
                    emergencyAlert: data.emergencyAlert,
                    suggestedDepartment: data.suggestedDepartment,
                    suggestedDoctors: data.suggestedDoctors,
                    bookingAction: data.bookingAction,
                    medicalCitations: data.medicalCitations,
                    time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                };
                setAiMessages(prev => [...prev, aiMsg]);
            }
        } catch (err) {
            const errMsg = {
                id: "ai-err-" + Date.now(),
                isAi: true,
                text: "Xin lỗi, hệ thống AI đang nâng cấp đường truyền. Bạn có thể chuyển sang tab **Bác Sĩ Trực Tuyến** hoặc liên hệ Hotline 1900 8888 để được hỗ trợ ngay.",
                time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
            };
            setAiMessages(prev => [...prev, errMsg]);
        } finally {
            setAiLoading(false);
        }
    };

    // Send message to Human Doctor
    const handleSendDoctor = async () => {
        if (!doctorInput.trim() || !activePartner) return;

        const content = doctorInput.trim();
        setDoctorInput("");
        setDoctorSending(true);

        const tempMsg = {
            messageId: "temp-" + Date.now(),
            senderId: user?.userId,
            senderName: user?.fullName || "Tôi",
            recipientId: activePartner.partnerId,
            content: content,
            createdAt: new Date().toISOString(),
        };
        setDoctorMessages((prev) => [...prev, tempMsg]);

        try {
            await axiosInstance.post("/api/chat/send", {
                recipientId: activePartner.partnerId,
                content: content,
            });
            fetchDoctorMessages();
        } catch (err) {
            alert(err.message || "Không thể gửi tin nhắn!");
        } finally {
            setDoctorSending(false);
        }
    };

    const handleActionClick = (actionUrl) => {
        setOpen(false);
        navigate(actionUrl);
    };

    return (
        <Box sx={{ position: "fixed", bottom: { xs: 76, md: 24 }, right: { xs: 16, md: 24 }, zIndex: 1300 }}>
            {/* Floating FAB button */}
            {!open && (
                <Badge badgeContent={totalUnread} color="error" max={99}>
                    <Fab
                        color="primary"
                        aria-label="chat"
                        onClick={() => setOpen(true)}
                        sx={{
                            width: 62,
                            height: 62,
                            boxShadow: "0 8px 24px rgba(37, 99, 235, 0.45)",
                            bgcolor: "#1976d2",
                            "&:hover": { bgcolor: "#1565c0" }
                        }}
                    >
                        <SmartToyIcon sx={{ fontSize: 32 }} />
                    </Fab>
                </Badge>
            )}

            {/* Chat Box Popup */}
            {open && (
                <Paper
                    elevation={16}
                    sx={{
                        width: { xs: "calc(100vw - 32px)", sm: 420 },
                        height: 600,
                        maxHeight: "calc(100vh - 80px)",
                        borderRadius: 3.5,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
                        bgcolor: "#ffffff"
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            p: 1.5,
                            bgcolor: "#002D5A",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={1.2}>
                            {tabIndex === 1 && activePartner && (
                                <IconButton size="small" sx={{ color: "white" }} onClick={() => setActivePartner(null)}>
                                    <ArrowBackIcon fontSize="small" />
                                </IconButton>
                            )}
                            <Avatar sx={{ bgcolor: tabIndex === 0 ? "#ffb74d" : "#2563EB", width: 38, height: 38, color: "#002D5A" }}>
                                {tabIndex === 0 ? <SmartToyIcon /> : <SupportAgentIcon sx={{ color: "#fff" }} />}
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "#fff" }}>
                                    {tabIndex === 0 ? "AI Trợ Lý Y Tế 24/7" : (activePartner ? activePartner.partnerName : "Tư Vấn Trực Tuyến")}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#64b5f6", display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#4ade80", display: "inline-block" }}></span>
                                    {tabIndex === 0 ? "Phản hồi tức thì 24/7" : "Bác sĩ trực sẵn sàng"}
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "white" }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Mode Tabs */}
                    <Tabs
                        value={tabIndex}
                        onChange={(e, val) => setTabIndex(val)}
                        variant="fullWidth"
                        sx={{
                            bgcolor: "#f1f5f9",
                            minHeight: 42,
                            "& .MuiTab-root": { minHeight: 42, py: 1, fontWeight: 700, fontSize: "0.85rem" }
                        }}
                    >
                        <Tab icon={<SmartToyIcon fontSize="small" />} iconPosition="start" label="AI Y TẾ 24/7" />
                        <Tab
                            icon={
                                <Badge badgeContent={totalUnread} color="error">
                                    <SupportAgentIcon fontSize="small" />
                                </Badge>
                            }
                            iconPosition="start"
                            label="BÁC SĨ TRỰC"
                        />
                    </Tabs>

                    {/* TAB 0: AI ASSISTANT 24/7 */}
                    {tabIndex === 0 && (
                        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#f8fafc" }}>
                            {/* Message List */}
                            <Box ref={aiMessagesBoxRef} sx={{ flexGrow: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                                {aiMessages.map((msg) => (
                                    <Box
                                        key={msg.id}
                                        sx={{
                                            alignSelf: msg.isAi ? "flex-start" : "flex-end",
                                            maxWidth: "92%",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: msg.isAi ? "flex-start" : "flex-end"
                                        }}
                                    >
                                        <Paper
                                            elevation={1}
                                            sx={{
                                                p: 1.8,
                                                borderRadius: msg.isAi ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                                                bgcolor: msg.isAi ? "#ffffff" : "#1976d2",
                                                color: msg.isAi ? "#1e293b" : "#ffffff",
                                                border: msg.isAi ? "1px solid #e2e8f0" : "none",
                                                fontSize: "0.88rem",
                                                lineHeight: 1.5,
                                                whiteSpace: "pre-wrap"
                                            }}
                                        >
                                            {/* Emergency Alert Banner */}
                                            {msg.emergencyAlert && (
                                                <Alert
                                                    severity="error"
                                                    icon={<WarningAmberIcon />}
                                                    sx={{
                                                        mb: 1.5,
                                                        borderRadius: 2,
                                                        fontWeight: 700,
                                                        bgcolor: "#fee2e2",
                                                        color: "#b91c1c",
                                                        "& .MuiAlert-message": { width: "100%" }
                                                    }}
                                                >
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        {msg.emergencyAlert}
                                                    </Typography>
                                                    <Button
                                                        variant="contained"
                                                        color="error"
                                                        size="small"
                                                        fullWidth
                                                        startIcon={<PhoneInTalkIcon />}
                                                        href="tel:19008888"
                                                        sx={{ mt: 1, fontWeight: 900 }}
                                                    >
                                                        GỌI NGAY CẤP CỨU 1900 8888
                                                    </Button>
                                                </Alert>
                                            )}

                                            {/* Main Medical Text */}
                                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: "0.88rem" }}>
                                                {msg.text}
                                            </Typography>

                                            {/* 1-Click Smart Booking Action Card */}
                                            {msg.bookingAction && (
                                                <Box
                                                    sx={{
                                                        mt: 2,
                                                        p: 1.5,
                                                        bgcolor: "#f0fdf4",
                                                        borderRadius: 2.5,
                                                        border: "2px solid #86efac",
                                                        textAlign: "left"
                                                    }}
                                                >
                                                    <Box display="flex" alignItems="center" gap={1} mb={0.8}>
                                                        <CalendarMonthIcon sx={{ color: "#16a34a" }} />
                                                        <Typography variant="subtitle2" fontWeight="bold" color="#166534">
                                                            Gợi ý chuyên khoa: {msg.bookingAction.departmentName}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary" display="block" mb={1.2}>
                                                        Hệ thống đã chuẩn bị sẵn hồ sơ khám với triệu chứng của bạn. Bấm nút dưới đây để chọn bác sĩ và giờ khám nhanh:
                                                    </Typography>
                                                    <Button
                                                        fullWidth
                                                        variant="contained"
                                                        size="medium"
                                                        onClick={() => handleActionClick(msg.bookingAction.actionUrl)}
                                                        sx={{
                                                            bgcolor: "#16a34a",
                                                            "&:hover": { bgcolor: "#15803d" },
                                                            fontWeight: 800,
                                                            borderRadius: 2,
                                                            py: 1,
                                                            boxShadow: "0 4px 12px rgba(22,163,74,0.3)"
                                                        }}
                                                    >
                                                        {msg.bookingAction.buttonLabel}
                                                    </Button>
                                                </Box>
                                            )}

                                            {/* Medical Citations */}
                                            {msg.medicalCitations && msg.medicalCitations.length > 0 && (
                                                <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px dashed #e2e8f0" }}>
                                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5 }}>
                                                        <MenuBookIcon sx={{ fontSize: 13 }} /> Nguồn tham khảo y khoa:
                                                    </Typography>
                                                    {msg.medicalCitations.map((cite, idx) => (
                                                        <Typography key={idx} variant="caption" sx={{ display: "block", color: "#2563eb", fontStyle: "italic" }}>
                                                            • {cite.title} ({cite.source})
                                                        </Typography>
                                                    ))}
                                                </Box>
                                            )}
                                        </Paper>
                                        <Typography variant="caption" sx={{ color: "#94a3b8", mt: 0.4, px: 0.5 }}>
                                            {msg.time}
                                        </Typography>
                                    </Box>
                                ))}

                                {aiLoading && (
                                    <Box display="flex" alignItems="center" gap={1} p={1} bgcolor="#fff" borderRadius={2} alignSelf="flex-start" border="1px solid #e2e8f0">
                                        <CircularProgress size={16} />
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            AI đang phân tích triệu chứng & tra cứu chuyên khoa...
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Quick Prompt Pills */}
                            <Box sx={{ px: 1.5, py: 1, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0", overflowX: "auto", whiteSpace: "nowrap", display: "flex", gap: 0.8 }}>
                                {quickPrompts.map((prompt, idx) => (
                                    <Chip
                                        key={idx}
                                        label={prompt}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        onClick={() => handleSendAi(prompt)}
                                        sx={{ cursor: "pointer", fontWeight: 600, fontSize: "0.75rem", flexShrink: 0 }}
                                    />
                                ))}
                            </Box>

                            {/* Input Bar */}
                            <Box sx={{ p: 1.2, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0", display: "flex", gap: 1 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Nhập triệu chứng (VD: Đau ngực, sốt...)"
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendAi()}
                                />
                                <IconButton color="primary" onClick={() => handleSendAi()} disabled={!aiInput.trim() || aiLoading}>
                                    <SendIcon />
                                </IconButton>
                            </Box>
                        </Box>
                    )}

                    {/* TAB 1: HUMAN DOCTOR & TELEMEDICINE CHAT */}
                    {tabIndex === 1 && (
                        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "#f8fafc" }}>
                            {!isAuthenticated ? (
                                <Box sx={{ p: 3, textAlign: "center", my: "auto" }}>
                                    <SupportAgentIcon sx={{ fontSize: 56, color: "#94a3b8", mb: 1 }} />
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                                        Trò chuyện với Bác Sĩ Trực Tuyến
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        Vui lòng đăng nhập để kết nối trực tiếp với Bác sĩ chuyên khoa và lưu lại lịch sử tư vấn.
                                    </Typography>
                                    <Button variant="contained" color="primary" fullWidth onClick={() => { setOpen(false); navigate("/login"); }}>
                                        Đăng Nhập Ngay
                                    </Button>
                                </Box>
                            ) : !activePartner ? (
                                /* List of Consultants */
                                <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
                                    <Box p={1.5} bgcolor="#e2e8f0">
                                        <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                            CHỌN BÁC SĨ / TƯ VẤN VIÊN ĐANG TRỰC
                                        </Typography>
                                    </Box>
                                    <List disablePadding>
                                        {consultants.length === 0 ? (
                                            <Box p={3} textAlign="center" color="text.secondary">
                                                <Typography variant="body2">Hiện chưa có Bác sĩ nào online.</Typography>
                                            </Box>
                                        ) : (
                                            consultants.map((c) => (
                                                <ListItemButton key={c.partnerId} onClick={() => setActivePartner(c)} divider>
                                                    <ListItemAvatar>
                                                        <Badge color="success" variant="dot" overlap="circular">
                                                            <Avatar sx={{ bgcolor: "#2563EB" }}>
                                                                {c.partnerName?.charAt(0) || "BS"}
                                                            </Avatar>
                                                        </Badge>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={<Typography variant="subtitle2" fontWeight="bold">{c.partnerName}</Typography>}
                                                        secondary={c.specialty || "Bác sĩ Chuyên Khoa"}
                                                    />
                                                    {Number(c.unreadCount) > 0 && (
                                                        <Chip label={c.unreadCount} size="small" color="error" />
                                                    )}
                                                </ListItemButton>
                                            ))
                                        )}
                                    </List>
                                </Box>
                            ) : (
                                /* Doctor Messages Chat View */
                                <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                                    <Box ref={doctorMessagesBoxRef} sx={{ flexGrow: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                                        {doctorMessages.map((msg) => {
                                            const isMe = msg.senderId === user?.userId;
                                            return (
                                                <Box key={msg.messageId} sx={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                                                    <Paper
                                                        elevation={1}
                                                        sx={{
                                                            p: 1.5,
                                                            borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                                                            bgcolor: isMe ? "#1976d2" : "#ffffff",
                                                            color: isMe ? "#ffffff" : "#1e293b",
                                                            border: isMe ? "none" : "1px solid #e2e8f0",
                                                            fontSize: "0.85rem"
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </Paper>
                                                    <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.7rem", px: 0.5 }}>
                                                        {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>

                                    <Box sx={{ p: 1.2, bgcolor: "#ffffff", borderTop: "1px solid #e2e8f0", display: "flex", gap: 1 }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Nhắn tin với Bác sĩ..."
                                            value={doctorInput}
                                            onChange={(e) => setDoctorInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSendDoctor()}
                                        />
                                        <IconButton color="primary" onClick={handleSendDoctor} disabled={!doctorInput.trim() || doctorSending}>
                                            <SendIcon />
                                        </IconButton>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
}
