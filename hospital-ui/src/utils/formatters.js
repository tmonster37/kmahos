// Đổi 150000 -> "150.000 đ"
export const formatCurrency = (amount) => {
    if (amount == null) return "0 đ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

// Đổi ngày sang chuẩn Việt Nam: 23/09/2026
export const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Đổi ngày giờ sang chuẩn Việt Nam: 14:30 23/09/2026
export const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

// Chuyển Date hoặc chuỗi sang ISO Date YYYY-MM-DD
export const formatISODate = (dateInput) => {
    if (!dateInput) return "";
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Kiểm tra số điện thoại Việt Nam hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09)
export const isValidPhoneNumber = (phone) => {
    if (!phone) return false;
    return /^(03|05|07|08|09)\d{8}$/.test(phone.trim());
};

// Kiểm tra số định danh CCCD (12 số) hoặc CMND (9 số)
export const isValidIdentityNumber = (id) => {
    if (!id) return true; // Cho phép rỗng nếu không bắt buộc
    return /^\d{9}$|^\d{12}$/.test(id.trim());
};

// Kiểm tra mã thẻ BHYT Việt Nam (10 hoặc 15 ký tự chữ và số)
export const isValidHealthInsurance = (bhyt) => {
    if (!bhyt) return true; // Cho phép rỗng nếu không có
    return /^[A-Z0-9]{10,15}$/i.test(bhyt.trim());
};
