import { useState, KeyboardEvent, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { type FileAnalysisResponse } from '../../services/api';

interface ChatInputProps {
  onSendMessage: (content: string, file?: File) => void;
  placeholder?: string;
  disabled?: boolean;
  onRegisterExternalDrop?: (handler: (file: File) => Promise<void>) => (() => void) | void;
  onFileProcessed?: (result: FileAnalysisResponse) => void;
}

export default function ChatInput({ onSendMessage, placeholder = '메시지를 입력하세요...', disabled = false, onRegisterExternalDrop, onFileProcessed }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUploading, uploadFile, error: uploadError } = useFileUpload();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSend = useCallback(async (withFile?: File) => {
    if ((!message.trim() && !withFile) || disabled) return;

    console.log('[ChatInput] 전송 시도', { hasMessage: Boolean(message.trim()), hasFile: Boolean(withFile) });
    setLocalError(null);

    try {
      if (withFile) {
        // 파일 업로드 후 메시지 전송
        const uploadResult = await uploadFile(withFile);

        const category = uploadResult?.file?.category;
        const originalName = uploadResult?.file?.original_name || uploadResult?.file?.stored_name;
        const driveInfo = uploadResult?.drive_upload;

        const baseMessage = message.trim();
        const defaultNoticeParts: string[] = [];
        defaultNoticeParts.push(`파일 업로드 완료: ${originalName || '첨부 파일'}`);
        if (category) {
          defaultNoticeParts.push(`유형: ${category}`);
        }
        const defaultNotice = defaultNoticeParts.join(' · ');

        let content = baseMessage || defaultNotice;

        if (driveInfo?.success && driveInfo.webViewLink) {
          content += `\nDrive 저장됨: ${driveInfo.webViewLink}`;
        } else if (driveInfo && !driveInfo.success) {
          content += `\nDrive 업로드 실패: ${driveInfo.error || '알 수 없는 오류'}`;
          if (driveInfo.requires_auth) {
            content += ' (다시 인증이 필요합니다)';
          }
        }

        onSendMessage(content, withFile);
        setMessage('');
        if (uploadResult) {
          onFileProcessed?.(uploadResult);
        }
      } else {
        onSendMessage(message.trim());
        setMessage('');
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '파일/메시지 전송 중 오류가 발생했습니다.';
      console.error('Upload failed:', error);
      setLocalError(messageText);
    }
  }, [disabled, message, onSendMessage]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      await handleSend(file);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '파일 전송 중 오류가 발생했습니다.';
      setLocalError(messageText);
    }
  }, [handleSend]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (!onRegisterExternalDrop) return;
    return onRegisterExternalDrop(async (file: File) => {
      await handleFileSelect(file);
    });
  }, [handleFileSelect, onRegisterExternalDrop]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-4
        transition-all
        ${dragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-blue-400'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleChange}
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav"
        className="hidden"
        disabled={isUploading || disabled}
      />

      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isUploading}
            rows={1}
            className={`
              w-full px-4 py-3 pr-12 rounded-lg border border-gray-300
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              resize-none transition-all
              ${disabled || isUploading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            `}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
            <button
              type="button"
              onClick={openFileDialog}
              disabled={disabled || isUploading}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                transition-colors
                ${!disabled && !isUploading
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
              title="파일 첨부"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>
            <button
              onClick={() => handleSend()}
              disabled={(!message.trim() && !isUploading) || disabled}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                transition-colors
                ${(message.trim() || isUploading) && !disabled
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isUploading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      {dragActive && (
        <div className="mt-2 text-center text-blue-600 text-sm font-medium">
          📁 파일을 여기에 놓으세요
        </div>
      )}
      {(localError || uploadError) && (
        <div className="mt-2 text-sm text-red-600">
          {localError || uploadError}
        </div>
      )}
    </div>
  );
}
