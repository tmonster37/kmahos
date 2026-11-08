# Kế hoạch Giai đoạn 3: Bảo mật Phản hồi API, Cơ chế Token, Giao diện & Quy trình (`phase-3-api-auth-and-process-hardening`)

> **Thuộc Chương trình:** [`production-safety-hardening_UMBRELLA_PLAN_07-11-26.md`](./production-safety-hardening_UMBRELLA_PLAN_07-11-26.md)  
> **Trạng thái:** COMPLETED (07-11-2026)  
> **Ngày tạo:** 07-11-2026

---

## 1. Mục tiêu & Phạm vi Đã Hoàn thành

1. **Làm sạch phản hồi lỗi nội bộ (`HealthCheckController.java` & `GlobalExceptionHandler.java`):**
   - Tại `HealthCheckController.java`: Không trả trực tiếp `e.getMessage()` hay `databaseProduct` ra endpoint công khai `/api/health`; chỉ ghi log nội bộ ở server và trả trạng thái `"DOWN"` chuẩn.
   - Tại `GlobalExceptionHandler.java`: Không nối chuỗi `+ ex.getMessage()` vào phản hồi HTTP 500 (`Exception.class`) và HTTP 401 (`AuthenticationException.class`); ghi `log.error`/`log.warn` phía server và trả thông báo thân thiện, an toàn cho client.
2. **Cổng Kiểm kê Client & Bảo mật Token Transport (Gate 3A $\rightarrow$ Step 3B):**
   - **Gate 3A:** Đã kiểm kê toàn bộ điểm đọc/ghi `accessToken` trong repo và trình bày bảng phân tích tại [`phase-3-gate-3a-token-transport-report_07-11-26.md`](../reports/phase-3-gate-3a-token-transport-report_07-11-26.md). Người dùng đã chọn **Phương án A (Cookie-Only trên trình duyệt)**.
   - **Step 3B:** Đã cập nhật [`AuthContext.jsx`](../../../../hospital-ui/src/context/AuthContext.jsx) và [`AxiosInstance.js`](../../../../hospital-ui/src/services/AxiosInstance.js) để xóa hoàn toàn `accessToken` khỏi `localStorage` (bao gồm cả bên trong object `user`), sử dụng `HttpOnly` cookie `access_token` (`withCredentials: true` + `X-Requested-With: XMLHttpRequest`).
3. **Đồng bộ Tài liệu Ngữ cảnh & Thiết lập CI:**
   - Cập nhật [`process/context/all-context.md`](../../../../process/context/all-context.md): Đồng bộ đúng phiên bản thực tế (`Spring Boot 3.4.3`, `React 18.3`, `Vite 6.1`, `MUI v6.4`, `React Router v7`).
   - Thiết lập [`.github/workflows/ci.yml`](../../../../.github/workflows/ci.yml) để tự động chạy `./mvnw test` và `npx vitest run` + `npx vite build`.

---

## 2. Cổng Nghiệm thu Giai đoạn 3 (Phase 3 Gate Criteria)

- [x] **Gate 3A:** Danh sách kiểm kê client và bảng phân tích tương thích (Cookie-Only vs Hybrid) được người dùng review và chọn phương án A trước khi sửa code truyền token.
- [x] Endpoint `/api/health` và `GlobalExceptionHandler` không còn lộ chi tiết exception nội bộ ra client.
- [x] `accessToken` không còn nằm trong `localStorage`.
- [x] `all-context.md` phản ánh đúng phiên bản stack thực tế và đường dẫn hợp lệ; workflow CI được thiết lập đầy đủ.

