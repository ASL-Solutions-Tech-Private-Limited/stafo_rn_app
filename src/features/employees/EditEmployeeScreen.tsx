import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import type {EmployeeProfile} from '../../api/types';
import {Button, Text, TextField} from '../../components/ui';
import {toDateKey} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {useEmployeeProfile} from '../people/employee/queries';
import {ChoiceChips, DateButton, FormSection, SetupScreen} from '../setup/parts';
import {useBranches, useDepartments} from '../setup/queries';
import {
  editErrors,
  editFromProfile,
  joiningDateWarning,
  normalizePhone,
  type EmployeeEdit,
} from './employeeForm';
import {useUpdateEmployee} from './queries';

const GENDERS = [
  {value: 'male', label: 'Male'},
  {value: 'female', label: 'Female'},
  {value: 'other', label: 'Other'},
];
const MARITAL = [
  {value: 'single', label: 'Single'},
  {value: 'married', label: 'Married'},
];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => ({value: b, label: b}));

export function EditEmployeeScreen({navigation, route}: AppScreenProps<'EditEmployee'>) {
  const {id} = route.params;
  const profileQuery = useEmployeeProfile(id);
  const profile = profileQuery.data?.data as EmployeeProfile | undefined;

  return (
    <SetupScreen
      title="Edit details"
      subtitle={profile ? [profile.name, profile.emp_id].filter(Boolean).join(' · ') : route.params.name}
      query={profileQuery}>
      {profile ? <EditForm profile={profile} onSaved={() => navigation.goBack()} /> : null}
    </SetupScreen>
  );
}

function EditForm({profile, onSaved}: {profile: EmployeeProfile; onSaved: () => void}) {
  const {spacing} = useTheme();
  const branches = useBranches();
  const departments = useDepartments();
  const save = useUpdateEmployee(profile.id);
  const initial = useMemo(() => editFromProfile(profile), [profile]);
  const [edit, setEdit] = useState<EmployeeEdit>(initial);
  const [branchId, setBranchId] = useState<number | null>(profile.branch_id ?? null);
  const [departmentId, setDepartmentId] = useState<number | null>(profile.department_id ?? null);
  const [tried, setTried] = useState(false);
  useEffect(() => setEdit(initial), [initial]);

  const set =
    <K extends keyof EmployeeEdit>(k: K) =>
    (v: EmployeeEdit[K]) =>
      setEdit(e => ({...e, [k]: v}));
  const errors = editErrors(edit);
  const hasErrors = Object.keys(errors).length > 0;
  const show = (k: keyof typeof errors) => (tried ? errors[k] ?? null : null);
  const changed =
    JSON.stringify(edit) !== JSON.stringify(initial) ||
    branchId !== (profile.branch_id ?? null) ||
    departmentId !== (profile.department_id ?? null);
  const phoneChanged = normalizePhone(edit.phone) !== normalizePhone(initial.phone);

  return (
    <>
      <FormSection title="Personal">
        <TextField
          label="Full name"
          value={edit.name}
          onChangeText={set('name')}
          autoCapitalize="words"
          error={show('name')}
        />
        <TextField
          label="Mobile number"
          prefix="+91"
          keyboardType="phone-pad"
          value={edit.phone}
          onChangeText={set('phone')}
          maxLength={14}
          hint={
            phoneChanged
              ? 'They will sign in with this new number.'
              : 'Changing it changes the number they sign in with.'
          }
          error={show('phone')}
        />
        <TextField
          label="Email"
          value={edit.email}
          onChangeText={set('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Optional"
          error={show('email')}
        />
        <ChoiceChips label="Gender" value={edit.gender || null} onChange={set('gender')} items={GENDERS} />
        <View style={{flexDirection: 'row'}}>
          <DateButton
            label="Date of birth"
            value={edit.date_of_birth}
            onChange={set('date_of_birth')}
            max={toDateKey()}
            placeholder="Add"
          />
        </View>
        <ChoiceChips
          label="Blood group"
          scroll
          value={edit.blood_group || null}
          onChange={set('blood_group')}
          items={BLOOD}
        />
        <ChoiceChips
          label="Marital status"
          value={edit.marital_status || null}
          onChange={set('marital_status')}
          items={MARITAL}
        />
        <TextField
          label="Guardian’s name"
          value={edit.guardian_name}
          onChangeText={set('guardian_name')}
          placeholder="Optional"
        />
        <TextField
          label="Address"
          value={edit.address}
          onChangeText={set('address')}
          placeholder="Optional"
          multiline
        />
      </FormSection>

      <FormSection title="Job">
        <TextField label="Position" value={edit.position} onChangeText={set('position')} />
        <View>
          <View style={{flexDirection: 'row'}}>
            <DateButton
              label="Date of joining"
              value={edit.date_of_joining}
              onChange={set('date_of_joining')}
              placeholder="Add"
            />
          </View>
          {joiningDateWarning(edit.date_of_joining) ? (
            <Text variant="caption" tone="warning" style={{marginTop: 4}}>
              {joiningDateWarning(edit.date_of_joining)}
            </Text>
          ) : null}
        </View>
        <TextField
          label="Official email"
          value={edit.official_email_id}
          onChangeText={set('official_email_id')}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Optional"
          error={show('official_email_id')}
        />
        <ChoiceChips
          label="Branch"
          scroll
          value={branchId}
          onChange={setBranchId}
          items={(branches.data ?? []).map(b => ({value: b.id, label: b.branch_name}))}
        />
        <ChoiceChips
          label="Department"
          scroll
          value={departmentId}
          onChange={setDepartmentId}
          items={(departments.data ?? []).map(d => ({value: d.id, label: d.name}))}
        />
      </FormSection>

      <FormSection title="Pay and statutory">
        <TextField
          label="Basic salary (monthly)"
          prefix="₹"
          keyboardType="decimal-pad"
          value={edit.salary}
          onChangeText={set('salary')}
          placeholder="Not set"
          error={show('salary')}
        />
        <TextField
          label="PF number"
          value={edit.pf_number}
          onChangeText={set('pf_number')}
          placeholder="Optional"
          autoCapitalize="characters"
        />
        <TextField
          label="ESI number"
          value={edit.esi_number}
          onChangeText={set('esi_number')}
          placeholder="Optional"
          autoCapitalize="characters"
        />
      </FormSection>

      <Button
        title={changed ? 'Save changes' : 'No changes'}
        disabled={!changed}
        loading={save.isPending}
        onPress={() => {
          setTried(true);
          if (!hasErrors) {
            save.mutate({profile, edit, branchId, departmentId}, {onSuccess: onSaved});
          }
        }}
      />
      <Text variant="caption" tone="subtle" align="center" style={{marginTop: -spacing.sm}}>
        Shift, attendance mode, selfie and deactivation stay in the ⋯ menu on their profile.
      </Text>
    </>
  );
}
