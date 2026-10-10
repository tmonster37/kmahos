package com.hospital.api.repository;

import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.entity.DoctorSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, UUID> {
    List<DoctorSchedule> findAllByDoctor_DoctorIdAndScheduleDateAfterAndDeletedFalse(UUID doctorId, LocalDate date);
    List<DoctorSchedule> findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(Integer departmentId, LocalDate scheduleDate);
    List<DoctorSchedule> findAllByScheduleDateAndDeletedFalse(LocalDate scheduleDate);
    List<DoctorSchedule> findAllByDeletedFalse();
    List<DoctorSchedule> findAllByScheduleDateBetweenAndDeletedFalse(LocalDate startDate, LocalDate endDate);
    List<DoctorSchedule> findAllByDoctor_DoctorIdAndScheduleDateBetweenAndDeletedFalse(UUID doctorId, LocalDate startDate, LocalDate endDate);
    boolean existsByDoctor_DoctorIdAndScheduleDateAndSessionAndDeletedFalse(UUID doctorId, LocalDate date, ScheduleSession session);
    boolean existsByRoom_RoomIdAndScheduleDateAndSessionAndDeletedFalse(Integer roomId, LocalDate date, ScheduleSession session);
}

