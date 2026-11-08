import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BrandHeader } from '@/components/brand/BrandHeader';
import { useAuth } from '@/features/auth/use-auth';
import { tokens } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc email.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      await login({ phoneNumber: trimmedPhone, password });
      router.replace('/(patient)');
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Đăng nhập không thành công. Vui lòng thử lại.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen} testID="login-screen">
      <View style={styles.card}>
        <BrandHeader
          title="Cổng Bệnh Nhân"
          subtitle="Đăng nhập bằng tài khoản bệnh nhân để quản lý hồ sơ, lịch khám và viện phí"
          logoSize={56}
          align="center"
        />

        {errorMessage ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText} testID="login-error">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Số điện thoại hoặc Email</Text>
          <TextInput
            testID="login-identifier-input"
            accessibilityLabel="Số điện thoại hoặc Email"
            style={styles.input}
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              if (errorMessage) setErrorMessage(null);
            }}
            autoCapitalize="none"
            keyboardType="phone-pad"
            placeholder="Nhập số điện thoại hoặc email"
            placeholderTextColor={tokens.colors.textMuted}
            editable={!submitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.passwordHeader}>
            <Text style={styles.label}>Mật khẩu</Text>
            <Pressable
              testID="login-forgot-password-link"
              onPress={() => router.push('/(auth)/forgot-password' as any)}
              disabled={submitting}
              style={styles.minTouchTarget}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </Pressable>
          </View>
          <TextInput
            testID="login-password-input"
            accessibilityLabel="Mật khẩu"
            style={styles.input}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errorMessage) setErrorMessage(null);
            }}
            secureTextEntry
            placeholder="Nhập mật khẩu"
            placeholderTextColor={tokens.colors.textMuted}
            editable={!submitting}
          />
        </View>

        <Pressable
          testID="login-submit-button"
          accessibilityRole="button"
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={tokens.colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>

        <Pressable
          testID="login-register-link"
          style={styles.registerLink}
          onPress={() => router.push('/(auth)/register' as any)}
          disabled={submitting}
        >
          <Text style={styles.registerLinkText}>
            Chưa có tài khoản? <Text style={styles.linkHighlight}>Đăng ký ngay</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  minTouchTarget: {
    minHeight: 32,
    justifyContent: 'center',
  },
  forgotPasswordText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.primary,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: tokens.spacing.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  registerLinkText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
  },
  linkHighlight: {
    color: tokens.colors.primary,
    fontWeight: '700',
  },
});
