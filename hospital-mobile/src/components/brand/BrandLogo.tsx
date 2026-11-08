import React from 'react';
import { Image, ImageStyle, StyleSheet, View } from 'react-native';

export interface BrandLogoProps {
  size?: number;
  style?: ImageStyle;
}

export function BrandLogo({ size = 56, style }: BrandLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('@/assets/images/brand-logo.png')}
        style={[{ width: size, height: size }, style]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Logo Bệnh Viện TNT"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BrandLogo;

