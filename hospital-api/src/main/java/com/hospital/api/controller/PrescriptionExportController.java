package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.response.PrescriptionVerificationResponse;
import com.hospital.api.service.PrescriptionPdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionExportController {

    private final PrescriptionPdfService prescriptionPdfService;

    /**
     * Tải hoặc xem Đơn thuốc điện tử chuẩn Bộ Y tế dưới định dạng PDF khổ A5
     */
    @GetMapping("/{prescriptionCode}/pdf")
    public ResponseEntity<byte[]> getPrescriptionPdf(@PathVariable String prescriptionCode) {
        log.info("Yêu cầu xuất PDF đơn thuốc điện tử: {}", prescriptionCode);
        byte[] pdfBytes = prescriptionPdfService.generatePrescriptionPdf(prescriptionCode);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "DonThuoc-" + prescriptionCode + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    /**
     * Xác thực công khai Chữ ký số và tính toàn vẹn của Đơn thuốc điện tử (Public Verification)
     */
    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<PrescriptionVerificationResponse>> verifyPrescription(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String hash
    ) {
        PrescriptionVerificationResponse response = prescriptionPdfService.verifyPrescription(code, hash);
        return ResponseEntity.ok(ApiResponse.ok(response, response.message()));
    }

    /**
     * Xác thực với PathVariable
     */
    @GetMapping("/{prescriptionCode}/verify")
    public ResponseEntity<ApiResponse<PrescriptionVerificationResponse>> verifyPrescriptionPath(
            @PathVariable String prescriptionCode,
            @RequestParam(required = false) String hash
    ) {
        PrescriptionVerificationResponse response = prescriptionPdfService.verifyPrescription(prescriptionCode, hash);
        return ResponseEntity.ok(ApiResponse.ok(response, response.message()));
    }

    /**
     * Lấy mã băm chữ ký số công khai SHA-256 của đơn thuốc
     */
    @GetMapping("/{prescriptionCode}/hash")
    public ResponseEntity<ApiResponse<String>> getPrescriptionHash(@PathVariable String prescriptionCode) {
        String hash = prescriptionPdfService.getPrescriptionHash(prescriptionCode);
        return ResponseEntity.ok(ApiResponse.ok(hash, "Mã băm chữ ký số SHA-256"));
    }
}
