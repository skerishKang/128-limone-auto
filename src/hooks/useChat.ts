import { useState, useCallback } from 'react';
import { Message, ChatState } from '../types/chat';
import { createMessage, simulateApiResponse } from '../utils/chatUtils';

export const useChat = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage = createMessage('user', content);

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
    }));

    try {
      const response = await simulateApiResponse(content);
      const assistantMessage = createMessage('assistant', response);

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      setChatState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  return {
    messages: chatState.messages,
    isLoading: chatState.isLoading,
    sendMessage,
  };
};
