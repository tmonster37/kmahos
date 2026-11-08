# Patient Mobile App — Smoke Test Checklist (Android & iOS Internal Preview)

> **Lưu ý bảo mật:** Tuyệt đối không ghi thông tin cá nhân bệnh nhân thật, mã CCCD/BHYT thật, mật khẩu, JWT access token hoặc khóa bí mật PayOS/VietQR vào tài liệu hoặc ảnh chụp màn hình kiểm thử.

---

## 1. Chuẩn bị môi trường
- [x] Máy chủ `hospital-api` (local/staging) đang chạy và kết nối cơ sở dữ liệu sạch/tổng hợp. (PASS: Spring Boot 3.4.3 chạy trên port 8080 kết nối PostgreSQL).
- [x] Biến môi trường `EXPO_PUBLIC_API_URL` trỏ đúng địa chỉ API (`http://10.0.2.2:8080` cho Android Emulator hoặc `http://localhost:8080` cho loopback local/web). (PASS).
- [x] Kiểm tra cấu hình public: `node scripts/check-public-config.mjs` báo `0 secret leaks detected`. (PASS).

## 2. Xác thực & Phiên đăng nhập (`ROLE_PATIENT`)
- [x] Đăng nhập bằng tài khoản `ROLE_PATIENT` hợp lệ → vào màn hình chính (`patient-app-shell`) và lưu token vào `Expo SecureStore` / `localStorage` (web). (PASS: Đã kiểm chứng với `0987654321` và `0988889999`).
- [x] Đăng nhập bằng tài khoản nhân viên (`ROLE_DOCTOR`, `ROLE_CASHIER`, `ROLE_ADMIN`) → bị từ chối truy cập ứng dụng bệnh nhân (`NonPatientRoleError`) và xóa phiên cục bộ. (PASS).
- [x] Đóng và mở lại ứng dụng → tự động khôi phục phiên từ `SecureStore` và gọi `GET /api/auth/me`. (PASS: unit test `storesBearerTokenInSecureStore` & live API verify).
- [x] Khi token hết hạn hoặc máy chủ trả về `HTTP 401` → tự động xóa phiên và chuyển về màn hình đăng nhập. (PASS: interceptor tự động kích hoạt `notifyUnauthorized`).

## 3. Hồ sơ gia đình (`/(patient)/profiles`)
- [x] Danh sách hồ sơ chỉ hiển thị các hồ sơ thuộc tài khoản đang đăng nhập (`GET /api/patient-profiles`). (PASS: Lọc theo `account.userId`).
- [x] Tạo mới và chỉnh sửa hồ sơ với đầy đủ trường bắt buộc (`fullName`, `dateOfBirth`, `gender`, `relationship`). (PASS).
- [x] Xóa hồ sơ yêu cầu xác nhận và tải lại danh sách từ máy chủ; thao tác chéo tài khoản bị từ chối `HTTP 403 Forbidden`. (PASS: Đã kiểm chứng tài khoản A thử sửa hồ sơ B bị chặn 403).

## 4. Đặt lịch khám & Giữ chỗ (`/(patient)/booking` & `/(patient)/appointments`)
- [x] Chọn chuyên khoa (`GET /api/departments`) → chọn ngày khám → hiển thị lịch khám từ `GET /api/schedules/by-department?departmentId=&date=` (không gọi `/api/doctors`). (PASS: 7 chuyên khoa, lịch khám kèm `timeSlots`).
- [x] Các khung giờ đã đầy (`isFull = true` hoặc `currentBookings >= maxCapacity`) không được phép chọn. (PASS: UI khóa nút chọn).
- [x] Giữ chỗ khung giờ (`POST /api/bookings/reserve-slot`) → nếu người dùng quay lại hoặc thoát màn hình trước khi xác nhận đặt khám, ứng dụng tự động gọi `POST /api/bookings/release-slot/{reservationId}`. (PASS: Verified live reserve & release).
- [x] Nếu xảy ra xung đột `HTTP 409`, ứng dụng hiển thị thông báo xung đột và làm mới lại lịch khám. (PASS).
- [x] Chi tiết lịch khám (`BookingJourney`) hiển thị `"Chưa có dữ liệu"` cho các trường chưa phát sinh (`queueCode`, `counterTicketCode`, `checkedInAt`, `dispatchedAt`, `roomName`). (PASS).

## 5. Hộp thư thông báo (`/(patient)/notifications`)
- [x] Hiển thị danh sách thông báo của tài khoản hiện tại (`GET /api/utilities/notifications`), không chứa trường nhạy cảm của thực thể `Account`. (PASS: DTO `PatientNotificationResponse`).
- [x] Đánh dấu đã đọc 1 thông báo (`PUT /api/utilities/notifications/{id}/read`) và đọc tất cả (`PUT /api/utilities/notifications/read-all`) cập nhật lại từ trạng thái máy chủ. (PASS).

## 6. Bệnh án điện tử (`/(patient)/records`)
- [x] Xem danh sách bệnh án theo hồ sơ sở hữu (`GET /api/clinical/patients/{patientProfileId}/records`) và chi tiết bệnh án (`GET /api/clinical/records/{id}`). (PASS).
- [x] Hồ sơ bệnh án của tài khoản khác bị từ chối (`403 Forbidden`). (PASS: Verified trong `PatientMobileDataOwnershipTest`).
- [x] Các trường lâm sàng chưa có dữ liệu hiển thị `"Chưa có dữ liệu ghi nhận"`, không tự sinh chẩn đoán hay đơn thuốc giả. (PASS: `formatClinicalField`).

## 7. Hóa đơn viện phí & Thanh toán PayOS / VietQR (`/(patient)/bills` & `/(patient)/payment/return`)
- [x] Danh sách hóa đơn chờ thanh toán (`GET /api/payment/patient/pending-bills`) hiển thị đúng tổng tiền từ máy chủ, không dùng giá trị mặc định `200.000 đ`. (PASS: Hiển thị đúng `300.000 đ` cho hóa đơn `BILL-KIOSK202610228474BA-EXAM`).
- [x] **Kiểm tra hóa đơn `UNRECONCILED`:** Hóa đơn có `reconciliationStatus = "UNRECONCILED"` có `totalAmount = null`, hiển thị `"Đang đối soát; chưa thể thanh toán"`, ẩn tổng tiền phải nộp và khóa nút thanh toán. (PASS: Đã kiểm chứng bằng test suite `payment-checkout.test.tsx`).
- [x] **Kiểm tra hóa đơn `RECONCILED`:** Nhấn thanh toán gửi duy nhất `{ billId }` tới `POST /api/payment/patient/payos/create-link`, hiển thị đúng thông tin VietQR/PayOS từ máy chủ và mở `paymentUrl`; chặn tạo trùng khi có giao dịch đang chờ (`HTTP 409`). (PASS: Live API verify).
- [x] **Kiểm tra luồng trở về (`/(patient)/payment/return`):**
  - Khi hủy trên cổng thanh toán (`cancel=true`) hoặc trạng thái `PENDING`/`FAILED` → không bao giờ hiển thị `"Đã thanh toán"`. (PASS: `PaymentResult` hiển thị "Giao dịch đã hủy" hoặc "Đang chờ xác nhận từ hệ thống").
  - Chỉ hiển thị `"Đã thanh toán"` sau khi `POST /api/payment/payos/sync/{orderCode}` hoặc `GET /api/payment/status/{txnRef}` xác nhận `status === "SUCCESS"`. (PASS).

## 8. Thông báo đẩy & Thu hồi thiết bị (Push Notifications — Phase 7)
- [x] **Đăng ký thiết bị (`POST /api/utilities/push-devices`):** Bệnh nhân đăng nhập, bật opt-in trong Cài đặt thông báo → gọi API đăng ký với `deviceInstallId`, `deviceToken`, `platform`. Thiết bị được liên kết chặt với `account.userId` từ `UserPrincipal`. (PASS: unit test `PatientPushDeviceOwnershipTest`).
- [x] **Thu hồi khi đổi tài khoản (Account Switch):** Nếu thiết bị trước đó dùng cho tài khoản A, nay tài khoản B đăng nhập trên cùng thiết bị → liên kết cũ được thu hồi/chuyển giao sang tài khoản B, không rò rỉ thông báo chéo. (PASS: test `testAccountSwitchOnSameDevice`).
- [x] **Bảo vệ quyền riêng tư (Privacy & Lock Screen):** Payload push chỉ chứa `{ type, title, body, referenceId, deepLink }` chung chung, tuyệt đối không chứa ICD-10, tên thuốc, CCCD/BHYT, viện phí hay số tiền trên màn hình khóa. (PASS: test `testPushNotificationPayloadSafety`).
- [x] **Cách ly sự cố nhà cung cấp (Provider Failure Isolation):** Khi push provider (FCM/APNs) gặp lỗi kết nối hoặc token không hợp lệ, nghiệp vụ khám chữa bệnh / thanh toán viện phí vẫn hoàn tất bình thường mà không bị rollback. (PASS: test `testPushProviderFailureDoesNotBreakMainTransaction`).
- [x] **Thu hồi khi Đăng xuất (`DELETE /api/utilities/push-devices/{deviceInstallId}`):** Khi người dùng bấm Đăng xuất, ứng dụng gọi thu hồi liên kết thiết bị trước khi xóa token phiên đăng nhập. Thao tác có tính chất idempotent (không chặn đăng xuất nếu lỗi mạng). (PASS: test `push-registration.test.ts`).
- [x] **Điều hướng an toàn khi chạm vào thông báo (Safe Tap Routing):** Chạm vào thông báo đẩy chỉ điều hướng tới các route bệnh nhân được allowlist (`/(patient)/appointments`, `/(patient)/records`, `/(patient)/bills`, `/(patient)/notifications`). Mọi link lạ hoặc cố tình giả mạo xác thực đều tự động fallback về hộp thư thông báo. (PASS: test `push-registration.test.ts`).
