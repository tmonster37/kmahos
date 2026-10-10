package com.hospital.api.repository;

import com.hospital.api.entity.Discharge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DischargeRepository extends JpaRepository<Discharge, UUID> {
    Optional<Discharge> findByHospitalAdmission_AdmissionId(UUID admissionId);
}
