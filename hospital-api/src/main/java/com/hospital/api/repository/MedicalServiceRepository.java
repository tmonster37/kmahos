package com.hospital.api.repository;

import com.hospital.api.entity.MedicalService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicalServiceRepository extends JpaRepository<MedicalService, Integer> {
    List<MedicalService> findAllByDeletedFalse();
}

