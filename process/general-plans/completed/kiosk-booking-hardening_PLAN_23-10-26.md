# Kiosk booking and appointment management — implementation plan

**Mode:** PLAN  
**Date:** 23-10-2026  
**Status:** ARCHIVED — execution complete; DB/integration verification remains pending

## Goal

Make walk-in kiosk booking and check-in consistent across kiosk, API, database, and staff UI, while enforcing the confirmed business rules:

- A successful walk-in creates one `Booking` and one counter ticket.
- If no doctor schedule or slot capacity is available, return a clear “hết chỗ, thử lại sau” result and create neither record.
- Priority age threshold is 65, enforced by the backend and shown consistently in the kiosk.
- Persist check-in state and continue supporting lookup by booking code or phone.
- Only `ROLE_ADMIN` may reschedule or cancel bookings.
- Booking/check-in date and time decisions use `Asia/Ho_Chi_Minh`.

Symptoms/insurance persistence is out of scope beyond current behavior.

## Implementation sequence

1. **Protect the kiosk submission path**
   - In `hospital-ui/src/pages/KioskPage.jsx`, remove only this page's second `POST /api/bookings/kiosk` fallback after a failed/timed-out `/api/counters/kiosk/dispatch`; show a retryable error instead. Do not remove or disable the `/api/bookings/kiosk` endpoint: `NurseReceptionPage.jsx` also calls it to create a reception booking. Keep the existing UI edits and make only targeted functional changes.
   - Add a stable idempotency key per submission attempt and pass it to the dispatch API. Reuse it on retry; generate a new key only for a new patient submission.
   - In `CounterController`, `CounterService` and `CounterServiceImpl`, make dispatch the single orchestration path. In one database transaction, validate availability, create the booking, then the counter ticket; roll back both on any failure. Persist a unique idempotency key and return the original result for a repeated request.

2. **Enforce appointment availability and age priority**
   - In `BookingServiceImpl` and the schedule/slot repositories, stop creating placeholder schedules or slots and stop falling back to an unrelated doctor/room. Select only an eligible schedule and slot for the requested department.
   - Make capacity reservation atomic under concurrency (row lock or conditional atomic update). Return a stable conflict response when no schedule or capacity exists; do not save a ticket or booking in that case.
   - Set the server-side elderly priority threshold to 65 and align the label in `KioskPage.jsx`. The backend remains authoritative regardless of client-submitted priority.

3. **Persist kiosk check-in**
   - Add a durable check-in timestamp/state to `Booking` and include it in the check-in response and staff clinical-queue response DTO. Display the persisted state in `NurseReceptionPage.jsx` so staff can distinguish kiosk check-in from a locally changed queue status. Keep booking-code and phone lookup behavior.
   - Make repeated check-in idempotent: return the existing booking/ticket result without allocating another queue number. Define a database migration/backfill for existing rows before adding any non-null constraints.
   - Keep check-in details in staff-authorized DTOs; do not add patient identifiers or check-in metadata to public queue projections. Verify the existing clinical queue endpoint's authorization before exposing this field.

4. **Admin-only booking changes**
   - Add admin-scoped list, reschedule and cancel endpoints (controller/service/repository) with dedicated validated request/response DTOs; avoid binding entities or accepting caller-controlled ownership/status fields. Validate target schedule/slot and capacity transactionally; reject changes for terminal/in-progress bookings according to existing status rules.
   - Enforce `ROLE_ADMIN` at the API/controller boundary (and confirm `SecurityConfig` matcher coverage), not only in the UI. Restrict the existing cancellation path so patients/staff cannot bypass the admin-only rule. Record the administrative change in the existing audit mechanism if available.
   - Add an admin booking-management page and its admin-only protected route. `App.jsx` is the composition root that mounts `BrowserRouter` and `AppRoutes`; the inspected route declarations are in `hospital-ui/src/routes/AppRoutes.jsx`. Update `AdminLayout.jsx` only for the navigation entry.

5. **Use Vietnam time consistently**
   - Provide a `Clock` configured for `Asia/Ho_Chi_Minh` and use it for booking date, check-in window, dispatch date, and admin booking operations instead of `LocalDate.now()`, `LocalTime.now()`, or `ZoneId.systemDefault()` in those paths.
   - Preserve the existing Jackson timezone setting and make container/test behavior deterministic where the application currently depends on the JVM default.

6. **Verify behavior**
   - Extend `BookingServiceTest` and add focused service/controller tests for capacity, missing schedule, rollback, duplicate idempotency key, and 64/65 priority boundary.
   - Cover durable and repeated check-in by code and phone, plus admin authorization, cancellation/reschedule status rules, and concurrent capacity attempts.
   - Run backend Maven tests, the frontend production build, and the existing kiosk scripts (`test_counter_kiosk_workflow.js`, `test_kiosk_checkin_and_lab_priority.js`, `test_module4_kiosk.js`) in an environment with the required database/API. Run `test_load_concurrency.js` only after adapting/confirming that it exercises the kiosk dispatch path.

## Expected touchpoints

- Kiosk/staff/admin UI: `hospital-ui/src/pages/KioskPage.jsx`, `hospital-ui/src/pages/nurse/NurseReceptionPage.jsx`, `hospital-ui/src/routes/AppRoutes.jsx` (route declarations; mounted by `App.jsx`), `hospital-ui/src/layouts/AdminLayout.jsx`, new `hospital-ui/src/pages/admin/BookingManagePage.jsx`.
- API and security: keep `POST /api/bookings/kiosk` operational for reception; change only the kiosk page's fallback use. Update `BookingController`, `CounterController`, `SecurityConfig`, booking/counter services and request/response/queue DTOs under `hospital-api/src/main/java/com/hospital/api/`.
- Persistence/time: `Booking`, `CounterTicket`, `TimeSlot` and relevant repositories; `application.yml` or configuration for the `Clock`; database migration/schema artifacts if present.
- Verification: `BookingServiceTest`, new focused service/controller tests, and the existing kiosk/concurrency scripts listed above.

## Acceptance criteria

- One successful kiosk submit/retry yields exactly one booking and one counter ticket; a lost response followed by the same idempotency key does not duplicate either.
- Full capacity or missing schedule yields the retry-later error and leaves no partial booking, ticket, or capacity increment. Concurrent requests cannot exceed slot capacity.
- UI and backend both show/use age 65; backend correctly handles boundary ages 64 and 65.
- Check-in state survives reload/restart; code and phone lookup work; repeated check-in does not allocate another queue number; staff queue shows the persisted state after reload.
- Non-admin requests to admin list/change/cancel endpoints are rejected by the API; admin changes persist and obey slot capacity and booking status constraints. DTOs do not allow mass assignment of ownership or status.
- Booking/check-in date and time remain correct when the JVM timezone differs from Vietnam.
- Relevant automated checks pass; any tests requiring unavailable external services are reported separately.

## Risks and execution constraints

- A durable idempotency key and check-in marker may require schema changes. Confirm the repository’s actual migration/deployment mechanism before changing entity/schema definitions; preserve existing rows and avoid relying on production `ddl-auto` behavior.
- Capacity locking and transaction boundaries must cover the booking and ticket writes together; concurrent tests should use the same database engine/configuration as deployment where possible.
- `hospital-ui/src/pages/KioskPage.jsx`, `BookingRepository.java`, and multiple admin/UI files (including `App.jsx`, `AppRoutes.jsx`, `AdminLayout.jsx`, and `NurseReceptionPage.jsx`) are already modified in the working tree. Review the current diff immediately before execution and preserve all pre-existing edits; do not reset, replace, or format whole files. Route wiring and queue display changes must be applied surgically around those existing changes.
- `process/context/all-context.md`, `process/development-protocols/`, and the referenced plan examples are absent in this checkout, so this plan follows the available `AGENTS.md` convention and the prior flow audit. Confirm any additional local deployment/schema conventions during execution.

## Out of scope

- Persisting additional symptom or insurance data beyond current behavior.
- Reworking unrelated dashboards, reception workflows, or general timezone handling outside booking, check-in, dispatch, and appointment administration.

## Execution closeout — 23-10-2026

### Implemented

- Kiosk uses only `POST /api/counters/kiosk/dispatch` and preserves the same idempotency key for retries; the separate booking fallback was removed from the kiosk page.
- Dispatch writes one booking and one counter ticket within one transaction. Slot-capacity checks use a pessimistic slot lock; counter allocation serializes queue sequence and rechecks duplicate requests under lock.
- Missing schedule/full capacity returns conflict without a successful partial booking/ticket result. Priority threshold is 65.
- Check-in timestamp is persisted and repeat check-in by booking code/phone returns the existing queue result.
- Admin-only booking list, slot lookup, reschedule, and cancel endpoints/page were added; admin changes are audited.
- Booking/check-in/dispatch use `Asia/Ho_Chi_Minh` through the configured `Clock`.

### Verification completed

- Maven focused set: 20 tests passed (11 `BookingServiceTest`, 2 `CounterServiceIdempotencyTest`, 3 `KioskDispatchTransactionServiceTest`, 1 `FhirExportServiceTest`, 3 `ScheduleServiceTest`).
- Frontend production build passed; Vite reported a JavaScript chunk of about 2.318 MB.
- `node --check` passed for `test_counter_kiosk_workflow.js` and `test_module4_kiosk.js`; these scripts were not run against an API/database.
- Durable regression cases and evidence boundaries are recorded in `test-plans/kiosk_booking_hardening.md`.

### Verification not completed / operational follow-up

- No Spring/HTTP integration test or real DB concurrency test was run. The default datasource points to `localhost:5432/kmahos` and `ddl-auto:update`; it was not confirmed disposable, so DB-backed runs were avoided.
- A production profile using `ddl-auto:validate` requires an explicit schema migration for added fields. Migration application and compatibility with existing rows remain unverified.
- Kiosk endpoints remain public (`permitAll`); device authentication is outside this plan's implementation.
- Cancelling a booking does not currently void its linked counter ticket; confirm the business rule and add transactional behavior/test if required.

The plan is archived because the approved implementation scope and safe focused checks are complete. Archive status does not imply DB/API/concurrency verification or deployment readiness; use the matrix in `test-plans/kiosk_booking_hardening.md` against an isolated PostgreSQL environment to close those gaps.
