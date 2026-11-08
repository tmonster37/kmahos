import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { PatientProfile } from '../profiles.types';

export interface ProfileCardProps {
  profile: PatientProfile;
  onEdit?: (profile: PatientProfile) => void;
  onDelete?: (profile: PatientProfile) => void;
}

export function ProfileCard({ profile, onEdit, onDelete }: ProfileCardProps) {
  return (
    <View style={styles.card} testID={`profile-card-${profile.patientProfileId}`}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{profile.fullName}</Text>
        <Text style={styles.badge}>{profile.relationship || 'SELF'}</Text>
      </View>

      <Text style={styles.meta}>Ngày sinh: {profile.dateOfBirth}</Text>
      <Text style={styles.meta}>Giới tính: {profile.gender}</Text>
      {profile.phoneNumber ? <Text style={styles.meta}>SĐT: {profile.phoneNumber}</Text> : null}

      <View style={styles.actions}>
        {onEdit ? (
          <Pressable
            testID={`profile-edit-${profile.patientProfileId}`}
            accessibilityRole="button"
            style={styles.editBtn}
            onPress={() => onEdit(profile)}
          >
            <Text style={styles.editText}>Chỉnh sửa</Text>
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable
            testID={`profile-delete-${profile.patientProfileId}`}
            accessibilityRole="button"
            style={styles.deleteBtn}
            onPress={() => onDelete(profile)}
          >
            <Text style={styles.deleteText}>Xóa</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    marginBottom: tokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  name: {
    fontSize: tokens.typography.subtitle,
    fontWeight: '700',
    color: tokens.colors.textPrimary,
  },
  badge: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    color: tokens.colors.primaryDark,
    backgroundColor: tokens.colors.primaryLight,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
  },
  meta: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  editBtn: {
    backgroundColor: tokens.colors.primaryLight,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
  editText: {
    color: tokens.colors.primaryDark,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
  deleteBtn: {
    backgroundColor: tokens.colors.dangerBg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
  },
  deleteText: {
    color: tokens.colors.danger,
    fontWeight: '600',
    fontSize: tokens.typography.caption,
  },
});

