import React, { useCallback, useEffect, useState } from 'react';
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
import { Schedule } from '@/features/booking/booking.types';
import { getDeviceLocalToday, schedulesApi, SchedulesApi } from '@/features/booking/schedules.api';
import { tokens } from '@/theme/tokens';

export interface DepartmentSchedulesScreenProps {
  api?: SchedulesApi;
  departmentIdOverride?: number;
  initialDate?: string;
}

export default function DepartmentSchedulesScreen({
  api = schedulesApi,
  departmentIdOverride,
  initialDate,
}: DepartmentSchedulesScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ departmentId?: string }>();
  const deptId = departmentIdOverride ?? Number(params.departmentId ?? 0);

  const [selectedDate, setSelectedDate] = useState(() => initialDate ?? getDeviceLocalToday());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await api.listSchedules(deptId, selectedDate);
      setSchedules(list);
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message ? err.message : 'Không thể tải lịch trực bác sĩ.'
      );
    } finally {
      setLoading(false);
    }
  }, [api, deptId, selectedDate]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  return (
    <ScrollView style={styles.screen} testID="department-schedules-screen">
      <View style={styles.stepHeader}>
        <Text style={styles.stepBadge}>Bước 2 / 3</Text>
        <Text style={styles.stepSubtext}>Quy trình đặt khám</Text>
      </View>
      <Text style={styles.title}>Chọn lịch khám & khung giờ</Text>

      <View style={styles.dateRow}>
        <TextInput
          testID="schedule-date-input"
          style={styles.dateInput}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD"
        />
        <Pressable
          testID="schedule-refresh-button"
          style={styles.refreshBtn}
          onPress={() => void loadSchedules()}
        >
          <Text style={styles.refreshText}>Tải lịch</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.stateBox} testID="schedules-loading">
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox} testID="schedules-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!loading && !errorMessage && schedules.length === 0 ? (
        <View style={styles.stateBox} testID="schedules-empty">
          <Text style={styles.stateText}>Chưa có lịch trực khả dụng cho ngày này.</Text>
        </View>
      ) : null}

      {!loading &&
        schedules.map((schedule) => (
          <View
            key={schedule.scheduleId}
            style={styles.card}
            testID={`schedule-card-${schedule.scheduleId}`}
          >
            <Text style={styles.doctorName}>
              {schedule.degree ? `${schedule.degree} ` : ''}
              {schedule.doctorName}
            </Text>
            <Text style={styles.meta}>
              Ca trực: {schedule.session} • Phòng: {schedule.roomName ?? 'Chưa có dữ liệu'}
            </Text>

            {schedule.timeSlots.length === 0 ? (
              <Text style={styles.noSlotText} testID={`schedule-no-slots-${schedule.scheduleId}`}>
                Hết khung giờ trống
              </Text>
            ) : (
              <View style={styles.slotGrid}>
                {schedule.timeSlots.map((slot) => (
                  <Pressable
                    key={slot.timeSlotId}
                    testID={`slot-button-${slot.timeSlotId}`}
                    style={styles.slotChip}
                    onPress={() =>
                      router.push(`/(patient)/booking/slot/${slot.timeSlotId}` as never)
                    }
                  >
                    <Text style={styles.slotText}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
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
  dateRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  dateInput: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    minHeight: 44,
  },
  refreshBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.lg,
    justifyContent: 'center',
    minHeight: 44,
  },
  refreshText: {
    color: tokens.colors.surface,
    fontWeight: '600',
  },
  stateBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  stateText: {
    color: tokens.colors.textSecondary,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
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
    marginBottom: tokens.spacing.md,
  },
  doctorName: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.textPrimary,
  },
  meta: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginTop: 2,
    marginBottom: tokens.spacing.sm,
  },
  noSlotText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textMuted,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  slotChip: {
    backgroundColor: tokens.colors.primaryLight,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    minHeight: 44,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {
    color: tokens.colors.primaryDark,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
});

