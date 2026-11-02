package com.hospital.api.service;

import com.hospital.api.constant.OtpPurpose;
import com.hospital.api.dto.request.SendOtpRequest;
import com.hospital.api.dto.request.VerifyOtpRequest;
import com.hospital.api.dto.response.OtpResponse;

public interface OtpService {
    OtpResponse sendOtp(SendOtpRequest request);
    OtpResponse sendOtp(SendOtpRequest request, String clientIp);
    boolean verifyOtp(VerifyOtpRequest request);
    boolean verifyOtp(VerifyOtpRequest request, String clientIp);
    void sendEmailOtp(String email, OtpPurpose purpose);
    void sendEmailOtp(String email, OtpPurpose purpose, String clientIp);
    boolean verifyEmailOtp(String email, String otpCode, OtpPurpose purpose);
}
