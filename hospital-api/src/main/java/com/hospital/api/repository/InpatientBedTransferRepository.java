package com.hospital.api.repository;

import com.hospital.api.entity.InpatientBedTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InpatientBedTransferRepository extends JpaRepository<InpatientBedTransfer, UUID> {

    List<InpatientBedTransfer> findAllByHospitalAdmission_AdmissionIdOrderByTransferredAtDesc(UUID admissionId);
}
