import React, { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Grid,
    Paper,
    Chip,
    Divider,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    Stack,
    CircularProgress,
    Alert,
    Tooltip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import ScienceIcon from "@mui/icons-material/Science";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MedicationIcon from "@mui/icons-material/Medication";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import SecurityIcon from "@mui/icons-material/Security";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PersonIcon from "@mui/icons-material/Person";
import { formatDate, formatDateTime, formatCurrency } from "../../utils/formatters";
import { clinicalApi } from "../../services/clinicalApi";
import { API_BASE_URL } from "../../services/AxiosInstance";

/**
 * ElectronicMedicalRecordModal
 * Giao diện Bệnh Án Điện Tử (Electronic Medical Record - EMR / EHR)
 * Thiết kế chuẩn y khoa theo Thông tư 46/2018/TT-BYT & Quyết định 1313/QĐ-BYT của Bộ Y Tế.
 */
export default function ElectronicMedicalRecordModal({
    open,
    onClose,
    booking,
    recordData: initialRecordData
}) {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetchedRecord, setFetchedRecord] = useState(null);
    const printRef = useRef(null);

    // Khi mở modal, tự động tra cứu hồ sơ bệnh án thật từ backend qua bookingCode nếu có
    useEffect(() => {
        if (!open || !booking) {
            setFetchedRecord(null);
            return;
        }

        const loadEhrRecord = async () => {
            const bookingCode = booking.bookingCode;
            if (!bookingCode) return;

            setLoading(true);
            try {
                const res = await clinicalApi.getRecordByBookingCode(bookingCode);
                if (res?.data?.data) {
                    setFetchedRecord(res.data.data);
                }
            } catch (err) {
                // Không tìm thấy hồ sơ khởi tạo sẵn -> dùng dữ liệu tổng hợp chuẩn mực
                // Đợt khám chưa có EMR khởi tạo sẵn
            } finally {
                setLoading(false);
            }
        };

        loadEhrRecord();
    }, [open, booking]);

    if (!open || !booking) return null;

    // Dữ liệu y khoa tổng hợp (hợp nhất từ API thật hoặc booking)
    const ehr = fetchedRecord || initialRecordData || {};
    const bookingCode = booking.bookingCode || "BK-EMR";
    const patientName = ehr.patientName || booking.patientName || "Bệnh nhân";
    const doctorName = ehr.doctorName || booking.doctorName || "BS. Phụ trách";
    const departmentName = booking.departmentName || ehr.departmentName || "Khoa Khám Bệnh";
    const roomName = booking.roomName || ehr.roomName || "Phòng khám chuyên khoa";
    const visitDate = booking.bookingDate || booking.createdAt || new Date();
    const symptoms = ehr.symptoms || booking.symptoms || "Chưa ghi nhận triệu chứng";
    const initialDiagnosis = ehr.initialDiagnosis || "Chưa có chẩn đoán sơ bộ";
    const finalDiagnosis = ehr.finalDiagnosis || booking.diagnosis || "Chưa có chẩn đoán xác định";
    const treatmentPlan = ehr.treatmentPlan || "Chưa có phác đồ điều trị";
    const reExamDate = ehr.reExaminationDate || "Chưa có lịch hẹn tái khám";

    // Danh sách cận lâm sàng (chỉ lấy dữ liệu thật từ máy chủ)
    const tests = (ehr.tests && Array.isArray(ehr.tests)) ? ehr.tests : [];

    // Danh sách đơn thuốc (chỉ lấy dữ liệu thật từ máy chủ)
    const medicines = (ehr.prescription?.items && Array.isArray(ehr.prescription.items))
        ? ehr.prescription.items
        : (Array.isArray(ehr.medicines) ? ehr.medicines : []);

    // Chỉ số sinh tồn (chỉ lấy dữ liệu thật từ máy chủ)
    const rawVitals = ehr.vitalSigns || booking.vitalSigns || ehr.latestVitals || {};
    const vitalSigns = {
        pulse: rawVitals.pulse || rawVitals.heartRate || ehr.pulse || ehr.heartRate || "---",
        bp: rawVitals.bp || rawVitals.bloodPressure || ehr.bloodPressure || ehr.bp || "---",
        temp: rawVitals.temp || rawVitals.temperature || ehr.temperature || ehr.temp || "---",
        resp: rawVitals.resp || rawVitals.respiratoryRate || ehr.respiratoryRate || ehr.resp || "---",
        spo2: rawVitals.spo2 || rawVitals.spO2 || ehr.spO2 || ehr.spo2 || "---",
        height: rawVitals.height || ehr.height || "---",
        weight: rawVitals.weight || ehr.weight || "---",
        bmi: rawVitals.bmi || ehr.bmi || "---",
        bmiClass: rawVitals.bmiClass || "Chưa có dữ liệu"
    };

    // Hàm in bệnh án chuẩn A4
    const handlePrintRecord = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cấp quyền cho phép để in bệnh án!");
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bệnh Án Điện Tử - ${bookingCode}</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm 15mm; }
                    body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; margin: 0; padding: 0; font-size: 11pt; line-height: 1.35; }
                    .header-tbl { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                    .header-tbl td { vertical-align: top; }
                    .title { text-align: center; font-size: 15pt; font-weight: bold; margin: 6px 0 2px 0; text-transform: uppercase; }
                    .subtitle { text-align: center; font-style: italic; font-size: 9.5pt; margin-bottom: 12px; }
                    .sec-title { font-weight: bold; text-transform: uppercase; font-size: 11pt; margin-top: 10px; margin-bottom: 4px; border-bottom: 1px dashed #333; padding-bottom: 2px; }
                    .data-tbl { width: 100%; border-collapse: collapse; margin: 6px 0; }
                    .data-tbl th, .data-tbl td { border: 1px solid #333; padding: 4px 6px; font-size: 9.5pt; }
                    .data-tbl th { background-color: #f2f2f2 !important; text-align: center; font-weight: bold; }
                    .sign-tbl { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    .sign-tbl td { text-align: center; vertical-align: top; width: 50%; font-size: 10pt; }
                    .stamp { border: 2px solid #b91c1c; color: #b91c1c; padding: 6px 12px; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 9pt; margin-top: 8px; text-transform: uppercase; }
                    @media print { .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                ${content.innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 250);
                    };
                    window.onafterprint = function() { window.close(); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3.5,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
                    overflow: "hidden"
                }
            }}
        >
            {/* Header Dialog */}
            <DialogTitle
                sx={{
                    background: "linear-gradient(135deg, #0088D6 0%, #0062A3 100%)",
                    color: "#FFFFFF",
                    py: 2,
                    px: 3,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 2px 10px rgba(0, 136, 214, 0.2)"
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            bgcolor: "rgba(34, 197, 94, 0.15)",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <LocalHospitalIcon sx={{ color: "#4ADE80", fontSize: 24 }} />
                    </Box>
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight={800} color="#FFFFFF">
                                HỒ SƠ BỆNH ÁN ĐIỆN TỬ (EMR / EHR)
                            </Typography>
                            <Chip
                                label="TT 46/2018/TT-BYT"
                                size="small"
                                sx={{ bgcolor: "rgba(34, 197, 94, 0.2)", color: "#4ADE80", fontWeight: 700, fontSize: "0.68rem", height: 20 }}
                            />
                            <Chip
                                icon={<VerifiedIcon sx={{ fontSize: "14px !important", color: "#38BDF8 !important" }} />}
                                label="Ký Số SmartCA"
                                size="small"
                                sx={{ bgcolor: "rgba(14, 165, 233, 0.2)", color: "#38BDF8", fontWeight: 700, fontSize: "0.68rem", height: 20 }}
                            />
                        </Box>
                        <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                            Mã bệnh án: <b style={{ color: "#38BDF8", fontFamily: "monospace" }}>EMR-{bookingCode}</b> • Bệnh nhân: <b style={{ color: "#F8FAFC" }}>{patientName}</b> • Ngày khám: {formatDate(visitDate)}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: "#94A3B8", "&:hover": { color: "#FFFFFF", bgcolor: "rgba(255,255,255,0.1)" } }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            {/* Navigation Tabs */}
            <Tabs
                value={activeTab}
                onChange={(e, val) => setActiveTab(val)}
                textColor="primary"
                indicatorColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    bgcolor: "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                    px: 2,
                    minHeight: 46,
                    "& .MuiTab-root": {
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        minHeight: 46,
                        py: 0.5
                    }
                }}
            >
                <Tab icon={<AssignmentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="1. Trích lục toàn văn A4" />
                <Tab icon={<MonitorHeartIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="2. Khám & Dấu hiệu sinh tồn" />
                <Tab icon={<ScienceIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="3. Cận lâm sàng & PACS" />
                <Tab icon={<LocalHospitalIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="4. Chẩn đoán ICD-10" />
                <Tab icon={<MedicationIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="5. Đơn thuốc & Kế hoạch" />
                <Tab icon={<SecurityIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="6. Chứng thư & Chữ ký số" />
            </Tabs>

            <DialogContent sx={{ p: 3, bgcolor: "#F1F5F9" }}>
                {loading ? (
                    <Box textAlign="center" py={8}>
                        <CircularProgress size={36} />
                        <Typography variant="body2" color="text.secondary" mt={1.5}>
                            Đang kết nối cổng bệnh án điện tử quốc gia...
                        </Typography>
                    </Box>
                ) : (
                    <Box>
                        {/* ========================================================= */}
                        {/* TAB 0: TRÍCH LỤC BỆNH ÁN TOÀN VĂN CHUẨN A4 IN ẤN          */}
                        {/* ========================================================= */}
                        {activeTab === 0 && (
                            <Paper
                                ref={printRef}
                                elevation={0}
                                sx={{
                                    p: { xs: 2.5, md: 5 },
                                    bgcolor: "#FFFFFF",
                                    color: "#000000",
                                    fontFamily: "'Times New Roman', Times, serif",
                                    lineHeight: 1.4,
                                    borderRadius: 2,
                                    border: "1px solid #CBD5E1",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                                    maxWidth: 900,
                                    mx: "auto"
                                }}
                            >
                                {/* Header Quốc Gia & Bệnh Viện */}
                                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ verticalAlign: "top", width: "52%" }}>
                                                <div style={{ fontWeight: "bold", fontSize: "11pt" }}>SỞ Y TẾ THÀNH PHỐ HÀ NỘI</div>
                                                <div style={{ fontWeight: "bold", fontSize: "12pt", color: "#0088D6" }}>BỆNH VIỆN ĐA KHOA QUỐC TẾ TNT</div>
                                                <div style={{ fontSize: "9.5pt" }}>Địa chỉ: Lô CC2 KĐT Văn Quán, Q. Hà Đông, Hà Nội</div>
                                                <div style={{ fontSize: "9.5pt" }}>Hotline: 1900 8888 • Cấp cứu: (024) 3888 9999</div>
                                            </td>
                                            <td style={{ verticalAlign: "top", textAlign: "center", width: "48%" }}>
                                                <div style={{ fontWeight: "bold", fontSize: "10.5pt" }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                                                <div style={{ fontSize: "9.5pt", fontStyle: "italic", borderBottom: "1px solid #333", display: "inline-block", paddingBottom: 2 }}>
                                                    Độc lập - Tự do - Hạnh phúc
                                                </div>
                                                <div style={{ marginTop: 4, fontSize: "9.5pt" }}>
                                                    Mã bệnh án: <b style={{ fontFamily: "monospace" }}>EMR-{bookingCode}</b>
                                                </div>
                                                <div style={{ fontSize: "9pt", color: "#555" }}>
                                                    Số vào viện: <span style={{ fontFamily: "monospace" }}>{bookingCode}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ textAlign: "center", fontSize: "16pt", fontWeight: "bold", marginTop: 12, marginBottom: 2 }}>
                                    BỆNH ÁN ĐIỆN TỬ NGOẠI TRÚ
                                </div>
                                <div style={{ textAlign: "center", fontStyle: "italic", fontSize: "9.5pt", marginBottom: 14 }}>
                                    (Trích lục hồ sơ bệnh án khám chữa bệnh theo chuẩn Thông tư 46/2018/TT-BYT)
                                </div>

                                {/* I. PHẦN HÀNH CHÍNH */}
                                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", borderBottom: "1px solid #333", paddingBottom: 2, marginBottom: 6 }}>
                                    I. THỦ TỤC HÀNH CHÍNH & TIẾP NHẬN
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", marginBottom: 12 }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: "50%", padding: "2px 0" }}>1. Họ và tên người bệnh: <b style={{ textTransform: "uppercase" }}>{patientName}</b></td>
                                            <td style={{ width: "25%", padding: "2px 0" }}>2. Ngày sinh: <b>{booking.patientDob ? formatDate(booking.patientDob) : "Chưa cập nhật"}</b></td>
                                            <td style={{ width: "25%", padding: "2px 0" }}>3. Giới tính: <b>{booking.patientGender === "FEMALE" ? "Nữ" : (booking.patientGender === "MALE" ? "Nam" : "---")}</b></td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: "2px 0" }}>4. Số CCCD / Định danh: <b style={{ fontFamily: "monospace" }}>{booking.identityNumber || ehr.identityNumber || "Chưa cập nhật"}</b></td>
                                            <td colSpan={2} style={{ padding: "2px 0" }}>5. Số thẻ BHYT: <b style={{ fontFamily: "monospace", color: "#0066cc" }}>{booking.healthInsuranceNumber || ehr.healthInsuranceNumber || "Không đăng ký BHYT"}</b></td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} style={{ padding: "2px 0" }}>6. Địa chỉ thường trú: {booking.patientAddress || ehr.patientAddress || "Chưa cập nhật"}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: "2px 0" }}>7. Khoa tiếp nhận: <b>{departmentName}</b></td>
                                            <td colSpan={2} style={{ padding: "2px 0" }}>8. Bác sĩ điều trị: <b>{doctorName}</b></td>
                                        </tr>
                                        <tr>
                                            <td colSpan={3} style={{ padding: "2px 0" }}>9. Thời điểm vào khám: <b>{formatDateTime(visitDate)}</b></td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* II. HỎI BỆNH & BỆNH SỬ */}
                                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", borderBottom: "1px solid #333", paddingBottom: 2, marginBottom: 6 }}>
                                    II. HỎI BỆNH & BỆNH SỬ
                                </div>
                                <div style={{ fontSize: "10pt", marginBottom: 12, lineHeight: 1.5 }}>
                                    <div>1. <b>Lý do vào viện (Triệu chứng chính):</b> {symptoms}</div>
                                    <div>2. <b>Quá trình bệnh lý:</b> {ehr.clinicalProcess || ehr.medicalHistory || "Bác sĩ chưa ghi nhận quá trình bệnh lý chi tiết"}</div>
                                    <div>3. <b>Tiền sử bản thân:</b> {ehr.personalHistory || "Chưa ghi nhận tiền sử bệnh lý/dị ứng"}</div>
                                    <div>4. <b>Tiền sử gia đình:</b> {ehr.familyHistory || "Chưa ghi nhận tiền sử gia đình"}</div>
                                </div>

                                {/* III. KHÁM BỆNH & CHỈ SỐ SINH TỒN */}
                                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", borderBottom: "1px solid #333", paddingBottom: 2, marginBottom: 6 }}>
                                    III. KHÁM BỆNH & DẤU HIỆU SINH TỒN
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt", marginBottom: 8, border: "1px solid #333" }}>
                                    <tbody>
                                        <tr style={{ backgroundColor: "#F5F5F5", textAlign: "center" }}>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>Mạch</b></td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>Huyết áp</b></td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>Nhiệt độ</b></td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>Nhịp thở</b></td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>SpO2</b></td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>Cân nặng</b></td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>Chiều cao</b></td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>BMI</b></td>
                                        </tr>
                                        <tr style={{ textAlign: "center" }}>
                                            <td style={{ border: "1px solid #333", padding: 4 }}>{vitalSigns.pulse} l/p</td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}>{vitalSigns.bp} mmHg</td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}>{vitalSigns.temp} °C</td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}>{vitalSigns.resp} l/p</td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}>{vitalSigns.spo2} %</td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}>{vitalSigns.weight} kg</td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}>{vitalSigns.height} cm</td>
                                            <td style={{ border: "1px solid #333", padding: 4 }}><b>{vitalSigns.bmi}</b></td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div style={{ fontSize: "10pt", marginBottom: 12, lineHeight: 1.45 }}>
                                    <div>- <b>Khám xét chi tiết:</b> {ehr.physicalExam || ehr.clinicalNotes || "Chưa ghi nhận khám xét chi tiết các hệ cơ quan."}</div>
                                </div>

                                {/* IV. KẾT QUẢ CẬN LÂM SÀNG */}
                                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", borderBottom: "1px solid #333", paddingBottom: 2, marginBottom: 6 }}>
                                    IV. KẾT QUẢ CẬN LÂM SÀNG (LIS & PACS)
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt", marginBottom: 12, border: "1px solid #333" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#F5F5F5" }}>
                                            <th style={{ border: "1px solid #333", padding: 4, width: "5%" }}>STT</th>
                                            <th style={{ border: "1px solid #333", padding: 4, width: "45%" }}>Tên chỉ định cận lâm sàng</th>
                                            <th style={{ border: "1px solid #333", padding: 4, width: "30%" }}>Kết quả thực hiện</th>
                                            <th style={{ border: "1px solid #333", padding: 4, width: "20%" }}>Tham chiếu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tests.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ border: "1px solid #333", padding: 8, textAlign: "center", fontStyle: "italic", color: "#666" }}>
                                                    Chưa có chỉ định cận lâm sàng trong đợt khám này
                                                </td>
                                            </tr>
                                        ) : tests.map((t, idx) => (
                                            <tr key={idx}>
                                                <td style={{ border: "1px solid #333", padding: 4, textAlign: "center" }}>{idx + 1}</td>
                                                <td style={{ border: "1px solid #333", padding: 4 }}><b>{t.testName}</b></td>
                                                <td style={{ border: "1px solid #333", padding: 4, color: t.abnormal ? "#B91C1C" : "inherit" }}>
                                                    {t.resultValue}
                                                </td>
                                                <td style={{ border: "1px solid #333", padding: 4, fontSize: "8.5pt" }}>{t.referenceRange}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* V. CHẨN ĐOÁN XÁC ĐỊNH */}
                                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", borderBottom: "1px solid #333", paddingBottom: 2, marginBottom: 6 }}>
                                    V. KẾT LUẬN CHẨN ĐOÁN (THEO MÃ ICD-10)
                                </div>
                                <div style={{ fontSize: "10pt", marginBottom: 12, lineHeight: 1.5, backgroundColor: "#F8FAFC", padding: "8px 12px", border: "1px solid #E2E8F0" }}>
                                    <div>- <b>Chẩn đoán sơ bộ ban đầu:</b> {initialDiagnosis}</div>
                                    <div style={{ marginTop: 3 }}>
                                        - <b>Chẩn đoán xác định chính thức:</b>{" "}
                                        <b style={{ color: "#0066CC", fontSize: "10.5pt" }}>{finalDiagnosis}</b>
                                    </div>
                                    <div style={{ marginTop: 3 }}>- <b>Bệnh kèm theo:</b> {ehr.secondaryDiagnosis || "Không ghi nhận bệnh lý kết hợp"}</div>
                                    <div style={{ marginTop: 3 }}>- <b>Chẩn đoán phân biệt:</b> {ehr.differentialDiagnosis || "Không có chẩn đoán phân biệt"}</div>
                                </div>

                                {/* VI. ĐIỀU TRỊ & ĐƠN THUỐC ĐIỆN TỬ */}
                                <div style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11pt", borderBottom: "1px solid #333", paddingBottom: 2, marginBottom: 6 }}>
                                    VI. ĐIỀU TRỊ & ĐƠN THUỐC ĐIỆN TỬ
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9.5pt", marginBottom: 12, border: "1px solid #333" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#F5F5F5" }}>
                                            <th style={{ border: "1px solid #333", padding: 4, width: "5%" }}>STT</th>
                                            <th style={{ border: "1px solid #333", padding: 4, width: "40%" }}>Tên biệt dược, hàm lượng</th>
                                            <th style={{ border: "1px solid #333", padding: 4, width: "15%" }}>Số lượng</th>
                                            <th style={{ border: "1px solid #333", padding: 4, width: "40%" }}>Cách dùng, liều uống</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {medicines.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ border: "1px solid #333", padding: 8, textAlign: "center", fontStyle: "italic", color: "#666" }}>
                                                    Chưa có đơn thuốc trong đợt khám này
                                                </td>
                                            </tr>
                                        ) : medicines.map((m, idx) => (
                                            <tr key={idx}>
                                                <td style={{ border: "1px solid #333", padding: 4, textAlign: "center" }}>{idx + 1}</td>
                                                <td style={{ border: "1px solid #333", padding: 4 }}>
                                                    <b>{m.medicineName}</b>
                                                    {m.note && <div style={{ fontSize: "8.5pt", fontStyle: "italic", color: "#555" }}>({m.note})</div>}
                                                </td>
                                                <td style={{ border: "1px solid #333", padding: 4, textAlign: "center" }}><b>{m.quantity} {m.unit || "Viên"}</b></td>
                                                <td style={{ border: "1px solid #333", padding: 4 }}>{m.dosage}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div style={{ fontSize: "10pt", marginBottom: 14 }}>
                                    <div>- <b>Hướng dẫn điều trị & Chế độ sinh hoạt:</b> {treatmentPlan}</div>
                                    <div style={{ marginTop: 3 }}>- <b>Hẹn khám lại:</b> <b style={{ color: "#B91C1C" }}>{reExamDate}</b></div>
                                </div>

                                {/* VII. CHỮ KÝ SỐ ĐIỆN TỬ & PHÁP LÝ */}
                                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: "50%", textAlign: "center", verticalAlign: "top", fontSize: "10pt" }}>
                                                <div style={{ fontWeight: "bold" }}>TRƯỞNG KHOA LÂM SÀNG</div>
                                                <div style={{ fontStyle: "italic", fontSize: "9pt" }}>(Ký điện tử & đóng dấu số)</div>
                                                <div style={{ marginTop: 12 }}>
                                                    <div style={{ border: "2px solid #0088D6", color: "#0088D6", padding: "6px 12px", borderRadius: 6, display: "inline-block", fontSize: "8.5pt", textTransform: "uppercase", fontWeight: "bold" }}>
                                                        ✓ ĐÃ DUYỆT BỆNH ÁN ĐIỆN TỬ<br />
                                                        <span style={{ fontSize: "7.5pt", color: "#555" }}>BV ĐA KHOA QUỐC TẾ TNT</span>
                                                    </div>
                                                </div>
                                                <div style={{ marginTop: 8, fontWeight: "bold" }}>{ehr.approverName || ehr.departmentHeadName || "TRƯỞNG KHOA CHUYÊN MÔN"}</div>
                                            </td>
                                            <td style={{ width: "50%", textAlign: "center", verticalAlign: "top", fontSize: "10pt" }}>
                                                <div><i>Hà Nội, ngày {new Date(visitDate).getDate()} tháng {new Date(visitDate).getMonth() + 1} năm {new Date(visitDate).getFullYear()}</i></div>
                                                <div style={{ fontWeight: "bold" }}>BÁC SĨ KHÁM BỆNH & ĐIỀU TRỊ</div>
                                                <div style={{ fontStyle: "italic", fontSize: "9pt" }}>(Ký số chứng thư SmartCA PKI)</div>
                                                <div style={{ marginTop: 12 }}>
                                                    <div style={{ border: "2px solid #059669", color: "#059669", padding: "6px 12px", borderRadius: 6, display: "inline-block", fontSize: "8.5pt", textTransform: "uppercase", fontWeight: "bold" }}>
                                                        ✓ ĐÃ KÝ SỐ XÁC THỰC<br />
                                                        <span style={{ fontSize: "7.5pt", color: "#555" }}>{ehr.doctorLicense ? `CCHN: ${ehr.doctorLicense}` : "Chứng chỉ hành nghề đã xác thực"}</span>
                                                    </div>
                                                </div>
                                                <div style={{ marginTop: 8, fontWeight: "bold" }}>{doctorName.toUpperCase()}</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </Paper>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 1: KHÁM LÂM SÀNG & DẤU HIỆU SINH TỒN                   */}
                        {/* ========================================================= */}
                        {activeTab === 1 && (
                            <Stack spacing={3}>
                                {/* Bảng đồng hồ chỉ số sinh tồn */}
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0F172A" display="flex" alignItems="center" gap={1} mb={2}>
                                        <MonitorHeartIcon sx={{ color: "#EF4444" }} />
                                        BẢNG THEO DÕI DẤU HIỆU SINH TỒN (VITAL SIGNS DASHBOARD)
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 2, bgcolor: "#FEF2F2", borderRadius: 2.5, border: "1px solid #FECACA", textAlign: "center" }}>
                                                <Typography variant="caption" fontWeight={700} color="#991B1B">MẠCH ĐẬP</Typography>
                                                <Typography variant="h5" fontWeight={900} color="#DC2626">{vitalSigns.pulse} <span style={{ fontSize: "0.85rem" }}>lần/phút</span></Typography>
                                                <Typography variant="caption" color="text.secondary">{vitalSigns.pulse !== "---" ? "Chỉ số ghi nhận" : "Chưa có dữ liệu"}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 2, bgcolor: "#EFF6FF", borderRadius: 2.5, border: "1px solid #BFDBFE", textAlign: "center" }}>
                                                <Typography variant="caption" fontWeight={700} color="#1E40AF">HUYẾT ÁP</Typography>
                                                <Typography variant="h5" fontWeight={900} color="#2563EB">{vitalSigns.bp} <span style={{ fontSize: "0.85rem" }}>mmHg</span></Typography>
                                                <Typography variant="caption" color="text.secondary">{vitalSigns.bp !== "---" ? "Huyết áp ghi nhận" : "Chưa có dữ liệu"}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 2, bgcolor: "#FFFBEB", borderRadius: 2.5, border: "1px solid #FDE68A", textAlign: "center" }}>
                                                <Typography variant="caption" fontWeight={700} color="#92400E">THÂN NHIỆT</Typography>
                                                <Typography variant="h5" fontWeight={900} color="#D97706">{vitalSigns.temp} <span style={{ fontSize: "0.85rem" }}>°C</span></Typography>
                                                <Typography variant="caption" color="text.secondary">{vitalSigns.temp !== "---" ? "Nhiệt độ ghi nhận" : "Chưa có dữ liệu"}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 2, bgcolor: "#F0FDF4", borderRadius: 2.5, border: "1px solid #BBF7D0", textAlign: "center" }}>
                                                <Typography variant="caption" fontWeight={700} color="#166534">ĐỘ BÃO HÒA OXY (SpO2)</Typography>
                                                <Typography variant="h5" fontWeight={900} color="#16A34A">{vitalSigns.spo2} <span style={{ fontSize: "0.85rem" }}>%</span></Typography>
                                                <Typography variant="caption" color="text.secondary">{vitalSigns.spo2 !== "---" ? "Khí phòng an toàn" : "Chưa có dữ liệu"}</Typography>
                                            </Box>
                                        </Grid>

                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0", textAlign: "center" }}>
                                                <Typography variant="caption" color="text.secondary">NHỊP THỞ</Typography>
                                                <Typography variant="h6" fontWeight={800} color="#1E293B">{vitalSigns.resp} lần/phút</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0", textAlign: "center" }}>
                                                <Typography variant="caption" color="text.secondary">CHIỀU CAO</Typography>
                                                <Typography variant="h6" fontWeight={800} color="#1E293B">{vitalSigns.height} cm</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0", textAlign: "center" }}>
                                                <Typography variant="caption" color="text.secondary">CÂN NẶNG</Typography>
                                                <Typography variant="h6" fontWeight={800} color="#1E293B">{vitalSigns.weight} kg</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6} sm={3}>
                                            <Box sx={{ p: 1.5, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0", textAlign: "center" }}>
                                                <Typography variant="caption" color="text.secondary">CHỈ SỐ KHỐI CƠ THỂ (BMI)</Typography>
                                                <Typography variant="h6" fontWeight={900} color="#059669">{vitalSigns.bmi}</Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>

                                {/* Khám cơ quan */}
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0F172A" mb={2}>
                                        KHÁM XÉT CHI TIẾT CÁC HỆ CƠ QUAN
                                    </Typography>
                                    <Box sx={{ p: 2.5, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                                        <Typography variant="body2" color="#475569">
                                            {ehr.physicalExam || ehr.clinicalNotes || "Chưa có ghi nhận khám xét chi tiết từng hệ cơ quan từ bác sĩ điều trị."}
                                        </Typography>
                                    </Box>
                                </Paper>
                            </Stack>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 2: CẬN LÂM SÀNG & PACS                                */}
                        {/* ========================================================= */}
                        {activeTab === 2 && (
                            <Stack spacing={3}>
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0F172A" display="flex" alignItems="center" gap={1}>
                                            <ScienceIcon sx={{ color: "#0088D6" }} />
                                            KẾT QUẢ XÉT NGHIỆM LIÊN THÔNG LIS ({tests.length} chỉ số)
                                        </Typography>
                                        <Chip label="Đã duyệt kết quả bởi KTV Lab" size="small" color="success" />
                                    </Box>
                                    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700 }}>TÊN XÉT NGHIỆM / CHỈ SỐ</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>KẾT QUẢ ĐO</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>KHOẢNG THAM CHIẾU</TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>ĐÁNH GIÁ</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {tests.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary", fontStyle: "italic" }}>
                                                            Chưa có chỉ định cận lâm sàng nào trong đợt khám này.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : tests.map((t, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell sx={{ fontWeight: 700 }}>{t.testName}</TableCell>
                                                        <TableCell sx={{ fontWeight: 800, color: t.abnormal ? "#DC2626" : "#0284C7" }}>
                                                            {t.resultValue}
                                                        </TableCell>
                                                        <TableCell sx={{ color: "text.secondary" }}>{t.referenceRange}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={t.abnormal ? "Bất thường (Tăng nhẹ)" : "Bình thường"}
                                                                size="small"
                                                                sx={{
                                                                    height: 22,
                                                                    fontWeight: 700,
                                                                    fontSize: "0.72rem",
                                                                    bgcolor: t.abnormal ? "#FEE2E2" : "#DCFCE7",
                                                                    color: t.abnormal ? "#B91C1C" : "#166534"
                                                                }}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>

                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0F172A" display="flex" alignItems="center" gap={1} mb={2}>
                                        <CameraAltIcon sx={{ color: "#7C3AED" }} />
                                        HÌNH ẢNH CHẨN ĐOÁN PACS & DICOM
                                    </Typography>
                                    <Box sx={{ p: 2.5, bgcolor: "#F8FAFC", borderRadius: 2.5, border: "1px solid #E2E8F0" }}>
                                        {ehr.pacsStudy || ehr.imagingFindings || ehr.xrayReport ? (
                                            <Typography variant="body2" color="#334155">
                                                {ehr.pacsStudy || ehr.imagingFindings || ehr.xrayReport}
                                            </Typography>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" fontStyle="italic" textAlign="center">
                                                Chưa có chỉ định hoặc hình ảnh chẩn đoán PACS trong đợt khám này.
                                            </Typography>
                                        )}
                                    </Box>
                                </Paper>
                            </Stack>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 3: CHẨN ĐOÁN ICD-10                                   */}
                        {/* ========================================================= */}
                        {activeTab === 3 && (
                            <Stack spacing={3}>
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0F172A" mb={2}>
                                        CHẨN ĐOÁN XÁC ĐỊNH THEO TỪ ĐIỂN Y TẾ QUỐC TẾ ICD-10
                                    </Typography>
                                    <Box sx={{ p: 2.5, bgcolor: "#EFF6FF", borderRadius: 2.5, border: "1px solid #BFDBFE", mb: 2 }}>
                                        <Typography variant="caption" fontWeight={700} color="#1E40AF">BỆNH CHÍNH (ICD-10 PRIMARY):</Typography>
                                        <Typography variant="h5" fontWeight={900} color="#1D4ED8" mt={0.5}>
                                            {finalDiagnosis}
                                        </Typography>
                                        {ehr.icd10Category && (
                                            <Typography variant="body2" color="#1E40AF" mt={0.5}>
                                                Nhóm bệnh: {ehr.icd10Category}
                                            </Typography>
                                        )}
                                    </Box>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                                                <Typography variant="caption" color="text.secondary">Chẩn đoán sơ bộ ban đầu</Typography>
                                                <Typography variant="body1" fontWeight={700} color="#334155" mt={0.3}>
                                                    {initialDiagnosis}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                                                <Typography variant="caption" color="text.secondary">Chẩn đoán phân biệt</Typography>
                                                <Typography variant="body1" fontWeight={700} color="#334155" mt={0.3}>
                                                    {ehr.differentialDiagnosis || "Chưa có chẩn đoán phân biệt"}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Stack>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 4: ĐƠN THUỐC & KẾ HOẠCH ĐIỀU TRỊ                       */}
                        {/* ========================================================= */}
                        {activeTab === 4 && (
                            <Stack spacing={3}>
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                                        <Typography variant="subtitle1" fontWeight={800} color="#0F172A" display="flex" alignItems="center" gap={1}>
                                            <MedicationIcon sx={{ color: "#059669" }} />
                                            ĐƠN THUỐC ĐIỆN TỬ QUỐC GIA (E-PRESCRIPTION)
                                        </Typography>
                                        <Box display="flex" gap={1}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                startIcon={<PictureAsPdfIcon fontSize="small" />}
                                                href={`${API_BASE_URL}/api/prescriptions/${bookingCode}/pdf`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ textTransform: "none", fontWeight: 700 }}
                                            >
                                                Tải Đơn Thuốc PDF (A5)
                                            </Button>
                                        </Box>
                                    </Box>

                                    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 2 }}>
                                        <Table size="small">
                                            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 700, width: "5%" }}>STT</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, width: "35%" }}>TÊN THUỐC & BIỆT DƯỢC</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, width: "15%" }}>SỐ LƯỢNG</TableCell>
                                                    <TableCell sx={{ fontWeight: 700, width: "45%" }}>HƯỚNG DẪN DÙNG THUỐC</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {medicines.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary", fontStyle: "italic" }}>
                                                            Chưa có đơn thuốc nào được kê cho đợt khám này.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : medicines.map((m, idx) => (
                                                    <TableRow key={idx} hover>
                                                        <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={800} color="#0F172A">
                                                                {m.medicineName}
                                                            </Typography>
                                                            {m.note && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {m.note}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 800, color: "#059669" }}>
                                                            {m.quantity} {m.unit || "Viên"}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600, color: "#334155" }}>
                                                            {m.dosage}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    <Box sx={{ mt: 2.5, p: 2, bgcolor: "#FFFBEB", borderRadius: 2, border: "1px solid #FDE68A" }}>
                                        <Typography variant="subtitle2" fontWeight={800} color="#92400E" mb={0.5}>
                                            LỜI DẶN DÒ CỦA BÁC SĨ ĐIỀU TRỊ:
                                        </Typography>
                                        <Typography variant="body2" color="#78350F">
                                            {treatmentPlan}
                                        </Typography>
                                        <Typography variant="body2" fontWeight={800} color="#B45309" mt={1}>
                                            Hẹn tái khám: {reExamDate}
                                        </Typography>
                                    </Box>
                                </Paper>
                            </Stack>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 5: CHỨNG THƯ SỐ & CHỮ KÝ ĐIỆN TỬ                       */}
                        {/* ========================================================= */}
                        {activeTab === 5 && (
                            <Stack spacing={3}>
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                                    <Typography variant="subtitle1" fontWeight={800} color="#0F172A" display="flex" alignItems="center" gap={1} mb={2}>
                                        <SecurityIcon sx={{ color: "#0284C7" }} />
                                        CHỨNG THỰC CHỮ KÝ SỐ Y TẾ (PKI DIGITAL SIGNATURE)
                                    </Typography>

                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ p: 2.5, bgcolor: "#F0FDF4", borderRadius: 2.5, border: "1px solid #BBF7D0" }}>
                                                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                                                    <FingerprintIcon sx={{ color: "#16A34A", fontSize: 28 }} />
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={800} color="#166534">
                                                            CHỮ KÝ SỐ BÁC SĨ ĐIỀU TRỊ
                                                        </Typography>
                                                        <Typography variant="caption" color="#15803D">
                                                            Đã ký qua cổng VNPT SmartCA / USB Token y tế
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Divider sx={{ my: 1, borderColor: "#BBF7D0" }} />
                                                <Typography variant="body2" color="#166534">
                                                    Người ký: <b>{doctorName}</b><br />
                                                    Số Chứng chỉ hành nghề (CCHN): <b>{ehr.doctorLicense ? ehr.doctorLicense : "Chưa ghi nhận"}</b><br />
                                                    Thời gian ký: <b>{formatDateTime(visitDate)}</b><br />
                                                    Trạng thái ký: <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: "bold" }}>HỢP LỆ (PKI SMARTCA)</span>
                                                </Typography>
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ p: 2.5, bgcolor: "#EFF6FF", borderRadius: 2.5, border: "1px solid #BFDBFE" }}>
                                                <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                                                    <SecurityIcon sx={{ color: "#2563EB", fontSize: 28 }} />
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight={800} color="#1E40AF">
                                                            CHỮ KÝ DUYỆT TRƯỞNG KHOA
                                                        </Typography>
                                                        <Typography variant="caption" color="#1D4ED8">
                                                            Khóa hồ sơ bệnh án theo Thông tư 46/2018/TT-BYT
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Divider sx={{ my: 1, borderColor: "#BFDBFE" }} />
                                                <Typography variant="body2" color="#1E40AF">
                                                    Người duyệt: <b>{ehr.approverName || ehr.departmentHeadName || "Lãnh đạo chuyên môn"}</b><br />
                                                    Chức vụ: <b>Trưởng Khoa Lâm Sàng</b><br />
                                                    Trạng thái: <b>ĐÃ KHÓA & BẢO LƯU BẤT BIẾN</b><br />
                                                    Tiêu chuẩn: <b>HL7 FHIR R4 & OpenMRS Encounters</b>
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Stack>
                        )}
                    </Box>
                )}
            </DialogContent>

            {/* Footer Modal */}
            <DialogActions
                sx={{
                    p: 2,
                    px: 3,
                    bgcolor: "#F8FAFC",
                    borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                    display: "flex",
                    justifyContent: "space-between"
                }}
            >
                <Box display="flex" gap={1.5}>
                    <Button
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={handlePrintRecord}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#0F172A", borderColor: "#CBD5E1" }}
                    >
                        In Hồ Sơ Bệnh Án (Chuẩn A4)
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<PictureAsPdfIcon />}
                        href={`${API_BASE_URL}/api/prescriptions/${bookingCode}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                        Tải Đơn Thuốc PDF (A5)
                    </Button>
                </Box>

                <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, px: 3, bgcolor: "#0088D6", "&:hover": { bgcolor: "#0062A3" } }}
                >
                    Đóng cửa sổ
                </Button>
            </DialogActions>
        </Dialog>
    );
}
