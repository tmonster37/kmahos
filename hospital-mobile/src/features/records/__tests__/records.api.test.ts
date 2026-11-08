import { AxiosInstance } from 'axios';
import { createRecordsApi } from '../records.api';
import { ApiClientError } from '@/lib/api/types';

describe('records.api', () => {
  it('deniesForeignProfileRecordRead', async () => {
    const mockClient = {
      get: jest
        .fn()
        .mockRejectedValue(
          new ApiClientError('Bạn không có quyền truy cập bệnh án của hồ sơ khác.', 403)
        ),
    } as unknown as AxiosInstance;

    const api = createRecordsApi(mockClient);

    await expect(api.listRecordsForProfile('foreign-profile-999')).rejects.toMatchObject({
      status: 403,
      message: 'Bạn không có quyền truy cập bệnh án của hồ sơ khác.',
    });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/api/clinical/patients/foreign-profile-999/records'
    );

    await expect(api.getRecord('foreign-record-888')).rejects.toMatchObject({
      status: 403,
    });
    expect(mockClient.get).toHaveBeenCalledWith(
      '/api/clinical/records/foreign-record-888'
    );
  });
});

