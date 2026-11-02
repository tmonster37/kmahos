# API-CONTRACTS.md — MA TRẬN HỢP ĐỒNG KẾT NỐI API FRONTEND & BACKEND

> **Tài liệu đặc tả hợp đồng (API Contract Specification)**  
> **Phiên bản:** 2.0 (Khảo sát và chuẩn hóa 02/11/2026)  
> **Phạm vi:** 163 route duy nhất phía Frontend kết nối 282 endpoint phía Backend.

---

## 1. NGUYÊN TẮC HỢP ĐỒNG DỮ LIỆU (DATA CONTRACT PRINCIPLES)

1. **Chuẩn hóa phản hồi API:**
   - Mọi endpoint trả về đối tượng `ApiResponse<T>`:
     ```json
     {
       "code": 200,
       "message": "Thông báo tiếng Việt",
       "data": { ... }
     }
     ```
   - Frontend interceptor `AxiosInstance.js` tự động bóc tách trả về `response.data`.
2. **Cơ chế xác thực & Phân quyền:**
   - Header: `Authorization: Bearer <accessToken>`.
   - Cookie: `withCredentials: true`.
   - Xử lý 401: Xóa token và redirect về `/login?expired=true`.
3. **Định dạng thời gian & Tiền tệ:**
   - Ngày tháng: ISO-8601 `YYYY-MM-DD` cho `LocalDate`, ISO UTC String cho `Instant`.
   - Tiền tệ: `BigDecimal` phía Backend, định dạng VND `formatCurrency(...)` phía Frontend.

---

## 2. MA TRẬN CHI TIẾT 163 ROUTES THEO PHÂN HỆ

### 1. Phân hệ Xác thực & Quản lý Tài khoản (Auth & Accounts)
- `POST /api/auth/login` -> `AuthController::login` (Public)
- `POST /api/auth/register` -> `AuthController::register` (Public)
- `GET /api/admin/accounts` -> `AccountAdminController::getAllAccounts` (`ADMIN`)
- `POST /api/admin/accounts` -> `AccountAdminController::createAccount` (`ADMIN`)
- `PUT /api/admin/accounts/{id}` -> `AccountAdminController::updateAccount` (`ADMIN`)
- `PUT /api/admin/accounts/{id}/toggle-status` -> `AccountAdminController::toggleStatus` (`ADMIN`)
- `PUT /api/admin/accounts/{id}/reset-password` -> `AccountAdminController::resetPassword` (`ADMIN`)
- `DELETE /api/admin/accounts/{id}` -> `AccountAdminController::deleteAccount` (`ADMIN`)
- `POST /api/admin/accounts/{id}/delete` -> `AccountAdminController::deleteAccountViaPost` (`ADMIN`)

### 2. Phân hệ Bệnh nhân, Đặt lịch, Kiosk & Tiếp đón Quầy
- `GET /api/patient-profiles` -> `PatientProfileController::getMyProfiles` (`Authenticated`)
- `POST /api/patient-profiles` -> `PatientProfileController::createProfile` (`Authenticated`)
- `PUT /api/patient-profiles/{id}` -> `PatientProfileController::updateProfile` (`Authenticated`)
- `DELETE /api/patient-profiles/{id}` -> `PatientProfileController::deleteProfile` (`Authenticated`)
- `GET /api/patient-profiles/lookup` -> `PatientProfileController::lookupProfiles` (Public)
- `POST /api/patient-profiles/link/search-by-code` -> `PatientProfileController::searchByCode` (`Authenticated`)
- `POST /api/patient-profiles/link/search-by-info` -> `PatientProfileController::searchByInfo` (`Authenticated`)
- `POST /api/patient-profiles/link/verify-and-link` -> `PatientProfileController::verifyAndLink` (`Authenticated`)
- `POST /api/bookings/reserve-slot` -> `BookingController::reserveSlot` (Public)
- `POST /api/bookings/release-slot/{id}` -> `BookingController::releaseSlot` (Public)
- `POST /api/bookings` -> `BookingController::createBooking` (`Authenticated`)
- `GET /api/bookings/my-history` -> `BookingController::getMyBookings` (`Authenticated`)
- `GET /api/bookings/code/{code}` -> `BookingController::getBookingByCode` (Public)
- `PUT /api/bookings/{id}/cancel` -> `BookingController::cancelBooking` (`Authenticated`)
- `POST /api/bookings/kiosk/check-in` -> `BookingController::checkInKiosk` (Public)
- `POST /api/bookings/kiosk/pay` -> `BookingController::payKioskBooking` (Public)
- `GET /api/counters` -> `CounterController::getAllCounters` (Public)
- `GET /api/counters/{id}/queue` -> `CounterController::getCounterQueue` (Public)
- `POST /api/counters/{id}/check-in` -> `CounterController::checkInCounter` (`NURSE, ADMIN`)
- `POST /api/counters/{id}/close` -> `CounterController::closeCounter` (`NURSE, ADMIN`)
- `POST /api/counters/{id}/call-next` -> `CounterController::callNextTicket` (`NURSE, ADMIN`)
- `POST /api/counters/{id}/tickets/{tId}/skip` -> `CounterController::skipTicket` (`NURSE, ADMIN`)
- `POST /api/counters/{id}/tickets/{tId}/complete` -> `CounterController::completeTicket` (`NURSE, ADMIN`)
- `GET /api/nurse/reception/queue` -> `NurseReceptionController::getReceptionQueue` (`NURSE, ADMIN`)
- `POST /api/nurse/reception/walk-in` -> `NurseReceptionController::admitWalkIn` (`NURSE, ADMIN`)
- `PUT /api/nurse/reception/bookings/{id}/status` -> `NurseReceptionController::updateBookingStatus` (`NURSE, ADMIN`)
- `POST /api/nurse/reception/dispatch` -> `NurseReceptionController::dispatchBookingByBody` (`NURSE, ADMIN`)

### 3. Phân hệ Khám Ngoại Trú & Bệnh Án Lâm Sàng (EMR)
- `GET /api/clinical/doctor/queue` -> `ClinicalExaminationController::getDoctorQueue` (`DOCTOR, HEAD, ADMIN`)
- `POST /api/clinical/call-patient` -> `ClinicalExaminationController::callPatient` (`DOCTOR, HEAD, ADMIN`)
- `POST /api/clinical/skip-patient` -> `ClinicalExaminationController::skipPatient` (`DOCTOR, HEAD, ADMIN`)
- `POST /api/clinical/recall-patient` -> `ClinicalExaminationController::recallPatient` (`DOCTOR, HEAD, ADMIN`)
- `POST /api/clinical/start` -> `ClinicalExaminationController::startExamination` (`DOCTOR`)
- `GET /api/clinical/records/{id}` -> `ClinicalExaminationController::getRecordById` (`Authenticated`)
- `GET /api/clinical/records/by-booking/{code}` -> `ClinicalExaminationController::getRecordByBookingCode` (`Authenticated`)
- `GET /api/clinical/patients/{patientProfileId}/records` -> `ClinicalExaminationController::getRecordsByPatientProfile` (`Authenticated`)
- `PUT /api/clinical/records/{id}/diagnosis` -> `ClinicalExaminationController::makeDiagnosis` (`DOCTOR`)
- `POST /api/clinical/records/{id}/complete` -> `ClinicalExaminationController::completeExamination` (`DOCTOR`)
- `POST /api/clinical/records/{id}/abandon-after-tests` -> `ClinicalExaminationController::abandonExaminationAfterTests` (`DOCTOR, HEAD, ADMIN`)
- `POST /api/clinical/records/{id}/prescriptions` -> `ClinicalExaminationController::createPrescription` (`DOCTOR`)
- `POST /api/clinical/records/{id}/prescriptions/check-safety` -> `ClinicalExaminationController::checkPrescriptionSafety` (`DOCTOR`)
- `POST /api/clinical/records/{id}/addendums` -> `ClinicalExaminationController::createAddendum` (`DOCTOR`)
- `GET /api/clinical/records/{id}/addendums` -> `ClinicalExaminationController::getAddendums` (`Authenticated`)

### 4. Phân hệ Cận Lâm Sàng & Kết quả Xét Nghiệm (Lab & Gateway)
- `POST /api/clinical/records/{id}/tests` -> `ClinicalExaminationController::assignMedicalTests` (`DOCTOR`)
- `POST /api/clinical/tests/{id}/cancel` -> `ClinicalExaminationController::cancelMedicalTest` (`DOCTOR, LAB, ADMIN`)
- `GET /api/clinical/lab-tests` -> `ClinicalExaminationController::getLabTests` (`LAB, DOCTOR, ADMIN`)
- `POST /api/clinical/tests/{id}/collect-specimen` -> `ClinicalExaminationController::collectSpecimen` (`LAB, NURSE, DOCTOR`)
- `PUT /api/clinical/tests/{id}/result` -> `ClinicalExaminationController::updateTestResult` (`LAB, DOCTOR, ADMIN`)
- `GET /api/gateway/ris/worklist` -> `ClinicalGatewayController::getDicomWorklist` (`LAB, DOCTOR, ADMIN`)
- `POST /api/gateway/pacs/callback` -> `ClinicalGatewayController::handlePacsCallback` (`LAB, DOCTOR, ADMIN`)
- `POST /api/gateway/lis/results` -> `ClinicalGatewayController::handleLisResults` (`LAB, ADMIN`)

### 5. Phân hệ Điều Trị Nội Trú & Buồng Bệnh
- `GET /api/inpatient/active` -> `InpatientController::getActiveAdmissions` (`DOCTOR, NURSE, ADMIN`)
- `GET /api/inpatient/patient/{patientProfileId}` -> `InpatientController::getAdmissionsByPatient` (`Authenticated`)
- `POST /api/inpatient/admit` -> `InpatientController::admitPatient` (`DOCTOR, HEAD, ADMIN`)
- `GET /api/inpatient/{id}/daily-records` -> `InpatientController::getDailyRecords` (`Authenticated`)
- `POST /api/inpatient/{id}/daily-record` -> `InpatientController::addDailyRecord` (`DOCTOR, NURSE, HEAD`)
- `GET /api/inpatient/{id}/nursing-cares` -> `InpatientController::getNursingCares` (`DOCTOR, NURSE, ADMIN`)
- `POST /api/inpatient/{id}/nursing-cares` -> `InpatientController::createNursingCare` (`NURSE, DOCTOR, HEAD`)
- `PUT /api/inpatient/{id}/transfer` -> `InpatientController::transferRoom` (`DOCTOR, HEAD, ADMIN`)
- `POST /api/inpatient/{id}/discharge` -> `InpatientController::dischargePatient` (`DOCTOR, HEAD`)

### 6. Phân hệ Thu Ngân Viện Phí & Cổng Thanh Toán
- `GET /api/cashier/pending-bills` -> `CashierController::getPendingBills` (`CASHIER, NURSE, ADMIN`)
- `GET /api/cashier/history` -> `CashierController::getPaymentHistory` (`CASHIER, ADMIN`)
- `POST /api/cashier/pay` -> `CashierController::processPayment` (`CASHIER, NURSE, ADMIN`)
- `POST /api/payment/payos/create-link` -> `PaymentController::createPayOSPaymentLink` (`Authenticated`)
- `GET /api/payment/status/{txnRef}` -> `PaymentController::checkTransactionStatus` (`Authenticated`)
- `POST /api/payment/payos/sync/{orderCode}` -> `PaymentController::syncPayOSPayment` (`Authenticated`)
- `POST /api/payment/kiosk/vietqr` -> `PaymentController::createKioskVietQRPayment` (Public)
- `POST /api/payment/kiosk/sync/{bookingCode}` -> `PaymentController::syncKioskPayment` (Public)
- `GET /api/payment/history` -> `PaymentController::getTransactionHistory` (`Authenticated`)
- `GET /api/payment/my-pending-bills` -> `PaymentController::getMyPendingBills` (`Authenticated`)
- `GET /api/payment/admin/transactions` -> `PaymentController::getAllTransactions` (`ADMIN, CASHIER`)

### 7. Phân hệ Kho Dược, Tồn Kho FEFO & Cấp Phát Thuốc
- `GET /api/pharmacy/warehouses` -> `PharmacyInventoryController::getAllWarehouses` (`PHARMACIST, DOCTOR, ADMIN`)
- `GET /api/pharmacy/warehouses/{id}` -> `PharmacyInventoryController::getWarehouseById` (`PHARMACIST, DOCTOR, ADMIN`)
- `GET /api/pharmacy/warehouses/{id}/stock` -> `PharmacyInventoryController::getStockByWarehouse` (`PHARMACIST, DOCTOR, ADMIN`)
- `GET /api/pharmacy/batches` -> `PharmacyInventoryController::getBatches` (`PHARMACIST, DOCTOR, ADMIN`)
- `POST /api/pharmacy/goods-receipt` -> `PharmacyInventoryController::receiveGoodsBatch` (`PHARMACIST, HEAD, ADMIN`)
- `GET /api/pharmacy/transfers` -> `PharmacyInventoryController::getTransfers` (`PHARMACIST, HEAD, ADMIN`)
- `POST /api/pharmacy/transfers` -> `PharmacyInventoryController::createStockTransfer` (`PHARMACIST, HEAD, ADMIN`)
- `POST /api/pharmacy/transfers/{id}/send` -> `PharmacyInventoryController::approveAndExecuteTransfer` (`PHARMACIST, HEAD, ADMIN`)
- `POST /api/pharmacy/transfers/{id}/approve` -> `PharmacyInventoryController::approveAndExecuteTransfer` (`PHARMACIST, HEAD, ADMIN`)
- `GET /api/pharmacy/prescriptions` -> `PharmacyInventoryController::getPrescriptions` (`PHARMACIST, DOCTOR, NURSE, ADMIN`)
- `POST /api/pharmacy/prescriptions/{id}/dispense` -> `PharmacyInventoryController::dispensePrescription` (`PHARMACIST, HEAD, ADMIN`)
- `GET /api/pharmacy/dispenses` -> `PharmacyInventoryController::getDispenses` (`PHARMACIST, DOCTOR, ADMIN`)
- `GET /api/pharmacy/alerts/near-expiry` -> `PharmacyInventoryController::getNearExpiryAlerts` (`ADMIN, HEAD, PHARMACIST`)
- `GET /api/pharmacy/alerts/low-stock` -> `PharmacyInventoryController::getLowStockAlerts` (`ADMIN, HEAD, PHARMACIST`)
- `GET /api/clinical/medicines` -> `ClinicalExaminationController::getMedicines` (`Authenticated`)
- `POST /api/clinical/medicines` -> `ClinicalExaminationController::createMedicine` (`ADMIN, PHARMACIST, HEAD`)
- `PUT /api/clinical/medicines/{id}` -> `ClinicalExaminationController::updateMedicine` (`ADMIN, PHARMACIST, HEAD`)
- `PUT /api/clinical/medicines/{id}/toggle-status` -> `ClinicalExaminationController::toggleMedicineStatus` (`ADMIN, PHARMACIST, HEAD`)
- `GET /api/prescriptions/verify` -> `PrescriptionExportController::verifyPrescription` (Public)

### 8. Phân hệ Quản Trị Hệ Thống, Khoa Phòng & EHR
- `GET /api/departments` -> `DepartmentController::getAllDepartments` (Public)
- `POST /api/departments` -> `DepartmentController::createDepartment` (`ADMIN`)
- `PUT /api/departments/{id}` -> `DepartmentController::updateDepartment` (`ADMIN, HEAD`)
- `DELETE /api/departments/{id}` -> `DepartmentController::toggleDepartmentStatus` (`ADMIN`)
- `GET /api/departments/{id}/rooms` -> `DepartmentController::getRoomsByDepartment` (Public)
- `POST /api/departments/rooms` -> `DepartmentController::createRoom` (`ADMIN, HEAD`)
- `PUT /api/departments/rooms/{id}` -> `DepartmentController::updateRoom` (`ADMIN, HEAD`)
- `DELETE /api/departments/rooms/{id}` -> `DepartmentController::toggleRoomStatus` (`ADMIN, HEAD`)
- `GET /api/admin/doctors` -> `DoctorAdminController::getAllDoctors` (`ADMIN, HEAD`)
- `POST /api/admin/doctors` -> `DoctorAdminController::createDoctor` (`ADMIN`)
- `PUT /api/admin/doctors/{id}` -> `DoctorAdminController::updateDoctor` (`ADMIN`)
- `DELETE /api/admin/doctors/{id}` -> `DoctorAdminController::deleteDoctor` (`ADMIN`)
- `PATCH /api/admin/doctors/{id}/assign-department` -> `DoctorAdminController::assignDepartment` (`ADMIN`)
- `PATCH /api/admin/doctors/{id}/set-head-of-department` -> `DoctorAdminController::setHeadOfDepartment` (`ADMIN`)
- `PUT /api/admin/doctors/{id}/license` -> `DoctorAdminController::updateDoctorLicense` (`ADMIN`)
- `GET /api/clinical/services` -> `ClinicalExaminationController::getServices` (`Authenticated`)
- `POST /api/clinical/services` -> `ClinicalExaminationController::createService` (`ADMIN, HEAD`)
- `PUT /api/clinical/services/{id}` -> `ClinicalExaminationController::updateService` (`ADMIN, HEAD`)
- `PUT /api/clinical/services/{id}/toggle-status` -> `ClinicalExaminationController::toggleServiceStatus` (`ADMIN, HEAD`)
- `GET /api/schedules` -> `ScheduleController::getSchedules` (`Authenticated`)
- `POST /api/schedules` -> `ScheduleController::createSchedule` (`ADMIN, HEAD`)
- `PUT /api/schedules/{id}` -> `ScheduleController::updateSchedule` (`ADMIN, HEAD`)
- `DELETE /api/schedules/{id}` -> `ScheduleController::deleteSchedule` (`ADMIN, HEAD`)
- `GET /api/ehr/observations/search` -> `EhrAdminController::searchObservations` (`ADMIN, HEAD`)
- `GET /api/ehr/encounters/search` -> `EhrAdminController::searchEncounters` (`ADMIN, HEAD`)
- `POST /api/ehr/migrate` -> `EhrAdminController::triggerEhrMigration` (`ADMIN`)

### 9. Phân hệ Tiện Ích, Trợ Lý AI & Thông Báo
- `POST /api/ai/consult` -> `AiChatbotController::consultAi` (Public)
- `GET /api/ai/prompts` -> `AiChatbotController::getPrompts` (Public)
- `GET /api/chat/messages/{partnerId}` -> `ChatController::getConversation` (`Authenticated`)
- `POST /api/chat/send` -> `ChatController::sendMessage` (`Authenticated`)
- `GET /api/chat/conversations` -> `ChatController::getConversations` (`Authenticated`)
- `GET /api/utilities/notifications` -> `UtilityController::getNotifications` (`Authenticated`)
- `PUT /api/utilities/notifications/{id}/read` -> `UtilityController::markAsRead` (`Authenticated`)
- `PUT /api/utilities/notifications/read-all` -> `UtilityController::markAllAsRead` (`Authenticated`)
- `GET /api/utilities/reminders` -> `UtilityController::getMyReminders` (`Authenticated`)
- `POST /api/utilities/reminders` -> `UtilityController::createReminder` (`Authenticated`)
- `PUT /api/utilities/reminders/{id}/take` -> `UtilityController::markAsTaken` (`Authenticated`)
- `DELETE /api/utilities/reminders/{id}` -> `UtilityController::deleteReminder` (`Authenticated`)

