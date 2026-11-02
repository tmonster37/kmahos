package com.hospital.api.dto.response;

import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.config.HospitalTimeConfig;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.CounterTicket;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

public record CounterTicketResponse(
        Long ticketId,
        String ticketCode,
        Integer queueNumber,
        CounterType counterType,
        Integer counterId,
        String counterName,
        String counterLocation,
        String patientName,
        String phoneNumber,
        Boolean isPriority,
        String priorityReason,
        Boolean hasInsurance,
        CounterTicketStatus status,
        int waitingBefore,
        LocalDateTime createdAt,
        LocalDateTime calledAt,
        LocalDateTime servedAt,
        Integer dispatchedRoomId,
        String bookingCode,
        String roomName,
        String departmentName,
        String doctorName,
        Boolean isPaid,
        LocalDateTime dispatchedAt,
        java.math.BigDecimal price,
        Integer bookingQueueNumber,
        String bookingQueueCode,
        UUID bookingId
) {
    public CounterTicketResponse(
            Long ticketId,
            String ticketCode,
            Integer queueNumber,
            CounterType counterType,
            Integer counterId,
            String counterName,
            String counterLocation,
            String patientName,
            String phoneNumber,
            Boolean isPriority,
            String priorityReason,
            Boolean hasInsurance,
            CounterTicketStatus status,
            int waitingBefore,
            LocalDateTime createdAt,
            LocalDateTime calledAt,
            LocalDateTime servedAt,
            Integer dispatchedRoomId,
            String bookingCode,
            String roomName,
            String departmentName,
            String doctorName
    ) {
        this(ticketId, ticketCode, queueNumber, counterType, counterId, counterName, counterLocation, patientName,
                phoneNumber, isPriority, priorityReason, hasInsurance, status, waitingBefore, createdAt, calledAt,
                servedAt, dispatchedRoomId, bookingCode, roomName, departmentName, doctorName, false, null, null, null, null, null);
    }

    public static CounterTicketResponse fromEntity(CounterTicket entity, int waitingBefore) {
        Integer counterId = entity.getCounter() != null ? entity.getCounter().getCounterId() : null;
        String counterName = entity.getCounter() != null ? entity.getCounter().getCounterName() : null;
        String counterLocation = entity.getCounter() != null ? entity.getCounter().getLocation() : null;

        String bookingCode = null;
        String roomName = null;
        String departmentName = null;
        String doctorName = null;
        Boolean isPaid = false;
        LocalDateTime dispatchedAt = null;

        Booking booking = entity.getBooking();
        if (booking != null) {
            bookingCode = booking.getBookingCode();
            isPaid = Boolean.TRUE.equals(booking.getIsPaid());
            dispatchedAt = booking.getDispatchedAt();
            if (booking.getDoctor() != null) {
                if (booking.getDoctor().getAccount() != null) {
                    doctorName = booking.getDoctor().getAccount().getFullName();
                }
                if (booking.getDoctor().getDepartment() != null) {
                    departmentName = booking.getDoctor().getDepartment().getDepartmentName();
                }
            }
            if (booking.getTimeSlot() != null && booking.getTimeSlot().getDoctorSchedule() != null &&
                    booking.getTimeSlot().getDoctorSchedule().getRoom() != null) {
                roomName = booking.getTimeSlot().getDoctorSchedule().getRoom().getRoomName();
            }
        }

        return new CounterTicketResponse(
                entity.getTicketId(),
                entity.getTicketCode(),
                entity.getQueueNumber(),
                entity.getCounterType(),
                counterId,
                counterName,
                counterLocation,
                entity.getPatientName(),
                entity.getPhoneNumber(),
                entity.getIsPriority(),
                entity.getPriorityReason(),
                entity.getHasInsurance(),
                entity.getStatus(),
                waitingBefore,
                entity.getCreatedAt() != null ? LocalDateTime.ofInstant(entity.getCreatedAt(), HospitalTimeConfig.HOSPITAL_ZONE) : null,
                entity.getCalledAt(),
                entity.getServedAt(),
                entity.getDispatchedRoomId(),
                bookingCode,
                roomName,
                departmentName,
                doctorName,
                isPaid,
                dispatchedAt,
                booking != null ? booking.getPrice() : null,
                booking != null ? booking.getQueueNumber() : null,
                booking != null ? (Boolean.TRUE.equals(booking.getIsPriority()) ? "UT-" : "KB-") + String.format("%02d", booking.getQueueNumber() == null ? 1 : booking.getQueueNumber()) : null,
                booking != null ? booking.getBookingId() : null
        );
    }
}
