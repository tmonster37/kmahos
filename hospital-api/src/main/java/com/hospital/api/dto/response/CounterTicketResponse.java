package com.hospital.api.dto.response;

import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.config.HospitalTimeConfig;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.CounterTicket;

import java.time.LocalDateTime;
import java.time.ZoneId;

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
        String doctorName
) {
    public static CounterTicketResponse fromEntity(CounterTicket entity, int waitingBefore) {
        Integer counterId = entity.getCounter() != null ? entity.getCounter().getCounterId() : null;
        String counterName = entity.getCounter() != null ? entity.getCounter().getCounterName() : null;
        String counterLocation = entity.getCounter() != null ? entity.getCounter().getLocation() : null;

        String bookingCode = null;
        String roomName = null;
        String departmentName = null;
        String doctorName = null;

        Booking booking = entity.getBooking();
        if (booking != null) {
            bookingCode = booking.getBookingCode();
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
                doctorName
        );
    }
}
