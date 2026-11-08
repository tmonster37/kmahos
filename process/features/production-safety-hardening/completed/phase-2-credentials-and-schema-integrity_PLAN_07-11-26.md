# Kế hoạch Giai đoạn 2: Bảo mật Credential, Script Kiểm toán & Toàn vẹn Schema (`phase-2-credentials-and-schema-integrity`)

> **Thuộc Chương trình:** [`production-safety-hardening_UMBRELLA_PLAN_07-11-26.md`](../active/production-safety-hardening_UMBRELLA_PLAN_07-11-26.md)  
> **Trạng thái:** COMPLETED (07-11-2026)  
> **Ngày tạo:** 07-11-2026

---

## 1. Mục tiêu & Phạm vi Đã Hoàn thành

1. **Loại bỏ mật khẩu DB mặc định trong cấu hình & Siết chặt `ProductionSecurityValidator`:**
   - Gỡ bỏ mật khẩu mặc định trong `application.yml` (`password: ${SPRING_DATASOURCE_PASSWORD:}`).
   - Cập nhật `ProductionSecurityValidator.java` để chặn khởi động trên Production nếu mật khẩu DB rỗng, bằng `"postgres"`, `"password"`, `"admin"`, `"123456"`, hoặc trùng mật khẩu dev cũ (`taizz0537`), hoặc nếu `ddl-auto` trên Production là `update`/`create`/`create-drop`.
2. **Cô lập và làm sạch Script kiểm toán `test_master_system_audit.js`:**
   - Gỡ bỏ chuỗi kết nối chứa mật khẩu cứng và mật khẩu admin cứng.
   - Chỉ cho phép kết nối DB trực tiếp khi có cả `ALLOW_TEST_DB_MUTATION=true` và `TEST_DATABASE_URL`, đồng thời sao lưu và khôi phục (`restore`) `start_time`/`end_time` gốc của `time_slots` sau khi chạy xong.
3. **Cổng Kiểm kê Schema & Chuyển đổi sang Migration có phiên bản (Gate 2A $\rightarrow$ Step 2B):**
   - **Gate 2A:** Đã xuất baseline schema (`44 bảng`, `543 cột`, `135 indexes`, `471 constraints`), phát hiện và sửa lệch cột `otp_tokens(recipient, purpose)`, kiểm chứng restore + transactional DDL rollback trên DB cô lập `kmahos_gate2a_verify`.
   - **Step 2B:** Tạo file migration có phiên bản `V1__baseline_and_schema_hardening.sql`, cấu hình Flyway (`baseline-on-migrate: true`) và chuyển `ddl-auto` của profile `prod,production` trong `application.yml` từ `update` sang `validate`; khóa `DatabaseSequenceSyncRunner.java` không chạy DDL trên production hoặc mặc định.

---

## 2. Cổng Nghiệm thu Giai đoạn 2 (Phase 2 Gate Criteria)

- [x] **Gate 2A:** Báo cáo kiểm kê baseline schema và bằng chứng backup/restore/rollback trên bản sao DB cô lập được người dùng duyệt trước khi áp dụng công cụ migration.
- [x] Không còn mật khẩu DB mặc định trong `application.yml` và `test_master_system_audit.js`.
- [x] `ProductionSecurityValidator` chặn hoàn toàn mật khẩu mặc định và `ddl-auto: update` trên profile `prod`.
- [x] `DatabaseSequenceSyncRunner` không còn tự chạy `ALTER TABLE` trên môi trường production.
- [x] `ProductionSafetyPhase2Test` đạt `8/8 tests passed` (`BUILD SUCCESS`).

