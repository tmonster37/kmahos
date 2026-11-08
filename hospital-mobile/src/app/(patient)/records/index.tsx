import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { profilesApi, ProfilesApi } from '@/features/profiles/profiles.api';
import { PatientProfile } from '@/features/profiles/profiles.types';
import { RecordSummaryCard } from '@/features/records/components/RecordSummaryCard';
import { recordsApi, RecordsApi } from '@/features/records/records.api';
import { MedicalRecord } from '@/features/records/records.types';
import { ApiClientError } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';

export interface MedicalRecordsListScreenProps {
  profilesService?: ProfilesApi;
  recordsService?: RecordsApi;
}

export default function MedicalRecordsListScreen({
  profilesService = profilesApi,
  recordsService = recordsApi,
}: MedicalRecordsListScreenProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRecordsForSelectedProfile = useCallback(
    async (profileId: string) => {
      if (!profileId) {
        setRecords([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const list = await recordsService.listRecordsForProfile(profileId);
        setRecords(list);
      } catch (err) {
        setRecords([]);
        if (err instanceof ApiClientError && (err.status === 403 || err.status === 404)) {
          setErrorMessage('Bạn không có quyền truy cập hoặc hồ sơ bệnh án không tồn tại.');
        } else {
          setErrorMessage(
            err instanceof Error && err.message
              ? err.message
              : 'Không thể tải lịch sử bệnh án.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [recordsService]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const ownedProfiles = await profilesService.listMyProfiles();
        if (!active) return;
        setProfiles(ownedProfiles);
        if (ownedProfiles.length > 0) {
          const initialId = ownedProfiles[0].patientProfileId;
          setSelectedProfileId(initialId);
          await loadRecordsForSelectedProfile(initialId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (!active) return;
        setErrorMessage(
          err instanceof Error && err.message
            ? err.message
            : 'Không thể tải danh sách hồ sơ bệnh nhân.'
        );
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [profilesService, loadRecordsForSelectedProfile]);

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    void loadRecordsForSelectedProfile(profileId);
  };

  return (
    <ScrollView style={styles.screen} testID="records-list-screen">
      <Text style={styles.title}>Hồ sơ bệnh án điện tử</Text>

      <View style={styles.profileChips}>
        {profiles.map((p) => (
          <Pressable
            key={p.patientProfileId}
            testID={`records-profile-chip-${p.patientProfileId}`}
            style={[
              styles.chip,
              selectedProfileId === p.patientProfileId && styles.chipActive,
            ]}
            onPress={() => handleSelectProfile(p.patientProfileId)}
          >
            <Text style={styles.chipText}>{p.fullName}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.stateBox} testID="records-loading">
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : null}

      {!loading && errorMessage ? (
        <View style={styles.errorBox} testID="records-error">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!loading && !errorMessage && records.length === 0 ? (
        <View style={styles.stateBox} testID="records-empty">
          <Text style={styles.stateText}>Chưa có dữ liệu ghi nhận bệnh án cho hồ sơ này.</Text>
        </View>
      ) : null}

      {!loading &&
        !errorMessage &&
        records.map((rec) => (
          <RecordSummaryCard
            key={rec.recordId}
            record={rec}
            onPress={(recordId) =>
              router.push(`/(patient)/records/${recordId}` as never)
            }
          />
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
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginBottom: tokens.spacing.md,
  },
  profileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  chip: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.sm,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
  },
  chipActive: {
    backgroundColor: tokens.colors.primaryLight,
    borderColor: tokens.colors.primary,
  },
  chipText: {
    fontWeight: '600',
    color: tokens.colors.textPrimary,
  },
  stateBox: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  stateText: {
    color: tokens.colors.textSecondary,
  },
  errorBox: {
    backgroundColor: tokens.colors.dangerBg,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.sm,
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.danger,
  },
});

