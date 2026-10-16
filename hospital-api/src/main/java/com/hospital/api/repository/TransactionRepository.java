package com.hospital.api.repository;

import com.hospital.api.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Optional<Transaction> findByVnpayTxnRef(String vnpayTxnRef);
    Optional<Transaction> findByOrderCode(Long orderCode);
    boolean existsByVnpayTxnRef(String vnpayTxnRef);
    boolean existsByVnpayTxnRefStartingWithAndStatus(String prefix, String status);
    boolean existsByDescriptionContainingAndStatus(String description, String status);
    List<Transaction> findAllByDescriptionContainingAndStatus(String description, String status);
    List<Transaction> findAllByAccount_UserIdOrderByCreatedAtDesc(UUID accountId);
    Page<Transaction> findAllByAccount_UserIdOrderByCreatedAtDesc(UUID accountId, Pageable pageable);
    List<Transaction> findAllByOrderByCreatedAtDesc();
    Page<Transaction> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Transaction> findAllByStatus(String status);
    List<Transaction> findAllByStatusAndCreatedAtBetween(String status, java.time.Instant start, java.time.Instant end);
}
