import { useState, useRef, useEffect } from 'react';
import ChatContainer from '../components/chat/ChatContainer';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import { useConversations } from '../hooks/useChat';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function DesktopLayout() {
  const { conversations, isLoading, createConversation, updateConversationTitle } = useConversations();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [chatWidth, setChatWidth] = useState(0); // 0이면 flex-1로 자동 조절
  const [dashboardColumns, setDashboardColumns] = useState<1 | 2 | 3>(2); // 대시보드 열 수
  const [dashboardFlex, setDashboardFlex] = useState(1); // 대시보드 flex 값
  const [chatFlex, setChatFlex] = useState(1); // 채팅 flex 값
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

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

  // 마우스 드래그로 너비 조절
  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // 대시보드/채팅 flex 비율 업데이트
  const updateFlexRatios = (width: number) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const availableWidth = containerRect.width - 64 - 1; // Activity Bar + Resizer 제외
    const chatRatio = Math.max(0, Math.min(3, width / availableWidth));
    const dashboardRatio = Math.max(0, Math.min(3, (availableWidth - width) / availableWidth));

    // chatRatio에 따라 열 수 변경
    if (chatRatio < 0.2) {
      setDashboardColumns(3);
      setDashboardFlex(3);
      setChatFlex(0);
    } else if (chatRatio < 0.4) {
      setDashboardColumns(1);
      setDashboardFlex(1);
      setChatFlex(2);
    } else if (chatRatio < 0.6) {
      setDashboardColumns(2);
      setDashboardFlex(1);
      setChatFlex(1);
    } else if (chatRatio < 0.8) {
      setDashboardColumns(2);
      setDashboardFlex(2);
      setChatFlex(1);
    } else {
      setDashboardColumns(3);
      setDashboardFlex(1);
      setChatFlex(3);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newChatWidth = containerRect.width - (e.clientX - containerRect.left);

      // 최소/최대 너비 제한 (300px로 더 작게)
      const minChatWidth = 0; // 0이면 flex-1
      const maxChatWidth = 800;
      const constrainedWidth = Math.min(Math.max(newChatWidth, minChatWidth), maxChatWidth);

      setChatWidth(constrainedWidth);
      updateFlexRatios(constrainedWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="h-screen flex bg-gray-50 overflow-hidden">
      {/* ========================================
          1. 가장 왼쪽: 아이콘만 있는 사이드메뉴 (VSCode Activity Bar)
      ======================================== */}
      <aside className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-3 gap-3 flex-shrink-0">
        {/*Limone 로고 */}
        <div className="text-2xl" title="Limone Auto">🍋</div>

        {/* 구분선 */}
        <div className="w-8 h-px bg-gray-700" />

        {/* 서비스 아이콘들 */}
        <div className="flex flex-col gap-4">
          {/* Gmail */}
          <div className="relative group" title="Gmail (5)">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">📧</span>
            </div>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              5
            </span>
            {/* 툴팁 */}
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Gmail
            </div>
          </div>

          {/* Calendar */}
          <div className="relative group" title="Calendar (3)">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">📅</span>
            </div>
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              3
            </span>
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Calendar
            </div>
          </div>

          {/* Telegram */}
          <div className="relative group" title="Telegram (8)">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">💬</span>
            </div>
            <span className="absolute -top-1 -right-1 bg-blue-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              8
            </span>
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Telegram
            </div>
          </div>

          {/* Drive */}
          <div className="relative group" title="Drive (48)">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">📁</span>
            </div>
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs">
              48
            </span>
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Drive
            </div>
          </div>

          {/* Weather */}
          <div className="relative group" title="Weather">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">🌤️</span>
            </div>
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Weather
            </div>
          </div>

          {/* News */}
          <div className="relative group" title="News">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">📰</span>
            </div>
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              News
            </div>
          </div>

          {/* System */}
          <div className="relative group" title="System">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">🖥️</span>
            </div>
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              System
            </div>
          </div>

          {/* Todo */}
          <div className="relative group" title="Todo (3)">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">✅</span>
            </div>
            <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              3
            </span>
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Todo
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="w-8 h-px bg-gray-700 mt-auto mb-2" />

        {/* 새 채팅 버튼 */}
        <button
          onClick={handleNewChat}
          disabled={isCreating}
          className="
            w-10 h-10
            bg-yellow-500 hover:bg-yellow-400
            disabled:bg-gray-600 disabled:cursor-not-allowed
            rounded-lg
            flex items-center justify-center
            transition-colors
            text-xl
          "
          title="새 채팅"
        >
          {isCreating ? (
            <LoadingSpinner size="sm" />
          ) : (
            '➕'
          )}
        </button>
      </aside>

      {/* ========================================
          2. 중간: 대시보드 (弹性 크기 - flex 값 동적 변경)
      ======================================== */}
      <div
        className="bg-white border-r flex flex-col shadow-sm transition-all duration-200 overflow-hidden min-w-0"
        style={{ flexGrow: dashboardFlex }}
      >
        {/* 헤더 */}
        <div className="p-3 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              📊 대시보드
            </h1>
            <span className="text-xs text-gray-500">v2.0</span>
          </div>
        </div>

        {/* 대시보드 위젯들 - 독립 스크롤 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <DashboardPanel columns={dashboardColumns} />
        </div>
      </div>

      {/* ========================================
          Resizer (드래그 바)
      ======================================== */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 bg-gray-200 hover:bg-yellow-400 cursor-col-resize transition-colors duration-150 flex-shrink-0 z-10"
        title={`드래그로 크기 조절 (대시보드 ${dashboardColumns}열, 대시보드 flex:${dashboardFlex}, 채팅 flex:${chatFlex})`}
      />

      {/* ========================================
          3. 우측: 채팅창 (弹性 크기 - flex 값 동적 변경)
      ======================================== */}
      <main
        className="flex flex-col bg-white shadow-sm flex-1 min-w-0"
        style={{
          width: chatWidth > 0 ? `${chatWidth}px` : undefined,
          flexGrow: chatFlex
        }}
      >
        {/* 상단 바 */}
        <div className="bg-white border-b p-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-800">💬 채팅</h2>
            {currentConversationId && (
              <span className="text-xs text-gray-500">
                ID: {currentConversationId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">AI 연결됨</span>
          </div>
        </div>

        {/* 채팅 컨테이너 - 독립 스크롤 */}
        <div className="flex-1 overflow-hidden">
          {currentConversationId ? (
            <ChatContainer
              conversationId={currentConversationId}
              conversations={conversations}
              onSelectConversation={setCurrentConversationId}
              onUpdateTitle={updateConversationTitle}
              isLoading={isLoading}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center p-4">
                <div className="text-5xl mb-3">🤖</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Limone AI와 채팅을 시작하세요!
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  왼쪽에서 새 채팅을 만들거나,<br />
                  우측 상단 햄버거 메뉴에서 채팅 목록을 확인하세요.
                </p>
                <button
                  onClick={handleNewChat}
                  disabled={isCreating}
                  className="
                    px-4 py-2
                    bg-yellow-400 hover:bg-yellow-500
                    disabled:bg-gray-300
                    text-gray-900 rounded-lg
                    font-medium
                    transition-colors text-sm
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
