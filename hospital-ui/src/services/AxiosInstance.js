import axios from "axios";

const API_BASE_URL =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env && process.env.REACT_APP_BASE_URL) ||
    "http://localhost:8080";

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor: Tự động đính kèm JWT Token vào Header
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Chuẩn hóa thông báo lỗi tiếng Việt & xử lý phiên đăng nhập
axiosInstance.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error.response?.status;
        const serverMessage = error.response?.data?.message || error.response?.data?.error;

        if (status === 401) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
            
            // Lưu lại đường dẫn hiện tại để sau khi đăng nhập có thể quay lại đúng trang đang làm việc
            if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
                const currentPath = window.location.pathname + window.location.search;
                sessionStorage.setItem("redirectUrl", currentPath);
                window.location.href = "/login?expired=true";
            }
        }

        // Tạo thông báo lỗi tiếng Việt thân thiện
        let friendlyMessage = serverMessage;
        if (!friendlyMessage) {
            if (status === 409) {
                friendlyMessage = "Dữ liệu xung đột hoặc giao dịch đã được xử lý trước đó (HTTP 409 Conflict).";
            } else if (status === 403) {
                friendlyMessage = "Bạn không có quyền thực hiện hành động này.";
            } else if (status === 404) {
                friendlyMessage = "Không tìm thấy tài nguyên hoặc dữ liệu yêu cầu.";
            } else if (status === 400) {
                friendlyMessage = "Dữ liệu gửi lên không hợp lệ, vui lòng kiểm tra lại.";
            } else if (status === 500) {
                friendlyMessage = "Hệ thống máy chủ bệnh viện đang bận, vui lòng thử lại sau ít phút.";
            } else if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
                friendlyMessage = "Yêu cầu phản hồi quá thời gian cho phép (Timeout). Vui lòng thử lại.";
            } else if (error.message?.includes("Network Error")) {
                friendlyMessage = "Không thể kết nối đến máy chủ API Bệnh Viện (Port 8080). Vui lòng kiểm tra lại kết nối mạng.";
            } else {
                friendlyMessage = error.message || "Đã xảy ra lỗi không xác định.";
            }
        }

        const customError = {
            ...(error.response?.data || {}),
            status,
            statusCode: status,
            message: friendlyMessage,
            response: error.response,
            originalError: error
        };

        return Promise.reject(customError);
    }
);

export default axiosInstance;
