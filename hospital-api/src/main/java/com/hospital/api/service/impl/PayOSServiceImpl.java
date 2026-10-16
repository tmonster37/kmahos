package com.hospital.api.service.impl;

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
@RequiredArgsConstructor
@Slf4j
public class PayOSServiceImpl implements PayOSService {

    private final PayOSConfig payOSConfig;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static final String PAYOS_API_URL = "https://api-merchant.payos.vn/v2/payment-requests";

    @Override
    public PayOSLinkResponse createPaymentLink(Long orderCode, BigDecimal amount, String description, String buyerName, String buyerPhone) {
        return createPaymentLink(orderCode, amount, description, buyerName, buyerPhone, null);
    }

    @Override
    public PayOSLinkResponse createPaymentLink(Long orderCode, BigDecimal amount, String description, String buyerName, String buyerPhone, java.util.List<com.hospital.api.dto.request.PayOSItemRequest> items) {
        long amountLong = amount.longValue();

        // Chuẩn hóa description theo quy định của PayOS: tối đa 25 ký tự, không dấu
        String cleanDesc = description != null ? description.trim() : "TNT " + orderCode;
        if (cleanDesc.length() > 25) {
            cleanDesc = cleanDesc.substring(0, 25);
        }

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
                        log.warn("PayOS API trả mã lỗi: {} - {}. Chuyển sang chế độ Fallback VietQR.",
                                code, root.path("desc").asText());
                    }
                } else {
                    log.warn("PayOS API trả HTTP status {} - {}. Kích hoạt chế độ Fallback.",
                            response.statusCode(), response.body());
                }
            } catch (Exception ex) {
                log.error("Lỗi khi kết nối tới PayOS API: {}. Tự động fallback sang VietQR QuickLink.", ex.getMessage());
            }
        }

        // Chế độ Graceful Fallback (Khi chưa điền key thật hoặc lỗi mạng PayOS)
        log.info("[PayOS Fallback] Sinh VietQR QuickLink mô phỏng thanh toán Open Banking cho orderCode: {}", orderCode);
        String txnRef = "TNT" + orderCode;
        String vietQrUrl = payOSConfig.generateVietQRUrl(amountLong, txnRef);
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
                            orderCode,
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
