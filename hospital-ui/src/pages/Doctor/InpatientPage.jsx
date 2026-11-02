import React, { useState, useEffect, useMemo } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Chip,
    Button,
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
    TextField,
    CircularProgress,
    Divider,
    IconButton,
    Alert,
    Avatar,
    Tooltip,
    Tabs,
    Tab,
    Stack,
    Badge,
    MenuItem,
    InputAdornment,
    LinearProgress
} from "@mui/material";
import HotelIcon from "@mui/icons-material/Hotel";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PrintIcon from "@mui/icons-material/Print";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SingleBedIcon from "@mui/icons-material/SingleBed";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import TimelineIcon from "@mui/icons-material/Timeline";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import WarningIcon from "@mui/icons-material/Warning";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import HealingIcon from "@mui/icons-material/Healing";
import MedicationIcon from "@mui/icons-material/Medication";
import BadgeIcon from "@mui/icons-material/Badge";
import DeleteIcon from "@mui/icons-material/Delete";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDate, formatDateTime, formatISODate } from "../../utils/formatters";
import { printReceipt, printTreatmentSheet, printBedsideCard } from "../../utils/printHelper";

// Mẫu diễn biến lâm sàng thường gặp nội trú
const PROGRESSION_PRESETS = [
    {
        title: "Hậu phẫu ngày 1-3",
        vitals: { temp: "37.0", bp: "120/80", hr: "80", resp: "19", spo2: "98" },
        text: "Bệnh nhân tỉnh, tiếp xúc tốt. Đau nhẹ vết mổ, bụng mềm, không chướng. Dẫn lưu ra ít dịch hồng lượng khoảng 30ml. Vết mổ khô, chưa trung tiện, tiểu qua sonde nước tiểu vàng trong 1200ml/24h.",
        orders: "Chăm sóc cấp II. Nhịn ăn uống, bù dịch và dinh dưỡng qua đường tĩnh mạch. Thay băng vết mổ 1 lần/ngày. Rút ống thông tiểu sau 24h nếu người bệnh tự đi lại được."
    },
    {
        title: "Cơn đau thắt ngực ổn định",
        vitals: { temp: "36.8", bp: "125/80", hr: "74", resp: "18", spo2: "99" },
        text: "Bệnh nhân đỡ đau tức ngực, không khó thở khi nghỉ ngơi. Tim đều T1 T2 rõ, không nghe tiếng thổi bệnh lý. Phổi hai bên thông khí tốt, không rale. Bụng mềm, gan lách không to. Đại tiểu tiện bình thường.",
        orders: "Chăm sóc cấp II. Chế độ ăn giảm muối, giảm chất béo động vật. Theo dõi điện tâm đồ và men tim Troponin-I. Nghỉ ngơi tại giường, tránh gắng sức."
    },
    {
        title: "Viêm phế quản phổi thở oxy",
        vitals: { temp: "37.8", bp: "115/75", hr: "88", resp: "22", spo2: "95" },
        text: "Người bệnh còn ho từng cơn, khạc đờm vàng đục, sốt nhẹ về chiều. Thở êm khi có hỗ trợ oxy kính 2L/p. Phổi nghe rải rác ran ẩm và ran ngáy hai phế trường. Tim nhịp nhanh xoang.",
        orders: "Chăm sóc cấp I. Thở oxy gọng mũi 2L/phút duy trì SpO2 > 95%. Khí dung thuốc giãn phế quản ngày 2 lần. Vỗ rung lồng ngực hỗ trợ tống xuất đờm. Chế độ ăn cháo súp dinh dưỡng nhiều bữa."
    },
    {
        title: "Tăng huyết áp cấp cứu",
        vitals: { temp: "36.7", bp: "155/95", hr: "82", resp: "19", spo2: "97" },
        text: "Bệnh nhân giảm nhức đầu, không hoa mắt chóng mặt, không buồn nôn. Huyết áp kiểm soát hạ dần theo đích điều trị. Đồng tử hai bên đều 2mm, phản xạ ánh sáng tốt. Không yếu liệt khu trú.",
        orders: "Chăm sóc cấp I. Theo dõi huyết áp mỗi 2 giờ. Bất động tại phòng, hạn chế tối đa kích thích ánh sáng và tiếng ồn. Chế độ ăn kiêng muối tuyệt đối (< 3g muối/ngày)."
    },
    {
        title: "Nhiễm khuẩn tiêu hóa",
        vitals: { temp: "37.2", bp: "110/70", hr: "84", resp: "18", spo2: "98" },
        text: "Người bệnh bớt đau quặn bụng, số lần đi ngoài phân lỏng giảm còn 2 lần/ngày, không lẫn máu. Niêm mạc miệng hồng, dấu véo da mất nhanh, uống nước được, không nôn.",
        orders: "Chăm sóc cấp II. Bù nước điện giải Oresol đường uống theo nhu cầu. Ăn cháo thịt nạc nấu nhừ, kiêng sữa và nước ngọt có gas. Uống men vi sinh cách xa kháng sinh 2 giờ."
    }
];

// Bộ thuốc mẫu theo phác đồ y lệnh nội trú
const DRUG_PROTOCOL_PRESETS = [
    {
        name: "Phác đồ Hậu Phẫu Chuẩn",
        drugs: [
            { name: "Ringer Lactat 500ml", unit: "Chai", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Truyền tĩnh mạch", note: "TTM 40 giọt/phút" },
            { name: "Paracetamol Kabi 1g/100ml", unit: "Chai", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Truyền tĩnh mạch", note: "TTM trong 20 phút khi đau" },
            { name: "Cefotaxim 1g", unit: "Lọ", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Tiêm tĩnh mạch", note: "Tiêm chậm 3-5 phút" },
            { name: "Băng gạc tiệt trùng 10x10cm", unit: "Gói", morning: "1", noon: "", evening: "", night: "", total: "1", route: "Dùng ngoài", note: "Thay băng vết mổ buổi sáng" }
        ]
    },
    {
        name: "Phác đồ Tim Mạch - Cơn Đau Thắt Ngực",
        drugs: [
            { name: "Aspirin 81mg", unit: "Viên", morning: "1", noon: "", evening: "", night: "", total: "1", route: "Uống", note: "Uống sau ăn no" },
            { name: "Clopidogrel 75mg", unit: "Viên", morning: "1", noon: "", evening: "", night: "", total: "1", route: "Uống", note: "Uống sau ăn" },
            { name: "Atorvastatin 20mg", unit: "Viên", morning: "", noon: "", evening: "", night: "1", total: "1", route: "Uống", note: "Uống trước khi đi ngủ" },
            { name: "Nitroglycerin xịt dưới lưỡi 0.4mg", unit: "Lọ", morning: "", noon: "", evening: "", night: "", total: "1", route: "Xịt dưới lưỡi", note: "Xịt 1 nhát khi đau ngực" }
        ]
    },
    {
        name: "Phác đồ Viêm Phổi - Hô Hấp",
        drugs: [
            { name: "Augmentin 1.2g", unit: "Lọ", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Tiêm tĩnh mạch", note: "Pha 20ml NaCl 0.9% tiêm chậm" },
            { name: "Ventolin Nebules 2.5mg", unit: "Tép", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Khí dung", note: "Khí dung với 2ml NaCl 0.9%" },
            { name: "Acetylcystein 200mg", unit: "Gói", morning: "1", noon: "1", evening: "1", night: "", total: "3", route: "Uống", note: "Hòa tan vào 50ml nước ấm" },
            { name: "Natri Clorid 0.9% 500ml", unit: "Chai", morning: "1", noon: "", evening: "", night: "", total: "1", route: "Truyền tĩnh mạch", note: "TTM 30 giọt/phút" }
        ]
    }
];

export default function InpatientPage() {
    const { user } = useAuth();
    const isNurse = user?.role === "ROLE_NURSE";
    const isDoctor = user?.role === "ROLE_DOCTOR" || user?.role === "ROLE_HEAD_OF_DEPARTMENT" || user?.role === "ROLE_ADMIN";

    const [admissions, setAdmissions] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tab: 0: Sơ đồ giường trực quan, 1: Danh sách bệnh nhân
    const [activeTab, setActiveTab] = useState(0);

    // Filters
    const [selectedDeptId, setSelectedDeptId] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, OCCUPIED, AVAILABLE, CRITICAL, CLEANING
    const [searchQuery, setSearchQuery] = useState("");

    // Tracking cleaning beds (roomId_bedNum)
    const [cleaningBeds, setCleaningBeds] = useState(new Set());
    const [allBeds, setAllBeds] = useState([]);

    // Selected Patient & Treatment Sheet State
    const [selectedAdmission, setSelectedAdmission] = useState(null);
    const [openTreatmentSheetModal, setOpenTreatmentSheetModal] = useState(false);

    // Modal Phiếu Chăm Sóc Điều Dưỡng (Nursing Care)
    const [openNursingCareModal, setOpenNursingCareModal] = useState(false);
    const [nursingCareList, setNursingCareList] = useState([]);
    const [loadingNursingCare, setLoadingNursingCare] = useState(false);
    const [submittingNursingCare, setSubmittingNursingCare] = useState(false);
    const [nursingCareForm, setNursingCareForm] = useState({
        temperature: "36.8",
        bloodPressure: "120/80",
        pulse: "76",
        respiratoryRate: "18",
        spo2: "98",
        careLevel: "LEVEL_1",
        nursingNote: "",
        medicationAdministered: ""
    });
    const [treatmentSheetData, setTreatmentSheetData] = useState({
        sheetNumber: "01",
        date: formatISODate(new Date()),
        time: "08:30",
        temperature: "36.8",
        bloodPressure: "120/80",
        heartRate: "78",
        respiratoryRate: "18",
        spO2: "98",
        careLevel: "Mức 2", // Mức 1: Toàn diện, Mức 2: Một phần, Mức 3: Tự chăm sóc
        diet: "Cơm mềm bệnh lý",
        diseaseProgression: "Bệnh nhân tỉnh táo, tiếp xúc tốt, da niêm hồng. Vết mổ khô, bụng mềm, không sốt, ăn uống được.",
        doctorInstruction: "Chăm sóc cấp II. Tiếp tục duy trì y lệnh kháng sinh và dịch truyền. Theo dõi mạch, huyết áp mỗi 4 giờ.",
        drugs: [
            { id: 1, name: "Cefotaxim 1g", unit: "Lọ", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Tiêm tĩnh mạch", note: "Tiêm chậm" },
            { id: 2, name: "Paracetamol 500mg", unit: "Viên", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Uống", note: "Sau ăn khi đau" },
            { id: 3, name: "Ringer Lactat 500ml", unit: "Chai", morning: "1", noon: "", evening: "", night: "", total: "1", route: "Truyền tĩnh mạch", note: "TTM 40 giọt/phút" }
        ]
    });
    const [submittingTreatment, setSubmittingTreatment] = useState(false);

    // Treatment History Timeline
    const [treatmentHistory, setTreatmentHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Modal Transfer Bed
    const [openTransferModal, setOpenTransferModal] = useState(false);
    const [transferTarget, setTransferTarget] = useState({
        targetRoomId: "",
        targetBedIndex: 1,
        transferReason: "Chuyển buồng theo chỉ định chuyên môn của Bác sĩ"
    });

    // Modal Discharge
    const [openDischargeModal, setOpenDischargeModal] = useState(false);
    const [dischargeData, setDischargeData] = useState({
        dischargeSummary: "Bệnh nhân ổn định, các chỉ số sinh tồn và cận lâm sàng trở về bình thường.",
        doctorRecommendation: "Uống thuốc đều theo đơn xuất viện, tái khám sau 14 ngày, hạn chế vận động gắng sức.",
        reExaminationDate: formatISODate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
    });
    const [submittingDischarge, setSubmittingDischarge] = useState(false);
    const [dischargeResult, setDischargeResult] = useState(null);

    // Modal Admit Patient (Tiếp nhận nội trú mới)
    const [openAdmitModal, setOpenAdmitModal] = useState(false);
    const [admitForm, setAdmitForm] = useState({
        patientProfileId: "",
        doctorId: "",
        roomId: "",
        initialDiagnosis: "Cần theo dõi và điều trị nội trú",
        selectedBedIndex: 1
    });
    const [submittingAdmit, setSubmittingAdmit] = useState(false);

    // Feedback Alert
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [deptRes, docRes, profRes, admitRes, roomRes] = await Promise.all([
                axiosInstance.get("/api/departments"),
                axiosInstance.get("/api/doctors").catch(() => axiosInstance.get("/api/admin/doctors").catch(() => ({ data: [] }))),
                axiosInstance.get("/api/patient-profiles/lookup?keyword=").catch(() => axiosInstance.get("/api/patient-profiles").catch(() => ({ data: [] }))),
                axiosInstance.get("/api/inpatient/active").catch(() => ({ data: [] })),
                axiosInstance.get("/api/departments/rooms/all?includeInactive=false").catch(() => ({ data: [] }))
            ]);

            const deptList = Array.isArray(deptRes?.data) ? deptRes.data : (Array.isArray(deptRes) ? deptRes : []);
            const docList = Array.isArray(docRes?.data) ? docRes.data : (Array.isArray(docRes) ? docRes : []);
            const profList = Array.isArray(profRes?.data) ? profRes.data : (Array.isArray(profRes) ? profRes : []);
            const roomList = Array.isArray(roomRes?.data) ? roomRes.data : (Array.isArray(roomRes) ? roomRes : []);

            if (deptList.length > 0) setDepartments(deptList);
            if (docList.length > 0) setDoctors(docList);
            if (profList.length > 0) setProfiles(profList);
            if (roomList.length > 0) setRooms(roomList);

            const activeList = (admitRes && Array.isArray(admitRes.data)) ? admitRes.data : (Array.isArray(admitRes) ? admitRes : []);
            if (activeList.length > 0) {
                // Phân bổ giường bệnh theo từng phòng chuẩn 4 giường
                const roomBedTracker = {};
                const enriched = activeList.map((item) => {
                    const rKey = item.room?.roomId || item.room?.roomNumber || "default";
                    if (!roomBedTracker[rKey]) roomBedTracker[rKey] = 0;
                    roomBedTracker[rKey] = (roomBedTracker[rKey] % 4) + 1;
                    const assignedBed = item.bedNumber || roomBedTracker[rKey];

                    return {
                        ...item,
                        bedNumber: assignedBed,
                        severity: item.severity || "NORMAL",
                        careLevel: item.careLevel || "Chưa phân loại",
                        allergies: item.allergies || "Chưa ghi nhận",
                        bloodType: item.bloodType || "Chưa có dữ liệu",
                        diet: item.diet || "Chưa có dữ liệu",
                        latestVitals: item.latestVitals || null
                    };
                });
                setAdmissions(enriched);
            } else {
                setAdmissions([]);
            }
        } catch (err) {
            console.error("Lỗi tải dữ liệu nội trú:", err);
            setFeedback({
                type: "error",
                message: err.response?.data?.message || err.message || "Không thể tải dữ liệu bệnh nhân nội trú từ máy chủ."
            });
        } finally {
            setLoading(false);
        }
    };

    // Tất cả các phòng điều trị: ưu tiên phòng thật từ DB (Room Management), hoặc fallback mặc định theo khoa
    const allRooms = useMemo(() => {
        if (rooms && rooms.length > 0) {
            return rooms.map((r) => {
                const dept = departments.find((d) => d.departmentId === r.departmentId);
                const rNum = r.roomName || r.roomNumber || `P.${r.roomId}`;
                return {
                    ...r,
                    roomId: r.roomId,
                    roomNumber: rNum,
                    roomName: rNum,
                    roomType: r.roomType || "INPATIENT",
                    departmentId: r.departmentId,
                    departmentName: r.departmentName || dept?.departmentName || "Khoa Lâm Sàng"
                };
            });
        }

        const list = departments.flatMap((dept) => {
            const rList = dept.rooms && dept.rooms.length > 0
                ? dept.rooms
                : [
                    { roomId: dept.departmentId * 100 + 1, roomNumber: `P.${dept.departmentId}01`, roomName: `P.${dept.departmentId}01`, roomType: "ICU" },
                    { roomId: dept.departmentId * 100 + 2, roomNumber: `P.${dept.departmentId}02`, roomName: `P.${dept.departmentId}02`, roomType: "INPATIENT" },
                    { roomId: dept.departmentId * 100 + 3, roomNumber: `P.${dept.departmentId}03`, roomName: `P.${dept.departmentId}03`, roomType: "INPATIENT" }
                ];
            return rList.map((r) => ({
                ...r,
                roomNumber: r.roomName || r.roomNumber || `P.${r.roomId}`,
                roomName: r.roomName || r.roomNumber || `P.${r.roomId}`,
                departmentName: dept.departmentName,
                departmentId: dept.departmentId
            }));
        });
        return list;
    }, [departments, rooms]);

    // Lọc danh sách phòng theo khoa
    const filteredRooms = useMemo(() => {
        let roomList = selectedDeptId === "ALL"
            ? allRooms
            : allRooms.filter((r) => String(r.departmentId) === String(selectedDeptId));

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            roomList = roomList.filter((r) => {
                const roomNum = (r.roomNumber || r.roomName || "").toLowerCase();
                const deptName = (r.departmentName || "").toLowerCase();
                const roomMatch = roomNum.includes(q) || deptName.includes(q);
                const patientMatch = admissions.some(
                    (a) => (a.room?.roomId === r.roomId || a.room?.roomNumber === r.roomNumber) &&
                           (((a.patientProfile?.fullName || "").toLowerCase().includes(q)) ||
                            ((a.admissionCode || "").toLowerCase().includes(q)) ||
                            ((a.initialDiagnosis || "").toLowerCase().includes(q)))
                );
                return roomMatch || patientMatch;
            });
        }
        return roomList;
    }, [allRooms, selectedDeptId, searchQuery, admissions]);

    // Thống kê KPIs theo thời gian thực (chuẩn SmartHos-365 Slide 28)
    const stats = useMemo(() => {
        const totalRooms = allRooms.length;
        const totalBeds = allBeds.length > 0 ? allBeds.length : totalRooms * 4;
        const occupiedBeds = admissions.length;
        const cleaningCount = allBeds.length > 0 ? allBeds.filter(b => b.status === "CLEANING").length : cleaningBeds.size;
        const availableBeds = allBeds.length > 0
            ? allBeds.filter(b => b.status === "AVAILABLE").length
            : Math.max(0, totalBeds - occupiedBeds - cleaningCount);
        const criticalBeds = admissions.filter((a) => a.severity === "CRITICAL" || a.careLevel === "Mức 1").length;
        const postOpBeds = admissions.filter((a) => a.severity === "POST_OP" || a.careLevel === "Mức 2").length;
        const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

        return {
            totalRooms,
            totalBeds,
            occupiedBeds,
            availableBeds,
            criticalBeds,
            postOpBeds,
            cleaningCount,
            occupancyRate
        };
    }, [allRooms, admissions, allBeds, cleaningBeds]);

    // Tính tuổi bệnh nhân
    const calculateAge = (dob) => {
        if (!dob) return "--";
        try {
            const birthYear = new Date(dob).getFullYear();
            const currentYear = new Date().getFullYear();
            return `${currentYear - birthYear}T`;
        } catch {
            return "--";
        }
    };

    // Toggle trạng thái khử khuẩn phòng/giường
    const handleToggleCleaning = (bedKey) => {
        setCleaningBeds((prev) => {
            const next = new Set(prev);
            if (next.has(bedKey)) {
                next.delete(bedKey);
                setFeedback({ type: "success", message: `Giường ${bedKey} đã khử khuẩn xong và sẵn sàng tiếp nhận người bệnh!` });
            } else {
                next.add(bedKey);
                setFeedback({ type: "info", message: `Đang đánh dấu khử khuẩn / dọn buồng giường ${bedKey}.` });
            }
            return next;
        });
    };

    // ==========================================
    // PHIẾU ĐIỀU TRỊ NỘI TRÚ (TỜ BỆNH TRÌNH) LOGIC
    // ==========================================
    const handleOpenTreatmentSheet = async (admission) => {
        setSelectedAdmission(admission);
        setTreatmentSheetData({
            sheetNumber: "01",
            date: formatISODate(new Date()),
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            temperature: admission.latestVitals?.temperature || "36.8",
            bloodPressure: admission.latestVitals?.bloodPressure || "",
            heartRate: admission.latestVitals?.heartRate || "78",
            respiratoryRate: admission.latestVitals?.respiratoryRate || "18",
            spO2: admission.latestVitals?.spO2 || "98",
            careLevel: admission.careLevel || "Mức 2",
            diet: admission.diet || "Cơm mềm bệnh lý",
            diseaseProgression: `Bệnh nhân tỉnh táo, tiếp xúc tốt. Diễn tiến điều trị ngày thứ ${Math.ceil((Date.now() - new Date(admission.admissionDate).getTime()) / (1000 * 3600 * 24))} ổn định.`,
            doctorInstruction: `Chế độ chăm sóc: ${admission.careLevel || "Mức 2"}. Chế độ ăn: ${admission.diet || "Cơm mềm bệnh lý"}. Duy trì y lệnh thuốc và theo dõi mạch, HA mỗi 4 giờ.`,
            drugs: [
                { id: 1, name: "Cefotaxim 1g", unit: "Lọ", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Tiêm tĩnh mạch", note: "Tiêm chậm" },
                { id: 2, name: "Paracetamol 500mg", unit: "Viên", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Uống", note: "Khi sốt ≥ 38.5°C" },
                { id: 3, name: "Ringer Lactat 500ml", unit: "Chai", morning: "1", noon: "", evening: "", night: "", total: "1", route: "Truyền tĩnh mạch", note: "TTM 40 giọt/phút" }
            ]
        });
        setOpenTreatmentSheetModal(true);
        loadTreatmentHistory(admission.admissionId);
    };

    const loadTreatmentHistory = async (admissionId) => {
        setLoadingHistory(true);
        try {
            const res = await axiosInstance.get(`/api/inpatient/${admissionId}/daily-records`);
            if (res.data && res.data.length > 0) {
                setTreatmentHistory(res.data);
            } else {
                setTreatmentHistory([]);
            }
        } catch (err) {
            console.warn("Không thể tải lịch sử điều trị:", err);
            setTreatmentHistory([]);
            setFeedback({
                type: "warning",
                message: "Không thể tải lịch sử điều trị của bệnh nhân từ máy chủ."
            });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleApplyPreset = (preset) => {
        setTreatmentSheetData((prev) => ({
            ...prev,
            temperature: preset.vitals.temp,
            bloodPressure: preset.vitals.bp,
            heartRate: preset.vitals.hr,
            respiratoryRate: preset.vitals.resp,
            spO2: preset.vitals.spo2,
            diseaseProgression: preset.text,
            doctorInstruction: preset.orders
        }));
        setFeedback({ type: "info", message: `Đã nạp mẫu diễn tiến: "${preset.title}"` });
    };

    // Áp dụng phác đồ thuốc nhanh
    const handleApplyDrugProtocol = (proto) => {
        setTreatmentSheetData((prev) => ({
            ...prev,
            drugs: proto.drugs.map((d, i) => ({ ...d, id: Date.now() + i }))
        }));
        setFeedback({ type: "success", message: `Đã áp dụng "${proto.name}" vào bảng y lệnh thuốc!` });
    };

    // Thêm dòng thuốc mới
    const handleAddDrugRow = () => {
        setTreatmentSheetData((prev) => ({
            ...prev,
            drugs: [
                ...prev.drugs,
                { id: Date.now(), name: "", unit: "Viên", morning: "1", noon: "", evening: "1", night: "", total: "2", route: "Uống", note: "" }
            ]
        }));
    };

    // Cập nhật dòng thuốc
    const handleUpdateDrugRow = (id, field, value) => {
        setTreatmentSheetData((prev) => {
            const nextDrugs = prev.drugs.map((d) => {
                if (d.id === id) {
                    const updated = { ...d, [field]: value };
                    if (["morning", "noon", "evening", "night"].includes(field)) {
                        const m = Number(field === "morning" ? value : d.morning) || 0;
                        const n = Number(field === "noon" ? value : d.noon) || 0;
                        const e = Number(field === "evening" ? value : d.evening) || 0;
                        const ni = Number(field === "night" ? value : d.night) || 0;
                        updated.total = String(m + n + e + ni);
                    }
                    return updated;
                }
                return d;
            });
            return { ...prev, drugs: nextDrugs };
        });
    };

    // Xóa dòng thuốc
    const handleDeleteDrugRow = (id) => {
        setTreatmentSheetData((prev) => ({
            ...prev,
            drugs: prev.drugs.filter((d) => d.id !== id)
        }));
    };

    // Lưu tờ bệnh trình vào hệ thống
    const handleSaveTreatmentSheet = async () => {
        if (!selectedAdmission) return;
        setSubmittingTreatment(true);
        try {
            // Định dạng chuỗi y lệnh tổng hợp bao gồm thuốc & chăm sóc
            const drugListText = treatmentSheetData.drugs
                .filter((d) => d.name.trim())
                .map((d, idx) => `${idx + 1}. ${d.name} (${d.unit}) x ${d.total} [${d.route}]: Sáng ${d.morning || 0}, Trưa ${d.noon || 0}, Chiều ${d.evening || 0}, Tối ${d.night || 0}. ${d.note ? `(${d.note})` : ""}`)
                .join("\n");

            const fullOrders = `[CHĂM SÓC]: ${treatmentSheetData.careLevel} | [CHẾ ĐỘ ĂN]: ${treatmentSheetData.diet}\n[THUỐC & DỊCH TRUYỀN]:\n${drugListText}\n[Y LỆNH KHÁC]:\n${treatmentSheetData.doctorInstruction}`;

            await axiosInstance.post(`/api/inpatient/${selectedAdmission.admissionId}/daily-record`, {
                temperature: treatmentSheetData.temperature,
                bloodPressure: treatmentSheetData.bloodPressure,
                heartRate: treatmentSheetData.heartRate,
                diseaseProgression: `[SpO2: ${treatmentSheetData.spO2}% | Thở: ${treatmentSheetData.respiratoryRate} ck/p] ${treatmentSheetData.diseaseProgression}`,
                doctorInstruction: fullOrders
            });

            setFeedback({
                type: "success",
                message: `Đã lưu thành công Tờ bệnh trình số ${treatmentSheetData.sheetNumber} cho người bệnh ${selectedAdmission.patientProfile?.fullName}!`
            });

            // Reload history
            loadTreatmentHistory(selectedAdmission.admissionId);
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi lưu tờ bệnh trình!" });
        } finally {
            setSubmittingTreatment(false);
        }
    };

    // In Tờ Bệnh Trình chuẩn Mẫu 01/BV-01 Bộ Y Tế
    const handlePrintTreatmentSheet = () => {
        if (!selectedAdmission) return;

        const drugListText = treatmentSheetData.drugs
            .filter((d) => d.name.trim())
            .map((d, idx) => `- ${d.name} x ${d.total} ${d.unit} (${d.route}) [Sáng ${d.morning || 0}, Trưa ${d.noon || 0}, Chiều ${d.evening || 0}, Tối ${d.night || 0}]. ${d.note ? `Ghi chú: ${d.note}` : ""}`)
            .join("<br>");

        const recordToPrint = {
            date: formatDate(treatmentSheetData.date),
            time: treatmentSheetData.time,
            heartRate: treatmentSheetData.heartRate,
            temperature: treatmentSheetData.temperature,
            bloodPressure: treatmentSheetData.bloodPressure,
            spO2: treatmentSheetData.spO2,
            diseaseProgression: treatmentSheetData.diseaseProgression,
            doctorInstruction: `<b>1. Y lệnh thuốc & dịch truyền:</b><br>${drugListText || "Tiếp tục phác đồ cũ."}<br><br><b>2. Y lệnh chăm sóc & dinh dưỡng:</b><br>- ${treatmentSheetData.doctorInstruction}<br>- Chế độ ăn: ${treatmentSheetData.diet}<br>- Cấp chăm sóc: ${treatmentSheetData.careLevel}`,
            doctorName: selectedAdmission.treatingDoctor?.fullName || "BS. Điều trị"
        };

        printTreatmentSheet({
            admissionCode: selectedAdmission.admissionCode,
            patientName: selectedAdmission.patientProfile?.fullName,
            age: calculateAge(selectedAdmission.patientProfile?.dateOfBirth),
            gender: selectedAdmission.patientProfile?.gender,
            departmentName: selectedAdmission.room?.department?.departmentName || "Khoa Điều Trị Nội Trú",
            roomNumber: selectedAdmission.room?.roomNumber,
            bedNumber: selectedAdmission.bedNumber || "01",
            diagnosis: selectedAdmission.initialDiagnosis,
            sheetNumber: treatmentSheetData.sheetNumber,
            doctorName: selectedAdmission.treatingDoctor?.fullName || "BS. Điều trị",
            careLevel: treatmentSheetData.careLevel,
            diet: treatmentSheetData.diet,
            allergies: selectedAdmission.allergies || "Không ghi nhận",
            records: [recordToPrint]
        });
    };

    // In Thẻ Đầu Giường Bệnh Nhân
    const handlePrintBedside = (item) => {
        printBedsideCard({
            patientName: item.patientProfile?.fullName,
            age: calculateAge(item.patientProfile?.dateOfBirth),
            gender: item.patientProfile?.gender,
            admissionCode: item.admissionCode,
            roomNumber: item.room?.roomNumber,
            bedNumber: item.bedNumber || "01",
            departmentName: item.room?.department?.departmentName || "Khoa Nội Trú",
            doctorName: item.treatingDoctor?.fullName || "BS. Phụ trách",
            careLevel: item.careLevel || "Mức 2",
            bloodType: item.bloodType || "O+",
            diet: item.diet || "Cơm mềm bệnh lý",
            allergies: item.allergies || "Không",
            admissionDate: formatDate(item.admissionDate)
        });
    };

    // ==========================================
    // PHIẾU CHĂM SÓC ĐIỀU DƯỠNG (NURSING CARE)
    // ==========================================
    const loadNursingCares = async (admissionId) => {
        if (!admissionId) return;
        setLoadingNursingCare(true);
        try {
            const res = await axiosInstance.get(`/api/inpatient/${admissionId}/nursing-cares`);
            const data = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setNursingCareList(data);
        } catch (err) {
            console.warn("Lỗi tải phiếu chăm sóc điều dưỡng:", err);
            setNursingCareList([]);
        } finally {
            setLoadingNursingCare(false);
        }
    };

    const handleOpenNursingCareModal = (admission) => {
        setSelectedAdmission(admission);
        setNursingCareForm({
            temperature: "36.8",
            bloodPressure: "120/80",
            pulse: "76",
            respiratoryRate: "18",
            spo2: "98",
            careLevel: "LEVEL_1",
            nursingNote: "",
            medicationAdministered: ""
        });
        loadNursingCares(admission.admissionId);
        setOpenNursingCareModal(true);
    };

    const handleSaveNursingCare = async () => {
        if (!selectedAdmission?.admissionId) return;
        if (!nursingCareForm.nursingNote?.trim()) {
            setFeedback({ type: "warning", message: "Vui lòng nhập diễn biến / ghi chú chăm sóc bệnh nhân!" });
            return;
        }
        setSubmittingNursingCare(true);
        try {
            const payload = {
                temperature: nursingCareForm.temperature ? parseFloat(nursingCareForm.temperature) : null,
                bloodPressure: nursingCareForm.bloodPressure?.trim() || null,
                pulse: nursingCareForm.pulse ? parseInt(nursingCareForm.pulse) : null,
                respiratoryRate: nursingCareForm.respiratoryRate ? parseInt(nursingCareForm.respiratoryRate) : null,
                spo2: nursingCareForm.spo2 ? parseInt(nursingCareForm.spo2) : null,
                careLevel: nursingCareForm.careLevel || "LEVEL_1",
                nursingNote: nursingCareForm.nursingNote.trim(),
                medicationAdministered: nursingCareForm.medicationAdministered?.trim() || null
            };
            await axiosInstance.post(`/api/inpatient/${selectedAdmission.admissionId}/nursing-cares`, payload);
            setFeedback({ type: "success", message: "Đã lưu phiếu chăm sóc điều dưỡng thành công!" });
            await loadNursingCares(selectedAdmission.admissionId);
            setNursingCareForm(prev => ({ ...prev, nursingNote: "", medicationAdministered: "" }));
        } catch (err) {
            console.error("Lỗi lưu phiếu chăm sóc:", err);
            setFeedback({ type: "error", message: err.response?.data?.message || err.message || "Lỗi lưu phiếu chăm sóc!" });
        } finally {
            setSubmittingNursingCare(false);
        }
    };

    // ==========================================
    // CHUYỂN GIƯỜNG / BUỒNG BỆNH
    // ==========================================
    const handleOpenTransferModal = (admission) => {
        setSelectedAdmission(admission);
        setTransferTarget({
            targetRoomId: allRooms[0]?.roomId || "",
            targetBedIndex: 1,
            transferReason: "Chuyển buồng điều trị theo chỉ định của Bác sĩ"
        });
        setOpenTransferModal(true);
    };

    const handleSaveTransfer = async () => {
        if (!selectedAdmission || !transferTarget.targetRoomId) return;
        const targetRoom = allRooms.find((r) => String(r.roomId) === String(transferTarget.targetRoomId));

        try {
            // Persist chuyển phòng trên backend nếu hồ sơ đã có trong DB
            if (selectedAdmission.admissionId && !selectedAdmission.admissionId.startsWith("33333333") && !selectedAdmission.admissionId.startsWith("44444444") && !selectedAdmission.admissionId.startsWith("55555555")) {
                await axiosInstance.put(`/api/inpatient/${selectedAdmission.admissionId}/transfer?newRoomId=${transferTarget.targetRoomId}`);
            }

            setAdmissions((prev) =>
                prev.map((a) => {
                    if (a.admissionId === selectedAdmission.admissionId) {
                        return {
                            ...a,
                            room: {
                                ...a.room,
                                roomId: targetRoom?.roomId || a.room.roomId,
                                roomNumber: targetRoom?.roomNumber || a.room.roomNumber,
                                department: { departmentId: targetRoom?.departmentId, departmentName: targetRoom?.departmentName }
                            },
                            bedNumber: transferTarget.targetBedIndex
                        };
                    }
                    return a;
                })
            );

            setFeedback({
                type: "success",
                message: `Đã chuyển người bệnh ${selectedAdmission.patientProfile?.fullName} sang ${targetRoom?.roomNumber || "Phòng mới"} - Giường ${transferTarget.targetBedIndex} thành công!`
            });
            setOpenTransferModal(false);
        } catch (err) {
            console.error("Lỗi chuyển phòng:", err);
            setFeedback({
                type: "error",
                message: err.response?.data?.message || "Lỗi chuyển buồng bệnh!"
            });
        }
    };

    // ==========================================
    // XUẤT VIỆN LOGIC
    // ==========================================
    const handleOpenDischargeModal = (item) => {
        setSelectedAdmission(item);
        setDischargeResult(null);
        setOpenDischargeModal(true);
    };

    const handleSaveDischarge = async () => {
        if (!selectedAdmission) return;
        if (!dischargeData.dischargeSummary?.trim()) {
            setFeedback({ type: "warning", message: "Bác sĩ phải nhập tóm tắt quá trình điều trị xuất viện trước khi kết thúc ca điều trị nội trú!" });
            return;
        }
        setSubmittingDischarge(true);
        try {
            const res = await axiosInstance.post(`/api/inpatient/${selectedAdmission.admissionId}/discharge`, {
                dischargeSummary: dischargeData.dischargeSummary.trim(),
                doctorRecommendation: dischargeData.doctorRecommendation,
                reExaminationDate: dischargeData.reExaminationDate
            });

            const days = Math.max(1, Math.ceil((Date.now() - new Date(selectedAdmission.admissionDate).getTime()) / (1000 * 3600 * 24)));
            const cost = days * (selectedAdmission.dailyRoomFee || 350000);

            setDischargeResult(res.data || {
                totalDays: days,
                totalInpatientCost: cost,
                dischargeDate: new Date().toISOString()
            });

            setFeedback({ type: "success", message: "Đã hoàn tất thủ tục xuất viện thành công!" });
            loadData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi xuất viện!" });
        } finally {
            setSubmittingDischarge(false);
        }
    };

    // ==========================================
    // TIẾP NHẬN BỆNH NHÂN VÀO GIƯỜNG
    // ==========================================
    const handleOpenAdmitForRoom = (room, bedIndex) => {
        const defaultProfile = profiles[0]?.patientProfileId || "";
        const defaultDoctor = doctors[0]?.doctorId || "";
        const roomObj = allRooms.find(r => r.roomId === room.roomId) || room;
        setAdmitForm({
            patientProfileId: defaultProfile,
            doctorId: defaultDoctor,
            roomId: roomObj.roomId,
            initialDiagnosis: `Nhập viện điều trị tại Phòng ${roomObj.roomNumber} - Giường số ${bedIndex}`,
            selectedBedIndex: bedIndex
        });
        setOpenAdmitModal(true);
    };

    const handleSaveAdmit = async () => {
        if (!admitForm.patientProfileId || !admitForm.roomId) {
            setFeedback({
                type: "warning",
                message: "Vui lòng chọn đầy đủ người bệnh và phòng điều trị!"
            });
            return;
        }
        setSubmittingAdmit(true);
        try {
            const docId = admitForm.doctorId || doctors[0]?.doctorId;
            const res = await axiosInstance.post("/api/inpatient/admit", {
                patientProfileId: admitForm.patientProfileId,
                doctorId: docId,
                roomId: Number(admitForm.roomId),
                initialDiagnosis: admitForm.initialDiagnosis
            });

            const newAdmission = res?.data?.data || res?.data || res;
            const selectedProfileObj = profiles.find(p => p.patientProfileId === admitForm.patientProfileId);
            const selectedDoctorObj = doctors.find(d => d.doctorId === docId);
            const roomObj = allRooms.find(r => r.roomId === Number(admitForm.roomId)) || {
                roomId: Number(admitForm.roomId),
                roomNumber: `Phòng ${admitForm.roomId}`
            };

            const enrichedNew = {
                ...newAdmission,
                admissionId: newAdmission?.admissionId || ("adm-" + Date.now()),
                admissionCode: newAdmission?.admissionCode || ("HA-" + String(Date.now()).slice(-6)),
                bedNumber: admitForm.selectedBedIndex || 1,
                room: roomObj,
                patientProfile: selectedProfileObj || newAdmission?.patientProfile || {
                    fullName: "Bệnh nhân mới tiếp nhận",
                    phoneNumber: "---"
                },
                treatingDoctor: selectedDoctorObj || newAdmission?.treatingDoctor || {
                    fullName: "Bác sĩ điều trị"
                },
                admissionDate: new Date().toISOString(),
                initialDiagnosis: admitForm.initialDiagnosis,
                severity: "NORMAL",
                careLevel: "Mức 3",
                state: "ADMITTED",
                dailyRoomFee: 350000,
                latestVitals: {
                    temperature: "36.8",
                    bloodPressure: "120/80",
                    heartRate: "76",
                    respiratoryRate: "18",
                    spO2: "98"
                }
            };

            setAdmissions(prev => {
                const filtered = prev.filter(a => !( (a.room?.roomId === roomObj.roomId || a.room?.roomNumber === roomObj.roomNumber) && Number(a.bedNumber) === Number(admitForm.selectedBedIndex) ));
                return [enrichedNew, ...filtered];
            });

            setFeedback({
                type: "success",
                message: `Đã tiếp nhận bệnh nhân ${selectedProfileObj?.fullName || ""} vào ${roomObj.roomNumber} - Giường ${admitForm.selectedBedIndex} thành công!`
            });
            setOpenAdmitModal(false);
            loadData();
        } catch (err) {
            console.error("Lỗi tiếp nhận bệnh nhân:", err);
            setFeedback({
                type: "error",
                message: err.response?.data?.message || err.message || "Lỗi tiếp nhận bệnh nhân nội trú!"
            });
        } finally {
            setSubmittingAdmit(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
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
                    <Avatar
                        sx={{
                            width: 54,
                            height: 54,
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: "#0088D6",
                            border: "1px solid rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <HotelIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1.2} mb={0.5} flexWrap="wrap">
                            <Chip
                                label="QUẢN LÝ ĐIỀU TRỊ NỘI TRÚ • CLINICAL INPATIENT SUITE PRO"
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
                                label="SMARTHOS-365"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    bgcolor: "#F1F5F9",
                                    color: "#475569",
                                    borderRadius: 1.5
                                }}
                            />
                        </Box>
                        <Typography variant="h5" fontWeight={800} color="#0F172A" sx={{ letterSpacing: "-0.02em" }}>
                            Sơ Đồ Buồng Giường & Bệnh Án Nội Trú
                        </Typography>
                        <Typography variant="body2" color="#64748B" sx={{ mt: 0.25 }}>
                            Sơ đồ buồng giường thời gian thực • Phiếu điều trị nội trú hàng ngày (Tờ bệnh trình chuẩn Bộ Y Tế)
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1.5} alignItems="center">
                    <Button
                        variant="outlined"
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
                        onClick={loadData}
                    >
                        Làm Mới
                    </Button>
                </Box>
            </Paper>

            {feedback.message && (
                <Alert
                    severity={feedback.type}
                    sx={{ mb: 3, borderRadius: 2.5, fontWeight: "500" }}
                    onClose={() => setFeedback({ type: "", message: "" })}
                >
                    {feedback.message}
                </Alert>
            )}

            {/* KPI METRICS STRIP CHUẨN SLIDE 28 - APPLE HIG + LINEAR */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={4} md={1.71}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", borderTop: "3px solid #475569", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", textAlign: "center" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#64748B", display: "block" }}>TỔNG SỐ GIƯỜNG</Typography>
                        <Typography variant="h4" fontWeight={800} color="#0F172A" sx={{ my: 0.5 }}>{stats.totalBeds}</Typography>
                        <Typography variant="caption" color="#64748B" fontWeight={600}>{stats.totalRooms} buồng bệnh</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={4} md={1.71}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", borderTop: "3px solid #0088D6", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", textAlign: "center" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0088D6", display: "block" }}>CÓ NGƯỜI NẰM</Typography>
                        <Typography variant="h4" fontWeight={800} color="#0088D6" sx={{ my: 0.5 }}>{stats.occupiedBeds}</Typography>
                        <Typography variant="caption" fontWeight={700} color="#0088D6">Công suất: {stats.occupancyRate}%</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={4} md={1.71}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", borderTop: "3px solid #10B981", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", textAlign: "center" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#059669", display: "block" }}>GIƯỜNG TRỐNG</Typography>
                        <Typography variant="h4" fontWeight={800} color="#10B981" sx={{ my: 0.5 }}>{stats.availableBeds}</Typography>
                        <Typography variant="caption" color="#059669" fontWeight={600}>Sẵn sàng nhận BN</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={4} md={1.71}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", borderTop: "3px solid #EF4444", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", textAlign: "center" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#DC2626", display: "block" }}>BỆNH NẶNG / ICU</Typography>
                        <Typography variant="h4" fontWeight={800} color="#EF4444" sx={{ my: 0.5 }}>{stats.criticalBeds}</Typography>
                        <Typography variant="caption" color="#DC2626" fontWeight={600}>Theo dõi sát</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={4} md={1.71}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", borderTop: "3px solid #F59E0B", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", textAlign: "center" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#D97706", display: "block" }}>HẬU PHẪU / MỨC 2</Typography>
                        <Typography variant="h4" fontWeight={800} color="#F59E0B" sx={{ my: 0.5 }}>{stats.postOpBeds}</Typography>
                        <Typography variant="caption" color="#D97706" fontWeight={600}>Chăm sóc 1 phần</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={4} md={1.71}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", borderTop: "3px solid #8B5CF6", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", textAlign: "center" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#7C3AED", display: "block" }}>CHỜ RA VIỆN ($)</Typography>
                        <Typography variant="h4" fontWeight={800} color="#8B5CF6" sx={{ my: 0.5 }}>2</Typography>
                        <Typography variant="caption" color="#7C3AED" fontWeight={600}>Chờ quyết toán</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={6} sm={4} md={1.71}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", borderTop: "3px solid #06B6D4", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", textAlign: "center" }}>
                        <Typography variant="caption" sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#0891B2", display: "block" }}>ĐANG KHỬ KHUẨN</Typography>
                        <Typography variant="h4" fontWeight={800} color="#06B6D4" sx={{ my: 0.5 }}>{stats.cleaningCount}</Typography>
                        <Typography variant="caption" color="#0891B2" fontWeight={600}>Dọn buồng</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* BỘ LỌC ĐA CHIỀU & TOOLBAR */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                            <Tab
                                label="🗺️ Sơ Đồ Giường (Bed Grid)"
                                icon={<SingleBedIcon />}
                                iconPosition="start"
                                sx={{ fontWeight: "bold" }}
                            />
                            <Tab
                                label={`📋 Danh Sách Bệnh Nhân (${admissions.length})`}
                                icon={<LocalHospitalIcon />}
                                iconPosition="start"
                                sx={{ fontWeight: "bold" }}
                            />
                        </Tabs>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Khoa Điều Trị"
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                        >
                            <MenuItem value="ALL">Tất cả các chuyên khoa</MenuItem>
                            {departments.map((d) => (
                                <MenuItem key={d.departmentId} value={d.departmentId}>
                                    {d.departmentName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6} md={2.5}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Trạng Thái Giường"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                            <MenuItem value="OCCUPIED">🔵 Đang có người nằm</MenuItem>
                            <MenuItem value="AVAILABLE">🟢 Giường trống sẵn sàng</MenuItem>
                            <MenuItem value="CRITICAL">🔴 Bệnh nhân nặng / Cấp cứu</MenuItem>
                            <MenuItem value="CLEANING">🟡 Đang khử khuẩn buồng</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid item xs={12} md={2.5}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Tìm BN, mã SBA, số phòng..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* TAB 0: SƠ ĐỒ BUỒNG GIƯỜNG TRỰC QUAN (VISUAL BED GRID) */}
            {activeTab === 0 && (
                <Box>
                    {/* BẢNG CHÚ GIẢI TRỰC QUAN GẮN TRÊN ĐẦU BUỒNG GIƯỜNG (TRIAGE COLOR LEGEND) */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            px: 2,
                            mb: 2.5,
                            borderRadius: 3,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1.5
                        }}
                    >
                        <Typography variant="caption" fontWeight={800} sx={{ color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.72rem" }}>
                            Phân Tầng Nguy Cơ & Trạng Thái Buồng Giường:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                            <Chip
                                size="small"
                                onClick={() => setStatusFilter(statusFilter === "AVAILABLE" ? "ALL" : "AVAILABLE")}
                                label="🟢 Giường trống sẵn sàng"
                                sx={{
                                    height: 26,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: statusFilter === "AVAILABLE" ? "#DCFCE7" : "rgba(16, 185, 129, 0.08)",
                                    color: "#15803D",
                                    border: "1px solid",
                                    borderColor: statusFilter === "AVAILABLE" ? "#16A34A" : "rgba(16, 185, 129, 0.25)",
                                    cursor: "pointer"
                                }}
                            />
                            <Chip
                                size="small"
                                onClick={() => setStatusFilter(statusFilter === "OCCUPIED" ? "ALL" : "OCCUPIED")}
                                label="🔵 Đang điều trị (Mức 3)"
                                sx={{
                                    height: 26,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: statusFilter === "OCCUPIED" ? "#E0F2FE" : "rgba(2, 132, 199, 0.08)",
                                    color: "#0369A1",
                                    border: "1px solid",
                                    borderColor: statusFilter === "OCCUPIED" ? "#0284C7" : "rgba(2, 132, 199, 0.25)",
                                    cursor: "pointer"
                                }}
                            />
                            <Chip
                                size="small"
                                label="🟠 Hậu phẫu (Mức 2)"
                                sx={{
                                    height: 26,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(245, 158, 11, 0.08)",
                                    color: "#B45309",
                                    border: "1px solid rgba(245, 158, 11, 0.25)"
                                }}
                            />
                            <Chip
                                size="small"
                                onClick={() => setStatusFilter(statusFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
                                label="🔴 Theo dõi sát / ICU (Mức 1)"
                                sx={{
                                    height: 26,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: statusFilter === "CRITICAL" ? "#FEE2E2" : "rgba(239, 68, 68, 0.08)",
                                    color: "#B91C1C",
                                    border: "1px solid",
                                    borderColor: statusFilter === "CRITICAL" ? "#DC2626" : "rgba(239, 68, 68, 0.25)",
                                    cursor: "pointer"
                                }}
                            />
                            <Chip
                                size="small"
                                onClick={() => setStatusFilter(statusFilter === "CLEANING" ? "ALL" : "CLEANING")}
                                label="🟡 Đang khử khuẩn"
                                sx={{
                                    height: 26,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: statusFilter === "CLEANING" ? "#FEF3C7" : "rgba(217, 119, 6, 0.08)",
                                    color: "#92400E",
                                    border: "1px solid",
                                    borderColor: statusFilter === "CLEANING" ? "#D97706" : "rgba(217, 119, 6, 0.25)",
                                    cursor: "pointer"
                                }}
                            />
                            <Chip
                                size="small"
                                label="🟣 Chờ viện phí / Ra viện"
                                sx={{
                                    height: 26,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(139, 92, 246, 0.08)",
                                    color: "#6D28D9",
                                    border: "1px solid rgba(139, 92, 246, 0.25)"
                                }}
                            />
                        </Stack>
                    </Paper>

                    <Grid container spacing={3}>
                        {filteredRooms.map((room) => {
                            const totalBeds = 4;
                            const roomAdmissions = admissions.filter(
                                (a) => a.room?.roomId === room.roomId || a.room?.roomNumber === room.roomNumber
                            );
                            const occupiedCount = roomAdmissions.length;

                            return (
                                <Grid item xs={12} lg={6} key={room.roomId || room.roomNumber}>
                                    <Paper
                                        elevation={2}
                                        sx={{
                                            p: 2.5,
                                            borderRadius: 3,
                                            borderTop: room.roomType === "ICU" ? "5px solid #ef4444" : "5px solid #0284c7",
                                            bgcolor: "#FFFFFF"
                                        }}
                                    >
                                        {/* Tiêu đề Buồng Phòng */}
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <MeetingRoomIcon color={room.roomType === "ICU" ? "error" : "primary"} />
                                                <Typography variant="h6" fontWeight="900" color="#0f172a">
                                                    {room.roomNumber} - {room.roomType === "ICU" ? "Buồng Hồi Sức Tích Cực (ICU)" : "Buồng Điều Trị Nội Trú"}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip
                                                    label={`${occupiedCount}/${totalBeds} Giường có BN`}
                                                    color={occupiedCount === totalBeds ? "error" : occupiedCount > 0 ? "primary" : "success"}
                                                    size="small"
                                                    sx={{ fontWeight: "bold" }}
                                                />
                                                <Chip
                                                    label={room.departmentName || "Khoa Lâm Sàng"}
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ fontSize: "0.75rem", fontWeight: "600" }}
                                                />
                                            </Stack>
                                        </Box>

                                        {/* Khung 4 Giường bên trong Buồng */}
                                        <Grid container spacing={1.5}>
                                            {[1, 2, 3, 4].map((bedNum) => {
                                                const bedKey = `${room.roomNumber}-G${bedNum}`;
                                                const patientInBed = roomAdmissions.find((a) => Number(a.bedNumber) === bedNum) ||
                                                    (!roomAdmissions.some((a) => a.bedNumber) ? roomAdmissions[bedNum - 1] : null);
                                                const isOccupied = !!patientInBed;
                                                const isCleaning = cleaningBeds.has(bedKey);

                                                // Filter checks
                                                if (statusFilter === "OCCUPIED" && !isOccupied) return null;
                                                if (statusFilter === "AVAILABLE" && (isOccupied || isCleaning)) return null;
                                                if (statusFilter === "CRITICAL" && (!isOccupied || patientInBed.severity !== "CRITICAL")) return null;
                                                if (statusFilter === "CLEANING" && !isCleaning) return null;

                                                const isCritical = patientInBed?.severity === "CRITICAL" || patientInBed?.careLevel === "Mức 1";
                                                const isPostOp = patientInBed?.severity === "POST_OP" || patientInBed?.careLevel === "Mức 2";

                                                return (
                                                    <Grid item xs={12} sm={6} key={bedNum}>
                                                        <Card
                                                            variant="outlined"
                                                            sx={{
                                                                p: 1.5,
                                                                borderRadius: 2.5,
                                                                bgcolor: isCleaning
                                                                    ? "#fffbeb"
                                                                    : isOccupied
                                                                        ? isCritical
                                                                            ? "rgba(239, 68, 68, 0.06)"
                                                                            : "rgba(2, 132, 199, 0.05)"
                                                                        : "#f0fdf4",
                                                                borderColor: isCleaning
                                                                    ? "#f59e0b"
                                                                    : isOccupied
                                                                        ? isCritical
                                                                            ? "#ef4444"
                                                                            : "#0284c7"
                                                                        : "#86efac",
                                                                borderWidth: isOccupied ? 2 : 1.5,
                                                                minHeight: 220,
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                justifyContent: "space-between"
                                                            }}
                                                        >
                                                            {/* Header Giường */}
                                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                                    <SingleBedIcon
                                                                        fontSize="small"
                                                                        sx={{
                                                                            color: isCleaning ? "#d97706" : isOccupied ? (isCritical ? "#ef4444" : "#0284c7") : "#16a34a"
                                                                        }}
                                                                    />
                                                                    <Typography variant="body2" fontWeight="900" color="#1e293b">
                                                                        Giường {bedNum} ({bedKey})
                                                                    </Typography>
                                                                </Box>
                                                                {isCleaning ? (
                                                                    <Chip
                                                                        label="🟠 Đang khử khuẩn"
                                                                        size="small"
                                                                        sx={{ height: 20, fontSize: "0.68rem", fontWeight: "bold", bgcolor: "#ffedd5", color: "#c2410c", border: "1px solid #fdba74" }}
                                                                    />
                                                                ) : isOccupied ? (
                                                                    <Chip
                                                                        label={isCritical ? "🔴 Cấp cứu (Mức 1)" : isPostOp ? "🟠 Hậu phẫu (Mức 2)" : "🔵 Ổn định (Mức 3)"}
                                                                        size="small"
                                                                        color={isCritical ? "error" : isPostOp ? "warning" : "primary"}
                                                                        sx={{ height: 20, fontSize: "0.68rem", fontWeight: "bold" }}
                                                                    />
                                                                ) : (
                                                                    <Chip
                                                                        label="🟢 Giường trống"
                                                                        size="small"
                                                                        color="success"
                                                                        sx={{ height: 20, fontSize: "0.68rem", fontWeight: "bold", bgcolor: "#dcfce7", color: "#15803d", border: "1px solid #86efac" }}
                                                                    />
                                                                )}
                                                            </Box>

                                                            {/* Thân thẻ Giường */}
                                                            {isCleaning ? (
                                                                <Box textAlign="center" py={2}>
                                                                    <CleaningServicesIcon sx={{ fontSize: 36, color: "#d97706", mb: 0.5 }} />
                                                                    <Typography variant="body2" fontWeight="bold" color="#92400e">
                                                                        Đang thay ga & khử khuẩn
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                                                        Chờ vệ sinh buồng bệnh theo quy định
                                                                    </Typography>
                                                                    <Button
                                                                        size="small"
                                                                        variant="contained"
                                                                        color="warning"
                                                                        onClick={() => handleToggleCleaning(bedKey)}
                                                                        sx={{ fontSize: "0.72rem", fontWeight: "bold", borderRadius: 2 }}
                                                                    >
                                                                        ✅ Hoàn Tất Vệ Sinh
                                                                    </Button>
                                                                </Box>
                                                            ) : isOccupied ? (
                                                                <Box>
                                                                    {/* Tên BN & Tuổi */}
                                                                    <Box display="flex" justifyContent="space-between" alignItems="baseline">
                                                                        <Typography variant="subtitle2" fontWeight="800" color="#0f172a" noWrap sx={{ textTransform: "uppercase" }}>
                                                                            {patientInBed.patientProfile?.fullName}
                                                                        </Typography>
                                                                        <Chip
                                                                            label={`${calculateAge(patientInBed.patientProfile?.dateOfBirth)}T • ${patientInBed.patientProfile?.gender === "MALE" ? "Nam" : "Nữ"}`}
                                                                            size="small"
                                                                            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#F1F5F9" }}
                                                                        />
                                                                    </Box>

                                                                    <Box display="flex" alignItems="center" gap={1} mt={0.3}>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Mã SBA:
                                                                        </Typography>
                                                                        <Typography variant="caption" fontFamily="monospace" fontWeight="700" color="#0088D6" sx={{ bgcolor: "rgba(0, 136, 214, 0.08)", px: 0.6, py: 0.1, borderRadius: 1 }}>
                                                                            {patientInBed.admissionCode}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Typography variant="caption" color="text.secondary" display="block" noWrap mt={0.2}>
                                                                        BS điều trị: <b>{patientInBed.treatingDoctor?.fullName || "BS. Trực khoa"}</b>
                                                                    </Typography>

                                                                    {/* Chẩn đoán & Sinh hiệu tóm tắt */}
                                                                    <Box
                                                                        sx={{
                                                                            bgcolor: isCritical ? "rgba(239, 68, 68, 0.08)" : "rgba(2, 132, 199, 0.06)",
                                                                            border: "1px solid",
                                                                            borderColor: isCritical ? "rgba(239, 68, 68, 0.2)" : "rgba(2, 132, 199, 0.15)",
                                                                            p: 1,
                                                                            borderRadius: 2,
                                                                            my: 1
                                                                        }}
                                                                    >
                                                                        <Typography variant="caption" fontWeight="700" color="#1E293B" display="block" noWrap title={patientInBed.initialDiagnosis}>
                                                                            🩺 {patientInBed.initialDiagnosis}
                                                                        </Typography>
                                                                        <Box display="flex" alignItems="center" gap={1.5} mt={0.4} flexWrap="wrap">
                                                                            <Typography variant="caption" fontWeight="700" color={isCritical ? "error.main" : "primary.main"} sx={{ fontFamily: "monospace" }}>
                                                                                HA: {patientInBed.latestVitals?.bloodPressure || "Chưa đo"}
                                                                            </Typography>
                                                                            <Typography variant="caption" fontWeight="600" color="#475569" sx={{ fontFamily: "monospace" }}>
                                                                                Mạch: {patientInBed.latestVitals?.heartRate ? `${patientInBed.latestVitals.heartRate} bpm` : "Chưa đo"}
                                                                            </Typography>
                                                                            <Typography variant="caption" fontWeight="700" color={Number(patientInBed.latestVitals?.spO2) < 95 ? "error.main" : "success.main"} sx={{ fontFamily: "monospace" }}>
                                                                                SpO2: {patientInBed.latestVitals?.spO2 ? `${patientInBed.latestVitals.spO2}%` : "Chưa đo"}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>

                                                                    {/* Thao tác 1-Click chuẩn Y tế */}
                                                                    <Grid container spacing={0.8} mt={0.5}>
                                                                        <Grid item xs={isNurse ? 6 : 6}>
                                                                            <Button
                                                                                fullWidth
                                                                                size="small"
                                                                                variant="contained"
                                                                                startIcon={<VolunteerActivismIcon sx={{ fontSize: 14 }} />}
                                                                                onClick={() => handleOpenNursingCareModal(patientInBed)}
                                                                                sx={{ fontSize: "0.7rem", py: 0.5, fontWeight: 700, borderRadius: 2, textTransform: "none", bgcolor: "#0D9488", "&:hover": { bgcolor: "#0F766E" } }}
                                                                            >
                                                                                Chăm Sóc
                                                                            </Button>
                                                                        </Grid>
                                                                        {!isNurse && (
                                                                            <Grid item xs={6}>
                                                                                <Button
                                                                                fullWidth
                                                                                size="small"
                                                                                variant="contained"
                                                                                color="primary"
                                                                                startIcon={<AssignmentIcon sx={{ fontSize: 14 }} />}
                                                                                onClick={() => handleOpenTreatmentSheet(patientInBed)}
                                                                                sx={{ fontSize: "0.7rem", py: 0.5, fontWeight: 700, borderRadius: 2, textTransform: "none" }}
                                                                            >
                                                                                Tờ Bệnh Trình
                                                                            </Button>
                                                                        </Grid>
                                                                        )}
                                                                        {!isNurse && (
                                                                            <Grid item xs={6}>
                                                                                <Button
                                                                                fullWidth
                                                                                size="small"
                                                                                variant="outlined"
                                                                                color="info"
                                                                                startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                                                                                onClick={() => handleOpenTransferModal(patientInBed)}
                                                                                sx={{ fontSize: "0.7rem", py: 0.5, fontWeight: 700, borderRadius: 2, textTransform: "none" }}
                                                                            >
                                                                                Đổi Giường
                                                                            </Button>
                                                                        </Grid>
                                                                        )}
                                                                        <Grid item xs={isNurse ? 6 : 6}>
                                                                            <Button
                                                                                fullWidth
                                                                                size="small"
                                                                                variant="outlined"
                                                                                color="inherit"
                                                                                startIcon={<BadgeIcon sx={{ fontSize: 14 }} />}
                                                                                onClick={() => handlePrintBedside(patientInBed)}
                                                                                sx={{ fontSize: "0.7rem", py: 0.5, fontWeight: 600, borderRadius: 2, textTransform: "none", color: "#475569" }}
                                                                            >
                                                                                Thẻ Giường
                                                                            </Button>
                                                                        </Grid>
                                                                        {!isNurse && (
                                                                            <Grid item xs={6}>
                                                                                <Button
                                                                                fullWidth
                                                                                size="small"
                                                                                variant="outlined"
                                                                                color="error"
                                                                                startIcon={<ExitToAppIcon sx={{ fontSize: 14 }} />}
                                                                                onClick={() => handleOpenDischargeModal(patientInBed)}
                                                                                sx={{ fontSize: "0.7rem", py: 0.5, fontWeight: 700, borderRadius: 2, textTransform: "none" }}
                                                                            >
                                                                                Xuất Viện
                                                                            </Button>
                                                                        </Grid>
                                                                        )}
                                                                    </Grid>
                                                                </Box>
                                                            ) : (
                                                                <Box textAlign="center" py={2}>
                                                                    <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                                                                        Giường trống sạch sẽ, sẵn sàng tiếp nhận
                                                                    </Typography>
                                                                    <Stack direction="row" spacing={1} justifyContent="center">
                                                                        <Button
                                                                            size="small"
                                                                            variant="contained"
                                                                            color="success"
                                                                            startIcon={<PersonAddIcon />}
                                                                            onClick={() => handleOpenAdmitForRoom(room, bedNum)}
                                                                            sx={{ fontSize: "0.72rem", fontWeight: "bold", borderRadius: 2 }}
                                                                        >
                                                                            Tiếp Nhận BN
                                                                        </Button>
                                                                        <Tooltip title="Chuyển sang trạng thái dọn dẹp buồng">
                                                                            <Button
                                                                                size="small"
                                                                                variant="outlined"
                                                                                color="warning"
                                                                                onClick={() => handleToggleCleaning(bedKey)}
                                                                                sx={{ fontSize: "0.72rem", minWidth: 0, px: 1 }}
                                                                            >
                                                                                Vệ Sinh
                                                                            </Button>
                                                                        </Tooltip>
                                                                    </Stack>
                                                                </Box>
                                                            )}
                                                        </Card>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            )}

            {/* TAB 1: DANH SÁCH BỆNH NHÂN NỘI TRÚ ĐANG ĐIỀU TRỊ */}
            {activeTab === 1 && (
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Mã hồ sơ</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Bệnh nhân</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Buồng & Giường</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Mức chăm sóc</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Bác sĩ điều trị</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Ngày nhập viện</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Chẩn đoán ban đầu</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Giá ngày giường</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 }}>Thao tác chuyên môn</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {admissions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                        <Typography variant="body1" fontWeight={700} color="#64748B">
                                            Hiện tại khoa chưa có bệnh nhân nào đang điều trị nội trú
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                admissions.map((item) => (
                                <TableRow key={item.admissionId} hover sx={{ "&:hover": { bgcolor: "rgba(0, 136, 214, 0.02)" } }}>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: "monospace", color: "#0088D6", bgcolor: "rgba(0, 136, 214, 0.08)", px: 1, py: 0.35, borderRadius: 1.5, display: "inline-block" }}>
                                            {item.admissionCode}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 160 }}>
                                        <Typography variant="body2" fontWeight="bold">
                                            {item.patientProfile?.fullName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {item.patientProfile?.gender === "MALE" ? "Nam" : "Nữ"} ({calculateAge(item.patientProfile?.dateOfBirth)}) - SĐT: {item.patientProfile?.phoneNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                        <Chip
                                            icon={<MeetingRoomIcon />}
                                            label={`${item.room?.roomNumber || "301"} - G${item.bedNumber || 1}`}
                                            size="small"
                                            color="info"
                                            sx={{ fontWeight: "bold" }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                                        <Chip
                                            label={item.careLevel || "Mức 2"}
                                            size="small"
                                            color={item.careLevel === "Mức 1" ? "error" : item.careLevel === "Mức 2" ? "warning" : "default"}
                                            sx={{ fontWeight: "bold" }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{item.treatingDoctor?.fullName || "BS. Trực khoa"}</TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(item.admissionDate)}</TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        <Typography variant="body2" noWrap title={item.initialDiagnosis}>
                                            {item.initialDiagnosis}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}><b>{formatCurrency(item.dailyRoomFee || 350000)}/ngày</b></TableCell>
                                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                        <Stack direction="row" spacing={0.8} justifyContent="center">
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<VolunteerActivismIcon />}
                                                onClick={() => handleOpenNursingCareModal(item)}
                                                sx={{ borderRadius: 2, whiteSpace: "nowrap", fontSize: "0.75rem", px: 1.2, bgcolor: "#0D9488", "&:hover": { bgcolor: "#0F766E" } }}
                                            >
                                                Phiếu Chăm Sóc
                                            </Button>
                                            {!isNurse && (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="primary"
                                                    startIcon={<AssignmentIcon />}
                                                    onClick={() => handleOpenTreatmentSheet(item)}
                                                    sx={{ borderRadius: 2, whiteSpace: "nowrap", fontSize: "0.75rem", px: 1.2 }}
                                                >
                                                    Tờ Bệnh Trình
                                                </Button>
                                            )}
                                            {!isNurse && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="info"
                                                    startIcon={<SwapHorizIcon />}
                                                    onClick={() => handleOpenTransferModal(item)}
                                                    sx={{ borderRadius: 2, whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                                                >
                                                    Đổi Giường
                                                </Button>
                                            )}
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="secondary"
                                                startIcon={<BadgeIcon />}
                                                onClick={() => handlePrintBedside(item)}
                                                sx={{ borderRadius: 2, whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                                            >
                                                Thẻ Giường
                                            </Button>
                                            {!isNurse && (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="error"
                                                    startIcon={<ExitToAppIcon />}
                                                    onClick={() => handleOpenDischargeModal(item)}
                                                    sx={{ borderRadius: 2, whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                                                >
                                                    Xuất Viện
                                                </Button>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* ======================================================= */}
            {/* MODAL: PHIẾU ĐIỀU TRỊ NỘI TRÚ (TỜ BỆNH TRÌNH CHUẨN BYT) */}
            {/* ======================================================= */}
            <Dialog
                open={openTreatmentSheetModal}
                onClose={() => setOpenTreatmentSheetModal(false)}
                maxWidth="xl"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3.5, overflow: "hidden" } }}
            >
                <DialogTitle
                    sx={{
                        p: 2,
                        bgcolor: "#0284c7",
                        color: "white",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <AssignmentIcon />
                        <Box>
                            <Typography variant="h6" fontWeight="bold">
                                PHIẾU ĐIỀU TRỊ NỘI TRÚ (TỜ BỆNH TRÌNH SỐ {treatmentSheetData.sheetNumber})
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                Tiêu chuẩn biểu mẫu 01/BV-01 Bộ Y Tế & SmartHos-365
                            </Typography>
                        </Box>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: "white", color: "#0284c7", fontWeight: "bold", "&:hover": { bgcolor: "#f0f9ff" } }}
                            startIcon={<PrintIcon />}
                            onClick={handlePrintTreatmentSheet}
                        >
                            In Tờ Bệnh Trình (A4)
                        </Button>
                        <Button
                            variant="outlined"
                            sx={{ color: "white", borderColor: "white", "&:hover": { borderColor: "#e0f2fe", bgcolor: "rgba(255,255,255,0.1)" } }}
                            onClick={() => setOpenTreatmentSheetModal(false)}
                        >
                            Đóng
                        </Button>
                    </Stack>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 2.5, bgcolor: "#f8fafc" }}>
                    {/* Header thông tin bệnh nhân hành chính */}
                    <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 2, border: "1px solid #cbd5e1", bgcolor: "white" }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <Typography variant="caption" color="text.secondary">Họ và tên người bệnh:</Typography>
                                <Typography variant="h6" fontWeight="bold" color="#0f172a" textTransform="uppercase">
                                    {selectedAdmission?.patientProfile?.fullName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Tuổi: <b>{calculateAge(selectedAdmission?.patientProfile?.dateOfBirth)}</b> • Giới tính: <b>{selectedAdmission?.patientProfile?.gender === "MALE" ? "Nam" : "Nữ"}</b> • Mã SBA: <b>{selectedAdmission?.admissionCode}</b>
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Vị trí nằm viện:</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {selectedAdmission?.room?.department?.departmentName || "Khoa Nội"}
                                </Typography>
                                <Typography variant="caption" color="primary.main" fontWeight="bold">
                                    Phòng: {selectedAdmission?.room?.roomNumber} • Giường số: {selectedAdmission?.bedNumber || 1}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Chẩn đoán vào khoa:</Typography>
                                <Typography variant="body2" fontWeight="bold" color="#334155" noWrap title={selectedAdmission?.initialDiagnosis}>
                                    {selectedAdmission?.initialDiagnosis}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Bác sĩ điều trị: <b>{selectedAdmission?.treatingDoctor?.fullName || "BS. Phụ trách"}</b>
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Typography variant="caption" color="text.secondary">Cảnh báo dị ứng:</Typography>
                                <Box mt={0.5}>
                                    <Chip
                                        icon={<WarningIcon />}
                                        label={selectedAdmission?.allergies || "Không ghi nhận"}
                                        color={selectedAdmission?.allergies && selectedAdmission?.allergies !== "Không ghi nhận" ? "error" : "success"}
                                        size="small"
                                        sx={{ fontWeight: "bold" }}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Dải nút chèn nhanh mẫu diễn tiến lâm sàng */}
                    <Box mb={2}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={0.5} display="block">
                            ⚡ Chèn nhanh mẫu Diễn tiến lâm sàng (Presets):
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {PROGRESSION_PRESETS.map((p, idx) => (
                                <Button
                                    key={idx}
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleApplyPreset(p)}
                                    sx={{ borderRadius: 2, fontSize: "0.75rem", textTransform: "none" }}
                                >
                                    {p.title}
                                </Button>
                            ))}
                        </Stack>
                    </Box>

                    {/* BỐ CỤC 2 CỘT SONG SONG CHUẨN BỘ Y TẾ */}
                    <Grid container spacing={2.5}>
                        {/* CỘT TRÁI: DIỄN BIẾN BỆNH & TRIỆU CHỨNG LÂM SÀNG */}
                        <Grid item xs={12} lg={5}>
                            <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: "100%", bgcolor: "white" }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} pb={1} borderBottom="2px solid #0284c7">
                                    <Typography variant="subtitle1" fontWeight="bold" color="#0284c7">
                                        1. DIỄN BIẾN BỆNH CỦA NGƯỜI BỆNH
                                    </Typography>
                                    <Chip label="Bác sĩ / Điều dưỡng" size="small" variant="outlined" />
                                </Box>

                                {/* Thời gian ghi chép */}
                                <Grid container spacing={1.5} mb={2}>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            type="date"
                                            label="Ngày ghi chép"
                                            value={treatmentSheetData.date}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, date: e.target.value })}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Giờ khám"
                                            value={treatmentSheetData.time}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, time: e.target.value })}
                                        />
                                    </Grid>
                                </Grid>

                                {/* Bảng đo Dấu hiệu sinh tồn (Vitals) */}
                                <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={0.5} display="block">
                                    🩺 Dấu Hiệu Sinh Tồn (Đo lúc khám):
                                </Typography>
                                <Grid container spacing={1} mb={2}>
                                    <Grid item xs={4}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Thân nhiệt (°C)"
                                            value={treatmentSheetData.temperature}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, temperature: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={4}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Huyết áp (mmHg)"
                                            value={treatmentSheetData.bloodPressure}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, bloodPressure: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={4}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Mạch (nhịp/phút)"
                                            value={treatmentSheetData.heartRate}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, heartRate: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Nhịp thở (lần/phút)"
                                            value={treatmentSheetData.respiratoryRate}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, respiratoryRate: e.target.value })}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="SpO2 (%)"
                                            value={treatmentSheetData.spO2}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, spO2: e.target.value })}
                                        />
                                    </Grid>
                                </Grid>

                                {/* Soạn thảo diễn biến lâm sàng */}
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={8}
                                    label="Diễn tiến bệnh, toàn trạng & triệu chứng khám thực thể"
                                    value={treatmentSheetData.diseaseProgression}
                                    onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, diseaseProgression: e.target.value })}
                                    helperText="Ghi nhận tri giác, tim mạch, hô hấp, bụng, vết mổ, dẫn lưu và xét nghiệm mới"
                                />

                                {/* Lịch sử các tờ bệnh trình trước */}
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" mb={1}>
                                    📅 Lịch sử các ngày điều trị trước:
                                </Typography>
                                {loadingHistory ? (
                                    <LinearProgress />
                                ) : treatmentHistory.length === 0 ? (
                                    <Typography variant="caption" color="text.secondary">Chưa có bản ghi nào.</Typography>
                                ) : (
                                    <Stack spacing={1}>
                                        {treatmentHistory.slice(0, 3).map((item, idx) => (
                                            <Paper key={idx} variant="outlined" sx={{ p: 1, borderRadius: 1.5, bgcolor: "#f8fafc" }}>
                                                <Box display="flex" justifyContent="space-between">
                                                    <Typography variant="caption" fontWeight="bold" color="primary">
                                                        Ngày: {formatDate(item.logDate)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.temperature}°C • {item.bloodPressure} mmHg • {item.heartRate} bpm
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="#475569" display="block" noWrap title={item.diseaseProgression}>
                                                    {item.diseaseProgression}
                                                </Typography>
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}
                            </Paper>
                        </Grid>

                        {/* CỘT PHẢI: Y LỆNH ĐIỀU TRỊ & CHĂM SÓC */}
                        <Grid item xs={12} lg={7}>
                            <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: "100%", bgcolor: "white" }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} pb={1} borderBottom="2px solid #16a34a">
                                    <Typography variant="subtitle1" fontWeight="bold" color="#16a34a">
                                        2. Y LỆNH ĐIỀU TRỊ, THUỐC & CHĂM SÓC
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        {DRUG_PROTOCOL_PRESETS.map((proto, idx) => (
                                            <Button
                                                key={idx}
                                                size="small"
                                                variant="outlined"
                                                color="success"
                                                onClick={() => handleApplyDrugProtocol(proto)}
                                                sx={{ fontSize: "0.72rem", py: 0.3 }}
                                            >
                                                + {proto.name}
                                            </Button>
                                        ))}
                                    </Stack>
                                </Box>

                                {/* Cài đặt Chăm sóc & Chế độ ăn */}
                                <Grid container spacing={1.5} mb={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            select
                                            fullWidth
                                            size="small"
                                            label="Chế độ chăm sóc"
                                            value={treatmentSheetData.careLevel}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, careLevel: e.target.value })}
                                        >
                                            <MenuItem value="Mức 1">Cấp I (Bệnh nhân nặng, chăm sóc toàn diện)</MenuItem>
                                            <MenuItem value="Mức 2">Cấp II (Chăm sóc một phần, người bệnh tự vận động)</MenuItem>
                                            <MenuItem value="Mức 3">Cấp III (Người bệnh tự phục vụ, điều dưỡng hướng dẫn)</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            select
                                            fullWidth
                                            size="small"
                                            label="Chế độ dinh dưỡng / Ăn uống"
                                            value={treatmentSheetData.diet}
                                            onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, diet: e.target.value })}
                                        >
                                            <MenuItem value="Cơm thường">Cơm thường (chế độ dinh dưỡng đầy đủ)</MenuItem>
                                            <MenuItem value="Cơm mềm bệnh lý">Cơm mềm bệnh lý (ít dầu mỡ)</MenuItem>
                                            <MenuItem value="Cháo súp dinh dưỡng">Cháo súp dinh dưỡng (dễ tiêu)</MenuItem>
                                            <MenuItem value="Nhịn ăn hoàn toàn">Nhịn ăn hoàn toàn (bù dịch tĩnh mạch)</MenuItem>
                                            <MenuItem value="Ăn kiêng muối tuyệt đối">Ăn kiêng muối tuyệt đối (Tim mạch / Thận)</MenuItem>
                                            <MenuItem value="Ăn qua sonde dạ dày">Ăn qua sonde dạ dày</MenuItem>
                                        </TextField>
                                    </Grid>
                                </Grid>

                                {/* BẢNG THUỐC VÀ DỊCH TRUYỀN Y LỆNH */}
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                        💊 Danh Mục Thuốc & Dịch Truyền Cho Ngày Điều Trị:
                                    </Typography>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="success"
                                        startIcon={<AddCircleIcon />}
                                        onClick={handleAddDrugRow}
                                        sx={{ fontSize: "0.72rem", py: 0.3 }}
                                    >
                                        Thêm Thuốc
                                    </Button>
                                </Box>

                                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 280 }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: "#f1f5f9" }}>
                                            <TableRow>
                                                <TableCell><b>Tên thuốc / Hàm lượng</b></TableCell>
                                                <TableCell style={{ width: 70 }}><b>Đơn vị</b></TableCell>
                                                <TableCell style={{ width: 45 }} align="center"><b>S</b></TableCell>
                                                <TableCell style={{ width: 45 }} align="center"><b>Tr</b></TableCell>
                                                <TableCell style={{ width: 45 }} align="center"><b>C</b></TableCell>
                                                <TableCell style={{ width: 45 }} align="center"><b>T</b></TableCell>
                                                <TableCell style={{ width: 50 }} align="center"><b>Tổng</b></TableCell>
                                                <TableCell style={{ width: 120 }}><b>Đường dùng</b></TableCell>
                                                <TableCell><b>Tốc độ / Ghi chú</b></TableCell>
                                                <TableCell style={{ width: 40 }}></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {treatmentSheetData.drugs.map((d) => (
                                                <TableRow key={d.id}>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            value={d.name}
                                                            onChange={(e) => handleUpdateDrugRow(d.id, "name", e.target.value)}
                                                            placeholder="Nhập tên thuốc..."
                                                            sx={{ "& input": { fontSize: "0.8rem", py: 0.5 } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            size="small"
                                                            value={d.unit}
                                                            onChange={(e) => handleUpdateDrugRow(d.id, "unit", e.target.value)}
                                                            sx={{ "& input": { fontSize: "0.8rem", py: 0.5 } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <TextField
                                                            size="small"
                                                            value={d.morning}
                                                            onChange={(e) => handleUpdateDrugRow(d.id, "morning", e.target.value)}
                                                            sx={{ width: 38, "& input": { fontSize: "0.8rem", py: 0.5, textAlign: "center" } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <TextField
                                                            size="small"
                                                            value={d.noon}
                                                            onChange={(e) => handleUpdateDrugRow(d.id, "noon", e.target.value)}
                                                            sx={{ width: 38, "& input": { fontSize: "0.8rem", py: 0.5, textAlign: "center" } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <TextField
                                                            size="small"
                                                            value={d.evening}
                                                            onChange={(e) => handleUpdateDrugRow(d.id, "evening", e.target.value)}
                                                            sx={{ width: 38, "& input": { fontSize: "0.8rem", py: 0.5, textAlign: "center" } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <TextField
                                                            size="small"
                                                            value={d.night}
                                                            onChange={(e) => handleUpdateDrugRow(d.id, "night", e.target.value)}
                                                            sx={{ width: 38, "& input": { fontSize: "0.8rem", py: 0.5, textAlign: "center" } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="body2" fontWeight="bold" color="primary">
                                                            {d.total}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            select
                                                            size="small"
                                                            value={d.route}
                                                            onChange={(e) => handleUpdateDrugRow(d.id, "route", e.target.value)}
                                                            sx={{ "& .MuiSelect-select": { fontSize: "0.75rem", py: 0.5 } }}
                                                        >
                                                            <MenuItem value="Uống">Uống</MenuItem>
                                                            <MenuItem value="Truyền tĩnh mạch">Truyền TM</MenuItem>
                                                            <MenuItem value="Tiêm tĩnh mạch">Tiêm TM</MenuItem>
                                                            <MenuItem value="Tiêm bắp">Tiêm bắp</MenuItem>
                                                            <MenuItem value="Khí dung">Khí dung</MenuItem>
                                                            <MenuItem value="Dùng ngoài">Dùng ngoài</MenuItem>
                                                            <MenuItem value="Xịt dưới lưỡi">Xịt dưới lưỡi</MenuItem>
                                                        </TextField>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            value={d.note}
                                                            onChange={(e) => handleUpdateDrugRow(d.id, "note", e.target.value)}
                                                            placeholder="giọt/phút, sau ăn..."
                                                            sx={{ "& input": { fontSize: "0.75rem", py: 0.5 } }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <IconButton size="small" color="error" onClick={() => handleDeleteDrugRow(d.id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Y lệnh điều dưỡng & Bác sĩ ký */}
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Y lệnh chăm sóc điều dưỡng, theo dõi & xét nghiệm bổ sung"
                                    value={treatmentSheetData.doctorInstruction}
                                    onChange={(e) => setTreatmentSheetData({ ...treatmentSheetData, doctorInstruction: e.target.value })}
                                />

                                <Box display="flex" justifyContent="flex-end" alignItems="center" mt={2} gap={2}>
                                    <Box textAlign="right">
                                        <Typography variant="caption" color="text.secondary">Bác sĩ ra y lệnh:</Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                            {selectedAdmission?.treatingDoctor?.fullName || "BS. Phụ trách"}
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        startIcon={<CheckCircleIcon />}
                                        onClick={handleSaveTreatmentSheet}
                                        disabled={submittingTreatment}
                                        sx={{ px: 3, fontWeight: "bold" }}
                                    >
                                        {submittingTreatment ? "Đang lưu..." : "Lưu Tờ Bệnh Trình"}
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenTreatmentSheetModal(false)}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* ======================================================= */}
            {/* MODAL: CHUYỂN BUỒNG / GIƯỜNG ĐIỀU TRỊ                   */}
            {/* ======================================================= */}
            <Dialog open={openTransferModal} onClose={() => setOpenTransferModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3.5, overflow: "hidden" } }}>
                <DialogTitle fontWeight="bold" color="primary.main">
                    🔄 Chuyển Buồng & Giường Bệnh Nhân
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle2" color="text.secondary" mb={2}>
                        Người bệnh: <b>{selectedAdmission?.patientProfile?.fullName}</b> (Mã: {selectedAdmission?.admissionCode})
                    </Typography>
                    <Typography variant="body2" mb={2}>
                        Hiện tại đang nằm: <b>Phòng {selectedAdmission?.room?.roomNumber} - Giường {selectedAdmission?.bedNumber || 1}</b> ({selectedAdmission?.room?.department?.departmentName})
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="Chọn buồng bệnh mới"
                                value={transferTarget.targetRoomId}
                                onChange={(e) => setTransferTarget({ ...transferTarget, targetRoomId: e.target.value })}
                            >
                                {allRooms.map((r) => (
                                    <MenuItem key={r.roomId} value={r.roomId}>
                                        {r.roomNumber} - {r.departmentName} ({r.roomType === "ICU" ? "Buồng ICU" : "Buồng Thường"})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="Chọn số giường mới"
                                value={transferTarget.targetBedIndex}
                                onChange={(e) => setTransferTarget({ ...transferTarget, targetBedIndex: Number(e.target.value) })}
                            >
                                {[1, 2, 3, 4].map((n) => (
                                    <MenuItem key={n} value={n}>Giường số {n}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Lý do chuyển buồng / giường"
                                value={transferTarget.transferReason}
                                onChange={(e) => setTransferTarget({ ...transferTarget, transferReason: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenTransferModal(false)}>Hủy</Button>
                    <Button variant="contained" color="primary" onClick={handleSaveTransfer}>
                        Xác Nhận Đổi Giường
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ======================================================= */}
            {/* MODAL: THỦ TỤC XUẤT VIỆN & TỔNG KẾT VIỆN PHÍ           */}
            {/* ======================================================= */}
            <Dialog open={openDischargeModal} onClose={() => setOpenDischargeModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3.5, overflow: "hidden" } }}>
                <DialogTitle fontWeight="bold" color="error.main">
                    🚪 Làm Thủ Tục Xuất Viện & Quyết Toán Ngày Giường
                </DialogTitle>
                <DialogContent dividers>
                    {dischargeResult ? (
                        <Box textAlign="center" py={2}>
                            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 1 }} />
                            <Typography variant="h6" fontWeight="bold" color="success.dark">
                                Đã Hoàn Tất Thủ Tục Xuất Viện!
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, my: 2, textAlign: "left", bgcolor: "#F0FDF4" }}>
                                <Typography variant="body2">Số ngày nằm viện: <b>{dischargeResult.totalDays} ngày</b></Typography>
                                <Typography variant="body2">Tổng viện phí ngày giường: <b style={{ color: "#16a34a", fontSize: "1.1rem" }}>{formatCurrency(dischargeResult.totalInpatientCost)}</b></Typography>
                                <Typography variant="body2">Ngày xuất viện: <b>{formatDateTime(dischargeResult.dischargeDate)}</b></Typography>
                            </Paper>
                            <Alert severity="info" sx={{ mt: 1.5, mb: 2, textAlign: "left", borderRadius: 2 }}>
                                <strong>Lưu ý quyết toán viện phí:</strong> Hồ sơ xuất viện lâm sàng đã được ký duyệt. Giường bệnh đã chuyển sang chế độ chờ vệ sinh khử khuẩn. Người bệnh/thân nhân vui lòng tới <strong>Quầy Thu Ngân</strong> để quyết toán viện phí và nhận biên lai tài chính chính thức.
                            </Alert>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<PrintIcon />}
                                onClick={() => printTreatmentSheet({
                                    hospitalName: "BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT",
                                    departmentName: selectedAdmission?.room?.department?.departmentName || "Khoa Điều Trị Nội Trú",
                                    roomName: selectedAdmission?.room?.roomName || "---",
                                    bedNumber: selectedAdmission?.bed?.bedNumber || "---",
                                    patientName: selectedAdmission?.patientProfile?.fullName || "Bệnh nhân nội trú",
                                    patientAge: selectedAdmission?.patientProfile?.dateOfBirth ? (new Date().getFullYear() - new Date(selectedAdmission.patientProfile.dateOfBirth).getFullYear()) : "---",
                                    patientGender: selectedAdmission?.patientProfile?.gender === "MALE" ? "Nam" : "Nữ",
                                    diagnosis: selectedAdmission?.initialDiagnosis || "Điều trị nội trú",
                                    dischargeSummary: dischargeData.dischargeSummary,
                                    doctorRecommendation: dischargeData.doctorRecommendation,
                                    reExamDate: dischargeData.reExaminationDate,
                                    doctorName: selectedAdmission?.treatingDoctor?.fullName || "Bác sĩ điều trị",
                                    dischargeDate: dischargeResult.dischargeDate
                                })}
                                sx={{ mt: 1, fontWeight: "bold", textTransform: "none" }}
                            >
                                In Giấy Ra Viện (TT 56/2017/TT-BYT)
                            </Button>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Tóm tắt tình trạng người bệnh lúc ra viện"
                                    value={dischargeData.dischargeSummary}
                                    onChange={(e) => setDischargeData({ ...dischargeData, dischargeSummary: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Lời dặn của Bác sĩ điều trị & Chế độ ăn uống sinh hoạt"
                                    value={dischargeData.doctorRecommendation}
                                    onChange={(e) => setDischargeData({ ...dischargeData, doctorRecommendation: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Lịch hẹn tái khám"
                                    value={dischargeData.reExaminationDate}
                                    onChange={(e) => setDischargeData({ ...dischargeData, reExaminationDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDischargeModal(false)}>
                        {dischargeResult ? "Đóng" : "Hủy"}
                    </Button>
                    {!dischargeResult && (
                        <Button variant="contained" color="error" onClick={handleSaveDischarge} disabled={submittingDischarge}>
                            {submittingDischarge ? "Đang xử lý..." : "Xác Nhận Xuất Viện"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* ======================================================= */}
            {/* MODAL: TIẾP NHẬN BỆNH NHÂN VÀO GIƯỜNG BỆNH TRỐNG       */}
            {/* ======================================================= */}
            <Dialog open={openAdmitModal} onClose={() => setOpenAdmitModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3.5, overflow: "hidden" } }}>
                <DialogTitle fontWeight="bold" sx={{ color: "#0284c7", display: "flex", alignItems: "center", gap: 1 }}>
                    <HotelIcon color="primary" /> Tiếp Nhận Người Bệnh Vào Buồng Giường
                </DialogTitle>
                <DialogContent dividers>
                    {/* Banner hiển thị buồng & giường đang chọn */}
                    {(() => {
                        const targetRoom = allRooms.find(r => r.roomId === Number(admitForm.roomId));
                        return (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.5,
                                    mb: 2,
                                    borderRadius: 2,
                                    bgcolor: "#f0fdf4",
                                    border: "1.5px solid #86efac",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between"
                                }}
                            >
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#15803d">
                                        🏥 Vị trí xếp: {targetRoom?.roomNumber || `Phòng ${admitForm.roomId}`} - Giường số {admitForm.selectedBedIndex || 1}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Khoa: <b>{targetRoom?.departmentName || "Khoa Lâm Sàng"}</b> • Loại buồng: {targetRoom?.roomType === "ICU" ? "Hồi Sức Cấp Cứu (ICU)" : "Điều Trị Tiêu Chuẩn"}
                                    </Typography>
                                </Box>
                                <Chip
                                    label={`Giường ${admitForm.selectedBedIndex || 1}`}
                                    color="success"
                                    size="small"
                                    sx={{ fontWeight: "bold" }}
                                />
                            </Paper>
                        );
                    })()}

                    <Grid container spacing={2} mt={0.5}>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="Chọn hồ sơ bệnh nhân tiếp nhận"
                                value={admitForm.patientProfileId}
                                onChange={(e) => setAdmitForm({ ...admitForm, patientProfileId: e.target.value })}
                                required
                                SelectProps={{
                                    MenuProps: {
                                        PaperProps: {
                                            style: { maxHeight: 320 }
                                        }
                                    }
                                }}
                            >
                                {profiles.map((p) => (
                                    <MenuItem key={p.patientProfileId} value={p.patientProfileId}>
                                        <b>{p.fullName}</b> - {p.gender === "MALE" ? "Nam" : "Nữ"} - SĐT: {p.phoneNumber || "---"} {p.identityNumber ? `(CCCD: ${p.identityNumber})` : ""}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                select
                                fullWidth
                                label="Bác sĩ phụ trách điều trị"
                                value={admitForm.doctorId}
                                onChange={(e) => setAdmitForm({ ...admitForm, doctorId: e.target.value })}
                            >
                                {doctors.map((doc) => (
                                    <MenuItem key={doc.doctorId} value={doc.doctorId}>
                                        {doc.fullName} ({doc.academicTitle || "Bác sĩ"} - {doc.departmentName})
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Chẩn đoán nhập viện & Lý do vào viện"
                                value={admitForm.initialDiagnosis}
                                onChange={(e) => setAdmitForm({ ...admitForm, initialDiagnosis: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenAdmitModal(false)}>Hủy</Button>
                    <Button variant="contained" color="success" onClick={handleSaveAdmit} disabled={submittingAdmit} sx={{ bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" }, fontWeight: "bold" }}>
                        {submittingAdmit ? "Đang tiếp nhận..." : "Xác Nhận Tiếp Nhận"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ======================================================= */}
            {/* MODAL: PHIẾU CHĂM SÓC ĐIỀU DƯỠNG (NURSING CARE SHEET)  */}
            {/* ======================================================= */}
            <Dialog
                open={openNursingCareModal}
                onClose={() => setOpenNursingCareModal(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3.5, overflow: "hidden" } }}
            >
                <DialogTitle sx={{ fontWeight: "bold", bgcolor: "#0D9488", color: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <VolunteerActivismIcon />
                        <span>Phiếu Chăm Sóc Điều Dưỡng (Nursing Care)</span>
                    </Box>
                    {selectedAdmission && (
                        <Chip
                            label={`Hồ sơ: ${selectedAdmission.admissionCode || ""}`}
                            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: "bold" }}
                            size="small"
                        />
                    )}
                </DialogTitle>
                <DialogContent dividers sx={{ maxHeight: "75vh", overflowY: "auto", p: 2.5 }}>
                    {selectedAdmission && (
                        <Box sx={{ mb: 2.5, p: 2, bgcolor: "#F0FDFA", border: "1px solid #99F6E4", borderRadius: 2.5 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                                <Typography variant="subtitle1" fontWeight="900" color="#0F766E">
                                    {selectedAdmission.patientProfile?.fullName}
                                </Typography>
                                <Typography variant="body2" color="#0F766E">
                                    Phòng: <b>{selectedAdmission.room?.roomNumber || "---"}</b> • Giường: <b>{selectedAdmission.bedNumber || "01"}</b> • Khoa: <b>{selectedAdmission.room?.department?.departmentName || "Nội trú"}</b>
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="#475569" display="block" mt={0.5}>
                                Bác sĩ điều trị: <b>{selectedAdmission.treatingDoctor?.fullName || "BS. Trực khoa"}</b> • Chẩn đoán: <i>{selectedAdmission.initialDiagnosis || "Chưa có"}</i>
                            </Typography>
                        </Box>
                    )}

                    {/* Form Ghi nhận chăm sóc mới */}
                    <Paper elevation={0} sx={{ p: 2, mb: 3, border: "1px solid #E2E8F0", borderRadius: 2.5, bgcolor: "#FAFAFA" }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="#0F172A" mb={1.5} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <MonitorHeartIcon fontSize="small" sx={{ color: "#0D9488" }} />
                            Ghi Phiếu Chăm Sóc / Theo Dõi Ca Trực:
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6} sm={2.4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nhiệt độ (°C)"
                                    value={nursingCareForm.temperature}
                                    onChange={(e) => setNursingCareForm({ ...nursingCareForm, temperature: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Huyết áp"
                                    placeholder="120/80"
                                    value={nursingCareForm.bloodPressure}
                                    onChange={(e) => setNursingCareForm({ ...nursingCareForm, bloodPressure: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Mạch (lần/phút)"
                                    value={nursingCareForm.pulse}
                                    onChange={(e) => setNursingCareForm({ ...nursingCareForm, pulse: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nhịp thở (lần/p)"
                                    value={nursingCareForm.respiratoryRate}
                                    onChange={(e) => setNursingCareForm({ ...nursingCareForm, respiratoryRate: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="SpO2 (%)"
                                    value={nursingCareForm.spo2}
                                    onChange={(e) => setNursingCareForm({ ...nursingCareForm, spo2: e.target.value })}
                                />
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <TextField
                                    select
                                    fullWidth
                                    size="small"
                                    label="Cấp độ chăm sóc"
                                    value={nursingCareForm.careLevel}
                                    onChange={(e) => setNursingCareForm({ ...nursingCareForm, careLevel: e.target.value })}
                                >
                                    <MenuItem value="LEVEL_1">Cấp I - Chăm sóc toàn diện</MenuItem>
                                    <MenuItem value="LEVEL_2">Cấp II - Chăm sóc một phần</MenuItem>
                                    <MenuItem value="LEVEL_3">Cấp III - Tự chăm sóc</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Thực hiện y lệnh thuốc & Dịch truyền"
                                    placeholder="Đã tiêm / cho uống thuốc theo y lệnh..."
                                    value={nursingCareForm.medicationAdministered}
                                    onChange={(e) => setNursingCareForm({ ...nursingCareForm, medicationAdministered: e.target.value })}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    multiline
                                    rows={2}
                                    size="small"
                                    label="Diễn biến lâm sàng / Ghi chú điều dưỡng *"
                                    placeholder="Tình trạng người bệnh, ăn uống, ngủ nghỉ, triệu chứng bất thường, xử trí điều dưỡng..."
                                    value={nursingCareForm.nursingNote}
                                    onChange={(e) => setNursingCareForm({ ...nursingCareForm, nursingNote: e.target.value })}
                                />
                            </Grid>

                            <Grid item xs={12} textAlign="right">
                                <Button
                                    variant="contained"
                                    onClick={handleSaveNursingCare}
                                    disabled={submittingNursingCare}
                                    sx={{ bgcolor: "#0D9488", "&:hover": { bgcolor: "#0F766E" }, fontWeight: "bold", borderRadius: 2, px: 3 }}
                                >
                                    {submittingNursingCare ? "Đang lưu..." : "Lưu Phiếu Chăm Sóc"}
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Danh sách các lần chăm sóc trước */}
                    <Typography variant="subtitle2" fontWeight="bold" color="#475569" mb={1}>
                        Lịch Sử Phiếu Chăm Sóc Trước Đó ({nursingCareList.length}):
                    </Typography>
                    {loadingNursingCare ? (
                        <Box textAlign="center" py={3}><CircularProgress size={24} /></Box>
                    ) : nursingCareList.length === 0 ? (
                        <Box textAlign="center" py={3} color="#94A3B8" bgcolor="#F8FAFC" borderRadius={2}>
                            <Typography variant="body2">Chưa có phiếu chăm sóc nào được ghi nhận cho đợt điều trị này.</Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1.5}>
                            {nursingCareList.map((care, idx) => (
                                <Card key={care.careId || idx} elevation={0} sx={{ p: 2, border: "1px solid #E2E8F0", borderRadius: 2 }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="body2" fontWeight="800" color="#0F172A">
                                                {care.nurseName || "Điều dưỡng ca trực"}
                                            </Typography>
                                            <Chip
                                                label={care.careLevel === "LEVEL_1" ? "Cấp I" : care.careLevel === "LEVEL_2" ? "Cấp II" : "Cấp III"}
                                                size="small"
                                                color={care.careLevel === "LEVEL_1" ? "error" : care.careLevel === "LEVEL_2" ? "warning" : "info"}
                                                sx={{ height: 20, fontSize: "0.68rem", fontWeight: "bold" }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="#64748B">
                                            {care.careTime ? formatDateTime(care.careTime) : "Vừa xong"}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" gap={2} mb={1} flexWrap="wrap">
                                        <Typography variant="caption" color="#475569">Nhiệt độ: <b>{care.temperature ? `${care.temperature}°C` : "---"}</b></Typography>
                                        <Typography variant="caption" color="#475569">Huyết áp: <b>{care.bloodPressure || "---"}</b></Typography>
                                        <Typography variant="caption" color="#475569">Mạch: <b>{care.pulse ? `${care.pulse} bpm` : "---"}</b></Typography>
                                        <Typography variant="caption" color="#475569">Nhịp thở: <b>{care.respiratoryRate ? `${care.respiratoryRate} l/p` : "---"}</b></Typography>
                                        <Typography variant="caption" color="#475569">SpO2: <b>{care.spo2 ? `${care.spo2}%` : "---"}</b></Typography>
                                    </Box>
                                    <Typography variant="body2" color="#1E293B" sx={{ bgcolor: "#F8FAFC", p: 1, borderRadius: 1.5, mb: care.medicationAdministered ? 1 : 0 }}>
                                        {care.nursingNote}
                                    </Typography>
                                    {care.medicationAdministered && (
                                        <Typography variant="caption" color="#0F766E" fontWeight="600" display="block">
                                            💊 Thực hiện thuốc: {care.medicationAdministered}
                                        </Typography>
                                    )}
                                </Card>
                            ))}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenNursingCareModal(false)} sx={{ fontWeight: "bold" }}>Đóng</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

