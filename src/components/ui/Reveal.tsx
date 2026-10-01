import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import Animated, {FadeInDown, ReduceMotion} from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  /** Position in a sequence; each step starts a little later. */
  index?: number;
  style?: StyleProp<ViewStyle>;
};

const STEP_MS = 70;

/**
 * Fades and lifts its content in when first mounted, staggered by `index`.
 * Skipped automatically when the OS "reduce motion" setting is on.
 */
export function Reveal({children, index = 0, style}: Props) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.delay(index * STEP_MS)
        .duration(420)
        .withInitialValues({transform: [{translateY: 16}]})
        .reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}
