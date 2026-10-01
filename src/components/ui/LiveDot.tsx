import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** A small dot with a soft expanding ring, marking something live right now. */
export function LiveDot({color, size = 8}: {color: string; size?: number}) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {duration: 1400, easing: Easing.out(Easing.quad)}),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  }, [pulse]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.value),
    transform: [{scale: 1 + pulse.value * 1.6}],
  }));
  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View
        style={[
          {position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color},
          ringStyle,
        ]}
      />
      <View style={{width: size - 1, height: size - 1, borderRadius: size / 2, backgroundColor: color}} />
    </View>
  );
}
