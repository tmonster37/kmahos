package com.hospital.api.repository;

import com.hospital.api.constant.BedStatus;
import com.hospital.api.entity.Bed;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BedRepository extends JpaRepository<Bed, UUID> {

    List<Bed> findByRoom_RoomIdOrderByBedNumberAsc(Integer roomId);

    List<Bed> findByRoom_Department_DepartmentIdOrderByRoom_RoomNameAscBedNumberAsc(Integer departmentId);

    List<Bed> findAllByStatus(BedStatus status);

    long countByRoom_RoomId(Integer roomId);

    List<Bed> findByRoom_RoomIdAndStatus(Integer roomId, BedStatus status);

    long countByRoom_RoomIdAndStatus(Integer roomId, BedStatus status);

    // Khóa bi quan khi tiếp nhận/chuyển giường nội trú (BIZ-P1-04)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Bed b WHERE b.bedId = :bedId")
    Optional<Bed> findByIdForUpdate(@Param("bedId") UUID bedId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Bed b WHERE b.room.roomId = :roomId AND b.status = :status ORDER BY b.bedNumber ASC")
    List<Bed> findByRoom_RoomIdAndStatusForUpdate(@Param("roomId") Integer roomId, @Param("status") BedStatus status);
}
