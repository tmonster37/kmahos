# ALL-CONTEXT.md — TỔNG QUAN VÀ ĐỊNH TUYẾN NGỮ CẢNH HỆ THỐNG BỆNH VIỆN

> **Tài liệu tham chiếu gốc (Root Context Router):** Tuân thủ `AGENTS.md` và RIPER-5.  
> **Cập nhật lần cuối:** 07/11/2026

---

## 1. CÔNG NGHỆ & KIẾN TRÚC TỔNG THỂ (STACK & ARCHITECTURE)

### Backend (`hospital-api`)
- **Ngôn ngữ & Framework:** Java 21 LTS, Spring Boot 3.4.3.
- **Bảo mật:** Spring Security 6, JWT (JSON Web Token), Cookie HttpOnly, CORS linh hoạt (localhost + production domains).
- **Cơ sở dữ liệu:** PostgreSQL (Flyway / Versioned SQL migration `V1__baseline_and_schema_hardening.sql` quản lý lịch sử schema).
- **Tích hợp thanh toán:** PayOS Open Banking (Dynamic QR, Webhook, Sync), VNPay (URL, Return, IPN), VietQR Napas 247.
- **Tích hợp Y tế:** HL7 FHIR R4 Export, OpenMRS / EHR Concept Dictionary, Modality Worklist (RIS/PACS/LIS Gateway), Thông tư 46/2018/TT-BYT (Phụ lục bệnh án EMR Addendum).

### Frontend (`hospital-ui`)
- **Ngôn ngữ & Bundler:** React 18.3, Vite 6.1, React Router v7.
- **UI Framework & Design System:** Material UI (MUI v6.4), Emotion, Lucide/MUI Icons, Apple HIG & Swiss Style Aesthetics.
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

## Chương trình tính năng đang được xem xét

| Tên | Trạng thái | Tài liệu |
| :--- | :--- | :--- |
| **whole-system-ui-refresh** | Thiết kế đã duyệt; chương trình 6 pha theo luồng công việc. Chỉ Phase 1 được chọn làm bước kế tiếp; chưa có quyền EXECUTE. Phase 2–6 ở backlog, phụ thuộc nghiệm thu pha trước và lịch phát hành mobile. | - Kế hoạch Mẹ: [`whole-system-ui-refresh_UMBRELLA_PLAN_08-11-26.md`](../features/whole-system-ui-refresh/active/whole-system-ui-refresh_UMBRELLA_PLAN_08-11-26.md)<br>- Phase 1 được chọn: [`phase-1-patient-web-booking_PLAN_08-11-26.md`](../features/whole-system-ui-refresh/active/phase-1-patient-web-booking_PLAN_08-11-26.md)<br>- Thiết kế: [`2026-11-08-whole-system-ui-refresh-design.md`](../../docs/superpowers/specs/2026-11-08-whole-system-ui-refresh-design.md) |
| **patient-mobile-app** | Phase 0–7 PASSED & Brand Parity PASSED (Phase 7 Push Notifications PASSED; Phase 6 Account Lifecycle PASSED; Phase 5 Android Staging E2E PASSED 100%; Brand Parity Web/Mobile PASSED; iOS ghi nhận BLOCKED do thiếu Apple Developer trả phí) | - Thiết kế: [`2026-11-07-patient-mobile-app-design.md`](../../docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md)<br>- Kế hoạch Mẹ: [`patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md`](../features/patient-mobile-app/active/patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md)<br>- Phase 0: [`phase-0-api-readiness_PLAN_07-11-26.md`](../features/patient-mobile-app/completed/phase-0-api-readiness_PLAN_07-11-26.md) & [`mobile-api-readiness-report_07-11-26.md`](../features/patient-mobile-app/reports/mobile-api-readiness-report_07-11-26.md)<br>- Phase 1: [`phase-1-app-foundation_PLAN_07-11-26.md`](../features/patient-mobile-app/completed/phase-1-app-foundation_PLAN_07-11-26.md) & [`phase-1-app-foundation-report_07-11-26.md`](../features/patient-mobile-app/reports/phase-1-app-foundation-report_07-11-26.md)<br>- Phase 2: [`phase-2-profiles-and-booking_PLAN_07-11-26.md`](../features/patient-mobile-app/completed/phase-2-profiles-and-booking_PLAN_07-11-26.md) & [`phase-2-profiles-and-booking-report_07-11-26.md`](../features/patient-mobile-app/reports/phase-2-profiles-and-booking-report_07-11-26.md)<br>- Phase 3: [`phase-3-records-and-payments_PLAN_07-11-26.md`](../features/patient-mobile-app/completed/phase-3-records-and-payments_PLAN_07-11-26.md) & [`phase-3-records-and-payments-report_07-11-26.md`](../features/patient-mobile-app/reports/phase-3-records-and-payments-report_07-11-26.md)<br>- Phase 4: [`phase-4-release-readiness_PLAN_07-11-26.md`](../features/patient-mobile-app/completed/phase-4-release-readiness_PLAN_07-11-26.md) & [`phase-4-release-readiness-report_07-11-26.md`](../features/patient-mobile-app/reports/phase-4-release-readiness-report_07-11-26.md)<br>- Phase 5: [`phase-5-baseline-and-android-e2e_PLAN_07-11-26.md`](../features/patient-mobile-app/active/phase-5-baseline-and-android-e2e_PLAN_07-11-26.md) & [`phase-5-baseline-and-android-e2e-report_07-11-26.md`](../features/patient-mobile-app/reports/phase-5-baseline-and-android-e2e-report_07-11-26.md)<br>- Phase 6: [`phase-6-auth-lifecycle_PLAN_07-11-26.md`](../features/patient-mobile-app/active/phase-6-auth-lifecycle_PLAN_07-11-26.md) & [`phase-6-auth-lifecycle-report_08-11-26.md`](../features/patient-mobile-app/reports/phase-6-auth-lifecycle-report_08-11-26.md)<br>- Phase 7: [`phase-7-push-notifications_PLAN_07-11-26.md`](../features/patient-mobile-app/active/phase-7-push-notifications_PLAN_07-11-26.md) & [`phase-7-push-notifications-report_08-11-26.md`](../features/patient-mobile-app/reports/phase-7-push-notifications-report_08-11-26.md)<br>- Brand Parity: [`patient-mobile-web-brand-parity_PLAN_08-11-26.md`](../features/patient-mobile-app/active/patient-mobile-web-brand-parity_PLAN_08-11-26.md) & [`patient-mobile-web-brand-parity-report_08-11-26.md`](../features/patient-mobile-app/reports/patient-mobile-web-brand-parity-report_08-11-26.md)<br>- Backlog: [`push-notifications.md`](../features/patient-mobile-app/backlog/push-notifications.md) |
| **production-safety-hardening** | Đã hoàn tất cả 3 giai đoạn (Phase 1, Phase 2, Phase 3 PASSED 100%) | - Thiết kế: [`production-safety-hardening_DESIGN_06-11-26.md`](../features/production-safety-hardening/completed/production-safety-hardening_DESIGN_06-11-26.md)<br>- Kế hoạch Mẹ: [`production-safety-hardening_UMBRELLA_PLAN_07-11-26.md`](../features/production-safety-hardening/completed/production-safety-hardening_UMBRELLA_PLAN_07-11-26.md)<br>- Phase 1: [`phase-1-clinical-and-inventory-safety_PLAN_07-11-26.md`](../features/production-safety-hardening/completed/phase-1-clinical-and-inventory-safety_PLAN_07-11-26.md) & [`phase-1-verification-report_07-11-26.md`](../features/production-safety-hardening/reports/phase-1-verification-report_07-11-26.md)<br>- Phase 2: [`phase-2-credentials-and-schema-integrity_PLAN_07-11-26.md`](../features/production-safety-hardening/completed/phase-2-credentials-and-schema-integrity_PLAN_07-11-26.md) & [`phase-2-verification-report_07-11-26.md`](../features/production-safety-hardening/reports/phase-2-verification-report_07-11-26.md)<br>- Phase 3: [`phase-3-api-auth-and-process-hardening_PLAN_07-11-26.md`](../features/production-safety-hardening/completed/phase-3-api-auth-and-process-hardening_PLAN_07-11-26.md) & [`phase-3-verification-report_07-11-26.md`](../features/production-safety-hardening/reports/phase-3-verification-report_07-11-26.md) |


Ghi chú Phase 6: Đã giải quyết backend gap với `POST /api/auth/forgot-password`, xây dựng màn hình Đăng ký, Nhập OTP và Khôi phục mật khẩu; tự động hóa 100% PASS (60 Jest tests, 82 JUnit tests). iOS internal build đang BLOCKED (chờ Apple Developer trả phí).

Kế hoạch tiếp nối Patient Mobile (Phase 7–9): [Umbrella plan](../features/patient-mobile-app/active/patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md).

Kế hoạch đồng bộ giao diện thương hiệu web/mobile: [Patient mobile web brand parity](../features/patient-mobile-app/active/patient-mobile-web-brand-parity_PLAN_08-11-26.md) & [Báo cáo hoàn tất](../features/patient-mobile-app/reports/patient-mobile-web-brand-parity-report_08-11-26.md). Workstream giao diện độc lập đã hoàn tất (PASSED 08/11/2026), 100% tokenized, 0 hex leaks, test web/mobile pass 100%.

Kiến trúc chi tiết của app bệnh nhân: [`architecture.md`](../features/patient-mobile-app/references/architecture.md).
