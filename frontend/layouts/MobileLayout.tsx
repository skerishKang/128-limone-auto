import { useState } from 'react';
import ChatContainer from '../components/chat/ChatContainer';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import HamburgerMenu from '../components/mobile/HamburgerMenu';
import { useConversations } from '../hooks/useChat';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function MobileLayout() {
  const { conversations, isLoading, createConversation } = useConversations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleNewChat = async () => {
    try {
      setIsCreating(true);
      const newConv = await createConversation();
      setCurrentConversationId(newConv.id);
      setMenuOpen(false);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectConversation = (convId: number) => {
    setCurrentConversationId(convId);
    setMenuOpen(false);
  };

  return (
    <div className="h-screen relative bg-white">
      {/* 헤더 */}
      <header className="bg-yellow-400 p-4 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          🍋 Limone
        </h1>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="
            p-2 rounded-lg
            hover:bg-yellow-500
            transition-colors
            text-xl
          "
        >
          ☰
        </button>
      </header>

      {/* 메인: 채팅 */}
      <main className="h-[calc(100vh-64px)]">
        <ChatContainer conversationId={currentConversationId || 0} />
      </main>

      {/* 햄버거 메뉴 */}
      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)}>
        {/* 새 채팅 버튼 */}
        <div className="p-4 border-b">
          <button
            onClick={handleNewChat}
            disabled={isCreating}
            className="
              w-full px-4 py-3
              bg-yellow-400 hover:bg-yellow-500
              disabled:bg-gray-300
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
        <div className="p-2">
          <h3 className="text-sm font-semibold text-gray-600 mb-2 px-2">
            대화 목록
          </h3>
          
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
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
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
                    <h4 className="font-medium text-gray-800 truncate text-sm">
                      {conv.title}
                    </h4>
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

        {/* 대시보드 섹션 */}
        <div className="p-4 border-t">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            서비스 위젯
          </h3>
          <DashboardPanel />
        </div>
      </HamburgerMenu>
    </div>
  );
}
