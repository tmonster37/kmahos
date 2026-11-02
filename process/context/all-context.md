# ALL-CONTEXT.md — TỔNG QUAN VÀ ĐỊNH TUYẾN NGỮ CẢNH HỆ THỐNG BỆNH VIỆN

> **Tài liệu tham chiếu gốc (Root Context Router):** Tuân thủ `AGENTS.md` và RIPER-5.  
> **Cập nhật lần cuối:** 02/11/2026

---

## 1. CÔNG NGHỆ & KIẾN TRÚC TỔNG THỂ (STACK & ARCHITECTURE)

### Backend (`hospital-api`)
- **Ngôn ngữ & Framework:** Java 21 LTS, Spring Boot 3.3.4.
- **Bảo mật:** Spring Security 6, JWT (JSON Web Token), Cookie HttpOnly, CORS linh hoạt (localhost + production domains).
- **Cơ sở dữ liệu:** PostgreSQL (Flyway migration quản lý lịch sử schema).
- **Tích hợp thanh toán:** PayOS Open Banking (Dynamic QR, Webhook, Sync), VNPay (URL, Return, IPN), VietQR Napas 247.
- **Tích hợp Y tế:** HL7 FHIR R4 Export, OpenMRS / EHR Concept Dictionary, Modality Worklist (RIS/PACS/LIS Gateway), Thông tư 46/2018/TT-BYT (Phụ lục bệnh án EMR Addendum).

### Frontend (`hospital-ui`)
- **Ngôn ngữ & Bundler:** React 18, Vite 5.
- **UI Framework & Design System:** Material UI (MUI v5), Emotion, Lucide/MUI Icons, Apple HIG & Swiss Style Aesthetics.
- **Giao tiếp API:** Axios client tập trung (`AxiosInstance.js`) với interceptor tự động mở bọc dữ liệu `response.data`, đính kèm Bearer token, timeout 75s chống Cold Start và xử lý lỗi tiếng Việt.
- **Phân quyền Route:** `ProtectedRoute` kết hợp `AuthContext` và kiểm tra mảng `allowedRoles`.

---

## 2. BẢN ĐỒ ĐỊNH TUYẾN NGỮ CẢNH (CONTEXT ROUTING TABLE)

| Ngữ cảnh / Lĩnh vực | File tham chiếu chi tiết | Nội dung chính |
| :--- | :--- | :--- |
| **API & Hợp đồng kết nối** | [`api-contracts.md`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/process/context/api-contracts.md) | Ma trận 163 API routes, DTO request/response, quy chuẩn bọc `ApiResponse<T>` |
| **Quy chuẩn kiểm thử** | `process/context/tests/all-tests.md` | Hướng dẫn chạy unit, integration, smoke test |
| **Quy trình tiếp đón & hàng đợi** | `process/general-plans/completed/nurse-workflow-and-ui-enhancement_PLAN_02-11-26.md` | Tiếp đón quầy, Kiosk lấy số, điều phối buồng khám |
| **Thanh toán ví & viện phí** | `process/general-plans/completed/wallet-booking-payment-hardening_PLAN_02-11-26.md` | Thanh toán ví viện phí, PayOS, VNPay, đối soát thu ngân |
| **Quy trình lâm sàng & nội trú** | `process/general-plans/completed/clinical-workflows-and-inpatient-hardening_PLAN_02-11-26.md` | Khám bác sĩ, cận lâm sàng, y lệnh nội trú, phiếu chăm sóc |
| **Phân quyền & Quản trị hệ thống** | `process/general-plans/completed/admin-governance-and-rbac-hardening_PLAN_02-11-26.md` | Quản trị tài khoản, khoa phòng, bác sĩ, lịch trực, dược |

---

## 3. QUY ƯỚC LẬP TRÌNH & HỢP ĐỒNG GIAO TIẾP (PATTERNS & CONVENTIONS)

1. **ApiResponse Pattern:**
   - Phía Backend trả về: `ApiResponse<T>` gồm `{ code: 200, message: "...", data: T }`.
   - Phía Frontend `AxiosInstance.js` trả về trực tiếp `response.data`.
   - Các Component đọc an toàn: `res?.data?.data || res?.data || res`.

2. **Vai trò người dùng (User Roles):**
   - `ROLE_PATIENT`: Người bệnh (xem hồ sơ, đặt lịch, tra cứu bệnh án, xem hóa đơn).
   - `ROLE_NURSE`: Điều dưỡng (tiếp đón quầy, check-in kiosk, điều phối hàng đợi, phiếu chăm sóc nội trú).
   - `ROLE_DOCTOR`: Bác sĩ (khám bệnh, chỉ định xét nghiệm, chẩn đoán ICD-10, kê đơn thuốc, y lệnh nội trú, xuất viện).
   - `ROLE_HEAD_OF_DEPARTMENT`: Trưởng khoa (quản lý điều hành khoa phòng, xem báo cáo, duyệt thuốc, giám sát buồng bệnh).
   - `ROLE_LAB_TECHNICIAN`: Kỹ thuật viên xét nghiệm (nhận mẫu bệnh phẩm, nhập kết quả, kết nối LIS/PACS).
   - `ROLE_CASHIER`: Thu ngân (thu tiền mặt, tạo link PayOS/VietQR, xuất biên lai viện phí, đối soát).
   - `ROLE_PHARMACIST`: Dược sĩ (quản lý danh mục thuốc, nhập kho theo lô, điều chuyển kho, cấp phát FEFO).
   - `ROLE_ADMIN`: Quản trị viên tối cao (toàn quyền hệ thống).

3. **Cấu hình môi trường (Environment Variables):**
   - Backend: `server.port=8080`, Spring profile `application.properties` (PostgreSQL, PayOS credentials, JWT Secret).
   - Frontend: `VITE_API_BASE_URL` (mặc định `http://localhost:8080`).

