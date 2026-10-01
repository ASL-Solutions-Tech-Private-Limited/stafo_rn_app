import React, {useEffect, useRef, useState} from 'react';
import {Pressable, TextInput, View, type TextInputInstance} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/tokens';
import {Text} from './Text';

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  autoFocus?: boolean;
};

function Cursor({color}: {color: string}) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0, {duration: 450}), withTiming(1, {duration: 450})),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({opacity: opacity.value}));
  return (
    <Animated.View
      style={[{position: 'absolute', width: 2, height: 22, borderRadius: 1, backgroundColor: color}, style]}
    />
  );
}

/**
 * One hidden TextInput drives the boxes, which keeps paste and SMS/Keychain
 * one-time-code autofill working on both platforms. Digits pop in, the
 * cursor blinks, and a wrong code shakes the row.
 */
export function OtpInput({length = 6, value, onChange, onComplete, error, autoFocus = true}: Props) {
  const {colors, radius} = useTheme();
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (value.length === length) {
      onComplete?.(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, length]);

  useEffect(() => {
    if (!error) {
      return;
    }
    haptics.error();
    const config = {duration: 55, reduceMotion: ReduceMotion.System};
    shakeX.value = withSequence(
      withTiming(-10, config),
      withTiming(10, config),
      withTiming(-7, config),
      withTiming(7, config),
      withTiming(-3, config),
      withTiming(0, config),
    );
  }, [error, shakeX]);

  const rowStyle = useAnimatedStyle(() => ({transform: [{translateX: shakeX.value}]}));

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityLabel="One-time code">
      <Animated.View style={[{flexDirection: 'row', justifyContent: 'space-between', gap: 8}, rowStyle]}>
        {Array.from({length}).map((_, index) => {
          const char = value[index] ?? '';
          const isActive =
            focused && (index === value.length || (index === length - 1 && value.length === length));
          const borderColor = error
            ? colors.danger
            : isActive
            ? colors.primary
            : char
            ? colors.borderStrong
            : colors.border;
          return (
            <View
              key={index}
              style={{
                flex: 1,
                aspectRatio: 0.9,
                maxHeight: 60,
                borderRadius: radius.md,
                borderWidth: isActive || error ? 1.5 : 1,
                borderColor,
                backgroundColor: char ? colors.surface : colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {char ? (
                <Animated.View
                  key={`${index}-${char}`}
                  entering={ZoomIn.duration(160).reduceMotion(ReduceMotion.System)}>
                  <Text variant="h2" style={{fontFamily: fonts.bold}}>
                    {char}
                  </Text>
                </Animated.View>
              ) : null}
              {isActive && !char && <Cursor color={colors.primary} />}
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, length))}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={{position: 'absolute', opacity: 0, width: 1, height: 1}}
      />
    </Pressable>
  );
}
