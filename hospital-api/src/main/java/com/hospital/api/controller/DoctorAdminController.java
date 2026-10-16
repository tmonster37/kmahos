package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.DoctorCreateRequest;
import com.hospital.api.dto.request.DoctorUpdateRequest;
import com.hospital.api.dto.response.DoctorAdminResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Department;
import com.hospital.api.entity.Doctor;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.DoctorRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/admin/doctors", "/api/doctors"})
@RequiredArgsConstructor
public class DoctorAdminController {

    private final DoctorRepository doctorRepository;
    private final AccountRepository accountRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    // 1. Lấy danh sách toàn bộ Bác sĩ (Công khai hoặc Admin xem)
    @GetMapping
    public ResponseEntity<ApiResponse<List<DoctorAdminResponse>>> getAllDoctors(
            @RequestParam(required = false) Integer departmentId
    ) {
        List<Doctor> doctors;
        if (departmentId != null) {
            doctors = doctorRepository.findAllByDepartment_DepartmentIdAndDeletedFalse(departmentId);
        } else {
            doctors = doctorRepository.findAllByDeletedFalse();
        }

        List<DoctorAdminResponse> responses = doctors.stream()
                .map(DoctorAdminResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(responses, "Lấy danh sách bác sĩ thành công"));
    }

    // 2. Thêm mới Bác sĩ (Tạo Account + Doctor)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    @Transactional
    public ResponseEntity<ApiResponse<DoctorAdminResponse>> createDoctor(@Valid @RequestBody DoctorCreateRequest request) {
        if (accountRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new AppException("Số điện thoại này đã được sử dụng", HttpStatus.BAD_REQUEST);
        }

        if (request.email() != null && !request.email().isBlank() && accountRepository.existsByEmail(request.email())) {
            throw new AppException("Email này đã được sử dụng", HttpStatus.BAD_REQUEST);
        }

        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new AppException("Chuyên khoa không tồn tại", HttpStatus.NOT_FOUND));

        // Tạo tài khoản cho bác sĩ
        Account account = Account.builder()
                .fullName(request.fullName().trim())
                .phoneNumber(request.phoneNumber().trim())
                .email(request.email() != null ? request.email().trim() : null)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.ROLE_DOCTOR)
                .isActive(true)
                .balance(BigDecimal.ZERO)
                .build();
        account = accountRepository.save(account);

        // Tạo thông tin chi tiết Bác sĩ
        Doctor doctor = Doctor.builder()
                .account(account)
                .department(department)
                .degree(request.degree())
                .biography(request.biography())
                .consultationFee(request.consultationFee() != null ? request.consultationFee() : BigDecimal.valueOf(200000))
                .ratingAverage(5.0)
                .build();
        doctor = doctorRepository.save(doctor);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(DoctorAdminResponse.fromEntity(doctor), "Thêm bác sĩ thành công"));
    }

    // 3. Cập nhật thông tin Bác sĩ
    @PutMapping("/{doctorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    @Transactional
    public ResponseEntity<ApiResponse<DoctorAdminResponse>> updateDoctor(
            @PathVariable UUID doctorId,
            @Valid @RequestBody DoctorUpdateRequest request
    ) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));

        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new AppException("Chuyên khoa không tồn tại", HttpStatus.NOT_FOUND));

        Account account = doctor.getAccount();
        account.setFullName(request.fullName().trim());
        if (request.phoneNumber() != null && !request.phoneNumber().isBlank() && !request.phoneNumber().trim().equals(account.getPhoneNumber())) {
            if (accountRepository.existsByPhoneNumber(request.phoneNumber().trim())) {
                throw new AppException("Số điện thoại này đã được sử dụng bởi tài khoản khác", HttpStatus.BAD_REQUEST);
            }
            account.setPhoneNumber(request.phoneNumber().trim());
        }
        if (request.email() != null && !request.email().isBlank()) {
            account.setEmail(request.email().trim());
        }
        if (request.password() != null && !request.password().isBlank()) {
            account.setPassword(passwordEncoder.encode(request.password()));
        }
        accountRepository.save(account);

        doctor.setDepartment(department);
        doctor.setDegree(request.degree());
        doctor.setBiography(request.biography());
        if (request.consultationFee() != null) {
            doctor.setConsultationFee(request.consultationFee());
        }
        doctor = doctorRepository.save(doctor);

        return ResponseEntity.ok(ApiResponse.ok(DoctorAdminResponse.fromEntity(doctor), "Cập nhật bác sĩ thành công"));
    }

    // 4. Xóa mềm Bác sĩ
    @DeleteMapping("/{doctorId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteDoctor(@PathVariable UUID doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));

        doctor.setDeleted(true);
        doctor.getAccount().setActive(false);
        doctorRepository.save(doctor);
        accountRepository.save(doctor.getAccount());

        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xóa bác sĩ thành công"));
    }

    // 5. Phân công khoa cho Bác sĩ
    @PatchMapping("/{doctorId}/assign-department")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<DoctorAdminResponse>> assignDepartment(
            @PathVariable UUID doctorId,
            @RequestParam Integer departmentId
    ) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));

        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new AppException("Chuyên khoa không tồn tại", HttpStatus.NOT_FOUND));
        doctor.setDepartment(department);
        doctor = doctorRepository.save(doctor);

        return ResponseEntity.ok(ApiResponse.ok(DoctorAdminResponse.fromEntity(doctor), "Phân công chuyên khoa cho bác sĩ thành công"));
    }

    // 6. Bổ nhiệm / Bãi nhiệm Trưởng khoa
    @PatchMapping("/{doctorId}/set-head-of-department")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<DoctorAdminResponse>> setHeadOfDepartment(
            @PathVariable UUID doctorId,
            @RequestParam boolean isHead
    ) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));

        Account account = doctor.getAccount();
        account.setRole(isHead ? Role.ROLE_HEAD_OF_DEPARTMENT : Role.ROLE_DOCTOR);
        accountRepository.save(account);

        return ResponseEntity.ok(ApiResponse.ok(DoctorAdminResponse.fromEntity(doctor),
                isHead ? "Bổ nhiệm Trưởng khoa thành công" : "Bãi nhiệm Trưởng khoa thành công"));
    }

    // 7. Cập nhật Chứng chỉ hành nghề (CCHN) cho Bác sĩ (Thông tư Bộ Y tế)
    @PutMapping("/{doctorId}/license")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<com.hospital.api.dto.response.DoctorLicenseResponse>> updateDoctorLicense(
            @PathVariable UUID doctorId,
            @Valid @RequestBody com.hospital.api.dto.request.UpdateDoctorLicenseRequest request
    ) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));

        doctor.setDoctorLicense(request.doctorLicense().trim());
        if (request.licenseIssuedDate() != null) {
            doctor.setLicenseIssuedDate(request.licenseIssuedDate());
        }
        if (request.licenseScope() != null) {
            doctor.setLicenseScope(request.licenseScope().trim());
        }
        doctor = doctorRepository.save(doctor);

        return ResponseEntity.ok(ApiResponse.ok(
                com.hospital.api.dto.response.DoctorLicenseResponse.fromEntity(doctor),
                "Cập nhật chứng chỉ hành nghề cho bác sĩ thành công"
        ));
    }

    // 8. Tra cứu danh sách chứng chỉ hành nghề của toàn bộ bác sĩ
    @GetMapping("/licenses")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<List<com.hospital.api.dto.response.DoctorLicenseResponse>>> getDoctorLicenses(
            @RequestParam(required = false, defaultValue = "false") boolean onlyUnlicensed
    ) {
        List<Doctor> doctors = doctorRepository.findAllByDeletedFalse();
        if (onlyUnlicensed) {
            doctors = doctors.stream()
                    .filter(d -> d.getDoctorLicense() == null || d.getDoctorLicense().isBlank())
                    .toList();
        }

        List<com.hospital.api.dto.response.DoctorLicenseResponse> responses = doctors.stream()
                .map(com.hospital.api.dto.response.DoctorLicenseResponse::fromEntity)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(responses, "Lấy danh sách chứng chỉ hành nghề bác sĩ thành công"));
    }
}
