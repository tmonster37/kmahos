import { ApiClientError } from '@/lib/api/types';
import { pushRegistrationManager, PushRegistrationManager } from '@/features/notifications/push-registration';
import { authApi, AuthApi } from './auth.api';
import {
  AccountInfoResponse,
  AuthResponse,
  ForgotPasswordRequest,
  LoginCredentials,
  OtpResponse,
  RegisterRequest,
  SendOtpRequest,
  VerifyOtpRequest,
} from './auth.types';
import { sessionStorage, SessionStorage } from './session.storage';

export class NonPatientRoleError extends Error {
  constructor(
    message = 'Ứng dụng này chỉ dành cho tài khoản Bệnh nhân (ROLE_PATIENT).'
  ) {
    super(message);
    this.name = 'NonPatientRoleError';
  }
}

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<AccountInfoResponse>;
  restoreSession(): Promise<AccountInfoResponse | null>;
  logout(): Promise<void>;
  sendOtp(request: SendOtpRequest): Promise<OtpResponse>;
  verifyOtp(request: VerifyOtpRequest): Promise<boolean>;
  register(request: RegisterRequest): Promise<AccountInfoResponse>;
  forgotPassword(request: ForgotPasswordRequest): Promise<void>;
}

export function createAuthRepository(
  api: AuthApi = authApi,
  storage: SessionStorage = sessionStorage,
  pushManager: PushRegistrationManager = pushRegistrationManager
): AuthRepository {
  return {
    async login(credentials: LoginCredentials): Promise<AccountInfoResponse> {
      const rawAuth = (await api.login(credentials)) as unknown;
      const auth: AuthResponse =
        rawAuth && typeof rawAuth === 'object' && 'data' in rawAuth && (rawAuth as { data: AuthResponse }).data?.role
          ? (rawAuth as { data: AuthResponse }).data
          : (rawAuth as AuthResponse);

      if (!auth || auth.role !== 'ROLE_PATIENT') {
        await storage.clear();
        throw new NonPatientRoleError();
      }

      if (!auth.accessToken) {
        await storage.clear();
        throw new Error('Phản hồi đăng nhập thiếu mã phiên bảo mật.');
      }

      await storage.write(auth.accessToken);

      return {
        userId: auth.userId,
        fullName: auth.fullName,
        phoneNumber: auth.phoneNumber,
        role: auth.role,
      };
    },

    async restoreSession(): Promise<AccountInfoResponse | null> {
      const token = await storage.read();
      if (!token) {
        return null;
      }

      try {
        const rawAccount = (await api.getCurrentUser()) as unknown;
        const account: AccountInfoResponse =
          rawAccount && typeof rawAccount === 'object' && 'data' in rawAccount && (rawAccount as { data: AccountInfoResponse }).data?.role
            ? (rawAccount as { data: AccountInfoResponse }).data
            : (rawAccount as AccountInfoResponse);

        if (!account || account.role !== 'ROLE_PATIENT') {
          await storage.clear();
          return null;
        }
        return account;
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          await storage.clear();
          return null;
        }
        await storage.clear();
        return null;
      }
    },

    async logout(): Promise<void> {
      try {
        await pushManager.revokePushRegistration();
      } catch {
        // Best-effort push revocation; do not block user logout
      }

      try {
        await api.logout();
      } catch {
        // Best-effort server logout; always clear local SecureStore token
      } finally {
        await storage.clear();
      }
    },

    async sendOtp(request: SendOtpRequest): Promise<OtpResponse> {
      const rawRes = (await api.sendOtp(request)) as unknown;
      const res: OtpResponse =
        rawRes && typeof rawRes === 'object' && 'data' in rawRes
          ? (rawRes as { data: OtpResponse }).data
          : (rawRes as OtpResponse);
      return res;
    },

    async verifyOtp(request: VerifyOtpRequest): Promise<boolean> {
      const rawRes = (await api.verifyOtp(request)) as unknown;
      const res =
        rawRes && typeof rawRes === 'object' && 'data' in rawRes
          ? (rawRes as { data: boolean }).data
          : Boolean(rawRes);
      return Boolean(res);
    },

    async register(request: RegisterRequest): Promise<AccountInfoResponse> {
      const rawAuth = (await api.register(request)) as unknown;
      const auth: AuthResponse =
        rawAuth && typeof rawAuth === 'object' && 'data' in rawAuth && (rawAuth as { data: AuthResponse }).data?.role
          ? (rawAuth as { data: AuthResponse }).data
          : (rawAuth as AuthResponse);

      if (!auth || auth.role !== 'ROLE_PATIENT') {
        await storage.clear();
        throw new NonPatientRoleError();
      }

      if (!auth.accessToken) {
        await storage.clear();
        throw new Error('Phản hồi đăng ký thiếu mã phiên bảo mật.');
      }

      await storage.write(auth.accessToken);

      return {
        userId: auth.userId,
        fullName: auth.fullName,
        phoneNumber: auth.phoneNumber,
        role: auth.role,
      };
    },

    async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
      await api.forgotPassword(request);
    },
  };
}

export const authRepository = createAuthRepository();
