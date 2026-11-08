# Patient Mobile App Phase 5 — Baseline and Android Staging E2E Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish the current Android MVP as a reproducible, end-to-end verified baseline and reconcile status documents with source and latest reports.

**Architecture:** Exercise the existing app against a synthetic non-production backend and payment environment. Correct durable status documents from observed evidence; keep any product-code fix limited to a confirmed blocking defect and record it explicitly.

**Tech Stack:** Expo SDK 58, React Native, TypeScript, Jest, Spring Boot/JUnit, Android emulator or test device, EAS preview build.

**Spec:** [Patient mobile app design](../../../../docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md), [Phase 4 report](../reports/phase-4-release-readiness-report_07-11-26.md), and [smoke checklist](../../../../hospital-mobile/scripts/smoke-test-checklist.md).

## Global Constraints

- Use synthetic test accounts and records only; do not make a real payment or use production patient data.
- Do not change unrelated dirty files or add a new E2E framework unless research proves the current emulator walkthrough cannot provide the needed evidence.
- Keep clinical ownership, bill amount, reconciliation, and payment success decisions on the backend.
- A test-only environment URL may be configured locally/EAS, but no secret or production credential may enter source, reports, or screenshots.
- If a product-code defect is outside a narrow Android baseline fix, stop and create a follow-up phase plan rather than expanding this phase.

## Review Focus

- A successful build must be tied to the exact source revision and API environment exercised.
- The smoke run must test backend behavior, not only app launch, static rendering, or deep-link intent delivery.
- Reconciled and UNRECONCILED bills must both be exercised; no real charge may be initiated.
- Ownership failures, 401 session expiry, and network errors must leave safe UI state.
- Reports and screenshots must not disclose patient identifiers, OTPs, access tokens, or payment secrets.

---

### Task 1: Reconcile the current mobile status documents

**Files:**
- Modify: process/features/patient-mobile-app/references/architecture.md
- Modify: process/features/patient-mobile-app/completed/patient-mobile-app_UMBRELLA_PLAN_07-11-26.md
- Modify: process/features/patient-mobile-app/reports/mobile-api-readiness-report_07-11-26.md
- Modify: process/features/patient-mobile-app/reports/phase-1-app-foundation-report_07-11-26.md
- Modify: process/features/patient-mobile-app/reports/phase-2-profiles-and-booking-report_07-11-26.md
- Modify: process/features/patient-mobile-app/reports/phase-3-records-and-payments-report_07-11-26.md
- Modify: process/features/patient-mobile-app/completed/phase-4-release-readiness_PLAN_07-11-26.md
- Modify: process/features/patient-mobile-app/reports/phase-4-release-readiness-report_07-11-26.md
- Modify: hospital-mobile/docs/release-checklist.md
- Modify: process/context/all-context.md

**Interfaces:**
- The Phase 4 report is the source for Android build ID, emulator evidence, and the iOS blocker.
- Actual routes and API paths must match hospital-mobile/src/app/ and the current feature API modules.

- [x] Compare current source, Phase 0–4 reports, archived umbrella, architecture reference, release checklist, and context router.
- [x] Correct Phase 0 report claims: send-otp response is OtpResponse; forgot-password is not mapped; schedules use by-department; records use /api/clinical/patients/{id}/records; bill-item fields are itemId/name.
- [x] Correct Phase 0 report claims about reservation authentication and clinical-role access; document current route behavior and leave policy decisions visible for follow-up.
- [x] Fix Phase 0–3 report links that still point to plans under active/; the completed plans are under completed/.
- [x] Update the architecture reference to describe the implemented app and mark its former target-state sections as historical where needed.
- [x] Correct the archived umbrella's Phase 4 status with a dated superseding note; preserve that its original status was a snapshot.
- [x] Make the Phase 4 plan/report and release checklist distinguish installed-APK launch/deep-link checks from full patient-flow/payment E2E, which remains NOT RUN.
- [x] Add a link to this follow-up umbrella and current Android/iOS status in process/context/all-context.md.
- [x] Confirm every new relative link resolves and changes do not alter unrelated feature rows.

### Task 2: Run the existing automated release gates

**Files:**
- Test: hospital-mobile/src/features/auth/__tests__/
- Test: hospital-mobile/src/features/profiles/__tests__/
- Test: hospital-mobile/src/features/booking/__tests__/
- Test: hospital-mobile/src/features/notifications/__tests__/
- Test: hospital-mobile/src/features/records/__tests__/
- Test: hospital-mobile/src/features/billing/__tests__/
- Test: hospital-api/src/test/java/com/hospital/api/service/PatientMobileDataOwnershipTest.java
- Test: hospital-api/src/test/java/com/hospital/api/service/PatientNotificationOwnershipTest.java
- Test: hospital-api/src/test/java/com/hospital/api/service/PatientPendingBillTest.java
- Test: hospital-api/src/test/java/com/hospital/api/service/PatientPaymentAuthorizationTest.java
- Test: hospital-api/src/test/java/com/hospital/api/service/PaymentBookingVerificationTest.java

- [x] Run npm run typecheck from hospital-mobile/; expected: exit code 0.
- [x] Run npm test -- --runInBand from hospital-mobile/; expected: all current suites pass.
- [x] Run node scripts/check-public-config.mjs from hospital-mobile/; expected: zero secret leaks.
- [x] Run the focused backend ownership and payment suite from hospital-api/:

~~~powershell
.\mvnw.cmd "-Dtest=PatientMobileDataOwnershipTest,PatientNotificationOwnershipTest,PatientPendingBillTest,PatientPaymentAuthorizationTest,PaymentBookingVerificationTest" test
~~~

- [x] Record actual counts and source revision; do not copy historical counts as current results.
- [x] For any failure, identify whether it is an existing defect or environment issue before deciding whether this phase may fix it.
- [x] Do not change reservation or clinical-record authorization code until the product role/guest policy is confirmed and a separate implementation boundary is approved.

### Task 3: Complete the Android staging smoke journey

**Files:**
- Modify: hospital-mobile/scripts/smoke-test-checklist.md
- Modify: hospital-mobile/docs/release-checklist.md
- Test: installed Android preview build on emulator or test device

- [x] Confirm API environment uses synthetic data, Android networking reaches that API, and the payment provider is sandbox/test mode.
- [x] Build a fresh Android preview from the selected source revision if the recorded APK does not match it; record EAS build ID and artifact.
- [x] Walk through patient login/session restore/logout, profile create/edit/delete, department/date/slot selection, reservation release, booking history/cancel, and in-app notification read actions.
- [x] Walk through record list/detail and verify a foreign profile/record remains denied.
- [x] Exercise a reconciled pending bill using sandbox checkout/QR; verify backend status before any paid state.
- [x] Exercise an UNRECONCILED bill and provider cancel/pending paths; verify amount and checkout remain unavailable where required.
- [x] Verify 401, offline/retry, empty state, and one cross-account denial on the installed build.
- [x] Mark each smoke item PASS, FAIL, BLOCKED, or NOT RUN with sanitized evidence and no real patient data.

### Task 4: Publish the phase evidence

**Files:**
- Create: process/features/patient-mobile-app/reports/phase-5-baseline-and-android-e2e-report_07-11-26.md
- Modify: process/features/patient-mobile-app/active/patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md
- Modify: process/context/all-context.md

- [x] Record source revision, environment, build ID, automated results, manual journey results, and blockers.
- [x] Mark Phase 5 PASSED only when the installed app completed the full staging journey; otherwise keep the exact failed gate visible.
- [x] Update umbrella status and context links without claiming iOS or production readiness.

## Phase 5 Gate

- [x] Automated mobile/backend ownership/payment checks pass on the selected source revision.
- [x] Android staging walkthrough covers all six patient home modules and the complete payment return/status loop.
- [x] No production credentials, real patient data, or live payment were used.
- [x] Architecture, archived-plan status, release checklist, report, and context router agree on current status.
