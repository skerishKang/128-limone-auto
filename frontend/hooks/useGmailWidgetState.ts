import { useState, useMemo, useEffect, useCallback, ChangeEvent } from 'react';
import { apiService } from '../services/api';

export interface GmailEmail {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  labels?: string[];
  snippet?: string;
  bodyHtml: string;
  bodyText: string;
}

interface UseGmailWidgetStateOptions {
  onSummaryUpdate?: (summary: { unread: number }) => void;
  refreshToken?: number;
  onAskAi?: (content: string) => void;
  onSendToChat?: (content: string) => void;
}

interface UseGmailWidgetStateValue {
  emails: GmailEmail[];
  filteredEmails: GmailEmail[];
  selectedEmail: GmailEmail | null;
  searchTerm: string;
  showUnreadOnly: boolean;
  unreadCount: number;
  isAuthorized: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;
  error: string | null;
  handleSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleToggleUnread: () => void;
  handleSelectEmail: (id: string) => void;
  handleAskAi: () => void;
  handleSendToChat: () => void;
  handleRefresh: () => void;
  handleConnect: () => Promise<void>;
}

const DUMMY_EMAILS: GmailEmail[] = [
  {
    id: '1',
    from: 'Google',
    subject: 'Gmail 보안 알림',
    preview: '새로운 기기에서 Gmail 계정에 로그인했습니다.',
    time: '10분 전',
    unread: true,
    labels: ['중요', '보안'],
    snippet: '새로운 기기에서 로그인한 활동이 있어 알려드립니다.',
    bodyHtml:
      '<p>안녕하세요, Google입니다.</p><p>새로운 기기에서 Gmail 계정에 로그인한 기록이 있습니다. 만약 본인이 맞다면 무시하셔도 됩니다.</p>',
    bodyText:
      '안녕하세요, Google입니다. 새로운 기기에서 Gmail 계정에 로그인한 기록이 있습니다. 본인이 맞다면 무시하셔도 됩니다.',
  },
  {
    id: '2',
    from: 'notifications@github.com',
    subject: '새 커밋이 푸시되었습니다',
    preview: '128-limone-auto 저장소에 새로운 커밋이 푸시되었습니다.',
    time: '1시간 전',
    unread: true,
    labels: ['개발', 'GitHub'],
    snippet: 'bf111a8 커밋이 main 브랜치에 업데이트되었습니다.',
    bodyHtml:
      '<p>새 커밋이 128-limone-auto 저장소에 푸시되었습니다.</p><ul><li>커밋: bf111a8</li><li>작성자: Limone</li></ul>',
    bodyText: '새 커밋이 128-limone-auto 저장소에 푸시되었습니다. 커밋: bf111a8, 작성자: Limone',
  },
  {
    id: '3',
    from: 'slack@limone.com',
    subject: '#general 채널 새로운 메시지',
    preview: '오늘 회의 일정을 확인해주세요.',
    time: '2시간 전',
    unread: false,
    labels: ['업무'],
    snippet: '회의 일정이 공유되었습니다.',
    bodyHtml: '<p>오늘 회의 일정이 공유되었습니다. Slack 채널에서 확인해주세요.</p>',
    bodyText: '오늘 회의 일정이 공유되었습니다. Slack 채널에서 확인해주세요.',
  },
  {
    id: '4',
    from: 'calendário@google.com',
    subject: '회의 알림: 주간 회고',
    preview: '내일 오후 2시에 주간 회고 회의가 있습니다.',
    time: '3시간 전',
    unread: true,
    labels: ['캘린더', '회의'],
    snippet: '내일 오후 2시, 회의실 A에서 주간 회고가 예정되어 있습니다.',
    bodyHtml: '<p>내일 오후 2시, 회의실 A에서 주간 회고가 예정되어 있습니다.</p>',
    bodyText: '내일 오후 2시, 회의실 A에서 주간 회고가 예정되어 있습니다.',
  },
  {
    id: '5',
    from: 'drive@google.com',
    subject: '드라이브 스토리지 용량 알림',
    preview: '드라이브 저장공간이 80% 사용되었습니다.',
    time: '1일 전',
    unread: false,
    labels: ['Drive', '알림'],
    snippet: '현재 저장공간 사용량이 80%에 도달했습니다.',
    bodyHtml:
      '<p>현재 저장공간 사용량이 80%에 도달했습니다.</p><p>불필요한 파일을 삭제하거나 용량 업그레이드를 고려해보세요.</p>',
    bodyText:
      '현재 저장공간 사용량이 80%에 도달했습니다. 불필요한 파일을 삭제하거나 용량 업그레이드를 고려해보세요.',
  },
];

const formatRelativeTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) {
    return date.toLocaleString('ko-KR');
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) {
    return '방금 전';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }

  return date.toLocaleDateString('ko-KR');
};

const mapToEmail = (raw: any): GmailEmail => {
  const id: string = String(raw.id ?? raw.message_id ?? Date.now().toString());
  const subject: string = raw.subject ?? raw.headers?.subject ?? '(제목 없음)';
  const from: string = raw.from ?? raw.headers?.from ?? '알 수 없음';
  const snippet: string = raw.snippet ?? raw.preview ?? '';
  const bodyText: string = raw.body_text ?? raw.bodyText ?? snippet;
  const bodyHtml: string = raw.body_html ?? raw.bodyHtml ?? `<p>${bodyText}</p>`;
  const labels: string[] | undefined = raw.labels ?? raw.labelIds ?? undefined;
  const timestamp = raw.internalDate ?? raw.timestamp ?? raw.date;
  const date = timestamp ? new Date(Number.isFinite(Number(timestamp)) ? Number(timestamp) : timestamp) : new Date();

  return {
    id,
    from,
    subject,
    preview: raw.preview ?? snippet ?? bodyText ?? '',
    time: formatRelativeTime(date),
    unread: Boolean(labels?.includes('UNREAD') ?? raw.unread),
    labels,
    snippet,
    bodyHtml,
    bodyText,
  };
};

export function useGmailWidgetState({
  onSummaryUpdate,
  refreshToken,
  onAskAi,
  onSendToChat,
}: UseGmailWidgetStateOptions = {}): UseGmailWidgetStateValue {
  const [emails, setEmails] = useState<GmailEmail[]>(DUMMY_EMAILS);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(DUMMY_EMAILS[0]?.id ?? null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => DUMMY_EMAILS.filter((email) => email.unread).length);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const applySummary = useCallback(
    (items: GmailEmail[], unread?: number) => {
      const unreadValue = typeof unread === 'number' ? unread : items.filter((item) => item.unread).length;
      setUnreadCount(unreadValue);
      onSummaryUpdate?.({ unread: unreadValue });
    },
    [onSummaryUpdate],
  );

  const useDummyFallback = useCallback(() => {
    setEmails(DUMMY_EMAILS);
    setSelectedEmailId(DUMMY_EMAILS[0]?.id ?? null);
    applySummary(DUMMY_EMAILS);
  }, [applySummary]);

  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [list, unreadInfo] = await Promise.all([
        apiService.getGmailMessages({ maxResults: 10 }).catch(() => []),
        apiService.getGmailUnreadCount().catch(() => ({ unread: undefined as number | undefined })),
      ]);

      const mapped = Array.isArray(list) && list.length > 0 ? list.map(mapToEmail) : DUMMY_EMAILS;
      setEmails(mapped);

      setSelectedEmailId((prev) => {
        if (prev && mapped.some((item) => item.id === prev)) {
          return prev;
        }
        return mapped[0]?.id ?? null;
      });

      applySummary(mapped, unreadInfo?.unread);
    } catch (err) {
      console.error('Failed to fetch Gmail messages:', err);
      setError(err instanceof Error ? err.message : '메일 정보를 불러오지 못했습니다.');
      useDummyFallback();
    } finally {
      setIsLoading(false);
    }
  }, [applySummary, useDummyFallback]);

  const checkAuthStatus = useCallback(async () => {
    setIsCheckingAuth(true);
    setError(null);

    try {
      const status = await apiService.getGmailStatus();
      const authorized = Boolean(status?.authorized);
      setIsAuthorized(authorized);

      if (authorized) {
        await fetchEmails();
      } else {
        useDummyFallback();
      }
    } catch (err) {
      console.error('Failed to check Gmail authorization status:', err);
      setError(err instanceof Error ? err.message : 'Gmail 인증 정보를 확인하지 못했습니다.');
      setIsAuthorized(false);
      useDummyFallback();
    } finally {
      setIsCheckingAuth(false);
    }
  }, [fetchEmails, useDummyFallback]);

  useEffect(() => {
    void checkAuthStatus();
  }, [checkAuthStatus, refreshToken]);

  const filteredEmails = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return emails.filter((email) => {
      if (showUnreadOnly && !email.unread) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        email.subject.toLowerCase().includes(term)
        || email.from.toLowerCase().includes(term)
        || email.preview.toLowerCase().includes(term)
        || email.bodyText.toLowerCase().includes(term)
      );
    });
  }, [emails, searchTerm, showUnreadOnly]);

  const selectedEmail = useMemo(() => {
    if (!selectedEmailId) {
      return null;
    }
    return emails.find((email) => email.id === selectedEmailId) ?? null;
  }, [emails, selectedEmailId]);

  useEffect(() => {
    if (filteredEmails.length === 0) {
      setSelectedEmailId(null);
      return;
    }

    if (!selectedEmailId || !filteredEmails.some((email) => email.id === selectedEmailId)) {
      setSelectedEmailId(filteredEmails[0].id);
    }
  }, [filteredEmails, selectedEmailId]);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleToggleUnread = useCallback(() => {
    setShowUnreadOnly((prev) => !prev);
  }, []);

  const handleSelectEmail = useCallback((id: string) => {
    setSelectedEmailId(id);
  }, []);

  const handleAskAi = useCallback(() => {
    if (!onAskAi || !selectedEmail) return;
    const prompt = `이메일 요약해줘\n제목: ${selectedEmail.subject}\n발신자: ${selectedEmail.from}\n내용: ${selectedEmail.bodyText}`;
    onAskAi(prompt);
  }, [onAskAi, selectedEmail]);

  const handleSendToChat = useCallback(() => {
    if (!onSendToChat || !selectedEmail) return;
    const message = `📧 메일 공유\n- 발신자: ${selectedEmail.from}\n- 제목: ${selectedEmail.subject}\n- 본문:\n${selectedEmail.bodyText}`;
    onSendToChat(message);
  }, [onSendToChat, selectedEmail]);

  const handleRefresh = useCallback(() => {
    if (isAuthorized) {
      void fetchEmails();
    } else {
      void checkAuthStatus();
    }
  }, [checkAuthStatus, fetchEmails, isAuthorized]);

  const handleConnect = useCallback(async () => {
    try {
      const url = await apiService.getGmailAuthUrl({ autoRedirect: true });
      window.location.href = url;
    } catch (err) {
      console.error('Failed to start Gmail authorization:', err);
      setError(err instanceof Error ? err.message : 'Gmail 인증을 시작할 수 없습니다.');
    }
  }, []);

  return {
    emails,
    filteredEmails,
    selectedEmail,
    searchTerm,
    showUnreadOnly,
    unreadCount,
    isAuthorized,
    isLoading,
    isCheckingAuth,
    error,
    handleSearchChange,
    handleToggleUnread,
    handleSelectEmail,
    handleAskAi,
    handleSendToChat,
    handleRefresh,
    handleConnect,
  };
}
