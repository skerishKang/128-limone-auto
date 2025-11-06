import { useState } from 'react';
import ChatContainer from '../components/chat/ChatContainer';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import { useConversations } from '../hooks/useChat';
import LoadingSpinner from '../components/shared/LoadingSpinner';

type ActivePanel = 'chat' | 'dashboard';

export default function DesktopLayout() {
  const { conversations, isLoading, createConversation } = useConversations();
  const [activePanel, setActivePanel] = useState<ActivePanel>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    try {
      setIsCreating(true);
      const newConv = await createConversation();
      setCurrentConversationId(newConv.id);
      setActivePanel('chat');
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-screen flex">
      {/* 사이드바: 대화 목록 */}
      <aside className="w-80 bg-white border-r flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              🍋 Limone
            </h1>
            <span className="text-xs text-gray-500">v1.0</span>
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
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>대화가 없습니다</p>
              <p className="text-sm mt-2">새 채팅을 시작하세요!</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setCurrentConversationId(conv.id);
                    setActivePanel('chat');
                  }}
                  className={`
                    p-3 rounded-lg cursor-pointer
                    transition-colors
                    ${currentConversationId === conv.id
                      ? 'bg-yellow-100 border-2 border-yellow-400'
                      : 'bg-gray-50 hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800 truncate">
                      {conv.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {conv.message_count || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conv.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col">
        {/* 탭 네비게이션 */}
        <div className="bg-white border-b">
          <div className="flex">
            <button
              onClick={() => setActivePanel('chat')}
              className={`
                px-6 py-4 font-medium text-sm
                border-b-2 transition-colors
                ${activePanel === 'chat'
                  ? 'border-yellow-400 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              💬 채팅
            </button>
            <button
              onClick={() => setActivePanel('dashboard')}
              className={`
                px-6 py-4 font-medium text-sm
                border-b-2 transition-colors
                ${activePanel === 'dashboard'
                  ? 'border-yellow-400 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              📊 대시보드
            </button>
          </div>
        </div>

        {/* 패널 전환 */}
        {activePanel === 'chat' ? (
          <ChatContainer conversationId={currentConversationId || 0} />
        ) : (
          <DashboardPanel />
        )}
      </main>
    </div>
  );
}
