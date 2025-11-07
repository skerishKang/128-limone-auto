import { useState } from 'react';

interface Chat {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
}

export default function TelegramWidget() {
  const [chats] = useState<Chat[]>([
    {
      id: 1,
      name: '팀 채널',
      lastMessage: '회의 시간 변경 안내드립니다.',
      time: '10분 전',
      unread: 5,
      avatar: '👥',
    },
    {
      id: 2,
      name: '김개발',
      lastMessage: '코드 리뷰 완료했습니다!',
      time: '30분 전',
      unread: 0,
      avatar: '👨‍💻',
    },
    {
      id: 3,
      name: '정디자인',
      lastMessage: '새 디자인 시안 검토해주세요',
      time: '1시간 전',
      unread: 2,
      avatar: '👩‍🎨',
    },
    {
      id: 4,
      name: '이마케팅',
      lastMessage: '이번 주 캠페인 결과 공유드려요',
      time: '2시간 전',
      unread: 0,
      avatar: '👩‍💼',
    },
    {
      id: 5,
      name: '박기획',
      lastMessage: '내일 발표 자료 준비 완료!',
      time: '3시간 전',
      unread: 0,
      avatar: '👔',
    },
  ]);

  return (
    <div className="h-full bg-gray-900 text-white flex">
      {/* 사이드바 */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* 헤더 */}
        <div className="h-14 bg-gray-800 flex items-center justify-between px-4 border-b border-gray-700">
          <span className="font-semibold">Telegram</span>
          <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
            <span className="text-sm">✏️</span>
          </button>
        </div>

        {/* 검색 */}
        <div className="p-3">
          <input
            type="text"
            placeholder="검색..."
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 채팅 목록 */}
        <div className="flex-1 overflow-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="p-3 hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-3"
            >
              <div className="text-2xl">{chat.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm truncate">{chat.name}</span>
                  <span className="text-xs text-gray-400">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 truncate">{chat.lastMessage}</span>
                  {chat.unread > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 채팅 헤더 */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="text-2xl">👥</div>
          <div className="flex-1">
            <div className="font-semibold text-sm">팀 채널</div>
            <div className="text-xs text-gray-400">3,245명 • 온라인 142명</div>
          </div>
          <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
            <span className="text-sm">🔍</span>
          </button>
          <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
            <span className="text-sm">☰</span>
          </button>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          <div className="text-center text-xs text-gray-400">오늘</div>

          <div className="flex gap-2">
            <div className="text-2xl">👨‍💻</div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">김개발 • 10:30</div>
              <div className="bg-gray-800 rounded-lg p-3 text-sm max-w-md">
                회의 시간 변경 안내드립니다. 2시에서 3시로延정되었습니다.
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="text-2xl">👩‍💼</div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">이마케팅 • 10:35</div>
              <div className="bg-gray-800 rounded-lg p-3 text-sm max-w-md">
                알겠습니다!会議 mempersiapkan겠습니다.
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="text-2xl">👔</div>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">박기획 • 11:00</div>
              <div className="bg-gray-800 rounded-lg p-3 text-sm max-w-md">
                오늘 발표 자료 완성했습니다! 점검 부탁드려요 📊
              </div>
            </div>
          </div>
        </div>

        {/* 입력창 */}
        <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center px-4 gap-2 flex-shrink-0">
          <input
            type="text"
            placeholder="메시지 입력..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
            <span className="text-sm">📎</span>
          </button>
          <button className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
            <span className="text-sm">➡️</span>
          </button>
        </div>
      </div>
    </div>
  );
}
