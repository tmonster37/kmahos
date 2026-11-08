import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance, { setInMemoryAccessToken, clearInMemoryAccessToken } from "../services/AxiosInstance";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dọn dẹp an toàn các khóa dữ liệu sinh hiệu cũ trong localStorage để bảo vệ quyền riêng tư y tế
    const clearLegacyVitals = () => {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith("vitals_")) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {
            // Không log thông tin nhạy cảm của bệnh nhân
        }
    };

    useEffect(() => {
        clearLegacyVitals();
        // Xóa hoàn toàn accessToken cũ khỏi localStorage (Cookie-Only mode)
        localStorage.removeItem("accessToken");
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed && typeof parsed === "object") {
                    const { accessToken: _omitted, ...safeUser } = parsed;
                    if (parsed.accessToken) {
                        localStorage.setItem("user", JSON.stringify(safeUser));
                    }
                    setUser(safeUser);
                }
            } catch {
                localStorage.removeItem("user");
            }
        }
        setLoading(false);
    }, []);

    const login = (authData) => {
        // Token xác thực được quản lý qua HttpOnly cookie (access_token) và RAM;
        // tuyệt đối không lưu accessToken vào localStorage.
        localStorage.removeItem("accessToken");
        if (authData?.accessToken) {
            setInMemoryAccessToken(authData.accessToken);
        }
        const { accessToken: _omitted, ...safeUser } = authData || {};
        localStorage.setItem("user", JSON.stringify(safeUser));
        setUser(safeUser);
    };

    const logout = async () => {
        clearLegacyVitals();
        clearInMemoryAccessToken();
        try {
            await axiosInstance.post("/api/auth/logout");
        } catch {
            // Tiếp tục dọn dẹp client dù request logout gặp lỗi mạng
        }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
