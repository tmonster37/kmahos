# Kế hoạch Triển khai: Tăng cường Bảo mật, Toàn vẹn Dữ liệu Lâm sàng & Kiểm thử Hệ thống

**Mode:** EXECUTE  
**Date:** 29-10-2026  
**Status:** COMPLETED — Đã hoàn thành toàn bộ 9/9 hạng mục và kiểm thử 28/28 tests thành công  
**Tài liệu tham chiếu:** `AGENTS.md`, `BC_34_V3.docx`, `SecurityConfig.java`, `GoogleTokenVerifierService.java`, `InpatientPage.jsx`

---

## 1. Mục tiêu Tổng quan

Triển khai đồng bộ 9 hạng mục cải tiến an ninh mạng, bảo vệ tính toàn vẹn dữ liệu lâm sàng y tế và hoàn thiện kiểm thử tự động trên cả Backend (`hospital-api`), Frontend (`hospital-ui`), Database (PostgreSQL) và quản trị kho lưu trữ Git:

1. **Chặn đăng nhập Google bằng token giả:** Loại bỏ rủi ro bypass xác thực bằng token mock trên Production; chỉ cho phép mock trong môi trường `dev`/`test` với cấu hình bật rõ ràng và whitelist cố định; xác thực đầy đủ 5 claims bắt buộc của Google ID token thật.
2. **Loại bỏ dữ liệu giả khỏi trang Nội trú:** Loại bỏ hoàn toàn việc dựng hồ sơ bệnh nhân giả và suy đoán sinh hiệu/dị ứng theo số giường; hiển thị trung thực trạng thái "Chưa có dữ liệu" và "Chưa có bệnh nhân".
3. **Bắt buộc quyền ADMIN cho API quản lý bác sĩ:** Cấu hình chuẩn thứ tự Matcher trong Spring Security và `@PreAuthorize("hasRole('ADMIN')")`; bảo đảm từ chối người chưa đăng nhập (401), cấm tài khoản PATIENT/DOCTOR (403) và cho phép ADMIN (200).
4. **Ngăn file credential Google bị đưa vào Git:** Bổ sung quy tắc trong `.gitignore`; xác nhận file không bị Git theo dõi và không làm lộ nội dung secret.
5. **Cưỡng chế JWT Secret an toàn cho Production:** Ngăn chặn tuyệt đối việc sử dụng secret mặc định/fallback trong profile production; dừng khởi động ngay nếu secret rỗng hoặc < 256 bits; không in secret ra log.
6. **Xử lý trung thực kết quả gửi OTP qua SMTP:** Ném lỗi rõ ràng khi SMTP chưa cấu hình hoặc gửi email thất bại; vô hiệu hóa OTP nếu gửi không thành công; không trả OTP trong response và không ghi vào log.
7. **Lưu trữ OTP bền vững trong PostgreSQL:** Xây dựng bảng `otp_tokens` và JPA Entity/Repository; băm mã OTP bằng SHA-256; thực thi nguyên tắc Single-Use (dùng một lần) và kiểm soát thời hạn.
8. **Giới hạn tần suất (Rate Limiting) & Chống dò OTP:** Giới hạn gửi lại theo địa chỉ đích và Client IP; khóa tạm thời 15 phút khi nhập sai 5 lần; chống race condition gọi đồng thời; thông báo phản hồi trung tính (generic).
9. **Kế hoạch chuyển đổi JWT sang HttpOnly Cookie:** Triển khai phương án tương thích ngược Hybrid (hỗ trợ cả Cookie và Header Bearer); cấu hình CORS Credentials và CSRF; giảm thiểu nguy cơ đánh cắp token qua XSS.

---

## 2. Chi tiết Kế hoạch Triển khai Từng Giai đoạn

### Giai đoạn 1: Git & Cấu hình An toàn Khởi động (Mục 4 & Mục 5)
1. **Mục 4 - Cập nhật `.gitignore`:**
   - Thêm các mẫu nhận diện credential OAuth/Service Account:
     ```gitignore
     client_secret_*.json
     client_secret.json
     *client_secret*.json
     service-account*.json
     credentials*.json
     ```
   - Chạy `git status` kiểm tra file `client_secret_*.json` đã được ignore hoàn toàn.
2. **Mục 5 - Cưỡng chế JWT Secret cho Production:**
   - Cập nhật [`application.yml`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/resources/application.yml): Phân tách rõ cấu hình dev (có fallback) và profile `prod` (không có fallback: `jwt.secret: ${JWT_SECRET}`).
   - Cập nhật [`ProductionSecurityValidator.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/config/ProductionSecurityValidator.java):
     - Mở rộng nhận diện Production qua active profiles hoặc environment flag.
     - Dừng khởi động nếu thiếu `JWT_SECRET`, nếu trùng mẫu dev hoặc độ dài < 32 ký tự.
     - Tuyệt đối không log chuỗi secret.
   - Thêm Unit Test: [`ProductionSecurityValidatorTest.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/test/java/com/hospital/api/config/ProductionSecurityValidatorTest.java).

---

### Giai đoạn 2: Phân quyền API Quản lý Bác sĩ (Mục 3)
1. **Điều chỉnh `SecurityConfig.java`:**
   - Di chuyển `.requestMatchers("/api/admin/doctors/**").hasRole("ADMIN")` lên trước các matcher chung.
   - Loại bỏ `"/api/admin/doctors/**"` khỏi dòng `.requestMatchers(HttpMethod.GET, ...).authenticated()`.
2. **Cập nhật `DoctorAdminController.java`:**
   - Gắn `@PreAuthorize("hasRole('ADMIN')")` tại class level hoặc method `getAllDoctors` và `getDoctorLicenses`.
3. **Thêm Test Phân quyền:**
   - Tạo [`DoctorAdminSecurityTest.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/test/java/com/hospital/api/controller/DoctorAdminSecurityTest.java):
     - Case 1: Unauthenticated -> mong đợi `401 Unauthorized`.
     - Case 2: Authenticated with `ROLE_PATIENT` or `ROLE_DOCTOR` -> mong đợi `403 Forbidden`.
     - Case 3: Authenticated with `ROLE_ADMIN` -> mong đợi `200 OK`.

---

### Giai đoạn 3: Chặn Token Google Giả & Thẩm định Claim Chuẩn (Mục 1)
1. **Cập nhật Backend (`GoogleTokenVerifierService.java`):**
   - Đọc cấu hình `@Value("${google.allow-mock-token:false}") boolean allowMockToken`.
   - Nếu token bắt đầu bằng `dev-mock-`:
     - Kiểm tra nếu `!allowMockToken` hoặc môi trường là `prod`: ném ngay `AppException("Token mock không được phép trong môi trường này", HttpStatus.UNAUTHORIZED)`.
     - Nếu trong môi trường dev được phép: chỉ chấp nhận email nằm trong whitelist cố định (`patient.demo@hospital.vn`), từ chối client tự truyền email tùy ý.
   - Thẩm định ID Token thật:
     - Xác minh chữ ký với Google Certs qua `GoogleIdTokenVerifier`.
     - Kiểm tra các claim: `aud`, `iss` (`accounts.google.com` hoặc `https://accounts.google.com`), `exp` chưa hết hạn, `email_verified == true`, `sub` và `email` không rỗng.
2. **Cập nhật Frontend (`LoginPage.jsx`):**
   - Bọc giao diện mock dialog và nút thử nghiệm Google trong điều kiện `import.meta.env.DEV`.
   - Khi build Production (`npm run build`), toàn bộ giao diện thử nghiệm sẽ bị loại bỏ hoàn toàn khỏi mã nguồn bundle.
3. **Thêm Unit Test:**
   - Tạo [`GoogleTokenVerifierServiceTest.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/test/java/com/hospital/api/service/GoogleTokenVerifierServiceTest.java):
     - Test mock token bị từ chối khi `allowMockToken = false`.
     - Test mock token thành công khi `allowMockToken = true` với email hợp lệ trong whitelist.
     - Test token thật không hợp lệ / sai chữ ký bị từ chối `401`.

---

### Giai đoạn 4: Loại bỏ Dữ liệu Giả trên Trang Nội trú (Mục 2)
1. **Cập nhật `InpatientPage.jsx`:**
   - Xóa bỏ khối dữ liệu giả lập 3 bệnh nhân ("Bùi Thị Cúc", "Lê Thị Bích Hạnh", "Phạm Hải Phong") khi API trả về rỗng.
   - Khi `activeList.length === 0`: hiển thị thông báo Alert *"Hiện tại khoa chưa có bệnh nhân nào đang điều trị nội trú"*.
   - Xóa bỏ logic tính toán dị ứng, nhóm máu, sinh hiệu suy đoán theo số giường (`assignedBed === 1 ? ...`).
   - Nếu trường lâm sàng bị thiếu: hiển thị trung thực nhãn `"Chưa ghi nhận"` hoặc `"Chưa có dữ liệu"`.
   - Xóa bỏ khối dữ liệu giả trong `loadTreatmentHistory`: khi API trả rỗng, `treatmentHistory = []` và hiển thị *"Chưa có nhật ký điều trị hàng ngày"*.
2. **Xác minh đóng gói Frontend:**
   - Chạy `npm run build` trong `hospital-ui` để bảo đảm giao diện không còn lỗi cú pháp hay cảnh báo render.

---

### Giai đoạn 5: Cơ chế Gửi & Lưu trữ OTP An toàn, Bền vững (Mục 6, 7 & 8)
1. **Cơ sở Dữ liệu & Entity Bền vững (Mục 7):**
   - Thực thi DDL tạo bảng `otp_tokens` trên PostgreSQL:
     ```sql
     CREATE TABLE IF NOT EXISTS otp_tokens (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         recipient VARCHAR(150) NOT NULL,
         purpose VARCHAR(50) NOT NULL,
         otp_hash VARCHAR(255) NOT NULL,
         expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
         attempts INT NOT NULL DEFAULT 0,
         max_attempts INT NOT NULL DEFAULT 5,
         is_used BOOLEAN NOT NULL DEFAULT FALSE,
         client_ip VARCHAR(45),
         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
     );
     CREATE INDEX IF NOT EXISTS idx_otp_recipient_purpose ON otp_tokens(recipient, purpose);
     ```
   - Tạo Entity [`OtpToken.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/entity/OtpToken.java) và Repository [`OtpTokenRepository.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/repository/OtpTokenRepository.java).
2. **Xử lý Lỗi SMTP & Không nuốt ngoại lệ (Mục 6):**
   - Trong `OtpServiceImpl.java`: Kiểm tra `mailSender != null` trước khi xử lý. Nếu null, ném `503 Service Unavailable`.
   - Bọc lệnh gửi mail trong try-catch: Nếu `MailException` xảy ra, ném `502 Bad Gateway` và **không lưu OTP vào database**.
   - Chỉ khi email được chuyển đi thành công mới lưu bản ghi OTP (đã băm SHA-256).
   - Tuyệt đối không in mã OTP ra log; không trả mã trong response.
3. **Giới hạn Tần suất & Chống Dò OTP (Mục 8):**
   - Cooldown 60s giữa 2 lần gửi cho cùng một email/số điện thoại.
   - Giới hạn 5 lần gửi / 1 giờ / email; 15 lần gửi / 1 giờ / Client IP.
   - Sau 5 lần nhập sai, khóa và vô hiệu hóa challenge trong 15 phút.
   - Thêm transaction locking (`@Transactional`) ngăn chặn race condition khi gọi đồng thời.
   - Trả thông báo chung để tránh brute-force/enumeration tài khoản.
4. **Thêm Test Tự động:**
   - Tạo [`OtpServiceImplTest.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/test/java/com/hospital/api/service/OtpServiceImplTest.java) kiểm tra:
     - Gửi thành công khi SMTP hoạt động.
     - Ném lỗi khi SMTP thất bại và không lưu OTP.
     - Cooldown 60s bị chặn.
     - Nhập sai quá 5 lần bị khóa.
     - Gọi đồng thời không bị race condition.

---

### Giai đoạn 6: Kiến trúc Xác thực JWT qua HttpOnly Cookie (Mục 9)
1. **Kiến trúc Hybrid tương thích 100%:**
   - Cập nhật [`JwtAuthenticationFilter.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/security/JwtAuthenticationFilter.java): Ưu tiên lấy token từ Cookie `access_token`, nếu không có sẽ đọc từ Header `Authorization: Bearer <token>` (giúp Kiosk/Mobile vẫn hoạt động bình thường).
   - Cập nhật [`AuthController.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/controller/AuthController.java):
     - Khi đăng nhập thành công (`/login`, `/google`), ghi header `Set-Cookie`:
       `access_token=...; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
     - Bổ sung endpoint `POST /api/auth/logout`: Xóa cookie bằng `Max-Age=0`.
   - Cập nhật `SecurityConfig.java`: Cho phép `allowCredentials(true)` với danh sách origin rõ ràng (`http://localhost:5173`, `http://localhost:3000`).
2. **Đồng bộ Frontend:**
   - Cấu hình [`AxiosInstance.js`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/services/AxiosInstance.js): Bật `withCredentials: true`.
   - Cập nhật [`AuthContext.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/context/AuthContext.jsx): Không lưu `accessToken` vào `localStorage`, chỉ lưu profile hiển thị và xác minh trạng thái phiên qua `/api/auth/me`.

---

## 3. Tiêu chuẩn Nghiệm thu (Acceptance Criteria)

| Mã AC | Hạng mục kiểm chứng | Điều kiện đạt yêu cầu |
| :--- | :--- | :--- |
| **AC-01** | Google Mock Token | Gửi token `dev-mock-` khi tắt mock/profile prod -> Nhận `401 Unauthorized`. Chỉ token thật qua được kiểm tra chữ ký Google. |
| **AC-02** | Trang Nội trú sạch | Không còn bệnh nhân giả lập hay số liệu sinh hiệu suy đoán theo số giường. Hiển thị thông báo "Chưa có dữ liệu" trung thực. |
| **AC-03** | Phân quyền Quản lý Bác sĩ | GET `/api/admin/doctors` không đăng nhập -> `401`; đăng nhập vai trò `PATIENT`/`DOCTOR` -> `403`; vai trò `ADMIN` -> `200`. |
| **AC-04** | File Secret Google | `git status` không hiển thị file `client_secret_*.json`; file được `.gitignore` bảo vệ tuyệt đối. |
| **AC-05** | Production JWT Secret | Khởi động profile `prod` với `JWT_SECRET` rỗng hoặc < 32 ký tự -> Server dừng ngay với `IllegalStateException`. |
| **AC-06** | SMTP Error Handling | Khi SMTP lỗi/chưa cấu hình -> Trả lỗi 502/503; không lưu OTP vào DB; không in mã OTP vào log. |
| **AC-07** | OTP DB Persistence | Bảng `otp_tokens` ghi nhận mã đã băm SHA-256; sau khi verify thành công cột `is_used` chuyển thành `true`; không dùng lại được. |
| **AC-08** | Rate Limit & Anti-Brute | Thử sai 5 lần -> challenge bị vô hiệu hóa; gửi lại trong vòng 60s -> nhận `429 Too Many Requests`. |
| **AC-09** | HttpOnly Cookie Auth | Trình duyệt nhận cookie `access_token` có cờ `HttpOnly; SameSite=Lax`; đăng xuất xóa cookie; không lưu JWT thô trong `localStorage`. |
| **AC-10** | Build Integrity | `mvn test` và `npm run build` đều vượt qua 100%, không phát sinh lỗi biên dịch hay xung đột. |

---

## 4. Kế hoạch Hoàn tác (Rollback Plan)

- Mọi thay đổi đều được kiểm thử và lưu theo từng đơn vị tính năng độc lập.
- Nếu có bất kỳ sự cố không tương thích:
  - Về DB: Giữ nguyên các bảng cốt lõi của bệnh viện (`accounts`, `doctors`, `patients`), bảng `otp_tokens` là bảng phụ trợ độc lập không tạo khóa ngoại cưỡng chế.
  - Về Git: Không thực hiện commit mã nguồn khi chưa có yêu cầu từ người dùng, cho phép rollback dễ dàng qua git working tree nếu cần.

