import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Department } from '@/features/booking/booking.types';
import { departmentsApi, DepartmentsApi } from '@/features/booking/departments.api';
import { tokens } from '@/theme/tokens';

export interface BookingDepartmentsScreenProps {
  api?: DepartmentsApi;
}

export default function BookingDepartmentsScreen({
  api = departmentsApi,
}: BookingDepartmentsScreenProps) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await api.listDepartments();
      setDepartments(list);
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Không thể tải danh sách chuyên khoa.'
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void fetchDepartments();
  }, [fetchDepartments]);

  return (
    <ScrollView style={styles.screen} testID="booking-departments-screen">
      <View style={styles.stepHeader}>
        <Text style={styles.stepBadge}>Bước 1 / 3</Text>
        <Text style={styles.stepSubtext}>Quy trình đặt khám</Text>
      </View>
      <Text style={styles.title}>Chọn chuyên khoa khám</Text>

      {loading ? (
        <View style={styles.stateBox} testID="departments-loading">
          <ActivityIndicator color={tokens.colors.primary} size="large" />
          <Text style={styles.loadingText}>Đang tải danh sách chuyên khoa...</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox} testID="departments-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            testID="departments-retry-button"
            style={styles.retryBtn}
            onPress={() => void fetchDepartments()}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !errorMessage && departments.length === 0 ? (
        <View style={styles.stateBox} testID="departments-empty">
          <Text style={styles.stateText}>Chưa có chuyên khoa hoạt động.</Text>
        </View>
      ) : null}

      {!loading &&
        departments.map((dept) => (
          <Pressable
            key={dept.departmentId}
            testID={`department-item-${dept.departmentId}`}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/(patient)/booking/${dept.departmentId}` as never)}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.deptIconBadge}>
                <Text style={styles.deptIconText}>🏥</Text>
              </View>
              <View style={styles.deptTextContent}>
                <Text style={styles.deptName}>{dept.departmentName}</Text>
                {dept.description ? <Text style={styles.deptDesc}>{dept.description}</Text> : null}
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </View>
          </Pressable>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  stepBadge: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
    color: tokens.colors.primary,
    backgroundColor: tokens.colors.primaryLight,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
  },
  stepSubtext: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textMuted,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '800',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
  stateBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    marginTop: tokens.spacing.md,
  },
  loadingText: {
    marginTop: tokens.spacing.sm,
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.caption,
  },
  stateText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.body,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
    marginBottom: tokens.spacing.sm,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.spacing.md,
    minHeight: 44,
    minWidth: 88,
    borderRadius: tokens.radius.button,
    borderWidth: 1,
    borderColor: tokens.colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: tokens.colors.danger,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.sm,
    minHeight: 64,
    justifyContent: 'center',
  },
  cardPressed: {
    backgroundColor: tokens.colors.hoverBg,
    borderColor: tokens.colors.primaryBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  deptIconBadge: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptIconText: {
    fontSize: 18,
  },
  deptTextContent: {
    flex: 1,
  },
  deptName: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.textPrimary,
  },
  deptDesc: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.xs,
    lineHeight: 18,
  },
  cardArrow: {
    fontSize: 24,
    color: tokens.colors.textMuted,
    fontWeight: '300',
  },
});

