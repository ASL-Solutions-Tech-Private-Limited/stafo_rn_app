import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Search} from 'lucide-react-native';
import {Card, PressableScale, Screen, Text, TextField} from '../../../components/ui';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {GROUP_ORDER, modulesFor} from '../catalog';

export function AppsScreen() {
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation();
  const role = useSession(s => s.role) ?? 'employee';
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const modules = modulesFor(role).filter(
      m => !q || m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    );
    return GROUP_ORDER.map(group => ({group, items: modules.filter(m => m.group === group)})).filter(
      g => g.items.length,
    );
  }, [role, query]);

  let accentIndex = 0;

  return (
    <Screen
      scroll
      safeBottom={false}
      contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}>
      <Text variant="h1" style={{marginTop: spacing.lg}}>
        Apps
      </Text>
      <Text variant="bodyRegular" tone="muted" style={{marginTop: 2}}>
        Everything in your STAFO workspace
      </Text>

      <TextField
        icon={Search}
        placeholder="Search apps"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        containerStyle={{marginTop: spacing.xl}}
      />

      {groups.map(({group, items}) => (
        <View key={group} style={{marginTop: spacing.xxl}}>
          <Text variant="overline" tone="muted" style={{marginBottom: spacing.md}}>
            {group}
          </Text>
          <Card padded={false}>
            {items.map((m, i) => {
              const accent = colors.accents[accentIndex++ % colors.accents.length];
              return (
                <PressableScale
                  key={m.id}
                  scaleTo={0.99}
                  onPress={() => navigation.navigate('Module', {id: m.id})}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: colors.border,
                  }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: radius.md,
                      backgroundColor: accent.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <m.icon size={22} color={accent.fg} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text variant="title">{m.title}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {m.description}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </Card>
        </View>
      ))}

      {!groups.length && (
        <Text variant="body" tone="muted" align="center" style={{marginTop: spacing.huge}}>
          No apps match "{query}"
        </Text>
      )}
    </Screen>
  );
}
