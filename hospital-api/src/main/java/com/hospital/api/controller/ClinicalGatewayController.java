package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.LisAutomatedResultRequest;
import com.hospital.api.dto.request.PacsCallbackRequest;
import com.hospital.api.dto.response.DicomWorklistItemResponse;
import com.hospital.api.dto.response.LabTestDetailResponse;
import com.hospital.api.dto.response.MedicalTestResponse;
import com.hospital.api.service.ClinicalGatewayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/gateway")
@RequiredArgsConstructor
public class ClinicalGatewayController {

    private final ClinicalGatewayService gatewayService;

    // 1. DICOM Modality Worklist (MWL) cho máy X-Quang, CT, MRI
    @GetMapping("/ris/worklist")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<DicomWorklistItemResponse>>> getDicomWorklist(
            @RequestParam(required = false) String modality,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                gatewayService.getDicomWorklist(modality, date),
                "Lấy danh sách DICOM Modality Worklist thành công"
        ));
    }

    // 2. Tiếp nhận Webhook từ PACS Server (dcm4chee) & Tích hợp OHIF Web Viewer
    @PostMapping("/pacs/callback")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalTestResponse>> handlePacsCallback(
            @Valid @RequestBody PacsCallbackRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                gatewayService.processPacsCallback(request),
                "Tiếp nhận hình ảnh PACS và tạo liên kết OHIF Viewer thành công"
        ));
    }

    // 3. Cổng tiếp nhận kết quả tự động từ máy xét nghiệm (LIS Gateway / OpenELIS)
    @PostMapping("/lis/results")
    @PreAuthorize("hasAnyRole('LAB_TECHNICIAN', 'ADMIN')")
    public ResponseEntity<ApiResponse<LabTestDetailResponse>> handleLisResults(
            @Valid @RequestBody LisAutomatedResultRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                gatewayService.ingestLisResults(request),
                "Tiếp nhận và đồng bộ kết quả máy xét nghiệm LIS vào EHR thành công"
        ));
    }
}
