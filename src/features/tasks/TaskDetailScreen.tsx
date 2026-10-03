import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarDays,
  EllipsisVertical,
  ExternalLink,
  FileText,
  ListChecks,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  TriangleAlert,
} from 'lucide-react-native';
import type {TaskComment, TaskFile} from '../../api/endpoints/tasks';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Skeleton,
  Text,
  toast,
} from '../../components/ui';
import {formatDay, formatRange, parseServerDate} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {useEmployeeDetails} from '../home/queries';
import {IconWell} from '../setup/parts';
import {pickFiles} from './pickFiles';
import {
  useAddComment,
  useDeleteComment,
  useDeleteTask,
  useDeleteTaskFile,
  useSetTaskStatus,
  useTaskComments,
  useTasks,
  useUploadTaskFiles,
} from './queries';
import {PriorityTag} from './TasksScreen';
import {
  daysLate,
  dueLabel,
  fileKind,
  priorityOf,
  STATUS_LABEL,
  STATUS_VALUE,
  taskFileUrl,
  taskStatus,
  type TaskStatus,
} from './taskLogic';

const STATUSES: TaskStatus[] = ['pending', 'in-progress', 'completed'];

export function TaskDetailScreen({navigation, route}: AppScreenProps<'TaskDetail'>) {
  const {id} = route.params;
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const role = useSession(s => s.role);
  const isCompany = role === 'company';
  const me = useSession(s => s.employee?.id);
  const ownCompany = useSession(s => s.company?.company_name);
  const employeeDetails = useEmployeeDetails();
  const companyName = ownCompany ?? employeeDetails.data?.company_name ?? 'Company';

  const tasks = useTasks();
  const task = tasks.data?.tasks.find(t => t.id === id);
  const comments = useTaskComments(id);
  const setStatus = useSetTaskStatus();
  const upload = useUploadTaskFiles();
  const removeFile = useDeleteTaskFile();
  const addComment = useAddComment(id);
  const removeComment = useDeleteComment(id);
  const removeTask = useDeleteTask();

  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<
    {kind: 'task'} | {kind: 'file'; file: TaskFile} | {kind: 'comment'; comment: TaskComment} | null
  >(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  if (!task) {
    return (
      <View style={{flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm}}>
        <View style={{paddingHorizontal: spacing.lg}}>
          <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        </View>
        <View style={{padding: spacing.lg}}>
          {tasks.isPending ? (
            <Skeleton height={200} radius={20} />
          ) : (
            <Card>
              <EmptyState
                compact
                icon={ListChecks}
                title="Task not found"
                message={tasks.isError ? tasks.error.message : 'It may have been deleted.'}
              />
            </Card>
          )}
        </View>
      </View>
    );
  }

  const status = taskStatus(task.status);
  const late = daysLate(task) > 0;
  const created = parseServerDate(task.created_at);
  const files = task.task_files ?? [];
  const base = tasks.data?.filePath;
  const mine = (c: TaskComment) => (isCompany ? c.employee_id == null : c.employee_id === me);

  const attach = async () => {
    const picked = await pickFiles();
    if (picked.length) {
      upload.mutate({id, files: picked});
    }
  };
  const send = () => {
    const text = draft.trim();
    if (!text || addComment.isPending) {
      return;
    }
    addComment.mutate(text, {onSuccess: () => setDraft('')});
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: colors.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
        }}>
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="h2" numberOfLines={1}>
            {task.title}
          </Text>
          {created ? (
            <Text variant="caption" tone="muted">
              Task · created {formatDay(created)}
              {created.getFullYear() !== new Date().getFullYear() ? ` ${created.getFullYear()}` : ''}
            </Text>
          ) : null}
        </View>
        {isCompany ? (
          <IconButton icon={EllipsisVertical} accessibilityLabel="More" onPress={() => setMenu(true)} />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md}}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={tasks.isRefetching || comments.isRefetching}
            onRefresh={() => {
              tasks.refetch();
              comments.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        <View
          accessibilityRole="radiogroup"
          style={{
            flexDirection: 'row',
            gap: 4,
            padding: 4,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceMuted,
          }}>
          {STATUSES.map(s => {
            const on = s === status;
            const fg = s === 'completed' ? colors.success : s === 'pending' ? colors.warning : colors.info;
            return (
              <Pressable
                key={s}
                accessibilityRole="radio"
                accessibilityState={{checked: on, busy: setStatus.isPending}}
                disabled={on || setStatus.isPending}
                onPress={() => {
                  haptics.select();
                  setStatus.mutate({id, status: STATUS_VALUE[s]});
                }}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? colors.surface : 'transparent',
                }}>
                <Text variant="label" color={on ? fg : colors.textMuted}>
                  {STATUS_LABEL[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={{gap: spacing.md}}>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm}}>
            <PriorityTag priority={priorityOf(task.priority)} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              {late ? (
                <TriangleAlert size={14} color={colors.danger} />
              ) : (
                <CalendarDays size={14} color={colors.textMuted} />
              )}
              <Text variant="caption" color={late ? colors.danger : colors.textMuted}>
                {formatRange(task.start_date, task.end_date)} · {dueLabel(task)}
              </Text>
            </View>
          </View>
          {task.description?.trim() ? <Text variant="bodyRegular">{task.description.trim()}</Text> : null}
          <View style={{gap: spacing.sm}}>
            {(task.assigned_employees ?? []).map(p => (
              <View key={p.id} style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
                <Avatar name={p.name} size={28} />
                <Text tone="muted" style={{flex: 1}} numberOfLines={1}>
                  {p.name}
                  {p.id === me ? ' (you)' : ''}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <Text variant="overline" tone="muted">
              Files · {files.length}
            </Text>
            <Pressable
              onPress={attach}
              disabled={upload.isPending}
              accessibilityRole="button"
              hitSlop={8}
              style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              {upload.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Paperclip size={14} color={colors.primary} />
              )}
              <Text variant="label" tone="primary">
                {upload.isPending ? 'Uploading…' : 'Attach'}
              </Text>
            </Pressable>
          </View>
          {files.map((f, i) => {
            const url = taskFileUrl(f, base);
            const name = f.filename.replace(/\.+$/, '');
            return (
              <Pressable
                key={f.id}
                onPress={() =>
                  url
                    ? Linking.openURL(url).catch(() => toast.error('Couldn’t open the file.'))
                    : toast.error('This file was uploaded without a file type and can’t be opened.')
                }
                onLongPress={
                  isCompany
                    ? () => {
                        haptics.tap();
                        setConfirm({kind: 'file', file: f});
                      }
                    : undefined
                }
                accessibilityRole="link"
                accessibilityHint={isCompany ? 'Long press to remove' : undefined}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: 10,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                  marginTop: i ? 0 : spacing.sm,
                }}>
                <IconWell
                  icon={FileText}
                  fg={url ? colors.primary : colors.textMuted}
                  bg={url ? colors.primarySoft : colors.surfaceMuted}
                  size={36}
                />
                <View style={{flex: 1, minWidth: 0}}>
                  <Text variant="title" numberOfLines={1} color={url ? colors.text : colors.textMuted}>
                    {name}
                  </Text>
                  <Text variant="caption" color={url ? colors.textMuted : colors.warning}>
                    {url ? fileKind(f.filename) : 'Not available: uploaded without a file type'}
                  </Text>
                </View>
                {url ? <ExternalLink size={16} color={colors.textSubtle} /> : null}
              </Pressable>
            );
          })}
        </Card>

        <Card>
          <Text variant="overline" tone="muted">
            Comments{comments.data ? ` · ${comments.data.length}` : ''}
          </Text>
          {comments.isPending ? (
            <Skeleton height={48} radius={14} style={{marginTop: spacing.sm}} />
          ) : !comments.data?.length ? (
            <Text tone="muted" style={{marginTop: spacing.sm}}>
              No comments yet.
            </Text>
          ) : (
            comments.data.map(cm => {
              const own = mine(cm);
              const who = cm.employee?.name ?? companyName;
              const at = parseServerDate(cm.created_at);
              return (
                <Pressable
                  key={cm.id}
                  onLongPress={
                    own
                      ? () => {
                          haptics.tap();
                          setConfirm({kind: 'comment', comment: cm});
                        }
                      : undefined
                  }
                  accessibilityHint={own ? 'Long press to delete' : undefined}
                  style={{
                    flexDirection: own ? 'row-reverse' : 'row',
                    gap: spacing.sm,
                    marginTop: spacing.md,
                  }}>
                  <Avatar name={who} size={30} />
                  <View
                    style={{
                      maxWidth: '78%',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: own ? colors.primarySoft : colors.surfaceMuted,
                    }}>
                    <Text variant="caption" tone="muted">
                      {own ? 'You' : who}
                      {at ? ` · ${formatDay(at)}` : ''}
                    </Text>
                    <Text>{cm.comments}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </Card>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.sm,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a comment…"
          placeholderTextColor={colors.textSubtle}
          multiline
          maxLength={1000}
          style={{
            flex: 1,
            minHeight: 46,
            maxHeight: 120,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            color: colors.text,
            fontFamily: 'PlusJakartaSans-Medium',
            fontSize: 15,
          }}
          accessibilityLabel="Comment"
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim() || addComment.isPending}
          accessibilityRole="button"
          accessibilityLabel="Send comment"
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: draft.trim() ? colors.primary : colors.surfaceMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Send size={18} color={draft.trim() ? '#FFFFFF' : colors.textSubtle} />
        </Pressable>
      </View>

      <BottomSheet
        visible={menu}
        onClose={() => setMenu(false)}
        onClosed={() => {
          if (pendingConfirm) {
            setPendingConfirm(false);
            setConfirm({kind: 'task'});
          }
        }}
        title={task.title}>
        <View style={{gap: spacing.sm}}>
          <Button
            title="Edit task"
            icon={Pencil}
            variant="secondary"
            onPress={() => {
              setMenu(false);
              navigation.navigate('TaskForm', {id});
            }}
          />
          <Button
            title="Delete task"
            icon={Trash2}
            variant="ghost"
            onPress={() => {
              setPendingConfirm(true);
              setMenu(false);
            }}
          />
        </View>
      </BottomSheet>

      <ConfirmDialog
        visible={!!confirm}
        icon={Trash2}
        destructive
        title={
          confirm?.kind === 'task'
            ? 'Delete this task?'
            : confirm?.kind === 'file'
            ? 'Remove this file?'
            : 'Delete your comment?'
        }
        message={
          confirm?.kind === 'task'
            ? 'Its files and comments go with it. This can’t be undone.'
            : confirm?.kind === 'file'
            ? confirm.file.filename
            : undefined
        }
        confirmLabel={confirm?.kind === 'task' ? 'Delete' : 'Remove'}
        loading={removeTask.isPending || removeFile.isPending || removeComment.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) {
            return;
          }
          const done = {onSuccess: () => setConfirm(null)};
          if (confirm.kind === 'task') {
            removeTask.mutate(id, {
              onSuccess: () => {
                setConfirm(null);
                navigation.goBack();
              },
            });
          } else if (confirm.kind === 'file') {
            removeFile.mutate(confirm.file.id, done);
          } else {
            removeComment.mutate(confirm.comment.id, done);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}
