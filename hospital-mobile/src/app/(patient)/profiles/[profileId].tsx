import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProfileForm } from '@/features/profiles/components/ProfileForm';
import { profilesApi, ProfilesApi } from '@/features/profiles/profiles.api';
import { PatientProfile, PatientProfileRequest } from '@/features/profiles/profiles.types';
import { tokens } from '@/theme/tokens';

export interface EditProfileScreenProps {
  api?: ProfilesApi;
  profileIdOverride?: string;
}

export default function EditProfileScreen({
  api = profilesApi,
  profileIdOverride,
}: EditProfileScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = profileIdOverride ?? params.profileId ?? '';

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await api.listMyProfiles();
        if (!active) return;
        const found = list.find((item) => item.patientProfileId === profileId) ?? null;
        if (!found) {
          setErrorMessage('Không tìm thấy hồ sơ bệnh nhân thuộc tài khoản này.');
        } else {
          setProfile(found);
        }
      } catch (err) {
        if (active) {
          setErrorMessage(
            err instanceof Error && err.message ? err.message : 'Không thể tải thông tin hồ sơ.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, profileId]);

  const handleSubmit = async (values: PatientProfileRequest) => {
    await api.updateProfile(profileId, values);
    router.replace('/(patient)/profiles' as never);
  };

  if (loading) {
    return (
      <View style={styles.center} testID="profile-edit-loading">
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  if (errorMessage || !profile) {
    return (
      <View style={styles.center} testID="profile-edit-error">
        <Text style={styles.errorText}>{errorMessage ?? 'Hồ sơ không tồn tại.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} testID="profile-edit-screen">
      <Text style={styles.title}>Cập nhật hồ sơ</Text>
      <ProfileForm
        initialValues={{
          fullName: profile.fullName,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          relationship: profile.relationship,
          phoneNumber: profile.phoneNumber ?? undefined,
          identityNumber: profile.identityNumber ?? undefined,
          healthInsuranceNumber: profile.healthInsuranceNumber ?? undefined,
          streetAddress: profile.streetAddress ?? undefined,
        }}
        submitLabel="Cập nhật hồ sơ"
        onSubmit={handleSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.body,
  },
});

