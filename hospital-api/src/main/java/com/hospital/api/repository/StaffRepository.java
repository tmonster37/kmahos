package com.hospital.api.repository;

import com.hospital.api.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StaffRepository extends JpaRepository<Staff, UUID> {

    Optional<Staff> findByPhoneNumber(String phoneNumber);
}
