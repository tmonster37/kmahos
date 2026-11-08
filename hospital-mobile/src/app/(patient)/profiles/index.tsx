import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProfileCard } from '@/features/profiles/components/ProfileCard';
import { profilesApi, ProfilesApi } from '@/features/profiles/profiles.api';
import { PatientProfile } from '@/features/profiles/profiles.types';
import { tokens } from '@/theme/tokens';

export interface ProfilesListScreenProps {
  api?: ProfilesApi;
}

export default function ProfilesListScreen({ api = profilesApi }: ProfilesListScreenProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const list = await api.listMyProfiles();
      setProfiles(list);
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message ? err.message : 'Không thể tải danh sách hồ sơ.'
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const handleConfirmDelete = async (profileId: string) => {
    setErrorMessage(null);
    try {
      await api.deleteProfile(profileId);
      setConfirmDeleteId(null);
      await loadProfiles();
    } catch (err) {
      setConfirmDeleteId(null);
      setErrorMessage(
        err instanceof Error && err.message ? err.message : 'Không thể xóa hồ sơ bệnh nhân.'
      );
    }
  };

  return (
    <ScrollView style={styles.screen} testID="profiles-list-screen">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Hồ sơ người bệnh</Text>
        <Pressable
          testID="profiles-create-button"
          style={styles.createBtn}
          onPress={() => router.push('/(patient)/profiles/create' as never)}
        >
          <Text style={styles.createBtnText}>+ Thêm hồ sơ</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.stateBox} testID="profiles-loading">
          <ActivityIndicator color={tokens.colors.primary} />
          <Text style={styles.stateText}>Đang tải hồ sơ...</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox} testID="profiles-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable
            testID="profiles-retry-button"
            style={styles.retryBtn}
            onPress={() => void loadProfiles()}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !errorMessage && profiles.length === 0 ? (
        <View style={styles.stateBox} testID="profiles-empty">
          <Text style={styles.stateText}>Chưa có hồ sơ bệnh nhân nào được tạo.</Text>
        </View>
      ) : null}

      {!loading &&
        profiles.map((profile) => (
          <View key={profile.patientProfileId}>
            <ProfileCard
              profile={profile}
              onEdit={(item) =>
                router.push(`/(patient)/profiles/${item.patientProfileId}` as never)
              }
              onDelete={(item) => setConfirmDeleteId(item.patientProfileId)}
            />
            {confirmDeleteId === profile.patientProfileId ? (
              <View
                style={styles.confirmBox}
                testID={`profile-confirm-delete-${profile.patientProfileId}`}
              >
                <Text style={styles.confirmText}>
                  Xác nhận xóa hồ sơ {profile.fullName}?
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    testID={`profile-confirm-yes-${profile.patientProfileId}`}
                    style={styles.confirmDangerBtn}
                    onPress={() => void handleConfirmDelete(profile.patientProfileId)}
                  >
                    <Text style={styles.confirmDangerText}>Xác nhận xóa</Text>
                  </Pressable>
                  <Pressable
                    testID={`profile-confirm-no-${profile.patientProfileId}`}
                    style={styles.confirmCancelBtn}
                    onPress={() => setConfirmDeleteId(null)}
                  >
                    <Text style={styles.confirmCancelText}>Hủy</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
  },
  createBtn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
  },
  createBtnText: {
    color: tokens.colors.surface,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
  stateBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  stateText: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.body,
    marginTop: tokens.spacing.sm,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.caption,
  },
  retryBtn: {
    marginTop: tokens.spacing.sm,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: tokens.colors.primaryDark,
    fontWeight: '600',
  },
  confirmBox: {
    backgroundColor: tokens.colors.warningBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
  },
  confirmText: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.caption,
    marginBottom: tokens.spacing.sm,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  confirmDangerBtn: {
    backgroundColor: tokens.colors.danger,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
  confirmDangerText: {
    color: tokens.colors.surface,
    fontWeight: '600',
  },
  confirmCancelBtn: {
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
  confirmCancelText: {
    color: tokens.colors.textSecondary,
  },
});

