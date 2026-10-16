# 🧪 TESTING PLAN: MODULE 7 - QUẦY THU NGÂN & THANH TOÁN VNPAY
**Mã phân hệ:** MOD-07 | **Trạng thái:** ✅ ĐÃ KIỂM THỬ THÀNH CÔNG

---

## 🎯 1. MỤC TIÊU KIỂM THỬ
Xác minh tính chính xác của các chức năng:
1. Tạo giao dịch và URL thanh toán VNPay-QR Sandbox (`/api/payment/vnpay/create`).
2. Sinh mã checksum HMAC-SHA512 chuẩn xác theo chuẩn tài liệu VNPay.
3. Xử lý IPN Webhook callback từ VNPay: Cập nhật trạng thái `Transaction` và `Booking`.
4. Nạp tiền trực tiếp vào Ví số dư viện phí của Bệnh nhân.
5. Quầy thu ngân viện phí (`/cashier`): Tiếp nhận thanh toán tiền mặt / quét mã QR tại quầy.
6. Xuất biên lai viện phí điện tử và cập nhật doanh thu toàn viện.

---

## 📋 2. CÁC CA KIỂM THỬ (TEST CASES)

| ID | Mô tả ca kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Tạo URL thanh toán VNPay | `amount`, `orderInfo`, `bookingId` | Trả về URL hợp lệ chứa checksum SHA512 | ✅ PASS |
| **TC-02** | IPN Webhook thành công | Tham số phản hồi từ VNPay mã `00` | Giao dịch `SUCCESS`, Booking `PAID` | ✅ PASS |
| **TC-03** | Thanh toán trừ tiền qua Ví | Bệnh nhân có số dư >= viện phí | Trừ số dư ví, tạo Transaction `SUCCESS` | ✅ PASS |
| **TC-04** | Chặn thanh toán ví khi thiếu tiền | Số dư ví < viện phí | Báo lỗi không đủ số dư ví | ✅ PASS |
| **TC-05** | Quầy Thu ngân thanh toán tiền mặt | `bookingId`, phương thức `CASH` | Cập nhật `PAID`, sinh mã phiếu thu | ✅ PASS (Sandbox) |
| **TC-06** | Lấy danh sách chờ thu từ DB thật | `GET /api/cashier/pending-bills` | Trả về các ca khám với chi tiết tiền khám, CLS, thuốc thật | ✅ PASS |
| **TC-07** | Thu tiền tại quầy ghi nhận giao dịch | `POST /api/cashier/pay` (CASH/POS) | Tạo Transaction SUCCESS, trả về biên lai thật | ✅ PASS |
| **TC-08** | Làm mới trang không mất kết quả | `GET /api/cashier/history` | Giao dịch vừa thu vẫn nằm trong lịch sử | ✅ PASS |
| **TC-09** | Chống thu trùng (Atomic / Idempotency) | Gọi lại `POST /api/cashier/pay` cùng bill | Trả về 409 Conflict, không tạo giao dịch kép | ✅ PASS |
| **TC-10** | Phân quyền bảo mật RBAC | Token role PATIENT/NURSE gọi cashier API | Chặn 403 Forbidden | ✅ PASS |

---

## 💻 3. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG
1. Kiểm thử cổng thanh toán trực tuyến:
```bash
node test_vnpay_payment.js
```
2. Kiểm thử luồng Quầy thu ngân viện phí (5 tiêu chí):
```bash
node test_cashier_workflow.js
```
