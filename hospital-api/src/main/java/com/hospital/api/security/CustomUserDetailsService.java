package com.hospital.api.security;

import com.hospital.api.constant.Role;
import com.hospital.api.entity.Account;
import com.hospital.api.repository.AccountRepository;
import com.hospital.api.repository.DoctorRepository;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AccountRepository accountRepository;
    private final DoctorRepository doctorRepository;

    public CustomUserDetailsService(AccountRepository accountRepository, DoctorRepository doctorRepository) {
        this.accountRepository = accountRepository;
        this.doctorRepository = doctorRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        Account account = accountRepository.findByPhoneNumber(identifier)
                .or(() -> accountRepository.findByEmail(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản với số điện thoại hoặc email: " + identifier));

        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority(account.getRole().name()));

        // Dynamic Role Synthesis: Nếu là Trưởng khoa VÀ có hồ sơ bác sĩ hợp lệ (có chứng chỉ) -> cấp thêm quyền ROLE_DOCTOR
        if (account.getRole() == Role.ROLE_HEAD_OF_DEPARTMENT) {
            doctorRepository.findByAccount_UserId(account.getUserId()).ifPresent(doctor -> {
                if (doctor.getDoctorLicense() != null && !doctor.getDoctorLicense().isBlank()) {
                    authorities.add(new SimpleGrantedAuthority(Role.ROLE_DOCTOR.name()));
                }
            });
        }

        return new UserPrincipal(account, authorities);
    }
}
