import { useState } from 'react';

interface Event {
  id: number;
  title: string;
  time: string;
  location?: string;
  type: 'meeting' | 'task' | 'reminder';
}

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events] = useState<Event[]>([
    { id: 1, title: '주간 팀 미팅', time: '오후 2:00 - 3:00', location: '회의실 A', type: 'meeting' },
    { id: 2, title: '프로젝트 리뷰', time: '오후 4:00 - 5:00', type: 'meeting' },
    { id: 3, title: '출장 보고서 작성', time: '全天', type: 'task' },
    { id: 4, title: '의사소통 미팅', time: '내일 오전 10:00', type: 'meeting' },
  ]);

  const todayEvents = events.filter(e => e.type === 'meeting');

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-500';
      case 'task':
        return 'bg-green-500';
      case 'reminder':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Calendar 스타일 헤더 */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
        <div className="flex-1 flex items-center gap-3">
          <span className="text-blue-500 text-2xl">📅</span>
          <span className="font-semibold text-gray-800">캘린더</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <span className="text-gray-600">◀</span>
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <span className="text-gray-600">▶</span>
          </button>
        </div>
      </div>

      {/* 오늘의 일정 */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">오늘의 일정</h3>
        <div className="space-y-2">
          {todayEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 cursor-pointer transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${getEventTypeColor(event.type)}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm mb-1">{event.title}</div>
                  <div className="text-xs text-gray-500">{event.time}</div>
                  {event.location && (
                    <div className="text-xs text-gray-500 mt-1">📍 {event.location}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 내일 일정 */}
        <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-6">내일</h3>
        <div className="space-y-2">
          {events.filter(e => e.id === 4).map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 cursor-pointer transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${getEventTypeColor(event.type)}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm mb-1">{event.title}</div>
                  <div className="text-xs text-gray-500">{event.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 액션 바 */}
      <div className="h-12 bg-white border-t border-gray-200 flex items-center justify-center flex-shrink-0">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
          캘린더 열기
        </button>
      </div>
    </div>
  );
}
