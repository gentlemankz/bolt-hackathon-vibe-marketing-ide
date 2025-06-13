import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import { 
  TavusReplica, 
  TavusPersona,
  TavusVideo,
  TavusStockPersona,
  AvatarCreationRequest 
} from '@/lib/types';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Tavus API response wrapper
 */
interface TavusApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/**
 * Tavus replica creation request
 */
interface ReplicaCreateRequest {
  train_video_url: string;
  replica_name: string;
  callback_url?: string;
}

/**
 * Tavus persona creation request
 */
interface PersonaCreateRequest {
  persona_name: string;
  system_prompt: string;
  context: string;
}

/**
 * Tavus video creation request
 */
interface VideoCreateRequest {
  replica_id: string;
  script: string;
  video_name: string;
  background_url?: string;
  callback_url?: string;
}

/**
 * Tavus API replica response
 */
interface TavusApiReplica {
  replica_id: string;
  replica_name: string;
  status: 'training' | 'ready' | 'error' | 'deprecated';
  training_progress: string;
  created_at: string;
  avatar_url?: string;
  error_message?: string;
}

/**
 * Tavus API persona response
 */
interface TavusApiPersona {
  persona_id: string;
  persona_name: string;
  system_prompt: string;
  context: string;
  created_at: string;
}

/**
 * Tavus API video response
 */
interface TavusApiVideo {
  video_id: string;
  video_name: string;
  status: string;
  download_url?: string;
  stream_url?: string;
  hosted_url?: string;
  replica_id: string;
  script: string;
  background_url?: string;
  created_at: string;
}

// ============================================================================
// TavusService Class
// ============================================================================

/**
 * Service class for Tavus AI Avatar API integration with Supabase
 */
export class TavusService {
  private supabase: SupabaseClient;
  private serviceClient: SupabaseClient;
  private userApiKey: string | null = null;
  private globalApiKey: string;
  private baseUrl: string = 'https://tavusapi.com/v2';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.serviceClient = createServiceClient();
    this.globalApiKey = process.env.TAVUS_API_KEY || '';
  }

  // ============================================================================
  // Authentication & API Key Management
  // ============================================================================

  /**
   * Get API key for user with optional global fallback
   */
  async getApiKey(userId?: string, allowGlobalFallback: boolean = false): Promise<string> {
    try {
      // Return cached key if available
      if (this.userApiKey && userId) {
        return this.userApiKey;
      }

      // If no userId provided and global fallback allowed, use global key
      if (!userId && allowGlobalFallback && this.globalApiKey) {
        return this.globalApiKey;
      }

      // If no userId provided and no global fallback, throw error
      if (!userId) {
        throw new Error('User ID required for API key retrieval');
      }

      // Fetch user's Tavus API key from database
      const { data, error } = await this.supabase
        .from('tavus_connections')
        .select('api_key, is_connected, connection_status')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No connection found
          if (allowGlobalFallback && this.globalApiKey) {
            return this.globalApiKey;
          }
          throw new Error('No Tavus connection found. Please connect your Tavus account first.');
        }
        throw new Error(`Failed to fetch Tavus connection: ${error.message}`);
      }

      if (!data || !data.is_connected || data.connection_status !== 'connected') {
        if (allowGlobalFallback && this.globalApiKey) {
          return this.globalApiKey;
        }
        throw new Error('Tavus account is not connected. Please reconnect your account.');
      }

      if (!data.api_key) {
        if (allowGlobalFallback && this.globalApiKey) {
          return this.globalApiKey;
        }
        throw new Error('No API key found for Tavus connection.');
      }

      // Cache the key for subsequent requests
      this.userApiKey = data.api_key;
      return data.api_key;

    } catch (error) {
      console.error('Error getting API key:', error);
      
      // Fallback to global API key if allowed
      if (allowGlobalFallback && this.globalApiKey) {
        console.log('Using global API key as fallback');
        return this.globalApiKey;
      }
      
      throw error;
    }
  }

  /**
   * Generic HTTP request handler for Tavus API
   */
  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    userId?: string,
    allowGlobalFallback: boolean = false
  ): Promise<T> {
    try {
      // Get API key
      const apiKey = await this.getApiKey(userId, allowGlobalFallback);

      // Prepare request options
      const requestOptions: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          ...options.headers,
        },
      };

      // Make request
      const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);

      // Handle common HTTP error codes
      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors
        }

        const errorMessage = errorData.message || errorData.error || response.statusText;

        switch (response.status) {
          case 402:
            throw new Error(`Payment required: ${errorMessage}. Please check your Tavus credits.`);
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`);
          case 401:
            throw new Error(`Authentication failed: ${errorMessage}. Please check your API key.`);
          case 403:
            throw new Error(`Access forbidden: ${errorMessage}. Please check your permissions.`);
          default:
            throw new Error(`HTTP ${response.status}: ${errorMessage}`);
        }
      }

      // Parse and return JSON response
      return await response.json();

    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Replica Management
  // ============================================================================

  /**
   * Create a new replica
   */
  async createReplica(trainVideoUrl: string, replicaName: string, userId: string): Promise<TavusReplica> {
    try {
      console.log('Creating replica:', replicaName, 'for user:', userId);

      const request: ReplicaCreateRequest = {
        train_video_url: trainVideoUrl,
        replica_name: replicaName,
      };

      // POST to /replicas endpoint
      const response = await this.makeRequest<TavusApiResponse<TavusApiReplica>>(
        '/replicas',
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
        userId
      );

      const apiReplica = response.data;

      // Store replica in database
      const replicaData: TavusReplica = {
        replica_id: apiReplica.replica_id,
        replica_name: apiReplica.replica_name,
        status: apiReplica.status,
        training_progress: apiReplica.training_progress,
        created_at: apiReplica.created_at,
        user_id: userId,
        avatar_url: apiReplica.avatar_url,
        error_message: apiReplica.error_message,
      };

      const { error } = await this.supabase
        .from('tavus_replicas')
        .insert(replicaData);

      if (error) {
        console.error('Error storing replica in database:', error);
        // Don't throw error for database save failures
      }

      console.log('Replica created successfully:', apiReplica.replica_id);
      return replicaData;

    } catch (error) {
      console.error('Error creating replica:', error);
      throw error;
    }
  }

  /**
   * Get a single replica
   */
  async getReplica(replicaId: string, userId: string): Promise<TavusReplica | null> {
    try {
      // GET from /replicas/{replicaId}
      const response = await this.makeRequest<TavusApiResponse<TavusApiReplica>>(
        `/replicas/${replicaId}`,
        { method: 'GET' },
        userId
      );

      if (!response.data) {
        return null;
      }

      const apiReplica = response.data;

      return {
        replica_id: apiReplica.replica_id,
        replica_name: apiReplica.replica_name,
        status: apiReplica.status,
        training_progress: apiReplica.training_progress,
        created_at: apiReplica.created_at,
        user_id: userId,
        avatar_url: apiReplica.avatar_url,
        error_message: apiReplica.error_message,
      };

    } catch (error) {
      console.error('Error getting replica:', error);
      return null;
    }
  }

  /**
   * List user's replicas
   */
  async listReplicas(userId: string): Promise<TavusReplica[]> {
    try {
      // Fetch user's replicas from database first
      const { data: dbReplicas, error: dbError } = await this.supabase
        .from('tavus_replicas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!dbError && dbReplicas && dbReplicas.length > 0) {
        return dbReplicas;
      }

      // Fallback to API if database fails
      console.log('Fetching replicas from API for user:', userId);
      return await this.getUserReplicasFromAPI(userId);

    } catch (error) {
      console.error('Error listing replicas:', error);
      return [];
    }
  }

  /**
   * Get user replicas from API
   */
  private async getUserReplicasFromAPI(userId: string): Promise<TavusReplica[]> {
    try {
      // GET from /replicas?replica_type=user&verbose=true
      const response = await this.makeRequest<TavusApiResponse<TavusApiReplica[]>>(
        '/replicas?replica_type=user&verbose=true',
        { method: 'GET' },
        userId
      );

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      // Transform API response to TavusReplica format
      return response.data.map(apiReplica => ({
        replica_id: apiReplica.replica_id,
        replica_name: apiReplica.replica_name,
        status: apiReplica.status,
        training_progress: apiReplica.training_progress,
        created_at: apiReplica.created_at,
        user_id: userId,
        avatar_url: apiReplica.avatar_url,
        error_message: apiReplica.error_message,
      }));

    } catch (error) {
      console.error('Error fetching user replicas from API:', error);
      return [];
    }
  }

  /**
   * Delete a replica
   */
  async deleteReplica(replicaId: string, userId: string): Promise<void> {
    try {
      console.log('Deleting replica:', replicaId, 'for user:', userId);

      // DELETE from Tavus API
      await this.makeRequest(
        `/replicas/${replicaId}`,
        { method: 'DELETE' },
        userId
      );

      // Remove from database
      const { error } = await this.supabase
        .from('tavus_replicas')
        .delete()
        .eq('replica_id', replicaId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting replica from database:', error);
        // Don't throw error for database deletion failures
      }

      console.log('Replica deleted successfully:', replicaId);

    } catch (error) {
      console.error('Error deleting replica:', error);
      throw error;
    }
  }

  // ============================================================================
  // Stock Replicas
  // ============================================================================

  /**
   * Get stock replicas
   */
  async getStockReplicas(): Promise<TavusReplica[]> {
    try {
      // GET from /replicas?replica_type=system&verbose=true using global API key
      const response = await this.makeRequest<TavusApiResponse<TavusApiReplica[]>>(
        '/replicas?replica_type=system&verbose=true',
        { method: 'GET' },
        undefined,
        true // allowGlobalFallback
      );

      if (response.data && Array.isArray(response.data)) {
        // Transform API response and mark as stock
        return response.data.map(apiReplica => ({
          replica_id: apiReplica.replica_id,
          replica_name: apiReplica.replica_name,
          status: apiReplica.status,
          training_progress: apiReplica.training_progress,
          created_at: apiReplica.created_at,
          user_id: 'system',
          avatar_url: apiReplica.avatar_url,
          error_message: apiReplica.error_message,
          is_stock: true,
        }));
      }

      // Fallback to hardcoded stock replicas if API fails
      console.log('API failed, using hardcoded stock replicas');
      return this.getHardcodedStockReplicas();

    } catch (error) {
      console.error('Error fetching stock replicas:', error);
      // Fallback to hardcoded stock replicas
      return this.getHardcodedStockReplicas();
    }
  }

  /**
   * Get hardcoded stock replicas
   */
  private getHardcodedStockReplicas(): TavusReplica[] {
    return [
      {
        replica_id: 'r1fbfc941b',
        replica_name: 'Nathan - Professional Male',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'system',
        is_stock: true,
        avatar_url: 'https://tavusapi.com/avatars/nathan.jpg',
      },
      {
        replica_id: 'r4c41453d2',
        replica_name: 'Anna - Business Female',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'system',
        is_stock: true,
        avatar_url: 'https://tavusapi.com/avatars/anna.jpg',
      },
      {
        replica_id: 'r94e875b92',
        replica_name: 'Marcus - Corporate Professional',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'system',
        is_stock: true,
        avatar_url: 'https://tavusapi.com/avatars/marcus.jpg',
      },
      {
        replica_id: 'r68920c31a',
        replica_name: 'Sarah - Marketing Specialist',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'system',
        is_stock: true,
        avatar_url: 'https://tavusapi.com/avatars/sarah.jpg',
      },
      {
        replica_id: 'r5e3f7a9c1',
        replica_name: 'James - Technical Expert',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'system',
        is_stock: true,
        avatar_url: 'https://tavusapi.com/avatars/james.jpg',
      },
      {
        replica_id: 'r2d8b4f6e7',
        replica_name: 'Emily - Customer Support',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'system',
        is_stock: true,
        avatar_url: 'https://tavusapi.com/avatars/emily.jpg',
      },
    ];
  }

  /**
   * Get all available replicas (stock + user)
   */
  async getAllAvailableReplicas(userId: string): Promise<{
    stockReplicas: TavusReplica[];
    userReplicas: TavusReplica[];
    allReplicas: TavusReplica[];
  }> {
    try {
      // Fetch both stock and user replicas
      const [stockReplicas, userReplicas] = await Promise.all([
        this.getStockReplicas(),
        this.listReplicas(userId),
      ]);

      const allReplicas = [...stockReplicas, ...userReplicas];

      return {
        stockReplicas,
        userReplicas,
        allReplicas,
      };

    } catch (error) {
      console.error('Error getting all available replicas:', error);
      return {
        stockReplicas: [],
        userReplicas: [],
        allReplicas: [],
      };
    }
  }

  // ============================================================================
  // Persona Management
  // ============================================================================

  /**
   * Create a new persona
   */
  async createPersona(
    personaName: string,
    systemPrompt: string,
    context: string,
    userId: string
  ): Promise<TavusPersona> {
    try {
      console.log('Creating persona:', personaName, 'for user:', userId);

      const request: PersonaCreateRequest = {
        persona_name: personaName,
        system_prompt: systemPrompt,
        context: context,
      };

      // POST to /personas endpoint
      const response = await this.makeRequest<TavusApiResponse<TavusApiPersona>>(
        '/personas',
        {
          method: 'POST',
          body: JSON.stringify(request),
        },
        userId
      );

      const apiPersona = response.data;

      // Store in database
      const personaData: TavusPersona = {
        persona_id: apiPersona.persona_id,
        persona_name: apiPersona.persona_name,
        system_prompt: apiPersona.system_prompt,
        context: apiPersona.context,
        created_at: apiPersona.created_at,
        user_id: userId,
      };

      const { error } = await this.supabase
        .from('tavus_personas')
        .insert(personaData);

      if (error) {
        console.error('Error storing persona in database:', error);
        // Don't throw error for database save failures
      }

      console.log('Persona created successfully:', apiPersona.persona_id);
      return personaData;

    } catch (error) {
      console.error('Error creating persona:', error);
      throw error;
    }
  }

  /**
   * List user's personas
   */
  async listPersonas(userId: string): Promise<TavusPersona[]> {
    try {
      const { data, error } = await this.supabase
        .from('tavus_personas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching personas:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in listPersonas:', error);
      return [];
    }
  }

  /**
   * Get stock personas
   */
  getStockPersonas(): TavusStockPersona[] {
    return [
      {
        persona_id: 'pb8bb46b',
        name: 'Sales Agent',
        description: 'Professional sales representative focused on converting leads',
        system_prompt: 'You are a professional sales agent. Your goal is to understand customer needs and present solutions that provide value.',
        context: 'Sales conversations, product demonstrations, lead qualification',
        avatar_url: 'https://tavusapi.com/personas/sales-agent.jpg',
      },
      {
        persona_id: 'p7697228',
        name: 'Customer Support Specialist',
        description: 'Helpful support agent focused on resolving customer issues',
        system_prompt: 'You are a customer support specialist. Your goal is to help customers resolve their issues quickly and effectively.',
        context: 'Customer support, troubleshooting, issue resolution',
        avatar_url: 'https://tavusapi.com/personas/support-specialist.jpg',
      },
      {
        persona_id: 'pe930b05',
        name: 'Personal Agent',
        description: 'Friendly personal assistant for general inquiries',
        system_prompt: 'You are a personal assistant. Your goal is to be helpful, friendly, and provide accurate information.',
        context: 'General assistance, information requests, personal tasks',
        avatar_url: 'https://tavusapi.com/personas/personal-agent.jpg',
      },
    ];
  }

  // ============================================================================
  // Video Generation
  // ============================================================================

  /**
   * Create a new video
   */
  async createVideo(request: AvatarCreationRequest, userId: string): Promise<TavusVideo> {
    try {
      console.log('Creating video:', request.video_name, 'for user:', userId);

      const videoRequest: VideoCreateRequest = {
        replica_id: request.replica_id,
        script: request.script,
        video_name: request.video_name,
        background_url: request.background_url,
      };

      // POST to /videos endpoint
      const response = await this.makeRequest<TavusApiResponse<TavusApiVideo>>(
        '/videos',
        {
          method: 'POST',
          body: JSON.stringify(videoRequest),
        },
        userId
      );

      const apiVideo = response.data;

      // Store in database
      const videoData: TavusVideo = {
        video_id: apiVideo.video_id,
        video_name: apiVideo.video_name,
        status: apiVideo.status,
        download_url: apiVideo.download_url,
        stream_url: apiVideo.stream_url,
        hosted_url: apiVideo.hosted_url,
        replica_id: apiVideo.replica_id,
        script: apiVideo.script,
        background_url: apiVideo.background_url,
        created_at: apiVideo.created_at,
        user_id: userId,
      };

      const { error } = await this.supabase
        .from('tavus_videos')
        .insert(videoData);

      if (error) {
        console.error('Error storing video in database:', error);
        // Don't throw error for database save failures
      }

      console.log('Video created successfully:', apiVideo.video_id);
      return videoData;

    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  }

  /**
   * Get a single video
   */
  async getVideo(videoId: string, userId: string): Promise<TavusVideo | null> {
    try {
      // GET from /videos/{videoId}
      const response = await this.makeRequest<TavusApiResponse<TavusApiVideo>>(
        `/videos/${videoId}`,
        { method: 'GET' },
        userId
      );

      if (!response.data) {
        return null;
      }

      const apiVideo = response.data;

      return {
        video_id: apiVideo.video_id,
        video_name: apiVideo.video_name,
        status: apiVideo.status,
        download_url: apiVideo.download_url,
        stream_url: apiVideo.stream_url,
        hosted_url: apiVideo.hosted_url,
        replica_id: apiVideo.replica_id,
        script: apiVideo.script,
        background_url: apiVideo.background_url,
        created_at: apiVideo.created_at,
        user_id: userId,
      };

    } catch (error) {
      console.error('Error getting video:', error);
      return null;
    }
  }

  /**
   * List user's videos
   */
  async listVideos(userId: string): Promise<TavusVideo[]> {
    try {
      const { data, error } = await this.supabase
        .from('tavus_videos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in listVideos:', error);
      return [];
    }
  }
}

// Export default instance for convenience
export default TavusService;