package com.hospital.api.repository;

import com.hospital.api.constant.HospitalAdmissionState;
import com.hospital.api.entity.HospitalAdmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HospitalAdmissionRepository extends JpaRepository<HospitalAdmission, UUID> {
    Optional<HospitalAdmission> findByAdmissionCode(String admissionCode);
    List<HospitalAdmission> findAllByState(HospitalAdmissionState state);
    List<HospitalAdmission> findAllByPatientProfile_PatientProfileId(UUID patientProfileId);
}

