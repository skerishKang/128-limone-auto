import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export default function TodoWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTask, setNewTask] = useState('');

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      
      // 더미 할 일 데이터
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Gemini API 연동 완료',
          completed: true,
          priority: 'high'
        },
        {
          id: '2',
          title: '대시보드 위젯 추가',
          completed: true,
          priority: 'medium'
        },
        {
          id: '3',
          title: '테스트 케이스 작성',
          completed: false,
          priority: 'medium'
        },
        {
          id: '4',
          title: '성능 최적화',
          completed: false,
          priority: 'low'
        }
      ];
      
      setTasks(mockTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addTask = () => {
    if (newTask.trim()) {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask,
        completed: false,
        priority: 'medium'
      };
      setTasks([...tasks, task]);
      setNewTask('');
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  useEffect(() => {
    loadTasks();
  }, []);

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

      <div className="space-y-3">
        {/* 진행률 */}
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

        {/* 할 일 목록 */}
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`
                flex items-center gap-2 p-2 rounded cursor-pointer
                ${task.completed ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}
              `}
            >
              <div className={`
                w-4 h-4 rounded border-2 flex items-center justify-center
                ${task.completed 
                  ? 'bg-green-500 border-green-500' 
                  : 'border-gray-300 hover:border-green-400'
                }
              `}>
                {task.completed && <span className="text-white text-xs">✓</span>}
              </div>
              <span className={`
                text-sm flex-1
                ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}
              `}>
                {task.title}
              </span>
              <span className={`
                text-xs px-2 py-0.5 rounded
                ${task.priority === 'high' ? 'bg-red-100 text-red-600' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'}
              `}>
                {task.priority === 'high' ? '높음' :
                 task.priority === 'medium' ? '보통' : '낮음'}
              </span>
            </div>
          ))}
        </div>

        {/* 새 할 일 추가 */}
        <div className="pt-2 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            placeholder="새 할 일..."
            className="
              flex-1 px-2 py-1 text-sm
              border border-gray-300 rounded
              focus:outline-none focus:ring-1 focus:ring-green-400
            "
          />
          <button
            onClick={addTask}
            className="
              px-3 py-1 text-sm
              bg-green-500 hover:bg-green-600
              text-white rounded
              transition-colors
            "
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
