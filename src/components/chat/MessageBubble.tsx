import { Message } from '@/types/chat';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[70%] rounded-lg p-4
          ${
            isUser
              ? 'bg-yellow-100 text-gray-900'
              : 'bg-gray-100 text-gray-900'
          }
        `}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <span className="text-xs text-gray-500 block mt-1">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
