# Kế hoạch triển khai khắc phục các lỗi vận hành khám bệnh & viện phí

**Mode:** PLAN  
**Date:** 23-10-2026  
**Status:** DRAFT — Chờ phê duyệt của người dùng  

---

## 1. Mục tiêu (Goals)

Khắc phục toàn diện 10 lỗi và điểm nghẽn đã được xác minh trong Báo cáo Rà soát Vận hành Khám bệnh & Viện phí, đảm bảo:
- **Không đứt gãy luồng tiền**: Thu đúng, thu đủ tiền khám ban đầu, kết nối chuẩn xác thanh toán online VNPay/PayOS với lượt khám, và đưa viện phí xuất viện nội trú vào hệ thống thu ngân.
- **Không tắc nghẽn luồng lâm sàng**: Cho phép hủy chỉ định cận lâm sàng mà không gây kẹt chết trạng thái ca khám của bác sĩ.
- **Tính toàn vẹn dữ liệu**: Đồng bộ trạng thái hàng đợi thực giữa điều dưỡng và backend, chuẩn hóa cấu trúc sinh hiệu vào thực thể y tế chuyên biệt, chống ghi đè đồng thời.

---

## 2. Phân kỳ Triển khai (Phased Implementation Plan)

### 📌 Giai đoạn 1: Xử lý 4 Lỗi Nghiêm Trọng P1 (Critical Blockers)
*Ưu tiên số 1: Bảo vệ doanh thu bệnh viện và thông suốt luồng khám chữa bệnh.*

1. **[P1-04] Xử lý kẹt ca khám khi chỉ định CLS bị hủy / không thực hiện:**
   - **File tác động:** `ClinicalExaminationServiceImpl.java`, `ClinicalExaminationController.java`
   - **Giải pháp:**
     - Bổ sung endpoint `POST /api/clinical-examinations/tests/{testId}/cancel` cho phép Bác sĩ/KTV hủy chỉ định kèm lý do lâm sàng (`cancelReason`), đổi trạng thái sang `MedicalTestState.CANCELLED`.
     - Cập nhật logic tự động chuyển sang `DIAGNOSING`: Điều kiện hoàn thành xét nghiệm là toàn bộ các chỉ định trong ca khám đều có trạng thái kết thúc (`state == COMPLETED || state == CANCELLED`).
     - Đảm bảo bác sĩ có thể tiếp tục bước chẩn đoán và kê đơn ngay cả khi có xét nghiệm bị hủy.

2. **[P1-01] Thiết lập chốt chặn tiền khám ban đầu (Consultation Fee Gate):**
   - **File tác động:** `BookingServiceImpl.java`, `ClinicalExaminationServiceImpl.java`
   - **Giải pháp:**
     - Trong `BookingServiceImpl`: Khi bệnh nhân đặt hẹn qua Web hoặc Kiosk nếu có phí khám (`price > 0`), trạng thái khởi tạo là `PENDING_PAYMENT` (trừ khi thanh toán ngay hoặc ca ưu tiên).
     - Trong `ClinicalExaminationServiceImpl.startExamination`: Kiểm tra nếu `booking.getPrice() > 0` và không phải diện ưu tiên cấp cứu (`!booking.getIsPriority()`), bắt buộc ca khám phải có bản ghi thanh toán hợp lệ hoặc đã qua bàn tiếp đón nộp phí (`CHECKED_IN`), nếu chưa nộp phí sẽ báo lỗi yêu cầu đóng tiền khám ban đầu.

3. **[P1-02] Kết nối dữ liệu thanh toán VNPay & PayOS với Booking:**
   - **File tác động:** `PaymentServiceImpl.java`, `CashierServiceImpl.java`
   - **Giải pháp:**
     - Khi sinh URL VNPay hoặc link PayOS, nhúng tường minh `bookingCode` vào mô tả giao dịch (`"Thanh toán viện phí ca khám: " + bookingCode`).
     - Trong `processVNPayIpn` và Webhook PayOS: Khi giao dịch thành công cho loại `PAY_BOOKING`, tra cứu `Booking` theo `bookingCode`, cập nhật trạng thái `CONFIRMED` / `CHECKED_IN` tương ứng để đồng bộ ngay sang quầy tiếp đón và phòng khám.

4. **[P1-03] Đưa viện phí xuất viện Nội trú vào Quầy Thu ngân:**
   - **File tác động:** `CashierServiceImpl.java`, `InpatientServiceImpl.java`
   - **Giải pháp:**
     - Trong `CashierServiceImpl.getPendingBills`: Quét thêm danh sách đợt điều trị nội trú đã có quyết định xuất viện (`Discharge` / `HospitalAdmissionState.DISCHARGED`) chưa thanh toán.
     - Sinh mã hóa đơn nội trú `BILL-INPATIENT-{admissionId}`, hiển thị tổng tiền viện phí nội trú (`totalInpatientCost`), số ngày nằm viện, tiền phòng và các dịch vụ phát sinh.
     - Cho phép Thu ngân thu tiền mặt / POS / VietQR cho hóa đơn nội trú và cập nhật trạng thái quyết toán.

---

### 📌 Giai đoạn 2: Đồng bộ Hàng đợi Điều dưỡng & Chuẩn hóa Dữ liệu (P2 & P3)
*Ưu tiên số 2: Nâng cao độ chính xác dữ liệu lâm sàng và khắc phục lỗi giao diện.*

5. **[P2-02] API cập nhật trạng thái hàng đợi Điều dưỡng:**
   - **File tác động:** `NurseReceptionController.java`, `NurseReceptionServiceImpl.java`, `NurseReceptionPage.jsx`
   - **Giải pháp:** Bổ sung endpoint `PUT /api/nurse/reception/bookings/{id}/status`. Cập nhật hàm `handleUpdateStatus` trên UI gọi API thật thay vì chỉ sửa local state trên RAM.

6. **[P2-04] Chuẩn hóa Sinh hiệu vào thực thể `MedicalObservation`:**
   - **File tác động:** `NurseReceptionServiceImpl.java`
   - **Giải pháp:** Tạo bản ghi `MedicalObservation` riêng biệt lưu trữ có cấu trúc các chỉ số `bloodPressure`, `pulse`, `temperature`, `spo2`, `bmi` gắn với `MedicalExaminationRecord`, thay vì nối chuỗi text thô vào `symptoms`.

7. **[P3-01] Loại bỏ danh mục phòng ban hardcode trên giao diện Tiếp đón:**
   - **File tác động:** `NurseReceptionPage.jsx`
   - **Giải pháp:** Thay thế hằng số `DEPARTMENT_ROOMS` tĩnh bằng dữ liệu nạp động từ API `GET /api/departments` và `GET /api/counters`.

8. **[P3-02] Bổ sung `@Version` kiểm soát cập nhật đồng thời:**
   - **File tác động:** `MedicalExaminationRecord.java`, `HospitalAdmission.java`
   - **Giải pháp:** Bổ sung trường `@Version private Long version;` để Hibernate tự động kích hoạt cơ chế khóa lạc quan (Optimistic Locking).

---

### 📌 Giai đoạn 3: Nâng cấp Viện phí Nâng cao & Chốt chặn Phòng Xét nghiệm
*Ưu tiên số 3: Tối ưu kiến trúc hóa đơn và kiểm soát an toàn cận lâm sàng.*

9. **[P2-01] Mô hình Đa Hóa đơn (Multi-Invoice) & Chốt chặn Lab Gatekeeper:**
   - Triển khai theo thiết kế tại `implementation_plan_multi_invoice_and_lab_gatekeeper.md`:
   - Phân rã Hóa đơn 01 (`EXAM`) và Hóa đơn 02 (`CLS-MED`).
   - Phòng xét nghiệm kiểm tra cờ `isPaid`: Chỉ cho phép lấy mẫu và nhập kết quả khi dịch vụ đã đóng tiền (ngoại trừ ca cấp cứu).
10. **[P2-03] Hỗ trợ Hoàn tiền / Hủy giao dịch (Refund):**
    - Hỗ trợ nghiệp vụ hủy phiếu thu và hoàn trả tiền cho bệnh nhân khi xét nghiệm không thực hiện.

---

## 3. Kế hoạch Kiểm thử & Xác minh (Verification Plan)

- **Backend Unit & Integration Tests**:
  - `mvnw test-compile` đảm bảo biên dịch sạch, không lỗi cú pháp.
  - Viết script kiểm thử tự động `test_hospital_workflow_fixes.js`:
    - TC1: Hủy xét nghiệm -> Ca khám chuyển sang `DIAGNOSING` bình thường, không bị deadlock.
    - TC2: Ca khám có phí khám ban đầu -> Bác sĩ bị chặn nếu chưa đóng tiền; sau khi nộp tiền thì khám bình thường.
    - TC3: Thanh toán VNPay/PayOS có `bookingCode` -> Tự động xác nhận ca khám.
    - TC4: Bệnh nhân xuất viện nội trú -> Xuất hiện hóa đơn nội trú trên màn hình Thu ngân; thu ngân thanh toán thành công.
    - TC5: Điều dưỡng cập nhật trạng thái -> Dữ liệu lưu bền vững xuống DB (F5 tải lại không mất).
- **Frontend Build**:
  - `npm run build` trên thư mục `hospital-ui` đảm bảo 0 lỗi build.
