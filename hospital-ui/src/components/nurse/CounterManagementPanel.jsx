import React, { useState, useEffect } from "react";
import {
  Paper,
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Tooltip,
  IconButton
} from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import PauseCircleFilledIcon from "@mui/icons-material/PauseCircleFilled";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import StarsIcon from "@mui/icons-material/Stars";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import axiosInstance from "../../services/AxiosInstance";
import { speakCounterCall } from "../../services/voiceService";

export default function CounterManagementPanel({ onPatientDispatched }) {
  const [counters, setCounters] = useState([]);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [selectedCounterId, setSelectedCounterId] = useState("");
  const [counterQueue, setCounterQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentCallingTicket, setCurrentCallingTicket] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Dialog chuyển phòng khám
  const [openDispatchDialog, setOpenDispatchDialog] = useState(false);
  const [selectedTargetRoomId, setSelectedTargetRoomId] = useState("");

  const activeCounter = counters.find(c => c.counterId === selectedCounterId);

  useEffect(() => {
    fetchCounters();
  }, []);

  useEffect(() => {
    if (selectedCounterId) {
      fetchCounterQueue(selectedCounterId);
      const interval = setInterval(() => {
        fetchCounterQueue(selectedCounterId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [selectedCounterId]);

  const fetchCounters = async () => {
    try {
      setLoadingCounters(true);
      const res = await axiosInstance.get("/api/counters");
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setCounters(list);
      if (list.length > 0 && !selectedCounterId) {
        setSelectedCounterId(list[0].counterId);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách quầy:", err);
    } finally {
      setLoadingCounters(false);
    }
  };

  const fetchCounterQueue = async (cId) => {
    try {
      const res = await axiosInstance.get(`/api/counters/${cId}/queue`);
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setCounterQueue(list);

      // Cập nhật vé đang gọi
      const calling = list.find(t => t.status === "CALLING");
      setCurrentCallingTicket(calling || null);
    } catch (err) {
      console.error("Lỗi tải hàng đợi quầy:", err);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedCounterId) return;
    try {
      setActionLoading(true);
      await axiosInstance.post(`/api/counters/${selectedCounterId}/check-in`);
      setFeedback({ type: "success", message: `Đã mở ${activeCounter?.counterName} thành công!` });
      await fetchCounters();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi mở quầy" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!selectedCounterId) return;
    try {
      setActionLoading(true);
      await axiosInstance.post(`/api/counters/${selectedCounterId}/close`);
      setFeedback({ type: "info", message: `Đã đóng ${activeCounter?.counterName}.` });
      setCurrentCallingTicket(null);
      await fetchCounters();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi đóng quầy" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallNext = async () => {
    if (!selectedCounterId) return;
    try {
      setActionLoading(true);
      const res = await axiosInstance.post(`/api/counters/${selectedCounterId}/call-next`);
      const ticket = res.data;
      setCurrentCallingTicket(ticket);
      setFeedback({
        type: "success",
        message: `Đang gọi số [${ticket.ticketCode}] - Bệnh nhân ${ticket.patientName} vào ${activeCounter?.counterName}!`
      });

      // Phát loa tự động
      speakCounterCall({
        ticketCode: ticket.ticketCode,
        patientName: ticket.patientName,
        counterName: activeCounter?.counterName,
        isPriority: ticket.isPriority
      });

      await fetchCounterQueue(selectedCounterId);
      await fetchCounters();
    } catch (err) {
      setFeedback({ type: "warning", message: err.response?.data?.message || err.message || "Không có số tiếp theo trong hàng đợi" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!currentCallingTicket || !selectedCounterId) return;
    try {
      setActionLoading(true);
      await axiosInstance.post(`/api/counters/${selectedCounterId}/tickets/${currentCallingTicket.ticketId}/complete`, {
        targetRoomId: selectedTargetRoomId ? parseInt(selectedTargetRoomId) : undefined
      });

      setFeedback({
        type: "success",
        message: `Đã tiếp nhận xong bệnh nhân [${currentCallingTicket.patientName}]!`
      });
      setCurrentCallingTicket(null);
      setOpenDispatchDialog(false);
      setSelectedTargetRoomId("");

      if (onPatientDispatched) {
        onPatientDispatched();
      }

      await fetchCounterQueue(selectedCounterId);
      await fetchCounters();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi hoàn tất tiếp nhận" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!currentCallingTicket || !selectedCounterId) return;
    try {
      setActionLoading(true);
      await axiosInstance.post(`/api/counters/${selectedCounterId}/tickets/${currentCallingTicket.ticketId}/skip`);
      setFeedback({
        type: "info",
        message: `Đã bỏ qua số [${currentCallingTicket.ticketCode}] do vắng mặt.`
      });
      setCurrentCallingTicket(null);
      await fetchCounterQueue(selectedCounterId);
      await fetchCounters();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi bỏ qua lượt" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 3,
        border: "1px solid #BAE6FD",
        bgcolor: "#F0F9FF",
        boxShadow: "0 4px 16px rgba(14, 165, 233, 0.08)"
      }}
    >
      {/* Tiêu đề Phân hệ Quầy Tiếp Đón */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={2}>
        <Box display="flex" alignItems="center" gap={1.2}>
          <MeetingRoomIcon sx={{ color: "#0284C7", fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight="900" color="#0369A1" sx={{ lineHeight: 1.2 }}>
              BÀN ĐIỀU PHỐI QUẦY TIẾP ĐÓN SẢNH (COUNTER CONTROL)
            </Typography>
            <Typography variant="caption" color="#0284C7" fontWeight="600">
              Định tuyến bệnh nhân từ Cây Kiosk, gọi số vào quầy làm thủ tục BHYT / Ưu tiên / Đặt hẹn
            </Typography>
          </Box>
        </Box>

        {/* Bộ chọn Quầy trực */}
        <Box display="flex" alignItems="center" gap={1}>
          <FormControl size="small" sx={{ minWidth: 260, bgcolor: "#fff", borderRadius: 2 }}>
            <Select
              value={selectedCounterId}
              onChange={(e) => setSelectedCounterId(e.target.value)}
              sx={{ fontWeight: 700, color: "#0369A1", borderRadius: 2 }}
            >
              {counters.map(c => (
                <MenuItem key={c.counterId} value={c.counterId}>
                  <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                    <span>{c.counterName}</span>
                    <Chip
                      label={c.status === "OPEN" ? "🟢 Đang mở" : (c.status === "BUSY" ? "🟡 Đang bận" : "🔴 Đóng")}
                      size="small"
                      sx={{ ml: 1, fontSize: "0.7rem", height: 20 }}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {activeCounter?.status === "CLOSED" ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<HowToRegIcon />}
              onClick={handleCheckIn}
              disabled={actionLoading}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              Mở Quầy Trực
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopCircleIcon />}
              onClick={handleClose}
              disabled={actionLoading}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              Đóng Quầy
            </Button>
          )}

          <IconButton onClick={() => { fetchCounters(); if (selectedCounterId) fetchCounterQueue(selectedCounterId); }} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {feedback.message && (
        <Alert severity={feedback.type || "info"} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setFeedback({ type: "", message: "" })}>
          {feedback.message}
        </Alert>
      )}

      {/* Grid Chi tiết Quầy đang chọn */}
      <Grid container spacing={2}>
        {/* Cột Trái: Bảng Điều Khiển Gọi Số & Bệnh Nhân Đang Phục Vụ */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 2.5, border: "1px solid #E0F2FE", bgcolor: "#fff", height: "100%" }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" fontWeight="800" color="#0369A1">
                  ĐANG PHỤC VỤ TẠI {activeCounter?.counterName?.toUpperCase()}
                </Typography>
                <Chip
                  label={`${activeCounter?.waitingCount || 0} bệnh nhân đang đợi`}
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
              </Box>

              {currentCallingTicket ? (
                <Box sx={{ p: 2, bgcolor: "#F0FDF4", borderRadius: 2, border: "2px solid #86EFAC", textAlign: "center", mb: 2 }}>
                  <Typography variant="caption" color="#166534" fontWeight="700">
                    SỐ THỨ TỰ ĐANG GỌI
                  </Typography>
                  <Typography variant="h3" fontWeight="900" color="#15803D" sx={{ my: 0.5 }}>
                    {currentCallingTicket.ticketCode}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="800" color="#1F2937">
                    {currentCallingTicket.patientName?.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="#4B5563" sx={{ mb: 1.5 }}>
                    SĐT: {currentCallingTicket.phoneNumber || "---"}
                  </Typography>

                  <Box display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => setOpenDispatchDialog(true)}
                      disabled={actionLoading}
                      sx={{ fontWeight: 800, borderRadius: 2 }}
                    >
                      Tiếp Nhận Xong & Chuyển Phòng
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<CancelIcon />}
                      onClick={handleSkip}
                      disabled={actionLoading}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                      Bỏ Qua (Vắng)
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 3, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px dashed #CBD5E1", textAlign: "center", mb: 2 }}>
                  <Typography variant="body2" color="#64748B" fontWeight="600">
                    Chưa có bệnh nhân nào tại bàn phục vụ
                  </Typography>
                </Box>
              )}

              {/* Nút Gọi Số Tiếp Theo To Rõ */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<PlayArrowIcon sx={{ fontSize: 28 }} />}
                onClick={handleCallNext}
                disabled={actionLoading || activeCounter?.status === "CLOSED" || counterQueue.filter(t => t.status === "WAITING").length === 0}
                sx={{
                  py: 1.8,
                  fontSize: "1.1rem",
                  fontWeight: 900,
                  bgcolor: "#0284C7",
                  "&:hover": { bgcolor: "#0369A1" },
                  borderRadius: 2.5,
                  boxShadow: "0 6px 20px rgba(2, 132, 199, 0.3)"
                }}
              >
                GỌI SỐ TIẾP THEO (CALL NEXT)
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Cột Phải: Danh sách hàng đợi của Quầy */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 2.5, border: "1px solid #E0F2FE", bgcolor: "#fff", height: "100%" }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight="800" color="#0F172A">
                  DANH SÁCH CHỜ TẠI QUẦY ({counterQueue.filter(t => t.status === "WAITING").length} người)
                </Typography>
                <Typography variant="caption" color="#64748B">
                  Tự động xếp theo thứ tự bốc số Kiosk
                </Typography>
              </Box>

              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "#F1F5F9" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Số Phiếu</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Bệnh Nhân</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Phân Loại</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Trạng Thái</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Đợi Trước</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {counterQueue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: "#94A3B8" }}>
                          Hiện không có bệnh nhân nào trong hàng đợi của quầy này
                        </TableCell>
                      </TableRow>
                    ) : (
                      counterQueue.map((ticket) => (
                        <TableRow
                          key={ticket.ticketId}
                          sx={{
                            bgcolor: ticket.status === "CALLING" ? "#DCFCE7" : "inherit"
                          }}
                        >
                          <TableCell sx={{ fontWeight: 900, color: ticket.isPriority ? "#DC2626" : "#0284C7" }}>
                            {ticket.ticketCode}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {ticket.patientName}
                          </TableCell>
                          <TableCell>
                            {ticket.isPriority ? (
                              <Chip label="Ưu tiên" color="error" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
                            ) : (ticket.hasInsurance ? (
                              <Chip label="BHYT" color="primary" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
                            ) : (
                              <Chip label="Thường" variant="outlined" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
                            ))}
                          </TableCell>
                          <TableCell>
                            {ticket.status === "WAITING" && <Chip label="Đang chờ" size="small" color="warning" sx={{ height: 20, fontSize: "0.65rem" }} />}
                            {ticket.status === "CALLING" && <Chip label="Đang gọi" size="small" color="success" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />}
                            {ticket.status === "SERVED" && <Chip label="Đã xong" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />}
                            {ticket.status === "SKIPPED" && <Chip label="Bỏ qua" size="small" color="default" sx={{ height: 20, fontSize: "0.65rem" }} />}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600, color: "#64748B" }}>
                            {ticket.waitingBefore} người
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog Hoàn Tất & Chuyển Phòng Khám */}
      <Dialog open={openDispatchDialog} onClose={() => setOpenDispatchDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: "#0369A1" }}>
          Hoàn Tất Tiếp Nhận & Phân Phòng Khám
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Bệnh nhân: <b>{currentCallingTicket?.patientName}</b> (Số: <b>{currentCallingTicket?.ticketCode}</b>) đã hoàn tất thủ tục hành chính.
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Chuyển vào Buồng Khám Bác Sĩ (Tùy chọn):
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Chọn Phòng Khám</InputLabel>
            <Select
              value={selectedTargetRoomId}
              label="Chọn Phòng Khám"
              onChange={(e) => setSelectedTargetRoomId(e.target.value)}
            >
              <MenuItem value="">-- Tự động theo phân luồng chuyên khoa --</MenuItem>
              <MenuItem value="101">Phòng 101 - Khoa Nội Tổng Quát</MenuItem>
              <MenuItem value="102">Phòng 102 - Khoa Nội Tổng Quát</MenuItem>
              <MenuItem value="201">Phòng 201 - Khoa Tim Mạch</MenuItem>
              <MenuItem value="301">Phòng 301 - Khoa Nhi</MenuItem>
              <MenuItem value="401">Phòng 401 - Khoa Răng Hàm Mặt</MenuItem>
              <MenuItem value="501">Phòng 501 - Khoa Tai Mũi Họng</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDispatchDialog(false)}>Hủy</Button>
          <Button variant="contained" color="success" onClick={handleComplete} disabled={actionLoading} sx={{ fontWeight: 800 }}>
            Xác Nhận & Đưa Vào Hàng Đợi Bác Sĩ
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
