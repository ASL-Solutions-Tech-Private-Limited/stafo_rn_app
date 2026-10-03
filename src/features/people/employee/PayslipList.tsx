import React from 'react';
import {Linking, View} from 'react-native';
import {CircleAlert, Download, FileCheck2} from 'lucide-react-native';
import {Card, PressableScale, Text, toast} from '../../../components/ui';
import {useTheme} from '../../../theme/ThemeProvider';
import type {Payslip} from './queries';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Paid months, newest first; each opens its PDF. */
export function PayslipList({payslips}: {payslips: Payslip[]}) {
  const {colors, spacing, radius} = useTheme();
  return (
    <Card padded={false}>
      {payslips.map((p, i) => {
        const label = `${MONTHS[p.month.getMonth()]} ${p.month.getFullYear()}`;
        const ready = !!p.url;
        return (
          <PressableScale
            key={label}
            scaleTo={0.99}
            onPress={() =>
              p.url
                ? Linking.openURL(p.url).catch(() => toast.error('Couldn’t open the payslip.'))
                : toast.error('This month is paid, but the server couldn’t create the PDF yet. Please try again later.')
            }
            accessibilityRole="link"
            accessibilityLabel={ready ? `Open payslip for ${label}` : `${label}, paid, PDF not available yet`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: 13,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: ready ? colors.successSoft : colors.warningSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {ready ? (
                <FileCheck2 size={18} color={colors.success} />
              ) : (
                <CircleAlert size={18} color={colors.warning} />
              )}
            </View>
            <View style={{flex: 1}}>
              <Text variant="title">{label}</Text>
              <Text variant="caption" tone="muted">
                {ready ? 'Payslip PDF' : 'Paid · PDF not available yet'}
              </Text>
            </View>
            {ready ? <Download size={18} color={colors.primary} /> : null}
          </PressableScale>
        );
      })}
    </Card>
  );
}
