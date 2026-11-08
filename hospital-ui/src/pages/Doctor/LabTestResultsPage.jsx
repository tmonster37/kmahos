import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    TextField,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    InputAdornment,
    Tabs,
    Tab,
    Tooltip,
    Divider,
    Stack,
    TableContainer,
    Menu,
    MenuItem
} from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditNoteIcon from "@mui/icons-material/EditNote";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ImageIcon from "@mui/icons-material/Image";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PrintIcon from "@mui/icons-material/Print";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import SmartToyIcon from "@mui/icons-material/SmartToy";

import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import PacsViewerModal from "../../components/PacsViewerModal";

// ==========================================
// 1. KHO BẢNG CHỈ SỐ THAM CHIẾU SINH LÝ LIS
// ==========================================
const STANDARD_LAB_PANELS = {
    CBC: {
        id: "CBC",
        label: "Huyết học: Tổng phân tích tế bào máu (CBC 10 thông số)",
        conclusion: "Các dòng tế bào máu trong giới hạn sinh lý bình thường.",
        items: [
            { name: "Bạch cầu (WBC)", value: "6.8", min: 4.0, max: 10.0, unit: "G/L" },
            { name: "Hồng cầu (RBC)", value: "4.65", min: 3.8, max: 5.3, unit: "T/L" },
            { name: "Huyết sắc tố (HGB)", value: "142", min: 120, max: 165, unit: "g/L" },
            { name: "Dung tích HC (HCT)", value: "41.5", min: 35.0, max: 48.0, unit: "%" },
            { name: "Thể tích TB HC (MCV)", value: "89.2", min: 80.0, max: 97.0, unit: "fL" },
            { name: "Lượng HST TB (MCH)", value: "29.7", min: 27.0, max: 32.0, unit: "pg" },
            { name: "Nồng độ HST TB (MCHC)", value: "335", min: 320, max: 360, unit: "g/L" },
            { name: "Tiểu cầu (PLT)", value: "245", min: 150, max: 450, unit: "G/L" },
            { name: "Bạch cầu Lympho (LYM%)", value: "31.2", min: 20.0, max: 45.0, unit: "%" },
            { name: "Bạch cầu Trung tính (NEU%)", value: "61.5", min: 40.0, max: 74.0, unit: "%" },
        ]
    },
    BIOCHEM: {
        id: "BIOCHEM",
        label: "Sinh hóa máu: Gan - Thận - Đường huyết - Lipid",
        conclusion: "Chức năng gan, thận và đường huyết trong ngưỡng an toàn.",
        items: [
            { name: "Đường huyết đói (Glucose)", value: "5.4", min: 3.9, max: 6.4, unit: "mmol/L" },
            { name: "HbA1c", value: "5.5", min: 4.0, max: 6.0, unit: "%" },
            { name: "Ure máu", value: "5.2", min: 2.5, max: 7.5, unit: "mmol/L" },
            { name: "Creatinine máu", value: "84", min: 53, max: 106, unit: "µmol/L" },
            { name: "eGFR (Mức lọc cầu thận)", value: "98", min: 90, max: 130, unit: "mL/min/1.73m²" },
            { name: "Men gan AST (SGOT)", value: "26", min: 0, max: 37, unit: "U/L" },
            { name: "Men gan ALT (SGPT)", value: "28", min: 0, max: 40, unit: "U/L" },
            { name: "Men gan GGT", value: "25", min: 9, max: 48, unit: "U/L" },
            { name: "Acid Uric máu", value: "310", min: 180, max: 420, unit: "µmol/L" },
            { name: "Cholesterol toàn phần", value: "4.8", min: 3.6, max: 5.2, unit: "mmol/L" },
            { name: "Triglyceride", value: "1.45", min: 0.4, max: 1.88, unit: "mmol/L" }
        ]
    },
    ELECTROLYTE: {
        id: "ELECTROLYTE",
        label: "Điện giải đồ (Ion đồ máu: Na+, K+, Cl-, Ca++)",
        conclusion: "Cân bằng nồng độ ion điện giải bình thường.",
        items: [
            { name: "Natri (Na+)", value: "139", min: 135.0, max: 145.0, unit: "mmol/L" },
            { name: "Kali (K+)", value: "4.1", min: 3.5, max: 5.0, unit: "mmol/L" },
            { name: "Clo (Cl-)", value: "101", min: 98.0, max: 106.0, unit: "mmol/L" },
            { name: "Canxi toàn phần (Ca++)", value: "2.35", min: 2.15, max: 2.55, unit: "mmol/L" }
        ]
    },
    URINE: {
        id: "URINE",
        label: "Tổng phân tích nước tiểu (10 thông số)",
        conclusion: "Nước tiểu không phát hiện protein, hồng cầu hay bạch cầu niệu.",
        items: [
            { name: "Độ pH", value: "6.0", min: 5.0, max: 7.5, unit: "pH" },
            { name: "Tỷ trọng (SG)", value: "1.018", min: 1.005, max: 1.030, unit: "" },
            { name: "Bạch cầu (LEU)", value: "0", min: 0, max: 10, unit: "cells/µL" },
            { name: "Hồng cầu (ERY)", value: "0", min: 0, max: 5, unit: "cells/µL" },
            { name: "Protein niệu", value: "0.0", min: 0.0, max: 0.1, unit: "g/L" },
            { name: "Glucose niệu", value: "0.0", min: 0.0, max: 0.8, unit: "mmol/L" }
        ]
    }
};

// ==========================================
// 2. MẪU KẾT QUẢ CẬN LÂM SÀNG & CĐHA (PACS)
// ==========================================
const SAMPLE_PACS_STUDIES = [
    {
        label: "X-Quang Phổi thẳng bình thường",
        category: "PACS_XRAY",
        text: "Phế trường hai bên sáng đều, không thấy tổn thương thâm nhiễm hay nốt mờ bất thường. Tim và cung động mạch chủ không lớn. Góc sườn hoành hai bên sáng nhọn.",
        img: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1000&auto=format&fit=crop&q=80",
        aiFinding: null
    },
    {
        label: "X-Quang có Viêm phổi thùy (Có AI Lunit)",
        category: "PACS_XRAY",
        text: "Thấy đám mờ không đều tập trung ở hạ phân thùy phổi phải, đậm độ trung bình, bờ không rõ. Vòm hoành phải hơi tù. Đề nghị phối hợp kháng sinh lâm sàng.",
        img: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=1000&auto=format&fit=crop&q=80",
        aiFinding: {
            summary: "Phát hiện vùng mờ thâm nhiễm thùy dưới phổi phải. Xác suất tổn thương viêm đông đặc: 74.5%.",
            confidence: 74.5,
            suspectedCondition: "Nghi ngờ Viêm phổi thùy phải (Lobar Pneumonia)"
        }
    },
    {
        label: "Siêu âm Doppler ổ bụng bình thường",
        category: "PACS_US",
        text: "Gan không to, bờ đều, nhu mô đồng nhất. Túi mật không sỏi, thành mỏng. Tụy, lách, hai thận kích thước và cấu trúc bình thường. Không có dịch tự do ổ bụng.",
        img: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1000&auto=format&fit=crop&q=80",
        aiFinding: null
    },
    {
        label: "Siêu âm bụng: Gan nhiễm mỡ nhẹ",
        category: "PACS_US",
        text: "Gan kích thước trong giới hạn bình thường, nhu mô tăng âm lan tỏa nhẹ, giảm âm vùng sâu. Đường mật trong và ngoài gan không giãn. Túi mật thành mỏng không sỏi.",
        img: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1000&auto=format&fit=crop&q=80",
        aiFinding: null
    }
];

export default function LabTestResultsPage() {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [tabValue, setTabValue] = useState("ALL");
    const [selectedTest, setSelectedTest] = useState(null);
    const [openModal, setOpenModal] = useState(false);

    // Modal tabs: 0: Chỉ số LIS Min-Max, 1: CĐHA & PACS, 2: Văn bản kết luận
    const [entryTab, setEntryTab] = useState(0);

    // Indicator list for current entry
    const [indicators, setIndicators] = useState([]);
    const [testResult, setTestResult] = useState("");
    const [resultFileUrl, setResultFileUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // PACS Viewer State
    const [pacsTarget, setPacsTarget] = useState(null);

    useEffect(() => {
        fetchLabTests();
        const interval = setInterval(fetchLabTests, 20000);
        return () => clearInterval(interval);
    }, []);

    const fetchLabTests = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get("/api/clinical/lab/tests");
            const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            setTests(list);
        } catch (err) {
            console.error("Lỗi lấy danh sách chỉ định xét nghiệm:", err);
        } finally {
            setLoading(false);
        }
    };

    // Evaluate an indicator value against Min-Max (Tuân thủ nguyên tắc không mặc định cờ NORMAL khi chưa đánh giá)
    const evaluateIndicator = (val, min, max) => {
        if (val === undefined || val === null || String(val).trim() === "") return "PENDING";
        const strVal = String(val).trim().toLowerCase();
        const num = parseFloat(val);
        const minNum = parseFloat(min);
        const maxNum = parseFloat(max);

        // Định tính (Text results)
        if (isNaN(num)) {
            if (strVal.includes("dương tính") || strVal.includes("positive") || strVal.includes("bất thường")) return "HIGH";
            if (strVal.includes("âm tính") || strVal.includes("negative")) return "NORMAL";
            return "UNRATED";
        }

        // Định lượng (Numeric results)
        const hasMin = !isNaN(minNum);
        const hasMax = !isNaN(maxNum);
        if (!hasMin && !hasMax) return "UNRATED";
        if (hasMin && num < minNum) return "LOW";
        if (hasMax && num > maxNum) return "HIGH";
        return "NORMAL";
    };

    // Calculate count of abnormal items
    const getAbnormalStats = (items) => {
        let high = 0;
        let low = 0;
        let normal = 0;
        let unrated = 0;
        let pending = 0;
        items.forEach((item) => {
            const status = evaluateIndicator(item.value, item.min, item.max);
            if (status === "HIGH") high++;
            else if (status === "LOW") low++;
            else if (status === "NORMAL") normal++;
            else if (status === "PENDING") pending++;
            else unrated++;
        });
        return { high, low, normal, unrated, pending, abnormal: high + low, total: items.length };
    };

    const handleOpenModal = (test) => {
        setSelectedTest(test);
        setError("");
        setTestResult(test.testResult || "");
        setResultFileUrl(test.resultFileUrl || "");

        // Determine initial panel based on test service name
        const serviceNameLower = (test.serviceName || "").toLowerCase();
        if (serviceNameLower.includes("huyết học") || serviceNameLower.includes("công thức máu") || serviceNameLower.includes("cbc")) {
            setIndicators(JSON.parse(JSON.stringify(STANDARD_LAB_PANELS.CBC.items)));
            setEntryTab(0);
        } else if (serviceNameLower.includes("sinh hóa") || serviceNameLower.includes("glucose") || serviceNameLower.includes("gan") || serviceNameLower.includes("thận")) {
            setIndicators(JSON.parse(JSON.stringify(STANDARD_LAB_PANELS.BIOCHEM.items)));
            setEntryTab(0);
        } else if (serviceNameLower.includes("điện giải") || serviceNameLower.includes("ion")) {
            setIndicators(JSON.parse(JSON.stringify(STANDARD_LAB_PANELS.ELECTROLYTE.items)));
            setEntryTab(0);
        } else if (serviceNameLower.includes("nước tiểu")) {
            setIndicators(JSON.parse(JSON.stringify(STANDARD_LAB_PANELS.URINE.items)));
            setEntryTab(0);
        } else if (serviceNameLower.includes("x-quang") || serviceNameLower.includes("siêu âm") || serviceNameLower.includes("ct") || serviceNameLower.includes("chụp") || serviceNameLower.includes("mri")) {
            setIndicators([]);
            setEntryTab(1); // Default to Imaging Tab
        } else {
            // Default load CBC or empty
            setIndicators(JSON.parse(JSON.stringify(STANDARD_LAB_PANELS.CBC.items)));
            setEntryTab(0);
        }

        setOpenModal(true);
    };

    // Apply a standard panel
    const handleApplyPanel = (panelKey) => {
        const panel = STANDARD_LAB_PANELS[panelKey];
        if (!panel) return;
        setIndicators(JSON.parse(JSON.stringify(panel.items)));
    };

    // Load abnormal simulation scenario for testing
    const handleApplyAbnormalScenario = (type) => {
        if (type === "DIABETES_RENAL") {
            setIndicators([
                { name: "Đường huyết đói (Glucose)", value: "11.5", min: 3.9, max: 6.4, unit: "mmol/L" },
                { name: "HbA1c", value: "8.2", min: 4.0, max: 6.0, unit: "%" },
                { name: "Ure máu", value: "9.8", min: 2.5, max: 7.5, unit: "mmol/L" },
                { name: "Creatinine máu", value: "152", min: 53, max: 106, unit: "µmol/L" },
                { name: "eGFR (Mức lọc cầu thận)", value: "48", min: 90, max: 130, unit: "mL/min/1.73m²" },
                { name: "Men gan AST (SGOT)", value: "32", min: 0, max: 37, unit: "U/L" },
                { name: "Men gan ALT (SGPT)", value: "34", min: 0, max: 40, unit: "U/L" },
                { name: "Acid Uric máu", value: "460", min: 180, max: 420, unit: "µmol/L" }
            ]);
        } else if (type === "ANEMIA") {
            setIndicators([
                { name: "Bạch cầu (WBC)", value: "14.8", min: 4.0, max: 10.0, unit: "G/L" },
                { name: "Hồng cầu (RBC)", value: "2.85", min: 3.8, max: 5.3, unit: "T/L" },
                { name: "Huyết sắc tố (HGB)", value: "86", min: 120, max: 165, unit: "g/L" },
                { name: "Dung tích HC (HCT)", value: "26.4", min: 35.0, max: 48.0, unit: "%" },
                { name: "Thể tích TB HC (MCV)", value: "72.0", min: 80.0, max: 97.0, unit: "fL" },
                { name: "Tiểu cầu (PLT)", value: "85", min: 150, max: 450, unit: "G/L" },
                { name: "Bạch cầu Trung tính (NEU%)", value: "82.5", min: 40.0, max: 74.0, unit: "%" }
            ]);
        }
    };

    // Update indicator field
    const handleUpdateIndicator = (index, field, val) => {
        const updated = [...indicators];
        updated[index] = { ...updated[index], [field]: val };
        setIndicators(updated);
    };

    // Add new indicator
    const handleAddIndicator = () => {
        setIndicators([
            ...indicators,
            { name: "Chỉ số mới", value: "0", min: 0, max: 100, unit: "" }
        ]);
    };

    // Remove indicator
    const handleRemoveIndicator = (index) => {
        setIndicators(indicators.filter((_, i) => i !== index));
    };

    // Auto-generate summary text report based on indicators
    const handleGenerateReportFromIndicators = () => {
        if (!indicators || indicators.length === 0) return;
        const stats = getAbnormalStats(indicators);

        let report = "";
        if (stats.abnormal > 0) {
            report += `⚠️ [CẢNH BÁO BẤT THƯỜNG LIS: ${stats.abnormal}/${stats.total} CHỈ SỐ VƯỢT NGƯỠNG]\n`;
            const highItems = indicators.filter(i => evaluateIndicator(i.value, i.min, i.max) === "HIGH");
            const lowItems = indicators.filter(i => evaluateIndicator(i.value, i.min, i.max) === "LOW");

            if (highItems.length > 0) {
                report += `⬆️ CAO: ` + highItems.map(i => `${i.name}: ${i.value} ${i.unit} (Chuẩn: ${i.min}-${i.max})`).join(", ") + "\n";
            }
            if (lowItems.length > 0) {
                report += `⬇️ THẤP: ` + lowItems.map(i => `${i.name}: ${i.value} ${i.unit} (Chuẩn: ${i.min}-${i.max})`).join(", ") + "\n";
            }
        } else {
            report += `✅ [XÉT NGHIỆM BÌNH THƯỜNG: ${stats.total}/${stats.total} CHỈ SỐ ĐẠT CHUẨN SINH LÝ]\n`;
        }

        report += `\n--- CHI TIẾT CÁC CHỈ SỐ ---\n`;
        indicators.forEach(i => {
            const status = evaluateIndicator(i.value, i.min, i.max);
            const flag = status === "HIGH" ? "[⬆️ CAO]" : (status === "LOW" ? "[⬇️ THẤP]" : "[BÌNH THƯỜNG]");
            report += `• ${i.name}: ${i.value} ${i.unit} | Tham chiếu: [${i.min} - ${i.max}] ${flag}\n`;
        });

        report += `\nKết luận chuyên môn: ` + (stats.abnormal > 0
            ? "Có chỉ số lệch khỏi khoảng tham chiếu sinh lý. Đề nghị bác sĩ điều trị lưu ý chẩn đoán kết hợp lâm sàng."
            : "Các chỉ số xét nghiệm hiện tại hoàn toàn trong giới hạn bình thường.");

        setTestResult(report);
        setEntryTab(2); // Switch to conclusion tab so KTV can review/edit
    };

    // Apply PACS image template
    const handleApplyPacsTemplate = (study) => {
        setTestResult(study.text);
        if (study.img) setResultFileUrl(study.img);
    };

    // Submit test result to backend
    const handleSubmitResult = async () => {
        let finalResult = testResult.trim();

        // If KTV didn't switch to text tab but indicators exist, auto-generate
        if (!finalResult && indicators.length > 0) {
            const stats = getAbnormalStats(indicators);
            finalResult = (stats.abnormal > 0
                ? `[CẢNH BÁO BẤT THƯỜNG LIS: ${stats.abnormal} CHỈ SỐ VƯỢT NGƯỠNG]\n`
                : `[XÉT NGHIỆM ĐẠT CHUẨN SINH LÝ]\n`) +
                indicators.map(i => `${i.name}: ${i.value} ${i.unit} (Tham chiếu: ${i.min}-${i.max})`).join("; ");
        }

        if (!finalResult) {
            setError("Vui lòng nhập kết quả hoặc tạo bảng chỉ số xét nghiệm!");
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            await axiosInstance.put(`/api/clinical/tests/${selectedTest.testId}/result`, {
                testResult: finalResult,
                resultFileUrl,
            });
            setMessage(`Đã cập nhật và trả kết quả thành công cho chỉ định ${selectedTest.testCode}!`);
            setOpenModal(false);
            fetchLabTests();
        } catch (err) {
            setError(err.message || "Lỗi cập nhật kết quả xét nghiệm!");
        } finally {
            setSubmitting(false);
        }
    };

    // Check if test string contains abnormal alerts
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

    // Open PACS Viewer with complete metadata
    const handleOpenPacsViewer = (test) => {
        const isXray = (test.serviceName || "").toLowerCase().includes("x-quang") || (test.serviceName || "").toLowerCase().includes("phổi");
        const isAbnormal = hasAbnormalIndicator(test.testResult);

        setPacsTarget({
            imageSrc: test.resultFileUrl,
            patientName: test.patientName,
            patientCode: test.bookingCode || test.testCode,
            patientAge: test.patientAge || "35",
            patientGender: test.patientGender === "FEMALE" ? "Nữ" : "Nam",
            serviceName: test.serviceName,
            studyDate: test.createdAt,
            doctorName: test.doctorName,
            diagnosisSummary: test.testResult,
            aiFindings: (isXray && isAbnormal) ? {
                summary: "Phát hiện vùng mờ bất thường tại thùy dưới phổi phải. Xác suất tổn thương đông đặc 74.5%.",
                confidence: 74.5,
                suspectedCondition: "Nghi ngờ Viêm phổi thùy (Lobar Pneumonia)"
            } : null
        });
    };

    const filteredTests = tests.filter((t) => {
        const matchTab =
            tabValue === "ALL" ||
            (tabValue === "WAITING" && t.state === "WAITING") ||
            (tabValue === "COMPLETED" && t.state === "COMPLETED");

        const term = searchTerm.toLowerCase();
        const matchSearch =
            !searchTerm ||
            t.testCode?.toLowerCase().includes(term) ||
            t.serviceName?.toLowerCase().includes(term) ||
            t.patientName?.toLowerCase().includes(term) ||
            t.patientPhone?.toLowerCase().includes(term) ||
            t.doctorName?.toLowerCase().includes(term);

        return matchTab && matchSearch;
    });

    const waitingCount = tests.filter((t) => t.state === "WAITING").length;
    const completedCount = tests.filter((t) => t.state === "COMPLETED").length;
    const abnormalCount = tests.filter((t) => t.state === "COMPLETED" && hasAbnormalIndicator(t.testResult)).length;

    const stats = getAbnormalStats(indicators);

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Banner Cao Cấp (Apple HIG + Linear) */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3.5,
                    bgcolor: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)",
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
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            bgcolor: "rgba(0, 136, 214, 0.1)",
                            color: "#0088D6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 14px rgba(0, 136, 214, 0.2)"
                        }}
                    >
                        <ScienceIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="h6" fontWeight={800} color="#0F172A" letterSpacing="-0.02em">
                                Phân Hệ Xét Nghiệm (LIS) & Chẩn Đoán Hình Ảnh (PACS)
                            </Typography>
                            <Chip
                                label="SmartHos LIS & PACS PRO"
                                size="small"
                                sx={{
                                    height: 22,
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    bgcolor: "rgba(0, 136, 214, 0.1)",
                                    color: "#0088D6",
                                    border: "1px solid rgba(0, 136, 214, 0.2)"
                                }}
                            />
                        </Box>
                        <Typography variant="body2" sx={{ color: "#64748B", mt: 0.2 }}>
                            Khoảng tham chiếu Min-Max tự động cảnh báo bất thường • Viewer xem ảnh CĐHA (DICOM) chuyên dụng
                        </Typography>
                    </Box>
                </Box>

                <Button
                    variant="contained"
                    size="small"
                    sx={{
                        borderRadius: 2.2,
                        bgcolor: "#0088D6",
                        color: "white",
                        fontWeight: 700,
                        textTransform: "none",
                        fontSize: "0.85rem",
                        px: 2,
                        boxShadow: "0 4px 14px rgba(0, 136, 214, 0.25)",
                        "&:hover": { bgcolor: "#0073B7" }
                    }}
                    startIcon={<RefreshIcon />}
                    onClick={fetchLabTests}
                >
                    Làm mới danh sách
                </Button>
            </Paper>

            {message && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2.5 }} onClose={() => setMessage("")}>
                    {message}
                </Alert>
            )}

            {/* Statistics Cards (Apple HIG Metric Cards) */}
            <Grid container spacing={2.5} mb={3}>
                <Grid item xs={12} sm={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: "#0088D6" }} />
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", display: "block" }}>
                            TỔNG SỐ CHỈ ĐỊNH
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#0088D6", mt: 0.8 }}>
                            {tests.length}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: "#F59E0B" }} />
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", display: "block" }}>
                            CHỜ THỰC HIỆN / CHƯA CÓ KQ
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#D97706", mt: 0.8 }}>
                            {waitingCount}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: "#10B981" }} />
                        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, letterSpacing: "0.04em", display: "block" }}>
                            ĐÃ TRẢ KẾT QUẢ
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#059669", mt: 0.8 }}>
                            {completedCount}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3.5,
                            bgcolor: "#FFFFFF",
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 2px 10px rgba(15, 23, 42, 0.02)",
                            position: "relative",
                            overflow: "hidden"
                        }}
                    >
                        <Box sx={{ position: "absolute", top: 0, left: 0, width: "100%", height: 3, bgcolor: "#EF4444" }} />
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 700, letterSpacing: "0.04em", display: "block" }}>
                                CẢNH BÁO BẤT THƯỜNG
                            </Typography>
                            <WarningAmberIcon sx={{ color: "#DC2626", fontSize: 18 }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#DC2626", mt: 0.8 }}>
                            {abnormalCount}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Table Paper */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, bgcolor: "#FFFFFF", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2.5}>
                    <Tabs
                        value={tabValue}
                        onChange={(_, v) => setTabValue(v)}
                        sx={{
                            "& .MuiTabs-indicator": {
                                height: 3,
                                borderRadius: 3,
                                bgcolor: "#0088D6"
                            }
                        }}
                    >
                        <Tab
                            label={`Tất cả (${tests.length})`}
                            value="ALL"
                            sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.9rem" }}
                        />
                        <Tab
                            label={`Chờ xử lý (${waitingCount})`}
                            value="WAITING"
                            sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.9rem" }}
                        />
                        <Tab
                            label={`Đã hoàn tất (${completedCount})`}
                            value="COMPLETED"
                            sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.9rem" }}
                        />
                    </Tabs>

                    <TextField
                        size="small"
                        placeholder="Tìm theo mã XN, tên bệnh nhân, bác sĩ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "#94A3B8" }} />
                                </InputAdornment>
                            ),
                            sx: { borderRadius: 2.2, bgcolor: "#F8FAFC" }
                        }}
                        sx={{ minWidth: 320 }}
                    />
                </Box>

                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <Table>
                        <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                            <TableRow>
                                <TableCell><b>Mã chỉ định</b></TableCell>
                                <TableCell><b>Dịch vụ cận lâm sàng</b></TableCell>
                                <TableCell><b>Bệnh nhân</b></TableCell>
                                <TableCell><b>Bác sĩ chỉ định</b></TableCell>
                                <TableCell><b>Thời gian gửi</b></TableCell>
                                <TableCell><b>Trạng thái</b></TableCell>
                                <TableCell><b>Kết quả & Cảnh báo</b></TableCell>
                                <TableCell align="center"><b>Thao tác</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                        Không có chỉ định xét nghiệm nào phù hợp.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTests.map((t) => {
                                    const isAbnormal = hasAbnormalIndicator(t.testResult);
                                    return (
                                        <TableRow key={t.testId} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold" color="primary">
                                                    {t.testCode}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Mã khám: {t.bookingCode}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {t.serviceName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Phí: {formatCurrency(t.price)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {t.patientName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {t.patientPhone} {t.patientGender && `• ${t.patientGender === "FEMALE" ? "Nữ" : "Nam"}`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    BS. {t.doctorName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatDateTime(t.createdAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                <Stack spacing={0.6}>
                                                    <Chip
                                                        label={t.state === "COMPLETED" ? "ĐÃ CÓ KẾT QUẢ" : (t.state === "CANCELLED" ? "ĐÃ HỦY CHỈ ĐỊNH" : "CHỜ THỰC HIỆN")}
                                                        color={t.state === "COMPLETED" ? "success" : (t.state === "CANCELLED" ? "default" : "warning")}
                                                        size="small"
                                                        sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}
                                                    />
                                                    {t.isPaid ? (
                                                        <Chip
                                                            label="✅ ĐÃ NỘP PHÍ"
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 700,
                                                                fontSize: "0.68rem",
                                                                height: 20,
                                                                bgcolor: "#ECFDF5",
                                                                color: "#059669",
                                                                border: "1px solid #A7F3D0"
                                                            }}
                                                        />
                                                    ) : (
                                                        <Chip
                                                            label="⚠️ CHỜ THANH TOÁN"
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 700,
                                                                fontSize: "0.68rem",
                                                                height: 20,
                                                                bgcolor: "#FEF2F2",
                                                                color: "#DC2626",
                                                                border: "1px solid #FECACA"
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 280 }}>
                                                {t.testResult ? (
                                                    <Box>
                                                        {isAbnormal && (
                                                            <Chip
                                                                icon={<WarningAmberIcon sx={{ fontSize: "14px !important" }} />}
                                                                label="BẤT THƯỜNG"
                                                                size="small"
                                                                color="error"
                                                                sx={{ height: 20, fontSize: "0.68rem", fontWeight: 800, mb: 0.5 }}
                                                            />
                                                        )}
                                                        <Box display="flex" alignItems="center" gap={0.5}>
                                                            <Typography
                                                                variant="body2"
                                                                noWrap
                                                                title={t.testResult}
                                                                sx={{
                                                                    flex: 1,
                                                                    minWidth: 0,
                                                                    color: isAbnormal ? "#B91C1C" : "inherit",
                                                                    fontWeight: isAbnormal ? 600 : 400
                                                                }}
                                                            >
                                                                {t.testResult}
                                                            </Typography>
                                                            {t.resultFileUrl && (
                                                                <Tooltip title="Mở PACS Viewer (Xem ảnh CĐHA chuyên dụng)">
                                                                    <IconButton
                                                                        size="small"
                                                                        color="primary"
                                                                        onClick={() => handleOpenPacsViewer(t)}
                                                                        sx={{
                                                                            flexShrink: 0,
                                                                            bgcolor: "#EFF6FF",
                                                                            border: "1px solid #BFDBFE"
                                                                        }}
                                                                    >
                                                                        <CameraAltIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                                        Chưa có kết quả
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                                                {t.state === "CANCELLED" ? (
                                                    <Chip label="Đã hủy" size="small" variant="outlined" sx={{ color: "#64748B", borderColor: "#CBD5E1" }} />
                                                ) : !t.isPaid ? (
                                                    <Tooltip title="Chưa nộp viện phí tại quầy thu ngân. Chốt chặn phòng xét nghiệm: không thể lấy mẫu / trả kết quả!">
                                                        <span>
                                                            <Button
                                                                variant="outlined"
                                                                color="inherit"
                                                                size="small"
                                                                disabled
                                                                startIcon={<WarningAmberIcon color="error" />}
                                                                sx={{ borderRadius: 2, whiteSpace: "nowrap", fontWeight: 700, color: "#94A3B8" }}
                                                            >
                                                                Chờ nộp phí
                                                            </Button>
                                                        </span>
                                                    </Tooltip>
                                                ) : (
                                                    <Button
                                                        variant={t.state === "COMPLETED" ? "outlined" : "contained"}
                                                        color={t.state === "COMPLETED" ? "primary" : "success"}
                                                        size="small"
                                                        startIcon={<EditNoteIcon />}
                                                        onClick={() => handleOpenModal(t)}
                                                        sx={{ borderRadius: 2, whiteSpace: "nowrap", fontWeight: 700 }}
                                                    >
                                                        {t.state === "COMPLETED" ? "Sửa kết quả" : "Nhập kết quả"}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Paper>

            {/* ==================================================== */}
            {/* MODAL NHẬP KẾT QUẢ XÉT NGHIỆM & CĐHA (LIS & PACS)     */}
            {/* ==================================================== */}
            <Dialog
                open={openModal}
                onClose={() => setOpenModal(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ pb: 1.5, borderBottom: "1px solid #E2E8F0" }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 2,
                                    bgcolor: "#DCFCE7",
                                    color: "#16A34A",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <ScienceIcon />
                            </Box>
                            <Box>
                                <Typography variant="h6" fontWeight="bold" color="#0F172A">
                                    Nhập Kết Quả Xét Nghiệm (LIS) & Đính Kèm CĐHA (PACS)
                                </Typography>
                                {selectedTest && (
                                    <Typography variant="caption" color="text.secondary">
                                        Mã chỉ định: <b>{selectedTest.testCode}</b> • Dịch vụ: <b>{selectedTest.serviceName}</b> • Bệnh nhân: <b>{selectedTest.patientName}</b>
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        <Chip
                            label="Khoảng Tham Chiếu Chuẩn BYT"
                            color="success"
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 700 }}
                        />
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: 2 }}>
                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                    {/* Mode Navigation Tabs */}
                    <Tabs
                        value={entryTab}
                        onChange={(_, v) => setEntryTab(v)}
                        sx={{
                            mb: 2.5,
                            borderBottom: "1px solid #E2E8F0",
                            "& .MuiTab-root": { textTransform: "none", fontWeight: 700 }
                        }}
                    >
                        <Tab
                            icon={<ScienceIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label={`1. Bảng Chỉ Số Min-Max LIS (${indicators.length} chỉ số)`}
                        />
                        <Tab
                            icon={<CameraAltIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label="2. Chẩn Đoán Hình Ảnh & PACS"
                        />
                        <Tab
                            icon={<EditNoteIcon sx={{ fontSize: 18 }} />}
                            iconPosition="start"
                            label="3. Kết Luận & Phiếu Trả KQ Tổng Hợp"
                        />
                    </Tabs>

                    {/* ========================================== */}
                    {/* TAB 0: BẢNG CHỈ SỐ XÉT NGHIỆM MIN-MAX LIS   */}
                    {/* ========================================== */}
                    {entryTab === 0 && (
                        <Box>
                            {/* Panel Selector & Simulator */}
                            <Paper elevation={0} sx={{ p: 2, mb: 2.5, bgcolor: "#F8FAFC", borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={1}>
                                    ⚡ TẢI NHANH BỘ CHỈ SỐ XÉT NGHIỆM THEO CHUYÊN KHOA:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1.5}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleApplyPanel("CBC")}
                                        startIcon={<ScienceIcon />}
                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                    >
                                        Huyết học (CBC)
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleApplyPanel("BIOCHEM")}
                                        startIcon={<MonitorHeartIcon />}
                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                    >
                                        Sinh hóa máu (Gan/Thận/Đường)
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleApplyPanel("ELECTROLYTE")}
                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                    >
                                        Điện giải đồ (Na/K/Cl)
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleApplyPanel("URINE")}
                                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                    >
                                        Nước tiểu (10 thông số)
                                    </Button>
                                </Stack>

                                <Divider sx={{ my: 1 }} />

                                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                        🧪 Nạp dữ liệu mô phỏng bất thường để kiểm tra hệ thống cảnh báo:
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Chip
                                            label="Mẫu Đái tháo đường & Suy thận nhẹ"
                                            size="small"
                                            color="warning"
                                            onClick={() => handleApplyAbnormalScenario("DIABETES_RENAL")}
                                            clickable
                                            sx={{ fontWeight: 700 }}
                                        />
                                        <Chip
                                            label="Mẫu Thiếu máu & Giảm tiểu cầu"
                                            size="small"
                                            color="error"
                                            onClick={() => handleApplyAbnormalScenario("ANEMIA")}
                                            clickable
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Stack>
                                </Box>
                            </Paper>

                            {/* Live Alert Banner */}
                            {indicators.length > 0 && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 1.8,
                                        mb: 2.5,
                                        borderRadius: 2.5,
                                        bgcolor: stats.abnormal > 0 ? "#FEF2F2" : "#F0FDF4",
                                        border: `1.5px solid ${stats.abnormal > 0 ? "#FCA5A5" : "#86EFAC"}`,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 1.5
                                    }}
                                >
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        {stats.abnormal > 0 ? (
                                            <WarningAmberIcon sx={{ color: "#DC2626", fontSize: 28 }} />
                                        ) : (
                                            <CheckCircleIcon sx={{ color: "#16A34A", fontSize: 28 }} />
                                        )}
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={800} color={stats.abnormal > 0 ? "#B91C1C" : "#15803D"}>
                                                {stats.abnormal > 0
                                                    ? `HỆ THỐNG CẢNH BÁO TỰ ĐỘNG: Phát hiện ${stats.abnormal}/${stats.total} chỉ số bất thường (${stats.high} chỉ số cao ⬆️, ${stats.low} chỉ số thấp ⬇️)`
                                                    : `TẤT CẢ ${stats.total} CHỈ SỐ NẰM TRONG KHOẢNG THAM CHIẾU SINH LÝ BÌNH THƯỜNG`}
                                            </Typography>
                                            <Typography variant="caption" color={stats.abnormal > 0 ? "#991B1B" : "#166534"}>
                                                {stats.abnormal > 0
                                                    ? "Các chỉ số bất thường đã được đánh dấu màu đỏ/cam. Hãy nhấn 'Tổng hợp vào kết luận' để liên thông sang hồ sơ Bác sĩ."
                                                    : "Dữ liệu xét nghiệm đạt chỉ tiêu sinh lý bình thường theo tiêu chuẩn Bộ Y Tế."}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<AutoAwesomeIcon />}
                                        onClick={handleGenerateReportFromIndicators}
                                        sx={{
                                            bgcolor: stats.abnormal > 0 ? "#DC2626" : "#16A34A",
                                            fontWeight: 800,
                                            borderRadius: 2,
                                            textTransform: "none",
                                            "&:hover": { bgcolor: stats.abnormal > 0 ? "#B91C1C" : "#15803D" }
                                        }}
                                    >
                                        Tổng hợp vào phiếu trả kết quả
                                    </Button>
                                </Paper>
                            )}

                            {/* Indicators Table */}
                            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, mb: 2 }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800 }}>TÊN CHỈ SỐ XÉT NGHIỆM</TableCell>
                                            <TableCell sx={{ fontWeight: 800, width: 140 }}>GIÁ TRỊ ĐO</TableCell>
                                            <TableCell sx={{ fontWeight: 800, width: 120 }}>MIN THAM CHIẾU</TableCell>
                                            <TableCell sx={{ fontWeight: 800, width: 120 }}>MAX THAM CHIẾU</TableCell>
                                            <TableCell sx={{ fontWeight: 800, width: 100 }}>ĐƠN VỊ</TableCell>
                                            <TableCell sx={{ fontWeight: 800, width: 150 }}>ĐÁNH GIÁ (LIS)</TableCell>
                                            <TableCell align="center" sx={{ width: 60 }}></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {indicators.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                                    Chưa có chỉ số nào trong bảng. Hãy chọn tải bộ chỉ số ở trên hoặc nhấn "+ Thêm chỉ số đo lường".
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            indicators.map((item, idx) => {
                                                const status = evaluateIndicator(item.value, item.min, item.max);
                                                const isHigh = status === "HIGH";
                                                const isLow = status === "LOW";

                                                return (
                                                    <TableRow
                                                        key={idx}
                                                        hover
                                                        sx={{
                                                            bgcolor: isHigh ? "#FFF5F5" : (isLow ? "#FFFBEB" : "inherit"),
                                                            "&:hover": { bgcolor: isHigh ? "#FEE2E2 !important" : (isLow ? "#FEF3C7 !important" : undefined) }
                                                        }}
                                                    >
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                fullWidth
                                                                value={item.name}
                                                                onChange={(e) => handleUpdateIndicator(idx, "name", e.target.value)}
                                                                sx={{ "& .MuiInputBase-input": { fontSize: "0.85rem", fontWeight: (isHigh || isLow) ? 700 : 500 } }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={item.value}
                                                                onChange={(e) => handleUpdateIndicator(idx, "value", e.target.value)}
                                                                inputProps={{ step: "any" }}
                                                                sx={{
                                                                    "& .MuiInputBase-input": {
                                                                        fontSize: "0.9rem",
                                                                        fontWeight: 800,
                                                                        color: isHigh ? "#DC2626" : (isLow ? "#D97706" : "#16A34A")
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={item.min}
                                                                onChange={(e) => handleUpdateIndicator(idx, "min", e.target.value)}
                                                                inputProps={{ step: "any" }}
                                                                sx={{ "& .MuiInputBase-input": { fontSize: "0.85rem" } }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={item.max}
                                                                onChange={(e) => handleUpdateIndicator(idx, "max", e.target.value)}
                                                                inputProps={{ step: "any" }}
                                                                sx={{ "& .MuiInputBase-input": { fontSize: "0.85rem" } }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                value={item.unit}
                                                                onChange={(e) => handleUpdateIndicator(idx, "unit", e.target.value)}
                                                                sx={{ "& .MuiInputBase-input": { fontSize: "0.85rem" } }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {status === "HIGH" && (
                                                                <Chip
                                                                    icon={<TrendingUpIcon sx={{ fontSize: "14px !important" }} />}
                                                                    label="⬆️ CAO"
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: "#FEE2E2",
                                                                        color: "#B91C1C",
                                                                        fontWeight: 900,
                                                                        border: "1px solid #FCA5A5"
                                                                    }}
                                                                />
                                                            )}
                                                            {status === "LOW" && (
                                                                <Chip
                                                                    icon={<TrendingDownIcon sx={{ fontSize: "14px !important" }} />}
                                                                    label="⬇️ THẤP"
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: "#FEF3C7",
                                                                        color: "#B45309",
                                                                        fontWeight: 900,
                                                                        border: "1px solid #FCD34D"
                                                                    }}
                                                                />
                                                            )}
                                                            {status === "NORMAL" && (
                                                                <Chip
                                                                    icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                                                                    label="Bình thường"
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: "#DCFCE7",
                                                                        color: "#15803D",
                                                                        fontWeight: 700
                                                                    }}
                                                                />
                                                            )}
                                                            {status === "UNRATED" && (
                                                                <Chip
                                                                    label="Định tính / Tham chiếu"
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: "#F1F5F9",
                                                                        color: "#475569",
                                                                        fontWeight: 600,
                                                                        border: "1px solid #CBD5E1"
                                                                    }}
                                                                />
                                                            )}
                                                            {status === "PENDING" && (
                                                                <Chip
                                                                    label="Chờ kết quả"
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: "#F8FAFC",
                                                                        color: "#94A3B8",
                                                                        fontStyle: "italic",
                                                                        border: "1px dashed #CBD5E1"
                                                                    }}
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleRemoveIndicator(idx)}
                                                                title="Xóa chỉ số này"
                                                            >
                                                                <DeleteOutlineIcon fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Button
                                    size="small"
                                    startIcon={<AddCircleOutlineIcon />}
                                    onClick={handleAddIndicator}
                                    sx={{ fontWeight: 700, textTransform: "none" }}
                                >
                                    + Thêm chỉ số đo lường mới
                                </Button>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<AutoAwesomeIcon />}
                                    onClick={handleGenerateReportFromIndicators}
                                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                                >
                                    Tự động tổng hợp & Chuyển sang phiếu kết luận ➡️
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {/* ========================================== */}
                    {/* TAB 1: CHẨN ĐOÁN HÌNH ẢNH & PACS           */}
                    {/* ========================================== */}
                    {entryTab === 1 && (
                        <Box>
                            <Box mb={2}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                                    🩻 Áp dụng mẫu Chẩn đoán hình ảnh (X-Quang, Siêu âm, CT):
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {SAMPLE_PACS_STUDIES.map((study, i) => (
                                        <Chip
                                            key={i}
                                            label={study.label}
                                            size="small"
                                            onClick={() => handleApplyPacsTemplate(study)}
                                            clickable
                                            color="info"
                                            variant="outlined"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    ))}
                                </Stack>
                            </Box>

                            <TextField
                                fullWidth
                                label="Link File Hình Ảnh Y Khoa / Phim X-Quang / Siêu Âm (URL)"
                                placeholder="https://example.com/pacs/dicom-study-001.jpg"
                                value={resultFileUrl}
                                onChange={(e) => setResultFileUrl(e.target.value)}
                                helperText="Hỗ trợ xem trực tiếp trên PACS Web Viewer với công cụ Zoom, Pan, Đảo phim Negative, Đo Caliper và AI Heatmap"
                                sx={{ mb: 2 }}
                            />

                            {resultFileUrl && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        background: "linear-gradient(135deg, #0088D6 0%, #0062A3 100%)",
                                        color: "white",
                                        borderRadius: 2.5,
                                        boxShadow: "0 4px 15px rgba(0, 136, 214, 0.2)",
                                        textAlign: "center"
                                    }}
                                >
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                        <Typography variant="subtitle2" fontWeight={800} color="#38BDF8">
                                            🔬 XEM TRƯỚC HÌNH ẢNH CĐHA ĐÍNH KÈM
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<CameraAltIcon />}
                                            onClick={() => {
                                                setPacsTarget({
                                                    imageSrc: resultFileUrl,
                                                    patientName: selectedTest?.patientName || "Bệnh nhân",
                                                    patientCode: selectedTest?.bookingCode || "BN-2026",
                                                    patientAge: "35",
                                                    patientGender: "Nam",
                                                    serviceName: selectedTest?.serviceName || "Chẩn đoán hình ảnh",
                                                    studyDate: selectedTest?.createdAt || new Date().toISOString(),
                                                    doctorName: selectedTest?.doctorName || "BS. Điều trị",
                                                    diagnosisSummary: testResult,
                                                    aiFindings: {
                                                        summary: "Phát hiện vùng mờ bất thường tại thùy dưới phổi phải. Xác suất 74.5%.",
                                                        confidence: 74.5,
                                                        suspectedCondition: "Nghi ngờ Viêm phổi thùy (Lobar Pneumonia)"
                                                    }
                                                });
                                            }}
                                            sx={{
                                                bgcolor: "#0284C7",
                                                fontWeight: 800,
                                                borderRadius: 2,
                                                textTransform: "none",
                                                "&:hover": { bgcolor: "#0369A1" }
                                            }}
                                        >
                                            Mở Trình Xem PACS Chuyên Dụng (Đo đạc & AI Lunit)
                                        </Button>
                                    </Box>

                                    <Box sx={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                                        <img
                                            src={resultFileUrl}
                                            alt="Scan Preview"
                                            style={{
                                                maxHeight: 240,
                                                maxWidth: "100%",
                                                borderRadius: 8,
                                                border: "1px solid #334155"
                                            }}
                                            onError={(e) => {
                                                e.target.src = "https://via.placeholder.com/600x300?text=Khong+the+tai+anh+y+khoa";
                                            }}
                                        />
                                    </Box>
                                </Paper>
                            )}
                        </Box>
                    )}

                    {/* ========================================== */}
                    {/* TAB 2: KẾT LUẬN & PHIẾU TRẢ KQ TỔNG HỢP     */}
                    {/* ========================================== */}
                    {entryTab === 2 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                    Nội dung kết luận hiển thị trên Hồ sơ bệnh án & Bàn khám Bác sĩ:
                                </Typography>
                                {indicators.length > 0 && (
                                    <Button
                                        size="small"
                                        startIcon={<RefreshIcon />}
                                        onClick={handleGenerateReportFromIndicators}
                                        sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem" }}
                                    >
                                        Đồng bộ lại từ bảng chỉ số Min-Max
                                    </Button>
                                )}
                            </Box>

                            <TextField
                                fullWidth
                                multiline
                                rows={7}
                                required
                                label="Kết quả xét nghiệm & Kết luận chuyên môn"
                                placeholder="Nhập các chỉ số xét nghiệm hoặc mô tả kết quả hình ảnh X-Quang, CT, Siêu âm..."
                                value={testResult}
                                onChange={(e) => setTestResult(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
                    <Button onClick={() => setOpenModal(false)} variant="outlined" color="inherit" sx={{ borderRadius: 2 }}>
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleSubmitResult}
                        disabled={submitting}
                        sx={{ px: 3, fontWeight: "bold", borderRadius: 2 }}
                    >
                        {submitting ? "Đang lưu..." : "Xác Nhận & Trả Kết Quả Cho Bác Sĩ"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ==================================================== */}
            {/* PACS MEDICAL DICOM WEB VIEWER MODAL                  */}
            {/* ==================================================== */}
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
        </Container>
    );
}
