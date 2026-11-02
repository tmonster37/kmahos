# Kế Hoạch Sửa Lỗi Giao Diện Điều Dưỡng (Nurse Reception UI Overhaul) - COMPLETED

> **File:** `process/general-plans/completed/nurse_ui_reception_fix_PLAN_30-10-26.md`  
> **Ngày lập:** 30/10/2026  
> **Trạng thái:** HOÀN TẤT (COMPLETED)  
> **Căn cứ:** `BC_34_V3.docx` (Mục 2.2.13, 2.2.14, 2.2.15) & `giao diện tham khảo.docx` (Hình 150–155, Bảng 104–109)

---

## 1. Kết Quả Triển Khai Thực Tế

### Giai đoạn 1: Trang Chủ Điều Dưỡng & Điều Hướng (Hình 150 & Navbar) - [x] COMPLETED
- [x] **Task 1.1:** Cập nhật [Navbar.jsx](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/components/navbar/Navbar.jsx): Khi `user?.role === "ROLE_NURSE"`, logo liên kết về `/nurse/reception` (Trang chủ điều dưỡng).
- [x] **Task 1.2:** Trong [NurseReceptionPage.jsx](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/nurse/NurseReceptionPage.jsx), khi `receptionTab === 'home'` hoặc không có tham số `?mode`:
  - Hiển thị giao diện Trang chủ điều dưỡng (Hình 150, Bảng 104) gồm 2 Card lớn:
    1. **Tiếp Nhận Tại Quầy Dịch Vụ** (Bệnh nhân trực tiếp) -> Chuyển sang `mode=counter`.
    2. **Tiếp Nhận Tại Phòng Khám** (Bệnh nhân đặt qua website) -> Mở modal chọn buồng/ca trực -> Chuyển sang `mode=clinic`.
  - Hiển thị thông tin điều dưỡng và nút "Đăng xuất" rõ ràng.
  - Cung cấp nút `← Quay lại Trang chủ điều dưỡng (Hình 150)` trên cả hai màn hình con.

### Giai đoạn 2: Tìm Buồng Khám & Chọn Ca Trực (Hình 151, Bảng 105) - [x] COMPLETED
- [x] **Task 2.1:** Cập nhật [RoomShiftSelectModal.jsx](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/components/nurse/RoomShiftSelectModal.jsx):
  - Nhận danh sách phòng `rooms` với fallback danh sách buồng khám chuẩn khi backend chưa khởi tạo dữ liệu phòng.
  - Thêm xử lý phím `Enter` trong ô tìm kiếm buồng khám.
  - Hiển thị thông tin ca trực hôm nay (ngày tháng định dạng tiếng Việt chuẩn) kèm bác sĩ phụ trách.
  - Khi chọn ca trực: gọi `onSelectShift(shiftData)` và chuyển thẳng sang màn hình Tiếp nhận phòng khám (Hình 152).

### Giai đoạn 3: Tiếp Nhận Bệnh Nhân Đặt Trước Tại Phòng Khám (Hình 152, Biểu Đồ 2.2.14) - [x] COMPLETED
- [x] **Task 3.1:** Xóa bỏ dữ liệu mặc định gán cứng `preBookingCode: "791B724D553C"` và bệnh nhân mẫu `Ma Kim Xuân`.
- [x] **Task 3.2:** Viết lại handler `handleSearchPreBooking(code)`:
  - Bật cờ `isSearchingPreBooking = true` và disable nút "Tìm".
  - Gọi API `GET /api/bookings/code/{code}`.
  - Nếu thành công: Cập nhật `foundPreBooking` với dữ liệu thật từ máy chủ.
  - Nếu không tìm thấy: Đặt `foundPreBooking = null`, hiển thị thông báo `Alert`: *"Không tìm thấy thông tin đặt trước với mã [MÃ]. Vui lòng kiểm tra lại!"* (đúng quy định Biểu đồ 2.2.14).
- [x] **Task 3.3:** Viết lại handler `handleAdmitPreBooking(booking)`:
  - Kiểm tra bệnh nhân có mã BN; nếu chưa có mở modal xác thực CCCD (Hình 2.25).
  - Gọi API cập nhật trạng thái `PUT /api/nurse/reception/bookings/{id}/status?status=WAITING_FOR_EXAMINATION` kèm fallback dispatch buồng khám.
  - Cập nhật hàng đợi và tự động chuyển sang tab Quản lý STT (Hình 153).

### Giai đoạn 4: Quản Lý Số Thứ Tự Phòng Khám (Hình 153, Biểu Đồ 2.2.15) - [x] COMPLETED
- [x] **Task 4.1:** Xóa bỏ mảng 5 bệnh nhân tĩnh `[{ stt: "01", name: "Lý Minh Thông" }, ...]`.
- [x] **Task 4.2:** Viết hàm `useMemo` lọc danh sách 5 bệnh nhân vào phòng từ `queueList` thật của buồng khám đang trực.
  - Hiển thị số lượng bệnh nhân đang chờ thực tế: `(X người đang chờ)`.
  - Hiển thị Empty State nếu hàng đợi buồng khám chưa có người chờ.
- [x] **Task 4.3:** Cập nhật nút "TIẾP THEO":
  - Tự động disable khi không có bệnh nhân chờ trong buồng khám.
  - Cập nhật `activeServingSTT` tương ứng số thứ tự phục vụ hiện tại.

### Giai đoạn 5: Tiếp Nhận Tại Quầy Dịch Vụ (Hình 154, Biểu Đồ 2.2.13) - [x] COMPLETED
- [x] **Task 5.1:** Xóa bỏ 2 thẻ bệnh nhân mẫu cứng ban đầu.
- [x] **Task 5.2:** Viết lại chức năng tìm kiếm tại quầy:
  - Lấy giá trị từ cả 2 ô "TÊN" và "CCCD/ Số điện thoại", hỗ trợ phím `Enter`.
  - Gọi API `GET /api/patient-profiles/lookup?keyword=...`.
  - Cập nhật trực tiếp kết quả vào state `counterPatientCards`.
  - Nếu kết quả rỗng: Hiển thị Empty State thân thiện kèm nút "+ Tạo hồ sơ mới ngay".
- [x] **Task 5.3:** Cập nhật nút "Tiếp nhận" trên thẻ bệnh nhân cấp STT và xuất phiếu in nhiệt mã vạch.
- [x] **Task 5.4:** Dọn dẹp dòng import dead code `CounterManagementPanel`.

### Giai đoạn 6: Tạo Hồ Sơ Bệnh Nhân Của Điều Dưỡng (Hình 155, Bảng 109) - [x] COMPLETED
- [x] **Task 6.1:** Trong `handleCreatePureProfileSubmit`:
  - Bật cờ `isSubmittingProfile = true` và disable nút "Lưu" để chống bấm nhiều lần.
  - Bỏ `.catch(() => null)`. Dùng `try / catch` chuẩn mực.
  - Bắt lỗi chi tiết từ backend (trùng CCCD, SĐT...) và hiển thị thông báo lỗi trên UI.
  - Khi thành công: Lấy `patientCode` chính thức do server trả về để thêm vào đầu danh sách thẻ quầy tiếp nhận.

---

## 2. Kết Quả Kiểm Thử Tự Động (Verification Results)
- **Vitest Unit/Integration Tests:** 26/26 tests passed (100% pass rate).
- **Vite Production Build:** `npm --prefix hospital-ui run build` thành công trong 13.07 giây, 0 lỗi cú pháp hoặc tag JSX.

