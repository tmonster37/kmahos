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

    // Lấy chi tiết hồ sơ bệnh án
    getRecord: (recordId) => axiosInstance.get(`/api/clinical/records/${recordId}`),
};
