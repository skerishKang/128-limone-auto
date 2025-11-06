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

interface DashboardStats {
  gmail: number;
  calendar: number;
  telegram: number;
  drive: number;
  tasks: number;
}

export default function DashboardPanel() {
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
    <div className="h-full bg-gray-50 dark:bg-gray-800 p-6 overflow-y-auto custom-scrollbar">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📊 Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={isLoading}
          className="
            px-4 py-2
            bg-yellow-400 hover:bg-yellow-500
            disabled:bg-gray-300
            text-gray-900 rounded-lg
            font-medium text-sm
            transition-colors
            flex items-center gap-2
          "
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              새로고침 중...
            </>
          ) : (
            <>
              🔄 새로고침
            </>
          )}
        </button>
      </header>

      {/* 위젯 그리드 - 8개 위젯 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GmailWidget count={stats.gmail} />
        <CalendarWidget count={stats.calendar} />
        <TelegramWidget count={stats.telegram} />
        <DriveWidget count={stats.drive} />
        <WeatherWidget />
        <NewsWidget />
        <SystemWidget />
        <TodoWidget />
      </div>

      {/* 추가 통계 카드들 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">📈 요약</h3>
          <div className="space-y-1">
            <p className="text-sm text-gray-700">
              총 알림: <span className="font-bold">{stats.gmail + stats.telegram}</span>
            </p>
            <p className="text-sm text-gray-700">
              오늘 일정: <span className="font-bold">{stats.calendar}</span>
            </p>
            <p className="text-sm text-gray-700">
              Drive 파일: <span className="font-bold">{stats.drive}</span>
            </p>
            <p className="text-sm text-gray-700">
              완료된 할 일: <span className="font-bold">{stats.tasks}</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">🎯 빠른 액션</h3>
          <div className="space-y-2">
            <button className="w-full text-left text-sm text-blue-600 hover:underline">
              ➕ 새 일정 추가
            </button>
            <button className="w-full text-left text-sm text-blue-600 hover:underline">
              📧 새 메일 작성
            </button>
            <button className="w-full text-left text-sm text-blue-600 hover:underline">
              📁 Drive에 업로드
            </button>
            <button className="w-full text-left text-sm text-blue-600 hover:underline">
              ✅ 할 일 추가
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">ℹ️ 상태</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-700">AI 온라인</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-700">Gemini API 연결됨</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-700">모든 서비스 정상</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-700">실시간 업데이트</p>
            </div>
          </div>
        </div>
      </div>

      {/* 업데이트 로그 */}
      <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">📝 업데이트 로그</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <p>• 2024-11-07: v1.0 - 기본 기능 완성</p>
          <p>• 2024-11-07: Gemini 2.0 API 연동 완료</p>
          <p>• 2024-11-07: 8개 대시보드 위젯 추가</p>
          <p>• 2024-11-07: Enhanced State Management 적용</p>
        </div>
      </div>
    </div>
  );
}
