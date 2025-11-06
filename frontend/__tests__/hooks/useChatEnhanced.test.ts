import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useChatEnhanced } from '../../hooks/useChatEnhanced';

// Mock API service
jest.mock('../../services/api', () => ({
  apiService: {
    createConversation: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

describe('useChatEnhanced Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new session', () => {
    const { result } = renderHook(() => useChatEnhanced());
    
    act(() => {
      const sessionId = result.current.createSession('test-user');
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_/);
    });
  });

  it('creates a new conversation', async () => {
    const { result } = renderHook(() => useChatEnhanced());
    
    let sessionId: string;
    act(() => {
      sessionId = result.current.createSession('test-user');
    });

    const mockConversation = { id: 123, title: 'New Chat' };
    const { apiService } = require('../../services/api');
    apiService.createConversation.mockResolvedValue(mockConversation);

    await act(async () => {
      await result.current.createConversation(sessionId!, 'Test Chat');
    });

    expect(apiService.createConversation).toHaveBeenCalledWith('Test Chat');
  });

  it('sends a message', async () => {
    const { result } = renderHook(() => useChatEnhanced());
    
    let sessionId: string;
    act(() => {
      sessionId = result.current.createSession('test-user');
    });

    act(() => {
      result.current.setActiveSession(sessionId!);
    });

    act(() => {
      result.current.createConversation(sessionId!, 'Test Chat');
    });

    const { apiService } = require('../../services/api');
    apiService.sendMessage.mockResolvedValue({ response: 'AI response' });

    await act(async () => {
      await result.current.sendMessage(sessionId!, 123, 'Test message');
    });

    expect(apiService.sendMessage).toHaveBeenCalledWith(123, 'Test message');
  });

  it('sets and clears error state', () => {
    const { result } = renderHook(() => useChatEnhanced());
    
    act(() => {
      result.current.dispatch({ type: 'SET_ERROR', payload: { error: 'Test error' } });
    });

    expect(result.current.state.error).toBe('Test error');

    act(() => {
      result.current.dispatch({ type: 'CLEAR_ERROR' });
    });

    expect(result.current.state.error).toBeNull();
  });

  it('manages loading state', () => {
    const { result } = renderHook(() => useChatEnhanced());
    
    expect(result.current.state.isLoading).toBe(false);

    act(() => {
      result.current.dispatch({ type: 'SET_LOADING', payload: { isLoading: true } });
    });

    expect(result.current.state.isLoading).toBe(true);
  });
});
