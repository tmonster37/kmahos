# 🧪 TESTING PLAN: MODULE 4 - TIẾP ĐÓN ĐIỀU DƯỠNG & KIOSK SẢNH
**Mã phân hệ:** MOD-04 | **Trạng thái:** ✅ ĐÃ KIỂM THỬ THÀNH CÔNG

---

## 🎯 1. MỤC TIÊU KIỂM THỬ
Xác minh tính chính xác của các chức năng:
1. Cây Kiosk tự phục vụ sảnh (`/kiosk`): Bệnh nhân tự chọn chuyên khoa; ngưỡng ưu tiên người cao tuổi là 65 tuổi, còn các điều kiện ưu tiên khác theo luật backend hiện hành.
2. Tự động cấp số thứ tự khám (STT thường và STT ưu tiên) và in phiếu E-Ticket kèm mã QR.
3. Điều dưỡng tiếp đón tại quầy (`/nurse/reception`): Xác nhận thông tin bệnh nhân từ lịch hẹn trực tuyến hoặc vãng lai.
4. Điều dưỡng điều phối chuyển buồng khám và cập nhật trạng thái hàng đợi.
5. Màn hình LED TV gọi số phòng khám sảnh chờ (`/queue-display`) nhấp nháy số và phát âm thanh.

---

## 📋 2. CÁC CA KIỂM THỬ (TEST CASES)

| ID | Mô tả ca kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Kiosk lấy STT thường | `departmentId`, `priority=false` | Cấp STT thường theo thứ tự tăng dần | ✅ PASS |
| **TC-02** | Kiosk lấy STT ưu tiên | `departmentId`, `priority=true` | Cấp STT ưu tiên (được đẩy lên đầu hàng đợi) | ✅ PASS |
| **TC-03** | Điều dưỡng tiếp đón bệnh nhân | `bookingCode` | Trạng thái chuyển sang `CHECKED_IN` | ✅ PASS |
| **TC-04** | Điều dưỡng chuyển phòng khám | `bookingId`, `targetRoomId` | Bệnh nhân chuyển sang hàng đợi của phòng khám mới | ✅ PASS |
| **TC-05** | API Màn hình hiển thị LED công cộng | `GET /api/clinical/queue/public` | Trả về số đang khám và các số tiếp theo của từng phòng | ✅ PASS |

Kiểm thử hồi quy chi tiết cho tạo booking + counter ticket nguyên tử, idempotency khi retry, sức chứa đồng thời, check-in bền vững và thao tác lịch Admin được lưu tại [`kiosk_booking_hardening.md`](kiosk_booking_hardening.md). Các kiểm thử DB integration/concurrency ở tài liệu đó chưa được chạy trên datasource disposable.

---

## 💻 3. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG
Chạy lệnh kiểm thử hồi quy:
```bash
node test_module4_kiosk.js
```
