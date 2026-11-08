import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { useAuth } from '@/features/auth/use-auth';
import { tokens } from '@/theme/tokens';

export default function PatientHomeShellScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
      testID="patient-app-shell"
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BrandLogo size={36} />
          <View style={styles.brandTextGroup}>
            <Text style={styles.brandTitle}>TNT HOSPITAL</Text>
            <Text style={styles.brandSubtitle}>Bệnh viện Đa khoa Quốc tế TNT</Text>
          </View>
        </View>
        <Text style={styles.welcomeTitle}>Cổng Bệnh Nhân</Text>
        <Text style={styles.subtitle} testID="patient-welcome-name">
          Xin chào, {user?.fullName ?? 'Bệnh nhân'}
        </Text>
      </View>

      <View style={styles.menuGrid}>
        <Pressable
          testID="nav-profiles-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
          onPress={() => router.push('/(patient)/profiles' as never)}
        >
          <View style={styles.menuCardHeader}>
            <View style={[styles.menuIconBadge, { backgroundColor: tokens.colors.primaryLight }]}>
              <Text style={[styles.menuIconText, { color: tokens.colors.primary }]}>👤</Text>
            </View>
            <View style={styles.menuTextContent}>
              <Text style={styles.menuTitle}>Hồ sơ gia đình</Text>
              <Text style={styles.menuDesc}>Quản lý hồ sơ bệnh nhân của bạn và người thân</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          testID="nav-booking-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
          onPress={() => router.push('/(patient)/booking' as never)}
        >
          <View style={styles.menuCardHeader}>
            <View style={[styles.menuIconBadge, { backgroundColor: tokens.colors.infoBg }]}>
              <Text style={[styles.menuIconText, { color: tokens.colors.info }]}>📅</Text>
            </View>
            <View style={styles.menuTextContent}>
              <Text style={styles.menuTitle}>Đặt lịch khám</Text>
              <Text style={styles.menuDesc}>Chọn chuyên khoa, bác sĩ và khung giờ khám</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          testID="nav-appointments-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
          onPress={() => router.push('/(patient)/appointments' as never)}
        >
          <View style={styles.menuCardHeader}>
            <View style={[styles.menuIconBadge, { backgroundColor: tokens.colors.warningBg }]}>
              <Text style={[styles.menuIconText, { color: tokens.colors.warning }]}>⏱️</Text>
            </View>
            <View style={styles.menuTextContent}>
              <Text style={styles.menuTitle}>Lịch sử & Theo dõi lượt khám</Text>
              <Text style={styles.menuDesc}>Xem trạng thái đặt lịch, check-in và số thứ tự khám</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          testID="nav-records-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
          onPress={() => router.push('/(patient)/records' as never)}
        >
          <View style={styles.menuCardHeader}>
            <View style={[styles.menuIconBadge, { backgroundColor: tokens.colors.successBg }]}>
              <Text style={[styles.menuIconText, { color: tokens.colors.success }]}>📋</Text>
            </View>
            <View style={styles.menuTextContent}>
              <Text style={styles.menuTitle}>Hồ sơ bệnh án điện tử</Text>
              <Text style={styles.menuDesc}>Tra cứu chẩn đoán, kết quả xét nghiệm và đơn thuốc</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          testID="nav-bills-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
          onPress={() => router.push('/(patient)/bills' as never)}
        >
          <View style={styles.menuCardHeader}>
            <View style={[styles.menuIconBadge, { backgroundColor: tokens.colors.primaryLight }]}>
              <Text style={[styles.menuIconText, { color: tokens.colors.primary }]}>💳</Text>
            </View>
            <View style={styles.menuTextContent}>
              <Text style={styles.menuTitle}>Viện phí & Thanh toán</Text>
              <Text style={styles.menuDesc}>Thanh toán hóa đơn VietQR / PayOS và xem lịch sử giao dịch</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          testID="nav-notifications-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
          onPress={() => router.push('/(patient)/notifications' as never)}
        >
          <View style={styles.menuCardHeader}>
            <View style={[styles.menuIconBadge, { backgroundColor: tokens.colors.accentLight }]}>
              <Text style={[styles.menuIconText, { color: tokens.colors.accent }]}>🔔</Text>
            </View>
            <View style={styles.menuTextContent}>
              <Text style={styles.menuTitle}>Hộp thư thông báo</Text>
              <Text style={styles.menuDesc}>Theo dõi thông báo lịch khám và điều phối</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <Pressable
        testID="patient-logout-button"
        accessibilityRole="button"
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        onPress={() => {
          void logout();
        }}
      >
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scrollContent: {
    padding: tokens.spacing.xl,
    paddingTop: tokens.spacing.xxl,
    paddingBottom: tokens.spacing.xxl,
  },
  header: {
    marginBottom: tokens.spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  brandTextGroup: {
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: tokens.typography.caption,
    fontWeight: '800',
    color: tokens.colors.primary,
    letterSpacing: 1.2,
  },
  brandSubtitle: {
    fontSize: tokens.typography.small,
    color: tokens.colors.textMuted,
  },
  welcomeTitle: {
    fontSize: tokens.typography.title,
    fontWeight: '800',
    color: tokens.colors.primaryDark,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.typography.body,
    color: tokens.colors.textSecondary,
    fontWeight: '500',
  },
  menuGrid: {
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
  },
  menuCard: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    shadowColor: tokens.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    minHeight: 72,
    justifyContent: 'center',
  },
  menuCardPressed: {
    backgroundColor: tokens.colors.hoverBg,
    borderColor: tokens.colors.primaryBorder,
  },
  menuCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  menuIconBadge: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconText: {
    fontSize: 20,
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: tokens.colors.dangerBg,
    borderRadius: tokens.radius.button,
    borderColor: tokens.colors.dangerBorder,
    borderWidth: 1,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  logoutButtonPressed: {
    opacity: 0.8,
  },
  logoutText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
});
