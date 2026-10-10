package com.hospital.api.service;

import com.hospital.api.dto.request.QueueAlertBatchRequest;
import com.hospital.api.dto.request.SendNotificationRequest;
import com.hospital.api.entity.Notification;

import java.util.List;

public interface NotificationService {
    Notification sendNotification(SendNotificationRequest request);
    List<Notification> sendQueueAlerts(QueueAlertBatchRequest request);
}
