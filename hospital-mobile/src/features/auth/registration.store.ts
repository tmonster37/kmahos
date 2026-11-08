export interface PendingRegistration {
  fullName: string;
  phoneNumber: string;
  email?: string;
  password: string;
}

export interface PendingRecovery {
  phoneNumber?: string;
  email?: string;
}

let pendingRegistration: PendingRegistration | null = null;
let pendingRecovery: PendingRecovery | null = null;

export const authFlowStore = {
  setPendingRegistration(data: PendingRegistration | null) {
    pendingRegistration = data;
  },
  getPendingRegistration(): PendingRegistration | null {
    return pendingRegistration;
  },
  setPendingRecovery(data: PendingRecovery | null) {
    pendingRecovery = data;
  },
  getPendingRecovery(): PendingRecovery | null {
    return pendingRecovery;
  },
  clear() {
    pendingRegistration = null;
    pendingRecovery = null;
  },
};

