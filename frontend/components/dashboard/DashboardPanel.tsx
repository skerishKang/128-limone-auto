import { useState, useEffect } from 'react';
import GmailWidget from './GmailWidget';
import CalendarWidget from './CalendarWidget';
import TelegramWidget from './TelegramWidget';
import DriveWidget from './DriveWidget';
import WeatherWidget from './WeatherWidget';
import NewsWidget from './NewsWidget';
import SystemWidget from './SystemWidget';
import TodoWidget from './TodoWidget';
import LoadingSpinner from '../shared/LoadingSpinner';

interface DashboardPanelProps {
  columns?: 1 | 2 | 3; // 동적 열 수
}

interface DashboardStats {
  gmail: number;
  calendar: number;
  telegram: number;
  drive: number;
  tasks: number;
}

export default function DashboardPanel({ columns = 2 }: DashboardPanelProps) {
  const [stats, setStats] = useState<DashboardStats>({
    gmail: 0,
    calendar: 0,
    telegram: 0,
    drive: 0,
    tasks: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshAll = async () => {
    try {
      setIsLoading(true);

      // 더미 데이터 로드
      await new Promise(resolve => setTimeout(resolve, 500)); // 로딩 시뮬레이션

      setStats({
        gmail: 5,
        calendar: 3,
        telegram: 8,
        drive: 48,
        tasks: 3
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to refresh dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // 5분마다 자동 새로고침
    const interval = setInterval(refreshAll, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full bg-white p-3">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-gray-800">📊 대시보드</h2>
        <button
          onClick={refreshAll}
          disabled={isLoading}
          className="
            text-xs px-2 py-1
            bg-yellow-400 hover:bg-yellow-500
            disabled:bg-gray-300
            text-gray-900 rounded
            transition-colors
          "
        >
          {isLoading ? '⟳' : '🔄'}
        </button>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* 상단 요약 및 상태 카드 - 가로 배치 */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {/* 요약 카드 */}
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-blue-800 mb-2">📊 요약</h3>
              <div className="space-y-1">
                <div className="text-xs text-blue-700">
                  🔔 <span className="font-bold">{stats.gmail + stats.telegram}</span> 알림
                </div>
                <div className="text-xs text-blue-700">
                  📅 <span className="font-bold">{stats.calendar}</span> 일정
                </div>
                <div className="text-xs text-blue-700">
                  📁 <span className="font-bold">{stats.drive}</span> 파일
                </div>
                <div className="text-xs text-blue-700">
                  ✅ <span className="font-bold">{stats.tasks}</span> 할 일
                </div>
              </div>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-green-800 mb-2">⚡ 빠른 액션</h3>
              <div className="space-y-1">
                <button className="w-full text-left text-xs text-green-700 hover:text-green-900 font-medium">
                  ➕ 새 일정
                </button>
                <button className="w-full text-left text-xs text-green-700 hover:text-green-900 font-medium">
                  📧 새 메일
                </button>
                <button className="w-full text-left text-xs text-green-700 hover:text-green-900 font-medium">
                  📁 업로드
                </button>
                <button className="w-full text-left text-xs text-green-700 hover:text-green-900 font-medium">
                  ✅ 할 일 추가
                </button>
              </div>
            </div>
            <div className="text-2xl">🎯</div>
          </div>
        </div>

        {/* 상태 카드 */}
        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-purple-800 mb-2">ℹ️ 상태</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-purple-700 font-medium">AI 온라인</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-purple-700 font-medium">Gemini 연결됨</p>
                </div>
              </div>
            </div>
            <div className="text-2xl">🔔</div>
          </div>
        </div>

        {/* 날씨 카드 */}
        <div className="p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-yellow-800 mb-2">🌤️ 날씨</h3>
              <div className="space-y-1">
                <p className="text-xs text-yellow-700 font-medium">서울</p>
                <p className="text-lg font-bold text-yellow-800">18°C</p>
                <p className="text-xs text-yellow-700">맑음</p>
              </div>
            </div>
            <div className="text-3xl">☀️</div>
          </div>
        </div>
      </div>

      {/* 위젯 그리드 - 동적 열 수 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      ) : (
        <div className={`grid gap-2 ${
          columns === 1 ? 'grid-cols-1' :
          columns === 2 ? 'grid-cols-2' :
          'grid-cols-3'
        }`}>
          {/* 1열: 일정/계획 */}
          <CalendarWidget />
          <TodoWidget />

          {/* 2열: 실시간 감시 */}
          <GmailWidget />
          <TelegramWidget />

          {/* 기타 위젯들 */}
          <DriveWidget />
          <WeatherWidget />
          <SystemWidget />
          <NewsWidget />
        </div>
      )}
    </div>
  );
}
