import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';

export default function GmailWidget() {
  const [emails, setEmails] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: 실제 Gmail API 연동 시 실제 API 호출
      // const emails = await apiService.getGmailEmails();
      
      // 현재는 더미 데이터
      const dummyEmails = [
        {
          id: '1',
          subject: '🎉 Gmail 연동 완료!',
          sender: 'limone@dev.com',
          snippet: 'Gmail 위젯이 성공적으로 연동되었습니다.',
          date: new Date().toISOString(),
          is_read: false
        },
        {
          id: '2',
          subject: '📅 캘린더 업데이트',
          sender: 'calendar@google.com',
          snippet: '새로운 이벤트 알림이 있습니다.',
          date: new Date(Date.now() - 3600000).toISOString(),
          is_read: true
        }
      ];
      
      setEmails(dummyEmails);
      setUnreadCount(dummyEmails.filter(e => !e.is_read).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
    // 5분마다 새로고침
    const interval = setInterval(loadEmails, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    loadEmails();
  };

  return (
    <div
      onClick={handleRefresh}
      className="
        bg-white rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-red-500
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          📧 Gmail
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="space-y-2">
        {emails.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
              <p className="text-sm text-gray-500">읽지 않음</p>
            </div>
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">최근 이메일</p>
              {emails.slice(0, 2).map((email) => (
                <div key={email.id} className="mb-2 last:mb-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {email.subject}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {email.sender}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">연동 필요</p>
        )}
      </div>
    </div>
  );
}
