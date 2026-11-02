package com.hospital.api.service.impl;

import com.hospital.api.dto.request.DepartmentRequest;
import com.hospital.api.dto.request.RoomRequest;
import com.hospital.api.dto.response.DepartmentResponse;
import com.hospital.api.dto.response.RoomResponse;
import com.hospital.api.entity.Department;
import com.hospital.api.entity.Doctor;
import com.hospital.api.entity.Room;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.repository.RoomRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.HospitalStructureService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HospitalStructureServiceImpl implements HospitalStructureService {

    private final DepartmentRepository departmentRepository;
    private final RoomRepository roomRepository;
    private final DoctorRepository doctorRepository;

    private Integer validateAndGetHodDepartmentId(UserPrincipal currentUser) {
        if (currentUser == null) return null;
        boolean isHod = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_HEAD_OF_DEPARTMENT"));
        boolean isAdmin = currentUser.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isHod && !isAdmin) {
            Doctor headDoc = doctorRepository.findByAccount_UserId(currentUser.getId())
                    .orElseThrow(() -> new AppException("Tài khoản không gắn với thông tin trưởng khoa", HttpStatus.FORBIDDEN));
            if (headDoc.getDepartment() == null) {
                throw new AppException("Trưởng khoa chưa được gán chuyên khoa quản lý", HttpStatus.FORBIDDEN);
            }
            return headDoc.getDepartment().getDepartmentId();
        }
        return null;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentResponse> getAllDepartments(Boolean includeInactive) {
        List<Department> list = Boolean.TRUE.equals(includeInactive)
                ? departmentRepository.findAll()
                : departmentRepository.findAllByDeletedFalse();
        return list.stream()
                .map(DepartmentResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    @CacheEvict(value = "departments", allEntries = true)
    public DepartmentResponse createDepartment(DepartmentRequest request) {
        if (departmentRepository.existsByDepartmentName(request.departmentName())) {
            throw new AppException("Tên khoa này đã tồn tại", HttpStatus.BAD_REQUEST);
        }

        Department department = Department.builder()
                .departmentName(request.departmentName().trim())
                .description(request.description())
                .thumbnailUrl(request.thumbnailUrl())
                .build();

        return DepartmentResponse.fromEntity(departmentRepository.save(department));
    }

    @Override
    @Transactional
    @CacheEvict(value = "departments", allEntries = true)
    public DepartmentResponse updateDepartment(Integer departmentId, DepartmentRequest request) {
        return updateDepartment(departmentId, request, null);
    }

    @Override
    @Transactional
    @CacheEvict(value = "departments", allEntries = true)
    public DepartmentResponse updateDepartment(Integer departmentId, DepartmentRequest request, UserPrincipal currentUser) {
        Integer headDeptId = validateAndGetHodDepartmentId(currentUser);
        if (headDeptId != null && !headDeptId.equals(departmentId)) {
            throw new AppException("Trưởng khoa chỉ có quyền cập nhật thông tin khoa do mình phụ trách", HttpStatus.FORBIDDEN);
        }

        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new AppException("Không tìm thấy khoa với ID: " + departmentId, HttpStatus.NOT_FOUND));

        if (!department.getDepartmentName().equalsIgnoreCase(request.departmentName().trim())
                && departmentRepository.existsByDepartmentName(request.departmentName().trim())) {
            throw new AppException("Tên khoa này đã tồn tại", HttpStatus.BAD_REQUEST);
        }

        department.setDepartmentName(request.departmentName().trim());
        department.setDescription(request.description());
        if (request.thumbnailUrl() != null) {
            department.setThumbnailUrl(request.thumbnailUrl());
        }

        return DepartmentResponse.fromEntity(departmentRepository.save(department));
    }

    @Override
    @Transactional
    @CacheEvict(value = "departments", allEntries = true)
    public DepartmentResponse toggleDepartmentStatus(Integer departmentId) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new AppException("Không tìm thấy khoa với ID: " + departmentId, HttpStatus.NOT_FOUND));

        department.setDeleted(!department.isDeleted());
        return DepartmentResponse.fromEntity(departmentRepository.save(department));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> getAllRooms(Boolean includeInactive) {
        List<Room> rooms = Boolean.TRUE.equals(includeInactive)
                ? roomRepository.findAll()
                : roomRepository.findAllByDeletedFalse();
        return rooms.stream()
                .map(RoomResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> getRoomsByDepartment(Integer departmentId, Boolean includeInactive) {
        List<Room> rooms = Boolean.TRUE.equals(includeInactive)
                ? roomRepository.findAllByDepartment_DepartmentId(departmentId)
                : roomRepository.findAllByDepartment_DepartmentIdAndDeletedFalse(departmentId);
        return rooms.stream()
                .map(RoomResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    @CacheEvict(value = {"rooms", "department_rooms"}, allEntries = true)
    public RoomResponse createRoom(RoomRequest request) {
        return createRoom(request, null);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"rooms", "department_rooms"}, allEntries = true)
    public RoomResponse createRoom(RoomRequest request, UserPrincipal currentUser) {
        Integer headDeptId = validateAndGetHodDepartmentId(currentUser);
        Integer targetDeptId = request.departmentId();
        if (headDeptId != null) {
            if (targetDeptId != null && !headDeptId.equals(targetDeptId)) {
                throw new AppException("Trưởng khoa chỉ có quyền tạo phòng thuộc khoa do mình phụ trách", HttpStatus.FORBIDDEN);
            }
            targetDeptId = headDeptId;
        }

        final Integer finalDeptId = targetDeptId;
        Department department = departmentRepository.findById(finalDeptId)
                .orElseThrow(() -> new AppException("Không tìm thấy khoa với ID: " + finalDeptId, HttpStatus.NOT_FOUND));

        Room room = Room.builder()
                .roomName(request.roomName().trim())
                .description(request.description())
                .roomType(request.roomType())
                .capacity(request.capacity() != null ? request.capacity() : 1)
                .department(department)
                .build();

        return RoomResponse.fromEntity(roomRepository.save(room));
    }

    @Override
    @Transactional
    @CacheEvict(value = {"rooms", "department_rooms"}, allEntries = true)
    public RoomResponse updateRoom(Integer roomId, RoomRequest request) {
        return updateRoom(roomId, request, null);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"rooms", "department_rooms"}, allEntries = true)
    public RoomResponse updateRoom(Integer roomId, RoomRequest request, UserPrincipal currentUser) {
        Integer headDeptId = validateAndGetHodDepartmentId(currentUser);
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException("Không tìm thấy phòng với ID: " + roomId, HttpStatus.NOT_FOUND));

        if (headDeptId != null) {
            if (room.getDepartment() == null || !headDeptId.equals(room.getDepartment().getDepartmentId())) {
                throw new AppException("Trưởng khoa chỉ có quyền chỉnh sửa phòng thuộc khoa do mình phụ trách", HttpStatus.FORBIDDEN);
            }
            if (request.departmentId() != null && !headDeptId.equals(request.departmentId())) {
                throw new AppException("Không thể chuyển phòng sang chuyên khoa khác", HttpStatus.FORBIDDEN);
            }
        }

        if (request.departmentId() != null && (room.getDepartment() == null || !room.getDepartment().getDepartmentId().equals(request.departmentId()))) {
            Department department = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new AppException("Không tìm thấy khoa với ID: " + request.departmentId(), HttpStatus.NOT_FOUND));
            room.setDepartment(department);
        }

        room.setRoomName(request.roomName().trim());
        room.setDescription(request.description());
        room.setRoomType(request.roomType());
        if (request.capacity() != null) {
            room.setCapacity(request.capacity());
        }

        return RoomResponse.fromEntity(roomRepository.save(room));
    }

    @Override
    @Transactional
    @CacheEvict(value = {"rooms", "department_rooms"}, allEntries = true)
    public RoomResponse toggleRoomStatus(Integer roomId) {
        return toggleRoomStatus(roomId, null);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"rooms", "department_rooms"}, allEntries = true)
    public RoomResponse toggleRoomStatus(Integer roomId, UserPrincipal currentUser) {
        Integer headDeptId = validateAndGetHodDepartmentId(currentUser);
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException("Không tìm thấy phòng với ID: " + roomId, HttpStatus.NOT_FOUND));

        if (headDeptId != null) {
            if (room.getDepartment() == null || !headDeptId.equals(room.getDepartment().getDepartmentId())) {
                throw new AppException("Trưởng khoa chỉ có quyền thay đổi trạng thái phòng thuộc khoa do mình phụ trách", HttpStatus.FORBIDDEN);
            }
        }

        room.setDeleted(!room.isDeleted());
        return RoomResponse.fromEntity(roomRepository.save(room));
    }
}
