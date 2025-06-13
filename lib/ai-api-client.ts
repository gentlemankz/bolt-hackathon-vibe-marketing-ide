/**
 * AI API Client for communicating with the FastAPI backend
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ContextData {
  campaigns?: Record<string, unknown>[];
  ad_accounts?: Record<string, unknown>[];
  adsets?: Record<string, unknown>[];
  ads?: Record<string, unknown>[];
  metrics?: Record<string, unknown>;
  selected_items?: Record<string, unknown>[];
  current_view?: string;
  date_range?: Record<string, string>;
}

export interface TaggedFile {
  id: string;
  name: string;
  type: string; // "file", "folder", "campaign", "adset", "ad"
  path?: string;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
  created_at?: Date;
}

export interface ChatRequest {
  message: string;
  thread_id?: string;
  context?: ContextData;
  tagged_files?: TaggedFile[];
  use_frontend_data?: boolean;
}

export interface ChatResponse {
  response: string;
  thread_id: string;
  sources?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  suggested_actions?: string[];
}

export interface StreamChunk {
  chunk?: string;
  thread_id?: string;
  node?: string;
  status?: string;
  error?: string;
  is_final?: boolean;
}

export class AIApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8000').replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Send a chat message and get a complete response
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Alias for sendMessage - used by chat interface
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.sendMessage(request);
  }

  /**
   * Stream a chat conversation with real-time responses
   */
  async *streamMessage(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const response = await fetch(`${this.baseUrl}/chat/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data as StreamChunk;
            } catch {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get quick analytics insights
   */
  async getAnalytics(query: string, context?: ContextData): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/analytics/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        context,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health/`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }
} 