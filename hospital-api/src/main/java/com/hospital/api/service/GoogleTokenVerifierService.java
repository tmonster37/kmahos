package com.hospital.api.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.hospital.api.exception.AppException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.Set;

@Slf4j
@Service
public class GoogleTokenVerifierService {

    private final String googleClientId;
    private final boolean allowMockToken;
    private final Environment environment;

    private static final Set<String> ALLOWED_MOCK_EMAILS = Set.of(
            "patient.demo@gmail.com",
            "patient.demo@hospital.vn",
            "nguyenvanan.patient@gmail.com",
            "tranbaongoc.patient@gmail.com"
    );

    public GoogleTokenVerifierService(
            @Value("${google.client-id}") String googleClientId,
            @Value("${google.allow-mock-token:false}") boolean allowMockToken,
            Environment environment
    ) {
        this.googleClientId = googleClientId;
        this.allowMockToken = allowMockToken;
        this.environment = environment;
    }

    public record GoogleUserInfo(
            String googleSub,
            String email,
            String fullName,
            String pictureUrl,
            boolean emailVerified
    ) {}

    public GoogleUserInfo verify(String idTokenString) {
        if (idTokenString == null || idTokenString.trim().isBlank()) {
            throw new AppException("Google ID Token không được để trống", HttpStatus.BAD_REQUEST);
        }

        String cleanToken = idTokenString.trim();

        // Chế độ Dev-Mock có kiểm soát chỉ cho phép trong môi trường phát triển cục bộ và có cấu hình bật
        if (cleanToken.startsWith("dev-mock-")) {
            boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod")
                    || Arrays.asList(environment.getActiveProfiles()).contains("production")
                    || "production".equalsIgnoreCase(environment.getProperty("ENVIRONMENT"))
                    || "prod".equalsIgnoreCase(environment.getProperty("ENVIRONMENT"));

            if (isProd || !allowMockToken) {
                log.warn("[GOOGLE-AUTH-SECURITY] Từ chối token mock Google trong môi trường không cho phép hoặc production!");
                throw new AppException("Token Google mock không được phép sử dụng trong môi trường này", HttpStatus.UNAUTHORIZED);
            }

            // Client không được tự chọn email tùy ý - chỉ chấp nhận whitelist cố định
            String requestedEmail = cleanToken.substring("dev-mock-".length()).trim().toLowerCase();
            if (!ALLOWED_MOCK_EMAILS.contains(requestedEmail)) {
                log.warn("[GOOGLE-AUTH-SECURITY] Email mock '{}' không nằm trong whitelist cho phép!", requestedEmail);
                throw new AppException("Email thử nghiệm không nằm trong danh sách được phép", HttpStatus.BAD_REQUEST);
            }

            String mockSub = "sub_google_mock_" + Math.abs(requestedEmail.hashCode());
            String mockName = "Bệnh nhân Demo (" + requestedEmail.split("@")[0] + ")";
            log.info("[GOOGLE-AUTH-DEV] Đang sử dụng dev mock token hợp lệ trong dev: {}", requestedEmail);
            return new GoogleUserInfo(mockSub, requestedEmail, mockName, null, true);
        }

        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance()
            )
            .setAudience(Collections.singletonList(googleClientId))
            .build();

            GoogleIdToken idToken = verifier.verify(cleanToken);
            if (idToken == null) {
                log.warn("[GOOGLE-AUTH-ERROR] Google ID Token verification failed (null token returned)");
                throw new AppException("Google ID Token không hợp lệ, sai chữ ký hoặc đã hết hạn", HttpStatus.UNAUTHORIZED);
            }

            Payload payload = idToken.getPayload();

            // Kiểm tra nhà phát hành (Issuer)
            String issuer = payload.getIssuer();
            if (issuer == null || (!issuer.equals("accounts.google.com") && !issuer.equals("https://accounts.google.com"))) {
                log.warn("[GOOGLE-AUTH-ERROR] Google ID Token có issuer không hợp lệ: {}", issuer);
                throw new AppException("Google ID Token có nhà phát hành không hợp lệ", HttpStatus.UNAUTHORIZED);
            }

            // Kiểm tra thời hạn (Expiration)
            Long exp = payload.getExpirationTimeSeconds();
            if (exp == null || exp < (System.currentTimeMillis() / 1000)) {
                log.warn("[GOOGLE-AUTH-ERROR] Google ID Token đã hết hạn: {}", exp);
                throw new AppException("Google ID Token đã hết hạn", HttpStatus.UNAUTHORIZED);
            }

            // Kiểm tra email_verified
            Boolean emailVerified = payload.getEmailVerified();
            if (emailVerified == null || !emailVerified) {
                log.warn("[GOOGLE-AUTH-ERROR] Google email chưa được xác minh: {}", payload.getEmail());
                throw new AppException("Địa chỉ email của tài khoản Google chưa được xác minh", HttpStatus.BAD_REQUEST);
            }

            String googleSub = payload.getSubject();
            String email = payload.getEmail() != null ? payload.getEmail().trim().toLowerCase() : null;
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");

            if (googleSub == null || googleSub.isBlank()) {
                throw new AppException("Không tìm thấy định danh sub trong Google ID Token", HttpStatus.UNAUTHORIZED);
            }

            if (email == null || email.isBlank() || !email.contains("@")) {
                throw new AppException("Google ID Token không chứa địa chỉ email hợp lệ", HttpStatus.BAD_REQUEST);
            }

            return new GoogleUserInfo(googleSub, email, name, picture, true);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[GOOGLE-AUTH-EXCEPTION] Lỗi giải mã chữ ký Google ID Token: {}", e.getMessage());
            throw new AppException("Không thể xác minh chữ ký Google ID Token: " + e.getMessage(), HttpStatus.UNAUTHORIZED);
        }
    }
}
