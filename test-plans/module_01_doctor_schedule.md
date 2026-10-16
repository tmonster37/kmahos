# 🧪 TESTING PLAN: MODULE 1 - QUẢN LÝ BÁC SĨ & PHÂN LỊCH TRỰC
**Mã phân hệ:** MOD-01 | **Trạng thái:** ✅ ĐÃ KIỂM THỬ THÀNH CÔNG

---

## 🎯 1. MỤC TIÊU KIỂM THỬ
Xác minh tính chính xác của các chức năng:
1. Thêm mới bác sĩ kèm học vị (`PGS_TS`, `BSCKII`, `THS`), chuyên khoa, đơn giá khám, tiểu sử.
2. Tự động liên kết tài khoản `ROLE_DOCTOR`.
3. Phân lịch trực 14 ngày cho bác sĩ theo buồng phòng và các buổi (Sáng, Chiều, Tối).
4. Tự động sinh danh sách các khung giờ 30 phút (`TimeSlots`).
5. Tra cứu và hủy ca trực khi có điều chỉnh.

---

## 📋 2. CÁC CA KIỂM THỬ (TEST CASES)

| ID | Mô tả ca kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Tạo bác sĩ mới qua API Admin | Họ tên, SĐT, Khoa, Đơn giá khám, Học vị | HTTP 200, tạo thành công `Account` và `Doctor` | ✅ PASS |
| **TC-02** | Phân ca trực sáng (`MORNING`) | DoctorId, Ngày mai, RoomId, Ca sáng | HTTP 200, sinh 8 TimeSlots từ 07:30 đến 11:30 | ✅ PASS |
| **TC-03** | Phân ca trực chiều (`AFTERNOON`) | DoctorId, Ngày mai, RoomId, Ca chiều | HTTP 200, sinh 8 TimeSlots từ 13:00 đến 17:00 | ✅ PASS |
| **TC-04** | Phân ca trực tối (`EVENING`) | DoctorId, Ngày mai, RoomId, Ca tối | HTTP 200, sinh 6 TimeSlots từ 17:30 đến 20:30 | ✅ PASS |
| **TC-05** | Truy vấn lịch trực theo bác sĩ | `GET /api/schedules/doctor/{id}` | Trả về danh sách ca trực kèm TimeSlots | ✅ PASS |
| **TC-06** | Xóa ca trực | `DELETE /api/schedules/{scheduleId}` | HTTP 200, ca trực bị xóa mềm, TimeSlots giải phóng | ✅ PASS |

---

## 💻 3. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG
Chạy lệnh kiểm thử hồi quy:
```bash
node test_module1.js
```
Script kiểm tra toàn bộ luồng tạo bác sĩ, tạo ca trực 3 buổi, xác thực số lượng TimeSlots sinh ra, và dọn dẹp dữ liệu test.
