import axiosInstance from "./AxiosInstance";

export const clinicalApi = {
    // Bác sĩ mở bệnh án theo bookingCode
    startExam: (bookingCode) => axiosInstance.post("/api/clinical/start", { bookingCode }),

    // Chỉ định xét nghiệm cận lâm sàng
    assignTests: (recordId, serviceIds) =>
        axiosInstance.post(`/api/clinical/records/${recordId}/tests`, { serviceIds }),

    // Cập nhật kết luận chẩn đoán
    makeDiagnosis: (recordId, data) =>
        axiosInstance.put(`/api/clinical/records/${recordId}/diagnosis`, data),

    // Kê đơn thuốc
    createPrescription: (recordId, data) =>
        axiosInstance.post(`/api/clinical/records/${recordId}/prescriptions`, data),

    // Lấy chi tiết hồ sơ bệnh án theo recordId
    getRecord: (recordId) => axiosInstance.get(`/api/clinical/records/${recordId}`),

    // Lấy chi tiết hồ sơ bệnh án theo bookingCode
    getRecordByBookingCode: (bookingCode) =>
        axiosInstance.get(`/api/clinical/records/by-booking/${bookingCode}`),

    // Lấy toàn bộ bệnh án điện tử của một hồ sơ bệnh nhân
    getRecordsByPatient: (patientProfileId) =>
        axiosInstance.get(`/api/clinical/patients/${patientProfileId}/records`),

    // Lập Phụ lục Bệnh án (EMR Addendum theo Thông tư 46/2018/TT-BYT)
    createAddendum: (recordId, data) =>
        axiosInstance.post(`/api/clinical/records/${recordId}/addendums`, data),

    // Lấy danh sách Phụ lục Bệnh án theo hồ sơ
    getAddendums: (recordId) =>
        axiosInstance.get(`/api/clinical/records/${recordId}/addendums`),
};
