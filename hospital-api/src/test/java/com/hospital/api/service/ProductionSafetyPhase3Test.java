package com.hospital.api.service;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.controller.HealthCheckController;
import com.hospital.api.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductionSafetyPhase3Test {

    @Test
    @DisplayName("Phase 3: GlobalExceptionHandler does not leak internal exception details on HTTP 500")
    void globalExceptionHandler_shouldNotLeakInternalExceptionMessageOn500() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        RuntimeException sensitiveException = new RuntimeException(
                "org.postgresql.util.PSQLException: FATAL: password authentication failed for user \"postgres\" at 10.0.0.12:5432"
        );

        ResponseEntity<ApiResponse<Object>> response = handler.handleGeneralException(sensitiveException);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
        assertFalse(response.getBody().getMessage().contains("PSQLException"));
        assertFalse(response.getBody().getMessage().contains("10.0.0.12"));
        assertEquals("Lỗi hệ thống nội bộ, vui lòng thử lại sau", response.getBody().getMessage());
    }

    @Test
    @DisplayName("Phase 3: GlobalExceptionHandler does not leak internal exception details on HTTP 401")
    void globalExceptionHandler_shouldNotLeakAuthenticationExceptionDetailsOn401() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        BadCredentialsException authEx = new BadCredentialsException("Internal LDAP/DB bind error: detail=secret_hash_mismatch");

        ResponseEntity<ApiResponse<Object>> response = handler.handleAuthenticationException(authEx);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().getMessage().contains("secret_hash_mismatch"));
        assertEquals("Xác thực thất bại hoặc phiên đăng nhập đã hết hạn", response.getBody().getMessage());
    }

    @Test
    @DisplayName("Phase 3: HealthCheckController returns 503 DOWN without leaking SQLException message")
    void healthCheckController_shouldNotLeakDatabaseExceptionMessage() throws Exception {
        DataSource mockDataSource = mock(DataSource.class);
        when(mockDataSource.getConnection()).thenThrow(
                new SQLException("Connection to internal-db.hospital.local:5432 refused (password=secret)")
        );

        HealthCheckController controller = new HealthCheckController();
        controller.setDataSource(mockDataSource);

        ResponseEntity<Map<String, Object>> response = controller.getHealthStatus();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("DOWN", response.getBody().get("status"));

        @SuppressWarnings("unchecked")
        Map<String, Object> dbMap = (Map<String, Object>) response.getBody().get("database");
        assertNotNull(dbMap);
        assertEquals("DOWN", dbMap.get("status"));
        assertFalse(dbMap.containsKey("error"), "Public health check must not expose raw DB exception message");
    }

    @Test
    @DisplayName("Phase 3 (Gate 3A - Option A): JwtAuthenticationFilter authenticates via HttpOnly access_token cookie with X-Requested-With")
    void jwtAuthenticationFilter_shouldAuthenticateViaHttpOnlyCookieAndEnforceCsrfOnMutations() throws Exception {
        var tokenProvider = mock(com.hospital.api.security.JwtTokenProvider.class);
        var userDetailsService = mock(com.hospital.api.security.CustomUserDetailsService.class);
        var filter = new com.hospital.api.security.JwtAuthenticationFilter(tokenProvider, userDetailsService);

        when(tokenProvider.validateToken("valid-cookie-jwt")).thenReturn(true);
        when(tokenProvider.getPhoneNumberFromToken("valid-cookie-jwt")).thenReturn("0911000001");
        var userDetails = org.springframework.security.core.userdetails.User
                .withUsername("0911000001")
                .password("hashed")
                .authorities("ROLE_DOCTOR")
                .build();
        when(userDetailsService.loadUserByUsername("0911000001")).thenReturn(userDetails);

        // 1. POST with HttpOnly cookie + X-Requested-With succeeds
        var reqWithCsrf = new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/doctor/records");
        reqWithCsrf.setCookies(new jakarta.servlet.http.Cookie("access_token", "valid-cookie-jwt"));
        reqWithCsrf.addHeader("X-Requested-With", "XMLHttpRequest");
        var res1 = new org.springframework.mock.web.MockHttpServletResponse();
        var chain1 = new org.springframework.mock.web.MockFilterChain();

        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        filter.doFilter(reqWithCsrf, res1, chain1);
        assertNotNull(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication());
        assertEquals("0911000001", org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());

        // 2. POST with HttpOnly cookie but WITHOUT X-Requested-With / Origin / Referer is blocked from using cookie
        var reqWithoutCsrf = new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/doctor/records");
        reqWithoutCsrf.setCookies(new jakarta.servlet.http.Cookie("access_token", "valid-cookie-jwt"));
        var res2 = new org.springframework.mock.web.MockHttpServletResponse();
        var chain2 = new org.springframework.mock.web.MockFilterChain();

        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        filter.doFilter(reqWithoutCsrf, res2, chain2);
        assertNull(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication());
    }
}

