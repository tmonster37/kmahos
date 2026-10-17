import React, { useState, useEffect, useRef } from "react";
import {
    Container,
    Box,
    Typography,
    Grid,
    Paper,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Divider,
    Stack,
    Button,
    Alert,
    MenuItem,
    Select,
    FormControl,
    Tabs,
    Tab,
    Card,
    CardContent,
    TableContainer,
    AlertTitle
} from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import StarsIcon from "@mui/icons-material/Stars";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import ScienceIcon from "@mui/icons-material/Science";
import axiosInstance from "../services/AxiosInstance";
import { speakPatientCall, playChime } from "../services/voiceService";
import { useLocation } from "react-router-dom";

export default function QueueDisplayPage() {
    const [queue, setQueue] = useState([]);
    const [counters, setCounters] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState("ALL");
    const [viewMode, setViewMode] = useState("GRID"); // 'GRID': Lưới các buồng phòng, 'FOCUS': Tập trung phòng đơn, 'COUNTERS': Quầy tiếp đón sảnh
    const [currentTime, setCurrentTime] = useState(new Date());
    const [audioEnabled, setAudioEnabled] = useState(false);
    const [myTicket, setMyTicket] = useState(null);
    const lastCalledId = useRef(null);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const trackedCode = queryParams.get("code");

    // Tải thông tin phiếu cá nhân định kỳ để cập nhật trạng thái thời gian thực
    const fetchMyTicket = () => {
        if (trackedCode) {
            axiosInstance.get(`/api/bookings/code/${trackedCode}`).then((res) => {
                const data = res?.data?.data || res?.data || res;
                if (data && (data.bookingCode || data.queueNumber)) {
                    setMyTicket(data);
                }
            }).catch(() => {});
        }
    };

    useEffect(() => {
        fetchMyTicket();
    }, [trackedCode]);

    useEffect(() => {
        // Đồng hồ thời gian thực
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        // Tải danh sách chuyên khoa
        axiosInstance.get("/api/departments").then(res => {
            const list = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
            setDepartments(list);
        }).catch(() => {});

        // Thăm dò hàng đợi định kỳ mỗi 3 giây (Realtime Sync)
        fetchPublicQueue();
        const queueInterval = setInterval(fetchPublicQueue, 3000);

        return () => {
            clearInterval(clockInterval);
            clearInterval(queueInterval);
        };
    }, [audioEnabled, trackedCode]);

    const fetchPublicQueue = async () => {
        try {
            fetchMyTicket();
            const res = await axiosInstance.get("/api/clinical/queue/public");
            const list = (res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setQueue(list);

            // Tải trạng thái quầy tiếp đón thời gian thực
            axiosInstance.get("/api/counters").then(counterRes => {
                const cList = (counterRes.data && Array.isArray(counterRes.data)) ? counterRes.data : [];
                setCounters(cList);
            }).catch(() => {});

            // Tự động phát âm thanh khi có bệnh nhân mới được Bác sĩ / Điều dưỡng gọi vào khám
            const inProgressList = list.filter((p) => p.status === "IN_PROGRESS");
            if (inProgressList.length > 0) {
                const latestCalled = inProgressList[0];
                if (latestCalled.bookingId !== lastCalledId.current) {
                    lastCalledId.current = latestCalled.bookingId;
                    if (audioEnabled) {
                        speakPatientCall({
                            queueCode: latestCalled.queueCode,
                            queueNumber: latestCalled.queueNumber,
                            patientName: latestCalled.patientName,
                            roomName: latestCalled.roomName || "01",
                            departmentName: latestCalled.departmentName || "Khám Bệnh",
                            isPriority: latestCalled.isPriority,
                            isReturnAfterResult: Boolean(latestCalled.isReturnAfterResult || (latestCalled.queueCode && latestCalled.queueCode.startsWith("KQ")))
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Lỗi cập nhật hàng đợi LED TV:", err);
        }
    };

    const handleEnableAudio = () => {
        setAudioEnabled(true);
        playChime();
    };

    // Lọc theo Khoa
    const filteredQueue = selectedDeptId === "ALL"
        ? queue
        : queue.filter(q => String(q.departmentId) === String(selectedDeptId));

    // Nhóm theo từng buồng phòng khám
    const roomsMap = {};
    filteredQueue.forEach(item => {
        const rName = item.roomName || "Phòng Khám 101";
        if (!roomsMap[rName]) {
            roomsMap[rName] = {
                roomName: rName,
                departmentName: item.departmentName || "Khoa Khám Bệnh",
                current: null,
                waiting: []
            };
        }
        if (item.status === "IN_PROGRESS" && !roomsMap[rName].current) {
            roomsMap[rName].current = item;
        } else {
            roomsMap[rName].waiting.push(item);
        }
    });

    const roomList = Object.values(roomsMap);

    // Bệnh nhân đang gọi đầu tiên
    const currentCalling = filteredQueue.find((p) => p.status === "IN_PROGRESS") || (filteredQueue.length > 0 ? filteredQueue[0] : null);
    const upcomingQueue = filteredQueue.filter((p) => p !== currentCalling);

    // Tính toán số người đang chờ phía trước cho phiếu của tôi (nếu có)
    const myTicketQueueCode = myTicket?.queueCode || (myTicket?.queueNumber ? `KB-${String(myTicket.queueNumber).padStart(2, '0')}` : null);
    const peopleAheadCount = myTicket && queue.length > 0
        ? queue.filter(q => q.status === "WAITING" && q.queueNumber < (myTicket.queueNumber || 9999)).length
        : 0;
    const isMyTurnNow = myTicket && (myTicket.status === "IN_PROGRESS" || (currentCalling && currentCalling.queueNumber === myTicket.queueNumber));

    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#080F24",
                color: "#FFFFFF",
                p: { xs: 2, md: 2.5 },
                display: "flex",
                flexDirection: "column",
                fontFamily: "'Roboto', sans-serif",
                userSelect: "none"
            }}
        >
            {/* Header LED TV Bar */}
            <Paper
                elevation={6}
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 3,
                    bgcolor: "#111C3A",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    border: "1px solid rgba(255,255,255,0.12)",
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #0088D6 0%, #00C292 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 0 20px rgba(0, 136, 214, 0.5)"
                        }}
                    >
                        <LocalHospitalIcon sx={{ fontSize: 30, color: "white" }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight="900" sx={{ letterSpacing: 1, color: "#38BDF8" }}>
                            BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600 }}>
                            MÀN HÌNH ĐIỀU PHỐI & GỌI SỐ THỜI GIAN THỰC (REALTIME LED DISPLAY)
                        </Typography>
                    </Box>
                </Box>

                {/* Bộ lọc chọn Khoa & Chế độ xem */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 200, bgcolor: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                        <Select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            sx={{ color: "white", fontSize: "0.85rem", "& .MuiSvgIcon-root": { color: "white" } }}
                        >
                            <MenuItem value="ALL">Toàn bộ chuyên khoa ({queue.length} bệnh nhân)</MenuItem>
                            {departments.map(d => (
                                <MenuItem key={d.departmentId} value={d.departmentId}>
                                    {d.departmentName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Tabs
                        value={viewMode}
                        onChange={(e, val) => setViewMode(val)}
                        sx={{
                            bgcolor: "rgba(255,255,255,0.08)",
                            borderRadius: 2,
                            minHeight: 36,
                            "& .MuiTab-root": { minHeight: 36, py: 0.5, px: 1.5, color: "#94A3B8", fontWeight: 700, fontSize: "0.8rem" },
                            "& .Mui-selected": { color: "#38BDF8 !important" }
                        }}
                    >
                        <Tab value="GRID" label="Chia Buồng Phòng" />
                        <Tab value="FOCUS" label="Sảnh Tập Trung" />
                        <Tab value="COUNTERS" label="Quầy Tiếp Đón Sảnh" />
                    </Tabs>

                    {!audioEnabled ? (
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<VolumeUpIcon />}
                            onClick={handleEnableAudio}
                            sx={{ fontWeight: 700, borderRadius: 2, py: 0.8 }}
                        >
                            Bật Loa Gọi Số
                        </Button>
                    ) : (
                        <Chip label="🔊 Loa AI Đang Bật" color="success" size="small" sx={{ fontWeight: 700 }} />
                    )}

                    <Box textAlign="right" pl={1}>
                        <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: "monospace", color: "#34D399", lineHeight: 1 }}>
                            {currentTime.toLocaleTimeString("vi-VN")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                            {currentTime.toLocaleDateString("vi-VN")}
                        </Typography>
                    </Box>
                </Stack>
            </Paper>

            {/* BANNER TRA CỨU PHIẾU KHÁM CÁ NHÂN (KHI QUÉT MÃ QR TỪ PHIẾU IN KIOSK) */}
            {myTicket && (
                <Paper
                    elevation={8}
                    sx={{
                        p: 2.5,
                        mb: 2.5,
                        borderRadius: 3,
                        background: isMyTurnNow
                            ? "linear-gradient(135deg, #1e3a8a 0%, #065f46 100%)"
                            : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        border: isMyTurnNow ? "2px solid #34D399" : "2px solid #38BDF8",
                        boxShadow: isMyTurnNow
                            ? "0 0 30px rgba(52, 211, 153, 0.4)"
                            : "0 0 20px rgba(56, 189, 248, 0.25)",
                        animation: isMyTurnNow ? "pulse 2s infinite" : "none"
                    }}
                >
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3} md={2.5} textAlign={{ xs: "center", sm: "left" }}>
                            <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, letterSpacing: 1 }}>
                                PHIẾU KHÁM CỦA BẠN
                            </Typography>
                            <Typography
                                variant="h3"
                                fontWeight="900"
                                sx={{
                                    color: myTicket.isPriority ? "#F87171" : "#FBBF24",
                                    fontFamily: "monospace",
                                    lineHeight: 1.1,
                                    my: 0.5
                                }}
                            >
                                {myTicketQueueCode || myTicket.queueCode || `KB-${myTicket.queueNumber}`}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#E2E8F0", fontWeight: 700 }}>
                                {myTicket.patientName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#94A3B8", fontFamily: "monospace" }}>
                                Mã: {myTicket.bookingCode}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={5} md={5.5}>
                            <Stack spacing={0.8}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <MeetingRoomIcon sx={{ color: "#38BDF8", fontSize: 20 }} />
                                    <Typography variant="body2" sx={{ color: "#F8FAFC" }}>
                                        <strong>Phòng khám:</strong> {myTicket.roomName || "Phòng khám"} • {myTicket.departmentName || "Khoa Khám Bệnh"}
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <PersonSearchIcon sx={{ color: "#34D399", fontSize: 20 }} />
                                    <Typography variant="body2" sx={{ color: "#F8FAFC" }}>
                                        <strong>Bác sĩ phụ trách:</strong> {myTicket.doctorName || "Bác sĩ chuyên khoa"}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Grid>

                        <Grid item xs={12} sm={4} md={4} textAlign={{ xs: "center", sm: "right" }}>
                            {isMyTurnNow ? (
                                <Box>
                                    <Chip
                                        icon={<CheckCircleIcon />}
                                        label="ĐẾN LƯỢT KHÁM - VÀO PHÒNG NGAY"
                                        color="success"
                                        sx={{
                                            fontWeight: 900,
                                            fontSize: "0.95rem",
                                            py: 2.2,
                                            px: 1,
                                            boxShadow: "0 0 15px rgba(52, 211, 153, 0.6)"
                                        }}
                                    />
                                    <Typography variant="caption" display="block" sx={{ color: "#A7F3D0", mt: 0.8, fontWeight: 600 }}>
                                        Mời bạn tiến vào {myTicket.roomName || "phòng khám"} gặp {myTicket.doctorName}
                                    </Typography>
                                </Box>
                            ) : myTicket.status === "COMPLETED" || myTicket.status === "DONE" ? (
                                <Box>
                                    <Chip
                                        icon={<CheckCircleIcon />}
                                        label="ĐÃ HOÀN THÀNH KHÁM"
                                        color="primary"
                                        sx={{ fontWeight: 800, fontSize: "0.9rem", py: 1.8 }}
                                    />
                                    <Typography variant="caption" display="block" sx={{ color: "#94A3B8", mt: 0.5 }}>
                                        Bạn có thể xem đơn thuốc và hóa đơn trong tài khoản
                                    </Typography>
                                </Box>
                            ) : (
                                <Box>
                                    <Chip
                                        icon={<HourglassEmptyIcon />}
                                        label={`ĐANG CHỜ • CÒN ${peopleAheadCount} NGƯỜI PHÍA TRƯỚC`}
                                        sx={{
                                            bgcolor: "rgba(251, 191, 36, 0.2)",
                                            color: "#FBBF24",
                                            border: "1px solid #FBBF24",
                                            fontWeight: 800,
                                            fontSize: "0.85rem",
                                            py: 1.8
                                        }}
                                    />
                                    <Typography variant="caption" display="block" sx={{ color: "#94A3B8", mt: 0.5 }}>
                                        Màn hình tự động cập nhật khi bác sĩ gọi số tiếp theo
                                    </Typography>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Chế độ 1: MULTI-ROOM GRID (Chia theo từng buồng khám) */}
            {viewMode === "GRID" && (
                <Grid container spacing={2.5} sx={{ flexGrow: 1 }}>
                    {roomList.length > 0 ? (
                        roomList.map((room, idx) => {
                            const isCurrentReturn = Boolean(room.current?.isReturnAfterResult || (room.current?.queueCode && room.current.queueCode.startsWith("KQ")));
                            const isCurrentPri = Boolean(room.current?.isPriority);
                            return (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                                <Paper
                                    elevation={4}
                                    sx={{
                                        borderRadius: 3,
                                        overflow: "hidden",
                                        bgcolor: "#111C3A",
                                        border: isCurrentReturn ? "2px solid #10B981" : (isCurrentPri ? "2px solid #EF4444" : "1px solid rgba(255,255,255,0.15)"),
                                        boxShadow: isCurrentReturn ? "0 0 18px rgba(16, 185, 129, 0.35)" : (isCurrentPri ? "0 0 15px rgba(239, 68, 68, 0.3)" : "none"),
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column"
                                    }}
                                >
                                    {/* Room Header */}
                                    <Box
                                        sx={{
                                            bgcolor: isCurrentReturn ? "#059669" : (isCurrentPri ? "#DC2626" : "#0284C7"),
                                            p: 1.2,
                                            textAlign: "center",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between"
                                        }}
                                    >
                                        <Box display="flex" alignItems="center" gap={0.8}>
                                            <MeetingRoomIcon sx={{ fontSize: 20 }} />
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {room.roomName}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={0.6}>
                                            {isCurrentReturn && (
                                                <Chip
                                                    size="small"
                                                    label="🔬 TRẢ KẾT QUẢ"
                                                    sx={{
                                                        bgcolor: "#064E3B",
                                                        color: "#6EE7B7",
                                                        fontWeight: 800,
                                                        fontSize: "0.62rem",
                                                        height: 20
                                                    }}
                                                />
                                            )}
                                            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: "0.7rem" }}>
                                                {room.departmentName}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Big Calling Number */}
                                    <Box p={2.5} textAlign="center" sx={{ bgcolor: "rgba(0,0,0,0.2)" }}>
                                        <Typography variant="caption" sx={{ color: isCurrentReturn ? "#6EE7B7" : "#94A3B8", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                                            {isCurrentReturn ? "🔬 ĐANG TRẢ KẾT QUẢ" : "ĐANG KHÁM"}
                                        </Typography>
                                        <Typography
                                            variant="h2"
                                            fontWeight="900"
                                            sx={{
                                                color: isCurrentReturn ? "#34D399" : (isCurrentPri ? "#F87171" : "#FBBF24"),
                                                fontFamily: "monospace",
                                                my: 0.5,
                                                textShadow: isCurrentReturn ? "0 0 15px rgba(52, 211, 153, 0.5)" : (isCurrentPri ? "0 0 15px rgba(248, 113, 113, 0.4)" : "0 0 15px rgba(251, 191, 36, 0.4)")
                                            }}
                                        >
                                            {room.current ? (room.current.queueCode || String(room.current.queueNumber).padStart(2, "0")) : "--"}
                                        </Typography>
                                        <Typography variant="subtitle1" fontWeight="bold" noWrap color="white">
                                            {room.current?.patientName || "Chưa có lượt khám"}
                                        </Typography>
                                    </Box>

                                    {/* Waiting List in this Room */}
                                    <Box p={1.5} sx={{ flexGrow: 1, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                                        <Typography variant="caption" sx={{ color: "#38BDF8", fontWeight: 700, mb: 1, display: "block" }}>
                                            ⏳ CHỜ KHÁM TIẾP THEO ({room.waiting.length}):
                                        </Typography>
                                        {room.waiting.length > 0 ? (
                                            <Stack spacing={0.8}>
                                                {room.waiting.slice(0, 4).map((w, wIdx) => {
                                                    const isWReturn = Boolean(w.isReturnAfterResult || (w.queueCode && w.queueCode.startsWith("KQ")));
                                                    const isWPri = Boolean(w.isPriority);
                                                    return (
                                                        <Box
                                                            key={wIdx}
                                                            sx={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                                p: "4px 8px",
                                                                bgcolor: isWReturn ? "rgba(16, 185, 129, 0.18)" : (isWPri ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.05)"),
                                                                border: isWReturn ? "1px solid rgba(16, 185, 129, 0.4)" : "none",
                                                                borderRadius: 1.5
                                                            }}
                                                        >
                                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                                <Typography variant="body2" fontWeight="bold" color={isWReturn ? "#34D399" : (isWPri ? "#F87171" : "#FBBF24")}>
                                                                    #{w.queueCode || w.queueNumber}
                                                                </Typography>
                                                                {isWReturn && (
                                                                    <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#6EE7B7", fontWeight: 700 }}>
                                                                        (CLS)
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                            <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                                                                {w.patientName}
                                                            </Typography>
                                                        </Box>
                                                    );
                                                })}
                                            </Stack>
                                        ) : (
                                            <Typography variant="caption" color="#64748B" sx={{ fontStyle: "italic" }}>
                                                Hết danh sách chờ
                                            </Typography>
                                        )}
                                    </Box>
                                </Paper>
                            </Grid>
                            );
                        })
                    ) : (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 6, textAlign: "center", bgcolor: "#111C3A", borderRadius: 3 }}>
                                <Typography variant="h6" color="#94A3B8">
                                    Hiện chưa có lượt khám nào trong hàng đợi hôm nay.
                                </Typography>
                            </Paper>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Chế độ 2: FOCUS MODE (Màn hình lớn tập trung sảnh) */}
            {viewMode === "FOCUS" && (() => {
                const isCurrentReturn = Boolean(currentCalling?.isReturnAfterResult || (currentCalling?.queueCode && currentCalling.queueCode.startsWith("KQ")));
                const isCurrentPri = Boolean(currentCalling?.isPriority);
                return (
                <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                    {/* BIG CALLING BOX */}
                    <Grid item xs={12} lg={6}>
                        <Paper
                            elevation={8}
                            sx={{
                                p: 4,
                                borderRadius: 4,
                                bgcolor: "#111C3A",
                                border: isCurrentReturn ? "3px solid #10B981" : (isCurrentPri ? "3px solid #EF4444" : "2px solid #38BDF8"),
                                boxShadow: isCurrentReturn ? "0 0 25px rgba(16, 185, 129, 0.4)" : (isCurrentPri ? "0 0 25px rgba(239, 68, 68, 0.4)" : "none"),
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                textAlign: "center",
                                position: "relative",
                                overflow: "hidden"
                            }}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bgcolor: isCurrentReturn ? "#059669" : (isCurrentPri ? "#DC2626" : "#0284C7"),
                                    py: 1.2,
                                    fontWeight: "bold",
                                    letterSpacing: 2,
                                    fontSize: "1.1rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 1
                                }}
                            >
                                {isCurrentReturn ? <ScienceIcon /> : <VolumeUpIcon />}
                                {isCurrentReturn
                                    ? "🔬 MỜI BỆNH NHÂN TRẢ KẾT QUẢ CLS VÀO PHÒNG KHÁM"
                                    : (isCurrentPri ? "MỜI BỆNH NHÂN ƯU TIÊN VÀO PHÒNG KHÁM" : "MỜI BỆNH NHÂN VÀO PHÒNG KHÁM")}
                            </Box>

                            <Box mt={3}>
                                <Typography variant="subtitle1" sx={{ color: isCurrentReturn ? "#6EE7B7" : "#94A3B8", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
                                    {isCurrentReturn ? "🔬 SỐ THỨ TỰ TRẢ KẾT QUẢ CLS" : "SỐ THỨ TỰ ĐANG KHÁM"}
                                </Typography>
                                <Typography
                                    variant="h1"
                                    fontWeight="900"
                                    sx={{
                                        fontSize: { xs: "5rem", md: "7.5rem" },
                                        color: isCurrentReturn ? "#34D399" : (isCurrentPri ? "#F87171" : "#FBBF24"),
                                        lineHeight: 1.1,
                                        my: 1.5,
                                        textShadow: isCurrentReturn ? "0 0 25px rgba(52, 211, 153, 0.6)" : (isCurrentPri ? "0 0 25px rgba(248, 113, 113, 0.5)" : "0 0 25px rgba(251, 191, 36, 0.5)"),
                                        fontFamily: "monospace"
                                    }}
                                >
                                    {currentCalling ? (currentCalling.queueCode || String(currentCalling.queueNumber).padStart(2, "0")) : "--"}
                                </Typography>

                                <Typography variant="h4" fontWeight="bold" sx={{ color: "#FFFFFF", mb: 1, textTransform: "uppercase" }}>
                                    {currentCalling?.patientName || "Đang cập nhật..."}
                                </Typography>

                                <Paper
                                    sx={{
                                        p: 1.8,
                                        borderRadius: 2,
                                        bgcolor: "rgba(255,255,255,0.06)",
                                        border: "1px dashed rgba(255,255,255,0.2)",
                                        width: "100%",
                                        maxWidth: 440,
                                        margin: "0 auto",
                                        mt: 2
                                    }}
                                >
                                    <Typography variant="subtitle1" sx={{ color: "#34D399", fontWeight: "bold" }}>
                                        📍 {currentCalling?.roomName || "Phòng 101"} • {currentCalling?.departmentName || "Khoa Khám Bệnh"}
                                    </Typography>
                                </Paper>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* UPCOMING QUEUE TABLE */}
                    <Grid item xs={12} lg={6}>
                        <Paper
                            elevation={8}
                            sx={{
                                p: 3,
                                borderRadius: 4,
                                bgcolor: "#111C3A",
                                border: "1px solid rgba(255,255,255,0.12)",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column"
                            }}
                        >
                            <Typography variant="h6" fontWeight="bold" sx={{ color: "#38BDF8", mb: 2 }}>
                                ⏳ DANH SÁCH CHUẨN BỊ VÀO KHÁM ({upcomingQueue.length})
                            </Typography>

                            <TableContainer sx={{ flexGrow: 1, overflowY: "auto" }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: "rgba(255,255,255,0.06)" }}>
                                        <TableRow>
                                            <TableCell sx={{ color: "#94A3B8", fontWeight: "bold" }}>STT</TableCell>
                                            <TableCell sx={{ color: "#94A3B8", fontWeight: "bold" }}>BỆNH NHÂN</TableCell>
                                            <TableCell sx={{ color: "#94A3B8", fontWeight: "bold" }}>PHÒNG KHÁM</TableCell>
                                            <TableCell sx={{ color: "#94A3B8", fontWeight: "bold" }}>ĐỐI TƯỢNG</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {upcomingQueue.length > 0 ? (
                                            upcomingQueue.slice(0, 10).map((p, pIdx) => {
                                                const isPReturn = Boolean(p.isReturnAfterResult || (p.queueCode && p.queueCode.startsWith("KQ")));
                                                const isPPri = Boolean(p.isPriority);
                                                return (
                                                <TableRow key={pIdx} hover sx={{ bgcolor: isPReturn ? "rgba(16, 185, 129, 0.12)" : (isPPri ? "rgba(239, 68, 68, 0.1)" : "transparent") }}>
                                                    <TableCell sx={{ color: isPReturn ? "#34D399" : (isPPri ? "#F87171" : "#FBBF24"), fontWeight: 900, fontSize: "1.1rem" }}>
                                                        {p.queueCode || String(p.queueNumber).padStart(2, "0")}
                                                    </TableCell>
                                                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                                                        {p.patientName}
                                                    </TableCell>
                                                    <TableCell sx={{ color: "#34D399" }}>
                                                        {p.roomName || "Phòng khám"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isPReturn ? (
                                                            <Chip size="small" icon={<ScienceIcon sx={{ fontSize: "14px !important", color: "#6EE7B7 !important" }} />} label="TRẢ KẾT QUẢ" sx={{ bgcolor: "#065F46", color: "#A7F3D0", fontWeight: 800, border: "1px solid #10B981" }} />
                                                        ) : isPPri ? (
                                                            <Chip size="small" label="ƯU TIÊN" sx={{ bgcolor: "#DC2626", color: "#fff", fontWeight: 700 }} />
                                                        ) : (
                                                            <Typography variant="caption" sx={{ color: "#94A3B8" }}>Thường</Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center" sx={{ color: "#64748B", py: 4 }}>
                                                    Hiện không có bệnh nhân chờ tiếp theo.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
                );
            })()}

            {/* Chế độ 3: COUNTERS MODE (Màn hình LED Quầy Tiếp Đón Sảnh Tầng 1) */}
            {viewMode === "COUNTERS" && (
                <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    <Paper
                        elevation={6}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            bgcolor: "#111C3A",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 2
                        }}
                    >
                        <Box display="flex" alignItems="center" gap={1.5}>
                            <HowToRegIcon sx={{ color: "#38BDF8", fontSize: 32 }} />
                            <Box>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: "#F8FAFC" }}>
                                    HỆ THỐNG GỌI SỐ & ĐIỀU PHỐI QUẦY TIẾP ĐÓN TRUNG TÂM
                                </Typography>
                                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                                    Khu vực Sảnh tầng 1 • Hỗ trợ tiếp nhận thường, BHYT, Ưu tiên và Đặt hẹn
                                </Typography>
                            </Box>
                        </Box>

                        <Stack direction="row" spacing={2}>
                            <Chip
                                label={`Quầy hoạt động: ${counters.filter(c => c.status === "SERVING" || c.status === "AVAILABLE").length}/${counters.length}`}
                                sx={{ bgcolor: "rgba(16, 185, 129, 0.2)", color: "#34D399", fontWeight: 700 }}
                            />
                            <Chip
                                label={`Tổng chờ tiếp đón: ${counters.reduce((acc, c) => acc + (c.waitingCount || 0), 0)} người`}
                                sx={{ bgcolor: "rgba(245, 158, 11, 0.2)", color: "#FBBF24", fontWeight: 700 }}
                            />
                        </Stack>
                    </Paper>

                    <Grid container spacing={2.5}>
                        {counters.map(counter => {
                            const isServing = counter.status === "SERVING";
                            const isAvailable = counter.status === "AVAILABLE";
                            const isPaused = counter.status === "PAUSED";
                            const isPriority = counter.type === "PRIORITY";
                            const isInsurance = counter.type === "INSURANCE";

                            let statusColor = "#64748B";
                            let statusText = "ĐÃ ĐÓNG";
                            if (isServing) {
                                statusColor = "#10B981";
                                statusText = "ĐANG PHỤC VỤ";
                            } else if (isAvailable) {
                                statusColor = "#0284C7";
                                statusText = "SẴN SÀNG";
                            } else if (isPaused) {
                                statusColor = "#F59E0B";
                                statusText = "TẠM NGHỈ";
                            }

                            return (
                                <Grid item xs={12} sm={6} md={4} lg={2.4} key={counter.counterId}>
                                    <Paper
                                        elevation={6}
                                        sx={{
                                            borderRadius: 3,
                                            overflow: "hidden",
                                            bgcolor: "#111C3A",
                                            border: isServing
                                                ? "2px solid #10B981"
                                                : isPriority
                                                ? "2px solid #EF4444"
                                                : "1px solid rgba(255,255,255,0.12)",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            transition: "all 0.3s ease",
                                            boxShadow: isServing ? "0 0 20px rgba(16, 185, 129, 0.25)" : "none"
                                        }}
                                    >
                                        {/* Card Header */}
                                        <Box
                                            sx={{
                                                bgcolor: isPriority
                                                    ? "#DC2626"
                                                    : isInsurance
                                                    ? "#0D9488"
                                                    : "#0284C7",
                                                p: 1.5,
                                                textAlign: "center"
                                            }}
                                        >
                                            <Typography variant="h6" fontWeight="900" color="white">
                                                QUẦY 0{counter.counterNumber}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", display: "block" }}>
                                                {counter.name}
                                            </Typography>
                                        </Box>

                                        {/* Serving Number Display */}
                                        <Box p={3} textAlign="center" sx={{ bgcolor: "rgba(0,0,0,0.25)", flexGrow: 1 }}>
                                            <Chip
                                                size="small"
                                                label={statusText}
                                                sx={{
                                                    bgcolor: `${statusColor}22`,
                                                    color: statusColor,
                                                    fontWeight: 800,
                                                    border: `1px solid ${statusColor}`,
                                                    mb: 1.5
                                                }}
                                            />

                                            <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", textTransform: "uppercase", letterSpacing: 1.5 }}>
                                                SỐ ĐANG TIẾP ĐÓN
                                            </Typography>

                                            <Typography
                                                variant="h2"
                                                fontWeight="900"
                                                sx={{
                                                    color: isServing ? "#34D399" : (counter.currentTicketCode ? "#FBBF24" : "#475569"),
                                                    fontFamily: "monospace",
                                                    my: 1,
                                                    textShadow: isServing ? "0 0 20px rgba(52, 211, 153, 0.6)" : "none"
                                                }}
                                            >
                                                {counter.currentTicketCode || "--"}
                                            </Typography>

                                            <Typography variant="subtitle1" fontWeight="bold" noWrap color="white" sx={{ minHeight: 28 }}>
                                                {counter.currentPatientName || (isAvailable ? "Sẵn sàng nhận khách" : "Chưa có lượt tiếp")}
                                            </Typography>
                                        </Box>

                                        {/* Footer: Nurse & Waiting Count */}
                                        <Box p={2} sx={{ borderTop: "1px solid rgba(255,255,255,0.08)", bgcolor: "rgba(255,255,255,0.02)" }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                                                    Điều dưỡng trực:
                                                </Typography>
                                                <Typography variant="caption" fontWeight="bold" sx={{ color: "#E2E8F0" }}>
                                                    {counter.currentNurseName || "Chưa gán"}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                                                    Đang chờ tiếp đón:
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={`${counter.waitingCount || 0} người`}
                                                    sx={{
                                                        bgcolor: (counter.waitingCount || 0) > 0 ? "rgba(245, 158, 11, 0.2)" : "rgba(255,255,255,0.06)",
                                                        color: (counter.waitingCount || 0) > 0 ? "#FBBF24" : "#94A3B8",
                                                        fontWeight: 700,
                                                        height: 22
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            )}
        </Box>
    );
}
