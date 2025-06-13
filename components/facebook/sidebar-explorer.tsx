"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Facebook, BarChart2, LayoutGrid, Image, Tag, Users, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd, LeadNurturingFile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaggedFile } from "@/lib/ai-api-client";
import { useFacebookCampaigns, useFacebookAdSets, useFacebookAds, prefetchCampaigns, prefetchAdSets, prefetchAds, prefetchMetrics } from "@/lib/hooks/use-facebook-data";

type TaggableData = FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile;

interface SidebarExplorerProps {
  adAccounts: FacebookAdAccount[];
  onSelectAdAccount: (account: FacebookAdAccount) => void;
  onSelectCampaign: (campaign: FacebookCampaign, accountId: string) => void;
  onSelectAdSet: (adSet: FacebookAdSet, campaignId: string) => void;
  onSelectAd: (ad: FacebookAd, adSetId: string) => void;
  onSelectLeadNurturingFile?: (file: LeadNurturingFile) => void;
  taggedFiles?: TaggedFile[];
  onToggleTag?: (id: string, name: string, type: 'campaign' | 'adset' | 'ad' | 'account' | 'file', data: TaggableData, metadata?: Record<string, unknown>) => void;
  isTagged?: (id: string, type: string) => boolean;
  onCreateCampaign?: (adAccountId: string) => void;
  onCreateAdSet?: (campaignId: string, campaignName: string) => void;
  onCreateAd?: (adsetId: string, adsetName: string, adAccountId: string) => void;
}

export function SidebarExplorer({
  adAccounts,
  onSelectAdAccount,
  onSelectCampaign,
  onSelectAdSet,
  onSelectAd,
  onSelectLeadNurturingFile,
  onToggleTag,
  isTagged = () => false,
  onCreateCampaign,
  onCreateAdSet,
  onCreateAd
}: SidebarExplorerProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [expandedAdSets, setExpandedAdSets] = useState<Record<string, boolean>>({});
  const [expandedLeadNurturing, setExpandedLeadNurturing] = useState<boolean>(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeAdSetId, setActiveAdSetId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  // Use React Query hooks
  const { 
    data: campaigns = [], 
    isLoading: isLoadingCampaigns 
  } = useFacebookCampaigns(activeAccountId);
  
  const { 
    data: adSets = [], 
    isLoading: isLoadingAdSets 
  } = useFacebookAdSets(activeCampaignId);
  
  const { 
    data: ads = [], 
    isLoading: isLoadingAds 
  } = useFacebookAds(activeAdSetId);

  // Prefetch data for all ad accounts when component mounts
  useEffect(() => {
    async function prefetchData() {
      if (adAccounts && adAccounts.length > 0) {
        // Prefetch the first account's campaigns automatically
        if (adAccounts[0]) {
          await prefetchCampaigns(queryClient, adAccounts[0].id);
        }
        
        // Prefetch campaigns for all accounts in the background
        for (const account of adAccounts) {
          queryClient.prefetchQuery({
            queryKey: ['facebook', 'campaigns', account.id],
            queryFn: async () => {
              const response = await fetch(`/api/facebook/campaigns?adAccountId=${account.id}`);
              if (!response.ok) throw new Error('Failed to fetch campaigns');
              const data = await response.json();
              return data.campaigns as FacebookCampaign[];
            },
          });
        }
      }
    }
    
    prefetchData();
  }, [adAccounts, queryClient]);

  // Toggle account expansion
  const toggleAccount = (accountId: string) => {
    const newState = !expandedAccounts[accountId];
    setExpandedAccounts(prev => ({ ...prev, [accountId]: newState }));
    
    if (newState) {
      setActiveAccountId(accountId);
      
      // Prefetch ad sets for ALL campaigns, not just first 3
      const campaignsData = queryClient.getQueryData(['facebook', 'campaigns', accountId]) as FacebookCampaign[] | undefined;
      campaignsData?.forEach(async (campaign: FacebookCampaign) => {
        await prefetchAdSets(queryClient, campaign.id);
        await prefetchMetrics(queryClient, 'campaign', campaign.id, 30);
      });
    }
  };

  // Toggle campaign expansion
  const toggleCampaign = (campaignId: string) => {
    const newState = !expandedCampaigns[campaignId];
    setExpandedCampaigns(prev => ({ ...prev, [campaignId]: newState }));
    
    if (newState) {
      setActiveCampaignId(campaignId);
      
      // Prefetch ads for all ad sets in this campaign
      const adSetsData = queryClient.getQueryData(['facebook', 'adsets', campaignId]) as FacebookAdSet[] | undefined;
      adSetsData?.forEach(async (adSet: FacebookAdSet) => {
        await prefetchAds(queryClient, adSet.id);
        await prefetchMetrics(queryClient, 'adset', adSet.id, 30);
      });
    }
  };

  // Toggle ad set expansion
  const toggleAdSet = (adSetId: string) => {
    const newState = !expandedAdSets[adSetId];
    setExpandedAdSets(prev => ({ ...prev, [adSetId]: newState }));
    
    if (newState) {
      setActiveAdSetId(adSetId);
      
      // Prefetch metrics for all ads in this ad set
      const adsData = queryClient.getQueryData(['facebook', 'ads', adSetId]) as FacebookAd[] | undefined;
      adsData?.forEach(async (ad: FacebookAd) => {
        await prefetchMetrics(queryClient, 'ad', ad.id, 30);
      });
    }
  };

  // Get status badge color
  const getStatusColor = (status: string | number): string => {
    const statusString = status.toString().toLowerCase();
    
    if (statusString === "active" || statusString === "1") {
      return "bg-green-100 text-green-800 hover:bg-green-200";
    } else if (statusString === "paused" || statusString === "2") {
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    } else if (statusString === "deleted" || statusString === "3" || statusString === "disabled") {
      return "bg-red-100 text-red-800 hover:bg-red-200";
    }
    
    return "bg-gray-100 text-gray-800 hover:bg-gray-200";
  };

  // Lead nurturing files (static for now)
  const leadNurturingFiles: LeadNurturingFile[] = [
    {
      id: 'follow-up-fl',
      name: 'follow-up.fl',
      type: 'follow-up',
      user_id: 'current-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  const toggleLeadNurturing = () => {
    setExpandedLeadNurturing(!expandedLeadNurturing);
  };

  return (
    <div className="text-sm">
      <div className="font-medium text-muted-foreground mb-1 px-2 flex items-center">
        <Facebook className="w-3.5 h-3.5 mr-2" />
        Ad Accounts
      </div>
      
      {adAccounts.length === 0 ? (
        <div className="px-2 py-1 text-muted-foreground text-xs">
          No ad accounts found
        </div>
      ) : (
        <div className="space-y-0.5">
          {adAccounts.map((account) => (
            <div key={account.id} className="select-none">
              <div 
                className="flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-md cursor-pointer"
                onClick={() => toggleAccount(account.id)}
              >
                {expandedAccounts[account.id] ? 
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : 
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                }
                <div 
                  className="flex-1 truncate cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAdAccount(account);
                  }}
                >
                  {account.name}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-5 w-5 p-0 mr-1",
                    isTagged(account.id, 'account') ? "text-primary" : "text-muted-foreground hover:text-primary"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTag?.(account.id, account.name, 'account', account);
                  }}
                >
                  <Tag className="h-3 w-3" />
                </Button>
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1 py-0 h-4", getStatusColor(account.account_status))}
                >
                  {account.account_status === 1 ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              {expandedAccounts[account.id] && (
                <div className="ml-4 pl-2 border-l-2 border-muted">
                  <div className="font-medium text-muted-foreground text-xs py-1 flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart2 className="w-3 h-3 mr-1" />
                      Campaigns
                    </div>
                    {onCreateCampaign && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateCampaign(account.id);
                        }}
                        title="Create new campaign"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {isLoadingCampaigns && activeAccountId === account.id ? (
                    <div className="text-xs py-1 flex items-center pl-1">
                      <div className="h-2 w-2 mr-2 rounded-full border border-current border-t-transparent animate-spin" />
                      Loading...
                    </div>
                  ) : campaigns.length === 0 && activeAccountId === account.id ? (
                    <div className="text-xs text-muted-foreground py-1 pl-1">
                      No campaigns found
                    </div>
                  ) : activeAccountId === account.id && (
                    <div className="space-y-0.5">
                      {campaigns.map((campaign) => (
                        <div key={campaign.id} className="select-none">
                          <div 
                            className="flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-md cursor-pointer"
                            onClick={() => toggleCampaign(campaign.id)}
                          >
                            {expandedCampaigns[campaign.id] ? 
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : 
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                            <div 
                              className="flex-1 truncate cursor-pointer hover:underline text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCampaign(campaign, account.id);
                              }}
                            >
                              {campaign.name}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-4 w-4 p-0 mr-1",
                                isTagged(campaign.id, 'campaign') ? "text-primary" : "text-muted-foreground hover:text-primary"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleTag?.(campaign.id, campaign.name, 'campaign', campaign, { adAccountId: account.id });
                              }}
                            >
                              <Tag className="h-2.5 w-2.5" />
                            </Button>
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px] px-1 py-0 h-4", getStatusColor(campaign.status))}
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                          
                          {expandedCampaigns[campaign.id] && (
                            <div className="ml-4 pl-2 border-l-2 border-muted">
                              <div className="font-medium text-muted-foreground text-xs py-1 flex items-center justify-between">
                                <div className="flex items-center">
                                  <LayoutGrid className="w-3 h-3 mr-1" />
                                  Ad Sets
                                </div>
                                {onCreateAdSet && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCreateAdSet(campaign.id, campaign.name);
                                    }}
                                    title="Create new ad set"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              
                              {isLoadingAdSets && activeCampaignId === campaign.id ? (
                                <div className="text-xs py-1 flex items-center pl-1">
                                  <div className="h-2 w-2 mr-2 rounded-full border border-current border-t-transparent animate-spin" />
                                  Loading...
                                </div>
                              ) : adSets.length === 0 && activeCampaignId === campaign.id ? (
                                <div className="text-xs text-muted-foreground py-1 pl-1">
                                  No ad sets found
                                </div>
                              ) : activeCampaignId === campaign.id && (
                                <div className="space-y-0.5">
                                  {adSets.map((adSet) => (
                                    <div key={adSet.id} className="select-none">
                                      <div 
                                        className="flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-md cursor-pointer"
                                        onClick={() => toggleAdSet(adSet.id)}
                                      >
                                        {expandedAdSets[adSet.id] ? 
                                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : 
                                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                        }
                                        <div 
                                          className="flex-1 truncate cursor-pointer hover:underline text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectAdSet(adSet, campaign.id);
                                          }}
                                        >
                                          {adSet.name}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={cn(
                                            "h-4 w-4 p-0 mr-1",
                                            isTagged(adSet.id, 'adset') ? "text-primary" : "text-muted-foreground hover:text-primary"
                                          )}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleTag?.(adSet.id, adSet.name, 'adset', adSet, { campaignId: campaign.id });
                                          }}
                                        >
                                          <Tag className="h-2.5 w-2.5" />
                                        </Button>
                                        <Badge 
                                          variant="outline" 
                                          className={cn("text-[10px] px-1 py-0 h-4", getStatusColor(adSet.status))}
                                        >
                                          {adSet.status}
                                        </Badge>
                                      </div>
                                      
                                      {expandedAdSets[adSet.id] && (
                                        <div className="ml-4 pl-2 border-l-2 border-muted">
                                          <div className="font-medium text-muted-foreground text-xs py-1 flex items-center justify-between">
                                            <div className="flex items-center">
                                              <Image className="w-3 h-3 mr-1" aria-label="Ads section icon" />
                                              Ads
                                            </div>
                                            {onCreateAd && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-4 w-4 p-0 text-muted-foreground hover:text-primary"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onCreateAd(adSet.id, adSet.name, account.id);
                                                }}
                                                title="Create new ad"
                                              >
                                                <Plus className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                          
                                          {isLoadingAds && activeAdSetId === adSet.id ? (
                                            <div className="text-xs py-1 flex items-center pl-1">
                                              <div className="h-2 w-2 mr-2 rounded-full border border-current border-t-transparent animate-spin" />
                                              Loading...
                                            </div>
                                          ) : ads.length === 0 && activeAdSetId === adSet.id ? (
                                            <div className="text-xs text-muted-foreground py-1 pl-1">
                                              No ads found
                                            </div>
                                          ) : activeAdSetId === adSet.id && (
                                            <div className="space-y-0.5">
                                              {ads.map((ad) => (
                                                <div key={ad.id} className="select-none">
                                                  <div 
                                                    className="flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-md cursor-pointer"
                                                    onClick={() => {
                                                      onSelectAd(ad, adSet.id);
                                                    }}
                                                  >
                                                    <div className="w-3.5"></div>
                                                    <div className="flex-1 truncate text-xs">
                                                      {ad.name}
                                                    </div>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className={cn(
                                                        "h-4 w-4 p-0 mr-1",
                                                        isTagged(ad.id, 'ad') ? "text-primary" : "text-muted-foreground hover:text-primary"
                                                      )}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleTag?.(ad.id, ad.name, 'ad', ad, { adSetId: adSet.id });
                                                      }}
                                                    >
                                                      <Tag className="h-2.5 w-2.5" />
                                                    </Button>
                                                    <Badge 
                                                      variant="outline" 
                                                      className={cn("text-[10px] px-1 py-0 h-4", getStatusColor(ad.status))}
                                                    >
                                                      {ad.status}
                                                    </Badge>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Lead Nurturing Section */}
      <div className="mt-6">
        <div className="font-medium text-muted-foreground mb-1 px-2 flex items-center">
          <Users className="w-3.5 h-3.5 mr-2" />
          Lead Nurturing
        </div>
        
        <div className="space-y-0.5">
          <div className="select-none">
            <div 
              className="flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-md cursor-pointer"
              onClick={toggleLeadNurturing}
            >
              {expandedLeadNurturing ? 
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : 
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              }
              <span className="flex-1 truncate">AI Avatar Constructor</span>
            </div>
            
            {expandedLeadNurturing && (
              <div className="ml-4 pl-2 border-l-2 border-muted">
                {leadNurturingFiles.map((file) => (
                  <div key={file.id} className="select-none">
                    <div 
                      className="flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => onSelectLeadNurturingFile?.(file)}
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex-1 truncate cursor-pointer hover:underline text-xs">
                        {file.name}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-4 w-4 p-0 mr-1",
                          isTagged(file.id, 'file') ? "text-primary" : "text-muted-foreground hover:text-primary"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTag?.(file.id, file.name, 'file', file);
                        }}
                      >
                        <Tag className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 