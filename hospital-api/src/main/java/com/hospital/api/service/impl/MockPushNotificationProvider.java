package com.hospital.api.service.impl;

import com.hospital.api.dto.PushMessagePayload;
import com.hospital.api.entity.PushDevice;
import com.hospital.api.service.PushNotificationProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Primary
@Slf4j
public class MockPushNotificationProvider implements PushNotificationProvider {

    public record SentPushRecord(
        List<String> targetDeviceTokens,
        PushMessagePayload payload,
        long timestamp
    ) {}

    private final List<SentPushRecord> sentRecords = new CopyOnWriteArrayList<>();

    @Override
    public void sendPush(List<PushDevice> targetDevices, PushMessagePayload payload) {
        if (targetDevices == null || targetDevices.isEmpty()) {
            return;
        }

        List<String> tokens = targetDevices.stream()
                .map(PushDevice::getDeviceToken)
                .toList();

        log.info("[MOCK_PUSH] Gửi push notification tới {} thiết bị. Type={}, Title='{}', DeepLink='{}'",
                tokens.size(), payload.type(), payload.title(), payload.deepLink());

        sentRecords.add(new SentPushRecord(tokens, payload, System.currentTimeMillis()));
    }

    public List<SentPushRecord> getSentRecords() {
        return Collections.unmodifiableList(new ArrayList<>(sentRecords));
    }

    public void clearSentRecords() {
        sentRecords.clear();
    }
}

