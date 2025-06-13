/**
 * AI API Client for communicating with the FastAPI backend
 * 
 * This client provides methods for chat interactions, streaming responses,
 * analytics insights, and health checks with the AI backend service.
 */

/**
 * Represents a chat message in the conversation
 */
export interface ChatMessage {
  /** The role of the message sender */
  role: 'user' | 'assistant';
  /** The content of the message */
  content: string;
  /** Optional timestamp when the message was created */
  timestamp?: Date;
}

/**
 * Context data that can be passed with chat requests
 */
export interface ContextData {
  /** Array of campaign data objects */
  campaigns?: Record<string, unknown>[];
  /** Array of ad account data objects */
  ad_accounts?: Record<string, unknown>[];
  /** Array of adset data objects */
  adsets?: Record<string, unknown>[];
  /** Array of ads data objects */
  ads?: Record<string, unknown>[];
  /** Metrics data as key-value pairs */
  metrics?: Record<string, unknown>;
  /** Array of currently selected items */
  selected_items?: Record<string, unknown>[];
  /** Current view identifier */
  current_view?: string;
  /** Date range with string keys and values */
  date_range?: Record<string, string>;
}

/**
 * Represents a tagged file or data object
 */
export interface TaggedFile {
  /** Unique identifier for the file */
  id: string;
  /** Display name of the file */
  name: string;
  /** Type of the file - possible values: "file", "folder", "campaign", "adset", "ad" */
  type: string;
  /** Optional file path */
  path?: string;
  /** Optional content data */
  content?: Record<string, unknown>;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Optional array of tags */
  tags?: string[];
  /** Optional creation timestamp */
  created_at?: Date;
}

/**
 * Request payload for chat interactions
 */
export interface ChatRequest {
  /** The message content to send */
  message: string;
  /** Optional thread identifier for conversation continuity */
  thread_id?: string;
  /** Optional context data */
  context?: ContextData;
  /** Optional array of tagged files */
  tagged_files?: TaggedFile[];
  /** Optional flag to use frontend data */
  use_frontend_data?: boolean;
}

/**
 * Response from chat interactions
 */
export interface ChatResponse {
  /** The AI response message */
  response: string;
  /** Thread identifier for the conversation */
  thread_id: string;
  /** Optional array of source references */
  sources?: Record<string, unknown>[];
  /** Optional metadata about the response */
  metadata?: Record<string, unknown>;
  /** Optional suggested follow-up actions */
  suggested_actions?: string[];
}

/**
 * Represents a chunk of data from streaming responses
 */
export interface StreamChunk {
  /** The content chunk */
  chunk?: string;
  /** Thread identifier */
  thread_id?: string;
  /** Current processing node */
  node?: string;
  /** Current status */
  status?: string;
  /** Error message if any */
  error?: string;
  /** Whether this is the final chunk */
  is_final?: boolean;
}

/**
 * Main API client for communicating with the AI FastAPI backend
 */
export class AIApiClient {
  private readonly baseUrl: string;

  /**
   * Creates a new AI API client instance
   * @param baseUrl - Optional base URL for the API. Defaults to environment variable or localhost
   */
  constructor(baseUrl?: string) {
    this.baseUrl = (
      baseUrl || 
      process.env.NEXT_PUBLIC_AI_API_URL || 
      'http://localhost:8000'
    ).replace(/\/$/, '');
  }

  /**
   * Send a chat message and get a complete response
   * @param request - The chat request payload
   * @returns Promise resolving to the chat response
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        throw new Error(
          `HTTP ${response.status}: ${errorData.detail || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to send message');
    }
  }

  /**
   * Alias for sendMessage - used by chat interface
   * @param request - The chat request payload
   * @returns Promise resolving to the chat response
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.sendMessage(request);
  }

  /**
   * Stream a chat conversation with real-time responses
   * @param request - The chat request payload
   * @yields StreamChunk objects as they arrive
   */
  async *streamMessage(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        throw new Error(
          `HTTP ${response.status}: ${errorData.detail || response.statusText}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6); // Remove 'data: ' prefix
            
            if (dataStr === '[DONE]') {
              return;
            }

            try {
              const chunk: StreamChunk = JSON.parse(dataStr);
              yield chunk;
            } catch (error) {
              console.warn('Failed to parse SSE data:', dataStr, error);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to stream message');
    } finally {
      if (reader) {
        try {
          reader.releaseLock();
        } catch {
          // Ignore errors when releasing lock
        }
      }
    }
  }

  /**
   * Get quick analytics insights
   * @param query - The analytics query string
   * @param context - Optional context data
   * @returns Promise resolving to analytics data
   */
  async getAnalytics(
    query: string, 
    context?: ContextData
  ): Promise<Record<string, unknown>> {
    try {
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
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        throw new Error(
          `HTTP ${response.status}: ${errorData.detail || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get analytics');
    }
  }

  /**
   * Check API health
   * @returns Promise resolving to health status
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health/`);

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        throw new Error(
          `HTTP ${response.status}: ${errorData.detail || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to check health');
    }
  }
}

// Export a default instance for convenience
export const aiApiClient = new AIApiClient();