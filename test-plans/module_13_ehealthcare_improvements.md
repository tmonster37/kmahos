# BÁO CÁO KIỂM THỬ THỰC TẾ (TEST REPORT) - TASK-13
# CẢI TIẾN AN TOÀN ĐƠN THUỐC (CDS) & CHUẨN HÓA VNPAY IPN TỪ E-HEALTHCARE

> **Mã công việc:** TASK-13  
> **Thời gian kiểm thử:** 13/10/2026 23:39:25 GMT+7  
> **Người kiểm thử:** Senior Fullstack & Medical Security Engineer  
> **Script kiểm thử tự động:** `test_ehealthcare_improvements.js`  
> **Môi trường:** Spring Boot 3 daemon + PostgreSQL 18 + Node.js test runner  
> **Kết quả thực tế:** **13/13 PASS (100% THÀNH CÔNG, ZERO REGRESSION)**

---

## 1. MỤC TIÊU VÀ PHẠM VI KIỂM THỬ
Xác minh thực tế các cải tiến kỹ thuật học hỏi từ repository tham khảo [E-healthcare](https://github.com/lecuong2512/E-healthcare.git):
1. **Chuẩn hóa phản hồi VNPay IPN (Server-to-Server):**
   - Trả về mã JSON đúng chuẩn đặc tả kỹ thuật VNPay (`RspCode` và `Message`).
   - Xác thực chữ ký số HMAC-SHA512.
   - Đối soát số tiền giao dịch chính xác.
   - Idempotency chống callback phát lại (Replay callback) mà không cộng tiền trùng lặp.
2. **Clinical Decision Support (CDS) - Backend Drug Allergy Safety Check:**
   - Endpoint `POST /api/clinical/records/{recordId}/prescription/check-safety` kiểm tra chéo đơn thuốc với tiền sử dị ứng theo nhóm hoạt chất (`ALLERGY_GROUP_TARGETS`).
   - Phát hiện nguy cơ dị ứng Penicillin khi kê Amoxicillin và trả về mức độ cảnh báo `CRITICAL`.
   - Xác nhận an toàn đối với các thuốc không trùng dị ứng (Berberin, v.v.).
   - Backend từ chối với HTTP 400 Bad Request nếu bác sĩ cố tình kê thuốc dị ứng mà không có xác nhận ghi đè lâm sàng (`overrideAllergyWarning`).
   - Cho phép xuất đơn thuốc thành công khi bác sĩ đã đánh giá và xác nhận ghi đè lâm sàng (`overrideAllergyWarning=true`).

---

## 2. KẾT QUẢ THỰC TẾ (REAL EXECUTION LOGS)

```text
==========================================================================
🏥 BẮT ĐẦU KIỂM THỬ TÍNH NĂNG CẢI TIẾN TỪ E-HEALTHCARE (TASK-13)
   1. Chuẩn hóa phản hồi VNPay IPN & Idempotency
   2. Clinical Decision Support (CDS) - Backend Drug Allergy Safety Check
==========================================================================

✅ [PASS] 0.1. Đăng nhập tài khoản Bác sĩ / Admin (0937050537)
   -> Thuốc Amoxicillin ID: 2, Berberin ID: 4
✅ [PASS] 0.2. Lấy danh mục thuốc (Tìm Amoxicillin & Berberin)
   -> Khởi tạo thành công hồ sơ khám bệnh ID: 9ef65bc7-8d05-4352-adca-9638022d9b68
✅ [PASS] 0.3. Khởi tạo ca khám bệnh có tiền sử dị ứng Penicillin
✅ [PASS] 1.1. VNPay IPN từ chối chữ ký không hợp lệ (RspCode: 97)
✅ [PASS] 1.2. VNPay IPN báo đơn hàng không tồn tại (RspCode: 01)
   -> Đã tạo giao dịch VNPay kiểm thử: VNP909565583
✅ [PASS] 1.3. Chuẩn bị giao dịch nạp tiền kiểm thử VNPay IPN
✅ [PASS] 1.4. VNPay IPN từ chối khi số tiền không khớp (RspCode: 04)
✅ [PASS] 1.5. VNPay IPN xác nhận đơn hàng thành công (RspCode: 00)
✅ [PASS] 1.6. VNPay IPN Idempotency: từ chối xử lý lặp khi đã SUCCESS (RspCode: 02)
   -> Cảnh báo nhận được: CẢNH BÁO NGUY HIỂM: Bệnh nhân có tiền sử dị ứng nhóm [PENICILLIN] (dị ứng penicillin), trùng khớp với thuốc/hoạt chất [Amoxicillin 500mg]! Nguy cơ sốc phản vệ hoặc co thắt phế quản cấp tính.
✅ [PASS] 2.1. CDS Check Safety phát hiện dị ứng Penicillin khi kê Amoxicillin
✅ [PASS] 2.2. CDS Check Safety xác nhận an toàn khi không trùng dị ứng (Berberin)
   -> Backend chặn thành công với HTTP 400: "CẢNH BÁO AN TOÀN DƯỢC LÝ: CẢNH BÁO NGUY HIỂM: Bệnh nhân có tiền sử dị ứng nhóm [PENICILLIN] (bệnh nhân có tiền sử dị ứng penicillin và amoxicillin (sốc phản vệ)), trùng khớp với thuốc/hoạt chất [Amoxicillin 500mg]! Nguy cơ sốc phản vệ hoặc co thắt phế quản cấp tính. Vui lòng đổi thuốc an toàn hoặc xác nhận ghi đè lâm sàng (overrideAllergyWarning) nếu có chỉ định đặc biệt từ Bác sĩ."
✅ [PASS] 2.3. Backend từ chối kê đơn dị ứng nếu không có overrideAllergyWarning (HTTP 400)
   -> Đã tạo toa thuốc thành công với ghi đè lâm sàng: Mã toa [RX-1356362F], tổng tiền: 35000đ
✅ [PASS] 2.4. Bác sĩ xác nhận ghi đè lâm sàng (overrideAllergyWarning=true) kê đơn thành công

==========================================================================
🎉 TỔNG KẾT KIỂM THỬ: 13 PASS, 0 FAIL / TỔNG SỐ 13 TEST
==========================================================================
```

---

## 3. KẾT QUẢ HỒI QUY TOÀN BỘ CÁC MODULE KHÁC
- `test_security_hardening.js`: **16/16 PASS** (Bảo vệ hồ sơ bệnh nhân, che giấu CCCD/BHYT, chống IDOR, từ chối số tiền âm/0, chống race condition).
- `test_cashier_workflow.js`: **8/8 PASS** (Lấy danh sách chờ thu thật từ DB, snapshot biên lai, Idempotency thu tiền 409, RBAC thu ngân).
- `test_payos_idempotency.js`: **6/6 PASS** (Tạo VietQR, HMAC-SHA256 signature, Idempotency webhook, đối soát orderCode).
- **Tổng cộng: 43/43 TEST PASS 100%.**
