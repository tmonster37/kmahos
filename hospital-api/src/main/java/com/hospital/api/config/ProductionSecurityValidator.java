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

    @Value("${payos.client-id:}")
    private String payosClientId;

    @Value("${payos.api-key:}")
    private String payosApiKey;

    @Value("${payos.checksum-key:}")
    private String payosChecksumKey;

    @Value("${payos.return-url:}")
    private String payosReturnUrl;

    @Value("${payos.cancel-url:}")
    private String payosCancelUrl;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Value("${spring.jpa.hibernate.ddl-auto:}")
    private String ddlAuto;

    private static final String DEFAULT_DEV_JWT = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final String DEFAULT_DEV_VNPAY = "BRYEEDJIJFAGUSDLEPIOPDMDYEMLDCAX";
    private static final String DEFAULT_DEV_PAYOS_CLIENT = "demo-client-id";
    private static final String DEFAULT_DEV_PAYOS_API_KEY = "demo-api-key";
    private static final String DEFAULT_DEV_PAYOS = "demo-checksum-key";
    private static final String LEGACY_DEV_DB_PASS = "taizz0537";

    public ProductionSecurityValidator(Environment environment) {
        this.environment = environment;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public void setVnpayHashSecret(String vnpayHashSecret) {
        this.vnpayHashSecret = vnpayHashSecret;
    }

    public void setPayosClientId(String payosClientId) {
        this.payosClientId = payosClientId;
    }

    public void setPayosApiKey(String payosApiKey) {
        this.payosApiKey = payosApiKey;
    }

    public void setPayosChecksumKey(String payosChecksumKey) {
        this.payosChecksumKey = payosChecksumKey;
    }

    public void setPayosReturnUrl(String payosReturnUrl) {
        this.payosReturnUrl = payosReturnUrl;
    }

    public void setPayosCancelUrl(String payosCancelUrl) {
        this.payosCancelUrl = payosCancelUrl;
    }

    public void setDbPassword(String dbPassword) {
        this.dbPassword = dbPassword;
    }

    public void setDdlAuto(String ddlAuto) {
        this.ddlAuto = ddlAuto;
    }

    @PostConstruct
    public void validateProductionSecurity() {
        boolean isProduction = Arrays.asList(environment.getActiveProfiles()).contains("prod")
                || Arrays.asList(environment.getActiveProfiles()).contains("production")
                || "production".equalsIgnoreCase(environment.getProperty("ENVIRONMENT"))
                || "prod".equalsIgnoreCase(environment.getProperty("ENVIRONMENT"));

        if (!isProduction) {
            log.info("Khởi động ứng dụng với profile không phải production ({}). Đang sử dụng cấu hình phát triển cục bộ.",
                    Arrays.toString(environment.getActiveProfiles()));
            return;
        }

        log.info("Đang kiểm tra an toàn cấu hình cho môi trường Production...");

        // 1. Kiểm tra JWT Secret
        if (jwtSecret == null || jwtSecret.isBlank() 
                || "${JWT_SECRET}".equals(jwtSecret.trim())
                || "null".equalsIgnoreCase(jwtSecret.trim())
                || "undefined".equalsIgnoreCase(jwtSecret.trim())
                || DEFAULT_DEV_JWT.equalsIgnoreCase(jwtSecret.trim())) {
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

        // 3. Kiểm tra PayOS Configuration
        if (payosClientId == null || payosClientId.isBlank() || DEFAULT_DEV_PAYOS_CLIENT.equalsIgnoreCase(payosClientId.trim())) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: PAYOS_CLIENT_ID trên Production không được để trống hoặc dùng mã demo.");
        }
        if (payosApiKey == null || payosApiKey.isBlank() || DEFAULT_DEV_PAYOS_API_KEY.equalsIgnoreCase(payosApiKey.trim())) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: PAYOS_API_KEY trên Production không được để trống hoặc dùng mã demo.");
        }
        if (payosChecksumKey == null || payosChecksumKey.isBlank() || DEFAULT_DEV_PAYOS.equalsIgnoreCase(payosChecksumKey.trim())) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: PAYOS_CHECKSUM_KEY trên Production không được để trống hoặc dùng khóa demo mặc định.");
        }
        if (payosReturnUrl != null && (payosReturnUrl.contains("localhost") || payosReturnUrl.contains("127.0.0.1"))) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: PAYOS_RETURN_URL trên Production không được trỏ về localhost / 127.0.0.1.");
        }
        if (payosCancelUrl != null && (payosCancelUrl.contains("localhost") || payosCancelUrl.contains("127.0.0.1"))) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: PAYOS_CANCEL_URL trên Production không được trỏ về localhost / 127.0.0.1.");
        }

        // 4. Kiểm tra Database Password
        if (dbPassword == null || dbPassword.isBlank()
                || "postgres".equalsIgnoreCase(dbPassword.trim())
                || "password".equalsIgnoreCase(dbPassword.trim())
                || "admin".equalsIgnoreCase(dbPassword.trim())
                || "123456".equalsIgnoreCase(dbPassword.trim())
                || LEGACY_DEV_DB_PASS.equals(dbPassword.trim())) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Mật khẩu cơ sở dữ liệu trên Production không được để trống hoặc dùng mật khẩu mặc định/dev.");
        }

        // 5. Kiểm tra Hibernate DDL-Auto trên Production
        if (ddlAuto != null && ("update".equalsIgnoreCase(ddlAuto.trim())
                || "create".equalsIgnoreCase(ddlAuto.trim())
                || "create-drop".equalsIgnoreCase(ddlAuto.trim()))) {
            throw new IllegalStateException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: spring.jpa.hibernate.ddl-auto trên Production không được phép là '"
                            + ddlAuto.trim() + "'. Vui lòng sử dụng 'validate' hoặc 'none' kết hợp công cụ migration có phiên bản.");
        }

        log.info("Cấu hình bảo mật Production hợp lệ. Tiếp tục khởi động hệ thống.");
    }
}
