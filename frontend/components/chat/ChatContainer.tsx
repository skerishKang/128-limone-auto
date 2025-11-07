import { useState, useRef, useEffect } from 'react';
import { Message, Conversation } from '../../services/api';
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    setIsMessagesLoading(true);
    setError(null);
    try {
      // TODO: API에서 메시지 가져오기
      // const response = await apiService.getMessages(conversationId);
      // setMessages(response);

      // 더미 데이터 사용 (API 연동 전까지)
      setMessages([
        {
          id: 1,
          conversationId,
          role: 'assistant',
          content: '안녕하세요! Limone AI입니다. 무엇을 도와드릴까요? 😊',
          created_at: new Date().toISOString(),
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('메시지를 불러오는데 실패했습니다.');
    } finally {
      setIsMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string, file?: File) => {
    // TODO: API로 메시지 전송
    // const response = await apiService.sendMessage(conversationId, content);
    // setMessages(prev => [...prev, response]);

    // 더미 응답 (API 연동 전까지)
    const userMessage: Message = {
      id: Date.now(),
      conversationId,
      role: 'user',
      content: file ? `${content} [파일 첨부: ${file.name}]` : content,
      created_at: new Date().toISOString(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    // AI 응답 시뮬레이션
    setTimeout(() => {
      let aiResponse = '';
      if (file) {
        const fileType = file.type;
        if (fileType.startsWith('image/')) {
          aiResponse = `🖼️ 이미지를 분석했습니다! "${file.name}" 파일에 대해 AI가 분석한 결과입니다. Gemini 2.5 Flash 비전 모델로 이미지를 확인했습니다.`;
        } else if (fileType.startsWith('audio/')) {
          aiResponse = `🎵 오디오 파일을 분석했습니다! "${file.name}" 오디오 내용을 AI가 처리했습니다. Gemini 2.5 Flash 오디오 모델을 사용했습니다.`;
        } else {
          aiResponse = `📄 "${file.name}" 파일을 분석했습니다! AI가 문서 내용을 검토하고 요약했습니다.`;
        }
      } else {
        aiResponse = `AI 응답: "${content}"에 대한 답변입니다. Gemini 2.5 Flash 모델을 사용하고 있습니다! 🚀`;
      }

      const aiMessage: Message = {
        id: Date.now() + 1,
        conversationId,
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
        timestamp: Date.now() + 1,
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
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
                onUpdate={(newTitle) => onUpdateTitle(conversationId, newTitle)}
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
      <div className="flex-1 flex flex-col h-full">
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
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 입력창 - 고정 */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <ChatInput onSendMessage={handleSendMessage} />
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
