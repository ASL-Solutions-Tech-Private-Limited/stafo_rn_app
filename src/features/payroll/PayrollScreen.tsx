import React, {useState} from 'react';
import {Linking, Pressable, View} from 'react-native';
import {ChevronLeft, ChevronRight, FileDown, SlidersHorizontal} from 'lucide-react-native';
import {employeePhotoUrl} from '../../api/endpoints/people';
import type {CompanyEmployee} from '../../api/types';
import {Avatar, Button, Card, IconButton, PressableScale, Skeleton, Text, toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {SetupScreen, Tag} from '../setup/parts';
import {formatMoney, payrollMonths} from './payrollLogic';
import {usePayrollMonth} from './queries';

const MONTH = (d: Date) => d.toLocaleDateString('en-IN', {month: 'long', year: 'numeric'});
const MONTH_ONLY = (d: Date) => d.toLocaleDateString('en-IN', {month: 'long'});

export function PayrollScreen({navigation}: AppScreenProps<'Payroll'>) {
  const {colors, spacing, radius} = useTheme();
  const company = useSession(s => s.company);
  const months = payrollMonths();
  const [index, setIndex] = useState(months.length - 1);
  const month = months[index];
  const payroll = usePayrollMonth(month);

  const ready = payroll.rows.filter(r => r.status === 'ready');
  const noBasic = payroll.rows.filter(r => r.status === 'no-basic');
  const paid = payroll.rows.filter(r => r.status === 'paid');
  const total = payroll.rows.length;
  const checking = payroll.rows.some(r => r.loading);

  const step = (d: number) => {
    haptics.select();
    setIndex(i => Math.min(months.length - 1, Math.max(0, i + d)));
  };

  const row = (
    e: CompanyEmployee,
    sub: string,
    right: React.ReactNode,
    first: boolean,
    onPress?: () => void,
  ) => (
    <Pressable
      key={e.id}
      onPress={onPress}
      disabled={!onPress}
      style={({pressed}) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Avatar name={e.name} uri={employeePhotoUrl(e)} size={40} />
      <View style={{flex: 1, minWidth: 0}}>
        <Text variant="title" numberOfLines={1}>
          {e.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {right}
    </Pressable>
  );

  return (
    <SetupScreen
      title="Payroll"
      subtitle={company?.company_name}
      action={
        <IconButton
          icon={SlidersHorizontal}
          accessibilityLabel="Salary components"
          onPress={() => navigation.navigate('SalaryComponents')}
        />
      }
      query={payroll}>
      {/* Month (current year only: the save API has no year) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 44,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}>
        <PressableScale
          onPress={() => step(-1)}
          disabled={index === 0}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}>
          <ChevronLeft size={18} color={index === 0 ? colors.textSubtle : colors.text} />
        </PressableScale>
        <Text variant="title">{MONTH(month)}</Text>
        <PressableScale
          onPress={() => step(1)}
          disabled={index === months.length - 1}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={8}>
          <ChevronRight size={18} color={index === months.length - 1 ? colors.textSubtle : colors.text} />
        </PressableScale>
      </View>

      <Card>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text variant="overline" tone="muted">
            {MONTH_ONLY(month)}
          </Text>
          {checking ? (
            <Skeleton width={84} height={24} radius={12} />
          ) : (
            <Tag
              label={`${paid.length} of ${total} paid`}
              fg={paid.length ? colors.primary : colors.textMuted}
              bg={paid.length ? colors.primarySoft : colors.surfaceMuted}
            />
          )}
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.surfaceMuted,
            marginTop: spacing.md,
            overflow: 'hidden',
          }}>
          <View
            style={{
              width: `${total ? (paid.length / total) * 100 : 0}%`,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.success,
            }}
          />
        </View>
        <View style={{flexDirection: 'row', marginTop: spacing.md}}>
          <View style={{flex: 1}}>
            <Text variant="h3">{ready.length}</Text>
            <Text variant="caption" tone="muted">
              Ready to run
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text variant="h3" color={noBasic.length ? colors.warning : colors.text}>
              {noBasic.length}
            </Text>
            <Text variant="caption" tone="muted">
              No basic salary
            </Text>
          </View>
          <View style={{flex: 1}}>
            <Text variant="h3">{paid.length}</Text>
            <Text variant="caption" tone="muted">
              Paid
            </Text>
          </View>
        </View>
      </Card>

      {ready.length ? (
        <>
          <Text variant="overline" tone="muted">
            Ready to run
          </Text>
          <Card style={{padding: 0}}>
            {ready.map((r, i) =>
              row(
                r.employee,
                [r.employee.position, `Basic ${formatMoney(Number(r.employee.salary))}`]
                  .filter(Boolean)
                  .join(' · '),
                <Button
                  title="Run"
                  size="sm"
                  fullWidth={false}
                  disabled={r.loading}
                  onPress={() =>
                    navigation.navigate('PayrollRun', {
                      employeeId: r.employee.id,
                      name: r.employee.name,
                      month: month.getMonth() + 1,
                    })
                  }
                />,
                i === 0,
              ),
            )}
          </Card>
        </>
      ) : null}

      {noBasic.length ? (
        <>
          <Text variant="overline" tone="muted">
            Needs a basic salary
          </Text>
          <Card style={{padding: 0}}>
            {noBasic.map((r, i) =>
              row(
                r.employee,
                [r.employee.position, 'No basic salary on file'].filter(Boolean).join(' · '),
                <ChevronRight size={18} color={colors.textSubtle} />,
                i === 0,
                () => navigation.navigate('EmployeeDetail', {id: r.employee.id, name: r.employee.name}),
              ),
            )}
          </Card>
          <Text variant="caption" tone="subtle">
            Basic salary is set on the employee’s profile.
          </Text>
        </>
      ) : null}

      {paid.length ? (
        <>
          <Text variant="overline" tone="muted">
            Paid
          </Text>
          <Card style={{padding: 0}}>
            {paid.map((r, i) =>
              row(
                r.employee,
                `${MONTH_ONLY(month)} salary · ${
                  r.slip?.state === 'ready' ? 'payslip ready' : 'payslip PDF failing on the server'
                }`,
                <Pressable
                  onPress={() =>
                    r.slip?.state === 'ready'
                      ? Linking.openURL(r.slip.url).catch(() => toast.error("Couldn't open the payslip."))
                      : toast.error(
                          'The server couldn’t create this payslip PDF. Ask STAFO support to check it.',
                        )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${r.employee.name}'s payslip`}
                  hitSlop={8}
                  style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <FileDown size={18} color={colors.primary} />
                  <Text variant="label" tone="primary">
                    Payslip
                  </Text>
                </Pressable>,
                i === 0,
              ),
            )}
          </Card>
        </>
      ) : null}
    </SetupScreen>
  );
}
