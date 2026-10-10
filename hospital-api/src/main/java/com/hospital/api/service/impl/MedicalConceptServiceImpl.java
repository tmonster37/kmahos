package com.hospital.api.service.impl;

import com.hospital.api.dto.request.CreateConceptRequest;
import com.hospital.api.dto.response.MedicalConceptResponse;
import com.hospital.api.entity.Department;
import com.hospital.api.entity.MedicalConcept;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.MedicalConceptRepository;
import com.hospital.api.service.MedicalConceptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MedicalConceptServiceImpl implements MedicalConceptService {

    private final MedicalConceptRepository conceptRepository;
    private final DepartmentRepository departmentRepository;

    @Override
    @Transactional(readOnly = true)
    public List<MedicalConceptResponse> getConceptsForDepartment(Integer departmentId) {
        if (departmentId == null) {
            return conceptRepository.findAllByIsActiveTrueOrderByCreatedAtAsc()
                    .stream()
                    .map(MedicalConceptResponse::fromEntity)
                    .toList();
        }
        return conceptRepository.findByDepartmentOrCommon(departmentId)
                .stream()
                .map(MedicalConceptResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalConceptResponse> getAllActiveConcepts() {
        return conceptRepository.findAllByIsActiveTrueOrderByCreatedAtAsc()
                .stream()
                .map(MedicalConceptResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public MedicalConceptResponse createConcept(CreateConceptRequest request) {
        if (conceptRepository.findByConceptCode(request.conceptCode()).isPresent()) {
            throw new AppException("Mã Concept đã tồn tại trong hệ thống: " + request.conceptCode(), HttpStatus.BAD_REQUEST);
        }

        Department department = null;
        if (request.departmentId() != null) {
            department = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new AppException("Khoa không tồn tại với ID: " + request.departmentId(), HttpStatus.NOT_FOUND));
        }

        MedicalConcept concept = MedicalConcept.builder()
                .conceptCode(request.conceptCode().trim().toUpperCase())
                .name(request.name().trim())
                .dataType(request.dataType())
                .unit(request.unit())
                .minNormal(request.minNormal())
                .maxNormal(request.maxNormal())
                .department(department)
                .loincCode(request.loincCode())
                .description(request.description())
                .isActive(true)
                .build();

        return MedicalConceptResponse.fromEntity(conceptRepository.save(concept));
    }
}
