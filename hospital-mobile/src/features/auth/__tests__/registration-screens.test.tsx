import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import RegisterScreen from '@/app/(auth)/register';
import VerifyOtpScreen from '@/app/(auth)/verify-otp';
import { authRepository } from '../auth.repository';
import { authFlowStore } from '../registration.store';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('../auth.repository', () => ({
  authRepository: {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    register: jest.fn(),
  },
}));

describe('Registration & Verify OTP Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    authFlowStore.clear();
  });

  describe('RegisterScreen', () => {
    it('kiểm tra tính hợp lệ và hiển thị lỗi validation khi để trống thông tin', () => {
      const { getByTestId, getByText } = render(<RegisterScreen />);

      fireEvent.press(getByTestId('register-submit-button'));
      expect(getByText('Vui lòng nhập họ và tên.')).toBeTruthy();

      fireEvent.changeText(getByTestId('register-fullname-input'), 'Nguyễn Văn An');
      fireEvent.press(getByTestId('register-submit-button'));
      expect(getByText(/Số điện thoại không hợp lệ/)).toBeTruthy();

      fireEvent.changeText(getByTestId('register-phone-input'), '0987654321');
      fireEvent.press(getByTestId('register-submit-button'));
      expect(getByText('Mật khẩu phải từ 6 ký tự trở lên.')).toBeTruthy();

      fireEvent.changeText(getByTestId('register-password-input'), 'pass123');
      fireEvent.changeText(getByTestId('register-confirm-password-input'), 'pass999');
      fireEvent.press(getByTestId('register-submit-button'));
      expect(getByText('Mật khẩu xác nhận không khớp.')).toBeTruthy();
    });

    it('đăng ký trực tiếp với số điện thoại khi không có email', async () => {
      (authRepository.register as jest.Mock).mockResolvedValueOnce({
        userId: 'patient-1',
        fullName: 'Nguyễn Văn An',
        phoneNumber: '0987654321',
        role: 'ROLE_PATIENT',
      });

      const { getByTestId } = render(<RegisterScreen />);

      fireEvent.changeText(getByTestId('register-fullname-input'), 'Nguyễn Văn An');
      fireEvent.changeText(getByTestId('register-phone-input'), '0987654321');
      fireEvent.changeText(getByTestId('register-password-input'), 'password123');
      fireEvent.changeText(getByTestId('register-confirm-password-input'), 'password123');

      fireEvent.press(getByTestId('register-submit-button'));

      await waitFor(() => {
        expect(authRepository.register).toHaveBeenCalledWith({
          fullName: 'Nguyễn Văn An',
          phoneNumber: '0987654321',
          password: 'password123',
        });
        expect(mockReplace).toHaveBeenCalledWith('/(patient)');
      });
    });

    it('đăng ký có email: gửi OTP và chuyển hướng tới verify-otp', async () => {
      (authRepository.sendOtp as jest.Mock).mockResolvedValueOnce({
        message: 'Mã OTP đã được gửi',
        expiresInSeconds: 300,
      });

      const { getByTestId } = render(<RegisterScreen />);

      fireEvent.changeText(getByTestId('register-fullname-input'), 'Nguyễn Văn An');
      fireEvent.changeText(getByTestId('register-phone-input'), '0987654321');
      fireEvent.changeText(getByTestId('register-email-input'), 'patient@example.com');
      fireEvent.changeText(getByTestId('register-password-input'), 'password123');
      fireEvent.changeText(getByTestId('register-confirm-password-input'), 'password123');

      fireEvent.press(getByTestId('register-submit-button'));

      await waitFor(() => {
        expect(authRepository.sendOtp).toHaveBeenCalledWith({
          email: 'patient@example.com',
          phoneNumber: '0987654321',
          purpose: 'ACCOUNT_RECOVERY',
        });
        expect(mockPush).toHaveBeenCalledWith({
          pathname: '/(auth)/verify-otp',
          params: {
            flow: 'register',
            email: 'patient@example.com',
            phoneNumber: '0987654321',
          },
        });
      });
    });
  });

  describe('VerifyOtpScreen', () => {
    it('báo lỗi nếu mã OTP không đủ 6 chữ số', () => {
      mockSearchParams = { flow: 'register', email: 'patient@example.com', phoneNumber: '0987654321' };
      const { getByTestId, getByText } = render(<VerifyOtpScreen />);

      fireEvent.changeText(getByTestId('otp-code-input'), '1234');
      fireEvent.press(getByTestId('verify-otp-submit-button'));

      expect(getByText('Vui lòng nhập đúng 6 chữ số mã OTP.')).toBeTruthy();
    });

    it('xác thực OTP và hoàn tất đăng ký tài khoản từ RAM', async () => {
      mockSearchParams = { flow: 'register', email: 'patient@example.com', phoneNumber: '0987654321' };

      authFlowStore.setPendingRegistration({
        fullName: 'Nguyễn Văn An',
        phoneNumber: '0987654321',
        email: 'patient@example.com',
        password: 'password123',
      });

      (authRepository.verifyOtp as jest.Mock).mockResolvedValueOnce(true);
      (authRepository.register as jest.Mock).mockResolvedValueOnce({
        userId: 'patient-uuid',
        fullName: 'Nguyễn Văn An',
        phoneNumber: '0987654321',
        role: 'ROLE_PATIENT',
      });

      const { getByTestId } = render(<VerifyOtpScreen />);

      fireEvent.changeText(getByTestId('otp-code-input'), '123456');
      fireEvent.press(getByTestId('verify-otp-submit-button'));

      await waitFor(() => {
        expect(authRepository.verifyOtp).toHaveBeenCalledWith({
          email: 'patient@example.com',
          phoneNumber: '0987654321',
          otpCode: '123456',
          purpose: 'ACCOUNT_RECOVERY',
        });
        expect(authRepository.register).toHaveBeenCalledWith({
          fullName: 'Nguyễn Văn An',
          phoneNumber: '0987654321',
          email: 'patient@example.com',
          password: 'password123',
        });
        expect(mockReplace).toHaveBeenCalledWith('/(patient)');
      });
    });
  });
});

