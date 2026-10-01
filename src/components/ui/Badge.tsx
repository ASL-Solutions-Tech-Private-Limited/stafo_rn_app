import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {LiveDot} from './LiveDot';
import {Text} from './Text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
  /** Pulsing dot for something happening right now. */
  live?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Badge({label, tone = 'neutral', dot, live, style}: Props) {
  const {colors, radius} = useTheme();
  const map = {
    neutral: {fg: colors.textMuted, bg: colors.surfaceMuted},
    primary: {fg: colors.primary, bg: colors.primarySoft},
    success: {fg: colors.success, bg: colors.successSoft},
    warning: {fg: colors.warning, bg: colors.warningSoft},
    danger: {fg: colors.danger, bg: colors.dangerSoft},
    info: {fg: colors.info, bg: colors.infoSoft},
  }[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: map.bg,
        },
        style,
      ]}>
      {live ? (
        <LiveDot color={map.fg} size={7} />
      ) : dot ? (
        <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: map.fg}} />
      ) : null}
      <Text variant="caption" color={map.fg} style={{fontFamily: 'PlusJakartaSans-SemiBold'}}>
        {label}
      </Text>
    </View>
  );
}
