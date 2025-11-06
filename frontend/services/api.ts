const API_BASE_URL = "http://localhost:8000";

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: string | null;
}

export interface Conversation {
  id: number;
  title: string;
  user_id: string;
  created_at: string;
  message_count?: number;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Chat API
  async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/api/chat/conversations');
  }

  async createConversation(title?: string): Promise<Conversation> {
    return this.request<Conversation>('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Chat' }),
    });
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return this.request<Message[]>(`/api/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: number, content: string): Promise<any> {
    return this.request(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async deleteConversation(conversationId: number): Promise<any> {
    return this.request(`/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Files API
  async uploadFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
    });
  }

  async getFiles(): Promise<any[]> {
    return this.request('/api/files/list');
  }

  async deleteFile(filename: string): Promise<any> {
    return this.request(`/api/files/delete/${filename}`, {
      method: 'DELETE',
    });
  }

  // WebSocket connection
  connectWebSocket(clientId: string, onMessage: (data: any) => void): WebSocket {
    const ws = new WebSocket(`ws://localhost:8000/ws/chat/${clientId}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return ws;
  }
}

export const apiService = new ApiService();
