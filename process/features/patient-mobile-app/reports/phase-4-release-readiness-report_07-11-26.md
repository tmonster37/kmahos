# Patient Mobile App — Phase 4 Release Readiness Report

**Date:** 07/11/2026
**Phase Plan:** `process/features/patient-mobile-app/completed/phase-4-release-readiness_PLAN_07-11-26.md`
**Overall Phase 4 Status:** **ANDROID BUILD + LIMITED SMOKE PASS / FULL ANDROID E2E NOT RUN / iOS BLOCKED** (Android APK install, login-screen rendering, and payment-return deep-link delivery passed; full patient journeys against the API/provider were not exercised on the installed APK.)

---

## 1. Summary of Completed vs. Blocked Items

### Completed & Verified (Build/configuration and limited Android smoke)
- `hospital-mobile/eas.json` & `hospital-mobile/.env`:
  - Configured `development` (`developmentClient: true`, `distribution: "internal"`) and `preview` (`distribution: "internal"`, `android.buildType: "apk"`) profiles with non-production API URL `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080` and `NPM_CONFIG_LEGACY_PEER_DEPS="true"`.
- `hospital-mobile/app.json`:
  - Linked EAS project `@tmst37/hospital-mobile` (`extra.eas.projectId: "8adc2793-e303-4277-ab8c-530a3581b46d"`), Android `package: "com.hospital.patientmobile"`, intent filter for `hospitalmobile://payment/return`, iOS `bundleIdentifier: "com.hospital.patientmobile"`, and app scheme `hospitalmobile`.
- `hospital-mobile/.easignore`:
  - Excluded `.env`, `.env.*` (keeping `!.env.example`), signing keys (`*.jks`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`), test/coverage output, and sibling repository directories (`../hospital-api/`, `../hospital-ui/`, `../process/`, `../docs/`).
- `hospital-mobile/scripts/check-public-config.mjs`, `hospital-mobile/scripts/__tests__/check-public-config.test.mjs`, and `hospital-mobile/src/config/__tests__/release-config.test.ts`:
  - Verified `releaseConfigContainsNoSecrets` (`0 secret leaks detected`).
- **Android EAS Internal Preview Build & Emulator Verification (`PASS`):**
  - **EAS Build ID:** `7f78338d-fa31-417b-8224-3efb99f8c5e7`
  - **Build Page:** `https://expo.dev/accounts/tmst37/projects/hospital-mobile/builds/7f78338d-fa31-417b-8224-3efb99f8c5e7`
  - **APK Artifact URL:** `https://expo.dev/artifacts/eas/cQ6duunB5QLi0OBNjXEClv-DWiS6JYykl0qPtAjndoI.apk`
  - **Emulator Installation & Smoke Verification:** Installed on `emulator-5554` (`sdk_gphone64_x86_64`, Android 17 / API 37). Verified app launch (`login-screen` rendered with `"Cổng Bệnh Nhân"`, identifier/password inputs, and submit button) and verified `hospitalmobile://payment/return?txnRef=PAYOS-SMOKE-1&orderCode=123456&cancel=true` deep-link intent delivery (`Status: ok`, `Activity: com.hospital.patientmobile/.MainActivity`).
  - **Scope limit:** This verifies install, launch, and intent delivery only. The complete smoke checklist and checkout/status flow against an API/provider were not run on the installed APK; track them in Phase 5.
- `hospital-mobile/scripts/smoke-test-checklist.md`, `hospital-mobile/docs/release-checklist.md`, and `process/features/patient-mobile-app/backlog/push-notifications.md`:
  - Authored repeatable smoke checklist, internal release checklist, and deferred push-notification backlog specification.

### External Blocker (iOS Internal Build Only)
1. **iOS Internal Preview Build (`BLOCKED`):**
   - iOS internal distribution (`"distribution": "internal"`) requires a **paid Apple Developer Program account** ($99/year) for Ad Hoc device UDID registration and provisioning profiles, and the Windows host has no local Xcode / iOS Simulator. Per user confirmation, Android-only (`--platform android`) was built and verified; iOS remains explicitly marked `BLOCKED` on the external Apple Developer Program dependency.

---

## 2. Independent Platform & Gate Status

| Platform / Gate | Status | Details |
|---|---|---|
| **Public Config & Secret Leak Guard (`releaseConfigContainsNoSecrets`)** | **PASS** | `node --test scripts/__tests__/check-public-config.test.mjs` (`2/2 passed`) and `node scripts/check-public-config.mjs` (`0 secret leaks detected`). |
| **TypeScript & Automated Test Suite (`Phase 1–4`)** | **PASS** | `npm run typecheck` (`0 errors`) and `npm test -- --runInBand` (`15/15 test suites passed`, `44/44 tests passed`). |
| **Backend Ownership & Canonical Payment Suite (`Phase 0–3`)** | **PASS** | `69/69` JUnit tests passed (`PatientMobileDataOwnershipTest`, `PatientNotificationOwnershipTest`, `PatientPendingBillTest`, `PatientPaymentAuthorizationTest`, `PaymentBookingVerificationTest`). |
| **Android Internal Preview Build & Limited Smoke** | **PASS** | Build ID: `7f78338d-fa31-417b-8224-3efb99f8c5e7` (`finished`). Installed on `emulator-5554` (`sdk_gphone64_x86_64`, Android 17 / API 37); verified login-screen rendering and `hospitalmobile://payment/return` intent delivery. Full patient-flow/API/payment E2E is NOT RUN. |
| **iOS Internal Preview Build & Smoke Check** | **BLOCKED** | Build ID: `N/A (Not built)`. Blocked on external dependency: requires paid Apple Developer Program account for iOS internal device provisioning (and Windows host lacks local Xcode/iOS Simulator). |
| **Store Submission (Google Play / App Store)** | **NOT RUN (Out of Scope)** | Explicitly excluded by Phase 4 Global Constraints. |
