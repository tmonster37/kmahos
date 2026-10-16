import React, { createContext, useContext, useState, useEffect } from "react";

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
        const token = localStorage.getItem("accessToken");
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (authData) => {
        // authData chứa: accessToken, userId, fullName, role, phoneNumber
        localStorage.setItem("accessToken", authData.accessToken);
        localStorage.setItem("user", JSON.stringify(authData));
        setUser(authData);
    };

    const logout = () => {
        clearLegacyVitals();
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
