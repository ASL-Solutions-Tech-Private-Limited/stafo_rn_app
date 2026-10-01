import React from 'react';
import {View} from 'react-native';
import {ArrowLeft} from 'lucide-react-native';
import {IconButton, Screen, Text} from '../../../components/ui';
import type {AppScreenProps} from '../../../navigation/types';
import {useTheme} from '../../../theme/ThemeProvider';
import {getModule} from '../catalog';
import {PhasePlaceholder} from '../components/PhasePlaceholder';

export function ModuleScreen({navigation, route}: AppScreenProps<'Module'>) {
  const {spacing} = useTheme();
  const module = getModule(route.params.id);
  return (
    <Screen scroll contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md, height: 56}}>
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text variant="h3">{module.title}</Text>
      </View>
      <PhasePlaceholder
        icon={module.icon}
        title={module.title}
        description={`${module.description}. This module is being rebuilt with a fresh design and will be available soon.`}
        phase={module.phase}
      />
    </Screen>
  );
}
