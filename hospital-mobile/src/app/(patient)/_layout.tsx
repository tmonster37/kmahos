import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Redirect, Slot, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/features/auth/use-auth';
import { resolveSafeNotificationRoute } from '@/features/notifications/push-registration';
import { tokens } from '@/theme/tokens';

export default function PatientProtectedLayout() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web' || status !== 'signedIn') {
      return;
    }

    try {
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data;
        const targetRoute = resolveSafeNotificationRoute(data);
        router.push(targetRoute as any);
      });

      return () => {
        subscription.remove();
      };
    } catch {
      // Safe no-op on platforms without notification listener support
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <View style={styles.loading} testID="patient-layout-loading">
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  if (status !== 'signedIn' || !user || user.role !== 'ROLE_PATIENT') {
    return <Redirect href="/(auth)/login" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.background,
  },
});

