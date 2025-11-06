import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
}

export default function NewsWidget() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNews = async () => {
    try {
      setIsLoading(true);
      
      // 더미 뉴스 데이터
      const mockNews: NewsItem[] = [
        {
          id: '1',
          title: '🚀 Limone Auto v1.0 출시!',
          summary: '모듈형 AI 허브가 드디어 공개되었습니다.',
          source: 'Limone Dev',
          publishedAt: new Date().toISOString(),
          url: '#'
        },
        {
          id: '2',
          title: '🤖 Gemini 2.0 API 연동 완료',
          summary: '실제 AI 응답을 지원하는 시스템 구축',
          source: 'AI News',
          publishedAt: new Date(Date.now() - 3600000).toISOString(),
          url: '#'
        }
      ];
      
      setNews(mockNews);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  return (
    <div
      onClick={loadNews}
      className="
        bg-white rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-purple-500
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          📰 뉴스
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      <div className="space-y-3">
        {news.slice(0, 2).map((item) => (
          <div key={item.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
            <h4 className="text-sm font-medium text-gray-800 line-clamp-2">
              {item.title}
            </h4>
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {item.summary}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-purple-600">{item.source}</span>
              <span className="text-xs text-gray-400">
                {new Date(item.publishedAt).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">실제 뉴스 API 연동 필요</p>
        </div>
      </div>
    </div>
  );
}
