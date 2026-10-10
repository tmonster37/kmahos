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
import CameraAltIcon from "@mui/icons-material/CameraAlt";

import AssignTestsModal from "./AssignTestsModal";
import PrescriptionModal from "./PrescriptionModal";
import PrescriptionPrintModal from "./PrescriptionPrintModal";
import MedicalRecordPrintModal from "./MedicalRecordPrintModal";
import InpatientAdmitModal from "./InpatientAdmitModal";
import PacsViewerModal from "../../components/PacsViewerModal";
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

// Common ICD-10 Quick Templates for Vietnamese Clinical Practice
const ICD10_QUICK_TEMPLATES = [
    { code: "J00", name: "Viêm mũi họng cấp (Cảm thường)" },
    { code: "J02.9", name: "Viêm họng cấp" },
    { code: "J20.9", name: "Viêm phế quản cấp" },
    { code: "K29.7", name: "Viêm dạ dày không đặc hiệu" },
    { code: "K21.9", name: "Trào ngược dạ dày - thực quản (GERD)" },
    { code: "I10", name: "Tăng huyết áp vô căn (nguyên phát)" },
    { code: "E11.9", name: "Đái tháo đường typ 2" },
    { code: "M54.5", name: "Đau thắt lưng (Đau lưng dưới)" },
    { code: "G43.9", name: "Đau nửa đầu Migraine" },
    { code: "A09", name: "Viêm dạ dày ruột / Tiêu chảy nhiễm khuẩn" },
    { code: "B34.9", name: "Nhiễm virus không đặc hiệu" },
    { code: "R50.9", name: "Sốt không rõ nguyên nhân" }
];

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

    // Modals
    const [openTestModal, setOpenTestModal] = useState(false);
    const [openRxModal, setOpenRxModal] = useState(false);
    const [openRxPrintModal, setOpenRxPrintModal] = useState(false);
    const [openRecordPrintModal, setOpenRecordPrintModal] = useState(false);
    const [openScheduleModal, setOpenScheduleModal] = useState(false);
    const [openAdmitModal, setOpenAdmitModal] = useState(false);
    const [admissionInfo, setAdmissionInfo] = useState(null);
    const [mySchedules, setMySchedules] = useState([]);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [pacsTarget, setPacsTarget] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [message, setMessage] = useState("");
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
        const interval = setInterval(fetchDoctorQueue, 15000);
        return () => clearInterval(interval);
    }, []);

    // Auto-sync lab test results periodically when pending
    useEffect(() => {
        if (!record || !record.recordId) return;
        const hasPendingTests = record.tests && record.tests.some((t) => t.state !== "COMPLETED");
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
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
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

        // 1. Kiểm tra xem Điều dưỡng đã đo sinh hiệu ở Bàn sơ chẩn (Triage) chưa:
        let triageVitals = null;
        try {
            const cleanPhone = patientItem.phone ? patientItem.phone.trim() : (patientItem.patientPhone ? patientItem.patientPhone.trim() : null);
            const cleanName = patientItem.patientName ? patientItem.patientName.trim().toLowerCase() : null;
            const cleanBooking = patientItem.bookingId ? String(patientItem.bookingId) : null;
            const cleanCode = patientItem.queueCode ? String(patientItem.queueCode).replace('#', '').trim() : null;
            const cleanNum = patientItem.queueNumber ? String(patientItem.queueNumber) : null;

            const fromStorage = (cleanPhone && localStorage.getItem(`vitals_phone_${cleanPhone}`)) ||
                                (cleanName && localStorage.getItem(`vitals_name_${cleanName}`)) ||
                                (cleanBooking && localStorage.getItem(`vitals_booking_${cleanBooking}`)) ||
                                (cleanCode && localStorage.getItem(`vitals_code_${cleanCode}`)) ||
                                (cleanNum && localStorage.getItem(`vitals_num_${cleanNum}`));

            if (fromStorage) {
                triageVitals = JSON.parse(fromStorage);
            }
        } catch (err) {
            console.error("Lỗi đọc sinh hiệu từ Điều dưỡng:", err);
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
                setRecord({
                    recordId: "temp-" + (patientItem.bookingId || Date.now()),
                    bookingCode: patientItem.bookingCode,
                    patientProfileId: patientItem.patientProfileId,
                    patientName: patientItem.patientName,
                    state: "IN_PROGRESS",
                    tests: []
                });
            }
        }
    };

    const handleCallNext = async () => {
        const nextPatient = queue.find((p) => p.status === "CONFIRMED");
        if (!nextPatient) {
            alert("Không còn bệnh nhân nào đang chờ khám trong hàng đợi hôm nay!");
            return;
        }

        playCallChime();
        speakPatientCall({
            queueCode: nextPatient.queueCode,
            queueNumber: nextPatient.queueNumber,
            patientName: nextPatient.patientName,
            roomName: "Khám Bệnh",
            departmentName: nextPatient.departmentName,
            isPriority: nextPatient.isPriority
        });

        notifyUpcomingPatients(queue, nextPatient, "Bàn Khám Bác Sĩ");
        await handleStartExam(nextPatient);
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
            setRecord(data);
            setMessage(`Đã tiếp nhận bệnh nhân STT ${patientItem.queueNumber}: ${patientItem.patientName} vào buồng khám!`);
            fetchDoctorQueue();
        } catch (err) {
            alert(err?.message || err || "Không thể tiếp nhận bệnh nhân!");
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
                treatmentPlan: treatmentPlan || "Theo dõi và điều trị theo phác đồ",
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
                (filterStatus === "WAITING" && p.status === "CONFIRMED") ||
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

    const waitingCount = queue.filter((p) => p.status === "CONFIRMED").length;
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
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0369a1 100%)",
                    color: "#ffffff",
                    border: "1px solid #334155",
                    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.3), 0 8px 10px -6px rgba(15, 23, 42, 0.3)",
                    position: "relative",
                    overflow: "hidden"
                }}
            >
                {/* Background Accent Glow */}
                <Box
                    sx={{
                        position: "absolute",
                        top: -40,
                        right: -40,
                        width: 180,
                        height: 180,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(56,189,248,0) 70%)",
                        pointerEvents: "none"
                    }}
                />

                <Grid container spacing={1.5} alignItems="center">
                    {/* Left: Department & Title */}
                    <Grid item xs={12} md={5.5}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 2.5,
                                    bgcolor: "rgba(56, 189, 248, 0.15)",
                                    border: "1px solid rgba(56, 189, 248, 0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#38bdf8",
                                    flexShrink: 0
                                }}
                            >
                                <LocalHospitalIcon sx={{ fontSize: 24 }} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                    <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.3px", fontSize: "1.1rem", whiteSpace: "nowrap" }}>
                                        Bàn Khám Bác Sĩ & Lâm Sàng
                                    </Typography>
                                    <Chip
                                        label="Live Cockpit"
                                        size="small"
                                        sx={{
                                            bgcolor: "#0284c7",
                                            color: "#ffffff",
                                            fontWeight: 700,
                                            fontSize: "0.65rem",
                                            height: 18
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mt: 0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    BV Đa khoa TNT • Khoa Khám Bệnh • Ca: <CockpitLiveClock />
                                </Typography>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Middle: Live Queue Counters */}
                    <Grid item xs={12} md={3.5}>
                        <Stack direction="row" spacing={0.8} justifyContent={{ xs: "flex-start", md: "center" }}>
                            <Box sx={{ px: 1.2, py: 0.5, borderRadius: 2, bgcolor: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", textAlign: "center", minWidth: 62 }}>
                                <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: 700, display: "block", fontSize: "0.62rem", whiteSpace: "nowrap" }}>CHỜ KHÁM</Typography>
                                <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#fef08a", lineHeight: 1.1, fontSize: "1.05rem" }}>{waitingCount}</Typography>
                            </Box>
                            <Box sx={{ px: 1.2, py: 0.5, borderRadius: 2, bgcolor: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", textAlign: "center", minWidth: 62 }}>
                                <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700, display: "block", fontSize: "0.62rem", whiteSpace: "nowrap" }}>ĐANG KHÁM</Typography>
                                <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#e0f2fe", lineHeight: 1.1, fontSize: "1.05rem" }}>{inProgressCount}</Typography>
                            </Box>
                            <Box sx={{ px: 1.2, py: 0.5, borderRadius: 2, bgcolor: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", textAlign: "center", minWidth: 62 }}>
                                <Typography variant="caption" sx={{ color: "#4ade80", fontWeight: 700, display: "block", fontSize: "0.62rem", whiteSpace: "nowrap" }}>ĐÃ KHÁM</Typography>
                                <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#bbf7d0", lineHeight: 1.1, fontSize: "1.05rem" }}>{completedCount}</Typography>
                            </Box>
                            {priorityCount > 0 && (
                                <Box sx={{ px: 1.2, py: 0.5, borderRadius: 2, bgcolor: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", textAlign: "center", minWidth: 62 }}>
                                    <Typography variant="caption" sx={{ color: "#fca5a5", fontWeight: 800, display: "block", fontSize: "0.62rem", whiteSpace: "nowrap" }}>ƯU TIÊN</Typography>
                                    <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#fee2e2", lineHeight: 1.1, fontSize: "1.05rem" }}>{priorityCount}</Typography>
                                </Box>
                            )}
                        </Stack>
                    </Grid>

                    {/* Right: Actions */}
                    <Grid item xs={12} md={3}>
                        <Stack direction="row" spacing={1.2} justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
                            <Tooltip title="Xem lịch phân công trực">
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleOpenMySchedule}
                                    sx={{
                                        color: "#e2e8f0",
                                        borderColor: "#475569",
                                        bgcolor: "rgba(15, 23, 42, 0.6)",
                                        borderRadius: 2,
                                        fontWeight: 600,
                                        textTransform: "none",
                                        "&:hover": { borderColor: "#94a3b8", bgcolor: "rgba(30, 41, 59, 0.8)" }
                                    }}
                                    startIcon={<CalendarMonthIcon fontSize="small" />}
                                >
                                    Lịch Trực
                                </Button>
                            </Tooltip>

                            <Button
                                variant="contained"
                                size="medium"
                                startIcon={<VolumeUpIcon />}
                                onClick={handleCallNext}
                                sx={{
                                    bgcolor: "#f59e0b",
                                    color: "#0f172a",
                                    fontWeight: 800,
                                    borderRadius: 2.5,
                                    px: 2.2,
                                    boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)",
                                    textTransform: "none",
                                    "&:hover": { bgcolor: "#d97706" }
                                }}
                            >
                                Gọi Số Tiếp ({waitingCount})
                            </Button>

                            <Tooltip title="Làm mới hàng đợi">
                                <IconButton
                                    onClick={fetchDoctorQueue}
                                    sx={{
                                        color: "#e2e8f0",
                                        bgcolor: "rgba(255,255,255,0.1)",
                                        "&:hover": { bgcolor: "rgba(255,255,255,0.2)" }
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Grid>
                </Grid>
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

                                    if (item.status === "IN_PROGRESS") {
                                        statusColor = "#0284c7";
                                        statusBg = "#e0f2fe";
                                        statusLabel = item.recordState === "IN_TESTING" ? "Đang làm CLS" : "Đang khám";
                                    } else if (item.status === "COMPLETED") {
                                        statusColor = "#16a34a";
                                        statusBg = "#dcfce7";
                                        statusLabel = "Đã khám xong";
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
                                                    : item.isPriority
                                                    ? "1px solid #fecaca"
                                                    : "1px solid #f1f5f9",
                                                bgcolor: isSelected
                                                    ? "#f0f9ff"
                                                    : item.isPriority
                                                    ? "#fff5f5"
                                                    : "#ffffff",
                                                boxShadow: isSelected
                                                    ? "0 4px 12px rgba(2, 132, 199, 0.12)"
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
                                                    borderRadius: item.isPriority ? 2 : "50%",
                                                    bgcolor: item.isPriority ? "#ef4444" : (item.status === "IN_PROGRESS" ? "#0284c7" : "#e2e8f0"),
                                                    color: (item.isPriority || item.status === "IN_PROGRESS") ? "#ffffff" : "#1e293b",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 900,
                                                    fontSize: "0.92rem",
                                                    mr: 1.2,
                                                    flexShrink: 0,
                                                    boxShadow: item.isPriority ? "0 2px 8px rgba(239, 68, 68, 0.35)" : "none"
                                                }}
                                            >
                                                {item.queueCode || String(item.queueNumber).padStart(2, "0")}
                                            </Box>

                                            <ListItemText
                                                disableTypography
                                                primary={
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                                                        <Box display="flex" alignItems="center" gap={0.5} sx={{ minWidth: 0, flex: 1 }}>
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

                                        {!record ? (
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
                                                {startingExam ? "Đang mở hồ sơ..." : "Tiếp Nhận & Bắt Đầu Khám"}
                                            </Button>
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
                                        <Tab label="1. Cận Lâm Sàng & Xét Nghiệm" icon={<ScienceIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                                        <Tab label="2. Chẩn Đoán ICD-10 & Phác Đồ" icon={<AssignmentTurnedInIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                                        <Tab label="3. Kê Đơn Thuốc & Kết Thúc" icon={<MedicationIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                                    </Tabs>

                                    <Box sx={{ p: 3 }}>
                                        {/* TAB 1: CẬN LÂM SÀNG & XÉT NGHIỆM */}
                                        {activeTab === 0 && (
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
                                                                                label={t.state === "COMPLETED" ? "ĐÃ CÓ KẾT QUẢ" : "ĐANG CHỜ KẾT QUẢ"}
                                                                                sx={{
                                                                                    fontWeight: 800,
                                                                                    fontSize: "0.7rem",
                                                                                    bgcolor: t.state === "COMPLETED" ? "#dcfce7" : "#fef3c7",
                                                                                    color: t.state === "COMPLETED" ? "#16a34a" : "#d97706"
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
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                )}

                                                <Box mt={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
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
                                                        onClick={() => setActiveTab(1)}
                                                        sx={{
                                                            bgcolor: "#0284c7",
                                                            borderRadius: 2,
                                                            fontWeight: 700,
                                                            textTransform: "none",
                                                            "&:hover": { bgcolor: "#0369a1" }
                                                        }}
                                                    >
                                                        Tiếp tục: Chẩn đoán bệnh & Ra quyết định điều trị
                                                    </Button>
                                                </Box>
                                            </Box>
                                        )}

                                        {/* TAB 2: CHẨN ĐOÁN ICD-10 & PHÁC ĐỒ */}
                                        {activeTab === 1 && (
                                            <Box>
                                                <Box mb={2.5}>
                                                    <Typography variant="h6" fontWeight={800} sx={{ color: "#0f172a" }}>
                                                        🩺 Kết Luận Chẩn Đoán ICD-10 & Phác Đồ Điều Trị
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: "#64748b" }}>
                                                        Nhập chẩn đoán xác định, lời dặn chuyên môn và hẹn ngày tái khám cho bệnh nhân
                                                    </Typography>
                                                </Box>

                                                {/* QUICK ICD-10 TEMPLATE CHIPS */}
                                                <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: "#f8fafc", borderRadius: 2.5, border: "1px solid #e2e8f0" }}>
                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                        <AutoAwesomeIcon fontSize="small" sx={{ color: "#0284c7" }} />
                                                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#0f172a" }}>
                                                            Mẫu Chẩn Đoán ICD-10 Phổ Biến (Nhấp 1 chạm để điền nhanh):
                                                        </Typography>
                                                    </Box>
                                                    <Box display="flex" flexWrap="wrap" gap={0.8}>
                                                        {ICD10_QUICK_TEMPLATES.map((tmpl) => (
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
                                                                    fontSize: "0.75rem",
                                                                    "&:hover": { bgcolor: "#e0f2fe", borderColor: "#0284c7", color: "#0369a1" }
                                                                }}
                                                            />
                                                        ))}
                                                    </Box>
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

                                                    <Grid container spacing={2.5}>
                                                        {/* LỰA CHỌN 1: ĐIỀU TRỊ NGOẠI TRÚ */}
                                                        <Grid item xs={12} sm={6}>
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
                                                                    Sang Bước: Kê Đơn Thuốc Ngoại Trú
                                                                </Button>
                                                            </Card>
                                                        </Grid>

                                                        {/* LỰA CHỌN 2: CHỈ ĐỊNH NHẬP VIỆN NỘI TRÚ */}
                                                        <Grid item xs={12} sm={6}>
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
                                                    </Grid>
                                                </Paper>

                                                <Box display="flex" justifyContent="space-between" mt={3}>
                                                    <Button
                                                        variant="outlined"
                                                        onClick={() => setActiveTab(0)}
                                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                                    >
                                                        Quay lại: Cận lâm sàng
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
                                                        <Typography variant="body2" sx={{ color: "#64748b", mb: 1.5, fontSize: "0.8rem" }}>
                                                            Bác sĩ có thể bấm nút dưới đây để tìm thuốc trong kho và chỉ định liều lượng.
                                                        </Typography>
                                                        <Button
                                                            variant="contained"
                                                            size="small"
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
                                                    </Paper>
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
                            <Dialog
                                open={openEditVitalsModal}
                                onClose={() => setOpenEditVitalsModal(false)}
                                maxWidth="md"
                                fullWidth
                                PaperProps={{ sx: { borderRadius: 3 } }}
                            >
                                <DialogTitle sx={{ pb: 1, borderBottom: "1px solid #E2E8F0" }}>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Box
                                            sx={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: 2.5,
                                                bgcolor: "primary.light",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: "primary.dark",
                                            }}
                                        >
                                            <MonitorWeightIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" fontWeight="bold" color="primary.dark">
                                                Cập Nhật Sinh Hiệu, Chỉ Số BMI & Tiền Sử Dị Ứng
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Hệ thống tự động tính BMI và phân loại thể trạng theo chuẩn WHO Tây Thái Bình Dương (WPRO)
                                            </Typography>
                                        </Box>
                                    </Box>
                                </DialogTitle>

                                <DialogContent sx={{ pt: 2.5 }}>
                                    {/* Real-time BMI Display Box */}
                                    {(() => {
                                        const previewBMI = calculateBMI(editingVitals.weight, editingVitals.height);
                                        return (
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 2,
                                                    mb: 2.5,
                                                    borderRadius: 2.5,
                                                    bgcolor: previewBMI.badgeBg,
                                                    border: `1.5px solid ${previewBMI.badgeColor}`,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    flexWrap: "wrap",
                                                    gap: 2
                                                }}
                                            >
                                                <Box display="flex" alignItems="center" gap={1.5}>
                                                    <Box
                                                        sx={{
                                                            width: 50,
                                                            height: 50,
                                                            borderRadius: "50%",
                                                            bgcolor: "#ffffff",
                                                            color: previewBMI.badgeColor,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: "1.3rem",
                                                            fontWeight: 900,
                                                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                                                        }}
                                                    >
                                                        {previewBMI.bmi}
                                                    </Box>
                                                    <Box>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Typography variant="subtitle1" fontWeight={900} sx={{ color: previewBMI.badgeColor }}>
                                                                Thể trạng: {previewBMI.classification}
                                                            </Typography>
                                                            <Chip
                                                                label={`BMI: ${previewBMI.bmi} kg/m²`}
                                                                size="small"
                                                                sx={{ bgcolor: "#ffffff", color: previewBMI.badgeColor, fontWeight: 800, height: 22 }}
                                                            />
                                                        </Box>
                                                        <Typography variant="caption" sx={{ color: previewBMI.badgeColor, fontWeight: 600, display: "block", mt: 0.3 }}>
                                                            💡 Lời khuyên lâm sàng: {previewBMI.advice}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box textAlign="right">
                                                    <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                                        Tiêu chuẩn: <b>WHO WPRO (Châu Á)</b>
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: "#64748b", display: "block" }}>
                                                        Cân đối: 18.5 - 22.9 | Thừa cân: 23 - 24.9 | Béo phì: ≥ 25
                                                    </Typography>
                                                </Box>
                                            </Paper>
                                        );
                                    })()}

                                    {/* Quick Presets for Demo / Testing */}
                                    <Box mb={2.5}>
                                        <Typography variant="caption" fontWeight={700} sx={{ color: "#475569", display: "block", mb: 0.8 }}>
                                            ⚡ Gán Nhanh Dữ Liệu Mẫu (Quick Presets):
                                        </Typography>
                                        <Box display="flex" flexWrap="wrap" gap={0.8}>
                                            {[
                                                { label: "Chuẩn (62kg / 168cm)", data: { weight: 62, height: 168, bloodPressure: "120/80", heartRate: 75, temperature: 36.8, spO2: 98 } },
                                                { label: "Gầy thiếu cân (44kg / 165cm)", data: { weight: 44, height: 165, bloodPressure: "105/70", heartRate: 80, temperature: 36.6, spO2: 99 } },
                                                { label: "Thừa cân (72kg / 165cm)", data: { weight: 72, height: 165, bloodPressure: "135/85", heartRate: 82, temperature: 37.0, spO2: 97 } },
                                                { label: "Béo phì Độ I (82kg / 165cm)", data: { weight: 82, height: 165, bloodPressure: "140/90", heartRate: 86, temperature: 36.9, spO2: 96 } },
                                                { label: "Béo phì Độ II (95kg / 165cm)", data: { weight: 95, height: 165, bloodPressure: "155/95", heartRate: 90, temperature: 37.1, spO2: 95 } },
                                                { label: "Tăng huyết áp (160/100 mmHg)", data: { bloodPressure: "160/100", heartRate: 95, medicalHistory: "Tăng huyết áp nguyên phát độ 2 (5 năm), Rối loạn mỡ máu" } },
                                                { label: "Sốt cao (39.2°C)", data: { temperature: 39.2, heartRate: 104, spO2: 97 } },
                                                { label: "Dị ứng Penicillin & Amoxicillin", data: { allergies: "Dị ứng Penicillin, Amoxicillin (Sốc phản vệ độ 1, mề đay)" } },
                                                { label: "Dị ứng Aspirin & NSAID", data: { allergies: "Dị ứng Aspirin, Ibuprofen, NSAID (Khó thở dạng hen)" } }
                                            ].map((preset, idx) => (
                                                <Chip
                                                    key={idx}
                                                    label={preset.label}
                                                    size="small"
                                                    clickable
                                                    onClick={() => setEditingVitals(prev => ({ ...prev, ...preset.data }))}
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: "0.72rem",
                                                        borderRadius: 1.5,
                                                        bgcolor: "#f1f5f9",
                                                        "&:hover": { bgcolor: "#e2e8f0" }
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>

                                    {/* Inputs Grid */}
                                    <Grid container spacing={2}>
                                        <Grid item xs={6} sm={3}>
                                            <TextField
                                                label="Chiều cao (cm)"
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={editingVitals.height}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, height: e.target.value })}
                                                InputProps={{ endAdornment: <InputAdornment position="end">cm</InputAdornment> }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField
                                                label="Cân nặng (kg)"
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={editingVitals.weight}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, weight: e.target.value })}
                                                InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField
                                                label="Huyết áp (mmHg)"
                                                size="small"
                                                fullWidth
                                                placeholder="120/80"
                                                value={editingVitals.bloodPressure}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, bloodPressure: e.target.value })}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField
                                                label="Nhịp tim (bpm)"
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={editingVitals.heartRate}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, heartRate: e.target.value })}
                                                InputProps={{ endAdornment: <InputAdornment position="end">bpm</InputAdornment> }}
                                            />
                                        </Grid>

                                        <Grid item xs={6} sm={3}>
                                            <TextField
                                                label="Thân nhiệt (°C)"
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={editingVitals.temperature}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, temperature: e.target.value })}
                                                InputProps={{ endAdornment: <InputAdornment position="end">°C</InputAdornment> }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <TextField
                                                label="SpO2 (%)"
                                                type="number"
                                                size="small"
                                                fullWidth
                                                value={editingVitals.spO2}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, spO2: e.target.value })}
                                                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                label="Nhóm máu"
                                                size="small"
                                                fullWidth
                                                value={editingVitals.bloodType || "O+"}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, bloodType: e.target.value })}
                                                placeholder="O+, A+, B+, AB+..."
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Divider sx={{ my: 1 }} />
                                        </Grid>

                                        {/* Tiền sử Dị ứng */}
                                        <Grid item xs={12}>
                                            <Box mb={0.8} display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="subtitle2" fontWeight={800} color="#b91c1c">
                                                    🚨 Tiền Sử Dị Ứng Thuốc / Thức Ăn:
                                                </Typography>
                                                <Box display="flex" gap={0.5}>
                                                    <Chip
                                                        label="Dị ứng Penicillin"
                                                        size="small"
                                                        color="error"
                                                        variant="outlined"
                                                        onClick={() => setEditingVitals(p => ({ ...p, allergies: "Dị ứng Penicillin, Amoxicillin (Sốc phản vệ)" }))}
                                                        sx={{ fontSize: "0.68rem", height: 20 }}
                                                    />
                                                    <Chip
                                                        label="Dị ứng Aspirin/NSAID"
                                                        size="small"
                                                        color="error"
                                                        variant="outlined"
                                                        onClick={() => setEditingVitals(p => ({ ...p, allergies: "Dị ứng Aspirin, NSAID, Ibuprofen" }))}
                                                        sx={{ fontSize: "0.68rem", height: 20 }}
                                                    />
                                                    <Chip
                                                        label="Chưa ghi nhận"
                                                        size="small"
                                                        onClick={() => setEditingVitals(p => ({ ...p, allergies: "Chưa ghi nhận dị ứng thuốc" }))}
                                                        sx={{ fontSize: "0.68rem", height: 20 }}
                                                    />
                                                </Box>
                                            </Box>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={editingVitals.allergies}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, allergies: e.target.value })}
                                                placeholder="VD: Dị ứng Penicillin, Amoxicillin, Paracetamol, Hải sản..."
                                                sx={{
                                                    "& .MuiOutlinedInput-root": {
                                                        bgcolor: editingVitals.allergies && !editingVitals.allergies.includes("Chưa ghi nhận") ? "#fef2f2" : "#ffffff",
                                                        borderColor: editingVitals.allergies && !editingVitals.allergies.includes("Chưa ghi nhận") ? "#ef4444" : undefined
                                                    }
                                                }}
                                            />
                                        </Grid>

                                        {/* Tiền sử Bệnh mạn tính */}
                                        <Grid item xs={12}>
                                            <Box mb={0.8} display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="subtitle2" fontWeight={800} color="#0369a1">
                                                    🩺 Tiền Sử Bệnh Lý Mạn Tính & Bệnh Kèm Theo:
                                                </Typography>
                                                <Box display="flex" gap={0.5} flexWrap="wrap">
                                                    {["Tăng huyết áp", "Đái tháo đường T2", "Hen phế quản", "Viêm loét dạ dày"].map((cond, i) => (
                                                        <Chip
                                                            key={i}
                                                            label={cond}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                            onClick={() => {
                                                                const current = editingVitals.medicalHistory.includes("Chưa ghi nhận") ? "" : editingVitals.medicalHistory;
                                                                const updated = current ? `${current}, ${cond}` : cond;
                                                                setEditingVitals(p => ({ ...p, medicalHistory: updated }));
                                                            }}
                                                            sx={{ fontSize: "0.68rem", height: 20 }}
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={editingVitals.medicalHistory}
                                                onChange={(e) => setEditingVitals({ ...editingVitals, medicalHistory: e.target.value })}
                                                placeholder="VD: Tăng huyết áp 5 năm, Đái tháo đường Tuýp 2, Hen phế quản..."
                                            />
                                        </Grid>
                                    </Grid>
                                </DialogContent>

                                <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #E2E8F0" }}>
                                    <Button onClick={() => setOpenEditVitalsModal(false)} variant="outlined" color="inherit" sx={{ borderRadius: 2 }}>
                                        Hủy Bỏ
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setPatientVitals(editingVitals);
                                            setOpenEditVitalsModal(false);
                                            setMessage("Đã cập nhật sinh hiệu, chỉ số BMI và tiền sử dị ứng của bệnh nhân!");
                                        }}
                                        variant="contained"
                                        color="primary"
                                        sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
                                    >
                                        Lưu & Áp Dụng Chỉ Số
                                    </Button>
                                </DialogActions>
                            </Dialog>
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
            <Dialog open={openScheduleModal} onClose={() => setOpenScheduleModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 800, color: "#0284c7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>📅 Lịch Trực Phân Công Của Bác Sĩ (14 Ngày Tới)</span>
                    <Chip label="Ca Khám Tiêu Chuẩn" color="primary" size="small" sx={{ fontWeight: 700 }} />
                </DialogTitle>
                <DialogContent dividers sx={{ p: 2 }}>
                    {loadingSchedules ? (
                        <Box textAlign="center" py={4}><CircularProgress /></Box>
                    ) : (
                        <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800 }}>NGÀY TRỰC</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>CA TRỰC</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>KHUNG GIỜ</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>PHÒNG KHÁM</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 800 }}>SỐ LƯỢNG CHỜ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {mySchedules.length > 0 ? (
                                        mySchedules.slice(0, 15).map((sch, idx) => (
                                            <TableRow key={idx} hover>
                                                <TableCell sx={{ fontWeight: 700 }}>{sch.date || sch.workDate || formatDate(new Date())}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={sch.shiftType === "MORNING" ? "Ca Sáng" : sch.shiftType === "AFTERNOON" ? "Ca Chiều" : "Ca Tối"}
                                                        size="small"
                                                        color={sch.shiftType === "MORNING" ? "info" : sch.shiftType === "AFTERNOON" ? "warning" : "secondary"}
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </TableCell>
                                                <TableCell>{sch.startTime || "07:30"} - {sch.endTime || "11:30"}</TableCell>
                                                <TableCell>{sch.roomName || "Phòng Khám Lâm Sàng"}</TableCell>
                                                <TableCell align="center">
                                                    <Chip label={`${sch.bookedCount || 0} bệnh nhân`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: "#64748b" }}>
                                                Hiện chưa có ca trực nào được phân bổ trong tuần này.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => setOpenScheduleModal(false)} sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}>
                        Đóng Lại
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
