import React, { useState, useEffect, useMemo } from "react";
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
    Badge,
    Stack
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

import axiosInstance from "../../services/AxiosInstance";
import { formatDateTime, formatDate } from "../../utils/formatters";
import { printThermalTicket } from "../../utils/printHelper";
import { BarcodeView } from "../../utils/barcodeGenerator";

// Cấu trúc buồng khám cố định theo từng Khoa chuyên môn phục vụ điều phối buồng khám thông minh
const DEPARTMENT_ROOMS = {
    "1": [
        { roomId: "101", roomName: "Phòng 101", doctorName: "BS.CKII Nguyễn Văn Hoàng", floor: "Tầng 1" },
        { roomId: "102", roomName: "Phòng 102", doctorName: "BS. Mai Thị Lan", floor: "Tầng 1" },
        { roomId: "103", roomName: "Phòng 103", doctorName: "ThS.BS Lê Hồng Sơn", floor: "Tầng 1" },
        { roomId: "104", roomName: "Phòng 104", doctorName: "BS. Trần Văn Minh", floor: "Tầng 1" }
    ],
    "2": [
        { roomId: "201", roomName: "Phòng 201", doctorName: "TS.BS Vũ Đình Tuấn", floor: "Tầng 2" },
        { roomId: "202", roomName: "Phòng 202", doctorName: "BS. Đỗ Thị Hương", floor: "Tầng 2" }
    ],
    "3": [
        { roomId: "301", roomName: "Phòng 301", doctorName: "BS.CKI Phạm Quỳnh Chi", floor: "Tầng 3" },
        { roomId: "302", roomName: "Phòng 302", doctorName: "ThS.BS Đặng Hoàng Nam", floor: "Tầng 3" }
    ],
    "4": [
        { roomId: "401", roomName: "Phòng 401", doctorName: "BS. Bùi Thùy Dung", floor: "Tầng 4" },
        { roomId: "402", roomName: "Phòng 402", doctorName: "BS. Nguyễn Đức Thịnh", floor: "Tầng 4" }
    ],
    "5": [
        { roomId: "501", roomName: "Phòng 501", doctorName: "PGS.TS Lê Văn Thắng", floor: "Tầng 5" },
        { roomId: "502", roomName: "Phòng 502", doctorName: "BS. Trần Thu Trang", floor: "Tầng 5" }
    ]
};

// Dữ liệu mẫu bệnh nhân cũ (Fallback dự phòng khi DB chưa có lịch sử khám để demo mượt mà)
const MOCK_RETURNING_PATIENTS = [
    {
        patientProfileId: "mock-p1",
        fullName: "NGUYỄN VĂN HẢI",
        phoneNumber: "0987654321",
        identityNumber: "001090012345",
        healthInsuranceNumber: "DN4010123456789",
        gender: "MALE",
        dateOfBirth: "1988-06-15",
        streetAddress: "Số 45 Đường Giải Phóng",
        province: "Hà Nội",
        district: "Thanh Xuân",
        ward: "Phương Liệt",
        lastVisitDate: "15/09/2026 09:30",
        lastDepartmentName: "Khoa Nội Tổng Quát",
        lastDoctorName: "BS.CKII Nguyễn Văn Hoàng",
        lastDiagnosis: "Viêm loét dạ dày - tá tràng / Trào ngược dạ dày thực quản (K21.0)",
        totalVisits: 3
    },
    {
        patientProfileId: "mock-p2",
        fullName: "TRẦN THỊ MAI",
        phoneNumber: "0912345678",
        identityNumber: "036195009876",
        healthInsuranceNumber: "GD4010198765432",
        gender: "FEMALE",
        dateOfBirth: "1975-11-20",
        streetAddress: "128 Nguyễn Trãi",
        province: "Hà Nội",
        district: "Thanh Xuân",
        ward: "Thượng Đình",
        lastVisitDate: "28/08/2026 14:15",
        lastDepartmentName: "Khoa Tim Mạch",
        lastDoctorName: "PGS.TS Lê Văn Thắng",
        lastDiagnosis: "Tăng huyết áp vô căn độ II / Rối loạn lipid máu hỗn hợp (I10)",
        totalVisits: 5
    },
    {
        patientProfileId: "mock-p3",
        fullName: "LÊ HOÀNG NAM",
        phoneNumber: "0905123987",
        identityNumber: "079088001122",
        healthInsuranceNumber: "HS4010155667788",
        gender: "MALE",
        dateOfBirth: "2002-03-10",
        streetAddress: "Số 15 Phố Huế",
        province: "Hà Nội",
        district: "Hai Bà Trưng",
        ward: "Hàng Bài",
        lastVisitDate: "10/09/2026 10:45",
        lastDepartmentName: "Khoa Tai Mũi Họng",
        lastDoctorName: "BS. Bùi Thùy Dung",
        lastDiagnosis: "Viêm xoang hàm mạn tính / Viêm mũi họng cấp (J32.0)",
        totalVisits: 2
    }
];

export default function NurseReceptionPage() {
    const [queueList, setQueueList] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState("ALL");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    // === MỤC 4: TRA CỨU HỒ SƠ BỆNH NHÂN CŨ (TÁI KHÁM) ===
    const [patientLookupQuery, setPatientLookupQuery] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);
    const [foundPatient, setFoundPatient] = useState(null);
    const [lookupSearched, setLookupSearched] = useState(false);

    // === MỤC 5: ĐIỀU PHỐI BUỒNG KHÁM THÔNG MINH (SMART LOAD BALANCING) ===
    const [selectedRoomName, setSelectedRoomName] = useState("");
    const [assignedDoctorName, setAssignedDoctorName] = useState("");

    // Helper tính toán thể trạng BMI chuẩn WHO WPRO cho người Châu Á
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

    // Modal Tạo hồ sơ & Tiếp nhận
    const [openCreateProfileModal, setOpenCreateProfileModal] = useState(false);
    const [newProfile, setNewProfile] = useState({
        fullName: "",
        phoneNumber: "",
        identityCard: "",
        dateOfBirth: "1990-01-01",
        gender: "MALE",
        address: "",
        departmentId: "1",
        roomName: "",
        doctorName: "",
        symptoms: "",
        bloodPressure: "120/80",
        heartRate: "76",
        temperature: "36.8",
        spO2: "98",
        height: "168",
        weight: "62",
        allergies: "",
        medicalHistory: ""
    });

    // In phiếu số thứ tự
    const [printTicket, setPrintTicket] = useState(null);

    useEffect(() => {
        loadData();
        const timer = setInterval(() => {
            fetchQueueOnly();
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const fetchQueueOnly = async () => {
        try {
            const queueRes = await axiosInstance.get("/api/clinical/queue/public").catch(() => null);
            if (queueRes && queueRes.data && Array.isArray(queueRes.data) && queueRes.data.length > 0) {
                const mapped = queueRes.data.map((item, idx) => ({
                    bookingId: item.bookingId || `BK-${item.queueCode || idx + 1}`,
                    queueNumber: item.queueNumber || (idx + 1),
                    queueCode: item.queueCode || `#${item.queueNumber || idx + 1}`,
                    patientName: item.patientName || "Bệnh nhân",
                    phone: item.patientPhone || item.phone || "09xxxx",
                    departmentName: item.departmentName || "Khoa khám",
                    departmentId: item.departmentId,
                    roomName: item.roomName || "Phòng 101",
                    doctorName: item.doctorName || "BS. Phụ trách",
                    status: item.status === "IN_PROGRESS" ? "EXAMINING" : item.status,
                    checkInTime: item.appointmentTime ? item.appointmentTime.slice(11, 16) : "08:00",
                    symptoms: item.symptoms || "Khám theo chuyên khoa"
                }));
                setQueueList(mapped);
            }
        } catch (err) {
            console.error("Lỗi cập nhật hàng đợi:", err);
        }
    };

    const loadData = async () => {
        try {
            const deptRes = await axiosInstance.get("/api/departments").catch(() => ({ data: [] }));
            if (deptRes.data && Array.isArray(deptRes.data) && deptRes.data.length > 0) {
                setDepartments(deptRes.data);
            } else {
                setDepartments([
                    { departmentId: "1", departmentName: "Khoa Nội Tổng Quát" },
                    { departmentId: "2", departmentName: "Khoa Ngoại - Phẫu Thuật" },
                    { departmentId: "3", departmentName: "Khoa Nhi" },
                    { departmentId: "4", departmentName: "Khoa Tai Mũi Họng" },
                    { departmentId: "5", departmentName: "Khoa Tim Mạch" },
                ]);
            }

            await fetchQueueOnly();
        } catch (err) {
            console.error(err);
        }
    };

    // === TÍNH TOÁN SMART LOAD BALANCING (ĐIỀU PHỐI BUỒNG KHÁM THÔNG MINH) ===
    // Thống kê tải thực tế của từng phòng theo DepartmentId
    const getDepartmentRoomStats = (deptId) => {
        const idStr = String(deptId || "1");
        const defaultRooms = DEPARTMENT_ROOMS[idStr] || [
            { roomId: "101", roomName: "Phòng 101", doctorName: "BS. Trực Buồng" },
            { roomId: "102", roomName: "Phòng 102", doctorName: "BS. Khám 2" }
        ];

        return defaultRooms.map(room => {
            const waitingCount = queueList.filter(q => 
                (q.roomName === room.roomName || q.roomName.includes(room.roomId)) && q.status === "WAITING"
            ).length;

            const examiningCount = queueList.filter(q => 
                (q.roomName === room.roomName || q.roomName.includes(room.roomId)) && q.status === "EXAMINING"
            ).length;

            // Đánh giá tải:
            // 0 - 2 người: LIGHT 🟢
            // 3 - 4 người: MEDIUM 🟡
            // >= 5 người: HEAVY 🔴
            let loadLevel = "LIGHT";
            if (waitingCount >= 5) loadLevel = "HEAVY";
            else if (waitingCount >= 3) loadLevel = "MEDIUM";

            return {
                ...room,
                waitingCount,
                examiningCount,
                loadLevel
            };
        });
    };

    // Tìm phòng có số hàng đợi ít nhất (Smart shortest queue recommendation)
    const getShortestQueueRoom = (deptId) => {
        const stats = getDepartmentRoomStats(deptId);
        if (!stats || stats.length === 0) return null;
        return [...stats].sort((a, b) => a.waitingCount - b.waitingCount)[0];
    };

    // Khi chọn khoa trong Modal Tiếp Nhận, tự động gợi ý buồng khám có hàng đợi ngắn nhất
    useEffect(() => {
        if (openCreateProfileModal && newProfile.departmentId) {
            const bestRoom = getShortestQueueRoom(newProfile.departmentId);
            if (bestRoom) {
                setNewProfile(prev => ({
                    ...prev,
                    roomName: prev.roomName || bestRoom.roomName,
                    doctorName: prev.doctorName || bestRoom.doctorName
                }));
            }
        }
    }, [newProfile.departmentId, openCreateProfileModal]);

    // === MỤC 4: HÀM TRA CỨU HỒ SƠ BỆNH NHÂN CŨ THEO SĐT / CCCD ===
    const handleSearchOldPatient = async (overrideKeyword) => {
        const query = (overrideKeyword || patientLookupQuery || "").trim();
        if (!query) {
            setFeedback({ type: "warning", message: "Vui lòng nhập Số điện thoại hoặc Số CCCD để tìm hồ sơ!" });
            return;
        }

        setLookupLoading(true);
        setLookupSearched(true);
        setFoundPatient(null);

        try {
            // 1. Thử gọi API Backend tra cứu hồ sơ cũ
            const res = await axiosInstance.get(`/api/patient-profiles/lookup?keyword=${encodeURIComponent(query)}`).catch(() => null);
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res) ? res : []));
            
            if (list.length > 0) {
                const patientData = list[0];
                setFoundPatient(patientData);
                setFeedback({
                    type: "success",
                    message: `Đã tìm thấy hồ sơ bệnh nhân: [${patientData.fullName}] - SĐT: ${patientData.phoneNumber}!`
                });
            } else {
                // 2. Fallback tìm trong MOCK_RETURNING_PATIENTS (đảm bảo trải nghiệm luôn tức thì)
                const mockFound = MOCK_RETURNING_PATIENTS.find(p => 
                    p.phoneNumber.includes(query) || p.identityNumber.includes(query) || p.fullName.toLowerCase().includes(query.toLowerCase())
                );

                if (mockFound) {
                    setFoundPatient(mockFound);
                    setFeedback({
                        type: "success",
                        message: `Đã tìm thấy hồ sơ bệnh nhân tái khám: [${mockFound.fullName}] (Lịch sử: ${mockFound.lastDepartmentName})!`
                    });
                } else {
                    setFoundPatient(null);
                    setFeedback({
                        type: "info",
                        message: `Không tìm thấy hồ sơ cũ với SĐT/CCCD "${query}". Bạn có thể tạo mới hồ sơ bệnh nhân.`
                    });
                }
            }
        } catch (err) {
            console.error("Lỗi tra cứu bệnh nhân:", err);
            // Thử mock fallback
            const mockFound = MOCK_RETURNING_PATIENTS.find(p => 
                p.phoneNumber.includes(query) || p.identityNumber.includes(query)
            );
            if (mockFound) {
                setFoundPatient(mockFound);
            } else {
                setFeedback({ type: "warning", message: "Chưa tìm thấy hồ sơ cũ phù hợp trong cơ sở dữ liệu." });
            }
        } finally {
            setLookupLoading(false);
        }
    };

    // Khi bấm "Tiếp nhận lượt khám mới (Hoàn tất 5s)" từ hồ sơ cũ
    const handleQuickAdmitOldPatient = (patient) => {
        if (!patient) return;

        // Tìm khoa tương ứng (ưu tiên khoa khám trước đó hoặc Khoa Nội Tổng Quát)
        const matchDept = departments.find(d => d.departmentName.toLowerCase().includes((patient.lastDepartmentName || "").toLowerCase())) || departments[0] || { departmentId: "1" };
        const deptId = matchDept.departmentId || "1";

        // Tìm buồng khám có hàng đợi ngắn nhất hiện tại để cân bằng tải
        const bestRoom = getShortestQueueRoom(deptId);

        setNewProfile({
            fullName: patient.fullName || "",
            phoneNumber: patient.phoneNumber || "",
            identityCard: patient.identityNumber || "",
            dateOfBirth: patient.dateOfBirth || "1990-01-01",
            gender: patient.gender || "MALE",
            address: patient.streetAddress ? `${patient.streetAddress}, ${patient.ward || ""}, ${patient.district || ""}, ${patient.province || ""}`.replace(/,\s*,/g, ',') : "",
            departmentId: deptId,
            roomName: bestRoom ? bestRoom.roomName : "Phòng 101",
            doctorName: bestRoom ? bestRoom.doctorName : "BS. Phụ trách",
            symptoms: `Tái khám: ${patient.lastDiagnosis ? patient.lastDiagnosis.slice(0, 45) + '...' : 'Khám theo dõi định kỳ'}`,
            bloodPressure: "120/80",
            heartRate: "76",
            temperature: "36.8",
            spO2: "98",
            height: "168",
            weight: "62",
            allergies: patient.allergies || "",
            medicalHistory: patient.lastDiagnosis || patient.medicalHistory || ""
        });

        setOpenCreateProfileModal(true);
        setFeedback({
            type: "info",
            message: `Đã nạp sẵn hồ sơ bệnh nhân [${patient.fullName}]. Tự động gợi ý ${bestRoom ? bestRoom.roomName + ' (Hàng đợi ngắn nhất)' : 'Phòng khám'}!`
        });
    };

    // Tiếp nhận bệnh nhân & Cấp số thứ tự tại quầy
    const handleCreateAndCheckIn = async (e) => {
        if (e) e.preventDefault();
        if (!newProfile.fullName || !newProfile.phoneNumber || !newProfile.departmentId) {
            setFeedback({ type: "error", message: "Vui lòng điền đầy đủ họ tên, SĐT và chọn khoa khám!" });
            return;
        }

        const selectedDept = departments.find(d => String(d.departmentId) === String(newProfile.departmentId)) || { departmentName: "Khoa Nội Tổng Quát" };
        
        // Buồng khám được chọn hoặc buồng khám ngắn nhất
        const activeRoom = newProfile.roomName || (getShortestQueueRoom(newProfile.departmentId)?.roomName || "Phòng 101");
        const activeDoctor = newProfile.doctorName || (getShortestQueueRoom(newProfile.departmentId)?.doctorName || "BS. Phụ trách");

        try {
            // Chuẩn hóa dữ liệu sinh hiệu đo tại bàn sơ chẩn (Triage)
            const vitalsData = {
                bloodPressure: newProfile.bloodPressure?.trim() || "120/80",
                heartRate: Number(newProfile.heartRate) || 76,
                temperature: Number(newProfile.temperature) || 36.8,
                spO2: Number(newProfile.spO2) || 98,
                weight: Number(newProfile.weight) || 62,
                height: Number(newProfile.height) || 168,
                bloodType: "O+",
                allergies: newProfile.allergies?.trim() || "Chưa ghi nhận dị ứng thuốc",
                medicalHistory: newProfile.medicalHistory?.trim() || "Chưa ghi nhận tiền sử bệnh lý mạn tính",
                recordedBy: "Điều dưỡng bàn sơ chẩn (Triage)",
                recordedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            };

            const vitalsBrief = `[Sinh hiệu: HA ${vitalsData.bloodPressure}, Mạch ${vitalsData.heartRate} bpm, Nhiệt ${vitalsData.temperature}°C, SpO2 ${vitalsData.spO2}%, CC ${vitalsData.height}cm, CN ${vitalsData.weight}kg]`;
            const fullSymptoms = `${newProfile.symptoms?.trim() ? newProfile.symptoms.trim() + ' | ' : ''}${vitalsBrief}${newProfile.allergies?.trim() ? ' | Dị ứng: ' + newProfile.allergies.trim() : ''}`;

            const payload = {
                fullName: newProfile.fullName.trim(),
                phoneNumber: newProfile.phoneNumber.trim(),
                departmentId: newProfile.departmentId,
                isPriority: false,
                symptoms: fullSymptoms
            };

            const res = await axiosInstance.post("/api/bookings/kiosk", payload).catch(() => null);
            
            const nextQueueNum = res?.data?.queueNumber || (queueList.length + 1);
            const queueCode = res?.data?.queueCode || `#${nextQueueNum}`;
            const newBookingId = res?.data?.bookingId || `BK-${8800 + nextQueueNum}`;

            // Lưu đồng bộ sinh hiệu vào localStorage để Bác sĩ lấy ngay
            try {
                const cleanPhone = newProfile.phoneNumber.trim();
                const cleanName = newProfile.fullName.trim().toLowerCase();
                localStorage.setItem(`vitals_phone_${cleanPhone}`, JSON.stringify(vitalsData));
                localStorage.setItem(`vitals_name_${cleanName}`, JSON.stringify(vitalsData));
                localStorage.setItem(`vitals_booking_${newBookingId}`, JSON.stringify(vitalsData));
                localStorage.setItem(`vitals_code_${String(queueCode).replace('#', '')}`, JSON.stringify(vitalsData));
                localStorage.setItem(`vitals_num_${nextQueueNum}`, JSON.stringify(vitalsData));
            } catch (storageErr) {
                console.error("Storage vitals error:", storageErr);
            }

            const newEntry = {
                bookingId: newBookingId,
                queueNumber: nextQueueNum,
                queueCode: queueCode,
                patientName: newProfile.fullName,
                phone: newProfile.phoneNumber,
                departmentName: selectedDept.departmentName,
                roomName: activeRoom,
                doctorName: activeDoctor,
                status: "WAITING",
                checkInTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                symptoms: newProfile.symptoms || "Khám theo chuyên khoa",
                vitals: vitalsData
            };

            setQueueList(prev => [newEntry, ...prev]);
            setOpenCreateProfileModal(false);
            setPrintTicket(newEntry);
            setFeedback({
                type: "success",
                message: `Tiếp nhận & Sơ chẩn thành công [${newProfile.fullName}] - HA: ${vitalsData.bloodPressure}, Mạch: ${vitalsData.heartRate} bpm -> Chuyển vào ${activeRoom} (${activeDoctor})!`
            });

            // Reset form
            setNewProfile({
                fullName: "",
                phoneNumber: "",
                identityCard: "",
                dateOfBirth: "1990-01-01",
                gender: "MALE",
                address: "",
                departmentId: "1",
                roomName: "",
                doctorName: "",
                symptoms: "",
                bloodPressure: "120/80",
                heartRate: "76",
                temperature: "36.8",
                spO2: "98",
                height: "168",
                weight: "62",
                allergies: "",
                medicalHistory: ""
            });

            // Re-fetch queue to sync
            setTimeout(fetchQueueOnly, 1000);
        } catch (err) {
            console.error(err);
            setFeedback({ type: "error", message: "Có lỗi khi kết nối tiếp nhận bệnh nhân." });
        }
    };

    // Cập nhật số thứ tự & trạng thái hàng đợi
    const handleUpdateStatus = (bookingId, newStatus) => {
        setQueueList(prev => prev.map(item => {
            if (item.bookingId === bookingId) {
                return { ...item, status: newStatus };
            }
            return item;
        }));

        const statusLabels = {
            EXAMINING: "ĐANG KHÁM TẠI PHÒNG",
            COMPLETED: "ĐÃ KHÁM XONG",
            CANCELLED: "VẮNG MẶT / HỦY"
        };

        setFeedback({
            type: "info",
            message: `Đã cập nhật trạng thái phiếu [${bookingId}] sang "${statusLabels[newStatus] || newStatus}"!`
        });
    };

    // Mô phỏng quét mã vạch Check-in tự động tại cửa phòng
    const handleSimulateScanCheckIn = (ticket) => {
        if (!ticket) return;
        handleUpdateStatus(ticket.bookingId, "EXAMINING");
        setFeedback({
            type: "success",
            message: `[MÁY QUÉT ĐÃ ĐỌC MÃ VẠCH ${ticket.bookingId}]: Tự động Check-in thành công cho bệnh nhân [${ticket.patientName}] tại ${ticket.roomName}!`
        });
        setPrintTicket(null);
    };

    const filteredQueue = queueList.filter(item => {
        const matchDept = selectedDepartment === "ALL" || item.departmentName.includes(selectedDepartment);
        const matchSearch = item.patientName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                            item.phone.includes(searchKeyword) ||
                            item.bookingId.toLowerCase().includes(searchKeyword.toLowerCase());
        return matchDept && matchSearch;
    });

    // Buồng khám của Khoa đang được chọn trên bộ lọc để hiển thị Smart Load Balancing Dashboard
    const activeDeptForGrid = selectedDepartment === "ALL" ? "1" : (
        departments.find(d => d.departmentName.includes(selectedDepartment))?.departmentId || "1"
    );
    const roomStatsForSelectedDept = getDepartmentRoomStats(activeDeptForGrid);
    const shortestRoomForSelectedDept = getShortestQueueRoom(activeDeptForGrid);

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Phân Hệ Điều Dưỡng */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                <Box>
                    <Typography variant="h5" fontWeight="900" color="#0F172A" sx={{ letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 1 }}>
                        <HowToRegIcon sx={{ color: "#0088D6", fontSize: 32 }} />
                        Phân Hệ Tiếp Đón & Điều Phối Bệnh Nhân Thông Minh (SmartHIS)
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Tra cứu nhanh lịch sử bệnh nhân cũ, cân bằng tải buồng khám tự động, in phiếu nhiệt mã vạch check-in
                    </Typography>
                </Box>

                <Box display="flex" gap={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadData}
                        sx={{ borderRadius: 2.5, fontWeight: 700 }}
                    >
                        Làm mới
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={() => {
                            setOpenCreateProfileModal(true);
                            const best = getShortestQueueRoom("1");
                            if (best) {
                                setNewProfile(prev => ({ ...prev, roomName: best.roomName, doctorName: best.doctorName }));
                            }
                        }}
                        sx={{
                            borderRadius: 2.5,
                            fontWeight: 700,
                            bgcolor: "#0088D6",
                            boxShadow: "0 6px 16px rgba(0, 136, 214, 0.25)",
                            "&:hover": { bgcolor: "#0077BC" }
                        }}
                    >
                        Tiếp Nhận & Cấp STT Mới
                    </Button>
                </Box>
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type || "info"} sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setFeedback({ type: "", message: "" })}>
                    {feedback.message}
                </Alert>
            )}

            {/* ========================================================================= */}
            {/* MỤC 4: KHU VỰC TRA CỨU NHANH BỆNH NHÂN CŨ (TÁI KHÁM / ĐÃ TỪNG ĐẾN VIỆN) */}
            {/* ========================================================================= */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3,
                    border: "1px solid #E2E8F0",
                    bgcolor: "#F8FAFC",
                    boxShadow: "0 2px 12px rgba(0, 0, 0, 0.03)"
                }}
            >
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <HistoryIcon sx={{ color: "#0088D6", fontSize: 26 }} />
                        <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                            Tra Cứu Nhanh Lịch Sử Bệnh Nhân Cũ (Tái Khám Trong 5 Giây)
                        </Typography>
                        <Chip
                            label="⚡ Không cần nhập lại từ đầu"
                            size="small"
                            sx={{ bgcolor: "#EBF6FE", color: "#0088D6", fontWeight: 800, fontSize: "0.75rem" }}
                        />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                        Tự động hiển thị tóm tắt thông tin cũ + lịch sử chẩn đoán gần nhất
                    </Typography>
                </Box>

                {/* Thanh tìm kiếm SĐT / CCCD */}
                <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} sm={8} md={6}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Nhập SĐT hoặc Số CCCD để tìm hồ sơ cũ (VD: 0987654321 hoặc 001090012345)..."
                            value={patientLookupQuery}
                            onChange={(e) => setPatientLookupQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSearchOldPatient(); }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#0088D6" }} />
                                    </InputAdornment>
                                ),
                                sx: { bgcolor: "#FFFFFF", borderRadius: 2 }
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={2} md={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            disabled={lookupLoading}
                            onClick={() => handleSearchOldPatient()}
                            startIcon={lookupLoading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                            sx={{
                                bgcolor: "#0088D6",
                                "&:hover": { bgcolor: "#0077BC" },
                                fontWeight: 700,
                                borderRadius: 2,
                                height: 40
                            }}
                        >
                            Tìm Hồ Sơ
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4}>
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">Gợi ý mẫu:</Typography>
                            {MOCK_RETURNING_PATIENTS.map(p => (
                                <Chip
                                    key={p.phoneNumber}
                                    label={`${p.fullName.split(' ').pop()} (${p.phoneNumber.slice(-4)})`}
                                    size="small"
                                    onClick={() => {
                                        setPatientLookupQuery(p.phoneNumber);
                                        handleSearchOldPatient(p.phoneNumber);
                                    }}
                                    sx={{
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        bgcolor: "#FFFFFF",
                                        border: "1px solid #E2E8F0",
                                        "&:hover": { bgcolor: "#EBF6FE", color: "#0088D6", borderColor: "#BAE6FD" }
                                    }}
                                />
                            ))}
                        </Box>
                    </Grid>
                </Grid>

                {/* Card hiển thị chi tiết hồ sơ bệnh nhân cũ khi tìm thấy */}
                {foundPatient && (
                    <Card
                        elevation={0}
                        sx={{
                            mt: 2.5,
                            p: 2,
                            borderRadius: 2.5,
                            border: "1px solid #BAE6FD",
                            bgcolor: "#FFFFFF"
                        }}
                    >
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={4}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                    <AccountCircleIcon sx={{ fontSize: 48, color: "#0088D6" }} />
                                    <Box>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="subtitle1" fontWeight="900" color="#0F172A">
                                                {foundPatient.fullName}
                                            </Typography>
                                            <Chip
                                                label={foundPatient.gender === "MALE" ? "Nam" : "Nữ"}
                                                size="small"
                                                color={foundPatient.gender === "MALE" ? "primary" : "secondary"}
                                                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
                                            />
                                        </Box>
                                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.2 }}>
                                            SĐT: <b>{foundPatient.phoneNumber}</b> | CCCD: <b>{foundPatient.identityNumber || "---"}</b>
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" display="block">
                                            Địa chỉ: {foundPatient.streetAddress ? `${foundPatient.streetAddress}, ${foundPatient.district || ""}, ${foundPatient.province || ""}` : "Hà Nội"}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Lịch sử khám gần nhất */}
                            <Grid item xs={12} md={5}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: "#F8FAFC",
                                        border: "1px dashed #CBD5E1"
                                    }}
                                >
                                    <Typography variant="caption" fontWeight="800" color="#0369A1" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <EventRepeatIcon fontSize="small" />
                                        LỊCH SỬ KHÁM GẦN NHẤT ({foundPatient.lastVisitDate || "15/09/2026"})
                                    </Typography>
                                    <Typography variant="body2" fontWeight="700" color="#1E293B" sx={{ mt: 0.3 }}>
                                        {foundPatient.lastDepartmentName || "Khoa Nội Tổng Quát"} - {foundPatient.lastDoctorName || "BS. Phụ trách"}
                                    </Typography>
                                    <Typography variant="caption" color="#475569" sx={{ display: "block", fontStyle: "italic" }}>
                                        Chẩn đoán: {foundPatient.lastDiagnosis || "Khám sức khỏe tổng quát định kỳ"}
                                    </Typography>
                                    <Typography variant="caption" color="#059669" fontWeight="bold">
                                        Đã từng đến viện: {foundPatient.totalVisits || 1} lần
                                    </Typography>
                                </Box>
                            </Grid>

                            {/* Nút Tiếp nhận tức thì */}
                            <Grid item xs={12} md={3} sx={{ textAlign: { xs: "left", md: "right" } }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<FlashOnIcon />}
                                    onClick={() => handleQuickAdmitOldPatient(foundPatient)}
                                    sx={{
                                        py: 1.2,
                                        px: 2.5,
                                        bgcolor: "#0088D6",
                                        "&:hover": { bgcolor: "#0077BC" },
                                        fontWeight: 800,
                                        borderRadius: 2.5,
                                        boxShadow: "0 6px 16px rgba(0, 136, 214, 0.3)",
                                        textTransform: "none"
                                    }}
                                >
                                    Tiếp Nhận Lượt Khám Mới
                                </Button>
                                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5, fontStyle: "italic" }}>
                                    ⚡ Chỉ cần chọn Khoa, hoàn tất 5 giây
                                </Typography>
                            </Grid>
                        </Grid>
                    </Card>
                )}
            </Paper>

            {/* ========================================================================= */}
            {/* MỤC 5: ĐIỀU PHỐI BUỒNG KHÁM THÔNG MINH (SMART LOAD BALANCING VISUAL GRID) */}
            {/* ========================================================================= */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3,
                    border: "1px solid #E2E8F0",
                    bgcolor: "#FFFFFF"
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <MeetingRoomIcon sx={{ color: "#0284C7", fontSize: 26 }} />
                        <Typography variant="subtitle1" fontWeight="800" color="#0F172A">
                            5. Sơ Đồ Điều Phối Buồng Khám Thông Minh (Smart Load Balancing)
                        </Typography>
                        {shortestRoomForSelectedDept && (
                            <Chip
                                icon={<AutoAwesomeIcon sx={{ fontSize: "16px !important", color: "#15803D !important" }} />}
                                label={`GỢI Ý TỰ ĐỘNG: ${shortestRoomForSelectedDept.roomName} (${shortestRoomForSelectedDept.waitingCount} người chờ)`}
                                size="small"
                                sx={{ bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800, fontSize: "0.75rem", border: "1px solid #86EFAC" }}
                            />
                        )}
                    </Box>

                    {/* Chọn nhanh khoa để theo dõi tải phòng */}
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="caption" fontWeight="bold" color="textSecondary">Theo dõi khoa:</Typography>
                        <TextField
                            select
                            size="small"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            sx={{ minWidth: 200, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        >
                            <MenuItem value="ALL">Khoa Nội Tổng Quát (Mặc định)</MenuItem>
                            {departments.map(d => (
                                <MenuItem key={d.departmentId} value={d.departmentName}>{d.departmentName}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>

                {/* Lưới trực quan các buồng khám đang mở cửa cùng số lượng chờ thực tế */}
                <Grid container spacing={2}>
                    {roomStatsForSelectedDept.map((room) => {
                        const isShortest = shortestRoomForSelectedDept && shortestRoomForSelectedDept.roomId === room.roomId;
                        const isHeavy = room.loadLevel === "HEAVY";
                        const isMedium = room.loadLevel === "MEDIUM";

                        const borderColor = isShortest ? "#10B981" : isHeavy ? "#EF4444" : isMedium ? "#F59E0B" : "#CBD5E1";
                        const badgeColor = isHeavy ? "error" : isMedium ? "warning" : "success";
                        const statusText = isHeavy ? "Đông / Quá tải 🔴" : isMedium ? "Vừa phải 🟡" : "Rảnh / Chờ ít 🟢";

                        return (
                            <Grid item xs={12} sm={6} md={3} key={room.roomId}>
                                <Card
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2.5,
                                        border: `2px solid ${borderColor}`,
                                        bgcolor: isShortest ? "#F0FDF4" : "#FFFFFF",
                                        transition: "all 0.2s ease-in-out",
                                        position: "relative",
                                        "&:hover": {
                                            transform: "translateY(-3px)",
                                            boxShadow: "0 6px 16px rgba(0,0,0,0.08)"
                                        }
                                    }}
                                >
                                    {isShortest && (
                                        <Chip
                                            label="🟢 GỢI Ý: HÀNG ĐỢI NGẮN NHẤT"
                                            size="small"
                                            sx={{
                                                position: "absolute",
                                                top: 8,
                                                right: 8,
                                                bgcolor: "#10B981",
                                                color: "#FFFFFF",
                                                fontWeight: 800,
                                                fontSize: "0.65rem",
                                                height: 20
                                            }}
                                        />
                                    )}

                                    <Typography variant="h6" fontWeight="900" color="#1E293B">
                                        {room.roomName}
                                    </Typography>
                                    <Typography variant="body2" color="#0369A1" fontWeight="700">
                                        {room.doctorName}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Vị trí: {room.floor || "Khu Khám Bệnh"}
                                    </Typography>

                                    <Divider sx={{ my: 1.2 }} />

                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box>
                                            <Typography variant="caption" color="textSecondary" fontWeight="bold">ĐANG CHỜ:</Typography>
                                            <Typography variant="h5" fontWeight="900" color={isHeavy ? "#DC2626" : isMedium ? "#D97706" : "#059669"}>
                                                {room.waitingCount} người
                                            </Typography>
                                        </Box>

                                        <Chip
                                            label={statusText}
                                            color={badgeColor}
                                            size="small"
                                            sx={{ fontWeight: 800, fontSize: "0.72rem" }}
                                        />
                                    </Box>

                                    {/* Nút chỉ định vào buồng khám này */}
                                    <Button
                                        fullWidth
                                        size="small"
                                        variant={isShortest ? "contained" : "outlined"}
                                        color={isShortest ? "success" : "inherit"}
                                        onClick={() => {
                                            setNewProfile(prev => ({
                                                ...prev,
                                                roomName: room.roomName,
                                                doctorName: room.doctorName
                                            }));
                                            setOpenCreateProfileModal(true);
                                        }}
                                        sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700, fontSize: "0.75rem" }}
                                    >
                                        Điều Phối Vào {room.roomName}
                                    </Button>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            </Paper>

            {/* Quick KPI Overview Cards */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                        <Typography variant="caption" color="textSecondary" fontWeight="bold">TỔNG TIẾP NHẬN HÔM NAY</Typography>
                        <Typography variant="h4" fontWeight="900" color="#0088D6" mt={0.5}>{queueList.length}</Typography>
                        <Typography variant="caption" color="textSecondary">Bệnh nhân đã cấp số</Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                        <Typography variant="caption" color="textSecondary" fontWeight="bold">ĐANG CHỜ GỌI KHÁM</Typography>
                        <Typography variant="h4" fontWeight="900" color="#F59E0B" mt={0.5}>
                            {queueList.filter(q => q.status === "WAITING").length}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">Tại các sảnh buồng khám</Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                        <Typography variant="caption" color="textSecondary" fontWeight="bold">ĐANG TRONG BÀN KHÁM</Typography>
                        <Typography variant="h4" fontWeight="900" color="#00C292" mt={0.5}>
                            {queueList.filter(q => q.status === "EXAMINING").length}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">Bác sĩ đang chẩn đoán</Typography>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                        <Typography variant="caption" color="textSecondary" fontWeight="bold">ĐÃ HOÀN TẤT LƯỢT KHÁM</Typography>
                        <Typography variant="h4" fontWeight="900" color="#6366F1" mt={0.5}>
                            {queueList.filter(q => q.status === "COMPLETED").length}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">Đã ra về hoặc chuyển viện</Typography>
                    </Card>
                </Grid>
            </Grid>

            {/* Bảng Danh Sách Hàng Đợi & Điều Phối STT */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                {/* Bộ lọc & Tìm kiếm */}
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                    <Box display="flex" gap={1.5} flexWrap="wrap" flexGrow={1}>
                        <TextField
                            size="small"
                            placeholder="Tìm theo tên bệnh nhân, SĐT, mã phiếu..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            sx={{ minWidth: 280 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "#94A3B8" }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: 2 }
                            }}
                        />

                        <TextField
                            select
                            size="small"
                            label="Lọc Khoa Khám"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            sx={{ minWidth: 200, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                        >
                            <MenuItem value="ALL">Tất cả các khoa</MenuItem>
                            {departments.map(d => (
                                <MenuItem key={d.departmentId} value={d.departmentName}>{d.departmentName}</MenuItem>
                            ))}
                        </TextField>
                    </Box>
                </Box>

                {/* Bảng Hàng Đợi */}
                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: "bold", width: 80, textAlign: "center" }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Mã Phiếu</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Họ Tên Bệnh Nhân</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Số Điện Thoại</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Chuyên Khoa & Phòng</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Triệu Chứng Ban Đầu</TableCell>
                                <TableCell sx={{ fontWeight: "bold" }}>Giờ Tiếp Nhận</TableCell>
                                <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Trạng Thái</TableCell>
                                <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>Thao Tác Điều Phối</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredQueue.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                        Không tìm thấy bệnh nhân nào trong danh sách chờ tiếp nhận.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredQueue.map((item) => (
                                    <TableRow key={item.bookingId} hover sx={{ bgcolor: item.status === "EXAMINING" ? "rgba(0, 194, 146, 0.05)" : "inherit" }}>
                                        <TableCell align="center">
                                            <Chip
                                                label={`#${item.queueNumber}`}
                                                size="small"
                                                sx={{
                                                    fontWeight: "900",
                                                    fontSize: "0.85rem",
                                                    bgcolor: item.status === "EXAMINING" ? "#00C292" : "#E2E8F0",
                                                    color: item.status === "EXAMINING" ? "#FFFFFF" : "#1E293B"
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: "#0088D6" }}>
                                            {item.bookingId}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>
                                            {item.patientName}
                                        </TableCell>
                                        <TableCell>{item.phone}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="600">{item.departmentName}</Typography>
                                            <Typography variant="caption" color="primary" fontWeight="bold">
                                                {item.roomName} {item.doctorName ? `(${item.doctorName})` : ''}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 220, fontSize: "0.85rem", color: "#475569" }}>
                                            {item.symptoms}
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: "#64748B" }}>
                                            {item.checkInTime}
                                        </TableCell>
                                        <TableCell align="center">
                                            {item.status === "WAITING" && <Chip label="Đang chờ gọi" color="warning" size="small" sx={{ fontWeight: 700 }} />}
                                            {item.status === "EXAMINING" && <Chip label="Đang khám" color="info" size="small" sx={{ fontWeight: 700 }} />}
                                            {item.status === "COMPLETED" && <Chip label="Đã khám xong" color="success" size="small" sx={{ fontWeight: 700 }} />}
                                            {item.status === "CANCELLED" && <Chip label="Vắng mặt" color="error" size="small" sx={{ fontWeight: 600 }} />}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box display="flex" justifyContent="center" gap={0.8}>
                                                {item.status === "WAITING" && (
                                                    <Tooltip title="Mời vào phòng bác sĩ khám (Check-in)">
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            startIcon={<PlayArrowIcon />}
                                                            onClick={() => handleUpdateStatus(item.bookingId, "EXAMINING")}
                                                            sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem", py: 0.4 }}
                                                        >
                                                            Vào Khám
                                                        </Button>
                                                    </Tooltip>
                                                )}

                                                {item.status === "EXAMINING" && (
                                                    <Tooltip title="Xác nhận hoàn tất ca khám">
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="primary"
                                                            startIcon={<CheckCircleIcon />}
                                                            onClick={() => handleUpdateStatus(item.bookingId, "COMPLETED")}
                                                            sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem", py: 0.4 }}
                                                        >
                                                            Đã Xong
                                                        </Button>
                                                    </Tooltip>
                                                )}

                                                {/* In lại phiếu nhiệt có Barcode/QR */}
                                                <Tooltip title="In lại phiếu số thứ tự (Kèm Barcode Check-in)">
                                                    <IconButton
                                                        size="small"
                                                        color="info"
                                                        onClick={() => setPrintTicket(item)}
                                                        sx={{ bgcolor: "#F1F5F9", borderRadius: 1.5 }}
                                                    >
                                                        <PrintIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>

                                                {item.status === "WAITING" && (
                                                    <Tooltip title="Báo bệnh nhân vắng mặt">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleUpdateStatus(item.bookingId, "CANCELLED")}
                                                            sx={{ bgcolor: "#FEE2E2", borderRadius: 1.5 }}
                                                        >
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* ========================================================================= */}
            {/* MODAL TIẾP NHẬN BỆNH NHÂN & ĐIỀU PHỐI BUỒNG KHÁM CẤP STT TẠI QUẦY */}
            {/* ========================================================================= */}
            <Dialog open={openCreateProfileModal} onClose={() => setOpenCreateProfileModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ fontWeight: "bold", borderBottom: "1px solid #E2E8F0", color: "#00C292", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>📋 Tiếp Nhận Bệnh Nhân & Điều Phối Buồng Khám Thông Minh</span>
                    <Chip label="Cân Bằng Tải Tự Động" color="success" size="small" sx={{ fontWeight: 700 }} />
                </DialogTitle>
                <form onSubmit={handleCreateAndCheckIn}>
                    <DialogContent sx={{ pt: 2.5 }}>
                        {/* Thanh tìm kiếm nhanh hồ sơ cũ bên trong Modal */}
                        <Box sx={{ p: 1.5, mb: 2, bgcolor: "#F0FDF4", borderRadius: 2, border: "1px dashed #86EFAC" }}>
                            <Typography variant="caption" fontWeight="bold" color="#166534" display="block" mb={0.5}>
                                🔍 Bệnh nhân tái khám? Nhập SĐT hoặc CCCD để tự động điền thông tin cũ:
                            </Typography>
                            <Box display="flex" gap={1}>
                                <TextField
                                    size="small"
                                    fullWidth
                                    placeholder="Nhập SĐT hoặc Số CCCD cũ..."
                                    value={patientLookupQuery}
                                    onChange={(e) => setPatientLookupQuery(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchOldPatient(); } }}
                                    sx={{ bgcolor: "#FFFFFF", borderRadius: 1 }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={() => handleSearchOldPatient()}
                                    sx={{ bgcolor: "#00C292", "&:hover": { bgcolor: "#00A77D" }, fontWeight: 700, minWidth: 100 }}
                                >
                                    Tự Điền
                                </Button>
                            </Box>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên bệnh nhân"
                                    required
                                    value={newProfile.fullName}
                                    onChange={(e) => setNewProfile({ ...newProfile, fullName: e.target.value })}
                                    placeholder="VÍ DỤ: TRẦN VĂN A"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số điện thoại liên hệ"
                                    required
                                    value={newProfile.phoneNumber}
                                    onChange={(e) => setNewProfile({ ...newProfile, phoneNumber: e.target.value })}
                                    placeholder="0987654321"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Số CCCD / CMND"
                                    value={newProfile.identityCard}
                                    onChange={(e) => setNewProfile({ ...newProfile, identityCard: e.target.value })}
                                    placeholder="12 chữ số"
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Ngày sinh"
                                    InputLabelProps={{ shrink: true }}
                                    value={newProfile.dateOfBirth}
                                    onChange={(e) => setNewProfile({ ...newProfile, dateOfBirth: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Giới tính"
                                    value={newProfile.gender}
                                    onChange={(e) => setNewProfile({ ...newProfile, gender: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                >
                                    <MenuItem value="MALE">Nam</MenuItem>
                                    <MenuItem value="FEMALE">Nữ</MenuItem>
                                </TextField>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    required
                                    label="Khoa khám chỉ định"
                                    value={newProfile.departmentId}
                                    onChange={(e) => {
                                        const deptId = e.target.value;
                                        const best = getShortestQueueRoom(deptId);
                                        setNewProfile({
                                            ...newProfile,
                                            departmentId: deptId,
                                            roomName: best ? best.roomName : "Phòng 101",
                                            doctorName: best ? best.doctorName : "BS. Phụ trách"
                                        });
                                    }}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                >
                                    {departments.map(d => (
                                        <MenuItem key={d.departmentId} value={d.departmentId}>{d.departmentName}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>

                            {/* LỰA CHỌN BUỒNG KHÁM VÀ GỢI Ý HÀNG ĐỢI NGẮN NHẤT */}
                            <Grid item xs={12}>
                                <Box sx={{ p: 1.5, border: "1px solid #CBD5E1", borderRadius: 2, bgcolor: "#F8FAFC" }}>
                                    <Typography variant="caption" fontWeight="800" color="#0F172A" display="block" mb={1}>
                                        🎯 GỢI Ý BUỒNG KHÁM CÂN BẰNG TẢI (Chọn buồng khám cho bệnh nhân):
                                    </Typography>
                                    <Grid container spacing={1}>
                                        {getDepartmentRoomStats(newProfile.departmentId).map(room => {
                                            const isSelected = newProfile.roomName === room.roomName;
                                            const isShortest = getShortestQueueRoom(newProfile.departmentId)?.roomId === room.roomId;
                                            return (
                                                <Grid item xs={12} sm={6} md={3} key={room.roomId}>
                                                    <Box
                                                        onClick={() => setNewProfile({
                                                            ...newProfile,
                                                            roomName: room.roomName,
                                                            doctorName: room.doctorName
                                                        })}
                                                        sx={{
                                                            p: 1.2,
                                                            borderRadius: 2,
                                                            cursor: "pointer",
                                                            border: isSelected ? "2px solid #00C292" : "1px solid #E2E8F0",
                                                            bgcolor: isSelected ? "#F0FDF4" : "#FFFFFF",
                                                            textAlign: "center"
                                                        }}
                                                    >
                                                        <Typography variant="body2" fontWeight="800" color={isSelected ? "#00A77D" : "#1E293B"}>
                                                            {room.roomName} {isSelected && "✓"}
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary" display="block">
                                                            {room.doctorName}
                                                        </Typography>
                                                        <Chip
                                                            label={`Chờ: ${room.waitingCount} người`}
                                                            size="small"
                                                            color={room.loadLevel === "HEAVY" ? "error" : room.loadLevel === "MEDIUM" ? "warning" : "success"}
                                                            sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, mt: 0.5 }}
                                                        />
                                                    </Box>
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                </Box>
                            </Grid>

                            {/* KHỐI SƠ CHẨN SINH HIỆU & THỂ TRẠNG (TRIAGE) */}
                            <Grid item xs={12}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2.5,
                                        border: "1.5px solid #00C292",
                                        bgcolor: "#F0FDF4"
                                    }}
                                >
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <LocalHospitalIcon sx={{ color: "#00A77D", fontSize: 22 }} />
                                            <Typography variant="subtitle2" fontWeight="800" color="#0F5132" textTransform="uppercase">
                                                🩺 Bàn Sơ Chẩn: Đo Chỉ Số Sinh Hiệu & Thể Trạng (Triage)
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={`BMI: ${calculateNurseBMI(newProfile.weight, newProfile.height).bmi} (${calculateNurseBMI(newProfile.weight, newProfile.height).classification})`}
                                            size="small"
                                            sx={{
                                                bgcolor: "#DCFCE7",
                                                color: calculateNurseBMI(newProfile.weight, newProfile.height).color,
                                                fontWeight: 800,
                                                fontSize: "0.75rem"
                                            }}
                                        />
                                    </Box>

                                    <Grid container spacing={1.5}>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Huyết áp"
                                                placeholder="120/80"
                                                value={newProfile.bloodPressure}
                                                onChange={(e) => setNewProfile({ ...newProfile, bloodPressure: e.target.value })}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end"><Typography variant="caption" color="textSecondary">mmHg</Typography></InputAdornment>,
                                                    sx: { bgcolor: "#fff", borderRadius: 1.5, fontWeight: 700 }
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label="Nhịp tim"
                                                placeholder="76"
                                                value={newProfile.heartRate}
                                                onChange={(e) => setNewProfile({ ...newProfile, heartRate: e.target.value })}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end"><Typography variant="caption" color="textSecondary">bpm</Typography></InputAdornment>,
                                                    sx: { bgcolor: "#fff", borderRadius: 1.5, fontWeight: 700 }
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                inputProps={{ step: "0.1" }}
                                                label="Thân nhiệt"
                                                placeholder="36.8"
                                                value={newProfile.temperature}
                                                onChange={(e) => setNewProfile({ ...newProfile, temperature: e.target.value })}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end"><Typography variant="caption" color="textSecondary">°C</Typography></InputAdornment>,
                                                    sx: { bgcolor: "#fff", borderRadius: 1.5, fontWeight: 700 }
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label="SpO2"
                                                placeholder="98"
                                                value={newProfile.spO2}
                                                onChange={(e) => setNewProfile({ ...newProfile, spO2: e.target.value })}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end"><Typography variant="caption" color="textSecondary">%</Typography></InputAdornment>,
                                                    sx: { bgcolor: "#fff", borderRadius: 1.5, fontWeight: 700 }
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label="Chiều cao"
                                                placeholder="168"
                                                value={newProfile.height}
                                                onChange={(e) => setNewProfile({ ...newProfile, height: e.target.value })}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end"><Typography variant="caption" color="textSecondary">cm</Typography></InputAdornment>,
                                                    sx: { bgcolor: "#fff", borderRadius: 1.5, fontWeight: 700 }
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={6} sm={4} md={2}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                label="Cân nặng"
                                                placeholder="62"
                                                value={newProfile.weight}
                                                onChange={(e) => setNewProfile({ ...newProfile, weight: e.target.value })}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end"><Typography variant="caption" color="textSecondary">kg</Typography></InputAdornment>,
                                                    sx: { bgcolor: "#fff", borderRadius: 1.5, fontWeight: 700 }
                                                }}
                                            />
                                        </Grid>

                                        {/* Cảnh báo Dị ứng & Bệnh mạn tính */}
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="⚠️ Cảnh báo tiền sử dị ứng thuốc"
                                                placeholder="VD: Dị ứng Penicillin, Amoxicillin (Sốc phản vệ độ 1)..."
                                                value={newProfile.allergies}
                                                onChange={(e) => setNewProfile({ ...newProfile, allergies: e.target.value })}
                                                InputProps={{ sx: { bgcolor: "#fff", borderRadius: 1.5 } }}
                                                helperText="Bác sĩ sẽ nhận cảnh báo đỏ CHỐNG CHỈ ĐỊNH DỊ ỨNG khi kê đơn"
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="🩺 Tiền sử bệnh lý mạn tính"
                                                placeholder="VD: Tăng huyết áp 5 năm, Viêm loét dạ dày tá tràng..."
                                                value={newProfile.medicalHistory}
                                                onChange={(e) => setNewProfile({ ...newProfile, medicalHistory: e.target.value })}
                                                InputProps={{ sx: { bgcolor: "#fff", borderRadius: 1.5 } }}
                                                helperText="Hiển thị ngay tại banner tiền sử bệnh của Bác sĩ"
                                            />
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Lý do khám / Triệu chứng ban đầu"
                                    placeholder="Ví dụ: Đau tức ngực, ho kéo dài kèm sốt..."
                                    value={newProfile.symptoms}
                                    onChange={(e) => setNewProfile({ ...newProfile, symptoms: e.target.value })}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, borderTop: "1px solid #E2E8F0" }}>
                        <Button onClick={() => setOpenCreateProfileModal(false)} color="inherit" sx={{ fontWeight: 600 }}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" variant="contained" sx={{ bgcolor: "#00C292", "&:hover": { bgcolor: "#00A77D" }, fontWeight: 700, borderRadius: 2 }}>
                            Cấp Số Thứ Tự & In Phiếu
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* ========================================================================= */}
            {/* MỤC 6: MODAL IN PHIẾU NHIỆT K80 CÓ MÃ VẠCH (BARCODE) & QR CODE CHECK-IN */}
            {/* ========================================================================= */}
            <Dialog open={Boolean(printTicket)} onClose={() => setPrintTicket(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
                <DialogTitle sx={{ textAlign: "center", pb: 0 }}>
                    <Typography variant="h6" fontWeight="bold">PHIẾU TIẾP NHẬN KHÁM BỆNH</Typography>
                    <Typography variant="caption" color="textSecondary">Bệnh Viện Đa Khoa Quốc Tế TNT</Typography>
                </DialogTitle>
                <DialogContent sx={{ textAlign: "center", py: 2 }}>
                    {printTicket && (
                        <Box sx={{ border: "2px solid #333", p: 2, borderRadius: 2, bgcolor: "#FFFFFF", color: "#000" }}>
                            <Typography variant="caption" color="textSecondary" fontWeight="bold">SỐ THỨ TỰ CỦA BẠN</Typography>
                            <Typography variant="h2" fontWeight="900" color="#00C292" my={0.5}>
                                {printTicket.queueNumber}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle1" fontWeight="bold">{printTicket.patientName}</Typography>
                            <Typography variant="body2" color="textSecondary">SĐT: {printTicket.phone}</Typography>
                            <Typography variant="body2" fontWeight="800" color="#0088D6" mt={0.5}>
                                {printTicket.departmentName} - {printTicket.roomName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                                Bác sĩ phụ trách: <b>{printTicket.doctorName || "BS. Theo buồng khám"}</b>
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                                Giờ cấp: {printTicket.checkInTime} | Mã: {printTicket.bookingId}
                            </Typography>

                            {/* THÔNG TIN SINH HIỆU SƠ CHẨN TRÊN PHIẾU KHÁM */}
                            {printTicket.vitals && (
                                <Box sx={{ mt: 1, p: 0.8, bgcolor: "#F8FAFC", borderRadius: 1.5, border: "1px dashed #94A3B8", textAlign: "left" }}>
                                    <Typography variant="caption" fontWeight="bold" color="#0F172A" display="block">
                                        🩺 SINH HIỆU BÀN SƠ CHẨN:
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.72rem", color: "#334155" }}>
                                        • HA: <b>{printTicket.vitals.bloodPressure} mmHg</b> | Mạch: <b>{printTicket.vitals.heartRate} bpm</b>
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.72rem", color: "#334155" }}>
                                        • Nhiệt độ: <b>{printTicket.vitals.temperature}°C</b> | SpO2: <b>{printTicket.vitals.spO2}%</b>
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.72rem", color: "#334155" }}>
                                        • Thể trạng: <b>{printTicket.vitals.weight}kg / {printTicket.vitals.height}cm</b> (BMI: {((printTicket.vitals.weight / Math.pow(printTicket.vitals.height / 100, 2)) || 22).toFixed(1)})
                                    </Typography>
                                    {printTicket.vitals.allergies && printTicket.vitals.allergies !== "Chưa ghi nhận dị ứng thuốc" && (
                                        <Typography sx={{ fontSize: "0.7rem", color: "#DC2626", fontWeight: "bold", mt: 0.3 }}>
                                            ⚠️ Dị ứng: {printTicket.vitals.allergies}
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />

                            {/* MÃ VẠCH CHECK-IN TỰ ĐỘNG CHUẨN CODE 128 */}
                            <Box sx={{ my: 1, textAlign: "center" }}>
                                <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#111", mb: 0.5, letterSpacing: 0.5 }}>
                                    MÃ VẠCH CHECK-IN TỰ ĐỘNG
                                </Typography>
                                <BarcodeView value={printTicket.bookingId || `BK-${printTicket.queueNumber}`} height={42} moduleWidth={1.8} showText={true} />
                                <Typography sx={{ fontSize: "0.7rem", color: "#555", mt: 0.5, fontStyle: "italic" }}>
                                    Quét mã vạch tại đầu đọc trước cửa phòng để ghi nhận có mặt
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, justifyContent: "space-between", borderTop: "1px solid #E2E8F0" }}>
                    <Button onClick={() => setPrintTicket(null)} color="inherit">
                        Đóng
                    </Button>
                    <Box display="flex" gap={1}>
                        {/* Nút mô phỏng quét mã vạch đầu đọc */}
                        <Tooltip title="Mô phỏng máy quét mã vạch tại cửa phòng bác sĩ đọc mã và ghi nhận có mặt">
                            <Button
                                variant="outlined"
                                color="secondary"
                                startIcon={<QrCodeScannerIcon />}
                                onClick={() => handleSimulateScanCheckIn(printTicket)}
                                sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                            >
                                Test Quét Mã
                            </Button>
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={() => {
                                printThermalTicket(printTicket);
                                setPrintTicket(null);
                            }}
                            sx={{ fontWeight: 700, bgcolor: "#00C292", "&:hover": { bgcolor: "#00A77D" } }}
                        >
                            In Phiếu K80
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
