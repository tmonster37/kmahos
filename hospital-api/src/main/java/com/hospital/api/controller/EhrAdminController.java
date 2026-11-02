package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.entity.Doctor;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import com.hospital.api.repository.MedicalObservationRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.EhrDataMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping({"/api/admin/ehr", "/api/ehr"})
@RequiredArgsConstructor
public class EhrAdminController {

    private final EhrDataMigrationService migrationService;
    private final MedicalObservationRepository observationRepository;
    private final MedicalExaminationRecordRepository recordRepository;
    private final DoctorRepository doctorRepository;

    // Chạy di trú dữ liệu chẩn đoán văn bản tự do cũ sang chuẩn ICD-10 Condition (Độc quyền ADMIN)
    @PostMapping({"/migrate", "/migrate-all"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerEhrMigration() {
        Map<String, Object> result = migrationService.migrateLegacyDiagnoses();
        return ResponseEntity.ok(ApiResponse.ok(result, "Di trú dữ liệu bệnh án cũ sang chuẩn ICD-10 thành công"));
    }

    // Tra cứu danh sách chỉ số lâm sàng EHR Observations (Bảo vệ chống Full Data Dump)
    @GetMapping("/observations/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.MedicalObservationResponse>>> searchObservations(
            @RequestParam(required = false) UUID patientProfileId,
            @RequestParam(required = false) UUID recordId,
            @RequestParam(required = false) String conceptCode) {
        if (recordId == null && (patientProfileId == null || conceptCode == null || conceptCode.isBlank())) {
            throw new AppException(
                    "Vui lòng cung cấp recordId hoặc (patientProfileId kèm conceptCode) để tra cứu chỉ số lâm sàng",
                    HttpStatus.BAD_REQUEST);
        }

        List<com.hospital.api.entity.MedicalObservation> observations;
        if (recordId != null) {
            observations = observationRepository.findAllByMedicalRecord_RecordIdOrderByRecordedAtAsc(recordId);
        } else {
            observations = observationRepository.findPatientTrendData(patientProfileId, conceptCode.trim().toUpperCase());
        }
        var responses = observations.stream().map(com.hospital.api.dto.response.MedicalObservationResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.ok(responses, "Tìm kiếm chỉ số EHR Observation thành công"));
    }

    // Tra cứu danh sách lượt khám EHR Encounters (HOD chỉ xem ca khám thuộc khoa mình)
    @GetMapping("/encounters/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.MedicalRecordResponse>>> searchEncounters(
            @RequestParam(required = false) UUID patientProfileId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (patientProfileId == null) {
            throw new AppException(
                    "Vui lòng cung cấp patientProfileId để tra cứu hồ sơ bệnh án",
                    HttpStatus.BAD_REQUEST);
        }

        List<com.hospital.api.entity.MedicalExaminationRecord> records =
                recordRepository.findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(patientProfileId);

        // Nếu là HOD (không phải Admin): Lọc chỉ giữ lại ca khám thuộc khoa của mình
        if (currentUser != null && currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HEAD_OF_DEPARTMENT"))) {
            boolean isAdmin = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                Doctor headDoc = doctorRepository.findByAccount_UserId(currentUser.getId()).orElse(null);
                if (headDoc != null && headDoc.getDepartment() != null) {
                    Integer headDeptId = headDoc.getDepartment().getDepartmentId();
                    records = records.stream()
                            .filter(r -> r.getDoctor() != null && r.getDoctor().getDepartment() != null
                                    && Objects.equals(r.getDoctor().getDepartment().getDepartmentId(), headDeptId))
                            .toList();
                }
            }
        }

        var responses = records.stream().map(com.hospital.api.dto.response.MedicalRecordResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.ok(responses, "Tìm kiếm lượt khám EHR Encounters thành công"));
    }
}
