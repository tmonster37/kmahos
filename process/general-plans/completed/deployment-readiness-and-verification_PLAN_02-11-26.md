# DEPLOYMENT READINESS & VERIFICATION PLAN

**File:** `process/general-plans/completed/deployment-readiness-and-verification_PLAN_02-11-26.md`  
**Date:** 02-11-2026  
**Status:** COMPLETED (All P0/P1 Blockers Resolved, Full Test Coverage Added, 100% Tests Passing)  
**Author:** AI Orchestrator (RIPER-5 Framework)  

---

## 1. TỔNG QUAN & MỤC TIÊU

Đánh giá toàn diện và khắc phục triệt để các khiếm khuyết ngăn chặn deploy hệ thống Bệnh viện Đa khoa Quốc tế TNT / KMA Hospital Management System (HMS), bao gồm cả Backend (Spring Boot 3.4.3 / Java 21/25), Frontend (React 18 / Vite 6), Cơ sở dữ liệu (PostgreSQL 16/18), Hạ tầng Container (Docker / Nginx) và các cổng tích hợp ngoài (PayOS, VNPay, Google SSO).

---

## 2. KẾT QUẢ TRIỂN KHAI THEO 4 GIAI ĐOẠN

### Pha 1: Sửa lỗi chặn deploy và bảo mật nghiêm trọng (P0/P1) — [HOÀN THÀNH 100%]
- [x] **DEF-01 (P0):** Đã sửa `ProductionSecurityValidatorTest.java` bổ sung mock đầy đủ `payosClientId`, `payosApiKey`, `payosChecksumKey`, `payosReturnUrl`, `payosCancelUrl`. Chạy `mvn test` pass 5/5 (100%).
- [x] **DEF-02 (P1):** Đã cấu hình `maven-dependency-plugin:3.10.0` và `maven-surefire-plugin` với `-javaagent:${org.mockito:mockito-core:jar} -XX:+EnableDynamicAgentLoading` trong `pom.xml`, giải quyết dứt điểm cảnh báo và lỗi treo của Mockito trên môi trường Java 25.
- [x] **DEF-04 (P1):** Đã tạo mới `HealthCheckController.java` tại endpoint `/api/health` và `/health`, trả về chi tiết trạng thái Database (`SELECT 1`), JVM Memory (Used/Free/Total/Max), Uptime và Thread count phục vụ Docker/Cloud liveness & readiness probe. Đã cấp quyền `permitAll()` trong `SecurityConfig.java`.
- [x] **DEF-05 (P1):** Đã siết chặt cấu hình CORS trong `SecurityConfig.java`: gỡ bỏ hoàn toàn wildcard `https://*.vercel.app`, chỉ cho phép các domain được định nghĩa rõ ràng trong `CORS_ALLOWED_ORIGINS` cùng các port nội bộ phục vụ phát triển.

### Pha 2: Hoàn thiện Schema Migration & Chuẩn bị Môi trường Test Biệt lập (P1) — [HOÀN THÀNH 100%]
- [x] **DEF-06 (P1):** Đã cập nhật file `schema_hardening.sql` đầy đủ 13 hạng mục DDL: thêm cột `allergies`, `medical_history`, `is_linked`, `relationship` trong `patient_profiles`; cột `is_paid` trong `prescriptions`; chi tiết bệnh phẩm và PACS trong `medical_tests`; bảng `medical_test_result_items`; bảng `prescription_dispenses` (kèm unique constraint `uk_dispense_prescription`); bảng `prescription_dispense_items`; bảng `inpatient_doctor_orders`; bảng `inpatient_nursing_cares`; bảng `inpatient_bed_transfers` và toàn bộ các composite indexes. Đảm bảo Hibernate `ddl-auto: validate` vượt qua kiểm tra khi khởi động trên Production.
- [x] **DEF-03 (P1):** Đã thêm dependency H2 in-memory test database vào `pom.xml` và tạo file cấu hình `hospital-api/src/test/resources/application-test.yml` với chế độ tương thích PostgreSQL (`MODE=PostgreSQL`) để các integration test chạy độc lập không phụ thuộc service ngoài.

### Pha 3: Bổ sung Test Coverage cho các Luồng Trọng yếu (P2) — [HOÀN THÀNH 100%]
- [x] **InpatientServiceTest.java:** Đã viết mới bộ test tự động 5 kịch bản trọng yếu:
  1. `admitPatient_success`: Nhập viện thành công, kiểm tra buồng bệnh đúng chuyên khoa, chuyển giường sang `OCCUPIED`.
  2. `admitPatient_bedOccupied_throwsAppException`: Bắt lỗi khi giường đã có người nằm (`HTTP 400 Bad Request`).
  3. `admitPatient_differentDepartment_throwsAppException`: Bắt lỗi khi bác sĩ chuyên khoa này nhập viện vào buồng chuyên khoa khác (`HTTP 400 Bad Request`).
  4. `transferBed_success`: Điều chuyển giường trong cùng khoa, giường cũ chuyển sang `CLEANING`, giường mới thành `OCCUPIED`.
  5. `dischargePatient_success`: Xuất viện, tính toán viện phí theo số ngày nằm viện, chuyển trạng thái `DISCHARGED` và giải phóng giường sang `CLEANING`.
  *(Kết quả: 5/5 tests PASS).*
- [x] **PharmacyInventoryServiceTest.java:** Đã viết mới bộ test tự động 3 kịch bản FEFO & Concurrency:
  1. `dispensePrescription_fefo_success`: Cấp phát thuốc theo đơn trừ dần theo lô hết hạn sớm trước (Lô 1 date gần trừ hết 3 viên, Lô 2 date xa trừ 2 viên còn lại).
  2. `dispensePrescription_insufficientStock_throwsAppException`: Bắt lỗi khi tổng tồn kho khả dụng không đủ cấp (`HTTP 400 Bad Request`).
  3. `dispensePrescription_doubleDispense_throwsAppException`: Bắt lỗi chống xuất kho lặp lại (Chống Double Dispense) khi đơn đã được cấp phát trước đó.
  *(Kết quả: 3/3 tests PASS).*

### Pha 4: Kiểm thử Hồi quy & Sẵn sàng Vận hành — [HOÀN THÀNH 100%]
- [x] **Frontend Vitest Suite:** `12 test files passed, 52/52 tests passed (100% SUCCESS)`.
- [x] **Backend Core & Security Test Suite:** `31/31 tests passed (100% SUCCESS, Time: 8.4s)`.
- [x] **Kịch bản kiểm thử tải:** Script `test_load_concurrency.js` sẵn sàng tại thư mục gốc với kịch bản 50 requests đồng thời đặt lịch khám vào cùng 1 TimeSlot để nghiệm thu Pessimistic Lock trên môi trường thực tế.

---

## 3. ĐÁNH GIÁ MỨC ĐỘ SẴN SÀNG DEPLOY HIỆN TẠI (FINAL VERDICT)

# ✅ KẾT LUẬN CUỐI CÙNG: `READY WITH RISKS` (SẴN SÀNG TRIỂN KHAI KÈM ĐIỀU KIỆN VẬN HÀNH)

### Tại sao nâng từ `NOT READY` lên `READY WITH RISKS`?
1. **Toàn bộ lỗi P0 và P1 chặn deploy đã được giải quyết triệt để:**
   - CI/CD build pass 100% (`mvn test` và `vitest`).
   - Lỗ hổng CORS wildcard `*.vercel.app` đã bị gỡ bỏ.
   - Endpoint `/api/health` đã được tích hợp để container probe.
   - File DDL migration `schema_hardening.sql` đã đồng bộ hoàn hảo với toàn bộ các entity mới.
2. **Khoảng trống kiểm thử P2 đã được lấp đầy:**
   - 8 bài test tự động cho Nội trú và Nhà thuốc FEFO chạy thành công 100%.

### Điều kiện & Giám sát khi vận hành trên Production:
- **Biến môi trường:** Khi deploy thật, đảm bảo điền các giá trị thực tế trong file `.env` (thay thế giá trị demo trong `.env.example`), đặc biệt là `JWT_SECRET` (khóa 512-bit), `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`.
- **Database Migration:** Chạy file `src/main/resources/db/migration/schema_hardening.sql` trên database production trước khi khởi động ứng dụng để Hibernate `ddl-auto: validate` hoạt động trơn tru.
- **Connection Pool:** Nếu lượng truy cập đồng thời tăng cao (> 50 bác sĩ/điều dưỡng cùng thao tác), nâng cấu hình `spring.datasource.hikari.maximum-pool-size` từ 5 lên 15–20 trong `application.yml`.

