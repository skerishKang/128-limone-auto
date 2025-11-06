import { useState, useRef, useEffect } from 'react';
import { Message } from '../../services/api';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import LoadingSpinner from '../shared/LoadingSpinner';

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export default function ChatContainer({ messages, onSendMessage, isLoading = false }: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <h3 className="text-lg font-semibold mb-2">채팅을 시작해보세요!</h3>
          <p className="text-sm">아래 입력창에 메시지를 입력하거나 파일을 업로드하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-gray-200 p-4">
        <ChatInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
}
