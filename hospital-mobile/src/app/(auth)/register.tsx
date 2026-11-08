import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { authRepository } from '@/features/auth/auth.repository';
import { authFlowStore } from '@/features/auth/registration.store';
import { tokens } from '@/theme/tokens';

const PHONE_REGEX = /^(84|0[35789])[0-9]{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên.');
      return;
    }
    if (!trimmedPhone || !PHONE_REGEX.test(trimmedPhone)) {
      setErrorMessage('Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return;
    }
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Địa chỉ email không đúng định dạng.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Mật khẩu phải từ 6 ký tự trở lên.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      authFlowStore.setPendingRegistration({
        fullName: trimmedName,
        phoneNumber: trimmedPhone,
        email: trimmedEmail || undefined,
        password,
      });

      if (trimmedEmail) {
        await authRepository.sendOtp({
          email: trimmedEmail,
          phoneNumber: trimmedPhone,
          purpose: 'ACCOUNT_RECOVERY',
        });
        router.push({
          pathname: '/(auth)/verify-otp' as any,
          params: { flow: 'register', email: trimmedEmail, phoneNumber: trimmedPhone },
        });
      } else {
        await authRepository.register({
          fullName: trimmedName,
          phoneNumber: trimmedPhone,
          password,
        });
        authFlowStore.clear();
        router.replace('/(patient)');
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} testID="register-screen">
      <View style={styles.card}>
        <BrandHeader
          title="Đăng Ký Tài Khoản"
          subtitle="Tạo tài khoản bệnh nhân để đặt khám nhanh, theo dõi hồ sơ y bạ điện tử và thanh toán viện phí"
          logoSize={48}
          align="center"
        />

        {errorMessage ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText} testID="register-error">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Họ và tên *</Text>
          <TextInput
            testID="register-fullname-input"
            accessibilityLabel="Họ và tên"
            style={styles.input}
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Ví dụ: Nguyễn Văn An"
            placeholderTextColor={tokens.colors.textMuted}
            editable={!submitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Số điện thoại *</Text>
          <TextInput
            testID="register-phone-input"
            accessibilityLabel="Số điện thoại"
            style={styles.input}
            value={phoneNumber}
            onChangeText={(t) => {
              setPhoneNumber(t);
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="phone-pad"
            placeholder="0987654321"
            placeholderTextColor={tokens.colors.textMuted}
            editable={!submitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Địa chỉ Email (Khuyên dùng để nhận OTP)</Text>
          <TextInput
            testID="register-email-input"
            accessibilityLabel="Địa chỉ Email"
            style={styles.input}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="email@example.com"
            placeholderTextColor={tokens.colors.textMuted}
            editable={!submitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mật khẩu *</Text>
          <TextInput
            testID="register-password-input"
            accessibilityLabel="Mật khẩu"
            style={styles.input}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry
            placeholder="Tối thiểu 6 ký tự"
            placeholderTextColor={tokens.colors.textMuted}
            editable={!submitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Xác nhận mật khẩu *</Text>
          <TextInput
            testID="register-confirm-password-input"
            accessibilityLabel="Xác nhận mật khẩu"
            style={styles.input}
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry
            placeholder="Nhập lại mật khẩu"
            placeholderTextColor={tokens.colors.textMuted}
            editable={!submitting}
          />
        </View>

        <Pressable
          testID="register-submit-button"
          accessibilityRole="button"
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={tokens.colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Đăng ký tài khoản</Text>
          )}
        </Pressable>

        <Pressable
          testID="register-login-link"
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login' as any)}
          disabled={submitting}
        >
          <Text style={styles.loginLinkText}>
            Đã có tài khoản? <Text style={styles.linkHighlight}>Đăng nhập ngay</Text>
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
    padding: tokens.spacing.lg,
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
  button: {
    marginTop: tokens.spacing.md,
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
  loginLink: {
    marginTop: tokens.spacing.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  loginLinkText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
  },
  linkHighlight: {
    color: tokens.colors.primary,
    fontWeight: '700',
  },
});
