package com.hospital.api.repository;

import com.hospital.api.entity.InpatientDoctorOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InpatientDoctorOrderRepository extends JpaRepository<InpatientDoctorOrder, UUID> {

    List<InpatientDoctorOrder> findAllByHospitalAdmission_AdmissionIdOrderByOrderDateDesc(UUID admissionId);
}
