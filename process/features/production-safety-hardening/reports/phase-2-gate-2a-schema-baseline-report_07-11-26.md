# Báo cáo Cổng Nghiệm thu 2A (Gate 2A): Kiểm kê Baseline Schema & Kiểm chứng Backup/Restore/Rollback Cô lập

> **Chương trình:** `production-safety-hardening`  
> **Kế hoạch Giai đoạn 2:** [`phase-2-credentials-and-schema-integrity_PLAN_07-11-26.md`](../active/phase-2-credentials-and-schema-integrity_PLAN_07-11-26.md)  
> **Ngày thực hiện:** 07-11-2026  
> **Trạng thái Gate 2A:** **READY FOR REVIEW (Chờ phê duyệt chuyển sang Bước 2B)**

---

## 1. Hạng mục Bảo mật Thông tin Kết nối & Script Kiểm toán (Đã hoàn tất ở Bước 2A)

1. **Loại bỏ mật khẩu DB mặc định trong [`application.yml`](../../../../hospital-api/src/main/resources/application.yml#L10-L15):**
   - Đã đổi `password: ${SPRING_DATASOURCE_PASSWORD:taizz0537}` thành `password: ${SPRING_DATASOURCE_PASSWORD:}`.
2. **Siết chặt [`ProductionSecurityValidator.java`](../../../../hospital-api/src/main/java/com/hospital/api/config/ProductionSecurityValidator.java#L155-L174):**
   - Chặn khởi động trên profile `prod`/`production` nếu mật khẩu DB rỗng, bằng `"postgres"`, `"password"`, `"admin"`, `"123456"`, hoặc trùng mật khẩu dev cũ (`taizz0537`).
   - Chặn khởi động trên profile `prod`/`production` nếu `spring.jpa.hibernate.ddl-auto` là `update`, `create`, hoặc `create-drop`.
3. **Cô lập [`DatabaseSequenceSyncRunner.java`](../../../../hospital-api/src/main/java/com/hospital/api/config/DatabaseSequenceSyncRunner.java#L29-L51):**
   - Không chạy bất kỳ câu lệnh SQL/DDL nào khi ở profile `prod`/`production`.
   - Tắt mặc định khối `ensureSchemaHardening()` (`ALTER TABLE` lúc khởi động) thông qua cờ `app.runtime-schema-patch-enabled=false`.
4. **Bảo vệ Script Kiểm toán [`test_master_system_audit.js`](../../../../test_master_system_audit.js):**
   - Gỡ bỏ hoàn toàn mật khẩu cứng và chuỗi kết nối cứng `postgresql://postgres:...@localhost:5432/kmahos`.
   - Chỉ cho phép can thiệp `time_slots` khi có đủ `ALLOW_TEST_DB_MUTATION=true` và `TEST_DATABASE_URL`, đồng thời tự động sao lưu và khôi phục (`restore`) `start_time`/`end_time` gốc của `time_slot_id` khi kết thúc.
5. **Unit Test Xác minh ([`ProductionSafetyPhase2Test.java`](../../../../hospital-api/src/test/java/com/hospital/api/service/ProductionSafetyPhase2Test.java)):**
   - Kết quả: `Tests run: 6, Failures: 0, Errors: 0, Skipped: 0` (`BUILD SUCCESS`).

---

## 2. Kết quả Kiểm kê Baseline Schema Hiện tại (`kmahos`)

| Chỉ số Kiểm kê | Giá trị Thực tế trên PostgreSQL 18 (`kmahos`) |
| :--- | :--- |
| **Tổng số bảng (`BASE TABLE`)** | **44 bảng**: `accounts`, `audit_logs`, `beds`, `bookings`, `chat_messages`, `counter_assignments`, `counter_tickets`, `counters`, `departments`, `discharges`, `doctor_schedules`, `doctors`, `hospital_admissions`, `hospitalization_details`, `inpatient_bed_transfers`, `inpatient_doctor_orders`, `inpatient_nursing_cares`, `medical_concepts`, `medical_conditions`, `medical_examination_records`, `medical_observations`, `medical_record_addendums`, `medical_services`, `medical_test_result_items`, `medical_tests`, `medicine_batches`, `medicine_reminders`, `medicines`, `notifications`, `otp_tokens`, `patient_profiles`, `pharmacy_warehouses`, `prescription_dispense_items`, `prescription_dispenses`, `prescription_items`, `prescriptions`, `ratings`, `rooms`, `staffs`, `stock_transfer_items`, `stock_transfers`, `time_slots`, `transactions`, `warehouse_stocks` |
| **Tổng số cột (`columns`)** | **543 cột** |
| **Tổng số chỉ mục (`indexes`)** | **135 indexes** |
| **Tổng số ràng buộc (`constraints`)** | **471 constraints** (`44 Primary Keys`, `82 Foreign Keys`, `20 Unique`, `24 Check`, `301 Not Null`) |
| **Dung lượng file Baseline Schema Dump** | `80,831 bytes` (`pg_dump --schema-only --no-owner --no-privileges`) |

---

## 3. Phát hiện Lệch Schema & Bằng chứng Backup / Restore / Rollback trên DB Cô lập (`kmahos_gate2a_verify`)

1. **Phát hiện và sửa lỗi lệch cột trong [`schema_hardening.sql`](../../../../hospital-api/src/main/resources/db/migration/schema_hardening.sql#L29-L44) nhờ Gate 2A:**
   - Khi chạy thử `schema_hardening.sql` trên bản sao cô lập `kmahos_gate2a_verify`, phát hiện dòng 42 tạo index trên cột `otp_tokens(identifier, purpose)`, trong khi Entity [`OtpToken.java`](../../../../hospital-api/src/main/java/com/hospital/api/entity/OtpToken.java#L8-L26) và bảng thực tế dùng cột `(recipient, purpose)`, khóa chính `id`, và cột `otp_hash`.
   - Đã đồng bộ lại định nghĩa bảng và index `idx_otp_recipient_purpose` trong `schema_hardening.sql` khớp 100% với Entity và schema thực tế.
2. **Bằng chứng Khôi phục (Restore) & Idempotency trên `kmahos_gate2a_verify`:**
   - Tạo DB cô lập `kmahos_gate2a_verify` $\rightarrow$ Nạp bản dump baseline (`80,831 bytes`) $\rightarrow$ Chạy `schema_hardening.sql`.
   - Đối chiếu sau khi restore: `VERIFY_TABLES = 44/44`, `VERIFY_COLUMNS = 543/543`, `VERIFY_INDEXES = 135/135`.
3. **Bằng chứng Transactional DDL Rollback & Dọn dẹp:**
   - Thực thi giao dịch thử nghiệm `BEGIN; ALTER TABLE bookings ADD COLUMN gate2a_rollback_test VARCHAR(20); ROLLBACK;` trên `kmahos_gate2a_verify` $\rightarrow$ Kiểm tra `ROLLBACK_RESIDUE_COLS = 0`.
   - Đã chạy `DROP DATABASE IF EXISTS kmahos_gate2a_verify;` dọn dẹp hoàn toàn DB thử nghiệm.

---

## 4. Đề xuất Chuyển sang Bước 2B (Chờ Phê duyệt)

Sau khi bạn duyệt kết quả **Gate 2A** trên, Bước 2B sẽ thực hiện:
1. Cấu hình **Flyway** (`flyway-core`, `flyway-database-postgresql`) với `baseline-on-migrate: true` và định danh migration `V1__schema_hardening.sql`.
2. Chuyển `spring.jpa.hibernate.ddl-auto` của profile `prod,production` trong [`application.yml`](../../../../hospital-api/src/main/resources/application.yml#L89) từ `update` sang `validate`.

