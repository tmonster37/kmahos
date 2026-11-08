# Patient Mobile App Phase 6 — Account Lifecycle Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let a patient create an account and recover access from the mobile app, adding a backend password-recovery contract because the current AuthController has no forgot-password route.

**Architecture:** Keep account creation, OTP verification, password policy, and role assignment on the backend. Reuse verified OTP endpoints, define and test a safe reset contract before implementing its screen, and store a session only after a successful patient-authenticated response.

**Tech Stack:** Expo SDK 58, React Native, TypeScript, Expo Router, Axios, SecureStore, Spring auth endpoints, Jest/Testing Library.

**Spec:** [Patient mobile app design](../../../../docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md), [Phase 0 API readiness report](../reports/mobile-api-readiness-report_07-11-26.md), and [follow-up umbrella](patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md).

## Global Constraints

- Do not accept or send a role from the mobile client; registration must result in ROLE_PATIENT only.
- Do not store or log OTP codes, passwords, tokens, or full authentication responses.
- Do not reveal whether an account exists through forgot-password or OTP error copy unless the verified backend contract explicitly permits it.
- Do not change browser Cookie-Only auth behavior or add refresh-token behavior in this phase.
- Reuse the current auth API/client/session repository. The current AuthController has no `POST /api/auth/forgot-password` mapping; this is a confirmed backend gap, not an existing verified API.

## Review Focus

- Replayed, expired, malformed, or wrong-phone OTPs must not register or reset an account.
- Resend/cooldown and backend rate-limit responses must be actionable without creating an OTP spam loop.
- A non-patient or malformed auth response must never open patient routes or persist a token.
- Double taps and network retries must not create duplicate accounts or clear a valid password-reset result.
- Passwords/OTPs must not appear in error reports, test snapshots, analytics, or navigation parameters.

---

### Task 1: Verify the current auth contract and validation rules

**Files:**
- Read: hospital-api/src/main/java/com/hospital/api/controller/AuthController.java
- Read: hospital-api/src/main/java/com/hospital/api/service/impl/AuthServiceImpl.java
- Read: hospital-api/src/main/java/com/hospital/api/dto/request/
- Read: hospital-mobile/src/features/auth/auth.api.ts
- Read: hospital-mobile/src/features/auth/auth.repository.ts
- Read: process/features/patient-mobile-app/reports/mobile-api-readiness-report_07-11-26.md

- [x] Confirm request/response DTOs for send OTP, verify OTP, registration, and login. Current send-otp returns ApiResponse<OtpResponse>; login sends phoneNumber/password and AuthResponse exposes accessToken.
- [x] Confirm there is no forgot-password controller mapping or service implementation; document this as a Phase 6 backend deliverable.
- [x] Confirm OTP expiry, single-use behavior, resend limits, generic account-existence responses, password rules, and token issuance.
- [x] Define the password-reset request/response contract, OTP purpose binding, expiry/single-use behavior, rate limits, and non-enumerating responses before implementation.
- [x] Confirm current tests cover existing auth contracts; add focused backend contract tests for the missing reset route.
- [x] Record the verified field map and errors in the phase report before screen implementation begins.

### Task 2: Add auth API/repository tests for registration and recovery

**Files:**
- Modify: hospital-mobile/src/features/auth/auth.api.ts
- Modify: hospital-mobile/src/features/auth/auth.repository.ts
- Modify: hospital-mobile/src/features/auth/auth.types.ts
- Create: hospital-mobile/src/features/auth/__tests__/auth-lifecycle.test.ts
- Modify: hospital-api/src/main/java/com/hospital/api/controller/AuthController.java
- Modify: hospital-api/src/main/java/com/hospital/api/service/AuthService.java
- Modify: hospital-api/src/main/java/com/hospital/api/service/impl/AuthServiceImpl.java
- Create or modify: password-reset request DTO under hospital-api/src/main/java/com/hospital/api/dto/request/
- Create or extend: focused auth service/controller tests under hospital-api/src/test/java/com/hospital/api/

- [x] Add backend contract tests for the new reset endpoint, including OTP purpose binding, expiry/replay rejection, rate limits, generic responses, and password update behavior.
- [x] Add mobile tests for OTP send/verify mapping, verified-OTP registration, patient-only role acceptance, password reset, server rate limits, expired/wrong OTP, and generic recovery errors.
- [x] Run the focused auth tests and confirm the new cases fail before adding the wrappers.
- [x] Implement the backend forgot-password contract from Task 1, reusing existing OTP verification safely; do not accept client-supplied role, token, or account ID.
- [x] Implement typed mobile wrappers using only fields verified in Task 1.
- [x] Verify registration stores a returned session only after role and token checks; password reset does not persist OTP or password locally.
- [x] Run focused auth tests and npm run typecheck from hospital-mobile/.

### Task 3: Add registration and OTP verification screens

**Files:**
- Create: hospital-mobile/src/app/(auth)/register.tsx
- Create: hospital-mobile/src/app/(auth)/verify-otp.tsx
- Modify: hospital-mobile/src/app/(auth)/login.tsx
- Create: hospital-mobile/src/features/auth/__tests__/registration-screens.test.tsx

- [x] Add a registration form for the current backend fields: phoneNumber, password, fullName, and email. Do not send gender/dateOfBirth unless the backend contract is deliberately changed.
- [x] Implement the verified OTP sequence; pass phone number or one-time flow state through in-memory route state, never through logs or persistent storage.
- [x] Add clear validation, loading, resend cooldown, rate-limit, expiry, retry, and success states.
- [x] Add a login-screen entry point to registration without exposing staff roles or administrative links.
- [x] Test successful patient registration, invalid/expired OTP, rate limiting, duplicate submission, network retry, and navigation after successful patient session creation.
- [x] Run focused screen tests and typecheck.

### Task 4: Add password recovery

**Files:**
- Create: hospital-mobile/src/app/(auth)/forgot-password.tsx
- Create: hospital-mobile/src/features/auth/__tests__/password-recovery-screen.test.tsx
- Modify: hospital-mobile/src/app/(auth)/login.tsx

- [x] Add a recovery form using the verified phone/OTP/new-password request shape.
- [x] Keep account-existence responses generic and show server validation/rate-limit errors without echoing OTP or password.
- [x] Test successful reset, wrong/expired OTP, validation failures, server throttling, network retry, and return to login.
- [x] Run all mobile tests and typecheck; run focused backend auth tests if the contract changed.

## Phase 6 Gate

- [x] Registration succeeds only after server OTP verification and results in ROLE_PATIENT.
- [x] Password recovery follows server OTP and password rules without leaking account existence or secrets.
- [x] Non-patient, invalid, expired, replayed, and rate-limited cases remain safe and recoverable.
- [x] Existing login, session restore, SecureStore, 401, and logout tests continue to pass.
