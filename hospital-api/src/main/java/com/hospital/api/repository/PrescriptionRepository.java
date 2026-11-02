package com.hospital.api.repository;

import com.hospital.api.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {
    Optional<Prescription> findByPrescriptionCode(String prescriptionCode);
    Optional<Prescription> findByMedicalRecordBookingBookingCode(String bookingCode);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Prescription p WHERE p.prescriptionId = :id")
    Optional<Prescription> findByIdWithLock(@org.springframework.data.repository.query.Param("id") UUID id);
}

