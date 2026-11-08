import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { BrandLogo } from './BrandLogo';

export interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  logoSize?: number;
  align?: 'center' | 'left';
}

export function BrandHeader({
  title = 'Cổng Bệnh Nhân',
  subtitle = 'Nền tảng tiếp đón & chăm sóc sức khỏe Bệnh viện TNT',
  logoSize = 56,
  align = 'center',
}: BrandHeaderProps) {
  const isCentered = align === 'center';

  return (
    <View style={[styles.container, isCentered ? styles.centerAlign : styles.leftAlign]}>
      <BrandLogo size={logoSize} />
      <Text style={[styles.brandName, isCentered && styles.textCenter]}>
        TNT HOSPITAL
      </Text>
      <Text style={[styles.title, isCentered && styles.textCenter]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, isCentered && styles.textCenter]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.lg,
  },
  centerAlign: {
    alignItems: 'center',
  },
  leftAlign: {
    alignItems: 'flex-start',
  },
  textCenter: {
    textAlign: 'center',
  },
  brandName: {
    fontSize: tokens.typography.small,
    fontWeight: '700',
    color: tokens.colors.primary,
    letterSpacing: 1.5,
    marginTop: tokens.spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: tokens.typography.title,
    fontWeight: '700',
    color: tokens.colors.primaryDark,
    marginTop: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.caption,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.xs,
    lineHeight: 20,
  },
});

export default BrandHeader;

