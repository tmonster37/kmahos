package com.hospital.api.repository;

import com.hospital.api.entity.MedicalCondition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MedicalConditionRepository extends JpaRepository<MedicalCondition, UUID> {

    List<MedicalCondition> findAllByMedicalRecord_RecordId(UUID recordId);

    List<MedicalCondition> findAllByMedicalRecord_PatientProfile_PatientProfileIdOrderByCreatedAtDesc(UUID profileId);
}
