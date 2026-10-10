package com.hospital.api;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@EnableCaching
public class HospitalApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(HospitalApiApplication.class, args);
	}

	@Bean
	public CommandLineRunner initSchema(JdbcTemplate jdbcTemplate) {
		return args -> {
			try {
				// Column migrations
				jdbcTemplate.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_priority boolean DEFAULT false;");
				jdbcTemplate.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS priority_reason varchar(255);");

				// Composite Indexing for high-traffic queries
				jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_bookings_doc_date ON bookings(doctor_id, booking_date, is_priority DESC, queue_number ASC);");
				jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_bookings_date_queue ON bookings(booking_date, is_priority DESC, queue_number ASC);");
				jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);");
				jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_med_records_doc_state ON medical_examination_records(doctor_id, state);");
				jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_patient_profiles_phone ON patient_profiles(phone_number);");
				jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_patient_profiles_identity ON patient_profiles(identity_number);");
				jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doc_date ON doctor_schedules(doctor_id, schedule_date);");
				jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_medical_tests_state ON medical_tests(state, created_at DESC);");
			} catch (Exception e) {
				System.err.println("Database schema migration note: " + e.getMessage());
			}
		};
	}
}

