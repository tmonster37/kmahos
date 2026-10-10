package com.hospital.api.entity;

import com.hospital.api.common.BaseEntity;
import com.hospital.api.constant.Gender;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "staffs")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "dtype", discriminatorType = DiscriminatorType.STRING)
public class Staff extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "staff_id", updatable = false, nullable = false)
    protected UUID staffId;

    @Column(name = "full_name", nullable = false, length = 100)
    protected String fullName;

    @Column(name = "phone_number", length = 20)
    protected String phoneNumber;

    @Column(name = "identity_number", length = 20)
    protected String identityNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 10)
    protected Gender gender;

    @Column(name = "date_of_birth")
    protected LocalDate dateOfBirth;

    @Column(name = "avatar")
    protected String avatar;

    public Staff() {
    }

    public Staff(UUID staffId, String fullName, String phoneNumber, String identityNumber, Gender gender, LocalDate dateOfBirth, String avatar) {
        this.staffId = staffId;
        this.fullName = fullName;
        this.phoneNumber = phoneNumber;
        this.identityNumber = identityNumber;
        this.gender = gender;
        this.dateOfBirth = dateOfBirth;
        this.avatar = avatar;
    }

    public UUID getStaffId() {
        return staffId;
    }

    public void setStaffId(UUID staffId) {
        this.staffId = staffId;
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

    public String getIdentityNumber() {
        return identityNumber;
    }

    public void setIdentityNumber(String identityNumber) {
        this.identityNumber = identityNumber;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }
}
