package com.hospital.api.service;

import com.hospital.api.config.InpatientAndLabDataInitializer;
import com.hospital.api.config.PharmacyAndGatewayDataInitializer;
import com.hospital.api.dto.request.AiConsultationRequest;
import com.hospital.api.dto.response.AiConsultationResponse;
import com.hospital.api.repository.*;
import com.hospital.api.service.impl.AiTriageServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.annotation.Profile;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductionSafetyPhase1Test {

    @Mock
    private RoomRepository roomRepository;
    @Mock
    private BedRepository bedRepository;
    @Mock
    private HospitalAdmissionRepository admissionRepository;
    @Mock
    private InpatientDoctorOrderRepository doctorOrderRepository;
    @Mock
    private InpatientNursingCareRepository nursingCareRepository;
    @Mock
    private MedicalConceptRepository conceptRepository;
    @Mock
    private MedicalTestRepository medicalTestRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private StaffRepository staffRepository;
    @Mock
    private PharmacyWarehouseRepository warehouseRepository;
    @Mock
    private MedicineRepository medicineRepository;
    @Mock
    private MedicineBatchRepository batchRepository;
    @Mock
    private WarehouseStockRepository stockRepository;
    @Mock
    private DepartmentRepository departmentRepository;

    @InjectMocks
    private InpatientAndLabDataInitializer inpatientAndLabDataInitializer;

    @InjectMocks
    private PharmacyAndGatewayDataInitializer pharmacyAndGatewayDataInitializer;

    @InjectMocks
    private AiTriageServiceImpl aiTriageService;

    @Test
    @DisplayName("Risk 1: InpatientAndLabDataInitializer is excluded from prod profiles and skips seeding by default")
    void inpatientAndLabDataInitializer_shouldBeGuardedAndSkipByDefault() {
        Profile profileAnnotation = InpatientAndLabDataInitializer.class.getAnnotation(Profile.class);
        assertNotNull(profileAnnotation, "InpatientAndLabDataInitializer must have @Profile annotation");
        assertArrayEquals(new String[]{"!prod & !production"}, profileAnnotation.value());

        // Default seedDemoData is false
        inpatientAndLabDataInitializer.run();

        verifyNoInteractions(
                roomRepository,
                bedRepository,
                admissionRepository,
                doctorOrderRepository,
                nursingCareRepository,
                conceptRepository,
                medicalTestRepository
        );
    }

    @Test
    @DisplayName("Risk 2: PharmacyAndGatewayDataInitializer is excluded from prod profiles and skips seeding by default")
    void pharmacyAndGatewayDataInitializer_shouldBeGuardedAndSkipByDefault() {
        Profile profileAnnotation = PharmacyAndGatewayDataInitializer.class.getAnnotation(Profile.class);
        assertNotNull(profileAnnotation, "PharmacyAndGatewayDataInitializer must have @Profile annotation");
        assertArrayEquals(new String[]{"!prod & !production"}, profileAnnotation.value());

        // Default seedDemoData is false
        pharmacyAndGatewayDataInitializer.run();

        verifyNoInteractions(
                warehouseRepository,
                medicineRepository,
                batchRepository,
                stockRepository,
                medicalTestRepository
        );
    }

    @Test
    @DisplayName("Risk 3: AiTriageServiceImpl flags exertional chest pain and dyspnea quick prompt as EMERGENCY")
    void aiTriage_shouldFlagChestPainAndDyspneaAsEmergency() {
        when(departmentRepository.findAllByDeletedFalse()).thenReturn(Collections.emptyList());

        AiConsultationResponse response = aiTriageService.consult(
                new AiConsultationRequest("Tôi bị đau tức ngực và khó thở khi đi lại nhanh", null, null, null)
        );

        assertEquals("EMERGENCY", response.triageLevel(), "Exertional chest pain + dyspnea must be EMERGENCY");
        assertNotNull(response.emergencyAlert(), "Emergency alert must be populated for EMERGENCY cases");
    }

    @Test
    @DisplayName("Risk 3: AiTriageServiceImpl flags severe headache with dizziness and nausea as EMERGENCY")
    void aiTriage_shouldFlagSevereHeadacheWithNeurologicalSignsAsEmergency() {
        when(departmentRepository.findAllByDeletedFalse()).thenReturn(Collections.emptyList());

        AiConsultationResponse response = aiTriageService.consult(
                new AiConsultationRequest("Bị đau đầu dữ dội kèm chóng mặt, buồn nôn", null, null, null)
        );

        assertEquals("EMERGENCY", response.triageLevel());
        assertNotNull(response.emergencyAlert());
    }

    @Test
    @DisplayName("Risk 3: AiTriageServiceImpl returns ADVISORY_ONLY (never ROUTINE) when clinicalApproved is false")
    void aiTriage_shouldReturnAdvisoryOnlyWhenNotClinicallyApproved() {
        when(departmentRepository.findAllByDeletedFalse()).thenReturn(Collections.emptyList());
        aiTriageService.setClinicalApproved(false);

        AiConsultationResponse response = aiTriageService.consult(
                new AiConsultationRequest("Đau khớp gối và phát ra tiếng kêu khi co duỗi", null, null, null)
        );

        assertEquals("ADVISORY_ONLY", response.triageLevel());
        assertNull(response.emergencyAlert());
    }
}
