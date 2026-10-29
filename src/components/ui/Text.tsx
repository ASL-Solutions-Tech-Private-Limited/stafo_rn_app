import React from 'react';
import {Text as RNText, type TextProps as RNTextProps} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import type {ColorTokens, TypographyVariant} from '../../theme/tokens';

type Tone = 'default' | 'muted' | 'subtle' | 'primary' | 'success' | 'warning' | 'danger' | 'inverse';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

const toneToColor = (tone: Tone, c: ColorTokens) =>
  ({
    default: c.text,
    muted: c.textMuted,
    subtle: c.textSubtle,
    primary: c.primary,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
    // White on the brand gradient headers (light and dark).
    inverse: '#FFFFFF',
  }[tone]);

export function Text({variant = 'body', tone = 'default', color, align, style, ...rest}: TextProps) {
  const {colors, typography} = useTheme();
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      style={[
        typography[variant],
        {color: color ?? toneToColor(tone, colors)},
        align && {textAlign: align},
        variant === 'overline' && {textTransform: 'uppercase'},
        style,
      ]}
      {...rest}
    />
  );
}
