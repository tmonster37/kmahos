package com.hospital.api.repository;

import com.hospital.api.entity.MedicalObservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MedicalObservationRepository extends JpaRepository<MedicalObservation, UUID> {

    List<MedicalObservation> findAllByMedicalRecord_RecordIdOrderByRecordedAtAsc(UUID recordId);

    java.util.Optional<MedicalObservation> findByMedicalRecord_RecordIdAndConcept_ConceptCode(UUID recordId, String conceptCode);

    @Query("SELECT o FROM MedicalObservation o WHERE o.medicalRecord.patientProfile.patientProfileId = :profileId AND o.concept.conceptCode = :conceptCode ORDER BY o.recordedAt ASC")
    List<MedicalObservation> findPatientTrendData(
            @Param("profileId") UUID profileId,
            @Param("conceptCode") String conceptCode
    );
}
