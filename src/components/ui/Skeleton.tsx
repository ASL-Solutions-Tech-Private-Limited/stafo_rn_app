import React, {useEffect, useRef} from 'react';
import {Animated, type DimensionValue, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

type Props = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Pulsing placeholder shown while data loads. */
export function Skeleton({width = '100%', height = 14, radius = 8, style}: Props) {
  const {colors} = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0.5, duration: 700, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{width, height, borderRadius: radius, backgroundColor: colors.skeleton, opacity}, style]}
    />
  );
}
