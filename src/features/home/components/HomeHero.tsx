import React from 'react';
import {View} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Bell} from 'lucide-react-native';
import {Avatar, Gradient, IconButton, PressableScale, Text} from '../../../components/ui';
import {formatLongDate, greeting} from '../../../lib/date';
import {useTheme} from '../../../theme/ThemeProvider';

type Props = {
  name: string;
  subtitle?: string | null;
  avatarUri?: string | null;
  onAvatarPress?: () => void;
  onNotificationsPress?: () => void;
  /** Scroll offset of the parent list; drives the parallax fade. */
  scrollY?: SharedValue<number>;
  /** Content that overlaps the bottom edge of the hero (e.g. the punch card). */
  children?: React.ReactNode;
};

export const HERO_OVERLAP = 56;

export function HomeHero({
  name,
  subtitle,
  avatarUri,
  onAvatarPress,
  onNotificationsPress,
  scrollY,
  children,
}: Props) {
  const {colors, spacing} = useTheme();
  const insets = useSafeAreaInsets();
  const firstName = name.split(' ')[0];

  // Greeting drifts up at half speed and fades as the page scrolls.
  const contentStyle = useAnimatedStyle(() => {
    const y = scrollY?.value ?? 0;
    return {
      opacity: interpolate(y, [0, 120], [1, 0], Extrapolation.CLAMP),
      transform: [{translateY: interpolate(y, [-100, 0, 160], [-30, 0, 60], Extrapolation.CLAMP)}],
    };
  });

  return (
    <View>
      <Gradient
        from={colors.heroFrom}
        to={colors.heroTo}
        decorated
        style={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: children ? HERO_OVERLAP + spacing.xl : spacing.xxl,
        }}>
        <Animated.View style={contentStyle}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
            <PressableScale
              onPress={onAvatarPress}
              accessibilityRole="button"
              accessibilityLabel="Open profile">
              <Avatar name={name} uri={avatarUri} size={48} ring="rgba(255,255,255,0.5)" />
            </PressableScale>
            <View style={{flex: 1}}>
              <Text variant="caption" color="rgba(255,255,255,0.75)">
                {greeting()} 👋
              </Text>
              <Text variant="h2" tone="inverse" numberOfLines={1}>
                {firstName}
              </Text>
            </View>
            <IconButton
              icon={Bell}
              variant="glass"
              accessibilityLabel="Notifications"
              onPress={onNotificationsPress}
            />
          </View>
          <Text variant="caption" color="rgba(255,255,255,0.7)" style={{marginTop: spacing.lg}}>
            {formatLongDate()}
            {subtitle ? `  ·  ${subtitle}` : ''}
          </Text>
        </Animated.View>
      </Gradient>
      {children ? (
        <View style={{marginTop: -HERO_OVERLAP, paddingHorizontal: spacing.lg}}>{children}</View>
      ) : null}
    </View>
  );
}
