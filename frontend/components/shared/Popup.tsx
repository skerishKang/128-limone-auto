import { ReactNode } from 'react';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  height?: string;
}

export default function Popup({ isOpen, onClose, title, children, width = '800px', height = '600px' }: PopupProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl overflow-hidden animate-in fade-in duration-200"
        style={{ width, height, maxWidth: '95vw', maxHeight: '95vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="h-12 bg-gray-800 text-white flex items-center justify-between px-4 flex-shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-xl font-bold w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
          >
            ×
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-auto" style={{ height: 'calc(100% - 48px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
