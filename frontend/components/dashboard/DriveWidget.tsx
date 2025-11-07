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

export default function DriveWidget() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({ used: 0, total: 15, percent: 0 });
  const [fileCount, setFileCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [lastUploadMessage, setLastUploadMessage] = useState<string | null>(null);

  const loadDriveInfo = async () => {
    try {
      setIsLoading(true);

      const files = await apiService.getFiles();

      if (Array.isArray(files) && files.length > 0) {
        const totalBytes = files.reduce((sum: number, file: any) => sum + (file.size || 0), 0);
        const usedGB = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
        const totalGB = storageInfo.total || 15;
        const percent = totalGB > 0 ? Math.min(100, Number(((usedGB / totalGB) * 100).toFixed(1))) : 0;

        setStorageInfo({
          used: usedGB,
          total: totalGB,
          percent,
        });
        setFileCount(files.length);
      } else {
        setStorageInfo({ used: 0, total: storageInfo.total, percent: 0 });
        setFileCount(0);
      }
    } catch (err) {
      console.error('Drive 정보 로드 실패:', err);
      // 실패 시 기존 값 유지
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

  const handleUploadComplete = (result: any) => {
    setLastUploadMessage(result?.message || '파일 업로드가 완료되었습니다.');
    setShowUploader(false);
    loadDriveInfo();
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
            onClick={() => setShowUploader((prev) => !prev)}
            className="text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600"
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
        </div>
      )}
      collapsedSummary={(
        <span className="text-xs text-gray-500">
          저장소 {storageInfo.used}/{storageInfo.total}GB · 파일 {fileCount}개
        </span>
      )}
      className="h-full flex flex-col"
      defaultCollapsed={false}
    >
      {showUploader && (
        <div className="mb-4 border border-dashed border-green-300 rounded-xl p-4 bg-green-50/40">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">파일 업로드</h4>
          <FileUpload
            onUploadComplete={handleUploadComplete}
            acceptedTypes=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav"
            maxSize={50}
          />
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
      ) : (
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
        </div>
      )}
    </WidgetContainer>
  );
}
