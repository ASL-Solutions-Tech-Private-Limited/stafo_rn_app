import React from 'react';
import {Banknote} from 'lucide-react-native';
import {Button, Card, EmptyState} from '../../components/ui';
import type {AppScreenProps} from '../../navigation/types';
import {SetupScreen} from '../setup/parts';

/** Paying salaries from the app isn't connected to a bank yet. Says so, and points to Payroll. */
export function SalaryPayoutsScreen({navigation}: AppScreenProps<'SalaryPayouts'>) {
  return (
    <SetupScreen title="Salary disbursement">
      <Card>
        <EmptyState
          icon={Banknote}
          title="Not available yet"
          message="Paying salaries straight to bank accounts isn’t connected yet. Run payroll to work out salaries and share payslips, then pay from your bank as usual."
          action={
            <Button
              title="Open Payroll"
              size="sm"
              fullWidth={false}
              onPress={() => navigation.navigate('Payroll')}
            />
          }
        />
      </Card>
    </SetupScreen>
  );
}
