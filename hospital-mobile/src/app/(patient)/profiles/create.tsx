import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ProfileForm } from '@/features/profiles/components/ProfileForm';
import { profilesApi, ProfilesApi } from '@/features/profiles/profiles.api';
import { PatientProfileRequest } from '@/features/profiles/profiles.types';
import { tokens } from '@/theme/tokens';

export interface CreateProfileScreenProps {
  api?: ProfilesApi;
}

export default function CreateProfileScreen({ api = profilesApi }: CreateProfileScreenProps) {
  const router = useRouter();

  const handleSubmit = async (values: PatientProfileRequest) => {
    await api.createProfile(values);
    router.replace('/(patient)/profiles' as never);
  };

  return (
    <ScrollView style={styles.screen} testID="profile-create-screen">
      <Text style={styles.title}>Thêm hồ sơ bệnh nhân</Text>
      <ProfileForm submitLabel="Tạo hồ sơ" onSubmit={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
});

