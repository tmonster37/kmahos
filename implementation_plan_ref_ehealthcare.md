# KẾ HOẠCH TRIỂN KHAI (IMPLEMENTATION PLAN) - TASK-13
# THAM KHẢO KỸ THUẬT TỪ REPOSITORY E-HEALTHCARE (GITHUB: lecuong2512/E-healthcare)

> **Mã công việc:** TASK-13  
> **Người thực hiện:** Senior Fullstack & Medical Security Engineer  
> **Dự án tham khảo:** [E-healthcare (GitHub)](https://github.com/lecuong2512/E-healthcare.git)  
> **Giấy phép tham khảo:** MIT License (Copyright 2026 Lê Việt Cường & E-Healthcare Contributors)  
> **Trạng thái:** ⏳ **PLANNING - CHỜ DUYỆT TỪ NGƯỜI DÙNG** (Không tự ý sửa code trước khi được phê duyệt)

---

## 1. TỔNG QUAN KHẢO SÁT DỰ ÁN THAM KHẢO E-HEALTHCARE

Dự án tham khảo `E-healthcare` là một hệ thống y tế số toàn diện xây dựng trên kiến trúc Monorepo TypeScript:
- **Backend:** NestJS 10, TypeORM 0.3, PostgreSQL 16, Redis 7.2 (Distributed Lock & Cache).
- **Frontend:** Angular 18 (Standalone Components, Signals), TailwindCSS.
- **Phân hệ chính:** `clinical` (Hồ sơ bệnh án EMR, kiểm tra an toàn thuốc CDS), `payment` (VNPay, MoMo, hoàn tiền, đối soát chủ động), `booking` (Đặt lịch, khóa phân tán Redis), `reception` (Check-in tiếp đón), `audit` (Sanitize nhật ký kiểm toán).
- **Giấy phép bản quyền:** MIT License cho phép tái sử dụng và tham khảo ý tưởng kỹ thuật mà không vi phạm sở hữu trí tuệ.

---

## 2. BẢNG SO SÁNH ĐỐI CHIẾU KỸ THUẬT (5 CỘT CHUẨN)

| Vấn đề ở dự án bệnh viện | Cách dự án GitHub xử lý | Có phù hợp không | Cách điều chỉnh cho dự án bệnh viện | Rủi ro |
| :--- | :--- | :---: | :--- | :--- |
| **1. Kiểm tra An toàn Đơn thuốc & Dị ứng Thuốc (Drug Safety & Allergy CDS):** Hiện tại Frontend `PrescriptionModal.jsx` đã có kiểm tra dị ứng, nhưng Backend `ClinicalExaminationServiceImpl.java:244-304` chỉ kiểm tra số lượng tồn kho, chưa có cơ chế kiểm tra dị ứng ở tầng dịch vụ. | Backend `clinical.service.ts:690-745` thực thi `checkPrescriptionSafety`: đối chiếu tên thuốc và `activeIngredient` với tiền sử dị ứng theo nhóm `ALLERGY_GROUP_MAPPINGS` (Penicillin, Cephalosporin, NSAID, Sulfonamide...). | **Rất phù hợp** | Bổ sung phương thức `checkPrescriptionSafety` vào `ClinicalExaminationService` và endpoint `POST /api/v1/doctor/examination/prescriptions/check-safety`. Bác sĩ trên UI được cảnh báo trước khi lưu; nếu gửi API trực tiếp có thuốc gây dị ứng, hệ thống ghi nhận cảnh báo nguy cơ sốc phản vệ. | Tên hoạt chất thuốc gõ không chuẩn (chữ hoa/thường, dấu tiếng Việt) có thể sót chuỗi nếu không chuẩn hóa chuỗi về chữ thường không dấu. Cần chuẩn hóa chuỗi regex. |
| **2. Chuẩn hóa Phản hồi IPN VNPay:** Endpoint IPN trong `PaymentServiceImpl` trả về text hoặc boolean đơn giản, đôi khi cổng VNPay không nhận diện được và tiếp tục gọi retry IPN nhiều lần. | `vnpay.provider.ts:70-86` và `payment.service.ts` chuẩn hóa trả về mã JSON theo đặc tả VNPay (`RspCode: "00"` cho thành công, `"02"` cho trùng lặp/đã xử lý, `"04"` cho sai số tiền, `"97"` cho sai chữ ký). | **Rất phù hợp** | Cập nhật phản hồi endpoint `/api/v1/payment/vnpay-ipn` trong `PaymentController` trả về JSON `{"RspCode":"00","Message":"Confirm Success"}` theo đúng tài liệu VNPay. | Cổng VNPay môi trường Test Sandbox yêu cầu HTTP Status 200 kèm đúng cấu trúc JSON để ngắt vòng lặp retry. |
| **3. Đối soát Chủ động Giao dịch VNPay (QueryDR):** Hiện tại dự án chỉ phụ thuộc vào Return URL và IPN Callback từ VNPay; nếu mạng gián đoạn, giao dịch có thể bị treo ở trạng thái PENDING. | Triển khai hàm `queryStatus` gọi sang API `querydr` của VNPay với HMAC-SHA512 hash data 9 trường (`vnpay.provider.ts:88-140`). | **Phù hợp một phần** | Lưu trữ cấu trúc tham số `querydr` làm tài liệu kỹ thuật tích hợp. Ở giai đoạn hiện tại, ưu tiên xử lý IPN và Idempotency trước để tránh phụ thuộc vào tài khoản doanh nghiệp VNPay thật. | Cần thông tin IP máy chủ và chữ ký số được VNPay cấp phép truy cập API QueryDR. |
| **4. Khóa chống thu trùng và Race Condition đa phiên:** Đặt lịch và thanh toán viện phí trong môi trường đồng thời cao. | Kết hợp Redis distributed lock (`redlock`) ở tầng API và Database Pessimistic Lock (`pessimistic_write`) ở tầng TypeORM (`payment.service.ts:111-138`). | **Đã phù hợp** | Dự án bệnh viện đã áp dụng thành công `@Lock(LockModeType.PESSIMISTIC_WRITE)` trên PostgreSQL cho `Booking` và `Transaction`. Giữ nguyên kiến trúc DB lock hiện tại vì PostgreSQL ACID xử lý cực kỳ vững chắc. | Không cần cài thêm Redis cluster nếu khối lượng tải hiện tại được PostgreSQL quản lý an toàn. |
| **5. Bảo vệ Dữ liệu Audit Log không rò rỉ PII/Lâm sàng:** Nhật ký hệ thống có thể vô tình ghi lại token, mật khẩu hoặc dữ liệu lâm sàng. | `audit.service.ts:16-36` áp dụng allowlist `AUDIT_METADATA_ALLOWLIST` và regex `FORBIDDEN_METADATA_KEY` loại bỏ `vital`, `prescription`, `password`, `token`. | **Rất phù hợp** | Rà soát các bộ ghi log trong Spring Boot (`logback-spring.xml` và các class Service) đảm bảo không log PII, body đơn thuốc hay mã JWT. | Không có rủi ro; tăng tính tuân thủ tiêu chuẩn an toàn dữ liệu y tế (HIPAA/Bộ Y Tế). |

---

## 3. XÁC MINH 9 VẤN ĐỀ ƯU TIÊN ĐỐI CHIẾU TRÊN MÃ NGUỒN HIỆN TẠI

1. **API tra cứu hồ sơ bệnh nhân và endpoint PACS/LIS:**
   - *Thực tế tại dự án bệnh viện:* Đã được bảo vệ an toàn bằng Spring Security RBAC (`@PreAuthorize("hasAnyRole(...)")`), có chống IDOR và che mờ PII (CCCD, SĐT, BHYT) qua DTO allowlist `PatientProfileSummaryDto`.
   - *Tham khảo từ E-healthcare:* E-healthcare cũng kiểm soát chặt chẽ với Guard và chỉ cho phép bác sĩ xem bệnh án khi có cuộc hẹn `appointment` tương ứng.
2. **Thanh toán ví từ chối số tiền âm/0:**
   - *Thực tế:* Đã được kiểm tra và chặn chặt chẽ trong `PaymentServiceImpl.validatePaymentAmount` với HTTP 400 Bad Request. Test script `test_security_hardening.js` xác nhận 100% PASS.
3. **VNPay/PayOS xác minh chữ ký, số tiền, mã giao dịch và chống callback phát lại:**
   - *Thực tế:* Đã triển khai HMAC-SHA512 (VNPay) và HMAC-SHA256 (PayOS), kiểm tra khớp số tiền và Idempotent 200 khi callback lặp. Test script `test_payos_idempotency.js` xác nhận 100% PASS.
4. **Chống thu trùng ở tầng cơ sở dữ liệu khi chạy nhiều instance:**
   - *Thực tế:* Đã triển khai `@Lock(LockModeType.PESSIMISTIC_WRITE)` (`SELECT ... FOR UPDATE` trên PostgreSQL) tại `CashierServiceImpl` và `PaymentServiceImpl`.
5. **API giao dịch trả entity trực tiếp hoặc để lộ tài khoản:**
   - *Thực tế:* Sử dụng `TransactionResponse` và `CashierBillItemDto` DTO allowlist, không để lộ entity `Account` hay mật khẩu.
6. **Giao diện tiếp nhận có báo thành công giả khi backend lỗi:**
   - *Thực tế:* `NurseReceptionPage.jsx` đã được sửa hoàn toàn, hiển thị `Alert error` khi API thất bại, không tạo dữ liệu giả.
7. **Sinh hiệu bệnh nhân có lưu trong localStorage:**
   - *Thực tế:* Không lưu sinh hiệu trong `localStorage`. Sinh hiệu được lưu trực tiếp vào database qua `MedicalObservation`.
8. **Lịch sử thu ngân có phân trang, lỗi rõ ràng và lưu đúng snapshot:**
   - *Thực tế:* Hỗ trợ `Pageable`, trả về `Page<CashierReceiptHistoryResponse>`, lưu `itemsSnapshotJson` bất biến.
9. **Cấu hình production có secret mặc định, SQL logging hoặc tự cập nhật schema:**
   - *Thực tế:* Profile `prod` có `ddl-auto: validate`, `show-sql: false` và `ProductionSecurityValidator.java` chặn khởi động nếu có secret mặc định.

---

## 4. KẾ HOẠCH TRIỂN KHAI ĐỀ XUẤT (NẾU ĐƯỢC PHÊ DUYỆT)

### Mục 1: Bổ sung Kiểm tra An toàn Đơn thuốc (Drug Allergy Safety Check CDS) ở Backend
- **Backend (`ClinicalExaminationService.java` & `ClinicalExaminationServiceImpl.java`):**
  - Thêm phương thức `DrugSafetyCheckResponse checkPrescriptionSafety(UUID recordId, List<PrescriptionItemRequest> items)`.
  - Triển khai logic chuẩn hóa chuỗi và bảng ánh xạ nhóm dị ứng lâm sàng:
    + Penicillin: `penicillin`, `amoxicillin`, `ampicillin`, `augmentin`, `oxacillin`, `cloxacillin`.
    + Cephalosporin: `cephalosporin`, `cefuroxime`, `cefalexin`, `ceftriaxone`, `cefixime`, `cefaclor`.
    + Aspirin / NSAID: `aspirin`, `ibuprofen`, `meloxicam`, `diclofenac`, `celecoxib`.
    + Sulfonamide: `sulfonamide`, `sulfamethoxazole`, `bactrim`, `cotrimoxazole`.
    + Paracetamol: `paracetamol`, `acetaminophen`, `panadol`, `efferalgan`, `decolgen`.
  - Lấy tiền sử dị ứng của bệnh nhân từ ghi chú khám bệnh / hồ sơ bệnh nhân.
  - Trả về danh sách cảnh báo `DrugSafetyWarningDto` (Tên thuốc, tiền sử dị ứng trùng khớp, mức độ nghiêm trọng `CRITICAL` / `WARNING`, thông điệp cảnh báo lâm sàng).
- **Controller (`ClinicalExaminationController.java`):**
  - Endpoint `POST /api/v1/doctor/examination/{recordId}/prescription/check-safety` cho phép bác sĩ kiểm tra tức thì trước khi kê đơn.

### Mục 2: Chuẩn hóa phản hồi IPN VNPay theo chuẩn tài liệu VNPay
- **Backend (`PaymentController.java` & `PaymentServiceImpl.java`):**
  - Định dạng phản hồi của endpoint `/api/v1/payment/vnpay-ipn` trả về JSON `{"RspCode":"00","Message":"Confirm Success"}` thay vì text thô.
  - Các mã chuẩn hóa:
    + `RspCode: "00"`: Giao dịch thành công.
    + `RspCode: "02"`: Đơn hàng đã được xác nhận trước đó (Idempotent success).
    + `RspCode: "04"`: Số tiền không hợp lệ.
    + `RspCode: "97"`: Chữ ký không hợp lệ.

---

## 5. KẾ HOẠCH KIỂM THỬ (TEST PLAN)

1. **Kiểm thử Kiểm tra An toàn Đơn thuốc (Drug Safety CDS):**
   - Tạo hồ sơ bệnh nhân có tiền sử dị ứng "Dị ứng Penicillin, Amoxicillin".
   - Gọi API `check-safety` với đơn thuốc có "Amoxicillin 500mg" -> Kết quả phải trả về cảnh báo `CRITICAL` phát hiện trùng khớp nhóm Penicillin.
   - Thử nghiệm với thuốc an toàn "Berberin" hoặc "Paracetamol" -> Không có cảnh báo Penicillin.
2. **Kiểm thử Chuẩn hóa Phản hồi IPN VNPay:**
   - Giả lập request IPN VNPay hợp lệ -> Trả về `{"RspCode":"00","Message":"Confirm Success"}`.
   - Giả lập request IPN lặp lại -> Trả về `{"RspCode":"02","Message":"Order already confirmed"}`.
   - Giả lập sai chữ ký -> Trả về `{"RspCode":"97","Message":"Invalid Checksum"}`.
3. **Biên dịch & Chạy toàn bộ Test Suite:**
   - Maven verify / compile để đảm bảo không lỗi cú pháp.
   - Viết script tự động Node.js `test_ehealthcare_improvements.js` xác nhận 100% PASS thực tế.

---

> ⚠️ **ĐIỂM DỪNG QUY TRÌNH (PAUSE POINT):**  
> Tuân thủ quy định tại `plan.md` và hướng dẫn trong yêu cầu, tôi xin trình bày bảng đối chiếu và kế hoạch triển khai trên và **DỪNG LẠI CHỜ DUYỆT**. Sau khi bạn xem xét và phản hồi đồng ý ("OK" / "Đồng ý" / "Triển khai"), tôi sẽ tiến hành chỉnh sửa mã nguồn và kiểm thử thực tế.
