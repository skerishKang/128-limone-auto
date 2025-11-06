import { useReducer, useEffect, useCallback } from 'react';
import { ChatState, ChatAction, ChatSession, Message, Conversation } from '../types/chat';
import { apiService } from '../services/api';

// Initial State
const initialState: ChatState = {
  sessions: new Map(),
  currentSessionId: null,
  activeConversationId: null,
  isLoading: false,
  error: null,
};

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'CREATE_SESSION': {
      const { sessionId, userId } = action.payload;
      const newSession: ChatSession = {
        id: sessionId,
        userId,
        activeConversationId: null,
        conversations: new Map(),
        messages: new Map(),
        isTyping: false,
        currentModel: 'gemini-2.5-flash',
        settings: {
          temperature: 0.7,
          maxTokens: 2048,
          stream: true,
        },
      };
      
      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, newSession);
      
      return {
        ...state,
        sessions: newSessions,
        currentSessionId: sessionId,
      };
    }

    case 'SET_ACTIVE_SESSION': {
      return {
        ...state,
        currentSessionId: action.payload.sessionId,
      };
    }

    case 'CREATE_CONVERSATION': {
      const { sessionId, title } = action.payload;
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const conversationId = Date.now();
      const newConversation: Conversation = {
        id: conversationId,
        title: title || 'New Chat',
        user_id: session.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        is_archived: false,
      };

      const updatedConversations = new Map(session.conversations);
      updatedConversations.set(conversationId, newConversation);
      
      const updatedMessages = new Map(session.messages);
      updatedMessages.set(conversationId, []);

      const updatedSession: ChatSession = {
        ...session,
        conversations: updatedConversations,
        messages: updatedMessages,
        activeConversationId: conversationId,
      };

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, updatedSession);

      return {
        ...state,
        sessions: newSessions,
        activeConversationId: conversationId,
      };
    }

    case 'SET_ACTIVE_CONVERSATION': {
      const { sessionId, conversationId } = action.payload;
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const updatedSession: ChatSession = {
        ...session,
        activeConversationId: conversationId,
      };

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, updatedSession);

      return {
        ...state,
        sessions: newSessions,
        activeConversationId: conversationId,
      };
    }

    case 'ADD_MESSAGE': {
      const { sessionId, conversationId, message } = action.payload;
      const session = state.sessions.get(sessionId);
      if (!session) return state;

      const updatedMessages = new Map(session.messages);
      const conversationMessages = updatedMessages.get(conversationId) || [];
      conversationMessages.push(message);
      updatedMessages.set(conversationId, conversationMessages);

      // Update conversation message count
      const updatedConversations = new Map(session.conversations);
      const conversation = updatedConversations.get(conversationId);
      if (conversation) {
        updatedConversations.set(conversationId, {
          ...conversation,
          message_count: conversationMessages.length,
          updated_at: new Date().toISOString(),
        });
      }

      const updatedSession: ChatSession = {
        ...session,
        messages: updatedMessages,
        conversations: updatedConversations,
      };

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, updatedSession);

      return {
        ...state,
        sessions: newSessions,
      };
    }

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload.error,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}

// Enhanced Hook
export function useChatEnhanced() {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Create new session
  const createSession = useCallback((userId: string = 'default') => {
    const sessionId = `session_${Date.now()}`;
    dispatch({ type: 'CREATE_SESSION', payload: { sessionId, userId } });
    return sessionId;
  }, []);

  // Set active session
  const setActiveSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SET_ACTIVE_SESSION', payload: { sessionId } });
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (sessionId: string, title?: string) => {
    dispatch({ type: 'CREATE_CONVERSATION', payload: { sessionId, title } });
    
    // Save to backend
    try {
      const conversation = await apiService.createConversation(title);
      return conversation;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { error: 'Failed to create conversation' } });
      throw error;
    }
  }, []);

  // Set active conversation
  const setActiveConversation = useCallback((sessionId: string, conversationId: number) => {
    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: { sessionId, conversationId } });
  }, []);

  // Send message
  const sendMessage = useCallback(async (
    sessionId: string,
    conversationId: number,
    content: string
  ) => {
    if (!sessionId || !conversationId || !content.trim()) return;

    dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      // Add user message
      const userMessage: Message = {
        id: Date.now(),
        conversationId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: { sessionId, conversationId, message: userMessage } });

      // Send to backend
      const response = await apiService.sendMessage(conversationId, content);
      
      // Add AI response
      const aiMessage: Message = {
        id: Date.now() + 1,
        conversationId,
        role: 'assistant',
        content: response.response || response.message,
        created_at: new Date().toISOString(),
        timestamp: Date.now() + 1,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: { sessionId, conversationId, message: aiMessage } });

      return { userMessage, aiMessage };
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { error: 'Failed to send message' } });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }
  }, []);

  // Get current session
  const getCurrentSession = useCallback(() => {
    if (!state.currentSessionId) return null;
    return state.sessions.get(state.currentSessionId) || null;
  }, [state.currentSessionId, state.sessions]);

  // Get current conversation
  const getCurrentConversation = useCallback(() => {
    const session = getCurrentSession();
    if (!session || !state.activeConversationId) return null;
    return session.conversations.get(state.activeConversationId) || null;
  }, [getCurrentSession, state.activeConversationId]);

  // Get current messages
  const getCurrentMessages = useCallback(() => {
    const session = getCurrentSession();
    if (!session || !state.activeConversationId) return [];
    return session.messages.get(state.activeConversationId) || [];
  }, [getCurrentSession, state.activeConversationId]);

  return {
    // State
    state,
    currentSession: getCurrentSession(),
    currentConversation: getCurrentConversation(),
    currentMessages: getCurrentMessages(),

    // Actions
    createSession,
    setActiveSession,
    createConversation,
    setActiveConversation,
    sendMessage,
    dispatch,
  };
}
