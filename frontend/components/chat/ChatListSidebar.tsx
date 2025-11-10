import { Conversation } from '../../services/api';
import LoadingSpinner from '../shared/LoadingSpinner';
import EditableTitle from '../shared/EditableTitle';

interface ChatListSidebarProps {
  conversations: Conversation[];
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onUpdateTitle: (id: number, newTitle: string) => void;
  onCreateNewConversation: () => Promise<void> | void;
  onDeleteConversation?: (id: number) => Promise<void> | void;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  isCreating?: boolean;
  isDeleting?: boolean;
}

export default function ChatListSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onUpdateTitle,
  onCreateNewConversation,
  onDeleteConversation,
  isOpen,
  onClose,
  isLoading = false,
  isCreating = false,
  isDeleting = false,
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (isCreating) return;
                await onCreateNewConversation();
              }}
              disabled={isCreating}
              className="px-3 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 rounded-lg transition-colors"
            >
              새 대화
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="닫기"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
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
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectConversation(conv.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectConversation(conv.id);
                    }
                  }}
                  className={`
                    p-3 rounded-lg
                    transition-colors text-sm
                    border-2 cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-yellow-400
                    ${
                      currentConversationId === conv.id
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-gray-50 hover:bg-gray-100 border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <EditableTitle
                      title={conv.title}
                      onUpdate={(newTitle) => onUpdateTitle(conv.id, newTitle)}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500">
                      {conv.message_count || 0}
                    </span>
                    {onDeleteConversation && (
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded"
                        onClick={async (event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          if (isDeleting) return;
                          if (!window.confirm('이 대화를 삭제하시겠습니까?')) {
                            return;
                          }
                          await onDeleteConversation(conv.id);
                        }}
                        disabled={isDeleting}
                      >
                        삭제
                      </button>
                    )}
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
