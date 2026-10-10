package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.CreateConceptRequest;
import com.hospital.api.dto.response.MedicalConceptResponse;
import com.hospital.api.service.MedicalConceptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/clinical/concepts", "/api/ehr/concepts"})
@RequiredArgsConstructor
public class MedicalConceptController {

    private final MedicalConceptService conceptService;

    // 1. Lấy danh mục Concepts (Lọc theo chuyên khoa hoặc lấy toàn bộ)
    // Dành cho giao diện Bác sĩ tự động render form nhập liệu chuyên khoa
    @GetMapping
    public ResponseEntity<ApiResponse<List<MedicalConceptResponse>>> getConcepts(
            @RequestParam(required = false) Integer departmentId
    ) {
        List<MedicalConceptResponse> result = conceptService.getConceptsForDepartment(departmentId);
        return ResponseEntity.ok(ApiResponse.ok(result, "Lấy danh mục Concept y tế thành công"));
    }

    // 2. Thêm mới Concept vào Từ điển khái niệm (OpenMRS Concept Dictionary)
    // Dành cho Trưởng khoa / Quản trị viên mở rộng chỉ số mà không cần sửa DB
    @PostMapping
    @PreAuthorize("hasAnyRole('HEAD_OF_DEPARTMENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalConceptResponse>> createConcept(
            @Valid @RequestBody CreateConceptRequest request
    ) {
        MedicalConceptResponse response = conceptService.createConcept(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Khởi tạo khái niệm y tế Concept mới thành công"));
    }
}
