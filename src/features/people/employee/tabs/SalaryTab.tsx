import React from 'react';
import {View} from 'react-native';
import {Wallet} from 'lucide-react-native';
import type {EmployeeProfile} from '../../../../api/types';
import {Card, EmptyState, Skeleton, Text} from '../../../../components/ui';
import {useTheme} from '../../../../theme/ThemeProvider';
import {SectionLabel} from '../parts';
import {PayslipList} from '../PayslipList';
import type {Payslip} from '../queries';

/** "32500.00" → "₹32,500". */
export function formatRupees(value?: string | number | null) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!value || !Number.isFinite(n)) {
    return null;
  }
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

type Props = {
  profile?: EmployeeProfile | null;
  payslips: Payslip[];
  payslipsLoading: boolean;
};

export function SalaryTab({profile, payslips, payslipsLoading}: Props) {
  const {spacing} = useTheme();
  const monthly = formatRupees(profile?.salary);
  const ctc = formatRupees(profile?.ctc);

  return (
    <View style={{gap: spacing.lg}}>
      <Card>
        <Text variant="overline" tone="muted">
          Monthly salary
        </Text>
        {profile ? (
          <>
            <Text variant="display" style={{marginTop: spacing.xs}}>
              {monthly ?? 'Not set'}
            </Text>
            <View style={{flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md}}>
              {ctc ? (
                <View>
                  <Text variant="caption" tone="muted">
                    Annual CTC
                  </Text>
                  <Text variant="title">{ctc}</Text>
                </View>
              ) : null}
              {profile.tax_regime ? (
                <View>
                  <Text variant="caption" tone="muted">
                    Tax regime
                  </Text>
                  <Text variant="title">
                    {profile.tax_regime.charAt(0).toUpperCase() + profile.tax_regime.slice(1)}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <Skeleton width={160} height={38} style={{marginTop: spacing.sm}} />
        )}
      </Card>

      <View>
        <SectionLabel>Payslips</SectionLabel>
        {payslipsLoading ? (
          <Skeleton height={140} radius={20} />
        ) : payslips.length ? (
          <PayslipList payslips={payslips} />
        ) : (
          <Card>
            <EmptyState
              compact
              icon={Wallet}
              title="No payslips yet"
              message="Payslips appear here for months where payroll has been run."
            />
          </Card>
        )}
      </View>
    </View>
  );
}
