# Kế hoạch triển khai khắc phục các lỗi vận hành khám bệnh & viện phí

**Mode:** PLAN
**Date:** 23-10-2026
**Cập nhật rà soát:** 31-10-2026
**Status:** COMPLETED — Đã hoàn thành và xác minh toàn bộ các hạng mục (P1-01, P1-02, P1-03, P1-04, P2-01, P2-02, P2-03, P2-04, P3-01, P3-02)

---

## 1. Mục tiêu (Goals)

Khắc phục các lỗi vận hành đã được xác minh, đồng thời thống nhất luồng đặt lịch, check-in, quầy tiếp đón, thanh toán và hàng đợi bác sĩ để bảo đảm:

- Lịch hẹn đã check-in và được xác nhận đã thanh toán tại Kiosk được điều phối thẳng vào hàng đợi bác sĩ.
- Lượt Kiosk vãng lai thanh toán ngay chỉ vào hàng đợi bác sĩ sau khi máy chủ xác nhận thanh toán; số khám và trạng thái được hiển thị rõ.
- Lượt web hoặc Kiosk có phí chưa thanh toán được tạo đúng một phiếu chờ tại quầy, được điều dưỡng gọi và xử lý thanh toán trước khi chuyển sang hàng đợi bác sĩ.
- Việc thử lại request, thanh toán hoặc check-in không tạo booking/phiếu quầy/lượt thanh toán trùng, không cấp số trùng và không vượt sức chứa slot.
- Lượt miễn phí (price=0, isPaid=false) được vào doctor queue sau dispatch hợp lệ. Giữ nguyên định tuyến và thứ tự ưu tiên tuổi/đối tượng trong luồng counter và doctor queue.
- Tiếp tục xử lý các mục P1/P2 hiện có trong kế hoạch này mà không thêm thay đổi ngoài phạm vi.

### 1.1. Ràng buộc và cách biểu diễn trạng thái

- Không thêm entity, bảng, cột, index, enum database hoặc migration. Dữ liệu đặt khám và điều phối dùng các trường hiện có của **Booking** và **CounterTicket**. Giao dịch thanh toán dùng sổ giao dịch hiện có; không mở rộng schema.
- Chỉ sự kiện thanh toán được máy chủ xác nhận mới được đặt **Booking.isPaid = true**. Giá trị client gửi như **payNow**, **BookingStatus.CONFIRMED** hoặc có **checkedInAt** tự thân không chứng minh đã thanh toán. Booking có giá khám bằng 0 vẫn giữ isPaid=false; điều kiện vào doctor queue là (isPaid=true OR price=0) AND dispatchedAt != null.
- Ưu tiên chỉ quyết định định tuyến/thứ tự hàng đợi; không tự chuyển một lượt có phí sang đã thanh toán hoặc cho qua chốt chặn thanh toán.
- Giữ check-in window hiện tại: đúng ngày khám, tối đa 60 phút sớm và tối đa 15 phút sau khi slot kết thúc.
- Giữ các cơ chế hiện có: lock TimeSlot khi xác nhận sức chứa; lock Counter trong lúc cấp phiếu; idempotency key duy nhất của CounterTicket; date/time dùng Asia/Ho_Chi_Minh.
- Nếu một phần việc cũ cần thay đổi schema để thực hiện, phần đó phải được tách khỏi kế hoạch này và chờ phê duyệt riêng.

### 1.2. Luồng trạng thái đích

| Trường hợp | Booking | CounterTicket | Hàng đợi bác sĩ |
|---|---|---|---|
| Lịch web chưa đến ngày check-in | PENDING_PAYMENT nếu còn nợ; CONFIRMED nếu miễn phí/đã thanh toán | Chưa tạo | Chưa có |
| Booking miễn phí đã check-in và dispatch hợp lệ | price=0, isPaid=false, checkedInAt và dispatchedAt được lưu | Không cần ticket thanh toán WAITING/CALLING | Vào doctor queue theo số khám của Booking |
| Lịch web check-in và thanh toán tại Kiosk được xác nhận | isPaid=true, checkedInAt và dispatchedAt được lưu | Không có phiếu WAITING/CALLING; nếu ticket WAITING đã được tạo thì đóng ticket cùng transaction | Có mặt trực tiếp; giữ nguyên số bác sĩ và ưu tiên |
| Lịch web check-in nhưng còn nợ/chọn nộp tại quầy | Giữ trạng thái chưa thanh toán, ghi checkedInAt | Tạo hoặc trả lại đúng một phiếu WAITING theo định tuyến | Không xuất hiện |
| Kiosk walk-in có phí chưa thanh toán | Booking chưa thanh toán, ghi checkedInAt | Đúng một phiếu WAITING; phân loại ưu tiên/BHYT/thường | Không xuất hiện |
| Kiosk walk-in thanh toán đã xác nhận | isPaid=true, checkedInAt và dispatchedAt được lưu | Không để phiếu WAITING/CALLING; nếu cần giữ phiếu phát hành thì phiếu phải ở trạng thái kết thúc | Có mặt ngay với số khám của Booking |
| Điều dưỡng đã gọi lượt có phí chưa thanh toán | Booking vẫn chưa thanh toán, chưa dispatchedAt | CALLING | Không xuất hiện |
| Thanh toán tại quầy đã xác nhận | isPaid=true, CONFIRMED, dispatchedAt được lưu trong cùng nghiệp vụ | Phiếu liên kết chuyển SERVED | Xuất hiện sau lần làm mới doctor queue tiếp theo |

**Quy ước queue:** màn hình điều dưỡng chỉ liệt kê lượt đã đến quầy có CounterTicket ở WAITING/CALLING. Doctor queue và public queue chỉ nhận lượt thỏa (isPaid=true OR price=0) AND dispatchedAt != null; status CONFIRMED, IN_PROGRESS hoặc checkedInAt không được dùng riêng lẻ để lách điều kiện này. Giá bằng 0 không tự tạo cờ isPaid.

### 1.3. Trạng thái code đã xác minh và khoảng trống

- Đặt lịch web đã khóa slot trong createBooking, nhưng reserveSlot đọc/tăng holdingCount mà chưa dùng lock row.
- Check-in lịch web tại Kiosk đã có date/time guard và lặp an toàn cho timestamp/số khám. Khi chưa trả tiền, hiện chỉ đổi booking thành CONFIRMED/ghi checkedInAt; chưa tạo CounterTicket.
- Kiosk walk-in mới dùng KioskDispatchTransactionService để tạo Booking và CounterTicket trong transaction, khóa counter, kiểm tra idempotency và giữ định tuyến ưu tiên. Tuy nhiên, payNow từ UI hiện được dùng như bằng chứng trả tiền và có thể làm phiếu chuyển thẳng SERVED/dispatched.
- NurseReceptionServiceImpl.getReceptionQueue hiện trả hầu hết booking trong ngày thay vì queue phiếu quầy đang WAITING/CALLING. NurseReceptionServiceImpl.payAtClinic cập nhật Booking đã trả tiền và dispatchedAt nhưng không đồng bộ CounterTicket; CounterServiceImpl.completeTicket chỉ hoàn tất ticket, chưa cập nhật Booking.
- ClinicalExaminationServiceImpl.startExamination chỉ ghi log khi chưa thu tiền; CONFIRMED, checkedInAt, IN_PROGRESS/COMPLETED và isPriority hiện có thể bị coi như đã qua chốt tiền. Doctor queue cũng nhận dispatchedAt hoặc IN_PROGRESS mà chưa luôn áp dụng điều kiện thống nhất (isPaid=true OR price=0) AND dispatchedAt != null.
- NurseReceptionPage có khung gợi ý phòng nhưng lựa chọn chỉ nằm ở state UI; request tạo lượt vãng lai không gửi room/doctor. Nurse queue hiện cập nhật mỗi 5 giây; Doctor ExaminationPage hiện gọi lại doctor queue mỗi 15 giây, cần giảm xuống 5 giây.

---

## 2. Phân kỳ Triển khai (Phased Implementation Plan)

### Giai đoạn 1: Chốt thanh toán và trạng thái điều phối (Critical Blockers)

*Thực hiện trước các thay đổi UI để mọi đường vào hàng đợi cùng tuân theo một điều kiện thanh toán và dispatch.*

1. **[P1-04] Xử lý kẹt ca khám khi chỉ định CLS bị hủy / không thực hiện:**
   - **File tác động:** ClinicalExaminationServiceImpl.java, ClinicalExaminationController.java
   - **Giải pháp:**
     - Bổ sung endpoint POST /api/clinical-examinations/tests/{testId}/cancel cho Bác sĩ/KTV, nhận lý do lâm sàng cancelReason và chuyển MedicalTest sang CANCELLED.
     - Chỉ chuyển bệnh án sang DIAGNOSING khi toàn bộ chỉ định trong ca khám đã kết thúc: COMPLETED hoặc CANCELLED.
     - Đảm bảo việc hủy test không bỏ qua chốt thanh toán áp dụng cho các test vẫn còn thực hiện.

2. **[P1-02] Đồng bộ xác nhận thanh toán VNPay/PayOS với Booking (dependency của P1-01):**
   - **File tác động:** PaymentServiceImpl.java, CashierServiceImpl.java, BookingController.java, BookingServiceImpl.java, BookingRepository.java, KioskPage.jsx và callback/webhook liên quan, test_hospital_workflow_fixes.js.
   - **Giải pháp:**
     - Gắn bookingCode chính xác vào order/reference khi tạo payment; webhook/IPN chỉ cập nhật Booking khớp với giao dịch SUCCESS đã xác minh chữ ký.
     - Cập nhật Booking dưới row lock hiện có và gọi cùng quy tắc cập nhật trạng thái paid/dispatch dùng cho các luồng kiosk/quầy; callback lặp phải trả kết quả idempotent.
     - Kiosk không được coi nút “Xác nhận đã chuyển khoản” hoặc payNow từ client là callback thanh toán. Tạo payment order gắn với bookingCode và chờ xác nhận server; nếu gateway chưa xác nhận thì lượt vẫn ở hàng đợi quầy.
     - Không tạo giao dịch SUCCESS giả trong endpoint chỉ vì người dùng gửi request pay.
   - **Tiêu chí nghiệm thu:**
     - Thanh toán hợp lệ chỉ gắn vào đúng Booking; webhook lặp không tạo trạng thái/giao dịch trùng.
     - Payment chưa xác minh, sai bookingCode hoặc sai số tiền không đặt isPaid và không dispatch Booking.
     - Giữ nguyên các luồng PAY_BOOKING hiện có và quy trình đối soát.

3. **[P1-01] Hợp nhất chốt tiền và dispatch cho Booking web/Kiosk/quầy:**
   - **File tác động:** BookingServiceImpl.java, SlotReservationServiceImpl.java, KioskDispatchTransactionService.java, NurseReceptionServiceImpl.java, CounterServiceImpl.java, BookingRepository.java, CounterTicketRepository.java, ClinicalExaminationServiceImpl.java, DoctorQueueResponse.java.
   - **Kiểm thử:** BookingServiceTest.java, KioskDispatchTransactionServiceTest.java, CounterServiceIdempotencyTest.java; bổ sung NurseReceptionWorkflowTest.java và ClinicalExaminationServiceTest.java nếu chưa có.
   - **Giải pháp:**
     - Đủ điều kiện dispatch/khám khi isPaid=true do máy chủ xác nhận hoặc price=0; không đặt isPaid=true cho lượt miễn phí. Loại bỏ việc coi CONFIRMED, checkedInAt, IN_PROGRESS hoặc isPriority là bằng chứng thanh toán.
     - Giữ trạng thái chưa thanh toán cho booking có phí. Check-in hợp lệ ghi checkedInAt đúng một lần; booking có phí chưa trả tạo/trả lại đúng một CounterTicket WAITING bằng idempotency key ổn định theo bookingId. Booking đã trả hoặc có price=0 chỉ vào doctor queue sau dispatch hợp lệ (ghi dispatchedAt), không tạo phiếu chờ thanh toán.
     - Nếu người bệnh chọn thanh toán tại Kiosk sau check-in, chỉ callback/xác nhận máy chủ mới hoàn tất thanh toán; nếu đã có ticket WAITING, chuyển ticket sang SERVED cùng transaction với Booking và dispatch.
     - Kiosk walk-in tạo Booking và CounterTicket trong cùng transaction. Nếu chưa có xác nhận thanh toán, phiếu ở WAITING; nếu gateway xác nhận thanh toán, cập nhật cùng Booking và kết thúc phiếu quầy, không để WAITING/CALLING. Số hiển thị cho Bác sĩ phải lấy từ Booking.queueNumber, không dùng nhầm số riêng của CounterTicket.
     - Khi thu tiền tại quầy, khóa Booking, xác nhận request thanh toán hợp lệ, rồi cập nhật isPaid/status/dispatchedAt và CounterTicket liên kết sang SERVED trong một transaction. Request lặp phải trả lại trạng thái/kết quả hiện có, không tạo giao dịch thu trùng.
     - CounterServiceImpl.completeTicket không được chuyển lượt có phí chưa thanh toán sang SERVED hoặc dispatch Booking. Lượt đủ điều kiện (isPaid=true hoặc price=0) chỉ được dispatch qua cùng chuyển trạng thái atomic; room/doctor được chọn được lưu trên Booking qua các quan hệ hiện có và dispatchedRoomId hiện có của phiếu nếu áp dụng.
     - Trong SlotReservationServiceImpl.reserveSlot, khóa TimeSlot trước khi đọc/cập nhật holdingCount; giữ kiểm tra currentBookings + holdingCount < maxCapacity ở bước reserve và bước create. Kiểm tra cách tuần tự hóa số Booking theo doctor/date bằng row lock hiện có, không thêm cột/schema.
     - ClinicalExaminationServiceImpl.startExamination phải từ chối lượt có price>0 và isPaid=false bằng PAYMENT_REQUIRED; lượt price=0, isPaid=false được phép sau dispatch hợp lệ. Doctor queue và public queue chỉ trả lượt thỏa (isPaid=true OR price=0) AND dispatchedAt != null; status CONFIRMED/IN_PROGRESS/checkedInAt không thay thế điều kiện dispatch. Giữ thứ tự ưu tiên lâm sàng/RETURN_AFTER_RESULT cho lượt đủ điều kiện.
   - **Tiêu chí nghiệm thu:**
     - Web appointment đã thanh toán, check-in hợp lệ tại Kiosk: được dispatch thẳng vào doctor queue, không còn phiếu quầy WAITING.
     - Web appointment có phí chưa trả: check-in tạo đúng một ticket WAITING; doctor queue không hiển thị lượt đó. Sau xác nhận thanh toán tại quầy hoặc tại Kiosk, Booking và ticket được chuyển trạng thái cùng transaction và lượt mới xuất hiện ở doctor queue.
     - Kiosk walk-in có phí chưa trả: đúng một Booking + một ticket WAITING, có queue counter đúng loại. Kiosk walk-in đã trả qua giao dịch xác nhận server: Booking xuất hiện với queueNumber/status của Bác sĩ và không còn ticket active ở quầy.
     - Retry cùng idempotency key/check-in/payment không cấp thêm số, ticket, Booking hoặc giao dịch.
     - Slot đầy hoặc không có lịch phù hợp trả conflict và không lưu một phần Booking/ticket/holding.
     - Booking price=0, isPaid=false sau check-in và dispatch hợp lệ vẫn vào doctor queue, không tạo giao dịch SUCCESS giả. Lượt có phí chỉ vào khi isPaid=true và đã dispatch.
     - Tuổi 64 không ưu tiên; tuổi 65 và trẻ dưới 6 vẫn được phân luồng ưu tiên theo chính sách hiện tại. Ưu tiên chỉ ảnh hưởng định tuyến/thứ tự, không tự miễn thanh toán.

4. **[P1-03] Đưa viện phí xuất viện Nội trú vào Quầy Thu ngân:**
   - **File tác động:** CashierServiceImpl.java, InpatientServiceImpl.java
   - **Giải pháp:**
     - Trong CashierServiceImpl.getPendingBills, quét Discharge/HospitalAdmission hiện có chưa quyết toán.
     - Hiển thị hóa đơn BILL-INPATIENT-{admissionId}, tổng viện phí, số ngày nằm viện, tiền phòng và dịch vụ phát sinh.
     - Cho phép thu theo các PaymentMethod đang hỗ trợ và ghi nhận kết quả quyết toán; không thêm schema trong phạm vi này.

---

### Giai đoạn 2: Gắn queue Điều dưỡng/Kiosk vào chuyển trạng thái chuẩn

5. **[P2-02] Hoàn thiện queue Điều dưỡng và nối thao tác quầy với dispatch đã xác nhận:**
   - **File tác động:** NurseReceptionController.java, NurseReceptionServiceImpl.java, NurseReceptionPage.jsx, CounterController.java, CounterServiceImpl.java, CounterManagementPanel.jsx, CounterTicketResponse.java, NurseQueueResponse.java, KioskPage.jsx, ThermalTicketModal.jsx, ExaminationPage.jsx.
   - **Ghi chú hiện trạng:** API status, dispatchBooking, call-next và complete đã tồn tại. Không tạo endpoint trùng; sửa logic và nối UI hiện có vào các chuyển trạng thái P1-01.
   - **Giải pháp:**
     - getReceptionQueue trả các Booking gắn ticket WAITING/CALLING trong ngày, loại lượt đã dispatch, đã hoàn tất/hủy và lịch chưa check-in; giữ lọc khoa.
     - Bảng điều dưỡng hiển thị trạng thái thanh toán, mã ticket, queueNumber của Booking, phòng/bác sĩ và thao tác phù hợp. Không hiển thị mọi lịch chưa tới như bệnh nhân đang đứng tại quầy.
     - CounterManagementPanel giữ chu trình WAITING → CALLING → SERVED/SKIPPED. Chỉ complete/dispatch khi isPaid=true hoặc price=0; sau thu tiền thành công, đồng bộ Booking + ticket và làm mới queue quầy, queue Điều dưỡng.
     - Gắn thao tác chọn phòng/bác sĩ ở nurse room grid vào API dispatchBooking hoặc luồng complete chuẩn; gửi roomId/doctorId thật, không chỉ đặt local state rồi bỏ trong payload.
     - Nếu thanh toán hoàn tất qua VietQR khi ticket đang chờ/gọi, retry/payment callback phải cập nhật đúng ticket liên kết, không cấp phiếu mới.
     - Kiosk hiển thị mã Booking, queueCode/queueNumber của Bác sĩ, trạng thái thanh toán (đã trả hoặc miễn phí), trạng thái dispatch và thông tin phòng; không nhầm ticketCode của counter thành số khám bác sĩ. Giữ polling hiện có, đặt Nurse queue và Doctor ExaminationPage tải lại queue mỗi 5 giây; không thêm realtime infrastructure.
     - Cập nhật CounterTicketResponse (DTO, không phải schema) để trả riêng bookingQueueNumber và bookingStatus; KioskPage/ThermalTicketModal dùng hai trường này cho lượt đi thẳng bác sĩ.
     - Khi update thất bại, không giữ trạng thái lạc quan sai; lỗi tải queue không xóa snapshot đang hiển thị. Làm mới hoặc polling phải hiển thị trạng thái backend chuẩn.
   - **Tiêu chí nghiệm thu:**
     - Điều dưỡng gọi lượt có phí chưa thanh toán: ticket chuyển CALLING, Booking vẫn chưa dispatch và không thấy ở doctor queue; lượt miễn phí vẫn chỉ vào queue sau dispatch.
     - Sau xác nhận thanh toán: booking hiển thị isPaid, dispatchedAt, trạng thái; ticket chuyển SERVED và biến khỏi danh sách ticket chờ.
     - Đóng/mở lại trang điều dưỡng hoặc Kiosk không làm mất/sinh trùng lượt.
     - Sau payment/dispatch, nurse và doctor queue hiển thị đúng queueCode, queueNumber, bệnh nhân, status và ưu tiên không muộn hơn một chu kỳ polling 5 giây.
     - Không gửi room/doctor ID giả hoặc không tồn tại từ hardcoded phòng.

6. **[P2-04] Hoàn thiện và kiểm tra dữ liệu Sinh hiệu dạng MedicalObservation:**
   - **File tác động:** NurseReceptionServiceImpl.java, MedicalObservationRepository.java, các UI tiếp nhận/vitals liên quan.
   - **Trạng thái hiện tại:** QR check-in đã ghi một phần sinh hiệu dạng MedicalObservation gắn MedicalExaminationRecord; luồng tiếp nhận walk-in đang ghép sinh hiệu vào symptoms. Không tạo lại phần đã có.
   - **Giải pháp:** Bảo đảm các luồng tiếp nhận dùng cùng Booking/MedicalExaminationRecord không làm mất triệu chứng, không nhân đôi observation khi retry, và lưu có cấu trúc các giá trị thực sự được điều dưỡng đo. Không ghi giá trị mặc định thành kết quả đo nếu trường để trống.

7. **[P3-01] Bỏ fallback phòng giả và hoàn thiện lựa chọn phòng điều dưỡng:**
   - **File tác động:** NurseReceptionPage.jsx, NurseReceptionServiceImpl.java
   - **Giải pháp:** Nạp phòng hoạt động và queue count từ backend; không tạo gợi ý bằng DEPARTMENT_ROOMS giả khi API thất bại. Lựa chọn phòng tại UI phải được gửi qua luồng dispatch sau khi đủ điều kiện thanh toán. Nếu chưa có dữ liệu phòng, hiển thị chưa thể phân luồng và giữ lượt ở quầy.

8. **[P3-02] Bảo vệ cập nhật đồng thời bằng row lock hiện có (không thêm @Version):**
   - **File tác động:** BookingRepository.java, CounterTicketRepository.java, TimeSlotRepository.java, DoctorScheduleRepository.java và service tương ứng.
   - **Giải pháp:** Không thêm version column/@Version. Bổ sung hoặc tái sử dụng truy vấn pessimistic lock hiện có cho Booking, slot, counter và row lịch trực khi cấp số theo doctor/date; cập nhật Booking và CounterTicket atomic. Khóa theo thứ tự thống nhất để giảm deadlock và retry chỉ trả lại kết quả đã lưu.

---

### Giai đoạn 3: Viện phí nâng cao & Chốt chặn Phòng Xét nghiệm

9. **[P2-01] Mô hình Đa Hóa đơn và Chốt chặn Lab Gatekeeper:**
   - Tham chiếu implementation_plan_multi_invoice_and_lab_gatekeeper.md.
   - Phân biệt phí khám EXAM và phí CLS-MED bằng mô hình hiện có. Phòng Lab chỉ tiếp nhận test đã thanh toán, ngoại trừ cấp cứu nếu có chính sách hiện hành được xác nhận.
   - Không triển khai phần nào cần DDL/migration trong kế hoạch này; nếu thiết kế tham chiếu yêu cầu schema mới thì ghi thành đề xuất riêng, chưa đưa vào execution.

10. **[P2-03] Hoàn tiền / Hủy giao dịch:**
    - Chỉ xử lý các giao dịch hiện có, ghi audit/refund theo mô hình đã triển khai.
    - Hủy/hoàn tiền phải cập nhật khả năng dispatch và trạng thái ticket liên kết một cách nhất quán; không xóa lịch sử thanh toán hoặc thêm schema trong phạm vi này.

---

## 3. Kế hoạch Kiểm thử & Xác minh (Verification Plan)

**Không chạy test trong bước lập kế hoạch.** Khi vào EXECUTE, bổ sung test trước implementation và chạy nhóm test bị ảnh hưởng.

### Backend unit/service tests

- Mở rộng BookingServiceTest.java:
  - Lịch đã paid check-in đúng ngày/khung giờ: checkedInAt giữ ổn định, dispatchedAt được đặt và không tạo ticket WAITING.
  - Booking price=0, isPaid=false check-in và dispatch hợp lệ: vào doctor queue, không tạo ticket thanh toán WAITING hay Transaction SUCCESS giả.
  - Lịch có phí unpaid check-in: giữ isPaid=false, tạo/trả cùng một ticket WAITING; check-in lặp theo bookingCode/SĐT không tăng số/ticket.
  - Check-in quá sớm/quá trễ/sai ngày vẫn bị chặn.
  - Slot reserve đồng thời không làm currentBookings + holdingCount vượt maxCapacity.
- Mở rộng KioskDispatchTransactionServiceTest.java và CounterServiceIdempotencyTest.java:
  - Walk-in có phí chưa trả tạo một Booking + một ticket WAITING; cùng idempotency key trả ticket đã có.
  - Client gửi payNow=true nhưng không có xác nhận thanh toán server không thể tạo booking paid/dispatched.
  - Payment callback hợp lệ chuyển booking sang paid/dispatched và ticket sang trạng thái kết thúc đúng một lần.
  - Booking/ticket cùng rollback khi tạo một phần thất bại.
  - Giữ tuổi 64/65, trẻ dưới 6, phân loại BHYT/appointment/general, counter fallback và waitingBefore.
- Bổ sung NurseReceptionWorkflowTest.java:
  - Thu tại quầy đồng bộ payment, Booking và CounterTicket trong một transaction.
  - Retry hoặc hai request đồng thời không ghi nhận thu/dispatch hai lần.
  - Counter complete chặn Booking có phí chưa trả; lượt price=0 vẫn có thể dispatch mà không giả lập thanh toán; ticket SERVED chỉ khi transition đủ điều kiện.
  - Lượt đã paid có thể chọn phòng/bác sĩ hiện có; bookingCode/bookingId không bị tráo.
- Bổ sung ClinicalExaminationServiceTest.java:
  - startExamination từ chối booking có price > 0 và isPaid=false kể cả status CONFIRMED hoặc checkedInAt đã có; cho phép booking price=0/isPaid=false sau dispatch hợp lệ.
  - Paid/free booking bắt đầu khám thành công.
  - Doctor queue và public queue chỉ trả (isPaid=true OR price=0) AND dispatchedAt != null; không trả lượt có phí unpaid chỉ vì status IN_PROGRESS/CONFIRMED/checkedInAt; giữ thứ tự priority và RETURN_AFTER_RESULT cho lượt đủ điều kiện.

### Integration và end-to-end tests cần thêm/chạy sau này

Cập nhật test_hospital_workflow_fixes.js hoặc tạo test cho luồng, với assertion vào DB/API:

- TC1: Web appointment có phí chưa trả check-in → một ticket counter WAITING, không có trong doctor queue → xác nhận thanh toán tại quầy → isPaid + dispatchedAt, ticket SERVED, xuất hiện doctor queue.
- TC2: Web appointment đã paid check-in Kiosk → đi thẳng doctor queue; lặp check-in không đổi số hoặc sinh ticket quầy chờ.
- TC2a: Web appointment check-in khi còn nợ nhưng xác nhận trả ngay tại Kiosk → Booking vào doctor queue; ticket counter (nếu đã tạo trước khi callback đến) được đóng đúng một lần.
- TC3: Kiosk walk-in có phí chưa trả → đúng một Booking/ticket, giữ thứ tự gọi theo counter queue.
- TC3a: Booking miễn phí price=0, isPaid=false sau check-in/dispatch hợp lệ → vào doctor queue, không cần cờ paid và không có ticket thanh toán active.
- TC4: Kiosk walk-in xác nhận trả qua callback hợp lệ → doctor queue thấy số khám/status Booking; Kiosk không thể tự đánh dấu paid bằng nút hoặc payload.
- TC5: retry cùng idempotency key, webhook/payment lặp, 2 điều dưỡng thu đồng thời → một giao dịch hợp lệ, một Booking, tối đa một CounterTicket và một dispatch.
- TC6: hai request cạnh tranh slot cuối/cùng queue counter → không vượt maxCapacity, không cấp STT trùng, không ghi một phần.
- TC7: priority age 64/65/<6 và BHYT vẫn đi đúng counter/type/order; priority không làm isPaid=true.
- TC8: UI Nurse queue và Doctor queue hiển thị đúng số/trạng thái; sau payment/dispatch, lượt xuất hiện hoặc cập nhật trong tối đa 5 giây (một chu kỳ polling ở cả hai trang). Xác minh polling được đặt 5 giây bằng fake timers hoặc quan sát request; không dùng realtime infrastructure.

Chạy DB integration/concurrency chỉ với PostgreSQL disposable; xác nhận datasource/schema trước. Không dùng datasource mặc định localhost:5432/kmahos cho test ghi dữ liệu nếu chưa chứng minh đây là DB bỏ đi an toàn.

### UI/Build và xác minh hồi quy

- Thêm Vitest coverage cho helper/state mapping queue nếu tách logic khỏi NurseReceptionPage.jsx hoặc CounterManagementPanel.jsx; không thêm thư viện UI test mới nếu không cần.
- Chạy npm test và npm run build trong hospital-ui.
- Chạy focused Maven tests cho BookingServiceTest, KioskDispatchTransactionServiceTest, CounterServiceIdempotencyTest, NurseReceptionWorkflowTest và ClinicalExaminationServiceTest; sau đó chạy suite backend hiện có bị ảnh hưởng.
- Kiểm tra thủ công theo test plan: /kiosk, /nurse/reception, /doctor/examination; xác nhận phiếu Kiosk phân biệt ticket quầy với số khám bác sĩ, Nurse queue cập nhật theo trạng thái backend và Doctor queue tự refresh sau khi dispatch.

---

## 4. Ranh giới phạm vi

- Plan này chỉ là thiết kế, chưa cho phép sửa code hoặc chạy test.
- Không thay đổi DDL, schema hoặc migration; không thêm entity/cột để lưu trạng thái payment/queue mới.
- Giữ nguyên các hành vi hiện có ngoài các chuyển trạng thái được mô tả; phần đa hóa đơn/hoàn tiền nào không thể dùng schema hiện hữu phải được tách ra xin phê duyệt riêng.
