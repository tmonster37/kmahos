import axiosInstance from "./AxiosInstance";

/**
 * Dịch vụ gửi thông báo lượt khám nội bộ trên web (In-App Local Notification)
 * Dành cho tài khoản Bệnh nhân trên Bệnh viện TNT
 */

// Yêu cầu cấp quyền thông báo Web Push trên trình duyệt nếu người dùng đồng ý
export const requestPushPermission = async () => {
    if (!("Notification" in window)) {
        return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
        try {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        } catch {
            return false;
        }
    }
    return false;
};

// Gửi thông báo Web Push cục bộ trên trình duyệt (Chỉ hiển thị nếu đúng là bệnh nhân đó đang mở trang)
export const sendWebPushNotification = (title, body) => {
    try {
        if ("Notification" in window && Notification.permission === "granted") {
            const notification = new Notification(title, {
                body,
                icon: "/favicon.ico",
                tag: "hospital-queue-alert"
            });
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    } catch (e) {
        console.log("Web push notification error:", e);
    }
};

/**
 * Tự động tạo và gửi thông báo cho bệnh nhân sắp đến lượt khám (còn 1-3 số)
 * Gửi lên Server Database + Cách ly lưu trữ theo số điện thoại đúng người nhận
 * @param {Array} queueList - Danh sách hàng đợi bệnh nhân
 * @param {Object} currentCalledPatient - Bệnh nhân vừa được gọi vào phòng
 * @param {String} roomName - Tên phòng khám
 * @returns {Array} Danh sách các thông báo đã tạo
 */
export const notifyUpcomingPatients = (queueList = [], currentCalledPatient = null, roomName = "Bàn Khám Bác Sĩ") => {
    if (!Array.isArray(queueList) || queueList.length === 0) return [];

    // Lọc danh sách bệnh nhân đang chờ (CONFIRMED)
    const waitingPatients = queueList.filter(p => p.status === "CONFIRMED" && p.bookingCode !== currentCalledPatient?.bookingCode);
    
    // Lấy 1-3 bệnh nhân kế tiếp
    const upcomingPatients = waitingPatients.slice(0, 3);
    const inAppNotifications = [];

    // Lấy thông tin user đang thao tác trên trình duyệt hiện tại
    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem("user") || "null");
    } catch {}

    for (let i = 0; i < upcomingPatients.length; i++) {
        const patient = upcomingPatients[i];
        const remainingCount = i + 1; // Còn 1 người, 2 người, 3 người
        const queueNum = patient.queueCode || String(patient.queueNumber).padStart(2, "0");
        const title = `🔔 Sắp đến lượt khám! (Còn ${remainingCount} số nữa)`;
        const message = `Kính gửi Ông/Bà ${patient.patientName} (STT: ${queueNum}). Chỉ còn ${remainingCount} lượt nữa là đến lượt khám của bạn tại ${roomName}. Vui lòng chuẩn bị di chuyển tới cửa phòng khám!`;

        // 1. Chỉ gửi Web Push nếu trình duyệt này ĐÚNG LÀ của bệnh nhân đó (tránh spam trình duyệt của Bác sĩ / Điều dưỡng)
        if (currentUser && currentUser.phoneNumber && patient.patientPhone === currentUser.phoneNumber) {
            sendWebPushNotification(title, message);
        }

        // 2. Tạo bản ghi thông báo In-App gắn liền với danh tính Bệnh nhân
        const notifRecord = {
            notificationId: `INAPP-${Date.now()}-${patient.bookingCode || i}`,
            title: title,
            message: message,
            content: message,
            patientName: patient.patientName,
            patientPhone: patient.patientPhone,
            bookingCode: patient.bookingCode,
            queueNumber: queueNum,
            remainingCount,
            type: "QUEUE_ALERT",
            isRead: false,
            read: false,
            createdAt: new Date().toISOString()
        };

        inAppNotifications.push(notifRecord);
    }

    // 3. Gửi lên Server Database để lưu chính xác vào Account của từng bệnh nhân
    if (upcomingPatients.length > 0) {
        axiosInstance.post("/api/utilities/notifications/queue-alerts", {
            roomName: roomName,
            upcomingPatients: upcomingPatients.map((p, idx) => ({
                bookingCode: p.bookingCode,
                patientPhone: p.patientPhone,
                patientName: p.patientName,
                queueCode: p.queueCode || String(p.queueNumber).padStart(2, "0"),
                remainingCount: idx + 1
            }))
        }).catch(err => {
            console.warn("Lỗi gửi queue alerts lên server:", err?.message);
        });
    }

    // 4. Lưu vào localStorage cách ly theo từng số điện thoại bệnh nhân
    if (inAppNotifications.length > 0) {
        try {
            for (const notif of inAppNotifications) {
                if (notif.patientPhone) {
                    const userKey = `tnt_local_notifications_${notif.patientPhone}`;
                    const existing = JSON.parse(localStorage.getItem(userKey) || "[]");
                    const merged = [notif, ...existing.filter(x => x.bookingCode !== notif.bookingCode)].slice(0, 20);
                    localStorage.setItem(userKey, JSON.stringify(merged));
                }
            }

            // Phát sự kiện để cập nhật thông báo
            window.dispatchEvent(new CustomEvent("tnt_new_notification", { detail: inAppNotifications }));
        } catch (e) {
            console.error("Lỗi lưu thông báo local:", e);
        }
    }

    return inAppNotifications;
};
