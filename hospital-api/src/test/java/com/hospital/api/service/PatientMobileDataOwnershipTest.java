package com.hospital.api.service;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.Gender;
import com.hospital.api.constant.MedicalExamState;
import com.hospital.api.constant.Role;
import com.hospital.api.dto.request.PatientProfileRequest;
import com.hospital.api.dto.request.ReserveSlotRequest;
import com.hospital.api.dto.response.ReserveSlotResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.MedicalExaminationRecord;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.entity.TimeSlot;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.BookingReceptionTransition;
import com.hospital.api.service.impl.BookingServiceImpl;
import com.hospital.api.service.impl.ClinicalExaminationServiceImpl;
import com.hospital.api.service.impl.PatientProfileServiceImpl;
import com.hospital.api.service.impl.SlotReservationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientMobileDataOwnershipTest {

    private static final UUID OWNER_ACCOUNT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID FOREIGN_ACCOUNT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock private PatientProfileRepository patientProfileRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private MedicalExaminationRecordRepository recordRepository;
    @Mock private TimeSlotRepository timeSlotRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private DoctorScheduleRepository scheduleRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private CounterTicketRepository counterTicketRepository;
    @Mock private BookingReceptionTransition reception;
    @Mock private MedicalTestRepository testRepository;
    @Mock private MedicalServiceRepository serviceRepository;
    @Mock private MedicineRepository medicineRepository;
    @Mock private PrescriptionRepository prescriptionRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private MedicalConceptRepository conceptRepository;
    @Mock private MedicalObservationRepository observationRepository;
    @Mock private MedicalConditionRepository conditionRepository;
    @Mock private MedicalRecordAddendumRepository addendumRepository;
    @Mock private MedicalTestResultItemRepository resultItemRepository;
    @Mock private StaffRepository staffRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private AuditLogService auditLogService;

    private PatientProfileServiceImpl patientProfileService;
    private SlotReservationServiceImpl slotReservationService;
    private BookingServiceImpl bookingService;
    private ClinicalExaminationServiceImpl clinicalService;

    private Account ownerAccount;
    private PatientProfile ownerProfile;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-07T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        patientProfileService = new PatientProfileServiceImpl(
                patientProfileRepository,
                accountRepository,
                recordRepository
        );
        slotReservationService = new SlotReservationServiceImpl(timeSlotRepository);
        bookingService = new BookingServiceImpl(
                bookingRepository,
                timeSlotRepository,
                patientProfileRepository,
                accountRepository,
                doctorRepository,
                scheduleRepository,
                roomRepository,
                transactionRepository,
                slotReservationService,
                reception,
                counterTicketRepository,
                clock
        );
        clinicalService = new ClinicalExaminationServiceImpl(
                recordRepository,
                bookingRepository,
                doctorRepository,
                serviceRepository,
                testRepository,
                medicineRepository,
                prescriptionRepository,
                notificationRepository,
                accountRepository,
                conceptRepository,
                observationRepository,
                conditionRepository,
                staffRepository,
                resultItemRepository,
                addendumRepository,
                patientProfileRepository,
                transactionRepository,
                auditLogService,
                departmentRepository
        );

        ownerAccount = Account.builder()
                .userId(OWNER_ACCOUNT_ID)
                .phoneNumber("0901111111")
                .fullName("Owner Patient")
                .role(Role.ROLE_PATIENT)
                .build();

        ownerProfile = PatientProfile.builder()
                .patientProfileId(UUID.randomUUID())
                .account(ownerAccount)
                .fullName("Owner Patient")
                .phoneNumber("0901111111")
                .gender(Gender.MALE)
                .dateOfBirth(LocalDate.of(1992, 5, 10))
                .build();
    }

    @Test
    void patientCannotUpdateOrDeleteAnotherAccountsProfile() {
        UUID profileId = ownerProfile.getPatientProfileId();
        when(patientProfileRepository.findById(profileId)).thenReturn(Optional.of(ownerProfile));

        PatientProfileRequest updateRequest = new PatientProfileRequest(
                "Tampered Name",
                "0909999999",
                "001092000001",
                "DN4010000001",
                Gender.MALE,
                LocalDate.of(1992, 5, 10),
                "123 Street",
                "Hà Nội",
                "Cầu Giấy",
                "Dịch Vọng",
                "SELF"
        );

        AppException getEx = assertThrows(AppException.class,
                () -> patientProfileService.getProfileById(FOREIGN_ACCOUNT_ID, profileId, false));
        assertEquals(HttpStatus.FORBIDDEN, getEx.getStatus());

        AppException updateEx = assertThrows(AppException.class,
                () -> patientProfileService.updateProfile(FOREIGN_ACCOUNT_ID, profileId, updateRequest));
        assertEquals(HttpStatus.FORBIDDEN, updateEx.getStatus());

        AppException deleteEx = assertThrows(AppException.class,
                () -> patientProfileService.deleteProfile(FOREIGN_ACCOUNT_ID, profileId));
        assertEquals(HttpStatus.FORBIDDEN, deleteEx.getStatus());

        assertFalse(ownerProfile.isDeleted());
        assertEquals("Owner Patient", ownerProfile.getFullName());
        verify(patientProfileRepository, never()).save(any());
    }

    @Test
    void patientCannotReleaseAnotherAccountsReservation() {
        UUID slotId = UUID.randomUUID();
        TimeSlot slot = TimeSlot.builder()
                .timeSlotId(slotId)
                .currentBookings(0)
                .holdingCount(0)
                .maxCapacity(5)
                .build();

        when(timeSlotRepository.findByIdWithLock(slotId)).thenReturn(Optional.of(slot));
        when(timeSlotRepository.save(any(TimeSlot.class))).thenAnswer(i -> i.getArgument(0));

        ReserveSlotResponse reserved = slotReservationService.reserveSlot(
                new ReserveSlotRequest(slotId, ownerProfile.getPatientProfileId()),
                OWNER_ACCOUNT_ID
        );
        assertEquals(1, slot.getHoldingCount());

        AppException foreignReleaseEx = assertThrows(AppException.class,
                () -> slotReservationService.releaseSlot(reserved.reservationId(), FOREIGN_ACCOUNT_ID));
        assertEquals(HttpStatus.FORBIDDEN, foreignReleaseEx.getStatus());
        assertEquals(1, slot.getHoldingCount(), "Foreign account must not release held slot");

        AppException anonymousReleaseEx = assertThrows(AppException.class,
                () -> slotReservationService.releaseSlot(reserved.reservationId(), null));
        assertEquals(HttpStatus.FORBIDDEN, anonymousReleaseEx.getStatus());
        assertEquals(1, slot.getHoldingCount(), "Unauthenticated caller must not release account-owned held slot");

        slotReservationService.releaseSlot(reserved.reservationId(), OWNER_ACCOUNT_ID);
        assertEquals(0, slot.getHoldingCount(), "Owning account can release its held slot");
    }

    @Test
    void patientCannotCancelAnotherAccountsBooking() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder()
                .bookingId(bookingId)
                .bookingCode("BK20261107OWN01")
                .patientProfile(ownerProfile)
                .status(BookingStatus.PENDING_PAYMENT)
                .price(BigDecimal.valueOf(200000))
                .isPaid(false)
                .build();

        when(bookingRepository.findByIdWithLock(bookingId)).thenReturn(Optional.of(booking));

        AppException cancelEx = assertThrows(AppException.class,
                () -> bookingService.cancelBooking(FOREIGN_ACCOUNT_ID, bookingId, false));
        assertEquals(HttpStatus.FORBIDDEN, cancelEx.getStatus());
        assertEquals(BookingStatus.PENDING_PAYMENT, booking.getStatus());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void patientCannotReadAnotherAccountsMedicalRecord() {
        UUID recordId = UUID.randomUUID();
        String bookingCode = "BK20261107OWN02";
        Booking booking = Booking.builder()
                .bookingId(UUID.randomUUID())
                .bookingCode(bookingCode)
                .patientProfile(ownerProfile)
                .build();
        MedicalExaminationRecord record = MedicalExaminationRecord.builder()
                .recordId(recordId)
                .booking(booking)
                .patientProfile(ownerProfile)
                .symptoms("Đau đầu")
                .finalDiagnosis("Đau nửa đầu Migraine")
                .state(MedicalExamState.DONE)
                .build();

        when(recordRepository.findById(recordId)).thenReturn(Optional.of(record));
        when(recordRepository.findByBooking_BookingCode(bookingCode)).thenReturn(Optional.of(record));
        when(recordRepository.findAllByPatientProfile_PatientProfileIdAndDeletedFalseOrderByCreatedAtDesc(ownerProfile.getPatientProfileId()))
                .thenReturn(List.of(record));

        AppException byIdEx = assertThrows(AppException.class,
                () -> clinicalService.getRecordById(recordId, FOREIGN_ACCOUNT_ID, false));
        assertEquals(HttpStatus.FORBIDDEN, byIdEx.getStatus());

        AppException byCodeEx = assertThrows(AppException.class,
                () -> clinicalService.getRecordByBookingCode(bookingCode, FOREIGN_ACCOUNT_ID, false));
        assertEquals(HttpStatus.FORBIDDEN, byCodeEx.getStatus());

        AppException byProfileEx = assertThrows(AppException.class,
                () -> clinicalService.getRecordsByPatientProfile(ownerProfile.getPatientProfileId(), FOREIGN_ACCOUNT_ID, false));
        assertEquals(HttpStatus.FORBIDDEN, byProfileEx.getStatus());
    }
}

