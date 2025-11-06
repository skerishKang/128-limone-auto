import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function DriveWidget() {
  const [storageInfo, setStorageInfo] = useState({ used: 0, total: 15, percent: 0 });
  const [fileCount, setFileCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadDriveInfo = async () => {
    try {
      setIsLoading(true);
      
      // 더미 Drive 데이터
      const dummyStorage = {
        used: 2.5,
        total: 15,
        percent: 16.7
      };
      const dummyFileCount = 48;
      
      setStorageInfo({
        used: dummyStorage.used,
        total: dummyStorage.total,
        percent: dummyStorage.percent
      });
      setFileCount(dummyFileCount);
    } catch (err) {
      console.error('Failed to load drive info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDriveInfo();
  }, []);

  const handleRefresh = () => {
    loadDriveInfo();
  };

  return (
    <div
      onClick={handleRefresh}
      className="
        bg-white rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-green-500
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          📁 Drive
        </h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

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
    </div>
  );
}
