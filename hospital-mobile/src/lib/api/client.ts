import axios, { AxiosAdapter, AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiConfigError, getApiBaseUrl } from '@/config/env';
import { sessionStorage, SessionStorage } from '@/features/auth/session.storage';
import { ApiClientError, ApiResponse } from './types';

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorizedSession(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(): void {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
}

export interface CreateApiClientOptions {
  baseUrl?: string;
  storage?: SessionStorage;
  adapter?: AxiosAdapter;
  onUnauthorized?: () => void;
}

export function createApiClient(options: CreateApiClientOptions = {}): AxiosInstance {
  const storage = options.storage ?? sessionStorage;

  const instance = axios.create({
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    adapter: options.adapter,
  });

  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const resolvedBaseUrl = getApiBaseUrl(options.baseUrl ?? process.env.EXPO_PUBLIC_API_URL);
    config.baseURL = resolvedBaseUrl;

    const token = await storage.read();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers.delete('Authorization');
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const payload = response.data as ApiResponse<unknown> | unknown;
      if (
        payload &&
        typeof payload === 'object' &&
        'data' in payload &&
        ('code' in payload || 'success' in payload || 'message' in payload)
      ) {
        return (payload as { data: unknown }).data as never;
      }
      return payload as never;
    },
    async (error: AxiosError<{ code?: number; message?: string }> | unknown) => {
      if (error instanceof ApiConfigError) {
        throw error;
      }
      const axiosError = error as AxiosError<{ code?: number; message?: string }>;
      const status = axiosError.response?.status ?? 0;
      if (status === 401) {
        await storage.clear();
        options.onUnauthorized?.();
        notifyUnauthorized();
      }

      const serverMessage =
        typeof axiosError.response?.data?.message === 'string' && axiosError.response.data.message.trim()
          ? axiosError.response.data.message.trim()
          : status === 401
            ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            : 'Không thể kết nối tới máy chủ bệnh viện. Vui lòng thử lại.';

      throw new ApiClientError(serverMessage, status, axiosError.response?.data?.code);
    }
  );

  return instance;
}

export const apiClient = createApiClient();

