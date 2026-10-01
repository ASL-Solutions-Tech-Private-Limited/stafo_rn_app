import React from 'react';
import {Image, Pressable, View} from 'react-native';
import ImageCropPicker from 'react-native-image-crop-picker';
import {
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Glasses,
  ImageIcon,
  RotateCcw,
  ScanFace,
  SunMedium,
  type LucideIcon,
} from 'lucide-react-native';
import {BottomSheet, Button, Text, toast} from '../../../components/ui';
import {haptics} from '../../../lib/haptics';
import {useTheme} from '../../../theme/ThemeProvider';

export type SelfieSource = 'camera' | 'gallery';

/**
 * Lets the user pick a gallery photo, re-encoded upright as JPEG (≤1600px) so
 * the face check and crop see it the right way up. Returns its path, or null if
 * the user cancels.
 */
export async function pickGalleryPhoto(): Promise<string | null> {
  try {
    const image = await ImageCropPicker.openPicker({
      mediaType: 'photo',
      compressImageMaxWidth: 1600,
      compressImageMaxHeight: 1600,
      compressImageQuality: 0.9,
      forceJpg: true,
    });
    return image.path;
  } catch (e) {
    const code = (e as {code?: string}).code;
    if (code === 'E_PICKER_CANCELLED') {
      return null;
    }
    toast.error(
      code === 'E_NO_LIBRARY_PERMISSION'
        ? 'Photo access is off. Turn it on for STAFO in Settings.'
        : "Couldn't open your photos.",
    );
    return null;
  }
}

function Photo({uri, size, ring}: {uri?: string | null; size: number; ring: string}) {
  const {colors} = useTheme();
  return (
    <View
      style={{
        alignSelf: 'center',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: ring,
        overflow: 'hidden',
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {uri ? (
        <Image source={{uri}} style={{width: '100%', height: '100%'}} accessibilityLabel="Reference selfie" />
      ) : (
        <ScanFace size={size * 0.36} color={colors.textSubtle} />
      )}
    </View>
  );
}

function Tips() {
  const {colors, spacing, radius} = useTheme();
  const tips: {icon: LucideIcon; label: string}[] = [
    {icon: ScanFace, label: 'Face the camera'},
    {icon: SunMedium, label: 'Good light'},
    {icon: Glasses, label: 'No sunglasses or mask'},
  ];
  return (
    <View style={{flexDirection: 'row', gap: spacing.sm}}>
      {tips.map(t => (
        <View
          key={t.label}
          style={{
            flex: 1,
            alignItems: 'center',
            gap: 6,
            paddingVertical: 10,
            paddingHorizontal: 4,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceMuted,
          }}>
          <t.icon size={18} color={colors.textMuted} />
          <Text
            variant="caption"
            align="center"
            color={colors.textMuted}
            style={{fontFamily: 'PlusJakartaSans-SemiBold'}}>
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function SelfieSourceSheet({
  visible,
  onClose,
  onClosed,
  firstName,
  currentUri,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  firstName: string;
  currentUri?: string | null;
  onPick: (source: SelfieSource) => void;
}) {
  const {colors, spacing, radius} = useTheme();
  const option = (source: SelfieSource, Icon: LucideIcon, title: string, sub: string, primary: boolean) => (
    <Pressable
      onPress={() => {
        haptics.select();
        onPick(source);
      }}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: primary ? colors.primary : colors.border,
        backgroundColor: primary ? colors.primarySoft : colors.surface,
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: primary ? colors.surface : colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={20} color={primary ? colors.primary : colors.textMuted} />
      </View>
      <View style={{flex: 1}}>
        <Text variant="title">{title}</Text>
        <Text variant="caption" tone="muted">
          {sub}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textSubtle} />
    </Pressable>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title="Reference selfie"
      subtitle={`${firstName}'s face is matched against this photo every time they punch in with a selfie.`}>
      <Photo uri={currentUri} size={120} ring={colors.border} />
      <Text variant="caption" tone="muted" align="center" style={{marginTop: spacing.sm}}>
        {currentUri ? 'Current photo' : 'No photo yet'}
      </Text>
      <View style={{marginTop: spacing.lg}}>
        <Tips />
      </View>
      <View style={{gap: spacing.sm, marginTop: spacing.lg}}>
        {option('camera', Camera, 'Take a new photo', 'Finds the face, then takes the photo', true)}
        {option('gallery', ImageIcon, 'Choose from gallery', 'Pick an existing photo', false)}
      </View>
    </BottomSheet>
  );
}

export function SelfiePreviewSheet({
  visible,
  onClose,
  onClosed,
  uri,
  saving,
  onRetake,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  uri?: string | null;
  saving: boolean;
  onRetake: () => void;
  onSave: () => void;
}) {
  const {colors, spacing} = useTheme();
  return (
    <BottomSheet
      visible={visible}
      onClose={saving ? () => {} : onClose}
      onClosed={onClosed}
      title="Use this photo?"
      subtitle="Cropped around the face. It replaces the current reference selfie.">
      <Photo uri={uri} size={168} ring={colors.success} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: spacing.md,
        }}>
        <ScanFace size={16} color={colors.success} />
        <Text variant="label" tone="success">
          One face found and centred
        </Text>
      </View>
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg}}>
        <Button
          title="Retake"
          icon={RotateCcw}
          variant="ghost"
          size="md"
          style={{flex: 1}}
          disabled={saving}
          onPress={onRetake}
        />
        <Button
          title="Save photo"
          icon={Check}
          size="md"
          style={{flex: 1}}
          loading={saving}
          onPress={onSave}
        />
      </View>
    </BottomSheet>
  );
}

export function SelfieRejectSheet({
  visible,
  onClose,
  onClosed,
  firstName,
  uri,
  reason,
  onCamera,
  onGallery,
}: {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  firstName: string;
  uri?: string | null;
  reason: 'none' | 'many';
  onCamera: () => void;
  onGallery: () => void;
}) {
  const {colors, spacing, radius} = useTheme();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title={reason === 'many' ? 'More than one face' : 'No face in this photo'}
      subtitle={`Pick a clear photo of ${firstName} facing the camera, with only one face in it.`}>
      <Photo uri={uri} size={168} ring={colors.danger} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginTop: spacing.lg,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          backgroundColor: colors.dangerSoft,
        }}>
        <CircleAlert size={16} color={colors.danger} />
        <Text variant="caption" tone="danger" style={{flex: 1, fontFamily: 'PlusJakartaSans-SemiBold'}}>
          STAFO checks every photo for exactly one face before saving.
        </Text>
      </View>
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg}}>
        <Button title="Use camera" icon={Camera} variant="ghost" size="md" style={{flex: 1}} onPress={onCamera} />
        <Button title="Choose another" icon={ImageIcon} size="md" style={{flex: 1}} onPress={onGallery} />
      </View>
    </BottomSheet>
  );
}
