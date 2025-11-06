import { Message } from '../../services/api';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-200 text-gray-600 text-sm px-4 py-2 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[70%] rounded-2xl px-4 py-3 shadow-sm
        ${isUser 
          ? 'bg-yellow-400 text-gray-900' 
          : 'bg-white text-gray-800 border border-gray-200'
        }
      `}>
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        <div className={`
          text-xs mt-2 
          ${isUser ? 'text-gray-700' : 'text-gray-500'}
        `}>
          {new Date(message.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
}
