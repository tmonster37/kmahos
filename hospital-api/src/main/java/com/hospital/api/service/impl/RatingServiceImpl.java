package com.hospital.api.service.impl;

import com.hospital.api.dto.request.CreateRatingRequest;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.Doctor;
import com.hospital.api.entity.Rating;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.RatingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RatingServiceImpl {

    private final RatingRepository ratingRepository;
    private final BookingRepository bookingRepository;
    private final DoctorRepository doctorRepository;

    @Transactional
    public void createRating(UUID accountId, CreateRatingRequest request) {
        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new AppException("Không tìm thấy thông tin lượt khám", HttpStatus.NOT_FOUND));

        if (ratingRepository.existsByBooking_BookingId(request.bookingId())) {
            throw new AppException("Lượt khám này đã được đánh giá trước đó", HttpStatus.BAD_REQUEST);
        }

        Doctor doctor = booking.getDoctor();

        Rating rating = Rating.builder()
                .booking(booking)
                .doctor(doctor)
                .stars(request.stars())
                .comment(request.comment())
                .build();
        ratingRepository.save(rating);

        // Tự động tính toán lại điểm đánh giá trung bình của Bác sĩ
        Double avg = ratingRepository.calculateAverageRating(doctor.getDoctorId());
        doctor.setRatingAverage(avg != null ? Math.round(avg * 10.0) / 10.0 : 5.0);
        doctorRepository.save(doctor);
    }
}
