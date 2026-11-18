import React, { useState, useEffect, useMemo } from "react";
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
  IconButton,
  TextField,
  Tabs,
  Tab,
  Divider,
  InputAdornment,
  RadioGroup,
  FormControlLabel,
  Radio
} from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ScienceIcon from "@mui/icons-material/Science";
import StarsIcon from "@mui/icons-material/Stars";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import PhoneIcon from "@mui/icons-material/Phone";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PrintIcon from "@mui/icons-material/Print";
import SearchIcon from "@mui/icons-material/Search";
import PaymentsIcon from "@mui/icons-material/Payments";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import SyncIcon from "@mui/icons-material/Sync";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { QRCodeSVG } from "qrcode.react";

import axiosInstance from "../../services/AxiosInstance";
import { playChime, speakCounterCall, speakCashierCall, speakPatientCall, getVietnameseVoice } from "../../services/voiceService";
import { printReceipt } from "../../utils/printHelper";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function CounterManagementPanel({ onPatientDispatched, onOpenPayModal, refreshTrigger, rooms = [], queueList = [], callPatientTrigger = null, onClearCallTrigger = null }) {
  const [counters, setCounters] = useState([]);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [selectedCounterId, setSelectedCounterId] = useState("");
  const [counterQueue, setCounterQueue] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Khởi tạo vé đang phục vụ từ sessionStorage để chống mất trạng thái khi chuyển Tab/re-render/reload
  const [currentCallingTicket, setCurrentCallingTicket] = useState(() => {
    try {
      const saved = sessionStorage.getItem("tnt_active_counter_ticket");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Helper cập nhật vé đang phục vụ đồng bộ cả React state và sessionStorage
  const updateCurrentCallingTicket = (ticket) => {
    setCurrentCallingTicket(ticket);
    try {
      if (ticket) {
        sessionStorage.setItem("tnt_active_counter_ticket", JSON.stringify(ticket));
      } else {
        sessionStorage.removeItem("tnt_active_counter_ticket");
      }
    } catch (e) {
      console.warn("Lỗi lưu sessionStorage:", e);
    }
  };

  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Bộ lọc Tab hàng đợi: 0: Tất cả, 1: Vé khám chưa đóng tiền, 2: Thu tiền xét nghiệm CLS, 3: Đối tượng ưu tiên
  const [queueTab, setQueueTab] = useState(0);
  const [searchFilter, setSearchFilter] = useState("");

  // PayOS State & Quản Lý Sao Chép
  const [payosData, setPayosData] = useState(null);
  const [payosLoading, setPayosLoading] = useState(false);
  const [payosSyncing, setPayosSyncing] = useState(false);
  const [payosVerified, setPayosVerified] = useState(false);
  const [dispatchRetryNeeded, setDispatchRetryNeeded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Quick Payment & Auto-Dispatch Modal
  const [openQuickPayModal, setOpenQuickPayModal] = useState(false);
  const [payTargetTicket, setPayTargetTicket] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountGiven, setAmountGiven] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [selectedTargetRoomId, setSelectedTargetRoomId] = useState("");
  const [dispatchMode, setDispatchMode] = useState("AUTO"); // "AUTO" (ít người nhất) hoặc "MANUAL" (chỉ định bác sĩ)
  const [payingAndDispatching, setPayingAndDispatching] = useState(false);
  const [modalAlert, setModalAlert] = useState({ type: "", message: "" });

  // Modal Biên lai A5 xem trước & In ấn
  const [openReceiptModal, setOpenReceiptModal] = useState(false);
  const [recentReceipt, setRecentReceipt] = useState(null);

  // Kiểm tra buồng khám lâm sàng ngoại trú hợp lệ (loại bỏ phòng CLS/X-Quang/Xét nghiệm, buồng nội trú và phòng test tự động)
  const isClinicalConsultationRoom = (r) => {
    if (!r) return false;
    const name = String(r.roomName || "").trim();
    const type = String(r.roomType || "").trim();
    if (!name) return false;
    if (/^\d+$/.test(name)) return false;
    if (/^p-(test|audit|load|mod)/i.test(name) || /phòng test/i.test(name)) return false;
    if (/x-quang|siêu âm|xét nghiệm|huyết học|nội soi|cận lâm sàng|chẩn đoán hình ảnh|\bct\b|\bmri\b|lấy mẫu|nhà thuốc|dược|thu ngân|quầy/i.test(name)) return false;
    if (/nội trú|buồng bệnh|giường bệnh|\bicu\b|hồi sức|cấp cứu lưu/i.test(name)) return false;
    if (/LAB|IMAGING|PARACLINICAL|INPATIENT|WARD|PHARMACY|CASHIER/i.test(type)) return false;
    return true;
  };

  // Tính toán danh sách buồng khám và số lượng bệnh nhân đang chờ thực tế (Smart Load Balancing)
  const standardClinicRooms = useMemo(() => {
    const filteredInput = Array.isArray(rooms) ? rooms.filter(isClinicalConsultationRoom) : [];
    return filteredInput.map(r => {
      const waitCount = (queueList || []).filter(q =>
        (String(q.roomId) === String(r.roomId) || q.roomName === r.roomName) && q.status === "WAITING"
      ).length;
      return {
        ...r,
        roomId: String(r.roomId),
        roomName: r.roomName || `Phòng ${r.roomId}`,
        departmentName: r.departmentName || "Khoa Khám Bệnh",
        doctorName: r.doctorName || "BS. Phụ trách",
        waitingCount: waitCount
      };
    });
  }, [rooms, queueList]);

  // Lọc buồng khám theo đúng chuyên khoa bệnh nhân đã đăng ký khám (chống điều phối sai khoa)
  const eligibleRoomsForTicket = useMemo(() => {
    const activeTicket = payTargetTicket || currentCallingTicket;
    if (!activeTicket) return standardClinicRooms;
    const targetDept = (activeTicket.departmentName || "").trim().toLowerCase();
    const targetDeptId = activeTicket.departmentId ? String(activeTicket.departmentId) : null;
    if (!targetDept && !targetDeptId) {
      return [];
    }
    const filtered = standardClinicRooms.filter(r => {
      if (targetDeptId && String(r.departmentId) === targetDeptId) return true;
      if (targetDept && r.departmentName && (r.departmentName.toLowerCase().includes(targetDept) || targetDept.includes(r.departmentName.toLowerCase()))) return true;
      return false;
    });
    return filtered;
  }, [payTargetTicket, currentCallingTicket, standardClinicRooms]);

  // Tìm buồng khám có ít người chờ nhất trong đúng chuyên khoa của bệnh nhân
  const leastLoadedRoom = useMemo(() => {
    const pool = (eligibleRoomsForTicket && eligibleRoomsForTicket.length > 0) ? eligibleRoomsForTicket : null;
    if (!pool || pool.length === 0) return null;
    const activeTicket = payTargetTicket || currentCallingTicket;
    const minWait = Math.min(...pool.map(r => r.waitingCount));
    if (activeTicket) {
      const scheduledMatch = pool.find(r =>
        r.waitingCount === minWait &&
        ((activeTicket.dispatchedRoomId && String(r.roomId) === String(activeTicket.dispatchedRoomId)) ||
         (activeTicket.roomName && r.roomName === activeTicket.roomName))
      );
      if (scheduledMatch) return scheduledMatch;
    }
    return pool.reduce((prev, curr) => (curr.waitingCount < prev.waitingCount ? curr : prev));
  }, [eligibleRoomsForTicket, payTargetTicket, currentCallingTicket]);

  // Helper hiển thị nguồn tiếp nhận (Đặt hẹn Online, Kiosk, Vãng lai tại quầy)
  const renderReceptionSourceBadge = (ticket) => {
    if (!ticket) return null;
    const src = ticket.receptionSource || (
      ticket.ticketType === "KIOSK" || (ticket.ticketCode && ticket.ticketCode.startsWith("KS"))
        ? "KIOSK_TICKET"
        : (ticket.bookingCode ? "ONLINE_APPOINTMENT" : "COUNTER_WALKIN")
    );
    switch (src) {
      case "ONLINE_APPOINTMENT":
        return (
          <Chip
            label="Đặt hẹn Online"
            size="small"
            sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#EEF2FF", color: "#4338CA", border: "1px solid #C7D2FE" }}
          />
        );
      case "KIOSK_TICKET":
        return (
          <Chip
            label="Lấy số Ki-ốt"
            size="small"
            sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0" }}
          />
        );
      case "COUNTER_WALKIN":
        return (
          <Chip
            label="Vãng lai tại quầy"
            size="small"
            sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A" }}
          />
        );
      default:
        return null;
    }
  };

  const activeCounter = counters.find(c => c.counterId === selectedCounterId);

  useEffect(() => {
    fetchCounters();
    fetchPendingBills();
  }, []);

  useEffect(() => {
    if (selectedCounterId) {
      fetchCounterQueue(selectedCounterId);
    }
    fetchCounters();
    fetchPendingBills();
  }, [refreshTrigger]);

  useEffect(() => {
    if (selectedCounterId) {
      fetchCounterQueue(selectedCounterId);
      const interval = setInterval(() => {
        fetchCounterQueue(selectedCounterId);
        fetchPendingBills();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedCounterId]);

  // Tải danh mục 6 quầy chuyên môn hóa
  const fetchCounters = async () => {
    try {
      setLoadingCounters(true);
      const res = await axiosInstance.get("/api/counters");
      const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      
      const enhancedList = (list && list.length > 0) ? list.map(c => {
        let name = c.counterName;
        if (c.counterCode === "CTR-01" && !name.includes("Thu Tiền Khám")) name = "Quầy 1 - Tiếp đón Thường & Thu Tiền Khám";
        if (c.counterCode === "CTR-02" && !name.includes("Xét Nghiệm")) name = "Quầy 2 - Thu Tiền Xét Nghiệm (CLS)";
        if (c.counterCode === "CTR-03" && !name.includes("Thu Phí")) name = "Quầy 3 - Tiếp nhận BHYT & Thu Phí";
        if (c.counterCode === "CTR-04" && !name.includes("Thu Tiền")) name = "Quầy 4 - Tiếp đón & Thu Tiền Ưu Tiên";
        if (c.counterCode === "CTR-05" && !name.includes("Đặt hẹn")) name = "Quầy 5 - Tiếp nhận Đặt hẹn Online";
        if (c.counterCode === "CTR-06" && !name.includes("Nội Trú")) name = "Quầy 6 - Thu Tiền Nội Trú";
        return { ...c, counterName: name };
      }) : [
        { counterId: 1, counterCode: "CTR-01", counterName: "Quầy 1 - Tiếp đón Thường & Thu Tiền Khám", counterType: "GENERAL", status: "OPEN" },
        { counterId: 2, counterCode: "CTR-02", counterName: "Quầy 2 - Thu Tiền Xét Nghiệm (CLS)", counterType: "GENERAL", status: "OPEN" },
        { counterId: 3, counterCode: "CTR-03", counterName: "Quầy 3 - Tiếp nhận BHYT & Thu Phí", counterType: "INSURANCE", status: "OPEN" },
        { counterId: 4, counterCode: "CTR-04", counterName: "Quầy 4 - Tiếp đón & Thu Tiền Ưu Tiên", counterType: "PRIORITY", status: "OPEN" },
        { counterId: 5, counterCode: "CTR-05", counterName: "Quầy 5 - Tiếp nhận Đặt hẹn Online", counterType: "APPOINTMENT", status: "OPEN" },
        { counterId: 6, counterCode: "CTR-06", counterName: "Quầy 6 - Thu Tiền Nội Trú", counterType: "INPATIENT", status: "OPEN" }
      ];
      setCounters(enhancedList);
      if (enhancedList.length > 0 && !selectedCounterId) {
        setSelectedCounterId(enhancedList[0].counterId);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách quầy:", err);
    } finally {
      setLoadingCounters(false);
    }
  };

  // Khi chọn Quầy từ Dropdown: Tự động chuyển Tab hàng đợi tương ứng với quầy đó
  const handleSelectCounter = (cId) => {
    setSelectedCounterId(cId);
    const target = counters.find(c => c.counterId === cId);
    if (target) {
      if (target.counterCode === "CTR-04" || target.counterType === "PRIORITY" || target.counterName.includes("Ưu tiên")) {
        setQueueTab(3); // Tự động chọn Tab Đối tượng ưu tiên
      } else if (target.counterCode === "CTR-02" || target.counterName.includes("Xét Nghiệm")) {
        setQueueTab(2); // Tự động chọn Tab Thu Phí Xét Nghiệm CLS
      } else if (target.counterCode === "CTR-01") {
        setQueueTab(1); // Tự động chọn Tab Chờ thu tiền khám
      } else {
        setQueueTab(0); // Tất cả hàng đợi
      }
    }
  };

  const fetchCounterQueue = async (cId) => {
    try {
      setLoadingQueue(true);
      const res = await axiosInstance.get(`/api/counters/${cId}/queue`);
      const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      setCounterQueue(list);

      // Cập nhật vé đang gọi tại quầy nếu có vé CALLING từ backend
      const calling = list.find(t => t.status === "CALLING");
      if (calling) {
        setCurrentCallingTicket(prev => {
          if (prev) {
            if (String(prev.ticketId) === String(calling.ticketId) || prev.bookingCode === calling.bookingCode) {
              const updated = { ...prev, ...calling };
              try { sessionStorage.setItem("tnt_active_counter_ticket", JSON.stringify(updated)); } catch (_) {}
              return updated;
            }
            return prev;
          }
          try { sessionStorage.setItem("tnt_active_counter_ticket", JSON.stringify(calling)); } catch (_) {}
          return calling;
        });
      }
      // TUYỆT ĐỐI KHÔNG xóa vé đang phục vụ trên bàn của điều dưỡng khi polling backend!
      // Vé chỉ được đóng/xóa khi điều dưỡng nhấn Thu tiền, Chuyển khám, Bỏ qua hoặc Đóng quầy.
    } catch (err) {
      console.error("Lỗi tải hàng đợi quầy:", err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const fetchPendingBills = async () => {
    try {
      const res = await axiosInstance.get("/api/cashier/pending-bills").catch(() => ({ data: [] }));
      const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      setPendingBills(list);
    } catch (err) {
      console.error("Lỗi tải các khoản chờ thu:", err);
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
      updateCurrentCallingTicket(null);
      await fetchCounters();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi đóng quầy" });
    } finally {
      setActionLoading(false);
    }
  };

  // Hàm phát chuông Ding-Dong & đọc loa giọng nói tiếng Việt chuyên trách cho từng quầy
  const announceCounterCall = async (ticket, counter) => {
    if (!ticket) return;
    const cName = counter?.counterName || "Quầy tiếp đón";
    const cCode = counter?.counterCode || "";
    const priorityPrefix = ticket.isPriority ? "ưu tiên " : "";
    const ticketIdPhrase = ticket.ticketCode
      ? `số thứ tự ${ticket.ticketCode}`
      : (ticket.bookingCode ? `mã đặt hẹn ${ticket.bookingCode}` : "");
    const callTargetPhrase = ticketIdPhrase
      ? `Xin mời bệnh nhân ${priorityPrefix}${ticket.patientName}, ${ticketIdPhrase}`
      : `Xin mời bệnh nhân ${priorityPrefix}${ticket.patientName}`;
    
    // Tạo câu thoại chuyên trách theo từng loại quầy nghiệp vụ
    let sentence = `${callTargetPhrase}, đến ${cName} để làm thủ tục.`;
    if (cCode === "CTR-01" || cName.includes("Thu Tiền Khám")) {
      sentence = `${callTargetPhrase}, đến Quầy 1 Tiếp đón Thường, để nộp tiền khám và làm thủ tục.`;
    } else if (cCode === "CTR-02" || cName.includes("Xét Nghiệm")) {
      sentence = `${callTargetPhrase}, đến Quầy 2 Thu Tiền Xét Nghiệm, để nộp chi phí xét nghiệm cận lâm sàng.`;
    } else if (cCode === "CTR-03" || cName.includes("BHYT")) {
      sentence = `${callTargetPhrase}, đến Quầy 3 Tiếp nhận Bảo hiểm y tế, để làm thủ tục và kiểm tra thẻ.`;
    } else if (cCode === "CTR-04" || cName.includes("Ưu Tiên")) {
      sentence = `${callTargetPhrase}, đến Quầy 4 Tiếp đón Ưu Tiên, để làm thủ tục tiếp đón và thanh toán.`;
    } else if (cCode === "CTR-05" || cName.includes("Đặt hẹn")) {
      sentence = `${callTargetPhrase}, đến Quầy 5 Tiếp nhận Đặt hẹn, để làm thủ tục check-in.`;
    } else if (cCode === "CTR-06" || cName.includes("Nội Trú")) {
      sentence = `${callTargetPhrase}, đến Quầy 6 Thu Tiền Nội Trú, để làm thủ tục thanh toán viện phí.`;
    }

    try {
      await playChime();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
        setTimeout(() => {
          try {
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.lang = "vi-VN";
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            const viVoice = getVietnameseVoice();
            if (viVoice) utterance.voice = viVoice;
            utterance.onerror = (e) => console.warn("TTS error:", e);
            window.speechSynthesis.speak(utterance);
          } catch (speakErr) {
            console.warn("Speech speak error:", speakErr);
          }
        }, 70);
      } else {
        await speakCashierCall({
          ticketCode: ticket.ticketCode || null,
          patientName: ticket.patientName,
          counterName: cName,
          isPriority: ticket.isPriority
        });
      }
    } catch (e) {
      console.warn("Lỗi phát loa tiếp đón quầy:", e);
    }
  };

  const handleCopy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSyncPayOS = async () => {
    if (!payosData?.orderCode) {
      setFeedback({ type: "warning", message: "Chưa có thông tin đơn hàng PayOS để đồng bộ." });
      return;
    }
    setPayosSyncing(true);
    try {
      const res = await axiosInstance.post(`/api/payment/payos/sync/${payosData.orderCode}`);
      const data = res?.data?.data || res?.data;
      if (data?.status === "SUCCESS" || data?.status === "PAID") {
        setPayosVerified(true);
        setModalAlert({
          type: "success",
          message: `PayOS: Đơn hàng #${payosData.orderCode} đã xác nhận thanh toán thành công! Sẵn sàng điều phối buồng khám.`
        });
        setFeedback({
          type: "success",
          message: `PayOS: Đơn hàng #${payosData.orderCode} đã xác nhận thanh toán thành công!`
        });
      } else {
        setPayosVerified(false);
        setModalAlert({
          type: "warning",
          message: `PayOS: Đơn hàng #${payosData.orderCode} đang chờ thanh toán (Trạng thái: ${data?.status || 'PENDING'}).`
        });
        setFeedback({
          type: "info",
          message: `PayOS: Đơn hàng #${payosData.orderCode} đang chờ thanh toán (Trạng thái: ${data?.status || 'PENDING'}).`
        });
      }
    } catch (e) {
      console.warn("Lỗi đồng bộ PayOS:", e);
      setModalAlert({
        type: "error",
        message: e?.response?.data?.message || e?.message || "Lỗi đồng bộ trạng thái từ PayOS."
      });
      setFeedback({
        type: "error",
        message: e?.response?.data?.message || e?.message || "Lỗi đồng bộ trạng thái từ PayOS."
      });
    } finally {
      setPayosSyncing(false);
    }
  };

  const loadPayOSQR = async (ticket, totalDue) => {
    if (!ticket || totalDue <= 0) return;
    setPayosLoading(true);
    try {
      const bookingCode = ticket.bookingCode || ticket.ticketCode;
      const res = await axiosInstance.post("/api/payment/payos/create-link", {
        amount: totalDue,
        type: "PAY_BOOKING",
        description: `VP ${ticket.ticketCode || ""} ${ticket.bookingCode || "TNT"}`.trim()
      });
      const data = res?.data?.data || res?.data;
      if (data) {
        setPayosData({
          orderCode: data.orderCode,
          txnRef: data.txnRef,
          bankName: data.bankName,
          accountNumber: data.bankAccount,
          accountName: data.accountHolder,
          bin: data.bankBin || "970422",
          amount: data.amount,
          transferContent: data.providerRef || data.description,
          qrUrl: data.qrImageUrl || data.qrCode
        });
      }
    } catch (err) {
      console.warn("Lỗi tạo mã PayOS VietQR:", err);
      setPayosData(null);
    } finally {
      setPayosLoading(false);
    }
  };

  // Gọi đích danh một bệnh nhân vào quầy nộp tiền (kèm phát chuông & đọc loa giọng nói)
  const handleCallSpecificTicket = async (ticket) => {
    if (!ticket) return;
    const calling = {
      ...ticket,
      status: "CALLING",
      ticketCode: ticket.ticketCode || null,
      bookingQueueCode: ticket.bookingQueueCode || ticket.queueCode || null
    };
    updateCurrentCallingTicket(calling);
    const identifier = calling.ticketCode 
      ? `[${calling.ticketCode}]`
      : (calling.bookingCode ? `[Hẹn: ${calling.bookingCode}]` : "");
    setFeedback({
      type: "success",
      message: `🔔 Đang phát loa gọi bệnh nhân [${ticket.patientName}] ${identifier ? `${identifier} ` : ""}vào ${activeCounter?.counterName || "Quầy Tiếp Đón"} để nộp viện phí!`
    });
    await announceCounterCall(calling, activeCounter);
  };

  // Lắng nghe khi điều dưỡng bấm gọi từ danh sách tiếp đón bên dưới
  useEffect(() => {
    if (callPatientTrigger) {
      handleCallSpecificTicket(callPatientTrigger);
      if (callPatientTrigger.openPayNow) {
        handleOpenQuickPay(callPatientTrigger);
      }
      if (typeof onClearCallTrigger === "function") {
        onClearCallTrigger();
      }
    }
  }, [callPatientTrigger]);

  // Gọi số tiếp theo (Tự động ưu tiên bệnh nhân ưu tiên trước)
  const handleCallNext = async () => {
    if (!selectedCounterId) return;
    try {
      setActionLoading(true);

      // Nếu quầy đang đóng, tự động kích hoạt mở quầy để phục vụ
      if (activeCounter?.status === "CLOSED") {
        await axiosInstance.post(`/api/counters/${selectedCounterId}/check-in`).catch(() => null);
        await fetchCounters();
      }

      let ticket = null;

      // 1. Thử gọi qua API backend cho các vé bốc tại quầy
      try {
        const res = await axiosInstance.post(`/api/counters/${selectedCounterId}/call-next`);
        ticket = res?.data?.data || res?.data;
      } catch (backendErr) {
        // 2. Nếu quầy chưa có vé bốc riêng, tự động lấy bệnh nhân đang chờ nộp viện phí tiếp theo
        const nextInWaiting = filteredWaitingQueue[0] || mergedQueue.find(t => t.status === "WAITING");
        if (nextInWaiting) {
          ticket = { ...nextInWaiting, status: "CALLING" };
        } else {
          throw backendErr;
        }
      }

      if (ticket) {
        const calling = {
          ...ticket,
          status: "CALLING",
          ticketCode: ticket.ticketCode || null,
          bookingQueueCode: ticket.bookingQueueCode || ticket.queueCode || null
        };
        updateCurrentCallingTicket(calling);
        const identifier = calling.ticketCode 
          ? `[${calling.ticketCode}]`
          : (calling.bookingCode ? `[Hẹn: ${calling.bookingCode}]` : "");
        setFeedback({
          type: "success",
          message: `🔔 Đang phát loa gọi ${calling.isPriority ? "Bệnh nhân ƯU TIÊN" : "Bệnh nhân"} [${calling.patientName}] ${identifier ? `${identifier} ` : ""}vào ${activeCounter?.counterName} để nộp tiền và làm thủ tục!`
        });

        // Phát chuông ding dong và đọc loa giọng nói chuyên trách
        await announceCounterCall(calling, activeCounter);
      }

      await fetchCounterQueue(selectedCounterId);
      await fetchCounters();
    } catch (err) {
      setFeedback({ type: "warning", message: err.response?.data?.message || err.message || "Không có số tiếp theo trong hàng đợi" });
    } finally {
      setActionLoading(false);
    }
  };

  // Phát loa gọi lại số đang phục vụ
  const handleRecallCurrent = () => {
    if (!currentCallingTicket) return;
    announceCounterCall(currentCallingTicket, activeCounter);
    const identifier = currentCallingTicket.ticketCode || currentCallingTicket.bookingCode || "chưa có mã";
    setFeedback({
      type: "info",
      message: `Đã phát loa gọi lại số ${identifier} - ${currentCallingTicket.patientName}.`
    });
  };

  // Bỏ qua số vắng mặt
  const handleSkip = async () => {
    if (!currentCallingTicket || !selectedCounterId) return;
    try {
      setActionLoading(true);
      const isNumeric = currentCallingTicket.ticketId != null && /^\d+$/.test(String(currentCallingTicket.ticketId));
      if (isNumeric) {
        await axiosInstance.post(`/api/counters/${selectedCounterId}/tickets/${currentCallingTicket.ticketId}/skip`).catch(() => null);
      }
      const identifier = currentCallingTicket.ticketCode || currentCallingTicket.bookingCode || "chưa có mã";
      setFeedback({
        type: "info",
        message: `Đã bỏ qua lượt [${identifier}] do vắng mặt.`
      });
      updateCurrentCallingTicket(null);
      await fetchCounterQueue(selectedCounterId);
      await fetchCounters();
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi khi bỏ qua lượt" });
    } finally {
      setActionLoading(false);
    }
  };

  // Tìm hóa đơn / xét nghiệm chờ thu ứng với vé
  const getTicketPendingBill = (ticket) => getTicketPendingBillPure(ticket, pendingBills);

  // Kiểm tra vé có phải là hóa đơn thu phí CLS / Đơn thuốc (đã đóng tiền khám ban đầu)
  const isClsOrTreatmentTicket = (ticket) => isClsOrTreatmentTicketPure(ticket, pendingBills);

  // Tính tổng số tiền cần thanh toán cho vé đang gọi
  const calculateTicketDue = (ticket) => calculateTicketDuePure(ticket, { pendingBills, queueList });

  // Mở modal thu tiền nhanh & tự động dispatch vào buồng bác sĩ
  const handleOpenQuickPay = (ticket) => {
    const t = ticket || currentCallingTicket;
    if (!t) return;
    setModalAlert({ type: "", message: "" });
    setPayTargetTicket(t);
    const { totalDue } = calculateTicketDue(t);
    setPaymentMethod("CASH");
    setAmountGiven(totalDue > 0 ? totalDue.toString() : "0");
    setPaymentNotes("");
    setPayosVerified(false);
    setDispatchRetryNeeded(Boolean(t.isPaid));

    // Mặc định chọn cân bằng tải tự động (buồng ít người nhất)
    setDispatchMode("AUTO");
    const bestRoom = leastLoadedRoom || (eligibleRoomsForTicket && eligibleRoomsForTicket.length > 0 ? eligibleRoomsForTicket[0] : null);
    setSelectedTargetRoomId(t.dispatchedRoomId ? t.dispatchedRoomId.toString() : (bestRoom ? bestRoom.roomId.toString() : ""));

    // Reset dữ liệu PayOS
    setPayosData(null);
    setOpenQuickPayModal(true);
  };

  // Xác nhận thu tiền viện phí & TỰ ĐỘNG ĐƯA BỆNH NHÂN VÀO HÀNG ĐỢI BÁC SĨ
  const handleConfirmPayAndAutoDispatch = async () => {
    const ticket = payTargetTicket || currentCallingTicket;
    if (!ticket) {
      setModalAlert({ type: "error", message: "Không tìm thấy thông tin lượt khám cần thu viện phí!" });
      return;
    }

    // Chốt chặn thanh toán PayOS VietQR
    if (paymentMethod === "VIETQR" && !payosVerified && !ticket.isPaid && !dispatchRetryNeeded) {
      setModalAlert({
        type: "warning",
        message: "Giao dịch PayOS VietQR chưa được xác nhận thanh toán. Vui lòng bấm [Kiểm Tra Trạng Thái PayOS] để xác thực hoặc chuyển sang 'Tiền mặt' nếu bệnh nhân nộp trực tiếp tại quầy!"
      });
      return;
    }

    const effectiveCounterId = ticket.counterId || selectedCounterId || (counters && counters.length > 0 ? counters[0].counterId : 1);
    if (!selectedCounterId && effectiveCounterId) {
      setSelectedCounterId(effectiveCounterId);
    }

    setModalAlert({ type: "", message: "" });
    setPayingAndDispatching(true);
    try {
      const isAlreadyPaid = Boolean(ticket.isPaid || dispatchRetryNeeded);
      const result = await executePayAndDispatch({
        ticket,
        effectiveCounterId,
        paymentMethod,
        amountGiven,
        paymentNotes,
        dispatchMode,
        selectedTargetRoomId,
        candidateRooms: eligibleRoomsForTicket || [],
        leastLoadedRoom,
        isAlreadyPaid,
        queueList,
        pendingBills,
        axiosClient: axiosInstance
      });

      if (!result.success) {
        if (result.dispatchRetryNeeded) {
          ticket.isPaid = true;
          setDispatchRetryNeeded(true);
          setModalAlert({ type: "error", message: result.error });
          setFeedback({ type: "error", message: result.error });
          await fetchCounterQueue(effectiveCounterId);
          await fetchPendingBills();
          if (onPatientDispatched) onPatientDispatched();
          return;
        } else {
          setModalAlert({ type: "error", message: result.error });
          setFeedback({ type: "error", message: result.error });
          return;
        }
      }

      setDispatchRetryNeeded(false);
      setPayosVerified(false);

      // 4. Phát loa tự động mời bệnh nhân đến phòng khám Bác sĩ
      try {
        speakPatientCall({
          queueCode: ticket.bookingQueueCode || ticket.queueCode || null,
          queueNumber: ticket.bookingQueueNumber || ticket.queueNumber || null,
          patientName: ticket.patientName,
          roomName: result.targetRoomName,
          departmentName: result.targetRoom?.departmentName || ticket.departmentName || null,
          doctorName: result.targetDoctor,
          isPriority: ticket.isPriority,
          isReturnAfterResult: false
        });
      } catch (voiceErr) {
        console.warn("Lỗi phát loa gọi buồng:", voiceErr);
      }

      // 5. Chuẩn bị dữ liệu biên lai A5 để in ấn
      let receiptData = result.receiptData;
      if (!receiptData) {
        receiptData = {
          receiptCode: `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${ticket.ticketCode || ticket.bookingCode || "QUAY"}`,
          patientName: ticket.patientName,
          phoneNumber: ticket.phoneNumber,
          paidAmount: result.totalDue,
          totalAmount: result.totalDue,
          paymentMethod: paymentMethod || "CASH",
          departmentName: result.targetRoom?.departmentName || ticket.departmentName || "Khoa Khám Bệnh",
          doctorName: result.targetDoctor,
          paidAt: new Date().toLocaleTimeString("vi-VN") + " " + formatDate(new Date()),
          items: result.testItems.length > 0
            ? [
                ...(result.consultationFee > 0 ? [{ itemName: "Công khám lâm sàng chuyên khoa", quantity: 1, totalPrice: result.consultationFee }] : []),
                ...result.testItems
              ]
            : [{ itemName: "Công khám lâm sàng chuyên khoa", quantity: 1, totalPrice: result.consultationFee }]
        };
      }
      setRecentReceipt(receiptData);

      setFeedback({
        type: "success",
        message: result.isClsOnly
          ? `✅ Thu phí Cận lâm sàng / Xét nghiệm thành công cho bệnh nhân [${ticket.patientName}]!`
          : `✅ Thu viện phí thành công! Bệnh nhân [${ticket.patientName}] đã được TỰ ĐỘNG ĐIỀU PHỐI vào hàng đợi [${result.targetRoomName || "Phòng khám"} - ${result.targetDoctor || "BS"}].`
      });

      setOpenQuickPayModal(false);
      setOpenReceiptModal(true);
      updateCurrentCallingTicket(null);

      // Kích hoạt đồng bộ lại hàng đợi toàn viện
      if (onPatientDispatched) {
        onPatientDispatched();
      }
      await fetchCounterQueue(effectiveCounterId);
      await fetchPendingBills();
      await fetchCounters();
    } catch (err) {
      console.error("Lỗi thu tiền và chuyển phòng khám:", err);
      const errMsg = err.response?.data?.message || err.message || "Thu tiền hoặc chuyển hàng đợi bác sĩ thất bại";
      setModalAlert({ type: "error", message: errMsg });
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setPayingAndDispatching(false);
    }
  };

  // Xác nhận trực tiếp đưa vào hàng đợi Bác sĩ nếu đã thanh toán trước
  const handleDirectDispatchToDoctor = async (ticket) => {
    const t = ticket || currentCallingTicket;
    if (!t || !selectedCounterId) return;

    setActionLoading(true);
    try {
      const isNumeric = t.ticketId != null && /^\d+$/.test(String(t.ticketId));
      if (isNumeric) {
        await axiosInstance.post(`/api/counters/${selectedCounterId}/tickets/${t.ticketId}/complete`, {
          targetRoomId: t.dispatchedRoomId || undefined
        });
      } else {
        await axiosInstance.post(`/api/nurse/reception/dispatch`, {
          bookingId: t.bookingId || (t.ticketId && String(t.ticketId).length === 36 ? t.ticketId : undefined),
          bookingCode: t.bookingCode,
          targetRoomId: t.dispatchedRoomId || undefined,
          roomId: t.dispatchedRoomId || undefined
        });
      }

      const destRoom = t.roomName || "Phòng Khám Bác Sĩ";
      speakPatientCall({
        queueCode: t.bookingQueueCode || t.queueCode || null,
        queueNumber: t.bookingQueueNumber || t.queueNumber || null,
        patientName: t.patientName,
        roomName: destRoom,
        departmentName: t.departmentName || null,
        isPriority: t.isPriority,
        isReturnAfterResult: false
      });

      setFeedback({
        type: "success",
        message: `✅ Đã chuyển bệnh nhân [${t.patientName}] vào hàng đợi Bác sĩ (${destRoom})!`
      });

      updateCurrentCallingTicket(null);
      if (onPatientDispatched) onPatientDispatched();
      await fetchCounterQueue(selectedCounterId);
      await fetchCounters();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Lỗi chuyển hàng đợi bác sĩ"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Hợp nhất toàn diện các nguồn hàng đợi: Vé bốc tại quầy (counterQueue) + Bệnh nhân tiếp đón chưa thu tiền (queueList) + Hóa đơn xét nghiệm chờ thu (pendingBills)
  const mergedQueue = useMemo(() => {
    const list = [...counterQueue];
    const activeCounterBookingCodes = new Set(
      counterQueue
        .filter(t => t.status === "WAITING" || t.status === "CALLING")
        .map(t => t.bookingCode)
        .filter(Boolean)
    );

    // Bổ sung các bệnh nhân chưa nộp tiền từ queueList của khoa tiếp đón (CHỈ lấy người đã check-in thực tế)
    (queueList || []).forEach(item => {
      if (Boolean(item.checkedInAt) && !item.isPaid && !activeCounterBookingCodes.has(item.bookingCode) && item.status !== "COMPLETED" && item.status !== "CANCELLED") {
        const isCurrentCalling = currentCallingTicket && (
          (currentCallingTicket.bookingCode && currentCallingTicket.bookingCode === item.bookingCode) ||
          (currentCallingTicket.bookingId && currentCallingTicket.bookingId === item.bookingId) ||
          (currentCallingTicket.ticketId && (currentCallingTicket.ticketId === item.bookingId || currentCallingTicket.ticketId === `BK-${item.bookingCode}`)) ||
          (currentCallingTicket.ticketCode && item.ticketCode && currentCallingTicket.ticketCode === item.ticketCode) ||
          (currentCallingTicket.bookingQueueCode && item.queueCode && currentCallingTicket.bookingQueueCode === item.queueCode) ||
          (currentCallingTicket.patientName && item.patientName && currentCallingTicket.patientName.trim().toLowerCase() === item.patientName.trim().toLowerCase())
        );
        list.push({
          ticketId: item.bookingId || `BK-${item.bookingCode}`,
          ticketCode: item.ticketCode || null,
          bookingQueueCode: item.bookingQueueCode || item.queueCode || null,
          queueCode: item.queueCode || null,
          queueNumber: item.queueNumber || null,
          patientName: item.patientName,
          phoneNumber: item.phone || item.phoneNumber,
          bookingCode: item.bookingCode,
          bookingId: item.bookingId,
          isPriority: Boolean(item.isPriority || (item.age && item.age >= 65)),
          priorityReason: item.priorityReason || (item.isPriority ? "Đối tượng ưu tiên" : ""),
          isPaid: false,
          price: item.price != null ? Number(item.price) : 0,
          departmentName: item.departmentName,
          doctorName: item.doctorName,
          dispatchedRoomId: item.roomId,
          status: isCurrentCalling ? "CALLING" : "WAITING",
          source: "RECEPTION_QUEUE"
        });
        activeCounterBookingCodes.add(item.bookingCode);
      }
    });

    // Bổ sung các hóa đơn xét nghiệm / CLS từ pendingBills (chỉ lấy các hóa đơn CLS / Đơn thuốc phát sinh hoặc chưa có trong hàng đợi khám)
    (pendingBills || []).forEach(bill => {
      const isTreatmentBill = bill.billType === "TEST" || bill.billType === "PRESCRIPTION" || bill.billType === "TREATMENT";
      if (!activeCounterBookingCodes.has(bill.bookingCode) && (isTreatmentBill || bill.billType === "EXAM")) {
        const isCurrentCalling = currentCallingTicket && (
          (currentCallingTicket.bookingCode && currentCallingTicket.bookingCode === bill.bookingCode) ||
          (currentCallingTicket.ticketId && currentCallingTicket.ticketId === bill.billId)
        );
        list.push({
          ticketId: bill.billId || `BILL-${bill.bookingCode}`,
          billId: bill.billId,
          billType: bill.billType,
          isClsBill: isTreatmentBill,
          items: bill.items || [],
          ticketCode: bill.ticketCode || null,
          bookingQueueCode: bill.bookingQueueCode || bill.queueCode || null,
          queueCode: bill.queueCode || null,
          queueNumber: null,
          patientName: bill.patientName,
          phoneNumber: bill.patientPhone || bill.phone,
          bookingCode: bill.bookingCode,
          bookingId: bill.bookingId,
          isPriority: false,
          isPaid: false,
          price: isTreatmentBill ? 0 : (Number(bill.totalAmount) || 0),
          testFee: isTreatmentBill ? (Number(bill.totalAmount) || 0) : 0,
          departmentName: bill.departmentName || (isTreatmentBill ? "Trung Tâm Xét Nghiệm" : "Khoa Khám Bệnh"),
          doctorName: bill.doctorName,
          status: isCurrentCalling ? "CALLING" : "WAITING",
          source: "PENDING_BILLS"
        });
        activeCounterBookingCodes.add(bill.bookingCode);
      }
    });

    return list;
  }, [counterQueue, queueList, pendingBills, currentCallingTicket]);

  // Thống kê phân loại hàng đợi
  const queueStats = useMemo(() => {
    const waitingList = mergedQueue.filter(t => t.status === "WAITING");
    const unpaidExam = waitingList.filter(t => !t.isPaid && !isClsOrTreatmentTicket(t)).length;
    const priority = waitingList.filter(t => Boolean(t.isPriority)).length;
    const labTests = waitingList.filter(t => {
      const b = pendingBills.find(pb => pb.bookingCode === t.bookingCode && (pb.billType === "TEST" || pb.billType === "PRESCRIPTION" || pb.billType === "TREATMENT"));
      return Boolean(b) || isClsOrTreatmentTicket(t);
    }).length;
    return {
      total: waitingList.length,
      unpaidExam,
      priority,
      labTests
    };
  }, [mergedQueue, pendingBills]);

  // Danh sách chờ lọc theo Tab và Ô tìm kiếm
  const filteredWaitingQueue = useMemo(() => {
    let list = mergedQueue.filter(t => t.status === "WAITING");

    if (queueTab === 1) {
      // 1. Vé chưa đóng tiền khám
      list = list.filter(t => !t.isPaid && !isClsOrTreatmentTicket(t));
    } else if (queueTab === 2) {
      // 2. Thu phí xét nghiệm CLS
      list = list.filter(t => {
        const b = pendingBills.find(pb => pb.bookingCode === t.bookingCode && (pb.billType === "TEST" || pb.billType === "PRESCRIPTION" || pb.billType === "TREATMENT"));
        return Boolean(b) || isClsOrTreatmentTicket(t);
      });
    } else if (queueTab === 3) {
      // 3. Đối tượng ưu tiên
      list = list.filter(t => Boolean(t.isPriority));
    }

    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter(t =>
        (t.ticketCode && t.ticketCode.toLowerCase().includes(q)) ||
        (t.patientName && t.patientName.toLowerCase().includes(q)) ||
        (t.phoneNumber && t.phoneNumber.includes(q)) ||
        (t.bookingCode && t.bookingCode.toLowerCase().includes(q))
      );
    }

    // Luôn ưu tiên đối tượng ưu tiên lên đầu bảng
    return list.sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return (a.queueNumber || 0) - (b.queueNumber || 0);
    });
  }, [mergedQueue, queueTab, searchFilter, pendingBills]);

  const activeDue = useMemo(() => calculateTicketDue(currentCallingTicket), [currentCallingTicket, pendingBills, queueList]);
  const payModalDue = useMemo(() => calculateTicketDue(payTargetTicket), [payTargetTicket, pendingBills, queueList]);

  useEffect(() => {
    if (openQuickPayModal && payModalDue.totalDue > 0) {
      const currentGiven = Number(amountGiven) || 0;
      if (currentGiven < payModalDue.totalDue) {
        setAmountGiven(String(payModalDue.totalDue));
      }
    }
  }, [openQuickPayModal, payModalDue.totalDue]);

  // Tính tiền thừa trả khách khi trả tiền mặt
  const changeAmount = useMemo(() => {
    const given = Number(amountGiven) || 0;
    const diff = given - payModalDue.totalDue;
    return diff > 0 ? diff : 0;
  }, [amountGiven, payModalDue.totalDue]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 4,
        border: "1.5px solid #BAE6FD",
        bgcolor: "#F0F9FF",
        boxShadow: "0 2px 14px rgba(2, 132, 199, 0.08)"
      }}
    >
      {/* 1. Header Bàn Điều Phối Quầy Tiếp Đón Sảnh Chuẩn Lịch Sử */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={2.5}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <MeetingRoomIcon sx={{ fontSize: 34, color: "#0284C7" }} />
          <Box>
            <Typography variant="h6" fontWeight="800" color="#0369A1" sx={{ lineHeight: 1.2 }}>
              BÀN ĐIỀU PHỐI QUẦY TIẾP ĐÓN SẢNH (COUNTER CONTROL)
            </Typography>
            <Typography variant="caption" color="#0284C7" fontWeight="600">
              Định tuyến bệnh nhân từ Cây Kiosk, gọi số vào quầy làm thủ tục BHYT / Ưu tiên / Đặt hẹn • Thu tiền khám & Xét nghiệm CLS
            </Typography>
          </Box>
        </Box>

        {/* Bộ chọn Quầy trực & Các nút Đóng / Mở */}
        <Box display="flex" alignItems="center" gap={1}>
          <FormControl size="small" sx={{ minWidth: 240, bgcolor: "#FFFFFF", borderRadius: 3 }}>
            <Select
              value={selectedCounterId}
              onChange={(e) => handleSelectCounter(e.target.value)}
              sx={{
                fontWeight: 700,
                color: "#0369A1",
                borderRadius: 3,
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#BAE6FD" }
              }}
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
              sx={{ fontWeight: 800, borderRadius: 3, textTransform: "none", px: 2 }}
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
              sx={{ fontWeight: 800, borderRadius: 3, textTransform: "none", bgcolor: "#FFFFFF", px: 2 }}
            >
              Đóng Quầy
            </Button>
          )}

          <Tooltip title="Thử loa phát thanh gọi số & chuông Ding-Dong">
            <IconButton
              onClick={() => {
                speakCashierCall({
                  ticketCode: "01",
                  patientName: "Nguyễn Văn An",
                  counterName: activeCounter?.counterName || "Quầy 1 - Tiếp đón Thường",
                  isPriority: false
                });
                setFeedback({
                  type: "info",
                  message: "🔔 Đang phát thử chuông Ding-Dong & thông báo giọng nói gọi số vào quầy..."
                });
              }}
              color="primary"
              sx={{ bgcolor: "#FFFFFF", borderRadius: 3, border: "1px solid #BAE6FD" }}
            >
              <VolumeUpIcon sx={{ color: "#0284C7" }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Làm mới hàng đợi">
            <IconButton
              onClick={() => {
                fetchCounters();
                if (selectedCounterId) fetchCounterQueue(selectedCounterId);
                fetchPendingBills();
              }}
              color="primary"
              sx={{ bgcolor: "#FFFFFF", borderRadius: 3, border: "1px solid #BAE6FD" }}
            >
              <RefreshIcon sx={{ color: "#0D9488" }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Thông báo kết quả thao tác */}
      {feedback.message && (
        <Alert
          severity={feedback.type || "info"}
          sx={{ mb: 2.5, borderRadius: 2 }}
          onClose={() => setFeedback({ type: "", message: "" })}
        >
          {feedback.message}
        </Alert>
      )}

      {/* 2. Thanh Tabs Phân Loại Hàng Đợi (Vé chưa thu tiền, Xét nghiệm CLS, Ưu tiên) */}
      <Box sx={{ borderBottom: "1px solid #E2E8F0", mb: 2.5 }}>
        <Tabs
          value={queueTab}
          onChange={(e, newVal) => setQueueTab(newVal)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <span>Tất Cả Hàng Đợi</span>
                <Chip label={queueStats.total} size="small" sx={{ fontWeight: 800, height: 20 }} />
              </Box>
            }
            sx={{ fontWeight: 800, textTransform: "none", fontSize: "0.9rem" }}
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <PointOfSaleIcon sx={{ fontSize: 18, color: "#D97706" }} />
                <span>1. Chờ Thu Tiền Khám</span>
                <Chip label={queueStats.unpaidExam} color="warning" size="small" sx={{ fontWeight: 800, height: 20 }} />
              </Box>
            }
            sx={{ fontWeight: 800, textTransform: "none", fontSize: "0.9rem" }}
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <ScienceIcon sx={{ fontSize: 18, color: "#7C3AED" }} />
                <span>2. Thu Phí Xét Nghiệm (CLS)</span>
                <Chip label={queueStats.labTests} color="secondary" size="small" sx={{ fontWeight: 800, height: 20 }} />
              </Box>
            }
            sx={{ fontWeight: 800, textTransform: "none", fontSize: "0.9rem" }}
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <StarsIcon sx={{ fontSize: 18, color: "#DC2626" }} />
                <span>3. Đối Tượng Ưu Tiên</span>
                <Chip label={queueStats.priority} color="error" size="small" sx={{ fontWeight: 800, height: 20 }} />
              </Box>
            }
            sx={{ fontWeight: 800, textTransform: "none", fontSize: "0.9rem" }}
          />
        </Tabs>
      </Box>

      {/* 3. Grid Nội Dung Chính: Bàn Phục Vụ Bên Trái & Danh Sách Hàng Đợi Bên Phải */}
      <Grid container spacing={2.5}>
        {/* CỘT TRÁI: KHU VỰC ĐANG PHỤC VỤ & THU VIỆN PHÍ */}
        <Grid item xs={12} lg={5}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
            }}
          >
            <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2" fontWeight="900" color="#0369A1">
                  ĐANG PHỤC VỤ TẠI {activeCounter?.counterName?.toUpperCase() || "QUẦY 1 - TIẾP ĐÓN THƯỜNG"}
                </Typography>
                <Chip
                  label={`${queueStats.total} bệnh nhân đang đợi`}
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 800, bgcolor: "#C2410C", color: "#FFFFFF" }}
                />
              </Box>

              {currentCallingTicket ? (
                <Box
                  sx={{
                    p: 2.5,
                    bgcolor: currentCallingTicket.isPriority ? "#FEF2F2" : "#F8FAFC",
                    borderRadius: 2.5,
                    border: currentCallingTicket.isPriority ? "2px solid #FCA5A5" : "1px solid #E2E8F0",
                    mb: 2.5
                  }}
                >
                  {/* Badge định danh ưu tiên */}
                  {currentCallingTicket.isPriority && (
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.8} mb={1}>
                      <Chip
                        icon={<StarsIcon sx={{ fontSize: 18, color: "#DC2626 !important" }} />}
                        label={`ĐỐI TƯỢNG ƯU TIÊN: ${currentCallingTicket.priorityReason || "Người già / Trẻ em / Thai phụ"}`}
                        color="error"
                        size="small"
                        sx={{ fontWeight: 800, fontSize: "0.75rem", py: 0.5 }}
                      />
                    </Box>
                  )}

                  <Typography variant="caption" color={currentCallingTicket.isPriority ? "#991B1B" : "#64748B"} fontWeight="700" display="block" textAlign="center">
                    SỐ THỨ TỰ PHỤC VỤ
                  </Typography>

                  <Typography
                    variant="h3"
                    fontWeight="900"
                    color={currentCallingTicket.isPriority ? "#DC2626" : "#0D9488"}
                    sx={{ my: 0.5, textAlign: "center", letterSpacing: 1 }}
                  >
                    {currentCallingTicket.ticketCode || (currentCallingTicket.bookingCode ? `Hẹn: ${currentCallingTicket.bookingCode}` : "Chưa có mã quầy")}
                  </Typography>

                  <Typography variant="h6" fontWeight="900" color="#0F172A" sx={{ textAlign: "center" }}>
                    {currentCallingTicket.patientName?.toUpperCase()}
                  </Typography>

                  <Typography variant="body2" color="#64748B" sx={{ mb: 1.5, textAlign: "center" }}>
                    SĐT: <b>{currentCallingTicket.phoneNumber || "---"}</b> • Mã hẹn: <b>{currentCallingTicket.bookingCode || "N/A"}</b>
                  </Typography>

                  {/* Chi tiết các khoản viện phí cần thu */}
                  <Box sx={{ p: 2, bgcolor: "#FFFFFF", borderRadius: 2, border: "1px solid #E2E8F0", mb: 2 }}>
                    <Typography variant="caption" fontWeight="800" color="#64748B" sx={{ textTransform: "uppercase", display: "block", mb: 1 }}>
                      Chi Tiết Khoản Thu Viện Phí:
                    </Typography>

                    <Stack spacing={0.8}>
                      {/* Tiền khám chuyên khoa */}
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="#334155" fontWeight="600">
                          • Tiền khám {currentCallingTicket.departmentName ? `(${currentCallingTicket.departmentName})` : "chuyên khoa"}:
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="800" color={currentCallingTicket.isPaid ? "#16A34A" : "#D97706"}>
                            {currentCallingTicket.price != null && Number(currentCallingTicket.price) > 0 ? formatCurrency(currentCallingTicket.price) : "Chưa có biểu phí (0 đ)"}
                          </Typography>
                          {currentCallingTicket.isPaid ? (
                            <Chip label="Đã đóng" color="success" size="small" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                          ) : (
                            <Chip label="Chưa nộp" color="warning" size="small" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                          )}
                        </Box>
                      </Box>

                      {/* Phí cận lâm sàng / xét nghiệm (nếu có) */}
                      {activeDue.testItems.length > 0 && (
                        <Box sx={{ pt: 0.5 }}>
                          <Typography variant="caption" color="#7C3AED" fontWeight="800">
                            • Chỉ định Cận Lâm Sàng & Xét Nghiệm ({activeDue.testItems.length} mục):
                          </Typography>
                          {activeDue.testItems.slice(0, 3).map((item, idx) => (
                            <Box key={idx} display="flex" justifyContent="space-between" pl={1.5} py={0.2}>
                              <Typography variant="caption" color="#64748B">{item.itemName}</Typography>
                              <Typography variant="caption" fontWeight="700">{formatCurrency(item.totalPrice || item.unitPrice)}</Typography>
                            </Box>
                          ))}
                          {activeDue.testItems.length > 3 && (
                            <Typography variant="caption" color="#94A3B8" pl={1.5}>
                              + {activeDue.testItems.length - 3} xét nghiệm khác...
                            </Typography>
                          )}
                        </Box>
                      )}

                      <Divider sx={{ my: 0.5 }} />

                      {/* Tổng viện phí */}
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight="900" color="#0F172A">
                          TỔNG CẦN THANH TOÁN:
                        </Typography>
                        <Typography variant="h6" fontWeight="900" color={activeDue.totalDue > 0 ? "#DC2626" : "#16A34A"}>
                          {formatCurrency(activeDue.totalDue)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Cụm Nút Hành Động Một Chạm */}
                  <Stack spacing={1.2}>
                    {activeDue.totalDue > 0 ? (
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        startIcon={<ReceiptLongIcon />}
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => handleOpenQuickPay(currentCallingTicket)}
                        disabled={actionLoading}
                        sx={{
                          py: 1.4,
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          borderRadius: 2,
                          bgcolor: "#0D9488",
                          "&:hover": { bgcolor: "#0F766E" },
                          boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
                          textTransform: "none"
                        }}
                      >
                        THU TIỀN & TỰ ĐỘNG CHUYỂN BÁC SĨ
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        startIcon={<CheckCircleIcon />}
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => handleDirectDispatchToDoctor(currentCallingTicket)}
                        disabled={actionLoading}
                        sx={{
                          py: 1.4,
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          borderRadius: 2,
                          bgcolor: "#0284C7",
                          "&:hover": { bgcolor: "#0369A1" },
                          textTransform: "none"
                        }}
                      >
                        XÁC NHẬN & ĐƯA VÀO HÀNG ĐỢI BÁC SĨ
                      </Button>
                    )}

                    <Box display="flex" gap={1}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="primary"
                        startIcon={<VolumeUpIcon />}
                        onClick={handleRecallCurrent}
                        disabled={actionLoading}
                        sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
                      >
                        Gọi Lại Loa
                      </Button>

                      <Button
                        fullWidth
                        variant="outlined"
                        color="warning"
                        startIcon={<CancelIcon />}
                        onClick={handleSkip}
                        disabled={actionLoading}
                        sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
                      >
                        Bỏ Qua (Vắng)
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 4,
                    bgcolor: "#F8FAFC",
                    borderRadius: 2.5,
                    border: "1px dashed #CBD5E1",
                    textAlign: "center",
                    mb: 2.5,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <AccountBalanceWalletIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
                  <Typography variant="body1" color="#475569" fontWeight="700">
                    Chưa có bệnh nhân nào tại bàn phục vụ
                  </Typography>
                  <Typography variant="caption" color="#64748B">
                    Bấm "GỌI SỐ TIẾP THEO" bên dưới để tiếp nhận theo thứ tự ưu tiên
                  </Typography>
                </Box>
              )}

              {/* Nút Gọi Số Tiếp Theo To Rõ (Tự động ưu tiên nhóm 3 trước) */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<PlayArrowIcon sx={{ fontSize: 26 }} />}
                onClick={handleCallNext}
                disabled={actionLoading || queueStats.total === 0}
                sx={{
                  py: 1.8,
                  fontSize: "1.05rem",
                  fontWeight: 900,
                  bgcolor: "#0D9488",
                  "&:hover": { bgcolor: "#0F766E" },
                  borderRadius: 3,
                  boxShadow: "0 6px 20px rgba(13, 148, 136, 0.25)",
                  textTransform: "none"
                }}
              >
                GỌI SỐ TIẾP THEO (CALL NEXT)
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* CỘT PHẢI: BẢNG DANH SÁCH HÀNG ĐỢI THEO NHÓM */}
        <Grid item xs={12} lg={7}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid #E2E8F0",
              bgcolor: "#FFFFFF",
              height: "100%",
              boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={2}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="900" color="#0369A1">
                    DANH SÁCH CHỜ TẠI QUẦY ({filteredWaitingQueue.length} người)
                  </Typography>
                  <Typography variant="caption" color="#64748B">
                    Tự động xếp theo thứ tự bốc số Kiosk & diện ưu tiên
                  </Typography>
                </Box>

                {/* Ô tìm kiếm nhanh */}
                <TextField
                  size="small"
                  placeholder="Tìm số phiếu, họ tên, SĐT..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18, color: "#94A3B8" }} />
                      </InputAdornment>
                    )
                  }}
                  sx={{ width: { xs: "100%", sm: 260 }, bgcolor: "#F8FAFC", borderRadius: 2 }}
                />
              </Box>

              <TableContainer sx={{ maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Số Phiếu</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Bệnh Nhân</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Phân Loại</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Viện Phí Cần Thu</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Trạng Thái</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#F8FAFC" }}>Thao Tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredWaitingQueue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94A3B8" }}>
                          Hiện không có bệnh nhân nào trong hàng đợi của nhóm này
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWaitingQueue.map((ticket) => {
                        const bill = getTicketPendingBill(ticket);
                        const hasTests = bill && (bill.billType === "TREATMENT" || (bill.items && bill.items.some(i => i.itemType === "LAB_TEST")));
                        return (
                          <TableRow
                            key={ticket.ticketId}
                            hover
                            sx={{
                              bgcolor: ticket.isPriority ? "#FEF2F2" : "inherit"
                            }}
                          >
                            <TableCell sx={{ fontWeight: 900, color: ticket.isPriority ? "#DC2626" : "#0D9488" }}>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                {ticket.isPriority && <StarsIcon sx={{ fontSize: 16, color: "#DC2626" }} />}
                                <span>{ticket.ticketCode || (ticket.bookingQueueCode ? `Khám: ${ticket.bookingQueueCode}` : (ticket.bookingCode || "Chưa có mã"))}</span>
                              </Box>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight="700" color="#0F172A">
                                {ticket.patientName}
                              </Typography>
                              <Typography variant="caption" color="#64748B">
                                {ticket.phoneNumber || "---"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Box display="flex" flexDirection="column" gap={0.4} alignItems="flex-start">
                                {ticket.isPriority ? (
                                  <Chip label="Ưu tiên" color="error" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
                                ) : ticket.hasInsurance ? (
                                  <Chip label="BHYT" color="primary" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
                                ) : (
                                  <Chip label="Thường" variant="outlined" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
                                )}
                                {renderReceptionSourceBadge(ticket)}
                              </Box>
                            </TableCell>

                            <TableCell>
                              <Box display="flex" flexDirection="column" gap={0.2}>
                                {!ticket.isPaid ? (
                                  <Typography variant="caption" fontWeight="700" color="#D97706">
                                    Tiền khám: {ticket.price != null && Number(ticket.price) > 0 ? formatCurrency(ticket.price) : "Chưa có biểu phí (0 đ)"}
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" color="#16A34A" fontWeight="600">
                                    Đã đóng tiền khám
                                  </Typography>
                                )}
                                {hasTests && (
                                  <Typography variant="caption" color="#7C3AED" fontWeight="700">
                                    Phí xét nghiệm CLS
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={!ticket.isPaid ? "Chưa nộp tiền" : "Đã thanh toán"}
                                color={!ticket.isPaid ? "warning" : "success"}
                                size="small"
                                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                              />
                            </TableCell>

                            <TableCell align="center">
                              <Box display="flex" justifyContent="center" gap={0.8}>
                                <Tooltip title="Phát chuông Ding-dong & Đọc loa gọi bệnh nhân này vào quầy nộp tiền">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="warning"
                                    startIcon={<VolumeUpIcon sx={{ fontSize: 16 }} />}
                                    onClick={() => handleCallSpecificTicket(ticket)}
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: "0.72rem",
                                      py: 0.3,
                                      px: 1,
                                      borderRadius: 2,
                                      textTransform: "none",
                                      bgcolor: "#F59E0B",
                                      "&:hover": { bgcolor: "#D97706" },
                                      boxShadow: "0 2px 6px rgba(245, 158, 11, 0.25)"
                                    }}
                                  >
                                    Gọi Số
                                  </Button>
                                </Tooltip>

                                <Tooltip title="Mở cửa sổ thu viện phí PayOS/Tiền mặt & tự động điều phối Bác sĩ">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PointOfSaleIcon sx={{ fontSize: 16 }} />}
                                    onClick={() => handleOpenQuickPay(ticket)}
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: "0.72rem",
                                      py: 0.3,
                                      px: 1,
                                      borderRadius: 2,
                                      textTransform: "none",
                                      bgcolor: "#0D9488",
                                      "&:hover": { bgcolor: "#0F766E" },
                                      boxShadow: "0 2px 6px rgba(13, 148, 136, 0.25)"
                                    }}
                                  >
                                    Thu Tiền
                                  </Button>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 4. MODAL THU TIỀN NHANH & TỰ ĐỘNG CHUYỂN VÀO HÀNG ĐỢI BÁC SĨ */}
      <Dialog
        open={openQuickPayModal}
        onClose={() => setOpenQuickPayModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#0F172A", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0" }}>
          <Box display="flex" alignItems="center" gap={1.2}>
            <PointOfSaleIcon sx={{ color: "#0D9488" }} />
            <span>Xác Nhận Thu Viện Phí & Tự Động Vào Hàng Đợi Bác Sĩ</span>
          </Box>
          <Chip label="Bàn Thu Ngân Tiếp Đón" color="primary" size="small" sx={{ fontWeight: 800 }} />
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5, maxHeight: "75vh", overflowY: "auto", flex: 1 }}>
          {modalAlert.message && (
            <Alert
              severity={modalAlert.type || "error"}
              sx={{ mb: 2, borderRadius: 2 }}
              onClose={() => setModalAlert({ type: "", message: "" })}
            >
              {modalAlert.message}
            </Alert>
          )}
          {payTargetTicket && (
            <Stack spacing={2.5}>
              {/* Thông tin bệnh nhân */}
              <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="subtitle1" fontWeight="900" color="#0F172A">
                    {payTargetTicket.patientName?.toUpperCase()}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.8}>
                    {renderReceptionSourceBadge(payTargetTicket)}
                    <Chip
                      label={payTargetTicket.ticketCode ? `Phiếu #${payTargetTicket.ticketCode}` : (payTargetTicket.bookingCode ? `Mã hẹn #${payTargetTicket.bookingCode}` : "Chưa có mã quầy")}
                      color={payTargetTicket.isPriority ? "error" : "primary"}
                      size="small"
                      sx={{ fontWeight: 800 }}
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="#64748B">
                  SĐT: <b>{payTargetTicket.phoneNumber || "---"}</b> • Mã ca khám: <b>{payTargetTicket.bookingCode || "N/A"}</b>
                </Typography>
                <Typography variant="body2" color="#64748B">
                  Bác sĩ phụ trách: <b>{payTargetTicket.doctorName || "Bác sĩ lâm sàng"}</b> ({payTargetTicket.departmentName || "Khoa Khám Bệnh"})
                </Typography>
              </Box>

              {/* Bảng chi tiết khoản thu */}
              <Box sx={{ p: 2, bgcolor: "#FFFFFF", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                <Typography variant="caption" fontWeight="800" color="#64748B" sx={{ textTransform: "uppercase", display: "block", mb: 1 }}>
                  Chi Tiết Viện Phí Cần Thu:
                </Typography>
                <Table size="small">
                  <TableBody>
                    {payModalDue.consultationFee > 0 || payModalDue.testItems.length === 0 ? (
                      <TableRow>
                        <TableCell sx={{ pl: 0, fontWeight: 600 }}>• Công khám lâm sàng chuyên khoa</TableCell>
                        <TableCell align="right" sx={{ pr: 0, fontWeight: 700 }}>
                          {formatCurrency(payModalDue.consultationFee)}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell sx={{ pl: 0, fontWeight: 600, color: "#64748B" }}>• Công khám lâm sàng chuyên khoa (Đã thanh toán)</TableCell>
                        <TableCell align="right" sx={{ pr: 0, fontWeight: 700, color: "#16A34A" }}>
                          0 đ
                        </TableCell>
                      </TableRow>
                    )}
                    {payModalDue.testItems.map((test, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ pl: 0, color: "#7C3AED", fontWeight: 600 }}>• {test.itemName}</TableCell>
                        <TableCell align="right" sx={{ pr: 0, fontWeight: 700 }}>
                          {formatCurrency(test.totalPrice || test.unitPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ "& td": { borderBottom: "none", pt: 1.5 } }}>
                      <TableCell sx={{ pl: 0, fontWeight: 900, fontSize: "1rem", color: "#0F172A" }}>
                        TỔNG TIỀN PHẢI THU:
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 0, fontWeight: 900, fontSize: "1.15rem", color: "#DC2626" }}>
                        {formatCurrency(payModalDue.totalDue)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              {/* Chọn phương thức thanh toán */}
              <Box>
                <Typography variant="subtitle2" fontWeight="800" color="#0F172A" mb={1}>
                  Phương Thức Thanh Toán:
                </Typography>
                <RadioGroup
                  row
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value;
                    setPaymentMethod(method);
                    if (method === "VIETQR" && !payosData && payTargetTicket) {
                      loadPayOSQR(payTargetTicket, payModalDue.totalDue);
                    }
                  }}
                >
                  <FormControlLabel
                    value="CASH"
                    control={<Radio size="small" />}
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <LocalAtmIcon sx={{ fontSize: 18, color: "#16A34A" }} />
                        <Typography variant="body2" fontWeight="700">Tiền mặt tại quầy</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="VIETQR"
                    control={<Radio size="small" />}
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <QrCodeScannerIcon sx={{ fontSize: 18, color: "#0284C7" }} />
                        <Typography variant="body2" fontWeight="700">Quét mã VietQR / PayOS</Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="POS"
                    control={<Radio size="small" />}
                    label={
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <CreditCardIcon sx={{ fontSize: 18, color: "#7C3AED" }} />
                        <Typography variant="body2" fontWeight="700">Quẹt thẻ POS</Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </Box>

              {/* Giao diện thanh toán Tiền mặt: Tính tiền thối lại */}
              {paymentMethod === "CASH" && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Tiền khách đưa (VND)"
                      value={amountGiven}
                      onChange={(e) => setAmountGiven(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 1, bgcolor: "#F0FDF4", borderRadius: 2, border: "1px solid #BBF7D0", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="caption" fontWeight="700" color="#166534">Tiền thối lại:</Typography>
                      <Typography variant="subtitle2" fontWeight="900" color="#15803D">{formatCurrency(changeAmount)}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}

              {/* Giao diện thanh toán PayOS VietQR chuyên nghiệp */}
              {paymentMethod === "VIETQR" && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    bgcolor: "#F8FAFC",
                    borderRadius: 2.5,
                    border: "1.5px solid #0284C7",
                    position: "relative"
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2" fontWeight={900} color="#0284C7">
                        CỔNG THANH TOÁN PAYOS VIETQR 24/7
                      </Typography>
                    </Box>
                    <Chip label="Tự động khớp lệnh" color="success" size="small" sx={{ fontWeight: 800, fontSize: "0.68rem" }} />
                  </Box>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5} textAlign="center">
                      <Box
                        sx={{
                          p: 1.2,
                          bgcolor: "#FFFFFF",
                          borderRadius: 2,
                          display: "inline-block",
                          border: "1px solid #CBD5E1",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                        }}
                      >
                        {payosLoading ? (
                          <Box py={5} display="flex" justifyContent="center"><CircularProgress size={24} /></Box>
                        ) : payosData?.qrUrl ? (
                          <img
                            src={payosData.qrUrl}
                            alt="Mã PayOS VietQR"
                            style={{ width: 140, height: 140, objectFit: "contain", display: "block" }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <Box py={3} textAlign="center">
                            <Typography variant="caption" color="error" display="block" mb={1}>
                              Chưa có mã QR PayOS
                            </Typography>
                            <Button size="small" variant="outlined" onClick={() => loadPayOSQR(payTargetTicket, payModalDue.totalDue)}>
                              Tạo mã QR
                            </Button>
                          </Box>
                        )}
                      </Box>
                      <Typography variant="caption" color="#64748B" display="block" mt={0.5}>
                        Quét bằng App Ngân hàng bất kỳ
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={7}>
                      <Stack spacing={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" p={1} bgcolor="#FFFFFF" borderRadius={1.5} border="1px solid #E2E8F0">
                          <Box>
                            <Typography variant="caption" color="#64748B" display="block">Ngân hàng thụ hưởng:</Typography>
                            <Typography variant="body2" fontWeight={800} color="#0F172A">{payosData?.bankName || "MBBank"}</Typography>
                          </Box>
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center" p={1} bgcolor="#FFFFFF" borderRadius={1.5} border="1px solid #E2E8F0">
                          <Box>
                            <Typography variant="caption" color="#64748B" display="block">Số tài khoản:</Typography>
                            <Typography variant="body2" fontWeight={900} fontFamily="monospace" color="#0284C7">{payosData?.accountNumber || "---"}</Typography>
                          </Box>
                          <Tooltip title="Sao chép STK">
                            <IconButton size="small" onClick={() => handleCopy(payosData?.accountNumber || "", "stk")}>
                              {copiedField === "stk" ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center" p={1} bgcolor="#FFFFFF" borderRadius={1.5} border="1px solid #E2E8F0">
                          <Box>
                            <Typography variant="caption" color="#64748B" display="block">Số tiền viện phí:</Typography>
                            <Typography variant="body2" fontWeight={900} color="#DC2626">{formatCurrency(payModalDue.totalDue)}</Typography>
                          </Box>
                          <Tooltip title="Sao chép số tiền">
                            <IconButton size="small" onClick={() => handleCopy(payModalDue.totalDue, "amount")}>
                              {copiedField === "amount" ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <Box display="flex" justifyContent="space-between" alignItems="center" p={1} bgcolor="#FFFFFF" borderRadius={1.5} border="1px solid #E2E8F0">
                          <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                            <Typography variant="caption" color="#64748B" display="block">Nội dung chuyển khoản:</Typography>
                            <Typography variant="body2" fontWeight={900} fontFamily="monospace" color="#0D9488" noWrap>
                              {payosData?.transferContent || `VP ${payTargetTicket.ticketCode || payTargetTicket.bookingCode || ""} ${payTargetTicket.bookingCode || ""}`.trim()}
                            </Typography>
                          </Box>
                          <Tooltip title="Sao chép nội dung">
                            <IconButton size="small" onClick={() => handleCopy(payosData?.transferContent || `VP ${payTargetTicket.ticketCode || payTargetTicket.bookingCode || ""} ${payTargetTicket.bookingCode || ""}`.trim(), "content")}>
                              {copiedField === "content" ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Stack>
                    </Grid>
                  </Grid>

                  <Box mt={1.5} display="flex" justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={payosSyncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
                      onClick={handleSyncPayOS}
                      disabled={payosSyncing}
                      sx={{ fontWeight: 800, textTransform: "none", borderRadius: 2, fontSize: "0.8rem" }}
                    >
                      {payosSyncing ? "Đang đồng bộ..." : "Kiểm Tra Trạng Thái PayOS"}
                    </Button>
                  </Box>
                </Paper>
              )}

              {/* Điều phối buồng khám Bác sĩ sau khi thanh toán */}
              <Box sx={{ p: 2, bgcolor: "#F0FDFA", borderRadius: 2.5, border: "1.5px solid #99F6E4" }}>
                <Box display="flex" alignItems="center" gap={1} mb={1.2}>
                  <MeetingRoomIcon sx={{ color: "#0D9488" }} />
                  <Typography variant="subtitle2" fontWeight={900} color="#0F766E">
                    ĐIỀU PHỐI VÀO BUỒNG KHÁM BÁC SĨ SAU KHI THU TIỀN:
                  </Typography>
                </Box>

                <RadioGroup
                  value={dispatchMode}
                  onChange={(e) => setDispatchMode(e.target.value)}
                >
                  {/* LỰA CHỌN 1: Tự động điều phối vào buồng ít người nhất */}
                  <FormControlLabel
                    value="AUTO"
                    control={<Radio size="small" color="primary" />}
                    label={
                      <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={800} color="#0F172A">
                            ⚡ Tự động điều phối vào Buồng khám ít người nhất (Cân bằng tải)
                          </Typography>
                          <Chip label="Khuyên dùng" size="small" color="success" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 800 }} />
                        </Box>
                        {leastLoadedRoom && (
                          <Typography variant="caption" color="#0D9488" fontWeight={700} display="block">
                            ➔ Đang chỉ định: <b>{leastLoadedRoom.roomName}</b> • {leastLoadedRoom.doctorName} ({leastLoadedRoom.departmentName}) — <span style={{ color: "#16A34A" }}>{leastLoadedRoom.waitingCount} người đang đợi</span>
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ mb: 1, alignItems: "flex-start" }}
                  />

                  {/* LỰA CHỌN 2: Điều dưỡng chỉ định buồng khám / bác sĩ theo nguyện vọng bệnh nhân */}
                  <FormControlLabel
                    value="MANUAL"
                    control={<Radio size="small" color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={800} color="#0F172A">
                          👨‍⚕️ Điều dưỡng chỉ định Buồng khám / Bác sĩ cụ thể
                        </Typography>
                        <Typography variant="caption" color="#64748B" display="block">
                          Dùng khi bệnh nhân có yêu cầu khám một bác sĩ hoặc chuyên khoa đích danh
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start" }}
                  />
                </RadioGroup>

                {dispatchMode === "MANUAL" && (
                  <Box mt={1.5} pl={4}>
                    <FormControl fullWidth size="small" sx={{ bgcolor: "#FFFFFF", borderRadius: 2 }}>
                      <InputLabel>Chọn Buồng Khám & Bác Sĩ</InputLabel>
                      <Select
                        value={selectedTargetRoomId}
                        label="Chọn Buồng Khám & Bác Sĩ"
                        onChange={(e) => setSelectedTargetRoomId(e.target.value)}
                      >
                        {eligibleRoomsForTicket && eligibleRoomsForTicket.length > 0 ? (
                          eligibleRoomsForTicket.map(r => (
                            <MenuItem key={r.roomId} value={r.roomId}>
                              <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                                <span>
                                  <b>{r.roomName}</b> — {r.doctorName} ({r.departmentName})
                                </span>
                                <Chip
                                  label={`${r.waitingCount} chờ`}
                                  size="small"
                                  sx={{
                                    ml: 1,
                                    height: 20,
                                    fontSize: "0.68rem",
                                    bgcolor: r.waitingCount === 0 ? "#DCFCE7" : (r.waitingCount > 3 ? "#FEE2E2" : "#FEF3C7"),
                                    color: r.waitingCount === 0 ? "#15803D" : (r.waitingCount > 3 ? "#991B1B" : "#B45309"),
                                    fontWeight: 800
                                  }}
                                />
                              </Box>
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled value="">
                            <i>Không có buồng khám khả dụng thuộc khoa {payTargetTicket?.departmentName || "đăng ký"}</i>
                          </MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Box>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>

        {modalAlert.message && (
          <Box sx={{ px: 3, pt: 1, pb: 0.5 }}>
            <Alert
              severity={modalAlert.type || "error"}
              sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.88rem" }}
              onClose={() => setModalAlert({ type: "", message: "" })}
            >
              {modalAlert.message}
            </Alert>
          </Box>
        )}

        <DialogActions sx={{ p: 2, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", bottom: 0, bgcolor: "#FFFFFF", zIndex: 2 }}>
          <Box>
            {payingAndDispatching && (
              <Typography variant="caption" sx={{ color: "#0D9488", fontWeight: 800, display: "flex", alignItems: "center", gap: 0.8 }}>
                <CircularProgress size={16} color="inherit" />
                Đang ghi nhận viện phí và chuyển buồng khám...
              </Typography>
            )}
            {paymentMethod === "VIETQR" && !payosVerified && !payTargetTicket?.isPaid && !dispatchRetryNeeded && (
              <Typography variant="caption" sx={{ color: "#D97706", fontWeight: 800, display: "flex", alignItems: "center", gap: 0.5 }}>
                ⚠️ Cần xác nhận PayOS thành công trước khi điều phối
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button onClick={() => setOpenQuickPayModal(false)} color="inherit" sx={{ fontWeight: 700, minHeight: 44, minWidth: 44 }}>
              Hủy Bỏ
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmPayAndAutoDispatch}
              disabled={payingAndDispatching || (paymentMethod === "VIETQR" && !payosVerified && !payTargetTicket?.isPaid && !dispatchRetryNeeded)}
              startIcon={payingAndDispatching ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
              endIcon={!payingAndDispatching && <ArrowForwardIcon />}
              sx={{
                fontWeight: 900,
                bgcolor: (payTargetTicket?.isPaid || dispatchRetryNeeded) ? "#D97706" : "#0D9488",
                "&:hover": { bgcolor: (payTargetTicket?.isPaid || dispatchRetryNeeded) ? "#B45309" : "#0F766E" },
                borderRadius: 2,
                px: 3,
                py: 1,
                minHeight: 44,
                minWidth: 44,
                textTransform: "none"
              }}
            >
              {payingAndDispatching
                ? "ĐANG XỬ LÝ..."
                : (payTargetTicket?.isPaid || dispatchRetryNeeded
                  ? "THỬ LẠI ĐIỀU PHỐI VÀO BUỒNG KHÁM"
                  : "XÁC NHẬN ĐÃ THU & TỰ ĐỘNG CHUYỂN BÁC SĨ")}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* 5. MODAL XEM TRƯỚC VÀ IN BIÊN LAI VIỆN PHÍ A5 CHUẨN BỘ Y TẾ */}
      <Dialog
        open={openReceiptModal}
        onClose={() => setOpenReceiptModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: "90vh" } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#0F172A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Biên Lai Thu Viện Phí A5</span>
          <Chip label="Đã Xác Thực" color="success" size="small" sx={{ fontWeight: 800 }} />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5, maxHeight: "70vh", overflowY: "auto" }}>
          {recentReceipt && (
            <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px dashed #CBD5E1" }}>
              <Typography variant="subtitle2" fontWeight="900" textAlign="center" color="#0F172A">
                BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT
              </Typography>
              <Typography variant="caption" textAlign="center" display="block" color="#64748B" mb={1.5}>
                Mã biên lai: <b>{recentReceipt.receiptCode}</b> • {recentReceipt.paidAt}
              </Typography>

              <Divider sx={{ my: 1 }} />

              <Typography variant="body2">Họ tên: <b>{recentReceipt.patientName}</b></Typography>
              <Typography variant="body2">SĐT: <b>{recentReceipt.phoneNumber || "---"}</b></Typography>
              <Typography variant="body2">Khoa phòng: <b>{recentReceipt.departmentName || "Khoa Khám Bệnh"}</b></Typography>
              <Typography variant="body2">Hình thức: <b>{recentReceipt.paymentMethod}</b></Typography>

              <Divider sx={{ my: 1 }} />

              <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography variant="subtitle1" fontWeight="900">Tổng đã thu:</Typography>
                <Typography variant="subtitle1" fontWeight="900" color="#16A34A">
                  {formatCurrency(recentReceipt.paidAmount || recentReceipt.totalAmount)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReceiptModal(false)} color="inherit" sx={{ fontWeight: 700, minHeight: 44, minWidth: 44 }}>
            Đóng Lại
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => {
              if (recentReceipt) printReceipt(recentReceipt);
            }}
            sx={{ fontWeight: 800, borderRadius: 2, textTransform: "none", minHeight: 44, minWidth: 44 }}
          >
            In Biên Lai A5
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export function selectTargetRoomCandidate({ dispatchMode, selectedTargetRoomId, candidateRooms = [], leastLoadedRoom = null }) {
  if (dispatchMode === "AUTO") {
    return leastLoadedRoom || (candidateRooms.length > 0 ? candidateRooms[0] : null);
  }
  if (!selectedTargetRoomId) return null;
  return candidateRooms.find(r => String(r.roomId) === String(selectedTargetRoomId)) || null;
}

export function filterEligibleRoomsForTicket(ticket, standardClinicRooms = []) {
  if (!ticket) return standardClinicRooms;
  const targetDept = (ticket.departmentName || "").trim().toLowerCase();
  const targetDeptId = ticket.departmentId ? String(ticket.departmentId) : null;
  if (!targetDept && !targetDeptId) return [];
  return standardClinicRooms.filter(r => {
    if (targetDeptId && String(r.departmentId) === targetDeptId) return true;
    if (targetDept && r.departmentName && (r.departmentName.toLowerCase().includes(targetDept) || targetDept.includes(r.departmentName.toLowerCase()))) return true;
    return false;
  });
}

export const isClsOrTreatmentTicketPure = (ticket, pendingBills = []) => {
  if (!ticket) return false;
  const tId = String(ticket.billId || ticket.ticketId || "");
  const tCode = String(ticket.ticketCode || "");
  if (
    ticket.isClsBill ||
    ticket.billType === "TEST" ||
    ticket.billType === "PRESCRIPTION" ||
    ticket.billType === "TREATMENT" ||
    /-(TEST|PRESCRIPTION|TREATMENT)$/i.test(tId) ||
    tCode.startsWith("CLS-") ||
    tCode.startsWith("THUOC-")
  ) {
    return true;
  }
  if (ticket.bookingCode) {
    const billsForBooking = (pendingBills || []).filter(b => b.bookingCode === ticket.bookingCode);
    const hasExamBill = billsForBooking.some(b => b.billType === "EXAM");
    const hasTreatmentBill = billsForBooking.some(b => b.billType === "TEST" || b.billType === "PRESCRIPTION" || b.billType === "TREATMENT");
    if (!hasExamBill && hasTreatmentBill && ticket.source === "PENDING_BILLS") {
      return true;
    }
  }
  return false;
};

export const getTicketPendingBillPure = (ticket, pendingBills = []) => {
  if (!ticket) return null;
  if (ticket.billId) {
    const byBillId = (pendingBills || []).find(b => b.billId === ticket.billId);
    if (byBillId) return byBillId;
  }
  if (ticket.ticketId && String(ticket.ticketId).startsWith("BILL-")) {
    const byTicketBillId = (pendingBills || []).find(b => b.billId === String(ticket.ticketId));
    if (byTicketBillId) return byTicketBillId;
  }
  if (!ticket.bookingCode) return null;
  const billsForBooking = (pendingBills || []).filter(b => b.bookingCode === ticket.bookingCode);
  return billsForBooking.find(b => b.billType === "TEST" || b.billType === "PRESCRIPTION" || b.billType === "TREATMENT")
    || billsForBooking[0]
    || null;
};

export const calculateTicketDuePure = (ticket, { pendingBills = [], queueList = [] } = {}) => {
  if (!ticket) return { consultationFee: 0, testFee: 0, totalDue: 0, testItems: [], targetBillId: null, isClsOnly: false };
  const bill = getTicketPendingBillPure(ticket, pendingBills);
  const billsForBooking = ticket.bookingCode
    ? (pendingBills || []).filter(b => b.bookingCode === ticket.bookingCode)
    : (bill ? [bill] : []);

  const examBill = billsForBooking.find(b => b.billType === "EXAM");
  const treatmentBills = billsForBooking.filter(
    b => b.billType === "TEST" || b.billType === "PRESCRIPTION" || b.billType === "TREATMENT"
  );
  const matchedQueueBooking = ticket.bookingCode
    ? (queueList || []).find(q => q.bookingCode === ticket.bookingCode)
    : null;

  const explicitCls = isClsOrTreatmentTicketPure(ticket, pendingBills);
  const isClsOnly = explicitCls && !examBill;

  let consultationFee = 0;
  if (!ticket.isPaid && !isClsOnly) {
    if (examBill && Number(examBill.totalAmount) > 0) {
      consultationFee = Number(examBill.totalAmount);
    } else if (matchedQueueBooking && !matchedQueueBooking.isPaid && Number(matchedQueueBooking.price) > 0) {
      consultationFee = Number(matchedQueueBooking.price);
    } else if (matchedQueueBooking && matchedQueueBooking.isPaid && treatmentBills.length > 0) {
      consultationFee = 0;
    } else if (ticket.price != null && Number(ticket.price) > 0) {
      consultationFee = Number(ticket.price);
    }
  }

  let testItems = [];
  const sourceBills = treatmentBills.length > 0 ? treatmentBills : (bill ? [bill] : []);
  sourceBills.forEach(b => {
    if (b && Array.isArray(b.items)) {
      b.items.forEach(i => {
        if (
          i.category === "TEST" ||
          i.category === "MEDICINE" ||
          i.itemType === "LAB_TEST" ||
          i.itemType === "SERVICE"
        ) {
          testItems.push({
            ...i,
            itemName: i.itemName || i.name || "Chỉ định Cận lâm sàng / Thuốc",
            unitPrice: Number(i.unitPrice ?? i.totalPrice ?? 0),
            totalPrice: Number(i.totalPrice ?? i.unitPrice ?? 0)
          });
        }
      });
    }
  });

  if (isClsOnly && testItems.length === 0) {
    const fallbackAmt = Number(ticket.testFee ?? bill?.totalAmount ?? ticket.price ?? 0);
    if (fallbackAmt > 0) {
      testItems.push({
        itemId: ticket.billId || ticket.ticketId || "CLS-FEE",
        itemName: "Chi phí Cận lâm sàng & Xét nghiệm",
        unitPrice: fallbackAmt,
        totalPrice: fallbackAmt,
        category: "TEST"
      });
    }
  }

  const testFee = testItems.reduce((acc, curr) => acc + (Number(curr.totalPrice) || Number(curr.unitPrice) || 0), 0);
  const totalDue = consultationFee + testFee;
  const targetBillId =
    (explicitCls && (ticket.billId || (String(ticket.ticketId || "").startsWith("BILL-") ? String(ticket.ticketId) : null))) ||
    (treatmentBills[0]?.billId) ||
    (bill?.billId) ||
    null;

  return { consultationFee, testFee, totalDue, testItems, targetBillId, isClsOnly: isClsOnly || (consultationFee === 0 && testFee > 0) };
};

export async function executePayAndDispatch({
  ticket,
  effectiveCounterId,
  paymentMethod = "CASH",
  amountGiven,
  paymentNotes,
  dispatchMode = "AUTO",
  selectedTargetRoomId,
  candidateRooms = [],
  leastLoadedRoom = null,
  isAlreadyPaid = false,
  queueList = [],
  pendingBills = [],
  axiosClient = axiosInstance
}) {
  if (!ticket) {
    return { success: false, error: "Không tìm thấy thông tin lượt khám cần thu viện phí!" };
  }

  const { consultationFee, testFee, totalDue, testItems, targetBillId, isClsOnly } = calculateTicketDuePure(ticket, { pendingBills, queueList });
  let receiptData = null;

  // Tìm mã lượt khám bookingId chuẩn nếu phiếu chưa gắn trực tiếp
  let effectiveBookingId = ticket.bookingId;
  if (!effectiveBookingId && ticket.bookingCode && queueList) {
    const matched = queueList.find(q => q.bookingCode === ticket.bookingCode);
    if (matched && matched.bookingId) {
      effectiveBookingId = matched.bookingId;
    }
  }
  if (!effectiveBookingId && ticket.ticketId) {
    const strId = String(ticket.ticketId);
    if (strId.length === 36 && strId.includes("-")) {
      effectiveBookingId = strId;
    }
  }

  // 1. Thực hiện thu tiền khám lâm sàng ban đầu nếu chưa thanh toán
  if (!isAlreadyPaid && consultationFee > 0 && (effectiveBookingId || ticket.bookingCode)) {
    const payPayload = {
      bookingId: (effectiveBookingId && String(effectiveBookingId).length === 36) ? effectiveBookingId : undefined,
      bookingCode: ticket.bookingCode || (!effectiveBookingId || String(effectiveBookingId).length !== 36 ? String(effectiveBookingId || ticket.ticketId) : undefined),
      amount: consultationFee,
      paymentMethod: paymentMethod || "CASH",
      cashierNotes: paymentNotes || `Thu tiền khám tại quầy dịch vụ cho phiếu ${ticket.ticketCode || ticket.bookingCode || ""}`
    };
    const payRes = await axiosClient.post("/api/nurse/reception/pay-at-clinic", payPayload);
    receiptData = payRes?.data?.data || payRes?.data;
    if (testFee <= 0) {
      ticket.isPaid = true;
    }
  }

  // 2. Thu tiền xét nghiệm CLS / Đơn thuốc nếu có chỉ định phát sinh và chưa trả
  if (!isAlreadyPaid && testFee > 0 && (targetBillId || ticket.bookingCode)) {
    const givenNum = Math.max(Number(amountGiven) || 0, totalDue);
    const testPayPayload = {
      bookingCode: targetBillId || ticket.bookingCode,
      paymentMethod: paymentMethod || "CASH",
      amountGiven: givenNum,
      notes: paymentNotes || `Thu phí xét nghiệm CLS tại quầy cho phiếu ${ticket.ticketCode || ticket.bookingCode || ""}`
    };
    if (consultationFee === 0) {
      const testRes = await axiosClient.post("/api/cashier/pay", testPayPayload);
      const cashData = testRes?.data?.data || testRes?.data;
      if (cashData) {
        receiptData = {
          ...cashData,
          paidAmount: cashData.totalAmount || testFee,
          phoneNumber: cashData.patientPhone || ticket.phoneNumber
        };
      }
      ticket.isPaid = true;
    } else {
      const testRes = await axiosClient.post("/api/cashier/pay", testPayPayload).catch(e => {
        console.warn("Lỗi thu phí CLS qua cashier API:", e);
        return null;
      });
      if (testRes?.data?.data) {
        receiptData = testRes.data.data;
      }
      ticket.isPaid = true;
    }
  }

  // Xác định buồng khám đích: Chỉ được chọn trong danh sách buồng hợp lệ của chuyên khoa
  const hasDeptInfo = Boolean(ticket.departmentId || (ticket.departmentName && ticket.departmentName.trim() !== ""));
  if (!isClsOnly && !hasDeptInfo) {
    const roomErrMsg = "Lượt tiếp đón thiếu thông tin chuyên khoa khám. Vui lòng cập nhật chuyên khoa trước khi điều phối buồng khám!";
    return { success: false, error: roomErrMsg, isPaid: ticket.isPaid };
  }

  if (!isClsOnly && (!candidateRooms || candidateRooms.length === 0)) {
    const roomErrMsg = `Không tìm thấy buồng khám hợp lệ thuộc chuyên khoa [${ticket.departmentName || ticket.departmentId || "chưa xác định"}]. Vui lòng cấu hình lịch trực hoặc buồng khám trước!`;
    return { success: false, error: roomErrMsg, isPaid: ticket.isPaid };
  }

  let targetRoom = null;
  if (!isClsOnly) {
    if (dispatchMode === "AUTO") {
      targetRoom = selectTargetRoomCandidate({ dispatchMode: "AUTO", candidateRooms, leastLoadedRoom });
      if (!targetRoom) {
        return { success: false, error: "Không có buồng khám hợp lệ để điều phối tự động.", isPaid: ticket.isPaid };
      }
    } else {
      if (!selectedTargetRoomId) {
        return { success: false, error: "Chưa chọn buồng khám. Vui lòng chọn một buồng khám trong danh sách hợp lệ của khoa!", isPaid: ticket.isPaid };
      }
      targetRoom = selectTargetRoomCandidate({ dispatchMode: "MANUAL", selectedTargetRoomId, candidateRooms });
      if (!targetRoom) {
        return { success: false, error: `Buồng khám đã chọn [ID: ${selectedTargetRoomId}] không hợp lệ hoặc không thuộc danh sách buồng khám của khoa. Vui lòng chọn lại!`, isPaid: ticket.isPaid };
      }
    }
  }

  const targetRoomId = targetRoom ? parseInt(targetRoom.roomId) : null;
  if (!isClsOnly && !targetRoomId) {
    return { success: false, error: "Chưa xác định được buồng khám hợp lệ. Vui lòng chọn buồng khám trước khi điều phối!", isPaid: ticket.isPaid };
  }

  const targetRoomName = targetRoom ? targetRoom.roomName : (ticket.roomName || (targetRoomId ? `Phòng ${targetRoomId}` : null));
  const targetDoctor = targetRoom ? targetRoom.doctorName : (ticket.doctorName || null);

  // 3. TỰ ĐỘNG HOÀN TẤT VÉ VÀ ĐƯA VÀO HÀNG ĐỢI PHÒNG KHÁM BÁC SĨ (NẾU LÀ VÉ TIẾP ĐÓN KHÁM BAN ĐẦU)
  const isNumericTicketId = ticket.ticketId != null && /^\d+$/.test(String(ticket.ticketId));
  let dispatchSucceeded = false;
  let dispatchErrorMsg = "";

  if (isClsOnly && !isNumericTicketId) {
    dispatchSucceeded = true;
  } else {
    try {
      if (isNumericTicketId) {
        await axiosClient.post(`/api/counters/${effectiveCounterId}/tickets/${ticket.ticketId}/complete`, {
          targetRoomId: targetRoomId
        });
        dispatchSucceeded = true;
      } else if (effectiveBookingId || ticket.ticketId || ticket.bookingCode) {
        const bId = effectiveBookingId || (ticket.ticketId && String(ticket.ticketId).length === 36 ? ticket.ticketId : undefined);
        await axiosClient.post(`/api/nurse/reception/dispatch`, {
          bookingId: bId,
          bookingCode: ticket.bookingCode,
          targetRoomId: targetRoomId,
          roomId: targetRoomId
        });
        dispatchSucceeded = true;
      } else {
        dispatchSucceeded = true;
      }
    } catch (dispErr) {
      dispatchErrorMsg = dispErr.response?.data?.message || dispErr.message || "Lỗi điều phối buồng khám";
    }
  }

  if (!dispatchSucceeded) {
    ticket.isPaid = true; // Đã trả tiền, nhưng dispatch lỗi -> cần thử lại
    return {
      success: false,
      dispatchRetryNeeded: true,
      isPaid: true,
      error: `Khoản phí đã được ghi nhận thành công, nhưng chưa thể điều phối vào buồng khám: ${dispatchErrorMsg}. Vui lòng chọn lại buồng khám và ấn [Thử Lại Điều Phối]!`,
      targetRoom
    };
  }

  return {
    success: true,
    dispatchRetryNeeded: false,
    isPaid: true,
    receiptData,
    targetRoom,
    targetRoomId,
    targetRoomName,
    targetDoctor,
    totalDue,
    consultationFee,
    testFee,
    testItems,
    isClsOnly
  };
}
