package com.hospital.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hospital.api.common.ApiResponse;
import com.hospital.api.constant.Role;
import com.hospital.api.controller.UtilityController;
import com.hospital.api.dto.response.PatientNotificationResponse;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Notification;
import com.hospital.api.repository.NotificationRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.impl.DashboardServiceImpl;
import com.hospital.api.service.impl.MedicineReminderServiceImpl;
import com.hospital.api.service.impl.RatingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientNotificationOwnershipTest {

    private static final UUID OWNER_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static final UUID FOREIGN_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    @Mock private MedicineReminderServiceImpl reminderService;
    @Mock private RatingServiceImpl ratingService;
    @Mock private NotificationRepository notificationRepository;
    @Mock private NotificationService notificationService;
    @Mock private DashboardServiceImpl dashboardService;
    @Mock private PushDeviceService pushDeviceService;

    private UtilityController utilityController;
    private Account ownerAccount;
    private Account foreignAccount;
    private UserPrincipal ownerPrincipal;
    private UserPrincipal foreignPrincipal;

    @BeforeEach
    void setUp() {
        utilityController = new UtilityController(
                reminderService,
                ratingService,
                notificationRepository,
                notificationService,
                dashboardService,
                pushDeviceService
        );
        ownerAccount = Account.builder()
                .userId(OWNER_ID)
                .phoneNumber("0911111111")
                .email("owner@example.com")
                .password("hashed-secret-owner")
                .balance(BigDecimal.valueOf(500000))
                .role(Role.ROLE_PATIENT)
                .build();
        foreignAccount = Account.builder()
                .userId(FOREIGN_ID)
                .phoneNumber("0922222222")
                .email("foreign@example.com")
                .password("hashed-secret-foreign")
                .balance(BigDecimal.valueOf(900000))
                .role(Role.ROLE_PATIENT)
                .build();
        ownerPrincipal = new UserPrincipal(ownerAccount);
        foreignPrincipal = new UserPrincipal(foreignAccount);
    }

    @Test
    void listsOnlyCurrentAccountsNotifications() {
        Notification ownerNotif = Notification.builder()
                .notificationId(UUID.randomUUID())
                .account(ownerAccount)
                .title("Lịch khám đã xác nhận")
                .content("Mã khám BK20261107001")
                .type("BOOKING_SUCCESS")
                .isRead(false)
                .build();
        ownerNotif.setCreatedAt(Instant.parse("2026-11-07T02:00:00Z"));

        when(notificationRepository.findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(OWNER_ID))
                .thenReturn(List.of(ownerNotif));

        ResponseEntity<ApiResponse<List<PatientNotificationResponse>>> response =
                utilityController.getMyNotifications(ownerPrincipal);

        assertNotNull(response.getBody());
        List<PatientNotificationResponse> items = response.getBody().getData();
        assertEquals(1, items.size());
        assertEquals(ownerNotif.getNotificationId(), items.get(0).notificationId());
        assertEquals("Lịch khám đã xác nhận", items.get(0).title());
        verify(notificationRepository).findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(OWNER_ID);
        verify(notificationRepository, never()).findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(FOREIGN_ID);
    }

    @Test
    void foreignNotificationIdCannotMutateReadState() {
        UUID notifId = UUID.randomUUID();
        Notification ownerNotif = Notification.builder()
                .notificationId(notifId)
                .account(ownerAccount)
                .title("Đã có kết quả xét nghiệm")
                .content("Chi tiết kết quả xét nghiệm")
                .type("TEST_RESULT_READY")
                .isRead(false)
                .build();

        when(notificationRepository.findById(notifId)).thenReturn(Optional.of(ownerNotif));

        ResponseEntity<ApiResponse<Void>> foreignResp =
                utilityController.markNotificationAsRead(foreignPrincipal, notifId);

        assertEquals(200, foreignResp.getStatusCode().value());
        assertNull(foreignResp.getBody().getData(), "Foreign ID must not expose notification content");
        assertFalse(ownerNotif.isRead(), "Foreign caller must not mutate read state");
        verify(notificationRepository, never()).save(any());

        utilityController.markNotificationAsRead(ownerPrincipal, notifId);
        assertTrue(ownerNotif.isRead(), "Owner caller mutates read state");
        verify(notificationRepository, times(1)).save(ownerNotif);
    }

    @Test
    void markAllReadAffectsOnlyCurrentAccount() {
        Notification ownerNotif = Notification.builder()
                .notificationId(UUID.randomUUID())
                .account(ownerAccount)
                .title("Thông báo 1")
                .content("Nội dung 1")
                .type("BOOKING_SUCCESS")
                .isRead(false)
                .build();
        Notification foreignNotif = Notification.builder()
                .notificationId(UUID.randomUUID())
                .account(foreignAccount)
                .title("Thông báo tài khoản khác")
                .content("Nội dung khác")
                .type("BOOKING_SUCCESS")
                .isRead(false)
                .build();

        when(notificationRepository.findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(OWNER_ID))
                .thenReturn(List.of(ownerNotif));

        utilityController.markAllNotificationsAsRead(ownerPrincipal);

        assertTrue(ownerNotif.isRead());
        assertFalse(foreignNotif.isRead());
        verify(notificationRepository).saveAll(List.of(ownerNotif));
    }

    @Test
    void patientNotificationResponseExcludesAccountEntity() throws Exception {
        Notification ownerNotif = Notification.builder()
                .notificationId(UUID.randomUUID())
                .account(ownerAccount)
                .title("Biên lai viện phí")
                .content("Đã thu viện phí")
                .type("PAYMENT_SUCCESS")
                .isRead(true)
                .build();
        ownerNotif.setCreatedAt(Instant.parse("2026-11-07T03:00:00Z"));
        ownerNotif.setUpdatedAt(Instant.parse("2026-11-07T03:05:00Z"));

        when(notificationRepository.findAllByAccount_UserIdAndDeletedFalseOrderByCreatedAtDesc(OWNER_ID))
                .thenReturn(List.of(ownerNotif));

        ResponseEntity<ApiResponse<List<PatientNotificationResponse>>> response =
                utilityController.getMyNotifications(ownerPrincipal);

        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        String json = mapper.writeValueAsString(response.getBody());
        JsonNode root = mapper.readTree(json);
        JsonNode item = root.get("data").get(0);

        assertNotNull(item.get("notificationId"));
        assertEquals("Biên lai viện phí", item.get("title").asText());
        assertEquals("Đã thu viện phí", item.get("content").asText());
        assertEquals("PAYMENT_SUCCESS", item.get("type").asText());
        assertTrue(item.get("isRead").asBoolean());
        assertTrue(item.get("read").asBoolean());
        assertNull(item.get("account"), "Serialized notification must not include account entity");
        assertFalse(json.contains("hashed-secret-owner"));
        assertFalse(json.contains("owner@example.com"));
        assertFalse(json.contains("0911111111"));
    }
}

