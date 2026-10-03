import React from 'react';
import {FileText} from 'lucide-react-native';
import {Card, EmptyState, Skeleton, Text} from '../../components/ui';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {PayslipList} from '../people/employee/PayslipList';
import {usePayslips} from '../people/employee/queries';
import {SetupScreen} from '../setup/parts';

/** How far back to look for payslips. */
const MONTHS_BACK = 12;

/** The employee's own payslips for the last year. */
export function MyPayslipsScreen() {
  const {spacing} = useTheme();
  const me = useSession(s => s.employee);
  const payslips = usePayslips(me?.id ?? 0, !!me, MONTHS_BACK);

  return (
    <SetupScreen title="Payslips" subtitle={me?.name} query={payslips}>
      {payslips.isPending ? (
        <Skeleton height={140} radius={20} />
      ) : payslips.data?.length ? (
        <>
          <PayslipList payslips={payslips.data} />
          <Text variant="caption" tone="subtle" style={{marginTop: spacing.md}}>
            Showing the last {MONTHS_BACK} months. Tap a month to open its PDF.
          </Text>
        </>
      ) : (
        <Card>
          <EmptyState
            compact
            icon={FileText}
            title="No payslips yet"
            message="A month appears here once your company runs payroll for it."
          />
        </Card>
      )}
    </SetupScreen>
  );
}
