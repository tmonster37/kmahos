# 🏥 BỘ DỮ LIỆU MẪU & HƯỚNG DẪN KIỂM THỬ HỆ THỐNG TOÀN DIỆN

---

## 🔑 I. Phân Hệ Người Dùng & Tài Khoản Kiểm Thử (Theo Đúng Yêu Cầu Chức Năng)

| Phân hệ (Role) | Tài khoản / SĐT | Mật khẩu | Chức năng được phép & hiển thị trên giao diện | Chức năng đã loại bỏ (Khóa ngoài phạm vi) |
| :--- | :---: | :---: | :--- | :--- |
| **1. Khách (Guest)** | *(Chưa đăng nhập)* | — | • Đăng nhập bằng SĐT / Microsoft<br>• Đăng ký tài khoản bệnh nhân<br>• Tìm hồ sơ bệnh nhân đã mất<br>• Xem thông tin chuyên khoa, bác sĩ, đặt khám | Bàn khám bác sĩ, Quản trị, Xem lịch sử bệnh án khi chưa xác thực |
| **2. Bệnh nhân (PATIENT)** | `0988889999` | `password123` | • Tạo, xem, sửa, xóa hồ sơ bệnh nhân<br>• Tìm hồ sơ đã mất<br>• Đặt lịch khám bệnh theo ngày/giờ<br>• Xem phiếu khám & lịch sử khám chữa bệnh<br>• Nạp tiền & thanh toán viện phí VNPay-QR<br>• Nhắc giờ uống thuốc | Quản trị nhân sự, Bàn khám kê đơn, Quản lý tài khoản |
| **3. Điều dưỡng (NURSE)** | Tạo mới / gán role | `password123` | • Tiếp nhận bệnh nhân tại quầy và phòng khám<br>• Tạo hồ sơ cho bệnh nhân<br>• Cập nhật số thứ tự khám bệnh | Kê đơn thuốc, Xem doanh thu toàn viện, Quản lý tài khoản |
| **4. Bác sĩ (DOCTOR)** | `0937050537` | `taizz0537` | • Tiếp nhận bệnh nhân vào khám<br>• Tạo phiếu chẩn đoán<br>• Thêm, xóa toa thuốc trong phiếu chẩn đoán & Xuất toa thuốc (In/PDF)<br>• Thêm, xóa dịch vụ xét nghiệm & Xuất phiếu XN<br>• Xem kết quả xét nghiệm của bệnh nhân<br>• Xem lịch sử khám bệnh của bệnh nhân<br>• Xem lịch trực của bản thân | Quản lý khoa, Quản lý tài khoản toàn viện, Cài đặt hệ thống |
| **5. Trưởng khoa (HEAD_OF_DEPT)** | Gán role trưởng khoa | `taizz0537` | • Có toàn bộ chức năng của Bác sĩ<br>• Tạo, sửa, xóa ca trực của các bác sĩ trong khoa | Thống kê doanh thu toàn viện, Quản lý tài khoản toàn viện |
| **6. Bác sĩ XN (LAB_TECH)** | Gán role KTV Lab | `password123` | • Tiếp nhận bệnh nhân vào phòng xét nghiệm<br>• Thêm báo cáo và cập nhật kết quả xét nghiệm | Bàn khám lâm sàng, Đặt lịch, Quản lý nhân viên |
| **7. Quản lý (ADMIN)** | `0937050537` | `taizz0537` | • Thống kê doanh thu, lượt đăng ký, PTTT, bệnh nhân, lượt khám khoa<br>• Quản lý bệnh nhân & chi tiết<br>• Quản lý giao dịch thanh toán<br>• Quản lý nhân viên (CRUD, khóa/mở khóa, xem lịch trực)<br>• Quản lý khoa (CRUD, gán/xóa bác sĩ, chỉ định trưởng khoa)<br>• Quản lý phòng & dịch vụ CLS & danh mục thuốc (CRUD)<br>• Quản lý tài khoản (Khóa/Mở khóa)<br>• Phân lịch trực ca toàn viện | Menu tinh gọn, loại bỏ các mục không cần thiết |

---

## 📅 II. Dữ Liệu Các Ca Trực & Khung Giờ Khám Bệnh (Doctor Shifts)

Hệ thống đã tự động thiết lập **490 ca trực** cho **17 Bác sĩ** thuộc toàn bộ **6 Chuyên khoa** trong **14 ngày liên tiếp** (từ hôm nay đến 2 tuần tiếp theo).

### Các Ca Trực Được Phân Bổ Trong Ngày:
1. 🌅 **Ca Sáng (MORNING: 07:30 - 11:30):** Gồm 8 khung giờ khám (mỗi khung giờ 30 phút):
   * `07:30 - 08:00` | `08:00 - 08:30` | `08:30 - 09:00` | `09:00 - 09:30`
   * `09:30 - 10:00` | `10:00 - 10:30` | `10:30 - 11:00` | `11:00 - 11:30`
2. ☀️ **Ca Chiều (AFTERNOON: 13:00 - 17:00):** Gồm 8 khung giờ khám:
   * `13:00 - 13:30` | `13:30 - 14:00` | `14:00 - 14:30` | `14:30 - 15:00`
   * `15:00 - 15:30` | `15:30 - 16:00` | `16:00 - 16:30` | `16:30 - 17:00`
3. 🌙 **Ca Tối Ngoài Giờ (EVENING: 17:30 - 20:30):** Gồm 6 khung giờ khám:
   * `17:30 - 18:00` | `18:00 - 18:30` | `18:30 - 19:00`
   * `19:00 - 19:30` | `19:30 - 20:00` | `20:00 - 20:30`

---

## 🏢 III. Danh Sách 6 Chuyên Khoa & Bác Sĩ Trực

| STT | Tên Chuyên Khoa | Phòng Khám | Bác Sĩ Trực Tiêu Biểu | Học Vị / Chức Danh | Ca Trực Khả Dụng |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **1** | **Khoa Nội Tổng Quát** | Phòng 101, 102 | **PGS. TS Lê Văn Thịnh** | `PGS_TS` | Sáng, Chiều, Tối |
| **2** | **Khoa Tim Mạch Can Thiệp** | Phòng 201, 202 | **BS. CKII Trần Hoàng Nam** | `BSCKII` | Sáng, Chiều, Tối |
| **3** | **Khoa Nhi** | Phòng 301 | **ThS. BS Nguyễn Thị Mai** | `THS` | Sáng, Chiều, Tối |
| **4** | **Khoa Răng Hàm Mặt** | Phòng 401 | **BS. CKII Lê Thị Hương** | `BSCKII` | Sáng, Chiều |
| **5** | **Khoa Tai Mũi Họng** | Phòng 501 | **ThS. BS Phạm Minh Tuấn** | `THS` | Sáng, Chiều |
| **6** | **Khoa Da Liễu** | Phòng 601 | **BS. CKI Vũ Thu Hà** | `BSCKI` | Sáng, Chiều |

---

## 👨‍👩‍👧‍👦 IV. Dữ Liệu Bệnh Nhân (`0988889999` / `password123`)

* **Số dư Ví viện phí:** `2.000.000 VNĐ`
* **4 Hồ sơ sức khỏe:** Bản thân, Con gái (Nguyễn Thảo My), Con trai (Nguyễn Minh Khang), Mẹ (Trần Thị Mai).
* **5 Cữ thuốc nhắc nhở hàng ngày:** Sáng (Kháng sinh + Vitamin C), Trưa (Alpha Choay), Chiều (Augmentin), Tối (Decolgen).

---

## 🧭 V. Các Bước Kiểm Thử Nhanh

1. **Đặt lịch khám ([/booking](http://localhost:5173/booking)):**
   * Đăng nhập với `0988889999` / `password123`.
   * Chọn ngày khám ➔ Chọn chuyên khoa ➔ Chọn ca Sáng / Chiều / Tối ➔ Chọn khung giờ 30 phút.
   * Thanh toán bằng Ví nội bộ hoặc VNPay-QR ➔ Xuất phiếu khám E-ticket.

2. **Làm mới dữ liệu lịch trực & ca khám bất cứ khi nào:**
   ```bash
   node seed_comprehensive_schedules.js
   ```
