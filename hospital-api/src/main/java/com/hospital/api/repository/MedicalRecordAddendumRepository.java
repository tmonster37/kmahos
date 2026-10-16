package com.hospital.api.repository;

import com.hospital.api.entity.MedicalRecordAddendum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalRecordAddendumRepository extends JpaRepository<MedicalRecordAddendum, UUID> {
    List<MedicalRecordAddendum> findByMedicalRecordRecordIdOrderByCreatedAtAsc(UUID recordId);
}
