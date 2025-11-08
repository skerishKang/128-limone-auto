import { useState, useEffect, useCallback } from 'react';
import { apiService, CalendarEventsResponse } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import WidgetContainer from './WidgetContainer';

interface CalendarEventItem {
  id: string;
  summary?: string;
  start?: string;
  end?: string;
  htmlLink?: string;
}

export default function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseDate = (value?: string) => {
    if (!value) return null;
    if (!value.includes('T')) {
      return new Date(`${value}T00:00:00`);
    }
    return new Date(value);
  };

  const calculateTodayCount = (items: CalendarEventItem[]) => {
    const today = new Date();
    return items.filter((item) => {
      const startDate = parseDate(item.start);
      if (!startDate) return false;
      return (
        startDate.getFullYear() === today.getFullYear() &&
        startDate.getMonth() === today.getMonth() &&
        startDate.getDate() === today.getDate()
      );
    }).length;
  };

  const formatEventTime = (item: CalendarEventItem) => {
    const startDate = parseDate(item.start);
    if (!startDate) {
      return '시간 정보 없음';
    }
    if (!item.start || !item.start.includes('T')) {
      return startDate.toLocaleDateString('ko-KR');
    }
    return startDate.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response: CalendarEventsResponse = await apiService.getCalendarEvents(10);
      const items = response.items ?? [];
      setEvents(items);
      setTodayCount(calculateTodayCount(items));
    } catch (err: any) {
      console.error('캘린더 일정 조회 실패:', err);
      setError(err?.message ?? '일정 조회 중 오류가 발생했습니다.');
      setEvents([]);
      setTodayCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openCalendar = (url?: string) => {
    if (typeof window === 'undefined') return;
    const fallbackUrl = 'https://calendar.google.com/calendar/u/0/r';
    window.open(url ?? fallbackUrl, '_blank');
  };

  return (
    <WidgetContainer
      title="Calendar"
      icon="📅"
      accentColorClass="border-blue-500"
      headerExtras={(
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadEvents}
            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => openCalendar()}
            className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            캘린더 열기
          </button>
        </div>
      )}
      collapsedSummary={<span className="text-xs text-gray-500">오늘 일정 {todayCount}개</span>}
      className="flex flex-col"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
          <p className="text-sm text-gray-500">오늘 일정</p>
        </div>

        <div className="pt-2 border-t border-gray-100 flex-1 overflow-y-auto">
          <p className="text-xs font-medium text-gray-600 mb-2">다가오는 일정</p>
          {isLoading && (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="sm" />
            </div>
          )}
          {error && !isLoading && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          {!error && !isLoading && events.length === 0 && (
            <p className="text-xs text-gray-500">예정된 일정이 없습니다.</p>
          )}
          {!error && !isLoading && events.slice(0, 5).map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => openCalendar(event.htmlLink)}
              className="w-full text-left mb-2 last:mb-0 p-2 rounded hover:bg-blue-50 transition-colors"
            >
              <p className="text-sm font-medium text-gray-800 truncate">
                {event.summary ?? '제목 없음'}
              </p>
              <p className="text-xs text-gray-500">
                {formatEventTime(event)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </WidgetContainer>
  );
}
