import React, {useId} from 'react';
import {StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

type Props = ViewProps & {
  from: string;
  to: string;
  /** Adds soft decorative circles, used on hero headers. */
  decorated?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Diagonal gradient background drawn with SVG (no extra native module). */
export function Gradient({from, to, decorated, style, children, ...rest}: Props) {
  const id = useId().replace(/:/g, '');
  return (
    <View style={[styles.container, style]} {...rest}>
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
        {decorated && (
          <>
            <Circle cx="88%" cy="8%" r="120" fill="#FFFFFF" fillOpacity={0.07} />
            <Circle cx="100%" cy="70%" r="70" fill="#FFFFFF" fillOpacity={0.05} />
            <Circle cx="4%" cy="100%" r="90" fill="#FFFFFF" fillOpacity={0.05} />
          </>
        )}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({container: {overflow: 'hidden'}});
