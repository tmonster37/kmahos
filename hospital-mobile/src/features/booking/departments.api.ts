import { AxiosInstance } from 'axios';
import { apiClient } from '@/lib/api/client';
import { Department } from './booking.types';

export interface DepartmentsApi {
  listDepartments(): Promise<Department[]>;
}

export function createDepartmentsApi(client: AxiosInstance = apiClient): DepartmentsApi {
  return {
    async listDepartments(): Promise<Department[]> {
      const data = (await client.get('/api/departments')) as unknown as Department[];
      if (!Array.isArray(data)) {
        return [];
      }
      return data.filter((dept) => dept.isActive !== false);
    },
  };
}

export const departmentsApi = createDepartmentsApi();

