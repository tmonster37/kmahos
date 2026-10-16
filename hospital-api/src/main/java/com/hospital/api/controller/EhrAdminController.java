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
@PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
@RequiredArgsConstructor
public class EhrAdminController {

    private final EhrDataMigrationService migrationService;
    private final com.hospital.api.repository.MedicalObservationRepository observationRepository;
    private final com.hospital.api.repository.MedicalExaminationRecordRepository recordRepository;

    // Chạy di trú dữ liệu chẩn đoán văn bản tự do cũ sang chuẩn ICD-10 Condition
    @PostMapping({"/migrate", "/migrate-all"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerEhrMigration() {
        Map<String, Object> result = migrationService.migrateLegacyDiagnoses();
        return ResponseEntity.ok(ApiResponse.ok(result, "Di trú dữ liệu bệnh án cũ sang chuẩn ICD-10 thành công"));
    }

    // Tra cứu danh sách chỉ số lâm sàng EHR Observations (Bảo vệ chống Full Data Dump)
    @GetMapping("/observations/search")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.MedicalObservationResponse>>> searchObservations(
            @RequestParam(required = false) UUID patientProfileId,
            @RequestParam(required = false) UUID recordId,
            @RequestParam(required = false) String conceptCode) {
        if (recordId == null && (patientProfileId == null || conceptCode == null || conceptCode.isBlank())) {
            throw new com.hospital.api.exception.AppException(
                    "Vui lòng cung cấp recordId hoặc (patientProfileId kèm conceptCode) để tra cứu chỉ số lâm sàng",
                    org.springframework.http.HttpStatus.BAD_REQUEST);
        }

        java.util.List<com.hospital.api.entity.MedicalObservation> observations;
        if (recordId != null) {
            observations = observationRepository.findAllByMedicalRecord_RecordIdOrderByRecordedAtAsc(recordId);
        } else {
            observations = observationRepository.findPatientTrendData(patientProfileId, conceptCode.trim().toUpperCase());
        }
        var responses = observations.stream().map(com.hospital.api.dto.response.MedicalObservationResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.ok(responses, "Tìm kiếm chỉ số EHR Observation thành công"));
    }

    // Tra cứu danh sách lượt khám EHR Encounters (Bảo vệ chống Full Data Dump)
    @GetMapping("/encounters/search")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.MedicalRecordResponse>>> searchEncounters(
            @RequestParam(required = false) UUID patientProfileId) {
        if (patientProfileId == null) {
            throw new com.hospital.api.exception.AppException(
                    "Vui lòng cung cấp patientProfileId để tra cứu hồ sơ bệnh án",
                    org.springframework.http.HttpStatus.BAD_REQUEST);
        }

        java.util.List<com.hospital.api.entity.MedicalExaminationRecord> records =
                recordRepository.findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(patientProfileId);
        var responses = records.stream().map(com.hospital.api.dto.response.MedicalRecordResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.ok(responses, "Tìm kiếm lượt khám EHR Encounters thành công"));
    }
}
