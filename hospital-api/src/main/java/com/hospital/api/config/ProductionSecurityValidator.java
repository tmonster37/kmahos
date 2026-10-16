package com.hospital.api.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.Arrays;

/**
 * Validator kiểm tra cấu hình an toàn khi ứng dụng chạy ở môi trường Production.
 * Ngăn chặn ứng dụng khởi động nếu thiếu các biến môi trường nhạy cảm bắt buộc
 * hoặc sử dụng các khóa/secret mặc định của môi trường test/demo.
 */
@Slf4j
@Configuration
public class ProductionSecurityValidator {

    private final Environment environment;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${vnpay.hash-secret:}")
    private String vnpayHashSecret;

    @Value("${payos.checksum-key:}")
    private String payosChecksumKey;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    private static final String DEFAULT_DEV_JWT = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final String DEFAULT_DEV_VNPAY = "BRYEEDJIJFAGUSDLEPIOPDMDYEMLDCAX";
    private static final String DEFAULT_DEV_PAYOS = "demo-checksum-key";

    public ProductionSecurityValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validateProductionSecurity() {
        boolean isProduction = Arrays.asList(environment.getActiveProfiles()).contains("prod")
                || Arrays.asList(environment.getActiveProfiles()).contains("production");

        if (!isProduction) {
            log.info("Khởi động ứng dụng với profile không phải production ({}). Đang sử dụng cấu hình phát triển cục bộ.",
                    Arrays.toString(environment.getActiveProfiles()));
            return;
        }

        log.info("Đang kiểm tra an toàn cấu hình cho môi trường Production...");

        // 1. Kiểm tra JWT Secret
        if (jwtSecret == null || jwtSecret.isBlank() || DEFAULT_DEV_JWT.equalsIgnoreCase(jwtSecret.trim())) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Ứng dụng không thể khởi động trên Production với JWT_SECRET mặc định hoặc rỗng! " +
                    "Vui lòng cấu hình biến môi trường JWT_SECRET với khóa an toàn tối thiểu 256 bits.");
        }

        if (jwtSecret.trim().length() < 32) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET trên Production quá ngắn (yêu cầu tối thiểu 32 ký tự / 256 bits).");
        }

        // 2. Kiểm tra VNPay Hash Secret
        if (vnpayHashSecret != null && DEFAULT_DEV_VNPAY.equalsIgnoreCase(vnpayHashSecret.trim())) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: VNPAY_HASH_SECRET trên Production không được sử dụng khóa sandbox mặc định.");
        }

        // 3. Kiểm tra PayOS Checksum Key
        if (payosChecksumKey != null && DEFAULT_DEV_PAYOS.equalsIgnoreCase(payosChecksumKey.trim())) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: PAYOS_CHECKSUM_KEY trên Production không được sử dụng khóa demo mặc định.");
        }

        // 4. Kiểm tra Database Password
        if (dbPassword == null || dbPassword.isBlank() || "postgres".equalsIgnoreCase(dbPassword.trim())) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Mật khẩu cơ sở dữ liệu trên Production không được để trống hoặc dùng mật khẩu mặc định 'postgres'.");
        }

        log.info("Cấu hình bảo mật Production hợp lệ. Tiếp tục khởi động hệ thống.");
    }
}
