import { useState, useEffect } from 'react';
import FileUpload from '../components/shared/FileUpload';
import { apiService, type FileAnalysisResponse } from '../services/api';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ErrorMessage from '../components/shared/ErrorMessage';

export default function FilePage() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<FileAnalysisResponse | null>(null);

  const renderStatusBadge = (status?: FileAnalysisResponse['status']) => {
    if (!status) return null;
    const styleMap: Record<string, { label: string; className: string }> = {
      success: { label: '✅ 완료', className: 'bg-green-100 text-green-800' },
      processing: { label: '⏳ 처리 중', className: 'bg-blue-100 text-blue-700' },
      failed: { label: '❌ 실패', className: 'bg-red-100 text-red-700' },
      error: { label: '⚠️ 오류', className: 'bg-red-100 text-red-700' },
    };
    const item = styleMap[status];
    if (!item) return null;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${item.className}`}>
        {item.label}
      </span>
    );
  };

  const renderAnalysisStatusBadge = (status?: FileAnalysisResponse['analysis']['status']) => {
    if (!status) return null;
    const styleMap: Record<string, { label: string; className: string }> = {
      analyzed: { label: 'AI 분석 완료', className: 'bg-green-50 text-green-700 border border-green-200' },
      failed: { label: 'AI 분석 실패', className: 'bg-red-50 text-red-700 border border-red-200' },
      pending: { label: 'AI 분석 대기', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
    };
    const item = styleMap[status];
    if (!item) return null;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${item.className}`}>
        {item.label}
      </span>
    );
  };

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

  const handleUploadComplete = (result: FileAnalysisResponse) => {
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
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold text-gray-800">
                업로드 결과
              </h2>
              {renderStatusBadge(uploadResult.status)}
            </div>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold">{uploadResult.message}</p>
                <div className="mt-2 text-sm text-green-600 space-y-1">
                  <p>원본 파일명: {uploadResult.file.original_name}</p>
                  <p>저장 파일명: {uploadResult.file.stored_name}</p>
                  <p>카테고리: {uploadResult.file.category.toUpperCase()}</p>
                  <p>크기: {(uploadResult.file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-yellow-800">AI 분석 결과</h3>
                  {renderAnalysisStatusBadge(uploadResult.analysis.status)}
                </div>
                {uploadResult.analysis.summary && (
                  <p className="text-sm text-yellow-900 whitespace-pre-wrap">
                    {uploadResult.analysis.summary}
                  </p>
                )}
                {uploadResult.analysis.key_points && uploadResult.analysis.key_points.length > 0 && (
                  <ul className="space-y-1 text-sm text-yellow-800 list-disc list-inside">
                    {uploadResult.analysis.key_points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                )}
                {uploadResult.analysis.error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    오류: {uploadResult.analysis.error}
                  </div>
                )}
                {uploadResult.analysis.transcript && (
                  <div className="bg-white border border-yellow-200 rounded-md p-3">
                    <h4 className="text-xs font-semibold text-yellow-700 mb-2">📝 전사 결과</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                      {uploadResult.analysis.transcript}
                    </div>
                  </div>
                )}
              </div>

              {uploadResult.drive_upload && (
                <div className={`rounded-lg p-4 border ${uploadResult.drive_upload.success ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
                  <h3 className="text-sm font-bold mb-2">
                    {uploadResult.drive_upload.success ? 'Google Drive 업로드 완료' : 'Google Drive 업로드 실패'}
                  </h3>
                  {uploadResult.drive_upload.success ? (
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>Drive 파일명: {uploadResult.drive_upload.name}</p>
                      {uploadResult.drive_upload.webViewLink && (
                        <p>
                          <a
                            href={uploadResult.drive_upload.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            웹에서 보기
                          </a>
                        </p>
                      )}
                      {uploadResult.drive_upload.webContentLink && (
                        <p>
                          <a
                            href={uploadResult.drive_upload.webContentLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            다운로드 링크
                          </a>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-red-700 space-y-1">
                      <p>{uploadResult.drive_upload.error || '알 수 없는 오류가 발생했습니다.'}</p>
                      {uploadResult.drive_upload.requires_auth && (
                        <p className="font-medium">다시 연동한 후 업로드를 시도해주세요.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
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
