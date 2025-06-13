import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FacebookCampaign, FacebookAdSet, FacebookAd, FacebookCampaignMetrics, FacebookAdSetMetrics, FacebookAdMetrics, CampaignCreateRequest, AdSetCreateRequest, FacebookPagesResponse } from "@/lib/types";

// Fetch campaigns for an ad account
export function useFacebookCampaigns(adAccountId: string | null) {
  return useQuery({
    queryKey: ['facebook', 'campaigns', adAccountId],
    queryFn: async () => {
      if (!adAccountId) return [];
      
      const response = await fetch(`/api/facebook/campaigns?adAccountId=${adAccountId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.campaigns as FacebookCampaign[];
    },
    enabled: !!adAccountId,
  });
}

// Fetch ad sets for a campaign
export function useFacebookAdSets(campaignId: string | null) {
  return useQuery({
    queryKey: ['facebook', 'adsets', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const response = await fetch(`/api/facebook/adsets?campaignId=${campaignId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ad sets: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.adSets as FacebookAdSet[];
    },
    enabled: !!campaignId,
  });
}

// Fetch ads for an ad set
export function useFacebookAds(adSetId: string | null) {
  return useQuery({
    queryKey: ['facebook', 'ads', adSetId],
    queryFn: async () => {
      if (!adSetId) return [];
      
      const response = await fetch(`/api/facebook/ads?adSetId=${adSetId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ads: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.ads as FacebookAd[];
    },
    enabled: !!adSetId,
  });
}

// Fetch metrics for a campaign, ad set, or ad
export function useFacebookMetrics(type: 'campaign' | 'adset' | 'ad' | null, id: string | null, days = 30) {
  return useQuery({
    queryKey: ['facebook', 'metrics', type, id, days],
    queryFn: async () => {
      if (!type || !id) return [];
      
      const response = await fetch(`/api/facebook/metrics?type=${type}&id=${id}&days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.metrics as (FacebookCampaignMetrics | FacebookAdSetMetrics | FacebookAdMetrics)[];
    },
    enabled: !!type && !!id,
  });
}

// Fetch metrics summary for a campaign, ad set, or ad
export function useFacebookMetricsSummary(type: 'campaign' | 'adset' | 'ad' | null, id: string | null, days = 30) {
  return useQuery({
    queryKey: ['facebook', 'metrics-summary', type, id, days],
    queryFn: async () => {
      if (!type || !id) return null;
      
      const response = await fetch(`/api/facebook/metrics-summary?type=${type}&id=${id}&days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics summary: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.summary;
    },
    enabled: !!type && !!id,
  });
}

// Helper function to prefetch campaigns
export async function prefetchCampaigns(queryClient: ReturnType<typeof useQueryClient>, adAccountId: string) {
  if (!adAccountId) return;
  
  await queryClient.prefetchQuery({
    queryKey: ['facebook', 'campaigns', adAccountId],
    queryFn: async () => {
      const response = await fetch(`/api/facebook/campaigns?adAccountId=${adAccountId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.campaigns as FacebookCampaign[];
    },
  });
}

// Helper function to prefetch ad sets
export async function prefetchAdSets(queryClient: ReturnType<typeof useQueryClient>, campaignId: string) {
  if (!campaignId) return;
  
  await queryClient.prefetchQuery({
    queryKey: ['facebook', 'adsets', campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/facebook/adsets?campaignId=${campaignId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ad sets: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.adSets as FacebookAdSet[];
    },
  });
}

// Helper function to prefetch ads
export async function prefetchAds(queryClient: ReturnType<typeof useQueryClient>, adSetId: string) {
  if (!adSetId) return;
  
  await queryClient.prefetchQuery({
    queryKey: ['facebook', 'ads', adSetId],
    queryFn: async () => {
      const response = await fetch(`/api/facebook/ads?adSetId=${adSetId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ads: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.ads as FacebookAd[];
    },
  });
}

// Helper function to prefetch metrics
export async function prefetchMetrics(queryClient: ReturnType<typeof useQueryClient>, type: 'campaign' | 'adset' | 'ad', id: string, days = 30) {
  if (!type || !id) return;
  
  await queryClient.prefetchQuery({
    queryKey: ['facebook', 'metrics', type, id, days],
    queryFn: async () => {
      const response = await fetch(`/api/facebook/metrics?type=${type}&id=${id}&days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.metrics;
    },
  });
}

// Helper function to prefetch metrics summary
export async function prefetchMetricsSummary(queryClient: ReturnType<typeof useQueryClient>, type: 'campaign' | 'adset' | 'ad', id: string, days = 30) {
  if (!type || !id) return;
  
  await queryClient.prefetchQuery({
    queryKey: ['facebook', 'metrics-summary', type, id, days],
    queryFn: async () => {
      const response = await fetch(`/api/facebook/metrics-summary?type=${type}&id=${id}&days=${days}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics summary: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.summary;
    },
  });
}

// Hook for creating campaigns
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ adAccountId, campaignData }: { adAccountId: string; campaignData: CampaignCreateRequest }) => {
      const response = await fetch('/api/facebook/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adAccountId,
          campaignData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campaign');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate campaigns cache for the ad account
      queryClient.invalidateQueries({
        queryKey: ['facebook', 'campaigns', variables.adAccountId],
      });
      
      // Optionally, you can also update the cache directly
      queryClient.setQueryData(
        ['facebook', 'campaigns', variables.adAccountId],
        (oldData: FacebookCampaign[] | undefined) => {
          if (!oldData) return [data.campaign];
          return [...oldData, data.campaign];
        }
      );
    },
  });
}

// Hook for creating ad sets
export function useCreateAdSet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ campaignId, adSetData }: { campaignId: string; adSetData: AdSetCreateRequest }) => {
      const response = await fetch('/api/facebook/adsets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          adSetData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ad set');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate ad sets cache for the campaign
      queryClient.invalidateQueries({
        queryKey: ['facebook', 'adsets', variables.campaignId],
      });
      
      // Optionally, you can also update the cache directly
      queryClient.setQueryData(
        ['facebook', 'adsets', variables.campaignId],
        (oldData: FacebookAdSet[] | undefined) => {
          if (!oldData) return [data.adSet];
          return [...oldData, data.adSet];
        }
      );
    },
  });
}

// Fetch individual campaign details
export function useFacebookCampaign(campaignId: string | null) {
  return useQuery({
    queryKey: ['facebook', 'campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      
      const response = await fetch(`/api/facebook/campaigns/${campaignId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.campaign as FacebookCampaign;
    },
    enabled: !!campaignId,
  });
}

// Create ad
export function useCreateAd() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ adsetId, adData }: { adsetId: string; adData: unknown }) => {
      const response = await fetch('/api/facebook/ads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adsetId, adData }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create ad');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch Facebook data
      queryClient.invalidateQueries({ queryKey: ['facebook'] });
    },
  });
}

// Upload media
export function useUploadMedia() {
  return useMutation({
    mutationFn: async ({ file, adAccountId, mediaType }: { 
      file: File; 
      adAccountId: string; 
      mediaType: 'image' | 'video' 
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('adAccountId', adAccountId);
      formData.append('mediaType', mediaType);
      
      const response = await fetch('/api/facebook/media/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload media');
      }
      
      return response.json();
    },
  });
}

// Fetch Facebook pages for an ad account
export function useFacebookPages(adAccountId: string | null) {
  return useQuery<FacebookPagesResponse | null>({
    queryKey: ['facebook', 'pages', adAccountId],
    queryFn: async () => {
      if (!adAccountId) return null;
      
      const response = await fetch(`/api/facebook/pages?adAccountId=${adAccountId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data as FacebookPagesResponse;
    },
    enabled: !!adAccountId,
  });
} 