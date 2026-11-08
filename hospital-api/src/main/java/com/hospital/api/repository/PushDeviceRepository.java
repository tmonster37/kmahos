package com.hospital.api.repository;

import com.hospital.api.entity.PushDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PushDeviceRepository extends JpaRepository<PushDevice, UUID> {

    Optional<PushDevice> findByDeviceInstallIdAndDeletedFalse(String deviceInstallId);

    Optional<PushDevice> findByDeviceInstallId(String deviceInstallId);

    Optional<PushDevice> findByDeviceTokenAndDeletedFalse(String deviceToken);

    List<PushDevice> findAllByAccount_UserIdAndDeletedFalse(UUID userId);

    void deleteByDeviceInstallId(String deviceInstallId);
}

