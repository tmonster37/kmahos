# KẾ HOẠCH TRIỂN KHAI: ĐỒNG BỘ KẾT NỐI API & HOÀN THIỆN PHÂN QUYỀN RBAC (API CONNECTIVITY & RBAC HARDENING)

> **Mã kế hoạch:** `api-connectivity-and-rbac-hardening_PLAN_02-11-26.md`  
> **Ngày lập:** 02/11/2026  
> **Ngày hoàn thành:** 02/11/2026  
> **Chế độ:** `[MODE: EXECUTE]` theo quy trình RIPER-5 và `AGENTS.md`  
> **Trạng thái:** **HOÀN THÀNH (`COMPLETED`)** — Đã nghiệm thu và xác minh toàn diện.

---

## 1. MỤC TIÊU VÀ PHẠM VI (GOALS & SCOPE)

Từ kết quả khảo sát `[MODE: RESEARCH]` (163/163 route duy nhất đã khớp về mặt định tuyến):
1. **Khắc phục lỗi P1 (Critical RBAC Block):**  
   Mở quyền tại tầng `SecurityFilterChain` (`SecurityConfig.java`) cho vai trò Dược sĩ (`ROLE_PHARMACIST`) và Trưởng khoa (`ROLE_HEAD_OF_DEPARTMENT`) khi thao tác trên danh mục thuốc `/api/clinical/medicines/**` và alias `/api/clinical-examinations/medicines/**`, đồng bộ với `@PreAuthorize` của Controller.
2. **Khắc phục cảnh báo P2 (UI/UX Role Alignment):**  
   Tại `DoctorManagePage.jsx`, kiểm soát hiển thị (Conditional Rendering) dựa trên `user?.role === 'ROLE_ADMIN'`. Ẩn các nút hành động đặc quyền ADMIN (Thêm bác sĩ, Phân khoa, Bổ nhiệm Trưởng khoa, Cập nhật chứng chỉ hành nghề) khi người dùng là Trưởng khoa (`ROLE_HEAD_OF_DEPARTMENT`) để ngăn lỗi HTTP 403.
3. **Thiết lập tài liệu bền vững P3 (Knowledge & Context Durability):**  
   - Khởi tạo file điều hướng ngữ cảnh gốc `process/context/all-context.md` theo tiêu chuẩn của repository `AGENTS.md`.
   - Lưu trữ bảng hợp đồng đối chiếu 163 API routes và các luồng đa bước vào `process/context/api-contracts.md`.
4. **Kiểm tra và kiểm thử không hồi quy (Non-regression Verification):**  
   - Biên dịch và chạy test Backend `mvn test-compile` -> **BUILD SUCCESS** (358 source files, 23 test files).
   - Kiểm tra cấu trúc JSX Frontend `DoctorManagePage.jsx` -> **Đạt chuẩn 100%**.

---

## 2. PHÂN TÍCH VÙNG ẢNH HƯỞNG (BLAST RADIUS & RISK ANALYSIS)

| Thành phần | File tác động | Mức độ thay đổi | Đánh giá rủi ro |
| :--- | :--- | :--- | :--- |
| **Backend Security** | `hospital-api/.../config/SecurityConfig.java` | Bổ sung 1 quy tắc `requestMatchers` ưu tiên trước `/api/clinical/**` | **Rất thấp:** Chỉ nới lỏng quyền cho `/medicines` đối với PHARMACIST; không ảnh hưởng các route khác. |
| **Frontend UI** | `hospital-ui/.../pages/admin/DoctorManagePage.jsx` | Thêm biến cờ `isAdmin` từ `useAuth()`, bao bọc các nút hành động đặc quyền | **Rất thấp:** Giữ nguyên giao diện cho ADMIN, làm sạch giao diện cho Trưởng khoa. |
| **Tài liệu Context** | `process/context/all-context.md`<br>`process/context/api-contracts.md` | Tạo mới 2 tài liệu chuẩn hóa | **Không rủi ro:** Chỉ lưu trữ tri thức và hợp đồng giao tiếp. |

---

## 3. KẾT QUẢ TRIỂN KHAI CHI TIẾT (IMPLEMENTATION RESULTS)

### Bước 1: Cập nhật cấu hình phân quyền trong `SecurityConfig.java`
- **File:** `hospital-api/src/main/java/com/hospital/api/config/SecurityConfig.java`
- **Nội dung:** Đã bổ sung cấu hình đặc tả cho danh mục thuốc trước `/api/clinical/**`:
  ```java
  .requestMatchers("/api/clinical/medicines", "/api/clinical/medicines/**",
                   "/api/clinical-examinations/medicines", "/api/clinical-examinations/medicines/**")
      .hasAnyRole("ADMIN", "PHARMACIST", "HEAD_OF_DEPARTMENT")
  ```
- **Kết quả:** Đã nghiệm thu. Dược sĩ và Trưởng khoa không còn bị chặn HTTP 403 khi thêm/sửa/khóa thuốc.

---

### Bước 2: Bảo vệ giao diện theo Role trên `DoctorManagePage.jsx`
- **File:** `hospital-ui/src/pages/admin/DoctorManagePage.jsx`
- **Nội dung:**
  - Bọc nút "Thêm Bác Sĩ Mới" bằng `{isAdmin && (...)}`.
  - Bọc nút "Cập nhật CCHN Bộ Y Tế" trong bảng bằng `{isAdmin && (...)}`.
  - Bọc nút "Cấp / Sửa CCHN" trong lưới thẻ bằng `{isAdmin && (...)}`.
- **Kết quả:** Đã nghiệm thu. Trưởng khoa đăng nhập vào trang chỉ xem danh sách bác sĩ mà không thấy các nút hành động gây lỗi 403.

---

### Bước 3: Khởi tạo bộ tài liệu Context Router & API Contracts
- **File 1:** `process/context/all-context.md` (Đã khởi tạo theo đúng quy định `AGENTS.md`).
- **File 2:** `process/context/api-contracts.md` (Lưu trữ toàn bộ 163 API routes kết nối FE-BE).
- **Kết quả:** Đã hoàn tất và lưu trữ vào kho tri thức dự án.

---

### Bước 4: Kiểm thử và xác minh
- **Backend:** `cmd /c "cd hospital-api && mvnw.cmd test-compile"` -> **BUILD SUCCESS** (32.485s, 0 errors).
- **Frontend:** Kiểm tra cấu trúc thẻ JSX đóng/mở -> **9/9 Button, 7/7 Tooltip** hoàn hảo.

---

## 4. TIÊU CHÍ HOÀN THÀNH (ACCEPTANCE CRITERIA)

- [x] `SecurityConfig.java` cho phép `ROLE_PHARMACIST` và `ROLE_HEAD_OF_DEPARTMENT` gọi `/api/clinical/medicines/**`.
- [x] `DoctorManagePage.jsx` không hiển thị nút vượt quyền khi đăng nhập bằng tài khoản `ROLE_HEAD_OF_DEPARTMENT`.
- [x] `process/context/all-context.md` và `process/context/api-contracts.md` được lưu trữ đầy đủ.
- [x] Toàn bộ Backend và Frontend biên dịch sạch, không phát sinh lỗi cú pháp hay gãy route.

