import { useState, useRef, ChangeEvent } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorMessage from '../shared/ErrorMessage';

interface FileUploadProps {
  onUploadComplete?: (result: any) => void;
  acceptedTypes?: string;
  maxSize?: number; // MB
}

export default function FileUpload({ 
  onUploadComplete, 
  acceptedTypes = ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.mp3,.wav,.m4a,.flac,.ogg",
  maxSize = 10
}: FileUploadProps) {
  const { 
    isUploading, 
    uploadProgress, 
    error, 
    uploadResult, 
    uploadStatus, 
    taskId, 
    uploadFile 
  } = useFileUpload();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    try {
      // 크기 체크
      if (file.size > maxSize * 1024 * 1024) {
        alert(`파일 크기가 ${maxSize}MB를 초과합니다`);
        return;
      }

      const result = await uploadFile(file);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

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

  return (
    <div className="w-full">
      {/* 드롭 영역 */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          cursor-pointer transition-all
          ${dragActive
            ? 'border-yellow-400 bg-yellow-50'
            : 'border-gray-300 hover:border-yellow-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleChange}
          accept={acceptedTypes}
          className="hidden"
          disabled={isUploading}
        />

        <div className="text-center">
          {isUploading ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <LoadingSpinner size="md" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {uploadStatus === 'processing' ? 'AI 분석이 진행 중입니다...' : '파일을 업로드하는 중입니다...'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {uploadStatus === 'processing'
                      ? '분석이 완료되면 자동으로 결과가 표시됩니다.'
                      : '파일 업로드가 완료되면 AI 분석이 시작됩니다.'}
                  </p>
                </div>
              </div>

              <div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${uploadStatus === 'processing' ? 'bg-blue-500' : 'bg-yellow-400'}`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>진행률: {uploadProgress}%</span>
                  {taskId && <span>작업 ID: {taskId.slice(0, 8)}...</span>}
                </div>
              </div>

              {uploadResult && uploadStatus === 'completed' && (
                <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                  전사 및 분석이 완료되었습니다.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="text-4xl mb-4">📁</div>
              <p className="text-lg font-medium text-gray-700">
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-sm text-gray-500 mt-2 whitespace-pre-line">
                지원 형식: {acceptedTypes.replaceAll(',', ', ')}
                {"\n"}최대 {maxSize}MB
              </p>
              <button
                type="button"
                className="
                  mt-4 px-6 py-2
                  bg-yellow-400 hover:bg-yellow-500
                  text-gray-900 rounded-lg
                  font-medium
                  transition-colors
                "
              >
                파일 선택
              </button>
            </>
          )}
        </div>
      </div>

      {uploadResult && uploadResult.analysis.transcript && (
        <div className="bg-white border border-yellow-200 rounded-md p-3">
          <h4 className="text-xs font-semibold text-yellow-700 mb-2">📝 전사 결과</h4>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {uploadResult.analysis.transcript}
          </div>
        </div>
      )}

      {uploadResult && uploadResult.drive_upload && (
        <div>
          {/* drive_upload 결과 표시 */}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
