# 📋 KẾ HOẠCH TRIỂN KHAI: KHUNG GIỜ CHECK-IN KIOSK & ƯU TIÊN ĐỌC KẾT QUẢ XÉT NGHIỆM

> **Mã công việc:** TASK-14  
> **Người lập:** Senior Fullstack & Medical Systems Engineer  
> **Nguồn cảm hứng kỹ thuật:**  
> 1. `E-healthcare` (`server/src/modules/reception/check-in-window.ts`) - Cơ chế Kiểm soát Khung giờ Check-in (Check-in Window Guard).  
> 2. `revita-be` (`src/booth-queue/priority-calculator.service.ts`) - Cơ chế Ưu tiên Bệnh nhân có kết quả Xét nghiệm (`RETURN_AFTER_RESULT`).  
> **Trạng thái:** ⏳ **CHỜ PHÊ DUYỆT (WAITING FOR APPROVAL)**

---

## 🎯 1. MỤC TIÊU NGHIỆP VỤ & PHẠM VI

### 1.1. Luồng 1: Khung giờ Check-in Kiosk (Check-in Window Guard)
* **Vấn đề thực tế tại bệnh viện:** Bệnh nhân đặt lịch khám buổi chiều (ví dụ 14:00 - 14:30) nhưng đến từ 07:30 sáng quét mã in phiếu STT, làm nhảy cóc số thứ tự của ca sáng và khiến bệnh nhân ca sáng phải chờ đợi. Ngược lại, bệnh nhân đến trễ quá 30–60 phút sau khi ca khám kết thúc làm vỡ lịch hẹn của bác sĩ.
* **Mục tiêu kỹ thuật:**
  1. Thêm API check-in tại Kiosk cho bệnh nhân đã đặt lịch trước: `POST /api/bookings/kiosk/check-in` (nhận `bookingCode` hoặc `phoneNumber`).
  2. Kiểm tra quy tắc khung giờ y tế:
     - **Sai ngày (`OTHER_DAY`):** Nếu `bookingDate != today` ➔ Báo lỗi: *"Lịch khám của bạn vào ngày DD/MM/YYYY. Hệ thống chỉ tiếp nhận check-in trong ngày khám."*
     - **Quá sớm (`TOO_EARLY`):** Nếu `now < startTime - 60 phút` ➔ Báo lỗi: *"Chưa đến giờ tiếp nhận. Vui lòng check-in trước giờ khám tối đa 60 phút (từ HH:mm)."*
     - **Quá trễ (`TOO_LATE`):** Nếu `now > endTime + 15 phút` ➔ Báo lỗi: *"Đã quá thời gian tiếp nhận ca khám (quá 15 phút sau kết thúc khung giờ). Vui lòng đến Quầy tiếp đón để được hỗ trợ phân luồng."*
     - **Hợp lệ (`OPEN`):** Đổi trạng thái lịch khám sang `CONFIRMED` (nếu trước đó là `PENDING_PAYMENT` đã thanh toán hoặc đã xác nhận), cấp phiếu in nhiệt STT hợp lệ vào hàng đợi.
  3. Cập nhật giao diện `KioskPage.jsx`: Bổ sung tab/chế độ **"Quét mã / Nhập mã đặt hẹn Check-in"** bên cạnh chế độ lấy số tự do (Walk-in).

### 1.2. Luồng 2: Ưu tiên Đọc Kết quả Xét nghiệm (`RETURN_AFTER_RESULT`)
* **Vấn đề thực tế tại bệnh viện:** Bệnh nhân sau khi được bác sĩ khám ban đầu và chỉ định đi lấy máu, chụp X-quang; khi phòng Lab trả kết quả xong (`COMPLETED`), bệnh nhân quay lại buồng khám nhưng bị kẹt phía sau các bệnh nhân mới đến hoặc phải chen ngang vào cửa phòng bác sĩ.
* **Mục tiêu kỹ thuật:**
  1. Khi kỹ thuật viên Lab hoàn tất toàn bộ xét nghiệm của ca khám (`allDone == true`), bệnh án chuyển trạng thái `MedicalExamState.DIAGNOSING`.
  2. Nâng cấp thuật toán sắp xếp hàng đợi tại `ClinicalExaminationServiceImpl.java` (`getDoctorQueue` và `getPublicQueue`):
     - **Nhóm 1 (Đang khám):** `status == IN_PROGRESS`.
     - **Nhóm 2 (Đã có kết quả CLS - RETURN_AFTER_RESULT):** `record != null && record.state == DIAGNOSING` ➔ Đưa lên **đầu hàng đợi chờ khám** (trước cả bệnh nhân ưu tiên mới đến), gán nhãn `isReturnAfterResult = true` và `queueCode = "KQ-XX"`.
     - **Nhóm 3 (Bệnh nhân ưu tiên chính sách):** `isPriority == true` (Người cao tuổi, Trẻ nhỏ, Phụ nữ mang thai).
     - **Nhóm 4 (Bệnh nhân thường):** Sắp xếp theo `queueNumber ASC`.
  3. Cập nhật giao diện Bàn khám Bác sĩ (`ExaminationPage.jsx`):
     - Hiển thị chip nổi bật màu tím: `[ĐÃ CÓ KẾT QUẢ CLS - ƯU TIÊN VÀO KHÁM]`.
     - Bác sĩ bấm gọi số sẽ tự động ưu tiên mời bệnh nhân có kết quả vào trước để hoàn tất chẩn đoán.

---

## 🛠️ 2. PHÂN TÍCH TÁC ĐỘNG & BẢO TOÀN DỮ LIỆU

* **Database Schema:** **KHÔNG THAY ĐỔI CƠ SỞ DỮ LIỆU (Zero Schema Mutation)**.
  - Sử dụng 100% các trường sẵn có: `Booking.bookingDate`, `Booking.timeSlot` (`startTime`, `endTime`), `MedicalExaminationRecord.state` (`DIAGNOSING`).
* **Tính toàn vẹn & Phân quyền:**
  - Endpoint check-in Kiosk `/api/bookings/kiosk/check-in` được mở công khai trong `SecurityConfig` (giống `/api/bookings/kiosk`).
  - Bàn khám Bác sĩ giữ nguyên phân quyền `@PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")`.

---

## 📝 3. CÁC TẬP TIN DỰ KIẾN THAY ĐỔI & TẠO MỚI

### 3.1. Backend Java (Spring Boot)
1. **`KioskCheckInRequest.java`** *(Tạo mới)*: Record request chứa `bookingCode` hoặc `phoneNumber`.
2. **`KioskCheckInResponse.java`** *(Tạo mới)*: Record response chứa thông tin phiếu, `CheckInWindowStatus` (`OPEN`, `TOO_EARLY`, `TOO_LATE`, `OTHER_DAY`), giờ khám và thông báo hướng dẫn.
3. **`CheckInWindowStatus.java`** *(Tạo mới)*: Enum các trạng thái khung giờ tiếp nhận.
4. **`DoctorQueueResponse.java`** *(Sửa đổi)*: Bổ sung trường `Boolean isReturnAfterResult` để frontend nhận diện ca quay lại sau xét nghiệm.
5. **`BookingService.java` & `BookingServiceImpl.java`** *(Sửa đổi)*:
   - Triển khai hàm `checkInKiosk(KioskCheckInRequest request)`.
   - Tính toán khoảng cách thời gian giữa `LocalTime.now()` và `TimeSlot.startTime`/`endTime` với ngưỡng: sớm tối đa 60 phút, trễ tối đa 15 phút.
6. **`BookingController.java`** *(Sửa đổi)*:
   - Thêm endpoint `POST /api/bookings/kiosk/check-in`.
7. **`ClinicalExaminationServiceImpl.java`** *(Sửa đổi)*:
   - Nâng cấp logic phân loại và sắp xếp hàng đợi trong `getDoctorQueue` và `getPublicQueue`: Đưa ca `DIAGNOSING` lên đầu danh sách chờ.
8. **`SecurityConfig.java`** *(Sửa đổi)*:
   - Cấp quyền `permitAll()` cho `/api/bookings/kiosk/check-in`.

### 3.2. Frontend React
9. **`KioskPage.jsx`** *(Sửa đổi)*:
   - Bổ sung công tắc/tab: **"Lấy số khám mới"** (Walk-in) và **"Check-in lịch đã đặt"** (Nhập/quét mã `BK-...`).
   - Hiển thị thông báo thân thiện rõ ràng nếu bệnh nhân đến quá sớm hoặc quá muộn.
10. **`ExaminationPage.jsx`** *(Sửa đổi)*:
    - Thêm badge/nhãn `[ĐÃ CÓ KẾT QUẢ CLS]` màu tím nổi bật cho bệnh nhân nhóm `RETURN_AFTER_RESULT`.

---

## 🧪 4. KỊCH BẢN KIỂM THỬ THỰC TẾ (AUTOMATED TEST PLAN)

Tạo file kịch bản `test_kiosk_checkin_and_lab_priority.js` chạy kiểm thử tự động 100% qua API thật:
1. **Ca 1 (Check-in Kiosk - Sai ngày):** Tạo lịch hẹn ngày mai, gọi check-in tại Kiosk ➔ Xác minh trả về lỗi `OTHER_DAY` và từ chối cấp số.
2. **Ca 2 (Check-in Kiosk - Quá sớm > 60 phút):** Tạo lịch hẹn hôm nay với khung giờ chiều (ví dụ 16:00), gọi check-in lúc sáng/trưa ➔ Xác minh trả về lỗi `TOO_EARLY` kèm thời gian được phép quay lại.
3. **Ca 3 (Check-in Kiosk - Hợp lệ):** Tạo lịch hẹn hôm nay với khung giờ hiện tại (±30 phút) ➔ Xác minh trả về `OPEN`, in phiếu STT thành công.
4. **Ca 4 (Check-in Kiosk - Quá trễ > 15 phút):** Tạo lịch hẹn với khung giờ đã kết thúc hơn 15 phút trước ➔ Xác minh trả về lỗi `TOO_LATE`.
5. **Ca 5 (Ưu tiên Trả kết quả CLS):**
   - Bệnh nhân A bốc số thường (STT 1), Bác sĩ tiếp nhận khám và chỉ định xét nghiệm ➔ Trạng thái chuyển `IN_TESTING`.
   - Bệnh nhân B bốc số ưu tiên (STT 2) vào hàng đợi.
   - Kỹ thuật viên Lab nhập và hoàn tất kết quả cho Bệnh nhân A ➔ Bệnh án Bệnh nhân A chuyển `DIAGNOSING`.
   - Lấy hàng đợi bác sĩ `GET /api/clinical/doctor/queue` ➔ Xác minh Bệnh nhân A được tự động nhảy lên vị trí đầu tiên của danh sách chờ với `isReturnAfterResult = true`.
6. **Ca 6 (Kiểm thử hồi quy):** Chạy lại toàn bộ `test_ehealthcare_improvements.js`, `test_security_hardening.js` và `test_cashier_workflow.js` đảm bảo không ảnh hưởng các chức năng trước đó.

---

## 🛑 5. ĐIỂM DỪNG CHỜ PHÊ DUYỆT (PAUSE & WAIT)

Theo quy định bắt buộc của dự án, mã nguồn sẽ **KHÔNG ĐƯỢC PHÉP CHỈNH SỬA** cho đến khi bản kế hoạch này được bạn xem xét và phê duyệt.
