# KẾ HOẠCH TRIỂN KHAI: HOÀN THIỆN & NÂNG CẤP TÍCH HỢP THANH TOÁN PAYOS
**Mã kế hoạch:** PLAN-PAYOS-INTEGRATION-HARDENING-01-11-26  
**Ngày lập:** 01/11/2026  
**Trạng thái:** HOÀN THÀNH VÀ ĐÃ NGHIỆM THU (COMPLETED & VERIFIED)  
**Quy chuẩn áp dụng:** RIPER-5 / AGENTS.md / vc-generate-plan  

---

## 1. TỔNG QUAN & MỤC TIÊU CỐT LÕI (EXECUTIVE SUMMARY)

### 1.1. Mục tiêu kỹ thuật
1. **Phân quyền API & An ninh Endpoint (Zero-Trust):**
   - Thu hẹp quyền trong `SecurityConfig.java`: Chỉ duy nhất `POST /api/payment/payos/webhook` được phép `permitAll()`.
   - Bảo vệ API đồng bộ trạng thái `POST /api/payment/payos/sync/{orderCode}`: Bắt buộc đăng nhập (`authenticated()`). Tầng service kiểm tra nghiêm ngặt: chỉ người sở hữu giao dịch (`transaction.account.userId == currentUser.id`) HOẶC nhân viên (`ADMIN`, `CASHIER`, `NURSE`) mới được phép kích hoạt và nhận kết quả chi tiết.
   - Luồng Kiosk an toàn: Cung cấp endpoint hoặc cơ chế xác thực riêng biệt cho Kiosk khi thanh toán tiền khám (`/api/payment/kiosk/vietqr` hoặc kiểm tra chặt chẽ `bookingCode` còn hiệu lực ở Kiosk). Chặn người dùng nặc danh tạo giao dịch nạp ví (`DEPOSIT_WALLET`) hoặc tạo rác giao dịch.

2. **Xác nhận thanh toán trung thực & Trải nghiệm Return URL:**
   - Tuyệt đối không đánh dấu hoặc hiển thị thanh toán thành công chỉ dựa vào query params (`code=00`, `status=PAID`) trên trình duyệt khi redirect về trang `/payment`.
   - Bắt buộc kiểm tra chữ ký HMAC trong `verifyReturnUrlData` của `PayOSConfig.java`; loại bỏ logic chấp nhận cho qua khi thiếu chữ ký.
   - Giao diện `PaymentPage.jsx` khi nhận return URL sẽ hiển thị màn hình *"Đang xác nhận kết quả thanh toán từ ngân hàng..."* và gọi backend để đối soát trạng thái thực tế. Chỉ hiển thị thành công khi backend xác nhận `status = SUCCESS` và `isVerified = true`.
   - Tối ưu hóa Polling trong `PaymentQRModal.jsx`: Chuyển sang kiểm tra trạng thái trong database nội bộ (`GET /api/payment/status/{txnRef}`) thay vì mỗi 2.5s lại gửi HTTP request ra cổng PayOS bên ngoài. Chỉ khi người dùng bấm *"Đồng bộ ngay"* hoặc sau thời gian chờ mới gửi request tra cứu tới PayOS.

3. **Kiểm soát môi trường & Xóa bỏ toàn bộ QR / STK Giả lập:**
   - Trên Production: Nếu PayOS lỗi kết nối hoặc chưa cấu hình khóa thật, hệ thống ném ngoại lệ rõ ràng (`AppException`), tuyệt đối KHÔNG sinh VietQR giả lập trỏ về STK cá nhân hardcoded `0987654321`.
   - Trên Dev/Test: Cho phép mô phỏng kiểm thử nhưng thêm cờ `isSimulation = true`, hiển thị Banner màu vàng cảnh báo `[CHẾ ĐỘ MÔ PHỎNG / DEMO]` trên giao diện để tránh nhầm lẫn.
   - Mở rộng `ProductionSecurityValidator`: Bắt buộc kiểm tra `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` (không để trống, không chứa tiền tố `demo-`); kiểm tra `PAYOS_RETURN_URL` và `PAYOS_CANCEL_URL` trên Production không được chứa `localhost` hay `127.0.0.1`.
   - Dọn sạch logic hardcode STK giả lập `0987654321` và `setTimeout` ảo trong `CashierPage.jsx` và `CounterManagementPanel.jsx`.

4. **Chuẩn hóa Mã đơn & Chống giao dịch trùng lặp (Idempotency):**
   - Thêm ràng buộc duy nhất (`unique = true`) cho cột `order_code` trong bảng `transactions` (`Transaction.java`).
   - Cải tiến hàm sinh mã đơn: bổ sung vòng lặp kiểm tra va chạm (`existsByOrderCode`).
   - Tái sử dụng giao dịch PENDING cho cùng một booking: Khi người dùng bấm tạo link thanh toán, nếu booking đã có Transaction `PENDING` được tạo trong vòng 15 phút, tái sử dụng `orderCode` cũ thay vì tạo thêm record mới rác.
   - Chặn thanh toán đúp: Nếu `booking.isPaid == true`, từ chối tạo link thanh toán mới với lỗi `400 Bad Request` (*"Lịch khám này đã được thanh toán hoàn tất"*).

5. **Bảo toàn luồng vận hành tại quầy:**
   - Đảm bảo luồng thu tiền mặt (`CASH`), quẹt thẻ (`POS`) của Thu ngân (`CashierService`) và Điều dưỡng tiếp đón (`NurseReceptionService`) hoạt động độc lập, không bị ảnh hưởng.

---

## 2. KẾ HOẠCH TRIỂN KHAI CHI TIẾT THEO 5 PHA (EXECUTION PHASES)

### PHA 1: Phân quyền API & An ninh Endpoint
- **Điểm chạm:**
  - `hospital-api/src/main/java/com/hospital/api/config/SecurityConfig.java`
  - `hospital-api/src/main/java/com/hospital/api/controller/PaymentController.java`
  - `hospital-api/src/main/java/com/hospital/api/service/PaymentService.java`
  - `hospital-api/src/main/java/com/hospital/api/service/impl/PaymentServiceImpl.java`
- **Công việc cụ thể:**
  1. Trong `SecurityConfig.java`:
     - Thay đổi `.requestMatchers(..., "/api/payment/payos/**", ...)` -> Chỉ cho phép duy nhất `POST /api/payment/payos/webhook` là `permitAll()`.
     - Cho phép `POST /api/payment/kiosk/vietqr` là `permitAll()` (dành riêng cho Kiosk cấp mã khám).
     - Đưa `/api/payment/payos/sync/**`, `/api/payment/payos/create-link`, `/api/payment/vietqr/create`, `/api/payment/status/**` vào nhóm bắt buộc xác thực (`authenticated()`).
  2. Trong `PaymentController.java` & `PaymentServiceImpl.java`:
     - Thêm `@AuthenticationPrincipal UserPrincipal currentUser` vào `syncPayOSPayment(@PathVariable Long orderCode, ...)`.
     - Kiểm tra quyền trong `syncPayOSPayment`: Người gọi phải là chủ tài khoản của giao dịch hoặc có role `ADMIN`, `CASHIER`, `NURSE`.
     - Bổ sung endpoint chuyên biệt `POST /api/payment/kiosk/vietqr` cho Kiosk: yêu cầu tham số `bookingCode` bắt buộc, kiểm tra booking tồn tại, chưa thanh toán và thuộc phiên Kiosk hợp lệ; từ chối tạo giao dịch nếu type không phải `PAY_BOOKING`.

---

### PHA 2: Xác nhận Thanh toán, Chữ ký Return URL & Tối ưu Polling
- **Điểm chạm:**
  - `hospital-api/src/main/java/com/hospital/api/config/PayOSConfig.java`
  - `hospital-ui/src/pages/patient/PaymentPage.jsx`
  - `hospital-ui/src/components/payment/PaymentQRModal.jsx`
  - `hospital-ui/src/services/bookingPayment.js`
- **Công việc cụ thể:**
  1. Trong `PayOSConfig.java`:
     - Sửa `verifyReturnUrlData`: Bắt buộc phải có `signature` và chữ ký HMAC phải khớp với checksum key; trả về `false` nếu không có signature.
  2. Trong `PaymentPage.jsx`:
     - Bỏ đoạn mã hiển thị thành công trực tiếp chỉ dựa trên query string `payosCode === "00"`.
     - Tạo state `verifyingReturn`: Khi có `payosOrderCode`, hiển thị Alert thông tin *"Đang đối soát kết quả giao dịch #{orderCode} từ cổng thanh toán..."*.
     - Gọi backend `POST /api/payment/payos/sync/{orderCode}` để xác minh. Chỉ khi backend trả về `status === "SUCCESS"` mới hiển thị thông báo thành công và cập nhật số dư ví.
  3. Trong `PaymentQRModal.jsx` & `bookingPayment.js`:
     - Polling định kỳ 2.5s chuyển sang gọi `GET /api/payment/status/{txnRef}` để kiểm tra trạng thái nội bộ trong DB (được cập nhật tức thì bởi Webhook).
     - Chỉ khi người dùng bấm nút *"Đồng bộ ngay"* (`handleSyncPayOS`) hoặc modal hết thời gian chờ mới gọi sang `POST /api/payment/payos/sync/{orderCode}` để tra cứu cổng PayOS bên ngoài.

---

### PHA 3: Kiểm soát Môi trường & Loại bỏ toàn bộ QR / STK Giả lập
- **Điểm chạm:**
  - `hospital-api/src/main/java/com/hospital/api/config/ProductionSecurityValidator.java`
  - `hospital-api/src/main/java/com/hospital/api/service/impl/PayOSServiceImpl.java`
  - `hospital-ui/src/pages/cashier/CashierPage.jsx`
  - `hospital-ui/src/components/nurse/CounterManagementPanel.jsx`
  - `hospital-ui/src/components/payment/PaymentQRModal.jsx`
- **Công việc cụ thể:**
  1. Trong `ProductionSecurityValidator.java`:
     - Bổ sung kiểm tra khi profile là `prod` hoặc `production`:
       - `payos.client-id` không được null, rỗng hoặc chứa `demo-client-id`.
       - `payos.api-key` không được null, rỗng hoặc chứa `demo-api-key`.
       - `payos.checksum-key` không được null, rỗng hoặc chứa `demo-checksum-key`.
       - `payos.return-url` và `payos.cancel-url` không được chứa `localhost` hoặc `127.0.0.1`.
  2. Trong `PayOSServiceImpl.java`:
     - Kiểm tra môi trường: Nếu là Production và PayOS lỗi hoặc thiếu key -> Ném `AppException("Cổng thanh toán PayOS tạm thời không khả dụng...", HttpStatus.SERVICE_UNAVAILABLE)`. Tuyệt đối không fallback sang QR mô phỏng.
     - Nếu là môi trường phát triển (non-prod): Thêm cờ đánh dấu trong response `isSimulation = true`.
  3. Trong `CashierPage.jsx` & `CounterManagementPanel.jsx`:
     - Xóa bỏ toàn bộ khối code fallback tự sinh STK `0987654321` và `setTimeout` giả lập 1.2s.
     - Nếu tạo link thất bại, hiển thị thông báo lỗi rõ ràng và nút *"Thử lại"*, hướng dẫn thu tiền mặt tại quầy.
  4. Trong `PaymentQRModal.jsx`:
     - Nếu nhận được cờ `isSimulation = true`, hiển thị Banner màu vàng: `[CHẾ ĐỘ MÔ PHỎNG KIỂM THỬ]` để phân biệt rõ ràng.

---

### PHA 4: Chuẩn hóa Mã đơn, Unique Constraint DB & Chống giao dịch trùng
- **Điểm chạm:**
  - `hospital-api/src/main/java/com/hospital/api/entity/Transaction.java`
  - `hospital-api/src/main/java/com/hospital/api/repository/TransactionRepository.java`
  - `hospital-api/src/main/java/com/hospital/api/service/impl/PaymentServiceImpl.java`
- **Công việc cụ thể:**
  1. Trong `Transaction.java`:
     - Khai báo `@Column(name = "order_code", unique = true)` và index duy nhất `@Index(name = "idx_txn_order_code_unique", columnList = "order_code", unique = true)`.
  2. Trong `TransactionRepository.java`:
     - Bổ sung `boolean existsByOrderCode(Long orderCode);`
     - Bổ sung tìm kiếm giao dịch PENDING theo booking: `Optional<Transaction> findFirstByDescriptionContainingAndStatusAndCreatedAtAfter(String bookingCode, String status, LocalDateTime after);`
  3. Trong `PaymentServiceImpl.java`:
     - Cải tiến sinh `orderCode`:
       ```java
       long orderCode;
       do {
           orderCode = (System.currentTimeMillis() % 10000000000L) * 1000L + ThreadLocalRandom.current().nextInt(100, 999);
       } while (transactionRepository.existsByOrderCode(orderCode));
       ```
     - Chặn thanh toán đúp cho booking: Trong `validateBookingOrder`, nếu `booking != null && Boolean.TRUE.equals(booking.getIsPaid())`, ném `AppException("Lịch khám này đã được thanh toán hoàn tất", HttpStatus.BAD_REQUEST)`.
     - Tái sử dụng giao dịch PENDING còn hiệu lực (trong vòng 15 phút): Nếu booking đã có giao dịch PENDING gần đây, tái sử dụng `orderCode` và link thanh toán đó thay vì tạo thêm record mới.

---

### PHA 5: UX Thông báo lỗi, Đồng bộ Tài liệu & Verification Matrix
- **Điểm chạm:**
  - `README.md`
  - `hospital-ui/src/pages/patient/PaymentPage.jsx`
  - `hospital-ui/src/pages/patient/MedicalBillsPage.jsx`
  - `hospital-ui/src/pages/customer/BookingPage.jsx`
- **Công việc cụ thể:**
  1. Cập nhật `README.md`: Hướng dẫn cấu hình biến môi trường PayOS (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_RETURN_URL`, `PAYOS_CANCEL_URL`), cơ chế webhook IPN và quy tắc bảo mật production.
  2. Hoàn thiện UX hiển thị thông báo lỗi thân thiện tại các trang thanh toán của bệnh nhân, có nút *"Thử lại"* và gợi ý thanh toán quầy.

---

## 3. MA TRẬN XÁC MINH TOÀN DIỆN (VERIFICATION MATRIX)

| Mã kiểm thử | Đối tượng kiểm tra | Phương thức & Điều kiện | Kỳ vọng mong muốn |
| :--- | :--- | :--- | :--- |
| **TC-PAYOS-01** | Webhook công khai | `POST /api/payment/payos/webhook` (kèm chữ ký HMAC chuẩn) | **HTTP 200 OK**, cập nhật giao dịch thành công |
| **TC-PAYOS-02** | Webhook giả mạo | `POST /api/payment/payos/webhook` (sai chữ ký hoặc thiếu signature) | **HTTP 400 Bad Request**, từ chối xử lý |
| **TC-PAYOS-03** | Bảo vệ API Sync | `POST /api/payment/payos/sync/{orderCode}` (không gửi JWT token) | **HTTP 401 Unauthorized** (Bảo vệ endpoint) |
| **TC-PAYOS-04** | Quyền gọi API Sync | `POST /api/payment/payos/sync/{orderCode}` (bệnh nhân A gọi orderCode của bệnh nhân B) | **HTTP 403 Forbidden** |
| **TC-PAYOS-05** | Nhân viên gọi API Sync | `POST /api/payment/payos/sync/{orderCode}` (Tài khoản Cashier/Nurse gọi) | **HTTP 200 OK**, trả về kết quả đối soát |
| **TC-PAYOS-06** | Giả mạo Return URL | Truy cập `/payment?code=00&status=PAID` trên trình duyệt | UI hiển thị *"Đang xác minh..."*, không tự báo thành công nếu DB chưa có xác nhận |
| **TC-PAYOS-07** | Polling nội bộ | Mở modal `PaymentQRModal.jsx` | Polling gọi `GET /api/payment/status/{txnRef}`, không gửi request ra máy chủ PayOS |
| **TC-PAYOS-08** | Chặn QR giả trên Prod | Chạy profile `prod` khi thiếu key PayOS | Backend chặn tạo giao dịch với lỗi 503, không sinh QR tài khoản `0987654321` |
| **TC-PAYOS-09** | Khởi động Production | Khởi động với `PAYOS_CLIENT_ID=demo-client-id` trên `prod` | `ProductionSecurityValidator` ném lỗi và dừng khởi động |
| **TC-PAYOS-10** | Return URL Production | Khởi động với `PAYOS_RETURN_URL=http://localhost:3000` trên `prod` | `ProductionSecurityValidator` ném lỗi cấu hình localhost |
| **TC-PAYOS-11** | Chống thanh toán đúp | Tạo link thanh toán cho `bookingCode` đã có `isPaid = true` | **HTTP 400 Bad Request**, báo lịch khám đã thanh toán |
| **TC-PAYOS-12** | Tái sử dụng PENDING | Gọi tạo link thanh toán 2 lần liên tiếp cho 1 booking còn PENDING | Trả về cùng `orderCode` và link cũ, không sinh bản ghi PENDING mới |
| **TC-PAYOS-13** | Ràng buộc DB orderCode | Kiểm tra schema bảng `transactions` | Cột `order_code` có unique constraint |
| **TC-PAYOS-14** | Luồng Quầy thu ngân | Thu ngân thanh toán tiền mặt/quẹt thẻ trên `CashierPage.jsx` | Giao dịch CASH/POS thành công, in biên lai bình thường |
| **TC-PAYOS-15** | Luồng Quầy tiếp đón | Điều dưỡng thực hiện `payAtClinic` trên `NurseReceptionPage.jsx` | Thu tiền và tiếp đón/phân buồng thành công, không bị lỗi |

---

## 4. QUẢN LÝ RỦI RO & BẢO TOÀN HỆ THỐNG (BLAST RADIUS)

- **Luồng Kiosk:** Kiosk được cấp endpoint chuyên biệt hoặc kiểm tra chặt `bookingCode` hợp lệ, đảm bảo người bệnh lấy số tại sảnh vẫn quét mã VietQR và vào khám bình thường.
- **Luồng Thu ngân & Tiếp đón:** Các API thu viện phí tại quầy (`/api/cashier/pay`, `/api/nurse/reception/pay-at-clinic`) được tách biệt hoàn toàn, không phụ thuộc vào tình trạng hoạt động của PayOS.
- **Biên dịch & Test:** Kiểm tra `mvnw test-compile -DskipTests` và `npm run build` đạt 100% trước khi nghiệm thu.

---
*Kế hoạch đã sẵn sàng và được lưu tại `process/general-plans/active/payos-integration-hardening_PLAN_01-11-26.md`.*  
*Hệ thống sẽ giữ nguyên trạng thái và chỉ thực hiện chỉnh sửa mã nguồn khi nhận được lệnh chính xác: **"ENTER EXECUTE MODE"**.*

