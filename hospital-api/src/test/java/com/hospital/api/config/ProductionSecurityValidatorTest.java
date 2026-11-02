package com.hospital.api.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class ProductionSecurityValidatorTest {

    @Test
    @DisplayName("Non-production profile allows development default keys")
    void nonProductionProfile_allowsDevDefaults() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");

        assertDoesNotThrow(validator::validateProductionSecurity);
    }

    @Test
    @DisplayName("Production profile with empty JWT secret throws IllegalStateException")
    void productionProfile_emptyJwtSecret_throwsException() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "");

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionSecurity);
        assertTrue(ex.getMessage().contains("JWT_SECRET"));
    }

    @Test
    @DisplayName("Production profile with default dev JWT secret throws IllegalStateException")
    void productionProfile_defaultDevJwtSecret_throwsException() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionSecurity);
        assertTrue(ex.getMessage().contains("JWT_SECRET"));
    }

    @Test
    @DisplayName("Production profile with short JWT secret (<32 chars) throws IllegalStateException")
    void productionProfile_shortJwtSecret_throwsException() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "short-secret-key-too-short-123");

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionSecurity);
        assertTrue(ex.getMessage().contains("32 ký tự"));
    }

    @Test
    @DisplayName("Production profile with valid 256-bit JWT secret passes validation")
    void productionProfile_validJwtSecret_passesValidation() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(env);
        ReflectionTestUtils.setField(validator, "jwtSecret", "my-super-secret-secure-jwt-key-for-hospital-2026-production");
        ReflectionTestUtils.setField(validator, "dbPassword", "SecureHospitalDbPassword2026!");
        ReflectionTestUtils.setField(validator, "vnpayHashSecret", "PROD_VNPAY_SECRET_KEY_12345678");
        ReflectionTestUtils.setField(validator, "payosClientId", "prod-client-id-987654321");
        ReflectionTestUtils.setField(validator, "payosApiKey", "prod-api-key-abcdef123456");
        ReflectionTestUtils.setField(validator, "payosChecksumKey", "PROD_PAYOS_CHECKSUM_KEY_87654321");
        ReflectionTestUtils.setField(validator, "payosReturnUrl", "https://hospital.kma.edu.vn/payment");
        ReflectionTestUtils.setField(validator, "payosCancelUrl", "https://hospital.kma.edu.vn/payment");

        assertDoesNotThrow(validator::validateProductionSecurity);
    }
}

