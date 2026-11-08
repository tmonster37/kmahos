import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '@/app/(auth)/forgot-password';
import { authRepository } from '../auth.repository';

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
    forgotPassword: jest.fn(),
  },
}));

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
  });

  it('báo lỗi khi bấm nhận OTP mà chưa nhập SĐT hoặc Email', () => {
    const { getByTestId, getByText } = render(<ForgotPasswordScreen />);

    fireEvent.press(getByTestId('recovery-request-otp-button'));
    expect(getByText('Vui lòng nhập số điện thoại hoặc email liên kết với tài khoản.')).toBeTruthy();
  });

  it('gửi OTP thành công và chuyển sang bước nhập mật khẩu mới', async () => {
    (authRepository.sendOtp as jest.Mock).mockResolvedValueOnce({
      message: 'Mã OTP đã được gửi',
      expiresInSeconds: 300,
    });

    const { getByTestId, findByTestId } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByTestId('recovery-identifier-input'), '0987654321');
    fireEvent.press(getByTestId('recovery-request-otp-button'));

    await waitFor(() => {
      expect(authRepository.sendOtp).toHaveBeenCalledWith({
        phoneNumber: '0987654321',
        email: undefined,
        purpose: 'ACCOUNT_RECOVERY',
      });
    });

    const newPasswordInput = await findByTestId('recovery-new-password-input');
    expect(newPasswordInput).toBeTruthy();
  });

  it('báo lỗi validation ở bước 2 nếu OTP không đủ 6 số hoặc mật khẩu không khớp', async () => {
    mockSearchParams = { step: 'newPassword', phoneNumber: '0987654321' };

    const { getByTestId, getByText } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByTestId('recovery-otp-input'), '123');
    fireEvent.press(getByTestId('recovery-submit-button'));
    expect(getByText('Vui lòng nhập đúng 6 chữ số mã OTP.')).toBeTruthy();

    fireEvent.changeText(getByTestId('recovery-otp-input'), '123456');
    fireEvent.changeText(getByTestId('recovery-new-password-input'), 'pass1');
    fireEvent.press(getByTestId('recovery-submit-button'));
    expect(getByText('Mật khẩu mới phải từ 6 ký tự trở lên.')).toBeTruthy();

    fireEvent.changeText(getByTestId('recovery-new-password-input'), 'password123');
    fireEvent.changeText(getByTestId('recovery-confirm-password-input'), 'differentPass');
    fireEvent.press(getByTestId('recovery-submit-button'));
    expect(getByText('Mật khẩu xác nhận không khớp.')).toBeTruthy();
  });

  it('đặt lại mật khẩu thành công và gọi authRepository.forgotPassword', async () => {
    mockSearchParams = { step: 'newPassword', phoneNumber: '0987654321' };
    (authRepository.forgotPassword as jest.Mock).mockResolvedValueOnce(undefined);

    const { getByTestId, findByTestId } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByTestId('recovery-otp-input'), '654321');
    fireEvent.changeText(getByTestId('recovery-new-password-input'), 'newSecret123');
    fireEvent.changeText(getByTestId('recovery-confirm-password-input'), 'newSecret123');
    fireEvent.press(getByTestId('recovery-submit-button'));

    await waitFor(() => {
      expect(authRepository.forgotPassword).toHaveBeenCalledWith({
        phoneNumber: '0987654321',
        email: undefined,
        otpCode: '654321',
        newPassword: 'newSecret123',
      });
    });

    const successNode = await findByTestId('forgot-password-success');
    expect(successNode).toBeTruthy();
  });
});

