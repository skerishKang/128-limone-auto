import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService, Conversation } from '../services/api';

const CONVERSATIONS_QUERY_KEY = ['conversations'];

export function useConversations() {
  const queryClient = useQueryClient();

  const {
    data: conversations = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<Conversation[]>({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: () => apiService.getConversations(),
    staleTime: 60_000,
  });

  const createConversationMutation = useMutation({
    mutationFn: (title: string) => apiService.createConversation(title),
    onSuccess: (newConversation) => {
      queryClient.setQueryData<Conversation[]>(CONVERSATIONS_QUERY_KEY, (prev) => {
        if (!prev) {
          return [newConversation];
        }
        return [newConversation, ...prev];
      });
    },
  });

  const createConversation = useCallback(
    async (title?: string) => {
      const fallbackTitle = title?.trim() ? title : `새 대화 ${conversations.length + 1}`;
      const newConversation = await createConversationMutation.mutateAsync(fallbackTitle);
      return newConversation;
    },
    [conversations.length, createConversationMutation],
  );

  const updateConversationTitle = useCallback(
    async (id: number, newTitle: string) => {
      // TODO: API 연동 시 mutation으로 전환 예정
      queryClient.setQueryData<Conversation[]>(CONVERSATIONS_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return prev.map((conv) =>
          conv.id === id
            ? {
                ...conv,
                title: newTitle,
              }
            : conv,
        );
      });
    },
    [queryClient],
  );

  const refreshConversations = useCallback(() => {
    return refetch();
  }, [refetch]);

  return {
    conversations,
    isLoading: isLoading || isFetching,
    error,
    createConversation,
    updateConversationTitle,
    refreshConversations,
    isCreating: createConversationMutation.isPending,
  };
}

export default useConversations;
