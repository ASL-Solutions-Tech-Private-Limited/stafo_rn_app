import React from 'react';
import {Fingerprint} from 'lucide-react-native';
import {Screen, Text} from '../../../components/ui';
import {useTheme} from '../../../theme/ThemeProvider';
import {PhasePlaceholder} from '../../modules/components/PhasePlaceholder';

export function AttendanceTabScreen() {
  const {spacing} = useTheme();
  return (
    <Screen
      scroll
      safeBottom={false}
      contentStyle={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl}}>
      <Text variant="h1" style={{marginTop: spacing.lg}}>
        Attendance
      </Text>
      <PhasePlaceholder
        icon={Fingerprint}
        title="Punch in, your way"
        description="Geo, selfie and QR attendance with geofence checks, plus your monthly calendar."
        phase={2}
        highlights={[
          'One-tap punch with face auto-capture and fake-GPS detection',
          'Monthly calendar with late marks, hours and holidays',
          'Reliable background location on Android and iOS, only with your consent',
          'Missed punch-out requests',
        ]}
      />
    </Screen>
  );
}
