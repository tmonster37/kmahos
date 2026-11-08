export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface PatientProfile {
  patientProfileId: string;
  fullName: string;
  phoneNumber?: string | null;
  identityNumber?: string | null;
  healthInsuranceNumber?: string | null;
  gender: Gender;
  dateOfBirth: string;
  streetAddress?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  isLinked: boolean;
  relationship: string;
}

export interface PatientProfileRequest {
  fullName: string;
  phoneNumber?: string;
  identityNumber?: string;
  healthInsuranceNumber?: string;
  gender: Gender;
  dateOfBirth: string;
  streetAddress?: string;
  province?: string;
  district?: string;
  ward?: string;
  relationship?: string;
}

