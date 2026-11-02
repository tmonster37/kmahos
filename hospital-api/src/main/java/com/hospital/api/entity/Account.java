package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.Role;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "accounts", indexes = {
    @Index(name = "idx_account_phone", columnList = "phone_number"),
    @Index(name = "idx_account_email", columnList = "email"),
    @Index(name = "idx_account_google_sub", columnList = "google_sub")
})
public class Account extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id", updatable = false, nullable = false)
    private UUID userId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone_number", unique = true, length = 20)
    private String phoneNumber;

    @Column(name = "email", unique = true, length = 100)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "avatar")
    private String avatar;

    // Google OpenID Connect Subject Identifier (Định danh duy nhất bất biến)
    @Column(name = "google_sub", unique = true, length = 100)
    private String googleSub;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private Role role;

    // Ví tiền nội bộ thanh toán viện phí
    @Column(name = "balance", precision = 14, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false, columnDefinition = "boolean default true")
    private boolean isActive = true;

    public Account() {
    }

    public Account(UUID userId, String fullName, String phoneNumber, String email, String password, String avatar, String googleSub, Role role, BigDecimal balance, boolean isActive) {
        this.userId = userId;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.password = password;
        this.avatar = avatar;
        this.googleSub = googleSub;
        this.role = role;
        this.balance = balance != null ? balance : BigDecimal.ZERO;
        this.isActive = isActive;
    }

    public static AccountBuilder builder() {
        return new AccountBuilder();
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getGoogleSub() {
        return googleSub;
    }

    public void setGoogleSub(String googleSub) {
        this.googleSub = googleSub;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public static class AccountBuilder {
        private UUID userId;
        private String fullName;
        private String phoneNumber;
        private String email;
        private String password;
        private String avatar;
        private String googleSub;
        private Role role;
        private BigDecimal balance = BigDecimal.ZERO;
        private boolean isActive = true;

        public AccountBuilder userId(UUID userId) {
            this.userId = userId;
            return this;
        }

        public AccountBuilder fullName(String fullName) {
            this.fullName = fullName;
            return this;
        }

        public AccountBuilder phoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        public AccountBuilder email(String email) {
            this.email = email;
            return this;
        }

        public AccountBuilder password(String password) {
            this.password = password;
            return this;
        }

        public AccountBuilder avatar(String avatar) {
            this.avatar = avatar;
            return this;
        }

        public AccountBuilder googleSub(String googleSub) {
            this.googleSub = googleSub;
            return this;
        }

        public AccountBuilder role(Role role) {
            this.role = role;
            return this;
        }

        public AccountBuilder balance(BigDecimal balance) {
            this.balance = balance;
            return this;
        }

        public AccountBuilder isActive(boolean isActive) {
            this.isActive = isActive;
            return this;
        }

        public Account build() {
            return new Account(userId, fullName, phoneNumber, email, password, avatar, googleSub, role, balance, isActive);
        }
    }
}
