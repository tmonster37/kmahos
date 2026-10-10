import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import HomePage from "../pages/patient/HomePage";
import BookingPage from "../pages/customer/BookingPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import PatientProfilesPage from "../pages/patient/PatientProfilesPage";
import MedicalHistoryPage from "../pages/patient/MedicalHistoryPage";
import MedicalBillsPage from "../pages/patient/MedicalBillsPage";
import PaymentPage from "../pages/patient/PaymentPage";
import MedicineReminderPage from "../pages/patient/MedicineReminderPage";
import PatientLookupPage from "../pages/patient/PatientLookupPage";
import ExaminationPage from "../pages/Doctor/ExaminationPage";
import InpatientPage from "../pages/Doctor/InpatientPage";
import LabTestResultsPage from "../pages/Doctor/LabTestResultsPage";
import ChatConsultationPage from "../pages/ChatConsultationPage";
import QueueDisplayPage from "../pages/QueueDisplayPage";
import KioskPage from "../pages/KioskPage";
import DashboardPage from "../pages/admin/DashboardPage";
import DepartmentManagePage from "../pages/admin/DepartmentManagePage";
import MedicineManagePage from "../pages/admin/MedicineManagePage";
import PharmacyInventoryPage from "../pages/admin/PharmacyInventoryPage";
import EhrAndGatewayPage from "../pages/admin/EhrAndGatewayPage";
import DoctorManagePage from "../pages/admin/DoctorManagePage";
import ScheduleManagePage from "../pages/admin/ScheduleManagePage";
import MedicalServiceManagePage from "../pages/admin/MedicalServiceManagePage";
import AccountManagePage from "../pages/admin/AccountManagePage";
import TransactionManagePage from "../pages/admin/TransactionManagePage";
import CashierPage from "../pages/cashier/CashierPage";
import NurseReceptionPage from "../pages/nurse/NurseReceptionPage";
import PatientManagePage from "../pages/admin/PatientManagePage";
import ForbiddenPage from "../pages/error/ForbiddenPage";
import NotFoundPage from "../pages/error/NotFoundPage";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
    return (
        <Routes>
            {/* Cây Kiosk Bấm Lấy Số Sảnh Bệnh Viện (Full screen touch) */}
            <Route path="/kiosk" element={<KioskPage />} />

            {/* Màn hình Gọi số sảnh chờ LED TV (Full screen) */}
            <Route path="/queue-display" element={<QueueDisplayPage />} />

            {/* Trang thông báo lỗi quyền 403 */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/403-forbidden" element={<ForbiddenPage />} />

            {/* 1. Phân hệ Bệnh nhân & Công khai */}
            <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/lookup" element={<PatientLookupPage />} />
                <Route path="/tra-cuu" element={<PatientLookupPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/payment" element={<PaymentPage />} />

                {/* Sổ khám điện tử (Bệnh nhân & Nhân viên y tế) */}
                <Route element={<ProtectedRoute allowedRoles={["ROLE_PATIENT", "ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_NURSE", "ROLE_LAB_TECHNICIAN", "ROLE_CASHIER", "ROLE_ADMIN"]} />}>
                    <Route path="/profiles" element={<PatientProfilesPage />} />
                    <Route path="/my-history" element={<MedicalHistoryPage />} />
                    <Route path="/my-bills" element={<MedicalBillsPage />} />
                    <Route path="/reminders" element={<MedicineReminderPage />} />
                    <Route path="/chat" element={<ChatConsultationPage />} />
                </Route>

                {/* 2. Phân hệ Điều Dưỡng (Tiếp nhận tại quầy, tạo hồ sơ, cấp và điều phối STT) */}
                <Route element={<ProtectedRoute allowedRoles={["ROLE_NURSE", "ROLE_ADMIN"]} />}>
                    <Route path="/nurse/reception" element={<NurseReceptionPage />} />
                </Route>

                {/* 3. Phân hệ Bác sĩ & Trưởng Khoa (Khám lâm sàng, chẩn đoán, kê đơn, chỉ định CLS) */}
                <Route element={<ProtectedRoute allowedRoles={["ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_ADMIN"]} />}>
                    <Route path="/doctor/examinations" element={<ExaminationPage />} />
                    <Route path="/doctor/chat" element={<ChatConsultationPage />} />
                </Route>

                {/* 4. Phân hệ Nội Trú & Buồng Bệnh (Bác Sĩ + Điều Dưỡng + Admin) */}
                <Route element={<ProtectedRoute allowedRoles={["ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_NURSE", "ROLE_ADMIN"]} />}>
                    <Route path="/doctor/inpatient" element={<InpatientPage />} />
                </Route>

                {/* 5. Phân hệ Bác Sĩ Xét Nghiệm / KTV Phòng Lab (Tiếp nhận & Trả kết quả CLS) */}
                <Route element={<ProtectedRoute allowedRoles={["ROLE_LAB_TECHNICIAN", "ROLE_DOCTOR", "ROLE_HEAD_OF_DEPARTMENT", "ROLE_ADMIN"]} />}>
                    <Route path="/doctor/lab-tests" element={<LabTestResultsPage />} />
                </Route>

                {/* 6. Phân hệ Quầy Thu Ngân & Viện Phí Tại Chỗ */}
                <Route element={<ProtectedRoute allowedRoles={["ROLE_CASHIER", "ROLE_ADMIN"]} />}>
                    <Route path="/cashier" element={<CashierPage />} />
                </Route>
            </Route>

            {/* 7. Phân hệ Quản Lý / Admin Portal & Phân Lịch Trưởng Khoa */}
            <Route element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_HEAD_OF_DEPARTMENT"]} />}>
                <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="/admin/dashboard" element={<DashboardPage />} />
                    <Route path="/admin/patients" element={<PatientManagePage />} />
                    <Route path="/admin/accounts" element={<AccountManagePage />} />
                    <Route path="/admin/transactions" element={<TransactionManagePage />} />
                    <Route path="/admin/doctors" element={<DoctorManagePage />} />
                    <Route path="/admin/schedules" element={<ScheduleManagePage />} />
                    <Route path="/admin/departments" element={<DepartmentManagePage />} />
                    <Route path="/admin/rooms" element={<DepartmentManagePage />} />
                    <Route path="/admin/medicines" element={<MedicineManagePage />} />
                    <Route path="/admin/pharmacy-inventory" element={<PharmacyInventoryPage />} />
                    <Route path="/admin/ehr-gateway" element={<EhrAndGatewayPage />} />
                    <Route path="/admin/services" element={<MedicalServiceManagePage />} />
                </Route>
            </Route>

            {/* Trang 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}
