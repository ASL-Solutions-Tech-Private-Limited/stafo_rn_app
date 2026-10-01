import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import type {LucideIcon} from 'lucide-react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {PressableScale} from './PressableScale';

type Props = {
  icon: LucideIcon;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: 'surface' | 'glass' | 'plain';
  size?: number;
  badge?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 42,
  badge,
  style,
}: Props) {
  const {colors, radius} = useTheme();
  const look = {
    surface: {bg: colors.surface, fg: colors.text, border: colors.border},
    glass: {bg: 'rgba(255,255,255,0.16)', fg: '#FFFFFF', border: 'rgba(255,255,255,0.22)'},
    plain: {bg: 'transparent', fg: colors.text, border: 'transparent'},
  }[variant];

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: look.bg,
          borderWidth: 1,
          borderColor: look.border,
        },
        style,
      ]}>
      <Icon size={size * 0.46} color={look.fg} strokeWidth={2} />
      {badge && (
        <View
          style={{
            position: 'absolute',
            top: size * 0.22,
            right: size * 0.24,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.danger,
            borderWidth: 1.5,
            borderColor: variant === 'glass' ? colors.heroFrom : colors.surface,
          }}
        />
      )}
    </PressableScale>
  );
}
