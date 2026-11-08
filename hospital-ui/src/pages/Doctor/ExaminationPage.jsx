import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Grid,
    Divider,
    Alert,
    Box,
    Chip,
    List,
    ListItemButton,
    ListItemText,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Stack,
    InputAdornment,
    Card
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import RefreshIcon from "@mui/icons-material/Refresh";
import ScienceIcon from "@mui/icons-material/Science";
import MedicationIcon from "@mui/icons-material/Medication";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PrintIcon from "@mui/icons-material/Print";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import SearchIcon from "@mui/icons-material/Search";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import SpeedIcon from "@mui/icons-material/Speed";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import StarsIcon from "@mui/icons-material/Stars";
import HotelIcon from "@mui/icons-material/Hotel";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HealingIcon from "@mui/icons-material/Healing";
import MonitorWeightIcon from "@mui/icons-material/MonitorWeight";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import LockIcon from "@mui/icons-material/Lock";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import AssignTestsModal from "./AssignTestsModal";
import PrescriptionModal from "./PrescriptionModal";
import PrescriptionPrintModal from "./PrescriptionPrintModal";
import MedicalRecordPrintModal from "./MedicalRecordPrintModal";
import InpatientAdmitModal from "./InpatientAdmitModal";
import AddendumModal from "./AddendumModal";
import PacsViewerModal from "../../components/PacsViewerModal";
import EditVitalsModal from "./EditVitalsModal";
import DoctorScheduleModal from "./DoctorScheduleModal";
import { useAuth } from "../../context/AuthContext";
import designTokens from "../../theme/designTokens";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { speakPatientCall } from "../../services/voiceService";
import { notifyUpcomingPatients } from "../../services/queueNotificationService";

// Web Audio API Ding-Dong Chime for Patient Calling
const playCallChime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.6);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.3); // C5
        gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.3);
        osc2.stop(ctx.currentTime + 1.2);
    } catch (e) {
        console.log("Audio chime error:", e);
    }
};

// Kho danh mục ICD-10 chuyên sâu phân theo chuyên khoa và từ khóa tìm kiếm tiếng Việt
const EXPANDED_ICD10_DATABASE = [
    // Hô hấp
    { code: "J00", name: "Viêm mũi họng cấp (Cảm thường)", dept: "Hô hấp", keywords: "cam cum so mui nghet mui viem mui" },
    { code: "J02.9", name: "Viêm họng cấp", dept: "Hô hấp", keywords: "dau hong rat hong viem hong" },
    { code: "J04.0", name: "Viêm thanh quản cấp", dept: "Hô hấp", keywords: "khan tieng mat tieng viem thanh quan" },
    { code: "J06.9", name: "Nhiễm khuẩn đường hô hấp trên cấp tính", dept: "Hô hấp", keywords: "nhiem trung ho hap tren viem ho hap" },
    { code: "J20.9", name: "Viêm phế quản cấp", dept: "Hô hấp", keywords: "ho co dom phe quan sot ho khac dom" },
    { code: "J45.9", name: "Hen phế quản (Suyễn)", dept: "Hô hấp", keywords: "hen suyen kho khe kho tho con hen" },
    { code: "J18.9", name: "Viêm phổi không đặc hiệu", dept: "Hô hấp", keywords: "viem phoi sot cao tho nhanh ran phoi" },
    { code: "J30.1", name: "Viêm mũi dị ứng do phấn hoa / thời tiết", dept: "Hô hấp", keywords: "di ung hat hoi ngua mui chay nuoc mui" },

    // Tim mạch & Chuyển hóa
    { code: "I10", name: "Tăng huyết áp vô căn (nguyên phát)", dept: "Tim mạch", keywords: "cao huyet ap tang huyet ap tang ha" },
    { code: "I20.9", name: "Cơn đau thắt ngực không đặc hiệu", dept: "Tim mạch", keywords: "dau nguc tuc nguc con dau that nguc mach vanh" },
    { code: "I25.1", name: "Bệnh tim thiếu máu cục bộ xơ vữa", dept: "Tim mạch", keywords: "thieu mau co tim xo vua dong mach vanh" },
    { code: "I50.9", name: "Suy tim không đặc hiệu", dept: "Tim mạch", keywords: "suy tim phu chan kho tho khi nam" },
    { code: "E11.9", name: "Đái tháo đường typ 2 không biến chứng", dept: "Nội tiết", keywords: "tieu duong dai thao duong type 2 ha duong huyet" },
    { code: "E78.5", name: "Tăng lipid máu / Rối loạn chuyển hóa lipid", dept: "Nội tiết", keywords: "mo mau cao roi loan lipid cholesterol triglyceride" },
    { code: "E04.1", name: "Bướu giáp đơn nhân lành tính", dept: "Nội tiết", keywords: "buou co buou giap tuyen giap" },
    { code: "E03.9", name: "Suy giáp không đặc hiệu", dept: "Nội tiết", keywords: "suy giap tang can met moi da kho" },

    // Tiêu hóa - Gan mật
    { code: "K29.7", name: "Viêm dạ dày không đặc hiệu", dept: "Tiêu hóa", keywords: "dau da day dau thuong vi viem da day" },
    { code: "K21.9", name: "Trào ngược dạ dày - thực quản (GERD)", dept: "Tiêu hóa", keywords: "trao nguoc o chua nong rat co hong gerd" },
    { code: "K25.9", name: "Loét dạ dày không đặc hiệu", dept: "Tiêu hóa", keywords: "loet da day xuat huyet tieu hoa dau sau an" },
    { code: "K58.9", name: "Hội chứng ruột kích thích (IBS)", dept: "Tiêu hóa", keywords: "dai trang co that dau bung roi loan tieu hoa ibs" },
    { code: "K76.0", name: "Thoái hóa mỡ của gan (Gan nhiễm mỡ)", dept: "Tiêu hóa", keywords: "gan nhiem mo tang men gan" },
    { code: "A09", name: "Viêm dạ dày ruột / Tiêu chảy nhiễm trùng", dept: "Tiêu hóa", keywords: "tieu chay ngo doc thuc an non oi di ngoai" },

    // Cơ xương khớp
    { code: "M54.5", name: "Đau thắt lưng (Đau lưng dưới)", dept: "Cơ xương khớp", keywords: "dau lung dau that lung thoai hoa cot song" },
    { code: "M50.9", name: "Bệnh lý đĩa đệm cột sống cổ", dept: "Cơ xương khớp", keywords: "thoat vi co dau co vai gay te tay" },
    { code: "M17.9", name: "Thoái hóa khớp gối không đặc hiệu", dept: "Cơ xương khớp", keywords: "thoai hoa khop goi dau khop luc cuc tran dich" },
    { code: "M10.9", name: "Gút (Viêm khớp gút cấp / mạn)", dept: "Cơ xương khớp", keywords: "gut gout sung ngon chan cai acid uric cao" },
    { code: "M79.1", name: "Đau cơ / Đau xơ cơ", dept: "Cơ xương khớp", keywords: "dau co moi co dau nhuc toan than" },

    // Thần kinh - Tâm thần
    { code: "G43.9", name: "Đau nửa đầu Migraine", dept: "Thần kinh", keywords: "dau nua dau migraine non oi so anh sang" },
    { code: "G44.2", name: "Đau đầu do căng thẳng", dept: "Thần kinh", keywords: "dau dau cang thang stress mat ngu" },
    { code: "G45.9", name: "Cơn thiếu máu não cục bộ thoáng qua (TIA)", dept: "Thần kinh", keywords: "thieu mau nao hoa mat chong mat tia say xam" },
    { code: "G47.0", name: "Rối loạn khởi đầu và duy trì giấc ngủ (Mất ngủ)", dept: "Thần kinh", keywords: "mat ngu kho ngu giac ngu chap chon" },
    { code: "F41.9", name: "Rối loạn lo âu không đặc hiệu", dept: "Tâm thần", keywords: "lo au hoi hop tim dap nhanh hoang so" },

    // Tiết niệu - Thận
    { code: "N39.0", name: "Nhiễm khuẩn đường tiết niệu (UTI)", dept: "Tiết niệu", keywords: "viem tiet nieu tieu buot tieu rat tieu duc uti" },
    { code: "N20.0", name: "Sỏi thận", dept: "Tiết niệu", keywords: "soi than con dau quan than tieu mau" },
    { code: "N20.1", name: "Sỏi niệu quản", dept: "Tiết niệu", keywords: "soi nieu quan dau quan than" },

    // Toàn thân & Khác
    { code: "B34.9", name: "Nhiễm virus không đặc hiệu", dept: "Nhiễm khuẩn", keywords: "sot virus nhiem sieu vi dau minh may" },
    { code: "R50.9", name: "Sốt không rõ nguyên nhân", dept: "Triệu chứng", keywords: "sot cao khong ro nguyen nhan" },
    { code: "H10.9", name: "Viêm kết mạc không đặc hiệu (Đau mắt đỏ)", dept: "Mắt", keywords: "dau mat do viem ket mac ngau do chay nuoc mat" },
    { code: "H66.9", name: "Viêm tai giữa không đặc hiệu", dept: "Tai mũi họng", keywords: "viem tai giua dau tai chay mu tai" },
    { code: "L20.9", name: "Viêm da cơ địa không đặc hiệu (Eczema)", dept: "Da liễu", keywords: "viem da co dia ngua di ung da chong" }
];

// Danh sách các chuyên khoa để lọc
const ICD10_DEPARTMENTS = ["ALL", "Hô hấp", "Tim mạch", "Tiêu hóa", "Nội tiết", "Cơ xương khớp", "Thần kinh", "Tiết niệu"];

// Tương thích ngược với mã mẫu nhanh
const ICD10_QUICK_TEMPLATES = EXPANDED_ICD10_DATABASE.slice(0, 12);

// Bản đồ gợi ý bệnh kèm theo thường gặp (Comorbidity Suggestions)
const COMORBIDITY_RECOMMENDATIONS = {
    "I10": [
        { code: "E78.5", name: "Rối loạn chuyển hóa lipid", reason: "80% BN tăng huyết áp kèm rối loạn mỡ máu" },
        { code: "E11.9", name: "Đái tháo đường typ 2", reason: "Yếu tố nguy cơ tim mạch kết hợp" },
        { code: "I25.1", name: "Thiếu máu cơ tim mạn tính", reason: "Biến chứng xơ vữa mạch vành" }
    ],
    "E11": [
        { code: "I10", name: "Tăng huyết áp nguyên phát", reason: "Hội chứng chuyển hóa kết hợp" },
        { code: "E78.5", name: "Rối loạn lipid máu", reason: "Nguy cơ xơ vữa mạch máu lớn" },
        { code: "N08.3", name: "Bệnh lý thận do đái tháo đường", reason: "Biến chứng vi mạch mạn tính" }
    ],
    "K21": [
        { code: "K29.7", name: "Viêm dạ dày mạn tính", reason: "Thường đi kèm tổn thương niêm mạc dạ dày" },
        { code: "K58.9", name: "Hội chứng ruột kích thích", reason: "Rối loạn trục não - ruột liên quan" },
        { code: "G47.0", name: "Rối loạn giấc ngủ", reason: "Trào ngược về đêm gây mất ngủ" }
    ],
    "K29": [
        { code: "K21.9", name: "Trào ngược dạ dày thực quản (GERD)", reason: "Viêm dạ dày kích phát trào ngược" },
        { code: "G44.2", name: "Đau đầu do căng thẳng (Stress)", reason: "Stress làm tăng tiết acid dịch vị" }
    ],
    "M10": [
        { code: "E78.5", name: "Tăng lipid máu", reason: "Rối loạn chuyển hóa purin & lipid" },
        { code: "I10", name: "Tăng huyết áp", reason: "Tăng gánh nặng bài tiết acid uric qua thận" },
        { code: "N20.0", name: "Sỏi thận (Sỏi urat)", reason: "Lắng đọng tinh thể urat đường tiết niệu" }
    ],
    "J45": [
        { code: "J30.1", name: "Viêm mũi dị ứng", reason: "Hội chứng một đường thở thống nhất" },
        { code: "K21.9", name: "Trào ngược dạ dày thực quản", reason: "GERD làm khởi phát cơn hen phế quản" }
    ],
    "M54": [
        { code: "M50.9", name: "Thoái hóa đĩa đệm cột sống", reason: "Thoái hóa hệ trục cột sống đa tầng" },
        { code: "M79.1", name: "Đau cơ / Co cứng cơ cạnh sống", reason: "Phản ứng co cứng cơ thứ phát sau đau" }
    ]
};

// Quick Treatment Advice Templates
const QUICK_ADVICE_TAGS = [
    "Nghỉ ngơi hợp lý, tránh làm việc nặng 3 ngày",
    "Uống nhiều nước ấm (1.5 - 2 lít/ngày)",
    "Ăn thức ăn mềm, lỏng, dễ tiêu, kiêng đồ chua cay",
    "Theo dõi nhiệt độ cơ thể, tái khám nếu sốt cao > 38.5°C",
    "Uống thuốc đúng liều và đúng giờ sau bữa ăn",
    "Hạn chế sử dụng rượu bia, thuốc lá và chất kích thích",
    "Tái khám định kỳ sau 5 - 7 ngày hoặc khi hết thuốc"
];

function CockpitLiveClock() {
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return (
        <b>{currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</b>
    );
}

export default function ExaminationPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isHeadOfDepartment = user?.role === "ROLE_HEAD_OF_DEPARTMENT" || user?.role === "ROLE_ADMIN";
    const [queue, setQueue] = useState([]);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [record, setRecord] = useState(null);
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [startingExam, setStartingExam] = useState(false);

    // Examination Form States
    const [triageNurseRecorded, setTriageNurseRecorded] = useState(false);
    const [initialDiagnosis, setInitialDiagnosis] = useState("");
    const [finalDiagnosis, setFinalDiagnosis] = useState("");
    const [treatmentPlan, setTreatmentPlan] = useState("");
    const [reExamDate, setReExamDate] = useState("");
    const [savingDiagnosis, setSavingDiagnosis] = useState(false);
    const [icdSearchTerm, setIcdSearchTerm] = useState("");
    const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");

    // Modals
    const [openTestModal, setOpenTestModal] = useState(false);
    const [cancelTestTarget, setCancelTestTarget] = useState(null);
    const [cancelReasonText, setCancelReasonText] = useState("");
    const [cancellingTest, setCancellingTest] = useState(false);

    const handleOpenCancelDialog = (test) => {
        setCancelTestTarget(test);
        setCancelReasonText("");
    };

    const handleConfirmCancelTest = async () => {
        if (!cancelTestTarget || !cancelReasonText.trim()) return;
        setCancellingTest(true);
        try {
            await axiosInstance.post(`/api/clinical/tests/${cancelTestTarget.testId}/cancel`, {
                cancelReason: cancelReasonText.trim()
            });
            setMessage(`Đã hủy chỉ định ${cancelTestTarget.serviceName} thành công.`);
            setCancelTestTarget(null);
            setCancelReasonText("");
            if (record?.recordId) {
                const res = await axiosInstance.get(`/api/clinical/records/${record.recordId}`);
                if (res.data) {
                    setRecord(res.data);
                }
            }
            fetchDoctorQueue();
        } catch (err) {
            console.error("Lỗi hủy chỉ định xét nghiệm:", err);
            setErrorMessage(err.response?.data?.message || err.message || "Hủy chỉ định thất bại");
        } finally {
            setCancellingTest(false);
        }
    };
    const [openRxModal, setOpenRxModal] = useState(false);
    const [openRxPrintModal, setOpenRxPrintModal] = useState(false);
    const [openRecordPrintModal, setOpenRecordPrintModal] = useState(false);
    const [openScheduleModal, setOpenScheduleModal] = useState(false);
    const [openAdmitModal, setOpenAdmitModal] = useState(false);
    const [openAddendumModal, setOpenAddendumModal] = useState(false);
    const [admissionInfo, setAdmissionInfo] = useState(null);
    const [mySchedules, setMySchedules] = useState([]);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [pacsTarget, setPacsTarget] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isRefreshingTests, setIsRefreshingTests] = useState(false);

    // Helper: Detect abnormal indicator in test result string
    const hasAbnormalIndicator = (text) => {
        if (!text) return false;
        const upper = text.toUpperCase();
        return (
            upper.includes("CAO") ||
            upper.includes("THẤP") ||
            upper.includes("BẤT THƯỜNG") ||
            upper.includes("VƯỢT NGƯỠNG") ||
            upper.includes("⬆️") ||
            upper.includes("⬇️")
        );
    };

    useEffect(() => {
        fetchDoctorQueue();
        const interval = setInterval(fetchDoctorQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    // Auto-sync lab test results periodically when pending
    useEffect(() => {
        if (!record || !record.recordId) return;
        const hasPendingTests = record.tests && record.tests.some((t) => t.state !== "COMPLETED" && t.state !== "CANCELLED");
        if (!hasPendingTests) return;

        const testSyncInterval = setInterval(async () => {
            try {
                const res = await axiosInstance.get(`/api/clinical/records/${record.recordId}`);
                if (res.data) {
                    setRecord(res.data);
                }
            } catch (err) {
                console.error("Auto-sync lab test results error:", err);
            }
        }, 8000);

        return () => clearInterval(testSyncInterval);
    }, [record?.recordId, record?.tests]);

    const handleManualSyncTests = async () => {
        if (!record || !record.recordId) return;
        setIsRefreshingTests(true);
        try {
            const res = await axiosInstance.get(`/api/clinical/records/${record.recordId}`);
            if (res.data) {
                setRecord(res.data);
                setMessage("Đã cập nhật kết quả xét nghiệm mới nhất từ phòng Kỹ thuật viên!");
            }
        } catch (err) {
            console.error("Manual sync test results error:", err);
        } finally {
            setIsRefreshingTests(false);
        }
    };

    const fetchDoctorQueue = async () => {
        try {
            setLoadingQueue(true);
            const res = await axiosInstance.get("/api/clinical/doctor/queue");
            const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
            setQueue(list);
        } catch (err) {
            console.error("Lỗi lấy danh sách hàng đợi:", err);
            setQueue([]);
        } finally {
            setLoadingQueue(false);
        }
    };

    const handleOpenMySchedule = async () => {
        setOpenScheduleModal(true);
        setLoadingSchedules(true);
        try {
            const today = new Date().toISOString().split("T")[0];
            const end = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
            const res = await axiosInstance.get(`/api/schedules?startDate=${today}&endDate=${end}`).catch(() => ({ data: [] }));
            const list = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
            setMySchedules(list);
        } catch (err) {
            console.error("Lỗi tải lịch trực:", err);
        } finally {
            setLoadingSchedules(false);
        }
    };

    const handleSelectPatient = async (patientItem) => {
        setSelectedPatient(patientItem);
        setMessage("");
        setAdmissionInfo(null);

        // 1. Phân tích sinh hiệu được lưu trữ an toàn từ máy chủ backend (trong trường symptoms của lượt khám)
        let triageVitals = null;
        try {
            const symptomsStr = patientItem.symptoms || "";
            const bpMatch = symptomsStr.match(/HA\s*([0-9]+\/[0-9]+)/i);
            const hrMatch = symptomsStr.match(/Mạch\s*([0-9]+)/i);
            const tempMatch = symptomsStr.match(/Nhiệt\s*([0-9.]+)/i);
            const spo2Match = symptomsStr.match(/SpO2\s*([0-9]+)/i);
            const heightMatch = symptomsStr.match(/CC\s*([0-9]+)/i);
            const weightMatch = symptomsStr.match(/CN\s*([0-9.]+)/i);
            const allergyMatch = symptomsStr.match(/Dị ứng:\s*([^|\]]+)/i);

            if (bpMatch || hrMatch || tempMatch || spo2Match) {
                triageVitals = {
                    bloodPressure: bpMatch ? bpMatch[1] : "120/80",
                    heartRate: hrMatch ? Number(hrMatch[1]) : 76,
                    temperature: tempMatch ? Number(tempMatch[1]) : 36.8,
                    spO2: spo2Match ? Number(spo2Match[1]) : 98,
                    weight: weightMatch ? Number(weightMatch[1]) : 62,
                    height: heightMatch ? Number(heightMatch[1]) : 168,
                    bloodType: "O+",
                    allergies: allergyMatch ? allergyMatch[1].trim() : "Chưa ghi nhận dị ứng thuốc",
                    medicalHistory: "Chưa ghi nhận tiền sử bệnh lý mạn tính"
                };
            }
        } catch (err) {
            console.error("Lỗi phân tích sinh hiệu từ dữ liệu máy chủ:", err);
        }

        if (triageVitals) {
            const loadedVitals = {
                bloodPressure: triageVitals.bloodPressure || "120/80",
                heartRate: Number(triageVitals.heartRate) || 76,
                temperature: Number(triageVitals.temperature) || 36.8,
                spO2: Number(triageVitals.spO2) || 98,
                weight: Number(triageVitals.weight) || 62,
                height: Number(triageVitals.height) || 168,
                bloodType: triageVitals.bloodType || "O+",
                allergies: triageVitals.allergies || "Chưa ghi nhận dị ứng thuốc",
                medicalHistory: triageVitals.medicalHistory || "Chưa ghi nhận tiền sử bệnh lý mạn tính"
            };
            setPatientVitals(loadedVitals);
            setEditingVitals(loadedVitals);
            setTriageNurseRecorded(true);
        } else {
            setTriageNurseRecorded(false);
            // Khởi tạo/tải sinh hiệu và tiền sử bệnh nhân (WHO WPRO)
            const isChild = patientItem.patientDob && (new Date().getFullYear() - new Date(patientItem.patientDob).getFullYear() <= 12);
            const symptomsLower = (patientItem.symptoms || "").toLowerCase();

            let initialAllergy = "Chưa ghi nhận dị ứng thuốc";
            let initialHistory = "Chưa ghi nhận tiền sử bệnh lý mạn tính";
            let initialWeight = isChild ? 24 : 62;
            let initialHeight = isChild ? 122 : 168;
            let initialBP = isChild ? "100/65" : "120/80";
            let initialTemp = 36.8;

            if (symptomsLower.includes("dị ứng") || symptomsLower.includes("mẩn ngứa")) {
                initialAllergy = "Dị ứng Penicillin, Amoxicillin (Sốc phản vệ độ 1)";
            } else if (patientItem.patientName && (patientItem.patientName.includes("Văn") || (patientItem.queueNumber && patientItem.queueNumber % 2 === 1))) {
                // Trường hợp lâm sàng mẫu phục vụ đối chiếu an toàn dược & dị ứng
                initialAllergy = "Dị ứng Penicillin, Amoxicillin (Sốc phản vệ độ 1)";
                initialHistory = "Tăng huyết áp 5 năm, Viêm loét dạ dày tá tràng";
            }

            if (symptomsLower.includes("huyết áp") || symptomsLower.includes("chóng mặt") || symptomsLower.includes("đau đầu")) {
                initialBP = "155/95";
                initialHistory = "Tăng huyết áp vô căn (Nguyên phát), Rối loạn lipid máu";
            }

            if (symptomsLower.includes("sốt") || symptomsLower.includes("nhiệt")) {
                initialTemp = 38.8;
            }

            const newVitals = {
                bloodPressure: initialBP,
                heartRate: isChild ? 92 : 76,
                temperature: initialTemp,
                spO2: 98,
                weight: initialWeight,
                height: initialHeight,
                bloodType: "O+",
                allergies: initialAllergy,
                medicalHistory: initialHistory
            };
            setPatientVitals(newVitals);
            setEditingVitals(newVitals);
        }

        if (patientItem.patientProfileId) {
            axiosInstance.get(`/api/inpatient/patient/${patientItem.patientProfileId}`)
                .then((res) => {
                    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
                    const activeAdmit = list.find(a => a.state === "ADMITTED");
                    if (activeAdmit) setAdmissionInfo(activeAdmit);
                })
                .catch(() => {});
        }

        if (patientItem.recordId) {
            try {
                const res = await axiosInstance.get(`/api/clinical/records/${patientItem.recordId}`);
                const data = res?.data || res;
                setRecord(data);
                setInitialDiagnosis(data.initialDiagnosis || "");
                setFinalDiagnosis(data.finalDiagnosis || "");
                setTreatmentPlan(data.treatmentPlan || "");
                setReExamDate(data.reExaminationDate || "");
            } catch (err) {
                console.error("Lỗi tải bệnh án:", err);
            }
        } else {
            // Tự động mở/tiếp nhận hồ sơ khám để không bị ẩn Tabs cận lâm sàng & chẩn đoán
            try {
                const startRes = await axiosInstance.post("/api/clinical/start", {
                    bookingCode: patientItem.bookingCode,
                    symptoms: patientItem.symptoms || "Khám lâm sàng tổng quát",
                    initialDiagnosis: "Khám lâm sàng ban đầu",
                });
                const recData = startRes?.data || startRes;
                const finalRec = recData?.recordId ? recData : (recData?.data || recData);
                setRecord(finalRec);
                setInitialDiagnosis(finalRec.initialDiagnosis || "");
                setFinalDiagnosis(finalRec.finalDiagnosis || "");
                setTreatmentPlan(finalRec.treatmentPlan || "");
                setReExamDate(finalRec.reExaminationDate || "");
                fetchDoctorQueue();
            } catch (err) {
                console.error("Lỗi tự động mở hồ sơ:", err);
                setRecord(null);
                const errMsg = err?.response?.data?.message || err?.message || "Không thể khởi tạo hoặc mở hồ sơ khám bệnh từ hệ thống!";
                setErrorMessage(`Lỗi tiếp nhận hồ sơ: ${errMsg}. Vui lòng bấm 'Tiếp Nhận Khám' để thử lại.`);
            }
        }
    };

    const isWaitingPatient = (p) =>
        (p.status === "CONFIRMED" || p.status === "WAITING") &&
        p.isPaid !== false &&
        p.status !== "PENDING_PAYMENT" &&
        !p.isReturnAfterResult &&
        p.recordState !== "SKIPPED";

    const handleCallNext = async () => {
        const nextPatient = queue.find(p => p.recordState === "CALLING") || queue.find(isWaitingPatient);
        if (!nextPatient) {
            alert("Không còn bệnh nhân nào đang chờ khám trong hàng đợi hôm nay!");
            return;
        }
        await handleCallPatient(nextPatient);
    };

    const handleCallPatient = async (patientItem) => {
        if (!patientItem) return;
        if (patientItem.isPaid === false || patientItem.status === "PENDING_PAYMENT") {
            alert(`Bệnh nhân [${patientItem.patientName}] chưa hoàn tất thanh toán tiền khám. Vui lòng thanh toán tại Quầy thu ngân/Kiosk trước khi gọi vào buồng khám!`);
            return;
        }
        try {
            await axiosInstance.post(`/api/clinical/call-patient?bookingCode=${patientItem.bookingCode}`);
            playCallChime();
            speakPatientCall({
                queueCode: patientItem.queueCode,
                queueNumber: patientItem.queueNumber,
                patientName: patientItem.patientName,
                roomName: "Khám Bệnh",
                departmentName: patientItem.departmentName,
                isPriority: patientItem.isPriority
            });
            notifyUpcomingPatients(queue, patientItem, "Bàn Khám Bác Sĩ");
            setMessage(`🔔 Đang gọi bệnh nhân STT ${patientItem.queueNumber}: ${patientItem.patientName} vào buồng khám!`);
            fetchDoctorQueue();
        } catch (err) {
            console.error("Lỗi gọi bệnh nhân:", err);
            alert(err?.response?.data?.message || err?.message || "Không thể gọi bệnh nhân!");
        }
    };

    const handleSkipPatient = async (patientItem) => {
        if (!patientItem) return;
        try {
            await axiosInstance.post(`/api/clinical/skip-patient?bookingCode=${patientItem.bookingCode}`);
            setMessage(`Đã đánh dấu vắng mặt bệnh nhân STT ${patientItem.queueNumber}: ${patientItem.patientName}.`);
            fetchDoctorQueue();
        } catch (err) {
            console.error("Lỗi bỏ qua lượt:", err);
            alert(err?.response?.data?.message || err?.message || "Không thể bỏ qua lượt!");
        }
    };

    const handleRecallPatient = async (patientItem) => {
        if (!patientItem) return;
        try {
            await axiosInstance.post(`/api/clinical/recall-patient?bookingCode=${patientItem.bookingCode}`);
            setMessage(`Đã khôi phục bệnh nhân STT ${patientItem.queueNumber}: ${patientItem.patientName} vào danh sách chờ.`);
            fetchDoctorQueue();
        } catch (err) {
            console.error("Lỗi gọi lại bệnh nhân:", err);
            alert(err?.response?.data?.message || err?.message || "Không thể khôi phục bệnh nhân!");
        }
    };

    const handleStartExam = async (patientItem) => {
        setStartingExam(true);
        setSelectedPatient(patientItem);
        try {
            const res = await axiosInstance.post("/api/clinical/start", {
                bookingCode: patientItem.bookingCode,
                symptoms: patientItem.symptoms,
                initialDiagnosis: initialDiagnosis || "Khám lâm sàng tổng quát ban đầu",
            });
            const data = res?.data || res;
            const finalRec = data?.recordId ? data : (data?.data || data);
            setRecord(finalRec);
            setMessage(`Đã tiếp nhận bệnh nhân STT ${patientItem.queueNumber}: ${patientItem.patientName} vào buồng khám!`);
            fetchDoctorQueue();
        } catch (err) {
            console.error("Lỗi tiếp nhận bệnh nhân:", err);
            const errDetail = err?.response?.data?.message || err?.message || "Không thể tiếp nhận bệnh nhân!";
            alert(errDetail);
        } finally {
            setStartingExam(false);
        }
    };

    const handleSaveDiagnosis = async () => {
        if (!record) return;
        if (!finalDiagnosis) {
            alert("Vui lòng nhập chẩn đoán xác định!");
            return;
        }
        setSavingDiagnosis(true);
        try {
            const cleanDate = reExamDate && reExamDate.trim().length >= 8 ? reExamDate.trim() : null;
            let targetRecordId = record.recordId;
            if (!targetRecordId || String(targetRecordId).startsWith("temp-")) {
                const startRes = await axiosInstance.post("/api/clinical/start", {
                    bookingCode: selectedPatient?.bookingCode,
                    symptoms: selectedPatient?.symptoms,
                    initialDiagnosis: initialDiagnosis || finalDiagnosis,
                });
                const startData = startRes?.data || startRes;
                targetRecordId = startData?.recordId || startData?.data?.recordId;
            }

            const res = await axiosInstance.put(`/api/clinical/records/${targetRecordId}/diagnosis`, {
                finalDiagnosis,
                treatmentPlan: treatmentPlan ? treatmentPlan.trim() : "",
                reExaminationDate: cleanDate,
            });
            const data = res?.data?.recordId ? res.data : (res?.recordId ? res : (res?.data || res));
            setRecord(data);
            setMessage("Đã ghi nhận chẩn đoán xác định & phác đồ điều trị thành công!");
            fetchDoctorQueue();
        } catch (err) {
            alert(err.message || "Lỗi lưu chẩn đoán!");
        } finally {
            setSavingDiagnosis(false);
        }
    };

    const [completingExam, setCompletingExam] = useState(false);

    const [openAbandonModal, setOpenAbandonModal] = useState(false);
    const [abandonReason, setAbandonReason] = useState("");
    const [abandoning, setAbandoning] = useState(false);

    const handleAbandonAfterTests = async () => {
        if (!record?.recordId) return;
        setAbandoning(true);
        try {
            const res = await axiosInstance.post(`/api/clinical/records/${record.recordId}/abandon-after-tests`, {
                reason: abandonReason.trim() || "Bệnh nhân không quay lại buồng khám sau khi làm chỉ định cận lâm sàng"
            });
            const data = res?.data?.data || res?.data || res;
            setRecord(data);
            setOpenAbandonModal(false);
            setAbandonReason("");
            setMessage("Đã ghi nhận đóng ca khám vắng mặt cho bệnh nhân thành công.");
            fetchDoctorQueue();
        } catch (err) {
            console.error("Lỗi đóng ca khám vắng mặt:", err);
            alert(err?.response?.data?.message || err?.message || "Lỗi đóng ca khám vắng mặt!");
        } finally {
            setAbandoning(false);
        }
    };

    const handleCompleteExamWithoutPrescription = async () => {
        if (!record) return;

        if (!finalDiagnosis?.trim()) {
            alert("Bác sĩ phải nhập kết luận chẩn đoán lâm sàng xác định trước khi hoàn tất ca khám!");
            return;
        }

        const unfinishedTests = (record?.medicalTests || record?.tests || []).filter(
            t => t.state !== "COMPLETED" && t.state !== "CANCELLED"
        );
        if (unfinishedTests.length > 0) {
            alert(`Không thể hoàn tất ca khám do bệnh nhân vẫn còn ${unfinishedTests.length} chỉ định cận lâm sàng chưa hoàn thành hoặc chưa được hủy!\n\nVui lòng chờ phòng xét nghiệm trả kết quả hoặc bấm hủy chỉ định nếu bệnh nhân không thực hiện.`);
            return;
        }

        const confirmDone = window.confirm(
            `Xác nhận hoàn tất ca khám cho bệnh nhân ${selectedPatient?.patientName || ""} (Không kê đơn thuốc)?\n\nHệ thống sẽ chuyển trạng thái ca khám sang HOÀN THÀNH (DONE) và đóng hồ sơ.`
        );
        if (!confirmDone) return;

        setCompletingExam(true);
        try {
            const cleanDate = reExamDate && reExamDate.trim().length >= 8 ? reExamDate.trim() : null;
            let targetRecordId = record.recordId;
            if (!targetRecordId || String(targetRecordId).startsWith("temp-")) {
                const startRes = await axiosInstance.post("/api/clinical/start", {
                    bookingCode: selectedPatient?.bookingCode,
                    symptoms: selectedPatient?.symptoms,
                    initialDiagnosis: initialDiagnosis || finalDiagnosis,
                });
                const startData = startRes?.data || startRes;
                targetRecordId = startData?.recordId || startData?.data?.recordId;
            }

            const res = await axiosInstance.post(`/api/clinical/records/${targetRecordId}/complete`, {
                finalDiagnosis: finalDiagnosis.trim(),
                treatmentPlan: treatmentPlan ? treatmentPlan.trim() : "",
                reExaminationDate: cleanDate,
            });
            const data = res?.data?.data || res?.data || res;
            setRecord(data);
            setMessage(`🎉 Đã hoàn tất buổi khám cho bệnh nhân ${selectedPatient?.patientName || ""} thành công!`);
            fetchDoctorQueue();
        } catch (err) {
            console.error("Lỗi hoàn tất buổi khám:", err);
            alert(err?.message || "Lỗi hoàn tất buổi khám!");
        } finally {
            setCompletingExam(false);
        }
    };

    const refreshRecord = async () => {
        if (record) {
            try {
                const res = await axiosInstance.get(`/api/clinical/records/${record.recordId}`);
                setRecord(res.data);
                fetchDoctorQueue();
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Filter queue with search term
    const filteredQueue = useMemo(() => {
        return queue.filter((p) => {
            const matchesStatus =
                filterStatus === "ALL" ||
                (filterStatus === "RETURN_AFTER_RESULT" && p.isReturnAfterResult) ||
                (filterStatus === "WAITING" && isWaitingPatient(p)) ||
                (filterStatus === "IN_PROGRESS" && p.status === "IN_PROGRESS") ||
                (filterStatus === "COMPLETED" && p.status === "COMPLETED");

            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                (p.patientName && p.patientName.toLowerCase().includes(q)) ||
                (p.queueCode && p.queueCode.toLowerCase().includes(q)) ||
                (String(p.queueNumber).includes(q)) ||
                (p.bookingCode && p.bookingCode.toLowerCase().includes(q));

            return matchesStatus && matchesSearch;
        });
    }, [queue, filterStatus, searchQuery]);

    const returnAfterResultCount = queue.filter((p) => p.isReturnAfterResult).length;
    const waitingCount = queue.filter(isWaitingPatient).length;
    const inProgressCount = queue.filter((p) => p.status === "IN_PROGRESS").length;
    const completedCount = queue.filter((p) => p.status === "COMPLETED").length;
    const priorityCount = queue.filter((p) => p.isPriority && p.status !== "COMPLETED").length;

    // Vital signs & Patient Body Status State
    const [patientVitals, setPatientVitals] = useState({
        bloodPressure: "120/80",
        heartRate: 76,
        temperature: 36.8,
        spO2: 98,
        weight: 62,
        height: 168,
        bloodType: "O+",
        allergies: "Chưa ghi nhận dị ứng thuốc",
        medicalHistory: "Chưa ghi nhận tiền sử bệnh lý mạn tính"
    });
    const [openEditVitalsModal, setOpenEditVitalsModal] = useState(false);
    const [editingVitals, setEditingVitals] = useState({ ...patientVitals });

    // Helper tính toán BMI & phân loại thể trạng theo chuẩn WHO Tây Thái Bình Dương (WPRO - Châu Á)
    const calculateBMI = (weight, height) => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        if (!w || !h || h <= 0) {
            return {
                bmi: "--",
                classification: "Chưa xác định",
                color: "default",
                badgeBg: "#f1f5f9",
                badgeColor: "#475569",
                advice: "Cần nhập đầy đủ chiều cao và cân nặng để đánh giá thể trạng"
            };
        }
        const heightM = h / 100;
        const bmiVal = (w / (heightM * heightM)).toFixed(1);
        const num = parseFloat(bmiVal);

        if (num < 18.5) {
            return {
                bmi: bmiVal,
                classification: "Gầy (Thiếu cân)",
                color: "warning",
                badgeBg: "#fef3c7",
                badgeColor: "#b45309",
                advice: "Thể trạng gầy, thiếu năng lượng trường diễn. Cần bổ sung dinh dưỡng hợp lý."
            };
        } else if (num < 23.0) {
            return {
                bmi: bmiVal,
                classification: "Cân đối (Bình thường)",
                color: "success",
                badgeBg: "#dcfce7",
                badgeColor: "#15803d",
                advice: "Thể trạng cân đối lý tưởng. Duy trì chế độ ăn uống và tập luyện hiện tại."
            };
        } else if (num < 25.0) {
            return {
                bmi: bmiVal,
                classification: "Thừa cân (Tiền béo phì)",
                color: "warning",
                badgeBg: "#ffedd5",
                badgeColor: "#c2410c",
                advice: "Bắt đầu thừa cân. Khuyến nghị giảm tinh bột, đồ ngọt và tăng vận động thể lực."
            };
        } else if (num < 30.0) {
            return {
                bmi: bmiVal,
                classification: "Béo phì Độ I",
                color: "error",
                badgeBg: "#fee2e2",
                badgeColor: "#b91c1c",
                advice: "Béo phì độ 1. Nguy cơ mắc bệnh chuyển hóa, tim mạch, tăng huyết áp, đái tháo đường."
            };
        } else {
            return {
                bmi: bmiVal,
                classification: "Béo phì Độ II (Nguy hiểm)",
                color: "error",
                badgeBg: "#fecaca",
                badgeColor: "#991b1b",
                advice: "Béo phì độ 2 nghiêm trọng. Nguy cơ biến chứng tim mạch cao, cần can thiệp y tế chuyên sâu."
            };
        }
    };

    const currentBMI = useMemo(() => {
        return calculateBMI(patientVitals.weight, patientVitals.height);
    }, [patientVitals.weight, patientVitals.height]);

    // Phân loại huyết áp
    const bloodPressureStatus = useMemo(() => {
        const bp = patientVitals.bloodPressure || "";
        const parts = bp.split("/").map((p) => parseInt(p.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [sys, dia] = parts;
            if (sys >= 140 || dia >= 90) return { label: "Huyết áp cao", color: "#ef4444", bg: "#fee2e2" };
            if (sys < 90 || dia < 60) return { label: "Huyết áp thấp", color: "#f59e0b", bg: "#fef3c7" };
            return { label: "Bình thường", color: "#16a34a", bg: "#dcfce7" };
        }
        return { label: "Ổn định", color: "#16a34a", bg: "#dcfce7" };
    }, [patientVitals.bloodPressure]);

    // Phân loại thân nhiệt
    const temperatureStatus = useMemo(() => {
        const temp = parseFloat(patientVitals.temperature);
        if (isNaN(temp)) return { label: "Bình thường", color: "#16a34a", bg: "#dcfce7" };
        if (temp >= 38.5) return { label: "Sốt cao", color: "#ef4444", bg: "#fee2e2" };
        if (temp >= 37.5) return { label: "Sốt nhẹ", color: "#f59e0b", bg: "#fef3c7" };
        if (temp < 36.0) return { label: "Hạ thân nhiệt", color: "#0284c7", bg: "#e0f2fe" };
        return { label: "Bình thường", color: "#16a34a", bg: "#dcfce7" };
    }, [patientVitals.temperature]);

    const hasKnownAllergy = Boolean(
        patientVitals.allergies &&
        !patientVitals.allergies.toLowerCase().includes("chưa ghi nhận") &&
        !patientVitals.allergies.toLowerCase().includes("không có") &&
        !patientVitals.allergies.toLowerCase().includes("không dị ứng") &&
        patientVitals.allergies.trim() !== ""
    );

    const hasMedicalHistory = Boolean(
        patientVitals.medicalHistory &&
        !patientVitals.medicalHistory.toLowerCase().includes("chưa ghi nhận") &&
        !patientVitals.medicalHistory.toLowerCase().includes("không có") &&
        patientVitals.medicalHistory.trim() !== ""
    );

    // Phân tích toàn diện cảnh báo nguy cơ sinh hiệu bất thường (Triage Risk Evaluation)
    const vitalSignRisks = useMemo(() => {
        const risks = [];
        // Huyết áp
        const bp = patientVitals.bloodPressure || "";
        const parts = bp.split("/").map((p) => parseInt(p.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [sys, dia] = parts;
            if (sys >= 160 || dia >= 100) {
                risks.push({
                    level: "CRITICAL",
                    title: `Tăng Huyết Áp Khẩn Cấp (${sys}/${dia} mmHg)`,
                    desc: "Huyết áp tâm thu >= 160 hoặc tâm trương >= 100 mmHg. Cần cho bệnh nhân nằm nghỉ ngơi tại buồng khám, theo dõi sát dấu hiệu đau đầu, mờ mắt, đau ngực và cân nhắc hạ áp khẩn cấp.",
                    action: "Nghỉ ngơi 15p & Đo lại HA"
                });
            } else if (sys >= 140 || dia >= 90) {
                risks.push({
                    level: "WARNING",
                    title: `Tăng Huyết Áp Độ 1 (${sys}/${dia} mmHg)`,
                    desc: "Vượt ngưỡng huyết áp mục tiêu chuẩn Bộ Y Tế. Cần đối chiếu tiền sử dùng thuốc và lối sống.",
                    action: "Theo dõi HA"
                });
            } else if (sys < 90 || dia < 60) {
                risks.push({
                    level: "WARNING",
                    title: `Hạ Huyết Áp (${sys}/${dia} mmHg)`,
                    desc: "Nguy cơ tụt huyết áp tư thế hoặc thiếu thể tích tuần hoàn.",
                    action: "Bù dịch / Nằm đầu thấp"
                });
            }
        }

        // SpO2
        const spo2 = Number(patientVitals.spO2) || 98;
        if (spo2 < 92) {
            risks.push({
                level: "CRITICAL",
                title: `Suy Hô Hấp Cấp - SpO2 Báo Động (${spo2}%)`,
                desc: "Độ bão hòa oxy máu dưới 92%. Cần hỗ trợ thở oxy kính/mask ngay lập tức, kiểm tra đường thở và nghe phổi khẩn cấp.",
                action: "Chỉ định Thở Oxy Khẩn"
            });
        } else if (spo2 < 95) {
            risks.push({
                level: "WARNING",
                title: `Giảm Nồng Độ Oxy Máu (${spo2}%)`,
                desc: "SpO2 nằm trong khoảng cảnh báo (92% - 94%). Cần kiểm tra ran phổi hoặc tiền sử COPD/Hen.",
                action: "Theo dõi SpO2 liên tục"
            });
        }

        // Thân nhiệt
        const temp = parseFloat(patientVitals.temperature);
        if (!isNaN(temp)) {
            if (temp >= 39.0) {
                risks.push({
                    level: "CRITICAL",
                    title: `Sốt Rất Cao (${temp}°C)`,
                    desc: "Thân nhiệt >= 39.0°C. Nguy cơ co giật do sốt (đặc biệt trẻ em) hoặc nhiễm trùng huyết. Cần chỉ định thuốc hạ sốt Paracetamol và lau mát tích cực.",
                    action: "Hạ Sốt Tích Cực"
                });
            } else if (temp >= 38.5) {
                risks.push({
                    level: "WARNING",
                    title: `Sốt Cao (${temp}°C)`,
                    desc: "Thân nhiệt >= 38.5°C. Cho bệnh nhân uống nhiều nước điện giải Oresol, dùng thuốc hạ sốt.",
                    action: "Uống nhiều nước / Oresol"
                });
            } else if (temp < 35.5) {
                risks.push({
                    level: "WARNING",
                    title: `Hạ Thân Nhiệt (${temp}°C)`,
                    desc: "Thân nhiệt < 35.5°C. Nguy cơ suy kiệt hoặc sốc.",
                    action: "Ủ ấm bệnh nhân"
                });
            }
        }

        // Nhịp tim
        const hr = Number(patientVitals.heartRate) || 76;
        if (hr > 120) {
            risks.push({
                level: "CRITICAL",
                title: `Nhịp Tim Nhanh Bất Thường (${hr} bpm)`,
                desc: "Tần số tim > 120 chu kỳ/phút. Cần loại trừ cơn nhịp nhanh kịch phát, cường giáp hoặc sốc tim.",
                action: "Đo Điện Tim ECG Ngay"
            });
        } else if (hr < 50) {
            risks.push({
                level: "CRITICAL",
                title: `Nhịp Tim Chậm Nguy Hiểm (${hr} bpm)`,
                desc: "Tần số tim < 50 chu kỳ/phút. Nguy cơ block nhĩ thất hoặc suy nút xoang.",
                action: "Đo Điện Tim ECG Khẩn"
            });
        }

        return risks;
    }, [patientVitals]);

    // Gợi ý bệnh kèm theo tự động dựa trên chẩn đoán hiện tại
    const suggestedComorbidities = useMemo(() => {
        if (!finalDiagnosis) return [];
        const upper = finalDiagnosis.toUpperCase();
        const suggestions = [];

        Object.keys(COMORBIDITY_RECOMMENDATIONS).forEach(key => {
            if (upper.includes(key)) {
                COMORBIDITY_RECOMMENDATIONS[key].forEach(item => {
                    if (!upper.includes(item.code) && !suggestions.some(s => s.code === item.code)) {
                        suggestions.push(item);
                    }
                });
            }
        });

        return suggestions;
    }, [finalDiagnosis]);

    // Lọc danh mục ICD-10 theo ô tìm kiếm và nhóm chuyên khoa
    const filteredIcd10List = useMemo(() => {
        let list = EXPANDED_ICD10_DATABASE;
        if (selectedDeptFilter !== "ALL") {
            list = list.filter(item => item.dept === selectedDeptFilter);
        }
        if (icdSearchTerm.trim()) {
            const rawTerm = icdSearchTerm.toLowerCase();
            const termWithoutAccent = rawTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
            list = list.filter(item => {
                const codeMatch = item.code.toLowerCase().includes(rawTerm);
                const nameRaw = item.name.toLowerCase();
                const nameWithoutAccent = nameRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
                const keywords = item.keywords || "";
                return (
                    codeMatch ||
                    nameRaw.includes(rawTerm) ||
                    nameWithoutAccent.includes(termWithoutAccent) ||
                    keywords.includes(termWithoutAccent)
                );
            });
        }
        return list;
    }, [icdSearchTerm, selectedDeptFilter]);

    // Vitals object compatibility alias
    const vitals = patientVitals;

    return (
        <Container maxWidth="xl" sx={{ py: 3, px: { xs: 1.5, md: 3 } }}>
            {/* 1. CLINICAL COCKPIT HEADER BAR */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 2.5 },
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    color: "#0F172A",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)",
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: { xs: "column", lg: "row" },
                        alignItems: { xs: "flex-start", lg: "center" },
                        justifyContent: "space-between",
                        gap: 2
                    }}
                >
                    {/* Left: Department & Title */}
                    <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0, flexShrink: 0 }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2.5,
                                bgcolor: "#F0FDFA",
                                border: "1px solid #99F6E4",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#0D9488",
                                flexShrink: 0,
                                boxShadow: "0 2px 8px rgba(13, 148, 136, 0.15)"
                            }}
                        >
                            <LocalHospitalIcon sx={{ fontSize: 24 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.3px", fontSize: "1.15rem", whiteSpace: "nowrap", color: "#0F172A" }}>
                                    Bàn Khám Bác Sĩ & Lâm Sàng
                                </Typography>
                                <Chip
                                    label="Live Cockpit"
                                    size="small"
                                    sx={{
                                        bgcolor: "#E0F2FE",
                                        color: "#0284C7",
                                        fontWeight: 800,
                                        fontSize: "0.68rem",
                                        height: 20,
                                        border: "1px solid #BAE6FD"
                                    }}
                                />
                            </Box>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>
                                BV Đa khoa TNT • Khoa Khám Bệnh • Ca: <CockpitLiveClock />
                            </Typography>
                        </Box>
                    </Box>

                    {/* Middle: Live Queue Counters */}
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent={{ xs: "flex-start", sm: "center" }}
                        sx={{ flexShrink: 0, my: { xs: 0.5, lg: 0 } }}
                    >
                        <Box sx={{ px: 1.4, py: 0.6, borderRadius: 2, bgcolor: "#FEF3C7", border: "1px solid #FDE68A", textAlign: "center", minWidth: 68 }}>
                            <Typography variant="caption" sx={{ color: "#B45309", fontWeight: 800, display: "block", fontSize: "0.65rem", whiteSpace: "nowrap" }}>CHỜ KHÁM</Typography>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ color: "#92400E", lineHeight: 1.1, fontSize: "1.15rem" }}>{waitingCount}</Typography>
                        </Box>
                        <Box sx={{ px: 1.4, py: 0.6, borderRadius: 2, bgcolor: "#E0F2FE", border: "1px solid #BAE6FD", textAlign: "center", minWidth: 68 }}>
                            <Typography variant="caption" sx={{ color: "#0284C7", fontWeight: 800, display: "block", fontSize: "0.65rem", whiteSpace: "nowrap" }}>ĐANG KHÁM</Typography>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ color: "#0369A1", lineHeight: 1.1, fontSize: "1.15rem" }}>{inProgressCount}</Typography>
                        </Box>
                        <Box sx={{ px: 1.4, py: 0.6, borderRadius: 2, bgcolor: "#DCFCE7", border: "1px solid #BBF7D0", textAlign: "center", minWidth: 68 }}>
                            <Typography variant="caption" sx={{ color: "#15803D", fontWeight: 800, display: "block", fontSize: "0.65rem", whiteSpace: "nowrap" }}>ĐÃ KHÁM</Typography>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ color: "#166534", lineHeight: 1.1, fontSize: "1.15rem" }}>{completedCount}</Typography>
                        </Box>
                        {priorityCount > 0 && (
                            <Box sx={{ px: 1.4, py: 0.6, borderRadius: 2, bgcolor: "#FEE2E2", border: "1px solid #FECACA", textAlign: "center", minWidth: 68 }}>
                                <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 800, display: "block", fontSize: "0.65rem", whiteSpace: "nowrap" }}>ƯU TIÊN</Typography>
                                <Typography variant="subtitle1" fontWeight={900} sx={{ color: "#B91C1C", lineHeight: 1.1, fontSize: "1.15rem" }}>{priorityCount}</Typography>
                            </Box>
                        )}
                    </Stack>

                    {/* Right: Actions */}
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        sx={{ flexShrink: 0 }}
                    >
                        {/* Nút xem lịch trực cá nhân của Bác sĩ */}
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setOpenScheduleModal(true)}
                            sx={{
                                color: "#334155",
                                borderColor: "#CBD5E1",
                                "&:hover": {
                                    borderColor: "#0D9488",
                                    color: "#0D9488",
                                    bgcolor: "#F0FDFA"
                                },
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                borderRadius: 2,
                                py: 0.8,
                                px: 1.5,
                                textTransform: "none"
                            }}
                        >
                            Lịch Trực
                        </Button>

                        {/* Nút Tác Nghiệp Đặc Quyền Trưởng Khoa (Nếu là ROLE_HEAD_OF_DEPARTMENT) */}
                        {isHeadOfDepartment && (
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 16 }} />}
                                onClick={() => navigate("/admin/schedules")}
                                sx={{
                                    bgcolor: "#F59E0B",
                                    color: "#0F172A",
                                    "&:hover": { bgcolor: "#D97706" },
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                    borderRadius: 2,
                                    py: 0.8,
                                    px: 1.5,
                                    textTransform: "none",
                                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.35)"
                                }}
                            >
                                Phân Lịch Trực Khoa
                            </Button>
                        )}

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<VolumeUpIcon sx={{ fontSize: 18 }} />}
                            onClick={handleCallNext}
                            disabled={waitingCount === 0}
                            sx={{
                                bgcolor: "#0D9488",
                                "&:hover": { bgcolor: "#0F766E" },
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: "0.825rem",
                                borderRadius: 2,
                                py: 0.8,
                                px: 1.8,
                                textTransform: "none",
                                boxShadow: "0 4px 12px rgba(13, 148, 136, 0.25)",
                                "&.Mui-disabled": {
                                    bgcolor: "#E2E8F0",
                                    color: "#94A3B8"
                                }
                            }}
                        >
                            Gọi Số Tiếp ({waitingCount})
                        </Button>
                        <Tooltip title="Làm mới hàng đợi và đồng bộ ca khám">
                            <IconButton
                                size="small"
                                onClick={fetchDoctorQueue}
                                sx={{
                                    color: "#475569",
                                    bgcolor: "#F8FAFC",
                                    "&:hover": { bgcolor: "#F1F5F9", color: "#0D9488" },
                                    border: "1px solid #CBD5E1"
                                }}
                            >
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>
            </Paper>

            {message && (
                <Alert
                    severity="success"
                    sx={{ mb: 3, borderRadius: 2.5, boxShadow: "0 2px 8px rgba(34,197,94,0.15)" }}
                    onClose={() => setMessage("")}
                >
                    {message}
                </Alert>
            )}

            {errorMessage && (
                <Alert
                    severity="error"
                    sx={{ mb: 3, borderRadius: 2.5, boxShadow: "0 2px 8px rgba(239,68,68,0.15)" }}
                    onClose={() => setErrorMessage("")}
                >
                    {errorMessage}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* 2. LEFT COLUMN: SMART QUEUE SIDEBAR */}
                <Grid item xs={12} lg={3.5}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid #e2e8f0",
                            bgcolor: "#ffffff",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            height: "calc(100vh - 220px)",
                            minHeight: 580
                        }}
                    >
                        {/* Queue Header & Filters */}
                        <Box sx={{ p: 2, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#0f172a" }}>
                                        📋 Hàng Đợi Bệnh Nhân
                                    </Typography>
                                    <Chip label={queue.length} size="small" sx={{ bgcolor: "#e2e8f0", fontWeight: 700 }} />
                                </Box>
                                {loadingQueue && <CircularProgress size={16} sx={{ color: "#0284c7" }} />}
                            </Box>

                            {/* Search Box */}
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Tìm theo tên, STT, mã khám..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: "#94a3b8" }} />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: 2, bgcolor: "#ffffff", fontSize: "0.85rem" }
                                }}
                                sx={{ mb: 1.5 }}
                            />

                            {/* Filter Chips */}
                            <Stack direction="row" spacing={0.8} sx={{ overflowX: "auto", pb: 0.5 }}>
                                <Chip
                                    label="Tất cả"
                                    size="small"
                                    variant={filterStatus === "ALL" ? "filled" : "outlined"}
                                    color="default"
                                    onClick={() => setFilterStatus("ALL")}
                                    sx={{ fontWeight: 600, cursor: "pointer" }}
                                />
                                {returnAfterResultCount > 0 && (
                                    <Chip
                                        label={`Có KQ CLS (${returnAfterResultCount})`}
                                        size="small"
                                        variant={filterStatus === "RETURN_AFTER_RESULT" ? "filled" : "outlined"}
                                        onClick={() => setFilterStatus("RETURN_AFTER_RESULT")}
                                        sx={{
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            bgcolor: filterStatus === "RETURN_AFTER_RESULT" ? "#7c3aed" : "#faf5ff",
                                            color: filterStatus === "RETURN_AFTER_RESULT" ? "#ffffff" : "#7c3aed",
                                            borderColor: "#7c3aed"
                                        }}
                                    />
                                )}
                                <Chip
                                    label={`Chờ (${waitingCount})`}
                                    size="small"
                                    color="warning"
                                    variant={filterStatus === "WAITING" ? "filled" : "outlined"}
                                    onClick={() => setFilterStatus("WAITING")}
                                    sx={{ fontWeight: 600, cursor: "pointer" }}
                                />
                                <Chip
                                    label={`Đang khám (${inProgressCount})`}
                                    size="small"
                                    color="primary"
                                    variant={filterStatus === "IN_PROGRESS" ? "filled" : "outlined"}
                                    onClick={() => setFilterStatus("IN_PROGRESS")}
                                    sx={{ fontWeight: 600, cursor: "pointer" }}
                                />
                                <Chip
                                    label={`Xong (${completedCount})`}
                                    size="small"
                                    color="success"
                                    variant={filterStatus === "COMPLETED" ? "filled" : "outlined"}
                                    onClick={() => setFilterStatus("COMPLETED")}
                                    sx={{ fontWeight: 600, cursor: "pointer" }}
                                />
                            </Stack>
                        </Box>

                        {/* Queue Patient Cards List */}
                        <List sx={{ flexGrow: 1, overflowY: "auto", p: 1.5 }}>
                            {filteredQueue.length === 0 ? (
                                <Box textAlign="center" py={8} color="#94a3b8">
                                    <HourglassEmptyIcon sx={{ fontSize: 44, mb: 1, opacity: 0.4 }} />
                                    <Typography variant="body2" fontWeight={500}>Không tìm thấy bệnh nhân phù hợp</Typography>
                                </Box>
                            ) : (
                                filteredQueue.map((item) => {
                                    const isSelected = selectedPatient?.bookingCode === item.bookingCode;
                                    let statusColor = "#64748b";
                                    let statusBg = "#f1f5f9";
                                    let statusLabel = "Chờ khám";

                                    if (item.recordState === "CALLING") {
                                        statusColor = "#ea580c";
                                        statusBg = "#ffedd5";
                                        statusLabel = "Đang gọi vào";
                                    } else if (item.recordState === "SKIPPED") {
                                        statusColor = "#64748b";
                                        statusBg = "#f1f5f9";
                                        statusLabel = "Vắng mặt (Bỏ qua)";
                                    } else if (item.isReturnAfterResult) {
                                        statusColor = "#7c3aed";
                                        statusBg = "#f5f3ff";
                                        statusLabel = "Đã có KQ CLS";
                                    } else if (item.status === "IN_PROGRESS") {
                                        statusColor = "#0284c7";
                                        statusBg = "#e0f2fe";
                                        statusLabel = item.recordState === "IN_TESTING" ? "Đang làm CLS" : "Đang khám";
                                    } else if (item.status === "COMPLETED") {
                                        statusColor = "#16a34a";
                                        statusBg = "#dcfce7";
                                        statusLabel = "Đã khám xong";
                                    } else if (item.status === "PENDING_PAYMENT") {
                                        statusColor = "#d97706";
                                        statusBg = "#fef3c7";
                                        statusLabel = "Chờ khám (Thu sau)";
                                    } else if (item.status === "CONFIRMED" || item.status === "WAITING") {
                                        statusColor = "#059669";
                                        statusBg = "#ecfdf5";
                                        statusLabel = "Chờ khám";
                                    }

                                    return (
                                        <ListItemButton
                                            key={item.bookingId || item.bookingCode}
                                            onClick={() => handleSelectPatient(item)}
                                            selected={isSelected}
                                            sx={{
                                                borderRadius: 2.5,
                                                mb: 1.2,
                                                p: 1.5,
                                                border: isSelected
                                                    ? "2px solid #0284c7"
                                                    : item.isReturnAfterResult
                                                    ? "2px solid #a855f7"
                                                    : item.isPriority
                                                    ? "1px solid #fecaca"
                                                    : "1px solid #f1f5f9",
                                                bgcolor: isSelected
                                                    ? "#f0f9ff"
                                                    : item.isReturnAfterResult
                                                    ? "#faf5ff"
                                                    : item.isPriority
                                                    ? "#fff5f5"
                                                    : "#ffffff",
                                                boxShadow: isSelected
                                                    ? "0 4px 12px rgba(2, 132, 199, 0.12)"
                                                    : item.isReturnAfterResult
                                                    ? "0 2px 8px rgba(124, 58, 237, 0.15)"
                                                    : "0 1px 3px rgba(0,0,0,0.02)",
                                                transition: "all 0.15s ease",
                                                "&:hover": {
                                                    bgcolor: isSelected ? "#e0f2fe" : "#f8fafc",
                                                    transform: "translateY(-1px)"
                                                }
                                            }}
                                        >
                                            {/* Queue Number Badge */}
                                            <Box
                                                sx={{
                                                    minWidth: 38,
                                                    height: 38,
                                                    borderRadius: (item.isPriority || item.isReturnAfterResult) ? 2 : "50%",
                                                    bgcolor: item.isReturnAfterResult
                                                        ? "#7c3aed"
                                                        : item.isPriority
                                                        ? "#ef4444"
                                                        : (item.status === "IN_PROGRESS" ? "#0284c7" : "#e2e8f0"),
                                                    color: (item.isReturnAfterResult || item.isPriority || item.status === "IN_PROGRESS") ? "#ffffff" : "#1e293b",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 900,
                                                    fontSize: "0.92rem",
                                                    mr: 1.2,
                                                    flexShrink: 0,
                                                    boxShadow: item.isReturnAfterResult
                                                        ? "0 2px 8px rgba(124, 58, 237, 0.35)"
                                                        : item.isPriority
                                                        ? "0 2px 8px rgba(239, 68, 68, 0.35)"
                                                        : "none"
                                                }}
                                            >
                                                {item.queueCode || String(item.queueNumber).padStart(2, "0")}
                                            </Box>

                                            <ListItemText
                                                disableTypography
                                                primary={
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                                                        <Box display="flex" alignItems="center" gap={0.5} sx={{ minWidth: 0, flex: 1 }}>
                                                            {item.isReturnAfterResult && (
                                                                <Chip
                                                                    label="Có KQ CLS"
                                                                    size="small"
                                                                    sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, bgcolor: "#7c3aed", color: "#ffffff", flexShrink: 0 }}
                                                                />
                                                            )}
                                                            {item.isPriority && (
                                                                <Chip
                                                                    icon={<StarsIcon sx={{ fontSize: "11px !important", color: "#ffffff !important" }} />}
                                                                    label="Ưu tiên"
                                                                    size="small"
                                                                    sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, bgcolor: "#ef4444", color: "#ffffff", flexShrink: 0 }}
                                                                />
                                                            )}
                                                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#0f172a", fontSize: "0.85rem" }} noWrap>
                                                                {item.patientName}
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" alignItems="center" gap={0.4} sx={{ flexShrink: 0 }}>
                                                            <Tooltip title="Phát thanh gọi tên">
                                                                <IconButton
                                                                    size="small"
                                                                    sx={{ color: "#0284c7", p: 0.4 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        playCallChime();
                                                                        speakPatientCall({
                                                                            queueCode: item.queueCode,
                                                                            queueNumber: item.queueNumber,
                                                                            patientName: item.patientName,
                                                                            roomName: "Khám Bệnh",
                                                                            departmentName: item.departmentName,
                                                                            isPriority: item.isPriority
                                                                        });
                                                                    }}
                                                                >
                                                                    <VolumeUpIcon sx={{ fontSize: 18 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Chip
                                                                label={statusLabel}
                                                                size="small"
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: "0.65rem",
                                                                    fontWeight: 700,
                                                                    color: statusColor,
                                                                    bgcolor: statusBg,
                                                                    whiteSpace: "nowrap"
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box mt={0.5}>
                                                        <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                                            🕒 {item.timeSlotRange || "Hôm nay"} • Mã: <b>{item.bookingCode}</b>
                                                        </Typography>
                                                        {item.symptoms && (
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    color: "#334155",
                                                                    fontStyle: "italic",
                                                                    display: "block",
                                                                    bgcolor: "#f8fafc",
                                                                    p: 0.5,
                                                                    borderRadius: 1,
                                                                    mt: 0.5
                                                                }}
                                                                noWrap
                                                            >
                                                                "{item.symptoms}"
                                                            </Typography>
                                                        )}
                                                        {item.totalTests > 0 && (
                                                            <Chip
                                                                label={`CLS: ${item.completedTests}/${item.totalTests} KQ`}
                                                                size="small"
                                                                variant="outlined"
                                                                color={item.completedTests === item.totalTests ? "success" : "warning"}
                                                                sx={{ mt: 0.5, height: 18, fontSize: "0.65rem", fontWeight: 700 }}
                                                            />
                                                        )}
                                                    </Box>
                                                }
                                            />
                                        </ListItemButton>
                                    );
                                })
                            )}
                        </List>
                    </Paper>
                </Grid>

                {/* 3. RIGHT COLUMN: CLINICAL WORKSPACE & PATIENT PROFILE */}
                <Grid item xs={12} lg={8.5}>
                    {selectedPatient ? (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                            {/* PATIENT SUMMARY & VITALS BANNER */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 3,
                                    border: "1px solid #e2e8f0",
                                    bgcolor: "#ffffff",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} mb={1.5}>
                                    {/* Patient Info */}
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Box
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 2.5,
                                                bgcolor: "#0284c7",
                                                color: "#ffffff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "1.15rem",
                                                fontWeight: 900,
                                                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)",
                                                flexShrink: 0
                                            }}
                                        >
                                            {String(selectedPatient.queueNumber).padStart(2, "0")}
                                        </Box>
                                        <Box>
                                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#0f172a", fontSize: "1.05rem" }}>
                                                    {selectedPatient.patientName}
                                                </Typography>
                                                <Chip
                                                    label={selectedPatient.patientGender === "FEMALE" ? "Nữ" : "Nam"}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: selectedPatient.patientGender === "FEMALE" ? "#fce7f3" : "#e0f2fe",
                                                        color: selectedPatient.patientGender === "FEMALE" ? "#be185d" : "#0369a1",
                                                        fontWeight: 700,
                                                        fontSize: "0.68rem",
                                                        height: 18
                                                    }}
                                                />
                                                {selectedPatient.patientDob && (
                                                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                                        ({new Date().getFullYear() - new Date(selectedPatient.patientDob).getFullYear()} tuổi)
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.2 }}>
                                                SĐT: <b>{selectedPatient.patientPhone || "Chưa có"}</b> • Mã đặt khám: <b>{selectedPatient.bookingCode}</b>
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 600, display: "block", mt: 0.2 }}>
                                                Lý do khám / Triệu chứng: <i>"{selectedPatient.symptoms || "Khám sức khỏe tổng quát"}"</i>
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Action Buttons Header */}
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                        {record && (
                                            <>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                                                    onClick={() => setOpenRecordPrintModal(true)}
                                                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", fontSize: "0.8rem", py: 0.5, whiteSpace: "nowrap" }}
                                                >
                                                    In Bệnh Án
                                                </Button>
                                                {record.prescription && (
                                                    <Button
                                                        variant="outlined"
                                                        color="success"
                                                        size="small"
                                                        startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
                                                        onClick={() => setOpenRxPrintModal(true)}
                                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", fontSize: "0.8rem", py: 0.5, whiteSpace: "nowrap" }}
                                                    >
                                                        In Đơn Thuốc
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {(!record || record.state === "WAITING" || record.state === "CALLING" || record.state === "SKIPPED") ? (
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                <Button
                                                    variant="outlined"
                                                    color={selectedPatient?.isPaid === false || selectedPatient?.status === "PENDING_PAYMENT" ? "inherit" : "warning"}
                                                    size="small"
                                                    disabled={selectedPatient?.isPaid === false || selectedPatient?.status === "PENDING_PAYMENT"}
                                                    startIcon={<VolumeUpIcon sx={{ fontSize: 16 }} />}
                                                    onClick={() => handleCallPatient(selectedPatient)}
                                                    sx={{ borderRadius: 2, fontWeight: 800, textTransform: "none", fontSize: "0.8rem", py: 0.6, px: 1.5, whiteSpace: "nowrap" }}
                                                >
                                                    {selectedPatient?.isPaid === false || selectedPatient?.status === "PENDING_PAYMENT"
                                                        ? "Chưa Đóng Phí Khám"
                                                        : (selectedPatient?.recordState === "CALLING" ? "Mời Lại Loa" : "Gọi Vào Phòng")}
                                                </Button>

                                                {selectedPatient?.recordState === "CALLING" && (
                                                    <Button
                                                        variant="outlined"
                                                        color="inherit"
                                                        size="small"
                                                        onClick={() => handleSkipPatient(selectedPatient)}
                                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", fontSize: "0.8rem", py: 0.6, px: 1.2, color: "#64748b", borderColor: "#cbd5e1", whiteSpace: "nowrap" }}
                                                    >
                                                        Báo Vắng Mặt
                                                    </Button>
                                                )}

                                                {selectedPatient?.recordState === "SKIPPED" && (
                                                    <Button
                                                        variant="outlined"
                                                        color="info"
                                                        size="small"
                                                        onClick={() => handleRecallPatient(selectedPatient)}
                                                        sx={{ borderRadius: 2, fontWeight: 800, textTransform: "none", fontSize: "0.8rem", py: 0.6, px: 1.2, whiteSpace: "nowrap" }}
                                                    >
                                                        Khôi Phục Khám
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() => handleStartExam(selectedPatient)}
                                                    disabled={startingExam}
                                                    sx={{
                                                        bgcolor: "#0284c7",
                                                        fontWeight: 800,
                                                        px: 2.2,
                                                        py: 0.7,
                                                        fontSize: "0.82rem",
                                                        whiteSpace: "nowrap",
                                                        borderRadius: 2,
                                                        textTransform: "none",
                                                        boxShadow: "0 2px 8px rgba(2, 132, 199, 0.25)",
                                                        "&:hover": { bgcolor: "#0369a1" }
                                                    }}
                                                >
                                                    {startingExam ? "Đang mở hồ sơ..." : "Bắt Đầu Khám"}
                                                </Button>
                                            </Stack>
                                        ) : (
                                            <Chip
                                                label={`Hồ sơ: ${record.state || "IN_PROGRESS"}`}
                                                color={record.state === "DONE" ? "success" : "primary"}
                                                sx={{ fontWeight: 800, px: 1, height: 26, fontSize: "0.75rem", whiteSpace: "nowrap" }}
                                            />
                                        )}
                                    </Stack>
                                </Box>

                                {/* Vital Signs Metric Strip */}
                                <Divider sx={{ my: 1.2 }} />
                                <Box
                                    sx={{
                                        p: 1.2,
                                        borderRadius: 2,
                                        bgcolor: "#f8fafc",
                                        border: "1px solid #f1f5f9"
                                    }}
                                >
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.8} flexWrap="wrap" gap={1}>
                                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                            <Typography variant="caption" fontWeight={800} sx={{ color: "#475569", textTransform: "uppercase", letterSpacing: "0.3px", fontSize: "0.7rem" }}>
                                                📊 Chỉ Số Sinh Hiệu & Thể Trạng Bệnh Nhân (Chuẩn WHO WPRO)
                                            </Typography>
                                            {triageNurseRecorded ? (
                                                <Chip
                                                    label="✓ ĐÃ ĐO BỞI ĐIỀU DƯỠNG (SƠ CHẨN)"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: "#dcfce7",
                                                        color: "#15803d",
                                                        fontWeight: 800,
                                                        fontSize: "0.62rem",
                                                        height: 19
                                                    }}
                                                />
                                            ) : (
                                                <Chip
                                                    label="TỰ ĐỘNG KHỞI TẠO (CHỜ ĐO)"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: "#f1f5f9",
                                                        color: "#64748b",
                                                        fontWeight: 700,
                                                        fontSize: "0.62rem",
                                                        height: 19
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                                                onClick={() => {
                                                    setEditingVitals({ ...patientVitals });
                                                    setOpenEditVitalsModal(true);
                                                }}
                                                sx={{
                                                    borderRadius: 1.5,
                                                    py: 0.1,
                                                    px: 1,
                                                    fontSize: "0.7rem",
                                                    fontWeight: 700,
                                                    textTransform: "none",
                                                    color: "#0284c7",
                                                    borderColor: "#cbd5e1",
                                                    bgcolor: "#ffffff"
                                                }}
                                            >
                                                Cập nhật Sinh hiệu / Thể trạng
                                            </Button>
                                            <Chip
                                                label={hasKnownAllergy ? `⚠️ Dị ứng: ${patientVitals.allergies}` : "Chưa ghi nhận dị ứng"}
                                                size="small"
                                                sx={{
                                                    bgcolor: hasKnownAllergy ? "#fee2e2" : "#f1f5f9",
                                                    color: hasKnownAllergy ? "#b91c1c" : "#64748b",
                                                    fontWeight: 700,
                                                    fontSize: "0.65rem",
                                                    height: 20
                                                }}
                                            />
                                        </Box>
                                    </Box>

                                    <Grid container spacing={1}>
                                        <Grid item xs={6} sm={2.4}>
                                            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: "#ffffff", border: "1px solid #e2e8f0", textAlign: "center" }}>
                                                <Box display="flex" alignItems="center" justifyContent="center" gap={0.4} color="#ef4444">
                                                    <SpeedIcon sx={{ fontSize: 16 }} />
                                                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>Huyết Áp</Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a", whiteSpace: "nowrap", my: 0.2 }}>
                                                    {patientVitals.bloodPressure} <Typography component="span" variant="caption" sx={{ fontSize: "0.65rem" }}>mmHg</Typography>
                                                </Typography>
                                                <Chip
                                                    label={bloodPressureStatus.label}
                                                    size="small"
                                                    sx={{ height: 16, fontSize: "0.6rem", bgcolor: bloodPressureStatus.bg, color: bloodPressureStatus.color, fontWeight: 700 }}
                                                />
                                            </Box>
                                        </Grid>

                                        <Grid item xs={6} sm={2.4}>
                                            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: "#ffffff", border: "1px solid #e2e8f0", textAlign: "center" }}>
                                                <Box display="flex" alignItems="center" justifyContent="center" gap={0.4} color="#0284c7">
                                                    <MonitorHeartIcon sx={{ fontSize: 16 }} />
                                                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>Nhịp Tim</Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a", whiteSpace: "nowrap", my: 0.2 }}>
                                                    {patientVitals.heartRate} <Typography component="span" variant="caption" sx={{ fontSize: "0.65rem" }}>bpm</Typography>
                                                </Typography>
                                                <Chip
                                                    label={patientVitals.heartRate > 100 ? "Nhịp nhanh" : (patientVitals.heartRate < 60 ? "Nhịp chậm" : "Ổn định")}
                                                    size="small"
                                                    sx={{
                                                        height: 16,
                                                        fontSize: "0.6rem",
                                                        bgcolor: (patientVitals.heartRate > 100 || patientVitals.heartRate < 60) ? "#fef3c7" : "#dcfce7",
                                                        color: (patientVitals.heartRate > 100 || patientVitals.heartRate < 60) ? "#b45309" : "#15803d",
                                                        fontWeight: 700
                                                    }}
                                                />
                                            </Box>
                                        </Grid>

                                        <Grid item xs={6} sm={2.4}>
                                            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: "#ffffff", border: "1px solid #e2e8f0", textAlign: "center" }}>
                                                <Box display="flex" alignItems="center" justifyContent="center" gap={0.4} color="#f59e0b">
                                                    <ThermostatIcon sx={{ fontSize: 16 }} />
                                                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>Thân Nhiệt</Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a", whiteSpace: "nowrap", my: 0.2 }}>
                                                    {patientVitals.temperature}°C
                                                </Typography>
                                                <Chip
                                                    label={temperatureStatus.label}
                                                    size="small"
                                                    sx={{ height: 16, fontSize: "0.6rem", bgcolor: temperatureStatus.bg, color: temperatureStatus.color, fontWeight: 700 }}
                                                />
                                            </Box>
                                        </Grid>

                                        <Grid item xs={6} sm={2.4}>
                                            <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: "#ffffff", border: "1px solid #e2e8f0", textAlign: "center" }}>
                                                <Box display="flex" alignItems="center" justifyContent="center" gap={0.4} color="#0d9488">
                                                    <FavoriteIcon sx={{ fontSize: 16 }} />
                                                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>SpO2</Typography>
                                                </Box>
                                                <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a", whiteSpace: "nowrap", my: 0.2 }}>
                                                    {patientVitals.spO2}%
                                                </Typography>
                                                <Chip
                                                    label={patientVitals.spO2 >= 96 ? "Rất tốt" : "Cảnh báo oxy"}
                                                    size="small"
                                                    sx={{
                                                        height: 16,
                                                        fontSize: "0.6rem",
                                                        bgcolor: patientVitals.spO2 >= 96 ? "#dcfce7" : "#fee2e2",
                                                        color: patientVitals.spO2 >= 96 ? "#15803d" : "#b91c1c",
                                                        fontWeight: 700
                                                    }}
                                                />
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} sm={2.4}>
                                            <Tooltip title={`Lời khuyên: ${currentBMI.advice}`}>
                                                <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: "#ffffff", border: "1px solid #e2e8f0", textAlign: "center", cursor: "pointer" }}>
                                                    <Typography variant="caption" fontWeight={700} color="#64748b" sx={{ fontSize: "0.7rem", display: "block", whiteSpace: "nowrap" }}>
                                                        BMI & Thể Trạng
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={800} sx={{ color: "#0f172a", whiteSpace: "nowrap", my: 0.2 }}>
                                                        {currentBMI.bmi} <Typography component="span" variant="caption" sx={{ fontSize: "0.65rem" }}>({patientVitals.weight}kg/{patientVitals.height}cm)</Typography>
                                                    </Typography>
                                                    <Chip
                                                        label={currentBMI.classification}
                                                        size="small"
                                                        sx={{ height: 16, fontSize: "0.6rem", bgcolor: currentBMI.badgeBg, color: currentBMI.badgeColor, fontWeight: 700 }}
                                                    />
                                                </Box>
                                            </Tooltip>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Paper>

                            {/* CẢNH BÁO NGUY CƠ SINH HIỆU BẤT THƯỜNG (TRIAGE RISK ALERT BANNER) */}
                            {vitalSignRisks && vitalSignRisks.length > 0 && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2.5,
                                        border: vitalSignRisks.some(r => r.level === "CRITICAL") ? "2px solid #dc2626" : "1.5px solid #f59e0b",
                                        bgcolor: vitalSignRisks.some(r => r.level === "CRITICAL") ? "#fef2f2" : "#fffbeb",
                                        boxShadow: "0 4px 14px rgba(220, 38, 38, 0.1)"
                                    }}
                                >
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} flexWrap="wrap" gap={1}>
                                        <Box display="flex" alignItems="center" gap={1.2}>
                                            <Box
                                                sx={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 2,
                                                    bgcolor: vitalSignRisks.some(r => r.level === "CRITICAL") ? "#fee2e2" : "#fef3c7",
                                                    color: vitalSignRisks.some(r => r.level === "CRITICAL") ? "#dc2626" : "#b45309",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center"
                                                }}
                                            >
                                                <WarningAmberIcon sx={{ fontSize: 22 }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={900} sx={{ color: vitalSignRisks.some(r => r.level === "CRITICAL") ? "#991b1b" : "#92400e", textTransform: "uppercase" }}>
                                                    🚨 CẢNH BÁO SINH HIỆU VƯỢT NGƯỠNG AN TOÀN ({vitalSignRisks.length} CHỈ SỐ BẤT THƯỜNG)
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                    Khuyến cáo Bác sĩ đánh giá nguy cơ lâm sàng trước khi kê đơn hoặc ra chỉ định điều trị
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                setEditingVitals({ ...patientVitals });
                                                setOpenEditVitalsModal(true);
                                            }}
                                            sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: "none", fontSize: "0.75rem" }}
                                        >
                                            Đo Lại / Cập Nhật
                                        </Button>
                                    </Box>

                                    <Stack spacing={1} mt={1}>
                                        {vitalSignRisks.map((risk, rIdx) => (
                                            <Box
                                                key={rIdx}
                                                sx={{
                                                    p: 1.2,
                                                    borderRadius: 2,
                                                    bgcolor: risk.level === "CRITICAL" ? "#fee2e2" : "#fef3c7",
                                                    border: risk.level === "CRITICAL" ? "1px solid #fecaca" : "1px solid #fde68a",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    flexWrap: "wrap",
                                                    gap: 1
                                                }}
                                            >
                                                <Box sx={{ flex: 1, minWidth: 240 }}>
                                                    <Box display="flex" alignItems="center" gap={0.8}>
                                                        <Chip
                                                            label={risk.level === "CRITICAL" ? "NGUY CƠ CAO" : "CẢNH BÁO"}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: risk.level === "CRITICAL" ? "#dc2626" : "#d97706",
                                                                color: "#fff",
                                                                fontWeight: 800,
                                                                fontSize: "0.62rem",
                                                                height: 18
                                                            }}
                                                        />
                                                        <Typography variant="body2" fontWeight={800} sx={{ color: risk.level === "CRITICAL" ? "#991b1b" : "#92400e" }}>
                                                            {risk.title}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" sx={{ color: risk.level === "CRITICAL" ? "#7f1d1d" : "#78350f", display: "block", mt: 0.3 }}>
                                                        {risk.desc}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={`Hành động: ${risk.action}`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: "#ffffff",
                                                        color: risk.level === "CRITICAL" ? "#991b1b" : "#92400e",
                                                        fontWeight: 800,
                                                        fontSize: "0.72rem",
                                                        border: "1px solid rgba(0,0,0,0.1)"
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Stack>
                                </Paper>
                            )}

                            {/* HIGH-PRIORITY CLINICAL ALLERGY ALERT BANNER */}
                            {hasKnownAllergy && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.8,
                                        borderRadius: 2.5,
                                        border: "2px solid #ef4444",
                                        bgcolor: "#fef2f2",
                                        boxShadow: "0 4px 14px rgba(239, 68, 68, 0.12)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 1.5
                                    }}
                                >
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Box
                                            sx={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: 2,
                                                bgcolor: "#fee2e2",
                                                color: "#dc2626",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0
                                            }}
                                        >
                                            <WarningAmberIcon sx={{ fontSize: 28 }} />
                                        </Box>
                                        <Box>
                                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                <Typography variant="subtitle2" fontWeight={900} sx={{ color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                    🚨 CẢNH BÁO AN TOÀN LÂM SÀNG: TIỀN SỬ DỊ ỨNG THUỐC ĐẶC BIỆT
                                                </Typography>
                                                <Chip
                                                    label="CHỐNG CHỈ ĐỊNH DỊ ỨNG"
                                                    size="small"
                                                    sx={{ bgcolor: "#ef4444", color: "#ffffff", fontWeight: 800, height: 20, fontSize: "0.65rem" }}
                                                />
                                            </Box>
                                            <Typography variant="body2" sx={{ color: "#b91c1c", fontWeight: 800, mt: 0.3 }}>
                                                Chất / Thuốc gây dị ứng: <u>{patientVitals.allergies}</u>
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#7f1d1d", display: "block" }}>
                                                * Bác sĩ cần đối chiếu kỹ lưỡng hoạt chất thuốc trước khi kê đơn, tránh sốc phản vệ và dị ứng chéo!
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                                        onClick={() => {
                                            setEditingVitals({ ...patientVitals });
                                            setOpenEditVitalsModal(true);
                                        }}
                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                                    >
                                        Sửa Cảnh Báo
                                    </Button>
                                </Paper>
                            )}

                            {/* TIỀN SỬ BỆNH LÝ MẠN TÍNH */}
                            {hasMedicalHistory && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2.5,
                                        border: "1px solid #bfdbfe",
                                        bgcolor: "#eff6ff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 1.5
                                    }}
                                >
                                    <Box display="flex" alignItems="center" gap={1.2}>
                                        <HealingIcon sx={{ color: "#0284c7", fontSize: 22 }} />
                                        <Box>
                                            <Typography variant="caption" fontWeight={800} sx={{ color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.3px", display: "block" }}>
                                                🩺 Tiền Sử Bệnh Lý Mạn Tính & Bệnh Kèm Theo:
                                            </Typography>
                                            <Box display="flex" flexWrap="wrap" gap={0.8} mt={0.5}>
                                                {patientVitals.medicalHistory.split(/[,;]/).map((item, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        label={item.trim()}
                                                        size="small"
                                                        sx={{ bgcolor: "#dbeafe", color: "#1e40af", fontWeight: 700, fontSize: "0.72rem", height: 22 }}
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Button
                                        variant="text"
                                        size="small"
                                        onClick={() => {
                                            setEditingVitals({ ...patientVitals });
                                            setOpenEditVitalsModal(true);
                                        }}
                                        sx={{ color: "#0284c7", fontWeight: 700, textTransform: "none", fontSize: "0.78rem" }}
                                    >
                                        Cập nhật bệnh sử
                                    </Button>
                                </Paper>
                            )}

                            {/* CẢNH BÁO BỆNH ÁN ĐÃ KHÓA SAU 24H THEO THÔNG TƯ 46/2018/TT-BYT */}
                            {record?.isLocked && (
                                <Alert
                                    severity="error"
                                    icon={<LockIcon />}
                                    sx={{
                                        mb: 2.5,
                                        borderRadius: 2.5,
                                        bgcolor: "#fef2f2",
                                        color: "#991b1b",
                                        border: "1px solid #fecaca",
                                        "& .MuiAlert-message": { width: "100%" }
                                    }}
                                    action={
                                        <Button
                                            color="error"
                                            variant="contained"
                                            size="small"
                                            startIcon={<HistoryEduIcon />}
                                            onClick={() => setOpenAddendumModal(true)}
                                            sx={{
                                                fontWeight: 700,
                                                textTransform: "none",
                                                whiteSpace: "nowrap",
                                                bgcolor: "#dc2626",
                                                "&:hover": { bgcolor: "#b91c1c" }
                                            }}
                                        >
                                            + Lập Phụ Lục Bệnh Án (TT 46)
                                        </Button>
                                    }
                                >
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                            HỒ SƠ ĐÃ KHÓA SAU 24H THEO THÔNG TƯ 46/2018/TT-BYT
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: "block", color: "#7f1d1d" }}>
                                            Hồ sơ bệnh án điện tử đã chuyển sang trạng thái bất biến sau 24 giờ kể từ thời điểm kết thúc buổi khám. Bác sĩ không thể sửa trực tiếp; mọi đính chính hoặc bổ sung y khoa phải được ghi nhận qua Phụ lục bệnh án (Addendum).
                                        </Typography>
                                    </Box>
                                </Alert>
                            )}

                            {/* CLINICAL DOSSIER TABS */}
                            {record ? (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        borderRadius: 3,
                                        border: "1px solid #e2e8f0",
                                        bgcolor: "#ffffff",
                                        overflow: "hidden"
                                    }}
                                >
                                    <Tabs
                                        value={activeTab}
                                        onChange={(_, v) => setActiveTab(v)}
                                        variant="scrollable"
                                        scrollButtons="auto"
                                        sx={{
                                            bgcolor: "#f8fafc",
                                            borderBottom: "1px solid #e2e8f0",
                                            minHeight: 44,
                                            "& .MuiTab-root": {
                                                textTransform: "none",
                                                fontWeight: 700,
                                                fontSize: "0.85rem",
                                                py: 1.2,
                                                minHeight: 44,
                                                whiteSpace: "nowrap"
                                            }
                                        }}
                                    >
                                        <Tab label="1. Khám Lâm Sàng & Chẩn Đoán Sơ Bộ" icon={<AssignmentTurnedInIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                                        <Tab label="2. Chỉ Định Cận Lâm Sàng & Kết Quả" icon={<ScienceIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                                        <Tab label="3. Kê Đơn Thuốc & Kết Thúc" icon={<MedicationIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                                    </Tabs>

                                    <Box sx={{ p: 3 }}>
                                        {/* TAB 1: KHÁM LÂM SÀNG & CHẨN ĐOÁN SƠ BỘ */}
                                        {activeTab === 0 && (
                                            <Box>
                                                <Box mb={2.5}>
                                                    <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a" }}>
                                                        🩺 Kết Luận Chẩn Đoán ICD-10 & Phác Đồ Điều Trị
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                        Nhập chẩn đoán xác định, lời dặn chuyên môn và hẹn ngày tái khám cho bệnh nhân
                                                    </Typography>
                                                </Box>

                                                {/* BỘ TRA CỨU DANH MỤC ICD-10 CHUYÊN SÂU & GỢI Ý BỆNH KÈM THEO */}
                                                <Paper elevation={0} sx={{ p: 2.2, mb: 2.5, bgcolor: "#f8fafc", borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
                                                    {/* Header & Filter Controls */}
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <AutoAwesomeIcon fontSize="small" sx={{ color: "#0284c7" }} />
                                                            <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#0f172a" }}>
                                                                Tra Cứu Thông Minh Danh Mục ICD-10 Chuẩn Bộ Y Tế:
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                            Tìm theo mã (J00, I10...) hoặc tên bệnh tiếng Việt có dấu/không dấu
                                                        </Typography>
                                                    </Box>

                                                    {/* Search Input & Specialty Department Filter */}
                                                    <Grid container spacing={1.5} mb={1.5}>
                                                        <Grid item xs={12} sm={7} md={8}>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                placeholder="🔍 Nhập mã bệnh ICD hoặc triệu chứng (VD: 'da day', 'tang huyet ap', 'J20', 'I10', 'sot')..."
                                                                value={icdSearchTerm}
                                                                onChange={(e) => setIcdSearchTerm(e.target.value)}
                                                                InputProps={{
                                                                    sx: { bgcolor: "#ffffff", borderRadius: 2 },
                                                                    endAdornment: icdSearchTerm ? (
                                                                        <InputAdornment position="end">
                                                                            <Button size="small" onClick={() => setIcdSearchTerm("")} sx={{ minWidth: 24, p: 0.2, fontSize: "0.75rem", color: "#64748b" }}>
                                                                                Xóa
                                                                            </Button>
                                                                        </InputAdornment>
                                                                    ) : null
                                                                }}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={12} sm={5} md={4}>
                                                            <Box display="flex" alignItems="center" gap={0.5} sx={{ overflowX: "auto", py: 0.3 }}>
                                                                {ICD10_DEPARTMENTS.slice(0, 5).map((dept) => (
                                                                    <Chip
                                                                        key={dept}
                                                                        label={dept === "ALL" ? "Tất cả" : dept}
                                                                        size="small"
                                                                        onClick={() => setSelectedDeptFilter(dept)}
                                                                        sx={{
                                                                            cursor: "pointer",
                                                                            fontWeight: 700,
                                                                            fontSize: "0.7rem",
                                                                            bgcolor: selectedDeptFilter === dept ? "#0284c7" : "#e2e8f0",
                                                                            color: selectedDeptFilter === dept ? "#ffffff" : "#334155",
                                                                            "&:hover": { bgcolor: selectedDeptFilter === dept ? "#0369a1" : "#cbd5e1" }
                                                                        }}
                                                                    />
                                                                ))}
                                                            </Box>
                                                        </Grid>
                                                    </Grid>

                                                    {/* Danh sách kết quả tra cứu ICD-10 */}
                                                    <Box sx={{ maxHeight: 180, overflowY: "auto", pr: 0.5 }}>
                                                        <Box display="flex" flexWrap="wrap" gap={0.8}>
                                                            {filteredIcd10List.slice(0, 18).map((tmpl) => (
                                                                <Chip
                                                                    key={tmpl.code}
                                                                    label={`${tmpl.code} - ${tmpl.name}`}
                                                                    size="small"
                                                                    onClick={() => {
                                                                        const text = `${tmpl.name} (${tmpl.code})`;
                                                                        setFinalDiagnosis(finalDiagnosis ? `${finalDiagnosis}, ${text}` : text);
                                                                    }}
                                                                    sx={{
                                                                        cursor: "pointer",
                                                                        bgcolor: "#ffffff",
                                                                        border: "1px solid #cbd5e1",
                                                                        fontWeight: 600,
                                                                        fontSize: "0.74rem",
                                                                        "&:hover": { bgcolor: "#e0f2fe", borderColor: "#0284c7", color: "#0369a1" }
                                                                    }}
                                                                />
                                                            ))}
                                                            {filteredIcd10List.length === 0 && (
                                                                <Typography variant="caption" sx={{ color: "#94a3b8", fontStyle: "italic", p: 1 }}>
                                                                    Không tìm thấy mã ICD-10 phù hợp với từ khóa "{icdSearchTerm}". Bác sĩ có thể nhập trực tiếp vào ô chẩn đoán bên dưới.
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>

                                                    {/* GỢI Ý BỆNH KÈM THEO THƯỜNG GẶP (COMORBIDITY RECOMMENDATIONS) */}
                                                    {suggestedComorbidities.length > 0 && (
                                                        <Box mt={2} p={1.5} sx={{ bgcolor: "#faf5ff", borderRadius: 2, border: "1.5px dashed #c084fc" }}>
                                                            <Box display="flex" alignItems="center" gap={0.8} mb={1}>
                                                                <StarsIcon sx={{ color: "#9333ea", fontSize: 18 }} />
                                                                <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#6b21a8", fontSize: "0.82rem" }}>
                                                                    Gợi Ý Bệnh Kèm Theo Thường Gặp (Comorbidities) Dựa Trên Chẩn Đoán Chính:
                                                                </Typography>
                                                            </Box>
                                                            <Box display="flex" flexWrap="wrap" gap={1}>
                                                                {suggestedComorbidities.map((item) => (
                                                                    <Tooltip key={item.code} title={item.reason} arrow>
                                                                        <Chip
                                                                            label={`+ ${item.code} - ${item.name}`}
                                                                            size="small"
                                                                            onClick={() => {
                                                                                const text = `${item.name} (${item.code})`;
                                                                                setFinalDiagnosis(finalDiagnosis ? `${finalDiagnosis}, ${text}` : text);
                                                                            }}
                                                                            sx={{
                                                                                cursor: "pointer",
                                                                                bgcolor: "#f3e8ff",
                                                                                color: "#7e22ce",
                                                                                border: "1px solid #d8b4fe",
                                                                                fontWeight: 700,
                                                                                fontSize: "0.72rem",
                                                                                "&:hover": { bgcolor: "#e9d5ff", borderColor: "#a855f7" }
                                                                            }}
                                                                        />
                                                                    </Tooltip>
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    )}
                                                </Paper>

                                                <Grid container spacing={2.5}>
                                                    <Grid item xs={12}>
                                                        <TextField
                                                            fullWidth
                                                            required
                                                            label="Chẩn đoán xác định (ICD-10 / Tên Bệnh Lý)"
                                                            placeholder="VD: Viêm phế quản cấp (J20), Viêm loét dạ dày (K25)..."
                                                            value={finalDiagnosis}
                                                            onChange={(e) => setFinalDiagnosis(e.target.value)}
                                                            InputProps={{ sx: { borderRadius: 2 } }}
                                                        />
                                                    </Grid>

                                                    {/* QUICK ADVICE TAGS */}
                                                    <Grid item xs={12}>
                                                        <Box mb={1} display="flex" alignItems="center" gap={0.8}>
                                                            <Typography variant="caption" fontWeight={700} sx={{ color: "#475569" }}>
                                                                Gợi ý lời dặn điều trị:
                                                            </Typography>
                                                        </Box>
                                                        <Box display="flex" flexWrap="wrap" gap={0.8} mb={1.5}>
                                                            {QUICK_ADVICE_TAGS.map((adv, idx) => (
                                                                <Chip
                                                                    key={idx}
                                                                    label={adv}
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setTreatmentPlan(treatmentPlan ? `${treatmentPlan}\n- ${adv}` : `- ${adv}`);
                                                                    }}
                                                                    sx={{
                                                                        cursor: "pointer",
                                                                        bgcolor: "#f1f5f9",
                                                                        fontSize: "0.73rem",
                                                                        "&:hover": { bgcolor: "#dcfce7", color: "#166534" }
                                                                    }}
                                                                />
                                                            ))}
                                                        </Box>
                                                        <TextField
                                                            fullWidth
                                                            multiline
                                                            rows={3}
                                                            label="Phác đồ điều trị & Lời dặn chuyên môn của Bác sĩ"
                                                            placeholder="Nghỉ ngơi, uống nhiều nước ấm, theo dõi thân nhiệt, kiêng đồ dầu mỡ..."
                                                            value={treatmentPlan}
                                                            onChange={(e) => setTreatmentPlan(e.target.value)}
                                                            InputProps={{ sx: { borderRadius: 2 } }}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sm={6}>
                                                        <TextField
                                                            fullWidth
                                                            type="date"
                                                            label="Hẹn ngày tái khám (nếu cần)"
                                                            InputLabelProps={{ shrink: true }}
                                                            value={reExamDate}
                                                            onChange={(e) => setReExamDate(e.target.value)}
                                                            InputProps={{ sx: { borderRadius: 2 } }}
                                                        />
                                                    </Grid>

                                                    <Grid item xs={12} sm={6} display="flex" alignItems="center" justifyContent="flex-end">
                                                        <Button
                                                            variant="contained"
                                                            size="large"
                                                            onClick={handleSaveDiagnosis}
                                                            disabled={savingDiagnosis}
                                                            sx={{
                                                                bgcolor: "#0284c7",
                                                                px: 4,
                                                                fontWeight: 800,
                                                                borderRadius: 2,
                                                                textTransform: "none",
                                                                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                                                                "&:hover": { bgcolor: "#0369a1" }
                                                            }}
                                                        >
                                                            {savingDiagnosis ? "Đang lưu..." : "Lưu Kết Luận Chẩn Đoán"}
                                                        </Button>
                                                    </Grid>
                                                </Grid>

                                                <Divider sx={{ my: 3 }} />

                                                {/* HƯỚNG XỬ TRÍ LÂM SÀNG: ĐIỀU TRỊ NGOẠI TRÚ VS NỘI TRÚ */}
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        p: 2.5,
                                                        borderRadius: 2.5,
                                                        bgcolor: "#f8fafc",
                                                        border: "1px solid #e2e8f0"
                                                    }}
                                                >
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                                                        <Box>
                                                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#0f172a" }}>
                                                                🎯 Quyết Định Hướng Xử Trí & Phân Tuyến Điều Trị
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                                Dựa vào kết quả khám và cận lâm sàng, bác sĩ chỉ định điều trị ngoại trú hoặc lập phiếu chuyển vào khoa nội trú
                                                            </Typography>
                                                        </Box>
                                                        {admissionInfo && (
                                                            <Chip
                                                                icon={<HotelIcon />}
                                                                label={`ĐÃ LẬP PHIẾU NHẬP VIỆN (${admissionInfo.admissionCode || "NỘI TRÚ"})`}
                                                                color="error"
                                                                size="small"
                                                                sx={{ fontWeight: 700, whiteSpace: "nowrap" }}
                                                            />
                                                        )}
                                                    </Box>

                                                    {admissionInfo && (
                                                        <Alert
                                                            severity="warning"
                                                            icon={<HotelIcon />}
                                                            action={
                                                                <Button
                                                                    color="error"
                                                                    size="small"
                                                                    variant="contained"
                                                                    onClick={() => navigate("/doctor/inpatient")}
                                                                    sx={{ fontWeight: "bold", textTransform: "none", borderRadius: 2 }}
                                                                >
                                                                    Xem Sơ Đồ Giường Nội Trú ➔
                                                                </Button>
                                                            }
                                                            sx={{
                                                                mb: 2.5,
                                                                borderRadius: 2,
                                                                fontWeight: 600,
                                                                border: "1px solid #fecaca",
                                                                bgcolor: "#fef2f2",
                                                                color: "#991b1b"
                                                            }}
                                                        >
                                                            Bệnh nhân <b>{selectedPatient?.patientName || "Bệnh nhân"}</b> đã có hồ sơ chỉ định nhập viện (Mã BA: <b>{admissionInfo.admissionCode}</b>). 
                                                            Hồ sơ đã được liên thông sang Khoa Nội trú và sẵn sàng tiếp nhận xếp buồng giường bệnh.
                                                        </Alert>
                                                    )}

                                                    <Grid container spacing={2}>
                                                        {/* LỰA CHỌN 1: ĐIỀU TRỊ NGOẠI TRÚ */}
                                                        <Grid item xs={12} md={4}>
                                                            <Card
                                                                variant="outlined"
                                                                sx={{
                                                                    borderRadius: 2.5,
                                                                    borderColor: "#bbf7d0",
                                                                    bgcolor: "#f0fdf4",
                                                                    height: "100%",
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    justifyContent: "space-between",
                                                                    p: 2
                                                                }}
                                                            >
                                                                <Box>
                                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                                        <Chip label="HƯỚNG 1" size="small" sx={{ bgcolor: "#16a34a", color: "#ffffff", fontWeight: 800 }} />
                                                                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#166534" }}>
                                                                            Điều Trị Ngoại Trú (Kê Toa Thuốc)
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="body2" sx={{ color: "#15803d", mb: 2 }}>
                                                                        Bệnh nhân tình trạng ổn định, nhẹ hoặc trung bình, đủ điều kiện cấp đơn thuốc về điều trị tại nhà và hẹn ngày tái khám.
                                                                    </Typography>
                                                                </Box>
                                                                <Button
                                                                    variant="contained"
                                                                    endIcon={<ArrowForwardIcon />}
                                                                    onClick={() => setActiveTab(2)}
                                                                    sx={{
                                                                        bgcolor: "#16a34a",
                                                                        borderRadius: 2,
                                                                        fontWeight: 800,
                                                                        textTransform: "none",
                                                                        boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                                                                        "&:hover": { bgcolor: "#15803d" }
                                                                    }}
                                                                >
                                                                    Sang Bước: Kê Đơn Thuốc
                                                                </Button>
                                                            </Card>
                                                        </Grid>

                                                        {/* LỰA CHỌN 2: CHỈ ĐỊNH NHẬP VIỆN NỘI TRÚ */}
                                                        <Grid item xs={12} md={4}>
                                                            <Card
                                                                variant="outlined"
                                                                sx={{
                                                                    borderRadius: 2.5,
                                                                    borderColor: "#fecaca",
                                                                    bgcolor: "#fef2f2",
                                                                    height: "100%",
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    justifyContent: "space-between",
                                                                    p: 2
                                                                }}
                                                            >
                                                                <Box>
                                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                                        <Chip label="HƯỚNG 2" size="small" sx={{ bgcolor: "#b91c1c", color: "#ffffff", fontWeight: 800 }} />
                                                                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#991b1b" }}>
                                                                            Chỉ Định Nhập Viện Nội Trú
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="body2" sx={{ color: "#7f1d1d", mb: 2 }}>
                                                                        Bệnh nhân diễn biến nặng, cấp cứu, hoặc cần can thiệp phẫu thuật / thủ thuật, truyền dịch, theo dõi sát tại buồng bệnh nội trú.
                                                                    </Typography>
                                                                </Box>
                                                                <Button
                                                                    variant="contained"
                                                                    startIcon={<HotelIcon />}
                                                                    onClick={() => {
                                                                        if (!finalDiagnosis) {
                                                                            setFinalDiagnosis("Cần nhập viện theo dõi và điều trị nội trú");
                                                                        }
                                                                        setOpenAdmitModal(true);
                                                                    }}
                                                                    sx={{
                                                                        bgcolor: "#b91c1c",
                                                                        borderRadius: 2,
                                                                        fontWeight: 800,
                                                                        textTransform: "none",
                                                                        boxShadow: "0 4px 12px rgba(185, 28, 28, 0.3)",
                                                                        "&:hover": { bgcolor: "#991b1b" }
                                                                    }}
                                                                >
                                                                    {admissionInfo ? "Xem / Bổ Sung Chỉ Định Nhập Viện" : "Lập Phiếu Chỉ Định Nhập Viện"}
                                                                </Button>
                                                            </Card>
                                                        </Grid>

                                                        {/* LỰA CHỌN 3: TƯ VẤN & KẾT THÚC KHÁM (KHÔNG DÙNG THUỐC) */}
                                                        <Grid item xs={12} md={4}>
                                                            <Card
                                                                variant="outlined"
                                                                sx={{
                                                                    borderRadius: 2.5,
                                                                    borderColor: "#bae6fd",
                                                                    bgcolor: "#f0f9ff",
                                                                    height: "100%",
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    justifyContent: "space-between",
                                                                    p: 2
                                                                }}
                                                            >
                                                                <Box>
                                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                                        <Chip label="HƯỚNG 3" size="small" sx={{ bgcolor: "#0284c7", color: "#ffffff", fontWeight: 800 }} />
                                                                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#0369a1" }}>
                                                                            Tư Vấn & Kết Thúc Khám
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="body2" sx={{ color: "#075985", mb: 2 }}>
                                                                        Bệnh nhân không cần dùng thuốc, chỉ cần điều chỉnh chế độ ăn uống, sinh hoạt, tập luyện hoặc hẹn tái khám.
                                                                    </Typography>
                                                                </Box>
                                                                <Button
                                                                    variant="contained"
                                                                    startIcon={completingExam ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                                                                    onClick={handleCompleteExamWithoutPrescription}
                                                                    disabled={completingExam || record?.state === "DONE" || ((record?.medicalTests || record?.tests || []).some(t => t.state !== "COMPLETED" && t.state !== "CANCELLED"))}
                                                                    sx={{
                                                                        bgcolor: (record?.state === "DONE" || ((record?.medicalTests || record?.tests || []).some(t => t.state !== "COMPLETED" && t.state !== "CANCELLED"))) ? "#94a3b8" : "#0284c7",
                                                                        borderRadius: 2,
                                                                        fontWeight: 800,
                                                                        textTransform: "none",
                                                                        boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                                                                        "&:hover": { bgcolor: "#0369a1" }
                                                                    }}
                                                                >
                                                                    {record?.state === "DONE" ? "Ca Khám Đã Hoàn Tất" : (completingExam ? "Đang xử lý..." : "Hoàn Tất Ca Khám (Không Dùng Thuốc)")}
                                                                </Button>
                                                                {((record?.medicalTests || record?.tests || []).some(t => t.state !== "COMPLETED" && t.state !== "CANCELLED")) && (
                                                                    <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5, textAlign: "center", fontWeight: 700 }}>
                                                                        ⚠️ Còn xét nghiệm chưa có kết quả hoặc chưa hủy.
                                                                    </Typography>
                                                                )}
                                                                {record && record.state !== "DONE" && (record.medicalTests?.length > 0 || record.tests?.length > 0) && (
                                                                    <Button
                                                                        fullWidth
                                                                        variant="outlined"
                                                                        color="warning"
                                                                        size="small"
                                                                        sx={{ mt: 1, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                                                                        onClick={() => setOpenAbandonModal(true)}
                                                                    >
                                                                        Bệnh nhân không quay lại sau CLS
                                                                    </Button>
                                                                )}
                                                            </Card>
                                                        </Grid>
                                                    </Grid>
                                                </Paper>

                                                <Box display="flex" justifyContent="space-between" mt={3}>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => setActiveTab(1)}
                                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                                    >
                                                        Chuyển sang: Cận lâm sàng & Xét nghiệm (Bước 2)
                                                    </Button>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* TAB 2: CẬN LÂM SÀNG & XÉT NGHIỆM */}
                                        {activeTab === 1 && (
                                            <Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a" }}>
                                                            🔬 Chỉ Định Cận Lâm Sàng & Chẩn Đoán Hình Ảnh
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                            Đồng bộ trực tiếp kết quả xét nghiệm, siêu âm, X-quang từ Kỹ thuật viên phòng Lab
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={1.5}>
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={isRefreshingTests ? <CircularProgress size={16} /> : <RefreshIcon />}
                                                            onClick={handleManualSyncTests}
                                                            disabled={isRefreshingTests}
                                                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                                        >
                                                            {isRefreshingTests ? "Đang đồng bộ..." : "Đồng Bộ Kết Quả"}
                                                        </Button>
                                                        <Button
                                                            variant="contained"
                                                            size="medium"
                                                            startIcon={<ScienceIcon />}
                                                            onClick={() => setOpenTestModal(true)}
                                                            sx={{
                                                                bgcolor: "#0284c7",
                                                                borderRadius: 2,
                                                                fontWeight: 700,
                                                                textTransform: "none",
                                                                boxShadow: "0 4px 10px rgba(2, 132, 199, 0.25)",
                                                                "&:hover": { bgcolor: "#0369a1" }
                                                            }}
                                                        >
                                                            + Chỉ Định Xét Nghiệm Mới
                                                        </Button>
                                                    </Stack>
                                                </Box>

                                                {/* CẢNH BÁO BẤT THƯỜNG XÉT NGHIỆM CHO BÁC SĨ */}
                                                {record.tests && record.tests.some(t => t.state === "COMPLETED" && hasAbnormalIndicator(t.testResult)) && (
                                                    <Alert
                                                        severity="error"
                                                        icon={<WarningAmberIcon sx={{ fontSize: 26 }} />}
                                                        sx={{
                                                            mb: 2.5,
                                                            borderRadius: 2.5,
                                                            bgcolor: "#FEF2F2",
                                                            border: "1.5px solid #FCA5A5",
                                                            "& .MuiAlert-message": { width: "100%" }
                                                        }}
                                                    >
                                                        <Typography variant="subtitle2" fontWeight={800} color="#991B1B">
                                                            ⚠️ CẢNH BÁO LÂM SÀNG: Phát hiện chỉ số xét nghiệm vượt ngưỡng sinh lý bất thường!
                                                        </Typography>
                                                        <Typography variant="caption" color="#B91C1C">
                                                            Vui lòng đối chiếu các giá trị [⬆️ CAO] hoặc [⬇️ THẤP] và xem phim X-Quang / Siêu âm trực tiếp trên PACS Web Viewer trước khi chỉ định phác đồ điều trị.
                                                        </Typography>
                                                    </Alert>
                                                )}

                                                {(!record.tests || record.tests.length === 0) ? (
                                                    <Paper
                                                        elevation={0}
                                                        sx={{
                                                            p: 5,
                                                            textAlign: "center",
                                                            borderRadius: 3,
                                                            bgcolor: "#f8fafc",
                                                            border: "1px dashed #cbd5e1"
                                                        }}
                                                    >
                                                        <ScienceIcon sx={{ fontSize: 52, color: "#94a3b8", mb: 1 }} />
                                                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#334155" }}>
                                                            Chưa có chỉ định cận lâm sàng nào
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
                                                            Bác sĩ có thể chỉ định xét nghiệm máu, nước tiểu, X-quang, Siêu âm hoặc chuyển thẳng sang bước chẩn đoán.
                                                        </Typography>
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<ScienceIcon />}
                                                            onClick={() => setOpenTestModal(true)}
                                                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                                        >
                                                            Chỉ định cận lâm sàng ngay
                                                        </Button>
                                                    </Paper>
                                                ) : (
                                                    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2.5 }}>
                                                        <Table size="medium">
                                                            <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                                                <TableRow>
                                                                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>MÃ CHỈ ĐỊNH</TableCell>
                                                                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>TÊN DỊCH VỤ CẬN LÂM SÀNG</TableCell>
                                                                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>ĐƠN GIÁ</TableCell>
                                                                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>TRẠNG THÁI</TableCell>
                                                                    <TableCell sx={{ fontWeight: 800, color: "#475569" }}>KẾT QUẢ / HÌNH ẢNH</TableCell>
                                                                    <TableCell sx={{ fontWeight: 800, color: "#475569", textAlign: "center" }}>THAO TÁC</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {record.tests.map((t) => (
                                                                    <TableRow key={t.testId} hover>
                                                                        <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>{t.testCode}</TableCell>
                                                                        <TableCell sx={{ fontWeight: 600 }}>{t.serviceName}</TableCell>
                                                                        <TableCell sx={{ fontWeight: 700, color: "#0284c7" }}>{formatCurrency(t.price)}</TableCell>
                                                                        <TableCell>
                                                                            <Chip
                                                                                label={t.state === "COMPLETED" ? "ĐÃ CÓ KẾT QUẢ" : (t.state === "CANCELLED" ? "ĐÃ HỦY CHỈ ĐỊNH" : "ĐANG CHỜ KẾT QUẢ")}
                                                                                sx={{
                                                                                    fontWeight: 800,
                                                                                    fontSize: "0.7rem",
                                                                                    bgcolor: t.state === "COMPLETED" ? "#dcfce7" : (t.state === "CANCELLED" ? "#f1f5f9" : "#fef3c7"),
                                                                                    color: t.state === "COMPLETED" ? "#15803d" : (t.state === "CANCELLED" ? "#64748b" : "#b45309")
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell sx={{ minWidth: 280 }}>
                                                                            {t.testResult ? (
                                                                                <Box>
                                                                                    {hasAbnormalIndicator(t.testResult) && (
                                                                                        <Chip
                                                                                            icon={<WarningAmberIcon sx={{ fontSize: "14px !important" }} />}
                                                                                            label="⚠️ CÓ CHỈ SỐ BẤT THƯỜNG"
                                                                                            size="small"
                                                                                            color="error"
                                                                                            sx={{ height: 22, fontSize: "0.7rem", fontWeight: 800, mb: 0.8 }}
                                                                                        />
                                                                                    )}
                                                                                    <Typography
                                                                                        variant="body2"
                                                                                        sx={{
                                                                                            fontWeight: 500,
                                                                                            color: hasAbnormalIndicator(t.testResult) ? "#991B1B" : "#0f172a",
                                                                                            bgcolor: hasAbnormalIndicator(t.testResult) ? "#FEF2F2" : "#F8FAFC",
                                                                                            p: 1.2,
                                                                                            borderRadius: 1.5,
                                                                                            border: hasAbnormalIndicator(t.testResult) ? "1px solid #FECACA" : "1px solid #E2E8F0",
                                                                                            whiteSpace: "pre-line",
                                                                                            fontSize: "0.825rem",
                                                                                            lineHeight: 1.5
                                                                                        }}
                                                                                    >
                                                                                        {t.testResult}
                                                                                    </Typography>
                                                                                    {t.resultFileUrl && (
                                                                                        <Button
                                                                                            size="small"
                                                                                            variant="contained"
                                                                                            startIcon={<CameraAltIcon />}
                                                                                            onClick={() => {
                                                                                                const isXray = (t.serviceName || "").toLowerCase().includes("x-quang") || (t.serviceName || "").toLowerCase().includes("phổi");
                                                                                                const isAbnormal = hasAbnormalIndicator(t.testResult);
                                                                                                setPacsTarget({
                                                                                                    imageSrc: t.resultFileUrl,
                                                                                                    patientName: selectedPatient?.patientName || "Bệnh nhân",
                                                                                                    patientCode: selectedPatient?.queueCode || t.testCode,
                                                                                                    patientAge: selectedPatient?.patientAge || "35",
                                                                                                    patientGender: selectedPatient?.patientGender === "FEMALE" ? "Nữ" : "Nam",
                                                                                                    serviceName: t.serviceName,
                                                                                                    studyDate: t.createdAt,
                                                                                                    doctorName: t.doctorName || "BS. Điều trị",
                                                                                                    diagnosisSummary: t.testResult,
                                                                                                    aiFindings: (isXray && isAbnormal) ? {
                                                                                                        summary: "Phát hiện vùng mờ bất thường tại thùy dưới phổi phải. Xác suất tổn thương đông đặc 74.5%.",
                                                                                                        confidence: 74.5,
                                                                                                        suspectedCondition: "Nghi ngờ Viêm phổi thùy (Lobar Pneumonia)"
                                                                                                    } : null
                                                                                                });
                                                                                            }}
                                                                                            sx={{
                                                                                                mt: 1,
                                                                                                fontWeight: 700,
                                                                                                textTransform: "none",
                                                                                                borderRadius: 2,
                                                                                                bgcolor: "#0284C7",
                                                                                                fontSize: "0.78rem",
                                                                                                "&:hover": { bgcolor: "#0369A1" }
                                                                                            }}
                                                                                        >
                                                                                            🩻 Xem Ảnh PACS / DICOM Chuyên Dụng
                                                                                        </Button>
                                                                                    )}
                                                                                </Box>
                                                                            ) : (
                                                                                <Typography variant="caption" sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                                                                                    KTV phòng Lab đang thực hiện...
                                                                                </Typography>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell align="center">
                                                                        {t.state !== "COMPLETED" && t.state !== "CANCELLED" ? (
                                                                            <Tooltip title="Hủy chỉ định nếu bệnh nhân từ chối hoặc đổi hướng điều trị">
                                                                                <Button
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                    color="error"
                                                                                    startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
                                                                                    onClick={() => handleOpenCancelDialog(t)}
                                                                                    sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: "0.75rem", textTransform: "none" }}
                                                                                >
                                                                                    Hủy Chỉ Định
                                                                                </Button>
                                                                            </Tooltip>
                                                                        ) : (
                                                                            <Typography variant="caption" color="textSecondary" sx={{ fontStyle: "italic" }}>
                                                                                {t.state === "CANCELLED" ? "Đã hủy" : "Hoàn tất"}
                                                                            </Typography>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                )}

                                                <Box mt={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => setActiveTab(0)}
                                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                                    >
                                                        Quay lại: Khám lâm sàng (Bước 1)
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        color="error"
                                                        startIcon={<HotelIcon />}
                                                        onClick={() => {
                                                            if (!finalDiagnosis) {
                                                                setFinalDiagnosis("Cần theo dõi và điều trị nội trú chuyên khoa");
                                                            }
                                                            setActiveTab(1);
                                                            setOpenAdmitModal(true);
                                                        }}
                                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                                    >
                                                        Chỉ Định Nhập Viện Cấp Cứu / Nội Trú (Hướng 2)
                                                    </Button>
                                                    <Button
                                                        variant="contained"
                                                        size="medium"
                                                        endIcon={<ArrowForwardIcon />}
                                                        onClick={() => setActiveTab(2)}
                                                        sx={{
                                                            bgcolor: "#0284c7",
                                                            borderRadius: 2,
                                                            fontWeight: 700,
                                                            textTransform: "none",
                                                            "&:hover": { bgcolor: "#0369a1" }
                                                        }}
                                                    >
                                                        Tiếp tục: Kê đơn thuốc (Bước 3)
                                                    </Button>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* TAB 3: KÊ ĐƠN THUỐC & KẾT THÚC CA KHÁM */}
                                        {activeTab === 2 && (
                                            <Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
                                                    <Box>
                                                        <Typography variant="h6" fontWeight={800} sx={{ color: "#166534" }}>
                                                            💊 Đơn Thuốc Điện Tử & Kết Thúc Buổi Khám
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                            Sau khi kê đơn, hệ thống tự động trừ kho dược phẩm và hoàn tất hồ sơ khám
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={1.5}>
                                                        {record.prescription && (
                                                            <Button
                                                                variant="outlined"
                                                                color="success"
                                                                startIcon={<PrintIcon />}
                                                                onClick={() => setOpenRxPrintModal(true)}
                                                                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                                            >
                                                                In Đơn Thuốc (A4)
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="contained"
                                                            startIcon={<MedicationIcon />}
                                                            onClick={() => setOpenRxModal(true)}
                                                            sx={{
                                                                bgcolor: "#16a34a",
                                                                borderRadius: 2,
                                                                fontWeight: 800,
                                                                textTransform: "none",
                                                                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
                                                                "&:hover": { bgcolor: "#15803d" }
                                                            }}
                                                        >
                                                            {record.prescription ? "Điều Chỉnh Đơn Thuốc" : "Kê Đơn Thuốc Mới"}
                                                        </Button>
                                                    </Stack>
                                                </Box>

                                                {record.prescription ? (
                                                    <Paper
                                                        elevation={0}
                                                        sx={{
                                                            p: 2.5,
                                                            borderRadius: 2.5,
                                                            bgcolor: "#f0fdf4",
                                                            border: "1px solid #bbf7d0"
                                                        }}
                                                    >
                                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                            <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#166534" }}>
                                                                Mã đơn thuốc: <b>{record.prescription.prescriptionCode}</b>
                                                            </Typography>
                                                            <Chip label="ĐÃ KÊ TOA THÀNH CÔNG" color="success" size="small" sx={{ fontWeight: 800 }} />
                                                        </Box>
                                                        <TableContainer component={Paper} elevation={0} sx={{ bgcolor: "#ffffff", borderRadius: 2, border: "1px solid #dcfce7" }}>
                                                            <Table size="small">
                                                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                                                    <TableRow>
                                                                        <TableCell sx={{ fontWeight: 800 }}>TÊN THUỐC & HOẠT CHẤT</TableCell>
                                                                        <TableCell align="center" sx={{ fontWeight: 800 }}>SỐ LƯỢNG</TableCell>
                                                                        <TableCell sx={{ fontWeight: 800 }}>HƯỚNG DẪN LIỀU DÙNG</TableCell>
                                                                        <TableCell align="right" sx={{ fontWeight: 800 }}>THÀNH TIỀN</TableCell>
                                                                    </TableRow>
                                                                </TableHead>
                                                                <TableBody>
                                                                    {record.prescription.items?.map((it, idx) => (
                                                                        <TableRow key={idx} hover>
                                                                            <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>{it.medicineName}</TableCell>
                                                                            <TableCell align="center">
                                                                                <Chip label={`${it.quantity} ${it.unit}`} size="small" sx={{ fontWeight: 700 }} />
                                                                            </TableCell>
                                                                            <TableCell sx={{ color: "#334155" }}>
                                                                                {it.dosageInstruction || `Sáng: ${it.morningAmount} • Trưa: ${it.noonAmount} • Chiều: ${it.afternoonAmount} • Tối: ${it.eveningAmount}`}
                                                                            </TableCell>
                                                                            <TableCell align="right" sx={{ fontWeight: 700, color: "#16a34a" }}>
                                                                                {formatCurrency(it.totalPrice)}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </TableContainer>
                                                        <Box display="flex" justifyContent="flex-end" mt={2}>
                                                            <Typography variant="h6" fontWeight={800} sx={{ color: "#166534" }}>
                                                                Tổng tiền thuốc: {formatCurrency(record.prescription.totalAmount)}
                                                            </Typography>
                                                        </Box>
                                                    </Paper>
                                                ) : (
                                                    <Paper
                                                        elevation={0}
                                                        sx={{
                                                            p: 3,
                                                            textAlign: "center",
                                                            borderRadius: 2.5,
                                                            bgcolor: "#f8fafc",
                                                            border: "1px dashed #cbd5e1"
                                                        }}
                                                    >
                                                        <MedicationIcon sx={{ fontSize: 36, color: "#94a3b8", mb: 1 }} />
                                                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#334155" }}>
                                                            Chưa kê đơn thuốc cho bệnh nhân này
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: "#64748b", mb: 2, fontSize: "0.85rem" }}>
                                                            Bác sĩ có thể bấm kê đơn thuốc hoặc bấm hoàn tất ca khám nếu bệnh nhân không cần dùng thuốc.
                                                        </Typography>
                                                        <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
                                                            <Button
                                                                variant="contained"
                                                                size="medium"
                                                                startIcon={<MedicationIcon />}
                                                                onClick={() => setOpenRxModal(true)}
                                                                sx={{
                                                                    bgcolor: "#16a34a",
                                                                    borderRadius: 2,
                                                                    fontWeight: 700,
                                                                    textTransform: "none",
                                                                    "&:hover": { bgcolor: "#15803d" }
                                                                }}
                                                            >
                                                                Kê đơn thuốc ngay
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                color="primary"
                                                                size="medium"
                                                                startIcon={completingExam ? <CircularProgress size={18} /> : <CheckCircleIcon />}
                                                                onClick={handleCompleteExamWithoutPrescription}
                                                                disabled={completingExam || record?.state === "DONE" || ((record?.medicalTests || record?.tests || []).some(t => t.state !== "COMPLETED" && t.state !== "CANCELLED"))}
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    fontWeight: 700,
                                                                    textTransform: "none"
                                                                }}
                                                            >
                                                                {record?.state === "DONE" ? "Đã Hoàn Tất Khám" : (completingExam ? "Đang xử lý..." : "Hoàn Tất Khám (Không Dùng Thuốc)")}
                                                            </Button>
                                                        </Stack>
                                                    </Paper>
                                                )}

                                                {/* HƯỚNG DẪN BỆNH NHÂN SAU KHI HOÀN TẤT */}
                                                {(record.prescription || record.state === "DONE") && (
                                                    <Alert severity="success" sx={{ mt: 2.5, borderRadius: 2 }}>
                                                        <Typography variant="subtitle2" fontWeight={800}>
                                                            ✅ Buổi khám bệnh đã hoàn tất!
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                            {record.prescription
                                                                ? "Bệnh nhân vui lòng di chuyển đến Quầy Thu Ngân để thanh toán tiền thuốc (hoặc quét mã VietQR), sau đó nhận thuốc tại Quầy Dược Ngoại Trú theo quy trình cấp phát FEFO."
                                                                : "Bệnh nhân đã được ghi nhận chẩn đoán và hướng dẫn điều trị. Bác sĩ có thể in Hồ sơ bệnh án tóm tắt hoặc dặn dò bệnh nhân ngày tái khám."
                                                            }
                                                        </Typography>
                                                        <Box mt={1.5} display="flex" gap={1} flexWrap="wrap">
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                color="success"
                                                                startIcon={<PrintIcon />}
                                                                onClick={() => setOpenRecordPrintModal(true)}
                                                                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                                                            >
                                                                In Hồ Sơ Bệnh Án (A4)
                                                            </Button>
                                                            {record.prescription && (
                                                                <Button
                                                                    size="small"
                                                                    variant="contained"
                                                                    color="success"
                                                                    startIcon={<PrintIcon />}
                                                                    onClick={() => setOpenRxPrintModal(true)}
                                                                    sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
                                                                >
                                                                    In Đơn Thuốc (A4)
                                                                </Button>
                                                            )}
                                                        </Box>
                                                    </Alert>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </Paper>
                            ) : null}

                            {/* SUB MODALS */}
                            {record && (
                                <>
                                    <AssignTestsModal
                                        open={openTestModal}
                                        onClose={() => setOpenTestModal(false)}
                                        recordId={record.recordId}
                                        onAssigned={refreshRecord}
                                    />
                                    <PrescriptionModal
                                        open={openRxModal}
                                        onClose={() => setOpenRxModal(false)}
                                        recordId={record.recordId}
                                        patientAllergies={patientVitals.allergies}
                                        onPrescribed={() => {
                                            refreshRecord();
                                            setMessage("Buổi khám bệnh đã hoàn tất xuất sắc!");
                                        }}
                                    />
                                    <PrescriptionPrintModal
                                        open={openRxPrintModal}
                                        onClose={() => setOpenRxPrintModal(false)}
                                        record={record}
                                        prescription={record.prescription}
                                    />
                                    <MedicalRecordPrintModal
                                        open={openRecordPrintModal}
                                        onClose={() => setOpenRecordPrintModal(false)}
                                        record={record}
                                    />
                                    <AddendumModal
                                        open={openAddendumModal}
                                        onClose={() => setOpenAddendumModal(false)}
                                        record={record}
                                        onAddendumSuccess={() => {
                                            refreshRecord();
                                            setMessage("Đã lập Phụ lục Bệnh án (EMR Addendum) theo Thông tư 46/2018/TT-BYT thành công!");
                                        }}
                                    />
                                    <InpatientAdmitModal
                                        open={openAdmitModal}
                                        onClose={() => setOpenAdmitModal(false)}
                                        patient={selectedPatient}
                                        record={{
                                            ...record,
                                            finalDiagnosis: finalDiagnosis || record?.finalDiagnosis,
                                            initialDiagnosis: initialDiagnosis || record?.initialDiagnosis
                                        }}
                                        onSuccess={async (admission) => {
                                            setAdmissionInfo(admission);
                                            setMessage(`Đã lập phiếu chỉ định nhập viện cho bệnh nhân ${selectedPatient?.patientName || "bệnh nhân"} (Mã: ${admission?.admissionCode || "NỘI TRÚ"}) thành công! Hồ sơ đã được chuyển tiếp sang Khoa Nội trú.`);
                                            if (record && finalDiagnosis && (!record.finalDiagnosis || record.finalDiagnosis !== finalDiagnosis)) {
                                                try {
                                                    await axiosInstance.put(`/api/clinical/records/${record.recordId}/diagnosis`, {
                                                        finalDiagnosis,
                                                        treatmentPlan: treatmentPlan || "Chuyển viện nội trú theo dõi và điều trị",
                                                        reExaminationDate: reExamDate || null,
                                                    });
                                                } catch (e) {
                                                    console.error("Lỗi tự động lưu chẩn đoán:", e);
                                                }
                                            }
                                            fetchDoctorQueue();
                                        }}
                                    />
                                </>
                            )}

                            {/* DIALOG CHỈNH SỬA / CẬP NHẬT SINH HIỆU & TIỀN SỬ */}
                            <EditVitalsModal
                                open={openEditVitalsModal}
                                onClose={() => setOpenEditVitalsModal(false)}
                                editingVitals={editingVitals}
                                setEditingVitals={setEditingVitals}
                                onSave={(updatedVitals) => {
                                    setPatientVitals(updatedVitals);
                                    setMessage("Đã cập nhật sinh hiệu, chỉ số BMI và tiền sử dị ứng của bệnh nhân!");
                                }}
                                calculateBMI={calculateBMI}
                            />
                        </Box>
                    ) : (
                        /* EMPTY STATE WHEN NO PATIENT IS SELECTED */
                        <Paper
                            elevation={0}
                            sx={{
                                p: 4,
                                textAlign: "center",
                                borderRadius: 3,
                                minHeight: 380,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "#f8fafc",
                                border: "1.5px dashed #cbd5e1"
                            }}
                        >
                            <Box
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: "50%",
                                    bgcolor: "#e0f2fe",
                                    color: "#0284c7",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    mb: 1.5
                                }}
                            >
                                <PersonPinIcon sx={{ fontSize: 32 }} />
                            </Box>
                            <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a", mb: 0.5 }}>
                                Chọn Bệnh Nhân Để Bắt Đầu Khám
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#64748b", maxWidth: 440, mb: 2.5, lineHeight: 1.5 }}>
                                Vui lòng chọn một bệnh nhân từ Hàng đợi bên trái, hoặc nhấn nút <b>"Gọi Số Tiếp"</b> để tự động gọi bệnh nhân tiếp theo vào phòng khám.
                            </Typography>
                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={<VolumeUpIcon />}
                                onClick={handleCallNext}
                                sx={{
                                    bgcolor: "#f59e0b",
                                    color: "#0f172a",
                                    fontWeight: 800,
                                    px: 3,
                                    py: 1,
                                    borderRadius: 2,
                                    textTransform: "none",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                                    "&:hover": { bgcolor: "#d97706" }
                                }}
                            >
                                Gọi Số Tiếp Theo ({waitingCount})
                            </Button>
                        </Paper>
                    )}
                </Grid>
            </Grid>

            {/* PACS MEDICAL DICOM WEB VIEWER MODAL */}
            <PacsViewerModal
                open={Boolean(pacsTarget)}
                onClose={() => setPacsTarget(null)}
                imageSrc={pacsTarget?.imageSrc}
                patientName={pacsTarget?.patientName}
                patientCode={pacsTarget?.patientCode}
                patientAge={pacsTarget?.patientAge}
                patientGender={pacsTarget?.patientGender}
                serviceName={pacsTarget?.serviceName}
                studyDate={pacsTarget?.studyDate}
                doctorName={pacsTarget?.doctorName}
                diagnosisSummary={pacsTarget?.diagnosisSummary}
                aiFindings={pacsTarget?.aiFindings}
            />

            {/* DOCTOR MY SCHEDULE MODAL */}
            <DoctorScheduleModal
                open={openScheduleModal}
                onClose={() => setOpenScheduleModal(false)}
                loadingSchedules={loadingSchedules}
                mySchedules={mySchedules}
                formatDate={formatDate}
            />
        </Container>
    );
}
