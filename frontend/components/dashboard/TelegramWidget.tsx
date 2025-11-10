import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService, type TelegramUpdate } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

interface TelegramWidgetProps {
  onSummaryUpdate?: (summary: { recentCount: number }) => void;
  refreshToken?: number;
}

export default function TelegramWidget({ onSummaryUpdate, refreshToken }: TelegramWidgetProps) {
  const [messages, setMessages] = useState<TelegramUpdate[]>([]);
  const [statusText, setStatusText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<TelegramUpdate | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const buildDisplayName = useCallback((msg: TelegramUpdate) => {
    const chat = msg.chat ?? {};
    const sender = msg.from ?? {};

    const chatTitle = chat.title;
    const senderName = [sender.first_name, sender.last_name].filter(Boolean).join(' ').trim();
    const username = sender.username || chat.username;

    if (chatTitle) return chatTitle;
    if (senderName) return senderName;
    if (username) return `@${username}`;
    if (chat.id) return `Chat ${chat.id}`;
    return `Update ${msg.update_id}`;
  }, []);

  const selectedDisplay = useMemo(() => {
    if (!selectedMessage) return null;
    const name = buildDisplayName(selectedMessage);
    const username = selectedMessage.from?.username || selectedMessage.chat?.username;
    const chatType = selectedMessage.chat?.type;
    return {
      name,
      username: username ? `@${username}` : null,
      chatType,
    };
  }, [selectedMessage, buildDisplayName]);

  const loadTelegram = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const status = await apiService.getTelegramStatus();
      setIsConnected(status.connected);
      if (!status.connected) {
        setStatusText(status.reason || 'Bot token이 설정되지 않았습니다.');
        setMessages([]);
        onSummaryUpdate?.({ recentCount: 0 });
        return;
      }

      setStatusText('연결됨');
      const data = await apiService.getTelegramMessages(10);
      setMessages(data);
      setSelectedMessage((prev) => {
        if (!prev) return data.length ? data[0] : null;
        const exists = data.find((msg) => msg.update_id === prev.update_id);
        return exists ?? (data.length ? data[0] : null);
      });
      onSummaryUpdate?.({ recentCount: data.length });
    } catch (err) {
      console.error('Failed to load telegram data:', err);
      setError('텔레그램 데이터를 불러오지 못했습니다.');
      setMessages([]);
      onSummaryUpdate?.({ recentCount: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [onSummaryUpdate]);

  useEffect(() => {
    void loadTelegram();
  }, [loadTelegram, refreshToken]);

  const handleReply = async () => {
    if (!selectedMessage?.chat?.id) {
      setError('선택된 메시지의 chat_id를 찾을 수 없습니다.');
      return;
    }
    if (!replyText.trim()) {
      setError('보낼 메시지를 입력해 주세요.');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      await apiService.sendTelegramMessage(String(selectedMessage.chat.id), replyText.trim());
      setReplyText('');
      await loadTelegram();
    } catch (err) {
      console.error('Failed to send telegram message:', err);
      setError('메시지 전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      onClick={() => void loadTelegram()}
      className="
        bg-white rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-blue-400 min-h-[160px]
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          💬 Telegram
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      {error && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-blue-500">{messages.length}</p>
            <p className="text-sm text-gray-500">최근 메시지</p>
          </div>
          <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
            {isConnected ? '● 온라인' : '○ 오프라인'}
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
          <p className="font-medium">상태</p>
          <p className="mt-1">{statusText}</p>
        </div>

        {messages.length > 0 && (
          <div className="pt-2 border-t border-gray-100 grid gap-2 text-xs md:grid-cols-2">
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {messages.map((msg) => {
                const isActive = selectedMessage?.update_id === msg.update_id;
                const name = buildDisplayName(msg);
                const username = msg.from?.username || msg.chat?.username;
                return (
                  <button
                    key={msg.update_id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMessage(msg);
                    }}
                    className={`w-full text-left p-2 rounded border transition-colors ${
                      isActive
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-blue-100 hover:border-blue-300 hover:bg-blue-50/80'
                    }`}
                  >
                    <p className="font-semibold text-gray-800 truncate">{name}</p>
                    {username && (
                      <p className="text-[11px] text-blue-500 truncate">@{username}</p>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap break-words">
                      {msg.text || '(텍스트 없음)'}
                    </p>
                    {msg.date && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        {new Date(msg.date * 1000).toLocaleString('ko-KR')}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 border border-blue-100 rounded p-3 bg-blue-50/40">
              {selectedMessage ? (
                <>
                  <div>
                    <p className="text-[11px] text-gray-500">chat_id: {selectedMessage.chat?.id ?? 'N/A'}</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedDisplay?.name || '이름 없음'}
                    </p>
                    {selectedDisplay?.username && (
                      <p className="text-xs text-blue-500">{selectedDisplay.username}</p>
                    )}
                    {selectedDisplay?.chatType && (
                      <p className="text-[11px] text-gray-500">채팅 유형: {selectedDisplay.chatType}</p>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap break-words text-sm mt-1">
                      {selectedMessage.text || '(텍스트 없음)'}
                    </p>
                  </div>
                  <textarea
                    className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    rows={3}
                    placeholder="답장을 입력하세요..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleReply();
                    }}
                    disabled={isSending}
                    className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
                  >
                    {isSending ? '전송 중...' : '답장 보내기'}
                  </button>
                </>
              ) : (
                <p className="text-xs text-gray-500">답장을 보낼 메시지를 선택하세요.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
