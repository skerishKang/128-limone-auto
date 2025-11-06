import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function TelegramWidget() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      
      // 더미 텔레그램 데이터
      const dummyUnreadCount = 8;
      setUnreadCount(dummyUnreadCount);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleRefresh = () => {
    loadMessages();
  };

  return (
    <div
      onClick={handleRefresh}
      className="
        bg-white rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-blue-400
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          💬 Telegram
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-blue-500">{unreadCount}</p>
          <p className="text-sm text-gray-500">읽지 않음</p>
        </div>
        
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600">상태</p>
          <p className="text-sm text-green-600">● 온라인</p>
          <p className="text-xs text-gray-500 mt-1">실제 Bot API 연동 필요</p>
        </div>
      </div>
    </div>
  );
}
