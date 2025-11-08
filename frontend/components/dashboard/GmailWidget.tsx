import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';
import WidgetContainer from './WidgetContainer';

interface GmailMessage {
  id: string;
  threadId?: string;
  subject?: string;
  from?: string;
  snippet?: string;
  internalDate?: string;
  date?: string;
  labelIds?: string[];
}

const MAX_RECENT_MESSAGES = 3;

export default function GmailWidget() {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [list, unread] = await Promise.all([
        apiService.getGmailMessages({ maxResults: MAX_RECENT_MESSAGES }),
        apiService.getGmailUnreadCount()
      ]);

      setMessages(Array.isArray(list) ? list : []);
      setUnreadCount(unread?.unread ?? 0);
    } catch (err) {
      console.error('Gmail 목록 로드 실패:', err);
      setError(err instanceof Error ? err.message : 'Gmail 데이터를 불러오지 못했습니다.');
      setMessages([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsCheckingAuth(true);
      setError(null);
      const status = await apiService.getGmailStatus();
      const authorized = Boolean(status?.authorized);
      setIsAuthorized(authorized);
      if (authorized) {
        await loadMessages();
      }
    } catch (err) {
      console.error('Gmail 인증 상태 확인 실패:', err);
      setError(err instanceof Error ? err.message : 'Gmail 인증 정보를 확인하지 못했습니다.');
      setIsAuthorized(false);
    } finally {
      setIsCheckingAuth(false);
      setIsLoading(false);
    }
  }, [loadMessages]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleRefresh = async () => {
    if (isAuthorized) {
      await loadMessages();
    } else {
      await checkAuthStatus();
    }
  };

  const handleConnect = async () => {
    try {
      window.location.href = await apiService.getGmailAuthUrl({ autoRedirect: true });
    } catch (err) {
      console.error('Gmail 인증 URL 생성 실패:', err);
      setError(err instanceof Error ? err.message : 'Gmail 인증을 시작할 수 없습니다.');
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) {
      return '';
    }
    try {
      const date = new Date(Number(iso) || iso);
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleString();
    } catch {
      return '';
    }
  };

  return (
    <WidgetContainer
      title="Gmail"
      icon="📧"
      accentColorClass="border-red-500"
      headerExtras={(
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
            disabled={isCheckingAuth || isLoading}
          >
            {isCheckingAuth ? '확인 중...' : '새로고침'}
          </button>
          {isLoading && <LoadingSpinner size="sm" />}
        </div>
      )}
      collapsedSummary={<span className="text-xs text-gray-500">읽지 않은 메일 {unreadCount}개</span>}
      className="h-full flex flex-col"
    >
      {error && <ErrorMessage message={error} />}

      {!isCheckingAuth && !isAuthorized ? (
        <div className="flex flex-col items-center justify-center gap-4 py-6 text-center border border-dashed border-red-300 rounded-xl bg-red-50/60">
          <p className="text-sm text-gray-700">Gmail에 연결하여 최신 메일을 확인하세요.</p>
          <button
            type="button"
            onClick={handleConnect}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
          >
            Gmail 연동
          </button>
        </div>
      ) : (
        <div className="space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">읽지 않은 메일</p>
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
            </div>
            <button
              type="button"
              onClick={() => window.open('https://mail.google.com', '_blank')}
              className="text-xs text-blue-500 hover:underline"
            >
              Gmail 열기
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="sm" />
            </div>
          ) : messages.length > 0 ? (
            <div className="pt-2 border-t border-gray-100 space-y-2 flex-1 overflow-y-auto">
              <p className="text-xs font-medium text-gray-600">최근 이메일</p>
              {messages.map((message) => (
                <div key={message.id} className="rounded-lg border border-gray-100 p-2">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {message.subject || '(제목 없음)'}
                  </p>
                  {message.from && (
                    <p className="text-xs text-gray-500 truncate">{message.from}</p>
                  )}
                  {message.snippet && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{message.snippet}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">{formatDate(message.internalDate || message.date)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-200 rounded-lg">
              최근 메일이 없습니다.
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
}
