import React, {useEffect, useRef, useState} from 'react';
import {Animated, Dimensions, Keyboard, Modal, Platform, Pressable, ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {DIALOG_WIDTH, useLayout} from '../../lib/layout';
import {useTheme} from '../../theme/ThemeProvider';
import {Text} from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /**
   * Called once the sheet is fully gone. Open any follow-up sheet or dialog
   * here, not in the same tick as closing: iOS can't present a modal while
   * another is still dismissing, and the new one would silently block touches.
   */
  onClosed?: () => void;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function BottomSheet({visible, onClose, title, subtitle, children, onClosed}: Props) {
  const {colors, radius, spacing} = useTheme();
  const insets = useSafeAreaInsets();
  const {isTablet} = useLayout();
  const translate = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  // Lift the sheet above the keyboard: a translucent modal window doesn't resize for it.
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    if (!mounted) {
      return;
    }
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e =>
      setKeyboard(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboard(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [mounted]);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  // Fire onClosed exactly once per close, whichever platform path reports it.
  const closedFired = useRef(true);
  const fireClosed = () => {
    if (!closedFired.current) {
      closedFired.current = true;
      onClosedRef.current?.();
    }
  };

  useEffect(() => {
    if (visible) {
      closedFired.current = false;
      setMounted(true);
      Animated.parallel([
        Animated.spring(translate, {toValue: 0, useNativeDriver: true, speed: 16, bounciness: 4}),
        Animated.timing(backdrop, {toValue: 1, duration: 220, useNativeDriver: true}),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translate, {toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true}),
        Animated.timing(backdrop, {toValue: 0, duration: 220, useNativeDriver: true}),
      ]).start(() => {
        setMounted(false);
        // iOS reports the real dismissal through Modal.onDismiss; Android has no such limit.
        if (Platform.OS !== 'ios') {
          fireClosed();
        }
      });
    }
  }, [visible, mounted, translate, backdrop]);

  const content = (
    <>
      {title ? <Text variant="h2">{title}</Text> : null}
      {subtitle ? (
        <Text variant="bodyRegular" tone="muted" style={{marginTop: 4}}>
          {subtitle}
        </Text>
      ) : null}
      <ScrollView
        style={{marginTop: title ? spacing.xl : 0, flexGrow: 0}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {children}
      </ScrollView>
    </>
  );

  return (
    <Modal
      transparent
      visible={mounted}
      onRequestClose={onClose}
      onDismiss={Platform.OS === 'ios' ? fireClosed : undefined}
      statusBarTranslucent
      animationType="none">
      <Animated.View style={{flex: 1, backgroundColor: colors.overlay, opacity: backdrop}}>
        <Pressable style={{flex: 1}} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      {isTablet ? (
        // On a tablet the sheet is a centred dialog: a full-width sheet would be a wall of empty space.
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: keyboard,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xxl,
          }}>
          <Animated.View
            style={{
              width: '100%',
              maxWidth: DIALOG_WIDTH,
              maxHeight: '100%',
              opacity: backdrop,
              transform: [
                {translateY: translate.interpolate({inputRange: [0, SCREEN_HEIGHT], outputRange: [0, 48]})},
              ],
              backgroundColor: colors.surface,
              borderRadius: radius.xxl,
              padding: spacing.xl,
            }}>
            {content}
          </Animated.View>
        </View>
      ) : (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: keyboard,
            maxHeight: SCREEN_HEIGHT * 0.92 - keyboard,
            transform: [{translateY: translate}],
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            paddingBottom: (keyboard ? 0 : insets.bottom) + spacing.xl,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.borderStrong,
              marginBottom: spacing.lg,
            }}
          />
          {content}
        </Animated.View>
      )}
    </Modal>
  );
}
