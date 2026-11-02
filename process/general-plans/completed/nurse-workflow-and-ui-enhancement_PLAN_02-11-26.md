# Kế Hoạch Triển Khai: Chuẩn Hóa Giao Diện & Quy Trình Điều Dưỡng (Nurse Workflow & UI Enhancement)

- **Mode:** EXECUTE
- **Date:** 02-11-2026
- **Status:** IMPLEMENTED_READY_FOR_VERIFICATION
- **Scope Ref:** Thực hiện theo Phương án 1 (Toàn diện & Chuẩn hóa Nghiệp vụ Lâm sàng) được phê duyệt sau khảo sát RESEARCH. Giải quyết triệt để 4 mục tiêu: Tra cứu & xác nhận bệnh nhân, Hàng đợi & chốt chặn thu tiền PayOS VietQR, Phân quyền giao diện nội trú & phiếu chăm sóc điều dưỡng chuyên biệt, Tối ưu khả năng tiếp cận (A11y/UX).

---

## 1. Mục Tiêu Nghiệp Vụ & Ranh Giới Trách Nhiệm

### 1.1. Tra cứu và xác nhận bệnh nhân
- **Không tự ý chọn kết quả đầu tiên (`profiles[0]`):** Khi tìm kiếm theo SĐT, CCCD hoặc Tên, nếu có nhiều hơn 1 kết quả hoặc không khớp tuyệt đối 100%, hiển thị danh sách các hồ sơ phù hợp (`CandidateProfileCard` / List) kèm đầy đủ thông tin: Họ tên, Ngày sinh, SĐT, Số CCCD, Địa chỉ để Điều dưỡng trực tiếp đối chiếu với người bệnh và chủ động bấm "Chọn hồ sơ này".
- **Không tự sinh dữ liệu giả mạo:**
  - Xóa bỏ toàn bộ giá trị mặc định `dateOfBirth: "1990-01-01"` (để trống hoặc `null`). Nếu bệnh nhân không nhớ hoặc thiếu dữ liệu, hiển thị nhãn "Chưa có dữ liệu", không lưu ngày sinh giả vào CSDL.
  - Xóa bỏ `departmentId: "1"` mặc định. Bắt buộc Điều dưỡng chọn đúng chuyên khoa khám phù hợp với triệu chứng của bệnh nhân.
  - Xóa bỏ fallback tên buồng `"Phòng 101"`. Buồng chỉ được gợi ý dựa trên danh sách buồng thực tế thuộc chuyên khoa đã chọn.
- **Phát hiện & ngăn ngừa trùng lặp hồ sơ:** Trước khi tạo tiếp nhận mới (Walk-in), hệ thống đối soát nhanh SĐT/CCCD. Nếu đã có hồ sơ y tế cũ, đưa ra thông báo gợi ý liên kết thay vì tạo thêm hồ sơ rác.

### 1.2. Hàng đợi, thu tiền và điều phối
- **Loại bỏ triệt để giá fallback `150.000 đ`:** Cả ở Frontend (`NurseReceptionPage.jsx`, `CounterManagementPanel.jsx`) và Backend (`NurseReceptionServiceImpl.java#L325-L327`). Biểu phí khám bệnh chỉ được hiển thị khi Backend xác nhận từ chuyên khoa hoặc bảng giá dịch vụ. Nếu chưa có, hiển thị rõ ràng "Chưa có biểu phí (0 đ)" kèm cảnh báo.
- **Chốt chặn an toàn PayOS VietQR (Payment Verification Gate):**
  - Khi phương thức thanh toán là `VIETQR`, hiển thị mã QR cùng trạng thái "Đang chờ thanh toán...".
  - Nút "Xác nhận & Điều phối" **bắt buộc bị khóa (`disabled`)** cho đến khi Webhook hoặc API đối soát (`handleSyncPayOS`) xác nhận giao dịch `PAID` (`isVerified = true`).
  - Tuyệt đối không cho phép gửi request thanh toán `pay-at-clinic` với phương thức `VIETQR` khi chưa có xác nhận từ ngân hàng/cổng thanh toán.
- **Tách bạch luồng Thử lại Điều phối (Safe Dispatch Retry):**
  - Nếu bước thu tiền viện phí đã thành công nhưng bước điều phối buồng khám bị lỗi (ví dụ buồng khám đóng cửa hoặc lỗi mạng), hệ thống chuyển modal sang trạng thái "Đã thanh toán thành công - Chờ phân phòng".
  - Hiển thị nút chuyên biệt "Thử Lại Điều Phối" (chỉ gọi API `/dispatch`, tuyệt đối không gọi lại API thanh toán để chống trừ tiền/ghi nhận biên lai lần 2).
- **Phân định rõ số vé quầy và STT buồng khám:**
  - Vé tại quầy tiếp đón (`ticketCode`: ví dụ `TN-01`, `CLS-02`) dùng để Điều dưỡng gọi người bệnh vào quầy thủ tục.
  - STT buồng khám của Bác sĩ (`bookingQueueCode`: ví dụ `KB-03`, `UT-01`) chỉ được cấp và gọi sau khi đã điều phối vào buồng khám.
  - Hàng đợi tại quầy chỉ chứa các bệnh nhân đã check-in thực tế và có khoản phí cần xử lý tại quầy.

### 1.3. Giao diện nội trú cho điều dưỡng (`InpatientPage.jsx`)
- **Phân quyền vai trò dựa trên `useAuth()`:**
  - Nhận diện vai trò người dùng (`ROLE_NURSE` vs `ROLE_DOCTOR` / `ROLE_HEAD_OF_DEPARTMENT`).
  - Đối với Điều dưỡng (`ROLE_NURSE`), ẩn hoặc vô hiệu hóa hoàn toàn nút "Xuất viện" (`openDischargeModal`) và nút "Chuyển buồng/giường" (`openTransferModal`) của Bác sĩ để tránh lỗi HTTP 403 Forbidden.
- **Chuẩn hóa nghiệp vụ Phiếu Chăm Sóc Điều Dưỡng:**
  - Xây dựng giao diện ghi nhận và theo dõi **Phiếu Chăm Sóc Điều Dưỡng** sử dụng đúng API chuẩn backend:
    - Tạo phiếu: `POST /api/inpatient/{admissionId}/nursing-cares` (`NursingCareRequest`: Kế hoạch chăm sóc, chẩn đoán điều dưỡng, dấu hiệu sinh tồn, can thiệp điều dưỡng, đánh giá).
    - Lấy lịch sử: `GET /api/inpatient/{admissionId}/nursing-cares` (`NursingCareResponse`).
  - Tuyệt đối không gắn nhầm phiếu chăm sóc vào `POST /api/inpatient/{admissionId}/daily-record` (vốn là tờ điều trị y lệnh của Bác sĩ).
- **Điều hướng thân thiện:** Bổ sung alias route `/nurse/inpatient` trong `AppRoutes.jsx` để Điều dưỡng truy cập trực tiếp từ phân hệ của mình.

### 1.4. Tính dễ dùng và khả năng tiếp cận (UX & Accessibility)
- **Cấu trúc lại mật độ giao diện:** Tách bạch các phân vùng: Tiếp nhận quầy -> Hàng đợi gọi số -> Thu phí PayOS -> Giám sát tải buồng khám.
- **Hỗ trợ phím tắt & Focus rõ nét:** Bổ sung phím tắt `Enter` cho ô tra cứu bệnh nhân; thêm viền tương phản `focus-visible` cho các nút bấm chính.
- **Responsive trên màn hình nhỏ:** Hỗ trợ cuộn dọc mượt mà (`maxHeight: '90vh'`, `overflowY: 'auto'`) cho các modal trên thiết bị màn hình thấp hoặc tablet/máy POS quầy.

---

## 2. Danh Sách Tệp Can Thiệp (Touchpoints)

### Frontend (`hospital-ui`)
1. `hospital-ui/src/pages/nurse/NurseReceptionPage.jsx`:
   - Thay đổi logic `handleSearchOldPatient`: Bỏ `matched = profiles[0]`, lưu danh sách ứng viên `candidateProfiles`, render danh sách thẻ ứng viên để Điều dưỡng chọn.
   - Sửa form `newProfile`: Xóa ngày sinh mặc định `1990-01-01`, xóa `departmentId: "1"`, xóa fallback `roomName: "Phòng 101"`.
   - Xóa bỏ toàn bộ fallback giá `150000` tại các vị trí hiển thị (lines 240, 457, 949, 1619).
   - Bổ sung phím tắt `Enter` khi tra cứu và validate dữ liệu bắt buộc trước khi tạo lượt khám.
2. `hospital-ui/src/components/nurse/CounterManagementPanel.jsx`:
   - Xóa bỏ toàn bộ fallback giá `150000` (lines 618, 921, 1290, 1563).
   - Thêm chốt chặn PayOS VietQR: Disable nút thanh toán/điều phối khi phương thức là `VIETQR` mà giao dịch chưa `PAID` / `isVerified`.
   - Cải tiến luồng xử lý lỗi điều phối: Khi `dispatchSucceeded === false`, lưu cờ `paymentCompleted: true`, đổi nhãn nút sang "Thử Lại Điều Phối Buồng Khám" (chỉ gọi API dispatch).
   - Tách biệt rõ ràng nhãn "Số gọi quầy" và "STT phòng khám Bác sĩ".
   - Tối ưu cuộn dọc modal trên màn hình tablet/POS.
3. `hospital-ui/src/pages/Doctor/InpatientPage.jsx`:
   - Import và tích hợp `useAuth`: Nhận diện vai trò `ROLE_NURSE`.
   - Ẩn nút "Xuất viện" và "Chuyển buồng" đối với Điều dưỡng.
   - Thêm Tab/Modal "Phiếu Chăm Sóc Điều Dưỡng" gọi trực tiếp API `POST /api/inpatient/{admissionId}/nursing-cares` và nạp lịch sử từ `GET /api/inpatient/{admissionId}/nursing-cares`.
4. `hospital-ui/src/routes/AppRoutes.jsx`:
   - Thêm route alias: `<Route path="/nurse/inpatient" element={<InpatientPage />} />` trong phân hệ Điều dưỡng.

### Backend (`hospital-api`)
5. `hospital-api/src/main/java/com/hospital/api/service/impl/NurseReceptionServiceImpl.java`:
   - Xóa bỏ dòng gán giá fallback `booking.setPrice(BigDecimal.valueOf(150000))` tại dòng 325-327. Thay bằng kiểm tra nếu giá null thì lấy giá từ dịch vụ/khoa hoặc báo lỗi yêu cầu xác định viện phí trước khi thu.

---

## 3. Các Giai Đoạn Triển Khai Chi Tiết (Phases)

### Giai đoạn 1: Chuẩn hóa Tra cứu & Tiếp nhận Bệnh nhân (`NurseReceptionPage.jsx`)
- **Bước 1.1:** Viết lại `handleSearchOldPatient`:
  - Khai báo state `candidateProfiles` (mảng danh sách hồ sơ tìm thấy).
  - Bỏ dòng `if (!matched && profiles.length > 0) matched = profiles[0]`.
  - Nếu tìm thấy nhiều hồ sơ, lưu vào `candidateProfiles` và hiển thị danh sách cho người dùng chọn.
  - Chỉ khi người dùng bấm "Chọn hồ sơ này", mới set `foundPatient`.
- **Bước 1.2:** Loại bỏ toàn bộ giá trị giả mạo trong form `newProfile`:
  - Đặt `dateOfBirth: ""`, `departmentId: ""`, `roomName: ""`.
  - Validate: Bắt buộc chọn Khoa khám trước khi gửi form.
  - Bỏ fallback `price || 150000` trên bảng danh sách tiếp đón và popup chi tiết.
- **Bước 1.3:** Thêm hỗ trợ phím tắt `Enter` trên ô nhập SĐT/CCCD tra cứu.

### Giai đoạn 2: Khóa Cổng PayOS VietQR & Xử lý Thử lại Điều phối (`CounterManagementPanel.jsx`, `NurseReceptionServiceImpl.java`)
- **Bước 2.1:** Loại bỏ fallback giá `150000` trong `CounterManagementPanel.jsx` và Backend `NurseReceptionServiceImpl.java`.
- **Bước 2.2:** Chốt chặn PayOS VietQR:
  - Khi chọn `paymentMethod === "VIETQR"`, kiểm tra `payosData?.status === "PAID"` hoặc `payosVerified === true`.
  - Nếu chưa thanh toán: Hiển thị trạng thái "Chờ khách quét mã & chuyển khoản...", khóa nút "Xác nhận & Điều phối".
  - Cho phép bấm nút "Kiểm Tra Trạng Thái PayOS" để đồng bộ ngay lập tức.
  - Khi đã có xác nhận thanh toán hoặc khi chọn "Tiền mặt" (`CASH`), mở khóa nút hành động.
- **Bước 2.3:** Cơ chế "Thử lại điều phối":
  - Lưu trạng thái `alreadyPaidTicketId`.
  - Khi thanh toán thành công nhưng điều phối buồng lỗi: Giữ nguyên biên lai, đổi nút chính thành "Thử Lại Điều Phối Buồng Khám".
  - Bấm nút này sẽ bỏ qua bước thu tiền, chỉ gọi API điều phối phòng khám.
- **Bước 2.4:** Tách bạch hiển thị số gọi quầy (`ticketCode`) và STT buồng khám (`bookingQueueCode`).

### Giai đoạn 3: Phân quyền Vai trò & Phiếu Chăm Sóc Điều Dưỡng Nội Trú (`InpatientPage.jsx`, `AppRoutes.jsx`)
- **Bước 3.1:** Tích hợp `useAuth()` vào `InpatientPage.jsx`, xác định cờ `isNurse = role === 'ROLE_NURSE'`.
- **Bước 3.2:** Ẩn các thao tác bị cấm đối với Điều dưỡng:
  - Ẩn nút "Xuất Viện" (`openDischargeModal`).
  - Ẩn nút "Chuyển Buồng" (`openTransferModal`) của Bác sĩ.
- **Bước 3.3:** Xây dựng tính năng "Phiếu Chăm Sóc Điều Dưỡng":
  - Thêm Modal/Tab ghi Phiếu Chăm Sóc với các trường: Kế hoạch chăm sóc, Diễn biến/Chẩn đoán điều dưỡng, Chỉ số sinh tồn (Huyết áp, Mạch, Nhiệt độ, SpO2), Can thiệp điều dưỡng, Đánh giá kết quả.
  - Gửi dữ liệu qua `POST /api/inpatient/{admissionId}/nursing-cares`.
  - Hiển thị danh sách lịch sử chăm sóc từ `GET /api/inpatient/{admissionId}/nursing-cares`.
- **Bước 3.4:** Cấu hình route alias `/nurse/inpatient` trong `AppRoutes.jsx`.

### Giai đoạn 4: Tối ưu Giao diện, Trải nghiệm & Khả năng Truy cập (A11y/UX)
- **Bước 4.1:** Bổ sung kiểu dáng `focus-visible` tương phản cao cho các nút hành động chính.
- **Bước 4.2:** Thêm giới hạn chiều cao `maxHeight: '90vh'` và thanh cuộn dọc cho các dialog trên màn hình độ phân giải thấp / máy POS quầy.
- **Bước 4.3:** Rà soát các thông báo phản hồi (Feedback/Alert) theo từng thao tác cụ thể.

---

## 4. Kế Hoạch Xác Minh & Kiểm Thử (Verification Checklist)

| Mã kiểm thử | Nghiệp vụ kiểm tra | Kỳ vọng đạt được |
| :--- | :--- | :--- |
| **TC-NURSE-01** | Tra cứu bệnh nhân với từ khóa chung | Hiển thị danh sách ứng viên, **không** tự chọn người đầu tiên. Điều dưỡng click chọn người nào thì thông tin người đó mới được nạp. |
| **TC-NURSE-02** | Khởi tạo form tiếp nhận mới | Không còn ngày sinh giả `1990-01-01` hay khoa mặc định `1`. Form bắt buộc chọn chuyên khoa. |
| **TC-NURSE-03** | Hiển thị viện phí | Không xuất hiện giá mặc định `150.000 đ`. Hiển thị giá thực hoặc "0 đ / Chưa xác định biểu phí". |
| **TC-NURSE-04** | Thanh toán VietQR qua PayOS | Khi chưa thanh toán, nút điều phối bị khóa. Khi PayOS báo thành công, nút mới mở khóa. Không gọi API thu tiền mặt giả lập cho VietQR. |
| **TC-NURSE-05** | Thử lại điều phối khi lỗi | Khi thu tiền thành công nhưng điều phối thất bại: cho phép chọn lại buồng khám và bấm thử lại mà không thu tiền trùng lần 2. |
| **TC-NURSE-06** | Phân quyền Điều dưỡng Nội trú | Đăng nhập tài khoản Điều dưỡng: không thấy nút "Xuất viện" hay "Chuyển buồng". |
| **TC-NURSE-07** | Phiếu Chăm Sóc Điều Dưỡng | Điều dưỡng nhập phiếu chăm sóc -> Dữ liệu lưu thành công vào CSDL qua endpoint `/nursing-cares` và hiển thị trong danh sách chăm sóc. |
| **TC-NURSE-08** | Kiểm tra biên dịch dự án | `npm run build` trên `hospital-ui` và `.\mvnw.cmd test-compile -DskipTests` trên `hospital-api` hoàn tất với 0 lỗi (BUILD SUCCESS). |

---

## 5. Quy Tắc Chuyển Pha (Handoff)
- Kế hoạch này được lưu trữ tại `process/general-plans/active/nurse-workflow-and-ui-enhancement_PLAN_02-11-26.md`.
- **Tuyệt đối không chỉnh sửa code cho đến khi người dùng gửi xác nhận:** `"ENTER EXECUTE MODE"`.

