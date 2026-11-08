# Patient Mobile App — Phase 0 API Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this phase task-by-task.

**Goal:** Confirm patient authorization, scheduling, notification, and billing API contracts before app screens handle live patient data.

**Architecture:** Reuse patient-scoped profile, booking, clinical, and payment services where they enforce ownership. Add only the smallest backend contract/security change needed for native use; keep the browser Cookie-Only auth implementation unchanged.

**Tech Stack:** Java 21, Spring Boot 3.4.3, Spring Security, JUnit 5, existing PostgreSQL/test fixtures.

**Spec:** `docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md`

## Global Constraints

- Do not create `hospital-mobile/` or change app code in this phase.
- Keep all existing dirty files intact; modify only listed backend files, new focused tests, this feature report, and the plan status.
- Keep web auth Cookie-Only; native login consumes `AuthResponse.accessToken` as Bearer and stores it in SecureStore in Phase 1.
- Never trust an amount, bill category, or booking identifier without resolving it under the authenticated account.
- Do not add a refresh token, push device API, public patient lookup, or clinical offline cache.

## Review Focus

- A patient must not mutate another account's profile, cancel another account's booking, or read another account's clinical record; pin with `patientCannotUpdateOrDeleteAnotherAccountsProfile`, `patientCannotCancelAnotherAccountsBooking`, and `patientCannotReadAnotherAccountsMedicalRecord` tests.
- A patient creating a payment link for another account's bill or for a modified amount must be rejected; pin with `patientPaymentLinkRequiresOwnedPendingBillAndServerAmount`.
- The public department schedule response must contain enough non-sensitive data to choose a real doctor/time slot; verify its response DTO in the readiness report and pin mobile mapping with `mapsDepartmentScheduleSlots` in Phase 2.

---

### Task 1: Produce the patient mobile API readiness matrix

**Files:**
- Create: `process/features/patient-mobile-app/reports/mobile-api-readiness-report_07-11-26.md`
- Read: `process/context/api-contracts.md`
- Read: `hospital-api/src/main/java/com/hospital/api/controller/AuthController.java`
- Read: `hospital-api/src/main/java/com/hospital/api/controller/PatientProfileController.java`
- Read: `hospital-api/src/main/java/com/hospital/api/controller/BookingController.java`
- Read: `hospital-api/src/main/java/com/hospital/api/controller/ScheduleController.java`
- Read: `hospital-api/src/main/java/com/hospital/api/controller/ClinicalExaminationController.java`
- Read: `hospital-api/src/main/java/com/hospital/api/controller/PaymentController.java`
- Read: `hospital-api/src/main/java/com/hospital/api/controller/UtilityController.java`

**Interfaces:**
- Produces: report table with `screen/flow`, HTTP method + route, auth requirement, request/response DTO, ownership proof, blocker/decision.

- [x] **Step 1: Inspect implemented route mappings and request/response DTOs** in the listed controllers and corresponding services; record only code-confirmed routes.
- [x] **Step 2: Mark patient-safe and non-patient-safe routes.** Record `/api/schedules/by-department?departmentId&date` and `/api/schedules/doctor/{doctorId}` as current schedule candidates; record `/api/doctors` as ADMIN/HEAD-only and exclude it from patient selection.
- [x] **Step 3: Write `mobile-api-readiness-report_07-11-26.md`** with route mapping for login, profiles, schedules/booking, clinical records, bills/payments, and in-app notifications; list absent/unsafe contracts separately.
- [x] **Step 4: Review notification routes and response shape against `UtilityController` and `Notification`.** Record `GET /api/utilities/notifications` as account-filtered `ApiResponse<List<Notification>>`, and the mark-read/read-all routes as `ApiResponse<Void>`; verify serialized fields are patient-safe.
- [x] **Step 5: Review the report against the design.** Confirm payment callback/status, notification ownership, and linked-profile needs are explicit gates, not assumed endpoints.

**Verification:** `rg -n "@(RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping)" hospital-api/src/main/java/com/hospital/api/controller` plus manual mapping against the report; every listed route must exist in source.

### Task 2: Prove patient ownership on profiles, reservations, bookings, and clinical reads

**Files:**
- Modify if a case fails: `hospital-api/src/main/java/com/hospital/api/service/impl/PatientProfileServiceImpl.java`
- Modify if a case fails: `hospital-api/src/main/java/com/hospital/api/service/impl/BookingServiceImpl.java`
- Modify if a case fails: `hospital-api/src/main/java/com/hospital/api/controller/BookingController.java`
- Modify if a case fails: `hospital-api/src/main/java/com/hospital/api/service/SlotReservationService.java`
- Modify if a case fails: `hospital-api/src/main/java/com/hospital/api/service/impl/SlotReservationServiceImpl.java`
- Modify if a case fails: `hospital-api/src/main/java/com/hospital/api/service/impl/ClinicalExaminationServiceImpl.java`
- Test: `hospital-api/src/test/java/com/hospital/api/service/PatientMobileDataOwnershipTest.java`
- Report: `process/features/patient-mobile-app/reports/mobile-api-readiness-report_07-11-26.md`

**Interfaces:**
- Consumes: existing profile update/delete, `SlotReservationService.reserveSlot(ReserveSlotRequest, UUID)` and release flow, `BookingService.cancelBooking(UUID, UUID, boolean)`, and the three existing clinical record read methods.
- Produces: verified denial behavior for patient IDs outside `currentUserId`; no mobile-specific weakening of staff permissions.

- [x] **Step 1: Write `patientCannotUpdateOrDeleteAnotherAccountsProfile`, `patientCannotReleaseAnotherAccountsReservation`, `patientCannotCancelAnotherAccountsBooking`, and `patientCannotReadAnotherAccountsMedicalRecord` tests** using two accounts and records/profiles/reservations owned by only one account.
- [x] **Step 2: Run the focused test class and confirm any failing authorization case.**
- [x] **Step 3: Fix only the failing ownership check** in the corresponding listed controller/service; bind reservation release to the authenticated reservation owner, preserve explicit staff access rules, and avoid trusting client-supplied account or role fields.
- [x] **Step 4: Re-run the focused test class** and verify foreign account requests return 403/404 without response data or releasing another account's held slot.
- [x] **Step 5: Record verified behavior and any remaining blocked record type** in the API readiness report.

**Verification:** `cd hospital-api; .\mvnw.cmd "-Dtest=PatientMobileDataOwnershipTest" test` — expected all patient ownership cases pass.

### Task 3: Prove notification list and read mutations are account-scoped

**Files:**
- Read: `hospital-api/src/main/java/com/hospital/api/controller/UtilityController.java`
- Read: `hospital-api/src/main/java/com/hospital/api/entity/Notification.java`
- Read: `hospital-api/src/main/java/com/hospital/api/repository/NotificationRepository.java`
- Modify only if ownership/serialization fails: `hospital-api/src/main/java/com/hospital/api/controller/UtilityController.java`
- Create a response projection only if entity serialization exposes unrelated account data: `hospital-api/src/main/java/com/hospital/api/dto/response/PatientNotificationResponse.java`
- Test: `hospital-api/src/test/java/com/hospital/api/service/PatientNotificationOwnershipTest.java`
- Report: `process/features/patient-mobile-app/reports/mobile-api-readiness-report_07-11-26.md`

**Interfaces:**
- `GET /api/utilities/notifications` returns `ApiResponse<List<Notification>>` filtered by authenticated `UserPrincipal.getId()`.
- `PUT /api/utilities/notifications/{notificationId}/read` returns `ApiResponse<Void>` and may mutate only a notification owned by the current account; a foreign ID reveals no notification data.
- `PUT /api/utilities/notifications/read-all` returns `ApiResponse<Void>` and mutates only notifications owned by the current account.

- [x] **Step 1: Write `listsOnlyCurrentAccountsNotifications`, `foreignNotificationIdCannotMutateReadState`, `markAllReadAffectsOnlyCurrentAccount`, and `patientNotificationResponseExcludesAccountEntity`** with notifications attached to two accounts.
- [x] **Step 2: Verify the account-filtered repository query and per-ID ownership check** in `UtilityController`; preserve non-enumerating foreign-ID behavior and confirm read-all queries only the current account.
- [x] **Step 3: Inspect serialized `Notification` fields.** If the entity response includes its associated account or unrelated fields, return a patient-safe projection containing notification ID, title, content, type, read state, and timestamps without changing the route.
- [x] **Step 4: Run focused ownership/serialization tests** and verify list, mark-one, and read-all do not expose or mutate another account's notifications.
- [x] **Step 5: Record verified routes, response fields, and ownership behavior** in the API readiness report.

**Verification:** `cd hospital-api; .\mvnw.cmd "-Dtest=PatientNotificationOwnershipTest" test` — expected no cross-account notification visibility or read-state mutation.

### Task 4: Canonicalize patient bill balances and add a bill-scoped PayOS link

**Files:**
- Create: `hospital-api/src/main/java/com/hospital/api/dto/request/CreatePatientPayOSLinkRequest.java`
- Create: `hospital-api/src/main/java/com/hospital/api/dto/response/PatientPendingBillResponse.java`
- Modify: `hospital-api/src/main/java/com/hospital/api/controller/PaymentController.java`
- Modify: `hospital-api/src/main/java/com/hospital/api/service/CashierService.java`
- Modify: `hospital-api/src/main/java/com/hospital/api/service/impl/CashierServiceImpl.java`
- Modify: `hospital-api/src/main/java/com/hospital/api/service/PaymentService.java`
- Modify: `hospital-api/src/main/java/com/hospital/api/service/impl/PaymentServiceImpl.java`
- Read: `hospital-api/src/main/java/com/hospital/api/dto/response/CashierPendingBillResponse.java`
- Test: `hospital-api/src/test/java/com/hospital/api/service/PatientPendingBillTest.java`
- Test: `hospital-api/src/test/java/com/hospital/api/service/PatientPaymentAuthorizationTest.java`
- Report: `process/features/patient-mobile-app/reports/mobile-api-readiness-report_07-11-26.md`

**Interfaces:**
- Patient list route: `GET /api/payment/patient/pending-bills`, authenticated; returns `PatientPendingBillResponse` with only bill ID, booking code, category, item summary, server balance, status, and creation time. Keep the existing `/my-pending-bills` response shape for current callers.
- Request: `CreatePatientPayOSLinkRequest(String billId)`; no amount, transaction type, description, or account ID from the client.
- Link route: `POST /api/payment/patient/payos/create-link`, authenticated; uses `UserPrincipal.getId()`.
- Service: `createPatientPayOSPaymentLink(UUID accountId, String billId) -> PaymentGatewayResponse`.
- Produces: PayOS transaction from a canonical pending bill resolved under that account. The server derives category, exact outstanding balance, transaction type, and booking reference.
- Billing rule: derive category balances only from successful transactions whose category is unambiguous from stored, source-backed transaction metadata. A successful legacy transaction linked to a booking but lacking a reliable category marker is `UNRECONCILED`: do not allocate, split, or reassign its amount to any category. Mark affected booking/category balances `UNRECONCILED`, return no payable total for them, and reject checkout until source-backed reconciliation or authorized accounting confirmation resolves the amount/category. Do not sum current synthetic rows blindly; `CashierServiceImpl.buildBillsFromBookings()` currently aggregates payments across categories and can overstate split TEST/PRESCRIPTION balances.
- Patient bill response includes `reconciliationStatus: "RECONCILED" | "UNRECONCILED"`; `totalAmount` is nullable and must be `null` when the affected balance is unreconciled. Checkout service rechecks this status server-side on every link request.

- [x] **Step 1: Write `PatientPendingBillTest` cases `marksLegacyPaymentWithoutCategoryAsUnreconciled`, `doesNotAllocateUnreconciledAmount`, `reflectsCategoryMarkedSettlements`, `returnsNullAmountForUnreconciledBill`, and `doesNotOverstateSplitCategoryBalances`** using synthetic bookings with exam, test, prescription, partial, and successful payments.
- [x] **Step 2: Make `CashierServiceImpl` calculate canonical balances only from source-backed category-aware transactions.** For a successful legacy transaction whose category cannot be proven, do not allocate its amount; mark every affected booking/category balance `UNRECONCILED` and return a null payable amount until source-backed reconciliation or authorized accounting confirmation.
- [x] **Step 3: Add the slim `PatientPendingBillResponse` projection and `GET /api/payment/patient/pending-bills`** so the app receives no unrelated patient identity fields from `CashierPendingBillResponse`; include `reconciliationStatus` and nullable `totalAmount`, and leave `/api/payment/my-pending-bills` response compatibility intact.
- [x] **Step 4: Write `patientPaymentLinkRequiresOwnedPendingBillAndServerAmount`, `patientCannotPayAnotherAccountsBill`, `patientCannotCreateDuplicatePaidBillLink`, `patientUnreconciledBillCheckoutFailsClosed`, and `patientStatusAndSyncRequireOwningAccount`** for owned/foreign/unknown/paid/unreconciled bills, modified amounts, status access, and PayOS sync access.
- [x] **Step 5: Add `CreatePatientPayOSLinkRequest` and the authenticated patient route** in `PaymentController`; resolve the bill ID only against current canonical pending bills for `UserPrincipal.getId()`.
- [x] **Step 6: Implement `PaymentService.createPatientPayOSPaymentLink(UUID accountId, String billId)`** using server-derived reconciled outstanding amount, transaction category/type, booking reference, and PayOS item data. Reject missing, settled, stale, foreign, or `UNRECONCILED` bills and prevent duplicate pending links for the same bill.
- [x] **Step 7: Add ownership validation for existing authenticated `PAY_BOOKING` link requests** in `PaymentServiceImpl.createPayOSPaymentLink`; preserve the existing request/response contract and browser auth behavior.
- [x] **Step 8: Re-run the focused cashier/payment tests**; verify reconciled balances match source charges minus source-backed category payments, unreconciled transactions are never allocated and checkout fails closed, and the legacy browser caller keeps its response shape.
- [x] **Step 9: Update the readiness report** with the verified patient-safe list/link/status/sync contracts and any remaining billing blocker.

**Verification:** `cd hospital-api; .\mvnw.cmd "-Dtest=PatientPendingBillTest,PatientPaymentAuthorizationTest,PaymentBookingVerificationTest" test` — expected canonical category balances, no cross-account access, no duplicate settled-bill link, and no client-controlled amount.

### Phase 0 Gate

- [x] API report lists only code-confirmed route/DTO pairs.
- [x] Patient profile/reservation/booking/record ownership tests pass.
- [x] Notification listing, single-item read, read-all, and patient-safe serialization are verified for the authenticated account.
- [x] Patient bill list has a stable server bill ID, patient-safe response projection, canonical reconciled category balance, and explicit `UNRECONCILED` state with null amount when settlement cannot be attributed.
- [x] Mobile PayOS route accepts only an owned, reconciled pending `billId` and derives amount/category server-side; `UNRECONCILED` checkout is rejected.
- [x] Doctor/slot selection uses a patient-safe schedule route, not `/api/doctors`.
- [x] Report contains no unresolved blocker for authentication, booking, or patient record access. If canonical bill IDs, balances, category allocation, ownership, or server pricing cannot be proven, explicitly mark the payment sub-gate BLOCKED; Phase 3 may not implement checkout until that gate passes.
