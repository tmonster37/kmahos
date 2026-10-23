# Regression Test Plan: Kiosk Booking Hardening

**Scope:** kiosk walk-in booking, counter ticket dispatch, check-in persistence, appointment capacity, admin booking management, and the web/staff views that consume those records.

**Implementation plan:** [`kiosk-booking-hardening_PLAN_23-10-26.md`](../process/general-plans/completed/kiosk-booking-hardening_PLAN_23-10-26.md)

## Current verified behavior

- Kiosk dispatch uses `POST /api/counters/kiosk/dispatch`. The kiosk reuses one idempotency key on retry and does not fall back to a second booking POST.
- Dispatch creates one booking and one counter ticket in a transaction. Candidate slots are locked for capacity checking, and counter allocation serializes queue sequencing and checks idempotency again under lock.
- Missing schedule or full capacity returns a conflict; the unit tests check that no partial booking/ticket is written by the covered service paths.
- Priority age threshold is 65. `Booking.checkedInAt` is persisted; repeated check-in by booking code or phone keeps the existing check-in result and queue number.
- Booking/admin time calculations use `Asia/Ho_Chi_Minh` through an injected `Clock`.
- Admin booking list, available-slot, reschedule, and cancel APIs are protected by `ROLE_ADMIN`; the web management page is under the admin route.

## Automated checks

Run from `hospital-api/` with Maven and the same test selector used for the verified focused run:

```powershell
mvn.cmd -Dmaven.compiler.fork=true -Dnet.bytebuddy.experimental=true '-DargLine=-Dnet.bytebuddy.experimental=true' '-Dtest=BookingServiceTest,CounterServiceIdempotencyTest,KioskDispatchTransactionServiceTest,FhirExportServiceTest,ScheduleServiceTest' test
```

Run the production UI build from `hospital-ui/`:

```powershell
npm.cmd run build -- --configLoader runner
```

Check kiosk script syntax from the repository root:

```powershell
node --check test_counter_kiosk_workflow.js
node --check test_module4_kiosk.js
```

### Evidence recorded for 23/10/2026

- Maven focused suite: **20 tests passed, 0 failures/errors/skipped**. Counts: `BookingServiceTest` 11, `CounterServiceIdempotencyTest` 2, `KioskDispatchTransactionServiceTest` 3, `FhirExportServiceTest` 1, `ScheduleServiceTest` 3.
- Covered unit cases include missing schedule, full slot/no partial booking, 64/65 age boundary, repeated check-in by code and phone, full/terminal reschedule rejection, admin annotation, one booking plus ticket on success, rollback path when booking fails, repeated dispatch/idempotency, and Vietnam calendar date for counter waiting counts.
- Vite production build passed; it reported a large JavaScript chunk (about 2.318 MB).
- Both `node --check` commands passed. These were syntax checks only; the API-backed kiosk scripts were **not executed**.
- No DB-backed application context, HTTP integration run, real concurrent database race, or migration test was run. The default datasource points to `localhost:5432/kmahos` and Hibernate defaults to `ddl-auto:update`; that database was not confirmed disposable.

## Regression matrix for the next isolated integration run

Run these checks against a disposable PostgreSQL database/schema only. Confirm the effective datasource URL and schema policy before starting the application.

| ID | Scenario | Required assertion | Existing evidence |
|---|---|---|---|
| KB-01 | Valid walk-in kiosk submission | One `Booking` and one linked `CounterTicket` are visible to staff/admin after reload; response contains the ticket data. | Service unit success case; web/API persistence not integration-tested. |
| KB-02 | Missing/invalid required fields | Validation response is a client error; no booking, ticket, or capacity change. | HTTP/controller validation not integration-tested. |
| KB-03 | No schedule or full slot | Conflict tells the kiosk to try later; no partial records and no capacity increment. | Missing/full schedule service unit cases passed; HTTP rendering not integration-tested. |
| KB-04 | Same idempotency key submitted again after a lost response | Same booking/ticket result is returned; record counts remain one each. | Mocked service idempotency tests passed; database uniqueness/race not integration-tested. |
| KB-05 | Two different requests race for the final slot | At most one is accepted; capacity never exceeds `maxCapacity`; the rejected request leaves no booking/ticket. | No real database concurrency test run. |
| KB-06 | Two dispatches allocate counter numbers concurrently | Queue numbers do not collide and sequence remains consistent. | Lock/idempotency behavior has unit coverage; DB concurrency not integration-tested. |
| KB-07 | Check-in by booking code and by phone, including repeated request | Persisted timestamp and queue number survive reload; repeating either lookup does not issue another number. | Service unit tests passed; DB restart/reload not integration-tested. |
| KB-08 | Admin list and available-slot views | Admin sees persisted rows; nurse, patient, and unauthenticated callers are denied at API boundary. | Controller annotation has unit reflection coverage; HTTP security integration not run. |
| KB-09 | Admin reschedule/cancel | Valid reschedule uses target slot capacity; full slot and terminal booking are rejected without partial changes. Confirm linked counter ticket state after cancellation. | Full/terminal reschedule service tests passed; end-to-end changes not run. Cancellation currently does not void a linked counter ticket. |
| KB-10 | JVM timezone differs from Vietnam | Around midnight, selected business date, queue counts, and persisted/displayed timestamps follow `Asia/Ho_Chi_Minh`. | Fixed-clock unit tests passed; app/database integration not run under a different JVM default timezone. |

## Deployment and known follow-up

- New entity fields depend on schema update in the tested configuration. A deployment using `ddl-auto:validate` must apply and verify an explicit migration before rollout; no migration has been verified as part of this task.
- Kiosk routes remain `permitAll`; kiosk-device authentication was not added by this change.
- Admin cancellation currently leaves any linked counter ticket unchanged. Confirm whether cancellation should also remove/void a waiting ticket, then add a transactional rule and integration test if required.
- Do not run `test_module4_kiosk.js` or `test_counter_kiosk_workflow.js` against the default datasource unless it has been explicitly replaced with disposable test data.
