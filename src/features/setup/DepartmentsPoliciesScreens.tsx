import React, {useState} from 'react';
import {Linking, Pressable, View} from 'react-native';
import {errorCodes, isErrorWithCode, keepLocalCopy, pick, types} from '@react-native-documents/picker';
import {ExternalLink, FileText, Network, Paperclip} from 'lucide-react-native';
import {BottomSheet, Button, Card, EmptyState, Text, TextField, toast} from '../../components/ui';
import {formatDay, parseServerDate, toDateKey} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {usePeopleOnDate} from '../people/queries';
import {useCreateDepartment, useCreatePolicy, useDepartments, usePolicies} from './queries';
import {IconWell, SetupScreen} from './parts';

// ---------- Departments ----------

export function DepartmentsScreen(_: AppScreenProps<'SetupDepartments'>) {
  const {colors, spacing} = useTheme();
  const departments = useDepartments();
  const people = usePeopleOnDate(toDateKey());
  const create = useCreateDepartment();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const list = departments.data ?? [];
  const peopleIn = (n: string) => people.people.filter(p => p.employee.department_name === n).length;

  return (
    <SetupScreen
      title="Departments"
      subtitle={
        departments.data ? `${list.length} ${list.length === 1 ? 'department' : 'departments'}` : null
      }
      onAdd={() => {
        setName('');
        setAdding(true);
      }}
      query={departments}>
      {!list.length ? (
        <EmptyState
          icon={Network}
          title="No departments yet"
          message="Group people by team, like Sales or IT."
        />
      ) : (
        <Card style={{padding: 0}}>
          {list.map((d, i) => {
            const n = peopleIn(d.name);
            return (
              <View
                key={d.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.lg,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}>
                <IconWell icon={Network} fg={colors.accents[1].fg} bg={colors.accents[1].bg} size={36} />
                <Text variant="title" style={{flex: 1}} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text variant="caption" tone="muted">
                  {n} {n === 1 ? 'person' : 'people'}
                </Text>
              </View>
            );
          })}
        </Card>
      )}
      <Text variant="caption" tone="subtle">
        Departments can be added. Renaming and removing them needs a backend update.
      </Text>

      <BottomSheet visible={adding} onClose={() => setAdding(false)} title="Add department">
        <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Accounts" autoFocus />
        <Button
          title="Add department"
          style={{marginTop: spacing.xl}}
          disabled={!name.trim() || list.some(d => d.name.trim().toLowerCase() === name.trim().toLowerCase())}
          loading={create.isPending}
          onPress={() => create.mutate(name, {onSuccess: () => setAdding(false)})}
        />
      </BottomSheet>
    </SetupScreen>
  );
}

// ---------- Policies ----------

type PickedFile = {uri: string; name: string; type: string};

async function pickPdf(): Promise<PickedFile | null> {
  try {
    const [file] = await pick({type: [types.pdf]});
    // Copy into the app's cache so the upload reads a real file (not a content:// handle).
    const [copy] = await keepLocalCopy({
      files: [{uri: file.uri, fileName: file.name ?? 'policy.pdf'}],
      destination: 'cachesDirectory',
    });
    if (copy.status !== 'success') {
      toast.error("Couldn't read that file.");
      return null;
    }
    return {uri: copy.localUri, name: file.name ?? 'policy.pdf', type: file.type ?? 'application/pdf'};
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    toast.error("Couldn't open your files.");
    return null;
  }
}

export function PoliciesScreen(_: AppScreenProps<'SetupPolicies'>) {
  const {colors, spacing, radius} = useTheme();
  const policies = usePolicies();
  const create = useCreatePolicy();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const list = policies.data?.policies ?? [];
  const base = policies.data?.filePath?.replace(/\/$/, '');

  const startUpload = async () => {
    const picked = await pickPdf();
    if (picked) {
      setTitle(picked.name.replace(/\.pdf$/i, ''));
      setDescription('');
      setFile(picked);
    }
  };

  return (
    <SetupScreen
      title="Policies"
      subtitle={policies.data ? `${list.length} ${list.length === 1 ? 'policy' : 'policies'}` : null}
      onAdd={startUpload}
      addLabel="Upload"
      query={policies}>
      {!list.length ? (
        <EmptyState
          icon={FileText}
          title="No policies yet"
          message="Upload PDFs like the leave or travel policy. Employees see them in their app."
        />
      ) : (
        list.map(p => {
          const url = p.file ? (/^https?:/.test(p.file) ? p.file : base ? `${base}/${p.file}` : null) : null;
          const date = parseServerDate(p.created_at);
          return (
            <Card
              key={p.id}
              onPress={
                url
                  ? () => Linking.openURL(url).catch(() => toast.error("Couldn't open the PDF."))
                  : undefined
              }>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
                <IconWell icon={FileText} fg={colors.danger} bg={colors.dangerSoft} size={44} />
                <View style={{flex: 1, minWidth: 0}}>
                  <Text variant="title">{p.title}</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {[
                      p.description,
                      'PDF',
                      date
                        ? `${formatDay(date)}${
                            date.getFullYear() !== new Date().getFullYear() ? ` ${date.getFullYear()}` : ''
                          }`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {url ? <ExternalLink size={18} color={colors.textSubtle} /> : null}
              </View>
            </Card>
          );
        })
      )}
      <Text variant="caption" tone="subtle">
        Employees see these in their Policies app.
      </Text>

      <BottomSheet visible={!!file} onClose={() => setFile(null)} title="Upload policy">
        <Pressable
          onPress={startUpload}
          accessibilityRole="button"
          accessibilityLabel="Choose a different file"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceMuted,
          }}>
          <Paperclip size={18} color={colors.textMuted} />
          <Text variant="body" style={{flex: 1}} numberOfLines={1}>
            {file?.name}
          </Text>
          <Text variant="label" tone="primary">
            Change
          </Text>
        </Pressable>
        <View style={{marginTop: spacing.md}}>
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Leave policy" />
        </View>
        <View style={{marginTop: spacing.md}}>
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="One line about what it covers"
          />
        </View>
        <Button
          title="Upload policy"
          style={{marginTop: spacing.xl}}
          disabled={!title.trim()}
          loading={create.isPending}
          onPress={() => file && create.mutate({title, description, file}, {onSuccess: () => setFile(null)})}
        />
      </BottomSheet>
    </SetupScreen>
  );
}
