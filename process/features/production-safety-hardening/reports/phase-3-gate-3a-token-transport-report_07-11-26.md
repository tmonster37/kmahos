# Báo cáo Cổng Nghiệm thu 3A (Gate 3A): Kiểm kê Client & Phân tích Tương thích Cơ chế Truyền Token

> **Chương trình:** `production-safety-hardening`  
> **Kế hoạch Giai đoạn 3:** [`phase-3-api-auth-and-process-hardening_PLAN_07-11-26.md`](../active/phase-3-api-auth-and-process-hardening_PLAN_07-11-26.md)  
> **Ngày thực hiện:** 07-11-2026  
> **Trạng thái Gate 3A:** **READY FOR REVIEW (Chờ chọn phương án cho Bước 3B)**

---

## 1. Các Hạng mục Đã Hoàn tất trong Bước 3A

1. **Làm sạch phản hồi lỗi nội bộ tại [`HealthCheckController.java`](../../../../hospital-api/src/main/java/com/hospital/api/controller/HealthCheckController.java#L42-L58):**
   - Đã loại bỏ `dbStatus.put("error", e.getMessage())` và `databaseProduct` khỏi phản hồi công khai `/api/health`; ghi `log.error` nội bộ phía server.
2. **Làm sạch phản hồi lỗi tại [`GlobalExceptionHandler.java`](../../../../hospital-api/src/main/java/com/hospital/api/exception/GlobalExceptionHandler.java#L50-L78):**
   - Đã loại bỏ nối chuỗi `+ ex.getMessage()` ở cả `handleAuthenticationException` (HTTP 401) và `handleGeneralException` (HTTP 500); ghi log nội bộ bằng `@Slf4j`.
3. **Đồng bộ Tài liệu Ngữ cảnh & Thiết lập CI:**
   - Cập nhật [`all-context.md`](../../../../process/context/all-context.md#L10-L22) khớp phiên bản thực tế (`Spring Boot 3.4.3`, `React 18.3`, `Vite 6.1`, `MUI v6.4`, `React Router v7`).
   - Tạo mới workflow CI tự động [`.github/workflows/ci.yml`](../../../../.github/workflows/ci.yml) chạy `./mvnw test`, `npx vitest run` và `npx vite build`.

---

## 2. Kiểm kê Toàn bộ Điểm Đọc / Ghi `accessToken` trong Repo (Gate 3A Inventory)

Qua rà soát toàn bộ mã nguồn (`Select-String -Pattern "accessToken"`), chỉ có **4 nhóm thành phần** tương tác với `accessToken`:

| STT | Thành phần / File | Cách thức sử dụng hiện tại | Ghi chú tương thích |
| :--- | :--- | :--- | :--- |
| **1** | **Backend [`AuthController.java`](../../../../hospital-api/src/main/java/com/hospital/api/controller/AuthController.java#L48-L96)** | Khi `/login`, `/register`, `/google` thành công: vừa đặt `HttpOnly` cookie `access_token` (`Path=/`, `SameSite=Lax`, `Max-Age=86400`), vừa trả `accessToken` trong body JSON `AuthResponse`. Khi `/logout`: xóa cookie `access_token` (`Max-Age=0`). | Đã hỗ trợ sẵn song song cả Cookie `HttpOnly` và JSON body. |
| **2** | **Backend [`JwtAuthenticationFilter.java`](../../../../hospital-api/src/main/java/com/hospital/api/security/JwtAuthenticationFilter.java#L54-L98)** | Đọc `Authorization: Bearer <token>` trước; nếu không có thì đọc `HttpOnly` cookie `access_token` (kèm kiểm tra chống CSRF qua header `X-Requested-With` hoặc `Origin`/`Referer`). | Đã hỗ trợ hoàn chỉnh cả 2 kênh xác thực. |
| **3** | **Frontend [`AuthContext.jsx`](../../../../hospital-ui/src/context/AuthContext.jsx#L39-L60) & [`AxiosInstance.js`](../../../../hospital-ui/src/services/AxiosInstance.js#L18-L42)** | - `AuthContext.jsx` (L43-45): Lưu `localStorage.setItem("accessToken", authData.accessToken)` và lưu `user` (chứa cả `accessToken` bên trong object `authData`).<br>- `AxiosInstance.js` (L21-26): Đã bật `withCredentials: true` và gửi `X-Requested-With: XMLHttpRequest`, đồng thời đọc `localStorage.getItem("accessToken")` để gắn `Authorization: Bearer`. | Là **nơi duy nhất** trong toàn bộ `hospital-ui/src` đọc/ghi `accessToken` vào `localStorage`. Không có trang hay component nào khác đọc trực tiếp `localStorage.getItem("accessToken")`. |
| **4** | **Scripts Kiểm thử CLI ([`test_master_system_audit.js`](../../../../test_master_system_audit.js))** | Chạy trên Node.js `fetch` (không có cookie jar tự động của trình duyệt), đọc `data.data.accessToken` từ JSON response của `/api/auth/login` và gửi qua header `Authorization: Bearer`. | Cần backend giữ trường `accessToken` trong response hoặc dùng memory token. |

---

## 3. Phân tích 2 Phương án Bảo mật Token Transport cho Bước 3B

| Tiêu chí | Phương án A: Cookie-Only trên Trình duyệt *(Khuyến nghị)* | Phương án B: Hybrid In-Memory + HttpOnly Cookie |
| :--- | :--- | :--- |
| **Cơ chế tại Frontend (`hospital-ui`)** | - Xóa hoàn toàn `localStorage.setItem("accessToken", ...)` và loại bỏ trường `accessToken` trước khi lưu metadata `user` vào `localStorage`.<br>- `AxiosInstance.js` không đọc `localStorage.getItem("accessToken")`, hoàn toàn dựa vào `HttpOnly` cookie `access_token` (`withCredentials: true` + `X-Requested-With: XMLHttpRequest`). | - Xóa hoàn toàn `accessToken` khỏi `localStorage`.<br>- Giữ `accessToken` trong biến bộ nhớ RAM (`inMemoryAccessToken` trong module `AxiosInstance.js`) để gắn header `Authorization: Bearer` khi tab còn mở, và tự động fallback sang `HttpOnly` cookie `access_token` khi người dùng F5 / tải lại trang. |
| **Chống đánh cắp token qua XSS (`localStorage`)** | **Tuyệt đối:** Không có bất kỳ chuỗi JWT nào nằm trong `localStorage` hay `sessionStorage`. | **Cao:** Không có JWT trong `localStorage` hay `sessionStorage` (chỉ nằm trong RAM khi mới đăng nhập). |
| **Tương thích khi F5 / Reload trang** | **Hoạt động 100%:** Trình duyệt tự động gửi kèm `HttpOnly` cookie `access_token` và header `X-Requested-With: XMLHttpRequest` đã qua kiểm tra CSRF của `JwtAuthenticationFilter`. | **Hoạt động 100%:** Sau khi F5, biến RAM trống nên request tự động xác thực bằng `HttpOnly` cookie `access_token`. |
| **Tương thích với CLI / Mobile / Integration Scripts** | **Hoạt động 100%:** Backend `AuthController` vẫn trả `accessToken` khi login và `JwtAuthenticationFilter` vẫn chấp nhận `Authorization: Bearer` cho CLI scripts. | **Hoạt động 100%.** |

