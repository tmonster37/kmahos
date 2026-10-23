package com.hospital.api.repository;

import com.hospital.api.entity.TimeSlot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, UUID> {

    // Khóa dòng trong PostgreSQL (FOR UPDATE) - Đảm bảo khi 1000 người cùng bấm đặt, từng người sẽ được xử lý tuần tự và không bị vượt quá maxCapacity
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ts FROM TimeSlot ts WHERE ts.timeSlotId = :id AND ts.deleted = false")
    Optional<TimeSlot> findByIdWithLock(@Param("id") UUID id);

    java.util.List<TimeSlot> findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(UUID doctorScheduleId);

    @Query("SELECT ts FROM TimeSlot ts JOIN FETCH ts.doctorSchedule ds " +
            "JOIN FETCH ds.doctor d JOIN FETCH d.account " +
            "LEFT JOIN FETCH ds.room " +
            "WHERE ds.scheduleDate = :date AND d.department.departmentId = :departmentId " +
            "AND ds.deleted = false AND ts.deleted = false ORDER BY ts.startTime ASC")
    java.util.List<TimeSlot> findAllForDepartmentAndDate(@Param("departmentId") Integer departmentId,
                                                         @Param("date") java.time.LocalDate date);
}
