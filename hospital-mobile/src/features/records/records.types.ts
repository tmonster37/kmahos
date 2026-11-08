export type MedicalExamState =
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'PENDING_TESTS'
  | 'COMPLETED'
  | string;

export type MedicalTestState =
  | 'WAITING'
  | 'SAMPLE_COLLECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | string;

export interface TestResultItem {
  parameterName?: string | null;
  resultValue?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
  isAbnormal?: boolean | null;
}

export interface MedicalTest {
  testId: string;
  testCode?: string | null;
  serviceName: string;
  price?: number | null;
  testResult?: string | null;
  resultFileUrl?: string | null;
  state?: MedicalTestState | null;
  specimenType?: string | null;
  specimenBarcode?: string | null;
  resultItems?: TestResultItem[] | null;
  isPaid?: boolean | null;
  paymentStatus?: string | null;
}

export interface PrescriptionItem {
  medicineName: string;
  unit?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  morningAmount?: number | null;
  noonAmount?: number | null;
  afternoonAmount?: number | null;
  eveningAmount?: number | null;
  dosageInstruction?: string | null;
}

export interface Prescription {
  prescriptionId: string;
  prescriptionCode?: string | null;
  totalAmount?: number | null;
  doctorNotes?: string | null;
  items?: PrescriptionItem[] | null;
}

export interface MedicalRecord {
  recordId: string;
  bookingCode?: string | null;
  patientProfileId?: string | null;
  patientName?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  symptoms?: string | null;
  initialDiagnosis?: string | null;
  finalDiagnosis?: string | null;
  treatmentPlan?: string | null;
  reExaminationDate?: string | null;
  state?: MedicalExamState | null;
  tests?: MedicalTest[] | null;
  prescription?: Prescription | null;
  completedAt?: string | null;
  isLocked?: boolean | null;
  addendumCount?: number | null;
}

