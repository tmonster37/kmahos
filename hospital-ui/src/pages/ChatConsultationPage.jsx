import React, { useState, useEffect, useRef } from "react";
import {
    Container,
    Paper,
    Grid,
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Avatar,
    Divider,
    List,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Chip,
    InputAdornment,
    Stack,
    Badge,
    Tooltip,
    CircularProgress,
    Tabs,
    Tab,
    Card,
    CardContent
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ForumIcon from "@mui/icons-material/Forum";
import StarIcon from "@mui/icons-material/Star";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../services/AxiosInstance";

const CLINICAL_TEMPLATES = [
    "Chào bạn, tôi là Bác sĩ của Bệnh viện TNT. Bạn đang gặp các triệu chứng gì bất thường?",
    "Bạn vui lòng cung cấp thêm thông tin về thời gian bắt đầu sốt/đau và tiền sử dị ứng thuốc nếu có.",
    "Với các triệu chứng trên, bạn nên đến trực tiếp bệnh viện để Bác sĩ thăm khám lâm sàng và làm xét nghiệm cận lâm sàng cần thiết.",
    "Tôi đã xem xét kết quả của bạn. Vui lòng tuân thủ uống thuốc theo đúng đơn thuốc đã kê và tái khám theo hẹn."
];

export default function ChatConsultationPage() {
    const { user } = useAuth();
    const [sidebarTab, setSidebarTab] = useState(0); // 0: Hội thoại gần đây, 1: Danh bạ Bác sĩ
    const [conversations, setConversations] = useState([]);
    const [consultants, setConsultants] = useState([]);
    const [activePartner, setActivePartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingConsultants, setLoadingConsultants] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesContainerRef = useRef(null);

    useEffect(() => {
        fetchConversations();
        fetchConsultants();
        const interval = setInterval(() => {
            fetchConversations();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activePartner) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [activePartner]);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchConversations = async () => {
        try {
            setLoadingConversations(true);
            const res = await axiosInstance.get("/api/chat/conversations");
            const convList = (res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setConversations(convList);
            if (!activePartner && convList.length > 0) {
                setActivePartner(convList[0]);
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách hội thoại:", err);
        } finally {
            setLoadingConversations(false);
        }
    };

    const fetchConsultants = async () => {
        try {
            setLoadingConsultants(true);
            const res = await axiosInstance.get("/api/chat/consultants");
            const list = (res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setConsultants(list);
        } catch (err) {
            console.error("Lỗi lấy danh bạ bác sĩ:", err);
        } finally {
            setLoadingConsultants(false);
        }
    };

    const fetchMessages = async () => {
        if (!activePartner) return;
        try {
            const res = await axiosInstance.get(`/api/chat/messages/${activePartner.partnerId}`);
            const msgList = (res?.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setMessages(msgList);
        } catch (err) {
            console.error("Lỗi tải tin nhắn:", err);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !activePartner) return;

        const content = inputMessage.trim();
        setInputMessage("");
        setSending(true);

        const tempMsg = {
            messageId: "temp-" + Date.now(),
            senderId: user?.userId,
            senderName: user?.fullName || "Tôi",
            recipientId: activePartner.partnerId,
            content: content,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempMsg]);

        try {
            await axiosInstance.post("/api/chat/send", {
                recipientId: activePartner.partnerId,
                content: content,
            });
            fetchMessages();
            fetchConversations();
        } catch (err) {
            alert(err.message || "Không thể gửi tin nhắn!");
        } finally {
            setSending(false);
        }
    };

    const handleSelectDoctorToChat = (doctor) => {
        setActivePartner({
            partnerId: doctor.partnerId || doctor.doctorId || doctor.userId,
            partnerName: doctor.partnerName || doctor.fullName,
            partnerPhone: doctor.partnerPhone || doctor.phoneNumber,
            partnerRole: "ROLE_DOCTOR",
            departmentName: doctor.departmentName,
            degree: doctor.degree,
            unreadCount: 0
        });
        setSidebarTab(0); // Chuyển về màn hình chat
    };

    const filteredConversations = conversations.filter((c) => {
        const term = searchTerm.toLowerCase();
        return (
            !searchTerm ||
            c.partnerName?.toLowerCase().includes(term) ||
            c.partnerPhone?.includes(term)
        );
    });

    const filteredConsultants = consultants.filter((doc) => {
        const term = searchTerm.toLowerCase();
        return (
            !searchTerm ||
            (doc.partnerName && doc.partnerName.toLowerCase().includes(term)) ||
            (doc.fullName && doc.fullName.toLowerCase().includes(term)) ||
            (doc.departmentName && doc.departmentName.toLowerCase().includes(term))
        );
    });

    return (
        <Container maxWidth="xl" sx={{ py: 3, height: "calc(100vh - 90px)", display: "flex", flexDirection: "column" }}>
            {/* Header Banner - Apple HIG + Linear Elevated Header */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 2.5 },
                    mb: 2.5,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    flexShrink: 0
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: "#0088D6",
                            border: "1px solid rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <SupportAgentIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1.2} mb={0.25} flexWrap="wrap">
                            <Chip
                                label="TƯ VẤN Y TẾ TRỰC TUYẾN • TELEHEALTH PRO"
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    bgcolor: "#EBF5FF",
                                    color: "#0088D6",
                                    borderRadius: 1.5,
                                    border: "1px solid rgba(0, 136, 214, 0.2)"
                                }}
                            />
                            <Chip
                                label="LIVE 24/7"
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(16, 185, 129, 0.1)",
                                    color: "#059669",
                                    borderRadius: 1.5
                                }}
                            />
                        </Box>
                        <Typography variant="h6" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.02em" }}>
                            Kênh Tư Vấn Sức Khỏe & Trao Đổi Lâm Sàng
                        </Typography>
                        <Typography variant="caption" color="#64748B">
                            Kết nối trực tiếp giữa Bệnh nhân và Đội ngũ Bác sĩ chuyên khoa Bệnh viện Đa khoa TNT
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1.5} alignItems="center">
                    <Button
                        variant="outlined"
                        size="small"
                        sx={{
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 700,
                            borderColor: "rgba(15, 23, 42, 0.12)",
                            color: "#334155",
                            bgcolor: "#FFFFFF",
                            "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1" }
                        }}
                        startIcon={<RefreshIcon />}
                        onClick={() => { fetchConversations(); fetchConsultants(); }}
                    >
                        Làm Mới
                    </Button>
                </Box>
            </Paper>

            <Paper
                elevation={0}
                sx={{
                    flexGrow: 1,
                    borderRadius: 3.5,
                    overflow: "hidden",
                    display: "flex",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                    minHeight: 0
                }}
            >
                {/* LEFT: Conversation List & Doctor Directory */}
                <Box
                    sx={{
                        width: { xs: "100%", md: 380 },
                        display: { xs: activePartner ? "none" : "flex", md: "flex" },
                        bgcolor: "#FFFFFF",
                        borderRight: "1px solid rgba(15, 23, 42, 0.08)",
                        flexDirection: "column",
                        height: "100%",
                        flexShrink: 0
                    }}
                >
                    {/* Header */}
                    <Box p={2} borderBottom="1px solid rgba(15, 23, 42, 0.08)">
                        {/* Switch Tabs */}
                        <Tabs
                            value={sidebarTab}
                            onChange={(e, v) => setSidebarTab(v)}
                            variant="fullWidth"
                            sx={{
                                minHeight: 40,
                                mb: 1.5,
                                bgcolor: "#F8FAFC",
                                borderRadius: 2,
                                p: 0.5,
                                "& .MuiTabs-indicator": { display: "none" }
                            }}
                        >
                            <Tab
                                icon={<ForumIcon sx={{ fontSize: 18 }} />}
                                iconPosition="start"
                                label={`Hội thoại (${conversations.length})`}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    minHeight: 32,
                                    py: 0.5,
                                    fontSize: "0.8rem",
                                    borderRadius: 1.5,
                                    color: sidebarTab === 0 ? "#0088D6" : "#64748B",
                                    bgcolor: sidebarTab === 0 ? "#FFFFFF" : "transparent",
                                    boxShadow: sidebarTab === 0 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                    transition: "0.2s"
                                }}
                            />
                            <Tab
                                icon={<PeopleAltIcon sx={{ fontSize: 18 }} />}
                                iconPosition="start"
                                label={`Bác sĩ (${consultants.length})`}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    minHeight: 32,
                                    py: 0.5,
                                    fontSize: "0.8rem",
                                    borderRadius: 1.5,
                                    color: sidebarTab === 1 ? "#0088D6" : "#64748B",
                                    bgcolor: sidebarTab === 1 ? "#FFFFFF" : "transparent",
                                    boxShadow: sidebarTab === 1 ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                    transition: "0.2s"
                                }}
                            />
                        </Tabs>

                        <TextField
                            fullWidth
                            size="small"
                            placeholder={sidebarTab === 0 ? "Tìm kiếm cuộc hội thoại..." : "Tìm bác sĩ, chuyên khoa..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2, bgcolor: "#F8FAFC" }
                            }}
                        />
                    </Box>

                    {/* TAB 0: CONVERSATIONS LIST */}
                    {sidebarTab === 0 && (
                        <List sx={{ flexGrow: 1, overflowY: "auto", p: 1.5 }}>
                            {loadingConversations && conversations.length === 0 ? (
                                <Box textAlign="center" py={4}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : filteredConversations.length === 0 ? (
                                <Box textAlign="center" py={6} px={2} color="text.secondary">
                                    <ChatBubbleOutlineIcon sx={{ fontSize: 44, opacity: 0.3, mb: 1, color: "#64748B" }} />
                                    <Typography variant="body2" mb={1.5} color="#64748B">Chưa có cuộc hội thoại nào</Typography>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<PeopleAltIcon />}
                                        onClick={() => setSidebarTab(1)}
                                        sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
                                    >
                                        Xem danh bạ bác sĩ trực tuyến
                                    </Button>
                                </Box>
                            ) : (
                                filteredConversations.map((c) => {
                                    const isSelected = activePartner?.partnerId === c.partnerId;
                                    return (
                                        <ListItemButton
                                            key={c.partnerId}
                                            onClick={() => setActivePartner(c)}
                                            selected={isSelected}
                                            sx={{
                                                borderRadius: 2.5,
                                                mb: 0.75,
                                                p: 1.5,
                                                border: isSelected ? "1px solid rgba(0, 136, 214, 0.3)" : "1px solid transparent",
                                                bgcolor: isSelected ? "rgba(0, 136, 214, 0.06)" : "transparent",
                                                "&:hover": {
                                                    bgcolor: isSelected ? "rgba(0, 136, 214, 0.08)" : "#F8FAFC"
                                                }
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Badge
                                                    overlap="circular"
                                                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                                    variant="dot"
                                                    color="success"
                                                >
                                                    <Avatar sx={{ bgcolor: isSelected ? "#0088D6" : "#F1F5F9", color: isSelected ? "white" : "#334155", fontWeight: 700, width: 42, height: 42 }}>
                                                        {c.partnerName?.charAt(0) || "U"}
                                                    </Avatar>
                                                </Badge>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="subtitle2" fontWeight={700} color="#0F172A" noWrap sx={{ maxWidth: 160 }}>
                                                            {c.partnerName}
                                                        </Typography>
                                                        {c.unreadCount > 0 && (
                                                            <Chip label={c.unreadCount} size="small" color="error" sx={{ height: 18, fontSize: "0.65rem", fontWeight: "bold" }} />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="#64748B" noWrap display="block" sx={{ mt: 0.25 }}>
                                                        {c.lastMessage || (c.partnerRole === "ROLE_DOCTOR" ? "Bác sĩ chuyên khoa" : "Bệnh nhân")}
                                                    </Typography>
                                                }
                                            />
                                        </ListItemButton>
                                    );
                                })
                            )}
                        </List>
                    )}

                    {/* TAB 1: DOCTOR CONSULTANTS DIRECTORY */}
                    {sidebarTab === 1 && (
                        <List sx={{ flexGrow: 1, overflowY: "auto", p: 1.5 }}>
                            {loadingConsultants ? (
                                <Box textAlign="center" py={4}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : filteredConsultants.length === 0 ? (
                                <Box textAlign="center" py={6} color="text.secondary">
                                    <MedicalServicesIcon sx={{ fontSize: 44, opacity: 0.3, mb: 1, color: "#64748B" }} />
                                    <Typography variant="body2" color="#64748B">Không tìm thấy bác sĩ phù hợp</Typography>
                                </Box>
                            ) : (
                                filteredConsultants.map((doc, idx) => (
                                    <Card
                                        key={doc.partnerId || doc.doctorId || idx}
                                        elevation={0}
                                        sx={{
                                            mb: 1.2,
                                            borderRadius: 2.5,
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            transition: "0.2s",
                                            "&:hover": { borderColor: "#0088D6", bgcolor: "#F8FAFC", transform: "translateY(-1px)" }
                                        }}
                                    >
                                        <CardContent sx={{ p: 1.75, "&:last-child": { pb: 1.75 } }}>
                                            <Box display="flex" alignItems="center" gap={1.2} mb={1.2}>
                                                <Avatar sx={{ bgcolor: "rgba(0, 136, 214, 0.1)", color: "#0088D6", width: 40, height: 40, fontSize: "0.95rem", fontWeight: 700, border: "1px solid rgba(0, 136, 214, 0.2)" }}>
                                                    {(doc.partnerName || doc.fullName)?.charAt(0) || "B"}
                                                </Avatar>
                                                <Box flex={1}>
                                                    <Typography variant="subtitle2" fontWeight={700} color="#0F172A">
                                                        {doc.degree ? `${doc.degree} ` : ""}{doc.partnerName || doc.fullName}
                                                    </Typography>
                                                    <Typography variant="caption" color="#64748B">
                                                        {doc.departmentName || "Khoa Khám Bệnh"}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label="Online"
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: "0.68rem",
                                                        fontWeight: 700,
                                                        bgcolor: "rgba(16, 185, 129, 0.1)",
                                                        color: "#059669",
                                                        borderRadius: 1
                                                    }}
                                                />
                                            </Box>
                                            <Button
                                                fullWidth
                                                size="small"
                                                variant="contained"
                                                startIcon={<ForumIcon fontSize="small" />}
                                                onClick={() => handleSelectDoctorToChat(doc)}
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: "none",
                                                    fontSize: "0.78rem",
                                                    fontWeight: 700,
                                                    py: 0.6,
                                                    bgcolor: "#0088D6",
                                                    "&:hover": { bgcolor: "#0077BE" }
                                                }}
                                            >
                                                Nhắn tin tư vấn ngay
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </List>
                    )}
                </Box>

                {/* RIGHT: Active Chat View */}
                <Box
                    sx={{
                        flexGrow: 1,
                        display: { xs: activePartner ? "flex" : "none", md: "flex" },
                        flexDirection: "column",
                        height: "100%",
                        bgcolor: "#F8FAFC"
                    }}
                >
                    {activePartner ? (
                        <>
                            {/* Active Partner Header */}
                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: "#FFFFFF",
                                    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={1.5}>
                                    <IconButton
                                        size="small"
                                        onClick={() => setActivePartner(null)}
                                        sx={{ display: { xs: "inline-flex", md: "none" }, mr: -0.5 }}
                                    >
                                        <ArrowBackIcon fontSize="small" />
                                    </IconButton>
                                    <Avatar sx={{ bgcolor: "rgba(0, 136, 214, 0.1)", color: "#0088D6", fontWeight: 700, border: "1px solid rgba(0, 136, 214, 0.2)" }}>
                                        {activePartner.partnerName?.charAt(0) || "U"}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0F172A">
                                            {activePartner.partnerName}
                                        </Typography>
                                        <Typography variant="caption" color="#64748B">
                                            {activePartner.departmentName ? `${activePartner.departmentName} • ` : ""}
                                            {activePartner.partnerRole === "ROLE_DOCTOR" ? "Bác sĩ chuyên khoa" : "Bệnh nhân"} • <span style={{ color: "#10B981", fontWeight: 700 }}>Trực tuyến</span>
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Message Feed */}
                            <Box ref={messagesContainerRef} sx={{ flexGrow: 1, overflowY: "auto", p: 3 }}>
                                {messages.length === 0 ? (
                                    <Box textAlign="center" py={8} color="text.secondary">
                                        <SupportAgentIcon sx={{ fontSize: 56, opacity: 0.3, mb: 1.5, color: "#0088D6" }} />
                                        <Typography variant="h6" fontWeight={800} color="#0F172A">
                                            Kênh Tư Vấn Sức Khỏe Trực Tuyến
                                        </Typography>
                                        <Typography variant="body2" color="#64748B" sx={{ maxWidth: 450, margin: "0 auto", mt: 0.5 }}>
                                            Trao đổi trực tiếp, giải đáp thắc mắc đơn thuốc, kết quả xét nghiệm và hướng dẫn khám chữa bệnh cùng <b>{activePartner.partnerName}</b>.
                                        </Typography>
                                    </Box>
                                ) : (
                                    messages.map((m, idx) => {
                                        const isMe = m.senderId === user?.userId;
                                        return (
                                            <Box
                                                key={m.messageId || idx}
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: isMe ? "flex-end" : "flex-start",
                                                    mb: 2,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        maxWidth: "70%",
                                                        p: 1.8,
                                                        borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                                        bgcolor: isMe ? "#0088D6" : "#FFFFFF",
                                                        color: isMe ? "#FFFFFF" : "#0F172A",
                                                        boxShadow: isMe ? "0 2px 8px rgba(0, 136, 214, 0.25)" : "0 1px 3px rgba(0,0,0,0.03)",
                                                        border: isMe ? "none" : "1px solid rgba(15, 23, 42, 0.08)",
                                                    }}
                                                >
                                                    {!isMe && (
                                                        <Typography variant="caption" fontWeight={700} display="block" color="#0088D6" mb={0.5}>
                                                            {m.senderName || activePartner.partnerName}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}>
                                                        {m.content}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            display: "block",
                                                            textAlign: "right",
                                                            mt: 0.5,
                                                            opacity: isMe ? 0.8 : 0.6,
                                                            fontSize: "0.68rem",
                                                        }}
                                                    >
                                                        {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : ""}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })
                                )}
                            </Box>

                            {/* Doctor Clinical Fast Templates */}
                            {(user?.role === "ROLE_DOCTOR" || user?.role === "ROLE_HEAD_OF_DEPARTMENT") && (
                                <Box px={2} py={1} bgcolor="#FFFFFF" borderTop="1px solid rgba(15, 23, 42, 0.08)" display="flex" gap={1} overflow="auto">
                                    {CLINICAL_TEMPLATES.map((tmpl, idx) => (
                                        <Chip
                                            key={idx}
                                            label={tmpl}
                                            size="small"
                                            onClick={() => setInputMessage(tmpl)}
                                            sx={{ maxWidth: 300, cursor: "pointer", fontSize: "0.75rem", borderRadius: 1.5 }}
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            )}

                            {/* Message Input Bar */}
                            <Box p={2} bgcolor="#FFFFFF" borderTop="1px solid rgba(15, 23, 42, 0.08)" display="flex" gap={1.5} alignItems="center">
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Nhập nội dung tư vấn sức khỏe..."
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    InputProps={{
                                        sx: { borderRadius: 2.5, bgcolor: "#F8FAFC" }
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    endIcon={<SendIcon />}
                                    disabled={!inputMessage.trim() || sending}
                                    onClick={handleSendMessage}
                                    sx={{
                                        px: 3,
                                        fontWeight: 700,
                                        borderRadius: 2.5,
                                        textTransform: "none",
                                        bgcolor: "#0088D6",
                                        "&:hover": { bgcolor: "#0077BE" }
                                    }}
                                >
                                    Gửi
                                </Button>
                            </Box>
                        </>
                    ) : (
                        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="text.secondary">
                            <LocalHospitalIcon sx={{ fontSize: 64, color: "#CBD5E1", mb: 2 }} />
                            <Typography variant="h6" fontWeight={800} color="#0F172A">
                                Chọn một cuộc trò chuyện hoặc bác sĩ để bắt đầu
                            </Typography>
                            <Typography variant="body2" color="#64748B" mt={0.5}>
                                Bệnh viện Đa khoa TNT luôn sẵn sàng đồng hành tư vấn y tế 24/7.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Container>
    );
}
