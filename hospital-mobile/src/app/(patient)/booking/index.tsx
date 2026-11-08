import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await api.listDepartments();
        if (active) setDepartments(list);
      } catch (err) {
        if (active) {
          setErrorMessage(
            err instanceof Error && err.message
              ? err.message
              : 'Không thể tải danh sách chuyên khoa.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [api]);

  return (
    <ScrollView style={styles.screen} testID="booking-departments-screen">
      <Text style={styles.title}>Chọn chuyên khoa khám</Text>

      {loading ? (
        <View style={styles.stateBox} testID="departments-loading">
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox} testID="departments-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
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
            style={styles.card}
            onPress={() => router.push(`/(patient)/booking/${dept.departmentId}` as never)}
          >
            <Text style={styles.deptName}>{dept.departmentName}</Text>
            {dept.description ? <Text style={styles.deptDesc}>{dept.description}</Text> : null}
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
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
  stateBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  stateText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.body,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
  },
  errorText: {
    color: tokens.colors.danger,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.sm,
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
  },
});

