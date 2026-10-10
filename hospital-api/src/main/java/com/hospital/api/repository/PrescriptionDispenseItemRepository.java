package com.hospital.api.repository;

import com.hospital.api.entity.PrescriptionDispenseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PrescriptionDispenseItemRepository extends JpaRepository<PrescriptionDispenseItem, UUID> {
    List<PrescriptionDispenseItem> findByPrescriptionDispenseDispenseId(UUID dispenseId);
}
