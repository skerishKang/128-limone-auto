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
  acceptedTypes = ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png",
  maxSize = 10
}: FileUploadProps) {
  const { isUploading, uploadProgress, error, uploadFile } = useFileUpload();
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
            <div className="space-y-4">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600">업로드 중...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{uploadProgress}% 완료</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-4">📁</div>
              <p className="text-lg font-medium text-gray-700">
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-sm text-gray-500 mt-2">
                지원 형식: {acceptedTypes} | 최대 {maxSize}MB
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

      {/* 에러 메시지 */}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
