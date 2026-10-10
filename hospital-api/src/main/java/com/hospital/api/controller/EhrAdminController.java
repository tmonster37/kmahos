package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.service.EhrDataMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping({"/api/admin/ehr", "/api/ehr"})
@RequiredArgsConstructor
public class EhrAdminController {

    private final EhrDataMigrationService migrationService;

    // Chạy di trú dữ liệu chẩn đoán văn bản tự do cũ sang chuẩn ICD-10 Condition
    @PostMapping({"/migrate", "/migrate-all"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerEhrMigration() {
        Map<String, Object> result = migrationService.migrateLegacyDiagnoses();
        return ResponseEntity.ok(ApiResponse.ok(result, "Di trú dữ liệu bệnh án cũ sang chuẩn ICD-10 thành công"));
    }
}
