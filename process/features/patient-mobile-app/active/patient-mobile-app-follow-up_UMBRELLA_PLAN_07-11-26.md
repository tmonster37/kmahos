# Patient Mobile App Follow-up Program Plan

> **For agentic workers:** Use the repository's phase loop for every phase: read-only research, explicit execution approval, implementation, independent validation, and a durable report. This program plan does not authorize implementation or store submission.

**Goal:** Close the remaining patient-mobile work with verified Android and iOS flows, complete account and push-notification capabilities, and prepare a controlled store release.

**Architecture:** Continue the existing Expo/TypeScript app and patient-safe Spring APIs. Keep identity, ownership, billing, and notification decisions on the backend; keep tokens in OS secure storage; use server-confirmed payment state. Treat EAS and store credentials as external secrets.

**Tech Stack:** Expo SDK 58, React Native, TypeScript, Expo Router, Axios, Expo SecureStore, Spring Boot 3.4.3, PostgreSQL/Flyway, EAS Build, PayOS/VietQR, APNs and FCM.

**Spec:** [Patient mobile app design](../../../../docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md), [Phase 0–4 reports](../reports/), and [push-notification backlog](../backlog/push-notifications.md). This follow-up extends the approved MVP with account recovery, push, iOS internal distribution, and store release.

## Global Constraints

- Preserve the patient-only boundary and server-side ownership checks; do not call administrative or public lookup routes for authenticated patient data.
- Do not add mock clinical data, client-derived payable amounts, offline clinical caching, or secrets in source, app bundles, logs, screenshots, or fixtures.
- Keep browser Cookie-Only authentication unchanged; native sessions use Bearer tokens in SecureStore and require re-login after 401 until a refresh-token contract exists.
- Use synthetic accounts/data and a non-production API/payment environment for all verification.
- Push payloads and lock-screen text must not expose diagnoses, test results, prescriptions, patient identifiers, or payment details.
- Do not change unrelated dirty files. For numbered phases, keep implementation within the mobile app and the explicitly approved backend/config/docs touchpoints for that phase. A separately approved cross-cutting workstream may use only the exact additional touchpoints named in its own plan.
- Treat Apple/Google developer accounts, EAS credentials, FCM/APNs keys, production API configuration, legal/privacy content, and store submission as external gates. Never commit credentials.
- Plan approval is not execution approval. Start only one phase at a time after the user explicitly enters EXECUTE MODE for that phase.
- Before each phase, reconcile its plan against current source and current versioned platform documentation; split newly discovered cross-cutting work into a follow-up plan.

## Review Focus

- OTP resend, expiry, duplicate phone, and reset attempts must follow server rate limits without revealing account existence or logging codes.
- Device tokens must remain bound to the authenticated account; logout, token rotation, and account switching must not leave another account subscribed.
- Push content must remain generic even when the originating event contains clinical or payment data.
- Provider returns and delayed callbacks must never mark an unpaid transaction paid without backend confirmation.
- A blocked Apple or store credential gate must be reported as blocked, never as a successful platform release.
- Production configuration and artifacts must contain no private credentials or real patient data.

## Program Phases

| Phase | Plan | Outcome | Gate |
|---|---|---|---|
| 5. Baseline and Android staging E2E | [Phase 5 plan](phase-5-baseline-and-android-e2e_PLAN_07-11-26.md) | Reconcile stale status documents and complete a reproducible end-to-end Android run against a non-production backend/payment environment. | **PASSED (08/11/2026):** [Phase 5 report](../reports/phase-5-baseline-and-android-e2e-report_07-11-26.md). Core patient journeys verified, automated gates 100% PASS (15/15 Jest, 69/69 JUnit). |
| 6. Account lifecycle | [Phase 6 plan](phase-6-auth-lifecycle_PLAN_07-11-26.md) | Add patient registration, OTP verification, and password recovery screens using verified auth contracts. | **PASSED (08/11/2026):** [Phase 6 report](../reports/phase-6-auth-lifecycle-report_08-11-26.md). Backend forgot-password gap closed, registration & OTP screens implemented, 100% automated gates PASS (18/18 Jest suites, 60/60 tests; 82/82 JUnit tests). |
| 7. Push notifications | [Phase 7 plan](phase-7-push-notifications_PLAN_07-11-26.md) | Add opt-in device registration, safe backend delivery, and notification deep links on Android. | **PASSED (08/11/2026):** [Phase 7 report](../reports/phase-7-push-notifications-report_08-11-26.md). Device registration/revocation contract, privacy-safe payloads, mock provider, tap routing, and in-app opt-in implemented. 100% automated gates PASS (19/19 Jest suites, 69/69 tests; 16/16 JUnit tests). |
| 8. iOS internal build | [Phase 8 plan](phase-8-ios-internal-build_PLAN_07-11-26.md) | Build and smoke-check the patient app on iOS through EAS. | A signed internal build is installed and core flows pass on a real iOS device; otherwise report the external blocker. |
| 9. Store release | [Phase 9 plan](phase-9-store-release_PLAN_07-11-26.md) | Prepare production configuration, store materials, staged rollout, and release evidence. | Production readiness is approved and each store submission is explicitly authorized. |

## Dependencies and Order

1. Phase 5 is the baseline gate for every later phase. It confirms current source behavior and fixes known documentation drift before new work is layered on.
2. Phase 6 depends on the existing auth endpoints and their rate-limit/OTP contracts. Add backend changes only if Phase 6 research proves the current contract insufficient.
3. Phase 7 depends on consent copy, a Firebase project, APNs/EAS credential ownership, and an agreed event matrix. Its delivery may be implemented before iOS verification, but iOS push is not complete until Phase 8.
4. Phase 8 requires an Apple Developer account for device distribution, EAS access, and a registered iOS test device. Reconfirm current EAS options before choosing simulator versus device distribution.
5. Phase 9 depends on approved production API configuration, Google Play and Apple developer accounts, privacy/support materials, and successful platform-specific release checks. Publishing remains a separate explicit execution approval.

## Cross-Cutting Visual Workstream

[Web brand and mobile UI parity plan](patient-mobile-web-brand-parity_PLAN_08-11-26.md) is an unnumbered workstream. It establishes one verified TNT logo/color/typography source across the patient web portal and mobile app, while preserving native mobile navigation and interactions.
**PASSED (08/11/2026):** [Brand Parity report](../reports/patient-mobile-web-brand-parity-report_08-11-26.md). Single source of truth in `shared/brand/brand-tokens.json` with automated generator check; byte-identical logo SHA-256 sync; contrast-safe primary `#0F766E` and accent `#FF5757`; 100% tokenized mobile screens; 0 hex leaks; automated gates pass 100% (12/12 web Vitest suites, 53/53 tests; 19/19 mobile Jest suites, 69/69 tests; 0 TypeScript errors).

## Current Baseline

- Phase 0–3 reports mark API readiness, app foundation, profiles/booking/notifications, records, and billing as passed.
- Phase 4 report records Android preview build 7f78338d-fa31-417b-8224-3efb99f8c5e7 and limited emulator smoke check as passed; iOS internal distribution is blocked on external Apple tooling/account requirements.
- Phase 5 establishes the full reproducible baseline and Android staging verification: [Phase 5 report](../reports/phase-5-baseline-and-android-e2e-report_07-11-26.md). Automated gates pass 100% (44 Jest tests, 69 JUnit tests), staging walkthrough verified across all 6 patient modules with synthetic data.
- The archived umbrella, architecture, Phase 0 API report, Phase 4 plan/report, release checklist, and Phase 0–3 report links were corrected on 2026-11-08.
- Test totals in existing reports are historical evidence. Each phase must rerun applicable checks against the source revision it validates.

## Operating Loop

- Work only from the selected phase plan; do not infer a phase from ambient state.
- Before implementation, run a read-only research pass and present exact touchpoints, external prerequisites, and the proposed execution boundary.
- Require explicit EXECUTE MODE for that phase. After implementation, run a separate validation pass and write a phase report under process/features/patient-mobile-app/reports/.
- Update this umbrella and process/context/all-context.md after each validated phase. Leave blocked phases active with the dependency and next action recorded.
- At Phase 9, prepare store artifacts first. Do not submit or publish until the user separately approves the specific store, track, and build.
