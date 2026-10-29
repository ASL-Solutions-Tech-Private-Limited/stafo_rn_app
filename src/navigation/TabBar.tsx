import React, {useEffect, useState} from 'react';
import {Image, Pressable, View} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import Animated, {ReduceMotion, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Fingerprint, House, LayoutGrid, UserRound, Users, type LucideIcon} from 'lucide-react-native';
import {Text} from '../components/ui';
import {haptics} from '../lib/haptics';
import {useLayout} from '../lib/layout';
import {useTheme} from '../theme/ThemeProvider';

const ICONS: Record<string, LucideIcon> = {
  Home: House,
  Attendance: Fingerprint,
  People: Users,
  Apps: LayoutGrid,
  Profile: UserRound,
};

const PILL_WIDTH = 58;
const PILL_HEIGHT = 32;

export function TabBar(props: BottomTabBarProps) {
  const {isTablet} = useLayout();
  return isTablet ? <SideRail {...props} /> : <BottomBar {...props} />;
}

const STAFO_LOGO = require('../assets/stafo-logo.png');

/** On a tablet the tabs sit in a rail down the left edge. */
function SideRail({state, descriptors, navigation}: BottomTabBarProps) {
  const {colors, spacing} = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        width: 96 + insets.left,
        paddingLeft: insets.left,
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.lg,
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRightWidth: 1,
        borderRightColor: colors.border,
      }}>
      <Image
        source={STAFO_LOGO}
        style={{width: 48, height: 48, borderRadius: 24, marginBottom: spacing.xl}}
        accessibilityIgnoresInvertColors
      />
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = descriptors[route.key].options.title ?? route.name;
        const Icon = ICONS[route.name] ?? House;
        const onPress = () => {
          const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
          if (!focused && !event.defaultPrevented) {
            haptics.select();
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{selected: focused}}
            accessibilityLabel={label}
            style={{
              width: 76,
              paddingVertical: 10,
              borderRadius: 16,
              alignItems: 'center',
              gap: 4,
              backgroundColor: focused ? colors.primarySoft : 'transparent',
            }}>
            <Icon
              size={24}
              color={focused ? colors.primary : colors.textSubtle}
              strokeWidth={focused ? 2.3 : 2}
            />
            <Text
              variant="caption"
              tone={focused ? 'primary' : 'subtle'}
              style={focused ? {fontFamily: 'PlusJakartaSans-Bold'} : null}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BottomBar({state, descriptors, navigation}: BottomTabBarProps) {
  const {colors, spacing, shadows, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = rowWidth / state.routes.length;

  // The highlight pill glides to the active tab.
  const pillX = useSharedValue(0);
  useEffect(() => {
    if (tabWidth > 0) {
      pillX.value = withSpring(state.index * tabWidth + (tabWidth - PILL_WIDTH) / 2, {
        damping: 18,
        stiffness: 220,
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [state.index, tabWidth, pillX]);
  const pillStyle = useAnimatedStyle(() => ({transform: [{translateX: pillX.value}]}));

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          paddingHorizontal: spacing.sm,
        },
        !dark && shadows.card,
      ]}>
      <View style={{flexDirection: 'row'}} onLayout={e => setRowWidth(e.nativeEvent.layout.width)}>
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 2,
                left: 0,
                width: PILL_WIDTH,
                height: PILL_HEIGHT,
                borderRadius: PILL_HEIGHT / 2,
                backgroundColor: colors.primarySoft,
              },
              pillStyle,
            ]}
          />
        )}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const {options} = descriptors[route.key];
          const label = options.title ?? route.name;
          const Icon = ICONS[route.name] ?? House;

          const onPress = () => {
            const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
            if (!focused && !event.defaultPrevented) {
              haptics.select();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{selected: focused}}
              accessibilityLabel={label}
              style={{flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2}}>
              <View style={{height: PILL_HEIGHT, justifyContent: 'center'}}>
                <Icon
                  size={22}
                  color={focused ? colors.primary : colors.textSubtle}
                  strokeWidth={focused ? 2.3 : 2}
                />
              </View>
              <Text
                variant="caption"
                tone={focused ? 'primary' : 'subtle'}
                style={focused ? {fontFamily: 'PlusJakartaSans-Bold'} : null}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
