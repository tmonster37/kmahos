export interface ApiResponse<T> {
  code?: number;
  success?: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code?: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}
