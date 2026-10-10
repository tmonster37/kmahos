package com.hospital.api.service.impl;

import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.LoginRequest;
import com.hospital.api.dto.request.RegisterRequest;
import com.hospital.api.dto.response.AuthResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.security.JwtTokenProvider;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthServiceImpl(AccountRepository accountRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtTokenProvider tokenProvider) {
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // 1. Kiểm tra số điện thoại đã tồn tại chưa
        if (accountRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new AppException("Số điện thoại này đã được đăng ký", HttpStatus.BAD_REQUEST);
        }

        // 2. Kiểm tra email (nếu có)
        if (request.email() != null && !request.email().isBlank() && accountRepository.existsByEmail(request.email())) {
            throw new AppException("Email này đã được đăng ký", HttpStatus.BAD_REQUEST);
        }

        // 3. Tạo tài khoản mới
        Account account = Account.builder()
                .fullName(request.fullName())
                .phoneNumber(request.phoneNumber())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(Role.ROLE_PATIENT)
                .isActive(true)
                .build();

        Account savedAccount = accountRepository.save(account);

        // 4. Tự động sinh token trả về
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
}
