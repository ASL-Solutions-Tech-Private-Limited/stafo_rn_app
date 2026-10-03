import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, View} from 'react-native';
import {Check, FileText, Paperclip, Search, X} from 'lucide-react-native';
import type {UploadFile} from '../../api/endpoints/tasks';
import {Avatar, Button, Text, TextField, toast} from '../../components/ui';
import {toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {usePeopleOnDate} from '../people/queries';
import {ChoiceChips, DateButton, SetupScreen} from '../setup/parts';
import {pickFiles} from './pickFiles';
import {useSaveTask, useTasks} from './queries';
import {PRIORITIES, priorityOf, STATUS_VALUE, taskFormError, taskStatus, type Priority} from './taskLogic';

/** Create a task, or edit one (company only). */
export function TaskFormScreen({navigation, route}: AppScreenProps<'TaskForm'>) {
  const editId = route.params?.id;
  const {colors, spacing, radius} = useTheme();
  const tasks = useTasks();
  const existing = editId ? tasks.data?.tasks.find(t => t.id === editId) : undefined;
  const people = usePeopleOnDate(toDateKey());
  const save = useSaveTask();

  const today = toDateKey();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [start, setStart] = useState(today);
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [assignees, setAssignees] = useState<number[]>([]);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [search, setSearch] = useState('');
  const [tried, setTried] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (existing && !loaded) {
      setTitle(existing.title);
      setDetails(existing.description ?? '');
      setStart(existing.start_date.slice(0, 10));
      setDue(existing.end_date.slice(0, 10));
      setPriority(priorityOf(existing.priority));
      setAssignees((existing.assigned_employees ?? []).map(e => e.id));
      setLoaded(true);
    }
  }, [existing, loaded]);

  const staff = useMemo(
    () =>
      people.people
        .map(p => p.employee)
        .filter(e => (e.status ?? '1') === '1' || assignees.includes(e.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [people.people, assignees],
  );
  const q = search.trim().toLowerCase();
  const shownStaff = q ? staff.filter(e => e.name.toLowerCase().includes(q)) : staff;

  const form = {title, start_date: start, end_date: due, assignees};
  const error = taskFormError(form);

  const submit = () => {
    setTried(true);
    if (error || save.isPending) {
      if (error) {
        haptics.error();
      }
      return;
    }
    save.mutate(
      {
        id: editId,
        input: {
          title,
          description: details,
          start_date: start,
          end_date: due,
          priority,
          status: existing ? STATUS_VALUE[taskStatus(existing.status)] : STATUS_VALUE.pending,
          assignees,
          files,
        },
      },
      {
        onSuccess: () => {
          toast.success(editId ? 'Task saved' : 'Task created');
          navigation.goBack();
        },
      },
    );
  };

  const toggle = (id: number) => {
    haptics.select();
    setAssignees(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]));
  };

  return (
    <SetupScreen title={editId ? 'Edit task' : 'New task'} subtitle={existing?.title}>
      <View style={{gap: spacing.lg}}>
        <TextField
          label="Title"
          placeholder="e.g. Count stock for October"
          value={title}
          onChangeText={setTitle}
          maxLength={150}
          error={tried && !title.trim() ? 'Give the task a title.' : null}
        />
        <TextField
          label="Details"
          placeholder="What needs doing (optional)"
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={2000}
          style={{minHeight: 84, textAlignVertical: 'top'}}
        />
        <View style={{flexDirection: 'row', gap: spacing.sm}}>
          <DateButton
            label="Start"
            value={start}
            onChange={v => {
              setStart(v);
              if (due && due < v) {
                setDue(v);
              }
            }}
          />
          <DateButton label="Due" value={due} onChange={setDue} min={start} placeholder="Pick a day" />
        </View>
        <ChoiceChips
          label="Priority"
          items={PRIORITIES.map(p => ({value: p, label: p}))}
          value={priority}
          onChange={setPriority}
        />

        <View style={{gap: spacing.sm}}>
          <Text variant="label">Assign to{assignees.length ? ` · ${assignees.length}` : ''}</Text>
          {staff.length > 8 ? (
            <TextField icon={Search} placeholder="Search people" value={search} onChangeText={setSearch} />
          ) : null}
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm}}>
            {shownStaff.map(e => {
              const on = assignees.includes(e.id);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => toggle(e.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: on}}
                  accessibilityLabel={e.name}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    height: 40,
                    paddingLeft: 4,
                    paddingRight: 12,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: on ? colors.primary : colors.border,
                    backgroundColor: on ? colors.primarySoft : colors.surface,
                  }}>
                  <Avatar name={e.name} size={30} />
                  <Text variant="label" color={on ? colors.primary : colors.textMuted}>
                    {e.name}
                  </Text>
                  {on ? <Check size={14} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
          {tried && !assignees.length ? (
            <Text variant="caption" tone="danger">
              Assign it to at least one person.
            </Text>
          ) : null}
        </View>

        <View style={{gap: spacing.sm}}>
          <Text variant="label">{editId ? 'Add files' : 'Files'}</Text>
          {files.map((f, i) => (
            <View
              key={`${f.uri}-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: 10,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceMuted,
              }}>
              <FileText size={16} color={colors.primary} />
              <Text style={{flex: 1}} numberOfLines={1}>
                {f.name}
              </Text>
              <Pressable
                onPress={() => setFiles(list => list.filter((_, j) => j !== i))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${f.name}`}>
                <X size={16} color={colors.textSubtle} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={async () => {
              const picked = await pickFiles();
              if (picked.length) {
                setFiles(list => [...list, ...picked]);
              }
            }}
            accessibilityRole="button"
            style={{
              height: 50,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.borderStrong,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
            }}>
            <Paperclip size={16} color={colors.primary} />
            <Text variant="label" tone="primary">
              Attach files
            </Text>
          </Pressable>
        </View>

        {tried &&
        error &&
        error !== 'Give the task a title.' &&
        error !== 'Assign it to at least one person.' ? (
          <Text tone="danger">{error}</Text>
        ) : null}
        <Button
          title={editId ? 'Save changes' : 'Create task'}
          icon={Check}
          loading={save.isPending}
          disabled={save.isPending || (editId != null && !loaded)}
          onPress={submit}
        />
        {!editId ? (
          <Text variant="caption" tone="subtle" align="center">
            Starts as Pending. Assigned people see it in My tasks.
          </Text>
        ) : null}
      </View>
    </SetupScreen>
  );
}
