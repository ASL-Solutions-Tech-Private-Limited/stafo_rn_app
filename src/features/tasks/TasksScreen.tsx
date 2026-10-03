import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {CalendarDays, Flag, ListChecks, Paperclip, TriangleAlert} from 'lucide-react-native';
import type {Task} from '../../api/endpoints/tasks';
import {Avatar, Badge, Card, EmptyState, Skeleton, Text, type BadgeTone} from '../../components/ui';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, SetupScreen} from '../setup/parts';
import {useTasks} from './queries';
import {
  daysLate,
  dueLabel,
  priorityOf,
  STATUS_LABEL,
  taskCounts,
  tasksFor,
  taskStatus,
  type Priority,
  type TaskStatus,
  type TaskTab,
} from './taskLogic';

export const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  pending: 'warning',
  'in-progress': 'info',
  completed: 'success',
};

/** Tasks: the whole company's for the company, only theirs for an employee. */
export function TasksScreen({navigation}: AppScreenProps<'Tasks'>) {
  const {colors, spacing} = useTheme();
  const isCompany = useSession(s => s.role === 'company');
  const query = useTasks();
  const tasks = useMemo(() => query.data?.tasks ?? [], [query.data]);
  const counts = taskCounts(tasks);
  const [tab, setTab] = useState<TaskTab>('open');
  const shown = useMemo(() => tasksFor(tasks, tab), [tasks, tab]);

  return (
    <SetupScreen
      title={isCompany ? 'Tasks' : 'My tasks'}
      subtitle={query.data ? `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}` : null}
      onAdd={isCompany ? () => navigation.navigate('TaskForm', {}) : undefined}
      addLabel="New"
      query={query}>
      {query.isPending ? (
        <View style={{gap: spacing.md}}>
          <Skeleton height={76} radius={16} />
          <Skeleton height={120} radius={20} />
          <Skeleton height={120} radius={20} />
        </View>
      ) : !tasks.length ? (
        <Card>
          <EmptyState
            compact
            icon={ListChecks}
            title={isCompany ? 'No tasks yet' : 'No tasks for you'}
            message={
              isCompany
                ? 'Create a task and assign it to your team.'
                : 'Tasks your company gives you appear here.'
            }
          />
        </Card>
      ) : (
        <View style={{gap: spacing.md}}>
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Tile n={counts.open} label="Open" color={colors.primary} />
            <Tile
              n={counts.overdue}
              label="Overdue"
              color={counts.overdue ? colors.danger : colors.textMuted}
            />
            <Tile n={counts.done} label="Done" color={colors.success} />
          </View>
          <ChoiceChips
            scroll
            items={[
              {value: 'open' as TaskTab, label: `Open · ${counts.open}`},
              {value: 'overdue' as TaskTab, label: `Overdue · ${counts.overdue}`},
              {value: 'done' as TaskTab, label: `Done · ${counts.done}`},
              {value: 'all' as TaskTab, label: 'All'},
            ]}
            value={tab}
            onChange={setTab}
          />
          {shown.length ? (
            shown.map(t => (
              <TaskCard key={t.id} task={t} onPress={() => navigation.navigate('TaskDetail', {id: t.id})} />
            ))
          ) : (
            <Card>
              <EmptyState
                compact
                icon={ListChecks}
                title={
                  tab === 'overdue'
                    ? 'Nothing overdue'
                    : tab === 'done'
                    ? 'Nothing done yet'
                    : 'All caught up'
                }
                message="Pick another tab to see more."
              />
            </Card>
          )}
        </View>
      )}
    </SetupScreen>
  );
}

function Tile({n, label, color}: {n: number; label: string; color: string}) {
  return (
    <Card style={{flex: 1, paddingVertical: 12}}>
      <Text variant="h2" color={color}>
        {n}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Card>
  );
}

export function PriorityTag({priority}: {priority: Priority}) {
  const {colors} = useTheme();
  const [fg, bg] = {
    Urgent: [colors.danger, colors.dangerSoft],
    High: [colors.warning, colors.warningSoft],
    Medium: [colors.info, colors.infoSoft],
    Low: [colors.textMuted, colors.surfaceMuted],
  }[priority];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 24,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: bg,
        alignSelf: 'flex-start',
      }}>
      <Flag size={12} color={fg} />
      <Text variant="caption" color={fg} style={{fontFamily: 'PlusJakartaSans-Bold'}}>
        {priority}
      </Text>
    </View>
  );
}

function Meta({icon: Icon, text, color}: {icon: typeof Flag; text: string; color: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
      <Icon size={14} color={color} />
      <Text variant="caption" color={color}>
        {text}
      </Text>
    </View>
  );
}

function TaskCard({task, onPress}: {task: Task; onPress: () => void}) {
  const {colors, spacing} = useTheme();
  const status = taskStatus(task.status);
  const late = daysLate(task) > 0;
  const people = task.assigned_employees ?? [];
  const files = task.task_files?.length ?? 0;
  return (
    <Card onPress={onPress} accessibilityLabel={`${task.title}, ${STATUS_LABEL[status]}, ${dueLabel(task)}`}>
      <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm}}>
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="title" numberOfLines={2}>
            {task.title}
          </Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 6}}>
            <Meta
              icon={late ? TriangleAlert : CalendarDays}
              text={dueLabel(task)}
              color={late ? colors.danger : colors.textMuted}
            />
            {files ? <Meta icon={Paperclip} text={String(files)} color={colors.textMuted} /> : null}
          </View>
        </View>
        <PriorityTag priority={priorityOf(task.priority)} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.md,
        }}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {people.slice(0, 4).map((p, i) => (
            <View key={p.id} style={{marginLeft: i ? -8 : 0}}>
              <Avatar name={p.name} size={26} ring={colors.surface} />
            </View>
          ))}
          {people.length > 4 ? (
            <Text variant="caption" tone="muted" style={{marginLeft: 6}}>
              +{people.length - 4}
            </Text>
          ) : people.length === 1 ? (
            <Text variant="caption" tone="muted" style={{marginLeft: 6}} numberOfLines={1}>
              {people[0].name}
            </Text>
          ) : null}
        </View>
        <Badge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} dot />
      </View>
    </Card>
  );
}
