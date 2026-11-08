package com.hospital.api.service;

import com.hospital.api.config.PayOSConfig;
import com.hospital.api.config.VNPayConfig;
import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.constant.Role;
import com.hospital.api.constant.TransactionType;
import com.hospital.api.dto.response.CashierBillItemDto;
import com.hospital.api.dto.response.PatientPendingBillResponse;
import com.hospital.api.dto.response.PayOSLinkResponse;
import com.hospital.api.dto.response.PaymentGatewayResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.entity.Transaction;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.DischargeRepository;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import com.hospital.api.repository.MedicalTestRepository;
import com.hospital.api.repository.PrescriptionRepository;
import com.hospital.api.repository.TransactionRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.impl.BookingReceptionTransition;
import com.hospital.api.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientPaymentAuthorizationTest {

    private static final String BOOKING_CODE = "BK20261107AUTH01";
    private static final String BILL_ID_EXAM = "BILL-" + BOOKING_CODE + "-EXAM";
    private static final String BILL_ID_TEST = "BILL-" + BOOKING_CODE + "-TEST";

    @Mock
    private TransactionRepository transactionRepository;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private MedicalExaminationRecordRepository recordRepository;
    @Mock
    private MedicalTestRepository testRepository;
    @Mock
    private PrescriptionRepository prescriptionRepository;
    @Mock
    private DischargeRepository dischargeRepository;
    @Mock
    private PayOSService payOSService;
    @Mock
    private CashierService cashierService;
    @Mock
    private BookingReceptionTransition reception;

    private PaymentServiceImpl paymentService;
    private UUID ownerAccountId;
    private UUID foreignAccountId;
    private Account ownerAccount;
    private Account foreignAccount;
    private Booking ownedBooking;

    @BeforeEach
    void setUp() {
        VNPayConfig vnpConfig = new VNPayConfig();
        vnpConfig.secretKey = "test-vnp-secret";
        PayOSConfig payOSConfig = new PayOSConfig();
        payOSConfig.checksumKey = "test-payos-checksum";
        payOSConfig.bankName = "MBBank";
        payOSConfig.bankBin = "970422";
        payOSConfig.bankAccount = "0123456789";
        payOSConfig.accountHolder = "BENH VIEN TNT";

        paymentService = new PaymentServiceImpl(
                vnpConfig,
                payOSConfig,
                payOSService,
                transactionRepository,
                accountRepository,
                bookingRepository,
                recordRepository,
                testRepository,
                prescriptionRepository,
                dischargeRepository,
                reception,
                cashierService
        );

        ownerAccountId = UUID.randomUUID();
        ownerAccount = Account.builder()
                .userId(ownerAccountId)
                .phoneNumber("0901112222")
                .fullName("Bệnh Nhân Chủ Sở Hữu")
                .role(Role.ROLE_PATIENT)
                .isActive(true)
                .build();

        foreignAccountId = UUID.randomUUID();
        foreignAccount = Account.builder()
                .userId(foreignAccountId)
                .phoneNumber("0909998888")
                .fullName("Bệnh Nhân Khác")
                .role(Role.ROLE_PATIENT)
                .isActive(true)
                .build();

        PatientProfile ownerProfile = PatientProfile.builder()
                .patientProfileId(UUID.randomUUID())
                .account(ownerAccount)
                .fullName("Bệnh Nhân Chủ Sở Hữu")
                .phoneNumber("0901112222")
                .build();

        ownedBooking = Booking.builder()
                .bookingId(UUID.randomUUID())
                .bookingCode(BOOKING_CODE)
                .patientProfile(ownerProfile)
                .price(new BigDecimal("120000"))
                .status(BookingStatus.PENDING_PAYMENT)
                .isPaid(false)
                .build();

        lenient().when(accountRepository.findById(ownerAccountId)).thenReturn(Optional.of(ownerAccount));
        lenient().when(accountRepository.findById(foreignAccountId)).thenReturn(Optional.of(foreignAccount));
        lenient().when(bookingRepository.findByBookingCodeForUpdate(BOOKING_CODE)).thenReturn(Optional.of(ownedBooking));
        lenient().when(bookingRepository.findByBookingCode(BOOKING_CODE)).thenReturn(Optional.of(ownedBooking));
        lenient().when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void patientPaymentLinkRequiresOwnedPendingBillAndServerAmount() {
        BigDecimal serverTestBalance = new BigDecimal("250000");
        PatientPendingBillResponse reconciledTestBill = new PatientPendingBillResponse(
                BILL_ID_TEST,
                BOOKING_CODE,
                ownedBooking.getBookingId(),
                "TEST",
                List.of(new CashierBillItemDto("TEST-1", "Xét nghiệm máu", 1, serverTestBalance, serverTestBalance, "TEST")),
                serverTestBalance,
                "RECONCILED",
                "UNPAID",
                LocalDateTime.now()
        );
        when(cashierService.getPatientPendingBills(ownerAccountId)).thenReturn(List.of(reconciledTestBill));
        when(payOSService.createPaymentLink(anyLong(), eq(serverTestBalance), anyString(), anyString(), anyString(), anyList()))
                .thenReturn(new PayOSLinkResponse(999L, "link-id", "https://pay.payos.vn/web/999", "00020101...", "PENDING", 250000L, "970422", "0123456789", "BENH VIEN TNT", "TNT"));

        PaymentGatewayResponse response = paymentService.createPatientPayOSPaymentLink(ownerAccountId, BILL_ID_TEST);

        assertEquals(0, serverTestBalance.compareTo(response.amount()));
        assertEquals(TransactionType.PAY_MEDICAL_TEST, response.transactionType());
        assertEquals("https://pay.payos.vn/web/999", response.paymentUrl());

        ArgumentCaptor<Transaction> savedTxn = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository).save(savedTxn.capture());
        assertEquals(0, serverTestBalance.compareTo(savedTxn.getValue().getAmount()));
        assertEquals(TransactionType.PAY_MEDICAL_TEST, savedTxn.getValue().getTransactionType());
        assertEquals(ownerAccountId, savedTxn.getValue().getAccount().getUserId());
        assertTrue(savedTxn.getValue().getDescription().contains(BILL_ID_TEST));
    }

    @Test
    void patientCannotPayAnotherAccountsBill() {
        AppException billLinkEx = assertThrows(
                AppException.class,
                () -> paymentService.createPatientPayOSPaymentLink(foreignAccountId, BILL_ID_EXAM)
        );
        assertEquals(HttpStatus.FORBIDDEN, billLinkEx.getStatus());

        AppException directLinkEx = assertThrows(
                AppException.class,
                () -> paymentService.createPayOSPaymentLink(
                        foreignAccountId,
                        new BigDecimal("120000"),
                        TransactionType.PAY_BOOKING,
                        "BILL-" + BOOKING_CODE + "-EXAM"
                )
        );
        assertEquals(HttpStatus.FORBIDDEN, directLinkEx.getStatus());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void patientCannotCreateDuplicatePaidBillLink() {
        Transaction existingSuccess = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .account(ownerAccount)
                .amount(new BigDecimal("120000"))
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("SUCCESS")
                .description("Thanh toán PayOS: " + BILL_ID_EXAM)
                .build();
        when(transactionRepository.findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(BILL_ID_EXAM, "SUCCESS"))
                .thenReturn(Optional.of(existingSuccess));

        AppException paidEx = assertThrows(
                AppException.class,
                () -> paymentService.createPatientPayOSPaymentLink(ownerAccountId, BILL_ID_EXAM)
        );
        assertEquals(HttpStatus.CONFLICT, paidEx.getStatus());

        when(transactionRepository.findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(BILL_ID_EXAM, "SUCCESS"))
                .thenReturn(Optional.empty());
        Transaction existingPending = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .account(ownerAccount)
                .amount(new BigDecimal("120000"))
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("PENDING")
                .description("Thanh toán PayOS: " + BILL_ID_EXAM)
                .build();
        when(transactionRepository.findFirstByDescriptionContainingAndStatusOrderByCreatedAtDesc(BILL_ID_EXAM, "PENDING"))
                .thenReturn(Optional.of(existingPending));

        AppException pendingEx = assertThrows(
                AppException.class,
                () -> paymentService.createPatientPayOSPaymentLink(ownerAccountId, BILL_ID_EXAM)
        );
        assertEquals(HttpStatus.CONFLICT, pendingEx.getStatus());
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void patientUnreconciledBillCheckoutFailsClosed() {
        PatientPendingBillResponse unreconciledBill = new PatientPendingBillResponse(
                BILL_ID_TEST,
                BOOKING_CODE,
                ownedBooking.getBookingId(),
                "TEST",
                List.of(new CashierBillItemDto("TEST-1", "Xét nghiệm máu", 1, new BigDecimal("250000"), new BigDecimal("250000"), "TEST")),
                null,
                "UNRECONCILED",
                "UNRECONCILED",
                LocalDateTime.now()
        );
        when(cashierService.getPatientPendingBills(ownerAccountId)).thenReturn(List.of(unreconciledBill));

        AppException ex = assertThrows(
                AppException.class,
                () -> paymentService.createPatientPayOSPaymentLink(ownerAccountId, BILL_ID_TEST)
        );
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(transactionRepository, never()).save(any());
        verify(payOSService, never()).createPaymentLink(anyLong(), any(), anyString(), anyString(), anyString(), anyList());
    }

    @Test
    void patientStatusAndSyncRequireOwningAccount() {
        Transaction ownedTxn = Transaction.builder()
                .transactionId(UUID.randomUUID())
                .account(ownerAccount)
                .amount(new BigDecimal("120000"))
                .transactionType(TransactionType.PAY_BOOKING)
                .paymentMethod(PaymentMethod.VIETQR)
                .status("PENDING")
                .vnpayTxnRef("TNT777")
                .orderCode(777L)
                .description("Thanh toán PayOS: " + BILL_ID_EXAM)
                .build();
        when(transactionRepository.findByVnpayTxnRef("TNT777")).thenReturn(Optional.of(ownedTxn));
        when(transactionRepository.findByOrderCodeForUpdate(777L)).thenReturn(Optional.of(ownedTxn));

        AppException foreignStatusEx = assertThrows(
                AppException.class,
                () -> paymentService.checkTransactionStatus("TNT777", foreignAccountId, false)
        );
        assertEquals(HttpStatus.FORBIDDEN, foreignStatusEx.getStatus());

        UserPrincipal foreignPrincipal = new UserPrincipal(foreignAccount);
        AppException foreignSyncEx = assertThrows(
                AppException.class,
                () -> paymentService.syncPayOSPayment(777L, foreignPrincipal)
        );
        assertEquals(HttpStatus.FORBIDDEN, foreignSyncEx.getStatus());

        assertEquals("PENDING", paymentService.checkTransactionStatus("TNT777", ownerAccountId, false).status());
    }
}

