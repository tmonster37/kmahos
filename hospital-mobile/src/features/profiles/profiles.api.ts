import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { PatientProfile, PatientProfileRequest } from './profiles.types';

export interface ProfilesApi {
  listMyProfiles(): Promise<PatientProfile[]>;
  createProfile(input: PatientProfileRequest): Promise<PatientProfile>;
  updateProfile(profileId: string, input: PatientProfileRequest): Promise<PatientProfile>;
  deleteProfile(profileId: string): Promise<void>;
}

function validateProfileId(profileId: string): string {
  const trimmed = profileId.trim();
  if (!trimmed) {
    throw new Error('Mã hồ sơ bệnh nhân không hợp lệ.');
  }
  return trimmed;
}

export function createProfilesApi(client: AxiosInstance = apiClient): ProfilesApi {
  return {
    async listMyProfiles(): Promise<PatientProfile[]> {
      const data = (await client.get('/api/patient-profiles')) as unknown as PatientProfile[];
      return Array.isArray(data) ? data : [];
    },

    async createProfile(input: PatientProfileRequest): Promise<PatientProfile> {
      const payload: PatientProfileRequest = {
        ...input,
        fullName: input.fullName.trim(),
        dateOfBirth: input.dateOfBirth.trim(),
        relationship: input.relationship?.trim() || 'SELF',
      };
      return (await client.post('/api/patient-profiles', payload)) as unknown as PatientProfile;
    },

    async updateProfile(profileId: string, input: PatientProfileRequest): Promise<PatientProfile> {
      const safeId = validateProfileId(profileId);
      const payload: PatientProfileRequest = {
        ...input,
        fullName: input.fullName.trim(),
        dateOfBirth: input.dateOfBirth.trim(),
        relationship: input.relationship?.trim() || 'SELF',
      };
      return (await client.put(
        `/api/patient-profiles/${encodeURIComponent(safeId)}`,
        payload
      )) as unknown as PatientProfile;
    },

    async deleteProfile(profileId: string): Promise<void> {
      const safeId = validateProfileId(profileId);
      await client.delete(`/api/patient-profiles/${encodeURIComponent(safeId)}`);
    },
  };
}

export const profilesApi = createProfilesApi();

