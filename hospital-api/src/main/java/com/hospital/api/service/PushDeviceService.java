package com.hospital.api.service;

import com.hospital.api.dto.request.RegisterPushDeviceRequest;
import com.hospital.api.entity.PushDevice;
import com.hospital.api.security.UserPrincipal;

import java.util.List;
import java.util.UUID;

public interface PushDeviceService {
    void registerDevice(UserPrincipal currentUser, RegisterPushDeviceRequest request);
    void revokeDevice(UserPrincipal currentUser, String deviceInstallId);
    List<PushDevice> getActiveDevicesForAccount(UUID accountId);
}

