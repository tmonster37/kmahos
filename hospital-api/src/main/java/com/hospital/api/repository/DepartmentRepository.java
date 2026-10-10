package com.hospital.api.repository;

import com.hospital.api.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    List<Department> findAllByDeletedFalse();
    boolean existsByDepartmentName(String departmentName);
}

