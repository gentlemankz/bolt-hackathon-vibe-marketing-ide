"use client";

import { useState, useEffect } from "react";
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
  const [selectedItem, setSelectedItem] = useState<{
    type: 'account' | 'campaign' | 'adset' | 'ad' | 'lead-nurturing';
    item: FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile;
    parentId?: string;
  } | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [selectedAdAccountForCampaign, setSelectedAdAccountForCampaign] = useState<FacebookAdAccount | null>(null);
  const [adSetDialogOpen, setAdSetDialogOpen] = useState(false);
  const [selectedCampaignForAdSet, setSelectedCampaignForAdSet] = useState<{ id: string; name: string } | null>(null);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [selectedAdSetForAd, setSelectedAdSetForAd] = useState<{ id: string; name: string; adAccountId: string } | null>(null);
  
  const queryClient = useQueryClient();
  
  // Get all campaigns for all ad accounts from React Query cache
  const getAllCampaignsFromCache = () => {
    const campaignsMap: Record<string, FacebookCampaign[]> = {};
    
    initialAdAccounts.forEach(account => {
      const campaignsData = queryClient.getQueryData(['facebook', 'campaigns', account.id]) as FacebookCampaign[] | undefined;
      if (campaignsData) {
        campaignsMap[account.id] = campaignsData;
      }
    });
    
    return campaignsMap;
  };
  
  // Get all ad sets from cache for all campaigns
  const getAllAdSetsFromCache = () => {
    const allAdSets: Record<string, FacebookAdSet[]> = {};
    
    // Get all campaigns first
    const allCampaigns = getAllCampaignsFromCache();
    
    // For each campaign, get its ad sets from cache
    Object.values(allCampaigns).flat().forEach(campaign => {
      const adSetsFromCache = queryClient.getQueryData(['facebook', 'adsets', campaign.id]) as FacebookAdSet[] | undefined;
      if (adSetsFromCache && adSetsFromCache.length > 0) {
        allAdSets[campaign.id] = adSetsFromCache;
      }
    });
    
    return allAdSets;
  };
  
  // Get all ads from cache for all ad sets
  const getAllAdsFromCache = () => {
    const allAds: Record<string, FacebookAd[]> = {};
    
    // Get all ad sets first
    const allAdSets = getAllAdSetsFromCache();
    
    // For each ad set, get its ads from cache
    Object.values(allAdSets).flat().forEach(adSet => {
      const adsFromCache = queryClient.getQueryData(['facebook', 'ads', adSet.id]) as FacebookAd[] | undefined;
      if (adsFromCache && adsFromCache.length > 0) {
        allAds[adSet.id] = adsFromCache;
      }
    });
    
    return allAds;
  };
  
  // Get metrics from cache
  const getAllMetricsFromCache = (): MetricsData => {
    const metricsData: MetricsData = {};
    console.log('Collecting metrics from cache...');
    
    // Get campaign metrics
    const campaigns = getAllCampaignsFromCache();
    console.log('Found campaigns:', Object.keys(campaigns).length, 'accounts with campaigns');
    Object.values(campaigns).flat().forEach(campaign => {
      const campaignMetrics = queryClient.getQueryData(['facebook', 'metrics', 'campaign', campaign.id, 30]);
      console.log(`Campaign ${campaign.name} metrics:`, campaignMetrics ? 'found' : 'not found');
      if (campaignMetrics && Array.isArray(campaignMetrics) && campaignMetrics.length > 0) {
        metricsData[`campaign_${campaign.id}`] = campaignMetrics;
      }
    });
    
    // Get ad set metrics
    const adSets = getAllAdSetsFromCache();
    console.log('Found ad sets:', Object.keys(adSets).length, 'campaigns with ad sets');
    Object.values(adSets).flat().forEach(adSet => {
      const adSetMetrics = queryClient.getQueryData(['facebook', 'metrics', 'adset', adSet.id, 30]);
      console.log(`Ad set ${adSet.name} metrics:`, adSetMetrics ? 'found' : 'not found');
      if (adSetMetrics && Array.isArray(adSetMetrics) && adSetMetrics.length > 0) {
        metricsData[`adset_${adSet.id}`] = adSetMetrics;
      }
    });
    
    // Get ad metrics
    const ads = getAllAdsFromCache();
    console.log('Found ads:', Object.keys(ads).length, 'ad sets with ads');
    Object.values(ads).flat().forEach(ad => {
      const adMetrics = queryClient.getQueryData(['facebook', 'metrics', 'ad', ad.id, 30]);
      console.log(`Ad ${ad.name} metrics:`, adMetrics ? 'found' : 'not found');
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
    
    console.log('Final metrics data:', metricsData);
    return metricsData;
  };
  
  // Tagged files management
  const { taggedFiles, toggleTaggedFile, isTagged, setTaggedFiles } = useTaggedFiles();

  // Prefetch data for all accounts, campaigns, ad sets, and ads
  useEffect(() => {
    const prefetchAllData = async () => {
      if (initialAdAccounts.length > 0) {
        console.log('Starting prefetch for', initialAdAccounts.length, 'accounts');
        
        // Prefetch campaigns for all accounts
        for (const account of initialAdAccounts) {
          console.log('Prefetching campaigns for account:', account.name);
          await prefetchCampaigns(queryClient, account.id);
          
          // Get campaigns from cache and prefetch ad sets for all campaigns
          const campaignsFromCache = queryClient.getQueryData(['facebook', 'campaigns', account.id]) as FacebookCampaign[] | undefined;
          if (campaignsFromCache && campaignsFromCache.length > 0) {
            console.log('Found', campaignsFromCache.length, 'campaigns for account:', account.name);
            
            for (const campaign of campaignsFromCache) {
              console.log('Prefetching ad sets for campaign:', campaign.name);
              await prefetchAdSets(queryClient, campaign.id);
              // Prefetch campaign metrics
              await prefetchMetrics(queryClient, 'campaign', campaign.id, 30);
              
              // Get ad sets from cache and prefetch ads for all ad sets
              const adSetsFromCache = queryClient.getQueryData(['facebook', 'adsets', campaign.id]) as FacebookAdSet[] | undefined;
              if (adSetsFromCache && adSetsFromCache.length > 0) {
                console.log('Found', adSetsFromCache.length, 'ad sets for campaign:', campaign.name);
                
                for (const adSet of adSetsFromCache) {
                  console.log('Prefetching ads for ad set:', adSet.name);
                  await prefetchAds(queryClient, adSet.id);
                  // Prefetch ad set metrics
                  await prefetchMetrics(queryClient, 'adset', adSet.id, 30);
                  
                  // Get ads from cache and prefetch metrics for all ads
                  const adsFromCache = queryClient.getQueryData(['facebook', 'ads', adSet.id]) as FacebookAd[] | undefined;
                  if (adsFromCache && adsFromCache.length > 0) {
                    console.log('Found', adsFromCache.length, 'ads for ad set:', adSet.name);
                    
                    for (const ad of adsFromCache) {
                      console.log('Prefetching metrics for ad:', ad.name);
                      // Prefetch ad metrics
                      await prefetchMetrics(queryClient, 'ad', ad.id, 30);
                    }
                  }
                }
              }
            }
          }
        }
        
        console.log('Prefetch complete, waiting 2 seconds before triggering re-render...');
        // Add a delay to ensure all data is loaded
        setTimeout(() => {
          setForceUpdate(prev => prev + 1);
          console.log('Force update triggered');
        }, 2000);
      }
    };
    
    prefetchAllData();
  }, [initialAdAccounts, queryClient]);

  // Handle selection of items
  const handleSelectAdAccount = async (account: FacebookAdAccount) => {
    setSelectedItem({
      type: 'account',
      item: account
    });
    
    // Prefetch campaigns for this account
    await prefetchCampaigns(queryClient, account.id);
    setForceUpdate(prev => prev + 1); // Trigger re-render
  };

  const handleSelectCampaign = async (campaign: FacebookCampaign, accountId: string) => {
    setSelectedItem({
      type: 'campaign',
      item: campaign,
      parentId: accountId
    });
    
    // Prefetch ad sets for this campaign
    await prefetchAdSets(queryClient, campaign.id);
    setForceUpdate(prev => prev + 1); // Trigger re-render
  };

  const handleSelectAdSet = async (adSet: FacebookAdSet, campaignId: string) => {
    setSelectedItem({
      type: 'adset',
      item: adSet,
      parentId: campaignId
    });
    
    // Prefetch ads for this ad set
    await prefetchAds(queryClient, adSet.id);
    setForceUpdate(prev => prev + 1); // Trigger re-render
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

  // Generate AI context with current data
  const generateAIContext = () => {
    const campaigns = getAllCampaignsFromCache();
    const adSets = getAllAdSetsFromCache();
    const ads = getAllAdsFromCache();
    const metrics = getAllMetricsFromCache();
    
    // Debug logging
    console.log('=== AI Context Generation ===');
    console.log('Campaigns:', Object.keys(campaigns).length, 'accounts');
    Object.entries(campaigns).forEach(([accountId, campaignList]) => {
      console.log(`  Account ${accountId}: ${campaignList.length} campaigns`);
    });
    
    console.log('Ad Sets:', Object.keys(adSets).length, 'campaigns');
    Object.entries(adSets).forEach(([campaignId, adSetList]) => {
      console.log(`  Campaign ${campaignId}: ${adSetList.length} ad sets`);
    });
    
    console.log('Ads:', Object.keys(ads).length, 'ad sets');
    Object.entries(ads).forEach(([adSetId, adList]) => {
      console.log(`  Ad Set ${adSetId}: ${adList.length} ads`);
    });
    
    console.log('Metrics keys:', Object.keys(metrics));
    
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
    
    console.log('Final context data structure:', {
      campaigns: contextData.campaigns.length,
      ad_accounts: contextData.ad_accounts.length,
      adsets: contextData.adsets.length,
      ads: contextData.ads.length,
      metrics_keys: Object.keys(contextData.metrics).length
    });
    console.log('=== End AI Context ===');
    
    return contextData;
  };

  // AI Context for chat
  const { context, contextSummary, getAllMentionableItems } = useAIContext({
    generateContext: generateAIContext,
    dependencies: [initialAdAccounts, forceUpdate, taggedFiles]
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