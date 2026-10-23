package com.hospital.api.service;

import com.hospital.api.dto.request.BookingCreateRequest;
import com.hospital.api.dto.request.AdminBookingRescheduleRequest;
import com.hospital.api.dto.request.KioskBookingRequest;
import com.hospital.api.dto.request.KioskCheckInRequest;
import com.hospital.api.dto.response.BookingResponse;
import com.hospital.api.dto.response.KioskCheckInResponse;
import com.hospital.api.dto.response.AdminBookingResponse;
import com.hospital.api.dto.response.AdminBookingSlotResponse;

import java.util.List;
import java.util.UUID;
import java.time.LocalDate;

public interface BookingService {
    BookingResponse createBooking(UUID accountId, BookingCreateRequest request);
    BookingResponse createKioskBooking(KioskBookingRequest request);
    KioskCheckInResponse checkInKiosk(KioskCheckInRequest request);
    List<BookingResponse> getMyBookings(UUID accountId);
    BookingResponse getBookingByCode(String bookingCode);
    List<AdminBookingResponse> getAdminBookings(LocalDate fromDate, LocalDate toDate);
    List<AdminBookingSlotResponse> getAdminBookingSlots(LocalDate date, Integer departmentId);
    AdminBookingResponse rescheduleBooking(UUID bookingId, AdminBookingRescheduleRequest request);
    void adminCancelBooking(UUID bookingId);
}
