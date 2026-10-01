import React, {useEffect, useState} from 'react';
import {Pressable, View} from 'react-native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import Animated, {ReduceMotion, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Fingerprint, House, LayoutGrid, UserRound, Users, type LucideIcon} from 'lucide-react-native';
import {Text} from '../components/ui';
import {haptics} from '../lib/haptics';
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

export function TabBar({state, descriptors, navigation}: BottomTabBarProps) {
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
