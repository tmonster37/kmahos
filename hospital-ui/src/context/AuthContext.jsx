import React, { createContext, useContext, useState, useEffect } from "react";
import axiosInstance from "../services/AxiosInstance";

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
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                localStorage.removeItem("user");
            }
        }
        setLoading(false);
    }, []);

    const login = (authData) => {
        // authData chứa: userId, fullName, role, phoneNumber, (accessToken)
        // Token được quản lý qua HttpOnly cookie bởi trình duyệt; lưu user info cho UI rendering
        localStorage.setItem("user", JSON.stringify(authData));
        if (authData.accessToken) {
            localStorage.setItem("accessToken", authData.accessToken);
        }
        setUser(authData);
    };

    const logout = async () => {
        clearLegacyVitals();
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
