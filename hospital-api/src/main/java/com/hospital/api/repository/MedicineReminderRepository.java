package com.hospital.api.repository;

import com.hospital.api.entity.MedicineReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface MedicineReminderRepository extends JpaRepository<MedicineReminder, UUID> {
    List<MedicineReminder> findAllByPatientProfile_Account_UserIdAndEndDateGreaterThanEqualAndDeletedFalse(UUID accountId, LocalDate date);
}

