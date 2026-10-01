import React from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import type {LucideIcon} from 'lucide-react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {Text} from './Text';

type Props = {
  icon: LucideIcon;
  title: string;
  message?: string;
  compact?: boolean;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({icon: Icon, title, message, compact, action, style}: Props) {
  const {colors, spacing} = useTheme();
  const well = compact ? 44 : 64;
  return (
    <View style={[{alignItems: 'center', paddingVertical: compact ? spacing.lg : spacing.xxxl}, style]}>
      <View
        style={{
          width: well,
          height: well,
          borderRadius: well / 2,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        }}>
        <Icon size={well * 0.45} color={colors.primary} />
      </View>
      <Text variant={compact ? 'label' : 'h3'} align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="caption" tone="muted" align="center" style={{marginTop: 4, maxWidth: 280}}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={{marginTop: spacing.lg}}>{action}</View> : null}
    </View>
  );
}
