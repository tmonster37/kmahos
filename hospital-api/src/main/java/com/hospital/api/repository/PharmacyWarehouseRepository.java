package com.hospital.api.repository;

import com.hospital.api.constant.WarehouseType;
import com.hospital.api.entity.PharmacyWarehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PharmacyWarehouseRepository extends JpaRepository<PharmacyWarehouse, UUID> {
    Optional<PharmacyWarehouse> findByWarehouseCode(String warehouseCode);
    List<PharmacyWarehouse> findAllByWarehouseType(WarehouseType warehouseType);
    List<PharmacyWarehouse> findAllByIsActiveTrue();
}
