# Patient Mobile App Phase 9 — Store Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare and execute a controlled Android/iOS store release after production, privacy, security, and platform gates pass.

**Architecture:** Create immutable production builds from a reviewed source revision, point them only at the approved production API, keep provider/signing credentials in secret stores, and use staged distribution with a documented rollback path.

**Tech Stack:** Expo SDK 58, EAS Build/Submit, Google Play Console, App Store Connect, Spring production API, PayOS/VietQR, APNs/FCM, existing mobile test suites.

**Spec:** [Patient mobile app design](../../../../docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md), [follow-up umbrella](patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md), and validated Phase 5/7/8 reports.

## Global Constraints

- This plan does not grant permission to submit, publish, release to production, or change production API configuration. Require a separate explicit EXECUTE MODE and approval naming the store and release track.
- Do not release until Phase 5 staging E2E, Phase 6 account lifecycle, Phase 7 privacy/security gates, and Phase 8 iOS gates have the required status for the platforms being released.
- Use only approved production URLs and EAS/Apple/Google secret management; never commit tokens, signing files, provider keys, or private customer data.
- Store screenshots, descriptions, and review credentials must use synthetic data and must not expose clinical details.
- Product owner/legal/privacy review must approve privacy policy, support contact, data disclosures, age/consent language, and store metadata before submission.
- A staged rollout must have monitoring, incident contacts, rollback criteria, and an app/backend compatibility plan.

## Review Focus

- Production build configuration must not inherit emulator, localhost, staging, or test-provider values.
- The installed binary's version/build number and source revision must match the reviewed release candidate.
- Store privacy/data declarations must match actual app behavior, including authentication, notifications, and clinical records.
- Payment flows must be sandbox-verified before production use and production success must still come from backend status.
- Reviewer credentials, if required, must be synthetic, least-privileged, and shared only through the store's secure review mechanism.
- Submission must stop if required legal text, store ownership, signing access, or monitoring is missing.

---

### Task 1: Collect release ownership and policy prerequisites

**Files:**
- Create: process/features/patient-mobile-app/references/store-release-inputs.md
- Read: process/features/patient-mobile-app/reports/
- Read: hospital-mobile/docs/release-checklist.md

- [ ] Record Google Play and Apple developer account owners, access path, signing ownership, support contact, privacy-policy URL, and escalation contact.
- [ ] Collect approved app name, descriptions, screenshots, age rating, data-safety/privacy answers, and account-deletion/contact requirements.
- [ ] Verify current store rules and EAS submission steps from the official platform documentation during execution.
- [ ] Mark each missing owner-provided or legal input BLOCKED; do not invent company identity, policy URLs, or support details.

### Task 2: Prepare production configuration and release candidate

**Files:**
- Modify: hospital-mobile/eas.json
- Modify if required: hospital-mobile/app.json
- Modify: hospital-mobile/scripts/check-public-config.mjs
- Modify: hospital-mobile/scripts/__tests__/check-public-config.test.mjs
- Create: hospital-mobile/docs/store-release-checklist.md

- [ ] Define a production API URL and provider profile only after backend owner approval; keep the value non-secret and production credentials server-side.
- [ ] Verify production profile does not use 10.0.2.2, localhost, test credentials, sandbox payment, or development client settings.
- [ ] Extend the public-config guard to reject staging/local URLs and secret-like release values where appropriate.
- [ ] Run mobile typecheck, full Jest suite, public-config guard, backend ownership/payment tests, and dependency/build diagnostics.
- [ ] Create immutable Android and iOS release candidates from one reviewed source revision; record checksums/build IDs and compare resolved config.
- [ ] Complete accessibility, permission, account lifecycle, push consent, deep-link, payment, privacy, and crash/error-state review.

### Task 3: Validate store materials and staged distribution

**Files:**
- Modify: hospital-mobile/docs/store-release-checklist.md
- Create: process/features/patient-mobile-app/reports/phase-9-store-release-report_07-11-26.md

- [ ] Validate listing text, icons, screenshots, support/privacy links, and review notes against approved product/legal inputs.
- [ ] Confirm all store assets use synthetic data and contain no real patient identifiers, diagnoses, prescriptions, or bills.
- [ ] Prepare the designated internal/closed testing tracks and a rollback/monitoring plan; verify current platform requirements.
- [ ] Invite a small approved test cohort only after the user authorizes the specific store track and build.
- [ ] Run post-install login, registration/recovery, booking, records, push, and sandbox-to-production-approved payment checks according to the approved release environment.
- [ ] Record store validation feedback, build IDs, rollout status, monitoring evidence, and rollback decision.

### Task 4: Submit or publish only after explicit release authorization

**Files:**
- Modify only under a separately approved execution request: hospital-mobile/docs/store-release-checklist.md
- Create after execution: process/features/patient-mobile-app/reports/phase-9-store-release-report_07-11-26.md

- [ ] Before submission, present the exact store, track, build ID, production API target, and release notes for explicit approval.
- [ ] Submit only the approved build/track through the official store workflow; do not broaden rollout beyond that approval.
- [ ] Monitor review outcome and staged rollout; halt or roll back if privacy, auth, payment, crash, or backend compatibility gates fail.
- [ ] Record final status as submitted, approved, released, rejected, or blocked; never describe a submitted build as published before store state confirms it.

## Phase 9 Gate

- [ ] Production owner, privacy/legal review, store account, signing, support, monitoring, and rollback prerequisites are complete.
- [ ] Production config and artifacts contain no test endpoint, secret, or real patient data.
- [ ] Android and iOS release candidates pass applicable gates and identify the same reviewed source revision.
- [ ] Store/track/build and rollout scope received explicit approval before any submission or publication.
- [ ] Report includes actual platform state and any review or rollout blocker.
