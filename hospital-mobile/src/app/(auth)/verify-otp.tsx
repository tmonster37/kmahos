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
import { authFlowStore } from '@/features/auth/registration.store';
import { tokens } from '@/theme/tokens';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    flow?: string;
    email?: string;
    phoneNumber?: string;
  }>();

  const flow = params.flow || 'register';
  const email = params.email || '';
  const phoneNumber = params.phoneNumber || '';

  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setErrorMessage(null);
    setResending(true);
    try {
      const res = await authRepository.sendOtp({
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        purpose: 'ACCOUNT_RECOVERY',
      });
      setCooldown(60);
      setSuccessInfo(res.message || 'Mã OTP mới đã được gửi. Vui lòng kiểm tra hộp thư.');
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    const trimmedOtp = otpCode.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMessage('Vui lòng nhập đúng 6 chữ số mã OTP.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (flow === 'register') {
        const pending = authFlowStore.getPendingRegistration();
        if (!pending) {
          setErrorMessage('Phiên đăng ký đã hết hạn. Vui lòng quay lại màn hình đăng ký.');
          return;
        }

        const isOtpValid = await authRepository.verifyOtp({
          email: pending.email,
          phoneNumber: pending.phoneNumber,
          otpCode: trimmedOtp,
          purpose: 'ACCOUNT_RECOVERY',
        });

        if (!isOtpValid) {
          setErrorMessage('Mã OTP xác thực không chính xác.');
          return;
        }

        await authRepository.register({
          fullName: pending.fullName,
          phoneNumber: pending.phoneNumber,
          email: pending.email,
          password: pending.password,
        });

        authFlowStore.clear();
        router.replace('/(patient)');
      } else {
        const isOtpValid = await authRepository.verifyOtp({
          email: email || undefined,
          phoneNumber: phoneNumber || undefined,
          otpCode: trimmedOtp,
          purpose: 'ACCOUNT_RECOVERY',
        });

        if (!isOtpValid) {
          setErrorMessage('Mã xác thực OTP không chính xác hoặc đã hết hạn.');
          return;
        }

        router.replace({
          pathname: '/(auth)/forgot-password' as any,
          params: { step: 'newPassword', otpCode: trimmedOtp, email, phoneNumber },
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Xác thực OTP không thành công. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const maskedTarget = email
    ? email.replace(/(^.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(Math.max(b.length, 2)))
    : phoneNumber
      ? phoneNumber.slice(0, 3) + '****' + phoneNumber.slice(-3)
      : 'thông tin liên hệ của bạn';

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} testID="verify-otp-screen">
      <View style={styles.card}>
        <BrandHeader
          title="Xác Thực Mã OTP"
          subtitle={`Mã xác thực gồm 6 chữ số đã được gửi tới ${maskedTarget}. Mã có hiệu lực trong 5 phút.`}
          logoSize={48}
          align="center"
        />

        {errorMessage ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText} testID="verify-otp-error">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {successInfo ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successInfo}</Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nhập mã xác thực OTP (6 chữ số) *</Text>
          <TextInput
            testID="otp-code-input"
            accessibilityLabel="Mã OTP 6 số"
            style={styles.otpInput}
            value={otpCode}
            onChangeText={(text) => {
              setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6));
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            placeholderTextColor={tokens.colors.textMuted}
            editable={!submitting}
          />
        </View>

        <Pressable
          testID="verify-otp-submit-button"
          accessibilityRole="button"
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={tokens.colors.surface} />
          ) : (
            <Text style={styles.buttonText}>
              {flow === 'register' ? 'Xác nhận & Hoàn tất đăng ký' : 'Xác nhận mã OTP'}
            </Text>
          )}
        </Pressable>

        <View style={styles.resendContainer}>
          {cooldown > 0 ? (
            <Text style={styles.cooldownText} testID="resend-cooldown-text">
              Gửi lại mã sau: <Text style={styles.cooldownNumber}>{cooldown}s</Text>
            </Text>
          ) : (
            <Pressable
              testID="resend-otp-button"
              onPress={handleResendOtp}
              disabled={resending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {resending ? (
                <ActivityIndicator size="small" color={tokens.colors.primary} />
              ) : (
                <Text style={styles.resendButtonText}>Gửi lại mã OTP</Text>
              )}
            </Pressable>
          )}
        </View>

        <Pressable
          testID="back-to-auth-link"
          style={styles.backLink}
          onPress={() => router.push((flow === 'register' ? '/(auth)/register' : '/(auth)/login') as any)}
          disabled={submitting}
        >
          <Text style={styles.backLinkText}>Quay lại</Text>
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
  otpInput: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.input,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
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
    marginTop: tokens.spacing.lg,
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
    marginTop: tokens.spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  backLinkText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
  },
});
