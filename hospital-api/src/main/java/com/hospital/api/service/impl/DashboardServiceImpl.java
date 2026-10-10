package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.Role;
import com.hospital.api.dto.response.DashboardStatisticsResponse;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl {

    private final AccountRepository accountRepository;
    private final BookingRepository bookingRepository;
    private final DepartmentRepository departmentRepository;
    private final TransactionRepository transactionRepository;

    public DashboardStatisticsResponse getDashboardStatistics() {
        long totalPatients = accountRepository.count();
        long totalDoctors = accountRepository.findAll().stream().filter(a -> a.getRole() == Role.ROLE_DOCTOR).count();

        long bookingsToday = bookingRepository.findAll().stream()
                .filter(b -> b.getBookingDate().equals(LocalDate.now()))
                .count();

        long completedExams = bookingRepository.findAll().stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED)
                .count();

        BigDecimal revenue = transactionRepository.findAll().stream()
                .filter(t -> "SUCCESS".equals(t.getStatus()))
                .map(t -> t.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> byDept = new HashMap<>();
        departmentRepository.findAllByDeletedFalse().forEach(d -> {
            long count = bookingRepository.findAll().stream()
                    .filter(b -> b.getDoctor().getDepartment().getDepartmentId().equals(d.getDepartmentId()))
                    .count();
            byDept.put(d.getDepartmentName(), count);
        });

        return new DashboardStatisticsResponse(
                totalPatients,
                totalDoctors,
                bookingsToday,
                completedExams,
                revenue,
                byDept
        );
    }
}
