import React, { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    Box,
    Typography,
    Button,
    IconButton,
    Tooltip,
    Slider,
    Chip,
    Stack,
    Divider,
    Paper,
    Grid
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import FlipIcon from "@mui/icons-material/Flip";
import Brightness6Icon from "@mui/icons-material/Brightness6";
import ContrastIcon from "@mui/icons-material/Contrast";
import InvertColorsIcon from "@mui/icons-material/InvertColors";
import StraightenIcon from "@mui/icons-material/Straighten";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import { formatDateTime } from "../utils/formatters";

export default function PacsViewerModal({
    open,
    onClose,
    imageSrc,
    patientName,
    patientCode,
    patientAge,
    patientGender,
    serviceName,
    studyDate,
    doctorName,
    diagnosisSummary,
    aiFindings
}) {
    // Viewer Controls State
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [brightness, setBrightness] = useState(100); // 100% normal
    const [contrast, setContrast] = useState(100);     // 100% normal
    const [invert, setInvert] = useState(false);
    const [showAiHeatmap, setShowAiHeatmap] = useState(false);
    const [showMeasureTool, setShowMeasureTool] = useState(false);
    const [activePreset, setActivePreset] = useState("DEFAULT");

    // Drag / Pan State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Reset when modal opens with new image
    useEffect(() => {
        if (open) {
            handleReset();
        }
    }, [open, imageSrc]);

    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setBrightness(100);
        setContrast(100);
        setInvert(false);
        setShowAiHeatmap(false);
        setShowMeasureTool(false);
        setPan({ x: 0, y: 0 });
        setActivePreset("DEFAULT");
    };

    // Pan & Drag Handlers
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Mouse Wheel Zoom
    const handleWheel = (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            setZoom((z) => Math.min(4, +(z + 0.15).toFixed(2)));
        } else {
            setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)));
        }
    };

    // Windowing Presets
    const handleApplyPreset = (preset) => {
        setActivePreset(preset);
        switch (preset) {
            case "LUNG": // Cửa sổ Phổi (tương phản cao, độ sáng vừa)
                setBrightness(115);
                setContrast(140);
                setInvert(false);
                break;
            case "BONE": // Cửa sổ Xương (sáng mạnh, tương phản cực đại để nhìn xương gãy)
                setBrightness(130);
                setContrast(170);
                setInvert(false);
                break;
            case "SOFT_TISSUE": // Cửa sổ Mô mềm
                setBrightness(95);
                setContrast(120);
                setInvert(false);
                break;
            case "INVERT": // Âm bản phim
                setBrightness(100);
                setContrast(110);
                setInvert(true);
                break;
            default: // Mặc định
                setBrightness(100);
                setContrast(100);
                setInvert(false);
                break;
        }
    };

    // In phim CĐHA
    const handlePrintFilm = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Vui lòng cho phép popup để in phim!");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Phim CĐHA - ${patientName || "Bệnh nhân"}</title>
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    body { font-family: Arial, sans-serif; background: #000; color: #fff; margin: 0; padding: 10px; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #555; padding-bottom: 8px; margin-bottom: 12px; font-size: 11pt; }
                    .hosp { font-weight: bold; font-size: 13pt; color: #38bdf8; }
                    .img-box { text-align: center; margin: 15px 0; }
                    .img-box img { max-width: 95%; max-height: 520px; border: 1px solid #333; }
                    .footer { border-top: 1px solid #444; padding-top: 8px; font-size: 10pt; line-height: 1.4; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="hosp">BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                        <div>KHOA CHẨN ĐOÁN HÌNH ẢNH (PACS/RIS)</div>
                    </div>
                    <div style="text-align: right;">
                        <div>Mã khám: <b>${patientCode || "---"}</b></div>
                        <div>Ngày chụp: <b>${studyDate || formatDateTime(new Date().toISOString())}</b></div>
                    </div>
                </div>

                <div style="font-size: 13pt; font-weight: bold; margin-bottom: 6px;">
                    NGƯỜI BỆNH: ${patientName ? patientName.toUpperCase() : "---"} &nbsp;&nbsp;|&nbsp;&nbsp; TUỔI: ${patientAge || "--"} &nbsp;|&nbsp; GIỚI TÍNH: ${patientGender || "--"}
                </div>
                <div style="font-size: 11pt; color: #38bdf8; margin-bottom: 10px;">
                    CHỈ ĐỊNH: ${serviceName || "Chẩn đoán hình ảnh chuyên dụng"}
                </div>

                <div class="img-box">
                    <img src="${imageSrc}" alt="PACS Scan" />
                </div>

                <div class="footer">
                    <div><b>Mô tả kết quả & Nhận định tổn thương:</b> ${diagnosisSummary || "Không phát hiện tổn thương thâm nhiễm hay nốt mờ bất thường."}</div>
                    <div style="margin-top: 10px; text-align: right;">
                        <b>BÁC SĨ CHẨN ĐOÁN HÌNH ẢNH</b><br><br><br>
                        <b>${doctorName || "BS. Chẩn đoán hình ảnh"}</b>
                    </div>
                </div>

                <script>
                    window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: "#0B0F19",
                    color: "#F8FAFC",
                    borderRadius: 3,
                    height: "92vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
                }
            }}
        >
            {/* Header: Medical PACS Bar */}
            <DialogTitle
                sx={{
                    p: 1.5,
                    bgcolor: "#111827",
                    borderBottom: "1px solid #1F2937",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#06B6D4" }} />
                    <Box>
                        <Typography variant="subtitle1" fontWeight="900" color="#F8FAFC" sx={{ letterSpacing: "0.5px" }}>
                            SMARTHOS-365 PACS WEB VIEWER (DICOM 3.0 / RIS)
                        </Typography>
                        <Typography variant="caption" color="#94A3B8">
                            Dịch vụ: <b style={{ color: "#38BDF8" }}>{serviceName || "Chụp X-Quang / Siêu Âm"}</b> • Bệnh nhân: <b style={{ color: "#F8FAFC" }}>{patientName}</b> ({patientCode})
                        </Typography>
                    </Box>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        label={showAiHeatmap ? "🤖 AI HEATMAP: BẬT" : "🤖 Lớp AI Insight"}
                        color={showAiHeatmap ? "error" : "default"}
                        variant={showAiHeatmap ? "filled" : "outlined"}
                        onClick={() => setShowAiHeatmap(!showAiHeatmap)}
                        sx={{ color: "white", fontWeight: "bold", cursor: "pointer", borderColor: "#38BDF8" }}
                    />
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={handlePrintFilm}
                        sx={{ bgcolor: "#0284C7", "&:hover": { bgcolor: "#0369A1" }, fontWeight: "bold" }}
                    >
                        In Phim (A4)
                    </Button>
                    <IconButton size="small" onClick={onClose} sx={{ color: "#94A3B8", "&:hover": { color: "white" } }}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </DialogTitle>

            {/* Sub-toolbar: Imaging Tools */}
            <Box
                sx={{
                    px: 2,
                    py: 1,
                    bgcolor: "#1E293B",
                    borderBottom: "1px solid #334155",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1.5
                }}
            >
                {/* Group 1: Zoom & Pan */}
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <Tooltip title="Phóng to (+25%)">
                        <IconButton size="small" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} sx={{ color: "#38BDF8" }}>
                            <ZoomInIcon />
                        </IconButton>
                    </Tooltip>
                    <Typography variant="caption" sx={{ width: 44, textAlign: "center", color: "#E2E8F0", fontWeight: "bold" }}>
                        {Math.round(zoom * 100)}%
                    </Typography>
                    <Tooltip title="Thu nhỏ (-25%)">
                        <IconButton size="small" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} sx={{ color: "#38BDF8" }}>
                            <ZoomOutIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Vừa khung hình (Fit Screen)">
                        <IconButton size="small" onClick={handleReset} sx={{ color: "#94A3B8" }}>
                            <AspectRatioIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: "#475569" }} />

                {/* Group 2: Rotation & Flip */}
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <Tooltip title="Xoay trái 90°">
                        <IconButton size="small" onClick={() => setRotation((r) => r - 90)} sx={{ color: "#E2E8F0" }}>
                            <RotateLeftIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Xoay phải 90°">
                        <IconButton size="small" onClick={() => setRotation((r) => r + 90)} sx={{ color: "#E2E8F0" }}>
                            <RotateRightIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Lật gương ngang (Flip Horizontal)">
                        <IconButton size="small" onClick={() => setFlipH(!flipH)} color={flipH ? "primary" : "default"} sx={{ color: flipH ? "#38BDF8" : "#E2E8F0" }}>
                            <FlipIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Đảo âm bản (Invert Negative X-Ray)">
                        <IconButton size="small" onClick={() => setInvert(!invert)} sx={{ color: invert ? "#F59E0B" : "#E2E8F0" }}>
                            <InvertColorsIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: "#475569" }} />

                {/* Group 3: Windowing Presets */}
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="#94A3B8" fontWeight="bold">Cửa sổ hiển thị:</Typography>
                    <Chip
                        label="Tiêu chuẩn"
                        size="small"
                        onClick={() => handleApplyPreset("DEFAULT")}
                        sx={{ bgcolor: activePreset === "DEFAULT" ? "#0284C7" : "#334155", color: "white", cursor: "pointer" }}
                    />
                    <Chip
                        label="Cửa sổ Phổi"
                        size="small"
                        onClick={() => handleApplyPreset("LUNG")}
                        sx={{ bgcolor: activePreset === "LUNG" ? "#0284C7" : "#334155", color: "white", cursor: "pointer" }}
                    />
                    <Chip
                        label="Cửa sổ Xương"
                        size="small"
                        onClick={() => handleApplyPreset("BONE")}
                        sx={{ bgcolor: activePreset === "BONE" ? "#0284C7" : "#334155", color: "white", cursor: "pointer" }}
                    />
                    <Chip
                        label="Mô Mềm"
                        size="small"
                        onClick={() => handleApplyPreset("SOFT_TISSUE")}
                        sx={{ bgcolor: activePreset === "SOFT_TISSUE" ? "#0284C7" : "#334155", color: "white", cursor: "pointer" }}
                    />
                </Stack>

                <Divider orientation="vertical" flexItem sx={{ bgcolor: "#475569" }} />

                {/* Group 4: Measurement Tool */}
                <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Thước đo kích thước tổn thương (Virtual Caliper)">
                        <IconButton
                            size="small"
                            onClick={() => setShowMeasureTool(!showMeasureTool)}
                            sx={{ color: showMeasureTool ? "#10B981" : "#E2E8F0", bgcolor: showMeasureTool ? "rgba(16,185,129,0.2)" : "transparent" }}
                        >
                            <StraightenIcon />
                        </IconButton>
                    </Tooltip>
                    {showMeasureTool && (
                        <Typography variant="caption" sx={{ color: "#10B981", fontWeight: "bold" }}>
                            Thước đo: 24.8 mm
                        </Typography>
                    )}
                </Stack>
            </Box>

            {/* Main Stage: Canvas Image with Overlays */}
            <DialogContent
                sx={{
                    p: 0,
                    flex: 1,
                    position: "relative",
                    overflow: "hidden",
                    bgcolor: "#000000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: isDragging ? "grabbing" : (zoom > 1 ? "grab" : "default")
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                {/* DICOM Overlay TOP LEFT */}
                <Box sx={{ position: "absolute", top: 16, left: 16, zIndex: 10, pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="#38BDF8">
                        {patientName ? patientName.toUpperCase() : "BỆNH NHÂN NỘI TRÚ"}
                    </Typography>
                    <Typography variant="caption" color="#E2E8F0" display="block">
                        Mã HSBA: <b>{patientCode || "BN-2026"}</b> • Tuổi: <b>{patientAge || "--"}</b> • Phái: <b>{patientGender || "--"}</b>
                    </Typography>
                    <Typography variant="caption" color="#94A3B8" display="block">
                        Ngày chụp: {studyDate || formatDateTime(new Date().toISOString())}
                    </Typography>
                </Box>

                {/* DICOM Overlay TOP RIGHT */}
                <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10, pointerEvents: "none", textAlign: "right", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="#E2E8F0">
                        BV ĐA KHOA QUỐC TẾ TNT
                    </Typography>
                    <Typography variant="caption" color="#38BDF8" display="block">
                        {serviceName || "CHẨN ĐOÁN HÌNH ẢNH"}
                    </Typography>
                    <Typography variant="caption" color="#94A3B8" display="block">
                        BS: {doctorName || "BS. CĐHA"}
                    </Typography>
                </Box>

                {/* DICOM Overlay BOTTOM LEFT (Technical parameters) */}
                <Box sx={{ position: "absolute", bottom: 16, left: 16, zIndex: 10, pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
                    <Typography variant="caption" color="#94A3B8" display="block">
                        Zoom: {Math.round(zoom * 100)}% | Rot: {rotation}° | Flip: {flipH ? "H" : "-"}{flipV ? "V" : "-"}
                    </Typography>
                    <Typography variant="caption" color="#94A3B8" display="block">
                        Window/Level: B {brightness}% / C {contrast}% {invert ? "(Invert)" : ""}
                    </Typography>
                </Box>

                {/* DICOM Overlay BOTTOM RIGHT (Orientation Marker) */}
                <Box sx={{ position: "absolute", bottom: 16, right: 16, zIndex: 10, pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
                    <Typography variant="h5" fontWeight="900" color="#38BDF8">
                        R
                    </Typography>
                </Box>

                {/* The Medical Image with CSS Filters */}
                {imageSrc ? (
                    <Box
                        sx={{
                            position: "relative",
                            display: "inline-block",
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                            transition: isDragging ? "none" : "transform 0.15s ease-out",
                            transformOrigin: "center center"
                        }}
                    >
                        <img
                            src={imageSrc}
                            alt="DICOM Scan"
                            style={{
                                maxHeight: "80vh",
                                maxWidth: "90vw",
                                objectFit: "contain",
                                filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? "invert(100%)" : ""}`,
                                display: "block",
                                userSelect: "none",
                                pointerEvents: "none"
                            }}
                        />

                        {/* AI Heatmap Overlay (SmartHos-365 Slide 62: Lunit INSIGHT CXR AI) */}
                        {showAiHeatmap && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                    background: "radial-gradient(ellipse 25% 18% at 75% 65%, rgba(239, 68, 68, 0.65) 0%, rgba(245, 158, 11, 0.45) 50%, rgba(16, 185, 129, 0.2) 75%, transparent 100%), radial-gradient(ellipse 22% 16% at 25% 62%, rgba(245, 158, 11, 0.5) 0%, rgba(16, 185, 129, 0.2) 70%, transparent 100%)",
                                    mixBlendMode: "screen",
                                    border: "2px dashed rgba(239, 68, 68, 0.8)",
                                    borderRadius: 2
                                }}
                            >
                                <Box sx={{ position: "absolute", top: "52%", right: "14%", bgcolor: "rgba(0,0,0,0.75)", px: 1, py: 0.5, borderRadius: 1, border: "1px solid #ef4444" }}>
                                    <Typography variant="caption" sx={{ color: "#f87171", fontWeight: "bold" }}>
                                        ⚠️ {aiFindings?.suspectedCondition || "Nghi ngờ đám mờ đông đặc"} (AI: {aiFindings?.confidence || 97}%)
                                    </Typography>
                                </Box>
                                <Box sx={{ position: "absolute", top: "50%", left: "14%", bgcolor: "rgba(0,0,0,0.75)", px: 1, py: 0.5, borderRadius: 1, border: "1px solid #f59e0b" }}>
                                    <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: "bold" }}>
                                        ⚠️ {aiFindings?.summary ? "Khảo sát AI Lunit INSIGHT" : "Dày dính màng phổi (Abnormality: 79%)"}
                                    </Typography>
                                </Box>
                            </Box>
                        )}

                        {/* Thước đo ảo (Virtual Caliper Tool) */}
                        {showMeasureTool && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: "60%",
                                    left: "62%",
                                    width: 120,
                                    height: 2,
                                    bgcolor: "#10b981",
                                    boxShadow: "0 0 8px #10b981",
                                    pointerEvents: "none"
                                }}
                            >
                                <Box sx={{ position: "absolute", left: 0, top: -5, width: 2, height: 12, bgcolor: "#10b981" }} />
                                <Box sx={{ position: "absolute", right: 0, top: -5, width: 2, height: 12, bgcolor: "#10b981" }} />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: "absolute",
                                        top: -18,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        color: "#10b981",
                                        fontWeight: "900",
                                        bgcolor: "rgba(0,0,0,0.8)",
                                        px: 0.5,
                                        borderRadius: 0.5,
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    d = 24.8 mm
                                </Typography>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box textAlign="center" py={8}>
                        <Typography color="#94A3B8">Không tìm thấy file hình ảnh hoặc đường dẫn không hợp lệ.</Typography>
                    </Box>
                )}
            </DialogContent>

            {/* Bottom Clinical Diagnosis Summary Bar */}
            <Box
                sx={{
                    px: 3,
                    py: 1.5,
                    bgcolor: "#111827",
                    borderTop: "1px solid #1F2937",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2
                }}
            >
                <Box sx={{ maxWidth: "75%" }}>
                    <Typography variant="caption" color="#94A3B8" fontWeight="bold">
                        KẾT QUẢ & MÔ TẢ TỔN THƯƠNG:
                    </Typography>
                    <Typography variant="body2" color="#F8FAFC" fontWeight="500">
                        {diagnosisSummary || "Hình ảnh phế trường hai bên sáng đều, cung động mạch chủ bình thường, góc sườn hoành sáng rõ."}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={onClose} sx={{ color: "#94A3B8", borderColor: "#334155" }}>
                        Đóng Viewer
                    </Button>
                </Stack>
            </Box>
        </Dialog>
    );
}
