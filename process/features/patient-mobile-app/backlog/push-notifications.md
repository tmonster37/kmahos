# Backlog: Push Notifications (APNs & FCM) cho Ứng Dụng Bệnh Nhân

**Trạng thái:** Deferred (Ngoài phạm vi MVP — Chỉ triển khai sau khi hoàn tất MVP)
**Ngày ghi nhận:** 07/11/2026

---

## 1. Mục tiêu
Bổ sung thông báo đẩy (Push Notifications) qua Apple Push Notification service (APNs) và Firebase Cloud Messaging (FCM) để gửi thông báo thời gian thực tới thiết bị bệnh nhân khi:
1. Lịch đặt khám được xác nhận hoặc nhắc lịch khám trước 24 giờ.
2. Bệnh nhân được điều phối vào buồng khám hoặc được bác sĩ gọi số (`call-patient`).
3. Kết quả xét nghiệm cận lâm sàng hoặc đơn thuốc đã hoàn tất.
4. Giao dịch thanh toán viện phí PayOS/VietQR được xác nhận thành công.

---

## 2. Yêu cầu Hợp đồng API Backend (Dự kiến cho giai đoạn sau MVP)
1. **Đăng ký thiết bị nhận thông báo:**
   - `POST /api/utilities/push-devices`
   - Request: `{ deviceToken: string, platform: 'ANDROID' | 'IOS', deviceInstallId: string }`
   - Ràng buộc bảo mật: Gắn chặt với `accountId` từ `@AuthenticationPrincipal UserPrincipal`; nếu `deviceToken` chuyển sang tài khoản khác trên cùng thiết bị, phải thu hồi liên kết cũ để tránh lộ thông báo chéo tài khoản.
2. **Hủy đăng ký thiết bị khi đăng xuất hoặc thu hồi quyền:**
   - `DELETE /api/utilities/push-devices/{deviceInstallId}`
   - Bắt buộc gọi trước hoặc ngay khi người dùng nhấn Đăng xuất trên ứng dụng di động.

---

## 3. Quyền riêng tư, Bảo mật & Trải nghiệm người dùng (Privacy & UX)
- **Không chứa dữ liệu lâm sàng nhạy cảm trong payload Push:** Nội dung hiển thị trên màn hình khóa (lock screen) chỉ được mang thông tin chung (ví dụ: *"Bạn có cập nhật mới về lịch khám hoặc kết quả khám bệnh. Chạm để xem trong ứng dụng."*). Tuyệt đối không đưa chẩn đoán ICD-10, kết quả xét nghiệm hay tên thuốc vào payload gửi qua APNs/FCM.
- **Xin quyền rõ ràng (Opt-in Consent):** Chỉ hiển thị hộp thoại xin quyền thông báo của hệ điều hành sau khi người dùng đã đăng nhập thành công và đồng ý bật thông báo trong phần Cài đặt ứng dụng.
- **Quản lý khóa bí mật:** Chứng chỉ `.p8` của APNs và Service Account JSON của FCM chỉ được lưu trữ trên máy chủ Backend / EAS Secrets, tuyệt đối không nhúng vào mã nguồn `hospital-mobile/`.

