package com.hospital.api.controller;

import com.hospital.api.common.ApiResponse;
import com.hospital.api.dto.request.DepartmentRequest;
import com.hospital.api.dto.request.RoomRequest;
import com.hospital.api.dto.response.DepartmentResponse;
import com.hospital.api.dto.response.RoomResponse;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.HospitalStructureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final HospitalStructureService structureService;

    // Xem danh sách khoa (Công khai cho mọi người)
    @GetMapping
    public ResponseEntity<ApiResponse<List<DepartmentResponse>>> getAllDepartments(
            @RequestParam(required = false, defaultValue = "false") Boolean includeInactive
    ) {
        return ResponseEntity.ok(ApiResponse.ok(structureService.getAllDepartments(includeInactive), "Lấy danh sách khoa thành công"));
    }

    // Tạo khoa mới (Admin)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> createDepartment(@Valid @RequestBody DepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(structureService.createDepartment(request), "Tạo khoa thành công"));
    }

    // Cập nhật thông tin khoa (Admin + Trưởng khoa của đúng khoa đó)
    @PutMapping("/{departmentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> updateDepartment(
            @PathVariable Integer departmentId,
            @Valid @RequestBody DepartmentRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(structureService.updateDepartment(departmentId, request, currentUser), "Cập nhật thông tin khoa thành công"));
    }

    // Bật/Tắt trạng thái hoạt động của khoa (Admin)
    @DeleteMapping("/{departmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DepartmentResponse>> toggleDepartmentStatus(@PathVariable Integer departmentId) {
        return ResponseEntity.ok(ApiResponse.ok(structureService.toggleDepartmentStatus(departmentId), "Thay đổi trạng thái khoa thành công"));
    }

    // Lấy tất cả các phòng
    @GetMapping("/rooms/all")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getAllRooms(
            @RequestParam(required = false, defaultValue = "false") Boolean includeInactive
    ) {
        return ResponseEntity.ok(ApiResponse.ok(structureService.getAllRooms(includeInactive), "Lấy danh sách tất cả phòng thành công"));
    }

    // Lấy các phòng thuộc 1 khoa
    @GetMapping("/{departmentId}/rooms")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getRoomsByDepartment(
            @PathVariable Integer departmentId,
            @RequestParam(required = false, defaultValue = "false") Boolean includeInactive
    ) {
        return ResponseEntity.ok(ApiResponse.ok(structureService.getRoomsByDepartment(departmentId, includeInactive), "Lấy danh sách phòng thành công"));
    }

    // Tạo phòng mới trong khoa (Admin + Trưởng khoa của khoa đó)
    @PostMapping("/rooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(
            @Valid @RequestBody RoomRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(structureService.createRoom(request, currentUser), "Tạo phòng thành công"));
    }

    // Cập nhật phòng (Admin + Trưởng khoa của phòng đó)
    @PutMapping("/rooms/{roomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<RoomResponse>> updateRoom(
            @PathVariable Integer roomId,
            @Valid @RequestBody RoomRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(structureService.updateRoom(roomId, request, currentUser), "Cập nhật thông tin phòng thành công"));
    }

    // Bật/Tắt trạng thái hoạt động của phòng (Admin + Trưởng khoa của phòng đó)
    @DeleteMapping("/rooms/{roomId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HEAD_OF_DEPARTMENT')")
    public ResponseEntity<ApiResponse<RoomResponse>> toggleRoomStatus(
            @PathVariable Integer roomId,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(structureService.toggleRoomStatus(roomId, currentUser), "Thay đổi trạng thái phòng thành công"));
    }
}
