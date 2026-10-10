package com.hospital.api.security;

import com.hospital.api.entity.Account;
import com.hospital.api.repository.AccountRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AccountRepository accountRepository;

    public CustomUserDetailsService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        Account account = accountRepository.findByPhoneNumber(identifier)
                .or(() -> accountRepository.findByEmail(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản với số điện thoại hoặc email: " + identifier));
        return new UserPrincipal(account);
    }
}
