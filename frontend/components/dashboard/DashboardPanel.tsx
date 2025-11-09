import { useState, useEffect, useCallback, useRef } from 'react';
import GmailWidget from './GmailWidget';
import CalendarWidget from './CalendarWidget';
import TelegramWidget from './TelegramWidget';
import DriveWidget from './DriveWidget';
import WeatherWidget from './WeatherWidget';
import NewsWidget from './NewsWidget';
import SystemWidget from './SystemWidget';
import TodoWidget from './TodoWidget';

interface DashboardPanelProps {
  columns?: 1 | 2 | 3; // 동적 열 수
  onStatsChange?: (stats: SummaryStats) => void;
}

interface SummaryStats {
  gmailUnread: number;
  telegramMessages: number;
  calendarToday: number;
  driveFiles: number;
  tasksTotal: number;
  tasksCompleted: number;
}

const INITIAL_STATS: SummaryStats = {
  gmailUnread: 0,
  telegramMessages: 0,
  calendarToday: 0,
  driveFiles: 0,
  tasksTotal: 0,
  tasksCompleted: 0,
};

export default function DashboardPanel({ columns = 2, onStatsChange }: DashboardPanelProps) {
  const [summaryStats, setSummaryStats] = useState<SummaryStats>(INITIAL_STATS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshToken, setRefreshToken] = useState(0);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAll = useCallback(() => {
    setIsRefreshing(true);
    setRefreshToken((prev) => prev + 1);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (!isRefreshing) {
      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
      };
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      setIsRefreshing(false);
    }, 500);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [isRefreshing]);

  useEffect(() => {
    // 초기 로드 시 위젯 데이터 확보
    refreshAll();
    const interval = setInterval(refreshAll, 300000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const handleCalendarSummary = useCallback((summary: { todayCount: number; total: number }) => {
    setSummaryStats((prev) => ({ ...prev, calendarToday: summary.todayCount }));
  }, []);

  const handleTelegramSummary = useCallback((summary: { recentCount: number }) => {
    setSummaryStats((prev) => ({ ...prev, telegramMessages: summary.recentCount }));
  }, []);

  const handleTodoSummary = useCallback((summary: { total: number; completed: number }) => {
    setSummaryStats((prev) => ({
      ...prev,
      tasksTotal: summary.total,
      tasksCompleted: summary.completed,
    }));
  }, []);

  const handleGmailSummary = useCallback((summary: { unread: number }) => {
    setSummaryStats((prev) => ({ ...prev, gmailUnread: summary.unread }));
  }, []);

  const handleDriveSummary = useCallback((summary: { fileCount: number }) => {
    setSummaryStats((prev) => ({ ...prev, driveFiles: summary.fileCount }));
  }, []);

  const notificationsCount = summaryStats.gmailUnread + summaryStats.telegramMessages;

  useEffect(() => {
    onStatsChange?.(summaryStats);
  }, [summaryStats, onStatsChange]);

  return (
    <div className="h-full bg-white p-3">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-gray-800">📊 대시보드</h2>
        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="
            text-xs px-2 py-1
            bg-yellow-400 hover:bg-yellow-500
            disabled:bg-gray-300
            text-gray-900 rounded
            transition-colors
          "
        >
          {isRefreshing ? '⟳' : '🔄'}
        </button>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </div>

      {/* 상단 요약 및 상태 카드 - 위젯 스타일과 통일 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {/* 요약 카드 */}
        <div className="bg-white rounded-xl p-4 border-2 border-blue-500/80 bg-blue-50/30 shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                📊 <span>요약</span>
              </h3>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>🔔 <span className="font-semibold text-gray-900">{notificationsCount}</span> 알림</li>
                <li>📅 <span className="font-semibold text-gray-900">{summaryStats.calendarToday}</span> 일정</li>
                <li>📁 <span className="font-semibold text-gray-900">{summaryStats.driveFiles}</span> 파일</li>
                <li>✅ <span className="font-semibold text-gray-900">{summaryStats.tasksTotal}</span> 할 일</li>
              </ul>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                ⚡ <span>빠른 액션</span>
              </h3>
              <div className="space-y-1">
                <button className="w-full text-left text-xs text-gray-600 hover:text-gray-900 font-medium">
                  📅 새 일정
                </button>
                <button className="w-full text-left text-xs text-gray-600 hover:text-gray-900 font-medium">
                  💬 텔레그램 메시지
                </button>
                <button className="w-full text-left text-xs text-gray-600 hover:text-gray-900 font-medium">
                  ✅ 할 일 추가
                </button>
                <button className="w-full text-left text-xs text-gray-600 hover:text-gray-900 font-medium">
                  📧 새 메일
                </button>
              </div>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>

        {/* 상태 카드 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                ℹ️ <span>상태</span>
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-xs text-gray-600 font-medium">AI 온라인</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-xs text-gray-600 font-medium">Gemini 연결됨</p>
                </div>
              </div>
            </div>
            <div className="text-3xl">🔔</div>
          </div>
        </div>

        {/* 날씨 카드 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-shadow border-l-4 border-yellow-400">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                🌤️ <span>날씨</span>
              </h3>
              <div className="space-y-1 text-xs text-gray-600">
                <p className="font-medium text-gray-700">서울</p>
                <p className="text-lg font-bold text-gray-900">12°C</p>
                <p>맑음</p>
              </div>
            </div>
            <div className="text-4xl">
              ☀️
            </div>
          </div>
        </div>
      </div>

      {/* 위젯 그리드 - 동적 열 수 */}
      <div className={`grid gap-2 ${
        columns === 1 ? 'grid-cols-1' :
        columns === 2 ? 'grid-cols-2' :
        'grid-cols-3'
      }`}>
        {/* 1열(왼쪽): 일정/계획 */}
        <CalendarWidget onSummaryUpdate={handleCalendarSummary} refreshToken={refreshToken} />
        <TelegramWidget onSummaryUpdate={handleTelegramSummary} refreshToken={refreshToken} />

        {/* 2열(오른쪽): 실시간 감시 */}
        <TodoWidget onSummaryUpdate={handleTodoSummary} refreshToken={refreshToken} />
        <GmailWidget onSummaryUpdate={handleGmailSummary} refreshToken={refreshToken} />

        {/* 기타 위젯들 */}
        <DriveWidget onSummaryUpdate={handleDriveSummary} refreshToken={refreshToken} />
        <WeatherWidget />
        <SystemWidget />
        <NewsWidget />
      </div>
    </div>
  );
}
