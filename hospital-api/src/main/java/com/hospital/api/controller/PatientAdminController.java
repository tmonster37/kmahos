package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.constant.Gender;
import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.AdminSavePatientRequest;
import com.hospital.api.dto.response.PatientAdminResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.MedicalExaminationRecord;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import com.hospital.api.repository.PatientProfileRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/patients")
@RequiredArgsConstructor
public class PatientAdminController {

    private final PatientProfileRepository patientProfileRepository;
    private final AccountRepository accountRepository;
    private final MedicalExaminationRecordRepository recordRepository;
    private final PasswordEncoder passwordEncoder;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.systemDefault());

    // 1. Lấy toàn bộ danh sách bệnh nhân cho Admin / Trưởng Khoa
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    @Transactional
    public ResponseEntity<ApiResponse<List<PatientAdminResponse>>> getAllPatients(
            @RequestParam(required = false) String keyword
    ) {
        // Đồng bộ các tài khoản bệnh nhân chưa có hồ sơ
        ensureProfilesForPatientAccounts();

        List<PatientProfile> profiles = patientProfileRepository.findAllByDeletedFalseOrderByCreatedAtDesc();

        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.toLowerCase().trim();
            profiles = profiles.stream().filter(p ->
                    (p.getFullName() != null && p.getFullName().toLowerCase().contains(kw)) ||
                    (p.getPhoneNumber() != null && p.getPhoneNumber().contains(kw)) ||
                    (p.getIdentityNumber() != null && p.getIdentityNumber().toLowerCase().contains(kw)) ||
                    (p.getHealthInsuranceNumber() != null && p.getHealthInsuranceNumber().toLowerCase().contains(kw))
            ).toList();
        }

        List<PatientAdminResponse> responses = profiles.stream()
                .map(this::mapToPatientAdminResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(responses, "Lấy danh sách bệnh nhân thành công"));
    }

    // 2. Lấy chi tiết hồ sơ bệnh nhân kèm lịch sử khám
    @GetMapping("/{profileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<PatientAdminResponse>> getPatientById(@PathVariable UUID profileId) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân!", HttpStatus.NOT_FOUND));

        return ResponseEntity.ok(ApiResponse.ok(mapToPatientAdminResponse(profile), "Lấy thông tin bệnh nhân thành công"));
    }

    // 3. Thêm mới hồ sơ bệnh nhân
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    @Transactional
    public ResponseEntity<ApiResponse<PatientAdminResponse>> createPatient(@Valid @RequestBody AdminSavePatientRequest request) {
        String phone = request.phoneNumber().trim();

        // Tìm hoặc tạo tài khoản cho bệnh nhân
        Account account = accountRepository.findByPhoneNumber(phone)
                .orElseGet(() -> {
                    Account newAcc = Account.builder()
                            .fullName(request.fullName().trim())
                            .phoneNumber(phone)
                            .email(request.email() != null && !request.email().isBlank() ? request.email().trim() : null)
                            .password(passwordEncoder.encode("password123"))
                            .role(Role.ROLE_PATIENT)
                            .balance(BigDecimal.ZERO)
                            .isActive(true)
                            .build();
                    return accountRepository.save(newAcc);
                });

        PatientProfile profile = PatientProfile.builder()
                .account(account)
                .fullName(request.fullName().trim())
                .phoneNumber(phone)
                .identityNumber(request.identityNumber() != null && !request.identityNumber().isBlank() ? request.identityNumber().trim() : null)
                .healthInsuranceNumber(request.healthInsuranceNumber() != null && !request.healthInsuranceNumber().isBlank() ? request.healthInsuranceNumber().trim() : null)
                .gender(request.gender())
                .dateOfBirth(request.dateOfBirth())
                .streetAddress(request.streetAddress() != null ? request.streetAddress().trim() : "")
                .province(request.province() != null ? request.province().trim() : "Thành phố Hà Nội")
                .district(request.district() != null ? request.district().trim() : "")
                .ward(request.ward() != null ? request.ward().trim() : "")
                .build();
        profile.setDeleted(false);

        PatientProfile saved = patientProfileRepository.save(profile);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(mapToPatientAdminResponse(saved), "Tạo hồ sơ bệnh nhân thành công"));
    }

    // 4. Cập nhật hồ sơ bệnh nhân
    @PutMapping("/{profileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    @Transactional
    public ResponseEntity<ApiResponse<PatientAdminResponse>> updatePatient(
            @PathVariable UUID profileId,
            @Valid @RequestBody AdminSavePatientRequest request
    ) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân!", HttpStatus.NOT_FOUND));

        profile.setFullName(request.fullName().trim());
        profile.setPhoneNumber(request.phoneNumber().trim());
        profile.setIdentityNumber(request.identityNumber() != null && !request.identityNumber().isBlank() ? request.identityNumber().trim() : null);
        profile.setHealthInsuranceNumber(request.healthInsuranceNumber() != null && !request.healthInsuranceNumber().isBlank() ? request.healthInsuranceNumber().trim() : null);
        profile.setGender(request.gender());
        profile.setDateOfBirth(request.dateOfBirth());
        profile.setStreetAddress(request.streetAddress() != null ? request.streetAddress().trim() : "");
        profile.setProvince(request.province() != null ? request.province().trim() : "");
        profile.setDistrict(request.district() != null ? request.district().trim() : "");
        profile.setWard(request.ward() != null ? request.ward().trim() : "");

        if (profile.getAccount() != null) {
            profile.getAccount().setFullName(request.fullName().trim());
            if (request.email() != null && !request.email().isBlank()) {
                profile.getAccount().setEmail(request.email().trim());
            }
            accountRepository.save(profile.getAccount());
        }

        PatientProfile updated = patientProfileRepository.save(profile);
        return ResponseEntity.ok(ApiResponse.ok(mapToPatientAdminResponse(updated), "Cập nhật hồ sơ bệnh nhân thành công"));
    }

    // 5. Xóa hồ sơ bệnh nhân (Soft Delete)
    @DeleteMapping("/{profileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deletePatient(@PathVariable UUID profileId) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân!", HttpStatus.NOT_FOUND));

        profile.setDeleted(true);
        patientProfileRepository.save(profile);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa hồ sơ bệnh nhân [" + profile.getFullName() + "] thành công"));
    }

    // Helper: Chuyển entity sang DTO response đầy đủ
    private PatientAdminResponse mapToPatientAdminResponse(PatientProfile p) {
        List<MedicalExaminationRecord> records = recordRepository
                .findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(p.getPatientProfileId());

        List<PatientAdminResponse.PatientVisitHistoryDto> historyList = new ArrayList<>();
        String lastVisitDate = null;

        for (MedicalExaminationRecord r : records) {
            String visitDate = r.getCreatedAt() != null ? DATE_TIME_FORMATTER.format(r.getCreatedAt()) : "---";
            if (lastVisitDate == null && r.getCreatedAt() != null) {
                lastVisitDate = visitDate;
            }

            String dept = (r.getDoctor() != null && r.getDoctor().getDepartment() != null)
                    ? r.getDoctor().getDepartment().getDepartmentName() : "Khoa Khám Bệnh";
            String doc = (r.getDoctor() != null && r.getDoctor().getAccount() != null)
                    ? r.getDoctor().getAccount().getFullName() : "Bác sĩ phụ trách";
            String diag = r.getFinalDiagnosis() != null ? r.getFinalDiagnosis()
                    : (r.getInitialDiagnosis() != null ? r.getInitialDiagnosis() : "Khám lâm sàng");
            BigDecimal cost = (r.getBooking() != null && r.getBooking().getPrice() != null)
                    ? r.getBooking().getPrice() : BigDecimal.valueOf(200000);
            String st = r.getState() != null ? r.getState().name() : "COMPLETED";

            historyList.add(PatientAdminResponse.PatientVisitHistoryDto.builder()
                    .recordId(r.getRecordId())
                    .visitDate(visitDate)
                    .departmentName(dept)
                    .doctorName(doc)
                    .diagnosis(diag)
                    .cost(cost)
                    .status(st)
                    .build());
        }

        // Tạo mã hiển thị BN-XXXX
        String idStr = p.getPatientProfileId().toString().replace("-", "").toUpperCase();
        String patientCode = "BN-" + idStr.substring(0, 6);

        // Ghép địa chỉ đầy đủ
        List<String> addrParts = new ArrayList<>();
        if (p.getStreetAddress() != null && !p.getStreetAddress().isBlank()) addrParts.add(p.getStreetAddress());
        if (p.getWard() != null && !p.getWard().isBlank()) addrParts.add(p.getWard());
        if (p.getDistrict() != null && !p.getDistrict().isBlank()) addrParts.add(p.getDistrict());
        if (p.getProvince() != null && !p.getProvince().isBlank()) addrParts.add(p.getProvince());
        String fullAddress = addrParts.isEmpty() ? "Hồ sơ đăng ký điện tử" : String.join(", ", addrParts);

        Account acc = p.getAccount();
        return PatientAdminResponse.builder()
                .patientProfileId(p.getPatientProfileId())
                .patientCode(patientCode)
                .fullName(p.getFullName())
                .phoneNumber(p.getPhoneNumber() != null ? p.getPhoneNumber() : (acc != null ? acc.getPhoneNumber() : "---"))
                .identityNumber(p.getIdentityNumber() != null ? p.getIdentityNumber() : "Chưa cập nhật")
                .healthInsuranceNumber(p.getHealthInsuranceNumber() != null ? p.getHealthInsuranceNumber() : null)
                .gender(p.getGender() != null ? p.getGender() : Gender.OTHER)
                .dateOfBirth(p.getDateOfBirth() != null ? p.getDateOfBirth() : LocalDate.of(1990, 1, 1))
                .streetAddress(p.getStreetAddress())
                .province(p.getProvince())
                .district(p.getDistrict())
                .ward(p.getWard())
                .fullAddress(fullAddress)
                .accountId(acc != null ? acc.getUserId() : null)
                .email(acc != null ? acc.getEmail() : null)
                .balance(acc != null && acc.getBalance() != null ? acc.getBalance() : BigDecimal.ZERO)
                .accountActive(acc != null && acc.isActive())
                .totalVisits(records.size())
                .lastVisitDate(lastVisitDate != null ? lastVisitDate : (p.getCreatedAt() != null ? DATE_TIME_FORMATTER.format(p.getCreatedAt()) : "---"))
                .createdAt(p.getCreatedAt())
                .history(historyList)
                .build();
    }

    // Helper: Đảm bảo các tài khoản bệnh nhân có hồ sơ tương ứng
    private void ensureProfilesForPatientAccounts() {
        List<Account> patientAccounts = accountRepository.findAllByDeletedFalse().stream()
                .filter(a -> a.getRole() == Role.ROLE_PATIENT)
                .toList();

        Set<String> existingPhones = patientProfileRepository.findAllByDeletedFalseOrderByCreatedAtDesc()
                .stream()
                .map(PatientProfile::getPhoneNumber)
                .filter(ph -> ph != null && !ph.isBlank())
                .collect(Collectors.toSet());

        for (Account acc : patientAccounts) {
            if (acc.getPhoneNumber() != null && !existingPhones.contains(acc.getPhoneNumber())) {
                PatientProfile autoProfile = PatientProfile.builder()
                        .account(acc)
                        .fullName(acc.getFullName())
                        .phoneNumber(acc.getPhoneNumber())
                        .gender(Gender.MALE)
                        .dateOfBirth(LocalDate.of(1990, 1, 1))
                        .streetAddress("Hồ sơ tài khoản đăng ký trực tuyến")
                        .province("Thành phố Hà Nội")
                        .build();
                autoProfile.setDeleted(false);
                patientProfileRepository.save(autoProfile);
                existingPhones.add(acc.getPhoneNumber());
            }
        }
    }
}
