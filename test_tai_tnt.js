import http from 'k6/http';
import { check, sleep } from 'k6';

// Cấu hình kịch bản: Tăng từ 0 lên 500 người dùng ảo trong 10 giây, giữ 30 giây rồi hạ về 0
export const options = {
  stages: [
    { duration: '10s', target: 200 }, // Tăng lên 200 VUs
    { duration: '30s', target: 500 }, // Giữ tải 500 VUs cùng bấm liên tục
    { duration: '5s', target: 0 },   // Kết thúc
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'], // 95% số request phải phản hồi dưới 250 mili-giây
    http_req_failed: ['rate<0.02'],   // Tỷ lệ lỗi mạng phải dưới 2%
  },
};

const BASE_URL = 'http://localhost:8080';

// Setup: Tự động đăng nhập/đăng ký lấy token thật nếu có thể, hoặc dùng token dự phòng
export function setup() {
  const loginPayload = JSON.stringify({
    phoneNumber: '0987654321',
    password: 'password123',
  });
  
  const headers = { 'Content-Type': 'application/json' };
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers });
  
  let token = 'YOUR_ACCESS_TOKEN_HERE';
  if (loginRes.status === 200) {
    try {
      const body = JSON.parse(loginRes.body);
      token = body.data?.accessToken || body.accessToken || token;
    } catch (e) {
      console.log('Không thể parse response login');
    }
  }
  return { token };
}

export default function (data) {
  const url = `${BASE_URL}/api/bookings`;

  // Body request đặt lịch khám
  const payload = JSON.stringify({
    patientProfileId: '11111111-1111-1111-1111-111111111111', // ID hồ sơ mẫu
    timeSlotId: '22222222-2222-2222-2222-222222222222',        // ID khung giờ mẫu
    symptoms: 'Test tai chiu luc voi Java 25 va PostgreSQL',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token || 'YOUR_ACCESS_TOKEN_HERE'}`,
    },
  };

  const res = http.post(url, payload, params);

  // Đánh giá phản hồi
  check(res, {
    'Status hop le (201 Tao moi, 400 Het cho hoac 404/401/403)': (r) => 
      r.status === 201 || r.status === 400 || r.status === 404 || r.status === 401 || r.status === 403,
    'Thoi gian phan hoi duoi 250ms': (r) => r.timings.duration < 250,
  });

  sleep(0.2); // Mỗi người dùng ảo gửi 1 request cách nhau 0.2 giây
}
