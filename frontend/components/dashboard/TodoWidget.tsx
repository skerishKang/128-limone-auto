import { useState, useEffect, useCallback } from 'react';
import { apiService, type TaskItem } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

interface TodoWidgetProps {
  onSummaryUpdate?: (summary: { total: number; completed: number }) => void;
  refreshToken?: number;
}

export default function TodoWidget({ onSummaryUpdate, refreshToken }: TodoWidgetProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('할 일을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addTask = async () => {
    if (!newTask.trim()) return;
    try {
      setIsSaving(true);
      setError(null);
      const created = await apiService.createTask(newTask.trim());
      setTasks(prev => [...prev, created]);
      setNewTask('');
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('새 할 일을 추가하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTask = async (task: TaskItem) => {
    try {
      const updated = await apiService.updateTask(task.id, { completed: !task.completed });
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setError('할 일 상태를 변경하지 못했습니다.');
    }
  };

  const removeTask = async (taskId: string) => {
    try {
      await apiService.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('할 일을 삭제하지 못했습니다.');
    }
  };

  useEffect(() => {
    void loadTasks();
  }, [loadTasks, refreshToken]);

  useEffect(() => {
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    onSummaryUpdate?.({ total: totalCount, completed: completedCount });
  }, [tasks, onSummaryUpdate]);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          ✅ 할 일
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">진행률</span>
            <span className="text-xs font-medium">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`
                flex items-center gap-3 p-2 rounded border cursor-pointer transition-colors
                ${task.completed ? 'bg-gray-50 border-gray-100 opacity-60' : 'border-gray-100 hover:border-green-400 hover:bg-gray-50'}
              `}
            >
              <button
                onClick={() => toggleTask(task)}
                className={`
                  w-4 h-4 rounded border-2 flex items-center justify-center
                  ${task.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-gray-300 hover:border-green-400'}
                `}
              >
                {task.completed && <span className="text-xs">✓</span>}
              </button>
              <div className="flex-1">
                <p className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'} whitespace-pre-line`}>
                  {task.title}
                </p>
                {task.due_date && (
                  <p className="text-[11px] text-gray-400 mt-0.5">마감: {new Date(task.due_date).toLocaleDateString('ko-KR')}</p>
                )}
              </div>
              <span className={`
                text-xs px-2 py-0.5 rounded
                ${task.priority === 'high' ? 'bg-red-100 text-red-600' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'}
              `}>
                {task.priority === 'high' ? '높음' :
                 task.priority === 'medium' ? '보통' : '낮음'}
              </span>
              <button
                onClick={() => removeTask(task.id)}
                className="text-xs text-gray-400 hover:text-red-500"
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
          {!tasks.length && !isLoading && (
            <p className="text-xs text-gray-500 text-center py-4">등록된 할 일이 없습니다.</p>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addTask();
              }
            }}
            placeholder="새 할 일..."
            className="
              flex-1 px-2 py-1 text-sm
              border border-gray-300 rounded
              focus:outline-none focus:ring-1 focus:ring-green-400
            "
            disabled={isSaving}
          />
          <button
            onClick={() => void addTask()}
            disabled={isSaving}
            className="
              px-3 py-1 text-sm
              bg-green-500 hover:bg-green-600
              disabled:bg-gray-300 disabled:text-gray-500
              text-white rounded
              transition-colors
            "
          >
            {isSaving ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
