package com.hospital.api.service;

import com.hospital.api.dto.request.CounterActionRequest;
import com.hospital.api.dto.request.KioskDispatchRequest;
import com.hospital.api.dto.response.CounterResponse;
import com.hospital.api.dto.response.CounterTicketResponse;

import java.util.List;
import java.util.UUID;

public interface CounterService {

    // Lấy danh sách toàn bộ các quầy và số lượng chờ
    List<CounterResponse> getAllCounters();

    // Điều dưỡng check-in mở quầy làm việc
    CounterResponse checkInCounter(Integer counterId, UUID staffId);

    // Điều dưỡng đóng quầy làm việc
    CounterResponse closeCounter(Integer counterId, UUID staffId);

    // Điều dưỡng tạm dừng quầy làm việc (nghỉ ca)
    CounterResponse pauseCounter(Integer counterId, UUID staffId);

    // Kiosk bốc số thông minh & tự động định tuyến vào quầy phù hợp
    CounterTicketResponse dispatchFromKiosk(KioskDispatchRequest request);

    // Lấy danh sách hàng đợi của một quầy
    List<CounterTicketResponse> getQueueForCounter(Integer counterId);

    // Điều dưỡng bấm gọi số tiếp theo
    CounterTicketResponse callNextTicket(Integer counterId, UUID staffId);

    // Điều dưỡng hoàn tất tiếp nhận tại quầy (chuyển phòng khám nếu có)
    CounterTicketResponse completeTicket(Long ticketId, Integer counterId, UUID staffId, CounterActionRequest request);

    // Điều dưỡng bỏ qua lượt (bệnh nhân vắng mặt)
    CounterTicketResponse skipTicket(Long ticketId, Integer counterId, UUID staffId);

    // Khởi tạo các quầy mặc định nếu database chưa có
    void initializeDefaultCountersIfEmpty();
}
