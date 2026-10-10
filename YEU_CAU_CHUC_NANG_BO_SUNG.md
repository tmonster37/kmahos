# 🏥 TÀI LIỆU ĐẶC TẢ YÊU CẦU CHỨC NĂNG BỔ SUNG & MỞ RỘNG
**HỆ THỐNG QUẢN LÝ BỆNH VIỆN THÔNG MINH - YOUMED TNT HOSPITAL**

---

## 📌 I. TỔNG QUAN

Tài liệu này tổng hợp toàn bộ các **chức năng mở rộng, tính năng nâng cao và module giá trị gia tăng** đã được phát triển hoàn chỉnh trên thực tế trong hệ thống (cả Backend Spring Boot và Frontend React), bổ sung cho bản đặc tả chức năng cơ bản ban đầu.

---

## 👥 II. DANH SÁCH CHỨC NĂNG BỔ SUNG THEO TỪNG PHÂN HỆ

### 1. 👤 Phân Hệ Người Dùng Khách (Guest)
* **Đăng nhập đa phương thức (Single Sign-On - SSO):**
  * Hỗ trợ đăng nhập bằng Số điện thoại + Mật khẩu.
  * Tích hợp nút đăng nhập liên kết qua tài khoản **Microsoft OAuth 2.0 / SSO**.
* **Tra cứu thông minh tại trang chủ:**
  * Bộ lọc chuyên khoa, bác sĩ, bảng giá dịch vụ theo thời gian thực mà không cần đăng nhập.
  * Tra cứu sơ đồ buồng phòng và chỉ dẫn đường đi trong viện.

---

### 2. 🏥 Phân Hệ Bệnh Nhân (Patient)
* **Ví điện tử y tế & Thanh toán VNPay-QR trực tuyến (`/payment`):**
  * Tích hợp cổng thanh toán trực tuyến **VNPay Sandbox chính thức** (hỗ trợ quét mã VNPAY-QR, Thẻ ATM nội địa, Internet Banking).
  * Nạp tiền trực tiếp vào Ví số dư tài khoản bệnh nhân để trừ tiền viện phí tự động.
  * Quản lý biến động số dư, lịch sử giao dịch và biên lai viện phí điện tử.
* **Sổ nhắc giờ uống thuốc thông minh (`/reminders`):**
  * Tự động đồng bộ các loại thuốc từ đơn thuốc sau khi bác sĩ kết thúc khám.
  * Thiết lập lịch uống thuốc theo 4 cữ trong ngày (Sáng, Trưa, Chiều, Tối).
  * Đánh dấu (tick) hoàn thành liều uống thuốc và cảnh báo lịch uống còn thiếu.
* **Hồ sơ sức khỏe gia đình đa đối tượng (`/profiles`):**
  * Cho phép 1 tài khoản quản lý nhiều hồ sơ sức khỏe cho người thân (Bản thân, Bố mẹ, Vợ/Chồng, Con cái).
* **Tra cứu nhanh hồ sơ bệnh án cũ (`/lookup`):**
  * Tìm kiếm hồ sơ bị mất hoặc quên mã hồ sơ qua Số điện thoại hoặc Số CCCD/Định danh cá nhân.

---

### 3. 👨‍⚕️ Phân Hệ Bác Sĩ (Doctor)
* **Hệ thống Phát loa gọi số thông minh (AI Voice Call + Chuông Ding-Dong):**
  * Tích hợp hiệu ứng chuông bệnh viện (Web Audio API) chuẩn phòng khám.
  * Tự động phát loa đọc tên bệnh nhân bằng giọng nói AI tiếng Việt: *"Mời bệnh nhân [Họ tên], số thứ tự [STT] vào phòng khám"*.
* **Xem lịch trực cá nhân 14 ngày tới (`/doctor/schedule`):**
  * Bác sĩ có thể bấm xem ngay ca trực phân công của bản thân trong 2 tuần tiếp theo trực tiếp từ màn hình Bàn khám.
* **Tự động đồng bộ kết quả Cận lâm sàng theo thời gian thực (Realtime Sync):**
  * Bàn khám tự động cập nhật kết quả chỉ số xét nghiệm và hình ảnh đính kèm ngay khi phòng Lab gửi kết quả mà không cần F5/tải lại trang.
* **Xuất bản in Toa thuốc & Phiếu chỉ định chuẩn Bộ Y Tế (`Print Modals`):**
  * Xem trước và in PDF Toa thuốc điện tử có mã vạch / QR Code, chữ ký bác sĩ.
  * Xuất phiếu chỉ định dịch vụ cận lâm sàng có thông tin phòng thực hiện.

---

### 4. 👩‍⚕️ Phân Hệ Điều Dưỡng (Nurse)
* **Điều phối & Phân luồng tiếp đón tại quầy (`/nurse/reception`):**
  * Tiếp nhận bệnh nhân đến khám từ lịch hẹn trực tuyến hoặc vãng lai.
  * Cấp số thứ tự khám thường và số thứ tự ưu tiên (người già > 75 tuổi, trẻ em < 6 tuổi, phụ nữ có thai).
  * Điều phối chuyển phòng khám, cập nhật trạng thái hàng đợi (Chờ khám, Đang khám, Đã khám).

---

### 5. 🧑‍🏫 Phân Hệ Trưởng Khoa (Head of Department)
* **Quản lý & Phân lịch trực ca linh hoạt cho khoa (`/admin/schedules`):**
  * Tạo, sửa, xóa ca trực của toàn bộ bác sĩ trong chuyên khoa theo từng ngày và từng phòng.
  * Phân bổ đều các ca: Ca Sáng (07:30 - 11:30), Ca Chiều (13:00 - 17:00), Ca Tối (17:30 - 20:30).
* **Giám sát chất lượng khám bệnh & Cận lâm sàng:**
  * Theo dõi số lượng bệnh nhân đã khám trong ngày của từng bác sĩ trực thuộc khoa.

---

### 6. 🔬 Phân Hệ Bác Sĩ / Kỹ Thuật Viên Xét Nghiệm (Lab Technician)
* **Quản lý phòng Lab & Trả kết quả xét nghiệm (`/doctor/lab-tests`):**
  * Tiếp nhận bệnh nhân có chỉ định cận lâm sàng từ bác sĩ phòng khám.
  * Nhập chỉ số kết quả phân tích định lượng/định tính.
  * Tải lên hình ảnh kết quả xét nghiệm (X-quang, Siêu âm, Nội soi, MRI) và kết luận báo cáo.

---

### 7. 💳 Phân Hệ Quầy Thu Ngân Viện Phí (Cashier - ROLE_CASHIER)
* **Quầy thu tiền tại chỗ (`/cashier`):**
  * Thu tiền viện phí, tạm ứng viện phí và các khoản cận lâm sàng trực tiếp tại quầy bằng Tiền mặt hoặc Chuyển khoản QR.
  * Xuất hóa đơn GTGT / Phiếu thu điện tử.

---

### 8. 🏢 Phân Hệ Sảnh Chờ & Thiết Bị Tự Phục Vụ Thông Minh
* **Cây Kiosk lấy số thứ tự tự động tại sảnh (`/kiosk`):**
  * Màn hình cảm ứng tự phục vụ cho bệnh nhân tự chọn chuyên khoa, chọn đối tượng ưu tiên và in phiếu STT kèm mã QR.
* **Màn hình LED TV gọi số phòng khám sảnh chờ (`/queue-display`):**
  * Giao diện Full HD trình chiếu lượt khám realtime tại các phòng khám, nhấp nháy số vừa gọi và phát âm thanh chuông gọi số tự động.

---

### 9. ⚙️ Phân Hệ Quản Lý / Quản Trị Viên (Admin)
* **Bảng điều khiển Thống kê đa chiều (Analytics Dashboard - `/admin/dashboard`):**
  * Thống kê tổng doanh thu thực thu, doanh thu VNPay vs Tiền mặt.
  * Thống kê lượt đăng ký khám theo ngày/tháng/năm.
  * Biểu đồ tỷ trọng bệnh nhân theo chuyên khoa và theo độ tuổi.
* **Quản lý Tài khoản & Phân quyền bảo mật RBAC (`/admin/accounts`):**
  * Khóa / Mở khóa tài khoản người dùng ngay lập tức.
  * Đổi mật khẩu khẩn cấp và phân quyền chi tiết (Admin, Doctor, Head of Dept, Nurse, Lab Tech, Cashier, Patient).
* **Quản lý danh mục Dược phẩm & Thuốc (`/admin/medicines`):**
  * Quản lý danh mục thuốc, đơn vị tính, hoạt chất, giá bán, cảnh báo tồn kho.

---

## 🛠️ III. KIẾN TRÚC CÔNG NGHỆ BỔ SUNG

| Thành phần mở rộng | Công nghệ & Giải pháp |
| :--- | :--- |
| **Cổng thanh toán trực tuyến** | VNPay Payment Gateway API (HMAC-SHA512 Checksum, IPN Webhook) |
| **Hệ thống Phát loa AI** | Web Audio API + HTML5 SpeechSynthesis (Tiếng Việt) |
| **Xuất biểu mẫu Y tế** | React Print Template + HTML5 Canvas Rendering |
| **Đồng bộ hàng đợi Realtime** | REST Polling Engine & State Management tối ưu độ trễ thấp |
| **Bảo mật & Phân quyền** | Spring Security 6 + JWT Authentication + Role-Based Access Control |
