import React from 'react';
import {Modal, Pressable, View} from 'react-native';
import type {LucideIcon} from 'lucide-react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {Button} from './Button';
import {Text} from './Text';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: LucideIcon;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  icon: Icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const {colors, radius, spacing} = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable
        style={{flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xxl}}
        onPress={onCancel}>
        <Pressable
          style={{backgroundColor: colors.surface, borderRadius: radius.xxl, padding: spacing.xxl}}
          accessibilityViewIsModal>
          {Icon && (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: destructive ? colors.dangerSoft : colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}>
              <Icon size={24} color={destructive ? colors.danger : colors.primary} />
            </View>
          )}
          <Text variant="h2">{title}</Text>
          {message ? (
            <Text variant="bodyRegular" tone="muted" style={{marginTop: spacing.sm}}>
              {message}
            </Text>
          ) : null}
          <View style={{flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl}}>
            <Button title={cancelLabel} variant="ghost" size="md" onPress={onCancel} style={{flex: 1}} />
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              size="md"
              loading={loading}
              onPress={onConfirm}
              style={{flex: 1}}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
