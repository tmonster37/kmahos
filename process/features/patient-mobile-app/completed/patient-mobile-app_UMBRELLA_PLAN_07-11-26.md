# Patient Mobile App Implementation Program Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each phase plan task-by-task. Each phase also requires its own research, execution approval, implementation, validation, and durable report gate.

**Goal:** Deliver a patient-facing Android and iOS app that uses the existing hospital backend for profiles, appointments, medical history, bills, online payment, and in-app notifications.

**Architecture:** Create a separate Expo/TypeScript app in `hospital-mobile/`, taking patient-flow and layout ideas from `TheDuckHospitalReactNative` without copying its code, routes, token storage, or admin surfaces. Keep backend changes limited to patient-safe API contracts required by the app; preserve the existing browser Cookie-Only auth behavior.

**Tech Stack:** React Native, Expo, TypeScript, Expo Router, Axios, Expo SecureStore, Spring Boot 3.4.3 APIs, PayOS/VietQR.

**Spec:** `docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md`

## Global Constraints

- New app files live under `hospital-mobile/`; feature plans/reports live under `process/features/patient-mobile-app/`.
- Support Android and iOS; use secure OS storage for native access tokens, with re-login after 401/expiry; no refresh-token endpoint is added in MVP.
- Never use mock clinical data, hard-coded fees, or public lookup routes as substitutes for patient-authenticated data.
- Only use `ROLE_PATIENT` flows; never call `/api/doctors` or administrative routes for patient booking.
- Do not change the existing web Cookie-Only implementation or unrelated dirty files.
- Patient payment requests identify a canonical server-owned booking/category bill; Phase 0 must verify stable identity, balance allocation, ownership, and server-derived amount before checkout. If that sub-gate remains blocked, Phase 3 checkout stays blocked.
- Legacy successful transactions without a source-backed category marker stay `UNRECONCILED`; their amounts are never redistributed to bill categories, affected bills expose no payable amount, and checkout remains blocked until source-backed reconciliation or authorized accounting confirmation.
- Online payment must return to the app and confirm status through the backend; provider redirect data alone is not proof of success.
- Do not cache clinical data offline or log patient data, credentials, or access tokens.

## Review Focus

- Cross-account profile, booking, record, or bill IDs must return no data; Phase 0 owns patient ownership tests.
- A 24-hour/expired access token must clear the local session and require re-authentication; Phase 1 owns auth-session tests.
- Duplicate or concurrent slot booking must not create duplicate bookings; Phase 2 owns reservation/booking tests.
- Payment amount, bill category, booking code, and account must agree server-side; Phase 0 and Phase 3 own payment tests.
- Cancelled, pending, failed, or delayed provider redirects must never display a paid state; Phase 3 owns payment-return/status tests.
- Notification inbox data and read actions must remain scoped to the signed-in account; Phase 0 verifies backend ownership and Phase 2 verifies the app inbox.

---

## Chương trình theo pha

| Pha | Kế hoạch | Kết quả | Cổng chuyển pha |
|---|---|---|---|
| 0. API readiness | [`phase-0-api-readiness_PLAN_07-11-26.md`](phase-0-api-readiness_PLAN_07-11-26.md) | Ma trận API bệnh nhân, xác minh quyền thông báo/giá/thanh toán, xử lý blocker backend tối thiểu. | Quyền truy cập bệnh nhân và thông báo được xác minh; checkout chỉ mở khi bill ID/số dư/phân bổ phí/ownership được chứng minh. |
| 1. App foundation | [`phase-1-app-foundation_PLAN_07-11-26.md`](phase-1-app-foundation_PLAN_07-11-26.md) | Expo app, API client, SecureStore, auth flow, navigation và nền UI. | Đăng nhập ROLE_PATIENT và khởi động lại app được kiểm chứng trên môi trường dev. |
| 2. Profiles and booking | [`phase-2-profiles-and-booking_PLAN_07-11-26.md`](phase-2-profiles-and-booking_PLAN_07-11-26.md) | Hồ sơ gia đình, tìm lịch, giữ slot, đặt/hủy lịch, theo dõi lượt khám và hộp thư thông báo trong app. | Quyền hồ sơ, booking, thông báo; giữ slot, số thứ tự, trạng thái và đánh dấu đã đọc được kiểm chứng. |
| 3. Records and payments | [`phase-3-records-and-payments_PLAN_07-11-26.md`](phase-3-records-and-payments_PLAN_07-11-26.md) | Lịch sử bệnh án, kết quả/đơn thuốc, viện phí, PayOS/VietQR, trở lại app và xác minh. | Không lộ hồ sơ chéo tài khoản; thanh toán chỉ thành công theo trạng thái backend. |
| 4. Release readiness | [`phase-4-release-readiness_PLAN_07-11-26.md`](phase-4-release-readiness_PLAN_07-11-26.md) | Build nội bộ Android/iOS, checklist quyền riêng tư/accessibility, hướng dẫn vận hành. | Bản build staging được cài và smoke-check trên hai nền tảng; không phát hành store khi chưa có duyệt riêng. |

## Cách điều hành chương trình

- Feature folder: `process/features/patient-mobile-app/`; reports ở `reports/`, plans ở `active/`.
- Chỉ mở một pha tại một thời điểm. Trước mỗi pha, chạy research subagent trên mã hiện tại; đưa kết quả và file touchpoints cho người dùng duyệt EXECUTE.
- Sau khi pha được thực thi, chạy validator subagent theo đúng file/touchpoints, ghi report vào `reports/`, cập nhật trạng thái plan và `process/context/all-context.md` trước khi đề xuất pha kế tiếp.
- Phase 0 phải phối hợp với trạng thái hiện hành của `production-safety-hardening` Phase 3: web Cookie-Only đã hoàn tất; mobile dùng Bearer token được backend hỗ trợ và lưu SecureStore. Nếu chuẩn hóa billing thất bại, ghi rõ `BLOCKED` và không mở checkout ở Phase 3.
- Giữ nguyên tất cả thay đổi chưa commit khác; các backend touchpoint chỉ được thêm sau khi Phase 0 chứng minh cần thiết.
- Push notification để backlog sau MVP; không đưa credential hay dữ liệu bệnh nhân thật vào Expo config, fixture hoặc CI output.

## Trạng thái hiện tại

- Thiết kế đã được người dùng duyệt ngày 07-11-2026.
- **Phase 0 (`phase-0-api-readiness_PLAN_07-11-26.md`) đã hoàn tất và vượt qua toàn bộ cổng kiểm thử** (báo cáo tại `process/features/patient-mobile-app/reports/mobile-api-readiness-report_07-11-26.md`).
- **Phase 1 (`phase-1-app-foundation_PLAN_07-11-26.md`) đã hoàn tất và vượt qua toàn bộ cổng kiểm thử** (báo cáo tại `process/features/patient-mobile-app/reports/phase-1-app-foundation-report_07-11-26.md`).
- **Phase 2 (`phase-2-profiles-and-booking_PLAN_07-11-26.md`) đã hoàn tất và vượt qua toàn bộ cổng kiểm thử** (báo cáo tại `process/features/patient-mobile-app/reports/phase-2-profiles-and-booking-report_07-11-26.md`).
- **Phase 3 (`phase-3-records-and-payments_PLAN_07-11-26.md`) đã hoàn tất và vượt qua toàn bộ cổng kiểm thử** (báo cáo tại `process/features/patient-mobile-app/reports/phase-3-records-and-payments-report_07-11-26.md`).
- **Phase 4 status snapshot was superseded on 2026-11-08:** Android preview build, APK installation, login-screen rendering, and payment-return deep-link delivery are PASS. Full patient-flow/payment E2E on the installed APK is NOT RUN and is tracked in the Phase 5 follow-up plan. iOS internal distribution remains BLOCKED on the external Apple/device setup described in the latest report. The earlier EAS/project/emulator blocker details above no longer describe the current state.
