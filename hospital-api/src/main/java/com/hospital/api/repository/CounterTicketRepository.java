package com.hospital.api.repository;

import com.hospital.api.constant.CounterTicketStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.entity.CounterTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CounterTicketRepository extends JpaRepository<CounterTicket, Long> {

    int countByTicketDateAndCounterType(LocalDate date, CounterType counterType);

    int countByCounter_CounterIdAndTicketDateAndStatus(Integer counterId, LocalDate date, CounterTicketStatus status);

    List<CounterTicket> findAllByCounter_CounterIdAndTicketDateAndStatusOrderByQueueNumberAsc(Integer counterId, LocalDate date, CounterTicketStatus status);

    List<CounterTicket> findAllByTicketDateAndStatusOrderByCreatedAtAsc(LocalDate date, CounterTicketStatus status);

    List<CounterTicket> findAllByCounter_CounterIdAndTicketDateOrderByQueueNumberAsc(Integer counterId, LocalDate date);

    Optional<CounterTicket> findByTicketCodeAndTicketDateAndDeletedFalse(String ticketCode, LocalDate date);

    Optional<CounterTicket> findFirstByCounter_CounterIdAndTicketDateAndStatusOrderByQueueNumberAsc(Integer counterId, LocalDate date, CounterTicketStatus status);
}
