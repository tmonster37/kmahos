package com.hospital.api.service;

import com.hospital.api.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

class GoogleTokenVerifierServiceTest {

    @Test
    @DisplayName("Dev mock token is rejected when allowMockToken is false")
    void devMockToken_rejected_whenMockDisabled() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        GoogleTokenVerifierService service = new GoogleTokenVerifierService("dummy-client-id", false, env);

        AppException ex = assertThrows(AppException.class, () ->
                service.verify("dev-mock-patient.demo@gmail.com"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertTrue(ex.getMessage().contains("không được phép"));
    }

    @Test
    @DisplayName("Dev mock token is rejected on production profile even if allowMockToken is true")
    void devMockToken_rejected_onProductionProfile() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        GoogleTokenVerifierService service = new GoogleTokenVerifierService("dummy-client-id", true, env);

        AppException ex = assertThrows(AppException.class, () ->
                service.verify("dev-mock-patient.demo@gmail.com"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertTrue(ex.getMessage().contains("không được phép"));
    }

    @Test
    @DisplayName("Dev mock token is rejected when email is not in the whitelist")
    void devMockToken_rejected_whenEmailNotInWhitelist() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        GoogleTokenVerifierService service = new GoogleTokenVerifierService("dummy-client-id", true, env);

        AppException ex = assertThrows(AppException.class, () ->
                service.verify("dev-mock-hacker.victim@evil.com"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("danh sách được phép"));
    }

    @Test
    @DisplayName("Dev mock token succeeds in dev with whitelisted email")
    void devMockToken_succeeds_inDev_withWhitelistedEmail() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        GoogleTokenVerifierService service = new GoogleTokenVerifierService("dummy-client-id", true, env);

        GoogleTokenVerifierService.GoogleUserInfo info = service.verify("dev-mock-patient.demo@gmail.com");

        assertNotNull(info);
        assertEquals("patient.demo@gmail.com", info.email());
        assertTrue(info.emailVerified());
        assertNotNull(info.googleSub());
    }

    @Test
    @DisplayName("Invalid / malformed token is rejected with 401 Unauthorized")
    void invalidToken_rejected_with401() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        GoogleTokenVerifierService service = new GoogleTokenVerifierService("dummy-client-id", false, env);

        AppException ex = assertThrows(AppException.class, () ->
                service.verify("invalid.malformed.google.id.token"));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
    }

    @Test
    @DisplayName("Blank token is rejected with 400 Bad Request")
    void blankToken_rejected_with400() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        GoogleTokenVerifierService service = new GoogleTokenVerifierService("dummy-client-id", false, env);

        AppException ex = assertThrows(AppException.class, () ->
                service.verify("   "));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }
}

