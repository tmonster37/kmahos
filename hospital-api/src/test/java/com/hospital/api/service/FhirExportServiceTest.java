package com.hospital.api.service;

import com.hospital.api.constant.ConceptDataType;
import com.hospital.api.constant.ConditionType;
import com.hospital.api.constant.Gender;
import com.hospital.api.entity.*;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FhirExportServiceTest {

    @Mock
    private MedicalExaminationRecordRepository recordRepository;

    @InjectMocks
    private FhirExportService fhirExportService;

    @Test
    @DisplayName("Should successfully export Medical Record into HL7 FHIR R4 Bundle JSON")
    void shouldExportRecordToFhirJson() {
        UUID recordId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID doctorId = UUID.randomUUID();

        PatientProfile patient = PatientProfile.builder()
                .patientProfileId(patientId)
                .fullName("Nguyễn Thị Mai")
                .gender(Gender.FEMALE)
                .dateOfBirth(LocalDate.of(1995, 5, 20))
                .phoneNumber("0987654321")
                .streetAddress("123 Lê Lợi")
                .district("Quận 1")
                .province("TP. Hồ Chí Minh")
                .build();

        Doctor doctor = Doctor.builder()
                .doctorId(doctorId)
                .account(Account.builder().fullName("BS. Trần Văn Hùng").build())
                .build();

        MedicalConcept conceptBp = MedicalConcept.builder()
                .conceptCode("VITAL_BP_SYS")
                .name("Huyết áp tâm thu")
                .dataType(ConceptDataType.NUMERIC)
                .unit("mmHg")
                .loincCode("8480-6")
                .build();

        MedicalObservation obs = MedicalObservation.builder()
                .obsId(UUID.randomUUID())
                .concept(conceptBp)
                .valueNumeric(new BigDecimal("120"))
                .interpretation("NORMAL")
                .recordedAt(LocalDateTime.now())
                .build();

        MedicalCondition condition = MedicalCondition.builder()
                .conditionId(UUID.randomUUID())
                .icd10Code("O80")
                .diseaseName("Đẻ thường một thai")
                .conditionType(ConditionType.PRIMARY)
                .clinicalStatus("ACTIVE")
                .build();

        MedicalExaminationRecord record = MedicalExaminationRecord.builder()
                .recordId(recordId)
                .patientProfile(patient)
                .doctor(doctor)
                .medicalObservations(new ArrayList<>(List.of(obs)))
                .medicalConditions(new ArrayList<>(List.of(condition)))
                .build();

        when(recordRepository.findById(recordId)).thenReturn(Optional.of(record));

        String fhirJson = fhirExportService.exportRecordToFhirJson(recordId);

        assertNotNull(fhirJson);
        assertTrue(fhirJson.contains("Bundle"));
        assertTrue(fhirJson.contains("Patient"));
        assertTrue(fhirJson.contains("Encounter"));
        assertTrue(fhirJson.contains("Observation"));
        assertTrue(fhirJson.contains("8480-6"));
        assertTrue(fhirJson.contains("Condition"));
        assertTrue(fhirJson.contains("O80"));
    }
}
