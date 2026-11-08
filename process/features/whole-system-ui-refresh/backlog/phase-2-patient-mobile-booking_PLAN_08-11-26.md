# Phase 2 Patient Mobile Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align patient-native booking, profile choice and appointment tracking with the accepted web workflow and the current release window.

**Architecture:** Keep Expo Router screens and existing injected services intact. Adapt hierarchy with React Native tokens, safe areas and scrolling rather than translating MUI markup.

**Tech Stack:** Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6, Expo Router, Jest/RNTL

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

- Hold expiry/409/back/double tap: Task 2 preserves reserve/release and reports conflict without duplicate success.
- Missing journey/payment data: Task 3 retains missing-value labels rather than inferred paid/check-in/queue states.
- Large fonts/keyboard/safe areas: Task 2/3 preserves reachable controls and targets at least 44 dp.
- Fixed date/no schedules: Task 2 uses actual local current date when no test override exists and never invents slots.
- Release freeze/unverified iOS: Task 1/3 records real platform coverage and external blockers rather than claiming dual-platform acceptance.

---

## Scope, dependencies and blast radius

**Status and gates:** BACKLOG — Phase 1 acceptance plus release-window reconciliation required. Existing patient-mobile Phase 5–7/parity reports say PASSED despite active filenames; Phase 8 iOS and Phase 9 store release remain separate gates. Do not duplicate, archive or execute those plans here.

**Blast radius:** Patient home, booking routes, profile choice and appointments/journey only. No auth/notifications/billing features, staff app, EAS submission, build release or store publication.

**Prior workflow reference:** `process/features/patient-mobile-app/references/brand-design-contract.md` and existing patient-mobile release/parity plans; see Task 1.

**Report:** `process/features/whole-system-ui-refresh/reports/phase-2-patient-mobile-booking-report_08-11-26.md`

### Task 1: Reconcile release ownership before app changes

**Files:** Read `hospital-mobile/AGENTS.md`, `hospital-mobile/package.json`, `hospital-mobile/docs/release-checklist.md`, `process/features/patient-mobile-app/active/patient-mobile-app-follow-up_UMBRELLA_PLAN_07-11-26.md`, Phase 5–9/parity plans and reports; create the phase report named below during validation.

**Interfaces:** Existing `SchedulesApi.listSchedules(departmentId:number,date:string):Promise<Schedule[]>`, `ReservationsApi.reserveSlot(timeSlotId:string,patientProfileId:string):Promise<SlotReservation>` and `BookingApi.createBooking(input:BookingCreateRequest):Promise<Booking>` remain unchanged. Expo dependency is `~58.0.23`; consult matching versioned Expo docs before touching Expo/RN APIs per nested AGENTS.

- [ ] Record actual candidate revision/build, freeze status, available devices and release owner. Reconcile Phase 5–7/parity historical claims and Phase 8/9 prerequisites; if a candidate is frozen, defer UI work or obtain an explicit separate candidate boundary.
- [ ] Capture Android baseline for department/date/slot/profile/symptoms/hold/confirm/list/detail/cancel; record iOS availability separately. This plan does not repeat release readiness, push/auth work or store submission.

### Task 2: Refresh native booking selection and confirmation

**Files:**
- Modify: `hospital-mobile/src/app/(patient)/index.tsx`, `hospital-mobile/src/app/(patient)/booking/index.tsx`, `hospital-mobile/src/app/(patient)/booking/[departmentId].tsx`, `hospital-mobile/src/app/(patient)/booking/slot/[timeSlotId].tsx`
- Create: `hospital-mobile/src/features/booking/__tests__/booking-refresh-screens.test.tsx`
- Read-only contracts: `hospital-mobile/src/features/booking/booking.types.ts`, `schedules.api.ts`, `reservations.api.ts`, `booking.api.ts` in that same directory

**Interfaces:** Retain `DepartmentSchedulesScreenProps {api?:SchedulesApi;departmentIdOverride?:number;initialDate?:string}` and `SlotReservationScreenProps {timeSlotIdOverride?:string;profilesService?:ProfilesApi;reservationsService?:ReservationsApi;bookingService?:BookingApi;onConflictRefresh?:()=>Promise<void>|void}`. Overrides remain injectable for tests; routes/opaque IDs and submission DTO stay intact.

- [ ] Add RNTL tests `defaultsToDeviceLocalToday` (fake clock on a different date), `showsScheduleErrorDistinctFromEmpty`, `keepsSelectedProfileIdentity`, `disablesDuplicateSubmitWhilePending`, `shows409WithoutSuccess`. Run `npm --prefix hospital-mobile test -- --runInBand booking-refresh-screens` and capture expected new failures.
- [ ] Make booking the clear home action and show selected context/one next action on each current screen. Replace the source's fixed `initialDate = '2026-11-08'` with device-local current date when no override is provided, preserving YYYY-MM-DD requests.
- [ ] Clarify loading/empty/error/retry/hold/conflict/submitting states without changing reservation lifecycle, required symptoms, selected IDs or navigation. Retain existing cancel/unmount/failure release behavior. Keep native back, wrapping text, 44 dp targets and scroll-to-action with keyboard visible.
- [ ] Run `npm --prefix hospital-mobile test -- --runInBand booking-refresh-screens schedules.api reservations.api booking.api` and `npm --prefix hospital-mobile run typecheck`; expected focused suites pass and TypeScript exits zero. No dependency upgrades to mask failures.

### Task 3: Align appointment/profile presentation and validate native behavior

**Files:**
- Modify: `hospital-mobile/src/app/(patient)/appointments/index.tsx`, `hospital-mobile/src/app/(patient)/appointments/[bookingId].tsx`, `hospital-mobile/src/features/booking/components/BookingJourney.tsx`, `hospital-mobile/src/app/(patient)/profiles/index.tsx`, `hospital-mobile/src/features/profiles/components/ProfileCard.tsx`
- Extend: `hospital-mobile/src/features/booking/__tests__/booking-refresh-screens.test.tsx`

**Interfaces:** Preserve `BookingJourneyProps {booking:Booking}`; nullable `isPaid`, `queueCode`, `counterTicketCode`, `checkedInAt`, `dispatchedAt`, `roomName` remain missing when not supplied. Preserve profile APIs and cancel confirmation/refetch behavior.

- [ ] Add `doesNotInferMissingJourneyFields` (omit nullable fields; expect “Chưa có dữ liệu”), `cancelFailureDoesNotRemoveAppointment` and `wrapsLongJourneyAndPatientLabels`; run focused suite before presentation edits.
- [ ] Group appointment identity/date/time, booking/payment/queue states and permitted next action; distinguish counter ticket from exam queue. Do not infer payment readiness or introduce wallet/reminder functionality.
- [ ] Run focused Jest, `npm --prefix hospital-mobile run typecheck`, `npm --prefix hospital-mobile run lint` and `node scripts/generate-brand-tokens.mjs --check`. Record pre-existing tooling failures separately.
- [ ] Verify synthetic create/cancel/expiry on Android and available iOS build at specified font scales/keyboard/safe-area settings. Record iOS blockers explicitly and obtain disposition for partial-platform validation before promotion; no store action is authorized.

## Acceptance, evidence and resume handoff

- [ ] Every refreshed screen exposes title, current state and permitted primary action; prove loading, empty, error, success and disabled states with synthetic fixtures.
- [ ] Capture web baseline/final at 1440×900, 1024×768 and 390×844, keyboard-only operation, 200% zoom and small-height dialogs. Native phase additionally requires 360×800 and 390×844 device/emulator profiles, font scales 1.0/1.5/2.0, keyboard visible and safe areas.
- [ ] Run the same synthetic primary task three times before/after; record raw completion times, median, success and wrong turns. Acceptance requires completion, no added wrong turns and reachable primary action; timings are observational, not an invented improvement target.
- [ ] Save revision/dirty baseline, owned files/hunks, exact commands and exit results, request identity/state observations, screenshots, scenario outcomes and unresolved limitations in the named phase report. Static rendering/build alone cannot prove async interaction or role safety.
- [ ] Independent validation and user review must pass before successor activation. Recommend a logical owned-hunk code/test commit checkpoint; never blanket-stage the dirty tree. No publication/deployment is authorized.
- [ ] After user enters UPDATE PROCESS, archive this accepted phase, update umbrella/router and capture durable learnings before selecting its exact successor. Blocked/partially verified phases stay active.

**Resume:** Read approved spec, this plan, brand contract, prior phase report and actual diff. Reconcile touchpoints and external prerequisites against current source; checked boxes require recorded evidence. Material scope changes require renewed phase approval. Report FAILED/BLOCKED honestly rather than opening a successor.

**Planning self-review (08-11-2026):** Workflow, tokens, data truthfulness and role constraints mapped to tasks; five Review Focus conditions assigned to checks; file paths/interfaces verified against current source. No product code, tests, build or lint executed in PLAN.

