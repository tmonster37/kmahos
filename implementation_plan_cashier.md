# 📋 KẾ HOẠCH TRIỂN KHAI: HOÀN THIỆN PHÂN HỆ THU NGÂN VIỆN PHÍ (CASHIER WORKFLOW)
**Dự án:** Hospital Management System (HMS) - YOUMED TNT HOSPITAL  
**Phân hệ:** Quầy Thu Ngân Viện Phí & Quản Lý Giao Dịch  
**Mục tiêu:** Kết nối dữ liệu thật từ Backend & Database với `CashierPage.jsx`, hỗ trợ thanh toán tại quầy (CASH, POS, QR), cập nhật giao dịch nguyên tử, chống thu trùng và in phiếu thu chính xác.

---

## 🔍 1. KẾT QUẢ XÁC MINH HIỆN TRẠNG MÃ NGUỒN

Qua rà soát thực tế mã nguồn, xác nhận:
1. **Frontend (`CashierPage.jsx`)**:
   - Đang dùng mảng mẫu `FALLBACK_PENDING_BILLS` và tự sinh các khoản mục giả (`items: [{ name: "Phiếu khám...", price: 150000 }, { name: "Chỉ định xét nghiệm...", price: 200000 }]`) khi lấy danh sách từ `queue/public`.
   - Hàm `handleConfirmPayment` chỉ cập nhật state nội bộ (`setPendingBills`, `setPaidHistory`, `setShiftStats`), hoàn toàn **không gọi bất kỳ API backend nào**. Khi người dùng tải lại trang (F5), toàn bộ lịch sử thanh toán tại quầy bị mất sạch.
2. **Backend (`PaymentController.java` & `PaymentServiceImpl.java`)**:
   - Chỉ có các API thanh toán online qua cổng (VNPay, VietQR, MoMo, Ví nội bộ), webhook PayOS và callback VNPay.
   - **Chưa có API** lấy danh sách các khoản viện phí đang chờ thanh toán (`/api/cashier/pending-bills`) tổng hợp từ ca khám, chỉ định cận lâm sàng và đơn thuốc thật.
   - **Chưa có API** tiếp nhận và ghi nhận thanh toán viện phí tại quầy (`/api/cashier/pay`).
3. **Cấu hình bảo mật (`SecurityConfig.java`)**:
   - Đã cấu hình sẵn: `.requestMatchers("/api/cashier/**", "/api/payment/admin/**", "/api/payment/confirm/**").hasAnyRole("CASHIER", "ADMIN")`.

---

## 🏗️ 2. KIẾN TRÚC & MÔ HÌNH DỮ LIỆU ĐỐI CHIẾU

Dự án đã có đầy đủ các thực thể và mối quan hệ, **tuyệt đối không tạo bảng hay thay đổi schema**:
- `Booking`: Chứa ca khám, `price` (phí khám), `bookingCode`, `patientProfile`, `doctor`.
- `MedicalExaminationRecord`: Liên kết 1-1 với `Booking`.
- `MedicalTest`: Chỉ định cận lâm sàng thuộc ca khám, `price` (giá dịch vụ xét nghiệm), `medicalService`.
- `Prescription` & `PrescriptionItem`: Đơn thuốc của ca khám, `totalAmount`, `medicine`, `unitPrice`, `quantity`.
- `Transaction`: Lưu vết tài chính, `amount`, `transactionType`, `paymentMethod`, `status` (`SUCCESS`/`PENDING`), `vnpayTxnRef`, `description`.
- `PaymentMethod`: Thêm giá trị `POS` vào enum `PaymentMethod.java` để hỗ trợ thẻ ngân hàng / máy POS (đã có sẵn `CASH`, `COUNTER_CASH`, `VIETQR`, `VNPAY`, `MOMO`, `INTERNAL_WALLET`).

---

## 🚀 3. CHI TIẾT CÁC HẠNG MỤC TRIỂN KHAI

### 3.1. Backend
1. **Enum `PaymentMethod.java`**:
   - Bổ sung giá trị `POS`.
2. **DTOs (`com.hospital.api.dto`)**:
   - `CashierPendingBillResponse`: Dữ liệu ca khám chờ thu gồm `billId`, `bookingCode`, thông tin bệnh nhân, bác sĩ, khoa phòng, mảng các khoản mục thật (`items`: Khám bệnh, từng xét nghiệm CLS, từng loại thuốc trong đơn), `totalAmount` thật, `status` ("UNPAID").
   - `CashierPaymentRequest`: Dữ liệu gửi lên từ thu ngân gồm `bookingCode`, `paymentMethod` (`CASH` | `POS` | `VIETQR`), `amountGiven` (tiền khách đưa), `notes`.
   - `CashierReceiptResponse`: Dữ liệu phiếu thu trả về gồm `receiptCode`, thông tin hành chính, danh sách chi tiết các dịch vụ/thuốc, tổng tiền, tiền khách đưa, tiền thừa, thời gian thanh toán, tên nhân viên thu ngân.
3. **Service (`CashierService.java` & `CashierServiceImpl.java`)**:
   - `getPendingBills()`:
     - Lấy danh sách Booking trong ngày hoặc gần đây chưa bị hủy (`CANCELLED`).
     - Kiểm tra nếu đã có `Transaction` trạng thái `SUCCESS` liên kết với `bookingCode` này -> bỏ qua (đã thu tiền).
     - Với các ca chưa thanh toán: đọc `MedicalExaminationRecord` để tổng hợp:
       + Phí khám ban đầu (`booking.getPrice()`).
       + Chi phí các xét nghiệm cận lâm sàng (`medicalTests`).
       + Chi phí đơn thuốc (`prescription.getTotalAmount()`).
     - Trả về danh sách với số tiền thực tế 100% từ database.
   - `processPayment(String cashierUsername, CashierPaymentRequest request)`:
     - Đảm bảo tính **nguyên tử (@Transactional)** và **chống thu trùng (Idempotency)** bằng cơ chế synchronized lock theo `bookingCode` và kiểm tra giao dịch đã tồn tại.
     - Nếu ca khám đã có giao dịch `SUCCESS` -> từ chối ngay với lỗi HTTP 409 Conflict: *"Khoản viện phí này đã được thanh toán thành công trước đó!"*.
     - Ghi nhận `Transaction` mới:
       + `amount`: Tổng tiền viện phí thực tế.
       + `transactionType`: `TransactionType.PAY_BOOKING`.
       + `paymentMethod`: Phương thức đã chọn (`CASH`, `POS`, `VIETQR`).
       + `status`: `SUCCESS`.
       + `vnpayTxnRef`: Mã biên lai độc nhất (vd: `RCP-{bookingCode}-{timestamp}`).
       + `description`: *"Thu ngân viện phí tại quầy cho ca khám: {bookingCode}"*.
     - Cập nhật trạng thái `Booking` (từ `PENDING_PAYMENT` sang `CONFIRMED` nếu áp dụng).
     - Tự động gửi Notification thông báo thanh toán thành công cho tài khoản Bệnh nhân (nếu có).
     - Trả về `CashierReceiptResponse` với đầy đủ dữ liệu thật để in phiếu thu.
   - `getPaidHistory()`:
     - Lấy danh sách giao dịch viện phí đã thu thành công gần nhất từ `TransactionRepository`.
4. **Controller (`CashierController.java`)**:
   - Đường dẫn `/api/cashier`.
   - Phân quyền: `@PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")`.
   - Các endpoint:
     + `GET /api/cashier/pending-bills`: Lấy danh sách chờ thu thật.
     + `POST /api/cashier/pay`: Xác nhận thu tiền tại quầy.
     + `GET /api/cashier/history`: Lấy lịch sử giao dịch đã thu.

### 3.2. Frontend (`CashierPage.jsx`)
1. **Loại bỏ dữ liệu giả**:
   - Xóa bỏ `FALLBACK_PENDING_BILLS` và logic tự sinh mảng `items` ảo với giá 150k/200k.
2. **Tích hợp API thật**:
   - `loadData()`:
     + Gọi `GET /api/cashier/pending-bills` để hiển thị các ca chờ thu từ DB.
     + Gọi `GET /api/cashier/history` để tải lịch sử giao dịch đã thu.
     + Thống kê ca trực (`shiftStats`) tính toán dựa trên dữ liệu giao dịch thật.
   - `handleConfirmPayment()`:
     + Gọi `POST /api/cashier/pay` gửi `bookingCode`, `paymentMethod`, `amountGiven`.
     + Sau khi thành công, nhận phiếu thu thật từ backend, lưu vào `receiptData`, bật modal in phiếu.
     + Gọi lại `loadData()` để đồng bộ danh sách (phiếu đã thu lập tức biến mất khỏi hàng chờ và xuất hiện trong Lịch sử).
   - **In phiếu thu (`ReceiptPrintModal`)**:
     + Hiển thị đầy đủ: Họ tên bệnh nhân, Mã hồ sơ, Bác sĩ/Khoa phòng, Danh sách dịch vụ/Chỉ định/Thuốc thực tế, Tiền khách đưa, Tiền thối lại, Nhân viên thu ngân.
     + Khi bấm F5 tải lại trang: Toàn bộ lịch sử và kết quả thanh toán được duy trì nguyên vẹn từ cơ sở dữ liệu.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ XÁC MINH (5 TIÊU CHÍ)

Tạo kịch bản kiểm thử độc lập `test_cashier_workflow.js` kiểm tra và xuất log thực tế:
1. **Tiêu chí 1: Lấy danh sách chờ thu từ dữ liệu thật**:
   - Tạo ca khám mới (có tiền khám, chỉ định CLS, đơn thuốc).
   - Đăng nhập với tài khoản Thu ngân/Admin (`0937050537` / `taizz0537`).
   - Gọi `GET /api/cashier/pending-bills` -> Xác nhận ca khám xuất hiện với các khoản mục và tổng tiền chính xác.
2. **Tiêu chí 2: Thu tiền thành công tạo Transaction & cập nhật DB**:
   - Thu ngân gọi `POST /api/cashier/pay` với phương thức `CASH` hoặc `POS`.
   - Kiểm tra mã phản hồi HTTP 200, nhận biên lai có `receiptCode`.
   - Truy vấn database xác nhận bản ghi `Transaction` đã được tạo với trạng thái `SUCCESS`.
3. **Tiêu chí 3: Tải lại trang (F5) không mất kết quả**:
   - Gọi `GET /api/cashier/history` -> Ca khám vừa thu xuất hiện trong lịch sử.
   - Gọi `GET /api/cashier/pending-bills` -> Ca khám không còn trong danh sách chờ thu.
4. **Tiêu chí 4: Chống thu trùng khi gửi yêu cầu lặp lại**:
   - Gửi tiếp yêu cầu `POST /api/cashier/pay` cho cùng một `bookingCode` vừa thanh toán.
   - Backend từ chối với HTTP 409 Conflict ("Đã thanh toán trước đó"), không sinh thêm giao dịch thứ 2.
5. **Tiêu chí 5: Kiểm soát phân quyền RBAC**:
   - Dùng tài khoản Bệnh nhân hoặc Điều dưỡng (không có role CASHIER/ADMIN) gọi `POST /api/cashier/pay`.
   - Backend chặn lại với HTTP 403 Forbidden.

---

## 🛑 5. ĐIỂM DỪNG CHỜ PHÊ DUYỆT (STOP & WAIT)

Theo quy định nghiêm ngặt của dự án tại `plan.md` và `AGENTS.md`:
- Kế hoạch này được trình bày chi tiết và đầy đủ để người dùng đánh giá.
- **Dừng lại ngay tại đây và không sửa bất kỳ dòng mã nào cho đến khi nhận được phản hồi phê duyệt từ người dùng.**
