package com.hospital.api.service.impl;

import com.hospital.api.constant.OtpPurpose;
import com.hospital.api.dto.request.SendOtpRequest;
import com.hospital.api.dto.request.VerifyOtpRequest;
import com.hospital.api.dto.response.OtpResponse;
import com.hospital.api.entity.OtpToken;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.OtpTokenRepository;
import com.hospital.api.service.OtpService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;

@Slf4j
@Service
public class OtpServiceImpl implements OtpService {

    private final OtpTokenRepository otpTokenRepository;
    private final JavaMailSender mailSender;
    private final long otpValidDurationMs;
    private final int maxAttempts;
    private final long resendCooldownSeconds;
    private final int lockoutDurationMinutes;
    private final int maxSendPerHourRecipient;
    private final int maxSendPerHourIp;
    private static final SecureRandom RANDOM = new SecureRandom();

    public OtpServiceImpl(
            OtpTokenRepository otpTokenRepository,
            @Autowired(required = false) JavaMailSender mailSender,
            @Value("${otp.expiration-ms:300000}") long otpValidDurationMs,
            @Value("${otp.max-attempts:5}") int maxAttempts,
            @Value("${otp.resend-cooldown-seconds:60}") long resendCooldownSeconds,
            @Value("${otp.lockout-duration-minutes:15}") int lockoutDurationMinutes,
            @Value("${otp.max-send-per-hour-recipient:5}") int maxSendPerHourRecipient,
            @Value("${otp.max-send-per-hour-ip:15}") int maxSendPerHourIp
    ) {
        this.otpTokenRepository = otpTokenRepository;
        this.mailSender = mailSender;
        this.otpValidDurationMs = otpValidDurationMs;
        this.maxAttempts = maxAttempts;
        this.resendCooldownSeconds = resendCooldownSeconds;
        this.lockoutDurationMinutes = lockoutDurationMinutes;
        this.maxSendPerHourRecipient = maxSendPerHourRecipient;
        this.maxSendPerHourIp = maxSendPerHourIp;
    }

    @Override
    public OtpResponse sendOtp(SendOtpRequest request) {
        return sendOtp(request, null);
    }

    @Override
    public OtpResponse sendOtp(SendOtpRequest request, String clientIp) {
        sendEmailOtp(request.email(), request.purpose(), clientIp);
        return OtpResponse.ofSuccess("Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).", otpValidDurationMs / 1000);
    }

    @Override
    public void sendEmailOtp(String email, OtpPurpose purpose) {
        sendEmailOtp(email, purpose, null);
    }

    @Override
    @Transactional
    public void sendEmailOtp(String email, OtpPurpose purpose, String clientIp) {
        if (email == null || email.trim().isBlank() || !email.contains("@")) {
            throw new AppException("Địa chỉ email nhận mã OTP không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        if (purpose == null) {
            throw new AppException("Mục đích yêu cầu mã OTP không được để trống", HttpStatus.BAD_REQUEST);
        }

        // 1. Kiểm tra cấu hình SMTP (Không báo gửi thành công nếu thiếu cấu hình)
        if (mailSender == null) {
            log.error("[OTP-EMAIL-SENDER] JavaMailSender chưa được cấu hình trên hệ thống.");
            throw new AppException("Hệ thống gửi email chưa được cấu hình. Vui lòng liên hệ quản trị viên.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        String normalizedEmail = email.trim().toLowerCase();

        // 2. Kiểm tra trạng thái khóa do thử sai quá nhiều lần (Lockout 15 phút)
        Optional<OtpToken> latestOpt = otpTokenRepository.findTopByRecipientAndPurposeOrderByCreatedAtDesc(
                normalizedEmail, purpose.name());
        if (latestOpt.isPresent()) {
            OtpToken latest = latestOpt.get();
            if (latest.getAttempts() >= maxAttempts) {
                long minutesSinceLock = Duration.between(latest.getCreatedAt(), Instant.now()).toMinutes();
                if (minutesSinceLock < lockoutDurationMinutes) {
                    long waitMinutes = lockoutDurationMinutes - minutesSinceLock;
                    throw new AppException("Tài khoản đang bị tạm khóa xác thực OTP do nhập sai quá 5 lần. Vui lòng thử lại sau " + waitMinutes + " phút.", HttpStatus.TOO_MANY_REQUESTS);
                }
            }

            // 3. Rate Limit / Cooldown chống spam giữa 2 lần gửi liên tiếp (60s)
            long secondsSinceLast = Duration.between(latest.getCreatedAt(), Instant.now()).toSeconds();
            if (secondsSinceLast < resendCooldownSeconds) {
                long waitSeconds = resendCooldownSeconds - secondsSinceLast;
                throw new AppException("Vui lòng đợi " + waitSeconds + " giây trước khi yêu cầu gửi lại mã OTP", HttpStatus.TOO_MANY_REQUESTS);
            }
        }

        // 4. Rate Limit số lần gửi trong 1 giờ theo Recipient (Tối đa 5 lần/giờ)
        long recipientCountLastHour = otpTokenRepository.countByRecipientAndCreatedAtAfter(
                normalizedEmail, Instant.now().minus(1, ChronoUnit.HOURS));
        if (recipientCountLastHour >= maxSendPerHourRecipient) {
            throw new AppException("Bạn đã yêu cầu gửi mã OTP quá số lần cho phép trong 1 giờ. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS);
        }

        // 5. Rate Limit số lần gửi trong 1 giờ theo Client IP (Tối đa 15 lần/giờ)
        if (clientIp != null && !clientIp.isBlank()) {
            long ipCountLastHour = otpTokenRepository.countByClientIpAndCreatedAtAfter(
                    clientIp, Instant.now().minus(1, ChronoUnit.HOURS));
            if (ipCountLastHour >= maxSendPerHourIp) {
                throw new AppException("Quá nhiều yêu cầu gửi mã OTP từ địa chỉ mạng của bạn. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS);
            }
        }

        // 6. Sinh mã OTP 6 chữ số ngẫu nhiên bằng SecureRandom
        String otpCode = String.format("%06d", RANDOM.nextInt(1000000));

        // 7. Gửi email trước: Nếu SMTP ném lỗi, throw 502 và KHÔNG lưu OTP vào DB
        dispatchEmail(normalizedEmail, purpose, otpCode);

        // 8. Lưu OTP bền vững với hash SHA-256 vào database
        String otpHash = hashOtp(otpCode, purpose.name());
        Instant expiresAt = Instant.now().plusMillis(otpValidDurationMs);
        OtpToken otpToken = new OtpToken(normalizedEmail, purpose.name(), otpHash, expiresAt, clientIp);
        otpTokenRepository.save(otpToken);

        log.info("[OTP-DISPATCH] Đã phát hành và gửi mã OTP cho email: {} - Mục đích: {} (Hiệu lực: {} giây)",
                maskEmail(normalizedEmail), purpose.name(), otpValidDurationMs / 1000);
    }

    @Override
    public boolean verifyOtp(VerifyOtpRequest request) {
        return verifyEmailOtp(request.email(), request.otpCode(), request.purpose());
    }

    @Override
    public boolean verifyOtp(VerifyOtpRequest request, String clientIp) {
        return verifyEmailOtp(request.email(), request.otpCode(), request.purpose());
    }

    @Override
    @Transactional
    public boolean verifyEmailOtp(String email, String otpCode, OtpPurpose purpose) {
        if (email == null || otpCode == null || purpose == null) {
            throw new AppException("Thông tin xác thực OTP không đầy đủ", HttpStatus.BAD_REQUEST);
        }

        String normalizedEmail = email.trim().toLowerCase();
        String inputCode = otpCode.trim();

        // Tìm token còn hiệu lực và chưa được sử dụng
        Optional<OtpToken> activeOpt = otpTokenRepository.findTopByRecipientAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                normalizedEmail, purpose.name(), Instant.now());

        if (activeOpt.isEmpty()) {
            // Kiểm tra xem có token trước đó để báo chi tiết (hết hạn, đã dùng, khóa brute force)
            Optional<OtpToken> lastOpt = otpTokenRepository.findTopByRecipientAndPurposeOrderByCreatedAtDesc(
                    normalizedEmail, purpose.name());
            if (lastOpt.isPresent()) {
                OtpToken last = lastOpt.get();
                if (last.getAttempts() >= maxAttempts) {
                    throw new AppException("Mã xác thực đã bị vô hiệu hóa vì nhập sai quá nhiều lần. Vui lòng yêu cầu mã OTP mới sau 15 phút.", HttpStatus.TOO_MANY_REQUESTS);
                }
                if (last.isUsed()) {
                    throw new AppException("Mã OTP này đã được sử dụng. Vui lòng yêu cầu mã mới.", HttpStatus.BAD_REQUEST);
                }
                if (last.getExpiresAt().isBefore(Instant.now())) {
                    throw new AppException("Mã OTP đã hết hiệu lực. Vui lòng yêu cầu mã mới.", HttpStatus.BAD_REQUEST);
                }
            }
            throw new AppException("Yêu cầu gửi mã OTP mới trước khi xác thực", HttpStatus.BAD_REQUEST);
        }

        OtpToken token = activeOpt.get();

        // Kiểm tra số lần thử sai
        if (token.getAttempts() >= maxAttempts) {
            throw new AppException("Bạn đã nhập sai mã OTP quá " + maxAttempts + " lần. Mã xác thực đã bị vô hiệu hóa vì lý do an ninh.", HttpStatus.TOO_MANY_REQUESTS);
        }

        // So khớp hash an toàn chống timing attack
        String expectedHash = token.getOtpHash();
        String inputHash = hashOtp(inputCode, purpose.name());

        if (!MessageDigest.isEqual(expectedHash.getBytes(StandardCharsets.UTF_8), inputHash.getBytes(StandardCharsets.UTF_8))) {
            token.setAttempts(token.getAttempts() + 1);
            otpTokenRepository.save(token);
            int remaining = maxAttempts - token.getAttempts();
            if (remaining <= 0) {
                throw new AppException("Bạn đã nhập sai mã OTP quá " + maxAttempts + " lần. Mã xác thực đã bị vô hiệu hóa vì lý do an ninh.", HttpStatus.TOO_MANY_REQUESTS);
            }
            throw new AppException("Mã OTP không chính xác. Bạn còn " + remaining + " lần thử", HttpStatus.BAD_REQUEST);
        }

        // Xác thực thành công: Đánh dấu đã sử dụng (Single-use chống replay attack)
        token.setUsed(true);
        otpTokenRepository.save(token);
        log.info("[OTP-VERIFIED] Xác thực thành công cho email: {} - Mục đích: {}", maskEmail(normalizedEmail), purpose.name());
        return true;
    }

    private void dispatchEmail(String recipientEmail, OtpPurpose purpose, String otpCode) {
        String purposeTitle = switch (purpose) {
            case ACCOUNT_RECOVERY -> "Khôi phục tài khoản";
            case LINK_GOOGLE_ACCOUNT -> "Liên kết tài khoản Google";
            case LINK_PATIENT_PROFILE -> "Liên kết hồ sơ bệnh nhân";
        };

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipientEmail);
            message.setSubject("[Bệnh viện Quốc tế TNT] Mã xác thực " + purposeTitle);
            message.setText("Xin chào,\n\n"
                    + "Hệ thống Bệnh viện Đa khoa Quốc tế TNT vừa nhận được yêu cầu " + purposeTitle + ".\n\n"
                    + "Mã xác thực OTP của bạn là: " + otpCode + "\n\n"
                    + "Mã có hiệu lực trong vòng 5 phút. Vui lòng tuyệt đối không chia sẻ mã này cho bất kỳ ai.\n\n"
                    + "Trân trọng,\nBan Quản trị Bệnh viện TNT");
            mailSender.send(message);
        } catch (Exception e) {
            log.error("[OTP-EMAIL-SENDER] Lỗi khi gửi mail qua SMTP server tới {}: {}", maskEmail(recipientEmail), e.getMessage());
            throw new AppException("Không thể gửi email chứa mã xác thực OTP. Vui lòng thử lại sau.", HttpStatus.BAD_GATEWAY);
        }
    }

    private String hashOtp(String otpCode, String purpose) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest((otpCode + ":" + purpose).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    private String maskEmail(String email) {
        int atIndex = email.indexOf("@");
        if (atIndex <= 2) return "***" + email.substring(atIndex);
        return email.charAt(0) + "***" + email.substring(atIndex - 1);
    }
}
