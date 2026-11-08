import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { pushApi, PushApi, PushPlatform } from './push.api';
import { sessionStorage, SessionStorage } from '@/features/auth/session.storage';

export const DEVICE_INSTALL_ID_KEY = 'hospital_mobile.device_install_id';
export const PUSH_OPT_IN_KEY = 'hospital_mobile.push_opt_in';

export const ALLOWED_PATIENT_ROUTES = [
  '/(patient)',
  '/(patient)/appointments',
  '/(patient)/records',
  '/(patient)/bills',
  '/(patient)/notifications',
  '/(patient)/profile',
] as const;

export type AllowedPatientRoute = (typeof ALLOWED_PATIENT_ROUTES)[number];

function generateUuid(): string {
  // Safe UUID v4 generator without external heavy dependencies
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function resolveSafeNotificationRoute(deepLinkOrPayload: unknown): AllowedPatientRoute {
  let target: string | null = null;
  if (typeof deepLinkOrPayload === 'string') {
    target = deepLinkOrPayload.trim();
  } else if (
    deepLinkOrPayload &&
    typeof deepLinkOrPayload === 'object' &&
    'deepLink' in deepLinkOrPayload &&
    typeof (deepLinkOrPayload as { deepLink: unknown }).deepLink === 'string'
  ) {
    target = (deepLinkOrPayload as { deepLink: string }).deepLink.trim();
  }

  if (target && ALLOWED_PATIENT_ROUTES.includes(target as AllowedPatientRoute)) {
    return target as AllowedPatientRoute;
  }

  // Fallback an toàn về hộp thư thông báo trong app
  return '/(patient)/notifications';
}

export interface PushRegistrationManager {
  getOrCreateDeviceInstallId(): Promise<string>;
  isPushOptedIn(): Promise<boolean>;
  setPushOptedIn(enabled: boolean): Promise<void>;
  registerPushNotifications(): Promise<boolean>;
  revokePushRegistration(): Promise<void>;
}

export function createPushRegistrationManager(
  api: PushApi = pushApi,
  storage: SessionStorage = sessionStorage
): PushRegistrationManager {
  return {
    async getOrCreateDeviceInstallId(): Promise<string> {
      try {
        let installId: string | null = null;
        if (typeof window !== 'undefined' && window.localStorage) {
          installId = window.localStorage.getItem(DEVICE_INSTALL_ID_KEY);
        }

        if (!installId) {
          installId = generateUuid();
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(DEVICE_INSTALL_ID_KEY, installId);
          }
        }
        return installId;
      } catch {
        return generateUuid();
      }
    },

    async isPushOptedIn(): Promise<boolean> {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(PUSH_OPT_IN_KEY) === 'true';
        }
      } catch {
        // Fallback
      }
      return false;
    },

    async setPushOptedIn(enabled: boolean): Promise<void> {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(PUSH_OPT_IN_KEY, enabled ? 'true' : 'false');
        }
      } catch {
        // Fallback
      }
    },

    async registerPushNotifications(): Promise<boolean> {
      if (Platform.OS === 'web') {
        // Web push simulator / fallback
        const installId = await this.getOrCreateDeviceInstallId();
        await api.registerDevice({
          deviceInstallId: installId,
          deviceToken: `web-mock-token-${installId}`,
          platform: 'WEB',
        });
        await this.setPushOptedIn(true);
        return true;
      }

      if (!Device.isDevice) {
        // Trình giả lập (Simulator/Emulator) không nhận được push thực tế từ APNs/FCM
        return false;
      }

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          await this.setPushOptedIn(false);
          return false;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const deviceToken = tokenData.data;

        if (!deviceToken) {
          return false;
        }

        const installId = await this.getOrCreateDeviceInstallId();
        const platform: PushPlatform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

        await api.registerDevice({
          deviceInstallId: installId,
          deviceToken,
          platform,
        });

        await this.setPushOptedIn(true);
        return true;
      } catch {
        // Graceful failure: Không ngắt quãng ứng dụng nếu thiết bị lỗi dịch vụ push
        return false;
      }
    },

    async revokePushRegistration(): Promise<void> {
      try {
        const installId = await this.getOrCreateDeviceInstallId();
        await api.revokeDevice(installId);
      } catch {
        // Best effort: Thu hồi thiết bị không chặn quy trình đăng xuất
      } finally {
        await this.setPushOptedIn(false);
      }
    },
  };
}

export const pushRegistrationManager = createPushRegistrationManager();

