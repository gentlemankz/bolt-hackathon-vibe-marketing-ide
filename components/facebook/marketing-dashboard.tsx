"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/facebook/dashboard-layout";
import { SidebarExplorer } from "@/components/facebook/sidebar-explorer";
import { ContentView } from "@/components/facebook/content-view";
import { CampaignCreateDialog } from "@/components/facebook/campaign-create-dialog";
import { AdSetCreateDialog } from "@/components/facebook/adset-create-dialog";
import { AdCreateDialog } from "@/components/facebook/ad-create-dialog";
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd, LeadNurturingFile } from "@/lib/types";
import { prefetchCampaigns, prefetchAdSets, prefetchAds, prefetchMetrics } from "@/lib/hooks/use-facebook-data";
import { useAIContext } from "@/lib/hooks/use-ai-context";
import { useTaggedFiles } from "@/lib/hooks/use-tagged-files";
import { TaggedFile } from "@/lib/ai-api-client";

interface MarketingDashboardProps {
  initialAdAccounts: FacebookAdAccount[];
  isChatOpen: boolean;
}

interface MetricsData {
  [key: string]: unknown[] | {
    total_campaigns: number;
    total_adsets: number;
    total_ads: number;
    has_data: boolean;
  };
}

export function MarketingDashboard({ initialAdAccounts, isChatOpen }: MarketingDashboardProps) {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<{
    type: 'account' | 'campaign' | 'adset' | 'ad' | 'lead-nurturing';
    item: FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile;
    parentId?: string;
  } | null>(null);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [adSetDialogOpen, setAdSetDialogOpen] = useState(false);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [selectedAdAccountForCampaign, setSelectedAdAccountForCampaign] = useState<FacebookAdAccount | null>(null);
  const [selectedCampaignForAdSet, setSelectedCampaignForAdSet] = useState<{ id: string; name: string } | null>(null);
  const [selectedAdSetForAd, setSelectedAdSetForAd] = useState<{ id: string; name: string; adAccountId: string } | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Memoized cache getters to prevent unnecessary recalculations
  const getAllCampaignsFromCache = useCallback(() => {
    const allCampaigns: Record<string, FacebookCampaign[]> = {};
    
    initialAdAccounts.forEach(account => {
      const campaignsFromCache = queryClient.getQueryData(['facebook', 'campaigns', account.id]) as FacebookCampaign[] | undefined;
      if (campaignsFromCache && campaignsFromCache.length > 0) {
        allCampaigns[account.id] = campaignsFromCache;
      }
    });
    
    return allCampaigns;
  }, [initialAdAccounts, queryClient]);
  
  const getAllAdSetsFromCache = useCallback(() => {
    const allAdSets: Record<string, FacebookAdSet[]> = {};
    const campaigns = getAllCampaignsFromCache();
    
    Object.values(campaigns).flat().forEach(campaign => {
      const adSetsFromCache = queryClient.getQueryData(['facebook', 'adsets', campaign.id]) as FacebookAdSet[] | undefined;
      if (adSetsFromCache && adSetsFromCache.length > 0) {
        allAdSets[campaign.id] = adSetsFromCache;
      }
    });
    
    return allAdSets;
  }, [getAllCampaignsFromCache, queryClient]);
  
  const getAllAdsFromCache = useCallback(() => {
    const allAds: Record<string, FacebookAd[]> = {};
    const adSets = getAllAdSetsFromCache();
    
    Object.values(adSets).flat().forEach(adSet => {
      const adsFromCache = queryClient.getQueryData(['facebook', 'ads', adSet.id]) as FacebookAd[] | undefined;
      if (adsFromCache && adsFromCache.length > 0) {
        allAds[adSet.id] = adsFromCache;
      }
    });
    
    return allAds;
  }, [getAllAdSetsFromCache, queryClient]);
  
  // Get metrics from cache with reduced logging
  const getAllMetricsFromCache = useCallback((): MetricsData => {
    const metricsData: MetricsData = {};
    
    // Get campaign metrics
    const campaigns = getAllCampaignsFromCache();
    Object.values(campaigns).flat().forEach(campaign => {
      const campaignMetrics = queryClient.getQueryData(['facebook', 'metrics', 'campaign', campaign.id, 30]);
      if (campaignMetrics && Array.isArray(campaignMetrics) && campaignMetrics.length > 0) {
        metricsData[`campaign_${campaign.id}`] = campaignMetrics;
      }
    });
    
    // Get ad set metrics
    const adSets = getAllAdSetsFromCache();
    Object.values(adSets).flat().forEach(adSet => {
      const adSetMetrics = queryClient.getQueryData(['facebook', 'metrics', 'adset', adSet.id, 30]);
      if (adSetMetrics && Array.isArray(adSetMetrics) && adSetMetrics.length > 0) {
        metricsData[`adset_${adSet.id}`] = adSetMetrics;
      }
    });
    
    // Get ad metrics
    const ads = getAllAdsFromCache();
    Object.values(ads).flat().forEach(ad => {
      const adMetrics = queryClient.getQueryData(['facebook', 'metrics', 'ad', ad.id, 30]);
      if (adMetrics && Array.isArray(adMetrics) && adMetrics.length > 0) {
        metricsData[`ad_${ad.id}`] = adMetrics;
      }
    });
    
    // Add summary metrics
    if (Object.keys(metricsData).length > 0) {
      metricsData.summary = {
        total_campaigns: Object.keys(metricsData).filter(k => k.startsWith('campaign_')).length,
        total_adsets: Object.keys(metricsData).filter(k => k.startsWith('adset_')).length,
        total_ads: Object.keys(metricsData).filter(k => k.startsWith('ad_')).length,
        has_data: true
      };
    }
    
    return metricsData;
  }, [getAllCampaignsFromCache, getAllAdSetsFromCache, getAllAdsFromCache, queryClient]);
  
  // Tagged files management
  const { taggedFiles, toggleTaggedFile, isTagged, setTaggedFiles } = useTaggedFiles();

  // Prefetch data for all accounts, campaigns, ad sets, and ads (only once)
  useEffect(() => {
    if (isInitialLoadComplete || initialAdAccounts.length === 0) return;

    const prefetchAllData = async () => {
      console.log('Starting initial data prefetch for', initialAdAccounts.length, 'accounts');
      
      try {
        // Prefetch campaigns for all accounts
        for (const account of initialAdAccounts) {
          await prefetchCampaigns(queryClient, account.id);
          
          // Get campaigns from cache and prefetch ad sets for all campaigns
          const campaignsFromCache = queryClient.getQueryData(['facebook', 'campaigns', account.id]) as FacebookCampaign[] | undefined;
          if (campaignsFromCache && campaignsFromCache.length > 0) {
            for (const campaign of campaignsFromCache) {
              await prefetchAdSets(queryClient, campaign.id);
              await prefetchMetrics(queryClient, 'campaign', campaign.id, 30);
              
              // Get ad sets from cache and prefetch ads for all ad sets
              const adSetsFromCache = queryClient.getQueryData(['facebook', 'adsets', campaign.id]) as FacebookAdSet[] | undefined;
              if (adSetsFromCache && adSetsFromCache.length > 0) {
                for (const adSet of adSetsFromCache) {
                  await prefetchAds(queryClient, adSet.id);
                  await prefetchMetrics(queryClient, 'adset', adSet.id, 30);
                  
                  // Get ads from cache and prefetch metrics for all ads
                  const adsFromCache = queryClient.getQueryData(['facebook', 'ads', adSet.id]) as FacebookAd[] | undefined;
                  if (adsFromCache && adsFromCache.length > 0) {
                    for (const ad of adsFromCache) {
                      await prefetchMetrics(queryClient, 'ad', ad.id, 30);
                    }
                  }
                }
              }
            }
          }
        }
        
        console.log('Initial data prefetch complete');
        setIsInitialLoadComplete(true);
      } catch (error) {
        console.error('Error during initial data prefetch:', error);
        setIsInitialLoadComplete(true); // Set to true even on error to prevent infinite retries
      }
    };

    prefetchAllData();
  }, [initialAdAccounts, queryClient, isInitialLoadComplete]);

  // Handle selection of items
  const handleSelectAdAccount = async (account: FacebookAdAccount) => {
    setSelectedItem({
      type: 'account',
      item: account
    });
    
    // Prefetch campaigns for this account if not already loaded
    const existingCampaigns = queryClient.getQueryData(['facebook', 'campaigns', account.id]);
    if (!existingCampaigns) {
      await prefetchCampaigns(queryClient, account.id);
    }
  };

  const handleSelectCampaign = async (campaign: FacebookCampaign, accountId: string) => {
    setSelectedItem({
      type: 'campaign',
      item: campaign,
      parentId: accountId
    });
    
    // Prefetch ad sets for this campaign if not already loaded
    const existingAdSets = queryClient.getQueryData(['facebook', 'adsets', campaign.id]);
    if (!existingAdSets) {
      await prefetchAdSets(queryClient, campaign.id);
    }
  };

  const handleSelectAdSet = async (adSet: FacebookAdSet, campaignId: string) => {
    setSelectedItem({
      type: 'adset',
      item: adSet,
      parentId: campaignId
    });
    
    // Prefetch ads for this ad set if not already loaded
    const existingAds = queryClient.getQueryData(['facebook', 'ads', adSet.id]);
    if (!existingAds) {
      await prefetchAds(queryClient, adSet.id);
    }
  };

  const handleSelectAd = (ad: FacebookAd, adSetId: string) => {
    setSelectedItem({
      type: 'ad',
      item: ad,
      parentId: adSetId
    });
  };

  const handleSelectLeadNurturingFile = (file: LeadNurturingFile) => {
    setSelectedItem({
      type: 'lead-nurturing',
      item: file
    });
  };

  // Handle campaign creation
  const handleCreateCampaign = (adAccountId: string) => {
    const adAccount = initialAdAccounts.find(account => account.id === adAccountId);
    if (adAccount) {
      setSelectedAdAccountForCampaign(adAccount);
      setCampaignDialogOpen(true);
    }
  };

  // Handle ad set creation
  const handleCreateAdSet = (campaignId: string, campaignName: string) => {
    setSelectedCampaignForAdSet({ id: campaignId, name: campaignName });
    setAdSetDialogOpen(true);
  };

  // Handle ad creation
  const handleCreateAd = (adsetId: string, adsetName: string, adAccountId: string) => {
    setSelectedAdSetForAd({ id: adsetId, name: adsetName, adAccountId });
    setAdDialogOpen(true);
  };

  // Render sidebar content
  const sidebarContent = (
    <SidebarExplorer
      adAccounts={initialAdAccounts}
      onSelectAdAccount={handleSelectAdAccount}
      onSelectCampaign={handleSelectCampaign}
      onSelectAdSet={handleSelectAdSet}
      onSelectAd={handleSelectAd}
      onSelectLeadNurturingFile={handleSelectLeadNurturingFile}
      taggedFiles={taggedFiles}
      onToggleTag={toggleTaggedFile}
      isTagged={isTagged}
      onCreateCampaign={handleCreateCampaign}
      onCreateAdSet={handleCreateAdSet}
      onCreateAd={handleCreateAd}
    />
  );

  // Render main content
  const mainContent = <ContentView selectedItem={selectedItem} />;

  // Generate AI context with current data (memoized and with reduced logging)
  const generateAIContext = useCallback(() => {
    const campaigns = getAllCampaignsFromCache();
    const adSets = getAllAdSetsFromCache();
    const ads = getAllAdsFromCache();
    const metrics = getAllMetricsFromCache();
    
    const contextData = {
      campaigns: Object.values(campaigns).flat() as unknown as Record<string, unknown>[],
      ad_accounts: initialAdAccounts as unknown as Record<string, unknown>[],
      adsets: Object.values(adSets).flat() as unknown as Record<string, unknown>[],
      ads: Object.values(ads).flat() as unknown as Record<string, unknown>[],
      metrics: metrics as Record<string, unknown>,
      selected_items: taggedFiles as unknown as Record<string, unknown>[],
      current_view: 'marketing-dashboard',
      date_range: { period: '30' }
    };
    
    return contextData;
  }, [getAllCampaignsFromCache, getAllAdSetsFromCache, getAllAdsFromCache, getAllMetricsFromCache, initialAdAccounts, taggedFiles]);

  // Stable dependencies for useAIContext
  const stableDependencies = useMemo(() => [
    isInitialLoadComplete,
    taggedFiles.length,
    initialAdAccounts.length
  ], [isInitialLoadComplete, taggedFiles.length, initialAdAccounts.length]);

  // AI Context for chat - only update when data actually changes
  const { context, contextSummary, getAllMentionableItems } = useAIContext({
    generateContext: generateAIContext,
    dependencies: stableDependencies
  });

  // Handle tagging
  const handleTaggedFilesChange = (files: TaggedFile[]) => {
    setTaggedFiles(files);
  };

  return (
    <>
      <DashboardLayout
        sidebarContent={sidebarContent}
        mainContent={mainContent}
        isChatOpen={isChatOpen}
        context={context || undefined}
        taggedFiles={taggedFiles}
        onTaggedFilesChange={handleTaggedFilesChange}
        contextSummary={contextSummary}
        getAllMentionableItems={getAllMentionableItems}
      />
      
      {/* Campaign Creation Dialog */}
      {selectedAdAccountForCampaign && (
        <CampaignCreateDialog
          open={campaignDialogOpen}
          onOpenChange={setCampaignDialogOpen}
          adAccountId={selectedAdAccountForCampaign.id}
          adAccountName={selectedAdAccountForCampaign.name}
        />
      )}
      
      {/* Ad Set Creation Dialog */}
      {selectedCampaignForAdSet && (
        <AdSetCreateDialog
          open={adSetDialogOpen}
          onOpenChange={setAdSetDialogOpen}
          campaignId={selectedCampaignForAdSet.id}
          campaignName={selectedCampaignForAdSet.name}
        />
      )}
      
      {/* Ad Creation Dialog */}
      {selectedAdSetForAd && (
        <AdCreateDialog
          open={adDialogOpen}
          onOpenChange={setAdDialogOpen}
          adsetId={selectedAdSetForAd.id}
          adsetName={selectedAdSetForAd.name}
          adAccountId={selectedAdSetForAd.adAccountId}
        />
      )}
    </>
  );
} 