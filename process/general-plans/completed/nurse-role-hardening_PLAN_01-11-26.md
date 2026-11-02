# Kế Hoạch Triển Khai: Chuẩn Hóa Chức Năng & Phân Quyền Vai Trò Điều Dưỡng (Nurse Role Hardening)

- **Mode:** PLAN
- **Date:** 01-11-2026
- **Status:** COMPLETED
- **Scope Ref:** Báo cáo khảo sát RESEARCH và định hướng thiết kế: Điều dưỡng là nhân sự dùng chung toàn viện (Hospital-wide Shared Pool), tập trung bảo vệ tính chính xác của nghiệp vụ điều phối vào đúng buồng/chuyên khoa đã đăng ký khám, lưu trữ dữ liệu tiếp nhận thật vào CSDL, loại bỏ số liệu sinh hiệu giả và thu hồi quyền hạn dư thừa.

---

## 1. Mục Tiêu & Ranh Giới Nghiệp Vụ

1. **Tiếp nhận ngoại trú vãng lai thật vào CSDL:**
   - Xóa bỏ việc tạo ID ảo tạm thời `BK-MANUAL-...` ở state React.
   - Xây dựng API backend `POST /api/nurse/reception/walk-in` xử lý giao dịch nguyên khối (Atomic Transaction): Tạo hoặc tìm `PatientProfile`, tạo `Booking` có ngày khám hôm nay, tự động sinh `queueNumber` và phát hành `CounterTicket` gắn liền với quầy tiếp đón.
2. **Loại bỏ dữ liệu sinh hiệu giả mạo:**
   - Xóa bỏ toàn bộ các giá trị mặc định gán cứng (`168cm`, `62kg`, `120/80 mmHg`) trong form nhập liệu và các toán tử fallback `|| 168` tại giao diện `NurseReceptionPage.jsx`.
   - Chỉ lưu vào hồ sơ y tế EHR (`MedicalObservation`) các chỉ số thực tế được điều dưỡng đo và nhập. Nếu không đo, hiển thị thể trạng `"Chưa đo sinh hiệu"` đúng chuẩn Bộ Y tế.
3. **Bảo đảm tính chính xác & an toàn khi điều phối buồng khám:**
   - Giữ vững quy tắc ràng buộc chuyên khoa tại backend (`BookingReceptionTransition.java:173-199`).
   - Sửa lỗi nuốt exception tại giao diện `CounterManagementPanel.jsx`: Bỏ `.catch(console.warn)`, hiển thị thông báo lỗi rõ ràng nếu điều phối thất bại (lệch khoa), không tự động đóng modal và không phát loa thông báo sai lệch.
   - Tự động lọc danh sách buồng khám chỉ hiển thị các phòng thuộc đúng chuyên khoa của bệnh nhân.
4. **Minh bạch nguồn thu viện phí:**
   - Bổ sung trường `receptionSource` (`ONLINE_APPOINTMENT`, `KIOSK_TICKET`, `COUNTER_WALKIN`) vào các DTO biên lai/hóa đơn (`CashierPendingBillResponse`, `ClinicReceiptResponse`, `NurseQueueResponse`).
   - Hiển thị Badge trực quan trên giao diện: 🔵 Lịch hẹn qua Web, 🟣 Bốc số Ki-ốt, 🟠 Tiếp đón tại quầy.
5. **Thu hồi quyền hạn dư thừa (Separation of Duties - SoD):**
   - **Dược:** Thu hồi quyền Duyệt xuất/nhập kho (`approveAndExecuteTransfer`) và Phát thuốc kho dược (`dispensePrescription`) khỏi `ROLE_NURSE` tại `PharmacyInventoryController`.
   - **Thu ngân:** Thu hồi quyền xem toàn bộ lịch sử thanh toán toàn viện (`GET /api/cashier/history`) khỏi `ROLE_NURSE` tại `CashierController`, chỉ giữ quyền tra cứu viện phí chưa đóng và thực hiện thu tiền tại quầy.

---

## 2. Danh Sách Tệp Can Thiệp (Touchpoints)

### Backend (Spring Boot 3.4 / Java 21)
1. `hospital-api/src/main/java/com/hospital/api/dto/request/NurseWalkInReceptionRequest.java` *(Tạo mới)*: DTO tiếp nhận bệnh nhân vãng lai tại quầy.
2. `hospital-api/src/main/java/com/hospital/api/dto/response/NurseQueueResponse.java` *(Chỉnh sửa)*: Bổ sung trường `receptionSource`.
3. `hospital-api/src/main/java/com/hospital/api/dto/response/ClinicReceiptResponse.java` *(Chỉnh sửa)*: Bổ sung trường `receptionSource`.
4. `hospital-api/src/main/java/com/hospital/api/dto/response/CashierPendingBillResponse.java` *(Chỉnh sửa)*: Bổ sung trường `receptionSource`.
5. `hospital-api/src/main/java/com/hospital/api/service/NurseReceptionService.java` *(Chỉnh sửa)*: Khai báo phương thức `admitWalkInPatient`.
6. `hospital-api/src/main/java/com/hospital/api/service/impl/NurseReceptionServiceImpl.java` *(Chỉnh sửa)*: Triển khai logic tiếp nhận bệnh nhân vãng lai, sinh hồ sơ, booking, số thứ tự và gắn counter ticket.
7. `hospital-api/src/main/java/com/hospital/api/controller/NurseReceptionController.java` *(Chỉnh sửa)*: Mở endpoint `POST /api/nurse/reception/walk-in` (yêu cầu `hasAnyRole('NURSE', 'ADMIN')`).
8. `hospital-api/src/main/java/com/hospital/api/controller/PharmacyInventoryController.java` *(Chỉnh sửa)*: Xóa `ROLE_NURSE` khỏi `approveAndExecuteTransfer` và `dispensePrescription`.
9. `hospital-api/src/main/java/com/hospital/api/controller/CashierController.java` *(Chỉnh sửa)*: Phân tách `@PreAuthorize` chi tiết theo từng phương thức, xóa `ROLE_NURSE` khỏi `getPaymentHistory`.

### Frontend (React / Vite)
10. `hospital-ui/src/pages/nurse/NurseReceptionPage.jsx` *(Chỉnh sửa)*:
    - Xóa bỏ state gán cứng (168, 62, 120/80) và các fallback `|| 168`.
    - Viết lại `handleCreateProfileSubmit` để gọi API `POST /api/nurse/reception/walk-in` thật của backend.
    - Hiển thị badge nhận diện nguồn tiếp nhận trên thẻ bệnh nhân.
11. `hospital-ui/src/components/nurse/CounterManagementPanel.jsx` *(Chỉnh sửa)*:
    - Xóa bỏ `.catch(console.warn)` trong luồng điều phối; xử lý ngoại lệ và hiển thị thông báo lỗi rõ ràng.
    - Lọc danh sách buồng khám mục tiêu theo đúng chuyên khoa của bệnh nhân.
    - Hiển thị badge phân loại nguồn thu (Lịch hẹn / Ki-ốt / Quầy).

---

## 3. Các Giai Đoạn Triển Khai Chi Tiết (Phases)

### Giai Đoạn 1: API Tiếp Nhận Bệnh Nhân Vãng Lai Tại Quầy (Walk-in Reception API)
- Tạo record `NurseWalkInReceptionRequest`:
  - `fullName`, `phoneNumber`, `identityNumber`, `gender`, `dateOfBirth`, `address`, `departmentId`, `symptoms`, `isPriority`, `priorityReason`, `counterId`.
- Cập nhật `NurseReceptionServiceImpl.admitWalkInPatient`:
  - Tìm `Account` theo SĐT hoặc tạo tài khoản mặc định (vai trò `ROLE_PATIENT`).
  - Tìm hoặc tạo mới `PatientProfile` độc lập liên kết với Account của bệnh nhân (không liên kết vào tài khoản điều dưỡng).
  - Tạo `Booking` trong trạng thái `PENDING_PAYMENT`, `bookingDate = today`, `isPaid = false`.
  - Gọi `reception.ensureTicket(booking, counterType, false)` để cấp mã phiếu STT quầy dịch vụ (ví dụ `TH-05`).
  - Trả về `NurseQueueResponse` mang đầy đủ thông tin lượt khám thật vừa được lưu vào CSDL.
- Mở endpoint `POST /api/nurse/reception/walk-in` trong `NurseReceptionController`.

### Giai Đoạn 2: Tinh Gọn Phân Quyền Bảo Mật (Prune Privileges)
- Tại `PharmacyInventoryController`:
  - Đổi `@PreAuthorize` của `approveAndExecuteTransfer` thành `hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT', 'PHARMACIST')`.
  - Đổi `@PreAuthorize` của `dispensePrescription` thành `hasAnyRole('PHARMACIST', 'ADMIN')`.
- Tại `CashierController`:
  - Bỏ `@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'NURSE')")` ở mức class.
  - Gắn `@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'NURSE')")` vào `getPendingBills` và `processPayment`.
  - Gắn `@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")` vào `getPaymentHistory`.

### Giai Đoạn 3: Làm Giàu DTO Phân Biệt Nguồn Thu (Reception Source)
- Thêm trường `receptionSource` vào `NurseQueueResponse`, `ClinicReceiptResponse`, `CashierPendingBillResponse`.
- Logic nhận diện nguồn:
  - Nếu `ticketCode` bắt đầu bằng `"AP-"` hoặc có lịch đặt trước qua web $\rightarrow$ `"ONLINE_APPOINTMENT"`.
  - Nếu booking được tạo từ cây ki-ốt (`KioskBooking`) $\rightarrow$ `"KIOSK_TICKET"`.
  - Nếu booking được tạo trực tiếp tại quầy tiếp đón $\rightarrow$ `"COUNTER_WALKIN"`.

### Giai Đoạn 4: Chuẩn Hóa Giao Diện Điều Dưỡng (Frontend Overhaul)
- **Trong `NurseReceptionPage.jsx`:**
  - Làm sạch form sinh hiệu: Đặt `height: ""`, `weight: ""`, `bloodPressure: ""`, `heartRate: ""`, `temperature: ""`, `spO2: ""`.
  - Loại bỏ các fallback giá trị giả tại `handleQrCheckInSubmit`.
  - Viết lại `handleCreateProfileSubmit` gọi API `POST /api/nurse/reception/walk-in`. Cập nhật danh sách hàng đợi bằng kết quả trả về từ server.
- **Trong `CounterManagementPanel.jsx`:**
  - Xóa bỏ `.catch(console.warn)` ở các lời gọi `/tickets/{id}/complete` và `/reception/dispatch`.
  - Khi API điều phối lỗi (ví dụ 400 Bad Request): Không phát loa, không đóng modal, bật thông báo lỗi `feedback` màu đỏ cho điều dưỡng.
  - Dropdown chọn buồng khám: Lọc tự động chỉ hiển thị các buồng có chuyên khoa khớp với chuyên khoa khám của bệnh nhân.
  - Bổ sung Chip hiển thị nguồn tiếp nhận (Lịch hẹn / Ki-ốt / Quầy).

### Giai Đoạn 5: Kiểm Thử Toàn Diện & Đóng Gói (Verification)
- Chạy biên dịch kiểm tra tính tương thích cú pháp:
  - Backend: `cd hospital-api; .\mvnw.cmd test-compile -DskipTests`
  - Frontend: `cd hospital-ui; npm run build`
- Chạy bộ kiểm thử tự động Vitest frontend: `cd hospital-ui; npx vitest run`.

---

## 4. Đánh Giá Tác Động & Vùng Ảnh Hưởng (Blast Radius)

- **Độ an toàn cho Bác sĩ & Bệnh nhân:** Không thay đổi bất kỳ logic khám chữa bệnh hay cấu trúc lịch trực của Bác sĩ.
- **Tính toàn vẹn CSDL:** Không thay đổi cấu trúc bảng CSDL (không thêm/sửa cột DDL), không tạo rủi ro xung đột dữ liệu.
- **Tương thích ngược:** Các luồng đặt lịch qua web và bốc số ki-ốt giữ nguyên 100%.

---

## 5. Kế Hoạch Xác Minh Khi Có Lệnh Thực Thi (Verification Evidence)

1. `mvnw test-compile -DskipTests`: Phải đạt `BUILD SUCCESS`.
2. `npm run build`: Phải đạt build thành công không lỗi syntax hoặc JSX.
3. `npx vitest run`: 12 test suites (50 tests) phải tiếp tục PASS 100%.
4. Thao tác tiếp đón vãng lai: Tạo bệnh nhân tại giao diện quầy, kiểm tra bản ghi được sinh ra trong CSDL và hiển thị trong hàng đợi bác sĩ.
5. Thao tác điều phối lệch khoa: Chọn cố tình buồng khám khác khoa $\rightarrow$ Giao diện phải chặn và báo lỗi rõ ràng.

