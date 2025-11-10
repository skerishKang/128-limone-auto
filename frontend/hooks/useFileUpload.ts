import { useState, useCallback, useRef, useEffect } from 'react';
import {
  apiService,
  type FileAnalysisResponse,
  type FileProcessingStatusResponse,
  type FileProcessingTaskResponse,
  type FileUploadResponse,
} from '../services/api';

type UploadLifecycleStatus = 'idle' | 'processing' | 'completed' | 'failed';

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<FileAnalysisResponse | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadLifecycleStatus>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const clearPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, [clearPolling]);

  const waitForCompletion = useCallback(async (task: string): Promise<FileAnalysisResponse> => {
    const maxAttempts = 40; // 약 2분 제한
    let attempt = 0;

    const delay = async (ms: number) => {
      await new Promise<void>((resolve) => {
        clearPolling();
        pollTimeoutRef.current = setTimeout(() => {
          pollTimeoutRef.current = null;
          resolve();
        }, ms);
      });
    };

    while (isMountedRef.current && attempt < maxAttempts) {
      attempt += 1;
      await delay(2500);

      let statusResponse: FileProcessingStatusResponse;
      try {
        statusResponse = await apiService.getFileStatus(task);
      } catch (err) {
        const message = err instanceof Error ? err.message : '파일 상태 확인 중 오류가 발생했습니다.';
        if (isMountedRef.current) {
          setError(message);
          setUploadStatus('failed');
        }
        throw err instanceof Error ? err : new Error(message);
      }

      if (!isMountedRef.current) {
        break;
      }

      setUploadStatus(statusResponse.status);

      if (statusResponse.status === 'completed' && statusResponse.result) {
        setUploadProgress(100);
        return statusResponse.result;
      }

      if (statusResponse.status === 'failed') {
        const message = statusResponse.error || '파일 분석에 실패했습니다.';
        setError(message);
        throw new Error(message);
      }

      // 진행률 보간
      const interpolated = Math.min(90, 40 + attempt * 7);
      setUploadProgress(interpolated);
    }

    clearPolling();

    throw new Error('AI 분석이 예상보다 지연되고 있습니다. 잠시 후 다시 확인해 주세요.');
  }, [clearPolling]);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    setUploadResult(null);
    setUploadStatus('processing');
    setTaskId(null);

    try {
      setUploadProgress(15);

      const uploadResponse = await apiService.uploadFile(file);

      if (!isMountedRef.current) {
        throw new Error('업로드가 취소되었습니다.');
      }

      const isProcessingResponse = (response: FileUploadResponse): response is FileProcessingTaskResponse => (
        'task_id' in response
      );

      if (uploadResponse.status === 'completed') {
        const immediateResult = uploadResponse.result;
        if (!immediateResult) {
          throw new Error('업로드 결과를 불러오지 못했습니다.');
        }

        setTaskId(null);
        setUploadProgress(100);
        setUploadResult(immediateResult);
        setUploadStatus('completed');

        return immediateResult;
      }

      if (!isProcessingResponse(uploadResponse)) {
        throw new Error('파일 업로드 응답을 해석할 수 없습니다.');
      }

      setTaskId(uploadResponse.task_id);
      setUploadStatus(uploadResponse.status);
      setUploadProgress(40);

      const result = await waitForCompletion(uploadResponse.task_id);

      if (!isMountedRef.current) {
        throw new Error('업로드가 취소되었습니다.');
      }

      setUploadResult(result);
      setUploadStatus('completed');

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      if (isMountedRef.current) {
        setError(message);
        setUploadStatus('failed');
      }
      throw err instanceof Error ? err : new Error(message);
    } finally {
      if (isMountedRef.current) {
        setIsUploading(false);
        clearPolling();
      }
    }
  }, [clearPolling, waitForCompletion]);

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
    uploadStatus,
    taskId,
    uploadFile,
    getFiles,
    deleteFile,
  };
}
