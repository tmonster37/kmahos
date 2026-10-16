package com.hospital.api.service;

import ca.uhn.fhir.context.FhirContext;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.MedicalExaminationRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hl7.fhir.r4.model.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.ZoneId;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FhirExportService {

    private final MedicalExaminationRecordRepository recordRepository;
    private final FhirContext fhirContext = FhirContext.forR4();

    @Transactional(readOnly = true)
    public String exportRecordToFhirJson(UUID recordId) {
        return exportRecordToFhirJson(recordId, null, true);
    }

    @Transactional(readOnly = true)
    public String exportRecordToFhirJson(UUID recordId, UUID currentUserId, boolean isStaff) {
        MedicalExaminationRecord record = recordRepository.findById(recordId)
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ khám bệnh", HttpStatus.NOT_FOUND));

        if (!isStaff) {
            if (record.getPatientProfile() == null
                    || record.getPatientProfile().getAccount() == null
                    || !record.getPatientProfile().getAccount().getUserId().equals(currentUserId)) {
                throw new AppException("Bạn không có quyền truy cập hồ sơ bệnh án này", HttpStatus.FORBIDDEN);
            }
        }

        Bundle bundle = new Bundle();
        bundle.setId(UUID.randomUUID().toString());
        bundle.setType(Bundle.BundleType.DOCUMENT);
        bundle.setTimestamp(new java.util.Date());

        // 1. FHIR Patient Resource
        Patient fhirPatient = new Patient();
        PatientProfile patient = record.getPatientProfile();
        if (patient != null) {
            fhirPatient.setId(patient.getPatientProfileId().toString());
            fhirPatient.addIdentifier()
                    .setSystem("https://theduckhospital.com/patients")
                    .setValue(patient.getPatientProfileId().toString());
            
            HumanName name = fhirPatient.addName();
            name.setText(patient.getFullName());

            if (patient.getGender() != null) {
                switch (patient.getGender().name().toUpperCase()) {
                    case "MALE" -> fhirPatient.setGender(Enumerations.AdministrativeGender.MALE);
                    case "FEMALE" -> fhirPatient.setGender(Enumerations.AdministrativeGender.FEMALE);
                    default -> fhirPatient.setGender(Enumerations.AdministrativeGender.OTHER);
                }
            }

            if (patient.getDateOfBirth() != null) {
                fhirPatient.setBirthDate(Date.valueOf(patient.getDateOfBirth()));
            }

            if (patient.getPhoneNumber() != null) {
                fhirPatient.addTelecom()
                        .setSystem(ContactPoint.ContactPointSystem.PHONE)
                        .setValue(patient.getPhoneNumber());
            }

            StringBuilder addressBuilder = new StringBuilder();
            if (patient.getStreetAddress() != null) addressBuilder.append(patient.getStreetAddress());
            if (patient.getWard() != null) addressBuilder.append(", ").append(patient.getWard());
            if (patient.getDistrict() != null) addressBuilder.append(", ").append(patient.getDistrict());
            if (patient.getProvince() != null) addressBuilder.append(", ").append(patient.getProvince());
            if (!addressBuilder.isEmpty()) {
                fhirPatient.addAddress().setText(addressBuilder.toString());
            }
        }
        bundle.addEntry().setResource(fhirPatient);

        // 2. FHIR Practitioner Resource (Bác sĩ)
        Practitioner fhirDoctor = new Practitioner();
        Doctor doctor = record.getDoctor();
        if (doctor != null) {
            fhirDoctor.setId(doctor.getDoctorId().toString());
            if (doctor.getAccount() != null) {
                fhirDoctor.addName().setText(doctor.getAccount().getFullName());
            }
        }
        bundle.addEntry().setResource(fhirDoctor);

        // 3. FHIR Encounter Resource (Lượt khám)
        Encounter fhirEncounter = new Encounter();
        fhirEncounter.setId(record.getRecordId().toString());
        fhirEncounter.setStatus(Encounter.EncounterStatus.FINISHED);
        fhirEncounter.setClass_(new Coding("http://terminology.hl7.org/CodeSystem/v3-ActCode", "AMB", "ambulatory"));
        fhirEncounter.setSubject(new Reference(fhirPatient));
        fhirEncounter.addParticipant().setIndividual(new Reference(fhirDoctor));
        if (record.getCreatedAt() != null) {
            Period period = new Period();
            period.setStart(java.util.Date.from(record.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()));
            fhirEncounter.setPeriod(period);
        }
        bundle.addEntry().setResource(fhirEncounter);

        // 4. FHIR Observation Resources (Sinh hiệu, chỉ số chuyên khoa động)
        if (record.getMedicalObservations() != null) {
            for (MedicalObservation obs : record.getMedicalObservations()) {
                Observation fhirObs = new Observation();
                fhirObs.setId(obs.getObsId().toString());
                fhirObs.setStatus(Observation.ObservationStatus.FINAL);
                fhirObs.setSubject(new Reference(fhirPatient));
                fhirObs.setEncounter(new Reference(fhirEncounter));

                CodeableConcept code = fhirObs.getCode();
                MedicalConcept concept = obs.getConcept();
                if (concept != null) {
                    if (concept.getLoincCode() != null && !concept.getLoincCode().isBlank()) {
                        code.addCoding()
                                .setSystem("http://loinc.org")
                                .setCode(concept.getLoincCode())
                                .setDisplay(concept.getName());
                    }
                    code.addCoding()
                            .setSystem("https://theduckhospital.com/concepts")
                            .setCode(concept.getConceptCode())
                            .setDisplay(concept.getName());
                    code.setText(concept.getName());

                    // Giá trị
                    if (obs.getValueNumeric() != null) {
                        Quantity qty = new Quantity();
                        qty.setValue(obs.getValueNumeric());
                        qty.setUnit(concept.getUnit());
                        fhirObs.setValue(qty);
                    } else if (obs.getValueText() != null) {
                        fhirObs.setValue(new StringType(obs.getValueText()));
                    } else if (obs.getValueBoolean() != null) {
                        fhirObs.setValue(new BooleanType(obs.getValueBoolean()));
                    }

                    // Đánh giá ngưỡng bất thường
                    if (obs.getInterpretation() != null) {
                        CodeableConcept interp = new CodeableConcept();
                        interp.addCoding()
                                .setSystem("http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation")
                                .setCode(obs.getInterpretation());
                        fhirObs.addInterpretation(interp);
                    }
                }

                if (obs.getRecordedAt() != null) {
                    fhirObs.setEffective(new DateTimeType(Date.from(obs.getRecordedAt().atZone(ZoneId.systemDefault()).toInstant())));
                }

                bundle.addEntry().setResource(fhirObs);
            }
        }

        // 5. FHIR Condition Resources (Chẩn đoán ICD-10)
        if (record.getMedicalConditions() != null) {
            for (MedicalCondition cond : record.getMedicalConditions()) {
                Condition fhirCond = new Condition();
                fhirCond.setId(cond.getConditionId().toString());
                fhirCond.setSubject(new Reference(fhirPatient));
                fhirCond.setEncounter(new Reference(fhirEncounter));

                // Verification & Clinical Status
                fhirCond.setClinicalStatus(new CodeableConcept().addCoding(
                        new Coding("http://terminology.hl7.org/CodeSystem/condition-clinical", "active", "Active")
                ));

                // Mã ICD-10
                CodeableConcept condCode = new CodeableConcept();
                condCode.addCoding()
                        .setSystem("http://hl7.org/fhir/sid/icd-10")
                        .setCode(cond.getIcd10Code())
                        .setDisplay(cond.getDiseaseName());
                condCode.setText(cond.getDiseaseName());
                fhirCond.setCode(condCode);

                bundle.addEntry().setResource(fhirCond);
            }
        }

        // 6. FHIR MedicationRequest Resources (Đơn thuốc)
        if (record.getPrescription() != null && record.getPrescription().getPrescriptionItems() != null) {
            Prescription rx = record.getPrescription();
            for (PrescriptionItem item : rx.getPrescriptionItems()) {
                MedicationRequest medReq = new MedicationRequest();
                medReq.setId(item.getPrescriptionItemId() != null ? item.getPrescriptionItemId().toString() : UUID.randomUUID().toString());
                medReq.setStatus(MedicationRequest.MedicationRequestStatus.COMPLETED);
                medReq.setIntent(MedicationRequest.MedicationRequestIntent.ORDER);
                medReq.setSubject(new Reference(fhirPatient));
                medReq.setEncounter(new Reference(fhirEncounter));
                medReq.setRequester(new Reference(fhirDoctor));

                // Thông tin thuốc
                CodeableConcept medCode = new CodeableConcept();
                medCode.setText(item.getMedicine() != null ? item.getMedicine().getMedicineName() : "Thuốc");
                medReq.setMedication(medCode);

                // Số lượng
                MedicationRequest.MedicationRequestDispenseRequestComponent dispense = new MedicationRequest.MedicationRequestDispenseRequestComponent();
                dispense.setQuantity(new Quantity().setValue(item.getQuantity()));
                medReq.setDispenseRequest(dispense);

                if (item.getDosageInstruction() != null) {
                    Dosage dosage = medReq.addDosageInstruction();
                    dosage.setText(item.getDosageInstruction());
                }

                bundle.addEntry().setResource(medReq);
            }
        }

        // Serialize sang định dạng HL7 FHIR JSON
        return fhirContext.newJsonParser().setPrettyPrint(true).encodeResourceToString(bundle);
    }
}
