import React from 'react';
import {View} from 'react-native';
import type {LucideIcon} from 'lucide-react-native';
import {Card, Text} from '../../../components/ui';
import {useTheme} from '../../../theme/ThemeProvider';

export function SectionLabel({children}: {children: string}) {
  const {spacing} = useTheme();
  return (
    <Text variant="overline" tone="muted" style={{marginBottom: spacing.sm, marginTop: spacing.xs}}>
      {children}
    </Text>
  );
}

export type InfoItem = {icon: LucideIcon; label: string; value?: string | null};

/** Label/value rows in one card; rows without a value are skipped. */
export function InfoList({items}: {items: InfoItem[]}) {
  const {colors, spacing} = useTheme();
  const rows = items.filter(i => i.value);
  if (!rows.length) {
    return null;
  }
  return (
    <Card padded={false}>
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: 13,
            borderTopWidth: i ? 1 : 0,
            borderTopColor: colors.border,
          }}>
          <row.icon size={18} color={colors.textMuted} />
          <Text variant="body" tone="muted" style={{width: 96}}>
            {row.label}
          </Text>
          <Text variant="title" style={{flex: 1, textAlign: 'right'}} numberOfLines={2}>
            {row.value}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export function StatTile({value, label, color}: {value: string; label: string; color?: string}) {
  const {colors, spacing, radius} = useTheme();
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
      }}>
      <Text variant="h3" color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Horizontal meter: filled share = remaining / allowance. */
export function BalanceBar({
  label,
  remaining,
  allowance,
  used,
  color,
}: {
  label: string;
  remaining: number | null;
  allowance: number | null;
  used: number;
  color: string;
}) {
  const {colors, spacing} = useTheme();
  const pct = allowance && remaining != null ? Math.max(0, Math.min(1, remaining / allowance)) : 0;
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
      <Text variant="body" numberOfLines={1} style={{width: 108}}>
        {label}
      </Text>
      <View
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.surfaceMuted,
          overflow: 'hidden',
        }}>
        <View style={{width: `${pct * 100}%`, height: 8, borderRadius: 4, backgroundColor: color}} />
      </View>
      <Text variant="caption" tone="muted" style={{minWidth: 64, textAlign: 'right'}}>
        {allowance != null && remaining != null ? `${remaining} of ${allowance} left` : `${used} used`}
      </Text>
    </View>
  );
}
