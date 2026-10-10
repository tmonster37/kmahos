# Kế Hoạch Triển Khai Module 1: Quản Lý Bác Sĩ & Phân Lịch Trực (Admin Portal)

Dựa trên thiết kế tham khảo từ dự án **TheDuckHospital**, tài liệu này mô tả chi tiết kế hoạch xây dựng phân hệ **Quản Lý Bác Sĩ** và **Phân Lịch Trực Khám Bệnh** dành riêng cho Quản trị viên (Admin) và Trưởng khoa.

---

## 1. Mục Tiêu Của Module

1. **Quản lý danh sách Bác sĩ**:
   - Thêm mới Bác sĩ (tự động tạo tài khoản đăng nhập `ROLE_DOCTOR`, liên kết Chuyên khoa, gán Học vị `PGS_TS`, `BSCKII`, `THS`, đơn giá khám, tiểu sử).
   - Xem, tìm kiếm, lọc danh sách Bác sĩ theo Khoa.
   - Cập nhật thông tin chuyên môn hoặc vô hiệu hóa bác sĩ.

2. **Phân lịch trực & Ca khám trực quan**:
   - Tạo ca trực cho Bác sĩ theo ngày, phòng khám và buổi (Sáng / Chiều / Tối). Hệ thống tự động sinh các khung giờ 30 phút (`TimeSlots`).
   - Hiển thị danh sách lịch trực theo ngày và theo chuyên khoa.
   - Hỗ trợ xóa / hủy ca trực khi có thay đổi.

3. **Tích hợp giao diện Admin**:
   - Tích hợp 2 mục menu mới vào Sidebar của [`AdminLayout.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-ui/src/layouts/AdminLayout.jsx):
     - 🩺 **Quản Lý Bác Sĩ** (`/admin/doctors`)
     - 📅 **Phân Lịch Trực** (`/admin/schedules`)

---

## 2. Các Thay Đổi Cụ Thể Trong Hệ Thống

### A. Backend (Spring Boot 3.4 & Java 21)

#### [NEW] [`DoctorAdminController.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-api/src/main/java/com/hospital/api/controller/DoctorAdminController.java)
- `GET /api/admin/doctors`: Lấy danh sách toàn bộ bác sĩ kèm thông tin khoa, học vị, tài khoản.
- `POST /api/admin/doctors`: Tạo bác sĩ mới (tạo `Account` + `Doctor`).
- `PUT /api/admin/doctors/{doctorId}`: Cập nhật học vị, giá khám, khoa, tiểu sử.
- `DELETE /api/admin/doctors/{doctorId}`: Xóa mềm bác sĩ.

#### [MODIFY] [`ScheduleController.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-api/src/main/java/com/hospital/api/controller/ScheduleController.java) & [`ScheduleServiceImpl.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-api/src/main/java/com/hospital/api/service/impl/ScheduleServiceImpl.java)
- Bổ sung `GET /api/schedules/all` để Admin xem toàn bộ lịch trực hiện có.
- Bổ sung `DELETE /api/schedules/{scheduleId}` để hủy ca trực.

#### [NEW] DTOs: [`DoctorCreateRequest.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-api/src/main/java/com/hospital/api/dto/request/DoctorCreateRequest.java), [`DoctorAdminResponse.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-api/src/main/java/com/hospital/api/dto/response/DoctorAdminResponse.java).

---

### B. Frontend (React 18 + MUI)

#### [NEW] [`DoctorManagePage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-ui/src/pages/admin/DoctorManagePage.jsx)
- Bảng danh sách Bác sĩ với giao diện thẻ Card & Bảng: Avatar, Học vị, Tên, Chuyên khoa, Giá khám, SĐT, Email, Rating sao.
- Modal Form tạo Bác sĩ mới + validation đầy đủ.

#### [NEW] [`ScheduleManagePage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-ui/src/pages/admin/ScheduleManagePage.jsx)
- Giao diện phân lịch trực: Chọn ngày, chọn Chuyên khoa -> hiển thị các ca trực và khung giờ đã được sinh tự động.
- Modal tạo ca trực nhanh: Chọn Bác sĩ -> Chọn Buồng phòng -> Chọn Ngày & Buổi trực.

#### [MODIFY] [`AdminLayout.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-ui/src/layouts/AdminLayout.jsx) & [`AppRoutes.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20%281%29/hospital-ui/src/routes/AppRoutes.jsx)
- Bổ sung menu và routes cho `/admin/doctors` và `/admin/schedules`.

---

## 3. Kế Hoạch Kiểm Thử (Verification Plan)

1. **Automated Integration Test**:
   - Viết test case trong `test_e2e_integration.js` kiểm tra API Admin tạo bác sĩ mới, cập nhật bác sĩ, tạo lịch trực và truy vấn lịch trực.
2. **Kiểm tra Frontend Build**:
   - Chạy `npm run build` đảm bảo không có lỗi linter/syntax.
3. **Manual Test trên trình duyệt**:
   - Đăng nhập tài khoản Admin (`0937050537` / `taizz0537`).
   - Vào mục **Quản lý Bác sĩ** ➔ Thêm 1 bác sĩ mới.
   - Vào mục **Phân lịch trực** ➔ Tạo ca trực cho bác sĩ vừa thêm.
   - Đăng xuất ➔ Dùng tài khoản Bệnh nhân vào trang **Đặt lịch khám** (`/booking`) để kiểm tra ca khám vừa tạo có xuất hiện để đặt lịch không.
