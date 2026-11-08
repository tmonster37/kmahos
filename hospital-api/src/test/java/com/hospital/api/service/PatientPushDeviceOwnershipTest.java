package com.hospital.api.service;

import com.hospital.api.constant.Role;
import com.hospital.api.controller.UtilityController;
import com.hospital.api.dto.request.QueueAlertBatchRequest;
import com.hospital.api.dto.request.RegisterPushDeviceRequest;
import com.hospital.api.dto.request.SendNotificationRequest;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.Notification;
import com.hospital.api.entity.PushDevice;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.BookingRepository;
import com.hospital.api.repository.NotificationRepository;
import com.hospital.api.repository.PatientProfileRepository;
import com.hospital.api.repository.PushDeviceRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.impl.DashboardServiceImpl;
import com.hospital.api.service.impl.MedicineReminderServiceImpl;
import com.hospital.api.service.impl.MockPushNotificationProvider;
import com.hospital.api.service.impl.NotificationServiceImpl;
import com.hospital.api.service.impl.PushDeviceServiceImpl;
import com.hospital.api.service.impl.RatingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientPushDeviceOwnershipTest {

    private static final UUID PATIENT_A_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID PATIENT_B_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock private PushDeviceRepository pushDeviceRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private PatientProfileRepository patientProfileRepository;
    @Mock private MedicineReminderServiceImpl reminderService;
    @Mock private RatingServiceImpl ratingService;
    @Mock private DashboardServiceImpl dashboardService;

    private PushDeviceServiceImpl pushDeviceService;
    private MockPushNotificationProvider mockPushProvider;
    private NotificationServiceImpl notificationService;
    private UtilityController utilityController;

    private Account patientA;
    private Account patientB;
    private UserPrincipal principalA;
    private UserPrincipal principalB;

    @BeforeEach
    void setUp() {
        pushDeviceService = new PushDeviceServiceImpl(pushDeviceRepository, accountRepository);
        mockPushProvider = new MockPushNotificationProvider();
        notificationService = new NotificationServiceImpl(
                notificationRepository,
                accountRepository,
                bookingRepository,
                patientProfileRepository,
                pushDeviceService,
                mockPushProvider
        );
        utilityController = new UtilityController(
                reminderService,
                ratingService,
                notificationRepository,
                notificationService,
                dashboardService,
                pushDeviceService
        );

        patientA = Account.builder()
                .userId(PATIENT_A_ID)
                .phoneNumber("0988889999")
                .fullName("Nguyễn Văn A")
                .role(Role.ROLE_PATIENT)
                .build();
        patientA.setActive(true);

        patientB = Account.builder()
                .userId(PATIENT_B_ID)
                .phoneNumber("0977777777")
                .fullName("Trần Thị B")
                .role(Role.ROLE_PATIENT)
                .build();
        patientB.setActive(true);

        principalA = new UserPrincipal(patientA);
        principalB = new UserPrincipal(patientB);
    }

    @Test
    @DisplayName("Bệnh nhân đăng ký thiết bị mới thành công")
    void testRegisterNewDeviceSuccess() {
        when(accountRepository.findById(PATIENT_A_ID)).thenReturn(Optional.of(patientA));
        when(pushDeviceRepository.findByDeviceTokenAndDeletedFalse("token-123")).thenReturn(Optional.empty());
        when(pushDeviceRepository.findByDeviceInstallId("install-123")).thenReturn(Optional.empty());

        RegisterPushDeviceRequest request = new RegisterPushDeviceRequest("install-123", "token-123", "ANDROID");
        var response = utilityController.registerPushDevice(principalA, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());

        ArgumentCaptor<PushDevice> captor = ArgumentCaptor.forClass(PushDevice.class);
        verify(pushDeviceRepository).save(captor.capture());
        PushDevice saved = captor.getValue();
        assertEquals("install-123", saved.getDeviceInstallId());
        assertEquals("token-123", saved.getDeviceToken());
        assertEquals("ANDROID", saved.getPlatform());
        assertEquals(patientA, saved.getAccount());
    }

    @Test
    @DisplayName("Cùng thiết bị chuyển đổi tài khoản (Account Switch) -> liên kết chuyển sang tài khoản mới")
    void testAccountSwitchOnSameDevice() {
        when(accountRepository.findById(PATIENT_B_ID)).thenReturn(Optional.of(patientB));
        when(pushDeviceRepository.findByDeviceTokenAndDeletedFalse("token-123")).thenReturn(Optional.empty());

        PushDevice existingDevice = PushDevice.builder()
                .account(patientA)
                .deviceInstallId("install-123")
                .deviceToken("token-123")
                .platform("ANDROID")
                .build();
        when(pushDeviceRepository.findByDeviceInstallId("install-123")).thenReturn(Optional.of(existingDevice));

        RegisterPushDeviceRequest request = new RegisterPushDeviceRequest("install-123", "token-123", "ANDROID");
        var response = utilityController.registerPushDevice(principalB, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(pushDeviceRepository).save(existingDevice);
        assertEquals(patientB, existingDevice.getAccount(), "Thiết bị phải được gán lại cho tài khoản mới");
    }

    @Test
    @DisplayName("Token đã tồn tại ở tài khoản khác -> xóa liên kết cũ để tránh rò rỉ thông báo chéo")
    void testRevokeOldDeviceIfTokenReused() {
        when(accountRepository.findById(PATIENT_B_ID)).thenReturn(Optional.of(patientB));

        PushDevice oldDevice = PushDevice.builder()
                .account(patientA)
                .deviceInstallId("install-old")
                .deviceToken("token-stolen")
                .platform("IOS")
                .build();
        when(pushDeviceRepository.findByDeviceTokenAndDeletedFalse("token-stolen")).thenReturn(Optional.of(oldDevice));
        when(pushDeviceRepository.findByDeviceInstallId("install-new")).thenReturn(Optional.empty());

        RegisterPushDeviceRequest request = new RegisterPushDeviceRequest("install-new", "token-stolen", "IOS");
        utilityController.registerPushDevice(principalB, request);

        verify(pushDeviceRepository).delete(oldDevice);
    }

    @Test
    @DisplayName("Bệnh nhân thu hồi thiết bị của chính mình thành công")
    void testRevokeOwnDeviceSuccess() {
        PushDevice device = PushDevice.builder()
                .account(patientA)
                .deviceInstallId("install-123")
                .deviceToken("token-123")
                .platform("ANDROID")
                .build();
        when(pushDeviceRepository.findByDeviceInstallId("install-123")).thenReturn(Optional.of(device));

        var response = utilityController.revokePushDevice(principalA, "install-123");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(pushDeviceRepository).delete(device);
    }

    @Test
    @DisplayName("Bệnh nhân cố tình thu hồi thiết bị của người khác -> 403 Forbidden")
    void testRevokeForeignDeviceThrowsForbidden() {
        PushDevice foreignDevice = PushDevice.builder()
                .account(patientB)
                .deviceInstallId("install-b")
                .deviceToken("token-b")
                .platform("ANDROID")
                .build();
        when(pushDeviceRepository.findByDeviceInstallId("install-b")).thenReturn(Optional.of(foreignDevice));

        AppException ex = assertThrows(AppException.class, () ->
                utilityController.revokePushDevice(principalA, "install-b"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verify(pushDeviceRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Thu hồi thiết bị không tồn tại -> Idempotent no-op thành công")
    void testRevokeNonExistentDeviceIsIdempotent() {
        when(pushDeviceRepository.findByDeviceInstallId("unknown-install")).thenReturn(Optional.empty());

        var response = utilityController.revokePushDevice(principalA, "unknown-install");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(pushDeviceRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Gửi thông báo thành công kích hoạt push an toàn, payload không chứa thông tin lâm sàng/PII")
    void testPushNotificationPayloadSafety() {
        when(accountRepository.findById(PATIENT_A_ID)).thenReturn(Optional.of(patientA));

        PushDevice activeDevice = PushDevice.builder()
                .account(patientA)
                .deviceInstallId("install-a")
                .deviceToken("token-a")
                .platform("ANDROID")
                .build();
        when(pushDeviceRepository.findAllByAccount_UserIdAndDeletedFalse(PATIENT_A_ID))
                .thenReturn(List.of(activeDevice));

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            n.setNotificationId(UUID.randomUUID());
            return n;
        });

        SendNotificationRequest request = new SendNotificationRequest(
                null,
                null,
                PATIENT_A_ID,
                "Lịch khám bệnh",
                "Nội dung lâm sàng bảo mật trong DB",
                "BOOKING"
        );

        Notification saved = notificationService.sendNotification(request);
        assertNotNull(saved);

        var records = mockPushProvider.getSentRecords();
        assertEquals(1, records.size(), "Phải gửi 1 push notification tới thiết bị của bệnh nhân");
        var pushRecord = records.get(0);
        assertEquals(List.of("token-a"), pushRecord.targetDeviceTokens());

        var payload = pushRecord.payload();
        assertEquals("BOOKING", payload.type());
        assertEquals("Lịch khám bệnh", payload.title());
        assertEquals("Lịch hẹn khám bệnh có cập nhật. Chạm để xem.", payload.body());
        assertFalse(payload.body().contains("Nội dung lâm sàng bảo mật"), "Payload không được chứa nội dung chi tiết lâm sàng!");
        assertEquals("/(patient)/notifications", payload.deepLink());
    }

    @Test
    @DisplayName("Lỗi push provider không làm gián đoạn hay rollback luồng thông báo chính")
    void testPushProviderFailureDoesNotBreakMainTransaction() {
        when(accountRepository.findById(PATIENT_A_ID)).thenReturn(Optional.of(patientA));

        // Mock error on getActiveDevices
        when(pushDeviceRepository.findAllByAccount_UserIdAndDeletedFalse(PATIENT_A_ID))
                .thenThrow(new RuntimeException("Push provider timeout"));

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification n = invocation.getArgument(0);
            n.setNotificationId(UUID.randomUUID());
            return n;
        });

        SendNotificationRequest request = new SendNotificationRequest(
                null,
                null,
                PATIENT_A_ID,
                "Xác nhận viện phí",
                "Đã nhận 500.000 VNĐ",
                "PAYMENT"
        );

        // Không được ném ngoại lệ dù push provider bị lỗi
        assertDoesNotThrow(() -> notificationService.sendNotification(request));
    }
}
