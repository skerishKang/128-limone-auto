import React from 'react';

type GmailSendMeta = {
  title?: string;
  message?: string;
  detected?: {
    recipients?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string | null;
    body?: string | null;
  };
};

type GmailSendPromptCardProps = {
  meta: GmailSendMeta;
  onQuickReply?: (content: string) => void;
};

const SAMPLE_SUGGESTIONS: Record<string, string> = {
  recipients: '받는 사람은 example@example.com 이야.',
  subject: '제목은 "프로젝트 보고"로 해줘.',
  body: '내용은 "안녕하세요, 보고드립니다." 로 작성해줘.',
};

const GmailSendPromptCard: React.FC<GmailSendPromptCardProps> = ({ meta, onQuickReply }) => {
  const detected = meta.detected ?? {};
  const recipients = detected.recipients ?? [];
  const cc = detected.cc ?? [];
  const bcc = detected.bcc ?? [];
  const subject = detected.subject ?? '';
  const body = detected.body ?? '';

  const missingFields: string[] = [];
  if (recipients.length === 0) missingFields.push('recipients');
  if (!subject) missingFields.push('subject');
  if (!body) missingFields.push('body');

  const handleQuickReply = (field: string) => {
    if (!onQuickReply) return;
    const suggestion = SAMPLE_SUGGESTIONS[field];
    if (suggestion) {
      onQuickReply(suggestion);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">✉️ {meta.title ?? 'Gmail 메시지 보내기'}</p>
      </div>
      {meta.message && <p className="mt-2 text-sm text-amber-800">{meta.message}</p>}

      <div className="mt-3 space-y-2">
        <div>
          <p className="text-xs font-semibold text-amber-700">감지된 정보</p>
          <ul className="mt-1 space-y-1 text-xs">
            <li>받는 사람: {recipients.length ? recipients.join(', ') : '없음'}</li>
            {cc.length > 0 && <li>참조: {cc.join(', ')}</li>}
            {bcc.length > 0 && <li>숨은 참조: {bcc.join(', ')}</li>}
            <li>제목: {subject || '없음'}</li>
            <li>본문: {body || '없음'}</li>
          </ul>
        </div>

        {missingFields.length > 0 && (
          <div className="rounded-md bg-white/60 p-2">
            <p className="text-xs font-semibold text-red-600">부족한 정보</p>
            <ul className="mt-1 space-y-1 text-xs text-red-700">
              {missingFields.map((field) => (
                <li key={field} className="flex items-center justify-between">
                  <span>- {field}</span>
                  {onQuickReply && SAMPLE_SUGGESTIONS[field] && (
                    <button
                      type="button"
                      onClick={() => handleQuickReply(field)}
                      className="rounded-full bg-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-300"
                    >
                      예시 보내기
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default GmailSendPromptCard;
