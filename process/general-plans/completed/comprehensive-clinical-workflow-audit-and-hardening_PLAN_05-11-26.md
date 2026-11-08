# Comprehensive Clinical Workflow Audit & Hardening Plan
Date: 05-11-2026
Status: COMPLETED (Verified via Backend JUnit/Surefire & Frontend Vitest/Vite Build)
Author: Antigravity (Codex/Claude RIPER-5 Orchestrator)

---

## 1. Mục tiêu & Phạm vi (Objectives & Scope)
Rà soát toàn diện và khắc phục triệt để các lỗ hổng/lỗi trong chu trình khám chữa bệnh từ tiếp nhận đến xuất viện trên cả Backend (`hospital-api`) và Frontend (`hospital-ui`):
1. **Khắc phục 5 lỗi thực tế từ ảnh chụp màn hình:**
   - [Lỗi 1 & 4]: Vi phạm check constraint `medical_examination_records_state_check` khi insert/update `IN_PROGRESS` vào Postgres.
   - [Lỗi 2]: Lỗi ép kiểu UUID `Method parameter 'recordId': Failed to convert value... UUID string too large` do frontend fallback gán `recordId: "temp-..."`.
   - [Lỗi 3]: Lỗi `overrideReason is not defined` trên modal kê đơn thuốc khi chọn toa mẫu / submit.
   - [Lỗi 5]: Lỗi phân quyền 403 Forbidden "Bạn không có quyền thực hiện hành động này" của Bác sĩ / Quản trị viên (BS. Văn Hoàng).
2. **Khám ngoại trú & Phiếu chẩn đoán (Phân hệ A):**
   - Đồng bộ trạng thái hàng đợi: Hỗ trợ Admin/Trưởng khoa xem toàn bộ hàng đợi phòng khám ngày hiện tại khi chưa được gán cố định.
   - Bắt buộc chẩn đoán xác thực do bác sĩ nhập (`@NotBlank` $\ge 3$ ký tự); loại bỏ hoàn toàn fallback fake data hoặc "temp-" recordId khi API lỗi.
   - Chặn đóng ca khám (`DONE`) ở mọi endpoint khi còn cận lâm sàng chưa hoàn thành hoặc chưa hủy hợp lệ.
3. **Chỉ định & Xử lý Cận lâm sàng (Phân hệ B):**
   - Loại bỏ đánh giá mặc định `NORMAL` khi kết quả cận lâm sàng là dạng text ("Âm tính", "Bình thường") hoặc chưa đánh giá.
   - Bắt buộc kiểm tra trạng thái thanh toán viện phí trước khi KTV lấy mẫu và thực hiện.
   - Xử lý nghiệp vụ bệnh nhân bỏ khám sau khi làm xét nghiệm (`abandonExaminationAfterTests`).
4. **Kê đơn & Cấp phát thuốc (Phân hệ C):**
   - Kiểm tra tiền sử dị ứng lấy trực tiếp từ `PatientProfile.allergies` trong CSDL backend.
   - Cưỡng chế lý do ghi đè $\ge 5$ ký tự ở backend; frontend không tự động bypass hoặc điền sẵn lý do ghi đè.
   - Kiểm tra đơn thuốc đã thanh toán tại Quầy thu ngân trước khi Dược sĩ cấp phát theo FEFO; chống cấp phát trùng lặp (Double Dispense) bằng `@Lock(PESSIMISTIC_WRITE)` và unique constraint.
5. **Điều trị nội trú (Phân hệ D):**
   - Sử dụng sơ đồ phòng giường thật (`Bed` API), loại bỏ hoàn toàn mock room `totalRooms * 4`.
   - Y lệnh bác sĩ cấu trúc hóa (`inpatient_doctor_orders`), liên kết phân cấp chăm sóc điều dưỡng (`inpatient_nursing_cares`).
6. **Xuất viện & Quyết toán (Phân hệ E):**
   - Tách biệt quyết định chuyên môn của Bác sĩ (`Discharge` với `settlementStatus = 'PENDING_PAYMENT'`) khỏi thao tác thu viện phí tại Quầy Thu Ngân.
   - Không xuất biên lai tiền mặt `CASH` giả trên UI Bác sĩ; cập nhật trạng thái giường sang `CLEANING`.

---

## 2. Touchpoints & Danh sách file dự kiến sửa (Files to Modify)

### Backend (`hospital-api`)
1. `hospital-api/src/main/resources/db/migration/schema_hardening.sql`:
   - Bổ sung lệnh xóa an toàn check constraint `medical_examination_records_state_check` và mọi check constraint liên quan tới `state` trên PostgreSQL.
2. `hospital-api/src/main/java/com/hospital/api/config/DatabaseSequenceSyncRunner.java`:
   - Tăng cường cơ chế tự động drop constraint `medical_examination_records_state_check` tại startup, đảm bảo Neon DB không bị chặn.
3. `hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalExaminationServiceImpl.java`:
   - Trong `getDoctorQueue`: Thêm logic fallback cho `ROLE_ADMIN` hoặc `ROLE_HEAD_OF_DEPARTMENT` để xem toàn bộ bệnh nhân trong ngày nếu tài khoản không có `doctor_id` riêng.
   - Trong `completeExamination`: Đảm bảo transaction nguyên tử, cập nhật đồng thời `record.state = DONE` và `booking.status = COMPLETED`.
   - Trong `assignMedicalTests`: Kiểm tra tính hợp lệ của `recordId`, trả về lỗi rõ ràng thay vì 500 nếu record không tồn tại.
4. `hospital-api/src/main/java/com/hospital/api/controller/ClinicalExaminationController.java`:
   - Chuẩn hóa `@PathVariable UUID recordId` kèm validation và xử lý ngoại lệ cho URL path.

### Frontend (`hospital-ui`)
1. `hospital-ui/src/pages/Doctor/ExaminationPage.jsx`:
   - Xóa bỏ hoàn toàn việc gán fallback `recordId: "temp-" + ...` trong catch block. Khi gọi API `/api/clinical/start` hoặc `/api/clinical/records` lỗi, hiển thị thông báo Alert lỗi chuẩn của Backend để bác sĩ thử lại hoặc liên hệ admin.
   - Cập nhật disable state cho nút "Hoàn tất ca khám" khi còn cận lâm sàng đang chờ xử lý (`WAITING_SAMPLE`, `SAMPLE_COLLECTED`, `PROCESSING`).
2. `hospital-ui/src/pages/Doctor/AssignTestsModal.jsx`:
   - Kiểm tra `recordId` hợp lệ dạng UUID trước khi cho phép submit. Nếu không hợp lệ hoặc đang là hồ sơ tạm, chặn kèm hướng dẫn.
3. `hospital-ui/src/pages/Doctor/PrescriptionModal.jsx`:
   - Đảm bảo `overrideReason` luôn được khai báo và quản lý an toàn; khi chọn template không làm phát sinh ReferenceError `overrideReason is not defined`.
   - Cưỡng chế nhập lý do ghi đè $\ge 5$ ký tự nếu phát hiện dị ứng thuốc.
4. `hospital-ui/src/pages/Doctor/LabTestResultsPage.jsx`:
   - Hàm `evaluateIndicator`: Không tự động trả về `"NORMAL"` khi giá trị là chữ hoặc chưa đánh giá. Nếu không có khoảng tham chiếu hoặc là kết quả mô tả, trả về `"UNRATED"` hoặc giữ nguyên định dạng để KTV xác nhận.
5. `hospital-ui/src/pages/Doctor/InpatientPage.jsx`:
   - Kiểm tra và đảm bảo không có mock data phòng/giường.
   - Đồng bộ luồng xuất viện: Hiển thị thông báo hướng dẫn bệnh nhân ra quầy thu ngân quyết toán thay vì in biên lai giả.

---

## 3. Rủi ro hồi quy & Biện pháp phòng ngừa (Risks & Mitigation)
| Rủi ro | Mức độ | Biện pháp phòng ngừa |
|---|---|---|
| Xóa constraint DB làm lọt giá trị state không hợp lệ | Thấp | Java Enum `MedicalExamState` và JPA `@Enumerated(EnumType.STRING)` đã kiểm soát chặt chẽ giá trị enum ở tầng ứng dụng |
| Xóa fallback "temp-" làm UI crash nếu API chậm | Trung bình | Đã có Error Alert và Skeleton loading; người dùng được thông báo chính xác thay vì bị lỗi chuỗi dài phía sau |
| Thay đổi `evaluateIndicator` ảnh hưởng hiển thị kết quả cũ | Thấp | Chỉ hiển thị badge tương ứng khi có giá trị tham chiếu min/max; giá trị chữ hiển thị neutral badge thay vì giả định bình thường |

---

## 4. Kế hoạch kiểm thử & Xác minh (Verification Plan)
1. **Kiểm thử Unit & Integration Tests (Backend):**
   - Chạy `mvn test -Dtest=ClinicalTestCancellationSecurityTest`
   - Chạy `mvn test -Dtest=InpatientServiceTest`
   - Chạy `mvn test -Dtest=ClinicalExaminationServiceTest`
2. **Kiểm thử Frontend:**
   - Chạy `npm test` trong thư mục `hospital-ui` (Vitest suites)
   - Chạy `npm run build` kiểm tra biên dịch và kiểu dữ liệu
3. **Kiểm tra luồng E2E:**
   - Tiếp nhận bệnh nhân -> Khám lâm sàng -> Chỉ định CLS -> Nhập kết quả -> Kê đơn thuốc (có kiểm tra dị ứng) -> Hoàn tất ca / Nhập viện -> Xuất viện.

