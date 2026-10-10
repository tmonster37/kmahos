package com.hospital.api.repository;

import com.hospital.api.constant.DispenseStatus;
import com.hospital.api.entity.PrescriptionDispense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrescriptionDispenseRepository extends JpaRepository<PrescriptionDispense, UUID> {
    Optional<PrescriptionDispense> findByDispenseCode(String dispenseCode);
    List<PrescriptionDispense> findByPrescriptionPrescriptionId(UUID prescriptionId);
    List<PrescriptionDispense> findByWarehouseWarehouseId(UUID warehouseId);
    List<PrescriptionDispense> findAllByStatusOrderByCreatedAtDesc(DispenseStatus status);
}
