import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const ACCESS_TOKEN_STORAGE_KEY = 'hospital_mobile.access_token';

const JWT_SHAPE_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function isWellFormedToken(token: unknown): token is string {
  if (typeof token !== 'string') {
    return false;
  }
  const trimmed = token.trim();
  if (!trimmed || trimmed !== token) {
    return false;
  }
  return JWT_SHAPE_REGEX.test(trimmed);
}

export interface SessionStorage {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

const webStorage: Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'> = {
  async getItemAsync(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Ignore localStorage access restrictions
    }
    return null;
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore quota / access restrictions
    }
  },
  async deleteItemAsync(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  },
};

export function createSessionStorage(
  store: Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'> = (Platform.OS === 'web'
    ? webStorage
    : SecureStore)
): SessionStorage {
  return {
    async read(): Promise<string | null> {
      try {
        let stored: string | null = null;
        try {
          stored = await store.getItemAsync(ACCESS_TOKEN_STORAGE_KEY);
        } catch {
          if (Platform.OS === 'web' || typeof window !== 'undefined') {
            stored = await webStorage.getItemAsync(ACCESS_TOKEN_STORAGE_KEY);
          }
        }

        if (stored == null) {
          return null;
        }
        if (!isWellFormedToken(stored)) {
          await this.clear();
          return null;
        }
        return stored;
      } catch {
        await this.clear();
        return null;
      }
    },

    async write(token: string): Promise<void> {
      if (!isWellFormedToken(token)) {
        await this.clear();
        throw new Error('Token phiên đăng nhập không đúng định dạng bảo mật.');
      }

      try {
        await store.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, token);
      } catch {
        if (Platform.OS === 'web' || typeof window !== 'undefined') {
          await webStorage.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, token);
        } else {
          throw new Error('Không thể lưu token phiên bảo mật.');
        }
      }
    },

    async clear(): Promise<void> {
      try {
        await store.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore cleanup errors
      }
      if (Platform.OS === 'web' || typeof window !== 'undefined') {
        try {
          await webStorage.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
        } catch {
          // Ignore
        }
      }
    },
  };
}

export const sessionStorage: SessionStorage = createSessionStorage();
