import React from 'react';
import {View} from 'react-native';
import {Sparkles, type LucideIcon} from 'lucide-react-native';
import {Badge, Card, Text} from '../../../components/ui';
import {useTheme} from '../../../theme/ThemeProvider';

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: number;
  highlights?: string[];
};

/** Placeholder for screens that ship in a later rebuild phase. */
export function PhasePlaceholder({icon: Icon, title, description, phase, highlights}: Props) {
  const {colors, spacing, radius} = useTheme();
  return (
    <View style={{alignItems: 'center', paddingTop: spacing.huge}}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: radius.xxl,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon size={40} color={colors.primary} strokeWidth={1.8} />
      </View>
      <Badge
        label={`Arriving in phase ${phase}`}
        tone="primary"
        style={{alignSelf: 'center', marginTop: spacing.xl}}
      />
      <Text variant="h1" align="center" style={{marginTop: spacing.md}}>
        {title}
      </Text>
      <Text variant="bodyRegular" tone="muted" align="center" style={{marginTop: spacing.sm, maxWidth: 320}}>
        {description}
      </Text>
      {highlights?.length ? (
        <Card style={{alignSelf: 'stretch', marginTop: spacing.xxl, gap: spacing.md}}>
          {highlights.map(h => (
            <View key={h} style={{flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start'}}>
              <Sparkles size={16} color={colors.primary} style={{marginTop: 2}} />
              <Text variant="body" style={{flex: 1}}>
                {h}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
