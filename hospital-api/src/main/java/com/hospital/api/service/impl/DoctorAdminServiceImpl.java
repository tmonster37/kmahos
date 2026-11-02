package com.hospital.api.service.impl;

import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.DoctorCreateRequest;
import com.hospital.api.dto.request.DoctorUpdateRequest;
import com.hospital.api.dto.request.UpdateDoctorLicenseRequest;
import com.hospital.api.dto.response.DoctorAdminResponse;
import com.hospital.api.dto.response.DoctorLicenseResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Department;
import com.hospital.api.entity.Doctor;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.DoctorAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DoctorAdminServiceImpl implements DoctorAdminService {

    private final DoctorRepository doctorRepository;
    private final AccountRepository accountRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<DoctorAdminResponse> getAllDoctors(Integer departmentId) {
        return getAllDoctors(departmentId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DoctorAdminResponse> getAllDoctors(Integer departmentId, UserPrincipal currentUser) {
        Integer effectiveDeptId = departmentId;
        if (currentUser != null && currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HEAD_OF_DEPARTMENT"))) {
            boolean isAdmin = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                Doctor headDoc = doctorRepository.findByAccount_UserId(currentUser.getId())
                        .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin trưởng khoa", HttpStatus.FORBIDDEN));
                if (headDoc.getDepartment() == null) {
                    throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
                }
                // Trưởng khoa chỉ được phép xem danh sách bác sĩ thuộc khoa mình phụ trách
                effectiveDeptId = headDoc.getDepartment().getDepartmentId();
            }
        }

        List<Doctor> doctors;
        if (effectiveDeptId != null) {
            doctors = doctorRepository.findAllByDepartmentWithAccountAndDepartment(effectiveDeptId);
        } else {
            doctors = doctorRepository.findAllWithAccountAndDepartment();
        }

        return doctors.stream()
                .map(DoctorAdminResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public DoctorAdminResponse createDoctor(DoctorCreateRequest request) {
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

        return DoctorAdminResponse.fromEntity(doctor);
    }

    @Override
    @Transactional
    public DoctorAdminResponse updateDoctor(UUID doctorId, DoctorUpdateRequest request) {
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

        return DoctorAdminResponse.fromEntity(doctor);
    }

    @Override
    @Transactional
    public void deleteDoctor(UUID doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));

        doctor.setDeleted(true);
        if (doctor.getAccount() != null) {
            doctor.getAccount().setActive(false);
            accountRepository.save(doctor.getAccount());
        }
        doctorRepository.save(doctor);
    }

    @Override
    @Transactional
    public DoctorAdminResponse assignDepartment(UUID doctorId, Integer departmentId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));

        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new AppException("Chuyên khoa không tồn tại", HttpStatus.NOT_FOUND));
        doctor.setDepartment(department);
        doctor = doctorRepository.save(doctor);

        return DoctorAdminResponse.fromEntity(doctor);
    }

    @Override
    @Transactional
    public DoctorAdminResponse setHeadOfDepartment(UUID doctorId, boolean isHead) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));

        Account account = doctor.getAccount();
        if (account != null) {
            account.setRole(isHead ? Role.ROLE_HEAD_OF_DEPARTMENT : Role.ROLE_DOCTOR);
            accountRepository.save(account);
        }

        return DoctorAdminResponse.fromEntity(doctor);
    }

    @Override
    @Transactional
    public DoctorLicenseResponse updateDoctorLicense(UUID doctorId, UpdateDoctorLicenseRequest request) {
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

        return DoctorLicenseResponse.fromEntity(doctor);
    }

    @Override
    public List<DoctorLicenseResponse> getDoctorLicenses(boolean onlyUnlicensed) {
        List<Doctor> doctors = doctorRepository.findAllByDeletedFalse();
        if (onlyUnlicensed) {
            doctors = doctors.stream()
                    .filter(d -> d.getDoctorLicense() == null || d.getDoctorLicense().isBlank())
                    .toList();
        }

        return doctors.stream()
                .map(DoctorLicenseResponse::fromEntity)
                .toList();
    }
}

