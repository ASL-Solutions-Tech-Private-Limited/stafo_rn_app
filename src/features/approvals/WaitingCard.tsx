import React from 'react';
import {Pressable, View} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import {Card, Text} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeProvider';
import {useKindStyle} from './ApprovalCard';
import type {ApprovalCounts, ApprovalKind} from './approvalItems';

const ROWS: {kind: ApprovalKind; label: string}[] = [
  {kind: 'leave', label: 'Leave requests'},
  {kind: 'punch', label: 'Punch fixes'},
  {kind: 'device', label: 'New phone sign-ins'},
];

/** Company home: what's waiting for a decision. Renders nothing when the inbox is empty. */
export function WaitingCard({
  counts,
  onOpen,
}: {
  counts: ApprovalCounts;
  onOpen: (kind?: ApprovalKind) => void;
}) {
  const {colors, spacing, radius} = useTheme();
  const kinds = useKindStyle();
  if (!counts.all) {
    return null;
  }
  const open = (kind?: ApprovalKind) => {
    haptics.tap();
    onOpen(kind);
  };
  return (
    <Card>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <Text variant="title">Waiting for you</Text>
          <View
            style={{
              minWidth: 22,
              height: 22,
              paddingHorizontal: 7,
              borderRadius: 11,
              backgroundColor: colors.danger,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text variant="caption" color="#FFFFFF" style={{fontFamily: 'PlusJakartaSans-Bold'}}>
              {counts.all}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => open()} hitSlop={10} accessibilityRole="button">
          <Text variant="label" tone="primary">
            Open inbox
          </Text>
        </Pressable>
      </View>
      <View style={{marginTop: spacing.sm}}>
        {ROWS.filter(r => counts[r.kind] > 0).map(r => {
          const k = kinds[r.kind];
          return (
            <Pressable
              key={r.kind}
              onPress={() => open(r.kind)}
              accessibilityRole="button"
              accessibilityLabel={`${r.label}, ${counts[r.kind]} waiting`}
              style={({pressed}) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              })}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  backgroundColor: k.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <k.icon size={18} color={k.fg} />
              </View>
              <Text variant="body" style={{flex: 1}}>
                {r.label}
              </Text>
              <Text variant="h3">{counts[r.kind]}</Text>
              <ChevronRight size={16} color={colors.textSubtle} />
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
