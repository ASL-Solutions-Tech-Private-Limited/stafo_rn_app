import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme/ThemeProvider';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  /** Pad the top with the status bar inset. Off when a hero header draws behind it. */
  safeTop?: boolean;
  safeBottom?: boolean;
  statusBar?: 'light' | 'dark' | 'auto';
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: ScrollViewProps['refreshControl'];
};

export function Screen({
  children,
  scroll,
  keyboard,
  safeTop = true,
  safeBottom = true,
  statusBar = 'auto',
  contentStyle,
  refreshControl,
}: Props) {
  const {colors, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const barStyle =
    statusBar === 'auto' ? (dark ? 'light-content' : 'dark-content') : (`${statusBar}-content` as const);

  const padding: ViewStyle = {
    paddingTop: safeTop ? insets.top : 0,
    paddingBottom: safeBottom ? insets.bottom : 0,
  };

  const body = scroll ? (
    <ScrollView
      style={{flex: 1}}
      contentContainerStyle={[{flexGrow: 1}, padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{flex: 1}, padding, contentStyle]}>{children}</View>
  );

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle={barStyle} />
      {keyboard ? (
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}
