import React, {forwardRef, useState} from 'react';
import {
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import type {LucideIcon} from 'lucide-react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {fonts} from '../../theme/tokens';
import {Text} from './Text';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: LucideIcon;
  /** Fixed text before the input, e.g. a country code. */
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = forwardRef<TextInputInstance, Props>(function TextField(
  {label, hint, error, icon: Icon, prefix, containerStyle, onFocus, onBlur, style, ...rest},
  ref,
) {
  const {colors, radius, spacing} = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.borderStrong;

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" style={{marginBottom: spacing.sm}}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: rest.multiline ? 'flex-start' : 'center',
          // Multi-line fields grow with their text instead of overflowing a fixed row.
          ...(rest.multiline ? {minHeight: 96, paddingVertical: 14} : {height: 56}),
          borderRadius: radius.lg,
          borderWidth: focused || error ? 1.5 : 1,
          borderColor,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}>
        {Icon && <Icon size={20} color={focused ? colors.primary : colors.textSubtle} />}
        {prefix ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingRight: spacing.md,
              borderRightWidth: 1,
              borderRightColor: colors.border,
              height: 24,
            }}>
            <Text variant="title">{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.text, paddingVertical: 0},
            rest.multiline && {minHeight: 68, textAlignVertical: 'top'},
            style,
          ]}
          {...rest}
        />
      </View>
      {error || hint ? (
        <Text variant="caption" tone={error ? 'danger' : 'muted'} style={{marginTop: 6}}>
          {error || hint}
        </Text>
      ) : null}
    </View>
  );
});
