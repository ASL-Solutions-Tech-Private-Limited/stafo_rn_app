import React from 'react';
import {Pressable, View, type StyleProp, type ViewStyle} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {Text} from './Text';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function SectionHeader({title, subtitle, actionLabel = 'See all', onAction, style}: Props) {
  const {colors, spacing} = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        },
        style,
      ]}>
      <View style={{flex: 1}}>
        <Text variant="h3">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" style={{marginTop: 2}}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
          <Text variant="label" tone="primary">
            {actionLabel}
          </Text>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}
