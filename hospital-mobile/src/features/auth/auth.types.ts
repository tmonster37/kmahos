export type UserRole = 'ROLE_PATIENT' | string;

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
}

export interface AccountInfoResponse {
  userId: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role: UserRole;
  balance?: number;
  avatar?: string | null;
}

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type OtpPurpose = 'ACCOUNT_RECOVERY' | 'LINK_GOOGLE_ACCOUNT' | 'LINK_PATIENT_PROFILE';

export interface SendOtpRequest {
  email?: string;
  phoneNumber?: string;
  purpose: OtpPurpose;
}

export interface OtpResponse {
  message: string;
  expiresInSeconds?: number;
}

export interface VerifyOtpRequest {
  email?: string;
  phoneNumber?: string;
  otpCode: string;
  purpose: OtpPurpose;
}

export interface RegisterRequest {
  fullName: string;
  phoneNumber: string;
  email?: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email?: string;
  phoneNumber?: string;
  otpCode: string;
  newPassword: string;
}
