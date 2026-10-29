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
import {CONTENT_MAX_WIDTH, useLayout} from '../../lib/layout';
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
  /** Use the full width on a tablet instead of a centred reading column. */
  wide?: boolean;
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
  wide,
}: Props) {
  const {colors, dark} = useTheme();
  const {isTablet} = useLayout();
  const column: ViewStyle | null =
    isTablet && !wide ? {width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center'} : null;
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
      contentContainerStyle={[{flexGrow: 1}, padding, contentStyle, column]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{flex: 1}, padding, contentStyle, column]}>{children}</View>
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
