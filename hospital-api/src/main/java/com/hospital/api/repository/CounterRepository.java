package com.hospital.api.repository;

import com.hospital.api.constant.CounterStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.entity.Counter;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CounterRepository extends JpaRepository<Counter, Integer> {

    Optional<Counter> findByCounterCodeAndDeletedFalse(String counterCode);

    List<Counter> findAllByDeletedFalseOrderByDisplayOrderAsc();

    List<Counter> findAllByCounterTypeAndStatusAndDeletedFalse(CounterType counterType, CounterStatus status);

    List<Counter> findAllByStatusAndDeletedFalse(CounterStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Counter c where c.deleted = false and "
            + "(c.counterType in :counterTypes or not exists "
            + "(select fallback.counterId from Counter fallback "
            + "where fallback.counterType = :targetType and fallback.deleted = false)) "
            + "order by c.counterId")
    List<Counter> findAllForKioskDispatchForUpdate(
            @Param("targetType") CounterType targetType,
            @Param("counterTypes") List<CounterType> counterTypes);
}
