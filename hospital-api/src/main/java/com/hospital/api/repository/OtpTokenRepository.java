package com.hospital.api.repository;

import com.hospital.api.entity.OtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, UUID> {

    Optional<OtpToken> findTopByRecipientAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String recipient, String purpose, Instant now);

    Optional<OtpToken> findTopByRecipientAndPurposeOrderByCreatedAtDesc(
            String recipient, String purpose);

    long countByRecipientAndCreatedAtAfter(String recipient, Instant since);

    long countByClientIpAndCreatedAtAfter(String clientIp, Instant since);
}

