package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.constant.Role;
import com.hospital.api.entity.Account;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.PatientProfileRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
public class AccountAdminController {

    private final AccountRepository accountRepository;
    private final DoctorRepository doctorRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final PasswordEncoder passwordEncoder;

    // DTO Response
    @Builder
    public record AccountResponse(
            UUID userId,
            String fullName,
            String phoneNumber,
            String email,
            Role role,
            BigDecimal balance,
            boolean isActive,
            java.time.Instant createdAt,
            java.time.Instant updatedAt
    ) {
        public static AccountResponse fromEntity(Account account) {
            return AccountResponse.builder()
                    .userId(account.getUserId())
                    .fullName(account.getFullName())
                    .phoneNumber(account.getPhoneNumber())
                    .email(account.getEmail())
                    .role(account.getRole())
                    .balance(account.getBalance())
                    .isActive(account.isActive())
                    .createdAt(account.getCreatedAt())
                    .updatedAt(account.getUpdatedAt())
                    .build();
        }
    }

    // DTO Create Request
    public record CreateAccountRequest(
            @NotBlank(message = "Họ tên không được để trống") String fullName,
            @NotBlank(message = "Số điện thoại không được để trống") String phoneNumber,
            String email,
            @NotBlank(message = "Mật khẩu không được để trống") String password,
            Role role
    ) {}

    // DTO Update Request
    public record UpdateAccountRequest(
            @NotBlank(message = "Họ tên không được để trống") String fullName,
            @NotBlank(message = "Số điện thoại không được để trống") String phoneNumber,
            String email,
            Role role
    ) {}

    // DTO Reset Password Request
    public record ResetPasswordRequest(
            @NotBlank(message = "Mật khẩu mới không được để trống")
            @jakarta.validation.constraints.Size(min = 6, message = "Mật khẩu mới phải có ít nhất 6 ký tự")
            String newPassword
    ) {}

    // 1. Lấy danh sách toàn bộ tài khoản (hỗ trợ lọc theo role, tìm kiếm)
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AccountResponse>>> getAllAccounts(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) String keyword
    ) {
        List<Account> accounts = accountRepository.findAllByDeletedFalse();

        if (role != null) {
            accounts = accounts.stream().filter(a -> a.getRole() == role).toList();
        }

        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.toLowerCase().trim();
            accounts = accounts.stream().filter(a ->
                    (a.getFullName() != null && a.getFullName().toLowerCase().contains(kw)) ||
                    (a.getPhoneNumber() != null && a.getPhoneNumber().contains(kw)) ||
                    (a.getEmail() != null && a.getEmail().toLowerCase().contains(kw))
            ).toList();
        }

        List<AccountResponse> responses = accounts.stream().map(AccountResponse::fromEntity).toList();
        return ResponseEntity.ok(ApiResponse.ok(responses, "Lấy danh sách tài khoản thành công"));
    }

    // 2. Thêm mới tài khoản người dùng / nhân viên
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<AccountResponse>> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        String phone = request.phoneNumber().trim();
        if (accountRepository.existsByPhoneNumber(phone)) {
            throw new AppException("Số điện thoại này đã được sử dụng!", HttpStatus.BAD_REQUEST);
        }

        if (request.email() != null && !request.email().isBlank() && accountRepository.existsByEmail(request.email().trim())) {
            throw new AppException("Email này đã được sử dụng!", HttpStatus.BAD_REQUEST);
        }

        Account account = Account.builder()
                .fullName(request.fullName().trim())
                .phoneNumber(phone)
                .email(request.email() != null && !request.email().isBlank() ? request.email().trim() : null)
                .password(passwordEncoder.encode(request.password()))
                .role(request.role() != null ? request.role() : Role.ROLE_PATIENT)
                .balance(BigDecimal.ZERO)
                .isActive(true)
                .build();

        account = accountRepository.save(account);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(AccountResponse.fromEntity(account), "Tạo tài khoản thành công"));
    }

    // 3. Cập nhật thông tin tài khoản
    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<AccountResponse>> updateAccount(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateAccountRequest request
    ) {
        Account account = accountRepository.findById(userId)
                .orElseThrow(() -> new AppException("Tài khoản không tồn tại!", HttpStatus.NOT_FOUND));

        String phone = request.phoneNumber().trim();
        if (!phone.equals(account.getPhoneNumber()) && accountRepository.existsByPhoneNumber(phone)) {
            throw new AppException("Số điện thoại này đã được sử dụng bởi tài khoản khác!", HttpStatus.BAD_REQUEST);
        }

        if (request.email() != null && !request.email().isBlank() && !request.email().trim().equalsIgnoreCase(account.getEmail())) {
            if (accountRepository.existsByEmail(request.email().trim())) {
                throw new AppException("Email này đã được sử dụng bởi tài khoản khác!", HttpStatus.BAD_REQUEST);
            }
            account.setEmail(request.email().trim());
        }

        account.setFullName(request.fullName().trim());
        account.setPhoneNumber(phone);
        if (request.role() != null) {
            account.setRole(request.role());
        }

        account = accountRepository.save(account);
        return ResponseEntity.ok(ApiResponse.ok(AccountResponse.fromEntity(account), "Cập nhật tài khoản thành công"));
    }

    // 4. Khóa / Mở khóa tài khoản (Toggle isActive)
    @PutMapping("/{userId}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<AccountResponse>> toggleStatus(@PathVariable UUID userId) {
        Account account = accountRepository.findById(userId)
                .orElseThrow(() -> new AppException("Tài khoản không tồn tại!", HttpStatus.NOT_FOUND));

        account.setActive(!account.isActive());
        account = accountRepository.save(account);

        String msg = account.isActive() ? "Đã mở khóa tài khoản thành công" : "Đã khóa tài khoản thành công";
        return ResponseEntity.ok(ApiResponse.ok(AccountResponse.fromEntity(account), msg));
    }

    // 5. Đặt lại mật khẩu (Reset Password)
    @PutMapping("/{userId}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable UUID userId,
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        Account account = accountRepository.findById(userId)
                .orElseThrow(() -> new AppException("Tài khoản không tồn tại!", HttpStatus.NOT_FOUND));

        account.setPassword(passwordEncoder.encode(request.newPassword()));
        accountRepository.save(account);

        return ResponseEntity.ok(ApiResponse.ok(null, "Đặt lại mật khẩu cho tài khoản [" + account.getFullName() + "] thành công"));
    }

    // 6. Xóa tài khoản (Soft Delete) - Hỗ trợ cả DELETE và POST /{userId}/delete
    @RequestMapping(value = "/{userId}", method = RequestMethod.DELETE)
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteAccount(@PathVariable UUID userId) {
        return performDeleteAccount(userId);
    }

    @PostMapping("/{userId}/delete")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteAccountViaPost(@PathVariable UUID userId) {
        return performDeleteAccount(userId);
    }

    private ResponseEntity<ApiResponse<Void>> performDeleteAccount(UUID userId) {
        Account account = accountRepository.findById(userId)
                .orElseThrow(() -> new AppException("Tài khoản không tồn tại!", HttpStatus.NOT_FOUND));

        if (account.getRole() == Role.ROLE_ADMIN) {
            long adminCount = accountRepository.findAllByDeletedFalse().stream()
                    .filter(a -> a.getRole() == Role.ROLE_ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new AppException("Không thể xóa Quản trị viên (Admin) duy nhất của hệ thống!", HttpStatus.BAD_REQUEST);
            }
        }

        // Soft delete account
        account.setDeleted(true);
        account.setActive(false);
        accountRepository.save(account);

        // Cascade soft delete cho Doctor (nếu có)
        doctorRepository.findByAccount_UserId(userId).ifPresent(doctor -> {
            doctor.setDeleted(true);
            doctorRepository.save(doctor);
        });

        // Cascade soft delete cho Hồ sơ bệnh nhân (nếu có)
        patientProfileRepository.findAllByAccount_UserIdAndDeletedFalse(userId).forEach(profile -> {
            profile.setDeleted(true);
            patientProfileRepository.save(profile);
        });

        return ResponseEntity.ok(ApiResponse.ok(null, "Xóa tài khoản [" + account.getFullName() + "] thành công"));
    }
}
