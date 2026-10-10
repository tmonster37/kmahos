package com.hospital.api.service;

import com.hospital.api.dto.request.LoginRequest;
import com.hospital.api.dto.request.RegisterRequest;
import com.hospital.api.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
}
