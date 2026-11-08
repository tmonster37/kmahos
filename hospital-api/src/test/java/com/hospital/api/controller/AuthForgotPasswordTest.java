package com.hospital.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.api.constant.OtpPurpose;
import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.ForgotPasswordRequest;
import com.hospital.api.entity.Account;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.service.AuthService;
import com.hospital.api.service.OtpService;
import com.hospital.api.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthForgotPasswordTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("POST /api/auth/forgot-password hợp lệ trả về HTTP 200 và thông báo thành công")
    void forgotPassword_validRequest_returns200() throws Exception {
        doNothing().when(authService).forgotPassword(any(ForgotPasswordRequest.class));

        ForgotPasswordRequest request = new ForgotPasswordRequest(
                "patient@test.com",
                "0987654321",
                "123456",
                "newPassword123"
        );

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Khôi phục mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."));

        verify(authService).forgotPassword(any(ForgotPasswordRequest.class));
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password thiếu mã OTP hoặc không đúng 6 số trả về HTTP 400")
    void forgotPassword_invalidOtp_returns400() throws Exception {
        ForgotPasswordRequest badOtp = new ForgotPasswordRequest(
                "patient@test.com",
                "0987654321",
                "123", // ít hơn 6 ký tự
                "newPassword123"
        );

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badOtp)))
                .andExpect(status().isBadRequest());

        verify(authService, never()).forgotPassword(any());
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password mật khẩu quá ngắn (<6 ký tự) trả về HTTP 400")
    void forgotPassword_shortPassword_returns400() throws Exception {
        ForgotPasswordRequest shortPass = new ForgotPasswordRequest(
                "patient@test.com",
                "0987654321",
                "123456",
                "12345" // 5 ký tự
        );

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shortPass)))
                .andExpect(status().isBadRequest());

        verify(authService, never()).forgotPassword(any());
    }

    @Test
    @DisplayName("AuthServiceImpl.forgotPassword cập nhật mật khẩu khi OTP hợp lệ và không tiết lộ nếu tài khoản không tồn tại")
    void authServiceImpl_forgotPassword_logicTest() {
        AccountRepository accountRepo = mock(AccountRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        OtpService otpSvc = mock(OtpService.class);

        AuthServiceImpl service = new AuthServiceImpl(
                accountRepo, encoder, null, null, null, otpSvc
        );

        Account account = Account.builder()
                .phoneNumber("0987654321")
                .email("patient@example.com")
                .password("oldHashedPassword")
                .role(Role.ROLE_PATIENT)
                .isActive(true)
                .build();

        when(accountRepo.findByEmail("patient@example.com")).thenReturn(Optional.of(account));
        when(encoder.encode("newPassword123")).thenReturn("newHashedPassword");
        when(otpSvc.verifyEmailOtp("patient@example.com", "123456", OtpPurpose.ACCOUNT_RECOVERY)).thenReturn(true);

        ForgotPasswordRequest valid = new ForgotPasswordRequest(
                "patient@example.com", null, "123456", "newPassword123"
        );
        service.forgotPassword(valid);

        assertEquals("newHashedPassword", account.getPassword());
        verify(accountRepo).save(account);

        // Trường hợp tài khoản không tồn tại: Ném lỗi bảo mật không lộ thông tin
        when(accountRepo.findByPhoneNumber("0999999999")).thenReturn(Optional.empty());
        ForgotPasswordRequest notFound = new ForgotPasswordRequest(
                null, "0999999999", "123456", "newPassword123"
        );
        AppException ex = assertThrows(AppException.class, () -> service.forgotPassword(notFound));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("Mã xác thực OTP không hợp lệ"));
    }
}

