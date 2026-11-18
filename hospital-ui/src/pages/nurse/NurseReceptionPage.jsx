import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    MenuItem,
    Alert,
    Tooltip,
    InputAdornment,
    Card,
    CardContent,
    Divider,
    CircularProgress,
    Stack,
    Tabs,
    Tab
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import BadgeIcon from "@mui/icons-material/Badge";
import HistoryIcon from "@mui/icons-material/History";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import CheckIcon from "@mui/icons-material/Check";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import SpeedIcon from "@mui/icons-material/Speed";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentIcon from "@mui/icons-material/Payment";
import TvIcon from "@mui/icons-material/Tv";
import DevicesIcon from "@mui/icons-material/Devices";
import CampaignIcon from "@mui/icons-material/Campaign";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import StarsIcon from "@mui/icons-material/Stars";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";

import axiosInstance from "../../services/AxiosInstance";
import { formatDateTime, formatDate, formatCurrency } from "../../utils/formatters";
import { printThermalTicket, printReceipt } from "../../utils/printHelper";
import { BarcodeView } from "../../utils/barcodeGenerator";
import { speakCashierCall, playChime } from "../../services/voiceService";
import CounterManagementPanel from "../../components/nurse/CounterManagementPanel";

export default function NurseReceptionPage() {
    // 1. Quản lý trạng thái cốt lõi & Hàng đợi
    const [queueList, setQueueList] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState("ALL");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const [counterRefreshKey, setCounterRefreshKey] = useState(0);
    const [queueError, setQueueError] = useState("");
    const [queueLoading, setQueueLoading] = useState(false);

    // 2. Chuyển đổi Tab chức năng chính để ĐƠN GIẢN HÓA GIAO DIỆN
    // Tab 0: Quầy Dịch Vụ & Thu Viện Phí PayOS (Mặc định)
    // Tab 1: Danh Sách Bệnh Nhân Tiếp Đón & Phân Luồng
    // Tab 2: Giám Sát Tải Buồng Khám (Smart Load Balancing)
    const [activeMainTab, setActiveMainTab] = useState(0);

    // Bệnh nhân được kích hoạt gọi nộp tiền từ bảng tiếp đón
    const [patientToCall, setPatientToCall] = useState(null);

    // 3. Modal Tra cứu hồ sơ bệnh nhân cũ (Tái khám)
    const [openLookupModal, setOpenLookupModal] = useState(false);
    const [patientLookupQuery, setPatientLookupQuery] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);
    const [foundPatient, setFoundPatient] = useState(null);
    const [candidateProfiles, setCandidateProfiles] = useState([]);
    const [lookupSearched, setLookupSearched] = useState(false);

    // 4. Modal Tạo hồ sơ mới & Tiếp nhận cấp STT
    const [openCreateProfileModal, setOpenCreateProfileModal] = useState(false);
    const walkInKeyRef = useRef(null);
    const getWalkInKey = () => {
        if (!walkInKeyRef.current) {
            walkInKeyRef.current = "WALKIN-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        }
        return walkInKeyRef.current;
    };
    const [newProfile, setNewProfile] = useState({
        fullName: "",
        phoneNumber: "",
        identityCard: "",
        dateOfBirth: "",
        gender: "MALE",
        address: "",
        departmentId: "",
        roomName: "",
        doctorName: "",
        symptoms: "",
        bloodPressure: "",
        heartRate: "",
        temperature: "",
        spO2: "",
        height: "",
        weight: "",
        allergies: "",
        medicalHistory: ""
    });

    // 5. Modal Check-in QR 5 giây
    const [openQrCheckInDialog, setOpenQrCheckInDialog] = useState(false);
    const [qrFormData, setQrFormData] = useState({
        qrData: "",
        height: "",
        weight: "",
        bloodPressure: "",
        temperature: "",
        heartRate: "",
        spo2: "",
        nurseNotes: ""
    });
    const [qrSubmitting, setQrSubmitting] = useState(false);

    // 6. Modal In phiếu nhiệt & Xem chi tiết
    const [printTicket, setPrintTicket] = useState(null);
    const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);

    // Modal Xem trước biên lai A5
    const [openReceiptPreviewDialog, setOpenReceiptPreviewDialog] = useState(false);
    const [recentReceipt, setRecentReceipt] = useState(null);

    // Helper tính BMI chuẩn WHO WPRO
    const calculateNurseBMI = (weightKg, heightCm) => {
        const w = parseFloat(weightKg);
        const h = parseFloat(heightCm) / 100;
        if (!w || !h || h <= 0) return { bmi: "--", classification: "Chưa tính", color: "#64748b" };
        const bmiVal = (w / (h * h)).toFixed(1);
        let classification = "Bình thường";
        let color = "#16a34a";
        if (bmiVal < 18.5) {
            classification = "Thiếu cân";
            color = "#ea580c";
        } else if (bmiVal >= 23 && bmiVal < 25) {
            classification = "Tiền béo phì (WHO WPRO)";
            color = "#d97706";
        } else if (bmiVal >= 25) {
            classification = "Béo phì (WHO WPRO)";
            color = "#dc2626";
        }
        return { bmi: bmiVal, classification, color };
    };

    // Helper hiển thị nguồn tiếp nhận (Đặt lịch, Kiosk, Vãng lai)
    const renderReceptionSourceBadge = (source) => {
        switch (source) {
            case "ONLINE_APPOINTMENT":
                return (
                    <Chip
                        label="Đặt lịch hẹn"
                        size="small"
                        sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, bgcolor: "#EEF2FF", color: "#4338CA", border: "1px solid #C7D2FE" }}
                    />
                );
            case "KIOSK_TICKET":
                return (
                    <Chip
                        label="Lấy số Ki-ốt"
                        size="small"
                        sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, bgcolor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0" }}
                    />
                );
            case "COUNTER_WALKIN":
                return (
                    <Chip
                        label="Vãng lai tại quầy"
                        size="small"
                        sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700, bgcolor: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A" }}
                    />
                );
            default:
                return null;
        }
    };

    // Tải dữ liệu ban đầu
    useEffect(() => {
        loadData();
        const interval = setInterval(fetchQueueOnly, 8000);
        return () => clearInterval(interval);
    }, []);

    const fetchQueueOnly = async () => {
        try {
            setQueueLoading(true);
            const queueRes = await axiosInstance.get("/api/nurse/reception/queue");
            setQueueError("");
            const rawList = Array.isArray(queueRes?.data?.data)
                ? queueRes.data.data
                : (Array.isArray(queueRes?.data) ? queueRes.data : []);
            if (rawList) {
                const mapped = rawList.map((item, idx) => ({
                    bookingId: item.bookingId || `BK-${item.queueCode || idx + 1}`,
                    bookingCode: item.bookingCode || item.bookingId || `BK-${item.queueCode || idx + 1}`,
                    queueNumber: item.queueNumber || (idx + 1),
                    queueCode: item.queueCode || `#${item.queueNumber || idx + 1}`,
                    patientName: item.patientName || "Bệnh nhân",
                    phone: item.patientPhone || item.phone || "Chưa có dữ liệu",
                    departmentName: item.departmentName || "Khoa khám",
                    departmentId: item.departmentId,
                    roomName: item.roomName || "Chờ phân phòng",
                    roomId: item.roomId,
                    doctorName: item.doctorName || "Chưa phân công",
                    doctorId: item.doctorId,
                    status: item.status === "IN_PROGRESS" ? "EXAMINING" : item.status === "CONFIRMED" ? "WAITING" : item.status,
                    checkedInAt: item.checkedInAt || null,
                    checkInTime: item.checkedInAt?.slice(11, 16) || item.startTime || "--:--",
                    symptoms: item.symptoms || "Chưa ghi nhận",
                    isPaid: Boolean(item.isPaid),
                    price: item.price != null ? Number(item.price) : (item.examinationFee != null ? Number(item.examinationFee) : 0),
                    isDispatched: Boolean(item.isDispatched),
                    isPriority: Boolean(item.isPriority || (item.age && item.age >= 65)),
                    priorityReason: item.priorityReason || (item.isPriority ? "Đối tượng ưu tiên" : "")
                }));
                setQueueList(mapped);
            }
        } catch (err) {
            console.error("Lỗi cập nhật hàng đợi:", err);
            setQueueError("Không thể tải danh sách hàng đợi tiếp đón. Vui lòng kiểm tra kết nối mạng và thử lại.");
        } finally {
            setQueueLoading(false);
        }
    };

    const loadData = async () => {
        try {
            const [deptRes, roomRes] = await Promise.all([
                axiosInstance.get("/api/departments").catch(() => ({ data: [] })),
                axiosInstance.get("/api/departments/rooms/all").catch(() => ({ data: [] }))
            ]);

            const deptData = Array.isArray(deptRes.data?.data) ? deptRes.data.data : (Array.isArray(deptRes.data) ? deptRes.data : []);
            setDepartments(deptData);

            const roomData = Array.isArray(roomRes.data?.data) ? roomRes.data.data : (Array.isArray(roomRes.data) ? roomRes.data : []);
            setAllRooms(roomData);

            await fetchQueueOnly();
        } catch (err) {
            console.error(err);
        }
    };

    // Thống kê nhanh KPI
    const kpiStats = useMemo(() => {
        const unpaid = queueList.filter(q => !q.isPaid).length;
        const waiting = queueList.filter(q => q.isPaid && q.status === "WAITING").length;
        const examining = queueList.filter(q => q.status === "EXAMINING").length;
        const completed = queueList.filter(q => q.status === "COMPLETED").length;
        return { unpaid, waiting, examining, completed, total: queueList.length };
    }, [queueList]);

    // Bộ lọc chỉ giữ các buồng khám lâm sàng ngoại trú (loại bỏ phòng CLS, X-Quang, Nội trú, phòng Test/Audit)
    const isClinicalConsultationRoom = (r) => {
        if (!r || r.isActive === false) return false;
        const name = (r.roomName || "").trim();
        const lower = name.toLowerCase();
        if (!name || /^\d+$/.test(name)) return false;
        if (
            lower.startsWith("p-test") ||
            lower.startsWith("p-audit") ||
            lower.startsWith("p-load") ||
            lower.startsWith("p-mod") ||
            lower.includes("phòng test") ||
            lower.includes("phong test")
        ) {
            return false;
        }
        const nonConsultKeywords = [
            "x-quang", "xquang", "siêu âm", "sieu am", "xét nghiệm", "xet nghiem",
            "huyết học", "huyet hoc", "sinh hóa", "sinh hoa", "vi sinh",
            "chẩn đoán hình ảnh", "chan doan hinh anh", "cđha", "nội soi", "noi soi",
            "điện tim", "dien tim", "điện não", "dien nao", "ct scan", "mri",
            "cộng hưởng từ", "cong huong tu", "cắt lớp", "cat lop",
            "nội trú", "noi tru", "buồng nội trú", "buong noi tru", "buồng bệnh", "buong benh",
            "nhà thuốc", "nha thuoc", "dược", "duoc", "thu ngân", "thu ngan",
            "hành chính", "hanh chinh", "kho ", "phẫu thuật", "phau thuat", "phòng mổ", "phong mo",
            "hồi sức", "hoi suc", "icu"
        ];
        if (nonConsultKeywords.some(kw => lower.includes(kw))) return false;
        return true;
    };

    // Thống kê tải thực tế của từng phòng theo DepartmentId (Smart Load Balancing)
    const getDepartmentRoomStats = (deptId) => {
        const idStr = String(deptId || "");
        const deptRooms = allRooms.filter(r => (!deptId || String(r.departmentId) === idStr) && isClinicalConsultationRoom(r));
        const defaultRooms = deptRooms.map(r => ({
            roomId: String(r.roomId),
            roomName: r.roomName,
            doctorName: r.doctorName || "Chưa phân công",
            departmentName: r.departmentName || "Khoa Khám Bệnh"
        }));

        return defaultRooms.map(room => {
            const waitingCount = queueList.filter(q =>
                (q.roomName === room.roomName || q.roomName.includes(room.roomId)) && q.status === "WAITING"
            ).length;

            const examiningCount = queueList.filter(q =>
                (q.roomName === room.roomName || q.roomName.includes(room.roomId)) && q.status === "EXAMINING"
            ).length;

            let loadLevel = "LIGHT";
            if (waitingCount >= 5) loadLevel = "HEAVY";
            else if (waitingCount >= 3) loadLevel = "MEDIUM";

            return {
                ...room,
                waitingCount,
                examiningCount,
                totalActive: waitingCount + examiningCount,
                loadLevel
            };
        });
    };

    const shortestRoomForSelectedDept = useMemo(() => {
        const stats = getDepartmentRoomStats(selectedDepartment === "ALL" ? null : selectedDepartment);
        if (!stats || stats.length === 0) return null;
        return stats.reduce((prev, curr) => (curr.totalActive < prev.totalActive ? curr : prev));
    }, [allRooms, queueList, selectedDepartment]);

    // Hàm gọi nộp tiền từ danh sách: Chuyển sang Tab 0 và kích hoạt gọi số tại quầy
    const handleCallPatientToPay = (item) => {
        if (!item) return;
        // Giữ riêng mã vé quầy và mã hàng đợi khám: KHÔNG gán queueCode (khám) thành ticketCode (quầy)!
        setPatientToCall({
            ...item,
            ticketCode: item.ticketCode || null,
            bookingQueueCode: item.bookingQueueCode || item.queueCode || null,
            _timestamp: Date.now()
        });
        setActiveMainTab(0); // Tự động chuyển ngay sang Tab Quầy tiếp đón
        const ident = item.ticketCode ? `vé quầy ${item.ticketCode}` : (item.bookingCode ? `mã hẹn ${item.bookingCode}` : "");
        setFeedback({
            type: "info",
            message: `🔔 Đang chuyển bệnh nhân [${item.patientName}]${ident ? ` (${ident})` : ""} sang Quầy tiếp đón để nộp viện phí!`
        });
    };

    // Hàm thu tiền nhanh từ danh sách: Chuyển sang Tab 0 và mở modal PayOS VietQR
    const handleDirectPayPatient = (item) => {
        if (!item) return;
        setPatientToCall({
            ...item,
            ticketCode: item.ticketCode || null,
            bookingQueueCode: item.bookingQueueCode || item.queueCode || null,
            openPayNow: true,
            _timestamp: Date.now()
        });
        setActiveMainTab(0); // Chuyển sang Tab Quầy
    };

    // Tra cứu bệnh nhân cũ theo SĐT / CCCD
    const handleSearchOldPatient = async () => {
        if (!patientLookupQuery.trim()) {
            setFeedback({ type: "warning", message: "Vui lòng nhập SĐT hoặc Số CCCD/CMND để tra cứu!" });
            return;
        }

        setLookupLoading(true);
        setLookupSearched(true);
        setFoundPatient(null);
        setCandidateProfiles([]);

        try {
            const query = patientLookupQuery.trim();
            const res = await axiosInstance.get(`/api/patient-profiles?search=${encodeURIComponent(query)}`);
            const profiles = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);

            const { foundPatient: matchedPatient, candidateProfiles: matchedCandidates, feedback: fb } = processPatientLookupResults(query, profiles);
            setFoundPatient(matchedPatient);
            setCandidateProfiles(matchedCandidates);
            setFeedback(fb);
        } catch (err) {
            console.error("Lỗi tra cứu:", err);
            setFeedback({ type: "error", message: "Không thể kết nối đến máy chủ tra cứu hồ sơ." });
        } finally {
            setLookupLoading(false);
        }
    };

    // Điền thông tin bệnh nhân cũ vào form tiếp nhận mới
    const handleUseFoundPatient = (patientToUse = null) => {
        const target = patientToUse || foundPatient;
        if (!target) return;
        setNewProfile(prev => ({
            ...prev,
            fullName: target.fullName || "",
            phoneNumber: target.phoneNumber || "",
            identityCard: target.identityCard || "",
            dateOfBirth: target.dateOfBirth ? target.dateOfBirth.slice(0, 10) : "",
            gender: target.gender || "MALE",
            address: target.address || "",
            medicalHistory: target.medicalHistory || "",
            allergies: target.allergies || ""
        }));
        setOpenLookupModal(false);
        setOpenCreateProfileModal(true);
        setFeedback({
            type: "info",
            message: `Đã sao chép hồ sơ của bệnh nhân [${target.fullName}] vào phiếu tiếp nhận!`
        });
    };

    // Tiếp nhận bệnh nhân mới (Bệnh nhân vãng lai) - Lưu DB thực qua API
    const handleCreateProfileSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!newProfile.fullName?.trim() || !newProfile.phoneNumber?.trim()) {
            setFeedback({ type: "error", message: "Vui lòng nhập Họ tên và Số điện thoại bệnh nhân!" });
            return;
        }
        if (!newProfile.departmentId) {
            setFeedback({ type: "error", message: "Vui lòng chọn Khoa Khám Bệnh cho bệnh nhân!" });
            return;
        }

        try {
            const payload = {
                fullName: newProfile.fullName?.trim(),
                phoneNumber: newProfile.phoneNumber?.trim(),
                identityNumber: newProfile.identityCard?.trim() || null,
                gender: newProfile.gender || "MALE",
                dateOfBirth: newProfile.dateOfBirth || null,
                address: newProfile.address?.trim() || null,
                departmentId: Number(newProfile.departmentId),
                weight: newProfile.weight ? Number(newProfile.weight) : null,
                height: newProfile.height ? Number(newProfile.height) : null,
                bloodPressure: newProfile.bloodPressure?.trim() || null,
                temperature: newProfile.temperature ? Number(newProfile.temperature) : null,
                heartRate: newProfile.heartRate ? Number(newProfile.heartRate) : null,
                spo2: newProfile.spO2 ? Number(newProfile.spO2) : null,
                symptoms: newProfile.symptoms?.trim() || null,
                allergies: newProfile.allergies?.trim() || null,
                medicalHistory: newProfile.medicalHistory?.trim() || null,
                idempotencyKey: getWalkInKey()
            };

            const res = await axiosInstance.post("/api/nurse/reception/walk-in", payload);
            const data = res?.data?.data || res?.data;
            walkInKeyRef.current = null; // Reset key sau khi lưu thành công

            const newEntry = {
                bookingId: data.bookingId,
                bookingCode: data.bookingCode,
                queueNumber: data.queueNumber,
                queueCode: data.queueCode || (data.queueNumber != null ? `#${data.queueNumber}` : null),
                bookingQueueCode: data.queueCode || null,
                ticketCode: data.ticketCode || null,
                patientName: data.patientName || newProfile.fullName,
                phone: data.phone || newProfile.phoneNumber,
                departmentName: data.departmentName || departments.find(d => String(d.departmentId) === String(newProfile.departmentId))?.departmentName || "Chưa có thông tin khoa",
                departmentId: data.departmentId || newProfile.departmentId,
                roomName: data.roomName || "Chờ phân phòng",
                doctorName: data.doctorName || "Chưa phân công bác sĩ",
                status: data.status || "WAITING",
                isPaid: !!data.isPaid,
                price: data.price != null ? Number(data.price) : (data.examinationFee != null ? Number(data.examinationFee) : 0),
                checkInTime: data.checkInTime || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                symptoms: data.symptoms || newProfile.symptoms,
                vitals: data.vitals || null,
                receptionSource: data.receptionSource || "COUNTER_WALKIN"
            };

            setQueueList(prev => [newEntry, ...prev]);
            setOpenCreateProfileModal(false);
            setPrintTicket(newEntry);
            setFeedback({
                type: "success",
                message: `✅ Tiếp nhận thành công cho [${newEntry.patientName}]${newEntry.queueCode ? ` - STT khám: ${newEntry.queueCode}` : ""}!`
            });
            await fetchQueueOnly();
            setCounterRefreshKey(k => k + 1);
        } catch (err) {
            console.error("Lỗi tạo hồ sơ:", err);
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Không thể tạo hồ sơ tiếp nhận" });
        }
    };

    // Check-in QR 5 giây
    const handleQrCheckInSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!qrFormData.qrData.trim()) {
            setFeedback({ type: "warning", message: "Vui lòng quét hoặc nhập mã QR check-in!" });
            return;
        }

        setQrSubmitting(true);
        try {
            const payload = {
                qrData: qrFormData.qrData.trim(),
                height: qrFormData.height ? Number(qrFormData.height) : null,
                weight: qrFormData.weight ? Number(qrFormData.weight) : null,
                bloodPressure: qrFormData.bloodPressure?.trim() || null,
                temperature: qrFormData.temperature ? Number(qrFormData.temperature) : null,
                heartRate: qrFormData.heartRate ? Number(qrFormData.heartRate) : null,
                spo2: qrFormData.spo2 ? Number(qrFormData.spo2) : null,
                nurseNotes: qrFormData.nurseNotes?.trim() || null
            };

            const res = await axiosInstance.post("/api/nurse/check-in/qr", payload);
            const data = res?.data?.data || res?.data;

            setFeedback({
                type: "success",
                message: `✅ Check-in thành công: [${data?.patientName || "Bệnh nhân"}] - STT: #${data?.queueNumber || 1}!`
            });
            setOpenQrCheckInDialog(false);
            setQrFormData({
                qrData: "",
                height: "",
                weight: "",
                bloodPressure: "",
                temperature: "",
                heartRate: "",
                spo2: "",
                nurseNotes: ""
            });
            await fetchQueueOnly();
            setCounterRefreshKey(k => k + 1);
        } catch (err) {
            console.error("Lỗi check-in QR:", err);
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Check-in QR thất bại" });
        } finally {
            setQrSubmitting(false);
        }
    };

    // Cập nhật trạng thái lượt khám
    const handleUpdateStatus = async (bookingId, newStatus) => {
        setQueueList(prev => prev.map(item => {
            if (item.bookingId === bookingId) {
                return { ...item, status: newStatus };
            }
            return item;
        }));

        try {
            const backendStatus = (newStatus === "EXAMINING" || newStatus === "IN_PROGRESS")
                ? "IN_PROGRESS"
                : (newStatus === "WAITING" ? "CONFIRMED" : newStatus);

            await axiosInstance.put(`/api/nurse/reception/bookings/${bookingId}/status?status=${backendStatus}`).catch(() => null);
            setFeedback({ type: "success", message: `Đã cập nhật trạng thái ca khám thành công!` });
            fetchQueueOnly();
        } catch (err) {
            console.warn("Lỗi cập nhật trạng thái:", err);
        }
    };

    // Bộ lọc danh sách bệnh nhân
    const filteredQueue = useMemo(() => {
        return queueList.filter(item => {
            const matchDept = selectedDepartment === "ALL" || (item.departmentName && item.departmentName.includes(selectedDepartment)) || String(item.departmentId) === String(selectedDepartment);
            const matchSearch = !searchKeyword.trim() ||
                (item.patientName && item.patientName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
                (item.phone && item.phone.includes(searchKeyword)) ||
                (item.bookingCode && item.bookingCode.toLowerCase().includes(searchKeyword.toLowerCase())) ||
                (item.queueCode && item.queueCode.toLowerCase().includes(searchKeyword.toLowerCase()));
            return matchDept && matchSearch;
        });
    }, [queueList, selectedDepartment, searchKeyword]);

    return (
        <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
            {/* ========================================================================= */}
            {/* COCKPIT HEADER TIẾP ĐÓN: ĐỒNG BỘ MÀU TRẮNG Y TẾ #FFFFFF & KPI TỔNG QUAN */}
            {/* ========================================================================= */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 2.5,
                    borderRadius: 3,
                    bgcolor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box display="flex" alignItems="center" gap={1.8}>
                        <Box sx={{ p: 1.2, borderRadius: 2.5, bgcolor: "#F0FDFA", border: "1px solid #CCFBF1" }}>
                            <LocalHospitalIcon sx={{ fontSize: 32, color: "#0D9488" }} />
                        </Box>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h5" fontWeight="900" color="#0F172A">
                                    Bàn Tiếp Đón & Quầy Dịch Vụ Viện Phí
                                </Typography>
                                <Chip label="SmartHIS Station" size="small" sx={{ fontWeight: 800, bgcolor: "#F0FDFA", color: "#0D9488", border: "1px solid #99F6E4" }} />
                            </Box>
                            <Typography variant="body2" color="#64748B">
                                Hệ thống tiếp đón một chạm • Bốc số Kiosk • Phát loa gọi nộp viện phí • Cân bằng tải buồng khám
                            </Typography>
                        </Box>
                    </Box>

                    {/* HÀNG NÚT THAO TÁC NHANH TRỰC QUAN */}
                    <Stack direction="row" spacing={1.2} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<SearchIcon />}
                            onClick={() => { setOpenLookupModal(true); setFoundPatient(null); setLookupSearched(false); }}
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                fontSize: "0.85rem",
                                color: "#0369A1",
                                borderColor: "#BAE6FD",
                                bgcolor: "#FFFFFF",
                                "&:hover": { bgcolor: "#F0F9FF", borderColor: "#7DD3FC" }
                            }}
                        >
                            Tra Cứu Hồ Sơ Cũ
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<QrCodeScannerIcon />}
                            onClick={() => setOpenQrCheckInDialog(true)}
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                fontSize: "0.85rem",
                                bgcolor: "#059669",
                                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
                                "&:hover": { bgcolor: "#047857" }
                            }}
                        >
                            Quét QR (5s)
                        </Button>

                        <Button
                            variant="contained"
                            startIcon={<PersonAddIcon />}
                            onClick={() => setOpenCreateProfileModal(true)}
                            sx={{
                                borderRadius: 2.2,
                                fontWeight: 700,
                                textTransform: "none",
                                fontSize: "0.85rem",
                                bgcolor: "#0D9488",
                                boxShadow: "0 2px 8px rgba(13, 148, 136, 0.25)",
                                "&:hover": { bgcolor: "#0F766E" }
                            }}
                        >
                            + Tiếp Nhận & Cấp STT
                        </Button>

                        <Tooltip title="Mở cây lấy số Kiosk tự phục vụ cho bệnh nhân ngoài sảnh">
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<DevicesIcon />}
                                onClick={() => window.open("/kiosk", "_blank")}
                                sx={{ borderRadius: 2.2, fontWeight: 700, textTransform: "none", fontSize: "0.85rem", bgcolor: "#FFFFFF" }}
                            >
                                Kiosk Sảnh
                            </Button>
                        </Tooltip>

                        <Tooltip title="Mở màn hình TV gọi số phòng khám">
                            <Button
                                variant="outlined"
                                color="secondary"
                                startIcon={<TvIcon />}
                                onClick={() => window.open("/queue-display", "_blank")}
                                sx={{ borderRadius: 2.2, fontWeight: 700, textTransform: "none", fontSize: "0.85rem", bgcolor: "#FFFFFF" }}
                            >
                                LED TV Gọi Số
                            </Button>
                        </Tooltip>

                        <Tooltip title="Tải lại toàn bộ dữ liệu hàng đợi">
                            <IconButton
                                onClick={() => { loadData(); setCounterRefreshKey(k => k + 1); }}
                                sx={{ borderRadius: 2.2, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}
                            >
                                <RefreshIcon sx={{ color: "#64748B" }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                {/* DÃY KPI TRỰC QUAN GỌN GÀNG */}
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#FFFBEB", border: "1px solid #FDE68A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box>
                                <Typography variant="caption" fontWeight="800" color="#B45309">CHỜ THU TIỀN VIỆN PHÍ</Typography>
                                <Typography variant="h5" fontWeight="900" color="#D97706">{kpiStats.unpaid}</Typography>
                            </Box>
                            <PointOfSaleIcon sx={{ fontSize: 32, color: "#D97706", opacity: 0.8 }} />
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F0F9FF", border: "1px solid #BAE6FD", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box>
                                <Typography variant="caption" fontWeight="800" color="#0369A1">CHỜ GỌI KHÁM</Typography>
                                <Typography variant="h5" fontWeight="900" color="#0284C7">{kpiStats.waiting}</Typography>
                            </Box>
                            <HowToRegIcon sx={{ fontSize: 32, color: "#0284C7", opacity: 0.8 }} />
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F0FDFA", border: "1px solid #99F6E4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box>
                                <Typography variant="caption" fontWeight="800" color="#0F766E">ĐANG KHÁM</Typography>
                                <Typography variant="h5" fontWeight="900" color="#0D9488">{kpiStats.examining}</Typography>
                            </Box>
                            <MeetingRoomIcon sx={{ fontSize: 32, color: "#0D9488", opacity: 0.8 }} />
                        </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box>
                                <Typography variant="caption" fontWeight="800" color="#475569">ĐÃ KHÁM XONG</Typography>
                                <Typography variant="h5" fontWeight="900" color="#1E293B">{kpiStats.completed}</Typography>
                            </Box>
                            <CheckCircleIcon sx={{ fontSize: 32, color: "#16A34A", opacity: 0.8 }} />
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* THÔNG BÁO PHẢN HỒI */}
            {feedback.message && (
                <Alert
                    severity={feedback.type || "info"}
                    sx={{ mb: 2.5, borderRadius: 2.5 }}
                    onClose={() => setFeedback({ type: "", message: "" })}
                >
                    {feedback.message}
                </Alert>
            )}

            {/* ========================================================================= */}
            {/* THANH TABS ĐIỀU HƯỚNG CHỨC NĂNG CHÍNH (ĐƠN GIẢN HÓA - KHÔNG CUỘN DÀI) */}
            {/* ========================================================================= */}
            <Paper elevation={0} sx={{ mb: 2.5, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                <Tabs
                    value={activeMainTab}
                    onChange={(e, val) => setActiveMainTab(val)}
                    textColor="primary"
                    indicatorColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        px: 2,
                        "& .MuiTab-root": {
                            py: 1.8,
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            textTransform: "none",
                            gap: 1
                        }
                    }}
                >
                    <Tab
                        icon={<PointOfSaleIcon sx={{ fontSize: 20 }} />}
                        iconPosition="start"
                        label={
                            <Box display="flex" alignItems="center" gap={1}>
                                <span>Quầy Dịch Vụ & Thu Viện Phí PayOS</span>
                                {kpiStats.unpaid > 0 && (
                                    <Chip label={kpiStats.unpaid} color="warning" size="small" sx={{ fontWeight: 800, height: 20 }} />
                                )}
                            </Box>
                        }
                    />
                    <Tab
                        icon={<HowToRegIcon sx={{ fontSize: 20 }} />}
                        iconPosition="start"
                        label={
                            <Box display="flex" alignItems="center" gap={1}>
                                <span>Danh Sách Tiếp Đón & Phân Luồng</span>
                                <Chip label={kpiStats.total} size="small" sx={{ fontWeight: 800, height: 20 }} />
                            </Box>
                        }
                    />
                    <Tab
                        icon={<SpeedIcon sx={{ fontSize: 20 }} />}
                        iconPosition="start"
                        label="Giám Sát Tải Buồng Khám (Smart Clinic Load)"
                    />
                </Tabs>
            </Paper>

            {/* ========================================================================= */}
            {/* TAB 0: QUẦY DỊCH VỤ & GỌI SỐ THU VIỆN PHÍ (COUNTER MANAGEMENT) */}
            {/* ========================================================================= */}
            <Box id="counter-management-panel" sx={{ display: activeMainTab === 0 ? "block" : "none" }}>
                <CounterManagementPanel
                    onPatientDispatched={fetchQueueOnly}
                    refreshTrigger={counterRefreshKey}
                    rooms={allRooms}
                    queueList={queueList}
                    callPatientTrigger={patientToCall}
                    onClearCallTrigger={() => setPatientToCall(null)}
                />
            </Box>

            {/* ========================================================================= */}
            {/* TAB 1: DANH SÁCH BỆNH NHÂN TIẾP ĐÓN & PHÒNG KHÁM */}
            {/* ========================================================================= */}
            <Box sx={{ display: activeMainTab === 1 ? "block" : "none" }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                    }}
                >
                    {/* BỘ LỌC TÌM KIẾM & KHOA */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                        <Box display="flex" alignItems="center" gap={1.5} flex={1} minWidth={280}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Tìm theo tên bệnh nhân, SĐT, mã phiếu..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: "#94A3B8" }} />
                                        </InputAdornment>
                                    )
                                }}
                                sx={{ bgcolor: "#F8FAFC", borderRadius: 2 }}
                            />
                        </Box>

                        <Box display="flex" alignItems="center" gap={1.5}>
                            <TextField
                                select
                                size="small"
                                label="Lọc Khoa Khám"
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                sx={{ minWidth: 220, bgcolor: "#F8FAFC", borderRadius: 2 }}
                            >
                                <MenuItem value="ALL">Tất cả các khoa</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept.departmentId} value={dept.departmentId.toString()}>
                                        {dept.departmentName}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <Button
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={() => setOpenCreateProfileModal(true)}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    textTransform: "none",
                                    bgcolor: "#0D9488",
                                    "&:hover": { bgcolor: "#0F766E" }
                                }}
                            >
                                Tiếp Nhận
                            </Button>
                        </Box>
                    </Box>

                    {/* BẢNG DANH SÁCH BỆNH NHÂN TIẾP ĐÓN */}
                    {queueError && (
                        <Alert
                            severity="error"
                            action={
                                <Button color="inherit" size="small" onClick={fetchQueueOnly} sx={{ fontWeight: 800 }}>
                                    Thử Lại
                                </Button>
                            }
                            sx={{ mb: 2, borderRadius: 2 }}
                        >
                            {queueError}
                        </Alert>
                    )}
                    <TableContainer sx={{ borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
                        <Table size="medium">
                            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                <TableRow>
                                    <TableCell align="center" sx={{ fontWeight: 800, width: 70 }}>STT</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Mã Phiếu</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Họ Tên Bệnh Nhân</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Số Điện Thoại</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Chuyên Khoa & Phòng</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Triệu Chứng / Khám</TableCell>
                                    <TableCell sx={{ fontWeight: 800 }}>Viện Phí & Check-in</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800 }}>Trạng Thái</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 800 }}>Thao Tác Điều Phối</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredQueue.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 4, color: "#94A3B8" }}>
                                            Không tìm thấy lượt khám nào phù hợp.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredQueue.map((item) => (
                                        <TableRow
                                            key={item.bookingId}
                                            hover
                                            sx={{
                                                bgcolor: item.status === "EXAMINING" ? "rgba(13, 148, 136, 0.04)" : "inherit"
                                            }}
                                        >
                                            <TableCell align="center">
                                                <Chip
                                                    label={item.queueCode || `#${item.queueNumber}`}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 900,
                                                        fontSize: "0.8rem",
                                                        bgcolor: item.status === "EXAMINING" ? "#0D9488" : "#E2E8F0",
                                                        color: item.status === "EXAMINING" ? "#FFFFFF" : "#1E293B"
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: "#0284C7" }}>
                                                <Box display="flex" flexDirection="column" gap={0.5}>
                                                    <span>{item.bookingCode || item.bookingId}</span>
                                                    {renderReceptionSourceBadge(item.receptionSource)}
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    {item.isPriority && <StarsIcon sx={{ fontSize: 16, color: "#DC2626" }} />}
                                                    <span>{item.patientName}</span>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{item.phone}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="700">{item.departmentName}</Typography>
                                                <Typography variant="caption" color="primary" fontWeight="600">
                                                    {item.roomName} {item.doctorName ? `(${item.doctorName})` : ''}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 200, fontSize: "0.85rem", color: "#475569" }}>
                                                {item.symptoms}
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0.5} alignItems="flex-start">
                                                    <Typography variant="caption" color="#64748B">{item.checkInTime}</Typography>
                                                    <Chip
                                                        label={item.checkedInAt ? "Đã check-in" : "Chưa check-in"}
                                                        size="small"
                                                        color={item.checkedInAt ? "success" : "default"}
                                                        sx={{ height: 20, fontSize: "0.68rem" }}
                                                    />
                                                    <Chip
                                                        label={item.isPaid ? "Đã đóng tiền" : (item.price != null && Number(item.price) > 0 ? `Chưa nộp (${formatCurrency(item.price)})` : "Chưa có biểu phí")}
                                                        size="small"
                                                        color={item.isPaid ? "success" : "warning"}
                                                        sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }}
                                                    />
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">
                                                {(!item.isPaid || item.status === "PENDING_PAYMENT") && (
                                                    <Chip
                                                        label="Chờ thu tiền"
                                                        size="small"
                                                        sx={{ fontWeight: 800, bgcolor: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D", height: 22 }}
                                                    />
                                                )}
                                                {item.isPaid && item.status === "WAITING" && <Chip label="Đang chờ gọi" color="info" size="small" sx={{ fontWeight: 700, height: 22 }} />}
                                                {item.status === "EXAMINING" && <Chip label="Đang khám" color="primary" size="small" sx={{ fontWeight: 700, height: 22 }} />}
                                                {item.status === "COMPLETED" && <Chip label="Đã khám xong" color="success" size="small" sx={{ fontWeight: 700, height: 22 }} />}
                                                {item.status === "CANCELLED" && <Chip label="Vắng mặt" color="error" size="small" sx={{ fontWeight: 600, height: 22 }} />}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box display="flex" justifyContent="center" gap={0.8}>
                                                    {!item.isPaid ? (
                                                        <Box display="flex" gap={0.8}>
                                                            <Tooltip title="Phát chuông Ding-dong & Đọc loa gọi bệnh nhân này vào Quầy nộp tiền">
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    startIcon={<CampaignIcon sx={{ fontSize: 16 }} />}
                                                                    onClick={() => handleCallPatientToPay(item)}
                                                                    sx={{
                                                                        borderRadius: 2,
                                                                        fontWeight: 800,
                                                                        fontSize: "0.72rem",
                                                                        py: 0.4,
                                                                        px: 1.2,
                                                                        bgcolor: "#D97706",
                                                                        "&:hover": { bgcolor: "#B45309" },
                                                                        color: "#FFFFFF",
                                                                        textTransform: "none"
                                                                    }}
                                                                >
                                                                    Gọi Nộp Tiền
                                                                </Button>
                                                            </Tooltip>
                                                        </Box>
                                                    ) : (
                                                        item.status === "WAITING" && (
                                                            <Tooltip title="Mời vào phòng bác sĩ khám">
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    color="success"
                                                                    startIcon={<PlayArrowIcon />}
                                                                    onClick={() => handleUpdateStatus(item.bookingId, "EXAMINING")}
                                                                    sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.72rem", py: 0.4, textTransform: "none" }}
                                                                >
                                                                    Vào Khám
                                                                </Button>
                                                            </Tooltip>
                                                        )
                                                    )}

                                                    {item.status === "EXAMINING" && (
                                                        <Tooltip title="Xác nhận hoàn tất ca khám">
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                color="primary"
                                                                startIcon={<CheckCircleIcon />}
                                                                onClick={() => handleUpdateStatus(item.bookingId, "COMPLETED")}
                                                                sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.72rem", py: 0.4, textTransform: "none" }}
                                                            >
                                                                Đã Xong
                                                            </Button>
                                                        </Tooltip>
                                                    )}

                                                    {/* In lại phiếu nhiệt */}
                                                    <Tooltip title="In lại phiếu số thứ tự">
                                                        <IconButton
                                                            size="small"
                                                            color="info"
                                                            onClick={() => setPrintTicket(item)}
                                                        >
                                                            <PrintIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>

                                                    {/* Xem chi tiết */}
                                                    <Tooltip title="Xem chi tiết ca khám">
                                                        <IconButton
                                                            size="small"
                                                            color="secondary"
                                                            onClick={() => setSelectedBookingDetail(item)}
                                                        >
                                                            <VisibilityIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            {/* ========================================================================= */}
            {/* TAB 2: GIÁM SÁT TẢI BUỒNG KHÁM (SMART CLINIC LOAD BALANCING) */}
            {/* ========================================================================= */}
            <Box sx={{ display: activeMainTab === 2 ? "block" : "none" }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                        <Box>
                            <Typography variant="h6" fontWeight="900" color="#0F172A">
                                Bảng Giám Sát Tải Buồng Khám Thời Gian Thực
                            </Typography>
                            <Typography variant="body2" color="#64748B">
                                Tự động gợi ý buồng khám ít người nhất để điều dưỡng phân bổ bệnh nhân tránh ùn tắc
                            </Typography>
                        </Box>

                        <TextField
                            select
                            size="small"
                            label="Chọn Khoa Khám"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            sx={{ minWidth: 240, bgcolor: "#F8FAFC", borderRadius: 2 }}
                        >
                            <MenuItem value="ALL">Tất cả các khoa</MenuItem>
                            {departments.map((dept) => (
                                <MenuItem key={dept.departmentId} value={dept.departmentId.toString()}>
                                    {dept.departmentName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>

                    <Grid container spacing={2}>
                        {getDepartmentRoomStats(selectedDepartment === "ALL" ? null : selectedDepartment).map((room) => {
                            const isShortest = shortestRoomForSelectedDept && shortestRoomForSelectedDept.roomId === room.roomId;
                            const isHeavy = room.loadLevel === "HEAVY";
                            const isMedium = room.loadLevel === "MEDIUM";

                            return (
                                <Grid item xs={12} sm={6} md={4} key={room.roomId}>
                                    <Card
                                        elevation={0}
                                        sx={{
                                            borderRadius: 3,
                                            border: isShortest ? "2px solid #0D9488" : "1px solid #E2E8F0",
                                            bgcolor: isShortest ? "#F0FDFA" : "#FFFFFF",
                                            position: "relative",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                                        }}
                                    >
                                        {isShortest && (
                                            <Chip
                                                label="⭐ Buồng Rảnh Nhất"
                                                size="small"
                                                sx={{
                                                    position: "absolute",
                                                    top: 10,
                                                    right: 10,
                                                    bgcolor: "#0D9488",
                                                    color: "#FFFFFF",
                                                    fontWeight: 800,
                                                    fontSize: "0.7rem"
                                                }}
                                            />
                                        )}
                                        <CardContent sx={{ p: 2 }}>
                                            <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                                                {room.roomName}
                                            </Typography>
                                            <Typography variant="caption" color="#0284C7" fontWeight="700" display="block">
                                                {room.departmentName}
                                            </Typography>
                                            <Typography variant="body2" color="#64748B" sx={{ mb: 1.5 }}>
                                                Bác sĩ: <b>{room.doctorName}</b>
                                            </Typography>

                                            <Divider sx={{ my: 1 }} />

                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="caption" color="#64748B" display="block">Đang chờ</Typography>
                                                    <Typography variant="h6" fontWeight="900" color={isHeavy ? "#DC2626" : isMedium ? "#D97706" : "#16A34A"}>
                                                        {room.waitingCount} người
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="#64748B" display="block">Đang khám</Typography>
                                                    <Typography variant="h6" fontWeight="900" color="#0284C7">
                                                        {room.examiningCount} người
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={isHeavy ? "🔴 Quá tải" : isMedium ? "🟡 Bình thường" : "🟢 Rất rảnh"}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 800,
                                                        fontSize: "0.72rem",
                                                        bgcolor: isHeavy ? "#FEE2E2" : isMedium ? "#FEF3C7" : "#DCFCE7",
                                                        color: isHeavy ? "#991B1B" : isMedium ? "#92400E" : "#166534"
                                                    }}
                                                />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Paper>
            </Box>

            {/* ========================================================================= */}
            {/* MODAL 1: TRA CỨU HỒ SƠ BỆNH NHÂN CŨ (TÁI KHÁM) */}
            {/* ========================================================================= */}
            <Dialog open={openLookupModal} onClose={() => setOpenLookupModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Tra Cứu Hồ Sơ Bệnh Nhân Cũ (Tái Khám)</span>
                    <IconButton size="small" onClick={() => setOpenLookupModal(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    <Box display="flex" gap={1} mb={2}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Nhập SĐT, Số CCCD hoặc Họ Tên bệnh nhân..."
                            value={patientLookupQuery}
                            onChange={(e) => setPatientLookupQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSearchOldPatient(); }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94A3B8" }} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleSearchOldPatient}
                            disabled={lookupLoading}
                            sx={{ fontWeight: 700, borderRadius: 2, px: 2.5, bgcolor: "#0D9488", "&:hover": { bgcolor: "#0F766E" }, textTransform: "none" }}
                        >
                            {lookupLoading ? <CircularProgress size={20} color="inherit" /> : "Tra Cứu"}
                        </Button>
                    </Box>

                    {/* Danh sách ứng viên khi có nhiều kết quả */}
                    {candidateProfiles.length > 1 && (
                        <Box mb={2}>
                            <Typography variant="caption" fontWeight="800" color="#0F766E" sx={{ display: "block", mb: 1, textTransform: "uppercase" }}>
                                Tìm thấy {candidateProfiles.length} hồ sơ khả dụng (Chọn 1 hồ sơ bên dưới):
                            </Typography>
                            <Stack spacing={1} sx={{ maxHeight: 220, overflowY: "auto", pr: 0.5 }}>
                                {candidateProfiles.map(p => {
                                    const isSelected = foundPatient?.patientProfileId === p.patientProfileId || (foundPatient && foundPatient.phoneNumber === p.phoneNumber && foundPatient.fullName === p.fullName);
                                    return (
                                        <Card
                                            key={p.patientProfileId || (p.phoneNumber + p.fullName)}
                                            elevation={0}
                                            onClick={() => {
                                                setFoundPatient(p);
                                                setFeedback({ type: "success", message: `Đã chọn: ${p.fullName}` });
                                            }}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                cursor: "pointer",
                                                border: isSelected ? "2px solid #0D9488" : "1px solid #E2E8F0",
                                                bgcolor: isSelected ? "#F0FDFA" : "#FFFFFF",
                                                transition: "all 0.15s ease",
                                                "&:hover": { borderColor: "#0D9488", bgcolor: "#F8FAFC" }
                                            }}
                                        >
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" fontWeight="800" color="#0F172A">{p.fullName}</Typography>
                                                <Chip label={p.gender === "MALE" ? "Nam" : "Nữ"} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                                            </Box>
                                            <Typography variant="caption" color="#475569" display="block">
                                                SĐT: <b>{p.phoneNumber || "---"}</b> • NS: <b>{p.dateOfBirth ? formatDate(p.dateOfBirth) : "Chưa có dữ liệu"}</b>
                                                {p.identityCard ? ` • CCCD: •••• ${p.identityCard.slice(-4)}` : ""}
                                                {p.relationship ? ` • Quan hệ: ${p.relationship}` : ""}
                                            </Typography>
                                            <Box display="flex" justifyContent="flex-end" mt={0.5}>
                                                <Button
                                                    size="small"
                                                    variant={isSelected ? "contained" : "outlined"}
                                                    sx={{
                                                        fontSize: "0.72rem",
                                                        py: 0.2,
                                                        px: 1.2,
                                                        borderRadius: 1.5,
                                                        textTransform: "none",
                                                        fontWeight: 700,
                                                        bgcolor: isSelected ? "#0D9488" : "transparent",
                                                        color: isSelected ? "#FFFFFF" : "#0D9488",
                                                        borderColor: "#0D9488"
                                                    }}
                                                >
                                                    {isSelected ? "Đang Chọn" : "Chọn Hồ Sơ Này"}
                                                </Button>
                                            </Box>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}

                    {/* Thẻ bệnh nhân được chọn để xác nhận */}
                    {foundPatient && (
                        <Card elevation={0} sx={{ p: 2, border: "1.5px solid #0D9488", bgcolor: "#F0FDFA", borderRadius: 2.5 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Box>
                                    <Typography variant="caption" fontWeight="800" color="#0D9488" display="block">HỒ SƠ ĐÃ XÁC NHẬN:</Typography>
                                    <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                                        {foundPatient.fullName}
                                    </Typography>
                                </Box>
                                <Chip label={foundPatient.gender === "MALE" ? "Nam" : "Nữ"} color="primary" size="small" sx={{ fontWeight: 700 }} />
                            </Box>
                            <Typography variant="body2" color="#475569">
                                SĐT: <b>{foundPatient.phoneNumber}</b>
                                {foundPatient.identityCard ? ` • CCCD: •••• ${foundPatient.identityCard.slice(-4)}` : ""}
                            </Typography>
                            <Typography variant="body2" color="#475569">Ngày sinh: <b>{foundPatient.dateOfBirth ? formatDate(foundPatient.dateOfBirth) : "Chưa có dữ liệu"}</b></Typography>
                            <Typography variant="body2" color="#475569">Địa chỉ: <b>{foundPatient.address || "---"}</b></Typography>
                            {foundPatient.medicalHistory && (
                                <Typography variant="caption" color="#B45309" fontWeight="700" display="block" sx={{ mt: 1 }}>
                                    Tiền sử bệnh: {foundPatient.medicalHistory}
                                </Typography>
                            )}
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<PersonAddIcon />}
                                onClick={() => handleUseFoundPatient(foundPatient)}
                                sx={{ mt: 2, fontWeight: 800, borderRadius: 2, bgcolor: "#0D9488", "&:hover": { bgcolor: "#0F766E" }, textTransform: "none" }}
                            >
                                Tiếp Nhận Bệnh Nhân Này Vào Lượt Khám
                            </Button>
                        </Card>
                    )}

                    {!foundPatient && candidateProfiles.length === 0 && lookupSearched && !lookupLoading && (
                        <Box textAlign="center" py={3} color="#94A3B8">
                            <Typography variant="body2">Không tìm thấy bệnh nhân cũ với thông tin trên.</Typography>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL 2: TIẾP NHẬN BỆNH NHÂN MỚI & CẤP SỐ THỨ TỰ */}
            {/* ========================================================================= */}
            <Dialog open={openCreateProfileModal} onClose={() => setOpenCreateProfileModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Phiếu Tiếp Nhận & Cấp Số Thứ Tự Khám</span>
                    <IconButton size="small" onClick={() => setOpenCreateProfileModal(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    <form onSubmit={handleCreateProfileSubmit}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    size="small"
                                    label="Họ và tên bệnh nhân"
                                    value={newProfile.fullName}
                                    onChange={(e) => setNewProfile({ ...newProfile, fullName: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    required
                                    size="small"
                                    label="Số điện thoại"
                                    value={newProfile.phoneNumber}
                                    onChange={(e) => setNewProfile({ ...newProfile, phoneNumber: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Số CCCD / Định danh"
                                    value={newProfile.identityCard}
                                    onChange={(e) => setNewProfile({ ...newProfile, identityCard: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Ngày sinh"
                                    value={newProfile.dateOfBirth || ""}
                                    onChange={(e) => setNewProfile({ ...newProfile, dateOfBirth: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    helperText={!newProfile.dateOfBirth ? "Để trống nếu chưa có ngày sinh" : ""}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Giới tính"
                                    value={newProfile.gender}
                                    onChange={(e) => setNewProfile({ ...newProfile, gender: e.target.value })}
                                >
                                    <MenuItem value="MALE">Nam</MenuItem>
                                    <MenuItem value="FEMALE">Nữ</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Địa chỉ thường trú"
                                    value={newProfile.address}
                                    onChange={(e) => setNewProfile({ ...newProfile, address: e.target.value })}
                                />
                            </Grid>

                            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                            {/* CHỌN KHOA & BUỒNG KHÁM */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    required
                                    fullWidth
                                    size="small"
                                    label="Khoa Khám Bệnh *"
                                    value={newProfile.departmentId || ""}
                                    onChange={(e) => setNewProfile({ ...newProfile, departmentId: e.target.value })}
                                    error={!newProfile.departmentId}
                                    helperText={!newProfile.departmentId ? "Bắt buộc chọn chuyên khoa khám" : ""}
                                >
                                    <MenuItem value="" disabled>-- Vui lòng chọn khoa khám --</MenuItem>
                                    {departments.map((d) => (
                                        <MenuItem key={d.departmentId} value={d.departmentId.toString()}>
                                            {d.departmentName}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Phòng khám chỉ định"
                                    value={newProfile.roomName || (shortestRoomForSelectedDept?.roomName || "")}
                                    onChange={(e) => setNewProfile({ ...newProfile, roomName: e.target.value })}
                                    placeholder="Hệ thống tự động phân buồng rảnh nhất"
                                    helperText={shortestRoomForSelectedDept ? `Gợi ý buồng rảnh: ${shortestRoomForSelectedDept.roomName}` : "Hệ thống sẽ tự phân buồng khám rảnh nhất"}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Triệu chứng ban đầu / Lý do đến khám"
                                    value={newProfile.symptoms}
                                    onChange={(e) => setNewProfile({ ...newProfile, symptoms: e.target.value })}
                                />
                            </Grid>

                            {/* CHỈ SỐ SINH TỒN TIẾP ĐÓN BAN ĐẦU */}
                            <Grid item xs={12}><Divider sx={{ my: 1 }}><Chip label="Chỉ số sinh tồn ban đầu" size="small" /></Divider></Grid>

                            <Grid item xs={6} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Huyết áp"
                                    value={newProfile.bloodPressure}
                                    onChange={(e) => setNewProfile({ ...newProfile, bloodPressure: e.target.value })}
                                    placeholder="120/80"
                                />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nhịp tim (bpm)"
                                    value={newProfile.heartRate}
                                    onChange={(e) => setNewProfile({ ...newProfile, heartRate: e.target.value })}
                                    placeholder="76"
                                />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nhiệt độ (°C)"
                                    value={newProfile.temperature}
                                    onChange={(e) => setNewProfile({ ...newProfile, temperature: e.target.value })}
                                    placeholder="36.8"
                                />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="SpO2 (%)"
                                    value={newProfile.spO2}
                                    onChange={(e) => setNewProfile({ ...newProfile, spO2: e.target.value })}
                                    placeholder="98"
                                />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Chiều cao (cm)"
                                    value={newProfile.height}
                                    onChange={(e) => setNewProfile({ ...newProfile, height: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Cân nặng (kg)"
                                    value={newProfile.weight}
                                    onChange={(e) => setNewProfile({ ...newProfile, weight: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Box sx={{ p: 1, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <Typography variant="body2" color="#64748B">Thể trạng BMI:</Typography>
                                    <Chip
                                        label={`${calculateNurseBMI(newProfile.weight, newProfile.height).bmi} - ${calculateNurseBMI(newProfile.weight, newProfile.height).classification}`}
                                        size="small"
                                        sx={{ fontWeight: 800, bgcolor: calculateNurseBMI(newProfile.weight, newProfile.height).color, color: "#FFFFFF" }}
                                    />
                                </Box>
                            </Grid>
                        </Grid>

                        <DialogActions sx={{ px: 0, pt: 3 }}>
                            <Button onClick={() => setOpenCreateProfileModal(false)} sx={{ fontWeight: 700 }}>Hủy</Button>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<PrintIcon />}
                                sx={{ fontWeight: 800, borderRadius: 2, bgcolor: "#0D9488", "&:hover": { bgcolor: "#0F766E" }, px: 3 }}
                            >
                                Tiếp Nhận & In Phiếu STT
                            </Button>
                        </DialogActions>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL 3: CHECK-IN QR 5 GIÂY */}
            {/* ========================================================================= */}
            <Dialog open={openQrCheckInDialog} onClose={() => setOpenQrCheckInDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Quét Mã QR Tiếp Đón Nhanh (5 Giây)</span>
                    <IconButton size="small" onClick={() => setOpenQrCheckInDialog(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    <form onSubmit={handleQrCheckInSubmit}>
                        <TextField
                            fullWidth
                            required
                            autoFocus
                            size="medium"
                            label="Mã QR Check-in / Mã Phiếu Đặt Hẹn"
                            value={qrFormData.qrData}
                            onChange={(e) => setQrFormData({ ...qrFormData, qrData: e.target.value })}
                            placeholder="Quét mã vạch từ máy đọc hoặc dán mã tại đây..."
                            sx={{ mb: 2.5 }}
                        />

                        <Typography variant="subtitle2" fontWeight="800" color="#0369A1" mb={1.5}>
                            Chỉ Số Sinh Hiệu Nhanh (Sơ Tuyển Điều Dưỡng):
                        </Typography>

                        <Grid container spacing={1.5}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Huyết áp"
                                    value={qrFormData.bloodPressure}
                                    onChange={(e) => setQrFormData({ ...qrFormData, bloodPressure: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nhiệt độ (°C)"
                                    value={qrFormData.temperature}
                                    onChange={(e) => setQrFormData({ ...qrFormData, temperature: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Chiều cao (cm)"
                                    value={qrFormData.height}
                                    onChange={(e) => setQrFormData({ ...qrFormData, height: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Cân nặng (kg)"
                                    value={qrFormData.weight}
                                    onChange={(e) => setQrFormData({ ...qrFormData, weight: e.target.value })}
                                />
                            </Grid>
                        </Grid>

                        <DialogActions sx={{ px: 0, pt: 3 }}>
                            <Button onClick={() => setOpenQrCheckInDialog(false)} sx={{ fontWeight: 700 }}>Hủy</Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={qrSubmitting}
                                sx={{ fontWeight: 800, borderRadius: 2, bgcolor: "#059669", "&:hover": { bgcolor: "#047857" }, px: 3 }}
                            >
                                {qrSubmitting ? <CircularProgress size={20} color="inherit" /> : "Xác Nhận Check-in"}
                            </Button>
                        </DialogActions>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL 4: IN PHIẾU NHIỆT STT CÓ MÃ VẠCH CHECK-IN */}
            {/* ========================================================================= */}
            <Dialog open={Boolean(printTicket)} onClose={() => setPrintTicket(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, textAlign: "center", borderBottom: "1px solid #E2E8F0" }}>
                    Phiếu Tiếp Nhận Số Thứ Tự
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, textAlign: "center" }}>
                    {printTicket && (
                        <Box sx={{ p: 2, border: "1px dashed #CBD5E1", borderRadius: 2, bgcolor: "#F8FAFC" }}>
                            <Typography variant="subtitle2" fontWeight="900" color="#0F172A">
                                BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT
                            </Typography>
                            <Typography variant="caption" color="#64748B" display="block">
                                Phiếu Khám Bệnh & Cấp Số Thứ Tự
                            </Typography>

                            <Typography variant="h2" fontWeight="900" color="#0D9488" sx={{ my: 1.5, letterSpacing: 2 }}>
                                {printTicket.queueCode || `#${printTicket.queueNumber}`}
                            </Typography>

                            <Typography variant="h6" fontWeight="900" color="#0F172A">
                                {printTicket.patientName?.toUpperCase()}
                            </Typography>
                            <Typography variant="body2" color="#64748B">SĐT: {printTicket.phone}</Typography>

                            <Box sx={{ my: 1.5, p: 1, bgcolor: "#FFFFFF", borderRadius: 1.5, border: "1px solid #E2E8F0" }}>
                                <Typography variant="body2" fontWeight="700" color="#0284C7">
                                    {printTicket.departmentName}
                                </Typography>
                                <Typography variant="caption" fontWeight="800" color="#0D9488">
                                    {printTicket.roomName} • {printTicket.doctorName}
                                </Typography>
                            </Box>

                            <BarcodeView value={printTicket.bookingCode || printTicket.bookingId} />

                            <Typography variant="caption" color="#94A3B8" display="block" sx={{ mt: 1 }}>
                                Vui lòng theo dõi màn hình TV và loa phát thanh tại sảnh.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
                    <Button onClick={() => setPrintTicket(null)} sx={{ fontWeight: 700 }}>Đóng</Button>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={() => {
                            if (printTicket) {
                                printThermalTicket({
                                    queueNumber: printTicket.queueNumber,
                                    queueCode: printTicket.queueCode,
                                    patientName: printTicket.patientName,
                                    roomName: printTicket.roomName,
                                    departmentName: printTicket.departmentName,
                                    bookingCode: printTicket.bookingCode
                                });
                            }
                        }}
                        sx={{ fontWeight: 800, borderRadius: 2, bgcolor: "#0284C7", "&:hover": { bgcolor: "#0369A1" } }}
                    >
                        In Phiếu Nhiệt
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL 5: XEM CHI TIẾT LƯỢT KHÁM */}
            {/* ========================================================================= */}
            <Dialog open={Boolean(selectedBookingDetail)} onClose={() => setSelectedBookingDetail(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Chi Tiết Lượt Khám ({selectedBookingDetail?.queueCode})</span>
                    <IconButton size="small" onClick={() => setSelectedBookingDetail(null)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5 }}>
                    {selectedBookingDetail && (
                        <Stack spacing={1.5}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6" fontWeight="900" color="#0F172A">{selectedBookingDetail.patientName}</Typography>
                                <Chip label={selectedBookingDetail.isPaid ? "Đã Đóng Tiền" : "Chưa Nộp Tiền"} color={selectedBookingDetail.isPaid ? "success" : "warning"} size="small" sx={{ fontWeight: 800 }} />
                            </Box>
                            <Typography variant="body2">SĐT: <b>{selectedBookingDetail.phone}</b> • Mã phiếu: <b>{selectedBookingDetail.bookingCode}</b></Typography>
                            <Typography variant="body2">Khoa: <b>{selectedBookingDetail.departmentName}</b> • Phòng: <b>{selectedBookingDetail.roomName}</b></Typography>
                            <Typography variant="body2">Bác sĩ: <b>{selectedBookingDetail.doctorName}</b></Typography>
                            <Typography variant="body2">Lý do khám / Triệu chứng: <b>{selectedBookingDetail.symptoms}</b></Typography>
                            <Typography variant="body2">Tiền khám: <b>{selectedBookingDetail.price != null && Number(selectedBookingDetail.price) > 0 ? formatCurrency(selectedBookingDetail.price) : "Chưa có biểu phí (0 đ)"}</b></Typography>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSelectedBookingDetail(null)} sx={{ fontWeight: 700 }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export function processPatientLookupResults(query, profiles = []) {
    const trimmedQuery = (query || "").trim();
    const cccdMatches = profiles.filter(p => p.identityCard && p.identityCard.trim() === trimmedQuery);

    if (cccdMatches.length === 1) {
        return {
            foundPatient: cccdMatches[0],
            candidateProfiles: cccdMatches,
            feedback: { type: "success", message: `Đã tìm thấy hồ sơ chính xác: ${cccdMatches[0].fullName}` }
        };
    } else if (profiles.length === 1) {
        return {
            foundPatient: profiles[0],
            candidateProfiles: profiles,
            feedback: { type: "success", message: `Đã tìm thấy 1 hồ sơ phù hợp: ${profiles[0].fullName}` }
        };
    } else if (profiles.length > 1) {
        return {
            foundPatient: null,
            candidateProfiles: profiles,
            feedback: { type: "info", message: `Tìm thấy ${profiles.length} hồ sơ khả dụng. Vui lòng đối chiếu và chọn đúng người bệnh bên dưới.` }
        };
    } else {
        return {
            foundPatient: null,
            candidateProfiles: [],
            feedback: { type: "info", message: "Không tìm thấy hồ sơ cũ phù hợp. Điều dưỡng có thể bấm Tiếp Nhận Mới để đăng ký." }
        };
    }
}
