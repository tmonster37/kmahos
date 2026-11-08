import { createAuthRepository, NonPatientRoleError } from '../auth.repository';
import { AuthApi } from '../auth.api';
import { SessionStorage } from '../session.storage';
import { AuthResponse, OtpResponse } from '../auth.types';
import { ApiClientError } from '@/lib/api/types';

describe('Auth Lifecycle Repository Tests', () => {
  let mockApi: jest.Mocked<AuthApi>;
  let mockStorage: jest.Mocked<SessionStorage>;
  let repository: ReturnType<typeof createAuthRepository>;

  beforeEach(() => {
    mockApi = {
      login: jest.fn(),
      getCurrentUser: jest.fn(),
      logout: jest.fn(),
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
      register: jest.fn(),
      forgotPassword: jest.fn(),
    };

    mockStorage = {
      read: jest.fn().mockResolvedValue(null),
      write: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };

    repository = createAuthRepository(mockApi, mockStorage);
  });

  describe('OTP Operations', () => {
    it('gửi OTP thành công và trả về thông điệp từ server', async () => {
      const mockOtpRes: OtpResponse = {
        message: 'Mã OTP đã được gửi',
        expiresInSeconds: 300,
      };
      mockApi.sendOtp.mockResolvedValueOnce(mockOtpRes);

      const result = await repository.sendOtp({
        phoneNumber: '0987654321',
        email: 'patient@example.com',
        purpose: 'ACCOUNT_RECOVERY',
      });

      expect(mockApi.sendOtp).toHaveBeenCalledWith({
        phoneNumber: '0987654321',
        email: 'patient@example.com',
        purpose: 'ACCOUNT_RECOVERY',
      });
      expect(result.message).toBe('Mã OTP đã được gửi');
      expect(result.expiresInSeconds).toBe(300);
    });

    it('xác thực OTP trả về true khi mã hợp lệ', async () => {
      mockApi.verifyOtp.mockResolvedValueOnce(true);

      const isValid = await repository.verifyOtp({
        email: 'patient@example.com',
        otpCode: '123456',
        purpose: 'ACCOUNT_RECOVERY',
      });

      expect(mockApi.verifyOtp).toHaveBeenCalledWith({
        email: 'patient@example.com',
        otpCode: '123456',
        purpose: 'ACCOUNT_RECOVERY',
      });
      expect(isValid).toBe(true);
    });
  });

  describe('Register', () => {
    it('đăng ký thành công với ROLE_PATIENT thì lưu accessToken và trả về AccountInfoResponse', async () => {
      const mockAuth: AuthResponse = {
        accessToken: 'patient-jwt-token-123.header.sig',
        tokenType: 'Bearer',
        userId: 'patient-uuid-1',
        fullName: 'Nguyễn Văn Bệnh Nhân',
        phoneNumber: '0987654321',
        role: 'ROLE_PATIENT',
      };
      mockApi.register.mockResolvedValueOnce(mockAuth);

      const account = await repository.register({
        fullName: 'Nguyễn Văn Bệnh Nhân',
        phoneNumber: '0987654321',
        email: 'patient@example.com',
        password: 'password123',
      });

      expect(account).toEqual({
        userId: 'patient-uuid-1',
        fullName: 'Nguyễn Văn Bệnh Nhân',
        phoneNumber: '0987654321',
        role: 'ROLE_PATIENT',
      });
      expect(mockStorage.write).toHaveBeenCalledWith('patient-jwt-token-123.header.sig');
    });

    it('từ chối đăng ký nếu server trả về vai trò khác ROLE_PATIENT', async () => {
      const mockNonPatientAuth = {
        accessToken: 'staff-token.xxx.yyy',
        tokenType: 'Bearer',
        userId: 'doctor-uuid-2',
        fullName: 'Bác Sĩ Nguyễn',
        phoneNumber: '0988888888',
        role: 'ROLE_DOCTOR',
      };
      mockApi.register.mockResolvedValueOnce(mockNonPatientAuth as unknown as AuthResponse);

      await expect(
        repository.register({
          fullName: 'Bác Sĩ Nguyễn',
          phoneNumber: '0988888888',
          password: 'password123',
        })
      ).rejects.toThrow(NonPatientRoleError);

      expect(mockStorage.clear).toHaveBeenCalled();
      expect(mockStorage.write).not.toHaveBeenCalled();
    });

    it('ném lỗi và xóa storage nếu phản hồi đăng ký thiếu accessToken', async () => {
      const malformedAuth = {
        accessToken: '',
        tokenType: 'Bearer',
        userId: 'uuid-3',
        fullName: 'Test User',
        phoneNumber: '0987654321',
        role: 'ROLE_PATIENT',
      };
      mockApi.register.mockResolvedValueOnce(malformedAuth as unknown as AuthResponse);

      await expect(
        repository.register({
          fullName: 'Test User',
          phoneNumber: '0987654321',
          password: 'password123',
        })
      ).rejects.toThrow('Phản hồi đăng ký thiếu mã phiên bảo mật.');

      expect(mockStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Forgot Password', () => {
    it('gọi API forgotPassword thành công và không lưu token hay mật khẩu vào storage', async () => {
      mockApi.forgotPassword.mockResolvedValueOnce(undefined);

      await repository.forgotPassword({
        phoneNumber: '0987654321',
        otpCode: '123456',
        newPassword: 'newSecretPassword123',
      });

      expect(mockApi.forgotPassword).toHaveBeenCalledWith({
        phoneNumber: '0987654321',
        otpCode: '123456',
        newPassword: 'newSecretPassword123',
      });
      expect(mockStorage.write).not.toHaveBeenCalled();
    });

    it('lan truyền lỗi ApiClientError khi OTP hết hạn hoặc sai', async () => {
      mockApi.forgotPassword.mockRejectedValueOnce(
        new ApiClientError('Mã OTP không chính xác. Bạn còn 4 lần thử', 400)
      );

      await expect(
        repository.forgotPassword({
          phoneNumber: '0987654321',
          otpCode: '000000',
          newPassword: 'newSecretPassword123',
        })
      ).rejects.toThrow('Mã OTP không chính xác. Bạn còn 4 lần thử');
    });
  });
});

