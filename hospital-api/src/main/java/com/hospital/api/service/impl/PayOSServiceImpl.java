package com.hospital.api.service.impl;

import org.springframework.beans.factory.annotation.Autowired;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.api.config.PayOSConfig;
import com.hospital.api.dto.response.PayOSLinkResponse;
import com.hospital.api.service.PayOSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class PayOSServiceImpl implements PayOSService {

    private final PayOSConfig payOSConfig;
    private final ObjectMapper objectMapper;
    private final org.springframework.core.env.Environment environment;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Autowired
    public PayOSServiceImpl(PayOSConfig payOSConfig, ObjectMapper objectMapper, org.springframework.core.env.Environment environment) {
        this.payOSConfig = payOSConfig;
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    public PayOSServiceImpl(PayOSConfig payOSConfig, ObjectMapper objectMapper) {
        this(payOSConfig, objectMapper, null);
    }

    private static final String PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

    @Override
    public PayOSLinkResponse createPaymentLink(Long orderCode, BigDecimal amount, String description, String buyerName, String buyerPhone) {
        return createPaymentLink(orderCode, amount, description, buyerName, buyerPhone, null);
    }

    @Override
    public PayOSLinkResponse createPaymentLink(Long orderCode, BigDecimal amount, String description, String buyerName, String buyerPhone, java.util.List<com.hospital.api.dto.request.PayOSItemRequest> items) {
        long amountLong = amount.longValue();

        // Use the same compact reference for every bank and the fallback QR.
        // Full booking/invoice text remains in the local Transaction description.
        String cleanDesc = PayOSConfig.paymentReference(orderCode);

        if (payOSConfig.isRealPayOSConfigured()) {
            try {
                String signature = payOSConfig.createPaymentLinkSignature(
                        amountLong,
                        payOSConfig.cancelUrl,
                        cleanDesc,
                        orderCode,
                        payOSConfig.returnUrl
                );

                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("orderCode", orderCode);
                requestBody.put("amount", amountLong);
                requestBody.put("description", cleanDesc);
                requestBody.put("returnUrl", payOSConfig.returnUrl);
                requestBody.put("cancelUrl", payOSConfig.cancelUrl);
                requestBody.put("signature", signature);

                if (items != null && !items.isEmpty()) {
                    requestBody.put("items", items);
                }

                if (buyerName != null && !buyerName.isBlank()) {
                    requestBody.put("buyerName", buyerName);
                }
                if (buyerPhone != null && !buyerPhone.isBlank()) {
                    requestBody.put("buyerPhone", buyerPhone);
                }

                String jsonPayload = objectMapper.writeValueAsString(requestBody);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(PAYOS_API_URL))
                        .timeout(Duration.ofSeconds(15))
                        .header("Content-Type", "application/json")
                        .header("x-client-id", payOSConfig.clientId.trim())
                        .header("x-api-key", payOSConfig.apiKey.trim())
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    JsonNode root = objectMapper.readTree(response.body());
                    String code = root.path("code").asText("");
                    if ("00".equals(code)) {
                        JsonNode data = root.path("data");
                        log.info("Khởi tạo PayOS Payment Link thành công cho orderCode: {}", orderCode);
                        return new PayOSLinkResponse(
                                orderCode,
                                data.path("paymentLinkId").asText(),
                                data.path("checkoutUrl").asText(),
                                data.path("qrCode").asText(),
                                data.path("status").asText("PENDING"),
                                data.path("amount").asLong(amountLong),
                                data.path("description").asText(cleanDesc),
                                data.path("accountNumber").asText(payOSConfig.bankAccount),
                                data.path("accountName").asText(payOSConfig.accountHolder),
                                data.path("bin").asText(payOSConfig.bankBin)
                        );
                    } else {
                        log.warn("PayOS API trả mã lỗi: {} - {}", code, root.path("desc").asText());
                        if (isProductionEnvironment()) {
                            throw new com.hospital.api.exception.AppException(
                                    "Cổng thanh toán PayOS trả về lỗi: " + root.path("desc").asText("Không xác định"),
                                    org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE
                            );
                        }
                    }
                } else {
                    log.warn("PayOS API trả HTTP status {}", response.statusCode());
                    if (isProductionEnvironment()) {
                        throw new com.hospital.api.exception.AppException(
                                "Không thể kết nối cổng thanh toán PayOS (HTTP " + response.statusCode() + "). Vui lòng thanh toán trực tiếp tại quầy.",
                                org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE
                        );
                    }
                }
            } catch (com.hospital.api.exception.AppException appEx) {
                throw appEx;
            } catch (Exception ex) {
                log.error("Lỗi khi kết nối tới PayOS API: {}", ex.getMessage());
                if (isProductionEnvironment()) {
                    throw new com.hospital.api.exception.AppException(
                            "Lỗi kết nối cổng thanh toán PayOS: " + ex.getMessage(),
                            org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE
                    );
                }
            }
        } else if (isProductionEnvironment()) {
            throw new com.hospital.api.exception.AppException(
                    "Cổng thanh toán điện tử PayOS chưa được cấu hình khóa hợp lệ cho môi trường Production.",
                    org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE
            );
        }

        // Chế độ Giả lập an toàn DÀNH RIÊNG cho môi trường Development / Test cục bộ
        log.warn("[PayOS DEV-SIMULATION] Sinh VietQR mô phỏng thanh toán cho orderCode: {}. Tuyệt đối không dùng cho Production!", orderCode);
        String vietQrUrl = payOSConfig.generateVietQRUrl(amountLong, cleanDesc);
        String fallbackCheckoutUrl = String.format("%s?orderCode=%d&status=PENDING&method=VIETQR", payOSConfig.returnUrl, orderCode);

        return new PayOSLinkResponse(
                orderCode,
                "SIM-" + orderCode,
                fallbackCheckoutUrl,
                vietQrUrl,
                "PENDING",
                amountLong,
                cleanDesc,
                payOSConfig.bankAccount,
                payOSConfig.accountHolder,
                payOSConfig.bankBin
        );
    }

    private boolean isProductionEnvironment() {
        if (environment == null) return false;
        return java.util.Arrays.asList(environment.getActiveProfiles()).contains("prod")
                || java.util.Arrays.asList(environment.getActiveProfiles()).contains("production")
                || "production".equalsIgnoreCase(environment.getProperty("ENVIRONMENT"))
                || "prod".equalsIgnoreCase(environment.getProperty("ENVIRONMENT"));
    }

    @Override
    public PayOSLinkResponse getPaymentLinkInformation(Long orderCode) {
        if (!payOSConfig.isRealPayOSConfigured()) {
            return null;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYOS_API_URL + "/" + orderCode))
                    .timeout(Duration.ofSeconds(10))
                    .header("x-client-id", payOSConfig.clientId.trim())
                    .header("x-api-key", payOSConfig.apiKey.trim())
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                if ("00".equals(root.path("code").asText())) {
                    JsonNode data = root.path("data");
                    return new PayOSLinkResponse(
                            data.path("orderCode").canConvertToLong() ? data.path("orderCode").asLong() : null,
                            data.path("id").asText(),
                            null,
                            null,
                            data.path("status").asText(),
                            data.path("amount").asLong(),
                            data.path("description").asText(),
                            data.path("accountNumber").asText(),
                            data.path("accountName").asText(),
                            null
                    );
                }
            }
        } catch (Exception e) {
            log.error("Lỗi tra cứu thông tin PayOS payment link: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public boolean cancelPaymentLink(Long orderCode, String cancellationReason) {
        if (!payOSConfig.isRealPayOSConfigured()) {
            return false;
        }

        try {
            Map<String, String> body = new HashMap<>();
            body.put("cancellationReason", cancellationReason != null ? cancellationReason : "Khách hàng hủy");
            String jsonPayload = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(PAYOS_API_URL + "/" + orderCode + "/cancel"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .header("x-client-id", payOSConfig.clientId.trim())
                    .header("x-api-key", payOSConfig.apiKey.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200;
        } catch (Exception e) {
            log.error("Lỗi hủy PayOS payment link: {}", e.getMessage());
            return false;
        }
    }
}
