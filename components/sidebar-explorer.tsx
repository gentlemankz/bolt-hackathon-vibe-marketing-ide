"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronDown, 
  Facebook, 
  Target, 
  Users, 
  MousePointer, 
  Plus, 
  MessageSquare,
  Loader2,
  Building2,
  Zap
} from 'lucide-react';
import { 
  FacebookAdAccount, 
  FacebookCampaign, 
  FacebookAdSet, 
  FacebookAd, 
  LeadNurturingFile 
} from '@/lib/types';
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

type TaggableData = FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile;

interface SidebarExplorerProps {
  adAccounts: FacebookAdAccount[];
  selectedItem: TaggableData | null;
  onItemSelect: (item: TaggableData | null) => void;
  onCreateCampaign?: (adAccountId: string) => void;
  onCreateAdSet?: (campaign: FacebookCampaign) => void;
  onCreateAd?: (adSet: FacebookAdSet) => void;
  isTagged: (id: string, type: string) => boolean;
  onToggleTag: (id: string, name: string, type: string, data: TaggableData, metadata?: Record<string, unknown>) => void;
}

// ============================================================================
// Lead Nurturing Files Data
// ============================================================================

const leadNurturingFiles: LeadNurturingFile[] = [
  {
    id: 'lead-nurturing-1',
    name: 'Follow-up Sequences',
    user_id: 'current-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    type: 'follow-up'
  }
];

// ============================================================================
// Utility Functions
// ============================================================================

const getStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'PAUSED':
      return 'bg-yellow-100 text-yellow-800';
    case 'DELETED':
    case 'ARCHIVED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// ============================================================================
// Main Component
// ============================================================================

export function SidebarExplorer({
  adAccounts,
  selectedItem,
  onItemSelect,
  onCreateCampaign,
  onCreateAdSet,
  onCreateAd,
  isTagged,
  onToggleTag
}: SidebarExplorerProps) {
  console.log('🔍 SidebarExplorer: Rendering with', adAccounts.length, 'ad accounts');

  // ============================================================================
  // State Management
  // ============================================================================

  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [activeAccountId, setActiveAccountId] = useState<string | null>(
    adAccounts.length > 0 ? adAccounts[0].id : null
  );
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeAdSetId, setActiveAdSetId] = useState<string | null>(null);
  const [leadNurturingExpanded, setLeadNurturingExpanded] = useState(false);

  // ============================================================================
  // Hooks
  // ============================================================================

  const queryClient = useQueryClient();

  // Data fetching hooks
  const { data: campaignsData, isLoading: campaignsLoading } = useFacebookCampaigns(activeAccountId);
  const { data: adSetsData, isLoading: adSetsLoading } = useFacebookAdSets(activeCampaignId);
  const { data: adsData, isLoading: adsLoading } = useFacebookAds(activeAdSetId);

  // ============================================================================
  // Prefetching Logic
  // ============================================================================

  useEffect(() => {
    const prefetchData = async () => {
      // Prefetch campaigns for expanded accounts
      for (const accountId of Array.from(expandedAccounts)) {
        console.log('🔄 SidebarExplorer: Prefetching campaigns for account:', accountId);
        await prefetchCampaigns(queryClient, accountId);
      }

      // Prefetch ad sets for expanded campaigns
      for (const campaignId of Array.from(expandedCampaigns)) {
        console.log('🔄 SidebarExplorer: Prefetching ad sets for campaign:', campaignId);
        await prefetchAdSets(queryClient, campaignId);
      }

      // Prefetch ads for expanded ad sets
      for (const adSetId of Array.from(expandedAdSets)) {
        console.log('🔄 SidebarExplorer: Prefetching ads for ad set:', adSetId);
        await prefetchAds(queryClient, adSetId);
      }
    };

    prefetchData();
  }, [expandedAccounts, expandedCampaigns, expandedAdSets, queryClient]);

  // ============================================================================
  // Toggle Handlers
  // ============================================================================

  const toggleAccount = useCallback((accountId: string) => {
    console.log('🔄 SidebarExplorer: Toggling account:', accountId);
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
        // Clear active account if collapsing
        if (activeAccountId === accountId) {
          setActiveAccountId(null);
        }
      } else {
        newSet.add(accountId);
        setActiveAccountId(accountId);
      }
      return newSet;
    });
  }, [activeAccountId]);

  const toggleCampaign = useCallback((campaignId: string) => {
    console.log('🔄 SidebarExplorer: Toggling campaign:', campaignId);
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
        // Clear active campaign if collapsing
        if (activeCampaignId === campaignId) {
          setActiveCampaignId(null);
        }
      } else {
        newSet.add(campaignId);
        setActiveCampaignId(campaignId);
      }
      return newSet;
    });
  }, [activeCampaignId]);

  const toggleAdSet = useCallback((adSetId: string) => {
    console.log('🔄 SidebarExplorer: Toggling ad set:', adSetId);
    setExpandedAdSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(adSetId)) {
        newSet.delete(adSetId);
        // Clear active ad set if collapsing
        if (activeAdSetId === adSetId) {
          setActiveAdSetId(null);
        }
      } else {
        newSet.add(adSetId);
        setActiveAdSetId(adSetId);
      }
      return newSet;
    });
  }, [activeAdSetId]);

  const toggleLeadNurturing = useCallback(() => {
    console.log('🔄 SidebarExplorer: Toggling lead nurturing');
    setLeadNurturingExpanded(prev => !prev);
  }, []);

  // ============================================================================
  // Selection Handlers
  // ============================================================================

  const handleItemClick = useCallback((item: TaggableData) => {
    console.log('🎯 SidebarExplorer: Item selected:', item);
    onItemSelect(item);
  }, [onItemSelect]);

  const handleTagToggle = useCallback((
    id: string,
    name: string,
    type: string,
    data: TaggableData,
    metadata?: Record<string, unknown>
  ) => {
    console.log('🏷️ SidebarExplorer: Toggling tag for:', type, id);
    onToggleTag(id, name, type, data, metadata);
  }, [onToggleTag]);

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderAdAccounts = () => (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Facebook Ad Accounts</h3>
        <Badge variant="outline" className="text-xs">
          {adAccounts.length}
        </Badge>
      </div>

      {adAccounts.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No ad accounts connected</p>
        </div>
      ) : (
        adAccounts.map((account) => (
          <div key={account.id} className="space-y-1">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                selectedItem && 'id' in selectedItem && selectedItem.id === account.id
                  ? 'bg-primary text-primary-foreground'
                  : ''
              }`}
              onClick={() => handleItemClick(account)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAccount(account.id);
                }}
              >
                {expandedAccounts.has(account.id) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
              
              <Facebook className="h-4 w-4 text-blue-600" />
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{account.name}</div>
                <div className="text-xs text-muted-foreground">{account.currency}</div>
              </div>

              <div className="flex items-center gap-1">
                {onCreateCampaign && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateCampaign(account.id);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${
                    isTagged(account.id, 'account') ? 'text-primary' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTagToggle(account.id, account.name, 'account', account);
                  }}
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {expandedAccounts.has(account.id) && renderCampaigns(account.id)}
          </div>
        ))
      )}
    </div>
  );

  const renderCampaigns = (accountId: string) => {
    const campaigns = activeAccountId === accountId ? campaignsData : [];
    const loading = activeAccountId === accountId && campaignsLoading;

    return (
      <div className="ml-6 space-y-1">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Loading campaigns...</span>
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <div key={campaign.id} className="space-y-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                  selectedItem && 'id' in selectedItem && selectedItem.id === campaign.id
                    ? 'bg-primary text-primary-foreground'
                    : ''
                }`}
                onClick={() => handleItemClick(campaign)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCampaign(campaign.id);
                  }}
                >
                  {expandedCampaigns.has(campaign.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
                
                <Target className="h-4 w-4 text-green-600" />
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{campaign.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onCreateAdSet && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateAdSet(campaign);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 ${
                      isTagged(campaign.id, 'campaign') ? 'text-primary' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagToggle(campaign.id, campaign.name, 'campaign', campaign, {
                        adAccountId: accountId
                      });
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {expandedCampaigns.has(campaign.id) && renderAdSets(campaign.id)}
            </div>
          ))
        ) : (
          <div className="px-3 py-2 text-center">
            <Target className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">No campaigns found</p>
          </div>
        )}
      </div>
    );
  };

  const renderAdSets = (campaignId: string) => {
    const adSets = activeCampaignId === campaignId ? adSetsData : [];
    const loading = activeCampaignId === campaignId && adSetsLoading;

    return (
      <div className="ml-6 space-y-1">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Loading ad sets...</span>
          </div>
        ) : adSets && adSets.length > 0 ? (
          adSets.map((adSet) => (
            <div key={adSet.id} className="space-y-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                  selectedItem && 'id' in selectedItem && selectedItem.id === adSet.id
                    ? 'bg-primary text-primary-foreground'
                    : ''
                }`}
                onClick={() => handleItemClick(adSet)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAdSet(adSet.id);
                  }}
                >
                  {expandedAdSets.has(adSet.id) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
                
                <Users className="h-4 w-4 text-purple-600" />
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{adSet.name}</div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getStatusColor(adSet.status)}`}>
                      {adSet.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {onCreateAd && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateAd(adSet);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 ${
                      isTagged(adSet.id, 'adset') ? 'text-primary' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTagToggle(adSet.id, adSet.name, 'adset', adSet, {
                        campaignId: campaignId
                      });
                    }}
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {expandedAdSets.has(adSet.id) && renderAds(adSet.id)}
            </div>
          ))
        ) : (
          <div className="px-3 py-2 text-center">
            <Users className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">No ad sets found</p>
          </div>
        )}
      </div>
    );
  };

  const renderAds = (adSetId: string) => {
    const ads = activeAdSetId === adSetId ? adsData : [];
    const loading = activeAdSetId === adSetId && adsLoading;

    return (
      <div className="ml-6 space-y-1">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-xs">Loading ads...</span>
          </div>
        ) : ads && ads.length > 0 ? (
          ads.map((ad) => (
            <div
              key={ad.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                selectedItem && 'id' in selectedItem && selectedItem.id === ad.id
                  ? 'bg-primary text-primary-foreground'
                  : ''
              }`}
              onClick={() => handleItemClick(ad)}
            >
              <div className="w-4" /> {/* Spacer for alignment */}
              
              <MousePointer className="h-4 w-4 text-orange-600" />
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{ad.name}</div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getStatusColor(ad.status)}`}>
                    {ad.status}
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${
                  isTagged(ad.id, 'ad') ? 'text-primary' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagToggle(ad.id, ad.name, 'ad', ad, {
                    adSetId: adSetId
                  });
                }}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </div>
          ))
        ) : (
          <div className="px-3 py-2 text-center">
            <MousePointer className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">No ads found</p>
          </div>
        )}
      </div>
    );
  };

  const renderLeadNurturing = () => (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
        onClick={toggleLeadNurturing}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-transparent"
        >
          {leadNurturingExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
        
        <Zap className="h-4 w-4 text-purple-600" />
        
        <div className="flex-1">
          <div className="text-sm font-semibold">Lead Nurturing</div>
          <div className="text-xs text-muted-foreground">AI Avatar Creation</div>
        </div>

        <Badge variant="outline" className="text-xs">
          {leadNurturingFiles.length}
        </Badge>
      </div>

      {leadNurturingExpanded && (
        <div className="ml-6 space-y-1">
          {leadNurturingFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                selectedItem && 'id' in selectedItem && selectedItem.id === file.id
                  ? 'bg-primary text-primary-foreground'
                  : ''
              }`}
              onClick={() => handleItemClick(file)}
            >
              <div className="w-4" /> {/* Spacer for alignment */}
              
              <Zap className="h-4 w-4 text-purple-600" />
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground">AI-powered sequences</div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${
                  isTagged(file.id, 'follow-up') ? 'text-primary' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTagToggle(file.id, file.name, 'follow-up', file);
                }}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  console.log('🎨 SidebarExplorer: Rendering with state:', {
    adAccountsCount: adAccounts.length,
    expandedAccounts: expandedAccounts.size,
    expandedCampaigns: expandedCampaigns.size,
    expandedAdSets: expandedAdSets.size,
    selectedItem: selectedItem ? ('name' in selectedItem ? selectedItem.name : selectedItem.id) : null,
    leadNurturingExpanded
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6 p-4">
        {/* Facebook Ad Accounts Section */}
        {renderAdAccounts()}

        {/* Separator */}
        <div className="border-t" />

        {/* Lead Nurturing Section */}
        {renderLeadNurturing()}
      </div>
    </div>
  );
}