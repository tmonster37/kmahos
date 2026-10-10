package com.hospital.api.repository;

import com.hospital.api.constant.BedStatus;
import com.hospital.api.entity.Bed;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BedRepository extends JpaRepository<Bed, UUID> {

    List<Bed> findByRoom_RoomIdOrderByBedNumberAsc(Integer roomId);

    List<Bed> findByRoom_Department_DepartmentIdOrderByRoom_RoomNameAscBedNumberAsc(Integer departmentId);

    List<Bed> findAllByStatus(BedStatus status);

    long countByRoom_RoomId(Integer roomId);

    List<Bed> findByRoom_RoomIdAndStatus(Integer roomId, BedStatus status);

    long countByRoom_RoomIdAndStatus(Integer roomId, BedStatus status);
}
