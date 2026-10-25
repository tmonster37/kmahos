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
import AssignmentIcon from "@mui/icons-material/Assignment";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function MedicalRecordPrintModal({ open, onClose, record }) {
    const printRef = useRef();
    const [pageSize, setPageSize] = useState("A4"); // "A4" or "A5"

    if (!record) return null;

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const isA5 = pageSize === "A5";
        const pageMargin = isA5 ? "8mm" : "12mm";
        const baseFontSize = isA5 ? "10.5pt" : "12.5pt";
        const titleFontSize = isA5 ? "14pt" : "18pt";
        const tableFontSize = isA5 ? "9.5pt" : "11pt";

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để in phiếu khám!");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Phiếu Khám Bệnh - ${record.bookingCode}</title>
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
                    .med-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                    .med-table th, .med-table td { border: 1px solid #333; padding: ${isA5 ? "3px 4px" : "5px 6px"}; font-size: ${tableFontSize}; }
                    .med-table th { background-color: #f2f2f2 !important; text-align: center; font-weight: bold; }
                    .title { text-align: center; font-size: ${titleFontSize}; font-weight: bold; margin: 8px 0 2px 0; text-transform: uppercase; }
                    .subtitle { text-align: center; font-style: italic; font-size: 9.5pt; margin-bottom: 10px; }
                    @media print { .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 250);
                    };
                    window.onafterprint = function() { window.close(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            try {
                printWindow.print();
            } catch (e) {
                console.error("Print fallback triggered:", e);
            }
        }, 350);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ pb: 1.5, borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <AssignmentIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Bản In Phiếu Khám Bệnh & Tổng Kết Lâm Sàng
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
                                    <div style={{ fontWeight: "bold", fontSize: pageSize === "A5" ? "10pt" : "11.5pt" }}>BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                                    <div style={{ fontSize: pageSize === "A5" ? "9pt" : "10pt" }}>Địa chỉ: Lô đất CC2, Khu đô thị mới Văn Quán, số 114 Nguyễn Khuyến, phường Văn Quán, quận Hà Đông, Hà Nội</div>
                                    <div style={{ fontSize: pageSize === "A5" ? "9pt" : "10pt" }}>Hotline: 1900 8888 • Cấp cứu 24/7</div>
                                </td>
                                <td style={{ verticalAlign: "top", textAlign: "center", width: "45%" }}>
                                    <div style={{ fontWeight: "bold", fontSize: pageSize === "A5" ? "9.5pt" : "10.5pt" }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                    <div style={{ fontSize: pageSize === "A5" ? "8.5pt" : "9.5pt", fontStyle: "italic" }}>Độc lập - Tự do - Hạnh phúc</div>
                                    <div style={{ marginTop: 4, fontSize: pageSize === "A5" ? "9pt" : "10pt", fontWeight: "bold" }}>
                                        Mã Khám: {record.bookingCode}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ textAlign: "center", fontSize: pageSize === "A5" ? "14pt" : "18pt", fontWeight: "bold", textTransform: "uppercase", margin: "8px 0 2px 0" }}>
                        PHIẾU KHÁM BỆNH VÀ KẾT QUẢ ĐIỀU TRỊ
                    </div>
                    <div style={{ textAlign: "center", fontStyle: "italic", fontSize: pageSize === "A5" ? "9pt" : "10pt", marginBottom: 10 }}>
                        (Trích lục hồ sơ bệnh án khám chữa bệnh ngoại trú)
                    </div>

                    {/* Patient info */}
                    <div style={{ fontSize: pageSize === "A5" ? "10pt" : "11.5pt", marginBottom: 10 }}>
                        <div style={{ marginBottom: 3 }}>
                            1. Họ và tên bệnh nhân: <b>{(record.patientName || "Bệnh nhân").toUpperCase()}</b> • SĐT: <b>{record.patientPhone || "N/A"}</b>
                        </div>
                        <div style={{ marginBottom: 3 }}>
                            2. Lý do khám bệnh / Triệu chứng ban đầu: <i>"{record.symptoms || "Khám sức khỏe tổng quát"}"</i>
                        </div>
                        <div style={{ marginBottom: 3 }}>
                            3. Chẩn đoán sơ bộ: {record.initialDiagnosis || "Chưa xác định"}
                        </div>
                        <div style={{ marginBottom: 3 }}>
                            4. <b>Chẩn đoán xác định (ICD-10):</b> <b style={{ color: "#000" }}>{record.finalDiagnosis || "Khám lâm sàng"}</b>
                        </div>
                        {record.treatmentPlan && (
                            <div style={{ marginBottom: 3 }}>
                                5. <b>Phác đồ điều trị & Lời dặn:</b> {record.treatmentPlan}
                            </div>
                        )}
                        {record.reExaminationDate && (
                            <div style={{ marginBottom: 3 }}>
                                6. <b>Hẹn ngày tái khám:</b> {formatDate(record.reExaminationDate)}
                            </div>
                        )}
                    </div>

                    {/* Tests Section */}
                    {record.tests && record.tests.length > 0 && (
                        <div style={{ marginTop: 8, marginBottom: 8 }}>
                            <div style={{ fontWeight: "bold", fontSize: pageSize === "A5" ? "10pt" : "11pt", marginBottom: 4 }}>
                                KẾT QUẢ CẬN LÂM SÀNG & XÉT NGHIỆM:
                            </div>
                            <table className="med-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "30px" }}>STT</th>
                                        <th style={{ textAlign: "left" }}>Tên chỉ định xét nghiệm / CLS</th>
                                        <th style={{ width: "100px" }}>Trạng thái</th>
                                        <th style={{ textAlign: "left" }}>Kết luận kết quả</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {record.tests.map((t, idx) => (
                                        <tr key={idx}>
                                            <td style={{ textAlign: "center" }}>{idx + 1}</td>
                                            <td>{t.serviceName}</td>
                                            <td style={{ textAlign: "center", fontSize: "9pt" }}>
                                                {t.state === "COMPLETED" ? "Đã có KQ" : "Chờ kết quả"}
                                            </td>
                                            <td>{t.testResult || "Chưa có kết quả"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Prescriptions Section */}
                    {record.prescription && record.prescription.items && record.prescription.items.length > 0 && (
                        <div style={{ marginTop: 8, marginBottom: 8 }}>
                            <div style={{ fontWeight: "bold", fontSize: pageSize === "A5" ? "10pt" : "11pt", marginBottom: 4 }}>
                                ĐƠN THUỐC ĐÃ KÊ (Mã đơn: {record.prescription.prescriptionCode}):
                            </div>
                            <table className="med-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "30px" }}>STT</th>
                                        <th style={{ textAlign: "left" }}>Tên thuốc</th>
                                        <th style={{ width: "65px" }}>Số lượng</th>
                                        <th style={{ textAlign: "left" }}>Cách dùng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {record.prescription.items.map((it, idx) => (
                                        <tr key={idx}>
                                            <td style={{ textAlign: "center" }}>{idx + 1}</td>
                                            <td><b>{it.medicineName}</b></td>
                                            <td style={{ textAlign: "center" }}>{it.quantity} {it.unit}</td>
                                            <td>{it.dosageInstruction || `Sáng ${it.morningAmount} - Trưa ${it.noonAmount} - Chiều ${it.afternoonAmount} - Tối ${it.eveningAmount}`}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Signatures */}
                    <table style={{ width: "100%", marginTop: pageSize === "A5" ? 15 : 25, borderCollapse: "collapse" }}>
                        <tbody>
                            <tr>
                                <td style={{ textAlign: "center", verticalAlign: "top", width: "50%", fontSize: pageSize === "A5" ? "9.5pt" : "10.5pt" }}>
                                    <div style={{ fontWeight: "bold" }}>BỆNH NHÂN / NGƯỜI NHÀ</div>
                                    <div style={{ fontStyle: "italic", fontSize: pageSize === "A5" ? "8.5pt" : "9.5pt" }}>(Ký, ghi rõ họ tên)</div>
                                    <div style={{ height: pageSize === "A5" ? 40 : 55 }}></div>
                                    <div>{record.patientName}</div>
                                </td>
                                <td style={{ textAlign: "center", verticalAlign: "top", width: "50%", fontSize: pageSize === "A5" ? "9.5pt" : "10.5pt" }}>
                                    <div style={{ fontStyle: "italic" }}>
                                        Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                                    </div>
                                    <div style={{ fontWeight: "bold", marginTop: 2 }}>BÁC SĨ KHÁM BỆNH</div>
                                    <div style={{ fontStyle: "italic", fontSize: pageSize === "A5" ? "8.5pt" : "9.5pt" }}>(Ký và đóng dấu điện tử)</div>
                                    <div style={{ height: pageSize === "A5" ? 40 : 55, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <div style={{
                                            display: "inline-block",
                                            border: "1px solid #1976d2",
                                            color: "#1976d2",
                                            borderRadius: "12px",
                                            padding: "2px 8px",
                                            fontSize: "8.5pt",
                                            fontWeight: "bold",
                                            textTransform: "uppercase"
                                        }}>
                                            ĐÃ KÝ ĐIỆN TỬ
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: "bold" }}>{record.doctorName || "Bác sĩ điều trị"}</div>
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
                    In Phiếu Khám / Xuất PDF ({pageSize})
                </Button>
            </DialogActions>
        </Dialog>
    );
}
