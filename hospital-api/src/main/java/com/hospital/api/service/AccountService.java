package com.hospital.api.service;

import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.LoginRequest;
import com.hospital.api.dto.request.RegisterRequest;
import com.hospital.api.dto.response.LoginResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.security.JwtTokenProvider;
import com.hospital.api.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AccountService {
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AccountService(AccountRepository accountRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider jwtTokenProvider) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public Account registerPatient(RegisterRequest request) {
        if (isBlank(request.fullName()) || isBlank(request.phoneNumber()) || isBlank(request.password())) {
            throw new AppException("Họ tên, số điện thoại và mật khẩu là bắt buộc.", HttpStatus.BAD_REQUEST);
        }
        String phoneNumber = request.phoneNumber().trim();
        if (accountRepository.existsByPhoneNumber(phoneNumber)) {
            throw new AppException("Số điện thoại này đã được đăng ký tài khoản!", HttpStatus.CONFLICT);
        }

        Account account = Account.builder()
                .fullName(request.fullName().trim())
                .phoneNumber(phoneNumber)
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role() != null ? request.role() : Role.ROLE_PATIENT)
                .isActive(true)
                .build();
        return accountRepository.save(account);
    }

    public LoginResponse login(LoginRequest request) {
        if (isBlank(request.phoneNumber()) || isBlank(request.password())) {
            throw new AppException("Số điện thoại và mật khẩu không được để trống.", HttpStatus.BAD_REQUEST);
        }

        String phoneNumber = request.phoneNumber().trim();
        Account account = accountRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new AppException("Số điện thoại hoặc mật khẩu không chính xác.", HttpStatus.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.password(), account.getPassword())) {
            throw new AppException("Số điện thoại hoặc mật khẩu không chính xác.", HttpStatus.UNAUTHORIZED);
        }

        String token = jwtTokenProvider.generateToken(new UserPrincipal(account));

        return LoginResponse.builder()
                .token(token)
                .userId(account.getUserId())
                .fullName(account.getFullName())
                .phoneNumber(account.getPhoneNumber())
                .role(account.getRole())
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
