// Chat Types - Enhanced
export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: any;
  timestamp?: number; // for sorting
}

export interface Conversation {
  id: number;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_archived: boolean;
  tags?: string[];
  metadata?: {
    model?: string;
    total_tokens?: number;
    avg_response_time?: number;
  };
}

export interface Attachment {
  id: string;
  type: 'file' | 'image' | 'link';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  activeConversationId: number | null;
  conversations: Map<number, Conversation>;
  messages: Map<number, Message[]>;
  isTyping: boolean;
  currentModel: string;
  settings: {
    temperature: number;
    maxTokens: number;
    stream: boolean;
  };
}

export interface ChatState {
  sessions: Map<string, ChatSession>;
  currentSessionId: string | null;
  activeConversationId: number | null;
  isLoading: boolean;
  error: string | null;
}

export type ChatAction =
  | { type: 'CREATE_SESSION'; payload: { sessionId: string; userId: string } }
  | { type: 'SET_ACTIVE_SESSION'; payload: { sessionId: string } }
  | { type: 'CREATE_CONVERSATION'; payload: { sessionId: string; title?: string } }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: { sessionId: string; conversationId: number } }
  | { type: 'ADD_MESSAGE'; payload: { sessionId: string; conversationId: number; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { sessionId: string; conversationId: number; messageId: number; updates: Partial<Message> } }
  | { type: 'DELETE_CONVERSATION'; payload: { sessionId: string; conversationId: number } }
  | { type: 'ARCHIVE_CONVERSATION'; payload: { sessionId: string; conversationId: number } }
  | { type: 'SET_TYPING'; payload: { sessionId: string; conversationId: number; isTyping: boolean } }
  | { type: 'UPDATE_SETTINGS'; payload: { sessionId: string; settings: Partial<ChatSession['settings']> } }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_ERROR'; payload: { error: string | null } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_SESSION'; payload: { sessionId: string } };
