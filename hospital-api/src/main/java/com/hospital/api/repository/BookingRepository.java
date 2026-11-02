package com.hospital.api.repository;

import com.hospital.api.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {
            "patientProfile", "patientProfile.account",
            "doctor", "doctor.account", "doctor.department",
            "timeSlot", "timeSlot.doctorSchedule", "timeSlot.doctorSchedule.room"
    })
    List<Booking> findAllByPatientProfile_Account_UserIdAndDeletedFalseOrderByCreatedAtDesc(UUID accountId);
    
    // Đếm số lượng đặt khám trong ngày của bác sĩ để sinh số thứ tự (1, 2, 3...)
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.doctor.doctorId = :doctorId AND b.bookingDate = :date")
    int countBookingsByDoctorAndDate(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);

    @Query("SELECT COALESCE(MAX(b.queueNumber), 0) FROM Booking b WHERE b.doctor.doctorId = :doctorId AND b.bookingDate = :date")
    int findMaxQueueNumber(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);
    
    Optional<Booking> findByBookingCode(String bookingCode);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.bookingId = :bookingId AND b.deleted = false")
    Optional<Booking> findByIdWithLock(@Param("bookingId") UUID bookingId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.bookingCode = :bookingCode")
    Optional<Booking> findByBookingCodeForUpdate(@Param("bookingCode") String bookingCode);

    List<Booking> findAllByDoctor_Account_UserIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(UUID doctorUserId, LocalDate bookingDate);
    
    List<Booking> findAllByDoctor_DoctorIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(UUID doctorId, LocalDate bookingDate);

    List<Booking> findAllByBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(LocalDate bookingDate);

    List<Booking> findAllByDeletedFalseOrderByCreatedAtDesc();

    List<Booking> findAllByDoctor_Department_DepartmentIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(Integer departmentId, LocalDate bookingDate);

    List<Booking> findAllByPatientProfile_PhoneNumberAndBookingDateAndDeletedFalse(String phoneNumber, LocalDate bookingDate);

    @Query("SELECT b.bookingCode FROM Booking b WHERE b.patientProfile.phoneNumber = :phone AND b.bookingDate = :date AND b.deleted = false AND b.status NOT IN :terminal ORDER BY b.createdAt")
    List<String> findActiveBookingCodesByPhoneAndDate(@Param("phone") String phone, @Param("date") LocalDate date,
            @Param("terminal") java.util.Collection<com.hospital.api.constant.BookingStatus> terminal);

    @Query("SELECT b FROM Booking b WHERE b.bookingDate >= :startDate AND b.bookingDate <= :endDate AND b.deleted = false ORDER BY b.bookingDate ASC, b.queueNumber ASC")
    List<Booking> findAllByBookingDateBetweenAndDeletedFalse(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT b.doctor.department.departmentName, COUNT(b) FROM Booking b " +
           "WHERE b.deleted = false AND b.bookingDate >= :startDate AND b.bookingDate <= :endDate " +
           "AND b.doctor IS NOT NULL AND b.doctor.department IS NOT NULL " +
           "GROUP BY b.doctor.department.departmentName")
    List<Object[]> countBookingsByDepartmentBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.deleted = false AND b.bookingDate >= :startDate AND b.bookingDate <= :endDate")
    long countBookingsBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.deleted = false AND b.status = com.hospital.api.constant.BookingStatus.COMPLETED AND b.bookingDate >= :startDate AND b.bookingDate <= :endDate")
    long countCompletedBookingsBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    List<Booking> findAllByTimeSlot_DoctorSchedule_DoctorScheduleIdAndDeletedFalse(UUID scheduleId);
}
