import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import axiosInstance from "../../services/AxiosInstance";

const todayInVietnam = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const canChange = (booking) => ["CONFIRMED", "PENDING_PAYMENT"].includes(booking.status) && !booking.checkedInAt;

export default function BookingManagePage() {
    const [fromDate, setFromDate] = useState(todayInVietnam());
    const [toDate, setToDate] = useState(todayInVietnam());
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [targetDate, setTargetDate] = useState("");
    const [slots, setSlots] = useState([]);
    const [selectedSlotId, setSelectedSlotId] = useState("");
    const [saving, setSaving] = useState(false);

    const loadBookings = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axiosInstance.get("/api/admin/bookings", { params: { fromDate, toDate } });
            setBookings(Array.isArray(response?.data) ? response.data : []);
        } catch (requestError) {
            setError(requestError.message || "Không tải được danh sách lịch hẹn.");
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => { loadBookings(); }, [loadBookings]);

    const loadSlots = async (date, booking) => {
        if (!date || !booking?.departmentId) return;
        setSlots([]);
        setSelectedSlotId("");
        try {
            const response = await axiosInstance.get("/api/admin/bookings/slots", {
                params: { date, departmentId: booking.departmentId }
            });
            setSlots(Array.isArray(response?.data) ? response.data : []);
        } catch (requestError) {
            setError(requestError.message || "Không tải được khung giờ còn chỗ.");
        }
    };

    const openReschedule = (booking) => {
        setSelectedBooking(booking);
        setTargetDate(booking.bookingDate);
        setError("");
        setSlots([]);
        setSelectedSlotId("");
        loadSlots(booking.bookingDate, booking);
    };

    const closeReschedule = () => {
        if (!saving) setSelectedBooking(null);
    };

    const handleReschedule = async () => {
        if (!selectedBooking || !selectedSlotId) return;
        setSaving(true);
        setError("");
        setMessage("");
        try {
            await axiosInstance.put(`/api/admin/bookings/${selectedBooking.bookingId}/reschedule`, { timeSlotId: selectedSlotId });
            setMessage(`Đã đổi lịch ${selectedBooking.bookingCode}.`);
            setSelectedBooking(null);
            await loadBookings();
        } catch (requestError) {
            setError(requestError.message || "Không thể đổi lịch hẹn.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async (booking) => {
        if (!window.confirm(`Hủy lịch ${booking.bookingCode} của ${booking.patientName}?`)) return;
        setError("");
        setMessage("");
        try {
            await axiosInstance.post(`/api/admin/bookings/${booking.bookingId}/cancel`);
            setMessage(`Đã hủy lịch ${booking.bookingCode}.`);
            await loadBookings();
        } catch (requestError) {
            setError(requestError.message || "Không thể hủy lịch hẹn.");
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={2} mb={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={800}>Quản lý lịch hẹn</Typography>
                    <Typography color="text.secondary">Tra cứu, đổi hoặc hủy lịch bằng quyền quản trị.</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField label="Từ ngày" type="date" size="small" value={fromDate} onChange={(event) => setFromDate(event.target.value)} InputLabelProps={{ shrink: true }} />
                    <TextField label="Đến ngày" type="date" size="small" value={toDate} onChange={(event) => setToDate(event.target.value)} InputLabelProps={{ shrink: true }} />
                    <Button variant="contained" onClick={loadBookings} disabled={loading}>Tải lại</Button>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Mã / ngày</TableCell>
                            <TableCell>Bệnh nhân</TableCell>
                            <TableCell>Khoa / bác sĩ</TableCell>
                            <TableCell>Khung giờ</TableCell>
                            <TableCell>Trạng thái</TableCell>
                            <TableCell align="right">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
                        ) : bookings.length === 0 ? (
                            <TableRow><TableCell colSpan={6} align="center">Không có lịch trong khoảng ngày đã chọn.</TableCell></TableRow>
                        ) : bookings.map((booking) => (
                            <TableRow key={booking.bookingId} hover>
                                <TableCell><Typography fontWeight={700}>{booking.bookingCode}</Typography><Typography variant="caption">{booking.bookingDate} · #{booking.queueNumber}</Typography></TableCell>
                                <TableCell>{booking.patientName}<Typography variant="caption" display="block" color="text.secondary">{booking.patientPhone}</Typography></TableCell>
                                <TableCell>{booking.departmentName}<Typography variant="caption" display="block" color="text.secondary">{booking.doctorName} · {booking.roomName}</Typography></TableCell>
                                <TableCell>{booking.startTime || "—"} – {booking.endTime || "—"}</TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                        <Chip size="small" label={booking.status} />
                                        {booking.checkedInAt && <Chip size="small" color="success" label="Đã check-in" />}
                                    </Stack>
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                        <Button size="small" startIcon={<EventRepeatIcon />} disabled={!canChange(booking)} onClick={() => openReschedule(booking)}>Đổi</Button>
                                        <Button size="small" color="error" startIcon={<CancelOutlinedIcon />} disabled={!canChange(booking)} onClick={() => handleCancel(booking)}>Hủy</Button>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={Boolean(selectedBooking)} onClose={closeReschedule} fullWidth maxWidth="sm">
                <DialogTitle>Đổi lịch {selectedBooking?.bookingCode}</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Stack spacing={2} pt={1}>
                        <Typography color="text.secondary">Chuyên khoa đích phải trùng với lịch hiện tại; chỉ hiện khung giờ còn chỗ.</Typography>
                        <TextField
                            label="Ngày khám mới"
                            type="date"
                            value={targetDate}
                            onChange={(event) => { setTargetDate(event.target.value); loadSlots(event.target.value, selectedBooking); }}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField select label="Khung giờ mới" value={selectedSlotId} onChange={(event) => setSelectedSlotId(event.target.value)}>
                            {slots.map((slot) => (
                                <MenuItem key={slot.timeSlotId} value={slot.timeSlotId}>
                                    {slot.startTime}–{slot.endTime} · {slot.doctorName} · {slot.roomName} · còn {Math.max(0, slot.maxCapacity - slot.currentBookings)} chỗ
                                </MenuItem>
                            ))}
                        </TextField>
                        {!slots.length && <Alert severity="info">Không có khung giờ còn chỗ cho ngày này.</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeReschedule} disabled={saving}>Đóng</Button>
                    <Button variant="contained" onClick={handleReschedule} disabled={saving || !selectedSlotId}>
                        {saving ? <CircularProgress size={18} /> : "Lưu lịch mới"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
