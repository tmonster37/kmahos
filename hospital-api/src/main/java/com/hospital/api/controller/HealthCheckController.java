package com.hospital.api.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Endpoint kiểm tra tình trạng sức khỏe (Health Check & Liveness / Readiness Probe)
 * Phục vụ Docker Compose, Kubernetes, Load Balancer, Render / AWS monitoring.
 */
@Slf4j
@RestController
@RequestMapping({"/api/health", "/health"})
public class HealthCheckController {

    @Autowired(required = false)
    private DataSource dataSource;

    public void setDataSource(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    private final long startTime = System.currentTimeMillis();

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealthStatus() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("timestamp", Instant.now().toString());
        response.put("uptimeMs", System.currentTimeMillis() - startTime);

        // 1. Kiểm tra kết nối Database (không lộ chi tiết exception hay phiên bản nội bộ ra công khai)
        Map<String, Object> dbStatus = new LinkedHashMap<>();
        if (dataSource != null) {
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.execute("SELECT 1");
                dbStatus.put("status", "UP");
            } catch (Exception e) {
                log.error("Health check database probe failed", e);
                dbStatus.put("status", "DOWN");
                response.put("status", "DOWN");
            }
        } else {
            dbStatus.put("status", "NOT_CONFIGURED");
        }
        response.put("database", dbStatus);

        // 2. Thông tin bộ nhớ JVM
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long maxMemory = runtime.maxMemory();

        Map<String, Object> memoryStatus = new LinkedHashMap<>();
        memoryStatus.put("usedMB", (totalMemory - freeMemory) / (1024 * 1024));
        memoryStatus.put("freeMB", freeMemory / (1024 * 1024));
        memoryStatus.put("totalMB", totalMemory / (1024 * 1024));
        memoryStatus.put("maxMB", maxMemory / (1024 * 1024));
        response.put("memory", memoryStatus);

        // 3. JVM Threads & OS
        response.put("threadCount", ManagementFactory.getThreadMXBean().getThreadCount());

        if ("DOWN".equals(response.get("status"))) {
            return ResponseEntity.status(503).body(response);
        }
        return ResponseEntity.ok(response);
    }
}

