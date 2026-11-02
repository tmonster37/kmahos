package com.hospital.api.service.impl;

import com.hospital.api.constant.ScheduleSession;
import com.hospital.api.dto.request.CreateScheduleRequest;
import com.hospital.api.dto.request.UpdateScheduleRequest;
import com.hospital.api.dto.response.ScheduleResponse;
import com.hospital.api.entity.Booking;
import com.hospital.api.entity.Doctor;
import com.hospital.api.entity.DoctorSchedule;
import com.hospital.api.entity.Room;
import com.hospital.api.entity.TimeSlot;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.DoctorScheduleRepository;
import com.hospital.api.repository.RoomRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorRepository doctorRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;

    private Integer resolveHodDepartmentId(UserPrincipal currentUser) {
        if (currentUser == null) return null;
        boolean isHod = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HEAD_OF_DEPARTMENT"));
        boolean isAdmin = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isHod && !isAdmin) {
            Doctor headDoctor = doctorRepository.findByAccount_UserId(currentUser.getId())
                    .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin bác sĩ trưởng khoa", HttpStatus.FORBIDDEN));
            if (headDoctor.getDepartment() == null) {
                throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
            }
            return headDoctor.getDepartment().getDepartmentId();
        }
        return null;
    }

    @Override
    @Transactional
    public ScheduleResponse createSchedule(CreateScheduleRequest request) {
        return createSchedule(request, null);
    }

    @Override
    @Transactional
    public ScheduleResponse createSchedule(CreateScheduleRequest request, UserPrincipal currentUser) {
        if (scheduleRepository.existsByDoctor_DoctorIdAndScheduleDateAndSessionAndDeletedFalse(
                request.doctorId(), request.scheduleDate(), request.session())) {
            throw new AppException("Bác sĩ đã có lịch trực trong ca này", HttpStatus.BAD_REQUEST);
        }

        if (scheduleRepository.existsByRoom_RoomIdAndScheduleDateAndSessionAndDeletedFalse(
                request.roomId(), request.scheduleDate(), request.session())) {
            throw new AppException("Phòng khám này đã có bác sĩ khác trực trong ca này", HttpStatus.BAD_REQUEST);
        }

        Doctor doctor = doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new AppException("Không tìm thấy bác sĩ", HttpStatus.NOT_FOUND));

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() -> new AppException("Không tìm thấy phòng khám", HttpStatus.NOT_FOUND));

        // Ràng buộc 1: Nếu là Trưởng khoa (không phải ADMIN), chỉ được xếp lịch trực cho bác sĩ và phòng khám thuộc khoa do mình phụ trách
        if (currentUser != null) {
            boolean isAdmin = currentUser.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                Doctor headDoctor = doctorRepository.findByAccount_UserId(currentUser.getId())
                        .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin bác sĩ trưởng khoa", HttpStatus.FORBIDDEN));
                if (headDoctor.getDepartment() == null) {
                    throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
                }
                Integer headDeptId = headDoctor.getDepartment().getDepartmentId();
                if (doctor.getDepartment() == null || !headDeptId.equals(doctor.getDepartment().getDepartmentId())) {
                    throw new AppException("Trưởng khoa chỉ có quyền tạo lịch trực cho bác sĩ thuộc khoa mình phụ trách", HttpStatus.FORBIDDEN);
                }
                if (room.getDepartment() == null || !headDeptId.equals(room.getDepartment().getDepartmentId())) {
                    throw new AppException("Trưởng khoa chỉ có quyền xếp lịch cho phòng khám thuộc khoa mình phụ trách", HttpStatus.FORBIDDEN);
                }
            }
        }

        // Ràng buộc 4: Bác sĩ chỉ được phép xếp lịch trực vào buồng/phòng khám thuộc đúng chuyên khoa của mình
        if (doctor.getDepartment() == null || room.getDepartment() == null || !doctor.getDepartment().getDepartmentId().equals(room.getDepartment().getDepartmentId())) {
            throw new AppException(String.format("Bác sĩ [%s] thuộc chuyên khoa [%s], chỉ được xếp lịch trực vào phòng khám thuộc đúng chuyên khoa này (Phòng [%s] thuộc khoa [%s])",
                    doctor.getAccount() != null ? doctor.getAccount().getFullName() : doctor.getDoctorId(),
                    doctor.getDepartment() != null ? doctor.getDepartment().getDepartmentName() : "Chưa xác định",
                    room.getRoomName(),
                    room.getDepartment() != null ? room.getDepartment().getDepartmentName() : "Chưa xác định"),
                    HttpStatus.BAD_REQUEST);
        }


        DoctorSchedule schedule = DoctorSchedule.builder()
                .doctor(doctor)
                .room(room)
                .scheduleDate(request.scheduleDate())
                .session(request.session())
                .build();

        int maxCapacity = (request.maxCapacityPerSlot() != null && request.maxCapacityPerSlot() > 0)
                ? request.maxCapacityPerSlot()
                : 5;

        // Tự động sinh các TimeSlot (mỗi slot 30 phút)
        List<TimeSlot> slots = generateTimeSlots(schedule, request.session(), maxCapacity);
        schedule.setTimeSlots(slots);

        return ScheduleResponse.fromEntity(scheduleRepository.save(schedule));
    }

    private List<TimeSlot> generateTimeSlots(DoctorSchedule schedule, ScheduleSession session, int maxCapacity) {
        LocalTime start = switch (session) {
            case MORNING -> LocalTime.of(7, 30);
            case AFTERNOON -> LocalTime.of(13, 0);
            case EVENING -> LocalTime.of(17, 30);
        };

        LocalTime end = switch (session) {
            case MORNING -> LocalTime.of(11, 30);
            case AFTERNOON -> LocalTime.of(17, 0);
            case EVENING -> LocalTime.of(20, 30);
        };

        List<TimeSlot> timeSlots = new ArrayList<>();
        LocalTime current = start;

        while (current.isBefore(end)) {
            LocalTime next = current.plusMinutes(30);
            TimeSlot slot = TimeSlot.builder()
                    .doctorSchedule(schedule)
                    .startTime(current)
                    .endTime(next)
                    .maxCapacity(maxCapacity)
                    .currentBookings(0)
                    .build();
            timeSlots.add(slot);
            current = next;
        }

        return timeSlots;
    }

    @Override
    @Transactional
    public ScheduleResponse updateSchedule(UUID scheduleId, UpdateScheduleRequest request) {
        return updateSchedule(scheduleId, request, null);
    }

    @Override
    @Transactional
    public ScheduleResponse updateSchedule(UUID scheduleId, UpdateScheduleRequest request, UserPrincipal currentUser) {
        DoctorSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new AppException("Ca trực không tồn tại", HttpStatus.NOT_FOUND));

        if (schedule.isDeleted()) {
            throw new AppException("Ca trực này đã bị hủy trước đó", HttpStatus.BAD_REQUEST);
        }

        Doctor targetDoctor = doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new AppException("Không tìm thấy bác sĩ", HttpStatus.NOT_FOUND));

        Room targetRoom = roomRepository.findById(request.roomId())
                .orElseThrow(() -> new AppException("Không tìm thấy phòng khám", HttpStatus.NOT_FOUND));

        // Ràng buộc 1: Nếu là Trưởng khoa (không phải ADMIN)
        if (currentUser != null) {
            boolean isAdmin = currentUser.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                Doctor headDoctor = doctorRepository.findByAccount_UserId(currentUser.getId())
                        .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin bác sĩ trưởng khoa", HttpStatus.FORBIDDEN));
                if (headDoctor.getDepartment() == null) {
                    throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
                }
                Integer headDeptId = headDoctor.getDepartment().getDepartmentId();
                if (schedule.getDoctor().getDepartment() == null || !headDeptId.equals(schedule.getDoctor().getDepartment().getDepartmentId())) {
                    throw new AppException("Trưởng khoa chỉ có quyền chỉnh sửa ca trực của khoa mình phụ trách", HttpStatus.FORBIDDEN);
                }
                if (targetDoctor.getDepartment() == null || !headDeptId.equals(targetDoctor.getDepartment().getDepartmentId())) {
                    throw new AppException("Không thể phân ca cho bác sĩ không thuộc khoa của bạn", HttpStatus.FORBIDDEN);
                }
                if (targetRoom.getDepartment() == null || !headDeptId.equals(targetRoom.getDepartment().getDepartmentId())) {
                    throw new AppException("Trưởng khoa chỉ có quyền xếp lịch cho phòng khám thuộc khoa mình phụ trách", HttpStatus.FORBIDDEN);
                }
            }
        }

        // Ràng buộc 4: Bác sĩ chỉ được phép xếp lịch trực vào phòng khám thuộc đúng chuyên khoa của mình
        if (targetDoctor.getDepartment() == null || targetRoom.getDepartment() == null || !targetDoctor.getDepartment().getDepartmentId().equals(targetRoom.getDepartment().getDepartmentId())) {
            throw new AppException(String.format("Bác sĩ [%s] thuộc chuyên khoa [%s], chỉ được xếp lịch trực vào phòng khám thuộc đúng chuyên khoa này (Phòng [%s] thuộc khoa [%s])",
                    targetDoctor.getAccount() != null ? targetDoctor.getAccount().getFullName() : targetDoctor.getDoctorId(),
                    targetDoctor.getDepartment() != null ? targetDoctor.getDepartment().getDepartmentName() : "Chưa xác định",
                    targetRoom.getRoomName(),
                    targetRoom.getDepartment() != null ? targetRoom.getDepartment().getDepartmentName() : "Chưa xác định"),
                    HttpStatus.BAD_REQUEST);
        }

        // Kiểm tra xung đột bác sĩ trong cùng ngày và buổi (loại trừ chính ca này)
        if (scheduleRepository.existsByDoctor_DoctorIdAndScheduleDateAndSessionAndDoctorScheduleIdNotAndDeletedFalse(
                request.doctorId(), request.scheduleDate(), request.session(), scheduleId)) {
            throw new AppException("Bác sĩ đã có lịch trực khác trong ca này", HttpStatus.BAD_REQUEST);
        }

        // Kiểm tra xung đột phòng khám trong cùng ngày và buổi (loại trừ chính ca này)
        if (scheduleRepository.existsByRoom_RoomIdAndScheduleDateAndSessionAndDoctorScheduleIdNotAndDeletedFalse(
                request.roomId(), request.scheduleDate(), request.session(), scheduleId)) {
            throw new AppException("Phòng khám này đã có bác sĩ khác trực trong ca này", HttpStatus.BAD_REQUEST);
        }

        // Kiểm tra các lịch hẹn đang hoạt động của ca trực
        int totalBookings = schedule.getTimeSlots() != null
                ? schedule.getTimeSlots().stream().mapToInt(ts -> ts.getCurrentBookings() != null ? ts.getCurrentBookings() : 0).sum()
                : 0;
        int totalHolding = schedule.getTimeSlots() != null
                ? schedule.getTimeSlots().stream().mapToInt(ts -> ts.getHoldingCount() != null ? ts.getHoldingCount() : 0).sum()
                : 0;
        int activeAppointments = totalBookings + totalHolding;

        int newCapacity = (request.maxCapacityPerSlot() != null && request.maxCapacityPerSlot() > 0)
                ? request.maxCapacityPerSlot()
                : 5;

        if (activeAppointments > 0) {
            // Nghiệp vụ bảo vệ bệnh nhân: Không được thay đổi ngày hoặc buổi trực khi đã có bệnh nhân đặt
            if (!schedule.getScheduleDate().equals(request.scheduleDate()) || schedule.getSession() != request.session()) {
                throw new AppException(
                        String.format("Ca trực đã có %d bệnh nhân đặt chỗ/giữ chỗ, không thể thay đổi ngày trực hoặc buổi trực để tránh ảnh hưởng lịch hẹn của người bệnh", activeAppointments),
                        HttpStatus.BAD_REQUEST
                );
            }

            // Nếu đổi bác sĩ, bác sĩ mới phải cùng chuyên khoa với bác sĩ cũ
            if (!schedule.getDoctor().getDoctorId().equals(targetDoctor.getDoctorId())) {
                Integer oldDeptId = schedule.getDoctor().getDepartment() != null ? schedule.getDoctor().getDepartment().getDepartmentId() : null;
                Integer newDeptId = targetDoctor.getDepartment() != null ? targetDoctor.getDepartment().getDepartmentId() : null;
                if (oldDeptId != null && !oldDeptId.equals(newDeptId)) {
                    throw new AppException("Không thể đổi sang bác sĩ thuộc chuyên khoa khác vì ca trực đã có bệnh nhân đặt hẹn", HttpStatus.BAD_REQUEST);
                }
            }

            // Kiểm tra sức chứa mới không được thấp hơn số lượng đã đặt ở bất kỳ khung giờ nào
            if (schedule.getTimeSlots() != null) {
                for (TimeSlot slot : schedule.getTimeSlots()) {
                    int slotBooked = (slot.getCurrentBookings() != null ? slot.getCurrentBookings() : 0)
                            + (slot.getHoldingCount() != null ? slot.getHoldingCount() : 0);
                    if (newCapacity < slotBooked) {
                        throw new AppException(
                                String.format("Không thể giảm sức chứa xuống %d vì khung giờ %s - %s đã có %d bệnh nhân đặt chỗ",
                                        newCapacity, slot.getStartTime(), slot.getEndTime(), slotBooked),
                                        HttpStatus.BAD_REQUEST
                        );
                    }
                }
            }
        }

        // Cập nhật TimeSlots
        if (schedule.getTimeSlots() != null) {
            if (activeAppointments == 0 && schedule.getSession() != request.session()) {
                // Đổi buổi trực khi chưa có ai đặt: tái tạo các time slot theo buổi mới
                schedule.getTimeSlots().clear();
                List<TimeSlot> newSlots = generateTimeSlots(schedule, request.session(), newCapacity);
                schedule.getTimeSlots().addAll(newSlots);
            } else {
                // Cập nhật maxCapacity cho các time slot hiện có
                schedule.getTimeSlots().forEach(ts -> ts.setMaxCapacity(newCapacity));
            }
        }

        boolean doctorChanged = !schedule.getDoctor().getDoctorId().equals(targetDoctor.getDoctorId());

        // Cập nhật thông tin ca trực
        schedule.setDoctor(targetDoctor);
        schedule.setRoom(targetRoom);
        schedule.setScheduleDate(request.scheduleDate());
        schedule.setSession(request.session());

        DoctorSchedule saved = scheduleRepository.save(schedule);

        // Nếu có đổi bác sĩ và ca trực đã có bệnh nhân đặt, đồng bộ bác sĩ trong phiếu đặt khám của bệnh nhân
        if (doctorChanged && totalBookings > 0) {
            List<Booking> bookings = bookingRepository.findAllByTimeSlot_DoctorSchedule_DoctorScheduleIdAndDeletedFalse(scheduleId);
            for (Booking b : bookings) {
                b.setDoctor(targetDoctor);
            }
            bookingRepository.saveAll(bookings);
        }

        return ScheduleResponse.fromEntity(saved);
    }

    @Override
    public List<ScheduleResponse> getSchedulesByDepartmentAndDate(Integer departmentId, LocalDate date) {
        return scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(departmentId, date)
                .stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    public List<ScheduleResponse> getDoctorSchedules(UUID doctorId) {
        return scheduleRepository.findAllByDoctor_DoctorIdAndScheduleDateAfterAndDeletedFalse(doctorId, LocalDate.now().minusDays(1))
                .stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    public List<ScheduleResponse> getAllSchedules(LocalDate date) {
        return getAllSchedules(date, null);
    }

    @Override
    public List<ScheduleResponse> getAllSchedules(LocalDate date, UserPrincipal currentUser) {
        Integer headDeptId = resolveHodDepartmentId(currentUser);
        if (headDeptId != null) {
            LocalDate queryDate = date != null ? date : LocalDate.now();
            return getSchedulesByDepartmentAndDate(headDeptId, queryDate);
        }

        List<DoctorSchedule> schedules;
        if (date != null) {
            schedules = scheduleRepository.findAllByScheduleDateAndDeletedFalse(date);
        } else {
            schedules = scheduleRepository.findAllByDeletedFalse();
        }
        return schedules.stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    public List<ScheduleResponse> getSchedules(LocalDate startDate, LocalDate endDate, UUID doctorId, Integer departmentId) {
        return getSchedules(startDate, endDate, doctorId, departmentId, null);
    }

    @Override
    public List<ScheduleResponse> getSchedules(LocalDate startDate, LocalDate endDate, UUID doctorId, Integer departmentId, UserPrincipal currentUser) {
        Integer effectiveDeptId = departmentId;
        Integer headDeptId = resolveHodDepartmentId(currentUser);
        if (headDeptId != null) {
            effectiveDeptId = headDeptId;
        }

        List<DoctorSchedule> schedules;
        if (doctorId != null && startDate != null && endDate != null) {
            schedules = scheduleRepository.findAllByDoctor_DoctorIdAndScheduleDateBetweenAndDeletedFalse(doctorId, startDate, endDate);
        } else if (doctorId != null) {
            schedules = scheduleRepository.findAllByDoctor_DoctorIdAndScheduleDateAfterAndDeletedFalse(doctorId, LocalDate.now().minusDays(1));
        } else if (effectiveDeptId != null && startDate != null && endDate != null) {
            schedules = scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateBetweenAndDeletedFalse(effectiveDeptId, startDate, endDate);
        } else if (effectiveDeptId != null && startDate != null) {
            schedules = scheduleRepository.findAllByDoctor_Department_DepartmentIdAndScheduleDateAndDeletedFalse(effectiveDeptId, startDate);
        } else if (effectiveDeptId != null) {
            schedules = scheduleRepository.findAllByDoctor_Department_DepartmentIdAndDeletedFalse(effectiveDeptId);
        } else if (startDate != null && endDate != null) {
            schedules = scheduleRepository.findAllByScheduleDateBetweenAndDeletedFalse(startDate, endDate);
        } else if (startDate != null) {
            schedules = scheduleRepository.findAllByScheduleDateAndDeletedFalse(startDate);
        } else {
            schedules = scheduleRepository.findAllByDeletedFalse();
        }
        return schedules.stream()
                .map(ScheduleResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public void deleteSchedule(UUID scheduleId) {
        deleteSchedule(scheduleId, null);
    }

    @Override
    @Transactional
    public void deleteSchedule(UUID scheduleId, UserPrincipal currentUser) {
        DoctorSchedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new AppException("Ca trực không tồn tại", HttpStatus.NOT_FOUND));

        // Ràng buộc 1: Nếu là Trưởng khoa (không phải ADMIN), chỉ được xóa ca trực của khoa mình phụ trách
        if (currentUser != null) {
            boolean isAdmin = currentUser.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin) {
                Doctor headDoctor = doctorRepository.findByAccount_UserId(currentUser.getId())
                        .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin bác sĩ trưởng khoa", HttpStatus.FORBIDDEN));
                if (headDoctor.getDepartment() == null) {
                    throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
                }
                Integer headDeptId = headDoctor.getDepartment().getDepartmentId();
                if (schedule.getDoctor().getDepartment() == null || !headDeptId.equals(schedule.getDoctor().getDepartment().getDepartmentId())) {
                    throw new AppException("Trưởng khoa chỉ có quyền xóa ca trực của khoa mình phụ trách", HttpStatus.FORBIDDEN);
                }
            }
        }

        int activeBookings = schedule.getTimeSlots() != null
                ? schedule.getTimeSlots().stream().mapToInt(ts -> (ts.getCurrentBookings() != null ? ts.getCurrentBookings() : 0) + (ts.getHoldingCount() != null ? ts.getHoldingCount() : 0)).sum()
                : 0;

        if (activeBookings > 0) {
            throw new AppException(
                    String.format("Không thể hủy ca trực này vì đã có %d bệnh nhân đặt chỗ/giữ chỗ khám", activeBookings),
                    HttpStatus.BAD_REQUEST
            );
        }

        schedule.setDeleted(true);
        scheduleRepository.save(schedule);
    }
}
