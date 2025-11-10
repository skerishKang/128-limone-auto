import { useState, useRef, useEffect, useMemo } from 'react';
import ChatContainer from '../components/chat/ChatContainer';
import DashboardPanel from '../components/dashboard/DashboardPanel';
import { useConversations } from '../hooks/useChat';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import Popup from '../components/shared/Popup';
import GmailWidget from '../components/widgets/GmailWidget';
import CalendarWidget from '../components/widgets/CalendarWidget';
import TelegramWidget from '../components/widgets/TelegramWidget';
import DriveWidget from '../components/widgets/DriveWidget';

export default function DesktopLayout() {
  const {
    conversations,
    isLoading,
    createConversation,
    updateConversationTitle,
    isCreating,
    deleteConversation,
    isDeleting,
  } = useConversations();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [chatWidth, setChatWidth] = useState<number>(0); // 고정 너비 (0이면 flex 기반)
  const [dashboardColumns, setDashboardColumns] = useState<1 | 2 | 3>(2); // 대시보드 열 수
  const [dashboardFlex, setDashboardFlex] = useState(2); // 대시보드 flex 값
  const [chatFlex, setChatFlex] = useState(1); // 채팅 flex 값
  const [layoutMode, setLayoutMode] = useState<'default' | 'chat-focused' | 'chat-only' | 'dashboard-only'>('default'); // 레이아웃 모드
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false); // 메뉴 열기/닫기
  const [activePopup, setActivePopup] = useState<'gmail' | 'calendar' | 'telegram' | 'drive' | null>(null); // 팝업 상태
  const [autoInitialized, setAutoInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [summaryStats, setSummaryStats] = useState({
    gmailUnread: 0,
    telegramMessages: 0,
    calendarToday: 0,
    driveFiles: 0,
    tasksTotal: 0,
    tasksCompleted: 0,
  });

  const sidebarCounts = useMemo(() => ({
    gmail: summaryStats.gmailUnread,
    calendar: summaryStats.calendarToday,
    telegram: summaryStats.telegramMessages,
    drive: summaryStats.driveFiles,
    todo: summaryStats.tasksTotal,
  }), [summaryStats]);

  const handleNewChat = async () => {
    try {
      const newConv = await createConversation();
      setCurrentConversationId(newConv.id);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleDeleteChat = async (id: number) => {
    try {
      await deleteConversation(id);
      setCurrentConversationId((prev) => {
        if (prev !== id) {
          return prev;
        }
        const remaining = conversations.filter((conv) => conv.id !== id);
        if (remaining.length === 0) {
          return null;
        }
        const currentIndex = conversations.findIndex((conv) => conv.id === id);
        const nextConversation = remaining[currentIndex] ?? remaining[currentIndex - 1] ?? remaining[0];
        return nextConversation?.id ?? null;
      });
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // 마우스 드래그로 너비 조절
  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // 레이아웃 모드 변경
  const changeLayoutMode = (mode: 'default' | 'chat-focused' | 'chat-only' | 'dashboard-only') => {
    setLayoutMode(mode);
    setIsLayoutMenuOpen(false);

    switch (mode) {
      case 'default':
        setDashboardColumns(2);
        setDashboardFlex(2);
        setChatFlex(1);
        setChatWidth(0);
        break;
      case 'chat-focused':
        setDashboardColumns(1);
        setDashboardFlex(1);
        setChatFlex(3);
        setChatWidth(0);
        break;
      case 'chat-only':
        setDashboardColumns(3);
        setDashboardFlex(0);
        setChatFlex(1);
        setChatWidth(0);  // 전체 화면 사용
        break;
      case 'dashboard-only':
        setDashboardColumns(3);
        setDashboardFlex(1);
        setChatFlex(0);
        setChatWidth(0);
        break;
    }
  };

  useEffect(() => {
    changeLayoutMode('default');
  }, []);

  useEffect(() => {
    if (autoInitialized || isLoading || isCreating) {
      return;
    }

    if (conversations.length > 0) {
      setCurrentConversationId(prev => prev ?? conversations[0].id);
      setAutoInitialized(true);
      return;
    }

    setAutoInitialized(true);
    handleNewChat();
  }, [autoInitialized, conversations, isCreating, isLoading]);

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ========================================
          0. 공통 헤더 ( Atas ) - 전체 너비
      ======================================== */}
      <div className="h-12 bg-white border-b border-gray-200 flex-shrink-0 relative" style={{ zIndex: 50 }}>
        {/* Activity Bar width (64px) 만큼 padding을 주고 시작 */}
        <div className="pl-16 pr-4 h-full flex items-center justify-between">
          {/* 좌측: 로고 */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              🍋 Limone Auto
            </h1>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">v2.0</span>
          </div>

          {/* 우측: 사용자 메뉴 + 레이아웃 드롭다운 */}
          <div className="flex items-center gap-3">
            {/* 레이아웃 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                className="
                  text-xs px-4 py-1.5
                  w-28
                  bg-yellow-400 hover:bg-yellow-500
                  text-gray-900 rounded-lg
                  transition-colors
                  flex items-center justify-center gap-2 font-medium
                  truncate
                "
              >
                🔄 {layoutMode === 'default' ? '기본모양' : layoutMode === 'chat-focused' ? '채팅확대' : layoutMode === 'chat-only' ? '채팅창만' : '대시보드'}
              </button>
              {isLayoutMenuOpen && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] w-56">
                  <button
                    onClick={() => changeLayoutMode('default')}
                    className="w-full text-center px-4 py-2 text-xs hover:bg-gray-100 rounded-t-lg"
                  >
                    기본모양
                  </button>
                  <button
                    onClick={() => changeLayoutMode('chat-focused')}
                    className="w-full text-center px-4 py-2 text-xs hover:bg-gray-100"
                  >
                    채팅확대
                  </button>
                  <button
                    onClick={() => changeLayoutMode('chat-only')}
                    className="w-full text-center px-4 py-2 text-xs hover:bg-gray-100"
                  >
                    채팅창만
                  </button>
                  <button
                    onClick={() => changeLayoutMode('dashboard-only')}
                    className="w-full text-center px-4 py-2 text-xs hover:bg-gray-100 rounded-b-lg"
                  >
                    대시보드
                  </button>
                </div>
              )}
            </div>

            {/* 구분선 */}
            <div className="w-px h-6 bg-gray-300"></div>

            {/* 사용자 메뉴 */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="설정">
                ⚙️
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="프로필">
                👤
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="로그아웃">
                🚪
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 레이아웃 (헤더 제외) */}
      <div className="flex-1 flex overflow-hidden">
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
          <div className="relative group">
            <div
              onClick={() => setActivePopup('gmail')}
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="text-xl">📧</span>
            </div>
            {sidebarCounts.gmail > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold">
                {sidebarCounts.gmail}
              </span>
            )}
            {/* 툴팁 - hover시에만 표시 */}
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Gmail
            </div>
          </div>

          {/* Calendar */}
          <div className="relative group">
            <div
              onClick={() => setActivePopup('calendar')}
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="text-xl">📅</span>
            </div>
            {sidebarCounts.calendar > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold">
                {sidebarCounts.calendar}
              </span>
            )}
            {/* 툴팁 - hover시에만 표시 */}
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Calendar
            </div>
          </div>

          {/* Telegram */}
          <div className="relative group">
            <div
              onClick={() => setActivePopup('telegram')}
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="text-xl">💬</span>
            </div>
            {sidebarCounts.telegram > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-400 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold">
                {sidebarCounts.telegram}
              </span>
            )}
            {/* 툴팁 - hover시에만 표시 */}
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Telegram
            </div>
          </div>

          {/* Drive */}
          <div className="relative group">
            <div
              onClick={() => setActivePopup('drive')}
              className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="text-xl">📁</span>
            </div>
            {sidebarCounts.drive > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold">
                {sidebarCounts.drive}
              </span>
            )}
            {/* 툴팁 - hover시에만 표시 */}
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Drive
            </div>
          </div>

          {/* Weather */}
          <div className="relative group">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">🌤️</span>
            </div>
            {/* 툴팁 - hover시에만 표시 */}
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Weather
            </div>
          </div>

          {/* News */}
          <div className="relative group">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">📰</span>
            </div>
            {/* 툴팁 - hover시에만 표시 */}
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              News
            </div>
          </div>

          {/* System */}
          <div className="relative group">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">🖥️</span>
            </div>
            {/* 툴팁 - hover시에만 표시 */}
            <div className="absolute left-12 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              System
            </div>
          </div>

          {/* Todo */}
          <div className="relative group">
            <div className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-yellow-600 flex items-center justify-center cursor-pointer transition-colors">
              <span className="text-xl">✅</span>
            </div>
            {sidebarCounts.todo > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold">
                {sidebarCounts.todo}
              </span>
            )}
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
        style={{
          flexGrow: dashboardFlex,
          display: dashboardFlex === 0 ? 'none' : 'flex'
        }}
      >
        {/* 대시보드 위젯들 - 독립 스크롤 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <DashboardPanel columns={dashboardColumns} onStatsChange={setSummaryStats} />
        </div>
      </div>

      {/* ========================================
          Resizer (드래그 바 - 제거됨)
      ======================================== */}
      <div
        className="w-1 bg-gray-100 transition-colors duration-150 flex-shrink-0 z-10"
      />

      {/* ========================================
          3. 우측: 채팅창 (고정 너비 - 모바일 해상도 375px)
      ======================================== */}
      <main
        className="flex flex-col bg-white shadow-sm"
        style={{
          flexGrow: chatWidth === 0 ? chatFlex : 0,
          display: chatFlex === 0 && chatWidth === 0 ? 'none' : 'flex',
          width: chatWidth > 0 ? `${chatWidth}px` : '480px',
          minWidth: chatWidth > 0 ? `${chatWidth}px` : '420px',
          maxWidth: chatWidth > 0 ? `${chatWidth}px` : '560px',
          flexShrink: 0
        }}
      >
        <div className="flex-1 overflow-hidden">
          {currentConversationId ? (
            <ChatContainer
              conversationId={currentConversationId}
              conversations={conversations}
              onSelectConversation={setCurrentConversationId}
              onUpdateTitle={updateConversationTitle}
              onCreateNewConversation={handleNewChat}
              onDeleteConversation={handleDeleteChat}
              isLoading={isLoading}
              isCreating={isCreating}
              isDeleting={isDeleting}
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

      {/* ========================================
          팝업창들
      ======================================== */}
      {/* Gmail 팝업 */}
      <Popup
        isOpen={activePopup === 'gmail'}
        onClose={() => setActivePopup(null)}
        title="Gmail"
        width="900px"
        height="700px"
      >
        <GmailWidget />
      </Popup>

      {/* Calendar 팝업 */}
      <Popup
        isOpen={activePopup === 'calendar'}
        onClose={() => setActivePopup(null)}
        title="캘린더"
        width="900px"
        height="700px"
      >
        <CalendarWidget />
      </Popup>

      {/* Telegram 팝업 */}
      <Popup
        isOpen={activePopup === 'telegram'}
        onClose={() => setActivePopup(null)}
        title="Telegram"
        width="1000px"
        height="700px"
      >
        <TelegramWidget />
      </Popup>

      {/* Drive 팝업 */}
      <Popup
        isOpen={activePopup === 'drive'}
        onClose={() => setActivePopup(null)}
        title="Google Drive"
        width="1000px"
        height="700px"
      >
        <DriveWidget />
      </Popup>
    </div>
  );
}
