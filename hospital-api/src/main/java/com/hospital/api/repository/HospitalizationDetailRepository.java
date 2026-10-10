package com.hospital.api.repository;

import com.hospital.api.entity.HospitalizationDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HospitalizationDetailRepository extends JpaRepository<HospitalizationDetail, UUID> {
    List<HospitalizationDetail> findAllByHospitalAdmission_AdmissionIdOrderByLogDateDesc(UUID admissionId);
}
