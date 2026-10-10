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
        <Container maxWidth="xl" sx={{ py: 3, height: "calc(100vh - 110px)", display: "flex", flexDirection: "column" }}>
            <Paper
                elevation={4}
                sx={{
                    flexGrow: 1,
                    borderRadius: 3,
                    overflow: "hidden",
                    display: "flex",
                    border: "1px solid #E2E8F0",
                }}
            >
                {/* LEFT: Conversation List & Doctor Directory */}
                <Box
                    sx={{
                        width: { xs: "100%", md: 380 },
                        display: { xs: activePartner ? "none" : "flex", md: "flex" },
                        bgcolor: "#FFFFFF",
                        borderRight: "1px solid #E2E8F0",
                        flexDirection: "column",
                        height: "100%",
                        flexShrink: 0
                    }}
                >
                    {/* Header */}
                    <Box p={2} borderBottom="1px solid #E2E8F0">
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Typography variant="h6" fontWeight="bold" color="primary.main">
                                💬 Tư Vấn Y Tế Trực Tuyến
                            </Typography>
                            <Tooltip title="Làm mới">
                                <IconButton size="small" onClick={() => { fetchConversations(); fetchConsultants(); }}>
                                    <RefreshIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {/* Switch Tabs */}
                        <Tabs
                            value={sidebarTab}
                            onChange={(e, v) => setSidebarTab(v)}
                            variant="fullWidth"
                            sx={{ minHeight: 36, mb: 1.5 }}
                        >
                            <Tab
                                icon={<ForumIcon fontSize="small" />}
                                iconPosition="start"
                                label={`Hội thoại (${conversations.length})`}
                                sx={{ textTransform: "none", fontWeight: 700, minHeight: 36, py: 0.5, fontSize: "0.8rem" }}
                            />
                            <Tab
                                icon={<PeopleAltIcon fontSize="small" />}
                                iconPosition="start"
                                label={`Bác sĩ (${consultants.length})`}
                                sx={{ textTransform: "none", fontWeight: 700, minHeight: 36, py: 0.5, fontSize: "0.8rem" }}
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
                            }}
                        />
                    </Box>

                    {/* TAB 0: CONVERSATIONS LIST */}
                    {sidebarTab === 0 && (
                        <List sx={{ flexGrow: 1, overflowY: "auto", p: 1 }}>
                            {loadingConversations && conversations.length === 0 ? (
                                <Box textAlign="center" py={4}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : filteredConversations.length === 0 ? (
                                <Box textAlign="center" py={6} px={2} color="text.secondary">
                                    <ChatBubbleOutlineIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
                                    <Typography variant="body2" mb={1.5}>Chưa có cuộc hội thoại nào</Typography>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<PeopleAltIcon />}
                                        onClick={() => setSidebarTab(1)}
                                        sx={{ textTransform: "none" }}
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
                                                borderRadius: 2,
                                                mb: 0.5,
                                                p: 1.5,
                                                border: isSelected ? "1.5px solid #2563EB" : "1px solid transparent",
                                                bgcolor: isSelected ? "rgba(37, 99, 235, 0.08)" : "transparent",
                                            }}
                                        >
                                            <ListItemAvatar>
                                                <Badge
                                                    overlap="circular"
                                                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                                    variant="dot"
                                                    color="success"
                                                >
                                                    <Avatar sx={{ bgcolor: isSelected ? "primary.main" : "#E2E8F0", color: isSelected ? "white" : "#1E293B", fontWeight: "bold" }}>
                                                        {c.partnerName?.charAt(0) || "U"}
                                                    </Avatar>
                                                </Badge>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                                        <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ maxWidth: 160 }}>
                                                            {c.partnerName}
                                                        </Typography>
                                                        {c.unreadCount > 0 && (
                                                            <Chip label={c.unreadCount} size="small" color="error" sx={{ height: 18, fontSize: "0.65rem", fontWeight: "bold" }} />
                                                        )}
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary" noWrap display="block">
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
                        <List sx={{ flexGrow: 1, overflowY: "auto", p: 1 }}>
                            {loadingConsultants ? (
                                <Box textAlign="center" py={4}>
                                    <CircularProgress size={28} />
                                </Box>
                            ) : filteredConsultants.length === 0 ? (
                                <Box textAlign="center" py={6} color="text.secondary">
                                    <MedicalServicesIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
                                    <Typography variant="body2">Không tìm thấy bác sĩ phù hợp</Typography>
                                </Box>
                            ) : (
                                filteredConsultants.map((doc, idx) => (
                                    <Card
                                        key={doc.partnerId || doc.doctorId || idx}
                                        elevation={0}
                                        sx={{
                                            mb: 1,
                                            borderRadius: 2,
                                            border: "1px solid #E2E8F0",
                                            transition: "0.2s",
                                            "&:hover": { borderColor: "#0088D6", bgcolor: "#F8FAFC" }
                                        }}
                                    >
                                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                            <Box display="flex" alignItems="center" gap={1.2} mb={1}>
                                                <Avatar sx={{ bgcolor: "#0088D6", width: 36, height: 36, fontSize: "0.875rem", fontWeight: "bold" }}>
                                                    {(doc.partnerName || doc.fullName)?.charAt(0) || "B"}
                                                </Avatar>
                                                <Box flex={1}>
                                                    <Typography variant="subtitle2" fontWeight="bold" color="textPrimary">
                                                        {doc.degree ? `${doc.degree} ` : ""}{doc.partnerName || doc.fullName}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {doc.departmentName || "Khoa Khám Bệnh"}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label="Online"
                                                    color="success"
                                                    size="small"
                                                    sx={{ height: 18, fontSize: "0.65rem", fontWeight: "bold" }}
                                                />
                                            </Box>
                                            <Button
                                                fullWidth
                                                size="small"
                                                variant="contained"
                                                startIcon={<ForumIcon fontSize="small" />}
                                                onClick={() => handleSelectDoctorToChat(doc)}
                                                sx={{ borderRadius: 1.5, textTransform: "none", fontSize: "0.75rem", py: 0.5 }}
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
                                    borderBottom: "1px solid #E2E8F0",
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
                                    <Avatar sx={{ bgcolor: "primary.main", color: "white", fontWeight: "bold" }}>
                                        {activePartner.partnerName?.charAt(0) || "U"}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {activePartner.partnerName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {activePartner.departmentName ? `${activePartner.departmentName} • ` : ""}
                                            {activePartner.partnerRole === "ROLE_DOCTOR" ? "Bác sĩ chuyên khoa" : "Bệnh nhân"} • <span style={{ color: "#10B981", fontWeight: "bold" }}>Trực tuyến</span>
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Message Feed */}
                            <Box ref={messagesContainerRef} sx={{ flexGrow: 1, overflowY: "auto", p: 3 }}>
                                {messages.length === 0 ? (
                                    <Box textAlign="center" py={8} color="text.secondary">
                                        <SupportAgentIcon sx={{ fontSize: 56, opacity: 0.4, mb: 1.5, color: "primary.main" }} />
                                        <Typography variant="h6" fontWeight="bold">
                                            Kênh Tư Vấn Sức Khỏe Trực Tuyến
                                        </Typography>
                                        <Typography variant="body2" sx={{ maxWidth: 450, margin: "0 auto", mt: 0.5 }}>
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
                                                        borderRadius: 3,
                                                        bgcolor: isMe ? "primary.main" : "#FFFFFF",
                                                        color: isMe ? "white" : "#1E293B",
                                                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                                        border: isMe ? "none" : "1px solid #E2E8F0",
                                                    }}
                                                >
                                                    {!isMe && (
                                                        <Typography variant="caption" fontWeight="bold" display="block" color="primary.main" mb={0.5}>
                                                            {m.senderName || activePartner.partnerName}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                                        {m.content}
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            display: "block",
                                                            textAlign: "right",
                                                            mt: 0.5,
                                                            opacity: 0.7,
                                                            fontSize: "0.7rem",
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
                                <Box px={2} py={1} bgcolor="#FFFFFF" borderTop="1px solid #E2E8F0" display="flex" gap={1} overflow="auto">
                                    {CLINICAL_TEMPLATES.map((tmpl, idx) => (
                                        <Chip
                                            key={idx}
                                            label={tmpl}
                                            size="small"
                                            onClick={() => setInputMessage(tmpl)}
                                            sx={{ maxWidth: 300, cursor: "pointer", fontSize: "0.75rem" }}
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            )}

                            {/* Message Input Bar */}
                            <Box p={2} bgcolor="#FFFFFF" borderTop="1px solid #E2E8F0" display="flex" gap={1.5} alignItems="center">
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
                                />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    endIcon={<SendIcon />}
                                    disabled={!inputMessage.trim() || sending}
                                    onClick={handleSendMessage}
                                    sx={{ px: 3, fontWeight: "bold", borderRadius: 2 }}
                                >
                                    Gửi
                                </Button>
                            </Box>
                        </>
                    ) : (
                        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="text.secondary">
                            <LocalHospitalIcon sx={{ fontSize: 64, color: "#CBD5E1", mb: 2 }} />
                            <Typography variant="h6" fontWeight="bold">
                                Chọn một cuộc trò chuyện hoặc bác sĩ để bắt đầu
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={0.5}>
                                Bệnh viện Đa khoa TNT luôn sẵn sàng đồng hành tư vấn y tế 24/7.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Container>
    );
}
