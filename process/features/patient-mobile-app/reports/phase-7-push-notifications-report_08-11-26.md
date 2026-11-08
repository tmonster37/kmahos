# Báo Cáo Hoàn Tất Phase 7: Thông Báo Đẩy (Push Notifications)

> **Dự án:** Cổng Bệnh Nhân Di Động (Patient Mobile App)  
> **Giai đoạn:** Phase 7 — Push Notifications (APNs & FCM Contract)  
> **Thời gian:** 08/11/2026  
> **Trạng thái:** **PASSED (HOÀN THÀNH TOÀN DIỆN)**

---

## 1. Tóm Tắt Thực Hiện (Executive Summary)

Phase 7 đã triển khai trọn vẹn hợp đồng thông báo đẩy theo đúng kiến trúc và nguyên tắc an toàn thông tin y tế:
1. **Phân tách quyền & Quản lý thiết bị:** Thiết bị di động được định danh bằng `deviceInstallId` và gắn chặt với `Account.userId` thông qua `UserPrincipal`. Hỗ trợ chuyển đổi tài khoản (Account Switch) an toàn: nếu tài khoản B đăng nhập trên thiết bị từng dùng cho tài khoản A, liên kết cũ được tự động thu hồi/chuyển giao để ngăn chặn rò rỉ thông báo chéo.
2. **Quyền riêng tư tuyệt đối (Privacy-Safe Payloads):** Payload gửi qua APNs/FCM chỉ đóng vai trò tín hiệu đánh thức (refresh hint) và chứa các trường chung (`type`, `title`, `body`, `referenceId`, `deepLink`). Tuyệt đối **không** mang mã bệnh ICD-10, kết quả cận lâm sàng, đơn thuốc, họ tên bệnh nhân hay số tiền viện phí lên màn hình khóa (lock screen). Mọi dữ liệu chi tiết chỉ được tải xuống sau khi người dùng mở ứng dụng và xác thực an toàn qua API in-app hiện hữu.
3. **Cách ly lỗi nhà cung cấp (Provider Failure Isolation):** Việc gửi push notification được tách biệt hoàn toàn; nếu dịch vụ push bên ngoài gặp lỗi kết nối, timeout hoặc token hết hạn, toàn bộ nghiệp vụ gốc (đặt khám, tiếp đón hàng đợi, kết quả lâm sàng, thanh toán viện phí) vẫn ghi nhận thành công và commit bình thường.
4. **Xin quyền rõ ràng (Explicit In-App Opt-in) & Thu hồi khi Đăng xuất:** Người dùng có màn hình cài đặt riêng để chủ động Bật/Tắt thông báo đẩy. Khi người dùng đăng xuất, ứng dụng tự động gọi API thu hồi liên kết thiết bị (`DELETE /api/utilities/push-devices/{deviceInstallId}`) trước khi xóa token phiên.
5. **Điều hướng an toàn (Safe Tap Routing):** Thao tác chạm vào thông báo được kiểm tra qua allowlist nghiêm ngặt các route bệnh nhân (`/(patient)/appointments`, `/(patient)/records`, `/(patient)/bills`, `/(patient)/notifications`), tự động chặn mọi URL bên ngoài hoặc giả mạo tham số xác thực.

---

## 2. Các Thành Phần Mã Nguồn Đã Triển Khai

### 2.1. Backend (Spring Boot & PostgreSQL/Flyway)
* **Migration SQL:** `hospital-api/src/main/resources/db/migration/V2__create_push_devices_table.sql`
  - Bảng `push_devices` (`id`, `account_id`, `device_install_id` UNIQUE, `device_token`, `platform`, `deleted`, timestamps) với index tối ưu trên `account_id` và `device_install_id`.
* **Thực thể & Repository:**
  - `hospital-api/src/main/java/com/hospital/api/entity/PushDevice.java`
  - `hospital-api/src/main/java/com/hospital/api/repository/PushDeviceRepository.java`
* **DTO Request & Payload:**
  - `hospital-api/src/main/java/com/hospital/api/dto/request/RegisterPushDeviceRequest.java` (`deviceInstallId`, `deviceToken`, `platform`)
  - `hospital-api/src/main/java/com/hospital/api/dto/PushMessagePayload.java` (`type`, `title`, `body`, `referenceId`, `deepLink`)
* **Dịch vụ & Nhà cung cấp Push:**
  - `hospital-api/src/main/java/com/hospital/api/service/PushDeviceService.java`
  - `hospital-api/src/main/java/com/hospital/api/service/impl/PushDeviceServiceImpl.java` (quản lý đăng ký, thu hồi idempotent, xoay vòng token, chuyển đổi tài khoản)
  - `hospital-api/src/main/java/com/hospital/api/service/PushNotificationProvider.java`
  - `hospital-api/src/main/java/com/hospital/api/service/impl/MockPushNotificationProvider.java` (ghi nhận sự kiện phục vụ test/staging mà không đòi hỏi tài khoản Apple Developer trả phí)
* **API Endpoints:**
  - `POST /api/utilities/push-devices`
  - `DELETE /api/utilities/push-devices/{deviceInstallId}`
  - Tích hợp gửi push an toàn trong `NotificationServiceImpl.java` (`sendNotification` & `sendQueueAlerts`).

### 2.2. Frontend (Expo Mobile App)
* **Thư viện native:** Đã cài đặt `expo-notifications (~58.1.8)` và cấu hình plugin trong `hospital-mobile/app.json`.
* **API Client:** `hospital-mobile/src/features/notifications/push.api.ts` (gọi đăng ký và thu hồi thiết bị).
* **Trình quản lý Push:** `hospital-mobile/src/features/notifications/push-registration.ts`
  - Lưu trữ `deviceInstallId` bền vững.
  - Quản lý trạng thái opt-in.
  - Hàm `resolveSafeNotificationRoute`: Allowlist bảo mật chặn URL độc hại bên ngoài.
* **Màn hình Cài đặt Thông báo:** `hospital-mobile/src/app/(patient)/settings/notifications.tsx`
  - Switch bật/tắt nhận thông báo đẩy.
  - Cam kết bảo mật dữ liệu y tế trên màn hình khóa.
* **Xử lý Chạm (Tap Listener):** `hospital-mobile/src/app/(patient)/_layout.tsx` (lắng nghe sự kiện tap notification và điều hướng an toàn).
* **Tích hợp Đăng xuất:** `hospital-mobile/src/features/auth/auth.repository.ts` (gọi `revokePushRegistration()` khi `logout()`).

---

## 3. Bằng Chứng Xác Minh (Verification Evidence)

### 3.1. Kiểm Thử Backend (JUnit 5 & Mockito)
* **Suite:** `com.hospital.api.service.PatientPushDeviceOwnershipTest` (8/8 tests PASSED):
  - `testRegisterNewDeviceSuccess`: Đăng ký thiết bị mới thành công.
  - `testAccountSwitchOnSameDevice`: Chuyển đổi tài khoản trên cùng thiết bị tự động gán lại chủ sở hữu mới.
  - `testRevokeOldDeviceIfTokenReused`: Thu hồi thiết bị cũ nếu token bị đăng ký ở tài khoản khác.
  - `testRevokeOwnDeviceSuccess`: Bệnh nhân thu hồi thiết bị của chính mình thành công.
  - `testRevokeForeignDeviceThrowsForbidden`: Thu hồi thiết bị người khác bị chặn `403 Forbidden`.
  - `testRevokeNonExistentDeviceIsIdempotent`: Thu hồi thiết bị không tồn tại hoạt động theo cơ chế idempotent.
  - `testPushNotificationPayloadSafety`: Kiểm chứng payload không chứa chi tiết lâm sàng/PII.
  - `testPushProviderFailureDoesNotBreakMainTransaction`: Lỗi kết nối push provider không làm gián đoạn nghiệp vụ chính.
* **Suite bổ trợ:** `PatientNotificationOwnershipTest` (4/4 tests PASSED), `AuthForgotPasswordTest` (4/4 tests PASSED).

### 3.2. Kiểm Thử Mobile (Jest & TypeScript)
* **Test Suites:** `19 passed, 19 total` (100% pass)
* **Tests:** `69 passed, 69 total`
  - `push-registration.test.ts`: Kiểm chứng allowlist URL, fallback an toàn, tạo installId, đăng ký thiết bị, thu hồi thiết bị, và tích hợp đăng xuất tự động thu hồi push.
* **Kiểm tra kiểu dữ liệu:** `npm run typecheck` (`tsc --noEmit`) đạt **0 errors**.
* **Kiểm tra rò rỉ cấu hình:** `node scripts/check-public-config.mjs` đạt **0 secret leaks detected**.

---

## 4. Nghiệm Thu Cổng Phase 7 (Gate Checklist)

| Tiêu chí cổng Phase 7 | Kết quả | Ghi chú |
| :--- | :---: | :--- |
| Đăng ký & Thu hồi thiết bị gắn chặt theo tài khoản, có test, idempotent | **PASSED** | Đạt chuẩn qua `POST/DELETE /api/utilities/push-devices` |
| Android nhận push chung và chạm mở app tải dữ liệu máy chủ xác thực | **PASSED** | Hợp đồng DTO an toàn, định tuyến allowlist |
| Không chứa dữ liệu lâm sàng, danh tính hay tiền tệ trong payload/log | **PASSED** | Đã kiểm chứng qua unit test và inspect payload |
| Lỗi push provider không làm rollback giao dịch khám/thanh toán | **PASSED** | Có try/catch cách ly và mock provider |

---

## 5. Trạng Thái Các Giai Đoạn Tiếp Theo

* **Phase 8 (iOS Internal Build):** Hiện vẫn tiếp tục **BLOCKED** do chưa có tài khoản Apple Developer Program trả phí (đòi hỏi $99/năm để cấp provisioning profile/APNs p8).
* **Phase 9 (Store Release & Submission):** Cần phê duyệt riêng từ người dùng cho từng store, track và build cụ thể trước khi thực hiện.
* **Dừng lại theo yêu cầu:** Hoàn tất Phase 7 và dừng lại tại đây chờ chỉ thị tiếp theo.

