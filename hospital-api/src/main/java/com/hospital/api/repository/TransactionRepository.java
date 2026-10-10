package com.hospital.api.repository;

import com.hospital.api.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Optional<Transaction> findByVnpayTxnRef(String vnpayTxnRef);
    List<Transaction> findAllByAccount_UserIdOrderByCreatedAtDesc(UUID accountId);
    List<Transaction> findAllByOrderByCreatedAtDesc();
}
