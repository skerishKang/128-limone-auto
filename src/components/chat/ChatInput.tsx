import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지 입력..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
          disabled={isLoading}
        />

        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-yellow-400 rounded-lg hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? '전송 중...' : '전송'}
        </button>

        <button
          className="p-3 hover:bg-gray-100 rounded-lg"
          title="음성 입력"
          disabled={isLoading}
        >
          🎤
        </button>

        <button
          className="p-3 hover:bg-gray-100 rounded-lg"
          title="파일 첨부"
          disabled={isLoading}
        >
          📎
        </button>

        <button
          className="p-3 hover:bg-gray-100 rounded-lg"
          title="알림 설정"
          disabled={isLoading}
        >
          🔔
        </button>
      </div>
    </div>
  );
}
