import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {CircleAlert, CircleCheck, Info} from 'lucide-react-native';
import {create} from 'zustand';
import {useTheme} from '../../theme/ThemeProvider';
import {Text} from './Text';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = {id: number; kind: ToastKind; message: string};

const useToastStore = create<{
  current: ToastItem | null;
  show: (kind: ToastKind, message: string) => void;
  hide: () => void;
}>(set => ({
  current: null,
  show: (kind, message) => set({current: {id: Date.now(), kind, message}}),
  hide: () => set({current: null}),
}));

/** Callable from anywhere, including non-React code like the API client. */
export const toast = {
  success: (message: string) => useToastStore.getState().show('success', message),
  error: (message: string) => useToastStore.getState().show('error', message),
  info: (message: string) => useToastStore.getState().show('info', message),
};

const DURATION_MS = 3200;

export function ToastHost() {
  const {colors, radius, shadows, spacing} = useTheme();
  const insets = useSafeAreaInsets();
  const current = useToastStore(s => s.current);
  const hide = useToastStore(s => s.hide);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) {
      return;
    }
    anim.setValue(0);
    Animated.spring(anim, {toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6}).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, {toValue: 0, duration: 180, useNativeDriver: true}).start(() => hide());
    }, DURATION_MS);
    return () => clearTimeout(timer);
  }, [current, anim, hide]);

  if (!current) {
    return null;
  }

  const look = {
    success: {Icon: CircleCheck, fg: colors.success, bg: colors.successSoft},
    error: {Icon: CircleAlert, fg: colors.danger, bg: colors.dangerSoft},
    info: {Icon: Info, fg: colors.primary, bg: colors.primarySoft},
  }[current.kind];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        top: insets.top + spacing.sm,
        opacity: anim,
        transform: [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [-24, 0]})}],
      }}>
      <Pressable
        onPress={hide}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            paddingRight: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceRaised,
            borderWidth: 1,
            borderColor: colors.border,
          },
          shadows.raised,
        ]}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: look.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <look.Icon size={18} color={look.fg} />
        </View>
        <Text variant="body" style={{flex: 1}}>
          {current.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
