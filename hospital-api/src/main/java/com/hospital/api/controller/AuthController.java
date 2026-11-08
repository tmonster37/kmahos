package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.ForgotPasswordRequest;
import com.hospital.api.dto.request.GoogleLoginRequest;
import com.hospital.api.dto.request.LoginRequest;
import com.hospital.api.dto.request.RegisterRequest;
import com.hospital.api.dto.request.SendOtpRequest;
import com.hospital.api.dto.request.VerifyOtpRequest;
import com.hospital.api.dto.response.AccountInfoResponse;
import com.hospital.api.dto.response.AuthResponse;
import com.hospital.api.dto.response.OtpResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.service.AuthService;
import com.hospital.api.service.OtpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AccountRepository accountRepository;
    private final OtpService otpService;
    private final Environment environment;

    public AuthController(AuthService authService,
                          AccountRepository accountRepository,
                          OtpService otpService,
                          Environment environment) {
        this.authService = authService;
        this.accountRepository = accountRepository;
        this.otpService = otpService;
        this.environment = environment;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse httpResponse) {
        AuthResponse response = authService.register(request);
        if (response.accessToken() != null) {
            setAuthCookie(httpResponse, response.accessToken());
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(response, "Đăng ký tài khoản bệnh nhân thành công"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse httpResponse) {
        AuthResponse response = authService.login(request);
        if (response.accessToken() != null) {
            setAuthCookie(httpResponse, response.accessToken());
        }
        return ResponseEntity.ok(ApiResponse.ok(response, "Đăng nhập thành công"));
    }

    // Đăng nhập nhanh qua Google Sign-In (OpenID Connect ID Token Verification)
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> loginGoogle(
            @Valid @RequestBody GoogleLoginRequest request,
            HttpServletResponse httpResponse) {
        AuthResponse response = authService.loginWithGoogle(request);
        if (response.accessToken() != null) {
            setAuthCookie(httpResponse, response.accessToken());
        }
        return ResponseEntity.ok(ApiResponse.ok(response, "Đăng nhập Google thành công"));
    }

    // Đăng xuất: Xóa HttpOnly cookie access_token
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletResponse httpResponse) {
        boolean isSecure = environment != null && (environment.matchesProfiles("prod") || environment.matchesProfiles("production"));
        ResponseCookie cookie = ResponseCookie.from("access_token", "")
                .httpOnly(true)
                .secure(isSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        httpResponse.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.ok(ApiResponse.ok(null, "Đăng xuất thành công"));
    }

    // Gửi mã OTP xác thực qua Email bảo mật (Khôi phục tài khoản / Xác nhận liên kết tài khoản)
    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<OtpResponse>> sendOtp(
            @Valid @RequestBody SendOtpRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        OtpResponse response = otpService.sendOtp(request, clientIp);
        return ResponseEntity.ok(ApiResponse.ok(response, "Gửi mã OTP thành công"));
    }

    // Xác minh mã OTP
    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Boolean>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        boolean valid = otpService.verifyOtp(request, clientIp);
        return ResponseEntity.ok(ApiResponse.ok(valid, "Xác minh mã OTP thành công"));
    }

    // Khôi phục mật khẩu tài khoản
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Khôi phục mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."));
    }

    // Endpoint kiểm tra Token & lấy thông tin hồ sơ tài khoản (Bao gồm số dư ví nội bộ)
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AccountInfoResponse>> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        Account account = accountRepository.findByPhoneNumber(userDetails.getUsername())
                .or(() -> accountRepository.findByEmail(userDetails.getUsername()))
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin tài khoản", HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(ApiResponse.ok(
                AccountInfoResponse.fromEntity(account),
                "Lấy thông tin tài khoản thành công"
        ));
    }

    private void setAuthCookie(HttpServletResponse response, String token) {
        boolean isSecure = environment != null && (environment.matchesProfiles("prod") || environment.matchesProfiles("production"));
        ResponseCookie cookie = ResponseCookie.from("access_token", token)
                .httpOnly(true)
                .secure(isSecure)
                .path("/")
                .maxAge(86400) // 24 hours
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
