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

export interface AttachmentMetadata {
  type: 'file' | 'image' | 'link';
  name: string;
  url?: string;
  size?: number;
  mimeType?: string;
}

export interface Message {
  id: number;
  conversationId?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  timestamp?: number;
  metadata?: string | AttachmentMetadata[] | null;
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

export interface FileAnalysisResponse {
  success: boolean;
  message: string;
  file: {
    stored_name: string;
    original_name: string;
    mime_type?: string;
    size: number;
    category: string;
    path: string;
  };
  analysis: {
    summary?: string;
    content_type?: string;
    key_points: string[];
    metadata?: Record<string, any>;
    raw: Record<string, any>;
  };
  summary_path?: string | null;
  drive_upload?: {
    success: boolean;
    file_id?: string;
    name?: string;
    webViewLink?: string;
    webContentLink?: string;
    requires_auth?: boolean;
    error?: string;
  } | null;
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
  async uploadFile(file: File): Promise<FileAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<FileAnalysisResponse>('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  async confirmFileSummary(options: { filePath: string; decision: 'save' | 'discard'; fileName?: string; mimeType?: string }): Promise<any> {
    return this.request('/api/files/summary/confirm', {
      method: 'POST',
      body: JSON.stringify(options),
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
  async getDriveAuthStatus(): Promise<{ authorized: boolean }> {
    return this.request('/api/drive/status');
  }

  async getDriveAuthUrl(options?: { autoRedirect?: boolean }): Promise<string> {
    if (options?.autoRedirect) {
      return `${this.baseUrl}/api/drive/auth/google/drive/start?auto_redirect=true`;
    }
    const data = await this.request<{ authorization_url: string }>(
      '/api/drive/auth/google/drive/start'
    );
    return data.authorization_url;
  }

  async getDriveFiles(): Promise<any[]> {
    const data = await this.request<{ files: any[] }>('/api/drive/files');
    return data.files ?? [];
  }

  async getDriveQuota(): Promise<{ limit: number; usage: number; usageInDrive: number; usageInDriveTrash: number }> {
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

  // Gmail API
  async getGmailStatus(): Promise<{ authorized: boolean; scopes: string[] }> {
    return this.request('/api/gmail/');
  }

  async getGmailAuthUrl(options?: { autoRedirect?: boolean }): Promise<string> {
    if (options?.autoRedirect) {
      return `${this.baseUrl}/api/gmail/auth/google/gmail/start?auto_redirect=true`;
    }
    const data = await this.request<{ authorization_url: string }>(
      '/api/gmail/auth/google/gmail/start'
    );
    return data.authorization_url;
  }

  async getGmailMessages(params?: { maxResults?: number; labelId?: string; query?: string }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.maxResults) {
      searchParams.set('max_results', String(params.maxResults));
    }
    if (params?.labelId) {
      searchParams.set('label_id', params.labelId);
    }
    if (params?.query) {
      searchParams.set('query', params.query);
    }
    const qs = searchParams.toString();
    const endpoint = qs ? `/api/gmail/messages?${qs}` : '/api/gmail/messages';
    return this.request(endpoint);
  }

  async getGmailUnreadCount(): Promise<{ unread: number }> {
    return this.request('/api/gmail/messages/unread-count');
  }

  async sendGmailMessage(payload: { to: string[]; subject: string; body: string; cc?: string[]; bcc?: string[] }): Promise<any> {
    return this.request('/api/gmail/messages/send', {
      method: 'POST',
      body: JSON.stringify(payload),
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
