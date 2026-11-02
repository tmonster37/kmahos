package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.dto.response.DashboardStatisticsResponse;
import com.hospital.api.entity.Doctor;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.PatientProfileRepository;
import com.hospital.api.repository.TransactionRepository;
import com.hospital.api.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl {

    private final AccountRepository accountRepository;
    private final BookingRepository bookingRepository;
    private final DepartmentRepository departmentRepository;
    private final TransactionRepository transactionRepository;
    private final DoctorRepository doctorRepository;
    private final PatientProfileRepository patientProfileRepository;

    public DashboardStatisticsResponse getDashboardStatistics() {
        return getDashboardStatistics(null, null, null);
    }

    public DashboardStatisticsResponse getDashboardStatistics(UserPrincipal currentUser) {
        return getDashboardStatistics(currentUser, null, null);
    }

    public DashboardStatisticsResponse getDashboardStatistics(UserPrincipal currentUser, LocalDate startDate, LocalDate endDate) {
        boolean isHod = currentUser != null && currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HEAD_OF_DEPARTMENT"));
        boolean isAdmin = currentUser != null && currentUser.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        LocalDate effectiveStart = startDate != null ? startDate : LocalDate.now().minusDays(6);
        LocalDate effectiveEnd = endDate != null ? endDate : LocalDate.now();
        if (effectiveStart.isAfter(effectiveEnd)) {
            LocalDate temp = effectiveStart;
            effectiveStart = effectiveEnd;
            effectiveEnd = temp;
        }

        // Nếu là Trưởng khoa (và không phải ADMIN): chỉ thống kê trong khoa, TUYỆT ĐỐI KHÔNG xem doanh thu
        if (isHod && !isAdmin) {
            Doctor headDoctor = doctorRepository.findByAccount_UserId(currentUser.getId())
                    .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin trưởng khoa", HttpStatus.FORBIDDEN));
            if (headDoctor.getDepartment() == null) {
                throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
            }
            Integer headDeptId = headDoctor.getDepartment().getDepartmentId();
            String headDeptName = headDoctor.getDepartment().getDepartmentName();

            long totalDoctors = doctorRepository.findAll().stream()
                    .filter(d -> !d.isDeleted() && d.getDepartment() != null && Objects.equals(d.getDepartment().getDepartmentId(), headDeptId))
                    .count();

            final LocalDate sDate = effectiveStart;
            final LocalDate eDate = effectiveEnd;

            long bookingsInRange = bookingRepository.findAll().stream()
                    .filter(b -> !b.isDeleted() && b.getBookingDate() != null)
                    .filter(b -> !b.getBookingDate().isBefore(sDate) && !b.getBookingDate().isAfter(eDate))
                    .filter(b -> b.getDoctor() != null && b.getDoctor().getDepartment() != null && Objects.equals(b.getDoctor().getDepartment().getDepartmentId(), headDeptId))
                    .count();

            long completedExams = bookingRepository.findAll().stream()
                    .filter(b -> !b.isDeleted() && b.getStatus() == BookingStatus.COMPLETED && b.getBookingDate() != null)
                    .filter(b -> !b.getBookingDate().isBefore(sDate) && !b.getBookingDate().isAfter(eDate))
                    .filter(b -> b.getDoctor() != null && b.getDoctor().getDepartment() != null && Objects.equals(b.getDoctor().getDepartment().getDepartmentId(), headDeptId))
                    .count();

            long totalPatientsInDept = bookingRepository.findAll().stream()
                    .filter(b -> !b.isDeleted() && b.getDoctor() != null && b.getDoctor().getDepartment() != null && Objects.equals(b.getDoctor().getDepartment().getDepartmentId(), headDeptId))
                    .map(b -> b.getPatientProfile() != null ? b.getPatientProfile().getPatientProfileId() : null)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();

            Map<String, Long> byDept = new HashMap<>();
            byDept.put(headDeptName, bookingsInRange);

            // Doanh thu: null tuyệt đối đối với Trưởng khoa
            return new DashboardStatisticsResponse(
                    totalPatientsInDept,
                    totalDoctors,
                    bookingsInRange,
                    completedExams,
                    null,
                    byDept
            );
        }

        // Quyền ADMIN: thống kê toàn viện chuẩn xác
        long totalPatients = patientProfileRepository.count();
        long totalDoctors = doctorRepository.findAll().stream().filter(d -> !d.isDeleted()).count();

        long bookingsCount = bookingRepository.countBookingsBetweenDates(effectiveStart, effectiveEnd);
        long completedExams = bookingRepository.countCompletedBookingsBetweenDates(effectiveStart, effectiveEnd);

        Instant startInstant = effectiveStart.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endInstant = effectiveEnd.atTime(23, 59, 59).atZone(ZoneId.systemDefault()).toInstant();
        BigDecimal revenue = transactionRepository.sumSuccessfulAmountBetween(startInstant, endInstant);

        Map<String, Long> byDept = new HashMap<>();
        List<Object[]> deptCounts = bookingRepository.countBookingsByDepartmentBetweenDates(effectiveStart, effectiveEnd);
        for (Object[] row : deptCounts) {
            if (row[0] != null && row[1] != null) {
                byDept.put((String) row[0], ((Number) row[1]).longValue());
            }
        }
        departmentRepository.findAllByDeletedFalse().forEach(d -> {
            byDept.putIfAbsent(d.getDepartmentName(), 0L);
        });

        return new DashboardStatisticsResponse(
                totalPatients,
                totalDoctors,
                bookingsCount,
                completedExams,
                revenue != null ? revenue : BigDecimal.ZERO,
                byDept
        );
    }
}
