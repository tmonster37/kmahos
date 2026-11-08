import {
  createPushRegistrationManager,
  resolveSafeNotificationRoute,
  ALLOWED_PATIENT_ROUTES,
  DEVICE_INSTALL_ID_KEY,
  PUSH_OPT_IN_KEY,
} from '../push-registration';
import { PushApi } from '../push.api';
import { createAuthRepository } from '@/features/auth/auth.repository';
import { AuthApi } from '@/features/auth/auth.api';

describe('Push Notifications Client & Deep Link Routing', () => {
  describe('resolveSafeNotificationRoute (Allowlist Security)', () => {
    it('chấp nhận tất cả các route bệnh nhân trong danh sách cho phép', () => {
      for (const route of ALLOWED_PATIENT_ROUTES) {
        expect(resolveSafeNotificationRoute(route)).toBe(route);
        expect(resolveSafeNotificationRoute({ deepLink: route })).toBe(route);
      }
    });

    it('từ chối URL bên ngoài độc hại và fallback về danh sách thông báo an toàn', () => {
      expect(resolveSafeNotificationRoute('https://malicious.example.com/steal-token')).toBe(
        '/(patient)/notifications'
      );
      expect(
        resolveSafeNotificationRoute({ deepLink: 'http://phishing.com/login?token=abc' })
      ).toBe('/(patient)/notifications');
    });

    it('từ chối route lạ không nằm trong allowlist', () => {
      expect(resolveSafeNotificationRoute('/(admin)/dashboard')).toBe('/(patient)/notifications');
      expect(resolveSafeNotificationRoute('/secret-untrusted-path')).toBe('/(patient)/notifications');
      expect(resolveSafeNotificationRoute(null)).toBe('/(patient)/notifications');
      expect(resolveSafeNotificationRoute(undefined)).toBe('/(patient)/notifications');
      expect(resolveSafeNotificationRoute({})).toBe('/(patient)/notifications');
    });
  });

  describe('PushRegistrationManager', () => {
    let mockApi: jest.Mocked<PushApi>;
    let mockStorage: any;
    let inMemoryStore: Record<string, string>;

    beforeEach(() => {
      inMemoryStore = {};
      mockApi = {
        registerDevice: jest.fn().mockResolvedValue(undefined),
        revokeDevice: jest.fn().mockResolvedValue(undefined),
      };
      mockStorage = {
        read: jest.fn().mockImplementation((k: string) => Promise.resolve(inMemoryStore[k] || null)),
        write: jest.fn().mockImplementation((k: string, v: string) => {
          inMemoryStore[k] = v;
          return Promise.resolve();
        }),
        clear: jest.fn().mockImplementation(() => {
          inMemoryStore = {};
          return Promise.resolve();
        }),
      };

      // Mock window.localStorage for node environment
      (globalThis as any).window = {
        localStorage: {
          getItem: (k: string) => inMemoryStore[k] || null,
          setItem: (k: string, v: string) => {
            inMemoryStore[k] = v;
          },
          removeItem: (k: string) => {
            delete inMemoryStore[k];
          },
        },
      };
    });

    afterEach(() => {
      delete (globalThis as any).window;
    });

    it('tạo mới và duy trì installId ổn định giữa các lần gọi', async () => {
      const manager = createPushRegistrationManager(mockApi, mockStorage);
      const id1 = await manager.getOrCreateDeviceInstallId();
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(10);

      const id2 = await manager.getOrCreateDeviceInstallId();
      expect(id2).toBe(id1);
    });

    it('lưu trữ và lấy trạng thái opt-in chính xác', async () => {
      const manager = createPushRegistrationManager(mockApi, mockStorage);
      expect(await manager.isPushOptedIn()).toBe(false);

      await manager.setPushOptedIn(true);
      expect(await manager.isPushOptedIn()).toBe(true);

      await manager.setPushOptedIn(false);
      expect(await manager.isPushOptedIn()).toBe(false);
    });

    it('đăng ký thiết bị gọi api.registerDevice với installId và platform hợp lệ', async () => {
      const manager = createPushRegistrationManager(mockApi, mockStorage);
      const success = await manager.registerPushNotifications();

      expect(success).toBe(true);
      expect(mockApi.registerDevice).toHaveBeenCalledTimes(1);
      const callArg = mockApi.registerDevice.mock.calls[0][0];
      expect(callArg.deviceInstallId).toBeTruthy();
      expect(callArg.deviceToken).toBeTruthy();
      expect(callArg.platform).toBeTruthy();
    });

    it('thu hồi thiết bị gọi api.revokeDevice và đặt lại opt-in về false', async () => {
      const manager = createPushRegistrationManager(mockApi, mockStorage);
      await manager.setPushOptedIn(true);

      await manager.revokePushRegistration();

      expect(mockApi.revokeDevice).toHaveBeenCalledTimes(1);
      expect(await manager.isPushOptedIn()).toBe(false);
    });
  });

  describe('Tích hợp Đăng xuất thu hồi Push Device', () => {
    it('khi người dùng đăng xuất, hệ thống chủ động thu hồi push device trước khi xóa phiên', async () => {
      const mockPushManager = {
        getOrCreateDeviceInstallId: jest.fn().mockResolvedValue('install-test-001'),
        isPushOptedIn: jest.fn().mockResolvedValue(true),
        setPushOptedIn: jest.fn().mockResolvedValue(undefined),
        registerPushNotifications: jest.fn().mockResolvedValue(true),
        revokePushRegistration: jest.fn().mockResolvedValue(undefined),
      };

      const mockAuthApi: jest.Mocked<AuthApi> = {
        login: jest.fn(),
        getCurrentUser: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
        sendOtp: jest.fn(),
        verifyOtp: jest.fn(),
        register: jest.fn(),
        forgotPassword: jest.fn(),
      };

      const mockSessionStorage = {
        read: jest.fn().mockResolvedValue('fake.jwt.token'),
        write: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
      };

      const authRepo = createAuthRepository(mockAuthApi, mockSessionStorage, mockPushManager);

      await authRepo.logout();

      expect(mockPushManager.revokePushRegistration).toHaveBeenCalledTimes(1);
      expect(mockAuthApi.logout).toHaveBeenCalledTimes(1);
      expect(mockSessionStorage.clear).toHaveBeenCalledTimes(1);
    });

    it('nếu thu hồi push gặp sự cố mạng, đăng xuất vẫn hoàn tất thành công (best-effort)', async () => {
      const failingPushManager = {
        getOrCreateDeviceInstallId: jest.fn().mockResolvedValue('install-test-002'),
        isPushOptedIn: jest.fn().mockResolvedValue(true),
        setPushOptedIn: jest.fn().mockResolvedValue(undefined),
        registerPushNotifications: jest.fn().mockResolvedValue(true),
        revokePushRegistration: jest.fn().mockRejectedValue(new Error('Network offline')),
      };

      const mockAuthApi: jest.Mocked<AuthApi> = {
        login: jest.fn(),
        getCurrentUser: jest.fn(),
        logout: jest.fn().mockResolvedValue(undefined),
        sendOtp: jest.fn(),
        verifyOtp: jest.fn(),
        register: jest.fn(),
        forgotPassword: jest.fn(),
      };

      const mockSessionStorage = {
        read: jest.fn().mockResolvedValue('fake.jwt.token'),
        write: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
      };

      const authRepo = createAuthRepository(mockAuthApi, mockSessionStorage, failingPushManager);

      await expect(authRepo.logout()).resolves.toBeUndefined();
      expect(mockSessionStorage.clear).toHaveBeenCalledTimes(1);
    });
  });
});
