# Kế hoạch Triển khai: Sắp xếp Lại Giao diện Website Hospital Theo Thứ tự Biểu đồ Tuần tự

**Mode:** PLAN  
**Date:** 30-10-2026  
**Status:** COMPLETED — Đã hoàn tất sắp xếp và kiểm thử trên toàn bộ các phân hệ (Booking, Examination, NurseReception, Navbar, PatientProfiles, AdminLayout)  
**Tài liệu tham chiếu:** `BC_34_V3.docx` (Mục 2.2 Biểu đồ tuần tự), `C:\Users\ASUS\Downloads\giao diện tham khảo.docx`, `AGENTS.md`  
**Chỉ đạo ưu tiên của người dùng:** *"Đặt lịch vẫn nên để chọn khoa khám trước rồi mới chọn bác sĩ"*.

---

## 1. Mục tiêu Tổng quan

Tối ưu hóa và tái sắp xếp giao diện người dùng trên toàn bộ hệ thống `hospital-ui` để các luồng nghiệp vụ hiển thị chuẩn xác theo đúng trình tự thời gian và tương tác logic được định nghĩa trong 53 biểu đồ tuần tự (`BC_34_V3.docx`) và tài liệu mô tả màn hình (`giao diện tham khảo.docx`).

### Ràng buộc Bắt buộc:
1. **Giữ nguyên nhận diện:** Màu sắc, logo, font chữ, theme tokens, tài nguyên hình ảnh đang có được giữ nguyên vẹn 100%.
2. **Bảo toàn nghiệp vụ & dữ liệu:** Giữ nguyên toàn bộ logic xử lý, API endpoints, routes, phân quyền, dữ liệu và kiểm thử bảo mật vừa hoàn thành ở các phiên trước.
3. **Không thêm/xóa/đổi tên tính năng:** Chỉ điều chỉnh thứ tự menu, phân nhóm chức năng, thứ tự các bước stepper, vị trí các tab lâm sàng, thẻ tóm tắt và nút hành động tiếp theo.
4. **Đa nền tảng:** Giữ giao diện phản hồi mượt mà (responsive) trên cả máy tính (Desktop) và điện thoại di động (Mobile).

---

## 2. Chi tiết Kế hoạch Triển khai Theo Từng Phân hệ

### Giai đoạn 1: Phân hệ Bệnh nhân — Quy trình Đặt lịch Khám (`BookingPage.jsx`)
Tuân thủ chỉ đạo của người dùng: **Chọn Khoa khám trước → Chọn Bác sĩ**.

1. **Chuẩn hóa Stepper 5 bước:**
   - **Bước 1 (activeStep = 0):** *Chọn Chuyên Khoa Khám* (Tìm kiếm, hiển thị thẻ khoa, mô tả khoa).
   - **Bước 2 (activeStep = 1):** *Chọn Bác Sĩ Thuộc Khoa* (Lọc danh sách bác sĩ thuộc khoa đã chọn ở Bước 1, kèm học vị, phòng trực).
   - **Bước 3 (activeStep = 2):** *Chọn Ngày & Ca Khám* (Chọn ngày khám khả dụng, chọn ca Sáng hoặc Chiều, xem giờ dự kiến và số thứ tự khả dụng).
   - **Bước 4 (activeStep = 3):** *Chọn Hồ Sơ Bệnh Nhân* (Chọn người đi khám trong danh sách hồ sơ tài khoản hoặc bấm Thêm hồ sơ mới / BHYT).
   - **Bước 5 (activeStep = 4):** *Xác Nhận & Cấp Phiếu Khám* (Tóm tắt thông tin đầy đủ, lựa chọn thanh toán VNPAY/Ví/Tại quầy, nút Cấp phiếu và in phiếu khám).
2. **Bổ sung / Tối ưu Thẻ Tóm tắt Hành trình (Summary Card):**
   - Đặt thẻ tóm tắt cố định ở cột bên phải (hoặc floating bar trên mobile) để người dùng luôn nhìn thấy: *Khoa đã chọn → Bác sĩ đã chọn → Ca khám đã chọn → Người khám đã chọn*.
   - Mỗi mục có nút bấm nhỏ *"Thay đổi"* để quay lại đúng bước đó nhanh chóng mà không phải ấn nút Back nhiều lần.
3. **Chuẩn hóa vị trí nút hành động:**
   - Cặp nút *"Quay lại bước trước"* và *"Tiếp tục"* được đặt cố định ở chân mỗi bước, tự động khóa (disable) khi chưa chọn đủ thông tin của bước hiện tại.

---

### Giai đoạn 2: Phân hệ Bác sĩ & Trưởng khoa — Quy trình Khám Lâm sàng (`ExaminationPage.jsx`)
Căn cứ Biểu đồ tuần tự 2.2.17, 2.2.18 và Hình 157, 158 trong file tham khảo.

1. **Sắp xếp lại thứ tự Tabs Lâm sàng trong ca khám:**
   - **Tab 1 (Index 0):** *1. Khám Lâm Sàng & Chẩn Đoán Sơ Bộ*
     * Ghi nhận lý do khám, khai thác triệu chứng, tiền sử dị ứng/bệnh mạn tính, chỉ số sinh hiệu (Huyết áp, Mạch, Thân nhiệt, SpO2).
     * Nhập mã chẩn đoán sơ bộ ICD-10.
   - **Tab 2 (Index 1):** *2. Chỉ Định Cận Lâm Sàng & Kết Quả*
     * Chỉ định xét nghiệm huyết học, sinh hóa, X-quang, CT/MRI, siêu âm.
     * Khu vực xem kết quả xét nghiệm và ảnh PACS ngay khi phòng Lab trả về (kèm nhãn trạng thái: Chờ lấy mẫu → Đang thực hiện → Đã có kết quả).
   - **Tab 3 (Index 2):** *3. Chẩn Đoán Xác Định, Kê Đơn Thuốc & Kết Thúc*
     * Bác sĩ xác nhận chẩn đoán cuối cùng sau khi có kết quả CLS.
     * Toa thuốc điện tử: chọn thuốc, số lượng, hướng dẫn liều dùng, cảnh báo tương tác thuốc.
     * Lịch hẹn tái khám và dặn dò của bác sĩ.
2. **Sắp xếp thanh nút tác vụ cuối trang:**
   - Nút *"Lưu chẩn đoán"* (Lưu tạm thời / Cập nhật tiến trình) đặt cạnh nút *"Hoàn thành buổi khám"* (Chốt kết thúc ca khám, xuất toa thuốc và bệnh án).
3. **Phân hệ Trưởng khoa:**
   - Hiển thị rõ các nút điều hướng tác nghiệp đặc quyền của Trưởng khoa: *Bàn Khám Lâm Sàng ↔ Lịch Trực Cá Nhân ↔ Phân Lịch Trực Khoa (`ScheduleManagePage.jsx`)*.

---

### Giai đoạn 3: Phân hệ Điều dưỡng — Tiếp đón & Quản lý STT (`NurseReceptionPage.jsx`)
Căn cứ Biểu đồ tuần tự 2.2.13, 2.2.14, 2.2.15 và Hình 150 - 155 trong file tham khảo.

1. **Phân tách 2 luồng tiếp đón độc lập qua Tabs chuyển đổi trực quan:**
   - **Luồng 1: Tiếp Nhận Tại Quầy Dịch Vụ (Bệnh nhân trực tiếp đến viện):**
     * Tìm kiếm hồ sơ bệnh nhân qua CCCD/Họ tên.
     * Nút *"Tạo hồ sơ bệnh nhân mới"* (Popup nhập thông tin hành chính, BHYT).
     * Chọn Chuyên khoa & Dịch vụ khám bệnh.
     * Nút *"Cấp số thứ tự"* vào hàng đợi buồng khám và in phiếu nhiệt.
   - **Luồng 2: Tiếp Nhận Tại Phòng Khám (Bệnh nhân đã đặt trước qua Web):**
     * Ô tìm kiếm mã đặt trước (Booking Code) hoặc quét mã vạch phiếu khám.
     * Hiển thị thông tin đặt hẹn → Nút *"Xác nhận tiếp nhận"* (bệnh nhân đã có mặt).
     * Bảng danh sách hàng đợi của buồng khám: gọi số hiện tại, nút *"Gọi số tiếp theo"*, nút *"Chuyển 5 người tiếp theo"*, nút *"Xem toàn màn hình TV LED"*.

---

### Giai đoạn 4: Phân hệ Bệnh nhân — Thanh Điều hướng & Sổ Khám Điện tử
Căn cứ Biểu đồ tuần tự 2.2.4 - 2.2.10, 2.2.12 và Hình 132 - 139 trong file tham khảo.

1. **Menu Header (`Navbar.jsx`):**
   - Khi bệnh nhân đăng nhập, sắp xếp thứ tự menu:
     `Trang Chủ` → `Đặt Lịch Khám` → `Sổ Khám Bệnh` (Dropdown: Hồ sơ bệnh nhân, Phiếu khám bệnh, Lịch sử khám) → `Tra Cứu & Xác Thực` → `Tư Vấn Y Tế`.
2. **Sổ Khám Điện tử (`PatientProfilesPage.jsx`):**
   - Sắp xếp thanh tab nội bộ theo đúng 3 mục cốt lõi:
     * `Tab 0: Hồ Sơ Bệnh Nhân` (Danh sách hồ sơ cá nhân/người thân, chi tiết hồ sơ, sửa, xóa, nút *"Thêm hồ sơ"*).
     * `Tab 1: Phiếu Khám Bệnh` (Danh sách các phiếu khám đã đặt, mã phiếu, số thứ tự, phòng khám, bác sĩ, in phiếu).
     * `Tab 2: Lịch Sử Khám Bệnh` (Lịch sử các lần khám hoàn thành, chẩn đoán, toa thuốc, ngày tái khám).

---

### Giai đoạn 5: Phân hệ Quản trị Viên (Admin) — Menu Điều hành (`AdminLayout.jsx`)
Căn cứ Hình 165 - 173 (Bảng 119 - 127) và Biểu đồ tuần tự 2.2.24 - 2.2.53.

1. **Sắp xếp lại Sidebar Menu theo đúng trình tự quản lý:**
   - **Nhóm 1: Thống Kê & Báo Cáo** (`/admin/dashboard`): Doanh thu, lượt khám, top khoa.
   - **Nhóm 2: Quản Lý Tài Khoản** (`/admin/accounts`): Tài khoản người dùng, phân quyền, khóa/mở khóa.
   - **Nhóm 3: Quản Trị Nhân Sự & Bác Sĩ** (`/admin/doctors`, `/admin/schedules`): Bác sĩ, CCHN, lịch trực ca.
   - **Nhóm 4: Quản Lý Bệnh Nhân** (`/admin/patients`): Danh sách bệnh nhân toàn viện.
   - **Nhóm 5: Quản Lý Cơ Sở Khoa Phòng** (`/admin/departments`, `/admin/rooms`): Danh mục khoa, buồng khám.
   - **Nhóm 6: Quản Lý Danh Mục Chuyên Môn** (`/admin/services`, `/admin/medicines`, `/admin/pharmacy-inventory`): Dịch vụ y tế, danh mục thuốc, kho dược FEFO.
   - **Nhóm 7: Tài Chính & Lịch Hẹn** (`/admin/transactions`, `/admin/bookings`, `/cashier`): Đối soát giao dịch, quản lý lịch hẹn, thu ngân.

---

## 3. Danh sách File Cần Chỉnh sửa

| STT | Tên file | Vị trí | Mục tiêu chỉnh sửa |
|:---:|:---|:---|:---|
| 1 | `BookingPage.jsx` | `hospital-ui/src/pages/customer/` | Chuẩn hóa Stepper 5 bước (Khoa → Bác sĩ → Ca khám → Hồ sơ → Xác nhận), thẻ tóm tắt hành trình và vị trí nút chuyển bước. |
| 2 | `ExaminationPage.jsx` | `hospital-ui/src/pages/Doctor/` | Đảo lại thứ tự Tabs lâm sàng (Khám lâm sàng & Chẩn đoán sơ bộ → Cận lâm sàng & Kết quả → Kê đơn thuốc & Hoàn thành ca khám). |
| 3 | `NurseReceptionPage.jsx` | `hospital-ui/src/pages/nurse/` | Tạo 2 tab phân luồng: Tiếp nhận quầy trực tiếp và Tiếp nhận phòng khám đặt trước. |
| 4 | `Navbar.jsx` | `hospital-ui/src/components/navbar/` | Sắp xếp thứ tự menu bệnh nhân đã đăng nhập. |
| 5 | `PatientProfilesPage.jsx` | `hospital-ui/src/pages/patient/` | Sắp xếp lại thứ tự 3 tab: Hồ sơ bệnh nhân → Phiếu khám bệnh → Lịch sử khám bệnh. |
| 6 | `AdminLayout.jsx` | `hospital-ui/src/layouts/` | Sắp xếp lại các nhóm menu sidebar quản trị theo đúng Hình 165 - 173. |

---

## 4. Phương án Kiểm chứng & Nghiệm thu (Verification)

1. **Kiểm tra Đóng gói Frontend:** Chạy `npm run build` trong `hospital-ui` để đảm bảo mã nguồn JSX không có lỗi cú pháp, cảnh báo bundle hay import hỏng.
2. **Kiểm tra Tính toàn vẹn Nghiệp vụ:** Đảm bảo luồng đặt lịch, tạo đơn thuốc, tiếp nhận bệnh nhân hoạt động thông suốt với Backend API.
3. **Kiểm tra Responsive:** Đảm bảo thanh Stepper, Sub-nav và Sidebar hiển thị chuẩn, không bị tràn màn hình hay che khuất nội dung trên cả màn hình Desktop và Mobile.

