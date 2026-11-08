import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/use-auth';
import { tokens } from '@/theme/tokens';

export default function IndexGateScreen() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.container} accessibilityRole="progressbar">
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <Text style={styles.text}>Đang kiểm tra phiên đăng nhập...</Text>
      </View>
    );
  }

  if (status === 'signedIn' && user?.role === 'ROLE_PATIENT') {
    return <Redirect href="/(patient)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.xl,
  },
  text: {
    marginTop: tokens.spacing.md,
    fontSize: tokens.typography.body,
    color: tokens.colors.textSecondary,
  },
});
