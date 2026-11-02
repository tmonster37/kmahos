import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && user?.role) {
        const userRole = user.role.startsWith("ROLE_") ? user.role : `ROLE_${user.role}`;
        const normalizedAllowed = allowedRoles.map(r => r.startsWith("ROLE_") ? r : `ROLE_${r}`);
        if (!normalizedAllowed.includes(userRole)) {
            return <Navigate to="/403" replace />;
        }
    } else if (allowedRoles && !user?.role) {
        return <Navigate to="/403" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
