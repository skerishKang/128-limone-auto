import { useState, useEffect } from 'react';
import { apiService, Conversation } from '../services/api';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createConversation = async (title?: string) => {
    try {
      // Generate default title if not provided
      const defaultTitle = title || `새 대화 ${conversations.length + 1}`;
      const newConv = await apiService.createConversation(defaultTitle);
      setConversations(prev => [newConv, ...prev]);
      return newConv;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  };

  const updateConversationTitle = async (id: number, newTitle: string) => {
    try {
      // TODO: API로 제목 업데이트
      // await apiService.updateConversation(id, { title: newTitle });

      // 로컬 상태 업데이트 (API 연동 전까지)
      setConversations(prev =>
        prev.map(conv =>
          conv.id === id ? { ...conv, title: newTitle } : conv
        )
      );
    } catch (error) {
      console.error('Failed to update conversation title:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return {
    conversations,
    isLoading,
    createConversation,
    updateConversationTitle,
    refreshConversations: fetchConversations,
  };
}

export default useConversations;
