# Kế hoạch Triển khai Tích hợp Microsoft Entra ID SSO cho Cán bộ Y tế & Quản trị viên

**Mode:** PLAN  
**Date:** 29-10-2026  
**Status:** SUPERSEDED — Đã được thay thế bởi kế hoạch remove-microsoft-entra_PLAN_29-10-26.md  
**Tài liệu tham chiếu:** `AGENTS.md`, `BC_34_V3.docx`

---

## 1. Mục tiêu Dự án (Goals)

Tích hợp xác thực đăng nhập một lần (SSO) qua **Microsoft Entra ID (Azure AD)** dành riêng cho đội ngũ cán bộ y tế (Bác sĩ, Trưởng khoa, Dược sĩ, Điều dưỡng, Kỹ thuật viên xét nghiệm, Thu ngân) và Quản trị viên hệ thống bệnh viện:
- **Chuẩn hóa OpenID Connect / OAuth 2.0**: Sử dụng Authorization Code Flow với PKCE trên React SPA và thẩm định mật mã học chữ ký số qua bộ khóa công khai JWKS tại Spring Boot backend.
- **Ràng buộc Single-Tenant Bệnh viện**: Chỉ chấp nhận định danh người dùng từ Tenant Microsoft chính thức của cơ sở khám chữa bệnh. Chặn triệt để tài khoản cá nhân (Hotmail, Outlook) và tài khoản thuộc tenant ngoài.
- **Không tự cấp quyền (Zero Auto-Provisioning)**: Tuyệt đối không tự động tạo tài khoản hoặc tự động cấp vai trò nhân viên/quản trị cho người dùng lạ. Tài khoản Microsoft phải khớp với hồ sơ nhân sự đã được Ban Quản trị phê duyệt trước trong cơ sở dữ liệu.
- **Phân định rõ ràng các kênh**:
  - Bệnh nhân: Duy trì đăng nhập nhanh qua Google Sign-In (OpenID Connect `sub`).
  - Cán bộ nhân viên: Đăng nhập bằng Microsoft Entra ID.
  - OTP Email: Chỉ dùng cho tình huống khôi phục mật khẩu hoặc xác nhận liên kết tài khoản cũ khi có yêu cầu đặc biệt; không bắt buộc OTP ở mỗi lần đăng nhập thông thường.
  - Không sử dụng SMS OTP.
- **Bảo toàn dữ liệu & Không lộ Secret**: Không thay đổi cơ sở dữ liệu PostgreSQL; không lưu trữ Client Secret ở frontend hay mã nguồn; mọi tham số đều quản lý qua biến môi trường.

---

## 2. Ranh giới Kiến trúc & Bất biến An toàn (Security Invariants)

1. **Bất biến 1 (Single-Tenant Guard):** Backend bắt buộc kiểm tra trường `tid` (Tenant ID) trong ID Token phải khớp chính xác với `AZURE_ENTRA_TENANT_ID`. Nếu không khớp, từ chối ngay lập tức (`403 Forbidden`).
2. **Bất biến 2 (Cryptographic Signature Verification):** Token được ký bằng thuật toán RS256 bởi Microsoft. Backend phải tải và cache chứng chỉ công khai từ JWKS endpoint của Microsoft (`https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys`) để xác thực tính toàn vẹn và hợp lệ của chữ ký, issuer (`https://login.microsoftonline.com/{tenantId}/v2.0`), audience (`AZURE_ENTRA_CLIENT_ID`), và thời hạn hiệu lực (`exp`, `nbf`).
3. **Bất biến 3 (Zero Auto-Provisioning & Role Preservation):**
   - Không tự động `INSERT` một `Account` mới với vai trò `ROLE_DOCTOR` hay `ROLE_ADMIN` khi một tài khoản Entra đăng nhập lần đầu.
   - Tài khoản đăng nhập phải được quản trị viên bệnh viện tạo sẵn từ trước trong hệ thống với email công vụ trùng khớp.
   - Khi đăng nhập lần đầu: Kiểm tra email công vụ -> Khớp tài khoản nhân sự -> Lưu `microsoft_oid` vào bảng `accounts` -> Cấp Hospital JWT.
   - Nếu không tìm thấy hồ sơ nhân sự có sẵn: Lập tức trả về `403 Forbidden` kèm thông điệp rõ ràng yêu cầu liên hệ Phòng Tổ chức cán bộ / Quản trị viên.
4. **Bất biến 4 (Client Secret Immunity):** React SPA sử dụng `@azure/msal-browser` với cơ chế PKCE (Public Client). Tuyệt đối không cấu hình, không truyền và không lưu trữ `Client Secret` trên frontend.
5. **Bất biến 5 (Patient Isolation):** Đăng nhập Microsoft chỉ dành cho nhân sự; tài khoản bệnh nhân (`ROLE_PATIENT`) nếu đăng nhập bằng Microsoft sẽ bị từ chối truy cập cổng nhân viên.

---

## 3. Thiết kế Kỹ thuật Chi tiết

### 3.1. Cơ sở Dữ liệu (Database Schema)
- Bảng: `accounts`
- Bổ sung cột:
  ```sql
  ALTER TABLE accounts ADD COLUMN IF NOT EXISTS microsoft_oid VARCHAR(100);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_account_microsoft_oid ON accounts(microsoft_oid);
  ```
- Ý nghĩa: `microsoft_oid` lưu giá trị claim `oid` (Object ID) bất biến của người dùng trong Azure AD Tenant.

### 3.2. Cấu hình Backend (`hospital-api`)

#### A. Thư viện thẩm định JWKS (`pom.xml`)
Bổ sung thư viện RFC-compliant chuẩn xử lý JSON Web Signature / JWKS:
```xml
<!-- Nimbus JOSE+JWT for Microsoft Entra ID Token JWKS Verification -->
<dependency>
    <groupId>com.nimbusds</groupId>
    <artifactId>nimbus-jose-jwt</artifactId>
    <version>9.40</version>
</dependency>
```

#### B. Cấu hình Tham số Hệ thống (`application.yml` & `.env.example`)
```yaml
azure:
  entra:
    tenant-id: ${AZURE_ENTRA_TENANT_ID:}
    client-id: ${AZURE_ENTRA_CLIENT_ID:}
```
- Khai báo file mẫu `hospital-api/.env.example`:
  ```properties
  AZURE_ENTRA_TENANT_ID=your-tenant-id-guid
  AZURE_ENTRA_CLIENT_ID=your-client-id-guid
  ```

#### C. Lớp Thẩm định Token (`MicrosoftTokenVerifierService.java`)
- Tạo service chuyên biệt phụ trách:
  1. Khởi tạo `RemoteJWKSet` trỏ tới `https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys` (có cache nội bộ tự động xoay khóa).
  2. Dùng `DefaultJWTProcessor` cấu hình thuật toán `JWSAlgorithm.RS256`.
  3. Thẩm định Claims:
     - Issuer: `https://login.microsoftonline.com/{tenantId}/v2.0`
     - Audience: `client-id`
     - Tenant ID: `tid` trong claims phải bằng `tenant-id`
     - Expiration: `claims.getExpirationTime()` chưa trôi qua
  4. Trích xuất Record `MicrosoftUserInfo(String oid, String email, String preferredUsername, String name)`.

#### D. Lớp Nhận Yêu cầu & Điều phối Xác thực (`AuthController.java` & `AuthServiceImpl.java`)
- **DTO Request:** `MicrosoftLoginRequest(@NotBlank String idToken)`
- **Endpoint:** `POST /api/auth/microsoft` (nằm trong dải `/api/auth/**` đã được `permitAll()`).
- **Nghiệp vụ `AuthServiceImpl.loginWithMicrosoft`:**
  1. Gọi `microsoftTokenVerifierService.verify(request.idToken())`.
  2. Tra cứu `accountRepository.findByMicrosoftOid(oid)`:
     - Nếu có: Kiểm tra `isActive`, phát hành Hospital JWT nội bộ.
  3. Nếu chưa có `microsoftOid`:
     - Xác định email ứng viên: ưu tiên `preferred_username`, nếu không có thì lấy `email`.
     - Tra cứu `accountRepository.findByEmail(email)`.
     - Nếu tìm thấy:
       - Kiểm tra vai trò: Phải là vai trò nhân sự (`ROLE_DOCTOR`, `ROLE_HEAD_OF_DEPARTMENT`, `ROLE_NURSE`, `ROLE_LAB_TECHNICIAN`, `ROLE_PHARMACIST`, `ROLE_CASHIER`, `ROLE_ADMIN`, `ROLE_STAFF`). Nếu là `ROLE_PATIENT`, từ chối với lý do tài khoản bệnh nhân không được truy cập cổng nhân sự.
       - Cập nhật liên kết: `account.setMicrosoftOid(oid)`. Lưu lại cơ sở dữ liệu.
       - Phát hành Hospital JWT nội bộ.
     - Nếu KHÔNG tìm thấy:
       - **Quăng lỗi `AppException("Tài khoản Microsoft (...) chưa được cấp quyền nhân sự trong hệ thống bệnh viện. Vui lòng liên hệ Quản trị viên để tạo hồ sơ nhân viên.", HttpStatus.FORBIDDEN)`**.

### 3.3. Cấu hình Frontend (`hospital-ui`)

#### A. Cài đặt Thư viện
```bash
npm install @azure/msal-browser
```

#### B. Khởi tạo Cấu hình MSAL (`src/services/msalConfig.js`)
- Cấu hình `PublicClientApplication`:
  - `clientId`: `import.meta.env.VITE_AZURE_ENTRA_CLIENT_ID`
  - `authority`: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_ENTRA_TENANT_ID}`
  - `redirectUri`: `window.location.origin + "/login"`
  - Cache: `localStorage` hoặc `sessionStorage`

#### C. Cập nhật Trang Đăng nhập (`LoginPage.jsx`)
- Thay thế nút demo mock bằng hàm xử lý thực:
  ```javascript
  const handleMicrosoftLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const msalInstance = await getMsalInstance();
      const loginResponse = await msalInstance.loginPopup({
        scopes: ["openid", "profile", "email"]
      });
      const idToken = loginResponse.idToken;
      
      const res = await axiosInstance.post("/api/auth/microsoft", { idToken });
      if (res.data?.success && res.data?.data) {
        login(res.data.data); // Lưu vào AuthContext & localStorage
        redirectByRole(res.data.data.role); // Điều hướng đúng phòng khám / dashboard
      }
    } catch (err) {
      if (err.errorCode !== "user_cancelled") {
        setError(err.response?.data?.message || err.message || "Đăng nhập Microsoft Entra ID thất bại");
      }
    } finally {
      setLoading(false);
    }
  };
  ```

#### D. Biến môi trường Frontend (`hospital-ui/.env.example`)
```properties
VITE_AZURE_ENTRA_TENANT_ID=your-tenant-id-guid
VITE_AZURE_ENTRA_CLIENT_ID=your-client-id-guid
```

### 3.4. Cập nhật Tài liệu Báo cáo (`BC_34_V3.docx`)
- **Mục 2.2.1:** Chuẩn hóa mô tả cơ chế đăng nhập và xác thực không phụ thuộc SMS Brandname; sử dụng Email OTP cho các tác vụ nhạy cảm (khôi phục tài khoản, liên kết dữ liệu).
- **Mục 2.2.2:** Ghi rõ kiến trúc định danh kép (Dual Identity Provider Architecture):
  - Kênh người bệnh: Đăng nhập nhanh Google Sign-In (OpenID Connect `sub`).
  - Kênh cán bộ nhân viên y tế: Đăng nhập công vụ Microsoft Entra ID (Single-Tenant SSO, PKCE, Zero Auto-Provisioning).

---

## 4. Kế hoạch Triển khai Từng bước (Phased Execution Steps)

### Giai đoạn 1: Cơ sở Dữ liệu & Cấu hình Backend
1. Chạy migration trên PostgreSQL bổ sung cột `microsoft_oid` và unique index.
2. Cập nhật `Account.java` và `AccountRepository.java`.
3. Bổ sung dependency `nimbus-jose-jwt` vào `pom.xml`.
4. Bổ sung cấu hình `azure.entra.*` vào `application.yml` và `hospital-api/.env.example`.

### Giai đoạn 2: Lớp Thẩm định & Nghiệp vụ Backend
1. Tạo DTO `MicrosoftLoginRequest.java` và Record `MicrosoftUserInfo.java`.
2. Tạo dịch vụ `MicrosoftTokenVerifierService.java` thực hiện xác thực chữ ký số JWKS và kiểm tra Single-Tenant.
3. Cập nhật `AuthService.java` và `AuthServiceImpl.java` cài đặt logic phân quyền chặt chẽ (Zero Auto-Provisioning, chặn người lạ, ghép `oid`).
4. Bổ sung endpoint `POST /api/auth/microsoft` vào `AuthController.java`.
5. Biên dịch và kiểm tra tính toàn vẹn của mã backend (`mvn clean compile`).

### Giai đoạn 3: Tích hợp Giao diện Frontend
1. Cài đặt `@azure/msal-browser` trong `hospital-ui`.
2. Tạo module `src/services/msalConfig.js` khởi tạo `PublicClientApplication`.
3. Cập nhật `LoginPage.jsx`: Thay thế nút mock bằng luồng `loginPopup()`, tích hợp thông báo lỗi tiếng Việt trực quan.
4. Cập nhật `hospital-ui/.env.example`.
5. Kiểm tra build frontend (`npm run build`).

### Giai đoạn 4: Đồng bộ Báo cáo Nghiệp vụ
1. Cập nhật các tiểu mục liên quan trong `BC_34_V3.docx` để nội dung báo cáo khớp 100% với kiến trúc đã triển khai thực tế.

---

## 5. Kế hoạch Kiểm thử & Nghiệm thu (Verification & Acceptance Testing)

| Kịch bản kiểm thử | Dữ liệu đầu vào / Thao tác | Kết quả kỳ vọng |
| :--- | :--- | :--- |
| **TC-01: Token giả mạo hoặc sai chữ ký** | Gửi ID Token tự tạo bằng secret tùy tiện hoặc token sửa payload Base64 | Backend từ chối `401 Unauthorized` hoặc `400 Bad Request` ("Chữ ký token không hợp lệ"). |
| **TC-02: Token từ Tenant khác (Cross-tenant)** | Token hợp lệ của Microsoft nhưng có `tid != AZURE_ENTRA_TENANT_ID` | Backend từ chối `403 Forbidden` ("Chỉ cho phép tài khoản thuộc Tenant bệnh viện"). |
| **TC-03: Nhân viên chưa có trong cơ sở dữ liệu** | Tài khoản Microsoft hợp lệ thuộc tenant nhưng email chưa được tạo trong bảng `accounts` | Backend từ chối `403 Forbidden` ("Tài khoản chưa được kích hoạt trong danh sách nhân sự"). Không tạo account mới. |
| **TC-04: Cán bộ y tế hợp lệ đăng nhập lần đầu** | Tài khoản Microsoft có email trùng với Bác sĩ đã có sẵn trong bảng `accounts` (chưa có `microsoft_oid`) | Backend cập nhật `microsoft_oid` vào tài khoản, trả về Hospital JWT với `role: ROLE_DOCTOR`. Frontend chuyển hướng vào giao diện bác sĩ khám bệnh. |
| **TC-05: Cán bộ y tế đăng nhập các lần tiếp theo** | Đăng nhập lại với tài khoản đã được liên kết `microsoft_oid` | Đăng nhập thành công ngay lập tức qua `microsoft_oid`, không cần tìm theo email. |
| **TC-06: Người dùng bấm Hủy popup trên trình duyệt** | Người dùng đóng cửa sổ popup đăng nhập của Microsoft | Giao diện React bắt lỗi `user_cancelled` êm dịu, không văng lỗi đỏ, dừng trạng thái loading. |
| **TC-07: Luồng Bệnh nhân Google không bị ảnh hưởng** | Bệnh nhân bấm đăng nhập Google | Đăng nhập Google hoạt động bình thường, tài khoản được cấp `ROLE_PATIENT`. |

---

## 6. Kế hoạch Hoàn tác (Rollback Plan)

- Nếu có sự cố trong quá trình triển khai:
  - Backend: Rollback các commit ở `hospital-api`; xóa cột `microsoft_oid` nếu cần.
  - Frontend: Giữ nguyên giao diện đăng nhập mật khẩu thông thường và Google.
  - Tính năng đăng nhập mật khẩu và Google hoàn toàn độc lập, không bị ảnh hưởng khi rollback Entra ID.

---

## 7. Hướng dẫn Dành cho Quản trị viên Bệnh viện (Tenant Setup)

1. **Đăng ký Ứng dụng (App Registration) trên Microsoft Entra Admin Center:**
   - Tạo mới ứng dụng (ví dụ: `Hospital-Portal-Staff`).
   - Chọn loại tài khoản: *Accounts in this organizational directory only (Single tenant)*.
   - Thêm Redirect URI loại **SPA (Single-Page Application)**: `http://localhost:3000/login` (và domain production sau này).
   - Bật cấp ID tokens (Implicit grant and hybrid flows -> check *ID tokens* nếu cần cho SPA).
   - Lấy `Application (client) ID` và `Directory (tenant) ID` dán vào file cấu hình môi trường.
2. **Khởi tạo Nhân sự:**
   - Tạo trước tài khoản bác sĩ/nhân viên trong hệ thống bệnh viện qua cổng Admin với đúng email công vụ được cấp bởi bệnh viện.

