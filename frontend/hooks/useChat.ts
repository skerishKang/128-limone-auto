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
      const newConv = await apiService.createConversation(title);
      setConversations(prev => [newConv, ...prev]);
      return newConv;
    } catch (error) {
      console.error('Failed to create conversation:', error);
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
    refreshConversations: fetchConversations,
  };
}

export default useConversations;
