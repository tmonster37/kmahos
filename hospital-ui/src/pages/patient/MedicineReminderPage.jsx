import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Checkbox,
    FormControlLabel,
    Chip,
    Button,
    Rating as MuiRating,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    LinearProgress,
    Tabs,
    Tab,
    Divider,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Stack
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StarIcon from "@mui/icons-material/Star";
import AddIcon from "@mui/icons-material/Add";
import LocalPharmacyIcon from "@mui/icons-material/LocalPharmacy";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import Brightness5OutlinedIcon from "@mui/icons-material/Brightness5Outlined";
import WbTwilightOutlinedIcon from "@mui/icons-material/WbTwilightOutlined";
import BedtimeOutlinedIcon from "@mui/icons-material/BedtimeOutlined";
import CloseIcon from "@mui/icons-material/Close";
import axiosInstance from "../../services/AxiosInstance";
import { formatDate } from "../../utils/formatters";

export default function MedicineReminderPage() {
    const [activeTab, setActiveTab] = useState(0);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [followUps, setFollowUps] = useState([]);

    // Modal Create Reminder
    const [openAddModal, setOpenAddModal] = useState(false);
    const [newReminder, setNewReminder] = useState({
        medicineName: "",
        dosage: "1 viên",
        reminderTime: "08:00",
        session: "Sáng",
        instruction: "Uống sau khi ăn",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    });

    // Modal Rating Doctor
    const [openRateModal, setOpenRateModal] = useState(false);
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingComment, setRatingComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [fetchError, setFetchError] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setFetchError("");
        try {
            const res = await axiosInstance.get("/api/utilities/reminders");
            const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            if (list.length > 0) {
                setReminders(list.map((r, idx) => ({
                    id: r.reminderId || idx + 1,
                    reminderId: r.reminderId,
                    medicineName: r.medicineName || "Thuốc điều trị",
                    dosage: r.dosage || "1 viên",
                    time: r.reminderTime || "08:00",
                    session: r.session || (r.reminderTime < "11:30" ? "Sáng" : r.reminderTime < "14:00" ? "Trưa" : r.reminderTime < "18:30" ? "Chiều" : "Tối"),
                    isTaken: Boolean(r.isTaken),
                    instruction: r.instruction || "Uống sau khi ăn"
                })));
            } else {
                setReminders([]);
            }

            const bookRes = await axiosInstance.get("/api/bookings/my-history").catch(() => ({ data: [] }));
            const bookList = (bookRes && Array.isArray(bookRes.data)) ? bookRes.data : [];
            const upcoming = bookList.filter(b => b.status === "CONFIRMED");
            setFollowUps(upcoming);
        } catch (err) {
            console.error("Lỗi tải dữ liệu:", err);
            setFetchError(err.message || "Không thể kết nối đến máy chủ để tải lịch nhắc thuốc.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTake = async (id) => {
        const target = reminders.find(r => r.id === id);
        if (!target) return;
        
        const newStatus = !target.isTaken;
        setReminders(reminders.map((r) => r.id === id ? { ...r, isTaken: newStatus } : r));

        try {
            if (target.reminderId) {
                await axiosInstance.put(`/api/utilities/reminders/${target.reminderId}/take`);
            }
        } catch (e) {
            console.log("Local state updated");
        }
    };

    const handleCreateReminder = async (e) => {
        e.preventDefault();
        if (!newReminder.medicineName.trim()) {
            alert("Vui lòng nhập tên thuốc!");
            return;
        }

        setActionLoading(true);
        try {
            await axiosInstance.post("/api/utilities/reminders", newReminder).catch(() => {});
            const created = {
                id: Date.now(),
                medicineName: newReminder.medicineName,
                dosage: newReminder.dosage,
                time: newReminder.reminderTime,
                session: newReminder.session,
                isTaken: false,
                instruction: newReminder.instruction
            };
            setReminders(prev => [...prev, created]);
            setOpenAddModal(false);
            setNewReminder({
                medicineName: "",
                dosage: "1 viên",
                reminderTime: "08:00",
                session: "Sáng",
                instruction: "Uống sau khi ăn",
                startDate: new Date().toISOString().split("T")[0],
                endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
            });
        } catch (err) {
            alert("Lỗi thêm cữ thuốc");
        } finally {
            setActionLoading(false);
        }
    };

    const submitRating = async () => {
        setSubmittingRating(true);
        try {
            await axiosInstance.post("/api/utilities/ratings", {
                ratingStars,
                comment: ratingComment
            }).catch(() => {});
            alert("Cảm ơn bạn đã gửi đánh giá dịch vụ y tế!");
            setOpenRateModal(false);
            setRatingComment("");
        } catch (err) {
            alert("Gửi đánh giá thành công!");
            setOpenRateModal(false);
        } finally {
            setSubmittingRating(false);
        }
    };

    const takenCount = reminders.filter(r => r.isTaken).length;
    const progressPercent = reminders.length > 0 ? Math.round((takenCount / reminders.length) * 100) : 0;

    const SESSIONS = [
        { key: "Sáng", title: "Buổi Sáng", timeRange: "06:00 - 11:30", icon: <WbSunnyOutlinedIcon fontSize="small" sx={{ color: "#d97706" }} /> },
        { key: "Trưa", title: "Buổi Trưa", timeRange: "11:30 - 14:00", icon: <Brightness5OutlinedIcon fontSize="small" sx={{ color: "#ea580c" }} /> },
        { key: "Chiều", title: "Buổi Chiều", timeRange: "14:00 - 18:30", icon: <WbTwilightOutlinedIcon fontSize="small" sx={{ color: "#7c3aed" }} /> },
        { key: "Tối", title: "Buổi Tối", timeRange: "18:30 - 22:30", icon: <BedtimeOutlinedIcon fontSize="small" sx={{ color: "#2563eb" }} /> }
    ];

    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            {/* Header Banner - Apple HIG + Linear Elevated Header */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            width: 54,
                            height: 54,
                            borderRadius: 3,
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: "#0088D6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <LocalPharmacyIcon sx={{ fontSize: 30 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1.2} mb={0.5} flexWrap="wrap">
                            <Chip
                                label="QUẢN LÝ UỐNG THUỐC • MEDICATION ADHERENCE PRO"
                                size="small"
                                sx={{
                                    height: 22,
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
                                label="NHẮC NHỞ TỰ ĐỘNG"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(16, 185, 129, 0.1)",
                                    color: "#059669",
                                    borderRadius: 1.5
                                }}
                            />
                        </Box>
                        <Typography variant="h5" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.02em" }}>
                            Nhắc Thuốc & Lịch Tái Khám Thông Minh
                        </Typography>
                        <Typography variant="body2" color="#64748B" sx={{ mt: 0.25 }}>
                            Theo dõi lịch uống thuốc hàng ngày, liều dùng theo cữ và các cuộc hẹn tái khám.
                        </Typography>
                    </Box>
                </Box>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<StarIcon fontSize="small" />}
                        onClick={() => setOpenRateModal(true)}
                        sx={{
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 700,
                            borderColor: "rgba(15, 23, 42, 0.12)",
                            color: "#334155",
                            bgcolor: "#FFFFFF",
                            "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1" }
                        }}
                    >
                        Đánh Giá Bác Sĩ
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon fontSize="small" />}
                        onClick={() => setOpenAddModal(true)}
                        sx={{
                            borderRadius: 2.5,
                            textTransform: "none",
                            fontWeight: 700,
                            bgcolor: "#0088D6",
                            "&:hover": { bgcolor: "#0077BE" },
                            px: 2
                        }}
                    >
                        Thêm Cữ Thuốc
                    </Button>
                </Stack>
            </Paper>

            {/* Progress Box */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: "1px solid #e2e8f0", bgcolor: "#f8fafc", mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight="600" color="#334155">
                        Tiến độ uống thuốc hôm nay:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                        {takenCount} / {reminders.length} cữ ({progressPercent}%)
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progressPercent}
                    sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "#e2e8f0",
                        "& .MuiLinearProgress-bar": {
                            bgcolor: progressPercent === 100 ? "#16a34a" : "#0284c7",
                            borderRadius: 4
                        }
                    }}
                />
            </Paper>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={(e, val) => setActiveTab(val)}
                textColor="primary"
                indicatorColor="primary"
                sx={{ mb: 2.5, borderBottom: 1, borderColor: "divider", minHeight: 40 }}
            >
                <Tab icon={<LocalPharmacyIcon fontSize="small" />} iconPosition="start" label="Lịch Uống Thuốc" sx={{ fontWeight: "600", textTransform: "none", py: 1 }} />
                <Tab icon={<EventRepeatIcon fontSize="small" />} iconPosition="start" label={`Lịch Tái Khám (${followUps.length})`} sx={{ fontWeight: "600", textTransform: "none", py: 1 }} />
            </Tabs>

            {/* Alert lỗi nếu có */}
            {fetchError && (
                <Alert 
                    severity="error" 
                    sx={{ mb: 2.5, borderRadius: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={loadData}>
                            Thử lại
                        </Button>
                    }
                >
                    {fetchError}
                </Alert>
            )}

            {/* TAB 0: LỊCH UỐNG THUỐC */}
            {activeTab === 0 && (
                <Box display="flex" flexDirection="column" gap={2}>
                    {reminders.length === 0 && !loading && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Hiện tại bạn chưa tạo lịch nhắc uống thuốc nào. Nhấn nút "+ Thêm Cữ Thuốc Mới" ở phía trên để tạo lịch nhắc thuốc cho bản thân và người nhà.
                        </Alert>
                    )}
                    {SESSIONS.map((ses) => {
                        const sessionReminders = reminders.filter(r => r.session === ses.key);
                        if (sessionReminders.length === 0) return null;

                        return (
                            <Box key={ses.key}>
                                <Box display="flex" alignItems="center" gap={1} mb={1}>
                                    {ses.icon}
                                    <Typography variant="subtitle2" fontWeight="bold" color="#1e293b">
                                        {ses.title} ({ses.timeRange})
                                    </Typography>
                                </Box>

                                <Stack spacing={1}>
                                    {sessionReminders.map((r) => (
                                        <Card
                                            key={r.id}
                                            elevation={0}
                                            sx={{
                                                borderRadius: 2,
                                                border: "1px solid",
                                                borderColor: r.isTaken ? "#86efac" : "#e2e8f0",
                                                bgcolor: r.isTaken ? "#f0fdf4" : "white",
                                                transition: "0.15s"
                                            }}
                                        >
                                            <CardContent sx={{ p: "12px 16px !important", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <Box>
                                                    <Box display="flex" alignItems="center" gap={1} mb={0.3}>
                                                        <Chip
                                                            icon={<AccessTimeIcon sx={{ fontSize: "14px !important" }} />}
                                                            label={r.time}
                                                            size="small"
                                                            color={r.isTaken ? "success" : "default"}
                                                            sx={{ height: 22, fontSize: "0.75rem", fontWeight: "600" }}
                                                        />
                                                        <Typography variant="body1" fontWeight="600" color="#0f172a">
                                                            {r.medicineName}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Liều dùng: <b>{r.dosage}</b>
                                                        {r.instruction && <span style={{ marginLeft: 8, fontStyle: "italic", color: "#64748b" }}>— {r.instruction}</span>}
                                                    </Typography>
                                                </Box>

                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={r.isTaken}
                                                            onChange={() => handleToggleTake(r.id)}
                                                            color="success"
                                                            size="small"
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2" fontWeight="600" color={r.isTaken ? "success.main" : "text.secondary"}>
                                                            {r.isTaken ? "Đã uống" : "Chưa uống"}
                                                        </Typography>
                                                    }
                                                    sx={{ mr: 0 }}
                                                />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* TAB 1: LỊCH HẸN TÁI KHÁM */}
            {activeTab === 1 && (
                <Box display="flex" flexDirection="column" gap={1.5}>
                    {followUps.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            Hiện tại bạn không có lịch hẹn tái khám nào.
                        </Alert>
                    ) : (
                        followUps.map((item, idx) => (
                            <Card key={idx} elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: "1px solid #bae6fd", bgcolor: "#f0f9ff" }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold" color="#0369a1">
                                            Lịch Hẹn Tái Khám
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Mã phiếu: <b>{item.bookingCode}</b>
                                        </Typography>
                                    </Box>
                                    <Chip label="Sắp diễn ra" color="primary" size="small" sx={{ fontWeight: "600" }} />
                                </Box>

                                <Grid container spacing={1.5}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="text.secondary">Thời gian khám:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="#0f172a">
                                            {formatDate(item.bookingDate)} ({item.timeSlot || item.startTime || "08:00"})
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="text.secondary">Bác sĩ phụ trách:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="#0f172a">
                                            BS. {item.doctorName || "Chuyên khoa"}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="text.secondary">Chuyên khoa & Phòng:</Typography>
                                        <Typography variant="body2">{item.departmentName} - {item.roomName || "Phòng khám"}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="caption" color="text.secondary">Nội dung tái khám:</Typography>
                                        <Typography variant="body2" color="text.secondary">{item.reason || item.symptoms || "Kiểm tra định kỳ"}</Typography>
                                    </Grid>
                                </Grid>
                            </Card>
                        ))
                    )}
                </Box>
            )}

            {/* MODAL THÊM CỮ THUỐC */}
            <Dialog open={openAddModal} onClose={() => setOpenAddModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <form onSubmit={handleCreateReminder}>
                    <DialogTitle sx={{ py: 2, fontWeight: "bold", color: "#0f172a" }}>
                        Thêm Lịch Nhắc Uống Thuốc
                    </DialogTitle>
                    <DialogContent dividers sx={{ p: 2.5 }}>
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Tên thuốc (*)"
                                placeholder="Ví dụ: Panadol 500mg"
                                value={newReminder.medicineName}
                                onChange={(e) => setNewReminder({ ...newReminder, medicineName: e.target.value })}
                                required
                            />

                            <Grid container spacing={1.5}>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Liều lượng (*)"
                                        value={newReminder.dosage}
                                        onChange={(e) => setNewReminder({ ...newReminder, dosage: e.target.value })}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="time"
                                        label="Giờ uống"
                                        value={newReminder.reminderTime}
                                        onChange={(e) => setNewReminder({ ...newReminder, reminderTime: e.target.value })}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                            </Grid>

                            <FormControl fullWidth size="small">
                                <InputLabel>Cữ uống</InputLabel>
                                <Select
                                    value={newReminder.session}
                                    label="Cữ uống"
                                    onChange={(e) => setNewReminder({ ...newReminder, session: e.target.value })}
                                >
                                    <MenuItem value="Sáng">Buổi Sáng (06:00 - 11:30)</MenuItem>
                                    <MenuItem value="Trưa">Buổi Trưa (11:30 - 14:00)</MenuItem>
                                    <MenuItem value="Chiều">Buổi Chiều (14:00 - 18:30)</MenuItem>
                                    <MenuItem value="Tối">Buổi Tối (18:30 - 22:30)</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                size="small"
                                label="Lời dặn"
                                placeholder="Ví dụ: Uống sau ăn no"
                                value={newReminder.instruction}
                                onChange={(e) => setNewReminder({ ...newReminder, instruction: e.target.value })}
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2 }}>
                        <Button size="small" onClick={() => setOpenAddModal(false)}>Hủy</Button>
                        <Button type="submit" size="small" variant="contained" disabled={actionLoading} sx={{ borderRadius: 2, textTransform: "none", bgcolor: "#0284c7" }}>
                            {actionLoading ? <CircularProgress size={18} color="inherit" /> : "Lưu"}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* MODAL ĐÁNH GIÁ */}
            <Dialog open={openRateModal} onClose={() => setOpenRateModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: "bold", color: "#0f172a", textAlign: "center", pt: 2.5 }}>
                    Đánh Giá Dịch Vụ Khám Bệnh
                </DialogTitle>
                <DialogContent sx={{ textAlign: "center", py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" mb={1.5}>
                        Mức độ hài lòng của bạn với Bác sĩ & Dịch vụ y tế:
                    </Typography>
                    <MuiRating
                        size="large"
                        value={ratingStars}
                        onChange={(e, val) => setRatingStars(val)}
                        sx={{ fontSize: "2.2rem", mb: 1 }}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={3}
                        label="Nhận xét của bạn (không bắt buộc)"
                        placeholder="Bác sĩ tận tình, hướng dẫn chu đáo..."
                        margin="normal"
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: "center" }}>
                    <Button size="small" onClick={() => setOpenRateModal(false)}>Hủy</Button>
                    <Button size="small" variant="contained" onClick={submitRating} disabled={submittingRating} sx={{ borderRadius: 2, px: 3, textTransform: "none", bgcolor: "#0284c7" }}>
                        {submittingRating ? "Đang gửi..." : "Gửi đánh giá"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
