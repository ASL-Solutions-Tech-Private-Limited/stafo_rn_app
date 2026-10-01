import React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {PressableScale, Text} from '../../../components/ui';
import {useSession} from '../../../store/session';
import {useTheme} from '../../../theme/ThemeProvider';
import {openModule} from '../../modules/openModule';
import {getModule, type ModuleId} from '../../modules/catalog';

export function ShortcutGrid({ids}: {ids: ModuleId[]}) {
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation();
  const role = useSession(s => s.role);

  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg}}>
      {ids.map((id, i) => {
        const module = getModule(id);
        const accent = colors.accents[i % colors.accents.length];
        return (
          <View key={id} style={{width: '25%', paddingHorizontal: spacing.xs}}>
            <PressableScale
              onPress={() => openModule(navigation, id, role)}
              accessibilityRole="button"
              accessibilityLabel={module.title}
              style={{alignItems: 'center', gap: spacing.sm}}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.lg,
                  backgroundColor: accent.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <module.icon size={24} color={accent.fg} strokeWidth={2} />
              </View>
              <Text
                variant="caption"
                align="center"
                numberOfLines={1}
                style={{fontFamily: 'PlusJakartaSans-SemiBold'}}>
                {module.title}
              </Text>
            </PressableScale>
          </View>
        );
      })}
    </View>
  );
}
