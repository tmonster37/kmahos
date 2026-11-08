import React from 'react';
import { render } from '@testing-library/react-native';
import MedicalRecordDetailScreen from '@/app/(patient)/records/[recordId]';
import { RecordsApi } from '../records.api';
import { MedicalRecord } from '../records.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ recordId: 'rec-001' }),
}));

describe('record-screens', () => {
  it('rendersEmptyRecordWithoutFallback', async () => {
    const emptyRecord: MedicalRecord = {
      recordId: 'rec-empty-001',
      bookingCode: 'BK-EMPTY-1',
      state: 'COMPLETED',
      symptoms: null,
      initialDiagnosis: null,
      finalDiagnosis: null,
      treatmentPlan: null,
      reExaminationDate: null,
      tests: [],
      prescription: null,
    };

    const mockService: RecordsApi = {
      listRecordsForProfile: jest.fn(),
      getRecord: jest.fn().mockResolvedValue(emptyRecord),
    };

    const { findByTestId, getByTestId } = render(
      <MedicalRecordDetailScreen recordIdOverride="rec-empty-001" service={mockService} />
    );

    await findByTestId('record-detail-screen');
    expect(getByTestId('record-detail-symptoms').props.children).toContain(
      'Chưa có dữ liệu ghi nhận'
    );
    expect(getByTestId('record-detail-initial-diagnosis').props.children).toContain(
      'Chưa có dữ liệu ghi nhận'
    );
    expect(getByTestId('record-detail-final-diagnosis').props.children).toContain(
      'Chưa có dữ liệu ghi nhận'
    );
    expect(getByTestId('record-detail-treatment-plan').props.children).toContain(
      'Chưa có dữ liệu ghi nhận'
    );
    expect(getByTestId('record-detail-tests-empty').props.children).toBe(
      'Chưa có dữ liệu ghi nhận'
    );
    expect(getByTestId('record-detail-prescription-empty').props.children).toBe(
      'Chưa có dữ liệu ghi nhận'
    );
  });

  it('showsPendingRecordState', async () => {
    const pendingRecord: MedicalRecord = {
      recordId: 'rec-pending-002',
      bookingCode: 'BK-PEND-2',
      state: 'PENDING_TESTS',
      symptoms: 'Ho khan 3 ngày',
      initialDiagnosis: 'Theo dõi viêm họng cấp',
      finalDiagnosis: null,
      treatmentPlan: null,
      tests: [
        {
          testId: 'test-101',
          serviceName: 'Tổng phân tích tế bào máu',
          state: 'IN_PROGRESS',
          testResult: null,
        },
      ],
      prescription: null,
    };

    const mockService: RecordsApi = {
      listRecordsForProfile: jest.fn(),
      getRecord: jest.fn().mockResolvedValue(pendingRecord),
    };

    const { findByTestId, getByTestId } = render(
      <MedicalRecordDetailScreen recordIdOverride="rec-pending-002" service={mockService} />
    );

    const pendingBanner = await findByTestId('record-pending-state-banner');
    expect(pendingBanner).toBeTruthy();
    expect(getByTestId('record-test-result-test-101').props.children).toContain(
      'Chưa có dữ liệu ghi nhận'
    );
  });
});

