package com.hospital.api.dto.response;

import com.hospital.api.constant.Role;

import java.util.UUID;

public class LoginResponse {
    private String token;        // Chuỗi JWT Bearer token
    private UUID userId;
    private String fullName;
    private String phoneNumber;
    private Role role;           // Bệnh nhân, Bác sĩ, Admin...

    public LoginResponse() {
    }

    public LoginResponse(String token, UUID userId, String fullName, String phoneNumber, Role role) {
        this.token = token;
        this.userId = userId;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.role = role;
    }

    public static LoginResponseBuilder builder() {
        return new LoginResponseBuilder();
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public static class LoginResponseBuilder {
        private String token;
        private UUID userId;
        private String fullName;
        private String phoneNumber;
        private Role role;

        public LoginResponseBuilder token(String token) {
            this.token = token;
            return this;
        }

        public LoginResponseBuilder userId(UUID userId) {
            this.userId = userId;
            return this;
        }

        public LoginResponseBuilder fullName(String fullName) {
            this.fullName = fullName;
            return this;
        }

        public LoginResponseBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        public LoginResponseBuilder role(Role role) {
            this.role = role;
            return this;
        }

        public LoginResponse build() {
            return new LoginResponse(token, userId, fullName, phoneNumber, role);
        }
    }
}
