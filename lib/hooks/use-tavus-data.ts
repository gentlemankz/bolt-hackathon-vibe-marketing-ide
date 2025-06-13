import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { 
  TavusReplica, 
  TavusPersona, 
  TavusVideo,
  TavusStockPersona,
  AvatarCreationRequest 
} from '@/lib/types';

// Query keys
export const tavusQueryKeys = {
  replicas: ['tavus', 'replicas'] as const,
  stockReplicas: ['tavus', 'stock-replicas'] as const,
  allReplicas: ['tavus', 'all-replicas'] as const,
  replica: (id: string) => ['tavus', 'replica', id] as const,
  personas: ['tavus', 'personas'] as const,
  stockPersonas: ['tavus', 'stock-personas'] as const,
  videos: ['tavus', 'videos'] as const,
  video: (id: string) => ['tavus', 'video', id] as const,

};

// Replicas (user created)
export function useTavusReplicas() {
  return useQuery({
    queryKey: tavusQueryKeys.replicas,
    queryFn: async (): Promise<TavusReplica[]> => {
      const response = await fetch('/api/tavus/replicas');
      if (!response.ok) {
        throw new Error('Failed to fetch replicas');
      }
      const data = await response.json();
      return data.replicas;
    },
  });
}

// Stock replicas (templates)
export function useTavusStockReplicas() {
  return useQuery({
    queryKey: tavusQueryKeys.stockReplicas,
    queryFn: async (): Promise<TavusReplica[]> => {
      const response = await fetch('/api/tavus/replicas/stock');
      if (!response.ok) {
        throw new Error('Failed to fetch stock replicas');
      }
      const data = await response.json();
      return data.replicas;
    },
  });
}

// All replicas (stock + user)
export function useAllTavusReplicas() {
  return useQuery({
    queryKey: tavusQueryKeys.allReplicas,
    queryFn: async (): Promise<{
      allReplicas: TavusReplica[];
      stockReplicas: TavusReplica[];
      userReplicas: TavusReplica[];
    }> => {
      const response = await fetch('/api/tavus/replicas?include_stock=true');
      if (!response.ok) {
        throw new Error('Failed to fetch all replicas');
      }
      const data = await response.json();
      return {
        allReplicas: data.replicas,
        stockReplicas: data.stockReplicas || [],
        userReplicas: data.userReplicas || []
      };
    },
  });
}

export function useTavusReplica(replicaId: string | null) {
  return useQuery({
    queryKey: tavusQueryKeys.replica(replicaId || ''),
    queryFn: async (): Promise<TavusReplica | null> => {
      if (!replicaId) return null;
      const response = await fetch(`/api/tavus/replicas/${replicaId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch replica');
      }
      const data = await response.json();
      return data.replica;
    },
    enabled: !!replicaId,
  });
}

export function useCreateReplica() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { trainVideoUrl: string; replicaName: string }) => {
      const response = await fetch('/api/tavus/replicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create replica');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tavusQueryKeys.replicas });
    },
  });
}

export function useDeleteReplica() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (replicaId: string) => {
      const response = await fetch(`/api/tavus/replicas/${replicaId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete replica');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tavusQueryKeys.replicas });
    },
  });
}

// Personas
export function useTavusPersonas() {
  return useQuery({
    queryKey: tavusQueryKeys.personas,
    queryFn: async (): Promise<TavusPersona[]> => {
      const response = await fetch('/api/tavus/personas');
      if (!response.ok) {
        throw new Error('Failed to fetch personas');
      }
      const data = await response.json();
      return data.personas;
    },
  });
}

export function useTavusStockPersonas() {
  return useQuery({
    queryKey: tavusQueryKeys.stockPersonas,
    queryFn: async (): Promise<TavusStockPersona[]> => {
      const response = await fetch('/api/tavus/stock-personas');
      if (!response.ok) {
        throw new Error('Failed to fetch stock personas');
      }
      const data = await response.json();
      return data.personas;
    },
  });
}

export function useCreatePersona() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      personaName: string; 
      systemPrompt: string; 
      context: string; 
    }) => {
      const response = await fetch('/api/tavus/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create persona');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tavusQueryKeys.personas });
    },
  });
}

// Videos
export function useTavusVideos() {
  return useQuery({
    queryKey: tavusQueryKeys.videos,
    queryFn: async (): Promise<TavusVideo[]> => {
      const response = await fetch('/api/tavus/videos');
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      return data.videos;
    },
  });
}

export function useTavusVideo(videoId: string | null) {
  return useQuery({
    queryKey: tavusQueryKeys.video(videoId || ''),
    queryFn: async (): Promise<TavusVideo | null> => {
      if (!videoId) return null;
      const response = await fetch(`/api/tavus/videos/${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video');
      }
      const data = await response.json();
      return data.video;
    },
    enabled: !!videoId,
  });
}

export function useCreateVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AvatarCreationRequest) => {
      const response = await fetch('/api/tavus/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create video');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tavusQueryKeys.videos });
    },
  });
}



// Prefetch functions
export async function prefetchTavusReplicas(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: tavusQueryKeys.replicas,
    queryFn: async (): Promise<TavusReplica[]> => {
      const response = await fetch('/api/tavus/replicas');
      if (!response.ok) throw new Error('Failed to fetch replicas');
      const data = await response.json();
      return data.replicas;
    },
  });
}

export async function prefetchTavusPersonas(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: tavusQueryKeys.personas,
    queryFn: async (): Promise<TavusPersona[]> => {
      const response = await fetch('/api/tavus/personas');
      if (!response.ok) throw new Error('Failed to fetch personas');
      const data = await response.json();
      return data.personas;
    },
  });
}

export async function prefetchTavusVideos(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: tavusQueryKeys.videos,
    queryFn: async (): Promise<TavusVideo[]> => {
      const response = await fetch('/api/tavus/videos');
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      return data.videos;
    },
  });
} 