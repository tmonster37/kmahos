import axiosInstance from "./AxiosInstance";

export const bookingApi = {
    // Lấy danh sách chuyên khoa
    getDepartments: () => axiosInstance.get("/api/departments"),

    // Lấy lịch trực và khung giờ theo khoa & ngày
    getSchedules: (departmentId, date) =>
        axiosInstance.get(`/api/schedules/by-department?departmentId=${departmentId}&date=${date}`),

    // Lấy hồ sơ bệnh nhân của user
    getMyProfiles: () => axiosInstance.get("/api/patient-profiles"),

    // Tạo mới hồ sơ bệnh nhân
    createProfile: (data) => axiosInstance.post("/api/patient-profiles", data),

    // Cập nhật hồ sơ bệnh nhân
    updateProfile: (profileId, data) => axiosInstance.put(`/api/patient-profiles/${profileId}`, data),

    // Xóa hồ sơ bệnh nhân
    deleteProfile: (profileId) => axiosInstance.delete(`/api/patient-profiles/${profileId}`),

    // Đặt lịch khám
    createBooking: (data) => axiosInstance.post("/api/bookings", data),

    // Lấy lịch sử đặt khám
    getMyBookings: () => axiosInstance.get("/api/bookings/my-history"),
};
