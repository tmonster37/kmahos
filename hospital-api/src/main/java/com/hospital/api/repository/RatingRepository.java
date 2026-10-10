package com.hospital.api.repository;

import com.hospital.api.entity.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RatingRepository extends JpaRepository<Rating, UUID> {
    boolean existsByBooking_BookingId(UUID bookingId);

    @Query("SELECT AVG(r.stars) FROM Rating r WHERE r.doctor.doctorId = :doctorId")
    Double calculateAverageRating(@Param("doctorId") UUID doctorId);
}

