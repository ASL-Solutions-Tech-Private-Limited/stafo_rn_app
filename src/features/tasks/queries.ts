import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  addTaskComment,
  createTask,
  deleteTask,
  deleteTaskComment,
  deleteTaskFile,
  getTaskComments,
  getTasks,
  setTaskStatus,
  updateTask,
  uploadTaskFiles,
  type TaskInput,
  type UploadFile,
} from '../../api/endpoints/tasks';
import {toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {useSession} from '../../store/session';
import {myTasks} from './taskLogic';

export const taskKeys = {
  list: (companyId: string | null) => ['tasks', companyId] as const,
  comments: (id: number) => ['task-comments', id] as const,
};

/** The company's tasks, or only the signed-in employee's. */
export function useTasks() {
  const companyId = useSession(s => s.companyId);
  const role = useSession(s => s.role);
  const employeeId = useSession(s => s.employee?.id);
  return useQuery({
    queryKey: taskKeys.list(companyId),
    queryFn: () => getTasks(companyId!),
    enabled: !!companyId,
    select: d => ({
      filePath: d.filePath,
      tasks: role === 'company' ? d.tasks : myTasks(d.tasks, employeeId ?? -1),
    }),
  });
}

export function useTaskComments(taskId: number) {
  return useQuery({queryKey: taskKeys.comments(taskId), queryFn: () => getTaskComments(taskId)});
}

function useTaskMutation<A>(
  fn: (a: A) => Promise<unknown>,
  done?: string,
  extraKey?: (a: A) => readonly unknown[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_, a) => {
      haptics.success();
      if (done) {
        toast.success(done);
      }
      queryClient.invalidateQueries({queryKey: ['tasks']});
      if (extraKey) {
        queryClient.invalidateQueries({queryKey: extraKey(a)});
      }
    },
    onError: (e: Error) => {
      haptics.error();
      toast.error(e.message);
    },
  });
}

export function useSaveTask() {
  const companyId = useSession(s => s.companyId);
  return useTaskMutation((p: {id?: number; input: TaskInput}) =>
    p.id ? updateTask(p.id, p.input) : createTask(companyId!, p.input),
  );
}

export const useDeleteTask = () => useTaskMutation((id: number) => deleteTask(id), 'Task deleted');

export const useSetTaskStatus = () =>
  useTaskMutation((p: {id: number; status: string}) => setTaskStatus(p.id, p.status));

export const useUploadTaskFiles = () =>
  useTaskMutation((p: {id: number; files: UploadFile[]}) => uploadTaskFiles(p.id, p.files), 'Files attached');

export const useDeleteTaskFile = () => useTaskMutation((id: number) => deleteTaskFile(id), 'File removed');

export function useAddComment(taskId: number) {
  const role = useSession(s => s.role);
  const companyId = useSession(s => s.companyId);
  const employeeId = useSession(s => s.employee?.id);
  return useTaskMutation(
    (text: string) =>
      addTaskComment(
        taskId,
        text,
        role === 'company' ? {companyId: Number(companyId)} : {employeeId: employeeId ?? 0},
      ),
    undefined,
    () => taskKeys.comments(taskId),
  );
}

export const useDeleteComment = (taskId: number) =>
  useTaskMutation(
    (id: number) => deleteTaskComment(id),
    undefined,
    () => taskKeys.comments(taskId),
  );
