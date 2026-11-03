package com.hospital.api.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DatabaseSequenceSyncRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        syncSequence("departments", "department_id");
        syncSequence("rooms", "room_id");
        ensureSchemaHardening();
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
            log.info("Successfully dropped legacy medical_examination_records_state_check constraint");
        } catch (Exception e) {
            log.warn("Could not drop medical_examination_records_state_check: {}", e.getMessage());
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
