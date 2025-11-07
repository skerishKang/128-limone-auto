import { useState } from 'react';

interface Email {
  id: number;
  from: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
}

export default function GmailWidget() {
  const [emails] = useState<Email[]>([
    { id: 1, from: 'Google', subject: 'Gmail 보안 알림', preview: '새로운 기기에서 Gmail 계정에 로그인했습니다.', time: '10분 전', unread: true },
    { id: 2, from: 'notifications@github.com', subject: '새 커밋이 푸시되었습니다', preview: '128-limone-auto 저장소에 새로운 커밋이 푸시되었습니다.', time: '1시간 전', unread: true },
    { id: 3, from: 'slack@limone.com', subject: '#general 채널 새로운 메시지', preview: '오늘 회의 일정을 확인해주세요.', time: '2시간 전', unread: false },
    { id: 4, from: ' calendário@google.com', subject: '회의 알림: 주간 회고', preview: '내일 오후 2시에 주간 회고 회의가 있습니다.', time: '3시간 전', unread: true },
    { id: 5, from: 'drive@google.com', subject: '드라이브 스토리지 용량 알림', preview: '드라이브 저장공간이 80% 사용되었습니다.', time: '1일 전', unread: false },
  ]);

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Gmail 스타일 헤더 */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
        <div className="flex-1 flex items-center gap-3">
          <span className="text-red-500 text-2xl">📧</span>
          <span className="font-semibold text-gray-800">Gmail</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="text-gray-600">🔍</span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="text-gray-600">⚙️</span>
          </button>
        </div>
      </div>

      {/* 메일 목록 */}
      <div className="flex-1 overflow-auto">
        {emails.map((email) => (
          <div
            key={email.id}
            className={`border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
              email.unread ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                    {email.from}
                  </span>
                  {email.unread && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                </div>
                <div className={`text-sm font-medium mb-1 ${email.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                  {email.subject}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {email.preview}
                </div>
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap">
                {email.time}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 액션 바 */}
      <div className="h-12 bg-white border-t border-gray-200 flex items-center justify-center flex-shrink-0">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
          모든 메일 보기
        </button>
      </div>
    </div>
  );
}
