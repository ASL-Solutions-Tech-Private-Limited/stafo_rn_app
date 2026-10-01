import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {StorageKeys, zustandStorage} from '../lib/storage';
import {darkColors, lightColors, radius, shadows, spacing, typography, type ColorTokens} from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

export const useThemePreference = create<{
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}>()(
  persist(
    set => ({
      preference: 'system',
      setPreference: preference => set({preference}),
    }),
    {name: StorageKeys.themePreference, storage: createJSONStorage(() => zustandStorage)},
  ),
);

export type Theme = {
  dark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const system = useColorScheme();
  const preference = useThemePreference(s => s.preference);
  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      dark,
      colors: dark ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      shadows,
    }),
    [dark],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return theme;
}
