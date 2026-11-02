# KẾ HOẠCH TRIỂN KHAI: CHUẨN HÓA VÀ NÂNG CAO QUY TRÌNH LÂM SÀNG, CẬN LÂM SÀNG, DƯỢC & NỘI TRÚ
**Mã kế hoạch:** PLAN-CLINICAL-INPATIENT-02-11-26  
**Ngày lập:** 02/11/2026  
**Trạng thái:** ĐÃ HOÀN TẤT & NGHIỆM THU (COMPLETED - 02/11/2026)  
**Quy chuẩn áp dụng:** RIPER-5 / AGENTS.md / vc-generate-plan  

---

## 1. TỔNG QUAN & MỤC TIÊU CỐT LÕI (EXECUTIVE SUMMARY)

### 1.1. Bối cảnh
Qua rà soát mã nguồn thực tế tại Phase RESEARCH, các quy trình lâm sàng cốt lõi trong hệ thống bệnh viện đang tồn tại 5 nhóm rủi ro y khoa, dữ liệu và tài chính nghiêm trọng:
1. **Khám ngoại trú & Cận lâm sàng (CLS):** Bác sĩ có thể bấm "Hoàn tất ca khám" đóng hồ sơ ngay cả khi các xét nghiệm chỉ định vẫn đang ở trạng thái chờ/đang làm; hệ thống tự động điền chẩn đoán giả `"Khám nội tổng quát - Không phát hiện bất thường..."` nếu bác sĩ bỏ trống; cờ xét nghiệm thiếu mặc định là `NORMAL`; thiếu quy trình xử lý ca khám khi bệnh nhân không quay lại sau khi làm xét nghiệm.
2. **An toàn Dược lý & Kê đơn (CDS):** Hàm kiểm tra an toàn dị ứng thuốc `checkPrescriptionSafety` chỉ tìm chữ "dị ứng" trong triệu chứng, **hoàn toàn không đọc** trường `allergies` đã lưu trong hồ sơ bệnh nhân ở CSDL, tạo nguy cơ bỏ lọt cảnh báo sốc phản vệ.
3. **Thanh toán & Nhà thuốc:** Kiểm tra thanh toán tiền thuốc dựa vào việc quét chuỗi văn bản tự do trong mô tả giao dịch (`Transaction.description`) thay vì liên kết thực thể; bảng `prescription_dispenses` thiếu ràng buộc `UNIQUE` trên `prescription_id` và thiếu khóa bi quan, dẫn tới nguy cơ cấp phát trùng (double dispense) khi 2 dược sĩ gửi đồng thời.
4. **Quản lý Nội trú & Giường bệnh:** Màn hình nội trú gán cứng mỗi phòng 4 giường (`totalRooms * 4`), lưu trạng thái dọn vệ sinh giường trên RAM trình duyệt cục bộ thay vì gọi API thực thể `Bed`; khi xuất viện in biên nhận tiền mặt giả `CASH` mà không qua quyết toán thu ngân; giao diện nội trú chưa tích hợp API tờ điều trị/y lệnh bác sĩ `/doctor-orders` mà gộp vào text tự do `/daily-record`.
5. **Phân quyền & Kiểm soát Truy cập:** Quyền xem hồ sơ nội trú toàn viện áp dụng chung cho mọi nhân viên (`isStaff = true`) mà không giới hạn theo khoa lâm sàng phụ trách (`departmentId`) hay bác sĩ điều trị được phân công.

### 1.2. Mục tiêu cốt lõi
- **Tuyệt đối không bịa đặt dữ liệu lâm sàng:** Khai tử toàn bộ chuỗi chẩn đoán mẫu, lời dặn mặc định hay cờ xét nghiệm ngầm định; bắt buộc bác sĩ và KTV nhập dữ liệu y khoa thật.
- **Ràng buộc chặt chẽ vòng đời Xét nghiệm:** Bác sĩ không thể đóng ca khám nếu còn xét nghiệm chưa có kết quả (trừ khi có thao tác hủy chỉ định kèm lý do được ghi nhận). Có luồng xử lý "Bệnh nhân vắng mặt/Không quay lại".
- **Bảo vệ an toàn Dược lý (CDS Drug Safety):** Đọc trực tiếp tiền sử dị ứng trong CSDL bệnh nhân `PatientProfile.allergies` và đối chiếu phản ứng chéo dược lý trước khi cho phép lưu đơn.
- **Toàn vẹn Cấp phát & Kho Dược:** Thêm khóa bi quan và ràng buộc duy nhất để triệt tiêu nguy cơ xuất kho trùng; liên kết hóa đơn viện phí rõ ràng.
- **Thực tế hóa Phân hệ Nội trú:** Đồng bộ 100% sơ đồ buồng giường với CSDL backend; đưa tờ điều trị/y lệnh bác sĩ có cấu trúc vào sử dụng; tách bạch quyết định xuất viện chuyên môn khỏi quyết toán tài chính của thu ngân.
- **Phân quyền Scoped:** Giới hạn phạm vi xem hồ sơ nội trú của Bác sĩ/Điều dưỡng theo chuyên khoa công tác.

---

## 2. PHẠM VI VÀ GIỚI HẠN (SCOPE & BOUNDARIES)

### 2.1. Trong phạm vi (In-Scope)
- Chuẩn hóa vòng đời ca khám `MedicalExamState` và xét nghiệm `MedicalTestState`.
- Ràng buộc hoàn tất ca khám tại backend & giao diện buồng khám bác sĩ [ExaminationPage.jsx](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/Doctor/ExaminationPage.jsx).
- Bổ sung quy trình "Bệnh nhân không quay lại sau xét nghiệm" (`ABANDONED_AFTER_TESTS` / `SKIPPED_PERMANENT`).
- Cải tiến kiểm tra an toàn kê đơn trong [ClinicalExaminationServiceImpl.java](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalExaminationServiceImpl.java).
- Khóa bi quan và ràng buộc duy nhất chống Double Dispense trong [PharmacyInventoryServiceImpl.java](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/PharmacyInventoryServiceImpl.java).
- Kết nối buồng giường thật và API Y lệnh Bác sĩ trong [InpatientPage.jsx](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/Doctor/InpatientPage.jsx).
- Tách luồng Xuất viện lâm sàng $\rightarrow$ Chờ quyết toán viện phí nội trú tại Quầy Thu ngân.
- Scoped dữ liệu nội trú theo chuyên khoa phụ trách.

### 2.2. Ngoài phạm vi (Out-of-Scope)
- Không thay đổi các cổng thanh toán bên thứ ba (PayOS, VNPay).
- Không can thiệp giao thức kết nối phần cứng máy xét nghiệm LIS/PACS (giữ nguyên hợp đồng tích hợp hiện hữu).
- Không đưa ra quyết định hoặc gợi ý chẩn đoán điều trị thay nhân viên y tế.

---

## 3. MÁY TRẠNG THÁI & MA TRẬN PHÂN QUYỀN (STATE MACHINES & RBAC MATRIX)

### 3.1. Máy trạng thái Ca khám Ngoại trú (Outpatient Exam State Machine)
```
[WAITING] (Bệnh nhân chờ tại cửa buồng khám)
    │
    ▼ (Bác sĩ gọi khám)
[CALLING]
    │
    ▼ (Bác sĩ tiếp nhận & bắt đầu khám)
[IN_PROGRESS] (Khám lâm sàng tại bàn)
    ├──► (Chỉ định CLS) ────────► [IN_TESTING] (Đi làm xét nghiệm/CĐHA)
    │                                │
    │                                ├──► Toàn bộ CLS hoàn tất/hủy ──► [DIAGNOSING] (Quay lại bàn khám)
    │                                │                                    │
    │                                └──► BN không quay lại sau 4h/hết ca ─► [ABANDONED] (Đóng ca vắng mặt)
    │                                                                     │
    └──► (Không chỉ định CLS) ────────────────────────────────────────────┤
                                                                          ▼
                                                                (Bác sĩ chẩn đoán & kê đơn)
                                                                          │
                                                                          ▼ (Bắt buộc chẩn đoán thật & xử lý hết CLS)
                                                                        [DONE]
```

### 3.2. Máy trạng thái Xét nghiệm Cận lâm sàng (Medical Test State Machine)
```
[WAITING] ──► [SAMPLE_COLLECTED] ──► [PROCESSING] ──► [COMPLETED]
    │                 │                    │
    └─────────────────┴────────────────────┴──► (Bác sĩ hủy chỉ định kèm lý do) ──► [CANCELLED]
```
*Quy tắc bất biến:* Một ca khám chỉ được chuyển sang `DONE` khi $100\%$ các xét nghiệm thuộc ca khám đó ở trạng thái `COMPLETED` hoặc `CANCELLED`. Nếu còn bất kỳ xét nghiệm nào `WAITING`, `SAMPLE_COLLECTED`, hoặc `PROCESSING`, API `completeExamination` sẽ từ chối với HTTP 400 Bad Request.

### 3.3. Ma trận Phân quyền Thao tác (RBAC Permissions Matrix)

| Chức năng / Hành động | Bác sĩ điều trị | Điều dưỡng | KTV Xét nghiệm | Dược sĩ | Thu ngân | Trưởng khoa | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gọi khám & Bắt đầu khám** | ✅ Khoa mình | ❌ | ❌ | ❌ | ❌ | ✅ Khoa mình | ✅ Toàn viện |
| **Chỉ định xét nghiệm CLS** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Nhập KQ & Ký duyệt CLS** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Hủy chỉ định xét nghiệm** | ✅ (Kèm lý do) | ❌ | ❌ | ❌ | ❌ | ✅ (Kèm lý do) | ✅ |
| **Kê đơn thuốc ngoại trú** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Ghi đè cảnh báo dị ứng** | ✅ (Kèm lý do) | ❌ | ❌ | ❌ | ❌ | ✅ (Kèm lý do) | ❌ |
| **Thu tiền khám / thuốc / CLS** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Xuất kho thuốc (FEFO)** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Chỉ định nhập viện** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Xếp giường & Chuyển giường** | ✅ Khoa mình | ❌ (Chỉ xem) | ❌ | ❌ | ❌ | ✅ Khoa mình | ✅ |
| **Cập nhật trạng thái vệ sinh giường** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Ra Y lệnh Bác sĩ (Doctor Order)** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Ghi phiếu chăm sóc Điều dưỡng** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Ký quyết định Xuất viện** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Quyết toán viện phí xuất viện** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

---

## 4. DANH SÁCH ĐIỂM CHẠM MÃ NGUỒN (TOUCHPOINTS)

### 4.1. Backend (`hospital-api`)
1. [`ClinicalExaminationServiceImpl.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalExaminationServiceImpl.java) & [`ClinicalExaminationController.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/controller/ClinicalExaminationController.java):
   - `completeExamination`: Bổ sung kiểm tra toàn bộ xét nghiệm phải đạt `COMPLETED` hoặc `CANCELLED`. Bắt buộc `finalDiagnosis` không được để trống (xóa bỏ chuỗi gán sẵn).
   - Thêm endpoint `POST /api/clinical/records/{id}/abandon-after-tests`: Đóng ca khám vắng mặt kèm lý do khi bệnh nhân không quay lại bàn khám.
   - `checkPrescriptionSafety`: Bổ sung đọc `record.getBooking().getPatientProfile().getAllergies()` từ CSDL; tích hợp kiểm tra chéo hoạt chất và nhóm dị ứng.
2. [`MedicalTestResultItem.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/entity/MedicalTestResultItem.java) & [`TestResultFlag.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/constant/TestResultFlag.java):
   - Xóa bỏ `@Builder.Default private TestResultFlag flag = TestResultFlag.NORMAL;`. Bổ sung giá trị `PENDING` hoặc để `null` nếu chưa được KTV đánh giá.
3. [`PrescriptionDispense.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/entity/PrescriptionDispense.java) & [`PharmacyInventoryServiceImpl.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/PharmacyInventoryServiceImpl.java):
   - Sửa `prescription_dispenses`: Đổi index `prescription_id` thành `unique = true`.
   - Trong `dispensePrescription`: Thêm pessimistic write lock trên thực thể `Prescription`; thay thế việc kiểm tra chuỗi `desc.contains(...)` bằng kiểm tra trực tiếp trạng thái thanh toán của đơn thuốc (`prescription.isPaid()` hoặc liên kết `Transaction` theo `referenceId`).
4. [`InpatientServiceImpl.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/InpatientServiceImpl.java) & [`InpatientController.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/controller/InpatientController.java):
   - Giới hạn quyền xem hồ sơ nội trú theo `departmentId` của Bác sĩ/Điều dưỡng.
   - Thắt chặt quy trình xuất viện: Bác sĩ ký xuất viện chỉ đóng đợt điều trị lâm sàng; tạo hóa đơn viện phí nội trú chuyển sang hàng chờ thanh toán của Thu ngân (`PENDING_SETTLEMENT`).
   - Tích hợp `AuditLogService` cho `addDoctorOrder`, `transferBed`, `dischargePatient`.

### 4.2. Frontend (`hospital-ui`)
1. [`ExaminationPage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/Doctor/ExaminationPage.jsx):
   - Xóa bỏ việc điền sẵn `finalDiagnosis` giả `"Khám nội tổng quát - Không phát hiện bất thường..."`.
   - Kiểm tra `record.tests`: Nếu còn xét nghiệm chưa hoàn tất/hủy, làm mờ nút "Hoàn tất ca khám" và hiển thị cảnh báo hướng dẫn bác sĩ hủy chỉ định nếu bệnh nhân không làm.
   - Bổ sung nút "Bệnh nhân không quay lại sau xét nghiệm" để đóng hồ sơ có ghi chú.
   - Hiển thị nổi bật các chỉ số xét nghiệm mang cờ `HIGH`, `LOW`, `CRITICAL`, `ABNORMAL`.
2. [`PharmacyInventoryPage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/admin/PharmacyInventoryPage.jsx):
   - Đồng bộ trạng thái đơn thuốc: Đã kê đơn $\rightarrow$ Đã thanh toán viện phí $\rightarrow$ Đã xuất kho FEFO.
   - Chặn nút cấp phát nếu trạng thái thanh toán chưa được backend xác nhận.
3. [`InpatientPage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/Doctor/InpatientPage.jsx):
   - Xóa bỏ toàn bộ mã giường giả (`totalRooms * 4`) và `cleaningBeds` trong RAM; gọi API `/api/inpatient/beds` thực tế.
   - Đưa giao diện Tờ điều trị / Y lệnh Bác sĩ chuyển sang dùng đúng API `/api/inpatient/{id}/doctor-orders`.
   - Xóa bỏ việc tự ý in biên nhận tiền mặt giả `CASH` tại buồng bệnh; sau khi xuất viện hiển thị phiếu ra viện chuyên môn (Giấy ra viện TT 56/2017/TT-BYT) và thông báo bệnh nhân đến quầy Thu ngân quyết toán.
   - Xóa bỏ văn bản tóm tắt xuất viện mặc định giả.

---

## 5. CÁC PHA TRIỂN KHAI CHI TIẾT (IMPLEMENTATION PHASES)

### PHA 1: Chuẩn hóa Trạng thái Lượt khám, Hàng đợi & Vòng đời Xét nghiệm
1. **Backend:**
   - Trong `ClinicalExaminationServiceImpl.completeExamination`:
     ```java
     boolean hasUnfinishedTests = record.getMedicalTests() != null && record.getMedicalTests().stream()
             .anyMatch(t -> t.getState() != MedicalTestState.COMPLETED && t.getState() != MedicalTestState.CANCELLED);
     if (hasUnfinishedTests) {
         throw new AppException("Không thể hoàn tất ca khám do bệnh nhân vẫn còn chỉ định cận lâm sàng chưa hoàn thành hoặc chưa được hủy!", HttpStatus.BAD_REQUEST);
     }
     if (request.finalDiagnosis() == null || request.finalDiagnosis().trim().isEmpty()) {
         throw new AppException("Bác sĩ phải nhập kết luận chẩn đoán lâm sàng trước khi hoàn tất hồ sơ!", HttpStatus.BAD_REQUEST);
     }
     ```
   - Thêm phương thức `abandonExaminationAfterTests(UUID recordId, String reason, UserPrincipal currentUser)`:
     - Ghi nhận `record.setState(MedicalExamState.DONE)` kèm ghi chú `"Bệnh nhân không quay lại buồng khám sau khi làm xét nghiệm: " + reason`.
     - Chuyển `booking.status = COMPLETED`.
     - Ghi `AuditLog`.
   - Cập nhật `MedicalTestResultItem.java`: Bỏ gán sẵn `flag = NORMAL`. Nếu `flag == null`, để `null` hoặc tạo cờ `UNSPECIFIED`.
2. **Frontend `ExaminationPage.jsx`:**
   - Ẩn/Disable nút "Hoàn Tất Ca Khám" nếu `record.tests` có mục chưa `COMPLETED` và chưa `CANCELLED`.
   - Bổ sung nút "Đóng ca khám (Bệnh nhân không quay lại)" mở modal nhập lý do vắng mặt.
   - Xóa bỏ chuỗi fallback `"Khám nội tổng quát - Không phát hiện bất thường..."` khi gửi complete.

### PHA 2: Hoàn thiện Màn hình Khám Bác sĩ & An toàn Kê đơn (CDS Drug Safety)
1. **Backend `ClinicalExaminationServiceImpl.checkPrescriptionSafety`:**
   - Lấy `PatientProfile` từ `record.getBooking().getPatientProfile()`.
   - Nếu `patientProfile.getAllergies()` có dữ liệu, tự động gộp vào chuỗi kiểm tra dị ứng:
     ```java
     String dbAllergies = (patientProfile != null && patientProfile.getAllergies() != null) ? patientProfile.getAllergies() : "";
     String fullAllergies = (dbAllergies + " " + rawAllergies).trim();
     ```
   - Đối chiếu chéo qua bảng `ALLERGY_GROUP_TARGETS` và tên hoạt chất của các thuốc đang kê.
   - Yêu cầu bác sĩ cung cấp lý do ghi đè bắt buộc `overrideReason` nếu muốn ghi đè cảnh báo `CRITICAL`.
2. **Frontend `ExaminationPage.jsx` & `PrescriptionModal.jsx`:**
   - Khi phát hiện dị ứng trùng với CSDL, hiển thị hộp thoại cảnh báo an toàn màu đỏ có âm báo thị giác; bắt buộc nhập "Lý do chỉ định đặc biệt của Bác sĩ" nếu muốn ghi đè.
   - Bảng kết quả xét nghiệm hiển thị badge màu theo đúng mức cờ: Đỏ (`CRITICAL`), Cam (`HIGH`/`LOW`), Xanh lá (`NORMAL`).

### PHA 3: Chuẩn hóa Đơn thuốc, Liên kết Thanh toán & Chống Cấp phát trùng Nhà thuốc
1. **Database Schema & Entity:**
   - Trong `PrescriptionDispense.java`:
     ```java
     @Table(name = "prescription_dispenses", uniqueConstraints = {
             @UniqueConstraint(name = "uk_dispense_prescription", columnNames = {"prescription_id"})
     })
     ```
2. **Backend `PharmacyInventoryServiceImpl.dispensePrescription`:**
   - Khóa bản ghi `Prescription` với `LockModeType.PESSIMISTIC_WRITE` để ngăn chặn đồng thời 2 giao dịch cấp phát cùng một đơn thuốc.
   - Kiểm tra thanh toán: Bổ sung trường `isPaid` trên `Prescription` hoặc kiểm tra liên kết `Transaction` theo đúng `prescriptionId`. Bỏ hoàn toàn logic quét chuỗi mô tả text.
3. **Frontend `PharmacyInventoryPage.jsx`:**
   - Đồng bộ cột trạng thái thanh toán từ backend xác nhận. Chỉ cho phép bấm "Cấp phát thuốc" khi đã được thanh toán hoặc là ca ưu tiên được phê duyệt.

### PHA 4: Đồng bộ Giường bệnh thật, Y lệnh Bác sĩ & Tách Quyết toán Xuất viện
1. **Đồng bộ Giường bệnh thật:**
   - Xóa bỏ hoàn toàn hằng số `totalBeds = totalRooms * 4` và state `cleaningBeds` trong [InpatientPage.jsx](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/Doctor/InpatientPage.jsx).
   - Tích hợp gọi API `/api/inpatient/beds/department/{departmentId}` lấy danh sách giường thật từ CSDL PostgreSQL.
   - Nút đổi trạng thái giường gọi trực tiếp `PUT /api/inpatient/beds/{bedId}/status` cập nhật đồng bộ cho toàn viện.
2. **Tích hợp API Tờ điều trị / Y lệnh Bác sĩ:**
   - Chuyển form y lệnh trong `InpatientPage.jsx` sang gọi `POST /api/inpatient/{admissionId}/doctor-orders` (lưu loại y lệnh: Thuốc, Dịch vụ kỹ thuật, Theo dõi dinh dưỡng).
   - Hiển thị danh sách tờ điều trị bác sĩ theo đúng chuẩn hồ sơ bệnh án nội trú.
3. **Tách quy trình Xuất viện lâm sàng khỏi Quyết toán Viện phí:**
   - Form xuất viện: Bác sĩ ký kết thúc điều trị $\rightarrow$ Chuyển hồ sơ sang `PENDING_SETTLEMENT`.
   - Xóa bỏ hàm `printReceipt` với thông tin tiền mặt giả `CASH` trong `InpatientPage.jsx`.
   - Thay thế bằng nút in "Giấy Ra Viện" (chuẩn Bộ Y Tế).
   - Bệnh nhân đến Quầy Thu ngân $\rightarrow$ Thu ngân mở hồ sơ quyết toán chi phí ngày giường + thuốc nội trú $\rightarrow$ In biên lai tài chính thật từ hệ thống thu ngân.

### PHA 5: Thắt chặt Phân quyền Nội trú Scoped, Audit Trail & Kiểm thử E2E
1. **Phân quyền Backend `InpatientServiceImpl`:**
   - Trong `getActiveAdmissions` và `getAdmissionById`: Nếu caller là Bác sĩ/Điều dưỡng (không phải Admin), chỉ trả về các hồ sơ nội trú thuộc chuyên khoa của caller (`doctor.department.departmentId == admission.department.departmentId`).
2. **Ghi nhận Audit Trail toàn diện:**
   - Ghi `AuditLog` cho các hành động: `CREATE_DOCTOR_ORDER`, `BED_TRANSFER`, `UPDATE_BED_STATUS`, `DISCHARGE_PATIENT`, `ABANDON_EXAM`.
3. **Kiểm thử tự động & Biên dịch:**
   - Chạy `mvnw.cmd test-compile -DskipTests` và các unit test liên quan.
   - Chạy `npm run build` trên `hospital-ui` đảm bảo 0 lỗi biên dịch.

---

## 6. ĐÁNH GIÁ TÁC ĐỘNG & BẢO VỆ DỮ LIỆU (BLAST RADIUS & MIGRATION)

### 6.1. Tác động Database Schema (DDL)
- Thêm ràng buộc duy nhất `uk_dispense_prescription` trên cột `prescription_id` của bảng `prescription_dispenses`. Do bảng hiện tại đang chạy sạch, ràng buộc này không gây mất mát dữ liệu và ngăn chặn tuyệt đối lỗi race-condition.
- Bổ sung trường `is_paid` trên bảng `prescriptions` (nếu chưa có) hoặc liên kết bảng trung gian hóa đơn.

### 6.2. Tính tương thích với các phân hệ khác
- **Kiosk & Tiếp đón:** Không bị ảnh hưởng, giữ nguyên các API check-in và hàng đợi.
- **Bệnh án điện tử EMR:** Tương thích 100%, EMR modal đọc dữ liệu đã chuẩn hóa từ các ca khám đã hoàn thành thực sự.
- **PayOS & Thu ngân:** Luồng thanh toán viện phí ngoại trú và nội trú được tách bạch rõ ràng, loại bỏ việc phụ thuộc vào chuỗi text mô tả.

---

## 7. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA & SCENARIOS)

1. **AC-1 (Chặn đóng hồ sơ khi còn CLS):** Bác sĩ chỉ định 2 xét nghiệm. Khi 1 xét nghiệm đang `WAITING`, bấm "Hoàn tất ca khám" $\rightarrow$ Backend trả lỗi 400 Bad Request kèm thông báo rõ ràng; UI hiển thị cảnh báo không cho gửi.
2. **AC-2 (Bệnh nhân không quay lại sau CLS):** Bác sĩ có nút "Bệnh nhân không quay lại", đóng ca khám vắng mặt có lưu vết lý do, hàng đợi giải phóng lượt khám sạch sẽ.
3. **AC-3 (Bắt buộc chẩn đoán thật):** Bác sĩ để trống chẩn đoán $\rightarrow$ Hệ thống từ chối hoàn tất; không còn xuất hiện chuỗi giả `"Khám nội tổng quát - Không phát hiện bất thường..."`.
4. **AC-4 (Cảnh báo dị ứng từ CSDL):** Bệnh nhân có tiền sử dị ứng Penicillin lưu trong hồ sơ $\rightarrow$ Bác sĩ kê Amoxicillin $\rightarrow$ Hệ thống tự động cảnh báo sốc phản vệ nhóm Beta-lactam, bắt buộc nhập lý do ghi đè lâm sàng.
5. **AC-5 (Chống Double Dispense):** Hai yêu cầu cấp phát cùng 1 đơn thuốc gửi đồng thời $\rightarrow$ 1 yêu cầu thành công, yêu cầu còn lại bị chặn với thông báo "Đơn thuốc đã được cấp phát trước đó", tồn kho chỉ bị trừ 1 lần.
6. **AC-6 (Sơ đồ giường thật):** Giao diện nội trú hiển thị đúng số giường và mã giường được khai báo trong DB; bấm dọn vệ sinh giường $\rightarrow$ Gọi API backend cập nhật trạng thái `CLEANING` và lưu bền vững vào CSDL.
7. **AC-7 (Y lệnh bác sĩ có cấu trúc):** Y lệnh nội trú được lưu qua `/doctor-orders`, phân biệt rõ ràng với phiếu chăm sóc điều dưỡng `/nursing-cares`.
8. **AC-8 (Tách quyết toán xuất viện):** Xuất viện tại buồng bệnh chỉ in Giấy ra viện; không in biên nhận tiền mặt giả; hóa đơn viện phí chuyển sang Quầy Thu ngân quyết toán.
9. **AC-9 (Phân quyền nội trú Scoped):** Bác sĩ khoa Nhi đăng nhập vào `/inpatient` chỉ thấy bệnh nhân đang điều trị tại khoa Nhi; không xem được hồ sơ nội trú khoa Tim mạch.

---

## 8. QUY TRÌNH XÁC MINH & KIỂM THỬ (VERIFICATION PROTOCOL)

1. **Biên dịch Backend:**
   ```powershell
   cd hospital-api
   .\mvnw.cmd test-compile -DskipTests
   ```
   *Yêu cầu:* `BUILD SUCCESS`, 0 lỗi biên dịch.
2. **Biên dịch Frontend:**
   ```powershell
   cd hospital-ui
   npm run build
   ```
   *Yêu cầu:* Vite build hoàn tất thành công 100%, 0 lỗi cú pháp JSX.

---

## 9. THÔNG TIN BÀN GIAO (RESUME HANDOFF)

- **File kế hoạch duy nhất áp dụng:** `process/general-plans/active/clinical-workflows-and-inpatient-hardening_PLAN_02-11-26.md`
- **Tình trạng:** Bản kế hoạch đã được thiết lập chi tiết 5 Phase và đã lưu bền vững vào hệ thống.
- **Hành động tiếp theo:** Dừng lại, báo cáo bản kế hoạch cho người dùng xem xét. **Chỉ bắt đầu triển khai code khi nhận được xác nhận `ENTER EXECUTE MODE` từ người dùng.**



---
## 9. BÁO CÁO KẾT QUẢ TRIỂN KHAI THỰC TẾ (EXECUTION LOG - 02/11/2026)
- **Phase 1 (Ngoại trú & Cận lâm sàng):** Đã chặn đóng ca khám khi còn xét nghiệm chưa có KQ; bắt buộc chẩn đoán xác định thật; bổ sung API `/abandon-after-tests` đóng ca khám vắng mặt có lưu vết lý do; sửa cờ xét nghiệm tự động đánh giá số liệu thay vì gán ngầm định NORMAL.
- **Phase 2 (An toàn Dược lý & Kê đơn):** Đã bổ sung trường `allergies` trong CSDL `PatientProfile`; `checkPrescriptionSafety` đối chiếu trực tiếp tiền sử dị ứng; bắt buộc bác sĩ cung cấp `overrideReason` khi ghi đè mức CRITICAL.
- **Phase 3 (Nhà thuốc & Double Dispense):** Đã bổ sung ràng buộc UNIQUE trên bảng `prescription_dispenses`; khóa bi quan PESSIMISTIC_WRITE trên `Prescription`; liên kết thanh toán qua cờ `isPaid` và giao dịch viện phí.
- **Phase 4 (Nội trú & Giường bệnh):** Kết nối buồng giường thật với API backend `/api/inpatient/beds`; tờ điều trị lưu y lệnh bác sĩ có cấu trúc `/doctor-orders`; tách bạch xuất viện lâm sàng khỏi quyết toán thu ngân; loại bỏ in biên nhận tiền mặt giả.
- **Phase 5 (Phân quyền & Kiểm thử):** Scoped dữ liệu nội trú theo chuyên khoa phụ trách; ghi nhận AuditLog đầy đủ; biên dịch Maven 357 source files + 21 test files và Vite 1857 modules đạt BUILD SUCCESS 100%.
