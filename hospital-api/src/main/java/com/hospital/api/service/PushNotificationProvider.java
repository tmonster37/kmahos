package com.hospital.api.service;

import com.hospital.api.dto.PushMessagePayload;
import com.hospital.api.entity.PushDevice;

import java.util.List;

public interface PushNotificationProvider {
    void sendPush(List<PushDevice> targetDevices, PushMessagePayload payload);
}

