# 🧪 TESTING PLAN: MODULE 2 - BÀN KHÁM BÁC SĨ & TRẢ KẾT QUẢ LAB
**Mã phân hệ:** MOD-02 | **Trạng thái:** ✅ ĐÃ KIỂM THỬ THÀNH CÔNG

---

## 🎯 1. MỤC TIÊU KIỂM THỬ
Xác minh tính chính xác của các chức năng:
1. Hàng đợi gọi số khám bệnh của Bác sĩ (`/api/clinical/doctor/queue`).
2. Nút gọi bệnh nhân tiếp theo (One-click Next Call), phát âm thanh chuông ding-dong và gọi tên AI tiếng Việt.
3. Tạo phiếu khám lâm sàng, chẩn đoán bệnh.
4. Chỉ định dịch vụ cận lâm sàng (X-quang, Xét nghiệm máu, Siêu âm) từ danh mục thực tế.
5. Kỹ thuật viên Lab tiếp nhận chỉ định, nhập kết quả, đính kèm file ảnh kết quả.
6. Kết quả cận lâm sàng đồng bộ thời gian thực về bàn khám của bác sĩ.
7. Kê đơn thuốc từ kho dược và in toa thuốc chuẩn Bộ Y Tế.

---

## 📋 2. CÁC CA KIỂM THỬ (TEST CASES)

| ID | Mô tả ca kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Lấy hàng đợi khám của Bác sĩ | `doctorId`, `date` | Danh sách bệnh nhân sắp theo STT tăng dần | ✅ PASS |
| **TC-02** | Bác sĩ tiếp nhận ca khám | `bookingId` | Cập nhật `BookingState` sang `IN_PROGRESS` | ✅ PASS |
| **TC-03** | Bác sĩ chỉ định cận lâm sàng | `recordId`, `serviceId` | Tạo `MedicalTest` ở trạng thái `WAITING` | ✅ PASS |
| **TC-04** | KTV Lab lấy danh sách xét nghiệm | `state=WAITING` | Trả về danh sách chỉ định đang chờ xử lý | ✅ PASS |
| **TC-05** | KTV Lab cập nhật kết quả & ảnh | `testId`, kết quả, link ảnh | `MedicalTest` chuyển sang `COMPLETED` | ✅ PASS |
| **TC-06** | Kê đơn thuốc từ kho | `recordId`, `medicineId`, số lượng | Tạo `Prescription` và các `PrescriptionItem` | ✅ PASS |
| **TC-07** | Hoàn tất khám bệnh | `recordId`, kết luận chẩn đoán | Phiếu khám `COMPLETED`, Booking hoàn tất | ✅ PASS |

---

## 💻 3. KỊCH BẢN KIỂM THỬ TỰ ĐỘNG
Chạy lệnh kiểm thử hồi quy:
```bash
node test_module2.js
```
Script kiểm tra toàn bộ chuỗi nghiệp vụ từ gọi số -> chỉ định CLS -> Lab trả kết quả -> kê đơn -> kết thúc khám.
