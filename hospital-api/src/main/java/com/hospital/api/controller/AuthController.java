package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.LoginRequest;
import com.hospital.api.dto.request.RegisterRequest;
import com.hospital.api.dto.response.AccountInfoResponse;
import com.hospital.api.dto.response.AuthResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AccountRepository accountRepository;

    public AuthController(AuthService authService, AccountRepository accountRepository) {
        this.authService = authService;
        this.accountRepository = accountRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Đăng ký tài khoản thành công"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Đăng nhập thành công"));
    }

    // Endpoint kiểm tra Token & lấy thông tin hồ sơ tài khoản (Bao gồm số dư ví nội bộ)
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AccountInfoResponse>> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        Account account = accountRepository.findByPhoneNumber(userDetails.getUsername())
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin tài khoản", HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(ApiResponse.ok(
                AccountInfoResponse.fromEntity(account),
                "Lấy thông tin tài khoản thành công"
        ));
    }
}
