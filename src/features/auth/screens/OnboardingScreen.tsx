import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  useWindowDimensions,
  View,
  type ListViewToken,
  type ViewStyle,
} from 'react-native';
import Reanimated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  BarChart3,
  CalendarOff,
  Camera,
  Fingerprint,
  ListChecks,
  MapPin,
  QrCode,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import {Button, Gradient, Screen, Text} from '../../../components/ui';
import {storage, StorageKeys} from '../../../lib/storage';
import type {AuthScreenProps} from '../../../navigation/types';
import {useTheme} from '../../../theme/ThemeProvider';

type Slide = {
  key: string;
  title: string;
  body: string;
  icon: LucideIcon;
  chips: {icon: LucideIcon; label: string}[];
};

const SLIDES: Slide[] = [
  {
    key: 'attendance',
    title: 'Attendance that\njust works',
    body: 'Punch in with your location, a selfie or a QR scan, all verified against your office geofence.',
    icon: Fingerprint,
    chips: [
      {icon: MapPin, label: 'Geo'},
      {icon: Camera, label: 'Selfie'},
      {icon: QrCode, label: 'QR'},
    ],
  },
  {
    key: 'team',
    title: 'Your whole team,\none app',
    body: 'Leave, tasks, leads, trips and expenses: everything your team does every day, in one place.',
    icon: Users,
    chips: [
      {icon: CalendarOff, label: 'Leave'},
      {icon: ListChecks, label: 'Tasks'},
      {icon: MapPin, label: 'Trips'},
    ],
  },
  {
    key: 'payroll',
    title: 'Payroll and insights\nwithout the paperwork',
    body: 'Run salaries, share payslips and see live attendance reports for every branch.',
    icon: Wallet,
    chips: [
      {icon: Wallet, label: 'Payroll'},
      {icon: BarChart3, label: 'Reports'},
      {icon: Users, label: 'Staff'},
    ],
  },
];

function SlideArt({slide, size}: {slide: Slide; size: number}) {
  const {colors} = useTheme();
  const Icon = slide.icon;
  const positions = [
    {top: size * 0.08, left: -size * 0.04},
    {top: size * 0.42, right: -size * 0.1},
    {bottom: size * 0.02, left: size * 0.12},
  ];
  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primarySoft,
        }}
      />
      <Gradient
        from={colors.heroFrom}
        to={colors.heroTo}
        style={{
          width: size * 0.56,
          height: size * 0.56,
          borderRadius: size * 0.2,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{rotate: '-8deg'}],
        }}>
        <Icon size={size * 0.24} color="#FFFFFF" strokeWidth={1.8} />
      </Gradient>
      {slide.chips.map((chip, i) => (
        <FloatingChip key={chip.label} icon={chip.icon} label={chip.label} index={i} style={positions[i]} />
      ))}
    </View>
  );
}

/** Chip that gently bobs up and down, each on its own rhythm. */
function FloatingChip({
  icon: Icon,
  label,
  index,
  style,
}: {
  icon: LucideIcon;
  label: string;
  index: number;
  style: ViewStyle;
}) {
  const {colors, shadows, radius} = useTheme();
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withDelay(
      index * 400,
      withRepeat(
        withTiming(1, {duration: 1800 + index * 300, easing: Easing.inOut(Easing.sin)}),
        -1,
        true,
        undefined,
        ReduceMotion.System,
      ),
    );
  }, [bob, index]);
  const animated = useAnimatedStyle(() => ({transform: [{translateY: -6 + bob.value * 12}]}));
  return (
    <Reanimated.View
      style={[
        {
          position: 'absolute',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        shadows.card,
        style,
        animated,
      ]}>
      <Icon size={14} color={colors.primary} />
      <Text variant="label">{label}</Text>
    </Reanimated.View>
  );
}

export function OnboardingScreen({navigation}: AuthScreenProps<'Onboarding'>) {
  const {colors, spacing} = useTheme();
  const {width} = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const finish = () => {
    storage.set(StorageKeys.onboardingSeen, true);
    navigation.replace('Login');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({index: index + 1, animated: true});
    } else {
      finish();
    }
  };

  const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: ListViewToken[]}) => {
    if (viewableItems[0]?.index != null) {
      setIndex(viewableItems[0].index);
    }
  }).current;

  const artSize = Math.min(width * 0.72, 300);

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          height: 48,
        }}>
        <Text variant="h3" tone="primary" style={{letterSpacing: 1.5}}>
          STAFO
        </Text>
        {index < SLIDES.length - 1 && (
          <Pressable onPress={finish} hitSlop={10} accessibilityRole="button">
            <Text variant="label" tone="muted">
              Skip
            </Text>
          </Pressable>
        )}
      </View>

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={s => s.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{viewAreaCoveragePercentThreshold: 60}}
        onScroll={Animated.event([{nativeEvent: {contentOffset: {x: scrollX}}}], {useNativeDriver: false})}
        scrollEventThrottle={16}
        renderItem={({item}) => (
          <View
            style={{width, paddingHorizontal: spacing.xxl, alignItems: 'center', justifyContent: 'center'}}>
            <SlideArt slide={item} size={artSize} />
            <Text variant="display" align="center" style={{marginTop: spacing.huge}}>
              {item.title}
            </Text>
            <Text
              variant="bodyRegular"
              tone="muted"
              align="center"
              style={{marginTop: spacing.md, maxWidth: 320, fontSize: 15, lineHeight: 23}}>
              {item.body}
            </Text>
          </View>
        )}
      />

      <View style={{paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg, gap: spacing.xxl}}>
        <View style={{flexDirection: 'row', justifyContent: 'center', gap: 6}}>
          {SLIDES.map((s, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={s.key}
                style={{
                  height: 8,
                  borderRadius: 4,
                  width: dotWidth,
                  opacity,
                  backgroundColor: colors.primary,
                }}
              />
            );
          })}
        </View>
        <Button title={index === SLIDES.length - 1 ? 'Get started' : 'Next'} onPress={next} />
      </View>
    </Screen>
  );
}
