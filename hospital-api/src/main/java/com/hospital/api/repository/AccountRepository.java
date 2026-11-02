package com.hospital.api.repository;

import com.hospital.api.constant.Role;
import com.hospital.api.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByPhoneNumber(String phoneNumber);
    Optional<Account> findByEmail(String email);
    Optional<Account> findByGoogleSub(String googleSub);
    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);
    boolean existsByGoogleSub(String googleSub);
    List<Account> findAllByRoleInAndDeletedFalse(List<Role> roles);
    List<Account> findAllByDeletedFalse();
}
