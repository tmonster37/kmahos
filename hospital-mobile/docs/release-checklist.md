# Patient Mobile App — Internal Release Checklist

**Ngày cập nhật:** 08/11/2026  
**Trạng thái tổng thể Phase 5:** **AUTOMATED GATES PASS (100%) / STAGING SMOKE VERIFIED / APK RESYNC PENDING FRESH BUILD / iOS BLOCKED**  
**Phiên bản ứng dụng:** `1.0.0` (Remote version code `1`, EAS Project ID `8adc2793-e303-4277-ab8c-530a3581b46d`)  
**Định danh gói ứng dụng:** `com.hospital.patientmobile`  
**URL Scheme:** `hospitalmobile://`  

---

## 1. Kiểm tra cấu hình & An toàn bảo mật trước đóng gói

| Hạng mục kiểm tra | Lệnh / Công cụ | Kết quả |
|---|---|---|
| Kiểm tra rò rỉ biến nhạy cảm trong `app.json`, `eas.json`, `.env.example` | `node scripts/check-public-config.mjs` & `node --test scripts/__tests__/check-public-config.test.mjs` | **PASS** (`2/2 tests passed`, `0 secret leaks detected`) |
| Kiểm tra kiểu tĩnh TypeScript toàn bộ ứng dụng | `npm run typecheck` (`tsc --noEmit`) | **PASS** (`0 errors`) |
| Bộ kiểm thử tự động Frontend (Auth, Profiles, Booking, Notifications, Records, Billing, Release Config) | `npm test -- --runInBand` | **PASS** (`15/15 suites`, `44/44 tests`) |
| Bộ kiểm thử Backend Ownership & Canonical Billing (`Phase 0 + Phase 3`) | `.\mvnw.cmd "-Dtest=PatientMobileDataOwnershipTest,PatientNotificationOwnershipTest,PatientPendingBillTest,PatientPaymentAuthorizationTest,PaymentBookingVerificationTest" test` | **PASS** (`69/69 tests`, `12.156 s`) |

---

## 2. Thông tin Build & Môi trường Kiểm thử Thực tế

| Hạng mục | Android Internal Preview | iOS Internal Preview |
|---|---|---|
| **EAS Profile** | `preview` (`distribution: "internal"`, `android.buildType: "apk"`) | `preview` (`distribution: "internal"`) |
| **Trạng thái Build** | **PASS (`finished`)** | **BLOCKED (Chưa có tài khoản Apple Developer trả phí)** |
| **EAS Build ID** | `7f78338d-fa31-417b-8224-3efb99f8c5e7` | `N/A (Blocked on Apple Developer Program)` |
| **Link trang Build / APK** | - Build page: `https://expo.dev/accounts/tmst37/projects/hospital-mobile/builds/7f78338d-fa31-417b-8224-3efb99f8c5e7`<br>- APK: `https://expo.dev/artifacts/eas/cQ6duunB5QLi0OBNjXEClv-DWiS6JYykl0qPtAjndoI.apk` | `N/A` |
| **Phiên bản OS đã kiểm tra** | Android 17 (API 37) trên `emulator-5554` (`sdk_gphone64_x86_64`) | `N/A (Máy trạm Windows không có Xcode/iOS Simulator; không có Apple Developer trả phí)` |
| **Môi trường API (`EXPO_PUBLIC_API_URL`)** | Non-production staging / local dev (`http://10.0.2.2:8080` & `http://localhost:8080`) | Non-production staging / local dev (`http://10.0.2.2:8080`) |
| **Kết quả kiểm tra thực tế** | - Cài đặt APK thành công (`adb install -r` → `Success`)<br>- Khởi chạy app hiển thị `login-screen` (`Cổng Bệnh Nhân`)<br>- Kiểm tra deep link `hospitalmobile://payment/return` → `Status: ok` (`com.hospital.patientmobile/.MainActivity`)<br>- Toàn bộ 6 module bệnh nhân đã được kiểm chứng hành vi staging end-to-end qua live API và bộ test.<br>- *Lưu ý:* Bản APK `7f78338d` trước đó chưa chứa bản vá unwrap `client.ts`; cần đóng gói lại một bản build EAS Preview từ commit hiện tại khi phân phối APK độc lập. | Ghi nhận chính xác phụ thuộc bên ngoài (cần tài khoản Apple Developer Program trả phí để cấp phát Ad Hoc UDID). |

---

## 3. Các trường hợp Đã kiểm chứng & Tiến độ thực thi

- **Đã kiểm chứng bằng bộ test tự động (Jest + JUnit — PASS 100%):**
  - Luồng đăng nhập `ROLE_PATIENT`, lưu token `Expo SecureStore`, từ chối role nhân viên, tự động xóa phiên khi `401`.
  - Quản lý hồ sơ gia đình, tìm lịch khám theo khoa (`GET /api/schedules/by-department`), giữ chỗ và tự động giải phóng slot khi thoát màn hình, xử lý xung đột `409`.
  - Hộp thư thông báo trong ứng dụng, lọc bỏ trường nhạy cảm của `Account`.
  - Lịch sử bệnh án điện tử, chặn truy cập chéo tài khoản (`403`), hiển thị `"Chưa có dữ liệu ghi nhận"` khi thiếu dữ liệu.
  - Hóa đơn viện phí chuẩn hóa (`GET /api/payment/patient/pending-bills`), ẩn số tiền và khóa thanh toán với hóa đơn `UNRECONCILED`, tạo link PayOS chỉ với `{ billId }`, và chỉ hiển thị `"Đã thanh toán"` khi backend trả về `SUCCESS`.
- **Đã kiểm chứng qua Staging Walkthrough & Smoke Checklist:**
  - Toàn bộ danh mục 7 mục trong `hospital-mobile/scripts/smoke-test-checklist.md` đã được xác minh trên môi trường API tổng hợp.
  - Đã xác thực giao dịch chờ, chặn tạo trùng PayOS link (`409 Conflict`), và chặn truy cập chéo giao dịch thanh toán (`403 Forbidden`).
- **Phần việc tiếp theo (Phase 6–9):**
  - Phase 6: Tài khoản & phục hồi mật khẩu (chờ backend `POST /api/auth/forgot-password`).
  - Phase 7: Push notifications (FCM/APNs).
  - Phase 8: iOS internal build (cần tài khoản Apple Developer trả phí).
  - Phase 9: Chuẩn bị và phát hành cửa hàng (yêu cầu phê duyệt riêng từng store).
