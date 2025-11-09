import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Message,
  Conversation,
  ConversationMemory,
  DailySummary,
  apiService,
} from '../../services/api';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import LoadingSpinner from '../shared/LoadingSpinner';
import EditableTitle from '../shared/EditableTitle';
import ChatListSidebar from './ChatListSidebar';

interface ChatContainerProps {
  conversationId: number;
  conversations: Conversation[];
  onSelectConversation: (id: number) => void;
  onUpdateTitle: (id: number, newTitle: string) => void;
  isLoading?: boolean;
}

export default function ChatContainer({
  conversationId,
  conversations,
  onSelectConversation,
  onUpdateTitle,
  isLoading = false,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [memories, setMemories] = useState<ConversationMemory[]>([]);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(false);
  const [latestSummary, setLatestSummary] = useState<DailySummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isGlobalDropActive, setIsGlobalDropActive] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const externalDropHandlerRef = useRef<((file: File) => Promise<void> | void) | null>(null);
  const dragCounterRef = useRef(0);
  const [isDailySummaryCollapsed, setIsDailySummaryCollapsed] = useState(true);
  const [isMemoriesCollapsed, setIsMemoriesCollapsed] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuickReply = async (content: string) => {
    await handleSendMessage(content);
  };

  const handleRegisterExternalDrop = useCallback((handler: (file: File) => Promise<void>) => {
    externalDropHandlerRef.current = handler;
    return () => {
      if (externalDropHandlerRef.current === handler) {
        externalDropHandlerRef.current = null;
      }
    };
  }, []);

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId],
  );

  const fetchMessages = async () => {
    if (!conversationId) return;

    setIsMessagesLoading(true);
    setError(null);
    try {
      const response = await apiService.getConversationMessages(conversationId);
      const normalized = response.map((msg) => ({
        id: msg.id,
        conversationId,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at,
        timestamp: new Date(msg.created_at).getTime(),
        metadata: typeof msg.metadata === 'string' ? safeJsonParse(msg.metadata) : msg.metadata,
      }));
      setMessages(normalized);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('메시지를 불러오는데 실패했습니다.');
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const fetchMemories = async () => {
    if (!conversationId) return;

    setIsMemoriesLoading(true);
    try {
      const data = await apiService.getConversationMemories(conversationId, 5);
      setMemories(data);
    } catch (err) {
      console.error('Failed to fetch conversation memories:', err);
    } finally {
      setIsMemoriesLoading(false);
    }
  };

  const fetchLatestSummary = async () => {
    const userId = currentConversation?.user_id;
    if (!userId) {
      setLatestSummary(null);
      return;
    }

    setIsSummaryLoading(true);
    try {
      const data = await apiService.getLatestDailySummary(userId);
      setLatestSummary(data);
    } catch (err) {
      console.error('Failed to fetch latest daily summary:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchMemories();
    fetchLatestSummary();
  }, [conversationId]);

  useEffect(() => {
    fetchLatestSummary();
  }, [currentConversation?.user_id]);

  useEffect(() => {
    const container = dropZoneRef.current;
    if (!container) return;

    const prevent = (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleDragEnter = (event: DragEvent) => {
      prevent(event);
      dragCounterRef.current += 1;
      if (dragCounterRef.current > 0) {
        setIsGlobalDropActive(true);
      }
    };

    const handleDragOver = (event: DragEvent) => {
      prevent(event);
      if (dragCounterRef.current === 0) {
        dragCounterRef.current = 1;
      }
      setIsGlobalDropActive(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      prevent(event);
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsGlobalDropActive(false);
      }
    };

    const handleDrop = async (event: DragEvent) => {
      prevent(event);
      dragCounterRef.current = 0;
      setIsGlobalDropActive(false);
      const file = event.dataTransfer?.files?.[0];
      if (file && externalDropHandlerRef.current) {
        await externalDropHandlerRef.current(file);
      }
    };

    container.addEventListener('dragenter', handleDragEnter, true);
    container.addEventListener('dragover', handleDragOver, true);
    container.addEventListener('dragleave', handleDragLeave, true);
    container.addEventListener('drop', handleDrop, true);

    return () => {
      container.removeEventListener('dragenter', handleDragEnter, true);
      container.removeEventListener('dragover', handleDragOver, true);
      container.removeEventListener('dragleave', handleDragLeave, true);
      container.removeEventListener('drop', handleDrop, true);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string, file?: File) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      conversationId,
      role: 'user',
      content: file ? `${content} [파일 첨부: ${file.name}]` : content,
      created_at: new Date().toISOString(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      console.log('[Chat] 메시지 전송 시작', { conversationId, content });
      await apiService.sendMessage(conversationId, content);
      console.log('[Chat] 메시지 전송 성공', { conversationId });
      await fetchMessages();
      await fetchMemories();
      await fetchLatestSummary();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('메시지를 전송하는 동안 오류가 발생했습니다.');
    }
  };

  const safeJsonParse = (value?: string | null) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const renderFollowups = (metadata: any) => {
    const parsed = safeJsonParse(metadata);
    const followups = Array.isArray(parsed?.followups) ? parsed.followups : [];
    if (followups.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs font-semibold text-gray-600">추천 액션</p>
        <div className="flex flex-wrap gap-2">
          {followups.map((followup: { label: string; suggestion: string }, idx: number) => (
            <button
              key={`${followup.label}-${idx}`}
              type="button"
              onClick={() => handleQuickReply(followup.suggestion)}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
            >
              {followup.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMemoriesSection = () => {
    if (!memories.length) return null;

    return (
      <div className="px-4 pb-2">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800">최근 대화 요약</h3>
              <span className="text-xs text-gray-400">{memories.length}건</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchMemories}
                className="text-xs text-blue-600 hover:text-blue-700"
                disabled={isMemoriesLoading}
              >
                {isMemoriesLoading ? '새로고침 중...' : '새로고침'}
              </button>
              <button
                onClick={() => setIsMemoriesCollapsed(prev => !prev)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {isMemoriesCollapsed ? '펼치기' : '접기'}
              </button>
            </div>
          </div>
          {!isMemoriesCollapsed && (
            <div className="divide-y divide-gray-100">
              {memories.map((memory) => (
                <div key={memory.id} className="px-4 py-3 text-sm text-gray-700 space-y-1">
                  <p className="font-medium text-gray-900">{memory.title || '요약'}</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{memory.content}</p>
                  <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                    {memory.tags?.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full">#{tag}</span>
                    ))}
                    {memory.importance && (
                      <span className="px-2 py-0.5 bg-amber-100 rounded-full">
                        중요도 {memory.importance}
                      </span>
                    )}
                  </div>
                  {renderFollowups(memory.metadata)}
                  <p className="text-xs text-gray-400">
                    {new Date(memory.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDailySummarySection = () => {
    if (!latestSummary && !isSummaryLoading) return null;

    return (
      <div className="px-4 pb-2">
        <div className="bg-white border border-indigo-200 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-indigo-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-indigo-700">일일 요약</h3>
              {latestSummary && (
                <span className="text-xs text-indigo-400">
                  {new Date(latestSummary.summary_date).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchLatestSummary}
                className="text-xs text-indigo-600 hover:text-indigo-700"
                disabled={isSummaryLoading}
              >
                {isSummaryLoading ? '불러오는 중...' : '새로고침'}
              </button>
              <button
                onClick={() => setIsDailySummaryCollapsed(prev => !prev)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {isDailySummaryCollapsed ? '펼치기' : '접기'}
              </button>
            </div>
          </div>
          {!isDailySummaryCollapsed && (
            <div className="px-4 py-3 text-sm text-gray-700 space-y-2">
              {latestSummary ? (
                <>
                  <p className="whitespace-pre-wrap leading-relaxed">{latestSummary.content}</p>
                  <div className="flex flex-wrap gap-1 text-xs text-indigo-500">
                    {latestSummary.tags?.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-indigo-50 rounded-full">#{tag}</span>
                    ))}
                    {latestSummary.importance && (
                      <span className="px-2 py-0.5 bg-purple-100 rounded-full">
                        중요도 {latestSummary.importance}
                      </span>
                    )}
                  </div>
                  {renderFollowups(latestSummary.metadata)}
                  <p className="text-xs text-gray-400">
                    생성: {new Date(latestSummary.created_at).toLocaleString('ko-KR')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">요약 데이터가 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* 상단 바 */}
        <div className="bg-white border-b p-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {conversationId ? (
              <EditableTitle
                title={conversations.find(c => c.id === conversationId)?.title || '새 대화'}
                onUpdate={(newTitle: string) => onUpdateTitle(conversationId, newTitle)}
                className="text-base"
              />
            ) : (
              <h2 className="text-base font-semibold text-gray-800">새 대화 시작</h2>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* 상단 바 */}
        <div className="bg-white border-b p-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {conversationId ? (
              <EditableTitle
                title={conversations.find(c => c.id === conversationId)?.title || '새 대화'}
                onUpdate={(newTitle) => onUpdateTitle(conversationId, newTitle)}
                className="text-base"
              />
            ) : (
              <h2 className="text-base font-semibold text-gray-800">새 대화 시작</h2>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-red-600">
            <p className="font-medium">{error}</p>
            <button
              onClick={fetchMessages}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={dropZoneRef} className="flex-1 flex flex-col h-full relative">
        {isGlobalDropActive && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-blue-50/80 border-2 border-dashed border-blue-400">
            <div className="text-blue-600 font-semibold text-lg">📁 전체 영역에 파일을 놓아 업로드하세요</div>
            <div className="text-sm text-blue-500 mt-2">이미지 · 문서 · 오디오를 모두 지원합니다.</div>
          </div>
        )}
        {/* 상단 바 - 햄버거 메뉴 포함 */}
        <div className="bg-white border-b p-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {conversationId ? (
              <EditableTitle
                title={conversations.find(c => c.id === conversationId)?.title || '새 대화'}
                onUpdate={(newTitle) => onUpdateTitle(conversationId, newTitle)}
                className="text-base"
              />
            ) : (
              <h2 className="text-base font-semibold text-gray-800">새 대화 시작</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">AI 연결됨</span>
            {/* 햄버거 메뉴 버튼 */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="채팅 목록"
            >
              <span className="text-xl">≡</span>
            </button>
          </div>
        </div>

        {/* 메시지 영역 - 독립 스크롤 */}
        {renderDailySummarySection()}
        {renderMemoriesSection()}
        {(!messages || messages.length === 0) ? (
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="text-center text-gray-500 p-4">
              <h3 className="text-lg font-semibold mb-2">💬 새로운 대화를 시작하세요!</h3>
              <p className="text-sm">아래 입력창에 메시지를 입력하세요.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} onQuickReply={handleQuickReply} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 입력창 - 고정 */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <ChatInput onSendMessage={handleSendMessage} onRegisterExternalDrop={handleRegisterExternalDrop} />
        </div>
      </div>

      {/* 채팅 목록 슬라이딩 패널 */}
      <ChatListSidebar
        conversations={conversations}
        currentConversationId={conversationId}
        onSelectConversation={(id) => {
          onSelectConversation(id);
          setIsSidebarOpen(false);
        }}
        onUpdateTitle={onUpdateTitle}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isLoading={isLoading}
      />
    </>
  );
}
