package com.hospital.api.service;

import com.hospital.api.constant.OtpPurpose;
import com.hospital.api.dto.request.SendOtpRequest;
import com.hospital.api.dto.request.VerifyOtpRequest;
import com.hospital.api.dto.response.OtpResponse;
import com.hospital.api.entity.OtpToken;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.OtpTokenRepository;
import com.hospital.api.service.impl.OtpServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceImplTest {

    @Mock
    private OtpTokenRepository otpTokenRepository;

    @Mock
    private JavaMailSender mailSender;

    private OtpServiceImpl otpService;

    @BeforeEach
    void setUp() {
        otpService = new OtpServiceImpl(
                otpTokenRepository,
                mailSender,
                300000L, // 5 mins
                5,       // max 5 attempts
                60L,     // 60s cooldown
                15,      // 15 mins lock
                5,       // max 5/hr recipient
                15       // max 15/hr IP
        );
    }

    @Test
    @DisplayName("Gửi OTP khi chưa cấu hình SMTP (mailSender == null) ném lỗi 503 SERVICE_UNAVAILABLE")
    void sendOtp_whenMailSenderNull_throws503() {
        OtpServiceImpl noMailService = new OtpServiceImpl(
                otpTokenRepository,
                null,
                300000L, 5, 60L, 15, 5, 15
        );

        SendOtpRequest request = new SendOtpRequest("user@hospital.vn", OtpPurpose.ACCOUNT_RECOVERY);

        AppException ex = assertThrows(AppException.class, () -> noMailService.sendOtp(request));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertTrue(ex.getMessage().contains("chưa được cấu hình"));
        verifyNoInteractions(otpTokenRepository);
    }

    @Test
    @DisplayName("Gửi OTP khi SMTP thất bại (MailSendException) ném lỗi 502 BAD_GATEWAY và KHÔNG lưu OTP vào DB")
    void sendOtp_whenSmtpFails_throws502_andDoesNotSaveOtp() {
        doThrow(new MailSendException("SMTP connection refused"))
                .when(mailSender).send(any(SimpleMailMessage.class));

        SendOtpRequest request = new SendOtpRequest("user@hospital.vn", OtpPurpose.ACCOUNT_RECOVERY);

        AppException ex = assertThrows(AppException.class, () -> otpService.sendOtp(request));
        assertEquals(HttpStatus.BAD_GATEWAY, ex.getStatus());
        assertTrue(ex.getMessage().contains("Không thể gửi email"));

        // Xác nhận không lưu token nào vào DB
        verify(otpTokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("Gửi OTP thành công: gửi mail và lưu hash SHA-256 an toàn vào DB (không lưu plaintext)")
    void sendOtp_success_hashesAndSavesToken() {
        SendOtpRequest request = new SendOtpRequest("User@Hospital.vn", OtpPurpose.ACCOUNT_RECOVERY);

        when(otpTokenRepository.findTopByRecipientAndPurposeOrderByCreatedAtDesc(any(), any()))
                .thenReturn(Optional.empty());
        when(otpTokenRepository.countByRecipientAndCreatedAtAfter(any(), any()))
                .thenReturn(0L);

        OtpResponse response = otpService.sendOtp(request, "192.168.1.100");

        assertNotNull(response);
        assertEquals(300, response.expiresInSeconds());

        verify(mailSender, times(1)).send(any(SimpleMailMessage.class));

        ArgumentCaptor<OtpToken> captor = ArgumentCaptor.forClass(OtpToken.class);
        verify(otpTokenRepository, times(1)).save(captor.capture());

        OtpToken savedToken = captor.getValue();
        assertEquals("user@hospital.vn", savedToken.getRecipient());
        assertEquals("ACCOUNT_RECOVERY", savedToken.getPurpose());
        assertEquals("192.168.1.100", savedToken.getClientIp());
        assertFalse(savedToken.isUsed());
        assertEquals(0, savedToken.getAttempts());
        assertNotNull(savedToken.getOtpHash());
        // SHA-256 hash độ dài 64 hex characters, không phải 6 chữ số plaintext
        assertEquals(64, savedToken.getOtpHash().length());
    }

    @Test
    @DisplayName("Rate limiting Cooldown: ném 429 nếu gửi lần tiếp theo trước 60 giây")
    void sendOtp_cooldownViolated_throws429() {
        OtpToken recentToken = new OtpToken("user@hospital.vn", "ACCOUNT_RECOVERY", "hash", Instant.now().plusSeconds(300), null);
        recentToken.setCreatedAt(Instant.now().minusSeconds(20)); // Vừa gửi 20 giây trước

        when(otpTokenRepository.findTopByRecipientAndPurposeOrderByCreatedAtDesc("user@hospital.vn", "ACCOUNT_RECOVERY"))
                .thenReturn(Optional.of(recentToken));

        SendOtpRequest request = new SendOtpRequest("user@hospital.vn", OtpPurpose.ACCOUNT_RECOVERY);

        AppException ex = assertThrows(AppException.class, () -> otpService.sendOtp(request));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertTrue(ex.getMessage().contains("Vui lòng đợi"));
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("Rate limiting Recipient: ném 429 nếu đã gửi quá 5 lần trong 1 giờ")
    void sendOtp_recipientHourlyLimitExceeded_throws429() {
        when(otpTokenRepository.findTopByRecipientAndPurposeOrderByCreatedAtDesc("user@hospital.vn", "ACCOUNT_RECOVERY"))
                .thenReturn(Optional.empty());
        when(otpTokenRepository.countByRecipientAndCreatedAtAfter(eq("user@hospital.vn"), any(Instant.class)))
                .thenReturn(5L);

        SendOtpRequest request = new SendOtpRequest("user@hospital.vn", OtpPurpose.ACCOUNT_RECOVERY);

        AppException ex = assertThrows(AppException.class, () -> otpService.sendOtp(request));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertTrue(ex.getMessage().contains("quá số lần cho phép trong 1 giờ"));
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("Rate limiting IP: ném 429 nếu cùng IP gửi quá 15 lần trong 1 giờ")
    void sendOtp_ipHourlyLimitExceeded_throws429() {
        when(otpTokenRepository.findTopByRecipientAndPurposeOrderByCreatedAtDesc("user@hospital.vn", "ACCOUNT_RECOVERY"))
                .thenReturn(Optional.empty());
        when(otpTokenRepository.countByRecipientAndCreatedAtAfter(eq("user@hospital.vn"), any(Instant.class)))
                .thenReturn(0L);
        when(otpTokenRepository.countByClientIpAndCreatedAtAfter(eq("10.0.0.1"), any(Instant.class)))
                .thenReturn(15L);

        SendOtpRequest request = new SendOtpRequest("user@hospital.vn", OtpPurpose.ACCOUNT_RECOVERY);

        AppException ex = assertThrows(AppException.class, () -> otpService.sendOtp(request, "10.0.0.1"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertTrue(ex.getMessage().contains("Quá nhiều yêu cầu gửi mã OTP từ địa chỉ mạng"));
        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("Xác thực OTP thành công: kiểm tra đúng mã hash, đánh dấu used = true (chống replay attack)")
    void verifyOtp_success_marksTokenUsed() throws Exception {
        String rawOtp = "123456";
        String purpose = "ACCOUNT_RECOVERY";
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String hash = HexFormat.of().formatHex(md.digest((rawOtp + ":" + purpose).getBytes(StandardCharsets.UTF_8)));

        OtpToken token = new OtpToken("user@hospital.vn", purpose, hash, Instant.now().plusSeconds(300), null);

        when(otpTokenRepository.findTopByRecipientAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("user@hospital.vn"), eq(purpose), any(Instant.class)))
                .thenReturn(Optional.of(token));

        VerifyOtpRequest request = new VerifyOtpRequest("user@hospital.vn", "123456", OtpPurpose.ACCOUNT_RECOVERY);
        boolean result = otpService.verifyOtp(request);

        assertTrue(result);
        assertTrue(token.isUsed());
        verify(otpTokenRepository, times(1)).save(token);
    }

    @Test
    @DisplayName("Xác thực OTP sai: tăng attempt count, ném 400 BAD_REQUEST và thông báo số lần thử còn lại")
    void verifyOtp_wrongCode_incrementsAttempts() throws Exception {
        String correctOtp = "123456";
        String purpose = "ACCOUNT_RECOVERY";
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String hash = HexFormat.of().formatHex(md.digest((correctOtp + ":" + purpose).getBytes(StandardCharsets.UTF_8)));

        OtpToken token = new OtpToken("user@hospital.vn", purpose, hash, Instant.now().plusSeconds(300), null);
        token.setAttempts(1);

        when(otpTokenRepository.findTopByRecipientAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("user@hospital.vn"), eq(purpose), any(Instant.class)))
                .thenReturn(Optional.of(token));

        VerifyOtpRequest request = new VerifyOtpRequest("user@hospital.vn", "999999", OtpPurpose.ACCOUNT_RECOVERY);
        AppException ex = assertThrows(AppException.class, () -> otpService.verifyOtp(request));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("Mã OTP không chính xác. Bạn còn 3 lần thử"));
        assertEquals(2, token.getAttempts());
        verify(otpTokenRepository, times(1)).save(token);
    }

    @Test
    @DisplayName("Xác thực OTP sai lần thứ 5: khóa mã và ném lỗi 429 TOO_MANY_REQUESTS")
    void verifyOtp_fifthFailure_locksTokenWith429() throws Exception {
        String correctOtp = "123456";
        String purpose = "ACCOUNT_RECOVERY";
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String hash = HexFormat.of().formatHex(md.digest((correctOtp + ":" + purpose).getBytes(StandardCharsets.UTF_8)));

        OtpToken token = new OtpToken("user@hospital.vn", purpose, hash, Instant.now().plusSeconds(300), null);
        token.setAttempts(4); // Lần thử thứ 5 sẽ bị quá giới hạn

        when(otpTokenRepository.findTopByRecipientAndPurposeAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("user@hospital.vn"), eq(purpose), any(Instant.class)))
                .thenReturn(Optional.of(token));

        VerifyOtpRequest request = new VerifyOtpRequest("user@hospital.vn", "000000", OtpPurpose.ACCOUNT_RECOVERY);
        AppException ex = assertThrows(AppException.class, () -> otpService.verifyOtp(request));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertTrue(ex.getMessage().contains("nhập sai mã OTP quá 5 lần"));
        assertEquals(5, token.getAttempts());
        verify(otpTokenRepository, times(1)).save(token);
    }
}

