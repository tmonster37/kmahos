# Phase 1 Patient Web Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make web booking entry, selection, profile confirmation and appointment follow-up clear without changing business rules.

**Architecture:** Refresh the existing five-step BookingPage controller in place with MUI and TNT tokens. Limit home/profile changes to booking handoff and appointment tracking, retaining API/payment services and shared theme contracts.

**Tech Stack:** React 18.3, Vite 6.1, MUI 6.4, React Router 7, Axios, Vitest

**Spec:** `docs/superpowers/specs/2026-11-08-whole-system-ui-refresh-design.md` — approved by user on 08-11-2026; original draft label is historical. Read the spec and this plan together.

## Global Constraints

- Preserve TNT primary `#0F766E`, logo teal `#00C4CC`, coral `#FF5757` for brand accents only, Inter, semantic status colors and existing token adapters. Bind to `process/features/patient-mobile-app/references/brand-design-contract.md`.
- Web remains React/MUI; app remains Expo/React Native and patient-only. No large dependencies, brand change or global shell refresh ahead of its workflow.
- Minimum mobile target 44 × 44 dp; normal-text contrast 4.5:1 and large text/UI contrast 3:1. Native keyboard, safe areas and font scaling must preserve the primary action.
- Backend is authoritative for profiles, schedules, queue, clinical values, fees and payment status. Missing values display “Chưa có dữ liệu”; returned zero is a value, not missing data.
- Preserve API/DTOs, schema, auth, role/ownership scopes, clinical states, payment transitions and stock rules. No backend changes or new business features.
- Reference layouts and approved mockup inform hierarchy only; placeholder doctors, prices, metrics, results or statuses must never become live data.
- Inspect `git status --short` and current diffs before each phase; preserve unrelated dirty/untracked work and record owned hunks.
- Design/plan approval is not execution approval. Require explicit `ENTER EXECUTE MODE` for the single selected phase after its research/boundary review.

## Review Focus

- Missing doctor/fee/queue data: Task 2/3 must show unknown, preserve returned zero and avoid synthetic fee, portrait, queue number or ticket code.
- Expired/full/changed slot: Task 2 must distinguish selected versus held state and preserve current reservation/release contract.
- Pending payment/QR dismissal: Task 2 must keep status server-owned; dismissing a QR is not proof of payment.
- Long/duplicate family identities: Task 3 must keep identifying fields and selected profile readable without changing ownership or selection semantics.
- Small viewport/keyboard/200% zoom: Task 3 must preserve reachable next/back controls and focus through steps/dialogs.

---

## Scope, dependencies and blast radius

**Status and gates:** SELECTED NEXT — no execution approval. Independent of mobile release; brand parity report records PASSED, but source and owned diffs must be reconciled.

**Blast radius:** Routes /, /booking and /profiles booking/profile portions; current add/link dialog only if booking layout requires it. Other profile tabs, payment pages, staff views and token sources remain outside this phase.

**Prior workflow reference:** `process/features/patient-mobile-app/references/brand-design-contract.md` and existing patient-mobile release/parity plans; see Task 1.

**Report:** `process/features/whole-system-ui-refresh/reports/phase-1-patient-web-booking-report_08-11-26.md`

### Task 1: Establish booking baseline and resolve data-source boundaries

**Files:** Read `hospital-ui/src/pages/customer/BookingPage.jsx`, `hospital-ui/src/pages/patient/HomePage.jsx`, `hospital-ui/src/pages/patient/PatientProfilesPage.jsx`, `hospital-ui/src/services/bookingApi.js`, `hospital-ui/src/services/bookingPayment.js`, `hospital-ui/src/routes/AppRoutes.jsx` and `hospital-ui/src/utils/printHelper.js`; create the phase report named below during execution/validation.

**Interfaces:** Keep `BookingPage()` default export and query `departmentId`/`symptoms`; current stages are specialty → doctor/date → session/slot → patient profile → confirmation/ticket. Preserve `handleSelectSlot(slot)`, `handleFinalBooking()`, booking payload `{patientProfileId,timeSlotId,symptoms,reservationId}` and VIETQR/WALLET/COUNTER handling.

- [ ] Record owned hunks and baseline screenshots of all five steps, home entry and profile booking ticket using synthetic data.
- [ ] Trace successful booking, 409/expired hold, selection change, QR pending, wallet failure and cancel requests; record current payloads and API-owned fields.
- [ ] Review known source conflicts: `BookingPage.jsx` uses `200000` as display/print/payment fallback; `PatientProfilesPage.jsx` synthesizes queue/code labels; home has generated doctor portraits. Identify display-only placeholders that can be changed without altering submitted data or business behavior. If removing a fallback changes payment calculation/eligibility, clinical input or workflow, stop that lane and obtain a separate approved scope. Do not silently change policy or promote affected screens as passing.

### Task 2: Refresh specialty, date/slot and confirmation hierarchy

**Files:**
- Modify: `hospital-ui/src/pages/customer/BookingPage.jsx`
- Create: `hospital-ui/src/test/PatientBookingRefresh.test.jsx`
- Existing regression tests: `hospital-ui/src/test/bookingPayment.test.js`, `hospital-ui/src/test/BookingReceptionPaymentDispatchFlow.test.jsx`, `hospital-ui/src/test/PaymentQRModal.test.jsx`

**Interfaces:** Retain current handlers, selected IDs, reservation lifecycle, QR callbacks and endpoint DTOs. Consume existing `designTokens` from `hospital-ui/src/theme/designTokens.js`; no new calendar/API abstraction or dependency.

- [ ] Add static-render test `rendersHeadingAndFiveStages`: with mocked `useAuth` and `MemoryRouter`, assert booking heading, five stage labels and primary step control. Add `doesNotRenderInventedInitialFee`: empty initial state has no fabricated `200.000` displayed fee. Run `npm --prefix hospital-ui test -- src/test/PatientBookingRefresh.test.jsx` and record failing new assertions before editing; diagnose baseline failures first.
- [ ] Use a wide selection area plus compact selected-context summary; stack on narrow screens. Retain specialty search, date input, doctor/session/slot choices, query entry, next/back controls and keyboard operation. Use TNT token surfaces/type/primary; keep semantic status colors.
- [ ] Separate department/schedule/profile loading, empty, error and retry views. Apply only approved display-only missing-value treatment from Task 1, including neutral avatar/initials when no real doctor image exists. Preserve current price/payment inputs pending separate approval if their semantics are unsafe.
- [ ] Execute browser checks `slotConflictOrExpiryPreservesTruth` (409/expiry has no false success), `changingDateDoesNotPresentPreviousSlotAsAvailable`, `missingFeeHasNoFabricatedDisplay` (missing/zero fixtures), `qrDismissalRemainsPending` and `walletFailureIsVisible`; compare request shape and payment transition to baseline. If current business behavior prevents acceptance, record BLOCKED with a concrete follow-up.
- [ ] Run `npm --prefix hospital-ui test -- src/test/PatientBookingRefresh.test.jsx src/test/bookingPayment.test.js src/test/BookingReceptionPaymentDispatchFlow.test.jsx src/test/PaymentQRModal.test.jsx` and `npm --prefix hospital-ui run build`; expected focused assertions pass and Vite exits zero.

### Task 3: Align entry, profile choice and appointment follow-up

**Files:**
- Modify: `hospital-ui/src/pages/patient/HomePage.jsx`, `hospital-ui/src/pages/patient/PatientProfilesPage.jsx`
- Conditional layout-only touchpoint: `hospital-ui/src/components/common/AddOrLinkPatientProfileModal.jsx`
- Extend: `hospital-ui/src/test/PatientBookingRefresh.test.jsx`, `hospital-ui/src/test/patientProfileFlow.test.js`
- Read-only regression contract: `hospital-ui/src/utils/printHelper.js`

**Interfaces:** Keep home `/booking?departmentId=...` handoff, existing profile CRUD/link callbacks, route aliases, `bookingApi.getMyBookings()`, `cancelBooking(bookingId)` and print helper signatures. Do not modify records/notification logic inside the large profiles page.

- [ ] Add `homeExposesClearBookingEntry` static assertion and record browser cases `longFamilyIdentityRemainsReadable`, `missingJourneyDoesNotInventQueueOrCode`, `cancelFailureKeepsBooking`, `keyboardZoomKeepsNextActionReachable` with exact Review Focus conditions.
- [ ] Prioritize booking CTA and existing account/profile handoff; group profile identity, appointment date/time, backend status and next permitted action. Replace verified display-only generated doctor/room/queue/code values with missing-data copy; keep returned zero and original IDs. Preserve underlying mutation and cancellation behavior.
- [ ] Validate profile create/link return, long family names, successful/cancel-failed appointments, print preview and all viewport/focus states. Print must not present placeholders as real ticket identifiers; if print truthfulness needs broader behavior changes, report the gate.
- [ ] Run `npm --prefix hospital-ui test -- src/test/PatientBookingRefresh.test.jsx src/test/patientProfileFlow.test.js src/test/printHelper.test.js`, build and `node scripts/generate-brand-tokens.mjs --check`. Finish independent review and report before Phase 2 selection.

## Acceptance, evidence and resume handoff

- [ ] Every refreshed screen exposes title, current state and permitted primary action; prove loading, empty, error, success and disabled states with synthetic fixtures.
- [ ] Capture web baseline/final at 1440×900, 1024×768 and 390×844, keyboard-only operation, 200% zoom and small-height dialogs. Native phase additionally requires 360×800 and 390×844 device/emulator profiles, font scales 1.0/1.5/2.0, keyboard visible and safe areas.
- [ ] Run the same synthetic primary task three times before/after; record raw completion times, median, success and wrong turns. Acceptance requires completion, no added wrong turns and reachable primary action; timings are observational, not an invented improvement target.
- [ ] Save revision/dirty baseline, owned files/hunks, exact commands and exit results, request identity/state observations, screenshots, scenario outcomes and unresolved limitations in the named phase report. Static rendering/build alone cannot prove async interaction or role safety.
- [ ] Independent validation and user review must pass before successor activation. Recommend a logical owned-hunk code/test commit checkpoint; never blanket-stage the dirty tree. No publication/deployment is authorized.
- [ ] After user enters UPDATE PROCESS, archive this accepted phase, update umbrella/router and capture durable learnings before selecting its exact successor. Blocked/partially verified phases stay active.

**Resume:** Read approved spec, this plan, brand contract, prior phase report and actual diff. Reconcile touchpoints and external prerequisites against current source; checked boxes require recorded evidence. Material scope changes require renewed phase approval. Report FAILED/BLOCKED honestly rather than opening a successor.

**Planning self-review (08-11-2026):** Workflow, tokens, data truthfulness and role constraints mapped to tasks; five Review Focus conditions assigned to checks; file paths/interfaces verified against current source. No product code, tests, build or lint executed in PLAN.

