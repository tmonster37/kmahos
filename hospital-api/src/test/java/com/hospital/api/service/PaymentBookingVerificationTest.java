package com.hospital.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.api.config.PayOSConfig;
import com.hospital.api.config.VNPayConfig;
import com.hospital.api.constant.*;
import com.hospital.api.dto.request.PayOSWebhookRequest;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentBookingVerificationTest {
    private static final String BOOKING = "BK20261031ABC123";
    private static final BigDecimal AMOUNT = new BigDecimal("150000");
    @Mock TransactionRepository transactions;
    @Mock AccountRepository accounts;
    @Mock BookingRepository bookings;
    @Mock MedicalExaminationRecordRepository records;
    @Mock PayOSService payOS;
    PaymentServiceImpl service;
    VNPayConfig vnp = new VNPayConfig();
    PayOSConfig config = new PayOSConfig();
    Booking booking;
    Transaction transaction;

    @BeforeEach void setUp() {
        vnp.secretKey = "test-vnp-key";
        config.checksumKey = "test-payos-key";
        service = new PaymentServiceImpl(vnp, config, payOS, transactions, accounts, bookings, records, mock(com.hospital.api.service.impl.BookingReceptionTransition.class));
        booking = Booking.builder().bookingCode(BOOKING).price(AMOUNT)
                .status(BookingStatus.PENDING_PAYMENT).isPaid(false).build();
        transaction = Transaction.builder().transactionId(UUID.randomUUID()).amount(AMOUNT)
                .transactionType(TransactionType.PAY_BOOKING).paymentMethod(PaymentMethod.VNPAY)
                .vnpayTxnRef("VNP123").orderCode(123L).description("Thanh toán: " + BOOKING).build();
        lenient().when(transactions.findByVnpayTxnRef("VNP123")).thenReturn(Optional.of(transaction));
        lenient().when(transactions.findByOrderCode(123L)).thenReturn(Optional.of(transaction));
        lenient().when(transactions.findByVnpayTxnRefForUpdate("VNP123")).thenReturn(Optional.of(transaction));
        lenient().when(transactions.findByOrderCodeForUpdate(123L)).thenReturn(Optional.of(transaction));
        lenient().when(transactions.save(any())).thenAnswer(i -> i.getArgument(0));
        lenient().when(bookings.findByBookingCodeForUpdate(BOOKING)).thenReturn(Optional.of(booking));
        lenient().when(bookings.findByBookingCode(BOOKING)).thenReturn(Optional.of(booking));
    }

    @Test void vnpIpnPaysOnlyExactBookingAndRetryDoesNotWriteTwice() throws Exception {
        assertEquals("00", service.processVNPayIpn(vnp("15000000")).getRspCode());
        assertTrue(booking.getIsPaid());
        assertNull(booking.getCheckedInAt());
        assertNull(booking.getDispatchedAt());
        assertEquals("02", service.processVNPayIpn(vnp("15000000")).getRspCode());
        verify(bookings).findByBookingCodeForUpdate(BOOKING);
        verify(bookings).save(booking);
        verify(transactions).save(transaction);
    }

    @Test void vnpInvalidSignatureNeverWrites() throws Exception {
        Map<String, String> request = vnp("15000000");
        request.put("vnp_SecureHash", "invalid");
        assertEquals("97", service.processVNPayIpn(request).getRspCode());
        assertUnpaid();
    }

    @ParameterizedTest @NullAndEmptySource @ValueSource(strings={"wrong", "15000001", "14999900"})
    void vnpRequiresExactAmountWithoutTruncation(String amount) throws Exception {
        assertEquals("04", service.processVNPayIpn(vnp(amount)).getRspCode());
        assertUnpaid();
    }

    @ParameterizedTest @ValueSource(strings={"no booking", BOOKING + " " + "BK20261031DEF456", "X" + BOOKING, BOOKING + "ZZZZZZZZZZZZ"})
    void vnpRejectsMissingAmbiguousOrPartialBookingReference(String description) throws Exception {
        transaction.setDescription(description);
        assertEquals("01", service.processVNPayIpn(vnp("15000000")).getRspCode());
        assertUnpaid();
    }

    @Test void vnpRejectsMissingBookingAndBookingPriceMismatch() throws Exception {
        when(bookings.findByBookingCodeForUpdate(BOOKING)).thenReturn(Optional.empty());
        assertEquals("01", service.processVNPayIpn(vnp("15000000")).getRspCode());
        assertUnpaid();
    }

    @Test void vnpRejectsPriceDifferentFromVerifiedOrder() throws Exception {
        booking.setPrice(new BigDecimal("200000"));
        assertEquals("04", service.processVNPayIpn(vnp("15000000")).getRspCode());
        assertUnpaid();
    }

    @Test void vnpCheckedInBookingIsPaidWithoutDispatch() throws Exception {
        booking.setCheckedInAt(LocalDateTime.of(2026, 10, 31, 10, 0));
        service.processVNPayIpn(vnp("15000000"));
        assertTrue(booking.getIsPaid());
        assertNull(booking.getDispatchedAt());
    }

    private CounterTicket installRealReceptionForArrivedBooking() {
        booking.setBookingId(UUID.randomUUID());
        booking.setBookingDate(java.time.LocalDate.of(2026, 10, 31));
        booking.setCheckedInAt(LocalDateTime.of(2026, 10, 31, 9, 0));
        Doctor doctor = Doctor.builder().doctorId(UUID.randomUUID()).build();
        DoctorSchedule schedule = DoctorSchedule.builder().doctor(doctor).scheduleDate(booking.getBookingDate()).room(Room.builder().roomId(12).build()).build();
        booking.setDoctor(doctor);
        booking.setTimeSlot(TimeSlot.builder().doctorSchedule(schedule).build());
        CounterTicket ticket = CounterTicket.builder().booking(booking).status(CounterTicketStatus.WAITING).build();
        CounterTicketRepository tickets = mock(CounterTicketRepository.class);
        when(tickets.findAllByBookingForUpdate(booking.getBookingId())).thenReturn(List.of(ticket));
        var reception = new com.hospital.api.service.impl.BookingReceptionTransition(bookings, tickets, mock(CounterRepository.class),
                mock(DoctorRepository.class), mock(DoctorScheduleRepository.class), mock(TimeSlotRepository.class), mock(RoomRepository.class),
                java.time.Clock.fixed(java.time.Instant.parse("2026-10-31T03:00:00Z"), java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
        service = new PaymentServiceImpl(vnp, config, payOS, transactions, accounts, bookings, records, reception);
        return ticket;
    }

    @Test void verifiedVnpPaymentFinishesArrivedWaitingTicketAndDispatchesWithSameServiceCall() throws Exception {
        CounterTicket ticket = installRealReceptionForArrivedBooking();
        assertEquals("00", service.processVNPayIpn(vnp("15000000")).getRspCode());
        assertEquals(CounterTicketStatus.SERVED, ticket.getStatus());
        assertEquals(12, ticket.getDispatchedRoomId());
        LocalDateTime first = booking.getDispatchedAt(); assertNotNull(first);
        assertEquals("02", service.processVNPayIpn(vnp("15000000")).getRspCode());
        assertEquals(first, booking.getDispatchedAt());
        verify(transactions).save(transaction);
    }

    @Test void verifiedPayosPaymentFinishesArrivedWaitingTicketAndRetryKeepsDispatch() throws Exception {
        CounterTicket ticket = installRealReceptionForArrivedBooking();
        service.processPayOSWebhook(payos(AMOUNT, "00", "BANKREF", Map.of()));
        assertEquals(CounterTicketStatus.SERVED, ticket.getStatus());
        LocalDateTime first = booking.getDispatchedAt(); assertNotNull(first);
        service.processPayOSWebhook(payos(AMOUNT, "00", "BANKREF", Map.of()));
        assertEquals(first, booking.getDispatchedAt());
        verify(transactions).save(transaction);
    }

    @Test void providerSyncAlsoFinishesArrivedWaitingTicket() {
        CounterTicket ticket = installRealReceptionForArrivedBooking();
        transaction.setPaymentMethod(PaymentMethod.VIETQR);
        when(payOS.getPaymentLinkInformation(123L)).thenReturn(new com.hospital.api.dto.response.PayOSLinkResponse(
                123L, "link", null, null, "PAID", 150000L, null, null, null, null));
        service.syncPayOSPayment(123L);
        assertEquals(CounterTicketStatus.SERVED, ticket.getStatus());
        assertNotNull(booking.getDispatchedAt()); assertTrue(booking.getIsPaid());
    }

    @Test void vnpTransactionFailureDoesNotPay() throws Exception {
        var request = vnp("15000000");
        request.put("vnp_TransactionStatus", "02");
        signVnp(request);
        assertEquals("00", service.processVNPayIpn(request).getRspCode());
        assertFalse(booking.getIsPaid());
        assertEquals("FAILED", transaction.getStatus());
    }

    @Test void vnpBrowserReturnNeverConfirmsPayment() throws Exception {
        service.processVNPayCallback(vnp("15000000"));
        assertUnpaid();
    }

    @Test void payosValidFullWebhookPaysWithoutDispatchAndRetryDoesNotWriteTwice() throws Exception {
        transaction.setPaymentMethod(PaymentMethod.VIETQR);
        service.processPayOSWebhook(payos(AMOUNT, "00", "BANKREF", Map.of("counterAccountName", "Nguyen Van A")));
        assertTrue(booking.getIsPaid());
        assertNull(booking.getDispatchedAt());
        service.processPayOSWebhook(payos(AMOUNT, "00", "BANKREF", Map.of("counterAccountName", "Nguyen Van A")));
        verify(bookings).findByBookingCodeForUpdate(BOOKING);
        verify(bookings).save(booking);
        verify(transactions).save(transaction);
    }

    @Test void payosInvalidSignatureNeverWrites() throws Exception {
        var valid = payos(AMOUNT, "00", "BANKREF", Map.of());
        assertThrows(AppException.class, () -> service.processPayOSWebhook(new PayOSWebhookRequest("00", "success", valid.data(), "invalid")));
        assertUnpaid();
    }

    @ParameterizedTest @NullAndEmptySource @ValueSource(strings={"149999", "150000.01"})
    void payosRequiresExactAmount(String amount) throws Exception {
        var request = payos(amount == null || amount.isEmpty() ? null : new BigDecimal(amount), "00", "BANKREF", Map.of());
        assertThrows(AppException.class, () -> service.processPayOSWebhook(request));
        assertUnpaid();
    }

    @ParameterizedTest @ValueSource(strings={"no booking", BOOKING + " " + "BK20261031DEF456", "X" + BOOKING})
    void payosRejectsMissingOrAmbiguousBooking(String description) throws Exception {
        transaction.setDescription(description);
        var request = payos(AMOUNT, "00", "BANKREF", Map.of());
        assertThrows(AppException.class, () -> service.processPayOSWebhook(request));
        assertUnpaid();
    }

    @Test void payosFailureCannotBecomeSuccess() throws Exception {
        var request = payos(AMOUNT, "99", "BANKREF", Map.of());
        assertThrows(AppException.class, () -> service.processPayOSWebhook(request));
        assertUnpaid();
    }

    @Test void payosMissingBankReferenceCannotBecomeSuccess() throws Exception {
        var request = payos(AMOUNT, "00", "", Map.of());
        assertThrows(AppException.class, () -> service.processPayOSWebhook(request));
        assertUnpaid();
    }

    @Test void payosWrongOrderCannotFallBackToDescription() throws Exception {
        transaction.setOrderCode(456L);
        var request = payos(AMOUNT, "00", "BANKREF", Map.of());
        assertThrows(AppException.class, () -> service.processPayOSWebhook(request));
        assertUnpaid();
    }

    @Test void payosMissingBookingNeverPays() throws Exception {
        when(bookings.findByBookingCodeForUpdate(BOOKING)).thenReturn(Optional.empty());
        var request = payos(AMOUNT, "00", "BANKREF", Map.of());
        assertThrows(AppException.class, () -> service.processPayOSWebhook(request));
        assertUnpaid();
    }

    @Test void payosWrongBookingPriceNeverPays() throws Exception {
        booking.setPrice(new BigDecimal("200000"));
        var request = payos(AMOUNT, "00", "BANKREF", Map.of());
        assertThrows(AppException.class, () -> service.processPayOSWebhook(request));
        assertUnpaid();
    }

    @Test void payosWalletDepositRetryCreditsOnceWithoutBooking() throws Exception {
        Account account = Account.builder().balance(BigDecimal.ZERO).build();
        transaction.setTransactionType(TransactionType.DEPOSIT_WALLET);
        transaction.setAccount(account);
        service.processPayOSWebhook(payos(AMOUNT, "00", "BANKREF", Map.of()));
        service.processPayOSWebhook(payos(AMOUNT, "00", "BANKREF", Map.of()));
        assertEquals(0, AMOUNT.compareTo(account.getBalance()));
        verify(accounts).save(account);
        verifyNoInteractions(bookings);
    }

    @Test void payosUsesProviderPublishedSignatureVector() throws Exception {
        // Public sample checksum/signature from the provider documentation, not live credentials.
        config.checksumKey = "1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675";
        transaction.setAmount(new BigDecimal("3000"));
        transaction.setPaymentMethod(PaymentMethod.VIETQR);
        transaction.setTransactionType(TransactionType.PAY_MEDICAL_TEST);
        String json = """
                {"code":"00","desc":"success","success":true,"signature":"412e915d2871504ed31be63c8f62a149a4410d34c4c42affc9006ef9917eaa03",
                "data":{"orderCode":123,"amount":3000,"description":"VQRIO123","accountNumber":"12345678",
                "reference":"TF230204212323","transactionDateTime":"2023-02-04 18:25:00","currency":"VND",
                "paymentLinkId":"124c33293c43417ab7879e14c8d9eb18","code":"00","desc":"Thành công",
                "counterAccountBankId":"","counterAccountBankName":"","counterAccountName":"","counterAccountNumber":"",
                "virtualAccountName":"","virtualAccountNumber":""}}
                """;
        assertEquals("SUCCESS", service.processPayOSWebhook(new ObjectMapper().readValue(json, PayOSWebhookRequest.class)).status());
        verifyNoInteractions(bookings);
    }

    @Test void createBookingOrderRequiresReferenceAndServerPrice() {
        assertThrows(AppException.class, () -> service.createVietQRPayment(null, AMOUNT, TransactionType.PAY_BOOKING, null));
        assertThrows(AppException.class, () -> service.createVietQRPayment(null, BigDecimal.ONE, TransactionType.PAY_BOOKING, BOOKING));
        verify(transactions, never()).save(any());
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(value = PaymentMethod.class, names = {"VNPAY", "VIETQR", "PAYOS", "MOMO"})
    void manualConfirmationCannotOverrideGatewayEvidence(PaymentMethod gateway) {
        transaction.setPaymentMethod(gateway);
        for (PaymentMethod requested : PaymentMethod.values()) {
            assertThrows(AppException.class, () -> service.confirmPaymentSuccess("VNP123", requested));
            assertEquals(gateway, transaction.getPaymentMethod());
            assertUnpaid();
        }
        assertThrows(AppException.class, () -> service.confirmPaymentSuccess("VNP123", null));
        verifyNoInteractions(bookings);
    }

    @ParameterizedTest
    @org.junit.jupiter.params.provider.EnumSource(value = PaymentMethod.class, names = {"CASH", "COUNTER_CASH", "POS"})
    void manualConfirmationSupportsExistingPhysicalTenderAndIsIdempotent(PaymentMethod method) {
        transaction.setPaymentMethod(method);
        service.confirmPaymentSuccess("VNP123", method);
        service.confirmPaymentSuccess("VNP123", method);
        assertEquals("SUCCESS", transaction.getStatus());
        assertTrue(booking.getIsPaid());
        assertNull(booking.getDispatchedAt());
        assertEquals(method, transaction.getPaymentMethod());
        verify(bookings).save(booking);
        verify(transactions).save(transaction);
    }

    @Test void manualConfirmationRequiresExplicitMatchingPhysicalTender() {
        transaction.setPaymentMethod(PaymentMethod.CASH);
        assertThrows(AppException.class, () -> service.confirmPaymentSuccess("VNP123", null));
        assertThrows(AppException.class, () -> service.confirmPaymentSuccess("VNP123", PaymentMethod.POS));
        assertThrows(AppException.class, () -> service.confirmPaymentSuccess("VNP123", PaymentMethod.VIETQR));
        assertEquals(PaymentMethod.CASH, transaction.getPaymentMethod());
        assertUnpaid();
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void payosOrderDescriptionIsShortStableAsciiMappingWithFullLocalBooking(boolean dedicatedLink) {
        if (dedicatedLink) {
            service.createPayOSPaymentLink(null, AMOUNT, TransactionType.PAY_BOOKING, "VP BILL-" + BOOKING + "-EXAM");
        } else {
            service.createVietQRPayment(null, AMOUNT, TransactionType.PAY_BOOKING, BOOKING);
        }
        var orderCode = org.mockito.ArgumentCaptor.forClass(Long.class);
        var description = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(payOS).createPaymentLink(orderCode.capture(), eq(AMOUNT), description.capture(), anyString(), anyString(), anyList());
        assertTrue(description.getValue().matches("[0-9A-Z]{1,9}"));
        assertEquals(orderCode.getValue(), Long.valueOf(description.getValue(), 36));
        assertEquals(Long.toString(orderCode.getValue(), 36).toUpperCase(Locale.ROOT), description.getValue());
        var saved = org.mockito.ArgumentCaptor.forClass(Transaction.class);
        verify(transactions).save(saved.capture());
        assertTrue(saved.getValue().getDescription().contains(BOOKING));
    }

    @Test void createBookingVietQrStoresExactBookingAndKeepsAnonymousAccountUnassigned() {
        service.createVietQRPayment(null, AMOUNT, TransactionType.PAY_BOOKING, BOOKING);
        var saved = org.mockito.ArgumentCaptor.forClass(Transaction.class);
        verify(transactions).save(saved.capture());
        assertTrue(saved.getValue().getDescription().endsWith(" - " + BOOKING));
        assertEquals("PENDING", saved.getValue().getStatus());
        assertNull(saved.getValue().getAccount());
        assertFalse(saved.getValue().getIsVerified());
        verify(accounts, never()).findAll();
    }

    @Test void payosSyncRejectsWrongAmountAndReferenceBeforeBookingChanges() {
        transaction.setPaymentMethod(PaymentMethod.VIETQR);
        when(payOS.getPaymentLinkInformation(123L)).thenReturn(new com.hospital.api.dto.response.PayOSLinkResponse(
                123L, "link", null, null, "PAID", 1L, null, null, null, null));
        assertThrows(AppException.class, () -> service.syncPayOSPayment(123L));
        assertUnpaid();
        when(payOS.getPaymentLinkInformation(123L)).thenReturn(new com.hospital.api.dto.response.PayOSLinkResponse(
                456L, "link", null, null, "PAID", 150000L, null, null, null, null));
        assertThrows(AppException.class, () -> service.syncPayOSPayment(123L));
        assertUnpaid();
    }

    @Test void payosSyncPaysCorrectBookingAndWebhookRetryDoesNotWriteAgain() throws Exception {
        transaction.setPaymentMethod(PaymentMethod.VIETQR);
        when(payOS.getPaymentLinkInformation(123L)).thenReturn(new com.hospital.api.dto.response.PayOSLinkResponse(
                123L, "link", null, null, "PAID", 150000L, null, null, null, null));
        service.syncPayOSPayment(123L);
        service.processPayOSWebhook(payos(AMOUNT, "00", "BANKREF", Map.of()));
        assertTrue(booking.getIsPaid());
        assertNull(booking.getDispatchedAt());
        verify(transactions).save(transaction);
        verify(bookings).save(booking);
    }

    @Test void payosTreatmentPaymentDoesNotMarkConsultationPaid() throws Exception {
        transaction.setPaymentMethod(PaymentMethod.VIETQR);
        transaction.setDescription("VP BILL-" + BOOKING + "-TREATMENT");
        service.processPayOSWebhook(payos(AMOUNT, "00", "BANKREF", Map.of()));
        assertEquals("SUCCESS", transaction.getStatus());
        assertFalse(booking.getIsPaid());
        verify(bookings, never()).save(any());
    }

    @Test void vnpWalletDepositRetryCreditsOnceWithoutBooking() throws Exception {
        Account account = Account.builder().balance(BigDecimal.ZERO).build();
        transaction.setTransactionType(TransactionType.DEPOSIT_WALLET);
        transaction.setAccount(account);
        service.processVNPayIpn(vnp("15000000"));
        service.processVNPayIpn(vnp("15000000"));
        assertEquals(0, AMOUNT.compareTo(account.getBalance()));
        verify(accounts).save(account);
        verifyNoInteractions(bookings);
    }

    private void assertUnpaid() {
        assertFalse(booking.getIsPaid());
        assertEquals("PENDING", transaction.getStatus());
        verify(bookings, never()).save(any());
        verify(transactions, never()).save(any());
        verify(accounts, never()).save(any());
    }

    private Map<String, String> vnp(String amount) throws Exception {
        Map<String, String> data = new TreeMap<>();
        data.put("vnp_TxnRef", "VNP123");
        data.put("vnp_ResponseCode", "00");
        data.put("vnp_TransactionStatus", "00");
        if (amount != null) data.put("vnp_Amount", amount);
        signVnp(data);
        return data;
    }

    private void signVnp(Map<String, String> data) throws Exception {
        String text = new TreeMap<>(data).entrySet().stream()
                .filter(e -> !e.getKey().equals("vnp_SecureHash") && !e.getValue().isEmpty())
                .map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII))
                .collect(Collectors.joining("&"));
        data.put("vnp_SecureHash", VNPayConfig.hmacSHA512(vnp.secretKey, text));
    }

    private PayOSWebhookRequest payos(BigDecimal amount, String code, String reference, Map<String, String> extra) throws Exception {
        transaction.setPaymentMethod(PaymentMethod.VIETQR);
        Map<String, Object> data = new TreeMap<>();
        data.put("orderCode", 123L); data.put("amount", amount); data.put("description", "VNP123");
        data.put("accountNumber", "123456"); data.put("reference", reference);
        data.put("transactionDateTime", "2026-10-31 10:00:00"); data.put("currency", "VND");
        data.put("paymentLinkId", "link"); data.put("code", code); data.put("desc", "success");
        data.putAll(extra);
        String text = data.entrySet().stream().map(e -> e.getKey() + "=" + (e.getValue() == null ? "" : e.getValue()))
                .collect(Collectors.joining("&"));
        ObjectMapper mapper = new ObjectMapper();
        return mapper.readValue(mapper.writeValueAsString(Map.of("code", code, "desc", "success", "data", data,
                "signature", PayOSConfig.hmacSHA256(config.checksumKey, text))), PayOSWebhookRequest.class);
    }
}
