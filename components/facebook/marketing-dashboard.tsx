"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, X } from 'lucide-react';
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd, LeadNurturingFile } from '@/lib/types';
import { DashboardLayout } from '@/components/facebook/dashboard-layout';
import { FacebookAdAccounts } from '@/components/facebook/ad-accounts';
import { ContentView } from '@/components/facebook/content-view';
import { CampaignCreateDialog } from '@/components/facebook/campaign-create-dialog';
import { AdSetCreateDialog } from '@/components/facebook/adset-create-dialog';
import { AdCreateDialog } from '@/components/facebook/ad-create-dialog';
import { useTaggedFiles } from '@/lib/hooks/use-tagged-files';
import { useAIContext } from '@/lib/hooks/use-ai-context';
import { ContextData, TaggedFile } from '@/lib/ai-api-client';
import {
  useFacebookCampaigns,
  useFacebookAdSets,
  useFacebookAds,
  prefetchCampaigns,
  prefetchAdSets,
  prefetchAds
} from '@/lib/hooks/use-facebook-data';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface MarketingDashboardProps {
  initialAdAccounts: FacebookAdAccount[];
  isChatOpen: boolean;
}

interface MetricsData {
  campaigns: Record<string, any>;
  adSets: Record<string, any>;
  ads: Record<string, any>;
  summary: Record<string, any>;
}

type SelectedItem = FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile | null;

interface CacheData {
  campaigns: Record<string, FacebookCampaign[]>;
  adSets: Record<string, FacebookAdSet[]>;
  ads: Record<string, FacebookAd[]>;
  lastUpdated: Record<string, number>;
}

// ============================================================================
// Main Component
// ============================================================================

export function MarketingDashboard({ initialAdAccounts, isChatOpen }: MarketingDashboardProps) {
  console.log('🚀 MarketingDashboard: Initializing with', initialAdAccounts.length, 'ad accounts');

  // ============================================================================
  // State Management
  // ============================================================================

  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [selectedAdAccount, setSelectedAdAccount] = useState<FacebookAdAccount | null>(
    initialAdAccounts.length > 0 ? initialAdAccounts[0] : null
  );
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>(initialAdAccounts);
  const [cache, setCache] = useState<CacheData>({
    campaigns: {},
    adSets: {},
    ads: {},
    lastUpdated: {}
  });
  const [metricsData, setMetricsData] = useState<MetricsData>({
    campaigns: {},
    adSets: {},
    ads: {},
    summary: {}
  });
  const [timeRange, setTimeRange] = useState('30');
  const [currentView, setCurrentView] = useState('ad-accounts-overview');

  // Dialog states
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [adSetDialogOpen, setAdSetDialogOpen] = useState(false);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [selectedCampaignForAdSet, setSelectedCampaignForAdSet] = useState<FacebookCampaign | null>(null);
  const [selectedAdSetForAd, setSelectedAdSetForAd] = useState<FacebookAdSet | null>(null);

  // ============================================================================
  // Hooks
  // ============================================================================

  const queryClient = useQueryClient();
  const {
    taggedFiles,
    setTaggedFiles,
    addTaggedFile,
    removeTaggedFile,
    isTagged,
    toggleTaggedFile
  } = useTaggedFiles();

  // Data fetching hooks
  const { data: campaignsData } = useFacebookCampaigns(selectedAdAccount?.id || null);
  const { data: adSetsData } = useFacebookAdSets(selectedCampaignForAdSet?.id || null);
  const { data: adsData } = useFacebookAds(selectedAdSetForAd?.id || null);

  // ============================================================================
  // Cache Management Functions
  // ============================================================================

  const updateCache = useCallback((key: string, data: any, type: 'campaigns' | 'adSets' | 'ads') => {
    console.log(`📦 MarketingDashboard: Updating cache for ${type}:`, key);
    setCache(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: data
      },
      lastUpdated: {
        ...prev.lastUpdated,
        [`${type}_${key}`]: Date.now()
      }
    }));
  }, []);

  const getCachedData = useCallback((key: string, type: 'campaigns' | 'adSets' | 'ads') => {
    const data = cache[type][key];
    const lastUpdated = cache.lastUpdated[`${type}_${key}`];
    const isStale = !lastUpdated || (Date.now() - lastUpdated) > 5 * 60 * 1000; // 5 minutes
    
    console.log(`📦 MarketingDashboard: Cache check for ${type}:${key}`, {
      hasData: !!data,
      isStale,
      lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : 'never'
    });
    
    return isStale ? null : data;
  }, [cache]);

  const invalidateCache = useCallback((key?: string, type?: 'campaigns' | 'adSets' | 'ads') => {
    console.log('🗑️ MarketingDashboard: Invalidating cache', { key, type });
    if (key && type) {
      setCache(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [key]: undefined
        },
        lastUpdated: {
          ...prev.lastUpdated,
          [`${type}_${key}`]: 0
        }
      }));
    } else {
      // Clear all cache
      setCache({
        campaigns: {},
        adSets: {},
        ads: {},
        lastUpdated: {}
      });
    }
  }, []);

  // ============================================================================
  // Data Prefetching and Management
  // ============================================================================

  useEffect(() => {
    const prefetchData = async () => {
      if (!selectedAdAccount) return;

      console.log('🔄 MarketingDashboard: Prefetching data for account:', selectedAdAccount.id);

      try {
        // Check cache first
        const cachedCampaigns = getCachedData(selectedAdAccount.id, 'campaigns');
        if (!cachedCampaigns) {
          console.log('📡 MarketingDashboard: Prefetching campaigns for account:', selectedAdAccount.id);
          await prefetchCampaigns(queryClient, selectedAdAccount.id);
        }

        // Prefetch campaigns data
        if (campaignsData && campaignsData.length > 0) {
          updateCache(selectedAdAccount.id, campaignsData, 'campaigns');

          // Prefetch ad sets for each campaign
          for (const campaign of campaignsData.slice(0, 3)) { // Limit to first 3 campaigns
            const cachedAdSets = getCachedData(campaign.id, 'adSets');
            if (!cachedAdSets) {
              console.log('📡 MarketingDashboard: Prefetching ad sets for campaign:', campaign.id);
              await prefetchAdSets(queryClient, campaign.id);
            }
          }
        }
      } catch (error) {
        console.error('❌ MarketingDashboard: Error prefetching data:', error);
      }
    };

    prefetchData();
  }, [selectedAdAccount, campaignsData, queryClient, getCachedData, updateCache]);

  // ============================================================================
  // Selection Handlers
  // ============================================================================

  const handleItemSelect = useCallback((item: SelectedItem) => {
    console.log('🎯 MarketingDashboard: Item selected:', item);
    setSelectedItem(item);

    // Update current view based on selection
    if (!item) {
      setCurrentView('ad-accounts-overview');
    } else if ('account_id' in item) {
      setCurrentView(`account-${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    } else if ('ad_account_id' in item) {
      setCurrentView(`campaign-${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    } else if ('campaign_id' in item) {
      setCurrentView(`adset-${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    } else if ('ad_set_id' in item) {
      setCurrentView(`ad-${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    } else if ('type' in item && item.type === 'follow-up') {
      setCurrentView('lead-nurturing');
    }
  }, []);

  const handleAdAccountSelect = useCallback((account: FacebookAdAccount) => {
    console.log('🏢 MarketingDashboard: Ad account selected:', account.id);
    setSelectedAdAccount(account);
    setSelectedItem(account);
    invalidateCache(); // Clear cache when switching accounts
  }, [invalidateCache]);

  // ============================================================================
  // Dialog Handlers
  // ============================================================================

  const handleCreateCampaign = useCallback(() => {
    console.log('➕ MarketingDashboard: Opening campaign creation dialog');
    setCampaignDialogOpen(true);
  }, []);

  const handleCreateAdSet = useCallback((campaign: FacebookCampaign) => {
    console.log('➕ MarketingDashboard: Opening ad set creation dialog for campaign:', campaign.id);
    setSelectedCampaignForAdSet(campaign);
    setAdSetDialogOpen(true);
  }, []);

  const handleCreateAd = useCallback((adSet: FacebookAdSet) => {
    console.log('➕ MarketingDashboard: Opening ad creation dialog for ad set:', adSet.id);
    setSelectedAdSetForAd(adSet);
    setAdDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((type: 'campaign' | 'adset' | 'ad') => {
    console.log(`🔒 MarketingDashboard: Closing ${type} dialog`);
    switch (type) {
      case 'campaign':
        setCampaignDialogOpen(false);
        break;
      case 'adset':
        setAdSetDialogOpen(false);
        setSelectedCampaignForAdSet(null);
        break;
      case 'ad':
        setAdDialogOpen(false);
        setSelectedAdSetForAd(null);
        break;
    }
  }, []);

  // ============================================================================
  // Metrics Collection
  // ============================================================================

  const collectMetricsData = useCallback(() => {
    console.log('📊 MarketingDashboard: Collecting metrics data');
    
    const campaigns = cache.campaigns[selectedAdAccount?.id || ''] || [];
    const allAdSets: FacebookAdSet[] = [];
    const allAds: FacebookAd[] = [];

    // Collect all ad sets and ads
    campaigns.forEach(campaign => {
      const campaignAdSets = cache.adSets[campaign.id] || [];
      allAdSets.push(...campaignAdSets);
      
      campaignAdSets.forEach(adSet => {
        const adSetAds = cache.ads[adSet.id] || [];
        allAds.push(...adSetAds);
      });
    });

    const metrics = {
      campaigns: campaigns.reduce((acc, campaign) => {
        acc[campaign.id] = {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          daily_budget: campaign.daily_budget,
          lifetime_budget: campaign.lifetime_budget
        };
        return acc;
      }, {} as Record<string, any>),
      adSets: allAdSets.reduce((acc, adSet) => {
        acc[adSet.id] = {
          id: adSet.id,
          name: adSet.name,
          status: adSet.status,
          campaign_id: adSet.campaign_id,
          optimization_goal: adSet.optimization_goal,
          billing_event: adSet.billing_event
        };
        return acc;
      }, {} as Record<string, any>),
      ads: allAds.reduce((acc, ad) => {
        acc[ad.id] = {
          id: ad.id,
          name: ad.name,
          status: ad.status,
          ad_set_id: ad.ad_set_id,
          campaign_id: ad.campaign_id
        };
        return acc;
      }, {} as Record<string, any>),
      summary: {
        total_campaigns: campaigns.length,
        total_adsets: allAdSets.length,
        total_ads: allAds.length,
        active_campaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
        active_adsets: allAdSets.filter(a => a.status === 'ACTIVE').length,
        active_ads: allAds.filter(a => a.status === 'ACTIVE').length
      }
    };

    console.log('📊 MarketingDashboard: Metrics collected:', {
      campaigns: Object.keys(metrics.campaigns).length,
      adSets: Object.keys(metrics.adSets).length,
      ads: Object.keys(metrics.ads).length,
      summary: metrics.summary
    });

    setMetricsData(metrics);
    return metrics;
  }, [cache, selectedAdAccount]);

  // ============================================================================
  // AI Context Generation
  // ============================================================================

  const generateContext = useCallback((): ContextData => {
    console.log('🤖 MarketingDashboard: Generating AI context');
    
    const campaigns = cache.campaigns[selectedAdAccount?.id || ''] || [];
    const allAdSets: FacebookAdSet[] = [];
    const allAds: FacebookAd[] = [];

    // Flatten all data
    campaigns.forEach(campaign => {
      const campaignAdSets = cache.adSets[campaign.id] || [];
      allAdSets.push(...campaignAdSets);
      
      campaignAdSets.forEach(adSet => {
        const adSetAds = cache.ads[adSet.id] || [];
        allAds.push(...adSetAds);
      });
    });

    const context: ContextData = {
      campaigns: campaigns,
      adsets: allAdSets,
      ads: allAds,
      ad_accounts: adAccounts,
      metrics: collectMetricsData(),
      selected_items: selectedItem ? [selectedItem] : [],
      current_view: currentView,
      date_range: {
        days: timeRange
      }
    };

    console.log('🤖 MarketingDashboard: Context generated:', {
      campaigns: context.campaigns?.length || 0,
      adsets: context.adsets?.length || 0,
      ads: context.ads?.length || 0,
      ad_accounts: context.ad_accounts?.length || 0,
      selected_items: context.selected_items?.length || 0,
      current_view: context.current_view
    });

    return context;
  }, [cache, selectedAdAccount, adAccounts, selectedItem, currentView, timeRange, collectMetricsData]);

  const { contextData, contextSummary, getAllMentionableItems } = useAIContext({
    generateContext,
    dependencies: [cache, selectedAdAccount, selectedItem, currentView, timeRange]
  });

  // ============================================================================
  // Lead Nurturing Integration
  // ============================================================================

  const leadNurturingFile: LeadNurturingFile = useMemo(() => ({
    id: 'lead-nurturing-1',
    name: 'Lead Follow-up Sequences',
    user_id: 'current-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    type: 'follow-up'
  }), []);

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderSidebarContent = () => (
    <div className="space-y-4">
      {/* Ad Accounts Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Ad Accounts</h3>
          {selectedAdAccount && (
            <Button
              size="sm"
              onClick={handleCreateCampaign}
              className="h-6 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Campaign
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {adAccounts.map((account) => (
            <div
              key={account.id}
              className={`p-2 rounded cursor-pointer text-sm transition-colors ${
                selectedAdAccount?.id === account.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              onClick={() => handleAdAccountSelect(account)}
            >
              <div className="font-medium truncate">{account.name}</div>
              <div className="text-xs opacity-70">{account.currency}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaigns Section */}
      {selectedAdAccount && campaignsData && campaignsData.length > 0 && (
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Campaigns</h3>
            <span className="text-xs text-muted-foreground">
              {campaignsData.length}
            </span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {campaignsData.slice(0, 10).map((campaign) => (
              <div
                key={campaign.id}
                className={`p-2 rounded cursor-pointer text-xs transition-colors ${
                  selectedItem && 'id' in selectedItem && selectedItem.id === campaign.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleItemSelect(campaign)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{campaign.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateAdSet(campaign);
                      }}
                      className="h-4 w-4 p-0"
                    >
                      <Plus className="h-2 w-2" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaggedFile(campaign.id, campaign.name, 'campaign', campaign, {
                          adAccountId: selectedAdAccount.id
                        });
                      }}
                      className={`h-4 w-4 p-0 ${
                        isTagged(campaign.id, 'campaign') ? 'text-primary' : ''
                      }`}
                    >
                      <MessageSquare className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs opacity-70">{campaign.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Nurturing Section */}
      <div className="p-4 border-t">
        <h3 className="text-sm font-semibold mb-3">Lead Nurturing</h3>
        <div
          className={`p-2 rounded cursor-pointer text-sm transition-colors ${
            selectedItem && 'type' in selectedItem && selectedItem.type === 'follow-up'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
          onClick={() => handleItemSelect(leadNurturingFile)}
        >
          <div className="font-medium">Follow-up Sequences</div>
          <div className="text-xs opacity-70">AI Avatar Creation</div>
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => (
    <div className="flex-1 overflow-hidden">
      {selectedItem ? (
        <div className="h-full overflow-y-auto p-6">
          <ContentView selectedItem={selectedItem} />
        </div>
      ) : (
        <div className="h-full overflow-y-auto">
          <FacebookAdAccounts 
            initialAdAccounts={adAccounts}
            onItemSelect={handleItemSelect}
            onCreateCampaign={handleCreateCampaign}
            onCreateAdSet={handleCreateAdSet}
            onCreateAd={handleCreateAd}
          />
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  console.log('🎨 MarketingDashboard: Rendering with state:', {
    selectedAdAccount: selectedAdAccount?.name,
    selectedItem: selectedItem ? ('name' in selectedItem ? selectedItem.name : selectedItem.id) : null,
    campaignsCount: campaignsData?.length || 0,
    taggedFilesCount: taggedFiles.length,
    isChatOpen
  });

  return (
    <>
      <DashboardLayout
        sidebarContent={renderSidebarContent()}
        mainContent={renderMainContent()}
        isChatOpen={isChatOpen}
        context={contextData}
        taggedFiles={taggedFiles}
        onTaggedFilesChange={setTaggedFiles}
        contextSummary={contextSummary}
        getAllMentionableItems={getAllMentionableItems}
      />

      {/* Campaign Creation Dialog */}
      {selectedAdAccount && (
        <CampaignCreateDialog
          open={campaignDialogOpen}
          onOpenChange={(open) => !open && handleDialogClose('campaign')}
          adAccountId={selectedAdAccount.id}
          adAccountName={selectedAdAccount.name}
        />
      )}

      {/* Ad Set Creation Dialog */}
      {selectedCampaignForAdSet && (
        <AdSetCreateDialog
          open={adSetDialogOpen}
          onOpenChange={(open) => !open && handleDialogClose('adset')}
          campaignId={selectedCampaignForAdSet.id}
          campaignName={selectedCampaignForAdSet.name}
        />
      )}

      {/* Ad Creation Dialog */}
      {selectedAdSetForAd && selectedAdAccount && (
        <AdCreateDialog
          open={adDialogOpen}
          onOpenChange={(open) => !open && handleDialogClose('ad')}
          adsetId={selectedAdSetForAd.id}
          adsetName={selectedAdSetForAd.name}
          adAccountId={selectedAdAccount.id}
        />
      )}
    </>
  );
}