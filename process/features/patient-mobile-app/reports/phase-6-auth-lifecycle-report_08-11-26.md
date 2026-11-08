# Patient Mobile App Phase 6 — Account Lifecycle Report

**Date:** 08/11/2026  
**Status:** PASSED  
**Scope:** Mobile Patient Account Lifecycle (Registration, Verification OTP, and Password Recovery)  
**Spec Reference:** `process/features/patient-mobile-app/active/phase-6-auth-lifecycle_PLAN_07-11-26.md`  

---

## 1. Executive Summary

Phase 6 of the `patient-mobile-app` program addressed the account lifecycle for patients, closing the previously identified backend gap where `AuthController` had no password recovery endpoint, and creating client interfaces for registration, OTP verification, and account recovery.

All tasks 1–4 have been implemented and rigorously tested with 100% automated passing gates across both the Spring Boot backend (`hospital-api`) and React Native Expo client (`hospital-mobile`).

---

## 2. Key Deliverables & Implementation Details

### A. Backend Gap Closure (`hospital-api`)
1. **Request DTOs:**
   - `ForgotPasswordRequest`: Validates `phoneNumber`, `email`, 6-digit regex `otpCode` (`^[0-9]{6}$`), and `newPassword` ($\ge 6$ characters).
   - `SendOtpRequest`: Enhanced to support optional `phoneNumber` lookup without leaking account existence.
2. **Core Service & Security:**
   - `AuthService.forgotPassword(...)`: Verifies OTP using `OtpService` under `OtpPurpose.ACCOUNT_RECOVERY`. Protects against user enumeration by returning generic error messages if the account does not exist or lacks an email address. Encodes new password via `BCryptPasswordEncoder`.
   - `OtpServiceImpl`: Autowired `AccountRepository` with backward-compatible constructor for testing.
   - `AuthController.java`: Added `@PostMapping("/forgot-password")` returning standard `ApiResponse<Void>`.
   - Verified that `/api/auth/**` is already `permitAll()` in `SecurityConfig.java`.

### B. Mobile App Client Lifecycle (`hospital-mobile`)
1. **API & Repository:**
   - `src/features/auth/auth.api.ts`: Typed wrappers for `sendOtp`, `verifyOtp`, `register`, `forgotPassword`.
   - `src/features/auth/auth.repository.ts`:
     - `register()` enforces `ROLE_PATIENT`, writes `accessToken` to `sessionStorage`, and rejects non-patient roles (`NonPatientRoleError`).
     - `forgotPassword()` submits reset request without persisting passwords or OTP tokens locally.
     - `authFlowStore`: In-memory volatile store holding pending registration data during OTP verification; never written to persistent disk or exposed in route URL parameters.
2. **Screen Implementations:**
   - `src/app/(auth)/register.tsx`: Validates `fullName`, `phoneNumber` (10-digit VN format), optional `email`, and `password`. Supports direct registration or OTP flow.
   - `src/app/(auth)/verify-otp.tsx`: 6-digit numeric input, 60-second cooldown resend timer, handles rate-limit throttling (HTTP 429), and automatically finishes registration or password reset.
   - `src/app/(auth)/forgot-password.tsx`: Two-step recovery flow (Request OTP via phone/email $\to$ Enter OTP and set new password) with generic success messaging.
   - `src/app/(auth)/login.tsx`: Added navigation links to "Quên mật khẩu?" and "Đăng ký ngay".

---

## 3. Verification & Automated Test Evidence

### Backend Tests (`hospital-api`)
- Command: `.\mvnw.cmd "-Dtest=AuthForgotPasswordTest,OtpServiceImplTest,PatientMobileDataOwnershipTest,PatientNotificationOwnershipTest,PatientPendingBillTest,PatientPaymentAuthorizationTest,PaymentBookingVerificationTest" test`
- **Result:** **PASS (82/82 tests passed, 0 failures, 0 errors, 17.131 s)**
  - `AuthForgotPasswordTest`: 4/4 passed (valid reset returns 200, invalid OTP length returns 400, short password returns 400, logic test verifies BCrypt update and non-enumeration).
  - `OtpServiceImplTest`: 9/9 passed (SMTP failure handling, lockout after 5 attempts, cooldown, hourly recipient/IP limits).
  - Data ownership & payment authorization regression: 69/69 passed.

### Mobile Tests (`hospital-mobile`)
- Command: `npm test -- --runInBand`
- **Result:** **PASS (18/18 test suites passed, 60/60 tests passed, 11.877 s)**
  - `auth-lifecycle.test.ts`: 7/7 passed.
  - `registration-screens.test.tsx`: 5/5 passed.
  - `password-recovery-screen.test.tsx`: 4/4 passed.
  - `auth.repository.test.ts` & `login-screen.test.tsx`: All passed with new API signatures.
- Static Typecheck: `npm run typecheck` $\to$ **PASS (0 errors)**.
- Security Audit: `node scripts/check-public-config.mjs` $\to$ **PASS (0 secret leaks)**.

---

## 4. Phase 6 Gate Verification

| Gate Requirement | Status | Verification Evidence |
|---|---|---|
| Registration succeeds only after server OTP verification and results in `ROLE_PATIENT` | **PASSED** | Verified in `registration-screens.test.tsx` and `auth-lifecycle.test.ts`. Non-patient accounts rejected. |
| Password recovery follows server OTP and password rules without leaking account existence or secrets | **PASSED** | Verified in `AuthForgotPasswordTest` and `password-recovery-screen.test.tsx`. Generic error copy enforced. |
| Non-patient, invalid, expired, replayed, and rate-limited cases remain safe and recoverable | **PASSED** | Verified in `OtpServiceImplTest` (lockout after 5 failures, 60s cooldown, hourly limit) and client UI states. |

---

## 5. Next Steps
- Phase 6 is complete.
- Subsequent phases remain strictly gated and will only proceed upon explicit user instruction:
  - **Phase 7:** Push notifications (FCM / APNs token management).
  - **Phase 8:** iOS internal build (blocked awaiting Apple Developer Program account).
  - **Phase 9:** App store preparation and release submission.

