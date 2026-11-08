import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';

export type PushPlatform = 'ANDROID' | 'IOS' | 'WEB';

export interface RegisterPushDevicePayload {
  deviceInstallId: string;
  deviceToken: string;
  platform: PushPlatform;
}

export interface PushApi {
  registerDevice(payload: RegisterPushDevicePayload): Promise<void>;
  revokeDevice(deviceInstallId: string): Promise<void>;
}

export function createPushApi(client: AxiosInstance = apiClient): PushApi {
  return {
    async registerDevice(payload: RegisterPushDevicePayload): Promise<void> {
      await client.post('/api/utilities/push-devices', {
        deviceInstallId: payload.deviceInstallId.trim(),
        deviceToken: payload.deviceToken.trim(),
        platform: payload.platform.toUpperCase(),
      });
    },

    async revokeDevice(deviceInstallId: string): Promise<void> {
      if (!deviceInstallId || !deviceInstallId.trim()) {
        return;
      }
      await client.delete(`/api/utilities/push-devices/${encodeURIComponent(deviceInstallId.trim())}`);
    },
  };
}

export const pushApi = createPushApi();

