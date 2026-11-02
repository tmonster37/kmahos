package com.hospital.api.repository;

import com.hospital.api.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, UUID> {
    List<Doctor> findAllByDepartment_DepartmentIdAndDeletedFalse(Integer departmentId);
    List<Doctor> findAllByDeletedFalse();

    @org.springframework.data.jpa.repository.Query("SELECT d FROM Doctor d JOIN FETCH d.account LEFT JOIN FETCH d.department WHERE d.deleted = false")
    List<Doctor> findAllWithAccountAndDepartment();

    @org.springframework.data.jpa.repository.Query("SELECT d FROM Doctor d JOIN FETCH d.account LEFT JOIN FETCH d.department WHERE d.department.departmentId = :departmentId AND d.deleted = false")
    List<Doctor> findAllByDepartmentWithAccountAndDepartment(@org.springframework.data.repository.query.Param("departmentId") Integer departmentId);

    Optional<Doctor> findByAccount_UserId(UUID accountId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT d FROM Doctor d WHERE d.doctorId = :id AND d.deleted = false")
    Optional<Doctor> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") UUID id);
}

