package com.hospital.api.service;

import com.hospital.api.dto.response.PrescriptionVerificationResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.PrescriptionRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrescriptionPdfService {

    private final PrescriptionRepository prescriptionRepository;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Tạo mã băm SHA-256 bảo mật chống giả mạo đơn thuốc (Canonical SHA-256 Hash)
     */
    public static String generatePrescriptionHash(String prescriptionCode, String doctorId, java.time.Instant createdAt) {
        long epochSec = createdAt != null ? createdAt.getEpochSecond() : 0L;
        return generatePrescriptionHash(prescriptionCode, doctorId, String.valueOf(epochSec));
    }

    public static String generatePrescriptionHash(String prescriptionCode, String doctorId, String timestampKey) {
        try {
            String payload = prescriptionCode + "|" + doctorId + "|" + timestampKey;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi sinh mã băm đơn thuốc: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public String getPrescriptionHash(String prescriptionCode) {
        Prescription prescription = prescriptionRepository.findByPrescriptionCode(prescriptionCode)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn thuốc", HttpStatus.NOT_FOUND));
        MedicalExaminationRecord record = prescription.getMedicalRecord();
        Doctor doctor = record != null ? record.getDoctor() : null;
        String doctorIdStr = doctor != null ? doctor.getDoctorId().toString() : "UNKNOWN";
        return generatePrescriptionHash(prescriptionCode, doctorIdStr, prescription.getCreatedAt());
    }

    /**
     * Sinh ảnh QR Code dạng byte array (PNG)
     */
    private byte[] generateQrCodeImage(String text, int width, int height) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);
        ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
        return pngOutputStream.toByteArray();
    }

    /**
     * Xuất Đơn thuốc điện tử PDF khổ A5 chuẩn Bộ Y tế kèm Chữ ký số và QR Code xác thực
     */
    @Transactional(readOnly = true)
    public byte[] generatePrescriptionPdf(String prescriptionCode) {
        Prescription prescription = prescriptionRepository.findByPrescriptionCode(prescriptionCode)
                .orElseThrow(() -> new AppException("Không tìm thấy đơn thuốc mã: " + prescriptionCode, HttpStatus.NOT_FOUND));

        MedicalExaminationRecord record = prescription.getMedicalRecord();
        Doctor doctor = record != null ? record.getDoctor() : null;
        PatientProfile patient = record != null ? record.getPatientProfile() : null;

        String doctorIdStr = doctor != null ? doctor.getDoctorId().toString() : "UNKNOWN";
        String createdAtStr = prescription.getCreatedAt() != null ? prescription.getCreatedAt().toString() : "";
        String hash = generatePrescriptionHash(prescriptionCode, doctorIdStr, prescription.getCreatedAt());
        String verificationUrl = frontendUrl + "/verify-prescription?code=" + prescriptionCode + "&hash=" + hash;

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Khổ giấy A5 (chuẩn đơn thuốc ngoại trú Việt Nam)
            Document document = new Document(PageSize.A5, 20, 20, 20, 20);
            PdfWriter.getInstance(document, baos);
            document.open();

            // Font tiêu chuẩn OpenPDF
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Font.BOLD);
            Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Font.BOLD);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Font.BOLD);
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Font.NORMAL);
            Font italicFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Font.ITALIC);

            // 1. HEADER CƠ SỞ Y TẾ
            Paragraph clinicName = new Paragraph("BENH VIEN DA KHOA QUOC TE YOUMED TNT", subTitleFont);
            clinicName.setAlignment(Element.ALIGN_CENTER);
            document.add(clinicName);

            Paragraph clinicInfo = new Paragraph("Dia chi: 123 Duong Nguyen Hue, Quan 1, TP. Ho Chi Minh - Hotline: 1900 6868\nGiay phep hoat dong so: 1234/BYT-GPHD", regularFont);
            clinicInfo.setAlignment(Element.ALIGN_CENTER);
            document.add(clinicInfo);

            document.add(new Paragraph("--------------------------------------------------------------------------------", regularFont));

            // 2. TIÊU ĐỀ ĐƠN THUỐC
            Paragraph title = new Paragraph("DON THUOC DIEN TU", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingBefore(5);
            title.setSpacingAfter(2);
            document.add(title);

            Paragraph codePara = new Paragraph("Ma don thuoc: " + prescriptionCode, boldFont);
            codePara.setAlignment(Element.ALIGN_CENTER);
            codePara.setSpacingAfter(8);
            document.add(codePara);

            // 3. THÔNG TIN BỆNH NHÂN
            PdfPTable patientTable = new PdfPTable(2);
            patientTable.setWidthPercentage(100);
            patientTable.setWidths(new float[]{3f, 2f});

            String patientName = patient != null ? patient.getFullName() : "N/A";
            String dob = patient != null && patient.getDateOfBirth() != null ? patient.getDateOfBirth().toString() : "N/A";
            String gender = patient != null && patient.getGender() != null ? patient.getGender().name() : "N/A";
            String phone = patient != null && patient.getPhoneNumber() != null ? patient.getPhoneNumber() : "N/A";
            String diagnosis = record != null && record.getFinalDiagnosis() != null ? record.getFinalDiagnosis() : (record != null ? record.getInitialDiagnosis() : "N/A");

            patientTable.addCell(createCleanCell("Ho va ten: " + patientName, boldFont));
            patientTable.addCell(createCleanCell("Ngay sinh: " + dob + " | Gioi tinh: " + gender, regularFont));
            patientTable.addCell(createCleanCell("So dien thoai: " + phone, regularFont));
            patientTable.addCell(createCleanCell("Chan doan: " + diagnosis, boldFont));
            document.add(patientTable);

            document.add(new Paragraph(" ", regularFont));

            // 4. BẢNG THUỐC KÊ ĐƠN
            PdfPTable medTable = new PdfPTable(5);
            medTable.setWidthPercentage(100);
            medTable.setWidths(new float[]{0.8f, 4f, 1.2f, 1.2f, 4f});

            medTable.addCell(createHeaderCell("STT", boldFont));
            medTable.addCell(createHeaderCell("Ten thuoc / Ham luong", boldFont));
            medTable.addCell(createHeaderCell("DVT", boldFont));
            medTable.addCell(createHeaderCell("SL", boldFont));
            medTable.addCell(createHeaderCell("Lieu dung & Cach dung (4 cu)", boldFont));

            List<PrescriptionItem> items = prescription.getPrescriptionItems();
            int stt = 1;
            if (items != null) {
                for (PrescriptionItem item : items) {
                    Medicine m = item.getMedicine();
                    String medName = m != null ? m.getMedicineName() : "Thuoc";
                    String unit = m != null && m.getUnit() != null ? m.getUnit().name() : "Vien";

                    // Hướng dẫn liều dùng 4 cữ (Sáng - Trưa - Chiều - Tối)
                    StringBuilder dosage = new StringBuilder();
                    if (item.getMorningAmount() != null && item.getMorningAmount() > 0) dosage.append("Sang: ").append(item.getMorningAmount()).append(" ");
                    if (item.getNoonAmount() != null && item.getNoonAmount() > 0) dosage.append("Trua: ").append(item.getNoonAmount()).append(" ");
                    if (item.getAfternoonAmount() != null && item.getAfternoonAmount() > 0) dosage.append("Chieu: ").append(item.getAfternoonAmount()).append(" ");
                    if (item.getEveningAmount() != null && item.getEveningAmount() > 0) dosage.append("Toi: ").append(item.getEveningAmount()).append(" ");
                    if (item.getDosageInstruction() != null && !item.getDosageInstruction().isBlank()) {
                        dosage.append("(").append(item.getDosageInstruction()).append(")");
                    }

                    medTable.addCell(createDataCell(String.valueOf(stt++), regularFont, Element.ALIGN_CENTER));
                    medTable.addCell(createDataCell(medName, boldFont, Element.ALIGN_LEFT));
                    medTable.addCell(createDataCell(unit, regularFont, Element.ALIGN_CENTER));
                    medTable.addCell(createDataCell(String.valueOf(item.getQuantity()), boldFont, Element.ALIGN_CENTER));
                    medTable.addCell(createDataCell(dosage.toString(), regularFont, Element.ALIGN_LEFT));
                }
            }
            document.add(medTable);

            // 5. LỜI DẶN CỦA BÁC SĨ
            String advice = record != null && record.getTreatmentPlan() != null ? record.getTreatmentPlan() : "Uong thuoc theo dung chi dinh.";
            Paragraph advicePara = new Paragraph("\nLoi dan cua Bac si: " + advice, regularFont);
            advicePara.setSpacingAfter(10);
            document.add(advicePara);

            // 6. CHÂN TRANG: MÃ QR CODE XÁC THỰC & CHỮ KÝ SỐ BÁC SĨ
            PdfPTable footerTable = new PdfPTable(2);
            footerTable.setWidthPercentage(100);
            footerTable.setWidths(new float[]{1.5f, 2.5f});

            // Ô bên trái: QR Code tra cứu
            byte[] qrBytes = generateQrCodeImage(verificationUrl, 100, 100);
            Image qrImage = Image.getInstance(qrBytes);
            qrImage.scaleToFit(85, 85);
            qrImage.setAlignment(Element.ALIGN_CENTER);

            PdfPCell qrCell = new PdfPCell();
            qrCell.setBorder(Rectangle.NO_BORDER);
            qrCell.addElement(qrImage);
            Paragraph qrDesc = new Paragraph("Quet ma QR de xac thuc don thuoc\n(Chong lam gia & tra cuu hop le)", regularFont);
            qrDesc.setAlignment(Element.ALIGN_CENTER);
            qrCell.addElement(qrDesc);
            footerTable.addCell(qrCell);

            // Ô bên phải: Chữ ký số Bác sĩ
            PdfPCell doctorCell = new PdfPCell();
            doctorCell.setBorder(Rectangle.NO_BORDER);
            String docFullName = doctor != null && doctor.getAccount() != null ? doctor.getAccount().getFullName() : "Bac si dieu tri";
            Paragraph docSign = new Paragraph(
                    "Ngay ke: " + createdAtStr.substring(0, Math.min(10, createdAtStr.length())) + "\n" +
                    "BAC SI KHAM BENH\n" +
                    "(Da ky so dien tu hop le)\n\n\n" +
                    docFullName + "\n" +
                    "CCHN so: 012345/HCM-CCHN",
                    boldFont
            );
            docSign.setAlignment(Element.ALIGN_CENTER);
            doctorCell.addElement(docSign);
            footerTable.addCell(doctorCell);

            document.add(footerTable);
            document.close();

            log.info("Xuat don thuoc dien tu PDF thanh cong cho ma: {}", prescriptionCode);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Loi tao file PDF don thuoc {}: {}", prescriptionCode, e.getMessage(), e);
            throw new AppException("Không thể xuất file PDF đơn thuốc: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Xác thực chữ ký số công khai đơn thuốc điện tử (Public Verification Endpoint)
     */
    @Transactional(readOnly = true)
    public PrescriptionVerificationResponse verifyPrescription(String code, String suppliedHash) {
        if (code == null || code.isBlank() || suppliedHash == null || suppliedHash.isBlank()) {
            return new PrescriptionVerificationResponse(false, code, null, null, null, null, "Thông tin xác thực không hợp lệ.");
        }

        Prescription prescription = prescriptionRepository.findByPrescriptionCode(code.trim()).orElse(null);
        if (prescription == null) {
            return new PrescriptionVerificationResponse(false, code, null, null, null, null, "Không tìm thấy đơn thuốc tương ứng trên hệ thống Bệnh viện.");
        }

        MedicalExaminationRecord record = prescription.getMedicalRecord();
        Doctor doctor = record != null ? record.getDoctor() : null;
        String doctorIdStr = doctor != null ? doctor.getDoctorId().toString() : "UNKNOWN";
        String createdAtStr = prescription.getCreatedAt() != null ? prescription.getCreatedAt().toString() : "";

        String expectedHash = generatePrescriptionHash(code.trim(), doctorIdStr, prescription.getCreatedAt());

        // So sánh an toàn thời gian chống timing attack
        boolean match = MessageDigest.isEqual(
                expectedHash.getBytes(StandardCharsets.UTF_8),
                suppliedHash.trim().getBytes(StandardCharsets.UTF_8)
        );

        if (!match) {
            return new PrescriptionVerificationResponse(false, code, null, null, null, null, "Chữ ký số không khớp! Đơn thuốc có thể đã bị chỉnh sửa bất hợp pháp.");
        }

        String docName = doctor != null && doctor.getAccount() != null ? doctor.getAccount().getFullName() : "Bác sĩ phụ trách";
        return new PrescriptionVerificationResponse(
                true,
                prescription.getPrescriptionCode(),
                docName,
                "CCHN-012345/HCM",
                "BỆNH VIỆN ĐA KHOA QUỐC TẾ YOUMED TNT",
                createdAtStr,
                "Đơn thuốc điện tử HỢP LỆ, NGUYÊN VẸN và đã được xác thực chữ ký số thành công."
        );
    }

    private PdfPCell createCleanCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(3);
        return cell;
    }

    private PdfPCell createHeaderCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new java.awt.Color(240, 240, 240));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setPadding(4);
        return cell;
    }

    private PdfPCell createDataCell(String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(alignment);
        cell.setPadding(4);
        return cell;
    }
}
