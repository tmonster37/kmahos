# KẾ HOẠCH TRIỂN KHAI CẢI TIẾN TỪ THAM KHẢO REVITA-BE
**Dự án:** Hospital Management System (HMS) - `hospital-api` & `hospital-ui`
**Nguồn tham khảo:** `https://github.com/iamKhang/revita-be.git` (NestJS + Prisma + PayOS + Medical System)
**Ngày lập:** 13/10/2026
**Trạng thái:** ⏳ Chờ người dùng phê duyệt (Waiting for Approval)

---

## 1. TỔNG QUAN KHẢO SÁT DỰ ÁN THAM KHẢO REVITA-BE

Dự án `revita-be` là hệ thống backend phòng khám đa khoa / quản lý khám chữa bệnh xây dựng trên nền tảng **NestJS (TypeScript) + Prisma ORM + PostgreSQL**:
- **Công nghệ chính**: NestJS v11, Prisma Client v6, PostgreSQL, Redis, Socket.IO, `@payos/node` v2.0.3, Crypto (AES-256-GCM).
- **License**: `UNLICENSED` (Mã nguồn riêng tư của tác giả Khang).
- **Nguyên tắc tuân thủ**: Không sao chép nguyên văn code vi phạm bản quyền; chỉ phân tích kiến trúc, học hỏi giải pháp nghiệp vụ và tự thiết kế/triển khai theo chuẩn Spring Boot 3 + JPA/Hibernate + React của dự án bệnh viện.

---

## 2. BẢNG ĐỐI CHIẾU KỸ THUẬT CHI TIẾT

| Vấn đề ở dự án bệnh viện | Cách dự án GitHub (`revita-be`) xử lý | Có phù hợp không | Cách điều chỉnh cho dự án bệnh viện | Rủi ro |
| :--- | :--- | :---: | :--- | :--- |
| **1. Bảo vệ API tra cứu hồ sơ bệnh nhân** | Dùng `@UseGuards(JwtAuthGuard, RolesGuard)` ở class level và `@Roles(...)` ở method. Với role `PATIENT`, chỉ truy vấn các `patientProfile` thuộc `user.patient.id`. Nội dung bệnh án mã hóa AES-256-GCM. (`src/medical-record/medical-record.service.ts:504-541`) | **Rất phù hợp** | Dự án bệnh viện đã có `@PreAuthorize` và che mờ (masking). Cần bổ sung kiểm tra sở hữu: nếu người dùng là `ROLE_PATIENT`, chỉ được xem danh sách hồ sơ thuộc tài khoản của mình (`account.getId() == currentUser.getId()`), ngăn chặn triệt để IDOR. | Nếu người dùng có hồ sơ gia đình (con cái, cha mẹ), cần đảm bảo quan hệ `Account -> PatientProfiles` được truy vấn đầy đủ. |
| **2. Xác thực PayOS Webhook & Chống Replay** | Dùng `@payos/node` `verifyWebhook(signature, payload)` với HMAC SHA256. Kiểm tra `if (transaction.invoice.isPaid)` thì chỉ ghi log/bắn socket, KHÔNG chạy `completeInvoicePayment` lần 2. Lưu `lastWebhookPayload Json` và `isVerified Boolean` vào bảng `PaymentTransaction`. (`src/invoice/invoice-payment.service.ts:1036-1238`) | **Rất phù hợp** | Dự án bệnh viện đã tự triển khai HMAC SHA256 cho PayOS và HMAC SHA512 cho VNPay, chống replay callback. Áp dụng thêm việc lưu cờ xác minh `isVerified = true` và `orderCode` số vào bản ghi giao dịch để tiện tra cứu đối soát. | Cần đảm bảo `orderCode` kiểu số tương thích giữa cổng thanh toán và DB. |
| **3. Kiểm tra số tiền giao dịch** | Dùng `class-validator` `@IsPositive()` và hàm `reduce` tính tổng tiền từ dịch vụ đã chọn, loại bỏ các dịch vụ không hợp lệ. (`src/invoice/invoice-payment.service.ts:401-410`) | **Rất phù hợp** | Dự án bệnh viện đã có `validateAmount` (> 0, scale <= 2, max limit) ở service và DTO validation. Giữ nguyên và mở rộng cho mọi endpoint thanh toán. | Không có rủi ro nếu giữ scale 2 chữ số thập phân cho VND/USD. |
| **4. Chống thu trùng viện phí (Concurrency/Race Condition)** | `revita-be` chỉ kiểm tra cờ `isPaid` trong code và dùng `$transaction` của Prisma ở một số tác vụ, nhưng **không sử dụng Pessimistic Lock** (`FOR UPDATE`). | **Không tối ưu bằng giải pháp hiện tại của dự án bệnh viện** | Dự án bệnh viện đã triển khai `@Lock(LockModeType.PESSIMISTIC_WRITE)` (`SELECT ... FOR UPDATE`) trên PostgreSQL trong `BookingRepository`. Đây là giải pháp cấp độ cơ sở dữ liệu mạnh mẽ hơn nhiều so với kiểm tra logic trong code của `revita-be` khi chạy môi trường phân tán / nhiều instance. Ta giữ nguyên giải pháp Pessimistic Lock hiện tại. | Cần duy trì timeout transaction hợp lý để tránh treo connection pool. |
| **5. An toàn dữ liệu DTO Allowlist** | `revita-be` trả về các DTO độc lập (`PaymentResult`, `PaymentTransactionSummary`, `Invoice`), không bao giờ expose entity `User` hay `password`. (`src/invoice/invoice-payment.service.ts:113-140`) | **Rất phù hợp** | Dự án bệnh viện đã áp dụng `TransactionResponse` allowlist loại bỏ hoàn toàn `Account`, password, pinCode. Giữ vững chuẩn này. | Không có rủi ro. |
| **6. Thuật toán Phân tầng Ưu tiên Tiếp đón (Priority Queue)** | `revita-be` xây dựng `PriorityCalculatorService` tính điểm ưu tiên dựa trên: Tuổi cao (>= 65 tuổi), Trẻ em (< 6 tuổi), Phụ nữ mang thai, Người khuyết tật, Bệnh nhân tái khám có kết quả CLS (`RETURN_AFTER_RESULT`). (`src/booth-queue/priority-calculator.service.ts:1-75`) | **Rất hay cho nghiệp vụ Bệnh viện** | Tham khảo ý tưởng này để bổ sung trường `priorityLevel` và hàm tính ưu tiên trong quy trình tiếp nhận của Điều dưỡng và Cây Kiosk tại sảnh của dự án bệnh viện, giúp bệnh nhân cao tuổi/trẻ nhỏ được tự động xếp số ưu tiên. | Cần điều dưỡng xác nhận diện ưu tiên đặc biệt khi làm thủ tục khám. |
| **7. Cấu hình Production & Bảo mật Secret** | `revita-be` ghi log cảnh báo khi thiếu key PayOS hoặc dùng default encryption key trong `EncryptionService`. (`src/medical-record/encryption.service.ts:24-30`) | **Phù hợp một phần** | Dự án bệnh viện đã tạo `ProductionSecurityValidator` chặn khởi động (`throw IllegalStateException`) trên profile `prod` nếu thiếu secret bắt buộc. Cách tiếp cận của chúng ta chặt chẽ hơn (Fail-fast) so với chỉ log warn của `revita-be`. Ta duy trì cơ chế Fail-Fast này. | Quản trị viên cần cấu hình đầy đủ biến môi trường trước khi khởi chạy production. |

---

## 3. CÁC HẠNG MỤC ĐỀ XUẤT ÁP DỤNG VÀO DỰ ÁN BỆNH VIỆN

Dựa trên khảo sát đối chiếu, đề xuất triển khai 2 cải tiến có giá trị thực tế cao nhất vào dự án bệnh viện:

### Hạng mục A: Tăng cường Kiểm tra IDOR cho Hồ sơ Bệnh nhân (Học từ `revita-be: medical-record.service.ts`)
- **Mục tiêu**: Khi tài khoản có role `PATIENT` gọi API lấy danh sách hồ sơ hoặc xem chi tiết hồ sơ bệnh nhân, hệ thống bắt buộc kiểm tra xem hồ sơ đó có thuộc về `Account` của bệnh nhân đang đăng nhập hay không.
- **Triển khai**: Trong `PatientProfileServiceImpl`, bổ sung kiểm tra quyền sở hữu: nếu `currentUser` là `PATIENT`, chỉ trả về các hồ sơ có `account.id == currentUser.getId()`. Nếu truy cập hồ sơ của tài khoản khác, ném `AppException("Bạn không có quyền truy cập hồ sơ này", HttpStatus.FORBIDDEN)`.

### Hạng mục B: Bổ sung Cơ chế Phân loại Ưu tiên Khám bệnh (Priority Triage) tại Tiếp nhận (Học từ `revita-be: priority-calculator.service.ts`)
- **Mục tiêu**: Bổ sung phân tầng ưu tiên y tế cho ca khám tạo qua Kiosk và Tiếp đón Điều dưỡng:
  - `PRIORITY_ELDERLY`: Người cao tuổi (>= 65 tuổi).
  - `PRIORITY_CHILD`: Trẻ nhỏ (< 6 tuổi).
  - `NORMAL`: Bệnh nhân thông thường.
- **Triển khai**: Bổ sung hàm tính mức độ ưu tiên trong backend khi tạo booking, tự động gắn cờ ưu tiên hiển thị trên màn hình điều dưỡng và danh sách chờ khám của bác sĩ.

---

## 4. KẾ HOẠCH KIỂM THỬ (TEST PLAN)

1. **Test IDOR Hồ sơ Bệnh nhân**:
   - Dùng token Bệnh nhân A tra cứu hồ sơ Bệnh nhân B -> Kỳ vọng nhận 403 Forbidden.
   - Dùng token Bệnh nhân A tra cứu hồ sơ của chính mình -> Kỳ vọng nhận 200 OK.
2. **Test Phân tầng Ưu tiên (Priority)**:
   - Tạo ca khám cho bệnh nhân sinh năm 1950 (>= 65 tuổi) -> Xác nhận trạng thái được đánh dấu ưu tiên.
3. **Chạy lại toàn bộ bộ test kiểm thử bảo mật & thu ngân hiện có** (`test_security_hardening.js` và `test_cashier_workflow.js`) để đảm bảo không phát sinh regression.
