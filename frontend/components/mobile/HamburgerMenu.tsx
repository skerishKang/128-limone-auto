import { ReactNode } from 'react';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function HamburgerMenu({ isOpen, onClose, children }: HamburgerMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="
          fixed inset-0 bg-black bg-opacity-50 z-40
          transition-opacity
        "
        onClick={onClose}
      />

      {/* 사이드 메뉴 */}
      <div
        className="
          fixed top-0 right-0 h-full w-80
          bg-white shadow-xl z-50
          transform transition-transform
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        "
      >
        {/* 헤더 */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">메뉴</h2>
          <button
            onClick={onClose}
            className="
              p-2 rounded-lg
              hover:bg-gray-100
              transition-colors
            "
          >
            ✕
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="h-[calc(100%-64px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
