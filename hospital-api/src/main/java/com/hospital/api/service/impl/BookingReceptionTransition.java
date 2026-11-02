package com.hospital.api.service.impl;

import com.hospital.api.constant.*;
import com.hospital.api.entity.*;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Caller owns the Booking row lock (or has just inserted it). All writes join its transaction. */
@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class BookingReceptionTransition {
    private final BookingRepository bookings;
    private final CounterTicketRepository tickets;
    private final CounterRepository counters;
    private final DoctorRepository doctors;
    private final DoctorScheduleRepository schedules;
    private final TimeSlotRepository slots;
    private final RoomRepository rooms;
    private final Clock clock;

    public List<Counter> lockCounters() {
        return counters.findAllForKioskDispatchForUpdate(CounterType.GENERAL, Arrays.asList(CounterType.values()));
    }

    public static boolean paymentEligible(Booking booking) {
        return booking != null && (Boolean.TRUE.equals(booking.getIsPaid())
                || (booking.getPrice() != null && booking.getPrice().compareTo(BigDecimal.ZERO) == 0));
    }

    public static boolean doctorEligible(Booking booking) {
        return paymentEligible(booking) && !booking.isDeleted()
                && booking.getStatus() != BookingStatus.CANCELLED
                && booking.getStatus() != BookingStatus.COMPLETED
                && booking.getDispatchedAt() != null;
    }

    public int nextQueueNumber(Doctor doctor, LocalDate date) {
        doctors.findByIdForUpdate(doctor.getDoctorId())
                .orElseThrow(() -> new AppException("Bác sĩ không còn hoạt động", HttpStatus.CONFLICT));
        return bookings.findMaxQueueNumber(doctor.getDoctorId(), date) + 1;
    }

    private void requireActive(Booking booking) {
        if (booking.isDeleted() || booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new AppException("Lượt khám không còn được tiếp nhận", HttpStatus.CONFLICT);
        }
    }

    public void checkIn(Booking booking, CounterType type, boolean insurance) {
        requireActive(booking);
        lockCounters();
        if (!LocalDate.now(clock).equals(booking.getBookingDate())) {
            throw new AppException("Chỉ tiếp nhận trong ngày khám", HttpStatus.CONFLICT);
        }
        if (booking.getCheckedInAt() == null && booking.getTimeSlot() != null
                && booking.getTimeSlot().getStartTime() != null && booking.getTimeSlot().getEndTime() != null) {
            LocalDateTime now = LocalDateTime.now(clock);
            if (now.isBefore(booking.getBookingDate().atTime(booking.getTimeSlot().getStartTime()).minusMinutes(60))
                    || now.isAfter(booking.getBookingDate().atTime(booking.getTimeSlot().getEndTime()).plusMinutes(15))) {
                throw new AppException("Ngoài khung giờ tiếp nhận", HttpStatus.CONFLICT);
            }
        }
        if (booking.getCheckedInAt() == null) booking.setCheckedInAt(LocalDateTime.now(clock));
        if (booking.getQueueNumber() == null || booking.getQueueNumber() <= 0) {
            booking.setQueueNumber(nextQueueNumber(booking.getDoctor(), booking.getBookingDate()));
        }
        if (paymentEligible(booking)) {
            dispatchCheckedIn(booking);
        } else {
            if (booking.getStatus() != BookingStatus.IN_PROGRESS) booking.setStatus(BookingStatus.PENDING_PAYMENT);
            ensureTicket(booking, type, insurance);
        }
        bookings.save(booking);
    }

    /** This is called only after the payment owner has validated and recorded its evidence. */
    public void afterVerifiedPayment(Booking booking) {
        if (paymentEligible(booking) && booking.getCheckedInAt() != null && LocalDate.now(clock).equals(booking.getBookingDate())) {
            dispatchCheckedIn(booking);
        }
    }

    public void dispatchCheckedIn(Booking booking) {
        requireActive(booking);
        if (!paymentEligible(booking)) throw new AppException("PAYMENT_REQUIRED: Chưa thanh toán tiền khám", HttpStatus.PAYMENT_REQUIRED);
        if (booking.getCheckedInAt() == null) throw new AppException("Lượt khám chưa check-in", HttpStatus.CONFLICT);
        if (booking.getDoctor() == null || booking.getTimeSlot() == null
                || booking.getTimeSlot().getDoctorSchedule() == null
                || booking.getTimeSlot().getDoctorSchedule().getRoom() == null) {
            throw new AppException("Chưa có bác sĩ và lịch phòng khám hợp lệ", HttpStatus.CONFLICT);
        }
        DoctorSchedule assigned = booking.getTimeSlot().getDoctorSchedule();
        if (booking.getDoctor().isDeleted() || booking.getTimeSlot().isDeleted() || assigned.isDeleted() || assigned.getRoom().isDeleted()
                || !Objects.equals(booking.getBookingDate(), assigned.getScheduleDate()) || assigned.getDoctor() == null
                || !Objects.equals(booking.getDoctor().getDoctorId(), assigned.getDoctor().getDoctorId())) {
            throw new AppException("Bác sĩ, phòng và ngày khám không khớp lịch trực", HttpStatus.CONFLICT);
        }
        if (booking.getDispatchedAt() == null) booking.setDispatchedAt(LocalDateTime.now(clock));
        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT) booking.setStatus(BookingStatus.CONFIRMED);
        Integer roomId = booking.getTimeSlot().getDoctorSchedule().getRoom().getRoomId();
        for (CounterTicket ticket : tickets.findAllByBookingForUpdate(booking.getBookingId())) {
            if (ticket.getStatus() == CounterTicketStatus.WAITING || ticket.getStatus() == CounterTicketStatus.CALLING) {
                ticket.setStatus(CounterTicketStatus.SERVED);
                ticket.setServedAt(LocalDateTime.now(clock));
                ticket.setDispatchedRoomId(roomId);
                tickets.save(ticket);
            }
        }
        bookings.save(booking);
    }

    /** A walk-in keeps a terminal ticket for request-key replay; a web paid check-in needs no new row. */
    public CounterTicket ensureTicket(Booking booking, CounterType requestedType, boolean insurance) {
        List<CounterTicket> linked = tickets.findAllByBookingForUpdate(booking.getBookingId());
        if (!linked.isEmpty()) {
            CounterTicket existing = linked.get(0);
            if (!paymentEligible(booking) && existing.getStatus() == CounterTicketStatus.SERVED) {
                throw new AppException("Phiếu đã kết thúc nhưng lượt khám chưa thanh toán", HttpStatus.CONFLICT);
            }
            if (!paymentEligible(booking) && existing.getStatus() == CounterTicketStatus.SKIPPED) {
                throw new AppException("Phiếu đã được nhân viên bỏ qua; vui lòng liên hệ quầy để tiếp nhận lại", HttpStatus.CONFLICT);
            }
            return existing;
        }
        CounterType type = Boolean.TRUE.equals(booking.getIsPriority()) ? CounterType.PRIORITY : requestedType;
        List<Counter> locked = counters.findAllForKioskDispatchForUpdate(type,
                type == CounterType.GENERAL ? List.of(type) : List.of(type, CounterType.GENERAL));
        Counter counter = locked.stream().filter(c -> c.getCounterType() == type && c.getStatus() == CounterStatus.OPEN)
                .findFirst().orElseGet(() -> locked.stream().filter(c -> c.getStatus() == CounterStatus.OPEN).findFirst()
                        .orElseThrow(() -> new AppException("Không có quầy tiếp nhận đang mở", HttpStatus.SERVICE_UNAVAILABLE)));
        LocalDate date = LocalDate.now(clock);
        int number = tickets.countByTicketDateAndCounterType(date, type) + 1;
        String prefix = switch (type) { case PRIORITY -> "UT-"; case APPOINTMENT -> "AP-"; case INSURANCE -> "BH-"; default -> "TH-"; };
        boolean served = paymentEligible(booking) && booking.getDispatchedAt() != null;
        CounterTicket ticket = CounterTicket.builder().booking(booking).idempotencyKey("BOOKING:" + booking.getBookingId())
                .counter(counter).counterType(type).ticketDate(date).queueNumber(number)
                .ticketCode(prefix + String.format("%02d", number)).waitingBefore(tickets.countByCounter_CounterIdAndTicketDateAndStatus(counter.getCounterId(), date, CounterTicketStatus.WAITING))
                .patientName(booking.getPatientProfile() != null ? booking.getPatientProfile().getFullName() : "Bệnh nhân")
                .phoneNumber(booking.getPatientProfile() != null ? booking.getPatientProfile().getPhoneNumber() : null)
                .isPriority(booking.getIsPriority()).priorityReason(booking.getPriorityReason()).hasInsurance(insurance)
                .status(served ? CounterTicketStatus.SERVED : CounterTicketStatus.WAITING)
                .servedAt(served ? LocalDateTime.now(clock) : null)
                .dispatchedRoomId(served ? booking.getTimeSlot().getDoctorSchedule().getRoom().getRoomId() : null).build();
        return tickets.saveAndFlush(ticket);
    }

    public void dispatchTo(Booking booking, Integer roomId, String roomName, UUID doctorId) {
        requireActive(booking);
        lockCounters();
        if (!paymentEligible(booking)) throw new AppException("PAYMENT_REQUIRED: Chưa thanh toán tiền khám", HttpStatus.PAYMENT_REQUIRED);

        Department expectedDept = booking.getDoctor() != null ? booking.getDoctor().getDepartment() : null;
        if (expectedDept == null && booking.getTimeSlot() != null && booking.getTimeSlot().getDoctorSchedule() != null && booking.getTimeSlot().getDoctorSchedule().getDoctor() != null) {
            expectedDept = booking.getTimeSlot().getDoctorSchedule().getDoctor().getDepartment();
        }

        if (roomId != null || (roomName != null && !roomName.isBlank()) || doctorId != null) {
            Integer target = roomId;
            if (target == null && roomName != null && !roomName.isBlank()) {
                List<Room> matches = rooms.findAll().stream().filter(r -> !r.isDeleted() && roomName.trim().equalsIgnoreCase(r.getRoomName())).toList();
                if (matches.size() != 1) throw new AppException("Phòng khám không rõ ràng", HttpStatus.CONFLICT);
                target = matches.get(0).getRoomId();
            }
            final Integer targetRoom = target;

            // Ràng buộc 2: Bệnh nhân chọn khám chuyên khoa nào thì chỉ được điều phối vào buồng khám thuộc chuyên khoa đó
            if (targetRoom != null) {
                Room targetR = rooms.findById(targetRoom)
                        .orElseThrow(() -> new AppException("Phòng khám không tồn tại", HttpStatus.NOT_FOUND));
                if (expectedDept != null && targetR.getDepartment() != null
                        && !expectedDept.getDepartmentId().equals(targetR.getDepartment().getDepartmentId())) {
                    throw new AppException(
                            String.format("Bệnh nhân đăng ký khám chuyên khoa [%s], không thể điều phối vào buồng khám [%s] thuộc chuyên khoa [%s]!",
                                    expectedDept.getDepartmentName(), targetR.getRoomName(), targetR.getDepartment().getDepartmentName()),
                            HttpStatus.BAD_REQUEST
                    );
                }
            }

            // Ràng buộc 2 & 4: Bác sĩ được điều phối phải thuộc đúng chuyên khoa khám của bệnh nhân
            if (doctorId != null) {
                Doctor targetD = doctors.findById(doctorId)
                        .orElseThrow(() -> new AppException("Bác sĩ không tồn tại", HttpStatus.NOT_FOUND));
                if (expectedDept != null && targetD.getDepartment() != null
                        && !expectedDept.getDepartmentId().equals(targetD.getDepartment().getDepartmentId())) {
                    throw new AppException(
                            String.format("Bệnh nhân đăng ký khám chuyên khoa [%s], không thể điều phối cho bác sĩ thuộc chuyên khoa [%s]!",
                                    expectedDept.getDepartmentName(), targetD.getDepartment().getDepartmentName()),
                            HttpStatus.BAD_REQUEST
                    );
                }
            }

            final Department finalExpectedDept = expectedDept;
            DoctorSchedule schedule = schedules.findAllByScheduleDateAndDeletedFalse(booking.getBookingDate()).stream()
                    .filter(s -> s.getRoom() != null && !s.getRoom().isDeleted() && (targetRoom == null || targetRoom.equals(s.getRoom().getRoomId())))
                    .filter(s -> s.getDoctor() != null && !s.getDoctor().isDeleted() && (doctorId == null || doctorId.equals(s.getDoctor().getDoctorId())))
                    .filter(s -> finalExpectedDept == null
                            || (s.getDoctor().getDepartment() != null && finalExpectedDept.getDepartmentId().equals(s.getDoctor().getDepartment().getDepartmentId())))
                    .findFirst().orElseThrow(() -> new AppException("Không có lịch bác sĩ phù hợp chuyên khoa và phòng khám trong ngày", HttpStatus.CONFLICT));
            if (booking.getTimeSlot() == null || !schedule.getDoctorScheduleId().equals(booking.getTimeSlot().getDoctorSchedule().getDoctorScheduleId())) {
                TimeSlot targetSlot = slots.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(schedule.getDoctorScheduleId()).stream()
                        .filter(s -> s.getEndTime() == null || s.getEndTime().isAfter(LocalTime.now(clock)))
                        .filter(s -> (s.getCurrentBookings() == null ? 0 : s.getCurrentBookings()) + (s.getHoldingCount() == null ? 0 : s.getHoldingCount())
                                < (s.getMaxCapacity() == null ? 5 : s.getMaxCapacity())).findFirst()
                        .orElseGet(() -> slots.findAllByDoctorSchedule_DoctorScheduleIdAndDeletedFalseOrderByStartTimeAsc(schedule.getDoctorScheduleId()).stream()
                                .filter(s -> (s.getCurrentBookings() == null ? 0 : s.getCurrentBookings()) + (s.getHoldingCount() == null ? 0 : s.getHoldingCount())
                                        < (s.getMaxCapacity() == null ? 5 : s.getMaxCapacity())).findFirst()
                                .orElseThrow(() -> new AppException("Phòng khám đã đạt tối đa công suất tiếp nhận trong ngày", HttpStatus.CONFLICT)));
                // Lock both slot rows in UUID order before moving capacity.
                TimeSlot old = booking.getTimeSlot();
                List<UUID> ids = new ArrayList<>(); ids.add(targetSlot.getTimeSlotId());
                if (old != null) ids.add(old.getTimeSlotId());
                ids.sort(Comparator.naturalOrder());
                Map<UUID, TimeSlot> locked = new HashMap<>();
                for (UUID id : ids) locked.put(id, slots.findByIdWithLock(id).orElseThrow(() -> new AppException("Khung giờ không tồn tại", HttpStatus.CONFLICT)));
                targetSlot = locked.get(targetSlot.getTimeSlotId());
                int current = targetSlot.getCurrentBookings() == null ? 0 : targetSlot.getCurrentBookings();
                int holding = targetSlot.getHoldingCount() == null ? 0 : targetSlot.getHoldingCount();
                if (current + holding >= (targetSlot.getMaxCapacity() == null ? 5 : targetSlot.getMaxCapacity())) throw new AppException("Khung giờ đã đầy", HttpStatus.CONFLICT);
                targetSlot.setCurrentBookings(current + 1); slots.save(targetSlot);
                if (old != null) { old = locked.get(old.getTimeSlotId()); old.setCurrentBookings(Math.max(0, (old.getCurrentBookings() == null ? 0 : old.getCurrentBookings()) - 1)); slots.save(old); }
                if (booking.getDoctor() == null || !schedule.getDoctor().getDoctorId().equals(booking.getDoctor().getDoctorId())) booking.setQueueNumber(nextQueueNumber(schedule.getDoctor(), booking.getBookingDate()));
                booking.setTimeSlot(targetSlot); booking.setDoctor(schedule.getDoctor());
            }
        }
        if (!LocalDate.now(clock).equals(booking.getBookingDate())) throw new AppException("Không phải ngày khám", HttpStatus.CONFLICT);
        if (booking.getCheckedInAt() == null) booking.setCheckedInAt(LocalDateTime.now(clock));
        dispatchCheckedIn(booking);
    }
}
