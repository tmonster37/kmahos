import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MedicalRecord } from '../records.types';
import { tokens } from '@/theme/tokens';

export interface RecordSummaryCardProps {
  record: MedicalRecord;
  onPress: (recordId: string) => void;
}

const MISSING_CLINICAL_TEXT = 'Chưa có dữ liệu ghi nhận';

export function RecordSummaryCard({ record, onPress }: RecordSummaryCardProps) {
  const diagnosisText =
    record.finalDiagnosis && record.finalDiagnosis.trim()
      ? record.finalDiagnosis.trim()
      : record.initialDiagnosis && record.initialDiagnosis.trim()
        ? record.initialDiagnosis.trim()
        : MISSING_CLINICAL_TEXT;

  const stateLabel =
    record.state === 'COMPLETED'
      ? 'Đã hoàn tất khám'
      : record.state === 'IN_PROGRESS' || record.state === 'PENDING_TESTS'
        ? 'Đang trong quá trình khám / chờ kết quả'
        : record.state || MISSING_CLINICAL_TEXT;

  return (
    <Pressable
      testID={`record-card-${record.recordId}`}
      style={styles.card}
      onPress={() => onPress(record.recordId)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.code}>
          {record.bookingCode && record.bookingCode.trim()
            ? `Phiếu khám ${record.bookingCode}`
            : `Bệnh án #${record.recordId}`}
        </Text>
        <Text style={styles.state} testID={`record-state-${record.recordId}`}>
          {stateLabel}
        </Text>
      </View>

      <Text style={styles.meta}>
        Bác sĩ: {record.doctorName && record.doctorName.trim() ? record.doctorName : MISSING_CLINICAL_TEXT}
      </Text>
      <Text style={styles.meta} testID={`record-diagnosis-${record.recordId}`}>
        Chẩn đoán: {diagnosisText}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.xs,
  },
  code: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.textPrimary,
  },
  state: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    color: tokens.colors.primaryDark,
  },
  meta: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
});

