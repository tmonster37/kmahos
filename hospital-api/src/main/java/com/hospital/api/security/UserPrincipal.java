package com.hospital.api.security;

import com.hospital.api.entity.Account;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class UserPrincipal implements UserDetails {
    private final UUID id;
    private final String phoneNumber;
    private final String password;
    private final boolean isActive;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(Account account) {
        this(account, List.of(new SimpleGrantedAuthority(account.getRole().name())));
    }

    public UserPrincipal(Account account, Collection<? extends GrantedAuthority> authorities) {
        this.id = account.getUserId();
        this.phoneNumber = account.getPhoneNumber() != null ? account.getPhoneNumber() : account.getEmail();
        this.password = account.getPassword() != null ? account.getPassword() : "";
        this.isActive = account.isActive() && !account.isDeleted();
        this.authorities = authorities;
    }

    public UUID getId() {
        return id;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return phoneNumber != null ? phoneNumber : id.toString();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return isActive;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive;
    }
}
