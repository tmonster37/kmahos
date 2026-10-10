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
    List<Booking> findAllByPatientProfile_Account_UserIdAndDeletedFalseOrderByCreatedAtDesc(UUID accountId);
    
    // Đếm số lượng đặt khám trong ngày của bác sĩ để sinh số thứ tự (1, 2, 3...)
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.doctor.doctorId = :doctorId AND b.bookingDate = :date")
    int countBookingsByDoctorAndDate(@Param("doctorId") UUID doctorId, @Param("date") LocalDate date);
    
    Optional<Booking> findByBookingCode(String bookingCode);

    List<Booking> findAllByDoctor_Account_UserIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(UUID doctorUserId, LocalDate bookingDate);
    
    List<Booking> findAllByDoctor_DoctorIdAndBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(UUID doctorId, LocalDate bookingDate);

    List<Booking> findAllByBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(LocalDate bookingDate);
}


