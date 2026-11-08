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

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT a FROM HospitalAdmission a WHERE a.admissionId = :id")
    Optional<HospitalAdmission> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);

    List<HospitalAdmission> findAllByState(HospitalAdmissionState state);
    List<HospitalAdmission> findAllByPatientProfile_PatientProfileId(UUID patientProfileId);
}

