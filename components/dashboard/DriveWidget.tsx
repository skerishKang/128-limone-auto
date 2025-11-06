// 📁 components/dashboard/DriveWidget.tsx
// 목표: 120줄 이하

import { useChatContext } from '@/context/ChatContext';

export default function DriveWidget({ count }: { count: number }) {
  const { sendAutoMessage } = useChatContext();

  const handleClick = () => {
    sendAutoMessage("드라이브 확인해줘");
  };

  return (
    <div
      onClick={handleClick}
      className="
        bg-white rounded-lg p-4 cursor-pointer
        hover:shadow-lg transition-shadow
        border-l-4 border-green-500
      "
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">☁️ Google Drive</h3>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-sm text-gray-500">업데이트</p>
        </div>
        <div className="text-4xl">💾</div>
      </div>
    </div>
  );
}
