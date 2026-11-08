import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { recordsApi, RecordsApi } from '@/features/records/records.api';
import { MedicalRecord } from '@/features/records/records.types';
import { ApiClientError } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';

export interface MedicalRecordDetailScreenProps {
  recordIdOverride?: string;
  service?: RecordsApi;
}

const MISSING_CLINICAL_TEXT = 'Chưa có dữ liệu ghi nhận';

function displayValue(value?: string | null): string {
  if (!value || !value.trim()) {
    return MISSING_CLINICAL_TEXT;
  }
  return value.trim();
}

export default function MedicalRecordDetailScreen({
  recordIdOverride,
  service = recordsApi,
}: MedicalRecordDetailScreenProps) {
  const params = useLocalSearchParams<{ recordId?: string }>();
  const recordId = recordIdOverride ?? params.recordId ?? '';

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await service.getRecord(recordId);
      setRecord(data);
    } catch (err) {
      setRecord(null);
      if (err instanceof ApiClientError && (err.status === 403 || err.status === 404)) {
        setErrorMessage('Bạn không có quyền truy cập hoặc bệnh án không tồn tại.');
      } else {
        setErrorMessage(
          err instanceof Error && err.message
            ? err.message
            : 'Không thể tải thông tin bệnh án.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [recordId, service]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  if (loading) {
    return (
      <View style={styles.center} testID="record-detail-loading">
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  if (errorMessage || !record) {
    return (
      <View style={styles.center} testID="record-detail-error">
        <Text style={styles.errorText}>
          {errorMessage ?? 'Không tìm thấy bệnh án.'}
        </Text>
      </View>
    );
  }

  const isPendingExam =
    record.state === 'WAITING' ||
    record.state === 'IN_PROGRESS' ||
    record.state === 'PENDING_TESTS';

  const tests = Array.isArray(record.tests) ? record.tests : [];
  const prescriptionItems =
    record.prescription && Array.isArray(record.prescription.items)
      ? record.prescription.items
      : [];

  return (
    <ScrollView style={styles.screen} testID="record-detail-screen">
      <Text style={styles.title}>Chi tiết bệnh án</Text>

      {isPendingExam ? (
        <View style={styles.pendingBanner} testID="record-pending-state-banner">
          <Text style={styles.pendingBannerText}>
            Hồ sơ khám đang được bác sĩ thực hiện hoặc chờ kết quả cận lâm sàng ({record.state}).
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Thông tin khám lâm sàng</Text>
        <Text style={styles.rowText} testID="record-detail-symptoms">
          Triệu chứng: {displayValue(record.symptoms)}
        </Text>
        <Text style={styles.rowText} testID="record-detail-initial-diagnosis">
          Chẩn đoán ban đầu: {displayValue(record.initialDiagnosis)}
        </Text>
        <Text style={styles.rowText} testID="record-detail-final-diagnosis">
          Chẩn đoán xác định: {displayValue(record.finalDiagnosis)}
        </Text>
        <Text style={styles.rowText} testID="record-detail-treatment-plan">
          Hướng điều trị: {displayValue(record.treatmentPlan)}
        </Text>
        <Text style={styles.rowText} testID="record-detail-reexam-date">
          Ngày hẹn tái khám: {displayValue(record.reExaminationDate)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Kết quả cận lâm sàng / Xét nghiệm</Text>
        {tests.length === 0 ? (
          <Text style={styles.emptyText} testID="record-detail-tests-empty">
            {MISSING_CLINICAL_TEXT}
          </Text>
        ) : (
          tests.map((t) => (
            <View key={t.testId} style={styles.subItem} testID={`record-test-${t.testId}`}>
              <Text style={styles.subTitle}>{t.serviceName}</Text>
              <Text style={styles.rowText}>
                Trạng thái: {displayValue(t.state)}
              </Text>
              <Text style={styles.rowText} testID={`record-test-result-${t.testId}`}>
                Kết luận: {displayValue(t.testResult)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Đơn thuốc & Dặn dò của bác sĩ</Text>
        <Text style={styles.rowText} testID="record-detail-doctor-notes">
          Lời dặn bác sĩ: {displayValue(record.prescription?.doctorNotes)}
        </Text>
        {prescriptionItems.length === 0 ? (
          <Text style={styles.emptyText} testID="record-detail-prescription-empty">
            {MISSING_CLINICAL_TEXT}
          </Text>
        ) : (
          prescriptionItems.map((item, idx) => (
            <View
              key={`${item.medicineName}-${idx}`}
              style={styles.subItem}
              testID={`record-prescription-item-${idx}`}
            >
              <Text style={styles.subTitle}>
                {item.medicineName} ({item.quantity ?? 0} {item.unit ?? ''})
              </Text>
              <Text style={styles.rowText}>
                Hướng dẫn dùng: {displayValue(item.dosageInstruction)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
  pendingBanner: {
    backgroundColor: tokens.colors.warningBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
  },
  pendingBannerText: {
    color: tokens.colors.warning,
    fontWeight: '600',
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.sm,
  },
  rowText: {
    fontSize: tokens.typography.body,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.xs,
  },
  emptyText: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    fontStyle: 'italic',
  },
  subItem: {
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    paddingTop: tokens.spacing.xs,
    marginTop: tokens.spacing.xs,
  },
  subTitle: {
    fontWeight: '600',
    color: tokens.colors.textPrimary,
  },
  errorText: {
    color: tokens.colors.danger,
  },
});

