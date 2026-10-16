# 🧪 TESTING PLAN: MODULE 12 - PAYOS WEBHOOK IDEMPOTENCY & ĐỐI SOÁT GIAO DỊCH
**Mã phân hệ:** MOD-12 / TASK-12 | **Trạng thái:** ✅ ĐÃ KIỂM THỬ THÀNH CÔNG (100% PASS)

---

## 🎯 1. MỤC TIÊU KIỂM THỬ
Xác minh tính đúng đắn và an toàn của hệ thống thanh toán PayOS Open Banking & Webhook Idempotency:
1. Sinh mã đơn hàng số (`orderCode`) chuẩn PayOS an toàn trên cả Java `Long` và JavaScript `Number.MAX_SAFE_INTEGER`.
2. Kiểm tra tính toàn vẹn và chữ ký điện tử HMAC-SHA256 của Webhook PayOS.
3. Chặn đứng các payload Webhook có chữ ký giả mạo hoặc sai lệch.
4. Xử lý Idempotency: Khi cổng thanh toán gửi lặp lại Webhook (Retry), hệ thống ghi log audit, xác nhận thành công mà **không cộng tiền ví hoặc gạch nợ lần thứ 2**.
5. Cung cấp cờ `isVerified = true`, `orderCode` số và `webhookReference` trong API tra cứu giao dịch phục vụ đối soát minh bạch.

---

## 📋 2. CÁC CA KIỂM THỬ (TEST CASES)

| ID | Mô tả ca kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Tạo thanh toán VietQR / PayOS | `amount = 100000`, `type = DEPOSIT_WALLET` | Sinh `orderCode` số nguyên dương hợp lệ $\le \text{MAX\_SAFE\_INTEGER}$ | ✅ PASS |
| **TC-02** | Webhook chữ ký giả mạo | Signature sai lệch không khớp với `checksumKey` | Từ chối với HTTP 400 Bad Request | ✅ PASS |
| **TC-03** | Webhook chữ ký HMAC-SHA256 hợp lệ | Payload và chữ ký tính toán khớp với `checksumKey` | Giao dịch `SUCCESS`, `isVerified = true`, lưu `webhookReference` | ✅ PASS |
| **TC-04** | Webhook gửi lặp lại lần 2 (Idempotency) | Gửi lại cùng Webhook payload đã thành công | Trả về HTTP 200, `isVerified = true`, số dư ví **không bị cộng đúp** | ✅ PASS |
| **TC-05** | Tra cứu trạng thái giao dịch | `GET /api/payment/status/{txnRef}` | Trả về đầy đủ `orderCode`, `isVerified = true`, `webhookReference` | ✅ PASS |

---

## 💻 3. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG
Chạy kịch bản kiểm thử:
```bash
node test_payos_idempotency.js
```
Kết quả kiểm thử thực tế: **6/6 PASS (100%)**
