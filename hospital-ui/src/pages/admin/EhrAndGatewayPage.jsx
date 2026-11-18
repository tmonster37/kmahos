import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Button,
    Chip,
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
    Tooltip,
    Tabs,
    Tab,
    Stack,
    MenuItem,
    InputAdornment,
    LinearProgress
} from "@mui/material";
import HubIcon from "@mui/icons-material/Hub";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ScienceIcon from "@mui/icons-material/Science";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SyncIcon from "@mui/icons-material/Sync";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import DnsIcon from "@mui/icons-material/Dns";
import CodeIcon from "@mui/icons-material/Code";

import gatewayApi from "../../services/gatewayApi";
import PacsViewerModal from "../../components/PacsViewerModal";
import { formatDateTime } from "../../utils/formatters";
import designTokens from "../../theme/designTokens";

const BRAND_PRIMARY = designTokens.brand.primary;
const BRAND_DARK = designTokens.brand.primaryDark;
const BRAND_LIGHT = designTokens.brand.primaryLight;

export default function EhrAndGatewayPage() {
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    // Dữ liệu Concept Dictionary (EHR)
    const [concepts, setConcepts] = useState([]);
    const [openAddConcept, setOpenAddConcept] = useState(false);
    const [newConcept, setNewConcept] = useState({
        conceptName: "",
        conceptClass: "TEST",
        dataType: "NUMERIC",
        units: "",
        lowNormal: "",
        highNormal: "",
        description: ""
    });

    // Dữ liệu RIS Modality Worklist
    const [selectedModality, setSelectedModality] = useState("DX");
    const [worklist, setWorklist] = useState([]);

    // Dữ liệu LIS Simulator
    const [lisBarcode, setLisBarcode] = useState("BC-LAB-2026-001");
    const [lisAnalyzerModel, setLisAnalyzerModel] = useState("Sysmex XN-1000 Automated Hematology Analyzer");
    const [lisItems, setLisItems] = useState([
        { testCode: "WBC", testName: "Bạch cầu (White Blood Cells)", resultValue: "14.2", unit: "G/L", isAbnormal: true, referenceRange: "4.0 - 10.0" },
        { testCode: "RBC", testName: "Hồng cầu (Red Blood Cells)", resultValue: "4.8", unit: "T/L", isAbnormal: false, referenceRange: "3.8 - 5.5" },
        { testCode: "PLT", testName: "Tiểu cầu (Platelets)", resultValue: "285", unit: "G/L", isAbnormal: false, referenceRange: "150 - 450" },
        { testCode: "HGB", testName: "Huyết sắc tố (Hemoglobin)", resultValue: "145", unit: "g/L", isAbnormal: false, referenceRange: "120 - 165" }
    ]);

    // Dữ liệu PACS Callback Simulator
    const [pacsAccessionNumber, setPacsAccessionNumber] = useState("ACC-2026-DX-001");
    const [pacsStudyUid, setPacsStudyUid] = useState("1.2.840.113619.2.55.3.283117822.421.1685412356");

    // Modal xem ảnh PACS
    const [pacsModalOpen, setPacsModalOpen] = useState(false);
    const [activeStudy, setActiveStudy] = useState(null);

    // ==========================================
    // 1. TẢI DỮ LIỆU BAN ĐẦU
    // ==========================================
    const loadAllData = async () => {
        setLoading(true);
        try {
            // Tải Concept Dictionary
            const cRes = await gatewayApi.getConcepts();
            setConcepts(cRes?.data || cRes || []);

            // Tải RIS Worklist
            const wRes = await gatewayApi.getModalityWorklist(selectedModality);
            setWorklist(wRes?.data || wRes || []);

        } catch (err) {
            console.error("Lỗi tải dữ liệu Gateway/EHR:", err);
            setFeedback({ type: "error", message: err.message || "Không thể tải dữ liệu Gateway từ máy chủ." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, [selectedModality]);

    // ==========================================
    // 2. THÊM CONCEPT MỚI (EHR OPENMRS)
    // ==========================================
    const handleCreateConcept = async () => {
        if (!newConcept.conceptName) {
            setFeedback({ type: "warning", message: "Vui lòng nhập tên Concept y tế." });
            return;
        }
        try {
            const payload = {
                ...newConcept,
                lowNormal: newConcept.lowNormal ? Number(newConcept.lowNormal) : null,
                highNormal: newConcept.highNormal ? Number(newConcept.highNormal) : null
            };
            await gatewayApi.createConcept(payload);
            setFeedback({ type: "success", message: `Thêm Concept "${newConcept.conceptName}" thành công!` });
            setOpenAddConcept(false);
            setNewConcept({ conceptName: "", conceptClass: "TEST", dataType: "NUMERIC", units: "", lowNormal: "", highNormal: "", description: "" });
            loadAllData();
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Không thể thêm Concept." });
        }
    };

    // ==========================================
    // 3. MIGRATION TOÀN BỘ BỆNH ÁN CŨ SANG EHR
    // ==========================================
    const handleMigrateToEhr = async () => {
        setLoading(true);
        try {
            const res = await gatewayApi.migrateAllToEhr();
            const count = res?.data || 0;
            setFeedback({ type: "success", message: `Đã chuẩn hóa và chuyển đổi thành công ${count} hồ sơ bệnh án sang mô hình EHR Cấu trúc (OpenMRS & HAPI FHIR)!` });
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi khi chuyển đổi dữ liệu EHR." });
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 4. LIS SIMULATOR: BẮN KẾT QUẢ TỰ ĐỘNG
    // ==========================================
    const handleSendLisResults = async () => {
        if (!lisBarcode) {
            setFeedback({ type: "warning", message: "Vui lòng nhập Mã vạch ống nghiệm." });
            return;
        }
        setLoading(true);
        try {
            const payload = {
                specimenBarcode: lisBarcode,
                analyzerModel: lisAnalyzerModel,
                testResults: lisItems
            };
            const res = await gatewayApi.sendLisMachineResults(payload);
            setFeedback({
                type: "success",
                message: `Cổng LIS Gateway đã tiếp nhận thành công kết quả từ ${lisAnalyzerModel} và tự động đồng bộ sang EHR (MedicalObservation)!`
            });
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi khi gửi kết quả máy xét nghiệm." });
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 5. PACS SIMULATOR: BẮN WEBHOOK DICOM
    // ==========================================
    const handleSendPacsCallback = async () => {
        if (!pacsAccessionNumber || !pacsStudyUid) {
            setFeedback({ type: "warning", message: "Vui lòng nhập Accession Number và Study Instance UID." });
            return;
        }
        setLoading(true);
        try {
            const payload = {
                accessionNumber: pacsAccessionNumber,
                studyInstanceUid: pacsStudyUid,
                seriesCount: 2,
                instancesCount: 45
            };
            const res = await gatewayApi.sendPacsCallback(payload);
            setFeedback({
                type: "success",
                message: `PACS Server đã gắn Study UID thành công! Đã tự động sinh URL OHIF Web Viewer cho bác sĩ.`
            });
            // Tải lại worklist
            const wRes = await gatewayApi.getModalityWorklist(selectedModality);
            setWorklist(wRes?.data || wRes || []);
        } catch (err) {
            setFeedback({ type: "error", message: err.message || "Lỗi khi gửi Webhook từ PACS." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3.5 }}>
            {/* 1. Header Banner Apple HIG */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2.5, md: 3 },
                    mb: 3,
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    background: "linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
                    <Box>
                        <Chip
                            label="TRỤC LIÊN THÔNG CẬN LÂM SÀNG • LIS / RIS / PACS & OPENMRS FHIR"
                            size="small"
                            sx={{
                                height: 22,
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                bgcolor: BRAND_LIGHT,
                                color: BRAND_PRIMARY,
                                mb: 1
                            }}
                        />
                        <Typography
                            variant="h5"
                            fontWeight="800"
                            color="#0F172A"
                            sx={{ letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 1.5 }}
                        >
                            <Box
                                sx={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 2.5,
                                    bgcolor: "#EBF6FE",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid rgba(15, 118, 110, 0.2)"
                                }}
                            >
                                <HubIcon sx={{ color: BRAND_PRIMARY, fontSize: 24 }} />
                            </Box>
                            Cổng Tích Hợp LIS/RIS Gateway & EHR Concept Dictionary
                        </Typography>
                        <Typography variant="body2" color="#64748B" sx={{ mt: 0.5, maxWidth: 780 }}>
                            Kiến trúc Middleware chuẩn y tế: kết nối máy xét nghiệm tự động, máy chẩn đoán hình ảnh DICOM/PACS và từ điển bệnh án điện tử OpenMRS / HL7 FHIR
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={loadAllData}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 700,
                                textTransform: "none",
                                px: 2.5,
                                borderColor: "rgba(15, 23, 42, 0.15)",
                                color: "#334155",
                                "&:hover": { borderColor: BRAND_PRIMARY, bgcolor: "rgba(15, 118, 110, 0.04)" }
                            }}
                        >
                            Làm Mới
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SyncIcon />}
                            onClick={handleMigrateToEhr}
                            sx={{
                                borderRadius: 2.5,
                                fontWeight: 700,
                                textTransform: "none",
                                bgcolor: "#8B5CF6",
                                "&:hover": { bgcolor: "#7C3AED" },
                                px: 2.5,
                                boxShadow: "0 4px 14px rgba(139, 92, 246, 0.25)"
                            }}
                        >
                            Đồng Bộ Bệnh Án Cũ Sang EHR
                        </Button>
                    </Stack>
                </Box>
            </Paper>

            {/* Thông báo Feedback */}
            {feedback.message && (
                <Alert
                    severity={feedback.type || "info"}
                    onClose={() => setFeedback({ type: "", message: "" })}
                    sx={{ mb: 2.5, borderRadius: 2.5 }}
                >
                    {feedback.message}
                </Alert>
            )}

            {/* Tabs Điều Hướng Apple HIG */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3.5,
                    mb: 3,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "#FFFFFF",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    overflow: "hidden"
                }}
            >
                <Tabs
                    value={currentTab}
                    onChange={(e, val) => setCurrentTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        px: 2,
                        minHeight: 52,
                        "& .MuiTab-root": {
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            py: 1.8,
                            textTransform: "none",
                            color: "#64748B",
                            minHeight: 52
                        },
                        "& .Mui-selected": { color: BRAND_PRIMARY },
                        "& .MuiTabs-indicator": { bgcolor: BRAND_PRIMARY, height: 3, borderRadius: "3px 3px 0 0" }
                    }}
                >
                    <Tab icon={<MenuBookIcon sx={{ fontSize: 19 }} />} iconPosition="start" label={`1. Quản Trị Concept Dictionary (${concepts.length})`} />
                    <Tab icon={<ScienceIcon sx={{ fontSize: 19 }} />} iconPosition="start" label="2. Cổng LIS Gateway & Simulator Máy Xét Nghiệm" />
                    <Tab icon={<CameraAltIcon sx={{ fontSize: 19 }} />} iconPosition="start" label={`3. Cổng RIS / PACS & DICOM Worklist (${worklist.length})`} />
                </Tabs>
            </Paper>

            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1, height: 3 }} />}

            {/* ============================================================== */}
            {/* TAB 0: TỪ ĐIỂN KHÁI NIỆM Y TẾ (OPENMRS CONCEPT DICTIONARY)     */}
            {/* ============================================================== */}
            {currentTab === 0 && (
                <Box>
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: 3.5,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="#0F172A">
                                    Từ Điển Khái Niệm Y Tế Chuẩn Hóa (OpenMRS Concept Dictionary)
                                </Typography>
                                <Typography variant="body2" color="#64748B">
                                    Mọi chỉ số lâm sàng và cận lâm sàng đều là một "Concept", cho phép bác sĩ mở rộng chỉ số chuyên khoa động mà không cần sửa cấu trúc Database
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<AddCircleIcon />}
                                onClick={() => setOpenAddConcept(true)}
                                sx={{
                                    borderRadius: 2.5,
                                    fontWeight: 700,
                                    textTransform: "none",
                                    bgcolor: BRAND_PRIMARY,
                                    "&:hover": { bgcolor: "#0070BA" },
                                    px: 2.5,
                                    boxShadow: "0 4px 14px rgba(15, 118, 110, 0.25)"
                                }}
                            >
                                Thêm Concept Mới
                            </Button>
                        </Box>

                        <TableContainer sx={{ maxHeight: 560, borderRadius: 2.5, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 } }}>
                                        <TableCell>UUID MÃ KHÁI NIỆM</TableCell>
                                        <TableCell>TÊN KHÁI NIỆM Y TẾ</TableCell>
                                        <TableCell>PHÂN LỚP (CLASS)</TableCell>
                                        <TableCell>KIỂU DỮ LIỆU</TableCell>
                                        <TableCell>ĐƠN VỊ ĐO</TableCell>
                                        <TableCell>KHOẢNG BÌNH THƯỜNG</TableCell>
                                        <TableCell>MÔ TẢ / Ý NGHĨA</TableCell>
                                        <TableCell align="center">TRẠNG THÁI</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {concepts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#64748B" }}>
                                                <MenuBookIcon sx={{ fontSize: 48, color: "#CBD5E1", mb: 1 }} />
                                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#334155" }}>
                                                    Chưa có Concept y tế nào trong từ điển
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                                    Bấm "Thêm Concept Mới" để thiết lập chỉ số cận lâm sàng đầu tiên.
                                                </Typography>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<AddCircleIcon />}
                                                    onClick={() => setOpenAddConcept(true)}
                                                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                                                >
                                                    Thêm Concept Mới
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        concepts.map((c) => (
                                            <TableRow key={c.conceptId} hover sx={{ "&:hover": { bgcolor: "#F8FAFC" } }}>
                                                <TableCell>
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            fontFamily: "monospace",
                                                            fontSize: "0.78rem",
                                                            fontWeight: 700,
                                                            bgcolor: "#F1F5F9",
                                                            color: "#475569",
                                                            px: 1,
                                                            py: 0.35,
                                                            borderRadius: 1.5,
                                                            display: "inline-block"
                                                        }}
                                                    >
                                                        {c.uuid}
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: BRAND_PRIMARY }}>
                                                    {c.conceptName}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={c.conceptClass}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            fontSize: "0.7rem",
                                                            fontWeight: 800,
                                                            bgcolor: c.conceptClass === "TEST" ? BRAND_LIGHT : c.conceptClass === "FINDING" ? "rgba(139, 92, 246, 0.1)" : "#F1F5F9",
                                                            color: c.conceptClass === "TEST" ? BRAND_PRIMARY : c.conceptClass === "FINDING" ? "#7C3AED" : "#475569"
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>{c.dataType}</TableCell>
                                                <TableCell sx={{ fontSize: "0.82rem", color: "#64748B", fontFamily: "monospace" }}>{c.units || "-"}</TableCell>
                                                <TableCell sx={{ color: "#059669", fontWeight: 700, fontFamily: "monospace", fontSize: "0.82rem" }}>
                                                    {c.lowNormal != null && c.highNormal != null ? `${c.lowNormal} - ${c.highNormal}` : "-"}
                                                </TableCell>
                                                <TableCell sx={{ color: "#64748B", fontSize: "0.82rem" }}>{c.description || "-"}</TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label="HOẠT ĐỘNG"
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: "0.68rem",
                                                            fontWeight: 800,
                                                            bgcolor: "rgba(16, 185, 129, 0.1)",
                                                            color: "#059669",
                                                            border: "1px solid rgba(16, 185, 129, 0.3)"
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            )}

            {/* ============================================================== */}
            {/* TAB 1: CỔNG LIS GATEWAY & SIMULATOR MÁY XÉT NGHIỆM             */}
            {/* ============================================================== */}
            {currentTab === 1 && (
                <Grid container spacing={3}>
                    {/* Panel cấu hình & Simulator Apple HIG */}
                    <Grid item xs={12} md={5}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: 3.5,
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                bgcolor: "#FFFFFF",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                            }}
                        >
                            <Box display="flex" alignItems="center" gap={1.5} mb={2.5}>
                                <Box
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 2.5,
                                        bgcolor: BRAND_LIGHT,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: BRAND_PRIMARY
                                    }}
                                >
                                    <ScienceIcon sx={{ fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight="800" color="#0F172A">
                                        LIS Machine Webhook Simulator
                                    </Typography>
                                    <Typography variant="caption" color="#64748B">
                                        Mô phỏng máy phân tích huyết học / sinh hoá tự động gửi kết quả
                                    </Typography>
                                </Box>
                            </Box>

                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Model Máy Xét Nghiệm"
                                    value={lisAnalyzerModel}
                                    onChange={(e) => setLisAnalyzerModel(e.target.value)}
                                    InputProps={{ sx: { borderRadius: 2 } }}
                                />
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Mã Vạch Ống Nghiệm (Specimen Barcode)"
                                    value={lisBarcode}
                                    onChange={(e) => setLisBarcode(e.target.value)}
                                    helperText="Mã vạch trên tem dán ống nghiệm vừa lấy mẫu"
                                    InputProps={{ sx: { borderRadius: 2, fontFamily: "monospace" } }}
                                />

                                <Typography variant="subtitle2" fontWeight="800" color="#334155" mt={1}>
                                    Dữ Liệu Chỉ Số Máy Vừa Phân Tích:
                                </Typography>
                                {lisItems.map((item, idx) => (
                                    <Box key={idx} p={1.8} sx={{ bgcolor: "#F8FAFC", borderRadius: 2.5, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" fontWeight="700" color="#0F172A">
                                                {item.testCode} - {item.testName}
                                            </Typography>
                                            {item.isAbnormal && (
                                                <Chip
                                                    label="BẤT THƯỜNG"
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: "0.68rem",
                                                        fontWeight: 800,
                                                        bgcolor: "rgba(239, 68, 68, 0.1)",
                                                        color: "#DC2626",
                                                        border: "1px solid rgba(239, 68, 68, 0.3)"
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Box display="flex" gap={2} mt={1}>
                                            <TextField
                                                size="small"
                                                label="Giá trị kết quả"
                                                value={item.resultValue}
                                                onChange={(e) => {
                                                    const updated = [...lisItems];
                                                    updated[idx].resultValue = e.target.value;
                                                    setLisItems(updated);
                                                }}
                                                InputProps={{ sx: { borderRadius: 1.5, fontFamily: "monospace", fontWeight: 700 } }}
                                            />
                                            <TextField
                                                size="small"
                                                label="Đơn vị"
                                                value={item.unit}
                                                disabled
                                                InputProps={{ sx: { borderRadius: 1.5 } }}
                                            />
                                        </Box>
                                    </Box>
                                ))}

                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<SendIcon />}
                                    onClick={handleSendLisResults}
                                    sx={{
                                        py: 1.4,
                                        fontWeight: 800,
                                        borderRadius: 2.5,
                                        textTransform: "none",
                                        bgcolor: BRAND_PRIMARY,
                                        "&:hover": { bgcolor: "#0070BA" },
                                        boxShadow: "0 4px 14px rgba(15, 118, 110, 0.25)"
                                    }}
                                >
                                    Bắn Kết Quả LIS Vào Hệ Thống
                                </Button>
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Sơ đồ kiến trúc LIS Middleware Apple HIG */}
                    <Grid item xs={12} md={7}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: 3.5,
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                bgcolor: "#FFFFFF",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                            }}
                        >
                            <Typography variant="h6" fontWeight="800" color="#0F172A" mb={1.5}>
                                Kiến Trúc Tích Hợp LIS Middleware (Tham khảo Bahmni Core / OpenELIS)
                            </Typography>
                            <Typography variant="body2" color="#64748B" paragraph>
                                1. <strong>Tiếp nhận chỉ định</strong>: Bác sĩ khám ra y lệnh xét nghiệm $\rightarrow$ Kỹ thuật viên LIS dán Barcode lên ống nghiệm.
                            </Typography>
                            <Typography variant="body2" color="#64748B" paragraph>
                                2. <strong>Máy xét nghiệm đọc Barcode</strong>: Máy Sysmex / Roche Cobas quét mã vạch trên khay nạp tự động.
                            </Typography>
                            <Typography variant="body2" color="#64748B" paragraph>
                                3. <strong>Truyền kết quả 2 chiều</strong>: Máy tự động phân tích và bắn thông điệp HL7 v2 / JSON Webhook tới endpoint <code>/api/gateway/lis/results</code>.
                            </Typography>
                            <Typography variant="body2" color="#64748B" paragraph>
                                4. <strong>Tự động ánh xạ sang EHR</strong>: Cổng Gateway tự động phân tích chỉ số, so sánh khoảng tham chiếu và đồng bộ ngay thành một <code>MedicalObservation</code> trong hồ sơ bệnh án điện tử của người bệnh.
                            </Typography>

                            <Box p={2.5} sx={{ bgcolor: "#002B49", borderRadius: 2.5, color: "#38BDF8", fontFamily: "monospace", fontSize: "0.825rem", overflowX: "auto", border: "1px solid rgba(15, 118, 110, 0.3)" }}>
                                {`// Chuẩn Webhook JSON từ máy xét nghiệm máu:
POST /api/gateway/lis/results
{
  "specimenBarcode": "${lisBarcode}",
  "analyzerModel": "${lisAnalyzerModel}",
  "testResults": [
    { "testCode": "WBC", "resultValue": "14.2", "unit": "G/L", "isAbnormal": true }
  ]
}`}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* ============================================================== */}
            {/* TAB 2: CỔNG RIS / PACS & DICOM WORKLIST                        */}
            {/* ============================================================== */}
            {currentTab === 2 && (
                <Box>
                    {/* Bảng Modality Worklist Apple HIG */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: 3.5,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                            mb: 3
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={1.5}>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="#0F172A">
                                    DICOM Modality Worklist (MWL) - Danh Sách Chờ Chụp
                                </Typography>
                                <Typography variant="body2" color="#64748B">
                                    Cung cấp danh sách người bệnh và mã ca chụp (Accession Number) cho máy X-Quang, CT, MRI tự động load thông tin
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Typography variant="body2" fontWeight="700" color="#475569">Lọc theo Modality:</Typography>
                                <TextField
                                    select
                                    size="small"
                                    value={selectedModality}
                                    onChange={(e) => setSelectedModality(e.target.value)}
                                    sx={{ minWidth: 150 }}
                                    InputProps={{ sx: { borderRadius: 2, bgcolor: "#F8FAFC" } }}
                                >
                                    <MenuItem value="DX">X-Quang Số (DX)</MenuItem>
                                    <MenuItem value="CR">X-Quang CR</MenuItem>
                                    <MenuItem value="CT">Cắt Lớp CT</MenuItem>
                                    <MenuItem value="MR">Cộng Hưởng Từ (MR)</MenuItem>
                                    <MenuItem value="US">Siêu Âm (US)</MenuItem>
                                </TextField>
                            </Stack>
                        </Box>

                        <TableContainer sx={{ borderRadius: 2.5, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                    <TableRow sx={{ "& th": { fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", py: 1.5 } }}>
                                        <TableCell>MÃ CA CHỤP (ACCESSION NUMBER)</TableCell>
                                        <TableCell>MODALITY</TableCell>
                                        <TableCell>BỆNH NHÂN</TableCell>
                                        <TableCell>MÃ HỒ SƠ BỆNH ÁN</TableCell>
                                        <TableCell>DỊCH VỤ CHỈ ĐỊNH</TableCell>
                                        <TableCell>STUDY INSTANCE UID (PACS)</TableCell>
                                        <TableCell align="center">HÀNH ĐỘNG</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {worklist.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#64748B" }}>
                                                <CameraAltIcon sx={{ fontSize: 48, color: "#CBD5E1", mb: 1 }} />
                                                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#334155" }}>
                                                    Không có ca chụp nào đang chờ máy {selectedModality}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Danh sách MWL sẽ tự động cập nhật khi có bác sĩ lâm sàng chỉ định chụp cho người bệnh.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        worklist.map((item) => (
                                            <TableRow key={item.testId} hover sx={{ "&:hover": { bgcolor: "#F8FAFC" } }}>
                                                <TableCell>
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            fontFamily: "monospace",
                                                            fontSize: "0.8rem",
                                                            fontWeight: 700,
                                                            bgcolor: BRAND_LIGHT,
                                                            color: BRAND_PRIMARY,
                                                            px: 1,
                                                            py: 0.35,
                                                            borderRadius: 1.5,
                                                            display: "inline-block"
                                                        }}
                                                    >
                                                        {item.accessionNumber}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={item.modality}
                                                        size="small"
                                                        sx={{
                                                            height: 22,
                                                            fontSize: "0.7rem",
                                                            fontWeight: 800,
                                                            bgcolor: BRAND_LIGHT,
                                                            color: BRAND_PRIMARY
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: "#0F172A" }}>{item.patientName}</TableCell>
                                                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#64748B" }}>{item.medicalRecordCode}</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: "#334155" }}>{item.serviceName}</TableCell>
                                                <TableCell>
                                                    {item.studyInstanceUid ? (
                                                        <Typography variant="caption" sx={{ fontFamily: "monospace", bgcolor: "#F1F5F9", px: 1, py: 0.35, borderRadius: 1.5, color: "#475569" }}>
                                                            {item.studyInstanceUid.substring(0, 22) + "..."}
                                                        </Typography>
                                                    ) : (
                                                        <Chip
                                                            label="Chờ Máy Chụp Gửi Về"
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: "0.68rem",
                                                                fontWeight: 700,
                                                                bgcolor: "rgba(245, 158, 11, 0.1)",
                                                                color: "#D97706",
                                                                border: "1px solid rgba(245, 158, 11, 0.3)"
                                                            }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        startIcon={<VisibilityIcon />}
                                                        onClick={() => {
                                                            setActiveStudy(item);
                                                            setPacsModalOpen(true);
                                                        }}
                                                        sx={{
                                                            textTransform: "none",
                                                            fontWeight: 700,
                                                            borderRadius: 2,
                                                            bgcolor: BRAND_PRIMARY,
                                                            "&:hover": { bgcolor: "#0070BA" }
                                                        }}
                                                    >
                                                        Xem Ảnh OHIF Viewer
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Bộ công cụ PACS Webhook Callback Simulator Apple HIG */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            borderRadius: 3.5,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            bgcolor: "#FFFFFF",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                        }}
                    >
                        <Typography variant="h6" fontWeight="800" color="#0F172A" mb={1}>
                            PACS Server (dcm4chee) Webhook Simulator
                        </Typography>
                        <Typography variant="body2" color="#64748B" mb={2.5}>
                            Mô phỏng máy chủ lưu trữ hình ảnh PACS gửi thông báo khi kỹ thuật viên chụp xong và hoàn tất lưu file DICOM
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Accession Number (Mã ca chụp)"
                                    value={pacsAccessionNumber}
                                    onChange={(e) => setPacsAccessionNumber(e.target.value)}
                                    InputProps={{ sx: { borderRadius: 2, fontFamily: "monospace" } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Study Instance UID (Định danh ảnh quốc tế DICOM)"
                                    value={pacsStudyUid}
                                    onChange={(e) => setPacsStudyUid(e.target.value)}
                                    InputProps={{ sx: { borderRadius: 2, fontFamily: "monospace" } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<SendIcon />}
                                    onClick={handleSendPacsCallback}
                                    sx={{
                                        height: 40,
                                        fontWeight: 700,
                                        textTransform: "none",
                                        borderRadius: 2,
                                        bgcolor: "#10B981",
                                        "&:hover": { bgcolor: "#059669" }
                                    }}
                                >
                                    Gửi Webhook PACS
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )}

            {/* ============================================================== */}
            {/* MODAL 1: THÊM CONCEPT MỚI                                      */}
            {/* ============================================================== */}
            <Dialog open={openAddConcept} onClose={() => setOpenAddConcept(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Thêm Concept Y Tế Mới Vào Từ Điển</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2} sx={{ pt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Tên Concept Y Tế"
                                placeholder="Ví dụ: Nhãn áp mắt phải, Nhịp tim thai, Độ mở cổ tử cung..."
                                value={newConcept.conceptName}
                                onChange={(e) => setNewConcept({ ...newConcept, conceptName: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Phân Lớp Concept (Class)"
                                value={newConcept.conceptClass}
                                onChange={(e) => setNewConcept({ ...newConcept, conceptClass: e.target.value })}
                            >
                                <MenuItem value="TEST">TEST (Chỉ số xét nghiệm)</MenuItem>
                                <MenuItem value="FINDING">FINDING (Dấu hiệu sinh tồn / Khám)</MenuItem>
                                <MenuItem value="PROCEDURE">PROCEDURE (Thủ thuật)</MenuItem>
                                <MenuItem value="SYMPTOM">SYMPTOM (Triệu chứng)</MenuItem>
                                <MenuItem value="DIAGNOSIS">DIAGNOSIS (Chẩn đoán)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                select
                                fullWidth
                                label="Kiểu Dữ Liệu"
                                value={newConcept.dataType}
                                onChange={(e) => setNewConcept({ ...newConcept, dataType: e.target.value })}
                            >
                                <MenuItem value="NUMERIC">NUMERIC (Số thực / Định lượng)</MenuItem>
                                <MenuItem value="TEXT">TEXT (Văn bản tự do)</MenuItem>
                                <MenuItem value="CODED">CODED (Danh mục chọn lựa)</MenuItem>
                                <MenuItem value="BOOLEAN">BOOLEAN (Có / Không)</MenuItem>
                                <MenuItem value="DATETIME">DATETIME (Thời gian)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Đơn Vị Đo"
                                placeholder="mmHg, mg/dL..."
                                value={newConcept.units}
                                onChange={(e) => setNewConcept({ ...newConcept, units: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Giới Hạn Dưới (Low)"
                                value={newConcept.lowNormal}
                                onChange={(e) => setNewConcept({ ...newConcept, lowNormal: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Giới Hạn Trên (High)"
                                value={newConcept.highNormal}
                                onChange={(e) => setNewConcept({ ...newConcept, highNormal: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Mô Tả Lâm Sàng"
                                value={newConcept.description}
                                onChange={(e) => setNewConcept({ ...newConcept, description: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenAddConcept(false)} sx={{ fontWeight: 700 }}>Hủy</Button>
                    <Button variant="contained" onClick={handleCreateConcept} sx={{ fontWeight: 700 }}>Lưu Concept</Button>
                </DialogActions>
            </Dialog>

            {/* MODAL XEM ẢNH PACS OHIF VIEWER */}
            {pacsModalOpen && activeStudy && (
                <PacsViewerModal
                    open={pacsModalOpen}
                    onClose={() => setPacsModalOpen(false)}
                    testRecord={{
                        testName: activeStudy.serviceName,
                        serviceName: activeStudy.serviceName,
                        patientName: activeStudy.patientName,
                        accessionNumber: activeStudy.accessionNumber,
                        modality: activeStudy.modality,
                        studyInstanceUid: activeStudy.studyInstanceUid,
                        pacsViewerUrl: activeStudy.pacsViewerUrl
                    }}
                />
            )}
        </Container>
    );
}
