import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TavusReplica, TavusPersona, TavusVideo, TavusStockPersona, AvatarCreationRequest } from "@/lib/types";

// ============================================================================
// Query Keys
// ============================================================================

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

// ============================================================================
// Replica Hooks
// ============================================================================

export function useTavusReplicas() {
  return useQuery({
    queryKey: tavusQueryKeys.replicas,
    queryFn: async (): Promise<TavusReplica[]> => {
      const response = await fetch('/api/tavus/replicas');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch replicas: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.replicas || [];
    },
  });
}

export function useTavusStockReplicas() {
  return useQuery({
    queryKey: tavusQueryKeys.stockReplicas,
    queryFn: async (): Promise<TavusReplica[]> => {
      const response = await fetch('/api/tavus/replicas/stock');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stock replicas: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.replicas || [];
    },
  });
}

export function useAllTavusReplicas() {
  return useQuery({
    queryKey: tavusQueryKeys.allReplicas,
    queryFn: async (): Promise<{ stockReplicas: TavusReplica[]; userReplicas: TavusReplica[]; allReplicas: TavusReplica[] }> => {
      const [stockResponse, userResponse] = await Promise.all([
        fetch('/api/tavus/replicas/stock'),
        fetch('/api/tavus/replicas')
      ]);
      
      if (!stockResponse.ok) {
        throw new Error(`Failed to fetch stock replicas: ${stockResponse.statusText}`);
      }
      
      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user replicas: ${userResponse.statusText}`);
      }
      
      const stockData = await stockResponse.json();
      const userData = await userResponse.json();
      
      const stockReplicas = stockData.replicas || [];
      const userReplicas = userData.replicas || [];
      const allReplicas = [...stockReplicas, ...userReplicas];
      
      return { stockReplicas, userReplicas, allReplicas };
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
        throw new Error(`Failed to fetch replica: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.replica || null;
    },
    enabled: !!replicaId,
  });
}

export function useCreateReplica() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ trainVideoUrl, replicaName }: { trainVideoUrl: string; replicaName: string }): Promise<TavusReplica> => {
      const response = await fetch('/api/tavus/replicas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          train_video_url: trainVideoUrl,
          replica_name: replicaName,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create replica');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tavusQueryKeys.replicas });
      queryClient.invalidateQueries({ queryKey: tavusQueryKeys.allReplicas });
    },
  });
}

export function useDeleteReplica() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (replicaId: string): Promise<void> => {
      const response = await fetch(`/api/tavus/replicas/${replicaId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete replica');
      }
    },
    onSuccess: (_, replicaId) => {
      queryClient.invalidateQueries({ queryKey: tavusQueryKeys.replicas });
      queryClient.invalidateQueries({ queryKey: tavusQueryKeys.allReplicas });
      queryClient.removeQueries({ queryKey: tavusQueryKeys.replica(replicaId) });
    },
  });
}

// ============================================================================
// Persona Hooks
// ============================================================================

export function useTavusPersonas() {
  return useQuery({
    queryKey: tavusQueryKeys.personas,
    queryFn: async (): Promise<TavusPersona[]> => {
      const response = await fetch('/api/tavus/personas');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch personas: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.personas || [];
    },
  });
}

export function useTavusStockPersonas() {
  return useQuery({
    queryKey: tavusQueryKeys.stockPersonas,
    queryFn: async (): Promise<TavusStockPersona[]> => {
      const response = await fetch('/api/tavus/stock-personas');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stock personas: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.personas || [];
    },
  });
}

export function useCreatePersona() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ personaName, systemPrompt, context }: { 
      personaName: string; 
      systemPrompt: string; 
      context: string; 
    }): Promise<TavusPersona> => {
      const response = await fetch('/api/tavus/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona_name: personaName,
          system_prompt: systemPrompt,
          context: context,
        }),
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

// ============================================================================
// Video Hooks
// ============================================================================

export function useTavusVideos() {
  return useQuery({
    queryKey: tavusQueryKeys.videos,
    queryFn: async (): Promise<TavusVideo[]> => {
      const response = await fetch('/api/tavus/videos');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.videos || [];
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
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.video || null;
    },
    enabled: !!videoId,
  });
}

export function useCreateVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: AvatarCreationRequest): Promise<TavusVideo> => {
      const response = await fetch('/api/tavus/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
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

// ============================================================================
// Prefetch Helpers
// ============================================================================

export async function prefetchTavusReplicas(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.prefetchQuery({
    queryKey: tavusQueryKeys.replicas,
    queryFn: async (): Promise<TavusReplica[]> => {
      const response = await fetch('/api/tavus/replicas');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch replicas: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.replicas || [];
    },
  });
}

export async function prefetchTavusPersonas(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.prefetchQuery({
    queryKey: tavusQueryKeys.personas,
    queryFn: async (): Promise<TavusPersona[]> => {
      const response = await fetch('/api/tavus/personas');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch personas: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.personas || [];
    },
  });
}

export async function prefetchTavusVideos(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.prefetchQuery({
    queryKey: tavusQueryKeys.videos,
    queryFn: async (): Promise<TavusVideo[]> => {
      const response = await fetch('/api/tavus/videos');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.videos || [];
    },
  });
}