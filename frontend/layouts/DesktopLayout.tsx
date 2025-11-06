import { useState } from 'react';
import ChatContainer from '../components/chat/ChatContainer';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import { useConversations } from '../hooks/useChat';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function DesktopLayout() {
  const { conversations, isLoading, createConversation } = useConversations();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    try {
      setIsCreating(true);
      const newConv = await createConversation();
      setCurrentConversationId(newConv.id);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* ========================================
          좌측 사이드바: 대시보드 위젯 (30%)
      ======================================== */}
      <aside className="w-[30%] bg-white border-r flex flex-col shadow-sm">
        {/* 헤더 */}
        <div className="p-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              🍋 Limone Auto
            </h1>
            <span className="text-xs text-gray-500">v2.0</span>
          </div>

          {/* 새 채팅 버튼 */}
          <button
            onClick={handleNewChat}
            disabled={isCreating}
            className="
              w-full px-4 py-3
              bg-yellow-400 hover:bg-yellow-500
              disabled:bg-gray-300 disabled:cursor-not-allowed
              text-gray-900 rounded-lg
              font-medium text-sm
              transition-colors
              flex items-center justify-center gap-2
            "
          >
            {isCreating ? (
              <>
                <LoadingSpinner size="sm" />
                생성 중...
              </>
            ) : (
              <>
                ➕ 새 채팅
              </>
            )}
          </button>
        </div>

        {/* 대화 목록 */}
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">💬 채팅 목록</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-gray-500 p-2">
                <p className="text-sm">대화가 없습니다</p>
                <p className="text-xs mt-1">새 채팅을 시작하세요!</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setCurrentConversationId(conv.id)}
                  className={`
                    p-2 rounded-lg cursor-pointer
                    transition-colors text-sm
                    ${currentConversationId === conv.id
                      ? 'bg-yellow-100 border-2 border-yellow-400'
                      : 'bg-gray-50 hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800 truncate flex-1">
                      {conv.title}
                    </h3>
                    <span className="text-xs text-gray-500 ml-2">
                      {conv.message_count || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conv.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 대시보드 위젯들 - 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto">
          <DashboardPanel />
        </div>
      </aside>

      {/* ========================================
          우측 메인: 채팅창 (70%)
      ======================================== */}
      <main className="flex-1 flex flex-col">
        {/* 상단 바 */}
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">💬 채팅</h2>
            {currentConversationId && (
              <span className="text-sm text-gray-500">
                대화 ID: {currentConversationId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">AI 연결됨</span>
          </div>
        </div>

        {/* 채팅 컨테이너 */}
        <div className="flex-1 flex flex-col">
          {currentConversationId ? (
            <ChatContainer
              conversationId={currentConversationId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Limone AI와 채팅을 시작하세요!
                </h3>
                <p className="text-gray-600 mb-4">
                 左侧 대시보드에서 새 채팅을 만들거나, 기존 대화를 선택하세요.
                </p>
                <button
                  onClick={handleNewChat}
                  disabled={isCreating}
                  className="
                    px-6 py-3
                    bg-yellow-400 hover:bg-yellow-500
                    disabled:bg-gray-300
                    text-gray-900 rounded-lg
                    font-medium
                    transition-colors
                  "
                >
                  ➕ 새 채팅 시작
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
