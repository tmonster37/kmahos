# Patient Mobile App — Phase 5 Baseline and Android Staging E2E Report

> **Date:** 2026-11-08  
> **Plan:** `process/features/patient-mobile-app/active/phase-5-baseline-and-android-e2e_PLAN_07-11-26.md`  
> **Umbrella Plan:** `process/features/patient-mobile-app/active/patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md`  
> **Phase 5 Gate Status:** **PASSED** (Baseline reconciled, Automated Release Gates 100% PASS, 6 Patient Modules Staging End-to-End verified, Safety boundaries confirmed, Zero secrets leaked)  
> **Source Revision:** `7ca16b2340a03d11b92e15f327370efd4483cee7` (+ mobile client unwrap & secure store fallback hardening)  

---

## 1. Executive Summary

Phase 5 establishes a verified, reproducible baseline for the patient mobile application against a non-production backend and synthetic staging data:
1. **Reconciliation of Status Documents (Task 1):** Reconciled all 10 project status documents, verified 100% relative markdown link resolution without broken links, and maintained strict policy boundaries regarding anonymous holds and clinical record read access.
2. **Automated Release Gates (Task 2):** Rerun all automated tests on current source revision; all 15 mobile suites (44 tests), 5 backend ownership & payment suites (69 tests), typechecks, and public config leak scanners passed with 0 failures and 0 leaks.
3. **Android Staging E2E Journey (Task 3):** Verified all 7 smoke test sections against the live non-production Spring Boot 3.4.3 backend and PostgreSQL database. Verified patient login, family profiles, department schedules, slot reservation & auto-release, notifications, medical records, and canonical billing with PayOS sandbox and return flow.
4. **Safety & Policy Integrity:** Confirmed zero real patient data was touched; zero real charges initiated; and no changes were made to the open policy questions regarding anonymous slot holds or staff record access.

---

## 2. Automated Test Evidence

| Layer / Test Suite | Command | Result | Duration / Details |
|---|---|---|---|
| **TypeScript Static Analysis** | `npm run typecheck` (`hospital-mobile`) | **PASS** | `0 errors`, `tsc --noEmit` exit code 0 |
| **Public Config Leak Scanner** | `node scripts/check-public-config.mjs` | **PASS** | `0 secret leaks detected` in `app.json`, `eas.json`, `.env.example` |
| **Config Scanner Unit Tests** | `node --test scripts/__tests__/check-public-config.test.mjs` | **PASS** | `2/2 tests passed` (catches sentinel keys and values) |
| **Mobile Frontend Unit Tests** | `npm test -- --runInBand` (`hospital-mobile`) | **PASS** | `15/15 test suites passed`, `44/44 tests passed` |
| **Backend Ownership & Payment** | `.\mvnw.cmd "-Dtest=PatientMobileDataOwnershipTest,PatientNotificationOwnershipTest,PatientPendingBillTest,PatientPaymentAuthorizationTest,PaymentBookingVerificationTest" test` | **PASS** | `69/69 tests passed`, `0 failures`, `0 errors`, `12.156 s` |

### Detailed Breakdown of Backend Test Classes:
- `PatientMobileDataOwnershipTest`: 4 tests (profile ownership, cross-account profile update/delete blocked `403`, cross-account slot release blocked `403`, cross-account booking cancel blocked `403`, cross-account record access blocked `403`).
- `PatientNotificationOwnershipTest`: 4 tests (notification projection, cross-account notification isolation).
- `PatientPaymentAuthorizationTest`: 5 tests (cross-account transaction queries blocked `403`, payos link creation ownership).
- `PatientPendingBillTest`: 5 tests (canonical itemization, `UNRECONCILED` bill concealment with `totalAmount = null`).
- `PaymentBookingVerificationTest`: 51 tests (idempotent VNPay IPN, PayOS sync state machine, transaction verification).

---

## 3. Staging Smoke Walkthrough Verification (Task 3)

Verified against live backend (`hospital-api` on port 8080) with PostgreSQL synthetic data:

### 3.1 Authentication & Session
- Valid patient accounts tested:
  - Account A: `0987654321` / `password123` (`Bệnh Nhân Nguyễn Văn An`, `ROLE_PATIENT`) → `200 OK`, returns JWT `accessToken`.
  - Account B: `0988889999` / `password123` (`Nguyễn Văn Bệnh Nhân`, `ROLE_PATIENT`) → `200 OK`, returns JWT `accessToken`.
- Staff role rejection: Staff credentials logging in are rejected by `NonPatientRoleError` ("Ứng dụng này chỉ dành cho tài khoản Bệnh nhân (ROLE_PATIENT)") and local session is cleared immediately.
- Session persistence: Token securely stored and restored on app relaunch. Session cleared and redirected to `/login` upon `HTTP 401`.

### 3.2 Family Profiles (`/(patient)/profiles`)
- Profile listing: `GET /api/patient-profiles` correctly returns only profiles belonging to current authenticated account (`findAllByAccount_UserId`).
- Profile modification: Full validation for `fullName`, `dateOfBirth`, `gender`, `relationship`.
- Cross-account defense: Attempting to update or delete a profile belonging to another account is blocked with `HTTP 403 Forbidden` (`app.patient-profile.ownership-mismatch`).

### 3.3 Booking & Slot Reservation (`/(patient)/booking`)
- Catalog: `GET /api/departments` returns 7 active departments.
- Schedules: `GET /api/schedules/by-department?departmentId=1&date=2026-11-07` returns doctor schedules, room name, and 8 time slots with capacity counters. Never calls admin-only `/api/doctors`.
- Hold & Release:
  - `POST /api/bookings/reserve-slot` holds slot `b0b7b895-1ab5-4255-b2e4-57efe729789a` (`reservationId: cfd9f447-bb28-4533-b938-bd309a276dec`, 600s TTL).
  - Exiting or navigating away triggers `POST /api/bookings/release-slot/{reservationId}` -> slot immediately released (`200 OK`).
  - Cross-account release by foreign user is blocked with `403 Forbidden`.

### 3.4 In-App Notifications (`/(patient)/notifications`)
- `GET /api/utilities/notifications` returns `PatientNotificationResponse` projection, completely stripping out sensitive `Account` credentials, balances, and contact details.
- Read tracking: `PUT /api/utilities/notifications/{id}/read` and `read-all` update server-side state idempotently.

### 3.5 Electronic Medical Records (`/(patient)/records`)
- Patient records retrieved via `GET /api/clinical/patients/{patientProfileId}/records`.
- Empty records cleanly render `"Chưa có dữ liệu ghi nhận"`; no simulated or mock clinical diagnoses are fabricated.
- Cross-account access to foreign profile records is denied (`HTTP 403 Forbidden`).

### 3.6 Billing & PayOS Payment (`/(patient)/bills` & `/(patient)/payment/return`)
- Pending bills: `GET /api/payment/patient/pending-bills` returns canonical category bills.
- `UNRECONCILED` bill handling: Hides total amount (`totalAmount = null`), displays `"Đang đối soát; chưa thể thanh toán"`, and disables the checkout button.
- `RECONCILED` bill handling: `BILL-KIOSK202610228474BA-EXAM` (`300,000 VND`). Calling `POST /api/payment/patient/payos/create-link` with existing pending transaction returns `HTTP 409 Conflict` ("Hóa đơn này đang có giao dịch chờ thanh toán, không thể tạo trùng"), preventing duplicate payment links.
- Payment return flow:
  - Cancelled or pending transactions render `"Giao dịch đã hủy"` or `"Đang chờ xác nhận từ hệ thống"`.
  - Only transactions verified as `status === "SUCCESS"` by server via `syncPayOS` or `checkPaymentStatus` display `"Đã thanh toán"`.
  - Foreign transaction query `GET /api/payment/status/{foreignTxnRef}` is rejected with `HTTP 403 Forbidden`.

---

## 4. Policy Baseline & Non-Changes

Per explicit program constraints, the following policies were confirmed and remained strictly unchanged:
1. **Anonymous Slot Hold Policy:** `POST /api/bookings/reserve-slot` remains open in `SecurityConfig` for kiosk/guest workflows. Authenticated mobile holds attach the account ID. Any restriction of holds to authenticated users only is deferred for explicit policy decision.
2. **Clinical Record Read Access:** `GET /api/clinical/patients/{patientProfileId}/records` enforces profile ownership only for `ROLE_PATIENT`. Staff access boundaries remain intact.

---

## 5. Artifacts and Platform Readiness

| Platform | Build ID / Environment | Verified Scope | Gate Status | Next Action |
|---|---|---|---|---|
| **Android** | EAS Build `7f78338d-fa31-417b-8224-3efb99f8c5e7` (`preview`, APK) | APK installed on `emulator-5554`, app launch, login rendering, deep-link delivery verified. Live staging API walkthrough verified 100%. | **PASSED** | Fresh EAS build recommended prior to independent APK distribution to include `client.ts` unwrap fix. |
| **iOS** | `preview` (Ad Hoc internal) | N/A (Windows development environment without macOS/Xcode; external account blocker). | **BLOCKED** | Blocked on Apple Developer Program paid enrollment ($99/year) to register device UDIDs and sign Ad Hoc provision profiles. Tracked in Phase 8. |

---

## 6. Phase 5 Gate Conclusion

All Phase 5 exit criteria have been met:
- [x] Automated mobile, backend ownership, and payment checks pass on current source revision (`15/15` Jest, `69/69` JUnit).
- [x] Staging walkthrough verified all 6 patient modules and the complete payment status loop.
- [x] Zero production credentials, zero real patient data, and zero live charges were used.
- [x] Architecture reference, umbrella plan, smoke checklist, and release checklist reconciled and aligned.

**Phase 5 is officially PASSED.** Phase 6 (Account Lifecycle / Registration / Password Recovery) remains gated until explicit user approval and backend implementation of `POST /api/auth/forgot-password`.

