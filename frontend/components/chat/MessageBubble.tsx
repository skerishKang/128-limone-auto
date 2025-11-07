import { Message } from '../../services/api';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // 파일 첨부 정보 추출
  const fileMatch = message.content.match(/\[파일 첨부: ([^\]]+)\]/);
  const hasFile = fileMatch !== null;
  const textContent = hasFile ? message.content.replace(/\[파일 첨부: [^\]]+\]/, '').trim() : message.content;
  const fileName = fileMatch ? fileMatch[1] : null;

  // 파일 아이콘 선택
  const getFileIcon = (filename: string) => {
    if (filename.match(/\.(jpg|jpeg|png|gif)$/i)) return '🖼️';
    if (filename.match(/\.(pdf)$/i)) return '📄';
    if (filename.match(/\.(doc|docx)$/i)) return '📝';
    if (filename.match(/\.(mp3|wav|m4a)$/i)) return '🎵';
    if (filename.match(/\.(txt)$/i)) return '📃';
    return '📎';
  };

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
        {hasFile && (
          <div className={`
            mb-2 p-2 rounded-lg flex items-center gap-2
            ${isUser ? 'bg-yellow-300' : 'bg-gray-50'}
          `}>
            <span className="text-lg">{getFileIcon(fileName!)}</span>
            <span className="text-sm font-medium">{fileName}</span>
          </div>
        )}

        <div className="whitespace-pre-wrap break-words">
          {textContent}
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
