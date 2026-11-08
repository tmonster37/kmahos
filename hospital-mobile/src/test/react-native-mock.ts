import React from 'react';

function createHostComponent(name: string) {
  const Component = React.forwardRef<unknown, Record<string, unknown>>((props, ref) =>
    React.createElement(name, { ...props, ref }, props.children as React.ReactNode)
  );
  Component.displayName = name;
  return Component;
}

export const View = createHostComponent('View');
export const Text = createHostComponent('Text');
export const TextInput = createHostComponent('TextInput');
export const Pressable = createHostComponent('Pressable');
export const ActivityIndicator = createHostComponent('ActivityIndicator');
export const ScrollView = createHostComponent('ScrollView');
export const TouchableOpacity = createHostComponent('TouchableOpacity');
export const Image = createHostComponent('Image');

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: (style: unknown) => style,
};

export const Platform = {
  OS: 'android',
  select: <T>(specifics: { android?: T; ios?: T; default?: T }): T | undefined =>
    specifics.android ?? specifics.default,
};

export function useColorScheme() {
  return 'light';
}
