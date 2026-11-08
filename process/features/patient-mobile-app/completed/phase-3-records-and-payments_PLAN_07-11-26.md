# Patient Mobile App — Phase 3 Records and Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this phase task-by-task.

**Goal:** Let patients review authorized medical history/results and complete online PayOS/VietQR payments with server-confirmed results.

**Architecture:** Fetch clinical data only through patient-authenticated routes and render the returned DTOs. Resolve a pending category bill from the Phase 0 patient-safe canonical bill contract, open the provider checkout using its server-issued `billId`, return to the app, then query/sync transaction status; never infer success from a redirect.

**Tech Stack:** Expo/React Native, TypeScript, Axios, Expo Router/Linking/WebBrowser, SecureStore, Spring clinical/payment APIs, PayOS/VietQR.

**Spec:** `docs/superpowers/specs/2026-11-07-patient-mobile-app-design.md`

## Global Constraints

- Phase 0 clinical ownership gates must pass before this phase consumes real clinical data. Its bill identity, category balance, ownership, and server-priced checkout sub-gate must pass before the app consumes live bill balances or implements checkout.
- Never expose or log full clinical records, identity numbers, access tokens, payment secrets, or provider payloads.
- Do not request `/api/prescriptions/{code}/pdf` or other public record export as a substitute for an authorized record endpoint.
- Payment amount and transaction category come from the pending bill resolved by the backend; UI sends `billId` only.
- A bill is one canonical server-side booking/category balance. Do not infer category balances by adding the legacy synthetic rows from `/api/payment/my-pending-bills`.
- Legacy successful transactions without a source-backed category marker remain `UNRECONCILED`; do not redistribute or apply their amount to a category. The affected bill has `totalAmount: null`, cannot be paid in the app, and checkout must be rejected by the backend until source-backed reconciliation or authorized accounting confirmation resolves it.
- PayOS/VietQR status is authoritative only after backend status/sync response is `SUCCESS` for the current account.
- If Phase 0 cannot prove canonical bill IDs/category balances and payment ownership, keep the bill/payment integration BLOCKED; do not fall back to the legacy synthetic rows as payable balances. Any `UNRECONCILED` category remains nonpayable even if other categories for that booking are reconciled. Records work remains independently scoped behind its own ownership gate.
- No medication reminder scheduling, offline clinical cache, AI advice, or chat in this phase.

## Review Focus

- A foreign profile/record identifier must not return medical data; pin with `deniesForeignProfileRecordRead`.
- Empty or partial clinical DTOs must display a clear unavailable state without mock diagnosis, result, or prescription; pin with `rendersEmptyRecordWithoutFallback`.
- Provider cancel, pending response, failed sync, duplicate callback, or wrong account must never render “Đã thanh toán”; pin with the payment state tests in Task 3.

---

### Task 1: Add authorized medical history and record details

**Files:**
- Create: `hospital-mobile/src/features/records/records.types.ts`
- Create: `hospital-mobile/src/features/records/records.api.ts`
- Create: `hospital-mobile/src/features/records/__tests__/records.api.test.ts`
- Create: `hospital-mobile/src/features/records/components/RecordSummaryCard.tsx`
- Create: `hospital-mobile/src/app/(patient)/records/index.tsx`
- Create: `hospital-mobile/src/app/(patient)/records/[recordId].tsx`
- Create: `hospital-mobile/src/features/records/__tests__/record-screens.test.tsx`

**Interfaces:**
- `listRecordsForProfile(profileId: string): Promise<MedicalRecord[]>` calls `GET /api/clinical/patients/{patientProfileId}/records` after Phase 0 confirms ownership behavior.
- `getRecord(recordId: string): Promise<MedicalRecord>` calls `GET /api/clinical/records/{id}`.
- DTOs follow `MedicalRecordResponse`; use explicit nullable fields, do not synthesize missing clinical conclusions.

- [x] **Step 1: Write tests `deniesForeignProfileRecordRead`, `rendersEmptyRecordWithoutFallback`, and `showsPendingRecordState`.**
- [x] **Step 2: Run the focused test files and confirm missing DTO fields remain empty states.**
- [x] **Step 3: Define only the response fields actually returned by `MedicalRecordResponse`** for diagnosis, treatment plan, doctor advice, tests, and prescriptions.
- [x] **Step 4: Implement read-only records API and history/detail screens**; show a neutral “Chưa có dữ liệu ghi nhận” state for absent values.
- [x] **Step 5: Add explicit 403/404 handling and avoid printing health payloads in logs or snapshots.**
- [x] **Step 6: Re-run focused tests and `npx tsc --noEmit`**; verify no PDF/public lookup route is called.

### Task 2: Add bills and transaction history screens

**Files:**
- Create: `hospital-mobile/src/features/billing/billing.types.ts`
- Create: `hospital-mobile/src/features/billing/billing.api.ts`
- Create: `hospital-mobile/src/features/billing/__tests__/billing.api.test.ts`
- Create: `hospital-mobile/src/app/(patient)/bills/index.tsx`
- Create: `hospital-mobile/src/app/(patient)/bills/[billId].tsx`
- Create: `hospital-mobile/src/app/(patient)/transactions/index.tsx`
- Create: `hospital-mobile/src/features/billing/components/BillSummary.tsx`
- Create: `hospital-mobile/src/features/billing/__tests__/bill-screens.test.tsx`

**Interfaces:**
- `listPendingBills(): Promise<PendingBill[]>` calls Phase 0 route `GET /api/payment/patient/pending-bills`.
- `listTransactions(page?: number, size?: number): Promise<Transaction[]>` calls `GET /api/payment/history`.
- `PendingBill` maps Phase 0 `PatientPendingBillResponse` fields `billId`, `bookingCode`, `bookingId`, `category`, `items`, nullable `totalAmount`, `reconciliationStatus`, `status`, and `createdAt`; do not map or persist unrelated patient identity fields from `CashierPendingBillResponse`.
- Currency display is VND formatted from server `BigDecimal`/JSON number; the client does not calculate the payable total.

- [x] **Step 1: Write tests `rendersServerTotalOnly`, `listsPendingBillsAndTransactions`, `showsNoBillsWithoutMockAmount`, and `hidesUnreconciledBalanceAndDisablesPayment`.**
- [x] **Step 2: Run focused tests and confirm no `200000` or booking-price fallback is used.**
- [x] **Step 3: Implement pending bills and transaction history API wrappers** using the authenticated client.
- [x] **Step 4: Implement bills/history screens** with server total, line items, paid/pending status, loading/error/empty states, and retry; for `UNRECONCILED`, show a clear “Đang đối soát; chưa thể thanh toán” state, do not show a payable amount, and disable checkout.
- [x] **Step 5: Re-run screen/API tests and typecheck**; verify UI never derives total from client-side booking data.

### Task 3: Complete canonical bill-scoped PayOS/VietQR checkout and return status

**Files:**
- Create: `hospital-mobile/src/features/billing/payment.api.ts`
- Create: `hospital-mobile/src/features/billing/__tests__/payment.api.test.ts`
- Create: `hospital-mobile/src/features/billing/components/PaymentCheckout.tsx`
- Create: `hospital-mobile/src/features/billing/__tests__/payment-checkout.test.tsx`
- Create: `hospital-mobile/src/app/(patient)/payment/return.tsx`
- Create: `hospital-mobile/src/features/billing/components/PaymentResult.tsx`
- Modify: `hospital-mobile/package.json`
- Modify: `hospital-mobile/src/app.json`
- Modify if required by Phase 0 provider audit: `hospital-api/src/main/java/com/hospital/api/config/PayOSConfig.java`
- Modify if required by Phase 0 provider audit: `hospital-api/src/main/java/com/hospital/api/service/impl/PayOSServiceImpl.java`
- Modify if required by Phase 0 provider audit: `hospital-api/src/main/resources/application.yml`
- Test: `hospital-api/src/test/java/com/hospital/api/service/PatientPaymentAuthorizationTest.java`

**Interfaces:**
- `createPaymentLink(billId: string): Promise<PaymentGatewayResponse>` calls Phase 0 route `POST /api/payment/patient/payos/create-link` with `{ billId }` only; the bill's category and exact outstanding amount remain server-derived.
- `PaymentGatewayResponse` currently contains `transactionId`, `txnRef`, `paymentMethod`, `transactionType`, `amount`, `status`, `qrImageUrl`, `qrCode`, `paymentUrl`, `deeplink`, `bankName`, `bankAccountNo`, `accountHolder`, `transferContent`, `description`, and `orderCode`; display only provider/server-returned values and do not reconstruct QR/bank instructions or amount locally.
- `checkPaymentStatus(txnRef: string): Promise<Transaction>` calls `GET /api/payment/status/{txnRef}`.
- `syncPayOS(orderCode: number): Promise<Transaction>` calls `POST /api/payment/payos/sync/{orderCode}`.
- App linking uses an app/universal link configured in `app.json` and provider return/cancel URL; return screen takes only opaque `txnRef`/`orderCode`, never a token or patient identifier.

- [x] **Step 1: Write tests `createsLinkWithBillIdOnly`, `usesCanonicalServerBalance`, `rendersServerIssuedVietQRDetails`, `opensPayOSCheckoutUrlFromResponse`, `unreconciledBillHasNoPayableBalance`, `unreconciledCheckoutFailsClosed`, `providerCancelDoesNotMarkPaid`, `syncSuccessShowsPaid`, `pendingStatusRemainsPending`, and `wrongAccountStatusIsRejected`.**
- [x] **Step 2: Run the focused API/screen tests and verify the completion view requires backend `SUCCESS`.**
- [x] **Step 3: Install `expo-linking` and `expo-web-browser` with `npx expo install`**, then implement payment API wrappers and return/cancel app-link parser with strict allowed route parameters.
- [x] **Step 4: Present the payment details returned by the server:** show `qrImageUrl`/`qrCode` and the returned bank name, account number, holder, transfer content, and amount when provided; open the returned `paymentUrl` with the system browser for PayOS checkout. Use `deeplink` only if Phase 0 provider audit confirms its target scheme is expected. If no usable QR or checkout URL is returned, show a recoverable error and do not claim payment success.
- [x] **Step 5: When the provider returns or the app resumes, call status and, when required, PayOS sync**; do not infer completion from a QR scan, browser return, or provider query parameters.
- [x] **Step 6: Configure provider return/cancel URL from server configuration** and app link association; do not accept arbitrary client-supplied return URLs. If provider requires a hosted HTTPS bridge, document and add only that redirect before release.
- [x] **Step 7: Show success only after backend returns verified `SUCCESS`; show pending/cancelled/failed distinctly and allow status refresh without creating another transaction.**
- [x] **Step 8: Run mobile payment tests plus focused backend payment authorization/verification tests**; expected tampered bill IDs, wrong account, `UNRECONCILED` bills, cancelled checkout, and delayed status never create an unsafe link or display paid.

### Phase 3 Gate

- [x] Record list/detail displays backend data only and denies unauthorized profile IDs.
- [x] Pending bills and transaction history display Phase 0 verified server totals and statuses without fixed fallback values. `UNRECONCILED` bills show no payable total or checkout action.
- [x] Payment link is scoped to a Phase 0 canonical, reconciled pending bill; the app submits no amount/category/type/description supplied by itself. `UNRECONCILED` checkout fails closed on both client and server. This gate remains BLOCKED until the Phase 0 billing sub-gate passes.
- [x] PayOS/VietQR returns control to the app and payment success is confirmed through the authorized status/sync APIs. This gate remains BLOCKED until canonical bill checkout is verified in Phase 0.
- [x] No patient-sensitive content or token is present in logs/test snapshots.
