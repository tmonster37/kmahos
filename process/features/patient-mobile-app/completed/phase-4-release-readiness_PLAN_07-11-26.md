# Patient Mobile App — Phase 4 Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this phase task-by-task.

**Goal:** Produce installable internal Android and iOS builds and a repeatable release checklist for the validated patient MVP.

**Architecture:** Use Expo application configuration and EAS build profiles for development/preview builds; validate app links and provider returns against staging before considering store submission. Publishing is outside this plan.

**Tech Stack:** Expo SDK, EAS Build, Android internal build, iOS cloud build, existing project CI where feasible.

**Spec:** `docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md`

## Global Constraints

- Do not publish to Google Play or App Store; this phase produces internal artifacts only.
- Do not put patient data, tokens, PayOS/VietQR secrets, signing credentials, or private URLs in app bundles, source control, logs, or screenshots.
- Validate Android and iOS app IDs, app-link domains, and payment return URLs before creating store-facing configuration.
- A successful legacy transaction with no source-backed category marker remains `UNRECONCILED`; the app must not show a payable total or launch checkout for its affected category until reconciliation/accounting confirmation is complete.
- Push notification implementation is deferred; add a backlog item only, no APNs/FCM backend work in this phase.
- Preserve existing dirty files and keep mobile-only changes under `hospital-mobile/` plus approved reports/context.

## Review Focus

- A staging/production base URL or secret must not leak into a preview bundle; pin with `releaseConfigContainsNoSecrets`.
- Android/iOS payment return links must not accept arbitrary parameters as authenticated state; pin with `providerCancelDoesNotMarkPaid` and `syncSuccessShowsPaid` from Phase 3, and repeat in the staging smoke checklist.
- An `UNRECONCILED` bill must fail closed on both platforms; pin with `unreconciledBillHasNoPayableBalance` and `unreconciledCheckoutFailsClosed` from Phase 3 and repeat in staging.
- Build failure or unavailable iOS local tooling must be reported honestly and handled via supported cloud build; do not mark an unbuilt platform as passed.

---

### Task 1: Add internal build profiles and platform identifiers

**Files:**
- Create: `hospital-mobile/eas.json`
- Modify: `hospital-mobile/app.json`
- Create: `hospital-mobile/.easignore`
- Create: `hospital-mobile/scripts/check-public-config.mjs`
- Create: `hospital-mobile/scripts/__tests__/check-public-config.test.mjs`

**Interfaces:**
- Profiles: `development`, `preview`, and `production`; this phase uses development/preview only.
- `EXPO_PUBLIC_API_URL` selects a non-secret API base URL; all private values remain server-side or in EAS secrets not bundled to client JS.

- [x] **Step 1: Write `releaseConfigContainsNoSecrets`** that fails when package config or public env examples contain token/password/payment secret variable names or production credentials.
- [x] **Step 2: Run the config test and confirm it catches a test-only sentinel secret.**
- [x] **Step 3: Add Android package ID, iOS bundle ID, app scheme, version/build number, and development/preview EAS profiles** using project-approved identifiers.
- [x] **Step 4: Add `.easignore`** to exclude local `.env*.local`, debug output, test artifacts, and unrelated repository documents.
- [x] **Step 5: Re-run config test, `npx expo-doctor`, and `npx tsc --noEmit`**; expected no sensitive data in resolved public configuration.

### Task 2: Verify Android/iOS staging builds and payment return links

**Files:**
- Create: `hospital-mobile/docs/release-checklist.md`
- Create: `hospital-mobile/scripts/smoke-test-checklist.md`
- Modify: `hospital-mobile/app.json`
- Modify only if provider audit requires it: `hospital-api/src/main/java/com/hospital/api/config/PayOSConfig.java`
- Modify only if provider audit requires it: `hospital-api/src/main/resources/application.yml`

**Interfaces:**
- Android/iOS preview builds point only to approved staging API.
- Payment return route accepts an opaque reference and calls backend status/sync endpoint; it never accepts client token or trusts provider query status as final.

- [x] **Step 1: Write smoke steps** for install, patient login, profile load, schedule discovery, booking/history, notification inbox and mark-read/read-all, records, pending bill, reconciled PayOS/VietQR checkout, return/resume and server status; include an `UNRECONCILED` fixture and verify no payable amount or checkout link appears.
- [x] **Step 2: Build Android preview** with the configured EAS profile and install it on an emulator or test device. *(PASS: EAS Build ID `7f78338d-fa31-417b-8224-3efb99f8c5e7`, installed and verified on `emulator-5554` `sdk_gphone64_x86_64` Android 17 / API 37)*
- [ ] **Step 3: Build iOS preview using EAS cloud build** (Windows host has no local Xcode build); install on a simulator/device only if available. *(BLOCKED: no paid Apple Developer account for iOS internal distribution provisioning and Windows host has no local Xcode/iOS Simulator; Android-only build selected)*
- [x] **Step 4: Verify payment-return deep-link delivery and automated payment-state tests.** *(LIMITED PASS: the installed APK received the `hospitalmobile://payment/return` intent; Jest/JUnit cover cancel/pending/success states. Checkout and backend status/sync were not exercised end-to-end on the installed APK.)*
- [ ] **Follow-up: Exercise checkout, return, cancel, pending, and backend-confirmed success on the installed APK against the non-production API/provider.** *(NOT RUN in Phase 4; carried to Phase 5.)*
- [x] **Step 5: Complete `release-checklist.md`** with build IDs, tested OS versions, API environment, known blockers, and explicit unverified cases; do not include real patient details.

### Task 3: Add deferred push-notification backlog and operational handoff

**Files:**
- Create: `process/features/patient-mobile-app/backlog/push-notifications.md`
- Create: `process/features/patient-mobile-app/reports/phase-4-release-readiness-report_07-11-26.md`
- Modify: `process/context/all-context.md`

**Interfaces:**
- Backlog entry describes the required device-registration API, consent/permission UX, APNs/FCM credentials ownership, token rotation/deletion, and notification categories.
- Release report records verified artifacts and platform gaps.

- [x] **Step 1: Write the push backlog item** as discovery/requirements only; do not add device token or message-sending APIs now.
- [x] **Step 2: Write release readiness report** from the completed smoke checklist; mark Android/iOS independently as PASS, BLOCKED, or NOT RUN.
- [x] **Step 3: Update `process/context/all-context.md` feature table** with current patient-mobile-app status and links to umbrella, active phase plan, and reports without changing existing feature rows.
- [x] **Step 4: Review all report links and paths** with `Test-Path` and verify no credentials or patient identifiers are included.

### Phase 4 Gate

- [x] Android preview build is installed; login-screen rendering and payment-return intent delivery are smoke-checked. *(LIMITED PASS: Build ID `7f78338d-fa31-417b-8224-3efb99f8c5e7` installed on `emulator-5554` Android 17 / API 37.)*
- [ ] Full Android patient-flow and checkout E2E on the installed APK. *(NOT RUN; carried to Phase 5.)*
- [x] iOS build is completed or marked blocked with the exact external dependency; no false pass. *(Marked BLOCKED: no paid Apple Developer Program account and Windows host has no local Xcode/iOS Simulator)*
- [ ] Staging checkout returns to the installed app and the server confirms transaction state. *(NOT RUN end-to-end in Phase 4; automated tests and intent delivery do not establish this gate.)*
- [x] Automated tests verify `UNRECONCILED` bills remain nonpayable; installed-device verification is still required for each platform. *(Android/iOS UI behavior was not fully smoke-checked; iOS build is BLOCKED.)*
- [x] Release checklist, push backlog, report, and feature router are complete; no store submission occurred.
