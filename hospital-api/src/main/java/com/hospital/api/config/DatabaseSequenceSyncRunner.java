package com.hospital.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DatabaseSequenceSyncRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final Environment environment;

    @Value("${app.runtime-schema-patch-enabled:false}")
    private boolean runtimeSchemaPatchEnabled;

    public void setRuntimeSchemaPatchEnabled(boolean runtimeSchemaPatchEnabled) {
        this.runtimeSchemaPatchEnabled = runtimeSchemaPatchEnabled;
    }

    @Override
    public void run(String... args) {
        boolean isProduction = environment != null && (
                Arrays.asList(environment.getActiveProfiles()).contains("prod")
                || Arrays.asList(environment.getActiveProfiles()).contains("production")
                || "production".equalsIgnoreCase(environment.getProperty("ENVIRONMENT"))
                || "prod".equalsIgnoreCase(environment.getProperty("ENVIRONMENT"))
        );

        if (isProduction) {
            log.info("Skipping runtime DDL and sequence mutation on production profile.");
            return;
        }

        syncSequence("departments", "department_id");
        syncSequence("rooms", "room_id");

        if (runtimeSchemaPatchEnabled) {
            ensureSchemaHardening();
        } else {
            log.info("Skipping runtime ALTER TABLE schema patching (app.runtime-schema-patch-enabled=false). Use versioned SQL migrations instead.");
        }
    }

    private void ensureSchemaHardening() {
        try {
            jdbcTemplate.execute("ALTER TABLE accounts ALTER COLUMN phone_number DROP NOT NULL");
            log.info("Successfully ensured accounts.phone_number is nullable for Google SSO");
        } catch (Exception e) {
            log.warn("Could not alter accounts.phone_number: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE medical_examination_records DROP CONSTRAINT IF EXISTS medical_examination_records_state_check");
            jdbcTemplate.execute("""
                DO $$
                DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (
                        SELECT con.conname 
                        FROM pg_constraint con 
                        JOIN pg_class rel ON rel.oid = con.conrelid 
                        WHERE LOWER(rel.relname) = 'medical_examination_records' 
                          AND con.contype = 'c' 
                          AND pg_get_constraintdef(con.oid) LIKE '%state%'
                    ) LOOP
                        EXECUTE 'ALTER TABLE medical_examination_records DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
                    END LOOP;
                END $$;
            """);
            log.info("Successfully dropped legacy medical_examination_records state check constraints");
        } catch (Exception e) {
            log.warn("Could not drop medical_examination_records state check constraints: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS override_reason TEXT");
            log.info("Successfully ensured prescriptions.override_reason column exists");
        } catch (Exception e) {
            log.warn("Could not add prescriptions.override_reason: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE discharges ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false");
            jdbcTemplate.execute("ALTER TABLE discharges ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(30) DEFAULT 'PENDING_PAYMENT'");
            log.info("Successfully ensured discharges settlement columns exist");
        } catch (Exception e) {
            log.warn("Could not add discharges settlement columns: {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE");
            jdbcTemplate.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(booking_id)");
            jdbcTemplate.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS medical_test_id UUID REFERENCES medical_tests(medical_test_id)");
            jdbcTemplate.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES prescriptions(prescription_id)");
            jdbcTemplate.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES hospital_admissions(admission_id)");
            jdbcTemplate.execute("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discharge_id UUID REFERENCES discharges(discharge_id)");
            log.info("Successfully ensured payment itemization columns exist");
        } catch (Exception e) {
            log.warn("Could not add payment itemization columns: {}", e.getMessage());
        }
    }

    private void syncSequence(String tableName, String idColumn) {
        try {
            String sql = String.format(
                    "SELECT setval(pg_get_serial_sequence('%s', '%s'), COALESCE((SELECT MAX(%s) FROM %s), 0) + 1, false)",
                    tableName, idColumn, idColumn, tableName
            );
            jdbcTemplate.execute(sql);
            log.info("Synced sequence for {}.{}", tableName, idColumn);
        } catch (Exception e) {
            log.warn("Could not sync sequence for {}.{}: {}", tableName, idColumn, e.getMessage());
        }
    }
}
