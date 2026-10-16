# 📋 KẾ HOẠCH TRIỂN KHAI (IMPLEMENTATION PLAN)
## Tích hợp Thanh toán PayOS, Webhook Idempotency & Đối soát Giao dịch (TASK-12)

> **Mục tiêu:** Nâng cấp hệ thống thanh toán PayOS Open Banking (VietQR động) và cơ chế xử lý Webhook Idempotency trong dự án bệnh viện `hospital-api` theo các chuẩn kỹ thuật từ dự án tham khảo `revita-be`. Đảm bảo tính toàn vẹn tài chính, chống xử lý lặp giao dịch và hỗ trợ đối soát minh bạch cho nhân viên thu ngân/kế toán.

---

### 1. Hiện trạng & Khoảng cách Kỹ thuật (Gap Analysis)

| Tiêu chí | Hiện trạng tại `hospital-api` | Tiêu chuẩn kỹ thuật từ `revita-be` | Giải pháp nâng cấp |
| :--- | :--- | :--- | :--- |
| **Mã đơn hàng (`orderCode`)** | Dùng chuỗi `TNT + System.currentTimeMillis()` lưu vào `vnpayTxnRef`. | Quản lý `orderCode` là số nguyên dương $\le \text{MAX\_SAFE\_INTEGER}$ (`Long` trong Java). | Bổ sung `orderCode` kiểu `Long` vào `Transaction` và sinh số an toàn trong giới hạn 64-bit/JS an toàn. |
| **Cờ xác thực chữ ký (`isVerified`)** | Chỉ đổi `status = SUCCESS`, chưa có cờ đánh dấu đã xác thực chữ ký số webhook. | Lưu `isVerified: Boolean` sau khi verify chữ ký HMAC-SHA256 thành công. | Bổ sung `isVerified: Boolean` vào `Transaction` và phơi bày ra DTO `TransactionResponse`. |
| **Lưu vết đối soát Webhook** | Nối chuỗi vào `description`. | Lưu `providerTransactionId`, `reference` từ Webhook payload. | Thêm trường `webhookReference: String` lưu mã tham chiếu ngân hàng/PayOS (`data.reference()`). |
| **Xử lý Idempotency** | Đã có kiểm tra `if ("SUCCESS".equals(transaction.getStatus())) return;` | Ghi log chi tiết, trả về cờ `isVerified = true`, ngăn chặn tuyệt đối nạp ví/gạch nợ lần 2. | Chuẩn hóa log audit, đảm bảo return idempotency an toàn, không thay đổi số dư ví hoặc trạng thái hóa đơn. |
| **Đối soát quầy thu ngân & bệnh nhân** | DTO `TransactionResponse` chưa có `orderCode`, `isVerified`. | Có mã đối soát và cờ xác thực để tra cứu trên cổng thanh toán. | Bổ sung `orderCode`, `isVerified`, `webhookReference` vào `TransactionResponse` và `VietQRResponse`. |

---

### 2. Chi tiết Thay đổi Kỹ thuật

#### A. Cập nhật Thực thể CSDL & DTO
1. **`Transaction.java`**:
   - Thêm trường `private Long orderCode;` (Mã đơn hàng số cho PayOS/VietQR, có `@Index`).
   - Thêm trường `private Boolean isVerified = false;` (Đánh dấu đã xác thực chữ ký số Webhook).
   - Thêm trường `private String webhookReference;` (Mã tham chiếu ngân hàng/PayOS trả về).
2. **`TransactionResponse.java`**:
   - Thêm `Long orderCode`
   - Thêm `Boolean isVerified`
   - Thêm `String webhookReference`
3. **`VietQRResponse.java`**:
   - Thêm `Long orderCode` để frontend hiển thị mã đơn số cho bệnh nhân và nhân viên thu ngân.

#### B. Nâng cấp Nghiệp vụ `PaymentServiceImpl.java`
1. **`createVietQRPayment`**:
   - Sinh `Long orderCode`: Sử dụng số nguyên dương ngẫu nhiên an toàn kết hợp timestamp modulo để đảm bảo $< 9 \times 10^{15}$ (an toàn cho cả Java `Long` và JavaScript `Number.MAX_SAFE_INTEGER`).
   - Gán `orderCode` và `txnRef` vào `Transaction`.
2. **`processPayOSWebhook`**:
   - Tìm kiếm giao dịch theo `orderCode` hoặc `description`/`txnRef`.
   - Xác thực chữ ký HMAC-SHA256 của PayOS với `payOSConfig.checksumKey`.
   - **Xử lý Idempotency:**
     + Nếu `status == SUCCESS`: Ghi log `[IDEMPOTENT PAYOS WEBHOOK] Giao dịch đã xử lý trước đó`, đảm bảo `isVerified = true` và trả về ngay, không nạp ví hay gạch nợ lần 2.
   - **Xử lý lần đầu:**
     + So khớp số tiền (`amount`).
     + Cập nhật `status = SUCCESS`, `isVerified = true`, `webhookReference = data.reference()`.
     + Nếu `type == DEPOSIT_WALLET`: Nạp tiền ví nguyên tử.
     + Lưu `transactionRepository.save(transaction)`.

#### C. Database Migration Script (An toàn cho Production)
```sql
-- Dành cho môi trường Staging/Production chạy ddl-auto: validate
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_code BIGINT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS webhook_reference VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_txn_order_code ON transactions(order_code);
```

---

### 3. Kế hoạch Kiểm thử Tự động (Test Plan)
Tạo file kiểm thử tự động `test_payos_idempotency.js`:
- **TC 1:** Tạo yêu cầu VietQR / PayOS -> Kiểm tra response trả về `orderCode` số hợp lệ ($> 0$ và $\le 9007199254740991$).
- **TC 2:** Gửi PayOS Webhook với chữ ký HMAC-SHA256 hợp lệ -> Giao dịch chuyển sang `SUCCESS`, `isVerified = true`, `webhookReference` được lưu trữ.
- **TC 3:** Gửi PayOS Webhook với chữ ký giả mạo / không khớp -> Bị từ chối với HTTP `400 Bad Request`.
- **TC 4:** Gửi lại PayOS Webhook lần 2 (Mô phỏng Webhook Retry / Trùng lặp) -> Hệ thống xử lý Idempotent, trả về HTTP `200 OK`, số dư ví tài khoản **không bị cộng tiền 2 lần**.
- **TC 5:** Gọi API kiểm tra trạng thái `/api/payment/status/{txnRef}` -> Trả về đầy đủ `orderCode`, `isVerified = true`, `webhookReference`.

---

### 4. Quy trình Phê duyệt
Theo quy tắc dự án, AI sẽ **DỪNG LẠI** tại đây để người dùng xem xét kế hoạch.  
Chỉ tiến hành sửa mã nguồn sau khi người dùng phản hồi **đồng ý / duyệt**.
