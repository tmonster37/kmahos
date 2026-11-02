package com.hospital.api.repository;

import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.entity.CounterTicket;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CounterTicketRepository extends JpaRepository<CounterTicket, Long> {

    interface TicketLink {
        Long getTicketId();
        java.util.UUID getBookingId();
        Integer getCounterId();
    }

    @org.springframework.data.jpa.repository.Query("SELECT t.ticketId AS ticketId, b.bookingId AS bookingId, c.counterId AS counterId FROM CounterTicket t LEFT JOIN t.booking b LEFT JOIN t.counter c WHERE t.ticketId = :id AND t.deleted = false")
    Optional<TicketLink> findLinkById(@org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Query("SELECT t.ticketId AS ticketId, b.bookingId AS bookingId, c.counterId AS counterId FROM CounterTicket t LEFT JOIN t.booking b LEFT JOIN t.counter c WHERE c.counterId = :counterId AND t.ticketDate = :date AND t.status = :status AND t.deleted = false ORDER BY t.isPriority DESC, t.queueNumber ASC")
    List<TicketLink> findWaitingTicketLinks(@org.springframework.data.repository.query.Param("counterId") Integer counterId,
            @org.springframework.data.repository.query.Param("date") LocalDate date,
            @org.springframework.data.repository.query.Param("status") CounterTicketStatus status,
            org.springframework.data.domain.Pageable pageable);

    int countByTicketDateAndCounterType(LocalDate date, CounterType counterType);

    int countByCounter_CounterIdAndTicketDateAndStatus(Integer counterId, LocalDate date, CounterTicketStatus status);

    List<CounterTicket> findAllByCounter_CounterIdAndTicketDateAndStatusOrderByQueueNumberAsc(Integer counterId, LocalDate date, CounterTicketStatus status);

    List<CounterTicket> findAllByTicketDateAndStatusOrderByCreatedAtAsc(LocalDate date, CounterTicketStatus status);

    List<CounterTicket> findAllByCounter_CounterIdAndTicketDateOrderByQueueNumberAsc(Integer counterId, LocalDate date);

    Optional<CounterTicket> findByTicketCodeAndTicketDateAndDeletedFalse(String ticketCode, LocalDate date);

    @EntityGraph(attributePaths = {
            "counter", "booking", "booking.doctor", "booking.doctor.account",
            "booking.doctor.department", "booking.timeSlot",
            "booking.timeSlot.doctorSchedule", "booking.timeSlot.doctorSchedule.room"
    })
    Optional<CounterTicket> findByIdempotencyKeyAndDeletedFalse(String idempotencyKey);

    Optional<CounterTicket> findFirstByCounter_CounterIdAndTicketDateAndStatusOrderByQueueNumberAsc(Integer counterId, LocalDate date, CounterTicketStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM CounterTicket t LEFT JOIN FETCH t.counter WHERE t.booking.bookingId = :bookingId AND t.deleted = false ORDER BY t.ticketId")
    List<CounterTicket> findAllByBooking(@org.springframework.data.repository.query.Param("bookingId") java.util.UUID bookingId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM CounterTicket t WHERE t.booking.bookingId = :bookingId AND t.deleted = false ORDER BY t.ticketId")
    List<CounterTicket> findAllByBookingForUpdate(@org.springframework.data.repository.query.Param("bookingId") java.util.UUID bookingId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM CounterTicket t WHERE t.ticketId = :id AND t.deleted = false")
    Optional<CounterTicket> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
