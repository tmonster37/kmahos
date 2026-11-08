# Patient Mobile App — Phase 2 Verification Report (Profiles, Booking & Notifications)

**Date:** 07/11/2026
**Phase Plan:** `process/features/patient-mobile-app/completed/phase-2-profiles-and-booking_PLAN_07-11-26.md`
**Status:** PASSED (26/26 Jest tests passed, 0 TypeScript errors)

---

## 1. Summary of Implemented Deliverables

### Task 1: Family Profile Management (`ROLE_PATIENT`)
- `hospital-mobile/src/features/profiles/profiles.types.ts` & `profiles.api.ts`:
  - Implemented `listMyProfiles` (`GET /api/patient-profiles`), `createProfile` (`POST /api/patient-profiles`), `updateProfile` (`PUT /api/patient-profiles/{id}`), and `deleteProfile` (`DELETE /api/patient-profiles/{id}`).
  - Left `/lookup` and `/link/*` out of scope per Phase 0 contract.
- `hospital-mobile/src/features/profiles/components/ProfileCard.tsx` & `ProfileForm.tsx`:
  - Validated required fields (`fullName`, `dateOfBirth`, `gender`, `relationship`) and rendered only backend-returned profiles.
- `hospital-mobile/src/app/(patient)/profiles/index.tsx`, `create.tsx`, `[profileId].tsx`:
  - Implemented profile list, creation, editing, and confirmation-gated deletion with server-side refresh (no optimistic removal on 403/404).

### Task 2: Department Schedule Discovery & Safe Slot Reservation
- `hospital-mobile/src/features/booking/booking.types.ts`, `departments.api.ts`, `schedules.api.ts`, `reservations.api.ts`:
  - `listDepartments()` calls `GET /api/departments`.
  - `listSchedules(departmentId, date)` calls `GET /api/schedules/by-department?departmentId=&date=` and filters out unavailable slots (`isFull` or `currentBookings >= maxCapacity`). Never calls `/api/doctors`.
  - `reserveSlot(timeSlotId, patientProfileId)` calls `POST /api/bookings/reserve-slot`.
  - `releaseSlot(reservationId)` calls `POST /api/bookings/release-slot/{reservationId}`.
- `hospital-mobile/src/app/(patient)/booking/index.tsx`, `[departmentId].tsx`, `slot/[timeSlotId].tsx`:
  - Implemented sequential selection flow (Department → Date/Schedule → Slot → Patient Profile → Hold Reservation → Confirm Booking).
  - Automatically releases held slot reservations on unmount/back/failure and handles HTTP 409 conflicts by displaying a recoverable conflict banner and refreshing the schedule.

### Task 3: Booking Creation, History, Cancellation & Journey Tracking
- `hospital-mobile/src/features/booking/booking.api.ts`:
  - `createBooking(input)` calls `POST /api/bookings` with `patientProfileId`, `timeSlotId`, `symptoms`, and `reservationId`.
  - `listMyBookings()` calls `GET /api/bookings/my-history`.
  - `cancelBooking(bookingId)` calls `PUT /api/bookings/{bookingId}/cancel`.
- `hospital-mobile/src/features/booking/components/BookingJourney.tsx`:
  - Displays only backend-returned values (`status`, `isPaid`, `queueCode`/`queueNumber`, `counterTicketCode`, `checkedInAt`, `dispatchedAt`, `roomName`) and renders `"Chưa có dữ liệu"` whenever a field is absent.
- `hospital-mobile/src/app/(patient)/appointments/index.tsx` & `[bookingId].tsx`:
  - Implemented booking history list, detail view with `BookingJourney`, and confirmation-gated cancellation followed by server state reload.

### Task 4: In-App Notification Inbox
- `hospital-mobile/src/features/notifications/notifications.types.ts` & `notifications.api.ts`:
  - `listNotifications()` calls `GET /api/utilities/notifications` and sanitizes items to retain only `notificationId`, `title`, `content`, `type`, `isRead`, `createdAt`, and `updatedAt` (stripping any raw `account` or entity fields).
  - `markNotificationRead(notificationId)` calls `PUT /api/utilities/notifications/{notificationId}/read`.
  - `markAllNotificationsRead()` calls `PUT /api/utilities/notifications/read-all`.
- `hospital-mobile/src/features/notifications/components/NotificationList.tsx` & `src/app/(patient)/notifications/index.tsx`:
  - Implemented inbox screen with loading, empty, error, retry, mark-one read, and mark-all read actions that refresh from server state.
- `hospital-mobile/src/app/(patient)/index.tsx`:
  - Added navigation entry points to Profiles, Booking, Appointments, and Notifications while preserving Phase 1 shell test IDs.

---

## 2. Verification Commands & Results

1. **TypeScript Typecheck:**
   - Command: `Set-Location "c:\Users\ASUS\Downloads\hospital-api (1)\hospital-mobile"; npm run typecheck`
   - Result: `tsc --noEmit` exited with code `0` (`0 errors`).

2. **Jest Automated Test Suite:**
   - Command: `Set-Location "c:\Users\ASUS\Downloads\hospital-api (1)\hospital-mobile"; npm test -- --runInBand`
   - Result: `8 passed, 8 total` test suites; `26 passed, 26 total` tests (`0 failures`).
   - Verified Phase 2 test cases:
     - `profiles.api.test.ts`: `listsOnlyServerReturnedProfiles`, `submitsRelationshipAndRequiredFields`, `showsProfileLoadAndEmptyStates`
     - `schedules.api.test.ts`: `mapsDepartmentScheduleSlots`, `doesNotShowUnavailableSlots`
     - `reservations.api.test.ts`: `showsSlotConflictAndRefreshesSchedule`, `releasesReservationOnAbandonedFlow`
     - `booking.api.test.ts`: `createBookingUsesOwnedProfileAndReservation`, `cancelRequiresBookingOwner`, `showsBookingHistory`, `doesNotInferMissingJourneyFields`
     - `notifications.api.test.ts`: `listsCurrentAccountsNotifications`, `marksOwnedNotificationRead`, `marksAllNotificationsRead`
     - `notifications-screen.test.tsx`: `showsNotificationEmptyAndErrorStates`, `marksOwnedNotificationRead and marksAllNotificationsRead via server refresh`

