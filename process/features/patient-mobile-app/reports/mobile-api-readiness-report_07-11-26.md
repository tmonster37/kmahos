# Patient Mobile App — Phase 0 API Readiness & Ownership Verification Report

> **Date:** 2026-11-07
> **Plan:** `process/features/patient-mobile-app/completed/phase-0-api-readiness_PLAN_07-11-26.md`
> **Umbrella Plan:** `process/features/patient-mobile-app/completed/patient-mobile-app_UMBRELLA_PLAN_07-11-26.md`
> **Phase 0 Gate Status:** **PASSED** (Authentication, Booking/Schedule, Patient Profile, Clinical Records, Notifications, and Bill-Scoped Payment gates verified)

---

## 1. Code-Confirmed Mobile Endpoint Contract Matrix

Every endpoint below was verified directly against `hospital-api/src/main/java/com/hospital/api/controller/*`, `SecurityConfig.java`, and the corresponding service/DTO classes.

| Domain | Method & Route | Controller Method | Auth / Role Rule | Request DTO / Params | Response DTO (`ApiResponse<T>`) | Ownership & Safety Verification |
|---|---|---|---|---|---|---|
| **Auth** | `POST /api/auth/send-otp` | `AuthController.sendOtp` | Public (`permitAll`, rate-limited) | `SendOtpRequest(phoneNumber)` | `ApiResponse<OtpResponse>` | Verified |
| **Auth** | `POST /api/auth/verify-otp` | `AuthController.verifyOtp` | Public (`permitAll`, rate-limited) | `VerifyOtpRequest(phoneNumber, otpCode)` | `ApiResponse<Boolean>` | Verified |
| **Auth** | `POST /api/auth/register` | `AuthController.register` | Public (`permitAll`) | `RegisterRequest(phoneNumber, password, fullName, email)` | `ApiResponse<AuthResponse>` | Verified (`accessToken` returned in body for mobile `SecureStore` Bearer auth) |
| **Auth** | `POST /api/auth/login` | `AuthController.login` | Public (`permitAll`, rate-limited) | `LoginRequest(phoneNumber, password)` | `ApiResponse<AuthResponse>` | Verified (`accessToken` returned in body for mobile `SecureStore` Bearer auth); `phoneNumber` accepts the app's phone/email identifier |
| **Auth** | `POST /api/auth/logout` | `AuthController.logout` | Authenticated / Public | Cookie/session cleanup | `ApiResponse<Void>` | Verified |
| **Profiles** | `GET /api/patient-profiles` | `PatientProfileController.getMyProfiles` | Authenticated (`UserPrincipal`) | None | `ApiResponse<List<PatientProfileResponse>>` | Filtered by `user.getId()` via `findAllByAccount_UserId` |
| **Profiles** | `POST /api/patient-profiles` | `PatientProfileController.createProfile` | Authenticated (`UserPrincipal`) | `PatientProfileRequest` | `ApiResponse<PatientProfileResponse>` | Bound to `user.getId()` |
| **Profiles** | `PUT /api/patient-profiles/{profileId}` | `PatientProfileController.updateProfile` | Authenticated (`UserPrincipal`) | `@PathVariable UUID profileId`, `PatientProfileRequest` | `ApiResponse<PatientProfileResponse>` | Checks `profile.getAccount().getUserId().equals(accountId)` (`403 FORBIDDEN` on mismatch) |
| **Profiles** | `DELETE /api/patient-profiles/{profileId}` | `PatientProfileController.deleteProfile` | Authenticated (`UserPrincipal`) | `@PathVariable UUID profileId` | `ApiResponse<Void>` | Checks `profile.getAccount().getUserId().equals(accountId)` (`403 FORBIDDEN` on mismatch) |
| **Catalog** | `GET /api/departments` | `DepartmentController.getActiveDepartments` | Public (`GET /api/departments/**`) | None | `ApiResponse<List<DepartmentResponse>>` | Read-only active department list |
| **Catalog / Slots** | `GET /api/schedules/by-department` | `ScheduleController.getSchedulesByDepartment` | Public (`GET /api/schedules/**`) | `@RequestParam Integer departmentId`, `@RequestParam LocalDate date` | `ApiResponse<List<ScheduleResponse>>` | Patient-safe doctor + `session` + `timeSlots` payload. Mobile **never** calls admin-only `GET /api/doctors` (`@PreAuthorize("hasRole('ADMIN')")`) |
| **Booking** | `POST /api/bookings/reserve-slot` | `BookingController.reserveSlot` | Public by current `SecurityConfig`; controller may receive no principal | `ReserveSlotRequest(timeSlotId, patientProfileId)` | `ApiResponse<ReserveSlotResponse>` | Authenticated holds store the account ID; anonymous hold behavior is not covered by Phase 0 tests and needs policy confirmation |
| **Booking** | `POST /api/bookings/release-slot/{reservationId}` | `BookingController.releaseSlot` | Public by current `SecurityConfig`; controller may receive no principal | `@PathVariable UUID reservationId` | `ApiResponse<Void>` | Cross-account authenticated release is denied; anonymous create/release behavior remains unverified |
| **Booking** | `POST /api/bookings` | `BookingController.createBooking` | Authenticated (`UserPrincipal`) | `BookingCreateRequest(patientProfileId, timeSlotId, symptoms, reservationId)` | `ApiResponse<BookingResponse>` | Verifies `profile.getAccount().getUserId().equals(accountId)` and `slotReservationService.validateReservation(reservationId, timeSlotId, accountId)` |
| **Booking** | `GET /api/bookings/my-history` | `BookingController.getMyBookings` | Authenticated (`UserPrincipal`) | None | `ApiResponse<List<BookingResponse>>` | Queries `findAllByPatientProfile_Account_UserIdOrderByCreatedAtDesc(accountId)` |
| **Booking** | `PUT /api/bookings/{bookingId}/cancel` | `BookingController.cancelBooking` | Authenticated (`UserPrincipal`) | `@PathVariable UUID bookingId` | `ApiResponse<BookingResponse>` | Checks `booking.getPatientProfile().getAccount().getUserId().equals(accountId)` (`403 FORBIDDEN` on mismatch) |
| **Clinical** | `GET /api/clinical/patients/{patientProfileId}/records` | `ClinicalExaminationController.getPatientRecords` | Authenticated; patient ownership check applies to `ROLE_PATIENT`; access for other authenticated roles needs policy confirmation | `@PathVariable UUID patientProfileId` | `ApiResponse<List<MedicalRecordResponse>>` | Enforces patient-profile ownership for `ROLE_PATIENT` (`403 FORBIDDEN` on mismatch) |
| **Notifications** | `GET /api/utilities/notifications` | `UtilityController.getMyNotifications` | Authenticated (`UserPrincipal`) | None | `ApiResponse<List<PatientNotificationResponse>>` | **Hardened in Phase 0:** returns `PatientNotificationResponse` projection without serializing `Notification.account` |
| **Notifications** | `PUT /api/utilities/notifications/{notificationId}/read` | `UtilityController.markNotificationAsRead` | Authenticated (`UserPrincipal`) | `@PathVariable UUID notificationId` | `ApiResponse<Void>` | **Hardened in Phase 0:** mutates only when `!n.isDeleted() && n.getAccount().getUserId().equals(user.getId())`; non-enumerating no-op for foreign IDs |
| **Notifications** | `PUT /api/utilities/notifications/read-all` | `UtilityController.markAllNotificationsAsRead` | Authenticated (`UserPrincipal`) | None | `ApiResponse<Void>` | Queries `findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(user.getId())` only |
| **Billing** | `GET /api/payment/patient/pending-bills` | `PaymentController.getPatientPendingBills` | Authenticated (`UserPrincipal`) | None | `ApiResponse<List<PatientPendingBillResponse>>` | **Added in Phase 0:** slim patient projection with canonical category balances, `reconciliationStatus`, and nullable `totalAmount` (leaves `/api/payment/my-pending-bills` intact for web callers) |
| **Billing** | `POST /api/payment/patient/payos/create-link` | `PaymentController.createPatientPayOSPaymentLink` | Authenticated (`UserPrincipal`) | `CreatePatientPayOSLinkRequest(billId)` | `ApiResponse<PaymentGatewayResponse>` | **Added in Phase 0:** accepts only `billId`; derives category, `TransactionType`, and `totalAmount` server-side; rejects foreign (`403`), paid/duplicate/unreconciled (`409`) bills |
| **Billing** | `GET /api/payment/status/{txnRef}` | `PaymentController.checkTransactionStatus` | Authenticated (`UserPrincipal`) | `@PathVariable String txnRef` | `ApiResponse<TransactionResponse>` | **Hardened in Phase 0:** requires `txn.getAccount() != null && txn.getAccount().getUserId().equals(requestingAccountId)` for non-privileged callers (`403 FORBIDDEN`) |
| **Billing** | `POST /api/payment/payos/sync/{orderCode}` | `PaymentController.syncPayOSPayment` | Authenticated (`UserPrincipal`) | `@PathVariable Long orderCode` | `ApiResponse<TransactionResponse>` | **Hardened in Phase 0:** requires `transaction.getAccount() != null && transaction.getAccount().getUserId().equals(currentUser.getId())` for non-staff callers (`403 FORBIDDEN`) |

**Auth scope note (updated 2026-11-08):** The current `AuthController` has no `POST /api/auth/forgot-password` mapping. Password recovery was not verified in Phase 0 and requires a backend contract before the Phase 6 mobile screen is implemented.

---

## 2. Code-Confirmed DTO Shapes for Mobile Phases 1–3

### 2.1 `ScheduleResponse` & `TimeSlotResponse` (`GET /api/schedules/by-department`)
- `ScheduleResponse`:
  - `scheduleId: UUID`
  - `doctorId: UUID`
  - `doctorName: String`
  - `degree: String`
  - `departmentName: String`
  - `roomId: Integer`
  - `roomName: String`
  - `scheduleDate: LocalDate`
  - `session: ScheduleSession` (`MORNING` | `AFTERNOON`)
  - `timeSlots: List<TimeSlotResponse>`
- `TimeSlotResponse`:
  - `timeSlotId: UUID`
  - `startTime: LocalTime`
  - `endTime: LocalTime`
  - `maxCapacity: int`
  - `currentBookings: int`
  - `isFull: boolean`

### 2.2 `PatientNotificationResponse` (`GET /api/utilities/notifications`)
- `notificationId: UUID`
- `title: String`
- `content: String`
- `type: String`
- `isRead: boolean`
- `read: boolean`
- `createdAt: Instant`
- `updatedAt: Instant`
- *(Excludes `Notification.account`, `password`, `balance`, `email`, `phoneNumber`)*

### 2.3 `PatientPendingBillResponse` (`GET /api/payment/patient/pending-bills`)
- `billId: String` (`BILL-{bookingCode}-EXAM` | `BILL-{bookingCode}-TEST` | `BILL-{bookingCode}-PRESCRIPTION`)
- `bookingCode: String`
- `bookingId: UUID`
- `category: String` (`"EXAM"` | `"TEST"` | `"PRESCRIPTION"`)
- `items: List<CashierBillItemDto>` (`itemId`, `name`, `quantity`, `unitPrice`, `totalPrice`, `category`)
- `totalAmount: BigDecimal | null` (`null` whenever `reconciliationStatus == "UNRECONCILED"`)
- `reconciliationStatus: String` (`"RECONCILED"` | `"UNRECONCILED"`)
- `status: String` (`"UNPAID"` | `"UNRECONCILED"`)
- `createdAt: LocalDateTime`

### 2.4 `CreatePatientPayOSLinkRequest` & `PaymentGatewayResponse` (`POST /api/payment/patient/payos/create-link`)
- Request body: `CreatePatientPayOSLinkRequest(String billId)`
- Response body (`PaymentGatewayResponse`):
  - `transactionId: UUID`
  - `txnRef: String`
  - `paymentMethod: PaymentMethod`
  - `transactionType: TransactionType` (`PAY_BOOKING` | `PAY_MEDICAL_TEST` | `PAY_PRESCRIPTION`)
  - `amount: BigDecimal` (always derived from server `PatientPendingBillResponse.totalAmount`)
  - `status: String`
  - `qrImageUrl: String`
  - `qrCode: String`
  - `paymentUrl: String`
  - `deeplink: String`
  - `bankName: String`
  - `bankAccountNo: String`
  - `accountHolder: String`
  - `transferContent: String`
  - `description: String`
  - `orderCode: Long`

---

## 3. Verification Commands & Test Results

1. **Task 2 — Patient Data & Slot Reservation Ownership:**
   - Command:
     `Set-Location "c:\Users\ASUS\Downloads\hospital-api (1)\hospital-api"; .\mvnw.cmd "-Dtest=PatientMobileDataOwnershipTest" test`
   - Result:
     `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS`
   - Covered tests:
     - `patientCannotUpdateOrDeleteAnotherAccountsProfile`
     - `patientCannotReleaseAnotherAccountsReservation`
     - `patientCannotCancelAnotherAccountsBooking`
     - `patientCannotReadAnotherAccountsMedicalRecord`

2. **Task 3 — Notification Ownership & Safe Serialization:**
   - Command:
     `Set-Location "c:\Users\ASUS\Downloads\hospital-api (1)\hospital-api"; .\mvnw.cmd "-Dtest=PatientNotificationOwnershipTest" test`
   - Result:
     `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS`
   - Covered tests:
     - `listsOnlyCurrentAccountsNotifications`
     - `foreignNotificationIdCannotMutateReadState`
     - `markAllReadAffectsOnlyCurrentAccount`
     - `patientNotificationResponseExcludesAccountEntity`

3. **Task 4 — Canonical Category Balances, Unreconciled Fail-Closed, and Bill-Scoped PayOS Authorization:**
   - Command:
     `Set-Location "c:\Users\ASUS\Downloads\hospital-api (1)\hospital-api"; .\mvnw.cmd "-Dtest=PatientPendingBillTest,PatientPaymentAuthorizationTest,PaymentBookingVerificationTest" test`
   - Result:
     `Tests run: 61, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS` (`PatientPendingBillTest`: 5/5, `PatientPaymentAuthorizationTest`: 5/5, `PaymentBookingVerificationTest`: 51/51)
   - Covered tests:
     - `marksLegacyPaymentWithoutCategoryAsUnreconciled`
     - `doesNotAllocateUnreconciledAmount`
     - `reflectsCategoryMarkedSettlements`
     - `returnsNullAmountForUnreconciledBill`
     - `doesNotOverstateSplitCategoryBalances`
     - `patientPaymentLinkRequiresOwnedPendingBillAndServerAmount`
     - `patientCannotPayAnotherAccountsBill`
     - `patientCannotCreateDuplicatePaidBillLink`
     - `patientUnreconciledBillCheckoutFailsClosed`
     - `patientStatusAndSyncRequireOwningAccount`

---

## 4. Phase 0 Gate Assessment

- [x] API report lists only code-confirmed route/DTO pairs.
- [x] Patient profile/reservation/booking/record ownership tests pass (`4/4`).
- [x] Notification listing, single-item read, read-all, and patient-safe serialization are verified for the authenticated account (`4/4`).
- [x] Patient bill list has a stable server bill ID (`BILL-{bookingCode}-{category}`), patient-safe response projection (`PatientPendingBillResponse`), canonical reconciled category balance, and explicit `UNRECONCILED` state with `null` amount when settlement cannot be attributed (`5/5`).
- [x] Mobile PayOS route (`POST /api/payment/patient/payos/create-link`) accepts only an owned, reconciled pending `billId` and derives amount/category server-side; `UNRECONCILED` checkout fails closed (`5/5`).
- [x] Doctor/slot selection uses patient-safe `GET /api/schedules/by-department`, not admin-only `GET /api/doctors`.
- [ ] Confirm whether anonymous slot holds are allowed and verify the intended role matrix for medical-record reads before describing these routes as patient-only.
- [x] No unresolved blocker remains for Phase 1, Phase 2, or Phase 3.

