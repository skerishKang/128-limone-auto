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
  weatherTemp: string;
  weatherCondition: string;
  aiOnline: boolean;
  geminiConnected: boolean;
}

export default function DashboardPanel({ columns = 2 }: DashboardPanelProps) {
  const [stats, setStats] = useState<DashboardStats>({
    gmail: 0,
    calendar: 0,
    telegram: 0,
    drive: 0,
    tasks: 0,
    weatherTemp: '18°C',
    weatherCondition: '맑음',
    aiOnline: true,
    geminiConnected: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshAll = async () => {
    try {
      setIsLoading(true);

      // 더미 데이터 로드 (실제 API 연동 전까지)
      await new Promise(resolve => setTimeout(resolve, 500)); // 로딩 시뮬레이션

      // 무작위 데이터로 업데이트 (새로고침 효과를 위한)
      const randomGmail = Math.floor(Math.random() * 20) + 1;
      const randomCalendar = Math.floor(Math.random() * 10) + 1;
      const randomTelegram = Math.floor(Math.random() * 15) + 1;
      const randomDrive = Math.floor(Math.random() * 100) + 10;
      const randomTasks = Math.floor(Math.random() * 8) + 1;

      setStats({
        gmail: randomGmail,
        calendar: randomCalendar,
        telegram: randomTelegram,
        drive: randomDrive,
        tasks: randomTasks,
        weatherTemp: `${Math.floor(Math.random() * 15) + 10}°C`,
        weatherCondition: ['맑음', '구름', '비', '눈'][Math.floor(Math.random() * 4)],
        aiOnline: Math.random() > 0.1, // 90% 확률로 온라인
        geminiConnected: Math.random() > 0.05 // 95% 확률로 연결됨
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
                  <div className={`w-2 h-2 rounded-full ${stats.aiOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <p className="text-xs text-purple-700 font-medium">
                    {stats.aiOnline ? 'AI 온라인' : 'AI 오프라인'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stats.geminiConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <p className="text-xs text-purple-700 font-medium">
                    {stats.geminiConnected ? 'Gemini 연결됨' : 'Gemini 연결 안됨'}
                  </p>
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
                <p className="text-lg font-bold text-yellow-800">{stats.weatherTemp}</p>
                <p className="text-xs text-yellow-700">{stats.weatherCondition}</p>
              </div>
            </div>
            <div className="text-3xl">
              {stats.weatherCondition === '맑음' ? '☀️' :
               stats.weatherCondition === '구름' ? '☁️' :
               stats.weatherCondition === '비' ? '🌧️' : '❄️'}
            </div>
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
          {/* 1열(왼쪽): 일정/계획 */}
          <CalendarWidget />
          <TodoWidget />

          {/* 2열(오른쪽): 실시간 감시 */}
          <TelegramWidget />
          <GmailWidget />

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
