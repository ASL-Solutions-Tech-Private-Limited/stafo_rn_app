import React from 'react';
import {View, type StyleProp, type ViewProps, type ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {PressableScale} from './PressableScale';

type Props = ViewProps & {
  padded?: boolean;
  elevated?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Card({padded = true, elevated = true, onPress, style, children, ...rest}: Props) {
  const {colors, radius, shadows, spacing, dark} = useTheme();
  const cardStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: padded ? spacing.lg : 0,
    },
    elevated && !dark && shadows.card,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={cardStyle} accessibilityRole="button" {...rest}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}
