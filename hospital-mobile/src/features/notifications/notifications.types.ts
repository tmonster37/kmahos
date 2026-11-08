export interface PatientNotification {
  notificationId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

