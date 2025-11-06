import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageBubble from '../../components/chat/MessageBubble';
import { Message } from '../../types/chat';

// Mock MessageBubble component
jest.mock('../../types/chat', () => ({
  Message: {
    id: 1,
    conversationId: 1,
    role: 'user',
    content: 'Test message',
    created_at: '2024-11-07T00:00:00Z',
    timestamp: Date.now(),
  },
}));

describe('MessageBubble Component', () => {
  const mockMessage: Message = {
    id: 1,
    conversationId: 1,
    role: 'user',
    content: 'Hello, world!',
    created_at: '2024-11-07T00:00:00Z',
    timestamp: Date.now(),
  };

  it('renders user message correctly', () => {
    render(<MessageBubble message={mockMessage} />);
    
    const messageElement = screen.getByText('Hello, world!');
    expect(messageElement).toBeInTheDocument();
  });

  it('displays timestamp', () => {
    render(<MessageBubble message={mockMessage} />);
    
    const timestamp = screen.getByText(/\d{2}:\d{2}/);
    expect(timestamp).toBeInTheDocument();
  });

  it('applies correct styling for user messages', () => {
    render(<MessageBubble message={mockMessage} />);
    
    const messageBubble = screen.getByText('Hello, world!').closest('div');
    expect(messageBubble).toHaveClass('bg-yellow-400', 'text-gray-900');
  });

  it('applies different styling for assistant messages', () => {
    const assistantMessage = { ...mockMessage, role: 'assistant' as const };
    render(<MessageBubble message={assistantMessage} />);
    
    const messageBubble = screen.getByText('Hello, world!').closest('div');
    expect(messageBubble).toHaveClass('bg-white', 'border-gray-200');
  });

  it('handles system messages differently', () => {
    const systemMessage = { ...mockMessage, role: 'system' as const };
    render(<MessageBubble message={systemMessage} />);
    
    const systemElement = screen.getByText('Hello, world!');
    expect(systemElement).toBeInTheDocument();
    expect(systemElement.closest('div')).toHaveClass('bg-gray-200', 'text-gray-600');
  });

  it('handles long messages with line breaks', () => {
    const longMessage = {
      ...mockMessage,
      content: 'This is a very long message\nthat spans multiple lines\nand should be properly displayed.'
    };
    render(<MessageBubble message={longMessage} />);
    
    const messageElement = screen.getByText(/This is a very long message/);
    expect(messageElement).toBeInTheDocument();
  });
});
