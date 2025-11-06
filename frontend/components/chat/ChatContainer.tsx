import { useState, useRef, useEffect } from 'react';
import { Message } from '../../services/api';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import LoadingSpinner from '../shared/LoadingSpinner';

interface ChatContainerProps {
  conversationId: number;
}

export default function ChatContainer({ conversationId }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // TODO: API로 메시지 전송
    // const response = await apiService.sendMessage(conversationId, content);
    // setMessages(prev => [...prev, response]);

    // 더미 응답 (API 연동 전까지)
    const userMessage: Message = {
      id: Date.now(),
      conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    // AI 응답 시뮬레이션
    setTimeout(() => {
      const aiMessage: Message = {
        id: Date.now() + 1,
        conversationId,
        role: 'assistant',
        content: `AI 응답: "${content}"에 대한 답변입니다. Gemini 2.5 Flash 모델을 사용하고 있습니다! 🚀`,
        created_at: new Date().toISOString(),
        timestamp: Date.now() + 1,
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="text-center text-gray-500 p-4">
            <h3 className="text-lg font-semibold mb-2">💬 새로운 대화를 시작하세요!</h3>
            <p className="text-sm">아래 입력창에 메시지를 입력하세요.</p>
          </div>
        </div>
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <ChatInput onSendMessage={handleSendMessage} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* 메시지 영역 - 독립 스크롤 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 - 고정 */}
      <div className="border-t border-gray-200 p-4 flex-shrink-0">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
