import React, {useState} from 'react';
import {RefreshControl, StatusBar, View} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Bell} from 'lucide-react-native';
import {Avatar, IconButton, PressableScale, Text} from '../../../components/ui';
import {useTheme} from '../../../theme/ThemeProvider';
import {unreadCount, useInbox} from '../../notifications/inbox';
import {HomeHero} from './HomeHero';

type Props = {
  name: string;
  subtitle?: string | null;
  /** "Manager" / "HR" next to the name. */
  roleLabel?: string;
  avatarUri?: string | null;
  onAvatarPress?: () => void;
  onNotificationsPress?: () => void;
  /** The card that overlaps the hero (punch card / attendance summary). */
  heroCard: React.ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
};

/** Scroll distance after which the compact header takes over. */
const COLLAPSE_START = 110;
const COLLAPSE_END = 160;

/**
 * Home screen scaffold: gradient hero with parallax, and a compact solid
 * header that slides in once the hero scrolls away. The status bar switches
 * from light to dark icons with it, so it stays readable.
 */
export function HomeLayout({
  name,
  subtitle,
  roleLabel,
  avatarUri,
  onAvatarPress,
  onNotificationsPress,
  heroCard,
  refreshing,
  onRefresh,
  children,
}: Props) {
  const navigation = useNavigation();
  const unread = useInbox(st => unreadCount(st.items));
  // The bell opens Notifications unless the screen says otherwise.
  const onBell = onNotificationsPress ?? (() => navigation.navigate('Notifications'));
  const {colors, spacing, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [collapsed, setCollapsed] = useState(false);

  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });

  useAnimatedReaction(
    () => scrollY.value > (COLLAPSE_START + COLLAPSE_END) / 2,
    (isCollapsed, previous) => {
      if (isCollapsed !== previous) {
        scheduleOnRN(setCollapsed, isCollapsed);
      }
    },
  );

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [0, 1], Extrapolation.CLAMP),
    transform: [
      {translateY: interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [-12, 0], Extrapolation.CLAMP)},
    ],
  }));

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle={collapsed && !dark ? 'dark-content' : 'light-content'} animated />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: spacing.xxxl}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textOnPrimary}
            colors={[colors.primary]}
            progressViewOffset={insets.top + 8}
          />
        }>
        <HomeHero
          name={name}
          subtitle={subtitle}
          roleLabel={roleLabel}
          avatarUri={avatarUri}
          onAvatarPress={onAvatarPress}
          onNotificationsPress={onBell}
          notificationsBadge={unread > 0}
          scrollY={scrollY}>
          {heroCard}
        </HomeHero>
        {children}
      </Animated.ScrollView>

      <Animated.View
        pointerEvents={collapsed ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          headerStyle,
        ]}>
        <View
          style={{
            height: 56,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
          }}>
          <PressableScale
            onPress={onAvatarPress}
            accessibilityRole="button"
            accessibilityLabel="Open profile">
            <Avatar name={name} uri={avatarUri} size={34} />
          </PressableScale>
          <Text variant="h3" numberOfLines={1} style={{flex: 1}}>
            {name}
          </Text>
          <IconButton
            icon={Bell}
            size={38}
            accessibilityLabel={unread ? `Notifications, ${unread} new` : 'Notifications'}
            badge={unread > 0}
            onPress={onBell}
          />
        </View>
      </Animated.View>
    </View>
  );
}
