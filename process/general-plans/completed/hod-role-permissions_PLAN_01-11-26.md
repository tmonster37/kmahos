# KẾ HOẠCH TRIỂN KHAI HOÀN THIỆN: PHÂN QUYỀN VAI TRÒ TRƯỞNG KHOA (HEAD OF DEPARTMENT)
**Mã kế hoạch:** PLAN-HOD-PERMISSIONS-01-11-26  
**Ngày cập nhật:** 01/11/2026  
**Trạng thái:** HOÀN TẤT & ĐÃ XÁC MINH (COMPLETED & VERIFIED)  
**Quy chuẩn áp dụng:** RIPER-5 / AGENTS.md / vc-generate-plan  

---

## 1. TỔNG QUAN & BỐI CẢNH (EXECUTIVE SUMMARY)

### 1.1. Mục tiêu cốt lõi
1. **Phân định rạch ròi Quản lý vs Khám chữa bệnh:** Trưởng khoa (`ROLE_HEAD_OF_DEPARTMENT`) chỉ quản lý khoa được phân công. Quyền khám chữa bệnh phải đến từ vai trò `ROLE_DOCTOR` riêng. Nếu một người vừa là trưởng khoa vừa khám bệnh thì kết hợp hai bộ quyền (Dynamic Role Synthesis qua `doctorLicense`), không mặc định cấp quyền bác sĩ chỉ vì mang vai trò trưởng khoa.
2. **Bảo mật Doanh thu & Dữ liệu toàn viện:** Trưởng khoa chỉ xem dashboard và số liệu tổng hợp trong khoa mình (lượt khám, lịch trực, tình trạng buồng/giường, công suất). Tuyệt đối **KHÔNG** xem doanh thu, biểu đồ tài chính, cơ cấu thanh toán hay số liệu của khoa khác và toàn viện.
3. **Phân lịch & Quản lý Bác sĩ:** Trưởng khoa xem danh sách bác sĩ thuộc khoa mình và lập/sửa/xóa lịch trực trong khoa. Tuyệt đối **KHÔNG** tạo tài khoản, đổi vai trò, hoặc chuyển khoa cho bác sĩ. Khắc phục dứt điểm lỗi HTTP 403 Forbidden khi HOD tải danh sách bác sĩ để xếp lịch.
4. **Giới hạn API Đọc và Ghi Lịch trực:** Cả thao tác Ghi (Tạo/Sửa/Xóa ca trực) lẫn thao tác Đọc (`GET /api/schedules`, `GET /api/schedules/all`) đều được backend giới hạn trong chuyên khoa phụ trách của Trưởng khoa.
5. **Giám sát Chuyên môn & Hồ sơ bệnh án (EMR):** Trưởng khoa chỉ theo dõi chuyên môn và xem hồ sơ liên quan đến khoa mình (cả xem theo mã khám, ID hồ sơ và danh sách bệnh án theo hồ sơ bệnh nhân). Chỉ bác sĩ điều trị mới được thực hiện khám bệnh, ra chỉ định, kê đơn; không cho phép HOD tự ý sửa/xóa hồ sơ hoặc ghi đè bệnh án đã hoàn tất.
6. **Loại bỏ Fallback Khoa trên UI:** Loại bỏ hoàn toàn logic tự động fallback về khoa đầu tiên (`formatted[0]`) trong `DepartmentManagePage.jsx`. Nếu chưa gán khoa, hiển thị Banner cảnh báo và khóa thao tác.
7. **Đồng bộ Tài liệu & Test:** Sửa mô tả không chính xác về "duyệt chuyển khoa" trong `README.md`, bổ sung unit test cho `ROLE_HEAD_OF_DEPARTMENT`.

---

## 2. KẾ HOẠCH TRIỂN KHAI CHI TIẾT THEO 5 PHA (EXECUTION PHASES)

### PHA 1: Khắc phục Lỗi Biên dịch & Đảm bảo Tương thích Ngược Unit Test
- **Điểm chạm:**
  - `hospital-api/src/main/java/com/hospital/api/service/impl/DoctorAdminServiceImpl.java`
  - `hospital-api/src/main/java/com/hospital/api/service/ScheduleService.java`
  - `hospital-api/src/main/java/com/hospital/api/service/impl/ScheduleServiceImpl.java`
- **Công việc cụ thể:**
  1. Thêm import `import com.hospital.api.security.UserPrincipal;` vào `DoctorAdminServiceImpl.java`.
  2. Bổ sung phương thức nạp chồng (overload) trong `ScheduleService.java`:
     ```java
     ScheduleResponse createSchedule(CreateScheduleRequest request);
     ```
  3. Triển khai phương thức trong `ScheduleServiceImpl.java`:
     ```java
     @Override
     @Transactional
     public ScheduleResponse createSchedule(CreateScheduleRequest request) {
         return createSchedule(request, null);
     }
     ```
- **Mục tiêu nghiệm thu:** Chạy `mvnw.cmd test-compile -DskipTests` thành công 100%, không còn lỗi `cannot find symbol` và `ScheduleServiceTest` tương thích hoàn toàn.

---

### PHA 2: Giới hạn Phân quyền API Đọc Lịch trực (`GET /api/schedules`)
- **Điểm chạm:**
  - `hospital-api/src/main/java/com/hospital/api/controller/ScheduleController.java`
  - `hospital-api/src/main/java/com/hospital/api/service/ScheduleService.java`
  - `hospital-api/src/main/java/com/hospital/api/service/impl/ScheduleServiceImpl.java`
- **Công việc cụ thể:**
  1. Trong `ScheduleController.java`:
     - Thêm `@AuthenticationPrincipal UserPrincipal currentUser` vào `getSchedules` (`GET /api/schedules`) và `getAllSchedules` (`GET /api/schedules/all`).
     - Truyền `currentUser` xuống tầng service: `scheduleService.getSchedules(startDate, endDate, doctorId, departmentId, currentUser)` và `scheduleService.getAllSchedules(date, currentUser)`.
  2. Trong `ScheduleServiceImpl.java`:
     - Nếu `currentUser` có `ROLE_HEAD_OF_DEPARTMENT` và không phải `ROLE_ADMIN`:
       - Lấy `headDeptId` từ thông tin bác sĩ trưởng khoa.
       - Với `getSchedules`: Cưỡng chế `departmentId = headDeptId` (ghi đè mọi tham số departmentId ngoài khoa do client gửi).
       - Với `getAllSchedules`: Tự động chuyển hướng gọi `getSchedulesByDepartmentAndDate(headDeptId, date)` thay vì lấy toàn viện.
- **Mục tiêu nghiệm thu:** Trưởng khoa gọi `GET /api/schedules` hoặc `GET /api/schedules/all` chỉ nhận được lịch trực thuộc khoa mình quản lý.

---

### PHA 3: Loại bỏ Fallback Khoa trên UI (`DepartmentManagePage.jsx`)
- **Điểm chạm:**
  - `hospital-ui/src/pages/admin/DepartmentManagePage.jsx`
- **Công việc cụ thể:**
  1. Xóa bỏ logic nguy hiểm:
     ```javascript
     if (!targetDept && formatted.length > 0) {
         targetDept = formatted[0]; // XÓA BỎ DÒNG NÀY
     }
     ```
  2. Cập nhật trạng thái: Nếu là `isHeadOfDept` và không tìm thấy `myDoctor?.departmentId` trong danh sách khoa, giữ `targetDept = null`.
  3. Bổ sung Banner cảnh báo thân thiện trên giao diện:
     ```jsx
     {isHeadOfDept && !selectedDept && (
         <Alert severity="warning" sx={{ mb: 3, borderRadius: "12px" }}>
             Tài khoản Trưởng khoa chưa được phân công quản lý chuyên khoa nào. Vui lòng liên hệ Quản trị viên để được gán chuyên khoa.
         </Alert>
     )}
     ```
  4. Ẩn/vô hiệu hóa các nút Thêm buồng bệnh, Sửa thông tin khoa khi `!selectedDept`.
- **Mục tiêu nghiệm thu:** Khi Trưởng khoa chưa có khoa phụ trách, UI không tự động hiển thị dữ liệu khoa khác.

---

### PHA 4: Giới hạn Hồ sơ Bệnh án theo Mã Bệnh nhân (`getRecordsByPatientProfile`)
- **Điểm chạm:**
  - `hospital-api/src/main/java/com/hospital/api/controller/ClinicalExaminationController.java`
  - `hospital-api/src/main/java/com/hospital/api/service/ClinicalExaminationService.java`
  - `hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalExaminationServiceImpl.java`
- **Công việc cụ thể:**
  1. Tại `ClinicalExaminationController.java`:
     - Endpoint `GET /api/clinical/patients/{patientProfileId}/records`: Truyền `userPrincipal` vào service.
  2. Tại `ClinicalExaminationServiceImpl.getRecordsByPatientProfile`:
     - Kiểm tra nếu caller có role `ROLE_HEAD_OF_DEPARTMENT` (và không có `ROLE_ADMIN`):
       - Lấy `headDeptId`.
       - Lọc danh sách trả về: chỉ giữ lại các `MedicalExaminationRecord` có bác sĩ thuộc `headDeptId` hoặc ca khám thuộc buồng phòng của `headDeptId`.
- **Mục tiêu nghiệm thu:** Trưởng khoa tra cứu lịch sử bệnh nhân chỉ xem được các đợt khám/điều trị tại khoa mình phụ trách.

---

### PHA 5: Đồng bộ Tài liệu & Bổ sung Unit Test
- **Điểm chạm:**
  - `README.md`
  - `hospital-api/src/test/java/com/hospital/api/controller/DoctorAdminSecurityTest.java`
- **Công việc cụ thể:**
  1. Cập nhật `README.md` dòng 227:
     - Sửa từ: `Quản lý chuyên khoa Nội, duyệt chuyển khoa, điều phối`
     - Thành: `Quản lý nhân sự, lịch trực và buồng phòng chuyên khoa Nội`
  2. Bổ sung test case trong `DoctorAdminSecurityTest.java`:
     - `hodRole_isAllowed200Ok_onGetDoctors`: Kiểm tra user với role `HEAD_OF_DEPARTMENT` được phép truy cập `GET /api/admin/doctors` (200 OK).
     - `hodRole_receives403Forbidden_onPostDoctor`: Kiểm tra user với role `HEAD_OF_DEPARTMENT` bị chặn `403 Forbidden` khi cố gọi `POST /api/admin/doctors`.
- **Mục tiêu nghiệm thu:** Tài liệu không còn mâu thuẫn với code; test suite phản ánh đúng ma trận quyền hạn mới.

---

## 3. MA TRẬN XÁC MINH TOÀN DIỆN (VERIFICATION MATRIX)

| Mã kiểm thử | Đối tượng kiểm tra | Phương thức & Endpoint | Kỳ vọng mong muốn |
| :--- | :--- | :--- | :--- |
| **TC-HOD-01** | Doanh thu viện phí | `GET /api/admin/dashboard/kpi-revenue` (HOD) | **HTTP 403 Forbidden** |
| **TC-HOD-02** | Dashboard tổng hợp | `GET /api/utilities/admin/dashboard` (HOD) | **HTTP 200 OK**, `totalRevenueThisMonth` là `null`, dữ liệu gom theo khoa |
| **TC-HOD-03** | Công suất phòng | `GET /api/admin/dashboard/room-capacity?departmentId=999` (HOD) | **HTTP 200 OK**, ghi đè thành khoa HOD, bỏ qua param 999 |
| **TC-HOD-04** | Danh sách bác sĩ | `GET /api/admin/doctors` (HOD) | **HTTP 200 OK**, chỉ trả về bác sĩ thuộc khoa mình (Fix lỗi 403) |
| **TC-HOD-05** | Tạo bác sĩ mới | `POST /api/admin/doctors` (HOD) | **HTTP 403 Forbidden** |
| **TC-HOD-06** | Phân công chuyển khoa | `PATCH /api/admin/doctors/{id}/assign-department` (HOD) | **HTTP 403 Forbidden** |
| **TC-HOD-07** | Đọc lịch trực toàn viện | `GET /api/schedules/all` (HOD) | **HTTP 200 OK**, tự động chỉ trả về lịch trực khoa mình |
| **TC-HOD-08** | Đọc lịch trực khoa khác | `GET /api/schedules?departmentId=999` (HOD) | **HTTP 200 OK**, ghi đè `departmentId` về khoa HOD |
| **TC-HOD-09** | Tạo ca trực khoa khác | `POST /api/schedules` (HOD chọn BS khoa khác) | **HTTP 403 Forbidden** |
| **TC-HOD-10** | Xóa ca trực khoa khác | `DELETE /api/schedules/{otherScheduleId}` (HOD) | **HTTP 403 Forbidden** |
| **TC-HOD-11** | Tiếp nhận ca khám | `POST /api/clinical-examinations/start` (HOD thuần túy) | **HTTP 403 Forbidden** |
| **TC-HOD-12** | Kê đơn thuốc | `POST /api/clinical/records/{id}/prescriptions` (HOD thuần túy) | **HTTP 403 Forbidden** |
| **TC-HOD-13** | Xem bệnh án khoa mình | `GET /api/clinical/records/{id}` (HOD khoa tương ứng) | **HTTP 200 OK** |
| **TC-HOD-14** | Xem bệnh án khoa khác | `GET /api/clinical/records/{otherDeptRecordId}` (HOD) | **HTTP 403 Forbidden** |
| **TC-HOD-15** | Xem lịch sử bệnh nhân | `GET /api/clinical/patients/{id}/records` (HOD) | **HTTP 200 OK**, chỉ trả về các đợt khám tại khoa HOD |
| **TC-HOD-16** | Tạo buồng khoa khác | `POST /api/departments/rooms` (HOD) | **HTTP 403 Forbidden** hoặc tự ép về khoa HOD |
| **TC-HOD-17** | Sửa trạng thái giường khác | `PUT /api/inpatient/beds/{otherBedId}/status` (HOD) | **HTTP 403 Forbidden** |
| **TC-HOD-18** | Fallback UI khoa | Màn hình `DepartmentManagePage.jsx` khi HOD chưa gán khoa | Hiện cảnh báo, `selectedDept = null`, không tự chọn `formatted[0]` |

---

## 4. QUẢN LÝ RỦI RO & BẢO TOÀN HỆ THỐNG (BLAST RADIUS)

- **Quyền ADMIN:** Không bị ảnh hưởng. Tất cả logic kiểm tra ranh giới khoa phòng và dữ liệu đều kiểm tra `if (isHod && !isAdmin)`.
- **Quyền BÁC SĨ:** Không bị ảnh hưởng. Các API khám bệnh lâm sàng được bảo vệ chặt chẽ hơn vì chỉ cho phép đúng bác sĩ điều trị thực hiện.
- **Biên dịch & Test:** Đảm bảo `mvnw.cmd test-compile -DskipTests` và `npm run build` chạy thành công 100% trước khi kết thúc công việc.

---
*Kế hoạch đã sẵn sàng. Hệ thống sẽ giữ nguyên trạng thái và chỉ thực hiện mã nguồn khi nhận được lệnh chính xác: **"ENTER EXECUTE MODE"**.*
