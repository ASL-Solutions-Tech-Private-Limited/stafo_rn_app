import {createMMKV} from 'react-native-mmkv';
import type {StateStorage} from 'zustand/middleware';

/** App-wide key/value store (synchronous, native-backed). */
export const storage = createMMKV({id: 'stafo'});

/** Adapter so zustand's `persist` middleware can write to MMKV. */
export const zustandStorage: StateStorage = {
  getItem: name => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: name => {
    storage.remove(name);
  },
};

export const StorageKeys = {
  session: 'session',
  onboardingSeen: 'onboarding_seen',
  themePreference: 'theme_preference',
} as const;
