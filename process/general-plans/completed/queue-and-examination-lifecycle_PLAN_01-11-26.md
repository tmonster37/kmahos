# Kế Hoạch Triển Khai: Chuẩn Hóa Vòng Đời Số Thứ Tự, Hàng Đợi & Chu Trình Khám Bệnh

- **Mode:** PLAN (EXECUTED & VERIFIED)
- **Date:** 01-11-2026
- **Status:** COMPLETED
- **Scope Ref:** Khảo sát RESEARCH và định hướng INNOVATE (Phương án 4A): Chuẩn hóa 3 loại số thứ tự, làm sạch hàng đợi quầy (lọc người chưa check-in), loại bỏ ca đã hoàn tất khỏi hàng đợi bác sĩ & màn hình TV, bổ sung Idempotency Key cho tiếp đón vãng lai, và phân tách quy trình gọi khám bác sĩ thành 3 bước (`CALLING` → `SKIPPED`/`RECALL` → `IN_PROGRESS`).

---

## 1. Mục Tiêu & Ranh Giới Nghiệp Vụ

1. **Phân biệt & liên kết chuẩn 3 loại số:**
   - **Mã Booking (`bookingCode`):** Định danh toàn viện, đa ngày (`BK` + `yyyyMMdd` + 6 ký tự).
   - **Số phiếu chờ quầy (`CounterTicket.ticketCode` & `queueNumber`):** Xếp hàng tại quầy tiếp đón trong ngày (`AP-xx`, `UT-xx`, `TH-xx`, `BH-xx`).
   - **Số khám bác sĩ (`Booking.queueNumber`):** Số thứ tự khám theo bác sĩ và ngày (1, 2, 3...).
   - Đảm bảo tính liên kết 1-1 giữa `CounterTicket` và `Booking`, không sinh số mới khi retry thanh toán hoặc retry điều phối.

2. **Dọn sạch hàng đợi quầy tiếp đón (Counter Queue Hygiene):**
   - Hàng đợi quầy chỉ hiển thị người đã có mặt tại viện (`checkedInAt != null`) và có việc cần giải quyết tại quầy (chưa đóng tiền hoặc có hóa đơn cận lâm sàng).
   - Tuyệt đối không đưa các booking đặt trước qua web nhưng chưa đến viện vào hàng đợi gọi số của quầy tiếp đón.

3. **Dọn sạch hàng đợi Bác sĩ & Màn hình LED TV (Doctor Queue & TV Display Hygiene):**
   - Cập nhật `BookingReceptionTransition.doctorEligible`: Loại trừ hoàn toàn các ca đã khám xong (`booking.getStatus() != BookingStatus.COMPLETED`).
   - Cập nhật `QueueDisplayPage.jsx`: Chỉ đưa các ca đang chờ (`WAITING`, `CONFIRMED`, `CALLING`) vào danh sách chờ trên màn hình TV; không đưa ca `COMPLETED` vào hàng đợi buồng khám.

4. **Chống tạo lượt trùng khi tiếp nhận vãng lai tại quầy (Nurse Walk-In Idempotency):**
   - Bổ sung `idempotencyKey` vào `NurseWalkInReceptionRequest` và lưu vào `CounterTicket`.
   - Kiểm tra trùng lặp trước khi khởi tạo Booking hoặc phát hành vé; nếu trùng key, trả về ngay kết quả ca khám cũ.

5. **Chu trình gọi khám lâm sàng 3 bước tại buồng Bác sĩ (Phương án 4A):**
   - Bổ sung trạng thái `CALLING` và `SKIPPED` vào `MedicalExamState`.
   - Mở 3 endpoint chuyên trách:
     - `POST /api/clinical/call-patient`: Phát loa mời vào, chuyển `recordState = CALLING`, TV hiển thị "Đang mời vào".
     - `POST /api/clinical/skip-patient`: Đánh dấu vắng mặt `SKIPPED`, tạm đưa xuống cuối hàng chờ.
     - `POST /api/clinical/recall-patient`: Khôi phục ca vắng mặt quay lại hàng chờ chủ động.
   - Giữ nguyên `POST /api/clinical/start`: Chỉ gọi khi bệnh nhân đã ngồi vào ghế khám, chuyển sang `IN_PROGRESS` và mở bệnh án điện tử.

---

## 2. Danh Sách Tệp Can Thiệp (Touchpoints)

### Backend (Spring Boot 3.4 / Java 21)
1. [`hospital-api/src/main/java/com/hospital/api/constant/MedicalExamState.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/constant/MedicalExamState.java) *(Chỉnh sửa)*: Bổ sung `CALLING` và `SKIPPED`.
2. [`hospital-api/src/main/java/com/hospital/api/dto/request/NurseWalkInReceptionRequest.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/dto/request/NurseWalkInReceptionRequest.java) *(Chỉnh sửa)*: Bổ sung trường `String idempotencyKey`.
3. [`hospital-api/src/main/java/com/hospital/api/service/impl/BookingReceptionTransition.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/BookingReceptionTransition.java) *(Chỉnh sửa)*: Thêm `booking.getStatus() != BookingStatus.COMPLETED` vào `doctorEligible`.
4. [`hospital-api/src/main/java/com/hospital/api/service/impl/NurseReceptionServiceImpl.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/NurseReceptionServiceImpl.java) *(Chỉnh sửa)*:
   - Trong `getReceptionQueue`: Thêm điều kiện `b.getCheckedInAt() != null`.
   - Trong `admitWalkInPatient`: Kiểm tra `idempotencyKey` trước khi tạo mới Booking/Ticket; gán `idempotencyKey` vào `CounterTicket`.
5. [`hospital-api/src/main/java/com/hospital/api/service/ClinicalExaminationService.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/ClinicalExaminationService.java) *(Chỉnh sửa)*: Khai báo `callPatient`, `skipPatient`, `recallPatient`.
6. [`hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalExaminationServiceImpl.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalExaminationServiceImpl.java) *(Chỉnh sửa)*:
   - Triển khai `callPatient`, `skipPatient`, `recallPatient`.
   - Trong `getQueueRank`: Phân hạng `CALLING` (ưu tiên gọi), `SKIPPED` (đẩy xuống cuối hàng chờ trước `COMPLETED`).
7. [`hospital-api/src/main/java/com/hospital/api/controller/ClinicalExaminationController.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/controller/ClinicalExaminationController.java) *(Chỉnh sửa)*: Mở 3 endpoint `/call-patient`, `/skip-patient`, `/recall-patient` (`@PreAuthorize("hasAnyRole('DOCTOR', 'HEAD_OF_DEPARTMENT', 'ADMIN')")`).

### Frontend (React / Vite)
8. [`hospital-ui/src/components/nurse/CounterManagementPanel.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/components/nurse/CounterManagementPanel.jsx) *(Chỉnh sửa)*: Lọc `queueList` trong `mergedQueue` chỉ nhận `item.checkedInAt != null`, loại bỏ booking chưa đến viện.
9. [`hospital-ui/src/pages/nurse/NurseReceptionPage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/nurse/NurseReceptionPage.jsx) *(Chỉnh sửa)*: Sinh và duy trì `idempotencyKey` khi mở form tiếp đón vãng lai, tái sử dụng khi retry.
10. [`hospital-ui/src/pages/QueueDisplayPage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/QueueDisplayPage.jsx) *(Chỉnh sửa)*:
    - Loại bỏ triệt để các ca `status === "COMPLETED"` khỏi danh sách chờ `roomsMap[rName].waiting`.
    - Hiển thị nhấp nháy nổi bật "ĐANG GỌI VÀO PHÒNG" khi ca có `recordState === "CALLING"`.
11. [`hospital-ui/src/pages/Doctor/ExaminationPage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/Doctor/ExaminationPage.jsx) *(Chỉnh sửa)*:
    - Bổ sung nút **`[GỌI VÀO PHÒNG]`** (`handleCallPatient`) và phát loa giọng nói.
    - Bổ sung nút **`[VẮNG MẶT / BỎ QUA]`** (`handleSkipPatient`) và **`[GỌI LẠI]`** (`handleRecallPatient`).
    - Nút **`[BẮT ĐẦU KHÁM]`** chỉ kích hoạt khi bệnh nhân đã vào phòng, chuyển sang `IN_PROGRESS` và mở form bệnh án.

---

## 3. Các Giai Đoạn Triển Khai Chi Tiết (Phases)

### Giai Đoạn 1: Làm Sạch Hàng Đợi Quầy Tiếp Đón (Counter Queue Hygiene)
- Cập nhật `NurseReceptionServiceImpl.getReceptionQueue`:
  ```java
  return bookings.stream()
      .filter(b -> b.getStatus() != BookingStatus.CANCELLED && b.getStatus() != BookingStatus.COMPLETED)
      .filter(b -> b.getCheckedInAt() != null) // Chỉ lấy bệnh nhân đã check-in
      .map(NurseQueueResponse::fromEntity)
      .toList();
  ```
- Cập nhật `CounterManagementPanel.jsx:846`:
  Thêm điều kiện `Boolean(item.checkedInAt)` khi duyệt `queueList` để merge vào `mergedQueue`.

### Giai Đoạn 2: Dọn Sạch Hàng Đợi Bác Sĩ & Màn Hình TV (Doctor Queue & TV Hygiene)
- Cập nhật `BookingReceptionTransition.doctorEligible`:
  ```java
  public static boolean doctorEligible(Booking booking) {
      return paymentEligible(booking) 
              && !booking.isDeleted() 
              && booking.getStatus() != BookingStatus.CANCELLED
              && booking.getStatus() != BookingStatus.COMPLETED
              && booking.getDispatchedAt() != null;
  }
  ```
- Cập nhật `QueueDisplayPage.jsx`:
  Chỉ đưa vào hàng chờ buồng khám nếu `item.status !== "COMPLETED" && item.status !== "CANCELLED"`.

### Giai Đoạn 3: Idempotency Key Cho Tiếp Nhận Vãng Lai Tại Quầy
- Thêm `String idempotencyKey` vào `NurseWalkInReceptionRequest`.
- Trong `NurseReceptionServiceImpl.admitWalkInPatient`:
  ```java
  if (request.idempotencyKey() != null && !request.idempotencyKey().isBlank()) {
      var existing = counterTicketRepository.findByIdempotencyKeyAndDeletedFalse(request.idempotencyKey());
      if (existing.isPresent() && existing.get().getBooking() != null) {
          return NurseQueueResponse.fromEntity(existing.get().getBooking());
      }
  }
  ```
  Gán `ticket.setIdempotencyKey(request.idempotencyKey())` khi lưu vé quầy mới.
- Trong `NurseReceptionPage.jsx`: Sinh UUID `idempotencyKey = "WALKIN-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8)` khi mở form, gửi kèm payload tiếp nhận.

### Giai Đoạn 4: Chu Trình Gọi Khám Lâm Sàng 3 Bước Tại Buồng Bác Sĩ (Option 4A)
- Mở rộng `MedicalExamState.java`:
  ```java
  public enum MedicalExamState {
      WAITING,        // Đang chờ tới lượt khám
      CALLING,        // Bác sĩ đang gọi vào buồng khám
      IN_PROGRESS,    // Đang khám lâm sàng tại bàn
      IN_TESTING,     // Đang đi làm các xét nghiệm cận lâm sàng
      DIAGNOSING,     // Đã có kết quả xét nghiệm, đang chẩn đoán & kê đơn
      SKIPPED,        // Bệnh nhân vắng mặt / Bỏ qua tạm thời
      DONE            // Đã hoàn thành buổi khám
  }
  ```
- Cập nhật `getQueueRank`:
  - `rank 1`: `IN_PROGRESS`
  - `rank 2`: `CALLING` (Đang gọi vào phòng)
  - `rank 3`: `isReturnAfterResult` (KQ xét nghiệm quay lại)
  - `rank 4`: `isPriority` (Ưu tiên chính sách $\ge 65$ tuổi, $< 6$ tuổi)
  - `rank 5`: `CONFIRMED` / `WAITING` (Khám thường)
  - `rank 6`: `SKIPPED` (Vắng mặt, xếp cuối hàng chờ)
  - `rank 7`: `DONE` / `COMPLETED`
- Xây dựng 3 API trong `ClinicalExaminationServiceImpl` & `ClinicalExaminationController`:
  - `POST /api/clinical/call-patient?bookingCode=...`: Chuyển `recordState = CALLING`.
  - `POST /api/clinical/skip-patient?bookingCode=...`: Chuyển `recordState = SKIPPED`.
  - `POST /api/clinical/recall-patient?bookingCode=...`: Đưa trở lại `WAITING`.
- Cập nhật UI `ExaminationPage.jsx`:
  - Tách nút "GỌI VÀO PHÒNG" khỏi "BẮT ĐẦU KHÁM".
  - Thêm badge hiển thị "Đang Gọi Số", nút "Mời Lại Loa" và nút "Vắng Mặt".
  - Bổ sung tab/khu vực danh sách "Bệnh nhân vắng mặt" để dễ dàng gọi lại khi bệnh nhân có mặt.

---

## 4. Đánh Giá Tác Động & Vùng Ảnh Hưởng (Blast Radius)

- **Cơ sở dữ liệu (Database Schema):** Hoàn toàn an toàn, không thay đổi cấu trúc bảng (DDL), không thêm bảng mới. Trường `idempotency_key` đã có sẵn trong bảng `counter_tickets`.
- **Luồng Kiosk & Đặt Lịch Web:** Giữ nguyên vẹn tính tương thích ngược 100%.
- **Quy tắc bảo mật (SoD):** Giữ vững ranh giới phân quyền vai trò (Điều dưỡng không xem lịch sử thu ngân, Bác sĩ không can thiệp quầy).

---

## 5. Kế Hoạch Xác Minh & Kiểm Thử (Verification Evidence)

1. **Biên dịch & Build:**
   - Backend: `cd hospital-api; .\mvnw.cmd test-compile -DskipTests` $\rightarrow$ `BUILD SUCCESS`.
   - Frontend: `cd hospital-ui; npm run build` $\rightarrow$ `SUCCESS`.
2. **Kiểm thử tự động Frontend:**
   - Chạy toàn bộ bộ test Vitest: `npm test` $\rightarrow$ 12 test suites, 52/52 tests tiếp tục `PASS 100%`.
   - Bổ sung test kiểm thử:
     - Lọc người chưa check-in khỏi `mergedQueue`.
     - Loại bỏ ca `COMPLETED` khỏi hàng đợi bác sĩ và TV screen.
     - Trạng thái `CALLING` và `SKIPPED` của quy trình khám bệnh.
3. **Kịch bản kiểm thử tích hợp thực tế:**
   - *Test 1:* Tạo booking đặt trước nhưng không check-in $\rightarrow$ Xác nhận không xuất hiện trong hàng đợi quầy `CounterManagementPanel`.
   - *Test 2:* Quét check-in cho booking trên $\rightarrow$ Xác nhận lập tức xuất hiện trong hàng đợi quầy.
   - *Test 3:* Bác sĩ khám và hoàn tất ca khám (`COMPLETED`) $\rightarrow$ Xác nhận ca khám lập tức biến mất khỏi hàng đợi phòng khám và màn hình TV `/queue-display`.
   - *Test 4:* Bấm "Tiếp Nhận Vãng Lai" 2 lần liên tiếp với cùng `idempotencyKey` $\rightarrow$ Xác nhận CSDL chỉ sinh ra đúng 1 Booking và 1 Vé.
   - *Test 5:* Bác sĩ bấm "Gọi Vào Phòng" $\rightarrow$ TV hiển thị "Đang Mời Vào Phòng", Bác sĩ bấm "Vắng Mặt" $\rightarrow$ Ca chuyển xuống cuối hàng đợi.

