import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { authRepository } from '@/features/auth/auth.repository';
import { tokens } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    step?: string;
    otpCode?: string;
    email?: string;
    phoneNumber?: string;
  }>();

  const [step, setStep] = useState<'requestOtp' | 'resetPassword'>(
    searchParams.step === 'newPassword' ? 'resetPassword' : 'requestOtp'
  );
  const [identifier, setIdentifier] = useState(searchParams.phoneNumber || searchParams.email || '');
  const [otpCode, setOtpCode] = useState(searchParams.otpCode || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc email liên kết với tài khoản.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const isEmail = trimmed.includes('@');
      await authRepository.sendOtp({
        email: isEmail ? trimmed : undefined,
        phoneNumber: !isEmail ? trimmed : undefined,
        purpose: 'ACCOUNT_RECOVERY',
      });

      setCooldown(60);
      setStep('resetPassword');
      setSuccessMessage('Mã OTP xác thực đã được gửi. Vui lòng kiểm tra hộp thư hoặc tin nhắn.');
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Không thể gửi yêu cầu khôi phục. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    const trimmed = identifier.trim();
    if (!trimmed) return;

    setErrorMessage(null);
    setResending(true);
    try {
      const isEmail = trimmed.includes('@');
      await authRepository.sendOtp({
        email: isEmail ? trimmed : undefined,
        phoneNumber: !isEmail ? trimmed : undefined,
        purpose: 'ACCOUNT_RECOVERY',
      });
      setCooldown(60);
      setSuccessMessage('Mã xác thực OTP mới đã được gửi.');
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Không thể gửi lại mã OTP. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    const trimmedOtp = otpCode.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMessage('Vui lòng nhập đúng 6 chữ số mã OTP.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải từ 6 ký tự trở lên.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const isEmail = identifier.trim().includes('@');
      await authRepository.forgotPassword({
        email: isEmail ? identifier.trim() : undefined,
        phoneNumber: !isEmail ? identifier.trim() : undefined,
        otpCode: trimmedOtp,
        newPassword,
      });

      setSuccessMessage('Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.');
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1500);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Mã xác thực OTP không chính xác hoặc đã hết hạn.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} testID="forgot-password-screen">
      <View style={styles.card}>
        <BrandHeader
          title="Khôi Phục Mật Khẩu"
          subtitle={
            step === 'requestOtp'
              ? 'Nhập số điện thoại hoặc email đã đăng ký để nhận mã OTP xác thực khôi phục tài khoản'
              : 'Nhập mã xác thực 6 số và thiết lập mật khẩu mới'
          }
          logoSize={48}
          align="center"
        />

        {errorMessage ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText} testID="forgot-password-error">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successBox}>
            <Text style={styles.successText} testID="forgot-password-success">
              {successMessage}
            </Text>
          </View>
        ) : null}

        {step === 'requestOtp' ? (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Số điện thoại hoặc Email *</Text>
              <TextInput
                testID="recovery-identifier-input"
                accessibilityLabel="Số điện thoại hoặc Email"
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Nhập số điện thoại hoặc email"
                autoCapitalize="none"
                editable={!submitting}
              />
            </View>

            <Pressable
              testID="recovery-request-otp-button"
              accessibilityRole="button"
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleRequestOtp}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={tokens.colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Nhận mã xác thực OTP</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mã xác thực OTP (6 chữ số) *</Text>
              <TextInput
                testID="recovery-otp-input"
                accessibilityLabel="Mã xác thực OTP 6 số"
                style={styles.otpInput}
                value={otpCode}
                onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                editable={!submitting}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mật khẩu mới *</Text>
              <TextInput
                testID="recovery-new-password-input"
                accessibilityLabel="Mật khẩu mới"
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Tối thiểu 6 ký tự"
                editable={!submitting}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu mới *</Text>
              <TextInput
                testID="recovery-confirm-password-input"
                accessibilityLabel="Xác nhận mật khẩu mới"
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Nhập lại mật khẩu mới"
                editable={!submitting}
              />
            </View>

            <Pressable
              testID="recovery-submit-button"
              accessibilityRole="button"
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={tokens.colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Cập nhật mật khẩu mới</Text>
              )}
            </Pressable>

            <View style={styles.resendContainer}>
              {cooldown > 0 ? (
                <Text style={styles.cooldownText}>
                  Gửi lại mã OTP sau: <Text style={styles.cooldownNumber}>{cooldown}s</Text>
                </Text>
              ) : (
                <Pressable
                  testID="recovery-resend-button"
                  onPress={handleResendOtp}
                  disabled={resending}
                >
                  {resending ? (
                    <ActivityIndicator size="small" color={tokens.colors.primary} />
                  ) : (
                    <Text style={styles.resendButtonText}>Gửi lại mã OTP</Text>
                  )}
                </Pressable>
              )}
            </View>
          </>
        )}

        <Pressable
          testID="recovery-back-login-link"
          style={styles.backLink}
          onPress={() => router.push('/(auth)/login' as any)}
          disabled={submitting}
        >
          <Text style={styles.backLinkText}>
            Quay lại <Text style={styles.linkHighlight}>Đăng nhập</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.xl,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    shadowColor: tokens.colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.lg,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    borderRadius: tokens.radius.sm,
    borderColor: tokens.colors.dangerBorder,
    borderWidth: 1,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.caption,
    fontWeight: '500',
  },
  successBox: {
    backgroundColor: tokens.colors.successBg,
    borderRadius: tokens.radius.sm,
    borderColor: tokens.colors.successBorder,
    borderWidth: 1,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  successText: {
    color: tokens.colors.success,
    fontSize: tokens.typography.caption,
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: tokens.spacing.md,
  },
  label: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.input,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    fontSize: tokens.typography.body,
    color: tokens.colors.textPrimary,
    backgroundColor: tokens.colors.surface,
    minHeight: 44,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.input,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    color: tokens.colors.primaryDark,
    backgroundColor: tokens.colors.surface,
    minHeight: 52,
  },
  button: {
    marginTop: tokens.spacing.sm,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.button,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: tokens.colors.surface,
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
  resendContainer: {
    marginTop: tokens.spacing.md,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  cooldownText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
  },
  cooldownNumber: {
    color: tokens.colors.primary,
    fontWeight: '700',
  },
  resendButtonText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.primary,
    fontWeight: '700',
  },
  backLink: {
    marginTop: tokens.spacing.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  backLinkText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
  },
  linkHighlight: {
    color: tokens.colors.primary,
    fontWeight: '700',
  },
});
