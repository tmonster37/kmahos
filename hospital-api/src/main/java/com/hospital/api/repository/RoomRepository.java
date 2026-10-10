package com.hospital.api.repository;

import com.hospital.api.constant.RoomType;
import com.hospital.api.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Integer> {
    List<Room> findAllByDeletedFalse();
    List<Room> findAllByDepartment_DepartmentId(Integer departmentId);
    List<Room> findAllByDepartment_DepartmentIdAndDeletedFalse(Integer departmentId);
    List<Room> findAllByRoomTypeAndDeletedFalse(RoomType roomType);
}

