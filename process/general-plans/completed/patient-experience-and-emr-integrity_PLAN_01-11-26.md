# KẾ HOẠCH TOÀN DIỆN: CẢI THIỆN TRẢI NGHIỆM BỆNH NHÂN & TOÀN VẸN DỮ LIỆU Y TẾ (PATIENT EXPERIENCE & EMR INTEGRITY)

**Mã kế hoạch:** `PLAN-PATIENT-EMR-INTEGRITY-01-11-26`  
**Ngày cập nhật:** 01/11/2026  
**Trạng thái:** HOÀN TẤT & ĐÃ XÁC MINH (COMPLETED & VERIFIED)  
**Quy chuẩn áp dụng:** RIPER-5 / AGENTS.md / vc-generate-plan  

---

## 1. TỔNG QUAN & BỐI CẢNH (EXECUTIVE SUMMARY)

Đợt rà soát và nghiên cứu hiện trạng hệ thống cho thấy phân hệ dành cho BỆNH NHÂN đang gặp 6 nhóm vấn đề trọng yếu cần khắc phục triệt để:
1. **Dữ liệu giả lập (Mock/Hallucinated data) trong Bệnh án Điện tử (EMR):** Modal EMR và trang lịch sử khám bệnh đang chứa nhiều đoạn văn bản giả lập (địa chỉ, số CCCD, mã BHYT mẫu, bệnh sử mẫu, chẩn đoán phân biệt suy diễn, chữ ký số giả BSCKII mẫu) thay vì phản ánh trung thực dữ liệu lâm sàng thực tế của bệnh nhân hoặc hiển thị trạng thái "Chưa có dữ liệu".
2. **Nhập nhằng giữa Số khám Bác sĩ và Số phiếu Quầy Tiếp đón:** Giao diện thẻ khám (`selectedTicketDetail`) đang hiển thị số khám bác sĩ (`queueNumber` / `KB-xx`) dưới nhãn "Số thứ tự tiếp nhận", khiến bệnh nhân nhầm lẫn với số phiếu chờ quầy đón tiếp (`TH-xx` / `AP-xx`). Thiếu thanh tiến trình 5 bước theo dõi hành trình khám (`Đặt lịch` → `Thanh toán` → `Check-in Kiosk/Quầy` → `Chờ buồng khám` → `Hoàn tất`).
3. **Trang Hóa đơn (`MedicalBillsPage.jsx`) bị ghép sai bản chất:** Đang lấy danh sách booking (`/api/bookings/my-bookings`) gán ép giá mặc định `200.000đ` làm viện phí; chưa tích hợp endpoint hóa đơn thực tế và lịch sử giao dịch thanh toán từ backend.
4. **Thông báo bị phân mảnh:** Tab 3 trong Hồ sơ cá nhân (`PatientProfilesPage.jsx`) đang dùng HTML cứng tĩnh với 2 thông báo mẫu, không liên kết với API thông báo cá nhân (`GET /api/utilities/notifications`) đang hoạt động ở Navbar.
5. **Rò rỉ thông tin riêng tư trên Màn hình TV Hàng đợi công khai:** Endpoint `/api/clinical/queue/public` đang trả về nguyên vẹn số điện thoại bệnh nhân, ngày sinh đầy đủ, triệu chứng nhạy cảm và UUID nội bộ. Tra cứu công khai booking code cũng chưa ẩn `patientProfileId`.
6. **Mập mờ quan hệ trong Hồ sơ gia đình:** Thực thể `PatientProfile` chưa có trường quan hệ (`relationship`), khiến tất cả hồ sơ người thân (con cái, cha mẹ, vợ chồng) đều bị hiển thị mặc định là "Bản thân".

---

## 2. PHẠM VI & ĐIỂM CHẠM THAY ĐỔI (TOUCHPOINTS & SCOPE)

### 2.1. Backend (`hospital-api`)
- `hospital-api/src/main/java/com/hospital/api/dto/response/BookingResponse.java`:
  - Bổ sung các trường hành trình: `Boolean isPaid`, `LocalDateTime checkedInAt`, `LocalDateTime dispatchedAt`, `String counterTicketCode`, `Integer counterQueueNumber`, `String counterName`.
  - Cập nhật `withMaskedPatientInfo`: Mask hoặc gán `null` cho `patientProfileId`, `identityNumber`, `symptoms` để bảo mật khi tra cứu công khai qua mã booking.
- `hospital-api/src/main/java/com/hospital/api/service/impl/BookingServiceImpl.java`:
  - Bổ sung logic tra cứu và ánh xạ thông tin phiếu quầy (nếu có) vào `BookingResponse`.
  - Cập nhật `cancelBooking`: Khi hủy lịch khám, tự động cập nhật mọi `CounterTicket` đang ở trạng thái `WAITING` hoặc `CALLING` thuộc booking này sang trạng thái `SKIPPED`.
- `hospital-api/src/main/java/com/hospital/api/dto/response/DoctorQueueResponse.java` & `ClinicalExaminationServiceImpl.java`:
  - Tạo phương thức `toPublicQueueResponse` ẩn triệu chứng lâm sàng, mask số điện thoại (`098****321`), mask họ tên bệnh nhân (`NGUYỄN V*** A`), ẩn ngày sinh đầy đủ (chỉ giữ năm sinh) và ẩn UUID nội bộ cho màn hình TV công khai (`GET /api/clinical/queue/public`).
- `hospital-api/src/main/java/com/hospital/api/entity/PatientProfile.java`, `PatientProfileRequest.java`, `PatientProfileResponse.java`:
  - Thêm trường `relationship` (`SELF`, `SPOUSE`, `CHILD`, `PARENT`, `OTHER`) mặc định là `SELF`.
- `hospital-api/src/main/java/com/hospital/api/controller/PaymentController.java` & `CashierService.java`:
  - Mở endpoint `GET /api/payment/my-pending-bills` cho bệnh nhân lấy danh sách khoản viện phí thực tế cần nộp (tiền khám, xét nghiệm, thuốc) được tính toán chính xác từ hệ thống viện phí, tránh lấy booking giá giả.

### 2.2. Frontend (`hospital-ui`)
- `hospital-ui/src/components/common/ElectronicMedicalRecordModal.jsx`:
  - Xóa bỏ 100% dữ liệu mẫu hardcoded: CCCD mẫu `001197008899`, BHYT mẫu `DN 4 01 09 00123456`, ngày sinh `1997-07-08`, địa chỉ `Tuyên Quang`, bệnh sử ho có đờm sốt 37.8°C, chẩn đoán phân biệt viêm phổi thùy, chữ ký BSCKII Trần Văn Hùng, CCHN mẫu.
  - Hiển thị chuẩn xác dữ liệu từ hồ sơ bệnh án thật (`ehr`); nếu chưa có dữ liệu ở mục nào, hiển thị nhãn trạng thái *"Chưa có dữ liệu ghi nhận"* hoặc `---`.
- `hospital-ui/src/pages/patient/MedicalHistoryPage.jsx`:
  - Bỏ hàm `getDetailedRecordData` sinh dữ liệu giả với giá cứng `200.000đ` và lời dặn mẫu.
  - Hiển thị danh sách hồ sơ khám thật của bệnh nhân và liên kết mở `ElectronicMedicalRecordModal` với dữ liệu thực từ backend.
- `hospital-ui/src/pages/patient/PatientProfilesPage.jsx`:
  - Phân tách rõ ràng: **Số thứ tự khám Bác sĩ** (`KB-xx` / `UT-xx`) và **Số phiếu quầy tiếp đón** (`TH-xx` / `AP-xx`).
  - Tích hợp Thanh tiến trình hành trình khám bệnh 5 bước trực quan (`Stepper`): Đặt lịch → Thanh toán viện phí → Tiếp đón/Check-in → Chờ phòng khám → Hoàn tất khám.
  - Tab 3 (Thông báo): Bỏ HTML mẫu, thay bằng danh sách thông báo thật lấy từ `GET /api/utilities/notifications`, hỗ trợ đánh dấu đã đọc (`PUT /api/utilities/notifications/{id}/read`) và đánh dấu tất cả (`PUT /api/utilities/notifications/read-all`).
  - Hỗ trợ chọn/hiển thị Quan hệ gia đình (`Chủ tài khoản`, `Con cái`, `Vợ/Chồng`, `Bố/Mẹ`, `Người thân khác`) khi xem và tạo hồ sơ.
- `hospital-ui/src/pages/patient/MedicalBillsPage.jsx`:
  - Cải tiến thành 2 tab trực quan:
    - Tab 1: **Khoản Viện Phí Cần Nộp** (Lấy từ `GET /api/payment/my-pending-bills`, hiển thị chi tiết tiền khám/xét nghiệm/thuốc, số tiền đã trả, còn nợ và nút thanh toán PayOS/VietQR - duy trì tương thích kiểm thử).
    - Tab 2: **Lịch Sử Giao Dịch & Biên Lai** (Lấy từ `GET /api/payment/history`, cho phép xem chi tiết biên nhận thu tiền có mã giao dịch, cổng thanh toán và thời gian thực).
- `hospital-ui/src/pages/patient/BookingPage.jsx`:
  - Cập nhật hiển thị nhãn quan hệ của hồ sơ gia đình (`relationship`) thay vì ép cứng `"Bản thân"`.

---

## 3. CHI TIẾT CÁC GIAI ĐOẠN THỰC THI (DETAILED EXECUTION PHASES)

### PHA 1: Toàn vẹn Dữ liệu Bệnh án Điện tử (EMR & Medical Records Integrity)
- **Mục tiêu:** Xóa triệt để các dữ liệu giả định/hallucination, trả lại tính chuẩn xác y khoa của hệ thống EMR.
- **Thực hiện:**
  1. Trong `ElectronicMedicalRecordModal.jsx`:
     - Thay thế các chuỗi fallback bằng giá trị thực:
       - Ngày sinh: `booking.patientDob ? formatDate(booking.patientDob) : "Chưa cập nhật"`
       - CCCD: `booking.identityNumber || ehr.identityNumber || "Chưa cập nhật"`
       - BHYT: `booking.healthInsuranceNumber || ehr.healthInsuranceNumber ? `${booking.healthInsuranceNumber || ehr.healthInsuranceNumber}` : "Không đăng ký BHYT"`
       - Địa chỉ: `booking.patientAddress || ehr.patientAddress || "Chưa cập nhật"`
       - Quá trình bệnh lý: `ehr.clinicalProcess || "Bác sĩ chưa ghi nhận quá trình bệnh lý chi tiết"`
       - Tiền sử bản thân: `ehr.personalHistory || "Chưa ghi nhận tiền sử dị ứng/bệnh lý đặc biệt"`
       - Tiền sử gia đình: `ehr.familyHistory || "Chưa ghi nhận tiền sử gia đình"`
       - Chẩn đoán phân biệt: `ehr.differentialDiagnosis ? ehr.differentialDiagnosis : "Không có chẩn đoán phân biệt"`
       - Trưởng khoa & Bác sĩ ký: Chỉ hiển thị khối ký duyệt khi bệnh án có trạng thái đã hoàn tất (`COMPLETED`); hiển thị đúng tên bác sĩ điều trị thực tế, không dùng tên giả `BSCKII. TRẦN VĂN HÙNG`.
       - Nhãn đánh giá sinh tồn: Không gán cứng "Sốt nhẹ" hay "Khí phòng an toàn"; chỉ đánh giá dựa trên ngưỡng số học thật hoặc ghi "Chỉ số bình thường" / "Chưa có dữ liệu".
  2. Trong `MedicalHistoryPage.jsx`:
     - Xóa logic sinh mock advice và mock fee `200000`. Đọc trực tiếp từ `record.diagnosis`, `record.treatmentPlan`, `record.doctorAdvice`, `record.prescriptions`, `record.medicalTests`.
     - Nếu hồ sơ đang trong trạng thái chờ hoặc chưa khám xong, hiển thị trạng thái *"Đang tiến hành khám / Chưa có kết luận cuối cùng"*.

---

### PHA 2: Hành trình Khám bệnh & Phân định Số thứ tự (Journey Tracking & Queuing)
- **Mục tiêu:** Giúp bệnh nhân theo dõi toàn bộ hành trình đi khám minh bạch, không nhầm lẫn số khám và số quầy.
- **Thực hiện:**
  1. Backend `BookingResponse.java`:
     - Thêm: `Boolean isPaid`, `LocalDateTime checkedInAt`, `LocalDateTime dispatchedAt`, `String counterTicketCode`, `Integer counterQueueNumber`, `String counterName`.
     - Cập nhật builder/constructor tương ứng.
  2. Backend `BookingServiceImpl.java`:
     - Khi map sang `BookingResponse`, nếu có `CounterTicket` liên kết với booking này trong ngày, điền mã vé (`ticketCode`, e.g. `TH-03`), số vé (`queueNumber`) và tên quầy tiếp đón.
     - Cập nhật `cancelBooking`: Tìm `counterTicketRepository.findAllByBookingForUpdate(booking.getBookingId())` và set `status = CounterTicketStatus.SKIPPED` cho các phiếu chưa được phục vụ (`WAITING`, `CALLING`).
  3. Frontend `PatientProfilesPage.jsx`:
     - Tách mục "Số thứ tự tiếp nhận" thành 2 khối riêng biệt rõ ràng:
       - **Số thứ tự khám Bác sĩ:** Ghi rõ `KB-xx` (hoặc `UT-xx`), tên Bác sĩ, chuyên khoa và Phòng khám chỉ định.
       - **Số thứ tự Quầy Tiếp đón:** Nếu bệnh nhân đã lấy số quầy hoặc cần xử lý thủ tục tại quầy, hiển thị rõ `TH-xx` (hoặc `AP-xx`) cùng vị trí quầy. Nếu chưa đến viện, hiển thị hướng dẫn: *"Quý khách vui lòng quét mã QR tại Kiosk hoặc đến Quầy tiếp đón khi tới bệnh viện để lấy số phục vụ."*
     - Bổ sung `JourneyStepper` 5 bước:
       - Bước 1: `ĐÃ ĐẶT LỊCH` (Mã booking, thời gian hẹn).
       - Bước 2: `THANH TOÁN VIỆN PHÍ` (Đã thanh toán trước qua PayOS/Ví hoặc Thanh toán tại quầy).
       - Bước 3: `TIẾP ĐÓN & CHECK-IN` (Đã xác nhận có mặt tại Kiosk/Quầy).
       - Bước 4: `CHỜ VÀO BUỒNG KHÁM` (Đã điều phối vào danh sách chờ của bác sĩ, hiển thị số thứ tự KB).
       - Bước 5: `HOÀN THÀNH LƯỢT KHÁM` (Đã có bệnh án điện tử, đơn thuốc và hóa đơn).

---

### PHA 3: Hóa đơn Viện phí & Lịch sử Giao dịch (Billing, Invoices & Payment)
- **Mục tiêu:** Cung cấp thông tin thanh toán chuẩn xác, minh bạch khoản phải nộp, khoản đã nộp và biên lai giao dịch thật.
- **Thực hiện:**
  1. Backend `PaymentController.java` & `CashierService.java`:
     - Thêm endpoint: `GET /api/payment/my-pending-bills`
     - Logic: Lấy danh sách hồ sơ khám/booking của bệnh nhân đang đăng nhập có phát sinh chi phí nhưng chưa thanh toán đủ (`totalDue > totalPaid`), trả về danh sách chi tiết khoản thu (tiền khám, phí xét nghiệm cận lâm sàng, tiền thuốc).
  2. Frontend `MedicalBillsPage.jsx`:
     - Thiết kế giao diện 2 tab:
       - **Tab 1: Khoản Viện Phí Cần Nộp:**
         - Gọi `GET /api/payment/my-pending-bills` (với fallback tính toán an toàn từ booking nếu cần).
         - Hiển thị từng khoản: Tiền khám, Phí xét nghiệm, Tiền thuốc.
         - Hiển thị tổng tiền cần nộp, số tiền đã thanh toán, số tiền còn thiếu.
         - Nút "Thanh toán qua PayOS / VietQR" chỉ kích hoạt khi còn nợ tiền (`amountDue > 0`).
         - Đảm bảo tương thích hoàn toàn với unit test `MedicalBillsPage.test.jsx`.
       - **Tab 2: Lịch Sử Giao Dịch & Biên Lai:**
         - Gọi `GET /api/payment/history`.
         - Hiển thị bảng giao dịch thực tế: Mã giao dịch, Nội dung, Số tiền, Phương thức thanh toán (PayOS, VNPay, Tiền mặt tại quầy), Trạng thái (Thành công, Đang xử lý, Thất bại), Ngày giờ thanh toán.
         - Nút xem/in biên nhận điện tử cho từng giao dịch thành công.

---

### PHA 4: Trung tâm Thông báo Cá nhân (Unified Patient Notifications)
- **Mục tiêu:** Đồng bộ nguồn thông báo thực tế, xóa bỏ hoàn toàn giao diện tĩnh giả lập trong trang hồ sơ.
- **Thực hiện:**
  1. Frontend `PatientProfilesPage.jsx` (Tab 3):
     - Thay thế toàn bộ đoạn HTML hardcode tĩnh (lines 1724-1758) bằng logic kết nối với API `/api/utilities/notifications`.
     - Hiển thị danh sách thông báo theo thứ tự thời gian mới nhất.
     - Phân loại rõ ràng bằng badge: `Lịch khám`, `Thanh toán`, `Nhắc nhở`, `Hệ thống`.
     - Hiển thị trạng thái Chưa đọc (nền highlight nhạt, chấm xanh) và Đã đọc.
     - Tích hợp nút "Đánh dấu tất cả là đã đọc" (`PUT /api/utilities/notifications/read-all`) và click từng thông báo để đánh dấu đọc (`PUT /api/utilities/notifications/{id}/read`).
     - Hỗ trợ các trạng thái: Đang tải (`CircularProgress`), Danh sách trống (`Không có thông báo nào`), Lỗi tải dữ liệu (`Alert retry`).

---

### PHA 5: Bảo vệ Quyền riêng tư & Màn hình Công khai (Privacy & Public Safety)
- **Mục tiêu:** Tuyệt đối không để lộ thông tin định danh y tế nhạy cảm trên màn hình hàng đợi TV và tra cứu công khai.
- **Thực hiện:**
  1. Backend `ClinicalExaminationServiceImpl.java:867`:
     - Tại `getPublicQueue(LocalDate date)`: Thay vì trả về full `DoctorQueueResponse` từ entity, sử dụng phương thức ẩn danh hóa:
       - `patientPhone`: Mask thành dạng `098****321` hoặc `null`.
       - `patientName`: Mask thành dạng `NGUYỄN V*** A`.
       - `symptoms`: Gán `null` (triệu chứng lâm sàng không được hiển thị lên màn hình TV công cộng).
       - `patientProfileId`: Gán `null`.
       - `bookingId`: Gán `null`.
       - `patientDob`: Ẩn ngày tháng, chỉ giữ năm sinh hoặc gán `null`.
  2. Backend `BookingResponse.java:withMaskedPatientInfo`:
     - Sửa lỗi dòng 88: Thay `this.patientProfileId` bằng `null`.
     - Đảm bảo khi người lạ tra cứu mã booking trên kiosk/web công khai (`GET /api/bookings/code/{code}`), không bị rò rỉ database ID của bệnh nhân.

---

### PHA 6: Quản lý Hồ sơ Gia đình & Hướng dẫn Hành động Tiếp theo (UX & Family Profiles)
- **Mục tiêu:** Loại bỏ tình trạng mọi người thân đều bị ghi là "Bản thân", cung cấp chỉ dẫn rõ ràng cho người bệnh.
- **Thực hiện:**
  1. Backend `PatientProfile.java`, `PatientProfileRequest.java`, `PatientProfileResponse.java`:
     - Bổ sung trường `String relationship` (chấp nhận: `SELF` - Bản thân, `SPOUSE` - Vợ/Chồng, `CHILD` - Con cái, `PARENT` - Bố/Mẹ, `OTHER` - Người thân khác), giá trị mặc định là `"SELF"`.
     - Cập nhật `PatientProfileServiceImpl.java` để lưu và cập nhật quan hệ gia đình.
  2. Frontend `PatientProfilesPage.jsx` & `BookingPage.jsx`:
     - Khi thêm hồ sơ mới cho người thân, cho phép chọn vai trò quan hệ qua `Select` / `RadioGroup`.
     - Hiển thị chip phân biệt trên từng thẻ hồ sơ: `[Chủ tài khoản]`, `[Con cái]`, `[Bố mẹ]`, `[Vợ/Chồng]`.
     - Bổ sung thẻ **"Hướng dẫn bước tiếp theo" (Next Action Card)** trên thẻ lịch khám:
       - Nếu chưa thanh toán: *"Quý khách vui lòng hoàn tất thanh toán viện phí trực tuyến hoặc nộp tại quầy thu ngân."*
       - Nếu đã thanh toán, chưa check-in: *"Quý khách vui lòng quét mã QR tại Kiosk hoặc tới Quầy tiếp đón khi đến bệnh viện."*
       - Nếu đang chờ quầy: *"Quý khách vui lòng chú ý loa và màn hình tại Quầy tiếp đón số [X]."*
       - Nếu đang chờ bác sĩ: *"Quý khách vui lòng có mặt trước Phòng khám [Y] và chú ý màn hình gọi số khám KB-[Z]."*
       - Nếu đang khám / chờ kết quả xét nghiệm: *"Bác sĩ đã chỉ định xét nghiệm. Vui lòng di chuyển tới phòng xét nghiệm theo hướng dẫn."*

---

## 4. MA TRẬN ẢNH HƯỞNG & QUẢN TRỊ RỦI RO (BLAST RADIUS & RISKS)

| Điểm chạm | Phạm vi ảnh hưởng | Rủi ro tiềm ẩn | Biện pháp kiểm soát & Giảm thiểu |
|---|---|---|---|
| `BookingResponse.java` | Toàn bộ API trả về thông tin lịch hẹn | Lỗi biên dịch nếu các nơi khởi tạo constructor cũ bị lệch tham số | Sử dụng `@Builder(toBuilder = true)` và duy trì các factory method tương thích; bổ sung trường mới với giá trị mặc định an toàn |
| `ElectronicMedicalRecordModal.jsx` | Màn hình hiển thị bệnh án cho cả Bác sĩ & Bệnh nhân | Thiếu dữ liệu nếu backend trả về object rỗng | Áp dụng fallback hiển thị chữ `"Chưa có dữ liệu ghi nhận"` hoặc `"---"`, tuyệt đối không dùng text bịa đặt |
| `MedicalBillsPage.jsx` | Trang hóa đơn của bệnh nhân và thanh toán PayOS | Gãy unit test `MedicalBillsPage.test.jsx` | Giữ nguyên prop handler thanh toán và cấu trúc button PayOS khớp hoàn toàn với kịch bản test |
| `DoctorQueueResponse.java` | Màn hình TV gọi số công khai tại sảnh | Mất thông tin hiển thị của TV | Chỉ mask dữ liệu riêng tư (tên, sđt, triệu chứng), giữ nguyên `queueCode`, `queueNumber`, `roomName`, `isPriority` để TV hiển thị gọi số bình thường |
| `PatientProfile.java` | Schema cơ sở dữ liệu `patient_profiles` | Lỗi DB nếu thêm trường bắt buộc | Khai báo `@Column(name = "relationship", length = 50)` với `nullable = true` và gán default `"SELF"` ở entity |

---

## 5. KỊCH BẢN KIỂM THỬ & XÁC MINH (VERIFICATION CRITERIA)

Sau khi chuyển sang `EXECUTE MODE` và thực hiện thay đổi, toàn bộ các tiêu chí sau phải được kiểm chứng:

### 5.1. Backend Verification
- Biên dịch mã nguồn backend:
  ```powershell
  .\mvnw.cmd test-compile -DskipTests
  ```
  *Yêu cầu:* `BUILD SUCCESS`, 0 lỗi compilation.
- Kiểm thử luồng phân quyền và bảo vệ quyền riêng tư qua test case:
  - Test tra cứu công khai: kiểm tra phone và tên được mask, triệu chứng là `null`, `patientProfileId` là `null`.
  - Test huỷ lịch: kiểm tra `CounterTicket` chuyển sang `SKIPPED`.

### 5.2. Frontend Verification
- Chạy toàn bộ bộ test Vitest hiện hữu:
  ```powershell
  npm --prefix hospital-ui test -- --run
  ```
  *Yêu cầu:* 100% test pass (bao gồm `MedicalBillsPage.test.jsx`, `patientProfileFlow.test.js`, `CounterManagementPanel.test.jsx`, v.v.).
- Biên dịch Production Build:
  ```powershell
  npm --prefix hospital-ui run build
  ```
  *Yêu cầu:* Build thành công sạch sẽ, không lỗi bundle hay cú pháp JSX.

### 5.3. Tiêu chí Nghiệm thu Chức năng (Definition of Done - DoD)
1. Modal EMR và trang lịch sử khám không còn bất kỳ chữ nào về *"ho có đờm, đau họng, sốt nhẹ 37.8°C"*, *"CCCD 001197008899"*, *"BHYT DN 4 01 09 00123456"*, *"Tuyên Quang"* hay *"BSCKII. TRẦN VĂN HÙNG"*.
2. Số khám phòng bác sĩ (`KB-xx`) và số phiếu quầy tiếp đón (`TH-xx`) được ghi nhãn rõ ràng, tách biệt hoàn toàn trên thẻ vé khám.
3. Thanh hành trình 5 bước thể hiện đúng trạng thái hiện thời của bệnh nhân.
4. Trang hóa đơn hiển thị đúng các khoản viện phí thực tế cần nộp và lịch sử giao dịch thực tế từ cổng thanh toán.
5. Tab thông báo cá nhân kết nối API thật, hỗ trợ đọc và đánh dấu đã đọc.
6. Màn hình TV công khai không còn lộ SĐT và triệu chứng bệnh án của bệnh nhân.
7. Hồ sơ người thân trong gia đình hiển thị đúng nhãn quan hệ (`Con cái`, `Bố/Mẹ`, v.v.).

---
*Kế hoạch đã sẵn sàng để chuyển sang chế độ EXECUTE khi có sự xác nhận của người dùng.*

