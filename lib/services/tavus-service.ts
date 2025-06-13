import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';
import { 
  TavusReplica, 
  TavusPersona,
  TavusVideo,
  TavusStockPersona,
  AvatarCreationRequest 
} from '@/lib/types';

export class TavusService {
  private supabase: SupabaseClient;
  private serviceClient: SupabaseClient;
  private userApiKey: string | null = null;
  private globalApiKey: string;
  private baseUrl = 'https://tavusapi.com/v2';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.globalApiKey = process.env.TAVUS_API_KEY || '';
    
    // Use service client for database operations to bypass permission issues
    try {
      this.serviceClient = createServiceClient();
    } catch (error) {
      console.warn('Service client not available, falling back to regular client:', error);
      this.serviceClient = supabase;
    }
  }

  // Get user's Tavus API key from database, fallback to global for stock operations
  private async getApiKey(userId?: string, allowGlobalFallback: boolean = false): Promise<string> {
    // For stock operations without user context, use global API key
    if (!userId && allowGlobalFallback) {
      return this.globalApiKey;
    }

    // If no userId provided and no fallback allowed, throw error
    if (!userId) {
      throw new Error('User ID required for user-specific operations');
    }

    // Return cached user API key if available
    if (this.userApiKey) {
      return this.userApiKey;
    }

    // Fetch user's API key from database
    const { data: connection } = await this.serviceClient
      .from('tavus_connections')
      .select('api_key, is_connected, connection_status')
      .eq('user_id', userId)
      .single();

    if (!connection || !connection.is_connected || connection.connection_status !== 'connected') {
      throw new Error('Tavus account not connected. Please connect your Tavus account in settings.');
    }

    this.userApiKey = connection.api_key;
    return connection.api_key;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}, userId?: string, allowGlobalFallback: boolean = false) {
    const apiKey = await this.getApiKey(userId, allowGlobalFallback);
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Enhanced error messages for common issues
      if (response.status === 402) {
        throw new Error('Payment Required: Your Tavus account needs credits to generate videos. Please add credits to your Tavus account at https://app.tavus.io/billing or contact support.');
      }
      
      if (response.status === 429) {
        throw new Error('Rate Limit Exceeded: Too many requests. Please wait a moment and try again.');
      }
      
      if (response.status === 401) {
        throw new Error('Authentication Failed: Invalid API key. Please check your Tavus API configuration.');
      }
      
      if (response.status === 403) {
        throw new Error('Access Forbidden: Your Tavus account may not have permission for this action. Please check your account status.');
      }
      
      // Use error message from API if available, otherwise generic message
      const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Replica management
  async createReplica(trainVideoUrl: string, replicaName: string, userId: string): Promise<TavusReplica> {
    const response = await this.makeRequest('/replicas', {
      method: 'POST',
      body: JSON.stringify({
        train_video_url: trainVideoUrl,
        replica_name: replicaName,
      }),
    }, userId);

    const replica: TavusReplica = {
      replica_id: response.replica_id,
      replica_name: replicaName,
      status: response.status,
      training_progress: response.training_progress || '0%',
      created_at: new Date().toISOString(),
      user_id: userId,
    };

    // Store in database
    await this.serviceClient
      .from('tavus_replicas')
      .insert(replica);

    return replica;
  }

  async getReplica(replicaId: string, userId: string): Promise<TavusReplica | null> {
    try {
      const response = await this.makeRequest(`/replicas/${replicaId}`, {}, userId);
      return {
        replica_id: response.replica_id,
        replica_name: response.replica_name,
        status: response.status,
        training_progress: response.training_progress || '0%',
        created_at: response.created_at,
        error_message: response.error_message,
        user_id: userId,
      };
    } catch (error) {
      console.error('Error fetching replica:', error);
      return null;
    }
  }

  async listReplicas(userId: string): Promise<TavusReplica[]> {
    try {
      // First try to get from database
      const { data, error } = await this.serviceClient
        .from('tavus_replicas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching replicas from database:', error);
        // Fallback to API if database fails
        return this.getUserReplicasFromAPI(userId);
      }

      return data || [];
    } catch (error) {
      console.error('Error in listReplicas:', error);
      return this.getUserReplicasFromAPI(userId);
    }
  }

  // Helper method to fetch user replicas from Tavus API
  private async getUserReplicasFromAPI(userId: string): Promise<TavusReplica[]> {
    try {
      const response = await this.makeRequest('/replicas?replica_type=user&verbose=true', {}, userId);
      const userReplicas = response.data || [];

      return userReplicas.map((replica: { 
        replica_id: string; 
        replica_name?: string; 
        created_at?: string; 
        thumbnail_video_url?: string;
        status?: string;
        training_progress?: string;
        error_message?: string;
      }) => ({
        replica_id: replica.replica_id,
        replica_name: replica.replica_name || `Replica ${replica.replica_id}`,
        status: replica.status as 'training' | 'ready' | 'error' || 'training',
        training_progress: replica.training_progress || '0%',
        created_at: replica.created_at || new Date().toISOString(),
        user_id: 'current', // Placeholder for current user
        is_stock: false,
        avatar_url: replica.thumbnail_video_url,
        error_message: replica.error_message,
      }));
    } catch (error) {
      console.error('Error fetching user replicas from API:', error);
      return [];
    }
  }

  async deleteReplica(replicaId: string, userId: string): Promise<void> {
    // Delete from Tavus
    await this.makeRequest(`/replicas/${replicaId}`, {
      method: 'DELETE',
    }, userId);

    // Delete from database
    await this.serviceClient
      .from('tavus_replicas')
      .delete()
      .eq('replica_id', replicaId)
      .eq('user_id', userId);
  }

  // Persona management
  async createPersona(
    personaName: string,
    systemPrompt: string,
    context: string,
    userId: string
  ): Promise<TavusPersona> {
    const response = await this.makeRequest('/personas', {
      method: 'POST',
      body: JSON.stringify({
        persona_name: personaName,
        system_prompt: systemPrompt,
        context: context,
      }),
    }, userId);

    const persona: TavusPersona = {
      persona_id: response.persona_id,
      persona_name: personaName,
      system_prompt: systemPrompt,
      context: context,
      created_at: new Date().toISOString(),
      user_id: userId,
    };

    // Store in database
    await this.serviceClient
      .from('tavus_personas')
      .insert(persona);

    return persona;
  }

  async listPersonas(userId: string): Promise<TavusPersona[]> {
    const { data, error } = await this.serviceClient
      .from('tavus_personas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching personas from database:', error);
      return [];
    }

    return data || [];
  }

  // Stock personas (predefined)
  getStockPersonas(): TavusStockPersona[] {
    return [
      {
        persona_id: 'pb8bb46b',
        name: 'Sales Agent',
        description: 'Professional sales representative focused on lead conversion',
        system_prompt: 'As a Sales Agent at Tavus, you are the driving force behind the company\'s growth, responsible for identifying and cultivating relationships with potential clients who can benefit from Tavus\'s AI-driven video personalization platform.',
        context: 'You have around 50-70 calls a week with developers and you love to teach them how conversational replicas work. You know the pricing depends on how many replicas and minutes a customer will be using.',
        avatar_url: '/avatars/sales-agent.jpg',
      },
      {
        persona_id: 'p7697228',
        name: 'Customer Support Specialist',
        description: 'Friendly support specialist for customer assistance',
        system_prompt: 'As a Customer Support Specialist at Tavus, you are the frontline advocate for our clients, ensuring they have a smooth and successful experience with our AI-driven video personalization platform.',
        context: 'You have worked for Tavus for 2 years and usually have 10-30 meetings per week with customers. You provide top-tier support by quickly and effectively resolving customer inquiries.',
        avatar_url: '/avatars/support-specialist.jpg',
      },
      {
        persona_id: 'pe930b05',
        name: 'Personal Agent',
        description: 'Personal assistant for scaling team operations',
        system_prompt: 'As a Personal Agent specializing in scaling assistants across an entire team, you possess a unique blend of technical acumen, organizational insight, and interpersonal skills.',
        context: 'You specialize in scaling marketing teams. Your last job was at Google to scale the sales team. You deploy, customize, and manage virtual assistants tailored to specific needs.',
        avatar_url: '/avatars/personal-agent.jpg',
      },
    ];
  }

  // Stock replicas (ready-to-use templates)
  async getStockReplicas(): Promise<TavusReplica[]> {
    try {
      // Use the correct API endpoint with replica_type=system to get stock replicas
      // Use global API key for stock replicas since they're not user-specific
      const response = await this.makeRequest('/replicas?replica_type=system&verbose=true', {}, undefined, true);
      
      // The API returns stock replicas in the 'data' field
      const stockReplicas = response.data || [];

      if (stockReplicas.length === 0) {
        console.warn('No stock replicas returned from API, using fallback');
        return this.getHardcodedStockReplicas();
      }

      return stockReplicas.map((replica: { 
        replica_id: string; 
        replica_name?: string; 
        created_at?: string; 
        thumbnail_video_url?: string;
        status?: string;
        replica_type?: string;
        deprecated?: boolean;
      }) => ({
        replica_id: replica.replica_id,
        replica_name: replica.replica_name || `Template ${replica.replica_id}`,
        status: replica.deprecated ? 'deprecated' as const : 'ready' as const,
        training_progress: '100%',
        created_at: replica.created_at || new Date().toISOString(),
        user_id: 'stock', // Mark as stock replica
        is_stock: true,
        // Only use thumbnail if it's a valid URL, otherwise let the component handle the fallback
        avatar_url: replica.thumbnail_video_url && replica.thumbnail_video_url.startsWith('http') 
          ? replica.thumbnail_video_url 
          : undefined,
      }));
    } catch (error) {
      console.error('Error fetching stock replicas from API:', error);
      // Return hardcoded stock replicas as fallback
      return this.getHardcodedStockReplicas();
    }
  }

  // Hardcoded stock replicas as fallback (these are documented Tavus stock replicas)
  private getHardcodedStockReplicas(): TavusReplica[] {
    return [
      {
        replica_id: 'r1fbfc941b',
        replica_name: 'Nathan - Professional Male',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'stock',
        is_stock: true,
        // Don't include avatar_url - let the component show placeholder
      },
      {
        replica_id: 'r4c41453d2',
        replica_name: 'Anna - Business Female',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'stock',
        is_stock: true,
      },
      {
        replica_id: 'r94e875b92',
        replica_name: 'Marcus - Corporate Professional',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'stock',
        is_stock: true,
      },
      {
        replica_id: 'r68920c31a',
        replica_name: 'Sarah - Marketing Specialist',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'stock',
        is_stock: true,
      },
      {
        replica_id: 'r5e3f7a9c1',
        replica_name: 'James - Technical Expert',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'stock',
        is_stock: true,
      },
      {
        replica_id: 'r2d8b4f6e7',
        replica_name: 'Emily - Customer Support',
        status: 'ready',
        training_progress: '100%',
        created_at: new Date().toISOString(),
        user_id: 'stock',
        is_stock: true,
      },
    ];
  }

  // Combined method to get both stock and user replicas
  async getAllAvailableReplicas(userId: string): Promise<{
    stockReplicas: TavusReplica[];
    userReplicas: TavusReplica[];
    allReplicas: TavusReplica[];
  }> {
    const [stockReplicas, userReplicas] = await Promise.all([
      this.getStockReplicas(),
      this.listReplicas(userId)
    ]);

    return {
      stockReplicas,
      userReplicas,
      allReplicas: [...stockReplicas, ...userReplicas]
    };
  }

  // Video generation
  async createVideo(request: AvatarCreationRequest, userId: string): Promise<TavusVideo> {
    const response = await this.makeRequest('/videos', {
      method: 'POST',
      body: JSON.stringify({
        replica_id: request.replica_id,
        script: request.script,
        video_name: request.video_name,
        background_url: request.background_url,
      }),
    }, userId);

    const video: TavusVideo = {
      video_id: response.video_id,
      video_name: request.video_name,
      status: response.status || 'generating',
      replica_id: request.replica_id || '',
      script: request.script,
      background_url: request.background_url,
      created_at: new Date().toISOString(),
      user_id: userId,
    };

    // Store in database
    await this.serviceClient
      .from('tavus_videos')
      .insert(video);

    return video;
  }

  async getVideo(videoId: string, userId: string): Promise<TavusVideo | null> {
    try {
      const response = await this.makeRequest(`/videos/${videoId}`, {}, userId);
      return {
        video_id: response.video_id,
        video_name: response.video_name,
        status: response.status,
        download_url: response.download_url,
        stream_url: response.stream_url,
        hosted_url: response.hosted_url,
        replica_id: response.replica_id,
        script: response.script || '',
        background_url: response.background_url,
        created_at: response.created_at,
        user_id: userId,
      };
    } catch (error) {
      console.error('Error fetching video:', error);
      return null;
    }
  }

  async listVideos(userId: string): Promise<TavusVideo[]> {
    const { data, error } = await this.serviceClient
      .from('tavus_videos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos from database:', error);
      return [];
    }

    return data || [];
  }


} 