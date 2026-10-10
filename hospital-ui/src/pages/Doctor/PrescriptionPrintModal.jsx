import React, { useState, useRef } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Paper,
    Chip,
    RadioGroup,
    FormControlLabel,
    Radio,
    Stack
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import CloseIcon from "@mui/icons-material/Close";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function PrescriptionPrintModal({ open, onClose, record, prescription }) {
    const printRef = useRef();
    const [pageSize, setPageSize] = useState("A4"); // "A4" or "A5"

    if (!record && !prescription) return null;

    const rxData = prescription || record?.prescription;
    const patientName = record?.patientName || "Bệnh nhân";
    const doctorName = record?.doctorName || "Bác sĩ chuyên khoa";
    const finalDiagnosis = record?.finalDiagnosis || "Khám nội tổng quát";
    const bookingCode = record?.bookingCode || "BK-2026-XXXX";

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const isA5 = pageSize === "A5";
        const pageMargin = isA5 ? "8mm" : "12mm";
        const baseFontSize = isA5 ? "11pt" : "13pt";
        const titleFontSize = isA5 ? "15pt" : "19pt";
        const tableFontSize = isA5 ? "10pt" : "11.5pt";

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Đơn Thuốc Điện Tử - ${bookingCode}</title>
                <style>
                    @page { 
                        size: ${pageSize} portrait; 
                        margin: ${pageMargin}; 
                    }
                    body {
                        font-family: 'Times New Roman', Times, serif;
                        color: #000;
                        background: #fff;
                        margin: 0;
                        padding: 0;
                        font-size: ${baseFontSize};
                        line-height: 1.35;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .header-table { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
                    .header-left { text-align: left; vertical-align: top; width: 55%; }
                    .header-right { text-align: center; vertical-align: top; width: 45%; }
                    .title { text-align: center; font-size: ${titleFontSize}; font-weight: bold; margin: 10px 0 3px 0; text-transform: uppercase; }
                    .subtitle { text-align: center; font-style: italic; font-size: 9.5pt; margin-bottom: 12px; }
                    .info-section { margin-bottom: 10px; font-size: ${baseFontSize}; }
                    .info-row { margin-bottom: 4px; }
                    .med-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    .med-table th, .med-table td { border: 1px solid #222; padding: ${isA5 ? "4px 3px" : "6px 5px"}; font-size: ${tableFontSize}; }
                    .med-table th { background-color: #f2f2f2 !important; text-align: center; font-weight: bold; }
                    .footer-table { width: 100%; margin-top: ${isA5 ? "15px" : "25px"}; border-collapse: collapse; }
                    .footer-cell { text-align: center; vertical-align: top; width: 50%; font-size: ${baseFontSize}; }
                    .signature-space { height: ${isA5 ? "40px" : "55px"}; }
                    .note-box { border: 1px dashed #555; padding: 8px; margin: 10px 0; font-size: ${tableFontSize}; border-radius: 4px; }
                    @media print {
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); };
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ pb: 1.5, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <LocalHospitalIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Bản In Đơn Thuốc Điện Tử Chuẩn Bộ Y Tế
                    </Typography>
                </Box>
                <Button onClick={onClose} color="inherit" size="small" startIcon={<CloseIcon />}>
                    Đóng
                </Button>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2, md: 3 }, bgcolor: "#F8FAFC" }}>
                {/* Page Size Switcher */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} px={1} bgcolor="#ffffff" p={1.5} borderRadius={2} border="1px solid #e2e8f0">
                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        Chọn khổ giấy in:
                    </Typography>
                    <RadioGroup row value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
                        <FormControlLabel value="A4" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Khổ A4 (Tiêu chuẩn)</Typography>} />
                        <FormControlLabel value="A5" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Khổ A5 (Tiết kiệm giấy)</Typography>} />
                    </RadioGroup>
                </Box>

                {/* Printable Canvas */}
                <Paper
                    ref={printRef}
                    elevation={1}
                    sx={{
                        p: { xs: 3, md: 4 },
                        bgcolor: "#FFFFFF",
                        color: "#000000",
                        fontFamily: "'Times New Roman', Times, serif",
                        lineHeight: 1.35,
                        borderRadius: 1,
                        border: "1px solid #e2e8f0"
                    }}
                >
                    {/* Header */}
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
                        <tbody>
                            <tr>
                                <td style={{ verticalAlign: "top", width: "55%" }}>
                                    <div style={{ fontWeight: "bold", fontSize: pageSize === "A5" ? "10pt" : "11.5pt" }}>BỆNH VIỆN ĐA KHOA TNT</div>
                                    <div style={{ fontSize: pageSize === "A5" ? "9pt" : "10pt" }}>Địa chỉ: 141 Chiến Thắng, Thanh Liệt, Hà Nội</div>
                                    <div style={{ fontSize: pageSize === "A5" ? "9pt" : "10pt" }}>Hotline: 1900 8888 • Cấp cứu 24/7</div>
                                    <div style={{ fontSize: pageSize === "A5" ? "9pt" : "10pt" }}>Khoa: Khám Bệnh - Nội Tổng Hợp</div>
                                </td>
                                <td style={{ verticalAlign: "top", textAlign: "center", width: "45%" }}>
                                    <div style={{ fontWeight: "bold", fontSize: pageSize === "A5" ? "9.5pt" : "10.5pt" }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                    <div style={{ fontSize: pageSize === "A5" ? "8.5pt" : "9.5pt", fontStyle: "italic" }}>Độc lập - Tự do - Hạnh phúc</div>
                                    <div style={{ marginTop: 4, fontSize: pageSize === "A5" ? "9pt" : "10pt", fontWeight: "bold" }}>
                                        Mã Đơn: {rxData?.prescriptionCode || "RX-2026-XXXX"}
                                    </div>
                                    <div style={{ fontSize: pageSize === "A5" ? "8.5pt" : "9pt", color: "#444" }}>Mã Khám: {bookingCode}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ textAlign: "center", fontSize: pageSize === "A5" ? "15pt" : "18pt", fontWeight: "bold", textTransform: "uppercase", margin: "10px 0 2px 0" }}>
                        ĐƠN THUỐC ĐIỆN TỬ
                    </div>
                    <div style={{ textAlign: "center", fontStyle: "italic", fontSize: pageSize === "A5" ? "9pt" : "10pt", marginBottom: 12 }}>
                        (Áp dụng cho bệnh nhân điều trị ngoại trú theo quy định của Bộ Y Tế)
                    </div>

                    {/* Patient info */}
                    <div style={{ fontSize: pageSize === "A5" ? "10pt" : "11.5pt", marginBottom: 10 }}>
                        <div style={{ marginBottom: 3 }}>
                            Họ và tên bệnh nhân: <b>{patientName.toUpperCase()}</b> {record?.patientDob ? `(${new Date().getFullYear() - new Date(record.patientDob).getFullYear()} tuổi)` : ""} • SĐT: <b>{record?.patientPhone || "N/A"}</b>
                        </div>
                        <div style={{ marginBottom: 3 }}>
                            Chẩn đoán xác định: <b>{finalDiagnosis}</b>
                        </div>
                        {record?.treatmentPlan && (
                            <div style={{ marginBottom: 3 }}>
                                Hướng điều trị: {record.treatmentPlan}
                            </div>
                        )}
                    </div>

                    {/* Medicine list */}
                    <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f2f2f2" }}>
                                <th style={{ border: "1px solid #333", padding: "5px", width: "30px", textAlign: "center" }}>STT</th>
                                <th style={{ border: "1px solid #333", padding: "5px", textAlign: "left" }}>Tên thuốc & Hoạt chất</th>
                                <th style={{ border: "1px solid #333", padding: "5px", width: "65px", textAlign: "center" }}>Số lượng</th>
                                <th style={{ border: "1px solid #333", padding: "5px", textAlign: "left" }}>Cách dùng & Liều lượng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rxData?.items && rxData.items.length > 0 ? (
                                rxData.items.map((it, idx) => (
                                    <tr key={idx}>
                                        <td style={{ border: "1px solid #333", padding: "5px", textAlign: "center" }}>{idx + 1}</td>
                                        <td style={{ border: "1px solid #333", padding: "5px" }}>
                                            <b>{it.medicineName}</b>
                                            {it.activeIngredient && (
                                                <div style={{ fontSize: pageSize === "A5" ? "8.5pt" : "9.5pt", fontStyle: "italic", color: "#555" }}>
                                                    ({it.activeIngredient})
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ border: "1px solid #333", padding: "5px", textAlign: "center" }}>
                                            <b>{it.quantity}</b> {it.unit || "Viên"}
                                        </td>
                                        <td style={{ border: "1px solid #333", padding: "5px" }}>
                                            {it.dosageInstruction || `Sáng: ${it.morningAmount || 0} • Trưa: ${it.noonAmount || 0} • Chiều: ${it.afternoonAmount || 0} • Tối: ${it.eveningAmount || 0}`}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ border: "1px solid #333", padding: "8px", textAlign: "center" }}>
                                        Chưa có danh mục thuốc kê toa.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Doctor notes */}
                    <div style={{ border: "1px dashed #666", padding: "8px", margin: "10px 0", fontSize: pageSize === "A5" ? "9.5pt" : "10.5pt", borderRadius: 4 }}>
                        <div><b>Lời dặn Bác sĩ:</b> {rxData?.doctorNotes || "Uống thuốc đúng giờ, kiêng nước lạnh, nghỉ ngơi hợp lý."}</div>
                        {record?.reExaminationDate && (
                            <div style={{ marginTop: 3 }}>
                                <b>Ngày hẹn tái khám:</b> {formatDate(record.reExaminationDate)}
                            </div>
                        )}
                        <div style={{ marginTop: 3, fontStyle: "italic", color: "#555" }}>
                            * Khám lại ngay khi có dấu hiệu bất thường hoặc hết thuốc không thuyên giảm.
                        </div>
                    </div>

                    {/* Signatures */}
                    <table style={{ width: "100%", marginTop: pageSize === "A5" ? 15 : 25, borderCollapse: "collapse" }}>
                        <tbody>
                            <tr>
                                <td style={{ textAlign: "center", verticalAlign: "top", width: "50%", fontSize: pageSize === "A5" ? "9.5pt" : "10.5pt" }}>
                                    <div style={{ fontWeight: "bold" }}>DƯỢC SĨ CẤP PHÁT THUỐC</div>
                                    <div style={{ fontStyle: "italic", fontSize: pageSize === "A5" ? "8.5pt" : "9.5pt" }}>(Ký, ghi rõ họ tên)</div>
                                    <div style={{ height: pageSize === "A5" ? 40 : 55 }}></div>
                                    <div>Bộ phận Dược Bệnh viện</div>
                                </td>
                                <td style={{ textAlign: "center", verticalAlign: "top", width: "50%", fontSize: pageSize === "A5" ? "9.5pt" : "10.5pt" }}>
                                    <div style={{ fontStyle: "italic" }}>
                                        Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                                    </div>
                                    <div style={{ fontWeight: "bold", marginTop: 2 }}>BÁC SĨ KHÁM BỆNH</div>
                                    <div style={{ fontStyle: "italic", fontSize: pageSize === "A5" ? "8.5pt" : "9.5pt" }}>(Ký và đóng dấu điện tử)</div>
                                    <div style={{ height: pageSize === "A5" ? 40 : 55, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Chip label="ĐÃ KÝ ĐIỆN TỬ - TNT HOSPITAL" color="primary" size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                                    </div>
                                    <div style={{ fontWeight: "bold" }}>{doctorName}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Paper>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, borderTop: "1px solid #E2E8F0" }}>
                <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
                    Đóng
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PrintIcon />}
                    onClick={handlePrint}
                    sx={{ px: 3, fontWeight: "bold", borderRadius: 2, textTransform: "none" }}
                >
                    In Đơn Thuốc / Xuất PDF ({pageSize})
                </Button>
            </DialogActions>
        </Dialog>
    );
}
