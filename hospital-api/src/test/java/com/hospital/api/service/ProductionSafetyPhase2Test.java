package com.hospital.api.service;

import com.hospital.api.config.DatabaseSequenceSyncRunner;
import com.hospital.api.config.ProductionSecurityValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductionSafetyPhase2Test {

    @Mock
    private Environment environment;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private ProductionSecurityValidator validator;

    @BeforeEach
    void setUp() {
        validator = new ProductionSecurityValidator(environment);
        validator.setJwtSecret("A_VERY_STRONG_PRODUCTION_JWT_SECRET_KEY_OVER_32_BYTES_LONG_2026");
        validator.setVnpayHashSecret("PROD_VNPAY_SECRET_KEY_999999");
        validator.setPayosClientId("prod-payos-client-id");
        validator.setPayosApiKey("prod-payos-api-key");
        validator.setPayosChecksumKey("prod-payos-checksum-key");
        validator.setPayosReturnUrl("https://hospital.kma.edu.vn/payment");
        validator.setPayosCancelUrl("https://hospital.kma.edu.vn/payment");
        validator.setDbPassword("StrongProdDbPass#2026!");
        validator.setDdlAuto("validate");
    }

    @Test
    @DisplayName("Risk 4: ProductionSecurityValidator rejects legacy dev DB password on prod profile")
    void validator_shouldRejectLegacyDevDbPasswordOnProd() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        validator.setDbPassword("taizz0537");

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> validator.validateProductionSecurity()
        );
        assertTrue(ex.getMessage().contains("Mật khẩu cơ sở dữ liệu"));
    }

    @Test
    @DisplayName("Risk 4: ProductionSecurityValidator rejects blank or 'postgres' DB password on prod profile")
    void validator_shouldRejectBlankOrDefaultPostgresPasswordOnProd() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"production"});
        validator.setDbPassword("postgres");

        assertThrows(IllegalStateException.class, () -> validator.validateProductionSecurity());

        validator.setDbPassword("   ");
        assertThrows(IllegalStateException.class, () -> validator.validateProductionSecurity());
    }

    @Test
    @DisplayName("Risk 5: ProductionSecurityValidator rejects ddl-auto=update or create on prod profile")
    void validator_shouldRejectDdlAutoUpdateOnProd() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        validator.setDdlAuto("update");

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> validator.validateProductionSecurity()
        );
        assertTrue(ex.getMessage().contains("ddl-auto"));

        validator.setDdlAuto("create-drop");
        assertThrows(IllegalStateException.class, () -> validator.validateProductionSecurity());
    }

    @Test
    @DisplayName("Risk 4 & 5: ProductionSecurityValidator accepts strong credentials and ddl-auto=validate on prod")
    void validator_shouldPassWhenProdConfigIsHardened() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        assertDoesNotThrow(() -> validator.validateProductionSecurity());
    }

    @Test
    @DisplayName("Risk 5: DatabaseSequenceSyncRunner executes zero DDL or sequence queries on prod profile")
    void databaseSequenceSyncRunner_shouldDoNothingOnProductionProfile() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        DatabaseSequenceSyncRunner runner = new DatabaseSequenceSyncRunner(jdbcTemplate, environment);
        runner.setRuntimeSchemaPatchEnabled(true);

        runner.run();

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    @DisplayName("Risk 5: DatabaseSequenceSyncRunner skips ALTER TABLE statements by default on non-prod")
    void databaseSequenceSyncRunner_shouldSkipAlterTableWhenRuntimePatchDisabled() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});
        DatabaseSequenceSyncRunner runner = new DatabaseSequenceSyncRunner(jdbcTemplate, environment);
        // default runtimeSchemaPatchEnabled is false

        runner.run();

        verify(jdbcTemplate, never()).execute(contains("ALTER TABLE"));
    }

    @Test
    @DisplayName("Risk 4 & 5: application.yml has no hardcoded DB password and sets prod ddl-auto to validate")
    void applicationYml_shouldNotContainDefaultDbPasswordAndShouldSetProdDdlAutoValidate() throws Exception {
        try (var is = getClass().getClassLoader().getResourceAsStream("application.yml")) {
            assertNotNull(is, "application.yml must be present on classpath");
            String yaml = new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            assertFalse(yaml.contains("taizz0537"), "application.yml must not contain hardcoded DB password");
            assertTrue(yaml.contains("ddl-auto: ${SPRING_JPA_HIBERNATE_DDL_AUTO:validate}"),
                    "Production profile in application.yml must default ddl-auto to validate");
        }
    }

    @Test
    @DisplayName("Risk 5: Versioned migration V1__baseline_and_schema_hardening.sql exists and matches OtpToken schema")
    void versionedMigrationV1_shouldExistAndMatchOtpTokenColumns() throws Exception {
        try (var is = getClass().getClassLoader().getResourceAsStream("db/migration/V1__baseline_and_schema_hardening.sql")) {
            assertNotNull(is, "V1__baseline_and_schema_hardening.sql must exist in db/migration/");
            String sql = new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            assertTrue(sql.contains("idx_otp_recipient_purpose ON otp_tokens(recipient, purpose)"));
            assertFalse(sql.contains("otp_tokens(identifier"));
        }
    }
}

