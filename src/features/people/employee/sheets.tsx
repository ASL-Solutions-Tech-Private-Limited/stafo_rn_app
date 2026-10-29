import React, {useEffect, useState} from 'react';
import {Pressable, View} from 'react-native';
import {
  Camera,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Fingerprint,
  MapPin,
  MapPinned,
  MapPinOff,
  QrCode,
  ScanFace,
  UserCheck,
  UserPen,
  UserX,
  type LucideIcon,
} from 'lucide-react-native';
import type {AttendanceModeValue} from '../../../api/endpoints/employee';
import type {ShiftWithDays} from '../../../api/types';
import {BottomSheet, Button, Skeleton, Text} from '../../../components/ui';
import {formatClock} from '../../../lib/date';
import {haptics} from '../../../lib/haptics';
import {useTheme} from '../../../theme/ThemeProvider';
import {workingDaysLabel} from './tabs/OverviewTab';

export function RadioCard({
  icon: Icon,
  title,
  description,
  selected,
  onPress,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  footer?: React.ReactNode;
}) {
  const {colors, spacing, radius} = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{checked: selected}}
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'flex-start',
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: selected ? colors.surface : colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={20} color={selected ? colors.primary : colors.textMuted} />
      </View>
      <View style={{flex: 1}}>
        <Text variant="title">{title}</Text>
        {description ? (
          <Text variant="caption" tone="muted" style={{marginTop: 2}}>
            {description}
          </Text>
        ) : null}
        {footer}
      </View>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}>
        {selected ? (
          <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary}} />
        ) : null}
      </View>
    </Pressable>
  );
}

const MODES: {value: AttendanceModeValue; icon: LucideIcon; title: string; description: string}[] = [
  {
    value: 'geo',
    icon: MapPin,
    title: 'Geo attendance',
    description: 'Punch from the branch geofence using GPS. Enables live tracking during the shift.',
  },
  {
    value: 'selfie',
    icon: Camera,
    title: 'Selfie attendance',
    description: 'Face capture at punch time, matched to the reference selfie.',
  },
  {
    value: 'qr code',
    icon: QrCode,
    title: 'QR code attendance',
    description: 'Scan the branch QR code shown at the office.',
  },
];

/** Normalises the server's attendance_type to one of the three modes. */
export function toModeValue(type?: string | null): AttendanceModeValue {
  const t = type?.toLowerCase().trim();
  if (t === 'geo') {
    return 'geo';
  }
  if (t === 'qr' || t === 'qr code') {
    return 'qr code';
  }
  return 'selfie';
}

export function AttendanceModeSheet({
  visible,
  onClose,
  firstName,
  current,
  hasSelfie,
  saving,
  onSave,
  onClosed,
  onAddPhoto,
}: {
  visible: boolean;
  onClose: () => void;
  firstName: string;
  current: AttendanceModeValue;
  hasSelfie: boolean;
  saving: boolean;
  onSave: (mode: AttendanceModeValue) => void;
  onClosed?: () => void;
  /** Start the reference-selfie flow (shown when selfie mode needs a photo). */
  onAddPhoto: () => void;
}) {
  const {colors, spacing} = useTheme();
  const [mode, setMode] = useState(current);
  useEffect(() => {
    if (visible) {
      setMode(current);
    }
  }, [visible, current]);
  const blocked = mode === 'selfie' && !hasSelfie;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title="Attendance mode"
      subtitle={`How ${firstName} punches in and out. Only one mode is active at a time.`}>
      <View style={{gap: spacing.sm}} accessibilityRole="radiogroup">
        {MODES.map(m => (
          <RadioCard
            key={m.value}
            icon={m.icon}
            title={m.title}
            description={m.description}
            selected={mode === m.value}
            onPress={() => setMode(m.value)}
            footer={
              m.value === 'selfie' ? (
                hasSelfie ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm}}>
                    <CircleCheck size={14} color={colors.success} />
                    <Text variant="caption" tone="success" style={{fontFamily: 'PlusJakartaSans-SemiBold'}}>
                      Reference selfie on file
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginTop: spacing.sm,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor: colors.warningSoft,
                    }}>
                    <CircleAlert size={14} color={colors.warning} />
                    <Text
                      variant="caption"
                      tone="warning"
                      style={{flex: 1, fontFamily: 'PlusJakartaSans-SemiBold'}}>
                      Needs a reference selfie first
                    </Text>
                    <Pressable onPress={onAddPhoto} hitSlop={10} accessibilityRole="button">
                      <Text variant="caption" tone="primary" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
                        Add photo
                      </Text>
                    </Pressable>
                  </View>
                )
              ) : null
            }
          />
        ))}
      </View>
      <Button
        title={mode === current ? 'No changes' : 'Save'}
        style={{marginTop: spacing.xl}}
        disabled={mode === current || blocked}
        loading={saving}
        onPress={() => onSave(mode)}
      />
    </BottomSheet>
  );
}

export function ShiftSheet({
  visible,
  onClose,
  firstName,
  shifts,
  loading,
  currentId,
  saving,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  firstName: string;
  shifts: ShiftWithDays[];
  loading: boolean;
  currentId?: number;
  saving: boolean;
  onSave: (shiftId: number) => void;
}) {
  const {spacing} = useTheme();
  const [selected, setSelected] = useState<number | undefined>(currentId);
  useEffect(() => {
    if (visible) {
      setSelected(currentId);
    }
  }, [visible, currentId]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Shift"
      subtitle={`Working hours for ${firstName}.`}>
      {loading ? (
        <Skeleton height={180} radius={16} />
      ) : (
        <View style={{gap: spacing.sm}} accessibilityRole="radiogroup">
          {shifts.map(s => (
            <RadioCard
              key={s.id}
              icon={Clock3}
              title={s.shift_name ?? 'Shift'}
              description={`${formatClock(s.start_time)} – ${formatClock(s.end_time)} · ${workingDaysLabel(
                s,
              )}`}
              selected={selected === s.id}
              onPress={() => setSelected(s.id)}
            />
          ))}
        </View>
      )}
      <Button
        title={selected === currentId ? 'No changes' : 'Assign shift'}
        style={{marginTop: spacing.xl}}
        disabled={selected == null || selected === currentId}
        loading={saving}
        onPress={() => selected != null && onSave(selected)}
      />
    </BottomSheet>
  );
}

export type MoreAction = 'edit' | 'mode' | 'shift' | 'selfie' | 'location' | 'stop-location' | 'active';

export function MoreSheet({
  visible,
  onClose,
  name,
  modeLabel,
  shiftLabel,
  hasSelfie,
  geoLabel,
  geo,
  active,
  onAction,
  onClosed,
}: {
  visible: boolean;
  onClose: () => void;
  onClosed?: () => void;
  name: string;
  modeLabel: string;
  shiftLabel: string;
  hasSelfie: boolean;
  geoLabel: string;
  /** "0" off, "1" requested, "2" sharing. */
  geo: string;
  active: boolean;
  onAction: (action: MoreAction) => void;
}) {
  const {colors, spacing, radius} = useTheme();
  const rows: {
    key: MoreAction;
    icon: LucideIcon;
    fg: string;
    bg: string;
    title: string;
    subtitle: string;
    danger?: boolean;
  }[] = [
    {
      key: 'edit',
      icon: UserPen,
      fg: colors.primary,
      bg: colors.primarySoft,
      title: 'Edit details',
      subtitle: 'Name, phone, job, pay and statutory',
    },
    {
      key: 'mode',
      icon: Fingerprint,
      fg: colors.accents[1].fg,
      bg: colors.accents[1].bg,
      title: 'Attendance mode',
      subtitle: modeLabel,
    },
    {
      key: 'shift',
      icon: Clock3,
      fg: colors.warning,
      bg: colors.warningSoft,
      title: 'Shift',
      subtitle: shiftLabel,
    },
    {
      key: 'selfie',
      icon: ScanFace,
      fg: colors.success,
      bg: colors.successSoft,
      title: hasSelfie ? 'Change reference selfie' : 'Add reference selfie',
      subtitle: hasSelfie ? 'On file · take or choose a new photo' : 'Needed for selfie attendance',
    },
    {
      key: 'location',
      icon: MapPinned,
      fg: colors.info,
      bg: colors.infoSoft,
      title: 'Live location',
      subtitle: geoLabel,
    },
    ...(geo === '1' || geo === '2'
      ? [
          {
            key: 'stop-location' as const,
            icon: MapPinOff,
            fg: colors.danger,
            bg: colors.dangerSoft,
            title: geo === '2' ? 'Stop live tracking' : 'Cancel location request',
            subtitle:
              geo === '2' ? 'Their phone stops sharing its location' : 'Withdraw the request you sent',
            danger: true,
          },
        ]
      : []),
    active
      ? {
          key: 'active',
          icon: UserX,
          fg: colors.danger,
          bg: colors.dangerSoft,
          title: 'Deactivate employee',
          subtitle: 'Blocks sign-in; history is kept',
          danger: true,
        }
      : {
          key: 'active',
          icon: UserCheck,
          fg: colors.success,
          bg: colors.successSoft,
          title: 'Reactivate employee',
          subtitle: 'Lets them sign in again',
        },
  ];
  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={onClosed} title={name}>
      <View>
        {rows.map((r, i) => (
          <Pressable
            key={r.key}
            onPress={() => onAction(r.key)}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: radius.md,
                backgroundColor: r.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <r.icon size={18} color={r.fg} />
            </View>
            <View style={{flex: 1}}>
              <Text variant="title" tone={r.danger ? 'danger' : 'default'}>
                {r.title}
              </Text>
              <Text variant="caption" tone="muted">
                {r.subtitle}
              </Text>
            </View>
            {r.danger ? null : <ChevronRight size={18} color={colors.textSubtle} />}
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
