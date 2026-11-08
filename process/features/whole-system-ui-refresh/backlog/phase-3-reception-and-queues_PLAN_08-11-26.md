# Phase 3 Reception and Queues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify profile confirmation, counter tickets, exam queues and room dispatch for nurses/front desk.

**Architecture:** Refresh existing MUI reception, counter and public queue views in place. Preserve current lookup, payment verification and dispatch controllers; do not alter the shared clinical shell.

**Tech Stack:** React 18.3, MUI 6.4, Vite, Axios, Vitest

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

- Several matching profiles: Task 3 selectCorrectCandidate requires explicit choice using name/birth/identifiers; no silent wrong person.
- Counter and exam tickets share a number: Task 3 distinguishTicketTypes keeps labels separate.
- Payment paid but dispatch fails: Task 3 paidDispatchFailureRetriesOnlyDispatch sends no second payment.
- Queue refresh fails/missing room: Task 3 queueFailureStaysVisible shows error/unknown rather than empty-success or invented room.
- Narrow POS/long identity/keyboard: Task 3 posDialogRemainsReachable preserves scroll and confirmation.

---

## Scope, dependencies and blast radius

**Status and gates:** BACKLOG — depends on Phase 2 accepted report; re-research source and obtain execution approval before activation.

**Blast radius:** /nurse/reception, /kiosk, /queue-display and ticket modal; no inpatient edits until Phase 4. Public views must not expose additional patient fields.

**Prior workflow reference:** `process/general-plans/completed/nurse-workflow-and-ui-enhancement_PLAN_02-11-26.md`

**Report:** `process/features/whole-system-ui-refresh/reports/phase-3-reception-and-queues-report_08-11-26.md`

### Task 1: Revalidate workflow and owned scope

**Files:** Read scope files below, `hospital-ui/src/routes/AppRoutes.jsx`, `hospital-ui/src/routes/ProtectedRoute.jsx`, `hospital-ui/src/theme/designTokens.js`, and `process/general-plans/completed/nurse-workflow-and-ui-enhancement_PLAN_02-11-26.md`; create the phase report during validation.
**Interfaces:** Keep NurseReceptionPage(), current CounterManagementPanel props/callbacks, handleSearchOldPatient and existing call/payment/dispatch handlers. Distinguish ticketCode/counterTicketCode from bookingQueueCode/queueCode; preserve isVerified gate and dispatch-only retry. Routes remain nurse/admin protected with public kiosk/display boundaries unchanged.

- [ ] Re-read current source and prior accepted phase report; document exact API/role predicates, current controller behavior and owned hunks. Historical completed plans are invariants, not evidence current source passes.
- [ ] Record baseline synthetic happy path and five Review Focus inputs, with request identity/state and screenshot evidence. Reconcile known fabricated/missing-value behavior before layout changes.
- [ ] Present any material scope conflicts after read-only research. Display-only placeholder treatment is allowed only with verified semantics; clinical defaults, payment calculation, state transitions or server policy changes require a separate approved scope. A blocked lane prevents a PASSED phase.

### Task 2: Refresh the scoped workspace

**Files:**
- Modify: `hospital-ui/src/pages/nurse/NurseReceptionPage.jsx`
- Modify: `hospital-ui/src/components/nurse/CounterManagementPanel.jsx`
- Modify: `hospital-ui/src/pages/KioskPage.jsx`
- Modify: `hospital-ui/src/pages/QueueDisplayPage.jsx`
- Modify: `hospital-ui/src/components/kiosk/ThermalTicketModal.jsx`

**Tests:**
- Extend: `hospital-ui/src/test/NurseReceptionPageWorkflow.test.jsx`
- Extend: `hospital-ui/src/test/CounterManagementPanel.test.jsx`
- Extend: `hospital-ui/src/test/BookingReceptionPaymentDispatchFlow.test.jsx`

**Interfaces:** Preserve all current exports/callback argument shapes and request DTOs from Task 1. Consume `designTokens` through current adapter; introduce no API abstraction, global theme reset or dependency.

- [ ] Add `receptionRetainsPermittedPrimaryActions` in `hospital-ui/src/test/NurseReceptionPageWorkflow.test.jsx` using existing `renderToStaticMarkup`, mocked auth and `MemoryRouter` conventions. Assert workspace title and primary action for permitted role; assert forbidden role actions absent. Run `npm --prefix hospital-ui test -- src/test/NurseReceptionPageWorkflow.test.jsx src/test/CounterManagementPanel.test.jsx src/test/BookingReceptionPaymentDispatchFlow.test.jsx` before editing and record new assertions failing. Retain meaningful existing permission/behavior expectations when display copy changes.
- [ ] Organize lookup/profile confirmation, reception queue and room-load panels; show current patient, ticket type, room/status and next permitted action. Retain current tabs, call/recall, filters, request payloads and payment/dispatch controls. Improve kiosk/ticket/display typography and token usage without adding identifiers or clinical details.
- [ ] Separate loading, empty, error/retry, success and disabled presentation in touched views. Keep selected identity and current draft/modal behavior; do not convert failure into successful empty data or zero metrics.
- [ ] Run `npm --prefix hospital-ui test -- src/test/NurseReceptionPageWorkflow.test.jsx src/test/CounterManagementPanel.test.jsx src/test/BookingReceptionPaymentDispatchFlow.test.jsx` and `npm --prefix hospital-ui run build`; expected focused tests pass and Vite exits zero. Diagnose pre-existing failures and report separately.

### Task 3: Verify loaded states, mutations and role boundaries

**Files:** Owned UI/test hunks above; evidence in `process/features/whole-system-ui-refresh/reports/phase-3-reception-and-queues-report_08-11-26.md`.
**Interfaces:** Browser interactions cover loaded data/effects/handlers. Static server rendering cannot prove these behaviors.

- [ ] Run named browser cases `selectCorrectCandidate`, `distinguishTicketTypes`, `paidDispatchFailureRetriesOnlyDispatch`, `queueFailureStaysVisible`, `posDialogRemainsReachable` against the corresponding Review Focus input; record exact visible state, outgoing request identity/value and backend success/failure before marking passed. Use synthetic staging records or authorized intercepts; no production fixture switches.
- [ ] Verify happy path and failed mutation on each scoped screen; confirm direct disallowed routes still reject access, current permitted links resolve, and focus/zoom/viewport matrix passes. Clinical/financial truthfulness conflicts remain blockers until separately resolved.
- [ ] Run `npm --prefix hospital-ui test -- src/test/NurseReceptionPageWorkflow.test.jsx src/test/CounterManagementPanel.test.jsx src/test/BookingReceptionPaymentDispatchFlow.test.jsx`, `npm --prefix hospital-ui run build`, `node scripts/generate-brand-tokens.mjs --check` and record exit evidence. Shared-layout changes also require patient/nurse/doctor/lab/cashier/pharmacist/head/admin navigation regression.
- [ ] Independent validator reviews five failure cases, functional evidence, screenshots and owned diff; write PASSED/FAILED/BLOCKED with omissions. Only user-accepted PASSED unlocks the successor.

## Acceptance, evidence and resume handoff

- [ ] Every refreshed screen exposes title, current state and permitted primary action; prove loading, empty, error, success and disabled states with synthetic fixtures.
- [ ] Capture web baseline/final at 1440×900, 1024×768 and 390×844, keyboard-only operation, 200% zoom and small-height dialogs. Native phase additionally requires 360×800 and 390×844 device/emulator profiles, font scales 1.0/1.5/2.0, keyboard visible and safe areas.
- [ ] Run the same synthetic primary task three times before/after; record raw completion times, median, success and wrong turns. Acceptance requires completion, no added wrong turns and reachable primary action; timings are observational, not an invented improvement target.
- [ ] Save revision/dirty baseline, owned files/hunks, exact commands and exit results, request identity/state observations, screenshots, scenario outcomes and unresolved limitations in the named phase report. Static rendering/build alone cannot prove async interaction or role safety.
- [ ] Independent validation and user review must pass before successor activation. Recommend a logical owned-hunk code/test commit checkpoint; never blanket-stage the dirty tree. No publication/deployment is authorized.
- [ ] After user enters UPDATE PROCESS, archive this accepted phase, update umbrella/router and capture durable learnings before selecting its exact successor. Blocked/partially verified phases stay active.

**Resume:** Read approved spec, this plan, brand contract, prior phase report and actual diff. Reconcile touchpoints and external prerequisites against current source; checked boxes require recorded evidence. Material scope changes require renewed phase approval. Report FAILED/BLOCKED honestly rather than opening a successor.

**Planning self-review (08-11-2026):** Workflow, tokens, data truthfulness and role constraints mapped to tasks; five Review Focus conditions assigned to checks; file paths/interfaces verified against current source. No product code, tests, build or lint executed in PLAN.

