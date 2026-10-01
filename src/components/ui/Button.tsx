import React from 'react';
import {ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import type {LucideIcon} from 'lucide-react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {PressableScale} from './PressableScale';
import {Text} from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
type Size = 'lg' | 'md' | 'sm';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const heights: Record<Size, number> = {lg: 54, md: 46, sm: 36};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  icon: Icon,
  iconRight: IconRight,
  fullWidth = true,
  style,
}: Props) {
  const {colors, radius} = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: {bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary},
    secondary: {bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft},
    ghost: {bg: 'transparent', fg: colors.text, border: colors.borderStrong},
    danger: {bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft},
    inverse: {bg: '#FFFFFF', fg: colors.primary, border: '#FFFFFF'},
  }[variant];

  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{disabled: !!inactive, busy: !!loading}}
      accessibilityLabel={title}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: size === 'sm' ? 14 : 20,
          borderRadius: size === 'sm' ? radius.md : radius.lg,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {Icon && <Icon size={iconSize} color={palette.fg} strokeWidth={2.2} />}
          <Text variant={size === 'sm' ? 'label' : 'title'} color={palette.fg}>
            {title}
          </Text>
          {IconRight && <IconRight size={iconSize} color={palette.fg} strokeWidth={2.2} />}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
});
