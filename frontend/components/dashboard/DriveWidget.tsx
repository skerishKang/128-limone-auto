import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import WidgetContainer from './WidgetContainer';
import ErrorMessage from '../shared/ErrorMessage';

interface StorageInfo {
  used: number;
  total: number;
  percent: number;
}

interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export default function DriveWidget() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({ used: 0, total: 0, percent: 0 });
  const [fileCount, setFileCount] = useState(0);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadMessage, setLastUploadMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDriveInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [filesResponse, quota] = await Promise.all([
        apiService.getDriveFiles(),
        apiService.getDriveQuota()
      ]);

      const files = Array.isArray(filesResponse) ? filesResponse : [];
      setDriveFiles(files);

      if (files.length > 0) {
        const totalBytes = files.reduce((sum: number, file: any) => sum + (Number(file.size) || 0), 0);
        const usedGB = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
        const totalGB = quota.limit > 0 ? Number((quota.limit / (1024 * 1024 * 1024)).toFixed(2)) : storageInfo.total || 15;
        const percent = totalGB > 0 ? Math.min(100, Number(((usedGB / totalGB) * 100).toFixed(1))) : 0;

        setStorageInfo({
          used: usedGB,
          total: totalGB,
          percent,
        });
        setFileCount(files.length);
      } else {
        const totalGB = quota.limit > 0 ? Number((quota.limit / (1024 * 1024 * 1024)).toFixed(2)) : storageInfo.total || 0;
        setStorageInfo({ used: 0, total: totalGB, percent: 0 });
        setFileCount(0);
      }
    } catch (err) {
      console.error('Drive 정보 로드 실패:', err);
      setError(err instanceof Error ? err.message : 'Drive 정보를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [storageInfo.total]);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsCheckingAuth(true);
      setError(null);
      const status = await apiService.getDriveAuthStatus();
      setIsAuthorized(Boolean(status?.authorized));
      if (status?.authorized) {
        await loadDriveInfo();
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Drive 인증 상태 확인 실패:', err);
      setError(err instanceof Error ? err.message : 'Drive 인증 정보를 확인하지 못했습니다.');
      setIsAuthorized(false);
      setIsLoading(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [loadDriveInfo]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const handleRefresh = () => {
    if (isAuthorized) {
      loadDriveInfo();
    } else {
      checkAuthStatus();
    }
  };

  const handleConnect = async () => {
    try {
      window.location.href = await apiService.getDriveAuthUrl({ autoRedirect: true });
    } catch (err) {
      console.error('Drive 인증 URL 생성 실패:', err);
      setError(err instanceof Error ? err.message : 'Drive 인증을 시작할 수 없습니다.');
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      const result = await apiService.uploadToDrive(file);
      setLastUploadMessage(`Drive에 "${result?.name ?? file.name}" 파일이 업로드되었습니다.`);
      await loadDriveInfo();
    } catch (err) {
      console.error('Drive 업로드 실패:', err);
      setError(err instanceof Error ? err.message : 'Drive 업로드 중 문제가 발생했습니다.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`"${fileName}" 파일을 Drive에서 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await apiService.deleteDriveFile(fileId);
      setLastUploadMessage(`"${fileName}" 파일이 삭제되었습니다.`);
      loadDriveInfo();
    } catch (err) {
      console.error('Drive 파일 삭제 실패:', err);
      setLastUploadMessage('파일 삭제에 실패했습니다.');
    }
  };

  return (
    <WidgetContainer
      title="Drive"
      icon="📁"
      accentColorClass="border-green-500"
      headerExtras={(
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
            disabled={isCheckingAuth || isLoading}
          >
            {isCheckingAuth ? '확인 중...' : '새로고침'}
          </button>
          {isAuthorized && (
            <button
              type="button"
              onClick={handleUploadButtonClick}
              className="text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600"
              disabled={isUploading}
            >
              {isUploading ? '업로드 중...' : '파일 업로드'}
            </button>
          )}
        </div>
      )}
      collapsedSummary={(
        <span className="text-xs text-gray-500">
          {isAuthorized
            ? `저장소 ${storageInfo.used}/${storageInfo.total}GB · 파일 ${fileCount}개`
            : 'Drive 인증 필요'}
        </span>
      )}
      className="h-full flex flex-col"
      defaultCollapsed={false}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.bmp,.webp,.mp3,.wav,.m4a,.flac,.ogg,.aac"
        disabled={!isAuthorized}
      />

      {lastUploadMessage && (
        <div className="mb-3 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg p-2">
          {lastUploadMessage}
        </div>
      )}

      {error && (
        <div className="mb-3">
          <ErrorMessage message={error} />
        </div>
      )}

      {!isCheckingAuth && !isAuthorized && (
        <div className="flex flex-col items-center justify-center gap-4 py-6 text-center border border-dashed border-green-300 rounded-xl bg-green-50/60">
          <p className="text-sm text-gray-700">Google Drive에 연결하여 파일을 관리하세요.</p>
          <button
            type="button"
            onClick={handleConnect}
            className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium"
          >
            Google Drive 연동
          </button>
        </div>
      )}

      {isAuthorized && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-600">저장소</p>
              <p className="text-sm font-medium text-gray-800">
                {storageInfo.used}GB / {storageInfo.total}GB
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${storageInfo.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {storageInfo.percent}% 사용됨
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">파일 수</p>
              <p className="text-lg font-bold text-gray-800">{fileCount}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100 flex-1 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-2">최근 파일</h4>
              <div className="space-y-1">
                {driveFiles.length > 0 ? (
                  driveFiles.slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{file.name}</p>
                        {file.createdTime && (
                          <p className="text-xs text-gray-500">
                            {new Date(file.createdTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-green-600 hover:underline"
                          >
                            열기
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">Drive에 업로드된 파일이 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : isCheckingAuth ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      ) : null}
    </WidgetContainer>
  );
}
