# Kế hoạch chi tiết: Chuẩn hóa phân tách khoản thu & Đối soát thanh toán viện phí (Payment Itemization & Reconciliation Hardening)

> **Mã tài liệu:** `payment-itemization-and-reconciliation-hardening_PLAN_05-11-26.md`  
> **Trạng thái:** ACTIVE (Chờ duyệt chuyển sang EXECUTE)  
> **Mục tiêu:** Khắc phục triệt để các lỗ hổng đối soát thanh toán, chấm dứt hiệu ứng domino đánh dấu tréo giữa xét nghiệm và thuốc, tính đủ viện phí nội trú, hoàn tiền khi hủy xét nghiệm và ngăn ngừa lỗi rollback 409 tại quầy thu ngân.

---

## 1. TỔNG QUAN VẤN ĐỀ & ÁNH XẠ NGUYÊN NHÂN GỐC

| Mã phát hiện | Mức độ | Vị trí mã nguồn | Nguyên nhân gốc (Root Cause) | Giải pháp kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| **FIN-01** | CRITICAL | `Transaction.java:18-64`<br>`TransactionRepository.java:31` | Bảng `transactions` không có khóa ngoại; đối soát qua chuỗi `description.contains(...)`. | Thêm các trường liên kết rõ ràng (`booking_id`, `record_id`, `medical_test_id`, `prescription_id`, `admission_id`, `discharge_id`) và index. |
| **FIN-02** | CRITICAL | `CashierServiceImpl.java:159, 454`<br>`ClinicalExaminationServiceImpl.java:93`<br>`PharmacyInventoryServiceImpl.java:328` | Gộp chung hóa đơn thành `BILL-...-TREATMENT`, cả hai dịch vụ đều kiểm tra chuỗi `"TREATMENT"`. Trả 1 khoản mở khóa khoản kia. | Thêm `is_paid` vào `MedicalTest`. Cập nhật `prescription.is_paid = true` khi thu ngân thu tiền. Tách hóa đơn thành `BILL-...-TEST` và `BILL-...-PRESCRIPTION`. |
| **FIN-03** | CRITICAL | `InpatientServiceImpl.java:152-154`<br>`CashierServiceImpl.java:840-850` | Quyết toán viện phí nội trú chỉ nhân số ngày nằm viện với tiền giường (`days * dailyRoomFee`). Bỏ sót 100% thuốc và xét nghiệm nội trú. | Tính tổng viện phí gồm: Tiền giường + Tiền thuốc y lệnh (`InpatientDoctorOrder`) + Tiền xét nghiệm nội trú. Khấu trừ tiền tạm ứng. |
| **FIN-04** | HIGH | `CashierServiceImpl.java:536-537`<br>`BookingReceptionTransition.java:53` | Gọi `reception.checkIn` khi thu mọi hóa đơn, gây lỗi 409 Conflict rollback giao dịch nếu ca khám đã hoàn tất (`COMPLETED`). | Chỉ gọi `reception.checkIn` khi thanh toán hóa đơn khám ban đầu (`BILL-...-EXAM`). |
| **FIN-05** | HIGH | `PaymentServiceImpl.java:441, 895, 933` | Webhook/IPN PayOS và VNPay chỉ hỗ trợ cập nhật thực thể cho `PAY_BOOKING`. | Mở rộng handler webhook để cập nhật `is_paid = true` cho `MedicalTest`, `Prescription` và `Discharge`. |
| **FIN-06** | HIGH | `CashierServiceImpl.java:804-835` | Thu viện phí nội trú không có khóa bi quan (Pessimistic Lock). | Bổ sung `admissionRepository.findByIdForUpdate(admissionId)` trong `processInpatientPayment`. |
| **FIN-07** | HIGH | `ClinicalExaminationServiceImpl.java:1229-1256` | Bác sĩ hủy xét nghiệm đã đóng tiền không hoàn lại tiền cho bệnh nhân. | Tự động hoàn tiền vào ví tài khoản bệnh nhân (`Account.balance`) và ghi nhận `TransactionType.REFUND`. |
| **FIN-08** | MEDIUM | `PharmacyInventoryServiceImpl.java:410` | `Prescription.isPaid` chỉ được set sang `true` sau khi Dược sĩ xuất kho. | Set `prescription.setIsPaid(true)` ngay khi thu ngân xác nhận thanh toán thành công. |

---

## 2. CHI TIẾT THAY ĐỔI CƠ SỞ DỮ LIỆU & ENTITY MAPPING

### A. Thực thể `Transaction` (`Transaction.java`)
Bổ sung các quan hệ khóa ngoại (nullable) để phục vụ đối soát chuẩn xác:
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "booking_id", nullable = true)
private Booking booking;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "medical_test_id", nullable = true)
private MedicalTest medicalTest;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "prescription_id", nullable = true)
private Prescription prescription;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "admission_id", nullable = true)
private HospitalAdmission hospitalAdmission;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "discharge_id", nullable = true)
private Discharge discharge;
```

### B. Thực thể `MedicalTest` (`MedicalTest.java`)
Bổ sung cột `is_paid`:
```java
@Column(name = "is_paid", nullable = false)
@Builder.Default
private Boolean isPaid = false;
```

### C. Migration Schema (PostgreSQL)
Tạo file migration hoặc áp dụng tự động qua schema update:
```sql
ALTER TABLE medical_tests ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(booking_id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS medical_test_id UUID REFERENCES medical_tests(test_id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES prescriptions(prescription_id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES hospital_admissions(admission_id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discharge_id UUID REFERENCES discharges(discharge_id);

CREATE INDEX IF NOT EXISTS idx_txn_booking_id ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_txn_medical_test_id ON transactions(medical_test_id);
CREATE INDEX IF NOT EXISTS idx_txn_prescription_id ON transactions(prescription_id);
CREATE INDEX IF NOT EXISTS idx_txn_admission_id ON transactions(admission_id);
```

---

## 3. CHI TIẾT THAY ĐỔI LOGIC NGHIỆP VỤ (BACKEND)

### Bước 1: Chuẩn hóa `CashierServiceImpl.java`
1. **Phân tách Hóa đơn (`getPendingBills` & `buildBillsFromBookings`):**
   * Nếu có xét nghiệm chưa thanh toán (`test.getIsPaid() == false`): Tạo mục hóa đơn `BILL-[bookingCode]-TEST-[testId]` (hoặc nhóm `BILL-[bookingCode]-TEST` hiển thị từng xét nghiệm cụ thể).
   * Nếu có đơn thuốc chưa thanh toán (`prescription.getIsPaid() == false`): Tạo mục hóa đơn `BILL-[bookingCode]-PRESCRIPTION-[prescriptionId]`.
   * Chấm dứt việc gộp chung thành một mã `-TREATMENT`.
2. **Cập nhật trạng thái trong `processPayment`:**
   * Khi thanh toán hóa đơn xét nghiệm: Đánh dấu `medicalTest.setIsPaid(true)` và lưu `transaction.setMedicalTest(test)`.
   * Khi thanh toán hóa đơn đơn thuốc: Đánh dấu `prescription.setIsPaid(true)` và lưu `transaction.setPrescription(prescription)`.
   * **Bảo vệ Check-In:**
     ```java
     // CHỈ gọi checkIn khi thanh toán công khám ban đầu VÀ ca khám chưa kết thúc
     if (billId.endsWith("-EXAM") || billId.endsWith("-ALL")) {
         if (booking.getPrice() != null && booking.getPrice().signum() > 0) {
             booking.setIsPaid(true);
         }
         if (booking.getStatus() != BookingStatus.COMPLETED && booking.getStatus() != BookingStatus.CANCELLED) {
             reception.checkIn(booking, com.hospital.api.constant.CounterType.APPOINTMENT, false);
         }
     }
     ```
3. **Quyết toán viện phí nội trú đầy đủ trong `processInpatientPayment`:**
   * Sử dụng khóa bi quan:
     ```java
     HospitalAdmission admission = admissionRepository.findByIdForUpdate(admissionId)
             .orElseThrow(() -> new AppException("Không tìm thấy thông tin nhập viện", HttpStatus.NOT_FOUND));
     ```
   * Tính toán tổng viện phí thực tế:
     * Tiền giường: $\text{days} \times \text{dailyFee}$.
     * Tiền thuốc y lệnh: Duyệt các `InpatientDoctorOrder` của đợt nhập viện, tính tổng thành tiền thuốc.
     * Tiền cận lâm sàng nội trú: Tổng tiền các `MedicalTest` thuộc đợt điều trị nội trú.
     * Trừ các khoản đã tạm ứng trước đó (`TransactionType.PAY_INPATIENT_FEE` có `status = SUCCESS`).

### Bước 2: Chuẩn hóa `ClinicalExaminationServiceImpl.java`
1. **Hàm `isTestPaid(MedicalTest test)`:**
   ```java
   private boolean isTestPaid(MedicalTest test) {
       if (test.getPrice() == null || test.getPrice().compareTo(BigDecimal.ZERO) == 0) {
           return true;
       }
       if (Boolean.TRUE.equals(test.getIsPaid())) {
           return true;
       }
       // Kiểm tra giao dịch trực tiếp gắn với testId
       return transactionRepository.existsByMedicalTest_TestIdAndStatus(test.getTestId(), "SUCCESS");
   }
   ```
2. **Hàm `cancelMedicalTest` (Hoàn tiền hủy dịch vụ):**
   * Nếu xét nghiệm đã thanh toán (`isTestPaid(test) == true`):
     * Tìm tài khoản bệnh nhân (`booking.getPatientProfile().getAccount()`).
     * Cộng lại tiền vào ví bệnh nhân (`account.getBalance().add(test.getPrice())`).
     * Ghi nhận giao dịch `TransactionType.REFUND`:
       * `amount = test.getPrice()`, `status = "SUCCESS"`, `paymentMethod = PaymentMethod.WALLET`.
       * `description = "Hoàn tiền xét nghiệm [" + test.getTestType().getTestName() + "] do bác sĩ hủy chỉ định"`.
       * Gắn `transaction.setMedicalTest(test)`.
     * Cập nhật `test.setIsPaid(false)`.

### Bước 3: Chuẩn hóa `PharmacyInventoryServiceImpl.java`
1. **Kiểm tra thanh toán đơn thuốc trong `dispensePrescription`:**
   ```java
   // 2. Chốt chặn Quầy Thu Ngân (Pharmacy Payment Gatekeeper)
   if (!Boolean.TRUE.equals(prescription.getIsPaid())) {
       boolean hasPaidTxn = transactionRepository.existsByPrescription_PrescriptionIdAndStatus(prescription.getPrescriptionId(), "SUCCESS");
       if (!hasPaidTxn && (booking == null || !Boolean.TRUE.equals(booking.getIsPriority()))) {
           throw new AppException("Đơn thuốc [" + prescription.getPrescriptionCode() + "] chưa được thanh toán tiền thuốc tại quầy thu ngân!", HttpStatus.PAYMENT_REQUIRED);
       }
   }
   ```

### Bước 4: Mở rộng xử lý cổng thanh toán trực tuyến (`PaymentServiceImpl.java`)
1. Trong `resolvePaymentBooking`: Đổi tên thành `resolvePaymentTarget` để xử lý đa dạng các loại giao dịch.
2. Khi Webhook PayOS hoặc IPN VNPay trả về trạng thái thành công:
   * Nếu `transactionType == PAY_MEDICAL_TEST`: Đọc `medical_test_id`, set `medicalTest.setIsPaid(true)`.
   * Nếu `transactionType == PAY_PRESCRIPTION`: Đọc `prescription_id`, set `prescription.setIsPaid(true)`.
   * Nếu `transactionType == PAY_INPATIENT_FEE`: Đọc `admission_id`, set `discharge.setIsPaid(true)`.

---

## 4. CHI TIẾT THAY ĐỔI GIAO DIỆN (FRONTEND)

* File: `src/pages/cashier/CashierPage.jsx`
  * Đồng bộ hiển thị danh sách hóa đơn theo loại:
    * Tag màu xanh: "Khám bệnh" (`EXAM`).
    * Tag màu vàng/cam: "Cận lâm sàng / Xét nghiệm" (`TEST`).
    * Tag màu tím/xanh ngọc: "Đơn thuốc ngoại trú" (`PRESCRIPTION`).
    * Tag màu đỏ/xanh dương: "Viện phí nội trú" (`INPATIENT`).
  * Cho phép thu ngân chọn thanh toán riêng lẻ từng hóa đơn hoặc thanh toán tất cả cho bệnh nhân.

---

## 5. KẾ HOẠCH KIỂM THỬ HỒI QUY (TEST MATRIX)

1. **Test Suite Mới: `PaymentItemizationSecurityTest.java`**
   * `testMedicalTestPaidDoesNotAuthorizeMedicineDispensing()`: Xác minh đóng tiền xét nghiệm KHÔNG mở khóa cấp phát thuốc.
   * `testPrescriptionPaidDoesNotAuthorizeUnpaidMedicalTest()`: Xác minh đóng tiền thuốc KHÔNG mở khóa xét nghiệm chưa trả tiền.
   * `testCompletedBookingCanPayPrescriptionWithout409Conflict()`: Xác minh ca khám đã `COMPLETED` vẫn thanh toán tiền thuốc bình thường tại quầy thu ngân.
   * `testCancelPaidMedicalTestRefundsAccountBalance()`: Xác minh hủy xét nghiệm đã đóng tiền sẽ tự động hoàn tiền vào tài khoản và tạo giao dịch `REFUND`.
2. **Test Suite Cập Nhật: `InpatientServiceTest.java`**
   * `testDischargeSettlementIncludesMedicationsAndTests()`: Xác minh quyết toán xuất viện tính đủ tiền giường, tiền thuốc nội trú và tiền xét nghiệm nội trú.
   * `testPessimisticLockOnInpatientPaymentPreventsDoublePayment()`: Xác minh gọi đồng thời 2 request thanh toán nội trú không bị thu trùng.
3. **Frontend Tests:**
   * Chạy toàn bộ test suites hiện có qua Vitest (`pnpm test:run`).
   * Kiểm tra giao diện `CashierPage.test.jsx`.
   * Kiểm tra `npm run build` không có lỗi lint/compilation.

---

## 6. PHẠM VI ẢNH HƯỞNG (BLAST RADIUS) & KẾ HOẠCH DỰ PHÒNG (ROLLBACK)

* **Phạm vi an toàn:**
  * Các cột mới thêm vào CSDL đều là `nullable = true` hoặc có giá trị mặc định (`DEFAULT FALSE`), đảm bảo dữ liệu lịch sử không bị lỗi khi migrate.
  * Các API trả về cho quầy thu ngân giữ nguyên định dạng `CashierPendingBillResponse` và `CashierReceiptResponse`, đảm bảo frontend tương thích hoàn toàn.
* **Kế hoạch dự phòng (Rollback Strategy):**
  * Lưu trữ backup code qua Git trước khi thay đổi.
  * Nếu có lỗi phát sinh trong quá trình chuyển đổi, các trường liên kết khóa ngoại không ảnh hưởng đến các câu truy vấn cũ.

---

## 7. BƯỚC TIẾP THEO

Kế hoạch đã sẵn sàng để triển khai. Khi bạn phê duyệt kế hoạch này bằng cách gõ:
**`ENTER EXECUTE MODE`** (hoặc xác nhận cho phép tiến hành sửa code), tôi sẽ chuyển sang pha **EXECUTE** để thực hiện lần lượt các bước trên.

