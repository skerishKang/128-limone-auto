import { useState, useEffect } from 'react';
import FileUpload from '../components/shared/FileUpload';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';

export default function FilePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getFiles();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (result: any) => {
    setUploadResult(result);
    loadFiles(); // 파일 목록 새로고침
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`'${filename}' 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await apiService.deleteFile(filename);
      setFiles(files.filter(f => f.filename !== filename));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          📁 파일 관리
        </h1>

        {/* 파일 업로드 */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            파일 업로드
          </h2>
          <FileUpload 
            onUploadComplete={handleUploadComplete}
            acceptedTypes=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.csv"
            maxSize={10}
          />
        </div>

        {/* 업로드 결과 */}
        {uploadResult && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              업로드 결과
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{uploadResult.result}</p>
              <div className="mt-2 text-sm text-green-600">
                <p>파일명: {uploadResult.filename}</p>
                <p>크기: {(uploadResult.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && <ErrorMessage message={error} />}

        {/* 파일 목록 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              업로드된 파일
            </h2>
            <button
              onClick={loadFiles}
              disabled={isLoading}
              className="
                px-4 py-2
                text-sm
                bg-gray-100 hover:bg-gray-200
                rounded-lg
                transition-colors
              "
            >
              {isLoading ? <LoadingSpinner size="sm" /> : '새로고침'}
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>업로드된 파일이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {file.filename.includes('.pdf') ? '📄' :
                       file.filename.match(/\.(jpg|jpeg|png|gif)/) ? '🖼️' :
                       file.filename.match(/\.(doc|docx)/) ? '📝' :
                       '📁'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{file.filename}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                        {file.created_at && ` • ${new Date(file.created_at * 1000).toLocaleDateString('ko-KR')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDelete(file.filename)}
                      className="
                        px-3 py-1
                        text-sm
                        bg-red-100 hover:bg-red-200
                        text-red-700 rounded
                        transition-colors
                      "
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
