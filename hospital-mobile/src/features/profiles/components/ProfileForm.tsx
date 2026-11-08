import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Gender, PatientProfileRequest } from '../profiles.types';

export interface ProfileFormProps {
  initialValues?: Partial<PatientProfileRequest>;
  submitLabel?: string;
  onSubmit: (values: PatientProfileRequest) => Promise<void>;
}

export function ProfileForm({
  initialValues,
  submitLabel = 'Lưu hồ sơ',
  onSubmit,
}: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialValues?.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initialValues?.dateOfBirth ?? '');
  const [gender, setGender] = useState<Gender>(initialValues?.gender ?? 'MALE');
  const [relationship, setRelationship] = useState(initialValues?.relationship ?? 'SELF');
  const [phoneNumber, setPhoneNumber] = useState(initialValues?.phoneNumber ?? '');
  const [identityNumber, setIdentityNumber] = useState(initialValues?.identityNumber ?? '');
  const [healthInsuranceNumber, setHealthInsuranceNumber] = useState(
    initialValues?.healthInsuranceNumber ?? ''
  );
  const [streetAddress, setStreetAddress] = useState(initialValues?.streetAddress ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePress = async () => {
    const trimmedName = fullName.trim();
    const trimmedDob = dateOfBirth.trim();
    if (!trimmedName) {
      setErrorMessage('Họ tên không được để trống');
      return;
    }
    if (!trimmedDob || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob)) {
      setErrorMessage('Ngày sinh phải theo định dạng YYYY-MM-DD');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      await onSubmit({
        fullName: trimmedName,
        dateOfBirth: trimmedDob,
        gender,
        relationship: relationship.trim() || 'SELF',
        phoneNumber: phoneNumber.trim() || undefined,
        identityNumber: identityNumber.trim() || undefined,
        healthInsuranceNumber: healthInsuranceNumber.trim() || undefined,
        streetAddress: streetAddress.trim() || undefined,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message ? err.message : 'Không thể lưu hồ sơ bệnh nhân.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form} testID="profile-form">
      {errorMessage ? (
        <Text style={styles.errorText} testID="profile-form-error">
          {errorMessage}
        </Text>
      ) : null}

      <Text style={styles.label}>Họ và tên *</Text>
      <TextInput
        testID="profile-fullname-input"
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Nguyễn Văn A"
      />

      <Text style={styles.label}>Ngày sinh (YYYY-MM-DD) *</Text>
      <TextInput
        testID="profile-dob-input"
        style={styles.input}
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder="1990-05-15"
      />

      <Text style={styles.label}>Giới tính *</Text>
      <View style={styles.genderRow}>
        {(['MALE', 'FEMALE', 'OTHER'] as const).map((option) => (
          <Pressable
            key={option}
            testID={`profile-gender-${option}`}
            style={[styles.genderChip, gender === option && styles.genderChipActive]}
            onPress={() => setGender(option)}
          >
            <Text style={styles.genderText}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Mối quan hệ</Text>
      <TextInput
        testID="profile-relationship-input"
        style={styles.input}
        value={relationship}
        onChangeText={setRelationship}
        placeholder="SELF / CHILD / PARENT"
      />

      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        testID="profile-phone-input"
        style={styles.input}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="0901234567"
      />

      <Text style={styles.label}>CCCD / CMND</Text>
      <TextInput
        testID="profile-identity-input"
        style={styles.input}
        value={identityNumber}
        onChangeText={setIdentityNumber}
      />

      <Text style={styles.label}>Số thẻ BHYT</Text>
      <TextInput
        testID="profile-insurance-input"
        style={styles.input}
        value={healthInsuranceNumber}
        onChangeText={setHealthInsuranceNumber}
      />

      <Text style={styles.label}>Địa chỉ</Text>
      <TextInput
        testID="profile-address-input"
        style={styles.input}
        value={streetAddress}
        onChangeText={setStreetAddress}
      />

      <Pressable
        testID="profile-submit-button"
        style={styles.submitBtn}
        onPress={handlePress}
        disabled={submitting}
      >
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  errorText: {
    color: tokens.colors.danger,
    marginBottom: tokens.spacing.sm,
    fontSize: tokens.typography.caption,
  },
  label: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    color: tokens.colors.textPrimary,
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.body,
  },
  genderRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  genderChip: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  genderChipActive: {
    backgroundColor: tokens.colors.primaryLight,
    borderColor: tokens.colors.primary,
  },
  genderText: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    color: tokens.colors.textPrimary,
  },
  submitBtn: {
    marginTop: tokens.spacing.lg,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
  },
  submitText: {
    color: tokens.colors.surface,
    fontWeight: '600',
    fontSize: tokens.typography.body,
  },
});

