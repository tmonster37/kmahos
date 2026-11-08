# Patient Mobile App — Phase 3 Verification Report (Records and Payments)

**Date:** 07/11/2026
**Phase Plan:** `process/features/patient-mobile-app/completed/phase-3-records-and-payments_PLAN_07-11-26.md`
**Status:** PASSED (43/43 Frontend Jest tests passed, 0 TypeScript errors, 61/61 Backend payment tests passed)

---

## 1. Summary of Implemented Deliverables

### Task 1: Authorized Medical History & Record Details
- `hospital-mobile/src/features/records/records.types.ts` & `records.api.ts`:
  - `listRecordsForProfile(profileId)` calls `GET /api/clinical/patients/{patientProfileId}/records`.
  - `getRecord(recordId)` calls `GET /api/clinical/records/{id}`.
  - Never calls `/api/prescriptions/{code}/pdf` or any public record export route.
- `hospital-mobile/src/features/records/components/RecordSummaryCard.tsx`, `src/app/(patient)/records/index.tsx`, `src/app/(patient)/records/[recordId].tsx`:
  - Displays only backend-returned `MedicalRecordResponse` fields (symptoms, initial/final diagnosis, treatment plan, re-examination date, tests, and prescription items).
  - Shows `"Chưa có dữ liệu ghi nhận"` for any absent clinical value and renders an explicit pending banner for `WAITING`, `IN_PROGRESS`, or `PENDING_TESTS` records.

### Task 2: Canonical Pending Bills & Transaction History
- `hospital-mobile/src/features/billing/billing.types.ts`, `billing.api.ts`, `components/BillSummary.tsx`:
  - `listPendingBills()` calls Phase 0 canonical route `GET /api/payment/patient/pending-bills` and sanitizes payloads to retain only `billId`, `bookingCode`, `bookingId`, `category`, `items`, `totalAmount`, `reconciliationStatus`, `status`, and `createdAt` (stripping any extraneous identity fields).
  - `listTransactions()` calls `GET /api/payment/history`.
  - Renders server-supplied `totalAmount` only (no `200000` or booking-price fallback).
  - Fails closed on `UNRECONCILED` bills: forces `totalAmount = null`, renders `"Đang đối soát; chưa thể thanh toán"`, hides payable total, and disables checkout.
- `hospital-mobile/src/app/(patient)/bills/index.tsx`, `bills/[billId].tsx`, `transactions/index.tsx`:
  - Implemented pending bills list, bill detail view, and transaction history view with loading, empty, error, and retry states.

### Task 3: Canonical Bill-Scoped PayOS/VietQR Checkout & Return Status Verification
- `hospital-mobile/src/features/billing/payment.api.ts`:
  - `createPaymentLink(billId)` calls `POST /api/payment/patient/payos/create-link` with `{ billId }` only.
  - `checkPaymentStatus(txnRef)` calls `GET /api/payment/status/{txnRef}`.
  - `syncPayOS(orderCode)` calls `POST /api/payment/payos/sync/{orderCode}`.
  - `parsePaymentReturnParams(rawParams)` strictly whitelists opaque `txnRef`, `orderCode`, and cancellation flags (`cancel`, `status`), stripping any unexpected query parameters.
- `hospital-mobile/src/features/billing/components/PaymentCheckout.tsx`, `components/PaymentResult.tsx`, `src/app/(patient)/payment/return.tsx`:
  - Displays only server-returned VietQR/PayOS details (`amount`, `bankName`, `bankAccountNo`, `accountHolder`, `transferContent`, `qrCode`, `qrImageUrl`) and opens `paymentUrl` via `expo-web-browser`.
  - Requires server-confirmed `SUCCESS` (via `syncPayOS` and/or `checkPaymentStatus`) before rendering `"Đã thanh toán"`; cancelled, pending, failed, or unauthorized (`403`) states never display paid.

---

## 2. Verification Commands & Results

1. **Frontend TypeScript Typecheck:**
   - Command: `Set-Location "c:\Users\ASUS\Downloads\hospital-api (1)\hospital-mobile"; npm run typecheck`
   - Result: `tsc --noEmit` exited with code `0` (`0 errors`).

2. **Frontend Jest Automated Test Suite (`Phase 1 + Phase 2 + Phase 3`):**
   - Command: `Set-Location "c:\Users\ASUS\Downloads\hospital-api (1)\hospital-mobile"; npm test -- --runInBand`
   - Result: `14 passed, 14 total` test suites; `43 passed, 43 total` tests (`0 failures`).
   - Verified Phase 3 test cases:
     - `records.api.test.ts`: `deniesForeignProfileRecordRead`
     - `record-screens.test.tsx`: `rendersEmptyRecordWithoutFallback`, `showsPendingRecordState`
     - `billing.api.test.ts`: `listsPendingBillsAndTransactions`, `unreconciledBillHasNoPayableBalance`
     - `bill-screens.test.tsx`: `rendersServerTotalOnly`, `showsNoBillsWithoutMockAmount`, `hidesUnreconciledBalanceAndDisablesPayment`
     - `payment.api.test.ts`: `createsLinkWithBillIdOnly and usesCanonicalServerBalance`, `wrongAccountStatusIsRejected`, `strips unexpected parameters from payment return params`
     - `payment-checkout.test.tsx`: `rendersServerIssuedVietQRDetails and opensPayOSCheckoutUrlFromResponse`, `unreconciledCheckoutFailsClosed`, `providerCancelDoesNotMarkPaid`, `syncSuccessShowsPaid`, `pendingStatusRemainsPending`, `wrongAccountStatusIsRejected on return screen`

3. **Backend Payment Authorization & Verification Test Suite:**
   - Command: `Set-Location "c:\Users\ASUS\Downloads\hospital-api (1)\hospital-api"; .\mvnw.cmd "-Dtest=PatientPendingBillTest,PatientPaymentAuthorizationTest,PaymentBookingVerificationTest" test`
   - Result: `Tests run: 61, Failures: 0, Errors: 0, Skipped: 0` (`BUILD SUCCESS`).

