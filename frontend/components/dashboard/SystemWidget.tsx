import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

interface SystemStats {
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  activeUsers: number;
}

export default function SystemWidget() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      
      // 더미 시스템 통계
      const mockStats: SystemStats = {
        cpu: 45,
        memory: 68,
        disk: 32,
        uptime: "5d 12h 34m",
        activeUsers: 12
      };
      
      setStats(mockStats);
    } catch (err) {
      console.error('Failed to load system stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // 10초마다 업데이트
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number) => {
    if (value < 50) return 'bg-green-500';
    if (value < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      onClick={loadStats}
      className="
        bg-white rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-indigo-500
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          🖥️ 시스템
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      {stats && (
        <div className="space-y-3">
          {/* CPU */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">CPU</span>
              <span className="text-xs font-medium">{stats.cpu}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStatusColor(stats.cpu)}`}
                style={{ width: `${stats.cpu}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Memory</span>
              <span className="text-xs font-medium">{stats.memory}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStatusColor(stats.memory)}`}
                style={{ width: `${stats.memory}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Disk</span>
              <span className="text-xs font-medium">{stats.disk}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStatusColor(stats.disk)}`}
                style={{ width: `${stats.disk}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500">Uptime</p>
              <p className="font-medium">{stats.uptime}</p>
            </div>
            <div>
              <p className="text-gray-500">Users</p>
              <p className="font-medium">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
