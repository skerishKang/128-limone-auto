import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import FileUpload from '../shared/FileUpload';
import WidgetContainer from './WidgetContainer';

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
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({ used: 0, total: 15, percent: 0 });
  const [fileCount, setFileCount] = useState(0);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [lastUploadMessage, setLastUploadMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadDriveInfo = async () => {
    try {
      setIsLoading(true);

      // Drive 인증 상태 확인
      try {
        const authStatus = await apiService.getDriveAuthStatus();
        setIsAuthenticated(authStatus.connected === true);

        if (authStatus.connected === true) {
          // Drive 파일 목록 조회
          const driveFiles = await apiService.getDriveFiles();
          setFiles(driveFiles);

          // Drive 용량 정보 조회
          const quota = await apiService.getDriveQuota();
          if (quota && quota.usage && quota.limit) {
            const usedGB = Number((quota.usage / (1024 * 1024 * 1024)).toFixed(2));
            const totalGB = Number((quota.limit / (1024 * 1024 * 1024)).toFixed(2));
            const percent = totalGB > 0 ? Math.min(100, Number(((usedGB / totalGB) * 100).toFixed(1))) : 0;

            setStorageInfo({
              used: usedGB,
              total: totalGB,
              percent,
            });
            setFileCount(driveFiles.length);
          }
        } else {
          // 인증되지 않은 상태
          setIsAuthenticated(false);
          setFiles([]);
          setStorageInfo({ used: 0, total: 15, percent: 0 });
          setFileCount(0);
        }
      } catch (err: any) {
        if (err.message && err.message.includes('401')) {
          setIsAuthenticated(false);
          setFiles([]);
        } else {
          console.error('Drive 정보 로드 실패:', err);
        }
      }
    } catch (err) {
      console.error('Drive 정보 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDriveInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    loadDriveInfo();
  };

  const handleAuth = async () => {
    try {
      const { url } = await apiService.getDriveAuthUrl();
      // 새 창에서 인증 URL 열기
      window.open(url, '_blank', 'width=600,height=700');
    } catch (err) {
      console.error('인증 URL 가져오기 실패:', err);
      alert('인증 URL을 가져오는데 실패했습니다.');
    }
  };

  const handleUploadComplete = async (result: any) => {
    try {
      setIsUploading(true);
      const driveFile = await apiService.uploadToDrive(result.file);
      setLastUploadMessage(`Drive에 "${result.file.name}" 파일이 업로드되었습니다.`);
      setShowUploader(false);
      // 업로드 후 새로고침
      setTimeout(() => {
        loadDriveInfo();
      }, 1000);
    } catch (err) {
      console.error('Drive 업로드 실패:', err);
      setLastUploadMessage('Drive 업로드에 실패했습니다. 인증이 필요할 수 있습니다.');
    } finally {
      setIsUploading(false);
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
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => setShowUploader((prev) => !prev)}
                className="text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600"
                disabled={isUploading}
              >
                {showUploader ? '업로드 닫기' : '파일 업로드'}
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100"
              >
                새로고침
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAuth}
              className="text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600"
            >
              Drive 연결
            </button>
          )}
        </div>
      )}
      collapsedSummary={(
        <span className="text-xs text-gray-500">
          {isAuthenticated
            ? `저장소 ${storageInfo.used}/${storageInfo.total}GB · 파일 ${fileCount}개`
            : 'Drive 인증 필요'
          }
        </span>
      )}
      className="h-full flex flex-col"
      defaultCollapsed={false}
    >
      {showUploader && isAuthenticated && (
        <div className="mb-4 border border-dashed border-green-300 rounded-xl p-4 bg-green-50/40">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Drive 파일 업로드</h4>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            acceptedTypes=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav"
            maxSize={50}
          />
          {isUploading && (
            <div className="mt-2 text-xs text-green-600 flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Drive에 업로드 중...
            </div>
          )}
        </div>
      )}

      {lastUploadMessage && (
        <div className="mb-3 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg p-2">
          {lastUploadMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      ) : !isAuthenticated ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="text-4xl mb-3">🔐</div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Drive 인증 필요</h3>
          <p className="text-xs text-gray-600 mb-4">
            Google Drive에 연결하여<br />
            파일을 관리하세요
          </p>
          <button
            onClick={handleAuth}
            className="text-xs px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600"
          >
            Google Drive 연결
          </button>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
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

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-600">파일 수</p>
            <p className="text-lg font-bold text-gray-800">{fileCount}</p>
          </div>

          {files.length > 0 && (
            <div className="pt-2 border-t border-gray-100 flex-1 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-2">최근 파일</h4>
              <div className="space-y-1">
                {files.slice(0, 5).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.name)}
                      className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-opacity"
                    >
                      삭제
                    </button>
                  </div>
                ))}
                {files.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-1">
                    +{files.length - 5}개 더
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
}
