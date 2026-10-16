package com.hospital.api.dto.response;

import java.util.List;

public record RoomCapacityKpiResponse(
        int totalRooms,
        int activeRooms,
        double overallUtilizationRate,
        List<RoomCapacityItem> rooms
) {
    public record RoomCapacityItem(
            Integer roomId,
            String roomName,
            String departmentName,
            String doctorName,
            int waitingCount,
            int examiningCount,
            int completedCount,
            double utilizationRate,
            String loadLevel
    ) {}
}
