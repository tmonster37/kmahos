package com.hospital.api.service;

import com.hospital.api.dto.request.CreateConceptRequest;
import com.hospital.api.dto.response.MedicalConceptResponse;

import java.util.List;
import java.util.UUID;

public interface MedicalConceptService {

    List<MedicalConceptResponse> getConceptsForDepartment(Integer departmentId);

    List<MedicalConceptResponse> getAllActiveConcepts();

    MedicalConceptResponse createConcept(CreateConceptRequest request);
}
