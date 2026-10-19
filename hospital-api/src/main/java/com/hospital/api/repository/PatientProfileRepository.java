package com.hospital.api.repository;

import com.hospital.api.entity.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface PatientProfileRepository extends JpaRepository<PatientProfile, UUID> {
    List<PatientProfile> findAllByAccount_UserIdAndDeletedFalse(UUID accountId);
    Optional<PatientProfile> findByPatientProfileIdAndAccount_UserIdAndDeletedFalse(UUID profileId, UUID accountId);

    @Query("SELECT p FROM PatientProfile p WHERE p.deleted = false AND (" +
           "p.phoneNumber LIKE %:kw% OR " +
           "p.identityNumber LIKE %:kw% OR " +
           "p.healthInsuranceNumber LIKE %:kw% OR " +
           "LOWER(p.fullName) LIKE LOWER(CONCAT('%', :kw, '%')))")
    List<PatientProfile> searchProfiles(@Param("kw") String keyword);

    List<PatientProfile> findAllByDeletedFalseOrderByCreatedAtDesc();
}

