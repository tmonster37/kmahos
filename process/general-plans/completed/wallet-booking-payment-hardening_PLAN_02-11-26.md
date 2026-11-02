# Implementation Plan: Wallet Booking Payment & Check-In Verification

**Plan Date:** 02-11-26  
**Status:** COMPLETED  
**Scope:** Backend (`PaymentService`, `PaymentController`, `PaymentServiceImpl`) & Frontend (`BookingPage.jsx`)

---

## 1. Problem Statement & Root Cause
- **Issue:** When a patient booked an appointment and selected **"Ví Viện Phí Nội Bộ" (`WALLET`)**, the wallet was deducted, but upon check-in at Kiosk or Nurse reception, the system still indicated `Chưa thanh toán viện phí` (`is_paid = false`).
- **Root Cause:**
  1. Frontend (`BookingPage.jsx`) called `/api/payment/wallet/pay?amount=${amount}&type=PAY_BOOKING` without `bookingCode`.
  2. Backend controller (`PaymentController.java`) did not accept `bookingCode`.
  3. Backend service (`PaymentServiceImpl.java`) deducted wallet balance and created a generic `Transaction` without linking to the `Booking` entity, never setting `booking.setIsPaid(true)` and never calling `reception.afterVerifiedPayment(booking)`.

---

## 2. Implemented Fixes
1. **[`PaymentService.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/PaymentService.java)**:
   - Added overloaded method `payWithInternalWallet(UUID accountId, BigDecimal amount, TransactionType type, String bookingCode)`.
2. **[`PaymentController.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/controller/PaymentController.java)**:
   - Added `@RequestParam(required = false) String bookingCode` to `@PostMapping("/wallet/pay")`.
3. **[`PaymentServiceImpl.java`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-api/src/main/java/com/hospital/api/service/impl/PaymentServiceImpl.java)**:
   - Implemented `payWithInternalWallet(accountId, amount, type, bookingCode)`:
     - When `type == PAY_BOOKING` and `bookingCode` is present:
       - Fetches and locks `Booking` with `bookingRepository.findByBookingCodeForUpdate(cleanCode)`.
       - Validates booking active, not cancelled, not already paid, and amount matches price.
       - Deducts wallet balance and creates `Transaction` with `isVerified = true` and description `"Thanh toán viện phí lịch khám " + cleanCode + " qua ví nội bộ"`.
       - Calls `recordBookingPayment(transaction, booking)` which sets `booking.setIsPaid(true)` and invokes `reception.afterVerifiedPayment(booking)`.
4. **[`BookingPage.jsx`](file:///c:/Users/ASUS/Downloads/hospital-api%20(1)/hospital-ui/src/pages/customer/BookingPage.jsx)**:
   - Appended `bookingCode=${encodeURIComponent(bookingData.bookingCode)}` to `/api/payment/wallet/pay`.
   - Updated `bookingResult.isPaid = true` and rendered the "Đã thanh toán (Ví viện phí)" chip on Step 4 confirmation.

---

## 3. Verification Evidence
- Backend test compilation: `mvnw.cmd test-compile` -> **`BUILD SUCCESS`** (358 source files compiled with release 21).
- Frontend production build: `npm run build` -> **`✓ built in 15.82s`** (0 errors).
- Cleaned up all scratch files.

