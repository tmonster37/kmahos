# Phase 4 Clinical Lab and Inpatient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify selected-patient context and workflow state for doctor, lab and inpatient work.

**Architecture:** Refresh role-specific clinical MUI pages without changing record/test/admission identities or clinical handlers. Keep doctor orders, nursing care and test results separate, retaining backend validation.

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

- Switching patient while results load: Task 3 activePatientContextStaysBound keeps context/data tied to active record.
- Pending/missing result and numeric lab presets: Task 1/3 missingLabIsNotNormal verifies no presented sample values masquerade as results; do not change clinical simulation/default behavior without separate approved scope.
- Nurse versus doctor permissions: Task 3 nurseCannotSeeDoctorMutations retains nursing-care access and restricts discharge/orders.
- Long prescription/order/result detail: Task 3 longClinicalDetailRemainsReadable preserves units, identity and warnings.
- Failed save/unsaved edits: Task 3 failedSaveIsVisible preserves draft behavior and shows no false success.

---

## Scope, dependencies and blast radius

**Status and gates:** BACKLOG — Phase 3 accepted report plus clinical-source risk review required. Existing numeric lab templates/simulations are a high-risk pre-existing conflict; affected lab acceptance is blocked until separately approved remediation or verified harmless display-only treatment.

**Blast radius:** Doctor examination/testing/prescription dialogs, lab results and inpatient workspace; no backend/clinical defaults/result generation changes.

**Prior workflow reference:** `process/general-plans/completed/clinical-workflows-and-inpatient-hardening_PLAN_02-11-26.md`

**Report:** `process/features/whole-system-ui-refresh/reports/phase-4-clinical-lab-and-inpatient-report_08-11-26.md`

### Task 1: Revalidate workflow and owned scope

**Files:** Read scope files below, `hospital-ui/src/routes/AppRoutes.jsx`, `hospital-ui/src/routes/ProtectedRoute.jsx`, `hospital-ui/src/theme/designTokens.js`, and `process/general-plans/completed/clinical-workflows-and-inpatient-hardening_PLAN_02-11-26.md`; create the phase report during validation.
**Interfaces:** Keep ExaminationPage(), LabTestResultsPage(), InpatientPage(), handleSelectPatient(patientItem), handleOpenModal(test), handleSaveTreatmentSheet() and current dialog props. Preserve /api/clinical/doctor/queue and current record/test operations, /doctor-orders versus /nursing-cares mapping, admission IDs and nurse/doctor role predicates.

- [ ] Re-read current source and prior accepted phase report; document exact API/role predicates, current controller behavior and owned hunks. Historical completed plans are invariants, not evidence current source passes.
- [ ] Record baseline synthetic happy path and five Review Focus inputs, with request identity/state and screenshot evidence. Reconcile known fabricated/missing-value behavior before layout changes.
- [ ] Present any material scope conflicts after read-only research. Display-only placeholder treatment is allowed only with verified semantics; clinical defaults, payment calculation, state transitions or server policy changes require a separate approved scope. A blocked lane prevents a PASSED phase.

### Task 2: Refresh the scoped workspace

**Files:**
- Modify: `hospital-ui/src/pages/Doctor/ExaminationPage.jsx`
- Modify: `hospital-ui/src/pages/Doctor/AssignTestsModal.jsx`
- Modify: `hospital-ui/src/pages/Doctor/PrescriptionModal.jsx`
- Modify: `hospital-ui/src/pages/Doctor/LabTestResultsPage.jsx`
- Modify: `hospital-ui/src/pages/Doctor/InpatientPage.jsx`
- Modify: `hospital-ui/src/pages/Doctor/EditVitalsModal.jsx`
- Modify: `hospital-ui/src/components/PacsViewerModal.jsx`

**Tests:**
- Extend: `hospital-ui/src/test/DoctorExaminationPage.test.jsx`
- Create: `hospital-ui/src/test/ClinicalUiRefresh.test.jsx`

**Interfaces:** Preserve all current exports/callback argument shapes and request DTOs from Task 1. Consume `designTokens` through current adapter; introduce no API abstraction, global theme reset or dependency.

- [ ] Add `clinicalWorkspaceRetainsRoleBoundActions` in `hospital-ui/src/test/ClinicalUiRefresh.test.jsx` using existing `renderToStaticMarkup`, mocked auth and `MemoryRouter` conventions. Assert workspace title and primary action for permitted role; assert forbidden role actions absent. Run `npm --prefix hospital-ui test -- src/test/DoctorExaminationPage.test.jsx src/test/ClinicalUiRefresh.test.jsx` before editing and record new assertions failing. Retain meaningful existing permission/behavior expectations when display copy changes.
- [ ] Group queue and selected-patient identity, clinical context, tests and next permitted action with distinct lab/inpatient density. Retain existing completion/test-cancel rules, required diagnosis, prescription checks and doctor/nurse separation. Document STANDARD_LAB_PANELS numeric initialization and handleApplyAbnormalScenario as a high-risk source conflict: do not edit their values, auto-fill, simulation or save behavior under UI approval. Stop affected lane and request separately approved safety scope when semantics cannot be preserved.
- [ ] Separate loading, empty, error/retry, success and disabled presentation in touched views. Keep selected identity and current draft/modal behavior; do not convert failure into successful empty data or zero metrics.
- [ ] Run `npm --prefix hospital-ui test -- src/test/DoctorExaminationPage.test.jsx src/test/ClinicalUiRefresh.test.jsx` and `npm --prefix hospital-ui run build`; expected focused tests pass and Vite exits zero. Diagnose pre-existing failures and report separately.

### Task 3: Verify loaded states, mutations and role boundaries

**Files:** Owned UI/test hunks above; evidence in `process/features/whole-system-ui-refresh/reports/phase-4-clinical-lab-and-inpatient-report_08-11-26.md`.
**Interfaces:** Browser interactions cover loaded data/effects/handlers. Static server rendering cannot prove these behaviors.

- [ ] Run named browser cases `activePatientContextStaysBound`, `missingLabIsNotNormal`, `nurseCannotSeeDoctorMutations`, `longClinicalDetailRemainsReadable`, `failedSaveIsVisible` against the corresponding Review Focus input; record exact visible state, outgoing request identity/value and backend success/failure before marking passed. Use synthetic staging records or authorized intercepts; no production fixture switches.
- [ ] Verify happy path and failed mutation on each scoped screen; confirm direct disallowed routes still reject access, current permitted links resolve, and focus/zoom/viewport matrix passes. Clinical/financial truthfulness conflicts remain blockers until separately resolved.
- [ ] Run `npm --prefix hospital-ui test -- src/test/DoctorExaminationPage.test.jsx src/test/ClinicalUiRefresh.test.jsx`, `npm --prefix hospital-ui run build`, `node scripts/generate-brand-tokens.mjs --check` and record exit evidence. Shared-layout changes also require patient/nurse/doctor/lab/cashier/pharmacist/head/admin navigation regression.
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

