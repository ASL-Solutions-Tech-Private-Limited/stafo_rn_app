import React, {useRef} from 'react';
import {Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
};

/**
 * Pressable that gives subtle, springy press feedback. The style (including
 * layout like width or flex) lives on the pressable itself so it sizes
 * correctly inside rows and grids.
 */
export function PressableScale({style, scaleTo = 0.97, onPressIn, onPressOut, children, ...rest}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) =>
    Animated.spring(scale, {toValue: to, useNativeDriver: true, speed: 40, bounciness: 6}).start();

  return (
    <AnimatedPressable
      onPressIn={e => {
        animate(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={e => {
        animate(1);
        onPressOut?.(e);
      }}
      style={[style, {transform: [{scale}]}]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
