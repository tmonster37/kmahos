import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
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

export interface AuthApi {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  getCurrentUser(): Promise<AccountInfoResponse>;
  logout(): Promise<void>;
  sendOtp(request: SendOtpRequest): Promise<OtpResponse>;
  verifyOtp(request: VerifyOtpRequest): Promise<boolean>;
  register(request: RegisterRequest): Promise<AuthResponse>;
  forgotPassword(request: ForgotPasswordRequest): Promise<void>;
}

export function createAuthApi(client: AxiosInstance = apiClient): AuthApi {
  return {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
      return (await client.post('/api/auth/login', {
        phoneNumber: credentials.phoneNumber.trim(),
        password: credentials.password,
      })) as unknown as AuthResponse;
    },

    async getCurrentUser(): Promise<AccountInfoResponse> {
      return (await client.get('/api/auth/me')) as unknown as AccountInfoResponse;
    },

    async logout(): Promise<void> {
      await client.post('/api/auth/logout');
    },

    async sendOtp(request: SendOtpRequest): Promise<OtpResponse> {
      return (await client.post('/api/auth/send-otp', {
        email: request.email?.trim() || undefined,
        phoneNumber: request.phoneNumber?.trim() || undefined,
        purpose: request.purpose,
      })) as unknown as OtpResponse;
    },

    async verifyOtp(request: VerifyOtpRequest): Promise<boolean> {
      return (await client.post('/api/auth/verify-otp', {
        email: request.email?.trim() || undefined,
        phoneNumber: request.phoneNumber?.trim() || undefined,
        otpCode: request.otpCode.trim(),
        purpose: request.purpose,
      })) as unknown as boolean;
    },

    async register(request: RegisterRequest): Promise<AuthResponse> {
      return (await client.post('/api/auth/register', {
        fullName: request.fullName.trim(),
        phoneNumber: request.phoneNumber.trim(),
        email: request.email?.trim() || undefined,
        password: request.password,
      })) as unknown as AuthResponse;
    },

    async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
      await client.post('/api/auth/forgot-password', {
        email: request.email?.trim() || undefined,
        phoneNumber: request.phoneNumber?.trim() || undefined,
        otpCode: request.otpCode.trim(),
        newPassword: request.newPassword,
      });
    },
  };
}

export const authApi = createAuthApi();
