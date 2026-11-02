package com.hospital.api.controller;

import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.LoginRequest;
import com.hospital.api.dto.response.AuthResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.security.JwtTokenProvider;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.AuthService;
import com.hospital.api.service.OtpService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthCookieSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @MockBean
    private AuthService authService;

    @MockBean
    private AccountRepository accountRepository;

    @MockBean
    private OtpService otpService;

    @Test
    @DisplayName("Login sets HttpOnly Secure Lax cookie access_token in Set-Cookie header")
    void login_setsHttpOnlyCookie() throws Exception {
        AuthResponse mockAuthResponse = AuthResponse.of(
                "mock-jwt-token-xyz",
                UUID.randomUUID(),
                "Nguyen Van A",
                "0912345678",
                Role.ROLE_PATIENT
        );

        when(authService.login(any(LoginRequest.class))).thenReturn(mockAuthResponse);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "phoneNumber": "0912345678",
                            "password": "Password123@"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Set-Cookie", containsString("access_token=mock-jwt-token-xyz;")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Lax")));
    }

    @Test
    @DisplayName("Logout clears access_token cookie with Max-Age=0")
    void logout_clearsCookie() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Set-Cookie", containsString("access_token=;")))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
    }

    @Test
    @DisplayName("JwtAuthenticationFilter reads JWT from HttpOnly Cookie access_token")
    void jwtFilter_authenticatesViaCookie() throws Exception {
        Account account = new Account();
        account.setUserId(UUID.randomUUID());
        account.setFullName("Patient Test");
        account.setPhoneNumber("0912345678");
        account.setPassword("encodedPwd");
        account.setRole(Role.ROLE_PATIENT);
        account.setActive(true);

        when(accountRepository.findByPhoneNumber("0912345678")).thenReturn(Optional.of(account));

        UserPrincipal principal = new UserPrincipal(account);
        String testJwt = tokenProvider.generateToken(principal);

        // /api/clinical/medicines requires authentication
        mockMvc.perform(get("/api/clinical/medicines")
                        .cookie(new Cookie("access_token", testJwt)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("JwtAuthenticationFilter still supports Authorization Bearer header (hybrid fallback)")
    void jwtFilter_authenticatesViaBearerHeader() throws Exception {
        Account account = new Account();
        account.setUserId(UUID.randomUUID());
        account.setFullName("Patient Test");
        account.setPhoneNumber("0912345678");
        account.setPassword("encodedPwd");
        account.setRole(Role.ROLE_PATIENT);
        account.setActive(true);

        when(accountRepository.findByPhoneNumber("0912345678")).thenReturn(Optional.of(account));

        UserPrincipal principal = new UserPrincipal(account);
        String testJwt = tokenProvider.generateToken(principal);

        mockMvc.perform(get("/api/clinical/medicines")
                        .header("Authorization", "Bearer " + testJwt))
                .andExpect(status().isOk());
    }
}
