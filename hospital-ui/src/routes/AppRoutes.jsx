import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import ClinicalLayout from "../layouts/ClinicalLayout";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

// Lazy-loaded route components for code-splitting and bundle optimization
const HomePage = lazy(() => import("../pages/patient/HomePage"));
const BookingPage = lazy(() => import("../pages/customer/BookingPage"));
const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const PatientProfilesPage = lazy(() => import("../pages/patient/PatientProfilesPage"));
const MedicalHistoryPage = lazy(() => import("../pages/patient/MedicalHistoryPage"));
const MedicalBillsPage = lazy(() => import("../pages/patient/MedicalBillsPage"));
const PaymentPage = lazy(() => import("../pages/patient/PaymentPage"));
const MedicineReminderPage = lazy(() => import("../pages/patient/MedicineReminderPage"));
const PatientLookupPage = lazy(() => import("../pages/patient/PatientLookupPage"));
const ExaminationPage = lazy(() => import("../pages/Doctor/ExaminationPage"));
const InpatientPage = lazy(() => import("../pages/Doctor/InpatientPage"));
const LabTestResultsPage = lazy(() => import("../pages/Doctor/LabTestResultsPage"));
const ChatConsultationPage = lazy(() => import("../pages/ChatConsultationPage"));
const QueueDisplayPage = lazy(() => import("../pages/QueueDisplayPage"));
const KioskPage = lazy(() => import("../pages/KioskPage"));
const DashboardPage = lazy(() => import("../pages/admin/DashboardPage"));
const DepartmentManagePage = lazy(() => import("../pages/admin/DepartmentManagePage"));
const MedicineManagePage = lazy(() => import("../pages/admin/MedicineManagePage"));
const PharmacyInventoryPage = lazy(() => import("../pages/admin/PharmacyInventoryPage"));
const EhrAndGatewayPage = lazy(() => import("../pages/admin/EhrAndGatewayPage"));
const DoctorManagePage = lazy(() => import("../pages/admin/DoctorManagePage"));
const ScheduleManagePage = lazy(() => import("../pages/admin/ScheduleManagePage"));
const MedicalServiceManagePage = lazy(() => import("../pages/admin/MedicalServiceManagePage"));
const AccountManagePage = lazy(() => import("../pages/admin/AccountManagePage"));
const TransactionManagePage = lazy(() => import("../pages/admin/TransactionManagePage"));
const BookingManagePage = lazy(() => import("../pages/admin/BookingManagePage"));
const CashierPage = lazy(() => import("../pages/cashier/CashierPage"));
const NurseReceptionPage = lazy(() => import("../pages/nurse/NurseReceptionPage"));
const PatientManagePage = lazy(() => import("../pages/admin/PatientManagePage"));
const VerifyPrescriptionPage = lazy(() => import("../pages/patient/VerifyPrescriptionPage"));
const ForbiddenPage = lazy(() => import("../pages/error/ForbiddenPage"));
const NotFoundPage = lazy(() => import("../pages/error/NotFoundPage"));

function RouteLoadingFallback() {
    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "60vh",
                gap: 2,
            }}
        >
            <CircularProgress size={42} thickness={4} sx={{ color: "#0088D6" }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Đang tải dữ liệu trang...
            </Typography>
        </Box>
    );
}

function AdminIndexRedirect() {
    const { user } = useAuth();
    if (user?.role === "ROLE_PHARMACIST") {
        return <Navigate to="/admin/pharmacy-inventory" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
}

export default function AppRoutes() {
    return (
        <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
                {/* Cây Kiosk Bấm Lấy Số Sảnh Bệnh Viện (Full screen touch) */}
                <Route path="/kiosk" element={<KioskPage />} />

                {/* Màn hình Gọi số sảnh chờ LED TV (Full screen) */}
                <Route path="/queue-display" element={<QueueDisplayPage />} />

                {/* Trang thông báo lỗi quyền 403 */}
                <Route path="/403" element={<ForbiddenPage />} />
                <Route path="/403-forbidden" element={<ForbiddenPage />} />

                {/* 1. Phân hệ Bệnh nhân & Cổng Dịch vụ Công khai (MainLayout: có footer, hỗ trợ hotline & tư vấn) */}
                <Route element={<MainLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/booking" element={<BookingPage />} />
                    <Route path="/verify-prescription" element={<VerifyPrescriptionPage />} />
                    <Route path="/xac-thuc-don-thuoc" element={<VerifyPrescriptionPage />} />
                    <Route path="/lookup" element={<PatientLookupPage />} />
                    <Route path="/tra-cuu" element={<PatientLookupPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/dang-ky" element={<RegisterPage />} />
                    <Route path="/payment" element={<PaymentPage />} />
                    <Route path="/payment/return" element={<PaymentPage />} />
                    <Route path="/payment/cancel" element={<PaymentPage />} />

                    {/* Sổ khám điện tử (Bệnh nhân & Nhân viên y tế) */}
                    <Route element={<ProtectedRoute allowedRoles={["ROLE_PATIENT", "ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_NURSE", "ROLE_LAB_TECHNICIAN", "ROLE_CASHIER", "ROLE_PHARMACIST", "ROLE_ADMIN"]} />}>
                        <Route path="/profiles" element={<PatientProfilesPage />} />
                        <Route path="/patient" element={<Navigate to="/profiles" replace />} />
                        <Route path="/patients" element={<Navigate to="/profiles" replace />} />
                        <Route path="/patient-profiles" element={<Navigate to="/profiles" replace />} />
                        <Route path="/patient/profiles" element={<Navigate to="/profiles" replace />} />
                        <Route path="/benh-nhan" element={<Navigate to="/profiles" replace />} />
                        <Route path="/ho-so" element={<Navigate to="/profiles" replace />} />
                        <Route path="/ho-so-benh-nhan" element={<Navigate to="/profiles" replace />} />
                        <Route path="/my-history" element={<MedicalHistoryPage />} />
                        <Route path="/patient/history" element={<Navigate to="/my-history" replace />} />
                        <Route path="/patient/medical-history" element={<Navigate to="/my-history" replace />} />
                        <Route path="/my-bills" element={<MedicalBillsPage />} />
                        <Route path="/patient/bills" element={<Navigate to="/my-bills" replace />} />
                        <Route path="/patient/medical-bills" element={<Navigate to="/my-bills" replace />} />
                        <Route path="/reminders" element={<MedicineReminderPage />} />
                        <Route path="/patient/reminders" element={<Navigate to="/reminders" replace />} />
                        <Route path="/chat" element={<ChatConsultationPage />} />
                    </Route>
                </Route>

                {/* 2. Phân hệ Bàn Tác Nghiệp Y Tế (ClinicalLayout: Tối ưu 100vh, zero distraction, không footer quảng bá, không chat AI) */}
                <Route element={<ClinicalLayout />}>
                    {/* 2.1 Phân hệ Điều Dưỡng (Tiếp nhận tại quầy, tạo hồ sơ, cấp và điều phối STT, theo dõi nội trú) */}
                    <Route element={<ProtectedRoute allowedRoles={["ROLE_NURSE", "ROLE_ADMIN"]} />}>
                        <Route path="/nurse" element={<Navigate to="/nurse/reception" replace />} />
                        <Route path="/nurse/reception" element={<NurseReceptionPage />} />
                        <Route path="/nurse/inpatient" element={<InpatientPage />} />
                    </Route>

                    {/* 2.2 Phân hệ Bác sĩ & Trưởng Khoa (Khám lâm sàng, chẩn đoán, kê đơn, chỉ định CLS) */}
                    <Route element={<ProtectedRoute allowedRoles={["ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_ADMIN"]} />}>
                        <Route path="/doctor/examinations" element={<ExaminationPage />} />
                        <Route path="/doctor/chat" element={<ChatConsultationPage />} />
                    </Route>

                    {/* 2.3 Phân hệ Nội Trú & Buồng Bệnh (Bác Sĩ + Điều Dưỡng + Admin) */}
                    <Route element={<ProtectedRoute allowedRoles={["ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_NURSE", "ROLE_ADMIN"]} />}>
                        <Route path="/doctor/inpatient" element={<InpatientPage />} />
                    </Route>

                    {/* 2.4 Phân hệ Bác Sĩ Xét Nghiệm / KTV Phòng Lab (Tiếp nhận & Trả kết quả CLS) */}
                    <Route element={<ProtectedRoute allowedRoles={["ROLE_LAB_TECHNICIAN", "ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_ADMIN"]} />}>
                        <Route path="/doctor/lab-tests" element={<LabTestResultsPage />} />
                    </Route>

                    {/* 2.5 Phân hệ Kế Toán Viện Phí & Kiểm Toán Tài Chính */}
                    <Route element={<ProtectedRoute allowedRoles={["ROLE_CASHIER", "ROLE_ADMIN"]} />}>
                        <Route path="/cashier" element={<CashierPage />} />
                        <Route path="/accountant" element={<CashierPage />} />
                        <Route path="/ke-toan" element={<CashierPage />} />
                    </Route>
                </Route>

                {/* 7. Phân hệ Quản Lý / Admin Portal, Trưởng Khoa & Dược Sĩ */}
                <Route element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_PHARMACIST"]} />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/admin" element={<AdminIndexRedirect />} />

                        {/* Nhóm 7.1 Quản Lý Thuốc & Kho Dược (Admin, Trưởng Khoa, Dược Sĩ) */}
                        <Route element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_PHARMACIST"]} />}>
                            <Route path="/admin/medicines" element={<MedicineManagePage />} />
                            <Route path="/admin/pharmacy-inventory" element={<PharmacyInventoryPage />} />
                        </Route>

                        {/* Nhóm 7.2 Quản Lý Điều Hành & Khoa Phòng (Admin, Trưởng Khoa) */}
                        <Route element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_HEAD_OF_DEPARTMENT"]} />}>
                            <Route path="/admin/dashboard" element={<DashboardPage />} />
                            <Route path="/admin/patients" element={<PatientManagePage />} />
                            <Route path="/admin/doctors" element={<DoctorManagePage />} />
                            <Route path="/admin/schedules" element={<ScheduleManagePage />} />
                            <Route path="/admin/departments" element={<DepartmentManagePage />} />
                            <Route path="/admin/rooms" element={<DepartmentManagePage />} />
                            <Route path="/admin/ehr-gateway" element={<EhrAndGatewayPage />} />
                            <Route path="/admin/services" element={<MedicalServiceManagePage />} />
                        </Route>

                        {/* Nhóm 7.3 Quản Trị Tài Khoản & Tài Chính Doanh Thu Đối Soát (Chỉ ADMIN) */}
                        <Route element={<ProtectedRoute allowedRoles={["ROLE_ADMIN"]} />}>
                            <Route path="/admin/accounts" element={<AccountManagePage />} />
                            <Route path="/admin/transactions" element={<TransactionManagePage />} />
                            <Route path="/admin/bookings" element={<BookingManagePage />} />
                        </Route>
                    </Route>
                </Route>

                {/* Trang 404 Not Found */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Suspense>
    );
}
