package com.hospital.api.service.impl;

import com.hospital.api.dto.request.DepartmentRequest;
import com.hospital.api.dto.request.RoomRequest;
import com.hospital.api.dto.response.DepartmentResponse;
import com.hospital.api.dto.response.RoomResponse;
import com.hospital.api.entity.Department;
import com.hospital.api.entity.Room;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.RoomRepository;
import com.hospital.api.service.HospitalStructureService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HospitalStructureServiceImpl implements HospitalStructureService {

    private final DepartmentRepository departmentRepository;
    private final RoomRepository roomRepository;

    @Override
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
    public List<RoomResponse> getAllRooms(Boolean includeInactive) {
        List<Room> rooms = Boolean.TRUE.equals(includeInactive)
                ? roomRepository.findAll()
                : roomRepository.findAllByDeletedFalse();
        return rooms.stream()
                .map(RoomResponse::fromEntity)
                .toList();
    }

    @Override
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
        Department department = departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> new AppException("Không tìm thấy khoa với ID: " + request.departmentId(), HttpStatus.NOT_FOUND));

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
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException("Không tìm thấy phòng với ID: " + roomId, HttpStatus.NOT_FOUND));

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
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new AppException("Không tìm thấy phòng với ID: " + roomId, HttpStatus.NOT_FOUND));

        room.setDeleted(!room.isDeleted());
        return RoomResponse.fromEntity(roomRepository.save(room));
    }
}


