import { useState } from 'react';

interface File {
  id: number;
  name: string;
  type: 'folder' | 'doc' | 'sheet' | 'pdf' | 'img';
  size: string;
  modified: string;
  modifiedBy: string;
  icon: string;
}

export default function DriveWidget() {
  const [files] = useState<File[]>([
    { id: 1, name: '프로젝트 문서', type: 'folder', size: '', modified: '1시간 전', modifiedBy: '나', icon: '📁' },
    { id: 2, name: 'Q4_보고서.docx', type: 'doc', size: '2.3 MB', modified: '2시간 전', modifiedBy: '김개발', icon: '📄' },
    { id: 3, name: '팀_일정표.xlsx', type: 'sheet', size: '1.8 MB', modified: '3시간 전', modifiedBy: '이마케팅', icon: '📊' },
    { id: 4, name: '디자인_시안.pdf', type: 'pdf', size: '5.2 MB', modified: '어제', modifiedBy: '정디자인', icon: '📑' },
    { id: 5, name: '팀_사진.jpg', type: 'img', size: '3.1 MB', modified: '2일 전', modifiedBy: '박기획', icon: '🖼️' },
    { id: 6, name: '회의_록.docx', type: 'doc', size: '892 KB', modified: '3일 전', modifiedBy: '나', icon: '📄' },
  ]);

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'folder':
        return 'bg-blue-100 text-blue-800';
      case 'doc':
        return 'bg-blue-50 text-blue-700';
      case 'sheet':
        return 'bg-green-100 text-green-800';
      case 'pdf':
        return 'bg-red-100 text-red-800';
      case 'img':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Drive 스타일 헤더 */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
        <div className="flex-1 flex items-center gap-3">
          <span className="text-green-500 text-2xl">📁</span>
          <span className="font-semibold text-gray-800">Google Drive</span>
          <div className="text-xs text-gray-500">15 GB / 100 GB 사용 중</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="text-gray-600">🔍</span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <span className="text-gray-600">⚙️</span>
          </button>
        </div>
      </div>

      {/* 상단 액션바 */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-2 flex-shrink-0">
        <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm">
          <span>＋</span>
          <span>새 폴더</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm">
          <span>📎</span>
          <span>파일 업로드</span>
        </button>
        <div className="flex-1"></div>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span>표 형태로 보기</span>
          <span>▼</span>
        </div>
      </div>

      {/* 파일 목록 */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="grid grid-cols-4 gap-2 mb-4 text-xs font-semibold text-gray-500">
            <div>이름</div>
            <div>소유자</div>
            <div>수정일</div>
            <div>크기</div>
          </div>

          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="grid grid-cols-4 gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{file.icon}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getFileTypeColor(file.type)}`}>
                    {file.name}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{file.modifiedBy}</div>
                <div className="text-sm text-gray-600">{file.modified}</div>
                <div className="text-sm text-gray-600">{file.size}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 상태바 */}
      <div className="h-10 bg-white border-t border-gray-200 flex items-center justify-between px-4 flex-shrink-0 text-xs text-gray-500">
        <div>항목 {files.length}개</div>
        <div className="flex items-center gap-2">
          <span>📄 12개</span>
          <span>📁 3개</span>
          <span>📊 2개</span>
        </div>
      </div>
    </div>
  );
}
