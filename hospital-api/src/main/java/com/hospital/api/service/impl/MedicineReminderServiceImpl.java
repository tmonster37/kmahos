package com.hospital.api.service.impl;

import com.hospital.api.dto.request.CreateReminderRequest;
import com.hospital.api.entity.MedicineReminder;
import com.hospital.api.entity.PatientProfile;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.MedicineReminderRepository;
import com.hospital.api.repository.PatientProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicineReminderServiceImpl {

    private final MedicineReminderRepository reminderRepository;
    private final PatientProfileRepository profileRepository;

    public List<MedicineReminder> getMyReminders(UUID accountId) {
        return reminderRepository.findAllByPatientProfile_Account_UserIdAndEndDateGreaterThanEqualAndDeletedFalse(
                accountId, LocalDate.now());
    }

    @Transactional
    public MedicineReminder createReminder(CreateReminderRequest request) {
        PatientProfile profile = profileRepository.findById(request.patientProfileId())
                .orElseThrow(() -> new AppException("Không tìm thấy hồ sơ", HttpStatus.NOT_FOUND));

        MedicineReminder reminder = MedicineReminder.builder()
                .patientProfile(profile)
                .medicineName(request.medicineName())
                .dosage(request.dosage())
                .unit(request.unit())
                .reminderTime(request.reminderTime())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .instruction(request.instruction())
                .build();

        return reminderRepository.save(reminder);
    }

    @Transactional
    public void markAsTaken(UUID reminderId) {
        MedicineReminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new AppException("Không tìm thấy lịch nhắc", HttpStatus.NOT_FOUND));

        reminder.setTakenToday(true);
        reminderRepository.save(reminder);
    }
}
