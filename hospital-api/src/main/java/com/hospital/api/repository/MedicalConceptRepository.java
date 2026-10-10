package com.hospital.api.repository;

import com.hospital.api.entity.MedicalConcept;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicalConceptRepository extends JpaRepository<MedicalConcept, UUID> {

    Optional<MedicalConcept> findByConceptCode(String conceptCode);

    List<MedicalConcept> findAllByIsActiveTrueOrderByCreatedAtAsc();

    @Query("SELECT c FROM MedicalConcept c WHERE c.isActive = true AND (c.department.departmentId = :deptId OR c.department IS NULL) ORDER BY c.department.departmentId NULLS FIRST, c.createdAt ASC")
    List<MedicalConcept> findByDepartmentOrCommon(@Param("deptId") Integer departmentId);
}
