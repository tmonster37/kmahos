# Báo cáo Nghiệm thu Giai đoạn 2: Bảo mật Thông tin Kết nối, Script Kiểm toán & Toàn vẹn Schema

> **Chương trình:** `production-safety-hardening`  
> **Kế hoạch đã hoàn thành:** [`phase-2-credentials-and-schema-integrity_PLAN_07-11-26.md`](../completed/phase-2-credentials-and-schema-integrity_PLAN_07-11-26.md)  
> **Báo cáo Gate 2A:** [`phase-2-gate-2a-schema-baseline-report_07-11-26.md`](./phase-2-gate-2a-schema-baseline-report_07-11-26.md)  
> **Ngày nghiệm thu:** 07-11-2026  
> **Trạng thái Giai đoạn 2:** **PASSED (ĐẠT 100%)**

---

## 1. Các Thay đổi Đã Thực thi (Bước 2A & Bước 2B)

- **[`application.yml`](../../../../hospital-api/src/main/resources/application.yml):**
  - Bỏ mật khẩu mặc định ở `spring.datasource.password` (`${SPRING_DATASOURCE_PASSWORD:}`).
  - Đổi `spring.jpa.hibernate.ddl-auto` của profile `prod,production` từ `update` sang `validate` (`${SPRING_JPA_HIBERNATE_DDL_AUTO:validate}`).
  - Cấu hình `spring.flyway` (`enabled: ${SPRING_FLYWAY_ENABLED:true}`, `baseline-on-migrate: true`, `locations: classpath:db/migration`) cho profile `prod,production`.
- **[`ProductionSecurityValidator.java`](../../../../hospital-api/src/main/java/com/hospital/api/config/ProductionSecurityValidator.java):**
  - Chặn khởi động trên profile `prod`/`production` nếu mật khẩu DB rỗng, bằng `"postgres"`, `"password"`, `"admin"`, `"123456"`, hoặc mật khẩu dev cũ (`taizz0537`).
  - Chặn khởi động trên profile `prod`/`production` nếu `ddl-auto` là `update`, `create`, hoặc `create-drop`.
- **[`DatabaseSequenceSyncRunner.java`](../../../../hospital-api/src/main/java/com/hospital/api/config/DatabaseSequenceSyncRunner.java):**
  - Bỏ qua hoàn toàn mọi thao tác trên profile `prod`/`production`.
  - Tắt mặc định khối `ensureSchemaHardening()` (`app.runtime-schema-patch-enabled=false`).
- **[`V1__baseline_and_schema_hardening.sql`](../../../../hospital-api/src/main/resources/db/migration/V1__baseline_and_schema_hardening.sql) & [`schema_hardening.sql`](../../../../hospital-api/src/main/resources/db/migration/schema_hardening.sql):**
  - Đồng bộ định nghĩa bảng và index `otp_tokens(recipient, purpose)` khớp với [`OtpToken.java`](../../../../hospital-api/src/main/java/com/hospital/api/entity/OtpToken.java) và kiểm chứng idempotent trên DB cô lập `kmahos_gate2a_verify`.
- **[`test_master_system_audit.js`](../../../../test_master_system_audit.js):**
  - Gỡ bỏ hoàn toàn mật khẩu cứng và chuỗi kết nối cứng; tự động sao lưu và khôi phục (`restore`) `start_time`/`end_time` của `time_slots` sau khi chạy.

---

## 2. Bằng chứng Kiểm thử (Verification Evidence)

- **Backend Unit Tests ([`ProductionSafetyPhase2Test.java`](../../../../hospital-api/src/test/java/com/hospital/api/service/ProductionSafetyPhase2Test.java)):**
  - Command: `.\mvnw.cmd test "-Dtest=ProductionSafetyPhase2Test"`
  - Kết quả: `Tests run: 8, Failures: 0, Errors: 0, Skipped: 0` (`BUILD SUCCESS`).

