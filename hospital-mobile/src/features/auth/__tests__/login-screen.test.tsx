import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';
import PatientHomeShellScreen from '@/app/(patient)/index';
import { AuthProvider } from '../auth.context';
import { AuthRepository, NonPatientRoleError } from '../auth.repository';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  Redirect: () => null,
  Slot: () => null,
  Stack: () => null,
}));

function createMockRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    login: jest.fn(async () => ({
      userId: '11111111-1111-1111-1111-111111111111',
      fullName: 'Trần Thị Bệnh Nhân',
      phoneNumber: '0901112222',
      role: 'ROLE_PATIENT',
    })),
    restoreSession: jest.fn(async () => null),
    logout: jest.fn(async () => undefined),
    sendOtp: jest.fn(async () => ({ message: 'ok' })),
    verifyOtp: jest.fn(async () => true),
    register: jest.fn(async () => ({
      userId: '11111111-1111-1111-1111-111111111111',
      fullName: 'Trần Thị Bệnh Nhân',
      phoneNumber: '0901112222',
      role: 'ROLE_PATIENT',
    })),
    forgotPassword: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('LoginScreen & PatientHomeShellScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('rendersPatientAppShell', async () => {
    const repo = createMockRepo({
      restoreSession: jest.fn(async () => ({
        userId: '11111111-1111-1111-1111-111111111111',
        fullName: 'Trần Thị Bệnh Nhân',
        phoneNumber: '0901112222',
        role: 'ROLE_PATIENT',
      })),
    });

    const { getByTestId, getByText } = render(
      <AuthProvider repository={repo}>
        <PatientHomeShellScreen />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('patient-app-shell')).toBeTruthy();
      expect(getByText('Xin chào, Trần Thị Bệnh Nhân')).toBeTruthy();
    });
  });

  it('showsValidationErrors', async () => {
    const repo = createMockRepo();
    const { getByTestId, getByText } = render(
      <AuthProvider repository={repo}>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.press(getByTestId('login-submit-button'));
    expect(getByText('Vui lòng nhập số điện thoại hoặc email.')).toBeTruthy();

    fireEvent.changeText(getByTestId('login-identifier-input'), '0901112222');
    fireEvent.press(getByTestId('login-submit-button'));
    expect(getByText('Vui lòng nhập mật khẩu.')).toBeTruthy();
    expect(repo.login).not.toHaveBeenCalled();
  });

  it('routesPatientAfterLogin', async () => {
    const repo = createMockRepo();
    const { getByTestId } = render(
      <AuthProvider repository={repo}>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.changeText(getByTestId('login-identifier-input'), '0901112222');
    fireEvent.changeText(getByTestId('login-password-input'), 'Secret123!');
    fireEvent.press(getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(repo.login).toHaveBeenCalledWith({
        phoneNumber: '0901112222',
        password: 'Secret123!',
      });
      expect(mockReplace).toHaveBeenCalledWith('/(patient)');
    });
  });

  it('rejectsStaffAccount', async () => {
    const repo = createMockRepo({
      login: jest.fn(async () => {
        throw new NonPatientRoleError();
      }),
    });

    const { getByTestId, findByTestId } = render(
      <AuthProvider repository={repo}>
        <LoginScreen />
      </AuthProvider>
    );

    fireEvent.changeText(getByTestId('login-identifier-input'), '0909998888');
    fireEvent.changeText(getByTestId('login-password-input'), 'StaffPass123!');
    fireEvent.press(getByTestId('login-submit-button'));

    const errorNode = await findByTestId('login-error');
    expect(errorNode.props.children).toContain('ROLE_PATIENT');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('logoutClearsLocalSession', async () => {
    const repo = createMockRepo({
      restoreSession: jest.fn(async () => ({
        userId: '11111111-1111-1111-1111-111111111111',
        fullName: 'Trần Thị Bệnh Nhân',
        phoneNumber: '0901112222',
        role: 'ROLE_PATIENT',
      })),
    });

    const { getByTestId } = render(
      <AuthProvider repository={repo}>
        <PatientHomeShellScreen />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('patient-logout-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('patient-logout-button'));

    await waitFor(() => {
      expect(repo.logout).toHaveBeenCalledTimes(1);
    });
  });
});

