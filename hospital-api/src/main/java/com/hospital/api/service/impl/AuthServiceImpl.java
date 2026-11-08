package com.hospital.api.service.impl;

import com.hospital.api.constant.OtpPurpose;
import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.ForgotPasswordRequest;
import com.hospital.api.dto.request.GoogleLoginRequest;
import com.hospital.api.dto.request.LoginRequest;
import com.hospital.api.dto.request.RegisterRequest;
import com.hospital.api.dto.response.AuthResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.security.JwtTokenProvider;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.AuthService;
import com.hospital.api.service.GoogleTokenVerifierService;
import com.hospital.api.service.GoogleTokenVerifierService.GoogleUserInfo;
import com.hospital.api.service.OtpService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
public class AuthServiceImpl implements AuthService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final GoogleTokenVerifierService googleTokenVerifierService;
    private final OtpService otpService;

    public AuthServiceImpl(AccountRepository accountRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtTokenProvider tokenProvider,
                           GoogleTokenVerifierService googleTokenVerifierService,
                           OtpService otpService) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.googleTokenVerifierService = googleTokenVerifierService;
        this.otpService = otpService;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // 1. Kiểm tra số điện thoại liên hệ đã tồn tại chưa
        if (accountRepository.existsByPhoneNumber(request.phoneNumber().trim())) {
            throw new AppException("Số điện thoại này đã được đăng ký trong hệ thống", HttpStatus.BAD_REQUEST);
        }

        // 2. Kiểm tra email (nếu có cung cấp)
        if (request.email() != null && !request.email().isBlank() && accountRepository.existsByEmail(request.email().trim().toLowerCase())) {
            throw new AppException("Email này đã được đăng ký trong hệ thống", HttpStatus.BAD_REQUEST);
        }

        // 3. Khởi tạo tài khoản bệnh nhân (Luôn ép cứng vai trò ROLE_PATIENT, không nhận role từ client)
        Account account = Account.builder()
                .fullName(request.fullName().trim())
                .phoneNumber(request.phoneNumber().trim())
                .email(request.email() != null && !request.email().isBlank() ? request.email().trim().toLowerCase() : null)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.ROLE_PATIENT)
                .isActive(true)
                .build();

        Account savedAccount = accountRepository.save(account);

        // 4. Sinh JWT Token trả về phiên làm việc
        UserPrincipal userPrincipal = new UserPrincipal(savedAccount);
        String token = tokenProvider.generateToken(userPrincipal);

        return AuthResponse.of(
                token,
                savedAccount.getUserId(),
                savedAccount.getFullName(),
                savedAccount.getPhoneNumber(),
                savedAccount.getRole()
        );
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.phoneNumber(), request.password())
            );

            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
            String token = tokenProvider.generateToken(userPrincipal);

            Account account = accountRepository.findByPhoneNumber(request.phoneNumber())
                    .or(() -> accountRepository.findByEmail(request.phoneNumber()))
                    .orElseThrow(() -> new AppException("Tài khoản không tồn tại", HttpStatus.NOT_FOUND));

            return AuthResponse.of(
                token,
                account.getUserId(),
                account.getFullName(),
                account.getPhoneNumber(),
                account.getRole()
            );
        } catch (BadCredentialsException e) {
            throw new AppException("Số điện thoại hoặc mật khẩu không chính xác", HttpStatus.UNAUTHORIZED);
        }
    }

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        // 1. Xác minh cryptographic ID token qua OpenID Connect
        GoogleUserInfo googleUser = googleTokenVerifierService.verify(request.idToken());
        String googleSub = googleUser.googleSub();
        String email = googleUser.email();

        // 2. Tìm tài khoản đã liên kết bằng googleSub
        Account account = accountRepository.findByGoogleSub(googleSub).orElse(null);

        if (account != null) {
            // Đã liên kết trước đó -> Đăng nhập ngay
            if (!account.isActive()) {
                throw new AppException("Tài khoản đã bị tạm khóa. Vui lòng liên hệ ban quản trị bệnh viện", HttpStatus.FORBIDDEN);
            }
            UserPrincipal userPrincipal = new UserPrincipal(account);
            String token = tokenProvider.generateToken(userPrincipal);
            return AuthResponse.of(token, account.getUserId(), account.getFullName(), account.getPhoneNumber(), account.getRole());
        }

        // 3. Chưa liên kết googleSub: Kiểm tra xem email đã tồn tại trong hệ thống chưa
        Account existingAccountWithEmail = (email != null && !email.isBlank())
                ? accountRepository.findByEmail(email).orElse(null)
                : null;

        if (existingAccountWithEmail != null) {
            // RỦI RO CHIẾM ĐOẠT: Email trùng nhưng googleSub chưa liên kết!
            // Bắt buộc xác minh quyền sở hữu qua Email OTP trước khi liên kết
            if (request.otpCode() == null || request.otpCode().trim().isBlank()) {
                otpService.sendEmailOtp(email, OtpPurpose.LINK_GOOGLE_ACCOUNT);
                throw new AppException("NEEDS_LINK_CONFIRM: Tài khoản với email này đã tồn tại. Mã OTP xác nhận liên kết đã được gửi tới email của bạn. Vui lòng nhập mã OTP để hoàn tất.", HttpStatus.PRECONDITION_REQUIRED);
            }

            // Người dùng đã gửi kèm mã OTP -> Xác thực mã
            otpService.verifyEmailOtp(email, request.otpCode().trim(), OtpPurpose.LINK_GOOGLE_ACCOUNT);

            // Xác thực thành công -> Gán googleSub và lưu liên kết chính thức
            existingAccountWithEmail.setGoogleSub(googleSub);
            if (existingAccountWithEmail.getAvatar() == null && googleUser.pictureUrl() != null) {
                existingAccountWithEmail.setAvatar(googleUser.pictureUrl());
            }
            account = accountRepository.save(existingAccountWithEmail);

            log.info("[GOOGLE-LINK-SUCCESS] Đã liên kết thành công tài khoản {} với Google Sub: {}", email, googleSub);

            UserPrincipal userPrincipal = new UserPrincipal(account);
            String token = tokenProvider.generateToken(userPrincipal);
            return AuthResponse.of(token, account.getUserId(), account.getFullName(), account.getPhoneNumber(), account.getRole());
        }

        // 4. Tài khoản hoàn toàn mới: Khởi tạo tài khoản bệnh nhân (ROLE_PATIENT)
        String fullName = googleUser.fullName() != null && !googleUser.fullName().isBlank()
                ? googleUser.fullName().trim()
                : "Bệnh nhân Google";

        Account newAccount = Account.builder()
                .fullName(fullName)
                .email(email)
                .googleSub(googleSub)
                .avatar(googleUser.pictureUrl())
                .password(passwordEncoder.encode("GOOGLE_SSO_" + UUID.randomUUID()))
                .role(Role.ROLE_PATIENT)
                .isActive(true)
                .build();

        Account saved = accountRepository.save(newAccount);
        log.info("[GOOGLE-SIGNUP-SUCCESS] Đã tạo tài khoản bệnh nhân mới qua Google OIDC: {} (sub: {})", email, googleSub);

        UserPrincipal userPrincipal = new UserPrincipal(saved);
        String token = tokenProvider.generateToken(userPrincipal);
        return AuthResponse.of(token, saved.getUserId(), saved.getFullName(), saved.getPhoneNumber(), saved.getRole());
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String identifier = request.email() != null && !request.email().isBlank()
                ? request.email().trim().toLowerCase()
                : (request.phoneNumber() != null ? request.phoneNumber().trim() : null);

        if (identifier == null) {
            throw new AppException("Vui lòng cung cấp email hoặc số điện thoại", HttpStatus.BAD_REQUEST);
        }

        Account account = accountRepository.findByEmail(identifier)
                .or(() -> accountRepository.findByPhoneNumber(identifier))
                .orElse(null);

        if (account == null || account.getEmail() == null || account.getEmail().isBlank()) {
            // Chống Phone/Email Enumeration: Trả về lỗi chung bảo mật
            throw new AppException("Mã xác thực OTP không hợp lệ hoặc đã hết hạn", HttpStatus.BAD_REQUEST);
        }

        // Xác thực mã OTP qua OtpService với purpose ACCOUNT_RECOVERY
        otpService.verifyEmailOtp(account.getEmail(), request.otpCode().trim(), OtpPurpose.ACCOUNT_RECOVERY);

        // Cập nhật mật khẩu mới đã băm qua BCrypt
        account.setPassword(passwordEncoder.encode(request.newPassword()));
        accountRepository.save(account);

        log.info("[AUTH-FORGOT-PASSWORD] Đổi mật khẩu thành công cho tài khoản: {}", account.getPhoneNumber());
    }
}
