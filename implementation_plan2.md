# Kế hoạch Triển khai Module 2: Bảng hàng đợi gọi số khám bệnh cho Bác sĩ & Trả kết quả xét nghiệm cận lâm sàng

Hệ thống cung cấp quy trình khép kín theo mô hình bệnh viện thông minh (TheDuckHospital):
1. **Bảng hàng đợi gọi số khám bệnh cho Bác sĩ (Doctor Queue & Calling System)**: Bác sĩ trực buồng khám theo dõi danh sách bệnh nhân theo số thứ tự (STT), trạng thái chờ khám/đang khám/hoàn tất, bấm gọi số tiếp theo (kèm âm thanh / visual highlight) để tiếp nhận và mở ngay hồ sơ bệnh án.
2. **Khung khám bệnh & Tương tác Cận lâm sàng động**: Chỉ định dịch vụ xét nghiệm/chẩn đoán hình ảnh từ danh mục thực tế từ Database, xem trạng thái và kết quả xét nghiệm trực tiếp trong hồ sơ bệnh án.
3. **Phân hệ Kỹ thuật viên Trả kết quả xét nghiệm (Lab Tests & Imaging Results Portal)**: Dành cho Kỹ thuật viên phòng Lab / Bác sĩ CĐHA tiếp nhận chỉ định, nhập kết quả, đính kèm link hình ảnh/PDF, và hoàn tất trả kết quả để Bác sĩ điều trị ra chẩn đoán và kê đơn.

---

## Các thành phần thay đổi (Proposed Changes)

### 1. Backend (Spring Boot 3.4.3 / Java 21)

- **DTOs**:
  - `DoctorQueueResponse.java`: Trả về danh sách bệnh nhân hàng đợi gồm STT, Mã đặt khám, Họ tên, Giới tính, Tuổi, Triệu chứng, Khung giờ, Trạng thái khám, Trạng thái cận lâm sàng.
  - `LabTestDetailResponse.java`: Trả về chi tiết chỉ định xét nghiệm cho phòng Lab (Mã XN, Tên dịch vụ, Bệnh nhân, Bác sĩ chỉ định, Kết quả, URL ảnh/kết quả, Trạng thái).
  - `MedicalServiceDto.java` & `MedicineDto.java` (nếu cần) hoặc trả trực tiếp entity/DTO.

- **Repositories**:
  - `BookingRepository.java`: Thêm phương thức truy vấn hàng đợi bệnh nhân theo Bác sĩ và Ngày khám (`findAllByDoctor_Account_UserIdAndBookingDate...`).
  - `MedicalTestRepository.java`: Thêm phương thức truy vấn tất cả chỉ định xét nghiệm (`findAllByDeletedFalseOrderByCreatedAtDesc`, `findAllByStateAndDeletedFalse...`).

- **Services**:
  - `ClinicalExaminationService.java` & `ClinicalExaminationServiceImpl.java`:
    - `getDoctorQueue(UUID doctorUserId, LocalDate date)`: Lấy hàng đợi khám của Bác sĩ.
    - `getAllActiveServices()`: Lấy danh mục dịch vụ cận lâm sàng từ DB.
    - `getAllMedicines()`: Lấy danh mục thuốc trong kho có tồn kho > 0.
    - `getLabTests(MedicalTestState state)`: Lấy danh sách xét nghiệm cho Kỹ thuật viên.

- **Controllers**:
  - `ClinicalExaminationController.java`:
    - `GET /api/clinical/doctor/queue`: API hàng đợi khám bệnh của Bác sĩ.
    - `GET /api/clinical/services`: API lấy danh mục dịch vụ cận lâm sàng.
    - `GET /api/clinical/medicines`: API lấy danh mục thuốc kho.
    - `GET /api/clinical/lab/tests`: API danh sách chỉ định xét nghiệm phòng Lab.
    - `GET /api/clinical/queue/public`: API bảng hiển thị số gọi khám công cộng (cho màn hình tivi phòng chờ).

---

### 2. Frontend (React 18 / Material-UI / Vite)

- **Nâng cấp `ExaminationPage.jsx`**:
  - Tích hợp **Doctor Queue Sidebar / Panel**: Hiển thị danh sách bệnh nhân hôm nay theo STT với bộ lọc (Tất cả, Đang chờ, Đang khám, Hoàn thành).
  - Nút **"Gọi Khám Tiếp Theo"** (One-click Call Next) tự động tiếp nhận bệnh nhân có STT nhỏ nhất đang chờ, phát tín hiệu âm thanh thông báo.
  - Tích hợp theo dõi tiến trình xét nghiệm: Xem ngay kết quả xét nghiệm đã trả về từ KTV phòng Lab để đối chiếu khi chẩn đoán.
  - Cập nhật modal `AssignTestsModal.jsx` và `PrescriptionModal.jsx` kết nối API thật lấy Dịch vụ và Thuốc từ Database.

- **Xây dựng mới `LabTestResultsPage.jsx` (`/doctor/lab-tests` hoặc `/lab/tests`)**:
  - Giao diện chuyên dụng cho Kỹ thuật viên Lab / CĐHA.
  - Danh sách bảng chỉ định: Lọc theo trạng thái `WAITING` (Chờ thực hiện) và `COMPLETED` (Đã có kết quả).
  - Dialog nhập kết quả xét nghiệm: Trị số xét nghiệm, kết luận, upload/nhập link ảnh X-Quang/siêu âm.
  - Nút "Trả kết quả & Báo cho Bác sĩ" cập nhật trạng thái thời gian thực.

- **Xây dựng mới `QueueDisplayPage.jsx` (`/queue-display`)**:
  - Màn hình hiển thị số thứ tự phòng khám phong cách Tivi Bệnh viện (Hospital LED Display Board) hiển thị số đang khám và các số chuẩn bị.

- **Cấu hình Menu & Điều hướng**:
  - Cập nhật `AppRoutes.jsx`, `MainLayout.jsx`, `AdminLayout.jsx` để thêm các menu cho Bác sĩ và Kỹ thuật viên.

---

## Kế hoạch kiểm thử (Verification Plan)

### 1. Backend Integration Tests:
- Viết test script NodeJS / Mocha / Axios (`test_module2.js`):
  - Tạo Booking mẫu -> Gọi API `/api/clinical/doctor/queue` kiểm tra danh sách và STT.
  - Bác sĩ gọi khám -> Mở hồ sơ bệnh án (`/api/clinical/start`).
  - Bác sĩ chỉ định 2 xét nghiệm (`/api/clinical/records/{id}/tests`).
  - KTV Lab xem danh sách pending (`/api/clinical/lab/tests`) -> Cập nhật kết quả (`/api/clinical/tests/{id}/result`).
  - Bác sĩ xem hồ sơ thấy kết quả đã hoàn tất -> Ghi nhận chẩn đoán và kê toa thuốc.

### 2. Frontend UI Build & Verification:
- Chạy `npm run build` trong `hospital-ui` để đảm bảo không có lỗi TypeScript/JSX.
- Kiểm tra trực quan giao diện hàng đợi và luồng trả kết quả xét nghiệm.
