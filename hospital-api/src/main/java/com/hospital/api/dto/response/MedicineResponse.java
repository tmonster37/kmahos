package com.hospital.api.dto.response;

import com.hospital.api.constant.MedicineUnit;
import com.hospital.api.entity.Medicine;

import java.math.BigDecimal;

public record MedicineResponse(
        Integer medicineId,
        String medicineName,
        String activeIngredient,
        MedicineUnit unit,
        BigDecimal price,
        Integer stockQuantity,
        Boolean deleted
) {
    public MedicineResponse(
            Integer medicineId,
            String medicineName,
            String activeIngredient,
            MedicineUnit unit,
            BigDecimal price,
            Integer stockQuantity
    ) {
        this(medicineId, medicineName, activeIngredient, unit, price, stockQuantity, false);
    }

    public static MedicineResponse fromEntity(Medicine m) {
        if (m == null) return null;
        return new MedicineResponse(
                m.getMedicineId(),
                m.getMedicineName(),
                m.getActiveIngredient(),
                m.getUnit(),
                m.getPrice(),
                m.getStockQuantity(),
                m.isDeleted()
        );
    }
}
