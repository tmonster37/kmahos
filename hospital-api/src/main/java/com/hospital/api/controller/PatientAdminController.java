package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.constant.Gender;
import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.AdminSavePatientRequest;
import com.hospital.api.dto.response.PatientAdminResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Doctor;
import com.hospital.api.entity.MedicalExaminationRecord;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import com.hospital.api.repository.PatientProfileRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
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
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.systemDefault());

    // 1. Lấy danh sách bệnh nhân (ADMIN: toàn viện; HOD: chỉ bệnh nhân có ca khám tại khoa mình)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    @Transactional
    public ResponseEntity<ApiResponse<List<PatientAdminResponse>>> getAllPatients(
            @RequestParam(required = false) String keyword,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        ensureProfilesForPatientAccounts();

        Integer headDeptId = getHodDepartmentId(currentUser);

        List<PatientProfile> profiles = patientProfileRepository.findAllByDeletedFalseOrderByCreatedAtDesc();

        if (headDeptId != null) {
            final Integer deptId = headDeptId;
            profiles = profiles.stream().filter(p -> {
                List<MedicalExaminationRecord> recs = recordRepository
                        .findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(p.getPatientProfileId());
                return recs.stream().anyMatch(r -> r.getDoctor() != null && r.getDoctor().getDepartment() != null
                        && Objects.equals(r.getDoctor().getDepartment().getDepartmentId(), deptId));
            }).toList();
        }

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
                .map(p -> mapToPatientAdminResponse(p, headDeptId))
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(responses, "Lấy danh sách bệnh nhân thành công"));
    }

    // 2. Lấy chi tiết hồ sơ bệnh nhân kèm lịch sử khám (HOD chỉ xem ca khám thuộc khoa mình)
    @GetMapping("/{profileId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<PatientAdminResponse>> getPatientById(
            @PathVariable UUID profileId,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân!", HttpStatus.NOT_FOUND));

        Integer headDeptId = getHodDepartmentId(currentUser);
        if (headDeptId != null) {
            List<MedicalExaminationRecord> recs = recordRepository
                    .findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(profileId);
            boolean hasRecordInDept = recs.stream().anyMatch(r -> r.getDoctor() != null && r.getDoctor().getDepartment() != null
                    && Objects.equals(r.getDoctor().getDepartment().getDepartmentId(), headDeptId));
            if (!hasRecordInDept) {
                throw new AppException("Trưởng khoa chỉ có quyền xem thông tin bệnh nhân đã từng khám tại chuyên khoa phụ trách", HttpStatus.FORBIDDEN);
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(mapToPatientAdminResponse(profile, headDeptId), "Lấy thông tin bệnh nhân thành công"));
    }

    // 3. Thêm mới hồ sơ bệnh nhân (Chỉ ADMIN)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<PatientAdminResponse>> createPatient(
            @Valid @RequestBody AdminSavePatientRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String phone = request.phoneNumber().trim();

        Account account = accountRepository.findByPhoneNumber(phone)
                .orElseGet(() -> {
                    String securePass = "Bn@" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
                    Account newAcc = Account.builder()
                            .fullName(request.fullName().trim())
                            .phoneNumber(phone)
                            .email(request.email() != null && !request.email().isBlank() ? request.email().trim() : null)
                            .password(passwordEncoder.encode(securePass))
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
                .province(request.province() != null ? request.province().trim() : "")
                .district(request.district() != null ? request.district().trim() : "")
                .ward(request.ward() != null ? request.ward().trim() : "")
                .build();
        profile.setDeleted(false);

        PatientProfile saved = patientProfileRepository.save(profile);

        if (currentUser != null) {
            auditLogService.log(currentUser.getId(), currentUser.getUsername(), "ROLE_ADMIN", "CREATE_PATIENT",
                    "PATIENT_PROFILE", saved.getPatientProfileId().toString(),
                    "Tạo hồ sơ bệnh nhân: " + saved.getFullName() + " (" + saved.getPhoneNumber() + ")",
                    servletRequest != null ? servletRequest.getRemoteAddr() : "127.0.0.1");
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(mapToPatientAdminResponse(saved, null), "Tạo hồ sơ bệnh nhân thành công"));
    }

    // 4. Cập nhật hồ sơ bệnh nhân (Chỉ ADMIN)
    @PutMapping("/{profileId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<PatientAdminResponse>> updatePatient(
            @PathVariable UUID profileId,
            @Valid @RequestBody AdminSavePatientRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân!", HttpStatus.NOT_FOUND));

        String newPhone = request.phoneNumber().trim();
        profile.setFullName(request.fullName().trim());
        profile.setPhoneNumber(newPhone);
        profile.setIdentityNumber(request.identityNumber() != null && !request.identityNumber().isBlank() ? request.identityNumber().trim() : null);
        profile.setHealthInsuranceNumber(request.healthInsuranceNumber() != null && !request.healthInsuranceNumber().isBlank() ? request.healthInsuranceNumber().trim() : null);
        profile.setGender(request.gender());
        profile.setDateOfBirth(request.dateOfBirth());
        profile.setStreetAddress(request.streetAddress() != null ? request.streetAddress().trim() : "");
        profile.setProvince(request.province() != null ? request.province().trim() : "");
        profile.setDistrict(request.district() != null ? request.district().trim() : "");
        profile.setWard(request.ward() != null ? request.ward().trim() : "");

        // Đồng bộ 2 chiều sang Account liên kết
        if (profile.getAccount() != null) {
            String oldPhone = profile.getAccount().getPhoneNumber();
            if (!newPhone.equals(oldPhone)) {
                if (accountRepository.existsByPhoneNumber(newPhone)) {
                    throw new AppException("Số điện thoại này đã được sử dụng bởi tài khoản khác!", HttpStatus.BAD_REQUEST);
                }
                profile.getAccount().setPhoneNumber(newPhone);
            }
            profile.getAccount().setFullName(request.fullName().trim());
            if (request.email() != null && !request.email().isBlank()) {
                profile.getAccount().setEmail(request.email().trim());
            }
            accountRepository.save(profile.getAccount());
        }

        PatientProfile updated = patientProfileRepository.save(profile);

        if (currentUser != null) {
            auditLogService.log(currentUser.getId(), currentUser.getUsername(), "ROLE_ADMIN", "UPDATE_PATIENT",
                    "PATIENT_PROFILE", updated.getPatientProfileId().toString(),
                    "Cập nhật hồ sơ bệnh nhân: " + updated.getFullName(),
                    servletRequest != null ? servletRequest.getRemoteAddr() : "127.0.0.1");
        }

        return ResponseEntity.ok(ApiResponse.ok(mapToPatientAdminResponse(updated, null), "Cập nhật hồ sơ bệnh nhân thành công"));
    }

    // 5. Xóa hồ sơ bệnh nhân (Chỉ ADMIN - Soft Delete)
    @DeleteMapping("/{profileId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deletePatient(
            @PathVariable UUID profileId,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        PatientProfile profile = patientProfileRepository.findById(profileId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ bệnh nhân!", HttpStatus.NOT_FOUND));

        profile.setDeleted(true);
        patientProfileRepository.save(profile);

        if (currentUser != null) {
            auditLogService.log(currentUser.getId(), currentUser.getUsername(), "ROLE_ADMIN", "DELETE_PATIENT",
                    "PATIENT_PROFILE", profile.getPatientProfileId().toString(),
                    "Xóa mềm hồ sơ bệnh nhân: " + profile.getFullName(),
                    servletRequest != null ? servletRequest.getRemoteAddr() : "127.0.0.1");
        }

        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa hồ sơ bệnh nhân [" + profile.getFullName() + "] thành công"));
    }

    // Helper: Lấy departmentId của Trưởng khoa (nếu là HOD và không phải ADMIN)
    private Integer getHodDepartmentId(UserPrincipal currentUser) {
        if (currentUser == null) return null;
        boolean isHod = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HEAD_OF_DEPARTMENT"));
        boolean isAdmin = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isHod && !isAdmin) {
            Doctor headDoc = doctorRepository.findByAccount_UserId(currentUser.getId())
                    .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin trưởng khoa", HttpStatus.FORBIDDEN));
            if (headDoc.getDepartment() == null) {
                throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
            }
            return headDoc.getDepartment().getDepartmentId();
        }
        return null;
    }

    // Helper: Chuyển entity sang DTO response đầy đủ, lọc records theo khoa nếu caller là HOD
    private PatientAdminResponse mapToPatientAdminResponse(PatientProfile p, Integer headDeptId) {
        List<MedicalExaminationRecord> records = recordRepository
                .findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(p.getPatientProfileId());

        if (headDeptId != null) {
            records = records.stream()
                    .filter(r -> r.getDoctor() != null && r.getDoctor().getDepartment() != null
                            && Objects.equals(r.getDoctor().getDepartment().getDepartmentId(), headDeptId))
                    .toList();
        }

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
                    ? r.getBooking().getPrice() : BigDecimal.ZERO;
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

        String idStr = p.getPatientProfileId().toString().replace("-", "").toUpperCase();
        String patientCode = "BN-" + idStr.substring(0, 6);

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
                .dateOfBirth(p.getDateOfBirth())
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

    // Helper: Đảm bảo các tài khoản bệnh nhân có hồ sơ tương ứng (không gán ngày sinh / tỉnh giả)
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
                        .gender(Gender.OTHER)
                        .streetAddress("Hồ sơ tài khoản đăng ký trực tuyến")
                        .build();
                autoProfile.setDeleted(false);
                patientProfileRepository.save(autoProfile);
                existingPhones.add(acc.getPhoneNumber());
            }
        }
    }
}
