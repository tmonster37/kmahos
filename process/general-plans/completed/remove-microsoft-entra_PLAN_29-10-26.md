# Kế hoạch Triển khai: Gỡ bỏ Microsoft Entra ID & Chuẩn hóa Luồng Đăng nhập Hệ thống

**Mode:** EXECUTE  
**Date:** 29-10-2026  
**Status:** COMPLETED — Đã hoàn tất triển khai thành công 100%  
**Tài liệu tham chiếu:** `AGENTS.md`, `BC_34_V3.docx`, `microsoft-entra-sso_PLAN_29-10-26.md`

---

## 1. Mục tiêu Dự án (Goals)

Tiến hành gỡ bỏ hoàn toàn phân hệ xác thực Microsoft Entra ID (Single-Tenant SSO) khỏi hệ thống bệnh viện một cách sạch sẽ, an toàn và có kiểm soát:
- **Bảo toàn 100% Đăng nhập Bệnh nhân qua Google Sign-In**: Tuyệt đối không làm ảnh hưởng đến thư viện `com.google.api-client`, service `GoogleTokenVerifierService`, DTO `GoogleLoginRequest`, trường `google_sub`, cấu hình `google.client-id` và luồng tự tạo tài khoản `ROLE_PATIENT` cho người bệnh.
- **Duy trì Đăng nhập Cán bộ Y tế & Quản trị viên**: Đội ngũ y bác sĩ, nhân viên và quản trị viên tiếp tục sử dụng luồng xác thực tài khoản/mật khẩu công vụ hiện có (Số điện thoại hoặc Email + Mật khẩu mã hóa BCrypt), quản trị phiên qua Spring Security và Hospital JWT.
- **Email OTP An toàn, Không SMS OTP**: OTP gửi qua Email bảo mật chỉ dùng cho xác minh hoặc khôi phục tài khoản khi cần; không thêm lại kênh SMS OTP.
- **Dọn dẹp Sạch sẽ Nợ Kỹ thuật (Technical Debt)**:
  - Gỡ bỏ thư viện `nimbus-jose-jwt` và `@azure/msal-browser`.
  - Xóa các file mã nguồn, endpoint, DTO và service chuyên biệt của Entra.
  - Xóa các biến môi trường `AZURE_ENTRA_*` và `VITE_AZURE_ENTRA_*`.
  - Dọn dẹp cột `microsoft_oid` và chỉ mục liên quan trong database mà không làm mất mát bất kỳ dữ liệu người dùng nào.
- **Đồng bộ Báo cáo Nghiệp vụ**: Cập nhật lại các tiểu mục liên quan trong `BC_34_V3.docx` để khớp hoàn toàn với kiến trúc thực tế.

---

## 2. Bất biến An toàn & Ranh giới Bảo vệ (Security Invariants)

1. **Bất biến 1 (Google Sign-In Immunity):** Mọi thành phần phục vụ Google Sign-In của bệnh nhân (thư viện, controller endpoint `/api/auth/google`, entity mapping `google_sub`, client ID, modal OTP xác nhận liên kết tài khoản) được cách ly tuyệt đối, không bị sửa đổi hay xóa bỏ.
2. **Bất biến 2 (Staff Continuity):** Cán bộ nhân viên tiếp tục đăng nhập thành công qua form chính bằng tài khoản đã cấp. Không tự ý sinh thêm phương thức xác thực lạ ngoài tài khoản/mật khẩu.
3. **Bất biến 3 (Data Preservation):** Tuyệt đối không thực hiện xóa bản ghi người dùng (`Account`), bác sĩ (`Doctor`) hay nhân viên (`Staff`). Chỉ xóa bỏ cột phụ trợ `microsoft_oid`.
4. **Bất biến 4 (No Hardcoded Secrets):** Không đưa secret vào mã nguồn, log hoặc tài liệu.

---

## 3. Kế hoạch Triển khai Từng bước (Phased Implementation Plan)

### Giai đoạn 1: Cơ sở Dữ liệu (Database Schema Migration)
1. Thực thi script migration gỡ bỏ an toàn chỉ mục và cột `microsoft_oid`:
   ```sql
   DROP INDEX IF EXISTS idx_account_microsoft_oid;
   ALTER TABLE accounts DROP COLUMN IF EXISTS microsoft_oid;
   ```
2. Xác minh tính toàn vẹn của bảng `accounts` trên PostgreSQL (các trường `user_id`, `phone_number`, `email`, `password`, `google_sub`, `role` vẫn nguyên vẹn).

### Giai đoạn 2: Dọn dẹp Backend (`hospital-api`)
1. **Xóa file chuyên biệt của Entra:**
   * Xóa `hospital-api/src/main/java/com/hospital/api/service/MicrosoftTokenVerifierService.java`.
   * Xóa `hospital-api/src/main/java/com/hospital/api/dto/request/MicrosoftLoginRequest.java`.
2. **Gỡ bỏ Dependency trong `pom.xml`:**
   * Xóa khối dependency `com.nimbusds:nimbus-jose-jwt` (v9.40). Giữ nguyên các dependency Google và JJWT.
3. **Dọn dẹp Cấu hình (`application.yml` & `.env.example`):**
   * Xóa khối `azure: entra: tenant-id / client-id` trong `application.yml`.
   * Xóa `AZURE_ENTRA_TENANT_ID` và `AZURE_ENTRA_CLIENT_ID` trong `hospital-api/.env.example`.
4. **Cập nhật Entity & Repository:**
   * Trong `Account.java`: Xóa trường `microsoftOid`, index `idx_account_microsoft_oid`, getter, setter, constructor liên quan và builder method.
   * Trong `AccountRepository.java`: Xóa phương thức `findByMicrosoftOid` và `existsByMicrosoftOid`.
5. **Cập nhật Service & Controller:**
   * Trong `AuthService.java`: Xóa khai báo `loginWithMicrosoft`.
   * Trong `AuthServiceImpl.java`: Gỡ bỏ injection `MicrosoftTokenVerifierService` và phương thức `loginWithMicrosoft`.
   * Trong `AuthController.java`: Xóa endpoint `POST /api/auth/microsoft` và import `MicrosoftLoginRequest`.
6. **Kiểm tra Biên dịch:** Chạy `mvn compile` để bảo đảm backend không còn lỗi cú pháp hoặc import chết.

### Giai đoạn 3: Dọn dẹp Frontend (`hospital-ui`)
1. **Xóa file dịch vụ:**
   * Xóa file `hospital-ui/src/services/msalConfig.js`.
2. **Gỡ bỏ Package:**
   * Chạy `npm uninstall @azure/msal-browser` trong thư mục `hospital-ui`.
3. **Tái cấu trúc Giao diện `LoginPage.jsx`:**
   * Gỡ import `getMsalInstance, loginRequest`.
   * Xóa các state: `microsoftLoading, entraDialogOpen, customEntraEmail, customEntraMode`.
   * Xóa các hàm: `handleMicrosoftLogin, handleMicrosoftIdTokenAuth`.
   * Xóa nút *"Cán bộ Y tế (Microsoft Entra ID)"*, nút phụ *"Tuỳ chọn Microsoft khác"* và Dialog kiểm thử Entra ID.
   * Giữ nguyên form đăng nhập tài khoản/mật khẩu, các nút demo nhanh cho bác sĩ/nhân viên, và toàn bộ luồng Google Sign-In của bệnh nhân.
4. **Dọn dẹp Cấu hình Môi trường:**
   * Xóa các biến `VITE_AZURE_ENTRA_*` trong `hospital-ui/.env.example`.
5. **Kiểm tra Build Frontend:** Chạy `npm run build` để kiểm chứng quá trình đóng gói production sạch sẽ.

### Giai đoạn 4: Đồng bộ Báo cáo & Lưu trữ Kế hoạch
1. **Lưu trữ Kế hoạch Cũ:**
   * Đánh dấu kế hoạch `process/general-plans/active/microsoft-entra-sso_PLAN_29-10-26.md` thành `SUPERSEDED` và chuyển sang `process/general-plans/completed/`.
2. **Cập nhật `BC_34_V3.docx`:**
   * Đoạn 98: Mô tả cán bộ y tế đăng nhập bằng tài khoản công vụ nội bộ qua Spring Security & Hospital JWT.
   * Đoạn 162: Mô tả kiến trúc xác thực đa tầng (Bệnh nhân: Google OIDC; Cán bộ y tế: Tài khoản công vụ nội bộ; Email OTP bảo mật; không phụ thuộc SMS).
   * Đoạn 262 (Mục 2.2.1): Cập nhật biểu đồ tuần tự Đăng nhập tương ứng.

---

## 4. Kế hoạch Kiểm thử & Nghiệm thu (Acceptance Criteria)

| Tiêu chí nghiệm thu | Thao tác kiểm chứng | Kết quả kỳ vọng |
| :--- | :--- | :--- |
| **AC-01: Đăng nhập Bác sĩ / Nhân viên bằng Mật khẩu** | Nhập `0911000001` / `password123` (hoặc email `hoang.nguyen@hospital.vn`) | Đăng nhập thành công, nhận Hospital JWT, điều hướng đúng vào phòng khám `/doctor/examinations`. |
| **AC-02: Đăng nhập Quản trị viên bằng Mật khẩu** | Nhập `0937050537` / `taizz0537` | Đăng nhập thành công, nhận Hospital JWT, điều hướng đúng vào trang quản trị `/admin/dashboard`. |
| **AC-03: Đăng nhập Google Bệnh nhân không bị ảnh hưởng** | Nhấn đăng nhập Google hoặc chọn tài khoản Google trong Dialog | Hoạt động bình thường, backend nhận ID Token tại `/api/auth/google`, cấp Hospital JWT vai trò `ROLE_PATIENT`. |
| **AC-04: Endpoint Entra bị gỡ bỏ hoàn toàn** | Gửi request tới `POST /api/auth/microsoft` | Backend trả về `404 Not Found` (không còn tồn tại endpoint). |
| **AC-05: Sạch sẽ Dependency & Mã nguồn** | Kiểm tra `pom.xml`, `package.json`, build backend và build frontend | `BUILD SUCCESS`, Vite build thành công, không còn dấu vết của MSAL hoặc Nimbus. |
| **AC-06: Toàn vẹn Dữ liệu Tài khoản** | Truy vấn bảng `accounts` trên PostgreSQL | Toàn bộ dữ liệu người dùng, bác sĩ, bệnh nhân còn nguyên vẹn 100%. |

---

## 5. Kế hoạch Hoàn tác (Rollback Plan)

- Mã nguồn đã được commit an toàn trên nhánh `main` trước khi tiến hành.
- Có bản sao lưu tài liệu `BC_34_V3.docx.bak` trong thư mục gốc.
- Mọi thao tác đều có thể khôi phục ngay lập tức bằng git restore nếu phát sinh lỗi bất ngờ.

