package com.hospital.api.repository;

import com.hospital.api.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Integer> {
    List<Medicine> findAllByDeletedFalse();
}

