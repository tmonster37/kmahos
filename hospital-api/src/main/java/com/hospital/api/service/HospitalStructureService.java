package com.hospital.api.service;

import com.hospital.api.dto.request.DepartmentRequest;
import com.hospital.api.dto.request.RoomRequest;
import com.hospital.api.dto.response.DepartmentResponse;
import com.hospital.api.dto.response.RoomResponse;

import java.util.List;

public interface HospitalStructureService {
    List<DepartmentResponse> getAllDepartments(Boolean includeInactive);
    DepartmentResponse createDepartment(DepartmentRequest request);
    DepartmentResponse updateDepartment(Integer departmentId, DepartmentRequest request);
    DepartmentResponse toggleDepartmentStatus(Integer departmentId);

    List<RoomResponse> getAllRooms(Boolean includeInactive);
    List<RoomResponse> getRoomsByDepartment(Integer departmentId, Boolean includeInactive);
    RoomResponse createRoom(RoomRequest request);
    RoomResponse updateRoom(Integer roomId, RoomRequest request);
    RoomResponse toggleRoomStatus(Integer roomId);
}

