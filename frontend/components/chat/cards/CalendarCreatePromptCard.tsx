import React from 'react';

type CalendarPromptMeta = {
  title?: string;
  message?: string;
  missing?: string[];
  detected?: {
    summary?: string | null;
    start?: string | null;
    end?: string | null;
    location?: string | null;
    description?: string | null;
    timezone?: string | null;
  };
};

type CalendarCreatePromptCardProps = {
  meta: CalendarPromptMeta;
  onQuickReply?: (content: string) => void;
};

const EXAMPLE_SUGGESTIONS: Record<string, string> = {
  summary: '제목은 "프로젝트 회의"야.',
  start: '시작 시간은 2025-11-10 14:00이야.',
  end: '종료 시간은 2025-11-10 15:00으로 잡아줘.',
  location: '위치는 서울 본사 회의실로 해줘.',
  description: '설명은 "주간 진행 상황 공유"라고 적어줘.',
};

const CalendarCreatePromptCard: React.FC<CalendarCreatePromptCardProps> = ({ meta, onQuickReply }) => {
  const detected = meta.detected ?? {};
  const missing = meta.missing ?? [];

  const handleQuickReply = (field: string) => {
    if (!onQuickReply) return;
    const suggestion = EXAMPLE_SUGGESTIONS[field];
    if (suggestion) {
      onQuickReply(suggestion);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
      <div>
        <p className="font-semibold">📅 {meta.title ?? 'Google Calendar 일정 등록'}</p>
        {meta.message && <p className="mt-1 text-sm text-violet-800">{meta.message}</p>}
      </div>

      <div>
        <p className="text-xs font-semibold text-violet-700">감지된 정보</p>
        <ul className="mt-1 space-y-1 text-xs">
          <li>제목: {detected.summary || '없음'}</li>
          <li>시작: {detected.start || '없음'}</li>
          <li>종료: {detected.end || '없음'}</li>
          <li>위치: {detected.location || '없음'}</li>
          <li>설명: {detected.description || '없음'}</li>
          <li>시간대: {detected.timezone || 'Asia/Seoul'}</li>
        </ul>
      </div>

      {missing.length > 0 && (
        <div className="rounded-md bg-white/60 p-2">
          <p className="text-xs font-semibold text-red-600">추가로 필요한 정보</p>
          <ul className="mt-1 space-y-1 text-xs text-red-700">
            {missing.map((field) => (
              <li key={field} className="flex items-center justify-between">
                <span>- {field}</span>
                {onQuickReply && EXAMPLE_SUGGESTIONS[field] && (
                  <button
                    type="button"
                    onClick={() => handleQuickReply(field)}
                    className="rounded-full bg-violet-200 px-2 py-1 text-[11px] font-medium text-violet-900 hover:bg-violet-300"
                  >
                    예시 보내기
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CalendarCreatePromptCard;
