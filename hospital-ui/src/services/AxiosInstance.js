import axios from "axios";

const defaultApiBaseUrl =
    typeof window !== "undefined" && window.location?.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8080"
        : "http://localhost:8080";

const API_BASE_URL =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env && process.env.REACT_APP_BASE_URL) ||
    defaultApiBaseUrl;

// Lưu token trong bộ nhớ RAM (không lưu vào localStorage để chống XSS)
let inMemoryAccessToken = null;

export const setInMemoryAccessToken = (token) => {
    inMemoryAccessToken = token || null;
};

export const clearInMemoryAccessToken = () => {
    inMemoryAccessToken = null;
};

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 75000,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

// Request Interceptor: Tự động đính kèm HttpOnly cookie (withCredentials), CSRF header X-Requested-With và in-memory token nếu có
axiosInstance.interceptors.request.use(
    (config) => {
        config.withCredentials = true;
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        if (inMemoryAccessToken) {
            config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
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
            
            // Lưu lại đường dẫn hiện tại và chuyển hướng an toàn không gây vòng lặp reload
            if (window.location.pathname !== "/login" && window.location.pathname !== "/register" && !window.__isRedirectingToLogin) {
                window.__isRedirectingToLogin = true;
                const currentPath = window.location.pathname + window.location.search;
                sessionStorage.setItem("redirectUrl", currentPath);
                setTimeout(() => {
                    window.location.href = "/login?expired=true";
                }, 150);
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
                friendlyMessage = "Máy chủ đang khởi động từ chế độ ngủ đông (Cold Start), vui lòng chờ thêm ít giây rồi thử lại...";
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

export { API_BASE_URL };
export default axiosInstance;
