package com.hospital.api.repository;

import com.hospital.api.entity.MedicalTestResultItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalTestResultItemRepository extends JpaRepository<MedicalTestResultItem, UUID> {
    List<MedicalTestResultItem> findByMedicalTestMedicalTestId(UUID medicalTestId);
    void deleteByMedicalTestMedicalTestId(UUID medicalTestId);
}
