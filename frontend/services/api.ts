// Use environment variable for API URL, with fallback to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Log the API URL being used
console.log(`[API] API_BASE_URL = ${API_BASE_URL}`);
console.log(`[API] Environment variable NEXT_PUBLIC_API_URL = ${process.env.NEXT_PUBLIC_API_URL || 'NOT SET'}`);
console.log(`[API] Window location = ${typeof window !== 'undefined' ? window.location.href : 'server-side'}`);


// Helper function to get WebSocket URL based on environment
export const getWebSocketUrl = (clientId: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = process.env.NEXT_PUBLIC_API_URL?.replace(/^http(s?):\/\//, '') || 'localhost:8000';
  return `${protocol}//${host}/ws/chat/${clientId}`;
};

export interface Message {
  id: number;
  conversationId?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  timestamp?: number;
  metadata?: string | null;
}

export interface Conversation {
  id: number;
  title: string;
  user_id?: string;
  created_at: string;
  updated_at?: string;
  message_count?: number;
  is_archived?: boolean;
}

export interface CalendarEventsResponse {
  items: any[];
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Debug logging to check which URL is being used
    console.log(`[API] Requesting: ${url}`);

    const isFormData = options.body instanceof FormData;

    const defaultHeaders: Record<string, string> = {
      'ngrok-skip-browser-warning': 'true', // ngrok 경고 페이지 스킵
    };

    if (!isFormData) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      const text = await response.text();

      if (contentType && contentType.includes('text/html')) {
        console.error(`[API] Received HTML instead of JSON from ${url}`);
        console.error(`[API] HTML Response: ${text.substring(0, 200)}...`);
        throw new Error(`API returned HTML page instead of JSON. This usually means the API URL is incorrect or the server is not running. URL: ${url}`);
      }

      if (!response.ok) {
        // Try to parse as JSON for error details
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      return JSON.parse(text);
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error);
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

  async getCalendarEvents(maxResults: number = 10): Promise<CalendarEventsResponse> {
    const searchParams = new URLSearchParams({ max_results: String(maxResults) });
    return this.request<CalendarEventsResponse>(`/api/calendar/events?${searchParams.toString()}`);
  }

  // Drive API
  async getDriveAuthStatus(): Promise<any> {
    return this.request('/api/drive/status');
  }

  async getDriveAuthUrl(): Promise<{ url: string }> {
    return this.request('/api/drive/auth/google/drive/start');
  }

  async getDriveFiles(): Promise<any[]> {
    return this.request('/api/drive/files');
  }

  async getDriveQuota(): Promise<any> {
    return this.request('/api/drive/quota');
  }

  async uploadToDrive(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/drive/upload', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async deleteDriveFile(fileId: string): Promise<any> {
    return this.request(`/api/drive/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // WebSocket connection
  connectWebSocket(clientId: string, onMessage: (data: any) => void): WebSocket {
    const wsUrl = getWebSocketUrl(clientId);
    const ws = new WebSocket(wsUrl);

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
