# KẾ HOẠCH TRIỂN KHAI: RÀ SOÁT, CHUẨN HÓA VÀ KHẮC PHỤC TRIỆT ĐỂ CÁC LỖI QUY TRÌNH KHÁM CHỮA BỆNH CỦA BÁC SĨ (LÂM SÀNG, NỘI TRÚ, DƯỢC & PHÂN QUYỀN)

**Mã kế hoạch:** PLAN-DOCTOR-WORKFLOW-HARDENING-04-11-26  
**Ngày lập:** 04/11/2026  
**Trạng thái:** DỰ THẢO - CHỜ DUYỆT (PENDING APPROVAL - RIPER-5 PLAN MODE)  
**Quy chuẩn áp dụng:** RIPER-5 / AGENTS.md / vc-generate-plan  
**Đối tượng thực hiện:** Orchestrator / vc-execute-agent  

---

## 1. TỔNG QUAN & BỐI CẢNH (EXECUTIVE SUMMARY)

### 1.1. Bối cảnh rà soát thực tế mã nguồn
Thực hiện theo chỉ đạo tại `AGENTS.md`, `process/context/all-context.md` và đối chiếu với kế hoạch hoàn tất trước đó (`clinical-workflows-and-inpatient-hardening_PLAN_02-11-26.md`), toàn bộ mã nguồn của `hospital-api` (Spring Boot 3.4.1) và `hospital-ui` (React 18 + Vite + MUI) đã được thẩm tra độc lập từng dòng lệnh.

Kết quả rà soát thực tế cho thấy các phát hiện lỗi kỹ thuật và nghiệp vụ lâm sàng vẫn **đang tồn tại trực tiếp** trong mã nguồn hiện hành và tái hiện được 100%:

1. **Khám ngoại trú (Outpatient Exam Lifecycle):**
   - Lỗi logic nghịch đảo: Ràng buộc kiểm tra xét nghiệm tồn đọng `hasUnfinishedTests` bị đặt nhầm vào `makeDiagnosis` (dòng 446–452 `ClinicalExaminationServiceImpl.java`), khiến bác sĩ bị chặn ngay cả khi chỉ muốn lưu chẩn đoán sơ bộ/bổ sung diễn tiến trong khi bệnh nhân đang đi xét nghiệm. Ngược lại, hàm đóng ca thực sự `completeExamination` (dòng 510–555) lại **hoàn toàn bỏ quên** kiểm tra này, cho phép đóng ca sang `DONE` dù xét nghiệm đang chờ hoặc chưa hoàn tất!
   - Tuyến API kê đơn `createPrescription` (dòng 647 `ClinicalExaminationServiceImpl.java`) tự ý ép trạng thái hồ sơ sang `record.setState(MedicalExamState.DONE)` mà không hề kiểm tra xem xét nghiệm đã hoàn thành chưa, và không kiểm tra có chẩn đoán xác định (`finalDiagnosis`) hay chưa.
   - Thao tác đóng ca vắng mặt `abandonExaminationAfterTests` (dòng 240–248) tự động điền các chuỗi lý do và phác đồ mặc định nếu bác sĩ để trống thay vì cưỡng chế bác sĩ phải nhập lý do lâm sàng xác thực.
   - Giao diện `ExaminationPage.jsx` (dòng 724) tự động gán fallback `treatmentPlan: treatmentPlan?.trim() || "Theo dõi sức khỏe định kỳ, tái khám khi có dấu hiệu bất thường"`, vi phạm nguyên tắc cấm bịa đặt dữ liệu lâm sàng.

2. **Kê đơn và Dị ứng thuốc (Clinical Decision Support - CDS):**
   - Hàm `checkPrescriptionSafety` (dòng 685–698 `ClinicalExaminationServiceImpl.java`) **hoàn toàn không truy xuất trường `allergies`** đã lưu trong thực thể CSDL `PatientProfile` (và `record.getPatientProfile().getAllergies()`). Nếu phía client không truyền `patientAllergies` trong request, hàm chỉ tìm chữ "dị ứng" trong chuỗi văn bản tự do của `symptoms` và `treatmentPlan` của lần khám này. Điều này làm bỏ lọt 100% tiền sử dị ứng đã được ghi nhận trong hồ sơ bệnh nhân từ trước, gây nguy cơ sốc phản vệ chết người!
   - Hàm `createPrescription` (dòng 594–604) khi phát hiện cảnh báo nguy hiểm (`criticalCount > 0`) chỉ kiểm tra cờ `Boolean.TRUE.equals(request.overrideAllergyWarning())` rồi ghi log cảnh báo; **hoàn toàn không kiểm tra `request.overrideReason()`**, cho phép ghi đè mà không cần bất kỳ lý do lâm sàng nào. Thực thể `Prescription` trong DB cũng thiếu trường lưu `overrideReason`.
   - Giao diện `PrescriptionModal.jsx` (dòng 411–413) tự động điền sẵn chuỗi `"Bác sĩ lâm sàng xác nhận ghi đè cảnh báo dị ứng"` vào `effectiveOverrideReason`, biến việc ghi đè an toàn thành hình thức.

3. **Phân quyền truy cập hồ sơ (Scoped RBAC & Data Isolation):**
   - `InpatientController.getActiveAdmissions` (dòng 93–96) gọi trực tiếp `inpatientService.getActiveAdmissions()` mà không truyền `UserPrincipal`. Phương thức nạp chồng của service ngầm định gán `isAdmin = true`, biến mọi tài khoản nhân viên y tế (Bác sĩ, Điều dưỡng) thành quản trị viên toàn viện, xem được toàn bộ danh sách bệnh nhân nội trú của tất cả các khoa khác.
   - Hàm trợ giúp `checkIsStaff` trong `InpatientController` (dòng 57–67) chỉ kiểm tra có role nhân viên bất kỳ hay không. Mọi bác sĩ/điều dưỡng đều có thể đọc bệnh án nội trú, xem nhật ký theo dõi của bệnh nhân thuộc khoa khác mà không bị kiểm tra phạm vi phân công (`departmentId` hoặc `treatingDoctor`).
   - Các endpoint thao tác hồ sơ ngoại trú trong `ClinicalExaminationController` (`assignMedicalTests`, `makeDiagnosis`, `completeExamination`, `createPrescription`) chỉ gắn `@PreAuthorize("hasRole('DOCTOR')")`, thiếu kiểm tra đối chiếu xem Bác sĩ đang gửi yêu cầu có đúng là Bác sĩ phụ trách ca khám (`record.getDoctor()`) hoặc Trưởng khoa (`HEAD_OF_DEPARTMENT`) của khoa đó hay không.

4. **Điều trị nội trú (Inpatient Treatment Hardening):**
   - Giao diện `InpatientPage.jsx` tồn lưu nhiều dữ liệu giả lập từ giai đoạn nguyên mẫu:
     * Dòng 67–98: Mảng `PROGRESSION_PRESETS` chứa 5 mẫu diễn tiến kèm số đo sinh hiệu giả (`temp: 37.0`, `bp: 120/80`, `hr: 80`, v.v.).
     * Dòng 101–120: Mảng `DRUG_PROTOCOL_PRESETS` nạp sẵn danh sách thuốc mẫu tự động.
     * Dòng 414–428: Tự động gán fallback sinh hiệu giả (`temperature: "36.8"`, `heartRate: "78"`, `spO2: "98"`, cùng 3 loại thuốc mẫu tiêm truyền) khi mở phiếu điều trị.
     * Dòng 210–213: Gán sẵn văn bản tóm tắt xuất viện và lời dặn mẫu.
     * Dòng 223: Gán sẵn chẩn đoán nhập viện mẫu `"Cần theo dõi và điều trị nội trú"`.
   - Giao diện Tờ điều trị gọi API `/api/inpatient/{id}/daily-records` (nhật ký tự do) thay vì tích hợp với API Y lệnh Bác sĩ có cấu trúc (`/api/inpatient/{id}/doctor-orders`).
   - Sơ đồ giường bệnh: Dòng 356, 391–393 dùng số giường giả `totalRooms * 4` và lưu trạng thái `cleaningBeds` trong RAM React state thay vì gọi API thực thể `/api/inpatient/beds`. Chuyển giường gọi `PUT /transfer?newRoomId=...` không cập nhật thực thể giường `Bed`.
   - Xuất viện & Quyết toán: Backend `InpatientServiceImpl.dischargePatient` chỉ lưu thực thể `Discharge` mà không tạo hoặc liên kết trạng thái thanh toán viện phí (`isPaid = false`, `settlementStatus = PENDING_PAYMENT`) với phân hệ thu ngân (`CounterType.INPATIENT` / `TransactionType.PAY_INPATIENT_FEE`).

5. **Hàng đợi khám (Doctor Queue & Payment Verification):**
   - Hàm `isWaitingPatient` tại `ExaminationPage.jsx` (dòng 543–544) kiểm tra:
     `isWaitingPatient = (p) => (p.status === "CONFIRMED" || p.status === "PENDING_PAYMENT" || p.status === "WAITING") ...`
     Dẫn đến việc bệnh nhân chưa thanh toán (`PENDING_PAYMENT`) vẫn bị liệt kê vào danh sách chờ gọi khám, nút "Gọi vào phòng" hiển thị và khi bác sĩ bấm gọi thì backend quăng lỗi `402 PAYMENT_REQUIRED`.

### 1.2. Mục tiêu kỹ thuật & Lâm sàng
- **Chuẩn hóa API Backend:** Backend là nơi duy nhất cưỡng chế các quy tắc y khoa và phân quyền; không phó mặc việc kiểm soát cho frontend.
- **Bảo toàn dữ liệu thực (Zero Mock Data):** Xóa bỏ 100% các chuỗi gán sẵn chẩn đoán, sinh hiệu giả, đơn thuốc mặc định; bắt buộc dữ liệu xuất phát từ thao tác chuyên môn của nhân viên y tế.
- **Bảo vệ an toàn Dược lý (CDS Hardening):** Đọc bắt buộc `PatientProfile.allergies` từ CSDL, kiểm tra phản ứng chéo, bắt buộc nhập lý do lâm sàng hợp lệ khi ghi đè cảnh báo.
- **Kiểm soát quyền truy cập theo phạm vi (Scoped RBAC):** Giới hạn bác sĩ/điều dưỡng chỉ được truy cập và thao tác trên bệnh nhân thuộc khoa phụ trách hoặc được phân công trực tiếp.
- **Đồng bộ hóa luồng Nội trú & Quyết toán:** Gắn kết sơ đồ giường thật, y lệnh có cấu trúc, và thiết lập khoản chờ thu viện phí khi xuất viện.

---

## 2. PHẠM VI CAN THIỆP (SCOPE & BOUNDARIES)

### 2.1. Trong phạm vi (In-Scope)
1. **Backend (`hospital-api`):**
   - Sửa `ClinicalExaminationServiceImpl.java`: Chuyển logic kiểm tra xét nghiệm tồn đọng sang `completeExamination`; bổ sung kiểm tra xét nghiệm và chẩn đoán trước khi hoàn tất ca trong `createPrescription`; bắt buộc lý do đóng ca trong `abandonExaminationAfterTests`; đọc `allergies` từ CSDL trong `checkPrescriptionSafety`; bắt buộc `overrideReason` và lưu vào DB/AuditLog trong `createPrescription`.
   - Sửa `Prescription.java`: Thêm cột `override_reason`.
   - Cập nhật phân quyền trong `ClinicalExaminationController.java`: Kiểm tra bác sĩ thao tác ca khám.
   - Sửa `InpatientController.java` & `InpatientServiceImpl.java`: Truyền `UserPrincipal`, áp dụng lọc theo `departmentId` cho `getActiveAdmissions`; kiểm tra quyền truy cập khoa cho các thao tác nội trú.
   - Sửa `Discharge.java` & `InpatientServiceImpl.java`: Bổ sung `isPaid` và `settlementStatus`, tạo khoản chờ thu viện phí nội trú.
2. **Frontend (`hospital-ui`):**
   - Sửa `ExaminationPage.jsx`: Bỏ fallback chẩn đoán/lời dặn mặc định; loại bỏ `PENDING_PAYMENT` khỏi danh sách chờ gọi khám; disable nút gọi khám đối với bệnh nhân chưa thanh toán; đồng bộ trạng thái nút "Hoàn tất ca khám" với tiến độ xét nghiệm.
   - Sửa `PrescriptionModal.jsx`: Bỏ auto-fill lý do ghi đè; bắt buộc bác sĩ tự nhập lý do khi có cảnh báo dị ứng.
   - Sửa `InpatientPage.jsx`: Xóa toàn bộ preset vitals giả và đơn thuốc mẫu; tích hợp API `/doctor-orders`; sử dụng dữ liệu giường thật và API cập nhật trạng thái giường; bỏ biên nhận tiền mặt giả `CASH`.

### 2.2. Ngoài phạm vi (Out-of-Scope)
- Không can thiệp cổng thanh toán bên thứ ba (PayOS/VNPay).
- Không sửa đổi cấu trúc máy xét nghiệm LIS/PACS.

---

## 3. DANH SÁCH ĐIỂM CHẠM MÃ NGUỒN (TOUCHPOINTS)

| File | Thành phần | Nội dung thay đổi |
| :--- | :--- | :--- |
| `hospital-api/.../ClinicalExaminationServiceImpl.java` | Backend Service | 1. Bỏ check xét nghiệm tại `makeDiagnosis`, chuyển sang `completeExamination`.<br>2. Cập nhật `createPrescription`: Kiểm tra xét nghiệm & chẩn đoán, validate `overrideReason`.<br>3. `abandonExaminationAfterTests`: Bắt buộc nhập lý do.<br>4. `checkPrescriptionSafety`: Đọc `PatientProfile.allergies` từ CSDL. |
| `hospital-api/.../ClinicalExaminationController.java` | Backend Controller | Bổ sung kiểm tra bác sĩ thao tác ca khám (`checkDoctorOwnershipOrHOD`). |
| `hospital-api/.../Prescription.java` | JPA Entity | Thêm trường `overrideReason` (`@Column(name = "override_reason", columnDefinition = "TEXT")`). |
| `hospital-api/.../InpatientController.java` | Backend Controller | Truyền `UserPrincipal` vào `getActiveAdmissions`, `getAdmissionById`, v.v. Áp dụng scoped authorization. |
| `hospital-api/.../InpatientServiceImpl.java` | Backend Service | Xử lý lọc theo chuyên khoa của bác sĩ/điều dưỡng; bổ sung trạng thái quyết toán vào `dischargePatient`. |
| `hospital-api/.../Discharge.java` | JPA Entity | Thêm trường `isPaid` và `settlementStatus`. |
| `hospital-ui/.../ExaminationPage.jsx` | React Page | Xóa fallback chẩn đoán giả; sửa điều kiện `isWaitingPatient`; chặn gọi bệnh nhân chưa đóng tiền; làm mờ nút hoàn tất khi còn xét nghiệm. |
| `hospital-ui/.../PrescriptionModal.jsx` | React Modal | Bỏ auto-fill `overrideReason`; thêm ô nhập bắt buộc lý do ghi đè cảnh báo dị ứng. |
| `hospital-ui/.../InpatientPage.jsx` | React Page | Xóa bỏ `PROGRESSION_PRESETS`, `DRUG_PROTOCOL_PRESETS`, fake vitals; tích hợp `/doctor-orders`; kết nối giường thật. |

---

## 4. CHI TIẾT THỰC HIỆN TỪNG PHẠM VI (DETAILED IMPLEMENTATION PLAN)

### 4.1. Phạm vi 1: Khám ngoại trú & Cận lâm sàng
1. **Backend - `ClinicalExaminationServiceImpl.java`:**
   - **`makeDiagnosis`:** Cho phép bác sĩ lưu chẩn đoán sơ bộ hoặc cập nhật tiến trình điều trị kể cả khi xét nghiệm đang làm (`IN_TESTING`). Chuyển đoạn mã:
     ```java
     boolean hasUnfinishedTests = record.getMedicalTests() != null && record.getMedicalTests().stream()
             .anyMatch(t -> t.getState() != MedicalTestState.COMPLETED && t.getState() != MedicalTestState.CANCELLED);
     if (hasUnfinishedTests) {
         throw new AppException("Không thể hoàn tất ca khám...", HttpStatus.BAD_REQUEST);
     }
     ```
     từ `makeDiagnosis` sang `completeExamination`.
   - **`completeExamination`:**
     * Kiểm tra bắt buộc: Nếu `record.getMedicalTests()` còn bất kỳ mục nào chưa `COMPLETED` và chưa `CANCELLED`, ném ngoại lệ `BAD_REQUEST`.
     * Kiểm tra bắt buộc: `request.finalDiagnosis()` hoặc `record.getFinalDiagnosis()` không được rỗng/trắng.
   - **`createPrescription`:**
     * Kiểm tra xét nghiệm: Nếu còn xét nghiệm chưa hoàn thành/chưa hủy, ném ngoại lệ thông báo bác sĩ phải đợi kết quả hoặc hủy chỉ định trước khi kê đơn hoàn tất.
     * Kiểm tra chẩn đoán: Bắt buộc `record.getFinalDiagnosis()` đã có dữ liệu trước khi cho phép đóng ca.
   - **`abandonExaminationAfterTests`:**
     * Bắt buộc `reason != null && !reason.trim().isEmpty()`, nếu để trống ném `BAD_REQUEST("Bác sĩ phải nhập lý do cụ thể khi đóng ca khám vắng mặt")`. Bỏ chuỗi fallback tự động.
2. **Frontend - `ExaminationPage.jsx`:**
   - Xóa bỏ dòng 724 tự điền fallback `treatmentPlan`. Nếu bác sĩ không nhập, gửi chuỗi rỗng để backend xử lý hoặc yêu cầu bác sĩ nhập.
   - Khi `record.tests` có xét nghiệm chưa xong, nút "Hoàn tất ca khám" chuyển sang trạng thái disabled kèm tooltip: *"Bệnh nhân còn xét nghiệm chưa hoàn thành hoặc chưa được hủy."*

### 4.2. Phạm vi 2: Kê đơn & Dị ứng thuốc (CDS Drug Safety)
1. **Backend - `ClinicalExaminationServiceImpl.java`:**
   - **`checkPrescriptionSafety`:**
     * Lấy `PatientProfile` từ `record.getPatientProfile()` (hoặc fallback `record.getBooking().getPatientProfile()`).
     * Lấy `dbAllergies = patientProfile != null ? patientProfile.getAllergies() : null`.
     * Gộp dữ liệu: `fullAllergies = (dbAllergies != null ? dbAllergies : "") + " " + (request.patientAllergies() != null ? request.patientAllergies() : "")`.
     * Quét dị ứng dựa trên `fullAllergies`, đối chiếu với `ALLERGY_GROUP_TARGETS` và hoạt chất thuốc.
   - **`createPrescription`:**
     * Khi `safetyCheck.criticalCount() > 0`:
       Nếu `overrideAllergyWarning == true`, BẮT BUỘC `request.overrideReason()` không được trống và có độ dài $\ge 5$ ký tự. Nếu không đạt, ném ngoại lệ:
       `"Bác sĩ phải cung cấp lý do lâm sàng xác thực khi ghi đè cảnh báo dị ứng thuốc!"`
     * Lưu `overrideReason` vào entity `Prescription` và ghi vào `AuditLogService`.
2. **Frontend - `PrescriptionModal.jsx`:**
   - Bỏ dòng 412 tự động gán `effectiveOverrideReason = "Bác sĩ lâm sàng xác nhận ghi đè cảnh báo dị ứng"`.
   - Thêm TextField nhập "Lý do ghi đè lâm sàng (Bắt buộc)" hiển thị khi có cảnh báo `CRITICAL`. Chặn bấm nút Xác nhận nếu ô này bị bỏ trống.

### 4.3. Phạm vi 3: Phân quyền hồ sơ (Scoped RBAC)
1. **Backend - `InpatientController.java` & `InpatientServiceImpl.java`:**
   - Sửa endpoint `GET /api/inpatient/active`: Nhận `@AuthenticationPrincipal UserPrincipal userPrincipal`.
   - Xác định quyền: Nếu là `ADMIN` $\rightarrow$ `isAdmin = true`. Nếu là `DOCTOR`, `HEAD_OF_DEPARTMENT`, `NURSE` $\rightarrow$ lấy `departmentId` của nhân viên đó từ DB và chỉ trả về bệnh nhân đang nằm tại khoa của họ.
   - Kiểm tra quyền truy cập chi tiết tại `getAdmissionById`, `getDailyRecords`, `createDoctorOrder`, `dischargePatient`: Kiểm tra bệnh nhân có thuộc khoa của nhân viên hay không.
2. **Backend - `ClinicalExaminationController.java`:**
   - Thêm phương thức bảo vệ `validateDoctorExamAccess(MedicalExaminationRecord record, UserPrincipal principal)`: Bác sĩ chỉ được chỉnh sửa hồ sơ do mình phụ trách, trừ khi có vai trò `HEAD_OF_DEPARTMENT` (cùng khoa) hoặc `ADMIN`.

### 4.4. Phạm vi 4: Chuẩn hóa Điều trị nội trú
1. **Frontend - `InpatientPage.jsx`:**
   - Xóa bỏ hoàn toàn mảng `PROGRESSION_PRESETS` và `DRUG_PROTOCOL_PRESETS`.
   - Xóa bỏ các giá trị mặc định sinh hiệu giả trong `handleOpenTreatmentSheet` (dòng 414–428); để trống nếu bệnh nhân chưa có số đo sinh hiệu thực tế trong ngày.
   - Xóa bỏ chẩn đoán mẫu và tóm tắt xuất viện mẫu trong state `admitForm` và `dischargeData`.
   - Đổi form nhập y lệnh hàng ngày sang gọi đúng API `/api/inpatient/{admissionId}/doctor-orders` (lưu loại y lệnh: Thuốc, Dịch vụ kỹ thuật, Chăm sóc).
   - Thay thế việc tính số giường ảo `totalRooms * 4` bằng việc gọi API danh sách giường thật: `GET /api/inpatient/beds/department/{deptId}`.
   - Nút chuyển trạng thái dọn vệ sinh gọi trực tiếp `PUT /api/inpatient/beds/{bedId}/status?status=CLEANING|AVAILABLE`.
2. **Backend - `Discharge.java` & `InpatientServiceImpl.java`:**
   - Thêm trường `isPaid` và `settlementStatus` trong `Discharge.java`.
   - Trong `dischargePatient`: Thiết lập `settlementStatus = "PENDING_PAYMENT"` và `isPaid = false`, ghi nhận khoản viện phí chờ thanh toán tại quầy thu ngân nội trú.

### 4.5. Phạm vi 5: Hàng đợi khám
1. **Frontend - `ExaminationPage.jsx`:**
   - Sửa hàm `isWaitingPatient`:
     ```javascript
     const isWaitingPatient = (p) =>
         (p.status === "CONFIRMED" || p.status === "WAITING") &&
         p.isPaid !== false &&
         p.status !== "PENDING_PAYMENT" &&
         !p.isReturnAfterResult &&
         p.recordState !== "SKIPPED";
     ```
   - Nút "Gọi Vào Phòng": Nếu bệnh nhân có `p.status === "PENDING_PAYMENT"` hoặc `p.isPaid === false`, disable nút gọi và hiển thị badge cảnh báo màu cam: *"Chưa thanh toán tiền khám"*.

---

## 5. MA TRẬN KIỂM THỬ & NGHIỆM THU (VERIFICATION MATRIX)

| STT | Kịch bản kiểm thử | Hành vi mong đợi | Phương pháp xác minh |
| :---: | :--- | :--- | :--- |
| 1 | Bác sĩ hoàn tất ca khi còn xét nghiệm `WAITING` | Backend trả HTTP 400 Bad Request; UI disable nút hoàn tất và báo lỗi rõ ràng. | API call test & UI check |
| 2 | Bác sĩ lưu chẩn đoán sơ bộ khi xét nghiệm đang làm | Thành công, hồ sơ chuyển sang `DIAGNOSING`, không bị chặn nhầm. | API call test |
| 3 | Bác sĩ kê đơn thuốc dị ứng có trong `PatientProfile.allergies` | Backend trả cảnh báo `CRITICAL` ngay cả khi client không truyền `patientAllergies`. | API test với hồ sơ có dị ứng |
| 4 | Bác sĩ gửi `overrideAllergyWarning = true` nhưng bỏ trống `overrideReason` | Backend từ chối với HTTP 400; UI báo lỗi bắt buộc nhập lý do. | API call test |
| 5 | Bác sĩ Khoa A gọi `GET /api/inpatient/active` | Chỉ nhìn thấy bệnh nhân thuộc Khoa A; không thấy bệnh nhân Khoa B. | API test với 2 tài khoản bác sĩ khác khoa |
| 6 | Bác sĩ B cố tình gọi API đóng ca khám của Bác sĩ A | Backend trả HTTP 403 Forbidden. | API test chéo tài khoản |
| 7 | Mở phiếu điều trị nội trú trên giao diện | Các trường sinh hiệu để trống, không tự động điền 36.8°C hay thuốc mẫu. | UI inspect |
| 8 | Bệnh nhân `PENDING_PAYMENT` trong hàng đợi | Không nằm trong danh sách được gọi tự động; nút gọi bị vô hiệu hóa. | UI inspect |
| 9 | Kiểm tra biên dịch và bộ test hồi quy | Backend `./mvnw test-compile` thành công; Frontend `npm run build` & `vitest` pass 100%. | CLI build & test |

---

## 6. QUY TRÌNH TIẾP THEO (NEXT ACTIONS)

Kế hoạch này tuân thủ nghiêm ngặt quy chuẩn RIPER-5.  
Sau khi kế hoạch này được Người dùng phê duyệt bằng chỉ thị `ENTER EXECUTE MODE`, Orchestrator sẽ lần lượt thực thi các pha sửa đổi mã nguồn, tiến hành biên dịch và chạy kiểm thử tự động, sau đó bàn giao báo cáo chi tiết.

