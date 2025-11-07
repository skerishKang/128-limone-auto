import { Conversation } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';

interface ChatListSidebarProps {
  conversations: Conversation[];
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export default function ChatListSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  isOpen,
  onClose,
  isLoading = false,
}: ChatListSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b bg-white flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            💬 채팅 목록
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="닫기"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>

        {/* Chat List */}
        <div className="p-4 overflow-y-auto h-full pb-20">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-gray-500 p-4">
              <p className="text-sm">대화가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                  className={`
                    p-3 rounded-lg cursor-pointer
                    transition-colors text-sm
                    border-2
                    ${
                      currentConversationId === conv.id
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-gray-50 hover:bg-gray-100 border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800 truncate flex-1">
                      {conv.title}
                    </h3>
                    <span className="text-xs text-gray-500 ml-2">
                      {conv.message_count || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
