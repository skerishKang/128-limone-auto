import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function CalendarWidget() {
  const [events, setEvents] = useState<any[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      
      // 더미 캘린더 데이터
      const dummyEvents = [
        {
          id: '1',
          summary: '🗓️ 개발 회의',
          start: new Date(Date.now() + 3600000).toISOString(),
          end: new Date(Date.now() + 7200000).toISOString(),
        },
        {
          id: '2',
          summary: '📋 코드 리뷰',
          start: new Date(Date.now() + 10800000).toISOString(),
          end: new Date(Date.now() + 14400000).toISOString(),
        },
        {
          id: '3',
          summary: '🚀 배포 준비',
          start: new Date(Date.now() + 18000000).toISOString(),
          end: new Date(Date.now() + 21600000).toISOString(),
        }
      ];
      
      setEvents(dummyEvents);
      setTodayCount(dummyEvents.length);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRefresh = () => {
    loadEvents();
  };

  return (
    <div
      onClick={handleRefresh}
      className="
        bg-white rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-blue-500
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          📅 Calendar
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
          <p className="text-sm text-gray-500">오늘 일정</p>
        </div>
        
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-2">다가오는 일정</p>
          {events.slice(0, 2).map((event) => (
            <div key={event.id} className="mb-2 last:mb-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {event.summary}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(event.start).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
