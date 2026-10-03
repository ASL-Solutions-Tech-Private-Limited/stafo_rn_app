import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Clock3, Plus, UserPlus} from 'lucide-react-native';
import type {AttendanceModeValue} from '../../api/endpoints/employee';
import {BottomSheet, Button, PressableScale, Text, TextField} from '../../components/ui';
import {formatClock, toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {RadioCard} from '../people/employee/sheets';
import {ChoiceChips, DateButton, FormSection, SetupScreen, WeekStrip} from '../setup/parts';
import {useBranches, useCreateDepartment, useDepartments, useShifts} from '../setup/queries';
import {shiftDays} from '../setup/setupLogic';
import {editErrors, joiningDateWarning, normalizePhone} from './employeeForm';
import {useAddEmployee} from './queries';

const MODES: {value: AttendanceModeValue; label: string}[] = [
  {value: 'selfie', label: 'Selfie'},
  {value: 'geo', label: 'Geo'},
  {value: 'qr code', label: 'QR code'},
];
const GENDERS = [
  {value: 'male', label: 'Male'},
  {value: 'female', label: 'Female'},
  {value: 'other', label: 'Other'},
];

export function AddEmployeeScreen({navigation}: AppScreenProps<'AddEmployee'>) {
  const {colors, spacing} = useTheme();
  const company = useSession(s => s.company);
  const branches = useBranches();
  const departments = useDepartments();
  const shifts = useShifts();
  const add = useAddEmployee();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [joining, setJoining] = useState(toDateKey());
  const [branchId, setBranchId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [mode, setMode] = useState<AttendanceModeValue>('selfie');
  const [salary, setSalary] = useState('');
  const [gender, setGender] = useState('male');
  const [address, setAddress] = useState('');
  const [tried, setTried] = useState(false);
  const [newDept, setNewDept] = useState<string | null>(null);

  // Pre-select the only option when there's just one.
  useEffect(() => {
    if (shiftId == null && shifts.data?.length === 1) {
      setShiftId(shifts.data[0].id);
    }
  }, [shifts.data, shiftId]);

  const errors = editErrors({name, phone, email, salary});
  const hasErrors = Object.keys(errors).length > 0;
  const show = (k: keyof typeof errors) => (tried ? errors[k] ?? null : null);

  const submit = () => {
    setTried(true);
    if (hasErrors) {
      haptics.error();
      return;
    }
    add.mutate(
      {
        name,
        phone: normalizePhone(phone),
        email,
        dateOfJoining: joining,
        gender,
        address,
        salary: Number(salary) || 0,
        shiftIds: shiftId ? [shiftId] : [],
        position,
        branchId,
        departmentId,
        mode,
      },
      {
        onSuccess: result =>
          navigation.replace('EmployeeAdded', {
            steps: result.steps,
            id: result.id,
            empId: result.empId,
            name: name.trim(),
            phone: normalizePhone(phone),
            mode,
            branch: branches.data?.find(b => b.id === branchId)?.branch_name ?? null,
            department: departments.data?.find(d => d.id === departmentId)?.name ?? null,
            shift: shifts.data?.find(s => s.id === shiftId)?.shift_name ?? null,
          }),
      },
    );
  };

  return (
    <SetupScreen title="Add employee" subtitle={company?.company_name}>
      <FormSection title="Sign-in">
        <TextField
          label="Mobile number"
          prefix="+91"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="98765 43210"
          hint="They sign in to STAFO with this number (OTP)."
          error={show('phone')}
          maxLength={14}
        />
        <TextField
          label="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={show('name')}
        />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Optional"
          keyboardType="email-address"
          autoCapitalize="none"
          error={show('email')}
        />
      </FormSection>

      <FormSection title="Job">
        <TextField
          label="Position"
          value={position}
          onChangeText={setPosition}
          placeholder="e.g. Field Sales Executive"
        />
        <View>
          <View style={{flexDirection: 'row'}}>
            <DateButton label="Date of joining" value={joining} onChange={setJoining} />
          </View>
          {joiningDateWarning(joining) ? (
            <Text variant="caption" tone="warning" style={{marginTop: 4}}>
              {joiningDateWarning(joining)}
            </Text>
          ) : null}
        </View>
        <ChoiceChips
          label="Branch"
          scroll
          value={branchId}
          onChange={setBranchId}
          items={(branches.data ?? []).map(b => ({value: b.id, label: b.branch_name}))}
        />
        <View>
          <ChoiceChips
            label="Department"
            scroll
            value={departmentId}
            onChange={setDepartmentId}
            items={(departments.data ?? []).map(d => ({value: d.id, label: d.name}))}
          />
          <PressableScale
            onPress={() => setNewDept('')}
            accessibilityRole="button"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: spacing.sm,
              alignSelf: 'flex-start',
            }}>
            <Plus size={14} color={colors.primary} />
            <Text variant="label" tone="primary">
              New department
            </Text>
          </PressableScale>
        </View>
      </FormSection>

      <FormSection title="Attendance">
        <Text variant="label">Shift</Text>
        <View style={{gap: spacing.sm}} accessibilityRole="radiogroup">
          {(shifts.data ?? []).map(s => (
            <RadioCard
              key={s.id}
              icon={Clock3}
              title={s.shift_name ?? 'Shift'}
              description={`${formatClock(s.start_time)} – ${formatClock(s.end_time)}`}
              selected={shiftId === s.id}
              onPress={() => setShiftId(s.id)}
              footer={
                <View style={{marginTop: spacing.sm}}>
                  <WeekStrip days={shiftDays(s)} />
                </View>
              }
            />
          ))}
        </View>
        <ChoiceChips label="How they punch in" value={mode} onChange={setMode} items={MODES} />
        {mode === 'selfie' ? (
          <Text variant="caption" tone="muted">
            Selfie needs a reference photo; you can add it right after.
          </Text>
        ) : mode === 'geo' ? (
          <Text variant="caption" tone="muted">
            Geo checks they’re inside their branch’s geofence.
          </Text>
        ) : null}
      </FormSection>

      <FormSection title="Pay and personal">
        <TextField
          label="Basic salary (monthly)"
          prefix="₹"
          keyboardType="decimal-pad"
          value={salary}
          onChangeText={setSalary}
          placeholder="e.g. 12000"
          hint="Used when you run payroll. Allowances come from Salary components."
          error={show('salary')}
        />
        <ChoiceChips label="Gender" value={gender} onChange={setGender} items={GENDERS} />
        <TextField
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Optional"
          multiline
        />
      </FormSection>

      {tried && hasErrors ? (
        <Text variant="caption" tone="danger" align="center">
          Fix the highlighted fields to continue.
        </Text>
      ) : null}
      <Button title="Add employee" icon={UserPlus} loading={add.isPending} onPress={submit} />

      <NewDepartmentSheet
        name={newDept}
        onClose={() => setNewDept(null)}
        onCreated={async created => {
          const fresh = await departments.refetch();
          const match = fresh.data?.find(d => d.name.trim().toLowerCase() === created.trim().toLowerCase());
          if (match) {
            setDepartmentId(match.id);
          }
        }}
      />
    </SetupScreen>
  );
}

function NewDepartmentSheet({
  name,
  onClose,
  onCreated,
}: {
  name: string | null;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const {spacing} = useTheme();
  const create = useCreateDepartment();
  const [value, setValue] = useState('');
  useEffect(() => {
    if (name !== null) {
      setValue(name);
    }
  }, [name]);
  return (
    <BottomSheet visible={name !== null} onClose={onClose} title="New department">
      <TextField label="Name" value={value} onChangeText={setValue} placeholder="e.g. Accounts" autoFocus />
      <Button
        title="Add department"
        style={{marginTop: spacing.xl}}
        disabled={!value.trim()}
        loading={create.isPending}
        onPress={() =>
          create.mutate(value, {
            onSuccess: () => {
              onCreated(value);
              onClose();
            },
          })
        }
      />
    </BottomSheet>
  );
}
