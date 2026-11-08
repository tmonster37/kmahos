# Patient Mobile App Phase 7 — Push Notifications Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver opt-in, privacy-safe push notifications to patient devices and route notification taps into the authenticated in-app inbox or relevant patient screen.

**Architecture:** The backend owns device/account association and decides when an event warrants a push. Push is a generic signal to refresh canonical server data; the existing in-app notification API remains the source of notification content and read state.

**Tech Stack:** Expo SDK 58, Expo Notifications, React Native, TypeScript, Expo Router, Spring Boot, PostgreSQL/Flyway, FCM, APNs, EAS.

**Spec:** [Push notification backlog](../backlog/push-notifications.md), [Patient mobile app design](../../../../docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md), and [follow-up umbrella](patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md).

## Global Constraints

- Request OS permission only after login and explicit in-app opt-in; do not block core app use when permission is denied.
- Never put diagnoses, test results, prescriptions, patient identifiers, bill amounts, or transaction references in push payloads or lock-screen text.
- Bind every device installation to the authenticated account on the backend; reject cross-account device mutation and revoke stale association on account switch.
- Keep APNs, FCM service-account, EAS, and provider credentials outside source control and public Expo configuration.
- Push delivery is best-effort. The app must load canonical notification/inbox data after a tap and remain useful if a push is delayed, duplicated, or dropped.
- Do not treat push as a replacement for in-app notification persistence or delivery guarantees.

## Review Focus

- Permission denied, revoked, or unavailable device services must leave the app usable and must not register a token.
- Re-registration, token rotation, logout, reinstall, and switching accounts must not leave stale account subscriptions.
- Duplicate/retried events must not create a sensitive or misleading notification.
- Deep links must be allowlisted to patient routes and must not authenticate a user or trust payload state.
- Invalid provider credentials or invalid device tokens must fail safely without breaking the triggering clinical/payment operation.

---

### Task 1: Define the event and delivery contract

**Files:**
- Read: process/features/patient-mobile-app/backlog/push-notifications.md
- Read: hospital-api/src/main/java/com/hospital/api/service/impl/NotificationServiceImpl.java
- Read: hospital-api/src/main/java/com/hospital/api/controller/UtilityController.java
- Read: hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalExaminationServiceImpl.java
- Read: hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalGatewayServiceImpl.java
- Read: hospital-api/src/main/java/com/hospital/api/service/impl/CashierServiceImpl.java
- Read: hospital-api/src/main/java/com/hospital/api/service/impl/PaymentServiceImpl.java
- Read: hospital-mobile/src/features/notifications/

- [x] Map source events for booking confirmation/reminder, queue dispatch/call, result or prescription availability, and payment success; confirm the owning service and authoritative transaction boundary for each.
- [x] Decide whether each push is an existing inbox notification, a new generic notification, or only a refresh hint; do not duplicate inbox rows.
- [x] Define event idempotency, retry behavior, invalid-token cleanup, and provider failure isolation before implementation.
- [x] Review current Expo SDK 58 notification documentation and choose the supported device/build path before adding a dependency.
- [x] Confirm Firebase project, APNs credential owner, EAS access, consent copy, and Android test-device availability. Mark the phase blocked if a required external prerequisite is unavailable.

### Task 2: Add backend device registration and revocation

**Files:**
- Create: hospital-api/src/main/java/com/hospital/api/entity/PushDevice.java
- Create: hospital-api/src/main/java/com/hospital/api/repository/PushDeviceRepository.java
- Create: hospital-api/src/main/java/com/hospital/api/dto/request/RegisterPushDeviceRequest.java
- Create: hospital-api/src/main/java/com/hospital/api/service/PushDeviceService.java
- Create: hospital-api/src/main/java/com/hospital/api/service/impl/PushDeviceServiceImpl.java
- Modify: hospital-api/src/main/java/com/hospital/api/controller/UtilityController.java
- Create: next monotonic Flyway migration after checking the current migration baseline
- Create: hospital-api/src/test/java/com/hospital/api/service/PatientPushDeviceOwnershipTest.java

- [x] Add the backlog contract POST /api/utilities/push-devices and DELETE /api/utilities/push-devices/{deviceInstallId}, taking account identity only from UserPrincipal.
- [x] Enforce unique device-install identity, token rotation, account ownership, platform validation, and account-switch revocation in one transactional service.
- [x] Add tests for patient-owned registration/deletion, foreign installation denial, token replacement, duplicate registration, and idempotent revoke.
- [x] Run focused backend tests and Flyway/schema validation before enabling event delivery.

### Task 3: Add provider delivery behind the backend notification boundary

**Files:**
- Create: backend push-provider interface and FCM/APNs adapter under hospital-api/src/main/java/com/hospital/api/service/
- Modify only after Task 1 event mapping: NotificationServiceImpl.java and the confirmed event-producing services
- Create: provider adapter and event-dispatch tests under hospital-api/src/test/java/com/hospital/api/service/
- Modify: backend secret/config documentation without adding secret values

- [x] Send a generic payload containing only an opaque notification/deep-link type and safe routing key; fetch title/content from authenticated APIs after app open.
- [x] Trigger pushes only after the authoritative transaction commits; do not let a provider outage roll back booking, clinical, or payment work.
- [x] Implement bounded retries/idempotency and invalid-token cleanup according to Task 1's delivery decision.
- [x] Add tests proving payloads omit clinical/payment data and provider failure does not fail the originating business transaction.
- [x] Verify provider credentials resolve from approved server/EAS secret stores and are absent from app bundles, logs, and test output.

### Task 4: Add patient opt-in, registration, logout, and tap handling

**Files:**
- Modify: hospital-mobile/package.json
- Modify: hospital-mobile/app.json
- Create: hospital-mobile/src/features/notifications/push.api.ts
- Create: hospital-mobile/src/features/notifications/push-registration.ts
- Create: hospital-mobile/src/features/notifications/__tests__/push-registration.test.ts
- Create or modify: hospital-mobile/src/app/(patient)/settings/notifications.tsx
- Modify: hospital-mobile/src/features/auth/auth.repository.ts
- Modify: hospital-mobile/src/app/(patient)/_layout.tsx

- [x] Install the Expo SDK-compatible notification package using Expo's version-matched installer after Task 1 documentation review.
- [x] Add an explicit in-app opt-in before the OS permission prompt; handle denied/revoked permission and unsupported simulators.
- [x] Register the provider token only for the signed-in patient and keep a stable opaque deviceInstallId for revocation; do not log either value.
- [x] Revoke the device association during logout/account switch; ensure failure is retried safely without retaining another account's subscription.
- [x] Handle taps through an allowlist of patient routes, then refresh the existing inbox or detail API; ignore arbitrary payload URLs and status claims.
- [x] Test permission denied/granted, token rotation, logout, account switch, duplicate registration, invalid payload, and authenticated refresh after tap.
- [x] Run mobile tests and typecheck; verify the platform build with the configured provider credentials.

### Task 5: Verify Android push delivery and report

**Files:**
- Modify: hospital-mobile/scripts/smoke-test-checklist.md
- Create: process/features/patient-mobile-app/reports/phase-7-push-notifications-report_07-11-26.md
- Modify: process/features/patient-mobile-app/active/patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md

- [x] On a supported Android test device/build, verify opt-in, token registration, one approved event per event category, tap routing, logout revocation, and provider failure handling.
- [x] Use only synthetic accounts and generic payloads; inspect captured payloads for prohibited fields.
- [x] Mark unverified event categories and iOS delivery explicitly; do not claim cross-platform completion until Phase 8.
- [x] Record provider/project setup without including credentials and update the umbrella gate.

## Phase 7 Gate

- [x] Device registration and revocation are account-scoped, tested, and idempotent.
- [x] Android receives approved generic pushes and taps load authenticated server data.
- [x] No sensitive clinical, identity, or payment data appears in payloads, logs, or screenshots.
- [x] Push-provider failures do not interrupt booking, clinical, or payment operations.
