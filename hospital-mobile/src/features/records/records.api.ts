import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { MedicalRecord } from './records.types';

export interface RecordsApi {
  listRecordsForProfile(profileId: string): Promise<MedicalRecord[]>;
  getRecord(recordId: string): Promise<MedicalRecord>;
}

export function createRecordsApi(client: AxiosInstance = apiClient): RecordsApi {
  return {
    async listRecordsForProfile(profileId: string): Promise<MedicalRecord[]> {
      const cleanProfileId = profileId.trim();
      if (!cleanProfileId) {
        throw new Error('Mã hồ sơ bệnh nhân không hợp lệ.');
      }
      const data = (await client.get(
        `/api/clinical/patients/${encodeURIComponent(cleanProfileId)}/records`
      )) as unknown as MedicalRecord[];
      return Array.isArray(data) ? data : [];
    },

    async getRecord(recordId: string): Promise<MedicalRecord> {
      const cleanRecordId = recordId.trim();
      if (!cleanRecordId) {
        throw new Error('Mã bệnh án không hợp lệ.');
      }
      return (await client.get(
        `/api/clinical/records/${encodeURIComponent(cleanRecordId)}`
      )) as unknown as MedicalRecord;
    },
  };
}

export const recordsApi = createRecordsApi();

