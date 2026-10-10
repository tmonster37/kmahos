package com.hospital.api.dto.response;

import com.hospital.api.constant.Role;
import com.hospital.api.entity.Account;

import java.math.BigDecimal;
import java.util.UUID;

public record AccountInfoResponse(
    UUID userId,
    String fullName,
    String phoneNumber,
    String email,
    Role role,
    BigDecimal balance,
    String avatar
) {
    public static AccountInfoResponse fromEntity(Account account) {
        return new AccountInfoResponse(
            account.getUserId(),
            account.getFullName(),
            account.getPhoneNumber(),
            account.getEmail(),
            account.getRole(),
            account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO,
            account.getAvatar()
        );
    }
}
