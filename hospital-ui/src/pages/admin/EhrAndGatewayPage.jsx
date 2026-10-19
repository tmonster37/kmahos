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
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header Tiêu Đề */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: "#0088D6", display: "flex", alignItems: "center", gap: 1 }}>
                        <HubIcon sx={{ fontSize: 28, color: "#0088D6" }} /> Cổng Tích Hợp LIS/RIS Gateway & EHR Concept Dictionary
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
                        Kiến trúc Middleware tích hợp máy cận lâm sàng & Bệnh án điện tử cấu trúc theo chuẩn OpenMRS & HAPI FHIR
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadAllData}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                        Làm Mới
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<SyncIcon />}
                        onClick={handleMigrateToEhr}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                    >
                        Đồng Bộ Bệnh Án Cũ Sang EHR
                    </Button>
                </Stack>
            </Box>

            {/* Thông báo Feedback */}
            {feedback.message && (
                <Alert
                    severity={feedback.type || "info"}
                    onClose={() => setFeedback({ type: "", message: "" })}
                    sx={{ mb: 2.5, borderRadius: 2 }}
                >
                    {feedback.message}
                </Alert>
            )}

            {/* Tabs Điều Hướng */}
            <Paper elevation={0} sx={{ borderRadius: 3, mb: 3, border: "1px solid #E2E8F0" }}>
                <Tabs
                    value={currentTab}
                    onChange={(e, val) => setCurrentTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        px: 2,
                        "& .MuiTab-root": { fontWeight: 700, fontSize: "0.9rem", py: 2, textTransform: "none" },
                        "& .Mui-selected": { color: "#0284C7" }
                    }}
                >
                    <Tab icon={<MenuBookIcon />} iconPosition="start" label={`1. Quản Trị Concept Dictionary (${concepts.length})`} />
                    <Tab icon={<ScienceIcon />} iconPosition="start" label="2. Cổng LIS Gateway & Simulator Máy Xét Nghiệm" />
                    <Tab icon={<CameraAltIcon />} iconPosition="start" label={`3. Cổng RIS / PACS & DICOM Worklist (${worklist.length})`} />
                </Tabs>
            </Paper>

            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {/* ============================================================== */}
            {/* TAB 0: TỪ ĐIỂN KHÁI NIỆM Y TẾ (OPENMRS CONCEPT DICTIONARY)     */}
            {/* ============================================================== */}
            {currentTab === 0 && (
                <Box>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1.5}>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="#1E293B">
                                    Từ Điển Khái Niệm Y Tế Chuẩn Hóa (OpenMRS Concept Dictionary)
                                </Typography>
                                <Typography variant="caption" color="#64748B">
                                    Mọi chỉ số lâm sàng và cận lâm sàng đều là một "Concept", cho phép bác sĩ mở rộng chỉ số chuyên khoa động mà không sửa Database
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<AddCircleIcon />}
                                onClick={() => setOpenAddConcept(true)}
                                sx={{ borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                            >
                                Thêm Concept Mới
                            </Button>
                        </Box>

                        <TableContainer sx={{ maxHeight: 540 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 800, color: "#334155" } }}>
                                        <TableCell>UUID Mã Khái Niệm</TableCell>
                                        <TableCell>Tên Khái Niệm Y Tế</TableCell>
                                        <TableCell>Phân Lớp (Class)</TableCell>
                                        <TableCell>Kiểu Dữ Liệu</TableCell>
                                        <TableCell>Đơn Vị Đo</TableCell>
                                        <TableCell>Khoảng Bình Thường</TableCell>
                                        <TableCell>Mô Tả / Ý Nghĩa</TableCell>
                                        <TableCell align="center">Trạng Thái</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {concepts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ py: 6, color: "#64748B" }}>
                                                <MenuBookIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
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
                                                    sx={{ borderRadius: 2 }}
                                                >
                                                    Thêm Concept Mới
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        concepts.map((c) => (
                                            <TableRow key={c.conceptId} hover>
                                                <TableCell>
                                                    <Chip label={c.uuid} size="small" variant="outlined" sx={{ fontWeight: 800 }} />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: "#0088D6" }}>
                                                    {c.conceptName}
                                                </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={c.conceptClass}
                                                    size="small"
                                                    color={c.conceptClass === "TEST" ? "info" : c.conceptClass === "FINDING" ? "primary" : "default"}
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>{c.dataType}</TableCell>
                                            <TableCell>{c.units || "-"}</TableCell>
                                            <TableCell sx={{ color: "#059669", fontWeight: 700 }}>
                                                {c.lowNormal != null && c.highNormal != null ? `${c.lowNormal} - ${c.highNormal}` : "-"}
                                            </TableCell>
                                            <TableCell sx={{ color: "#64748B" }}>{c.description || "-"}</TableCell>
                                            <TableCell align="center">
                                                <Chip label="ACTIVE" size="small" color="success" sx={{ fontWeight: 800 }} />
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
                    {/* Panel cấu hình & Simulator */}
                    <Grid item xs={12} md={5}>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                            <Box display="flex" alignItems="center" gap={1.2} mb={2}>
                                <ScienceIcon sx={{ color: "#0284C7", fontSize: 26 }} />
                                <Box>
                                    <Typography variant="h6" fontWeight="800" color="#1E293B">
                                        LIS Machine Webhook Simulator
                                    </Typography>
                                    <Typography variant="caption" color="#64748B">
                                        Mô phỏng máy xét nghiệm tự động gửi kết quả phân tích qua Webhook
                                    </Typography>
                                </Box>
                            </Box>

                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Model Máy Xét Nghiệm"
                                    value={lisAnalyzerModel}
                                    onChange={(e) => setLisAnalyzerModel(e.target.value)}
                                />
                                <TextField
                                    fullWidth
                                    label="Mã Vạch Ống Nghiệm (Specimen Barcode)"
                                    value={lisBarcode}
                                    onChange={(e) => setLisBarcode(e.target.value)}
                                    helperText="Mã vạch trên tem dán ống nghiệm vừa lấy mẫu"
                                />

                                <Typography variant="subtitle2" fontWeight="800" color="#334155" mt={1}>
                                    Dữ Liệu Chỉ Số Máy Vừa Đo:
                                </Typography>
                                {lisItems.map((item, idx) => (
                                    <Box key={idx} p={1.5} sx={{ bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" fontWeight="700">
                                                {item.testCode} - {item.testName}
                                            </Typography>
                                            {item.isAbnormal && (
                                                <Chip label="BẤT THƯỜNG" size="small" color="error" sx={{ fontWeight: 800 }} />
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
                                            />
                                            <TextField
                                                size="small"
                                                label="Đơn vị"
                                                value={item.unit}
                                                disabled
                                            />
                                        </Box>
                                    </Box>
                                ))}

                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SendIcon />}
                                    onClick={handleSendLisResults}
                                    sx={{
                                        py: 1.2,
                                        fontWeight: 800,
                                        borderRadius: 2,
                                        background: "linear-gradient(135deg, #0284C7 0%, #0D9488 100%)",
                                        boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)"
                                    }}
                                >
                                    Bắn Kết Quả LIS Vào Hệ Thống
                                </Button>
                            </Stack>
                        </Paper>
                    </Grid>

                    {/* Sơ đồ kiến trúc LIS Middleware */}
                    <Grid item xs={12} md={7}>
                        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
                            <Typography variant="h6" fontWeight="800" color="#1E293B" mb={1.5}>
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

                            <Box p={2} sx={{ bgcolor: "#0F172A", borderRadius: 2, color: "#38BDF8", fontFamily: "monospace", fontSize: "0.825rem", overflowX: "auto" }}>
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
                    {/* Bảng Modality Worklist */}
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", mb: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1.5}>
                            <Box>
                                <Typography variant="h6" fontWeight="800" color="#1E293B">
                                    DICOM Modality Worklist (MWL) - Danh Sách Chờ Chụp
                                </Typography>
                                <Typography variant="caption" color="#64748B">
                                    Cung cấp danh sách người bệnh và mã ca chụp (Accession Number) cho máy X-Quang, CT, MRI tự động load thông tin
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Typography variant="body2" fontWeight="700">Lọc theo Modality:</Typography>
                                <TextField
                                    select
                                    size="small"
                                    value={selectedModality}
                                    onChange={(e) => setSelectedModality(e.target.value)}
                                    sx={{ minWidth: 140 }}
                                >
                                    <MenuItem value="DX">X-Quang Số (DX)</MenuItem>
                                    <MenuItem value="CR">X-Quang CR</MenuItem>
                                    <MenuItem value="CT">Cắt Lớp CT</MenuItem>
                                    <MenuItem value="MR">Cộng Hưởng Từ (MR)</MenuItem>
                                    <MenuItem value="US">Siêu Âm (US)</MenuItem>
                                </TextField>
                            </Stack>
                        </Box>

                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ "& th": { bgcolor: "#F8FAFC", fontWeight: 800, color: "#334155" } }}>
                                        <TableCell>Mã Ca Chụp (Accession Number)</TableCell>
                                        <TableCell>Modality</TableCell>
                                        <TableCell>Bệnh Nhân</TableCell>
                                        <TableCell>Mã Hồ Sơ Bệnh Án</TableCell>
                                        <TableCell>Dịch Vụ Chỉ Định</TableCell>
                                        <TableCell>Study Instance UID (PACS)</TableCell>
                                        <TableCell align="center">Hành Động</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {worklist.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#64748B" }}>
                                                <CameraAltIcon sx={{ fontSize: 44, color: "#94A3B8", mb: 1 }} />
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
                                            <TableRow key={item.testId} hover>
                                                <TableCell sx={{ fontWeight: 800, color: "#0284C7" }}>
                                                    {item.accessionNumber}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={item.modality} size="small" color="primary" sx={{ fontWeight: 800 }} />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{item.patientName}</TableCell>
                                                <TableCell>{item.medicalRecordCode}</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{item.serviceName}</TableCell>
                                                <TableCell>
                                                    {item.studyInstanceUid ? (
                                                        <Chip label={item.studyInstanceUid.substring(0, 22) + "..."} size="small" variant="outlined" />
                                                    ) : (
                                                        <Chip label="Chờ Máy Chụp Gửi Về" size="small" color="warning" />
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="info"
                                                        startIcon={<VisibilityIcon />}
                                                        onClick={() => {
                                                            setActiveStudy(item);
                                                            setPacsModalOpen(true);
                                                        }}
                                                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
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

                    {/* Bộ công cụ PACS Webhook Callback Simulator */}
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0" }}>
                        <Typography variant="h6" fontWeight="800" color="#1E293B" mb={1.5}>
                            PACS Server (dcm4chee) Webhook Simulator
                        </Typography>
                        <Typography variant="body2" color="#64748B" mb={2}>
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
                                />
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Study Instance UID (Định danh ảnh quốc tế DICOM)"
                                    value={pacsStudyUid}
                                    onChange={(e) => setPacsStudyUid(e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="success"
                                    startIcon={<SendIcon />}
                                    onClick={handleSendPacsCallback}
                                    sx={{ height: 40, fontWeight: 700, textTransform: "none" }}
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
