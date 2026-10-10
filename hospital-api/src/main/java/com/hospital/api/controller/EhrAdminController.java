package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.service.EhrDataMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/admin/ehr", "/api/ehr"})
@RequiredArgsConstructor
public class EhrAdminController {

    private final EhrDataMigrationService migrationService;
    private final com.hospital.api.repository.MedicalObservationRepository observationRepository;
    private final com.hospital.api.repository.MedicalExaminationRecordRepository recordRepository;

    // Chạy di trú dữ liệu chẩn đoán văn bản tự do cũ sang chuẩn ICD-10 Condition
    @PostMapping({"/migrate", "/migrate-all"})
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerEhrMigration() {
        Map<String, Object> result = migrationService.migrateLegacyDiagnoses();
        return ResponseEntity.ok(ApiResponse.ok(result, "Di trú dữ liệu bệnh án cũ sang chuẩn ICD-10 thành công"));
    }

    // Tra cứu danh sách chỉ số lâm sàng EHR Observations
    @GetMapping("/observations/search")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.MedicalObservationResponse>>> searchObservations(
            @RequestParam(required = false) UUID patientProfileId,
            @RequestParam(required = false) UUID recordId,
            @RequestParam(required = false) String conceptCode) {
        java.util.List<com.hospital.api.entity.MedicalObservation> observations;
        if (recordId != null) {
            observations = observationRepository.findAllByMedicalRecord_RecordIdOrderByRecordedAtAsc(recordId);
        } else if (patientProfileId != null && conceptCode != null && !conceptCode.isBlank()) {
            observations = observationRepository.findPatientTrendData(patientProfileId, conceptCode.trim().toUpperCase());
        } else {
            observations = observationRepository.findAll();
        }
        var responses = observations.stream().map(com.hospital.api.dto.response.MedicalObservationResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.ok(responses, "Tìm kiếm chỉ số EHR Observation thành công"));
    }

    // Tra cứu danh sách lượt khám EHR Encounters
    @GetMapping("/encounters/search")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.MedicalRecordResponse>>> searchEncounters(
            @RequestParam(required = false) UUID patientProfileId) {
        java.util.List<com.hospital.api.entity.MedicalExaminationRecord> records;
        if (patientProfileId != null) {
            records = recordRepository.findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(patientProfileId);
        } else {
            records = recordRepository.findAll();
        }
        var responses = records.stream().map(com.hospital.api.dto.response.MedicalRecordResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.ok(responses, "Tìm kiếm lượt khám EHR Encounters thành công"));
    }
}
