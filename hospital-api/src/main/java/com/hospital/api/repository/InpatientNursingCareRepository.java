package com.hospital.api.repository;

import com.hospital.api.entity.InpatientNursingCare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InpatientNursingCareRepository extends JpaRepository<InpatientNursingCare, UUID> {

    List<InpatientNursingCare> findAllByHospitalAdmission_AdmissionIdOrderByCareTimeDesc(UUID admissionId);
}
