import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {Check} from 'lucide-react-native';
import {Button, Text, TextField, toast} from '../../components/ui';
import {toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {emailError, normalizePhone, phoneError} from '../employees/employeeForm';
import {usePeopleOnDate} from '../people/queries';
import {ChoiceChips, DateButton, SetupScreen} from '../setup/parts';
import {leadInput, leadPhone, nextDate, SOURCES} from './crmLogic';
import {useLeads, useSaveLead} from './queries';

const OTHER = 'Other';

/** Add a lead, or edit one. The company also picks whose lead it is. */
export function LeadFormScreen({navigation, route}: AppScreenProps<'LeadForm'>) {
  const editId = route.params?.id;
  const {spacing} = useTheme();
  const isCompany = useSession(s => s.role === 'company');
  const me = useSession(s => s.employee?.id);
  const leads = useLeads();
  const existing = editId ? leads.data?.find(l => l.id === editId) : undefined;
  const save = useSaveLead();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState<string>('');
  const [otherSource, setOtherSource] = useState('');
  const [owner, setOwner] = useState<number | null>(isCompany ? null : me ?? null);
  const [next, setNext] = useState(editId ? '' : toDateKey());
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (existing && !loaded) {
      const i = leadInput(existing);
      setName(i.name);
      setPhone(leadPhone(existing) ?? '');
      setEmail(i.email);
      setCompany(i.company_name);
      setAddress(i.company_address);
      const known = (SOURCES as readonly string[]).includes(i.lead_from);
      setSource(i.lead_from ? (known ? i.lead_from : OTHER) : '');
      setOtherSource(known ? '' : i.lead_from);
      setOwner(i.employee_id || null);
      setNext(nextDate(existing) ?? '');
      setNotes(i.notes);
      setLoaded(true);
    }
  }, [existing, loaded]);

  // Owners to choose from (company only): everyone active today.
  const people = usePeopleOnDate(toDateKey());
  const staff = useMemo(
    () =>
      isCompany
        ? people.people
            .map(p => p.employee)
            .filter(e => (e.status ?? '1') === '1' || e.id === owner)
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [isCompany, people.people, owner],
  );

  const errors = {
    name: !name.trim() ? 'Add their name.' : null,
    phone: phoneError(phone),
    email: emailError(email),
    owner: isCompany && !owner ? 'Pick whose lead this is.' : null,
    source: source === OTHER && !otherSource.trim() ? 'Say where it came from.' : null,
  };
  const hasError = Object.values(errors).some(Boolean);

  const submit = () => {
    setTried(true);
    if (hasError || save.isPending) {
      if (hasError) {
        haptics.error();
      }
      return;
    }
    const base = existing ? leadInput(existing) : null;
    save.mutate(
      {
        id: editId,
        input: {
          employee_id: owner ?? 0,
          name,
          phone: normalizePhone(phone),
          email,
          company_name: company,
          company_address: address,
          lead_from: source === OTHER ? otherSource.trim() : source,
          next_date: next,
          notes,
          status: base?.status ?? 'New',
        },
      },
      {
        onSuccess: () => {
          toast.success(editId ? 'Lead saved' : 'Lead added');
          navigation.goBack();
        },
      },
    );
  };

  const err = (k: keyof typeof errors) => (tried ? errors[k] : null);

  return (
    <SetupScreen title={editId ? 'Edit lead' : 'New lead'} subtitle={existing?.name}>
      <View style={{gap: spacing.lg}}>
        <TextField
          label="Name"
          placeholder="Who you spoke to"
          value={name}
          onChangeText={setName}
          error={err('name')}
        />
        <TextField
          label="Mobile number"
          placeholder="10 digits"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          prefix="+91"
          maxLength={16}
          error={err('phone')}
          hint={
            existing && !leadPhone(existing)
              ? 'The saved number was lost by the server. Add it again.'
              : undefined
          }
        />
        <TextField
          label="Email"
          placeholder="Optional"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          error={err('email')}
        />
        <TextField label="Company" placeholder="Optional" value={company} onChangeText={setCompany} />
        <TextField label="Address" placeholder="Optional" value={address} onChangeText={setAddress} />
        <ChoiceChips
          label="Source"
          items={[...SOURCES, OTHER].map(s => ({value: s as string, label: s}))}
          value={source || null}
          onChange={setSource}
        />
        {source === OTHER ? (
          <TextField
            placeholder="Where did it come from?"
            value={otherSource}
            onChangeText={setOtherSource}
            error={err('source')}
          />
        ) : null}
        {isCompany ? (
          <View style={{gap: 6}}>
            <ChoiceChips
              label="Owner"
              items={staff.map(e => ({value: e.id, label: e.name}))}
              value={owner}
              onChange={setOwner}
            />
            {err('owner') ? (
              <Text variant="caption" tone="danger">
                {err('owner')}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={{flexDirection: 'row'}}>
          <DateButton
            label={editId ? 'Next follow-up' : 'First follow-up'}
            value={next}
            onChange={setNext}
            placeholder="None planned"
          />
        </View>
        <TextField
          label="Notes"
          placeholder="Optional"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={1000}
        />
        <Button
          title={editId ? 'Save changes' : 'Save lead'}
          icon={Check}
          loading={save.isPending}
          disabled={save.isPending || (editId != null && !loaded)}
          onPress={submit}
        />
      </View>
    </SetupScreen>
  );
}
