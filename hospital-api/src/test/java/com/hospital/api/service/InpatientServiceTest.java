package com.hospital.api.service;

import com.hospital.api.constant.BedStatus;
import com.hospital.api.constant.HospitalAdmissionState;
import com.hospital.api.dto.request.AdmitPatientRequest;
import com.hospital.api.dto.request.BedTransferRequest;
import com.hospital.api.dto.request.DischargeRequest;
import com.hospital.api.dto.response.BedTransferResponse;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.InpatientServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InpatientServiceTest {

    @Mock
    private HospitalAdmissionRepository admissionRepository;
    @Mock
    private PatientProfileRepository profileRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private RoomRepository roomRepository;
    @Mock
    private HospitalizationDetailRepository detailRepository;
    @Mock
    private DischargeRepository dischargeRepository;
    @Mock
    private BedRepository bedRepository;
    @Mock
    private InpatientBedTransferRepository transferRepository;
    @Mock
    private InpatientDoctorOrderRepository doctorOrderRepository;
    @Mock
    private InpatientNursingCareRepository nursingCareRepository;
    @Mock
    private StaffRepository staffRepository;
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private AuditLogService auditLogService;

    private InpatientServiceImpl inpatientService;

    private PatientProfile testProfile;
    private Department testDept;
    private Doctor testDoctor;
    private Room testRoom;
    private Bed testBed;

    @BeforeEach
    void setUp() {
        inpatientService = new InpatientServiceImpl(
                admissionRepository,
                profileRepository,
                doctorRepository,
                roomRepository,
                detailRepository,
                dischargeRepository,
                bedRepository,
                transferRepository,
                doctorOrderRepository,
                nursingCareRepository,
                staffRepository,
                accountRepository,
                auditLogService
        );

        testDept = Department.builder()
                .departmentId(1)
                .departmentName("Khoa Nội Tổng Hợp")
                .build();

        Account doctorAccount = Account.builder().fullName("BS. Nguyễn Văn A").build();
        testDoctor = Doctor.builder()
                .doctorId(UUID.randomUUID())
                .account(doctorAccount)
                .department(testDept)
                .build();

        testProfile = PatientProfile.builder()
                .patientProfileId(UUID.randomUUID())
                .fullName("Trần Thị B")
                .allergies("Không dị ứng")
                .build();

        testRoom = Room.builder()
                .roomId(101)
                .roomName("Phòng 101")
                .department(testDept)
                .build();

        testBed = Bed.builder()
                .bedId(UUID.randomUUID())
                .bedNumber("G-01")
                .status(BedStatus.AVAILABLE)
                .room(testRoom)
                .build();
    }

    @Test
    @DisplayName("Admit patient successfully when bed is AVAILABLE and department matches")
    void admitPatient_success() {
        AdmitPatientRequest request = new AdmitPatientRequest(
                testProfile.getPatientProfileId(),
                testRoom.getRoomId(),
                testDoctor.getDoctorId(),
                "Viêm phế quản cấp",
                testBed.getBedId()
        );

        when(profileRepository.findById(testProfile.getPatientProfileId())).thenReturn(Optional.of(testProfile));
        when(doctorRepository.findById(testDoctor.getDoctorId())).thenReturn(Optional.of(testDoctor));
        when(roomRepository.findById(testRoom.getRoomId())).thenReturn(Optional.of(testRoom));
        when(bedRepository.findByIdForUpdate(testBed.getBedId())).thenReturn(Optional.of(testBed));
        when(admissionRepository.save(any(HospitalAdmission.class))).thenAnswer(invocation -> {
            HospitalAdmission adm = invocation.getArgument(0);
            adm.setAdmissionId(UUID.randomUUID());
            return adm;
        });

        HospitalAdmission result = inpatientService.admitPatient(request);

        assertNotNull(result);
        assertEquals(HospitalAdmissionState.ADMITTED, result.getState());
        assertEquals(BedStatus.OCCUPIED, testBed.getStatus());
        verify(bedRepository).save(testBed);
        verify(admissionRepository).save(any(HospitalAdmission.class));
    }

    @Test
    @DisplayName("Admit patient throws AppException when bed is already OCCUPIED")
    void admitPatient_bedOccupied_throwsAppException() {
        testBed.setStatus(BedStatus.OCCUPIED);

        AdmitPatientRequest request = new AdmitPatientRequest(
                testProfile.getPatientProfileId(),
                testRoom.getRoomId(),
                testDoctor.getDoctorId(),
                "Chẩn đoán",
                testBed.getBedId()
        );

        when(profileRepository.findById(testProfile.getPatientProfileId())).thenReturn(Optional.of(testProfile));
        when(doctorRepository.findById(testDoctor.getDoctorId())).thenReturn(Optional.of(testDoctor));
        when(roomRepository.findById(testRoom.getRoomId())).thenReturn(Optional.of(testRoom));
        when(bedRepository.findByIdForUpdate(testBed.getBedId())).thenReturn(Optional.of(testBed));

        AppException ex = assertThrows(AppException.class, () -> inpatientService.admitPatient(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("không khả dụng"));
    }

    @Test
    @DisplayName("Admit patient throws AppException when room belongs to different department")
    void admitPatient_differentDepartment_throwsAppException() {
        Department diffDept = Department.builder().departmentId(2).departmentName("Khoa Ngoại").build();
        Room diffRoom = Room.builder().roomId(202).roomName("Phòng 202").department(diffDept).build();

        AdmitPatientRequest request = new AdmitPatientRequest(
                testProfile.getPatientProfileId(),
                diffRoom.getRoomId(),
                testDoctor.getDoctorId(),
                "Chẩn đoán",
                testBed.getBedId()
        );

        when(profileRepository.findById(testProfile.getPatientProfileId())).thenReturn(Optional.of(testProfile));
        when(doctorRepository.findById(testDoctor.getDoctorId())).thenReturn(Optional.of(testDoctor));
        when(roomRepository.findById(diffRoom.getRoomId())).thenReturn(Optional.of(diffRoom));

        AppException ex = assertThrows(AppException.class, () -> inpatientService.admitPatient(request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("chuyên khoa"));
    }

    @Test
    @DisplayName("Transfer bed successfully within same department")
    void transferBed_success() {
        UUID admissionId = UUID.randomUUID();
        HospitalAdmission admission = HospitalAdmission.builder()
                .admissionId(admissionId)
                .patientProfile(testProfile)
                .treatingDoctor(testDoctor)
                .room(testRoom)
                .bed(testBed)
                .state(HospitalAdmissionState.ADMITTED)
                .build();

        Bed targetBed = Bed.builder()
                .bedId(UUID.randomUUID())
                .bedNumber("G-02")
                .status(BedStatus.AVAILABLE)
                .room(testRoom)
                .build();

        BedTransferRequest transferRequest = new BedTransferRequest(
                targetBed.getBedId(),
                "Chuyển sang giường gần cửa sổ",
                testDoctor.getDoctorId()
        );

        when(admissionRepository.findById(admissionId)).thenReturn(Optional.of(admission));
        when(bedRepository.findById(targetBed.getBedId())).thenReturn(Optional.of(targetBed));
        when(doctorRepository.findById(testDoctor.getDoctorId())).thenReturn(Optional.of(testDoctor));
        when(transferRepository.save(any(InpatientBedTransfer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BedTransferResponse response = inpatientService.transferBed(admissionId, transferRequest);

        assertNotNull(response);
        assertEquals(BedStatus.CLEANING, testBed.getStatus());
        assertEquals(BedStatus.OCCUPIED, targetBed.getStatus());
        assertEquals(targetBed, admission.getBed());
    }

    @Test
    @DisplayName("Discharge patient updates admission state to DISCHARGED and bed to CLEANING")
    void dischargePatient_success() {
        UUID admissionId = UUID.randomUUID();
        testBed.setStatus(BedStatus.OCCUPIED);
        HospitalAdmission admission = HospitalAdmission.builder()
                .admissionId(admissionId)
                .patientProfile(testProfile)
                .treatingDoctor(testDoctor)
                .room(testRoom)
                .bed(testBed)
                .state(HospitalAdmissionState.ADMITTED)
                .admissionDate(Instant.now().minusSeconds(86400 * 3))
                .dailyRoomFee(BigDecimal.valueOf(300000))
                .build();

        DischargeRequest request = new DischargeRequest(
                "Bệnh nhân hồi phục tốt, hết sốt",
                "Uống thuốc theo đơn, tái khám sau 7 ngày",
                LocalDate.now().plusDays(7)
        );

        when(admissionRepository.findById(admissionId)).thenReturn(Optional.of(admission));
        when(dischargeRepository.save(any(Discharge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Discharge discharge = inpatientService.dischargePatient(admissionId, request);

        assertNotNull(discharge);
        assertEquals(HospitalAdmissionState.DISCHARGED, admission.getState());
        assertEquals(BedStatus.CLEANING, testBed.getStatus());
        verify(bedRepository).save(testBed);
        verify(dischargeRepository).save(any(Discharge.class));
    }
}
