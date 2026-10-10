package com.hospital.api.service;

import com.hospital.api.dto.request.BookingCreateRequest;
import com.hospital.api.dto.request.KioskBookingRequest;
import com.hospital.api.dto.response.BookingResponse;

import java.util.List;
import java.util.UUID;

public interface BookingService {
    BookingResponse createBooking(UUID accountId, BookingCreateRequest request);
    BookingResponse createKioskBooking(KioskBookingRequest request);
    List<BookingResponse> getMyBookings(UUID accountId);
    BookingResponse getBookingByCode(String bookingCode);
    void cancelBooking(UUID accountId, UUID bookingId);
}


