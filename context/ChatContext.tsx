// 📁 context/ChatContext.tsx

import { createContext, useContext, ReactNode } from 'react';

interface ChatContextType {
  sendAutoMessage: (message: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const sendAutoMessage = (message: string) => {
    // TODO: Implement auto message sending
    console.log('Sending auto message:', message);
  };

  return (
    <ChatContext.Provider value={{ sendAutoMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
