export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigError';
  }
}

export function getApiBaseUrl(rawUrl: string | undefined = process.env.EXPO_PUBLIC_API_URL): string {
  let target = rawUrl?.trim() ?? '';

  // Khi chạy trên Web (trình duyệt)
  if (typeof window !== 'undefined' && window.location?.hostname) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      target = 'http://localhost:8080';
    } else if (!target) {
      target = `http://${window.location.hostname}:8080`;
    }
  }

  if (!target) {
    throw new ApiConfigError(
      'Thiếu cấu hình EXPO_PUBLIC_API_URL. Vui lòng khai báo địa chỉ máy chủ API trong tệp .env.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new ApiConfigError(
      'Địa chỉ EXPO_PUBLIC_API_URL không hợp lệ. Vui lòng nhập URL đầy đủ (http:// hoặc https://).'
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ApiConfigError(
      'Giao thức EXPO_PUBLIC_API_URL không hợp lệ. Chỉ chấp nhận http:// hoặc https://.'
    );
  }

  return target.replace(/\/+$/, '');
}
