package com.hospital.api.service.impl;

import com.hospital.api.dto.request.RegisterPushDeviceRequest;
import com.hospital.api.entity.Account;
import com.hospital.api.entity.PushDevice;
import com.hospital.api.exception.AppException;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.PushDeviceRepository;
import com.hospital.api.security.UserPrincipal;
import com.hospital.api.service.PushDeviceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushDeviceServiceImpl implements PushDeviceService {

    private final PushDeviceRepository pushDeviceRepository;
    private final AccountRepository accountRepository;

    @Override
    @Transactional
    public void registerDevice(UserPrincipal currentUser, RegisterPushDeviceRequest request) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new AppException("Chưa xác thực người dùng", HttpStatus.UNAUTHORIZED);
        }

        Account account = accountRepository.findById(currentUser.getId())
                .orElseThrow(() -> new AppException("Tài khoản không tồn tại", HttpStatus.NOT_FOUND));

        String installId = request.deviceInstallId().trim();
        String token = request.deviceToken().trim();
        String platform = request.platform().trim().toUpperCase();

        // 1. Nếu token này đã từng đăng ký ở tài khoản khác -> thu hồi/xóa để tránh rò rỉ chéo
        pushDeviceRepository.findByDeviceTokenAndDeletedFalse(token).ifPresent(existingWithToken -> {
            if (!existingWithToken.getAccount().getUserId().equals(account.getUserId())) {
                log.info("Token đã tồn tại ở tài khoản khác, thu hồi liên kết cũ để tránh rò rỉ thông báo.");
                pushDeviceRepository.delete(existingWithToken);
            }
        });

        // 2. Tìm theo deviceInstallId
        Optional<PushDevice> existingDeviceOpt = pushDeviceRepository.findByDeviceInstallId(installId);

        if (existingDeviceOpt.isPresent()) {
            PushDevice device = existingDeviceOpt.get();
            // Nếu chuyển đổi tài khoản trên cùng thiết bị (Account Switch)
            device.setAccount(account);
            device.setDeviceToken(token);
            device.setPlatform(platform);
            device.setDeleted(false);
            pushDeviceRepository.save(device);
            log.info("Cập nhật đăng ký thiết bị push thành công cho installId={}", installId);
        } else {
            PushDevice newDevice = PushDevice.builder()
                    .account(account)
                    .deviceInstallId(installId)
                    .deviceToken(token)
                    .platform(platform)
                    .build();
            newDevice.setDeleted(false);
            pushDeviceRepository.save(newDevice);
            log.info("Đăng ký mới thiết bị push thành công cho installId={}", installId);
        }
    }

    @Override
    @Transactional
    public void revokeDevice(UserPrincipal currentUser, String deviceInstallId) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new AppException("Chưa xác thực người dùng", HttpStatus.UNAUTHORIZED);
        }

        if (deviceInstallId == null || deviceInstallId.trim().isBlank()) {
            return; // Idempotent no-op
        }

        String installId = deviceInstallId.trim();
        Optional<PushDevice> deviceOpt = pushDeviceRepository.findByDeviceInstallId(installId);

        if (deviceOpt.isEmpty() || deviceOpt.get().isDeleted()) {
            // Idempotent: thiết bị không tồn tại hoặc đã hủy -> coi như thành công
            return;
        }

        PushDevice device = deviceOpt.get();
        if (!device.getAccount().getUserId().equals(currentUser.getId())) {
            log.warn("Từ chối hủy đăng ký thiết bị: installId={} không thuộc accountId={}", installId, currentUser.getId());
            throw new AppException("Không có quyền thu hồi thiết bị này", HttpStatus.FORBIDDEN);
        }

        pushDeviceRepository.delete(device);
        log.info("Thu hồi thiết bị push thành công cho installId={}", installId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PushDevice> getActiveDevicesForAccount(UUID accountId) {
        if (accountId == null) {
            return List.of();
        }
        return pushDeviceRepository.findAllByAccount_UserIdAndDeletedFalse(accountId);
    }
}

