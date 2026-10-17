package com.hospital.api.service.impl;

import com.hospital.api.constant.BookingStatus;
import com.hospital.api.constant.PaymentMethod;
import com.hospital.api.dto.response.RevenueKpiResponse;
import com.hospital.api.dto.response.RoomCapacityKpiResponse;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.Room;
import com.hospital.api.entity.Transaction;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.RoomRepository;
import com.hospital.api.repository.TransactionRepository;
import com.hospital.api.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

    private final TransactionRepository transactionRepository;
    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;

    @Override
    @Transactional(readOnly = true)
    public RevenueKpiResponse getRevenueKpi(LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(6);
        LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<Transaction> allTxns = transactionRepository.findAllByStatus("SUCCESS");

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal cash = BigDecimal.ZERO;
        BigDecimal vietQr = BigDecimal.ZERO;
        BigDecimal momo = BigDecimal.ZERO;
        BigDecimal vnpay = BigDecimal.ZERO;
        BigDecimal pos = BigDecimal.ZERO;

        Map<LocalDate, BigDecimal> dailyRevenueMap = new HashMap<>();
        Map<LocalDate, Long> dailyCountMap = new HashMap<>();

        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            dailyRevenueMap.put(d, BigDecimal.ZERO);
            dailyCountMap.put(d, 0L);
        }

        long totalTxnCount = 0;

        for (Transaction txn : allTxns) {
            BigDecimal amt = txn.getAmount() != null ? txn.getAmount() : BigDecimal.ZERO;
            total = total.add(amt);
            totalTxnCount++;

            PaymentMethod method = txn.getPaymentMethod();
            if (method != null) {
                switch (method) {
                    case CASH, COUNTER_CASH -> cash = cash.add(amt);
                    case VIETQR, PAYOS -> vietQr = vietQr.add(amt);
                    case MOMO -> momo = momo.add(amt);
                    case VNPAY -> vnpay = vnpay.add(amt);
                    case POS -> pos = pos.add(amt);
                    default -> vietQr = vietQr.add(amt);
                }
            }

            if (txn.getCreatedAt() != null) {
                LocalDate txnDate = txn.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                if (!txnDate.isBefore(start) && !txnDate.isAfter(end)) {
                    dailyRevenueMap.put(txnDate, dailyRevenueMap.getOrDefault(txnDate, BigDecimal.ZERO).add(amt));
                    dailyCountMap.put(txnDate, dailyCountMap.getOrDefault(txnDate, 0L) + 1);
                }
            }
        }

        List<RevenueKpiResponse.DailyRevenueItem> dailyBreakdown = dailyRevenueMap.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new RevenueKpiResponse.DailyRevenueItem(e.getKey(), e.getValue(), dailyCountMap.getOrDefault(e.getKey(), 0L)))
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        List<Booking> todayBookings = bookingRepository.findAllByBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(today);

        long todayTotal = todayBookings.size();
        long completed = todayBookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();
        long inProgress = todayBookings.stream().filter(b -> b.getStatus() == BookingStatus.IN_PROGRESS).count();
        long cancelled = todayBookings.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();

        double completionRate = todayTotal > 0 ? ((double) completed / todayTotal) * 100.0 : 0.0;
        double cancellationRate = todayTotal > 0 ? ((double) cancelled / todayTotal) * 100.0 : 0.0;

        return new RevenueKpiResponse(
                total,
                cash,
                vietQr,
                momo,
                vnpay,
                pos,
                totalTxnCount,
                todayTotal,
                completed,
                inProgress,
                cancelled,
                Math.round(completionRate * 10.0) / 10.0,
                Math.round(cancellationRate * 10.0) / 10.0,
                dailyBreakdown
        );
    }

    @Override
    @Transactional(readOnly = true)
    public RoomCapacityKpiResponse getRoomCapacityKpi(Integer departmentId) {
        List<Room> allRooms = roomRepository.findAll();
        if (departmentId != null) {
            allRooms = allRooms.stream()
                    .filter(r -> r.getDepartment() != null && Objects.equals(r.getDepartment().getDepartmentId(), departmentId))
                    .collect(Collectors.toList());
        }

        LocalDate today = LocalDate.now();
        List<Booking> todayBookings = bookingRepository.findAllByBookingDateAndDeletedFalseOrderByIsPriorityDescQueueNumberAsc(today);

        List<RoomCapacityKpiResponse.RoomCapacityItem> items = new ArrayList<>();
        double totalRateSum = 0;
        int activeRooms = 0;

        for (Room room : allRooms) {
            String rName = room.getRoomName();
            int maxCap = room.getCapacity() != null && room.getCapacity() > 0 ? room.getCapacity() : 25;

            List<Booking> roomBookings = todayBookings.stream()
                    .filter(b -> {
                        if (b.getTimeSlot() != null && b.getTimeSlot().getDoctorSchedule() != null && b.getTimeSlot().getDoctorSchedule().getRoom() != null) {
                            return Objects.equals(b.getTimeSlot().getDoctorSchedule().getRoom().getRoomId(), room.getRoomId());
                        }
                        if (b.getDoctor() != null && b.getDoctor().getDepartment() != null && room.getDepartment() != null) {
                            return Objects.equals(b.getDoctor().getDepartment().getDepartmentId(), room.getDepartment().getDepartmentId());
                        }
                        return false;
                    })
                    .toList();

            int waiting = (int) roomBookings.stream().filter(b -> b.getStatus() == BookingStatus.CONFIRMED).count();
            int examining = (int) roomBookings.stream().filter(b -> b.getStatus() == BookingStatus.IN_PROGRESS).count();
            int completed = (int) roomBookings.stream().filter(b -> b.getStatus() == BookingStatus.COMPLETED).count();

            int totalOccupied = waiting + examining + completed;
            if (totalOccupied > 0) activeRooms++;

            double rate = Math.min(100.0, Math.round(((double) totalOccupied / maxCap) * 1000.0) / 10.0);
            totalRateSum += rate;

            String loadLevel = "LIGHT";
            if (rate >= 80.0 || waiting >= 5) {
                loadLevel = "HEAVY";
            } else if (rate >= 40.0 || waiting >= 3) {
                loadLevel = "MEDIUM";
            }

            String docName = "BS. Trực Buồng";
            if (!roomBookings.isEmpty() && roomBookings.get(0).getDoctor() != null && roomBookings.get(0).getDoctor().getAccount() != null) {
                docName = roomBookings.get(0).getDoctor().getAccount().getFullName();
            }

            String deptName = room.getDepartment() != null ? room.getDepartment().getDepartmentName() : "Khoa Khám Bệnh";

            items.add(new RoomCapacityKpiResponse.RoomCapacityItem(
                    room.getRoomId(),
                    rName,
                    deptName,
                    docName,
                    waiting,
                    examining,
                    completed,
                    rate,
                    loadLevel
            ));
        }

        double overallRate = !items.isEmpty() ? Math.round((totalRateSum / items.size()) * 10.0) / 10.0 : 0.0;

        return new RoomCapacityKpiResponse(
                allRooms.size(),
                activeRooms,
                overallRate,
                items
        );
    }
}
