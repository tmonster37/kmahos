# Patient Mobile App — Phase 2 Profiles and Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this phase task-by-task.

**Goal:** Let an authenticated patient manage permitted family profiles, book/cancel an appointment, and follow booking/check-in/exam status.

**Architecture:** Build feature-local API services and screens on the Phase 1 client. Use department schedules and slot reservations from the backend; never query the staff-only doctor directory or invent available slots.

**Tech Stack:** Expo/React Native, TypeScript, Expo Router, Axios, React Native Testing Library, Spring booking/profile APIs.

**Spec:** `docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md`

## Global Constraints

- Implement only `ROLE_PATIENT` use cases in `hospital-mobile/` and approved API gaps from Phase 0.
- Profile and booking identifiers are untrusted inputs; backend must verify ownership for create/update/delete/cancel.
- Use `GET /api/departments` and the confirmed patient-safe schedule endpoint; `/api/doctors` remains out of scope.
- Respect backend slot-reservation expiry/concurrency; release held slots on cancel/back/timeout when a reservation exists.
- Render only backend response values; no mock doctor, schedule, fee, queue, or booking status.
- Do not start or enable checkout for a bill whose backend reconciliation status is `UNRECONCILED`; a booking journey must not infer payment readiness from booking status alone.

## Review Focus

- A patient must not create or cancel a booking for a profile owned by another account; pin with `createBookingUsesOwnedProfileAndReservation` and `cancelRequiresBookingOwner`.
- A slot that becomes full or whose reservation expires must show a recoverable conflict state; pin with `showsSlotConflictAndRefreshesSchedule`.
- Returning from a booking detail with missing journey fields must show “Chưa có dữ liệu” rather than inventing a queue state; pin with `doesNotInferMissingJourneyFields`.
- Notification list and read mutations stay scoped to the signed-in account; pin app behavior with `listsCurrentAccountsNotifications`, `marksOwnedNotificationRead`, and `marksAllNotificationsRead` in Task 4, plus backend ownership tests in Phase 0.

---

### Task 1: Add profile API and family-profile screens

**Files:**
- Create: `hospital-mobile/src/features/profiles/profiles.types.ts`
- Create: `hospital-mobile/src/features/profiles/profiles.api.ts`
- Create: `hospital-mobile/src/features/profiles/__tests__/profiles.api.test.ts`
- Create: `hospital-mobile/src/app/(patient)/profiles/index.tsx`
- Create: `hospital-mobile/src/app/(patient)/profiles/create.tsx`
- Create: `hospital-mobile/src/app/(patient)/profiles/[profileId].tsx`
- Create: `hospital-mobile/src/features/profiles/components/ProfileForm.tsx`
- Create: `hospital-mobile/src/features/profiles/components/ProfileCard.tsx`

**Interfaces:**
- `listMyProfiles(): Promise<PatientProfile[]>` calls `GET /api/patient-profiles`.
- `createProfile(input: PatientProfileRequest): Promise<PatientProfile>` calls `POST /api/patient-profiles`.
- `updateProfile(profileId: string, input: PatientProfileRequest): Promise<PatientProfile>` calls `PUT /api/patient-profiles/{id}`.
- `deleteProfile(profileId: string): Promise<void>` calls `DELETE /api/patient-profiles/{id}` after confirmation.
- Do not invoke `/lookup` or `/link/*` until Phase 0 confirms the linking verification contract.

- [x] **Step 1: Write tests `listsOnlyServerReturnedProfiles`, `submitsRelationshipAndRequiredFields`, and `showsProfileLoadAndEmptyStates`** using API response fixtures with synthetic non-clinical profile values.
- [x] **Step 2: Run the focused test file and confirm the profile module is missing.**
- [x] **Step 3: Define request/response types from `PatientProfileRequest` and `PatientProfileResponse`**; keep UUIDs as opaque strings.
- [x] **Step 4: Implement profile API wrappers and profile list/create/edit screens** with validation and explicit loading/error/empty states.
- [x] **Step 5: Add delete confirmation and handle backend 403/404 without optimistic removal**; refresh from server after mutation.
- [x] **Step 6: Re-run profile tests and `npx tsc --noEmit`** from `hospital-mobile/`.

### Task 2: Add schedule discovery and safe slot reservation services

**Files:**
- Create: `hospital-mobile/src/features/booking/booking.types.ts`
- Create: `hospital-mobile/src/features/booking/departments.api.ts`
- Create: `hospital-mobile/src/features/booking/schedules.api.ts`
- Create: `hospital-mobile/src/features/booking/reservations.api.ts`
- Create: `hospital-mobile/src/features/booking/__tests__/schedules.api.test.ts`
- Create: `hospital-mobile/src/features/booking/__tests__/reservations.api.test.ts`
- Create: `hospital-mobile/src/app/(patient)/booking/index.tsx`
- Create: `hospital-mobile/src/app/(patient)/booking/[departmentId].tsx`
- Create: `hospital-mobile/src/app/(patient)/booking/slot/[timeSlotId].tsx`

**Interfaces:**
- `listDepartments(): Promise<Department[]>` calls `GET /api/departments`.
- `listSchedules(departmentId: number, date: string): Promise<Schedule[]>` calls confirmed `GET /api/schedules/by-department?departmentId=&date=`.
- `reserveSlot(timeSlotId: string, patientProfileId: string): Promise<SlotReservation>` calls `POST /api/bookings/reserve-slot`; exact request fields are taken from `ReserveSlotRequest` after Phase 0 report.
- `releaseSlot(reservationId: string): Promise<void>` calls `POST /api/bookings/release-slot/{reservationId}`.

- [x] **Step 1: Write tests `mapsDepartmentScheduleSlots`, `doesNotShowUnavailableSlots`, `showsSlotConflictAndRefreshesSchedule`, and `releasesReservationOnAbandonedFlow`** with synthetic schedules.
- [x] **Step 2: Run the focused API tests and confirm unavailable slot cases fail closed.**
- [x] **Step 3: Implement department/schedule/reservation wrappers** using exact query and DTO fields from Phase 0; do not call `/api/doctors`.
- [x] **Step 4: Implement selection screens** in order: department → date/schedule → doctor/session/slot → patient profile → reservation.
- [x] **Step 5: On back, timeout, or booking failure release the active reservation**; handle HTTP 409 by refreshing schedule and asking the patient to select again.
- [x] **Step 6: Re-run the focused tests and typecheck**; expected no synthetic slot or fee is displayed.

### Task 3: Create booking, history, cancellation, and journey views

**Files:**
- Create: `hospital-mobile/src/features/booking/booking.api.ts`
- Create: `hospital-mobile/src/features/booking/__tests__/booking.api.test.ts`
- Create: `hospital-mobile/src/app/(patient)/appointments/index.tsx`
- Create: `hospital-mobile/src/app/(patient)/appointments/[bookingId].tsx`
- Create: `hospital-mobile/src/features/booking/components/BookingJourney.tsx`
- Modify: `hospital-mobile/src/app/(patient)/index.tsx`

**Interfaces:**
- `createBooking(input: BookingCreateRequest): Promise<Booking>` calls `POST /api/bookings` with the reservation ID.
- `listMyBookings(): Promise<Booking[]>` calls `GET /api/bookings/my-history`.
- `cancelBooking(bookingId: string): Promise<void>` calls `PUT /api/bookings/{id}/cancel`.
- `BookingJourney` maps only backend booking/payment/check-in/dispatched/exam states to steps.

- [x] **Step 1: Write tests `createBookingUsesOwnedProfileAndReservation`, `cancelRequiresBookingOwner`, `showsBookingHistory`, and `doesNotInferMissingJourneyFields`.**
- [x] **Step 2: Run focused API tests and confirm invalid reservations/foreign booking IDs are rejected.**
- [x] **Step 3: Implement booking create/history/cancel wrappers** with request shapes from Phase 0 DTOs.
- [x] **Step 4: Implement appointment list/detail and a journey component** for booking, payment, check-in, queue, and completion only when those fields exist.
- [x] **Step 5: Show cancel confirmation, respect server cancellation rules, then re-fetch history**; do not locally mark a cancelled request successful before server response.
- [x] **Step 6: Run the focused suite, `npx tsc --noEmit`, and Android emulator walkthrough** for create/history/cancel.

### Task 4: Add the in-app notification inbox

**Files:**
- Create: `hospital-mobile/src/features/notifications/notifications.types.ts`
- Create: `hospital-mobile/src/features/notifications/notifications.api.ts`
- Create: `hospital-mobile/src/features/notifications/__tests__/notifications.api.test.ts`
- Create: `hospital-mobile/src/features/notifications/components/NotificationList.tsx`
- Create: `hospital-mobile/src/app/(patient)/notifications/index.tsx`
- Create: `hospital-mobile/src/features/notifications/__tests__/notifications-screen.test.tsx`
- Modify: `hospital-mobile/src/app/(patient)/index.tsx`

**Interfaces:**
- `listNotifications(): Promise<PatientNotification[]>` calls authenticated `GET /api/utilities/notifications`; Phase 0 verifies account filtering and response serialization (`ApiResponse<List<Notification>>` today).
- `markNotificationRead(notificationId: string): Promise<void>` calls `PUT /api/utilities/notifications/{notificationId}/read`.
- `markAllNotificationsRead(): Promise<void>` calls `PUT /api/utilities/notifications/read-all`.
- Map only `notificationId`, `title`, `content`, `type`, `isRead`, and timestamps into the mobile type; do not retain serialized account/entity fields.

- [x] **Step 1: Write tests `listsCurrentAccountsNotifications`, `marksOwnedNotificationRead`, `marksAllNotificationsRead`, and `showsNotificationEmptyAndErrorStates`** with synthetic, non-identifying notification content.
- [x] **Step 2: Run focused notification API/screen tests** and verify read actions refresh from server state rather than optimistically changing another notice.
- [x] **Step 3: Implement the notification API wrappers** on the Phase 1 authenticated client using the three Phase 0 verified routes.
- [x] **Step 4: Implement an inbox screen and home entry point** with unread/read states, mark-one/read-all actions, loading, empty, error, and retry states.
- [x] **Step 5: Re-run focused tests and typecheck**; verify notification payloads are not written to logs or persistent clinical-data cache.
- [x] **Step 6: Keep push out of scope:** no permission prompt, device registration, token storage, APNs/FCM setup, or push delivery.

### Phase 2 Gate

- [x] Profile CRUD is limited to the signed-in account; cross-account IDs are denied server-side.
- [x] Schedule choices come from `GET /api/schedules/by-department`; no admin doctor endpoint is called.
- [x] Reservations are released on abandoned flows and conflicts refresh the source schedule.
- [x] Booking history and journey show server state only; no fabricated queue or payment state.
- [x] Patient notification inbox lists only the authenticated account's notices, marks one/all read through the verified API, and uses clear loading/empty/error states.
- [x] No push notification permission, device token, APNs, or FCM work is included in the MVP.
