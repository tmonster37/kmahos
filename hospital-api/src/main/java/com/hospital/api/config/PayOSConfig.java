package com.hospital.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class PayOSConfig {

    @Value("${payos.client-id:demo-client-id}")
    public String clientId;

    @Value("${payos.api-key:demo-api-key}")
    public String apiKey;

    @Value("${payos.checksum-key:demo-checksum-key}")
    public String checksumKey;

    @Value("${payos.bank-bin:MB}")
    public String bankBin;

    @Value("${payos.bank-name:MBBank - Ngân hàng TMCP Quân Đội}")
    public String bankName;

    @Value("${payos.bank-account:0987654321}")
    public String bankAccount;

    @Value("${payos.account-holder:BENH VIEN DA KHOA QUOC TE TNT}")
    public String accountHolder;

    @Value("${payos.return-url:http://localhost:3000/payment}")
    public String returnUrl;

    @Value("${payos.cancel-url:http://localhost:3000/payment}")
    public String cancelUrl;

    /**
     * Kiểm tra xem cấu hình PayOS thật từ tài khoản cá nhân đã được cung cấp chưa
     */
    public boolean isRealPayOSConfigured() {
        return clientId != null && !clientId.isBlank() && !"demo-client-id".equalsIgnoreCase(clientId.trim())
                && apiKey != null && !apiKey.isBlank() && !"demo-api-key".equalsIgnoreCase(apiKey.trim())
                && checksumKey != null && !checksumKey.isBlank() && !"demo-checksum-key".equalsIgnoreCase(checksumKey.trim());
    }

    /**
     * Tạo chữ ký HMAC-SHA256 chuẩn đặc tả PayOS khi tạo Payment Link
     * Chuỗi ký: amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}
     */
    public String createPaymentLinkSignature(long amount, String cancelUrlStr, String desc, long orderCode, String returnUrlStr) {
        String data = String.format("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                amount,
                cancelUrlStr != null ? cancelUrlStr : "",
                desc != null ? desc : "",
                orderCode,
                returnUrlStr != null ? returnUrlStr : ""
        );
        return hmacSHA256(checksumKey, data);
    }

    /**
     * Sinh đường dẫn ảnh VietQR chuẩn Napas 247 quốc gia (QuickLink / VietQR API)
     */
    public String generateVietQRUrl(long amount, String transferContent) {
        String encodedHolder = URLEncoder.encode(accountHolder, StandardCharsets.UTF_8);
        String encodedContent = URLEncoder.encode(transferContent, StandardCharsets.UTF_8);

        return String.format(
                "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                bankBin,
                bankAccount,
                amount,
                encodedContent,
                encodedHolder
        );
    }

    /**
     * Tính toán chữ ký HMAC-SHA256 để xác thực dữ liệu giao dịch PayOS
     */
    public static String hmacSHA256(String key, String data) {
        try {
            Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secret_key = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256_HMAC.init(secret_key);
            byte[] hash = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte b : hash) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tính toán chữ ký PayOS HMAC-SHA256: " + e.getMessage());
        }
    }
}
