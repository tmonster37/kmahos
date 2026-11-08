# Patient Mobile App Phase 8 — iOS Internal Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce and install an iOS internal build, then verify patient journeys and platform-specific links on an iOS device.

**Architecture:** Use the current Expo/EAS cloud workflow and existing patient-safe APIs. Keep staging configuration isolated from production; use backend-verified payment return and privacy-safe push behavior.

**Tech Stack:** Expo SDK 58, React Native, TypeScript, Expo Router/Linking, EAS Build, iOS device, Spring staging API, PayOS/VietQR sandbox, APNs/FCM if Phase 7 is complete.

**Spec:** [Patient mobile app design](../../../../docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md), [Phase 4 report](../reports/phase-4-release-readiness-report_07-11-26.md), and [follow-up umbrella](patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md).

## Global Constraints

- Do not claim iOS PASS without a build artifact installed and the required flows exercised on an iOS simulator or device.
- Use EAS cloud builds on this Windows workspace; do not create or hand-edit generated ios/ or android/ directories.
- Keep Apple signing keys, APNs keys, EAS credentials, tokens, and patient data out of the repository and public config.
- Use a non-production API and payment sandbox with synthetic patient accounts.
- Recheck version-matched Expo/EAS documentation and current Apple distribution rules during the phase; do not rely only on the 2026-11-07 blocker snapshot.
- Do not submit to App Store Connect or publish an app in this phase.

## Review Focus

- A simulator build and an Ad Hoc device build have different prerequisites; state the exact target and evidence.
- Payment return links must enter the app but never mark a payment successful without backend status/sync.
- Push permissions, token registration, and notification taps must work on iOS if Phase 7 is complete.
- A build configuration must not embed staging secrets or silently point a preview app at production.
- Missing Apple membership, device registration, or EAS credentials remains a visible blocker.

---

### Task 1: Confirm iOS build prerequisites and supported distribution target

**Files:**
- Read: hospital-mobile/app.json
- Read: hospital-mobile/eas.json
- Read: hospital-mobile/.easignore
- Read: hospital-mobile/docs/release-checklist.md
- Read: process/features/patient-mobile-app/reports/phase-4-release-readiness-report_07-11-26.md

- [ ] Confirm EAS project access, Apple Developer Program status, target iOS device/UDID, signing ownership, and available test device.
- [ ] Review current Expo SDK 58 and EAS docs for simulator versus internal device build requirements.
- [ ] Choose and record one target: simulator artifact where supported, or signed internal device distribution.
- [ ] If the required account/device is unavailable, mark Phase 8 BLOCKED with owner, exact dependency, and next action; do not spend time on a build path that cannot be installed.

### Task 2: Configure and create the iOS preview build

**Files:**
- Modify only if required: hospital-mobile/app.json
- Modify only if required: hospital-mobile/eas.json
- Modify only if required: hospital-mobile/.easignore
- Modify: hospital-mobile/docs/release-checklist.md

- [ ] Verify bundle identifier, app scheme, build number, environment URL, and payment return/universal-link behavior for the selected target.
- [ ] Configure credentials through EAS/Apple-supported secret and signing flows; do not commit provisioning profiles or private keys.
- [ ] Run current mobile typecheck, Jest suite, and public-config secret guard before building.
- [ ] Create the iOS build from the selected source revision and record EAS build ID, profile, artifact, and API environment.
- [ ] Confirm the artifact installs on the intended iOS simulator/device; a completed cloud build without installation is not a PASS.

### Task 3: Run the iOS patient and payment smoke journey

**Files:**
- Modify: hospital-mobile/scripts/smoke-test-checklist.md
- Test: installed iOS preview on the registered device or supported simulator

- [ ] Verify login, SecureStore session restore, 401 logout, profiles, booking/reservation release, appointment journey, and in-app notifications.
- [ ] Verify patient-owned record list/detail, pending-bill behavior, UNRECONCILED fail-closed behavior, sandbox checkout, cancel/pending, and backend-confirmed success.
- [ ] Verify app return/deep link on the selected iOS target; arbitrary parameters must not authenticate or establish payment state.
- [ ] If Phase 7 passed, verify opt-in, permission denial, push receipt, tap routing, and device revocation on iOS.
- [ ] Record each item PASS, FAIL, BLOCKED, or NOT RUN with sanitized evidence; never include patient data or credentials.

### Task 4: Report platform status

**Files:**
- Create: process/features/patient-mobile-app/reports/phase-8-ios-internal-build-report_07-11-26.md
- Modify: process/features/patient-mobile-app/active/patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md
- Modify: process/context/all-context.md

- [ ] Record target type, device/OS, build ID, install evidence, API environment, test outcomes, and remaining platform gaps.
- [ ] Mark iOS PASS only when the required build is installed and all required platform smoke gates pass; otherwise preserve BLOCKED/FAIL/NOT RUN.
- [ ] Update umbrella and context without claiming store publication.

## Phase 8 Gate

- [ ] An iOS build is installed on the declared target and tied to the tested source revision.
- [ ] Patient login, ownership, booking, records, billing, payment return, and applicable push flows pass on iOS.
- [ ] No credentials or patient data are present in the artifact, logs, or report.
- [ ] Any unavailable external dependency is recorded as a blocker rather than an assumed completion.
