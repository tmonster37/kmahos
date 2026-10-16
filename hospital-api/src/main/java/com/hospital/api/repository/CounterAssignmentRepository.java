package com.hospital.api.repository;

import com.hospital.api.entity.CounterAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CounterAssignmentRepository extends JpaRepository<CounterAssignment, Integer> {

    Optional<CounterAssignment> findByCounter_CounterIdAndIsActiveTrueAndDeletedFalse(Integer counterId);

    Optional<CounterAssignment> findByStaff_UserIdAndIsActiveTrueAndDeletedFalse(UUID userId);

    List<CounterAssignment> findAllByCounter_CounterIdAndDeletedFalseOrderByShiftStartDesc(Integer counterId);
}
