package com.hospital.api.repository;

import com.hospital.api.constant.CounterStatus;
import com.hospital.api.constant.CounterType;
import com.hospital.api.entity.Counter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CounterRepository extends JpaRepository<Counter, Integer> {

    Optional<Counter> findByCounterCodeAndDeletedFalse(String counterCode);

    List<Counter> findAllByDeletedFalseOrderByDisplayOrderAsc();

    List<Counter> findAllByCounterTypeAndStatusAndDeletedFalse(CounterType counterType, CounterStatus status);

    List<Counter> findAllByStatusAndDeletedFalse(CounterStatus status);
}
