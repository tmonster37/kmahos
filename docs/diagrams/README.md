# Sơ đồ phân tích và thiết kế HMS

Bộ sơ đồ này bổ sung các góc nhìn UML chi tiết cho luồng đặt lịch, tiếp đón và khám cận lâm sàng. Cách trình bày tham khảo báo cáo được cung cấp; nội dung được dựng lại theo mã nguồn hiện tại của `hospital-api`.

## Danh mục

| Sơ đồ | Nội dung | Nguồn có thể chỉnh sửa | Bản xem nhanh |
|---|---|---|---|
| Lớp nghiệp vụ | Quan hệ giữa hồ sơ bệnh nhân, lịch khám, bệnh án và chỉ định xét nghiệm | [class-booking-clinical.mmd](class-booking-clinical.mmd) | [class-booking-clinical.png](class-booking-clinical.png) |
| Trình tự đặt lịch | Giữ chỗ, kiểm tra sức chứa và tạo lượt khám | [sequence-booking-reservation.mmd](sequence-booking-reservation.mmd) | [sequence-booking-reservation.png](sequence-booking-reservation.png) |
| Trình tự tiếp đón | Điều dưỡng tra mã QR, cập nhật lượt khám và ghi sinh hiệu | [sequence-nurse-checkin.mmd](sequence-nurse-checkin.mmd) | [sequence-nurse-checkin.png](sequence-nurse-checkin.png) |
| Hoạt động cận lâm sàng | Chỉ định xét nghiệm, kiểm tra thanh toán, cập nhật kết quả và chuyển trạng thái bệnh án | [activity-clinical-tests.mmd](activity-clinical-tests.mmd) | [activity-clinical-tests.png](activity-clinical-tests.png) |

Các tệp `.mmd` là nguồn Mermaid để tiếp tục chỉnh sửa; ảnh PNG dùng trong tài liệu Word và để xem nhanh. Sơ đồ là ảnh chụp thiết kế tại thời điểm lập báo cáo, cần được rà soát khi luồng nghiệp vụ hoặc mã nguồn thay đổi.

## Đối chiếu mã nguồn

- Đặt lịch và giữ chỗ: `BookingController`, `BookingServiceImpl`, `SlotReservationServiceImpl`, `TimeSlotRepository`.
- Tiếp đón QR: `NurseReceptionController`, `NurseReceptionServiceImpl`, `Booking`, `MedicalExaminationRecord`.
- Cận lâm sàng: `ClinicalExaminationController`, `ClinicalExaminationServiceImpl`, `MedicalTest`, `Transaction`.
- Mô hình lớp: các JPA entity trong `hospital-api/src/main/java/com/hospital/api/entity/`.

Lưu ý: mã giữ chỗ được lưu trong `ConcurrentHashMap` của tiến trình ứng dụng và có TTL 600 giây; bộ đếm giữ chỗ đồng thời được ghi vào `TimeSlot`. Sơ đồ thể hiện cơ chế đang có trong mã nguồn, không khẳng định bộ nhớ giữ chỗ được chia sẻ giữa nhiều instance.
