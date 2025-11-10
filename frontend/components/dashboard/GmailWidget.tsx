import WidgetContainer from './WidgetContainer';
import { useGmailWidgetState } from '../../hooks/useGmailWidgetState';

interface GmailDashboardWidgetProps {
  onSummaryUpdate?: (summary: { unread: number }) => void;
  refreshToken?: number;
  onAskAi?: (content: string) => void;
  onSendToChat?: (content: string) => void;
}

export default function GmailWidget({ onSummaryUpdate, refreshToken, onAskAi, onSendToChat }: GmailDashboardWidgetProps) {
  const {
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
  } = useGmailWidgetState({ onSummaryUpdate, refreshToken, onAskAi, onSendToChat });

  return (
    <WidgetContainer
      title="Gmail"
      icon="📧"
      accentColorClass="border-red-500"
      className="h-full flex flex-col"
      collapsedSummary={<span className="text-xs text-gray-500">읽지 않은 메일 {unreadCount}개</span>}
      headerExtras={(
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
            <span className="text-gray-600 text-sm">🔍</span>
            <input
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="메일 검색"
              className="bg-transparent text-sm focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleToggleUnread}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${showUnreadOnly ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            안 읽음
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
          >
            새로고침
          </button>
        </div>
      )}
    >
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {!isAuthorized ? (
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
        <div className="flex-1 flex overflow-hidden border border-gray-200 rounded-xl bg-white">
          <div className="w-1/2 border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="px-4 py-2 text-xs text-gray-500 border-b bg-white flex items-center justify-between">
              <span>최근 메일 {filteredEmails.length}건</span>
              <a
                href="https://mail.google.com/mail/u/0/#inbox"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:text-blue-600"
              >
                Gmail에서 열기 ↗
              </a>
            </div>
            <div className="flex-1 overflow-auto">
              {isLoading || isCheckingAuth ? (
                <div className="flex justify-center items-center h-full text-sm text-gray-500">
                  불러오는 중...
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="flex justify-center items-center h-full text-sm text-gray-500">
                  조건에 맞는 메일이 없습니다.
                </div>
              ) : (
                filteredEmails.map((email) => {
                  const isActive = selectedEmail?.id === email.id;
                  return (
                    <button
                      key={email.id}
                      type="button"
                      onClick={() => handleSelectEmail(email.id)}
                      className={`w-full text-left border-b border-gray-200 px-4 py-3 transition-colors ${
                        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                              {email.from}
                            </span>
                            {email.unread && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                          </div>
                          <div className={`text-sm font-semibold mb-1 truncate ${email.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                            {email.subject}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {email.preview}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                          {email.time}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="w-1/2 flex flex-col">
            {selectedEmail ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{selectedEmail.from}</p>
                      <h3 className="text-lg font-semibold text-gray-900 mt-1">
                        {selectedEmail.subject}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{selectedEmail.time}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAskAi}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                      >
                        AI에게 질문
                      </button>
                      <button
                        type="button"
                        onClick={handleSendToChat}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        채팅으로 공유
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {selectedEmail.labels?.map((label) => (
                      <span key={label} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                        #{label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-auto px-6 py-4 space-y-3">
                  <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedEmail.bodyText}
                    </p>
                  </div>

                  <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                    <p className="font-semibold mb-1">추천 질문</p>
                    <ul className="space-y-1">
                      <li>• 이 메일의 핵심 내용을 요약해줘</li>
                      <li>• 이 메일에 대한 적절한 답장 초안을 작성해줘</li>
                      <li>• 이 메일에서 해야 할 일을 정리해줘</li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-gray-100 border border-gray-200 p-4 text-sm text-gray-700">
                    <p className="font-semibold mb-1">미리보기</p>
                    <p className="text-xs text-gray-500">실제 Gmail 서식과 다를 수 있습니다.</p>
                    <div className="mt-2 bg-white rounded border border-gray-200 p-3" dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                메일을 선택하면 내용을 표시합니다.
              </div>
            )}
          </div>
        </div>
      )}
    </WidgetContainer>
  );
}
