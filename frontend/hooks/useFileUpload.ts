import { useState, useCallback } from 'react';
import { apiService } from '../services/api';

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);
      setUploadResult(null);

      // TODO: 실제 프로그레스 바 구현 (백엔드 수정 필요)
      // 현재는 더미 진행률
      setUploadProgress(30);
      
      const result = await apiService.uploadFile(file);
      
      setUploadProgress(100);
      setUploadResult(result);
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('File upload error:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const getFiles = useCallback(async () => {
    try {
      setError(null);
      return await apiService.getFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
      console.error('Get files error:', err);
      throw err;
    }
  }, []);

  const deleteFile = useCallback(async (filename: string) => {
    try {
      setError(null);
      await apiService.deleteFile(filename);
      return { success: true };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      console.error('Delete file error:', err);
      throw err;
    }
  }, []);

  return {
    isUploading,
    uploadProgress,
    error,
    uploadResult,
    uploadFile,
    getFiles,
    deleteFile,
  };
}
