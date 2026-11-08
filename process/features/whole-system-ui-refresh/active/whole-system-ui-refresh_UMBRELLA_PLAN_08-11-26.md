# Whole System UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve TNT patient and staff workflows one accepted phase at a time across patient web/mobile and staff/admin web.

**Architecture:** Preserve existing React/MUI and Expo/React Native controllers, APIs and role boundaries. Apply workflow-specific hierarchy and extract shared UI only when a phase needs it; no independent global-foundation redesign. This umbrella coordinates six explicit phase plans rather than authorizing a whole-system implementation pass.

**Tech Stack:** React 18.3/MUI 6.4/Vite 6.1 web; Expo SDK 58/React Native 0.88/TypeScript mobile; existing Axios, Vitest/Jest and Recharts.

**Spec:** `docs/superpowers/specs/2026-11-08-whole-system-ui-refresh-design.md`, approved by user on 08-11-2026. Its historical draft label does not override conversation approval.

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

- Invented clinical/financial/status data: phase-specific source review and missing-value checks must block affected acceptance when display semantics cannot be safely separated.
- Unauthorized role actions: every web phase retains current route/menu/action predicates and tests disallowed direct navigation.
- Mobile release drift: Phase 2 reconciles candidate/freeze and iOS/Android evidence with existing release plans; no duplicate release program.
- Narrow views/keyboard/large fonts: every phase records reachable primary action and identity/status context at its acceptance viewport matrix.
- Dirty baseline and stale reports: every phase identifies owned hunks/current revision; historical PASSED counts and active filenames are not current validation.

---

## Approved decisions and reference

- User chose workflow-by-workflow improvement for the whole system, including patient web/native and staff/admin web; native staff screens are excluded.
- Approved sequence is web booking → mobile booking aligned with release schedule → reception/queues → doctor/lab/inpatient → cashier/pharmacy → department head/admin.
- Approved prototype: [workflow-mockups.html](C:/Users/ASUS/.codex/visualizations/2026/11/08/01a1bbe7-03ec-73a0-9c28-6b60b8ea8094/.superpowers/brainstorm/15513c5fbd604329b67d0153b01ea658/content/workflow-mockups.html). It demonstrates hierarchy and layout with placeholders; it is not a data source, API contract or requirement to copy The Duck styling.
- Preserve TNT brand contract, current technology, APIs/security and business rules. Do not add wallet/reminder features, fake doctor images as real portraits, fabricated metrics or clinical values.

## Program inventory and single selected plan

| Phase | Plan | State and gate | Working outcome |
|---|---|---|---|
| 1. Patient Web Booking | [Phase 1](phase-1-patient-web-booking_PLAN_08-11-26.md) | **SELECTED NEXT; no execution approval** | Make web booking entry, selection, profile confirmation and appointment follow-up clear without changing business rules. |
| 2. Patient Mobile Booking | [Phase 2](../backlog/phase-2-patient-mobile-booking_PLAN_08-11-26.md) | BACKLOG; prior phase accepted and own research/approval required | Align patient-native booking, profile choice and appointment tracking with the accepted web workflow and the current release window. |
| 3. Reception and Queues | [Phase 3](../backlog/phase-3-reception-and-queues_PLAN_08-11-26.md) | BACKLOG; prior phase accepted and own research/approval required | Clarify profile confirmation, counter tickets, exam queues and room dispatch for nurses/front desk. |
| 4. Clinical Lab and Inpatient | [Phase 4](../backlog/phase-4-clinical-lab-and-inpatient_PLAN_08-11-26.md) | BACKLOG; prior phase accepted and own research/approval required | Clarify selected-patient context and workflow state for doctor, lab and inpatient work. |
| 5. Cashier and Pharmacy | [Phase 5](../backlog/phase-5-cashier-and-pharmacy_PLAN_08-11-26.md) | BACKLOG; prior phase accepted and own research/approval required | Clarify pending collection, verified reconciliation and prescription dispensing without changing financial or stock policy. |
| 6. Department Head and Admin | [Phase 6](../backlog/phase-6-department-head-and-admin_PLAN_08-11-26.md) | BACKLOG; prior phase accepted and own research/approval required | Clarify role-scoped management navigation, filters, staff schedules and backend metrics. |

**The only selected next execution plan is:**
`process/features/whole-system-ui-refresh/active/phase-1-patient-web-booking_PLAN_08-11-26.md`.

The umbrella is an orchestration artifact, not an executable phase. Future phases stay in backlog until their predecessor passes independent validation/user review and explicit phase selection. No EXECUTE approval exists for any phase.

## Current source and active-plan evidence

Read-only planning consulted actual web booking/home/profile/controller code, AppRoutes and layouts, reception/counter/public queue source, doctor/lab/inpatient source, cashier/pharmacy service/page source and management pages, package scripts and existing test patterns. It also consulted completed nurse, clinical, wallet/payment/reconciliation and admin role plans plus mobile Phase 2, architecture/token contract and release umbrella.

- `process/general-plans/active/` has no active plan files in this checkout. Other current feature inventory is patient-mobile-app and production-safety-hardening.
- Patient-mobile active inventory includes follow-up umbrella; Phase 5 baseline/Android, Phase 6 auth, Phase 7 push, Phase 8 iOS, Phase 9 release, and brand parity. Their report/state drift is preserved for the owning workflow to reconcile.
- Existing mobile Phase 5–7/parity reports claim PASSED. iOS remains externally constrained; do not infer store readiness or current build validation.
- The supplied AGENTS protocol routers/role files and `process/context/tests/all-tests.md` / `process/context/planning/example-complex-prd.md` are absent here. Plans use pasted AGENTS rules, actual package scripts, current test patterns and writing-plans instructions; do not invent missing procedures.
- Numerous product and documentation files are pre-existing dirty/untracked, including the context router. Preserve their contents and stage only owned hunks in later execution.

## Cross-phase risks and decision gates

1. **Web fabricated fee/data:** `BookingPage.jsx` uses `200000` in display/print and payment amount fallback; profile history synthesizes queue/code labels and home uses generated portraits. Phase 1 must separate verified display-only treatment from calculation/workflow changes. The latter require a separate approved scope; affected acceptance stays blocked until resolved.
2. **Clinical numeric templates:** `LabTestResultsPage.jsx` auto-populates `STANDARD_LAB_PANELS` numeric values and exposes `handleApplyAbnormalScenario`. Phase 4 approval is for UI hierarchy, not modifying clinical entry/simulation/save behavior. Review and separately approve safety remediation if values can be mistaken for patient results; do not hide this conflict in a PASSED report.
3. **Mobile date/release:** schedule screen uses fixed default `2026-11-08`; Phase 2 plans current-local-date presentation while retaining injected test override. Release freeze and platform proof remain separate gates; iOS unavailability cannot be labeled a pass.
4. **Shared layouts:** Phase 6 owns staff/admin menu hierarchy changes and must recheck every prior role. Earlier phases keep shared navigation/theme contracts intact.
5. **Partial validation:** static server-render tests cannot cover loaded-data interactions and native mocks cannot prove touch/focus/safe-area behavior. Screenshot/task/network evidence and independent validation are required.

## Operating loop per phase

**Actor ownership:** Orchestrator selects one phase and delegates read-only research to `vc-research-agent`, approved implementation to `vc-execute-agent`, and independent verification to `vc-tester` / `vc-code-reviewer`; durable cleanup is routed to `vc-update-process-agent` only after the user's UPDATE PROCESS command. If role files remain absent, use equivalent explicitly scoped subagent prompts and preserve these phase restrictions.

### Task A: Research and execution boundary

- [ ] Read selected phase, approved spec, relevant current source, prior phase report and actual dirty diff; follow available context routing.
- [ ] Reconcile exact touchpoints, data semantics, role predicates, blockers and release prerequisites. Record any required separate safety/behavior scope before implementation.
- [ ] Present the single phase boundary and require explicit `ENTER EXECUTE MODE` naming its exact plan. Do not infer authorization from this umbrella.

### Task B: Implement and validate one phase

- [ ] Execute only its tasks/owned hunks using the selected execution method; preserve existing business interfaces.
- [ ] Run its focused commands and role-specific synthetic walkthrough; independent validator checks functional evidence/screens/diff.
- [ ] Write its exact report under `process/features/whole-system-ui-refresh/reports/` with PASSED/FAILED/BLOCKED, command outputs, viewport/device screenshots, task observations, revision and omissions. Never promote a blocker to success.

### Task C: Durable closeout before successor

- [ ] Present selected path, completion classification, finished scope, verified/unverified items, owned dirty-file count and logical commit checkpoint.
- [ ] After explicit UPDATE PROCESS command, archive accepted phase to completed, capture durable context and reconcile this umbrella/router. Do not archive existing patient-mobile release/parity plans as part of this program.
- [ ] Move only the next accepted successor from backlog to active; update links and make it the single selected phase, then repeat research and explicit execution approval. If release freeze blocks Phase 2, record the blocker; reordering requires explicit user approval.

## Verification commands and evidence ownership

Commands below are execution-time checks, not PLAN results. Specific phase plans name exact test files and browser/device scenarios.

- Web: `npm --prefix hospital-ui test -- <phase test paths>`, `npm --prefix hospital-ui run build`.
- Mobile: `npm --prefix hospital-mobile test -- --runInBand <phase test patterns>`, `npm --prefix hospital-mobile run typecheck`, `npm --prefix hospital-mobile run lint`.
- Brand: `node scripts/generate-brand-tokens.mjs --check`.
- Run no backend tests unless a separately approved backend change exists; none is in scope here.
- Evidence must use synthetic accounts/data and preserve actual missing/error/zero states. No real clinical data in fixtures/screenshots.

## Program acceptance and resume handoff

- All six phase reports independently validated and user accepted; any separate safety blocker resolved under its own approval.
- No altered API/auth/role/business policy, fake operational data, inaccessible primary actions or brand/token drift.
- Phase 2 honestly distinguishes Android/iOS coverage and release candidate readiness; this program never authorizes submission/publication.
- Resume by reading umbrella and the sole selected Phase 1 plan, not by selecting from other feature active filenames. Re-research current source; preserve unrelated work.
- Planning self-review checked spec coverage, five review conditions, path/signature consistency, selected-plan uniqueness and phased scope. No source implementation or tests were run. Future plans are explicit source-based boundaries, subject to mandatory phase-entry reconciliation.

