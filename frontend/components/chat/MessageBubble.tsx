import { useEffect, useMemo, useState, FormEvent, ReactNode } from 'react';
import { Message } from '../../services/api';

interface MessageBubbleProps {
  message: Message;
  onQuickReply?: (content: string) => void;
}

export default function MessageBubble({ message, onQuickReply }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  let actionMetadata: any = null;
  if (message.metadata) {
    if (typeof message.metadata === 'string') {
      try {
        actionMetadata = JSON.parse(message.metadata);
      } catch {
        actionMetadata = null;
      }
    } else {
      actionMetadata = message.metadata;
    }
  }

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

  const renderActionCard = (meta: any): ReactNode => {
    if (!meta || typeof meta !== 'object') return null;

    const title = meta.title || '';

    if (meta.type === 'drive_list') {
      const items = Array.isArray(meta.items) ? meta.items : [];
      return (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-semibold">📁 {title || 'Google Drive 파일'}</p>
          {items.length === 0 ? (
            <p className="mt-2">조건에 맞는 파일이 없습니다.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {items.map((item: any, index: number) => (
                <li key={item.id ?? index}>
                  <p className="font-medium">{item.name ?? '이름 없음'}</p>
                  {item.webViewLink && (
                    <a
                      href={item.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      웹에서 보기
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (meta.type === 'gmail_list') {
      const items = Array.isArray(meta.items) ? meta.items : [];
      return (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">📧 {title || '최근 Gmail 메시지'}</p>
          {items.length === 0 ? (
            <p className="mt-2">표시할 메일이 없습니다.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {items.map((item: any, index: number) => (
                <li key={item.id ?? index}>
                  <p className="font-medium">{item.subject ?? '(제목 없음)'}</p>
                  <p className="text-xs">{item.from ?? '발신자 미상'}</p>
                  {item.snippet && (
                    <p className="mt-1 text-xs text-green-700">{item.snippet}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (meta.type === 'calendar_list') {
      const items = Array.isArray(meta.items) ? meta.items : [];
      return (
        <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
          <p className="font-semibold">🗓️ {title || '다가오는 일정'}</p>
          {items.length === 0 ? (
            <p className="mt-2">예정된 일정이 없습니다.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {items.map((item: any, index: number) => (
                <li key={item.id ?? index}>
                  <p className="font-medium">{item.summary ?? '(제목 없음)'}</p>
                  <p className="text-xs text-purple-700">
                    {item.start ?? '시작 시간 미정'} ~ {item.end ?? '종료 시간 미정'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (meta.type === 'auth_required' || meta.type === 'error') {
      return (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {meta.type === 'auth_required' ? '🔐' : '⚠️'} {meta.message ?? '오류가 발생했습니다.'}
        </div>
      );
    }

    if (meta.type === 'gmail_send_prompt') {
      return (
        <GmailSendPromptCard meta={meta} onQuickReply={onQuickReply} />
      );
    }

    if (meta.type === 'calendar_create_prompt') {
      return (
        <CalendarCreatePromptCard meta={meta} onQuickReply={onQuickReply} />
      );
    }

    return null;
  };

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

        {!isUser && renderActionCard(actionMetadata)}

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
