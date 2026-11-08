import { AxiosHeaders } from 'axios';
import { ApiConfigError } from '@/config/env';
import { createApiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/types';
import { createAuthApi } from '../auth.api';
import { createAuthRepository, NonPatientRoleError } from '../auth.repository';
import { ACCESS_TOKEN_STORAGE_KEY, createSessionStorage } from '../session.storage';

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwOTAxMjM0NTY3Iiwicm9sZSI6IlJPTEVfUEFUSUVOVCJ9.signaturePart123';

function createMemorySecureStore(initialValue: string | null = null) {
  let current = initialValue;
  return {
    getValue: () => current,
    getItemAsync: jest.fn(async (key: string) => (key === ACCESS_TOKEN_STORAGE_KEY ? current : null)),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      if (key === ACCESS_TOKEN_STORAGE_KEY) {
        current = value;
      }
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      if (key === ACCESS_TOKEN_STORAGE_KEY) {
        current = null;
      }
    }),
  };
}

describe('auth.repository & typed apiClient', () => {
  it('storesBearerTokenInSecureStore', async () => {
    const store = createMemorySecureStore();
    const storage = createSessionStorage(store);
    let capturedAuthHeader: string | undefined;

    const client = createApiClient({
      baseUrl: 'http://192.168.1.100:8080',
      storage,
      adapter: async (config) => {
        capturedAuthHeader = config.headers?.get('Authorization') as string | undefined;
        if (config.url === '/api/auth/login') {
          return {
            data: {
              code: 200,
              message: 'Đăng nhập thành công',
              data: {
                accessToken: SAMPLE_JWT,
                tokenType: 'Bearer',
                userId: '11111111-1111-1111-1111-111111111111',
                fullName: 'Nguyễn Văn Bệnh Nhân',
                phoneNumber: '0901234567',
                role: 'ROLE_PATIENT',
              },
            },
            status: 200,
            statusText: 'OK',
            headers: new AxiosHeaders(),
            config,
          };
        }
        return {
          data: {
            code: 200,
            message: 'OK',
            data: {
              userId: '11111111-1111-1111-1111-111111111111',
              fullName: 'Nguyễn Văn Bệnh Nhân',
              phoneNumber: '0901234567',
              role: 'ROLE_PATIENT',
            },
          },
          status: 200,
          statusText: 'OK',
          headers: new AxiosHeaders(),
          config,
        };
      },
    });

    const repo = createAuthRepository(createAuthApi(client), storage);
    const user = await repo.login({ phoneNumber: '0901234567', password: 'Password123!' });

    expect(user.role).toBe('ROLE_PATIENT');
    expect(store.setItemAsync).toHaveBeenCalledWith(ACCESS_TOKEN_STORAGE_KEY, SAMPLE_JWT);
    expect(store.getValue()).toBe(SAMPLE_JWT);

    const restored = await repo.restoreSession();
    expect(restored?.fullName).toBe('Nguyễn Văn Bệnh Nhân');
    expect(capturedAuthHeader).toBe(`Bearer ${SAMPLE_JWT}`);
  });

  it('rejectsNonPatientRole', async () => {
    const store = createMemorySecureStore();
    const storage = createSessionStorage(store);

    const client = createApiClient({
      baseUrl: 'http://192.168.1.100:8080',
      storage,
      adapter: async (config) => ({
        data: {
          code: 200,
          message: 'Đăng nhập thành công',
          data: {
            accessToken: SAMPLE_JWT,
            tokenType: 'Bearer',
            userId: '22222222-2222-2222-2222-222222222222',
            fullName: 'Bác Sĩ Nội Khoa',
            phoneNumber: '0909999999',
            role: 'ROLE_DOCTOR',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
      }),
    });

    const repo = createAuthRepository(createAuthApi(client), storage);

    await expect(
      repo.login({ phoneNumber: '0909999999', password: 'Password123!' })
    ).rejects.toThrow(NonPatientRoleError);
    expect(store.setItemAsync).not.toHaveBeenCalled();
    expect(store.deleteItemAsync).toHaveBeenCalledWith(ACCESS_TOKEN_STORAGE_KEY);
    expect(store.getValue()).toBeNull();
  });

  it('clearsSessionOn401', async () => {
    const store = createMemorySecureStore(SAMPLE_JWT);
    const storage = createSessionStorage(store);
    const onUnauthorized = jest.fn();

    const client = createApiClient({
      baseUrl: 'http://192.168.1.100:8080',
      storage,
      onUnauthorized,
      adapter: async (config) => {
        const err = new Error('Unauthorized') as Error & {
          isAxiosError: boolean;
          response: { status: number; data: { code: number; message: string } };
          config: typeof config;
        };
        err.isAxiosError = true;
        err.config = config;
        err.response = {
          status: 401,
          data: { code: 401, message: 'Token hết hạn' },
        };
        throw err;
      },
    });

    const api = createAuthApi(client);
    await expect(api.getCurrentUser()).rejects.toThrow(ApiClientError);
    expect(store.deleteItemAsync).toHaveBeenCalledWith(ACCESS_TOKEN_STORAGE_KEY);
    expect(store.getValue()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('clearsCorruptStoredToken', async () => {
    const store = createMemorySecureStore('not-a-valid-jwt-token with spaces');
    const storage = createSessionStorage(store);

    const api = {
      login: jest.fn(),
      getCurrentUser: jest.fn(),
      logout: jest.fn(),
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
      register: jest.fn(),
      forgotPassword: jest.fn(),
    };

    const repo = createAuthRepository(api, storage);
    const restored = await repo.restoreSession();

    expect(restored).toBeNull();
    expect(store.deleteItemAsync).toHaveBeenCalledWith(ACCESS_TOKEN_STORAGE_KEY);
    expect(store.getValue()).toBeNull();
    expect(api.getCurrentUser).not.toHaveBeenCalled();
  });

  it('requiresConfiguredApiUrl', async () => {
    const store = createMemorySecureStore();
    const storage = createSessionStorage(store);

    const client = createApiClient({
      baseUrl: '   ',
      storage,
      adapter: async (config) => ({
        data: { code: 200, message: 'OK', data: null },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
      }),
    });

    const api = createAuthApi(client);
    await expect(api.getCurrentUser()).rejects.toThrow(ApiConfigError);
  });
});

