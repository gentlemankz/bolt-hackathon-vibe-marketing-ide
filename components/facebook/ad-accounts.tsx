"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  ChevronDown, ChevronUp, RefreshCw, Facebook, BarChart, Info,
  BarChart2, ArrowUpRight, LogOut,
} from "lucide-react";
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from "@/components/ui/accordion";
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FacebookAdAccountsProps {
  initialAdAccounts: FacebookAdAccount[];
}

export function FacebookAdAccounts({ initialAdAccounts }: FacebookAdAccountsProps) {
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>(initialAdAccounts);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Record<string, FacebookCampaign[]>>({});
  const [adSets, setAdSets] = useState<Record<string, FacebookAdSet[]>>({});
  const [ads, setAds] = useState<Record<string, FacebookAd[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("accounts");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [expandedAdSets, setExpandedAdSets] = useState<Record<string, boolean>>({});
  const [syncingMetrics, setSyncingMetrics] = useState<Record<string, boolean>>({});
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Function to fetch ads for an ad set
  const fetchAds = useCallback(async (adSetId: string) => {
    try {
      const response = await fetch(`/api/facebook/ads?adSetId=${adSetId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ads: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAds(prev => ({
        ...prev,
        [adSetId]: data.ads
      }));
    } catch (error) {
      console.error("Error fetching ads:", error);
    }
  }, []);

  // Function to fetch ad sets for a campaign
  const fetchAdSets = useCallback(async (campaignId: string) => {
    try {
      const response = await fetch(`/api/facebook/adsets?campaignId=${campaignId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ad sets: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAdSets(prev => ({
        ...prev,
        [campaignId]: data.adSets
      }));
      
      // Fetch ads for each ad set
      if (data.adSets && data.adSets.length > 0) {
        for (const adSet of data.adSets) {
          await fetchAds(adSet.id);
        }
      }
    } catch (error) {
      console.error("Error fetching ad sets:", error);
    }
  }, [fetchAds]);

  // Function to fetch campaigns for an ad account
  const fetchCampaigns = useCallback(async (adAccountId: string, setLoadingState = true) => {
    if (setLoadingState) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const response = await fetch(`/api/facebook/campaigns?adAccountId=${adAccountId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCampaigns(prev => ({
        ...prev,
        [adAccountId]: data.campaigns
      }));
      
      // Fetch ad sets for each campaign
      if (data.campaigns && data.campaigns.length > 0) {
        for (const campaign of data.campaigns) {
          await fetchAdSets(campaign.id);
        }
      }
    } catch (error) {
      if (setLoadingState) {
        setError(error instanceof Error ? error.message : "Failed to fetch campaigns");
      }
      console.error("Error fetching campaigns:", error);
    } finally {
      if (setLoadingState) {
        setLoading(false);
      }
    }
  }, [fetchAdSets]);

  // Function to refresh ad accounts
  const refreshAdAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/facebook/ad-accounts");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ad accounts: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAdAccounts(data.adAccounts || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch ad accounts");
      console.error("Error fetching ad accounts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync metrics for an entity
  const syncMetrics = useCallback(async (adAccountId: string) => {
    setSyncingMetrics(prev => ({
      ...prev,
      [adAccountId]: true
    }));
    
    try {
      const response = await fetch("/api/facebook/sync-metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adAccountId,
          datePreset: "last_30_days",
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sync metrics");
      }
      
      // Wait a moment for sync to process, then refresh campaigns data
      // to ensure we have the latest metrics
      setTimeout(async () => {
        try {
          // Refresh the campaigns data for this ad account
          await fetchCampaigns(adAccountId);
        } catch (refreshError) {
          console.error("Error refreshing data after sync:", refreshError);
        } finally {
          setSyncingMetrics(prev => ({
            ...prev,
            [adAccountId]: false
          }));
        }
      }, 3000);
    } catch (error) {
      console.error("Error syncing metrics:", error);
      setSyncingMetrics(prev => ({
        ...prev,
        [adAccountId]: false
      }));
    }
  }, [fetchCampaigns]);

  // Toggle campaign expansion
  const toggleCampaign = useCallback((campaignId: string) => {
    setExpandedCampaigns(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
    
    // Fetch ad sets if not already loaded
    if (!adSets[campaignId] && !expandedCampaigns[campaignId]) {
      fetchAdSets(campaignId);
    }
  }, [adSets, expandedCampaigns, fetchAdSets]);

  // Toggle ad set expansion
  const toggleAdSet = useCallback((adSetId: string) => {
    setExpandedAdSets(prev => ({
      ...prev,
      [adSetId]: !prev[adSetId]
    }));
    
    // Fetch ads if not already loaded
    if (!ads[adSetId] && !expandedAdSets[adSetId]) {
      fetchAds(adSetId);
    }
  }, [ads, expandedAdSets, fetchAds]);

  // Automatically load all campaigns for all ad accounts on initial render
  useEffect(() => {
    if (!initialLoadComplete && adAccounts.length > 0) {
      const loadAllData = async () => {
        setLoading(true);
        setError(null);
        
        try {
          // Load campaigns for all ad accounts in parallel
          await Promise.all(adAccounts.map(account => fetchCampaigns(account.id, false)));
          setInitialLoadComplete(true);
        } catch (error) {
          setError(error instanceof Error ? error.message : "Failed to load initial data");
          console.error("Error loading initial data:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadAllData();
    }
  }, [adAccounts, initialLoadComplete, fetchCampaigns]);

  // Format currency value
  const formatCurrency = (value: string | undefined, currency: string | undefined) => {
    if (!value) return "N/A";
    
    const numValue = parseFloat(value);
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    });
    
    return formatter.format(numValue / 100); // Facebook usually returns amounts in cents
  };

  // Get status badge
  const getStatusBadge = (status: string | number) => {
    let color = "bg-gray-200 text-gray-800";
    
    const statusString = status.toString().toLowerCase();
    
    if (statusString === "active" || statusString === "1") {
      color = "bg-green-100 text-green-800";
    } else if (statusString === "paused" || statusString === "2") {
      color = "bg-yellow-100 text-yellow-800";
    } else if (statusString === "deleted" || statusString === "3" || statusString === "disabled") {
      color = "bg-red-100 text-red-800";
    }
    
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
        {typeof status === "number" ? getAccountStatusText(status) : status}
      </span>
    );
  };

  // Get account status text
  const getAccountStatusText = (status: number): string => {
    switch (status) {
      case 1:
        return "Active";
      case 2:
        return "Disabled";
      case 3:
        return "Unsettled";
      case 7:
        return "Pending Review";
      case 8:
        return "Pending Closure";
      case 9:
        return "Closed";
      case 100:
        return "Pending Risk Review";
      case 101:
        return "Pending Settlement";
      default:
        return `Status: ${status}`;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-between items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="accounts">Ad Accounts</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="adsets">Ad Sets & Ads</TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              size="sm"
              asChild
              className="ml-2"
            >
              <Link href="/facebook/disconnect">
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect
              </Link>
            </Button>
          </div>
          
          <div className="mt-6">
            <TabsContent value="accounts" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your Ad Accounts</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshAdAccounts}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              {loading && adAccounts.length > 0 ? (
                <div className="flex justify-center items-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="text-sm text-muted-foreground">Loading account data...</p>
                  </div>
                </div>
              ) : adAccounts.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-6">
                      <Facebook className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No Ad Accounts Found</h3>
                      <p className="text-muted-foreground mt-2 mb-4">
                        You don&apos;t have any Facebook ad accounts connected yet.
                      </p>
                      <Button asChild>
                        <Link href="/facebook/select-adaccount">Connect Ad Account</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {adAccounts.map((account) => (
                    <Card key={account.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{account.name}</CardTitle>
                            <CardDescription>ID: {account.account_id}</CardDescription>
                          </div>
                          {getStatusBadge(account.account_status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount Spent:</span>
                            <span className="font-medium">
                              {formatCurrency(account.amount_spent, account.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Balance:</span>
                            <span className="font-medium">
                              {formatCurrency(account.balance, account.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Currency:</span>
                            <span>{account.currency || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span>
                              {account.business_city && account.business_country_code 
                                ? `${account.business_city}, ${account.business_country_code}`
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          className="w-full sm:w-auto" 
                          variant="outline"
                          onClick={() => fetchCampaigns(account.id)}
                          disabled={loading}
                        >
                          View Campaigns
                        </Button>
                        <Button
                          className="w-full sm:w-auto"
                          variant="outline"
                          onClick={() => syncMetrics(account.id)}
                          disabled={syncingMetrics[account.id]}
                        >
                          {syncingMetrics[account.id] ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <BarChart2 className="h-4 w-4 mr-2" />
                              Sync Metrics
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="campaigns" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Campaigns</h2>
              </div>
              
              {Object.keys(campaigns).length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-6">
                      <BarChart className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No Campaign Data</h3>
                      <p className="text-muted-foreground mt-2 mb-4">
                        Click &quot;View Campaigns&quot; on an ad account to load campaign data.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {Object.entries(campaigns).map(([adAccountId, campaignList]) => {
                    const account = adAccounts.find(a => a.id === adAccountId);
                    
                    return (
                      <Card key={adAccountId}>
                        <CardHeader>
                          <CardTitle>{account?.name || adAccountId}</CardTitle>
                          <CardDescription>
                            {campaignList.length} campaign{campaignList.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {campaignList.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              No campaigns found for this ad account.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {campaignList.map((campaign) => (
                                <div key={campaign.id} className="border rounded-md">
                                  <div 
                                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-muted"
                                    onClick={() => toggleCampaign(campaign.id)}
                                  >
                                    <div>
                                      <div className="font-medium">{campaign.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        ID: {campaign.id.split('_')[1] || campaign.id}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(campaign.status)}
                                      
                                      <Link 
                                        href={`/facebook/campaign/${campaign.id}`}
                                        className="text-blue-600 hover:text-blue-800"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                          <ArrowUpRight className="h-4 w-4" />
                                          <span className="sr-only">View Metrics</span>
                                        </Button>
                                      </Link>
                                      
                                      {expandedCampaigns[campaign.id] ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </div>
                                  </div>
                                  
                                  {expandedCampaigns[campaign.id] && (
                                    <div className="p-3 border-t bg-muted/50">
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Objective:</span>{" "}
                                          <span className="font-medium">{campaign.objective || "N/A"}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Buying Type:</span>{" "}
                                          <span className="font-medium">{campaign.buying_type || "N/A"}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Daily Budget:</span>{" "}
                                          <span className="font-medium">
                                            {campaign.daily_budget 
                                              ? formatCurrency(campaign.daily_budget, account?.currency)
                                              : "N/A"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Lifetime Budget:</span>{" "}
                                          <span className="font-medium">
                                            {campaign.lifetime_budget 
                                              ? formatCurrency(campaign.lifetime_budget, account?.currency)
                                              : "N/A"}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="mt-4">
                                        <h4 className="font-medium mb-2">Ad Sets</h4>
                                        {!adSets[campaign.id] ? (
                                          <div className="text-center py-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mx-auto"></div>
                                          </div>
                                        ) : adSets[campaign.id]?.length === 0 ? (
                                          <div className="text-center py-2 text-muted-foreground">
                                            No ad sets found for this campaign.
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            {adSets[campaign.id]?.map((adSet) => (
                                              <div key={adSet.id} className="border rounded-md">
                                                <div 
                                                  className="flex justify-between items-center p-2 cursor-pointer hover:bg-muted"
                                                  onClick={() => toggleAdSet(adSet.id)}
                                                >
                                                  <div>
                                                    <div className="font-medium text-sm">{adSet.name}</div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {getStatusBadge(adSet.status)}
                                                    {expandedAdSets[adSet.id] ? (
                                                      <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                      <ChevronDown className="h-4 w-4" />
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="adsets" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Ad Sets & Ads</h2>
              </div>
              
              {Object.keys(adSets).length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-6">
                      <Info className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No Ad Set Data</h3>
                      <p className="text-muted-foreground mt-2 mb-4">
                        Expand a campaign in the Campaigns tab to load ad sets and ads.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {Object.entries(adSets).map(([campaignId, adSetList]) => {
                    // Find the campaign
                    let campaign: FacebookCampaign | undefined;
                    let account: FacebookAdAccount | undefined;
                    
                    for (const [adAccountId, campaignList] of Object.entries(campaigns)) {
                      campaign = campaignList?.find(c => c.id === campaignId);
                      if (campaign) {
                        account = adAccounts.find(a => a.id === adAccountId);
                        break;
                      }
                    }
                    
                    if (!campaign) return null;
                    
                    return (
                      <Card key={campaignId}>
                        <CardHeader>
                          <CardTitle>{campaign.name}</CardTitle>
                          <CardDescription>
                            {adSetList.length} ad set{adSetList.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {adSetList.map((adSet) => (
                            <AccordionItem key={adSet.id} value={adSet.id}>
                              <AccordionTrigger className="hover:bg-muted px-3 rounded-md">
                                <div className="flex items-center gap-2">
                                  <span>{adSet.name}</span>
                                  {getStatusBadge(adSet.status)}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Daily Budget:</span>{" "}
                                      <span className="font-medium">
                                        {adSet.daily_budget 
                                          ? formatCurrency(adSet.daily_budget, account?.currency)
                                          : "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Lifetime Budget:</span>{" "}
                                      <span className="font-medium">
                                        {adSet.lifetime_budget 
                                          ? formatCurrency(adSet.lifetime_budget, account?.currency)
                                          : "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Optimization Goal:</span>{" "}
                                      <span className="font-medium">{adSet.optimization_goal || "N/A"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Billing Event:</span>{" "}
                                      <span className="font-medium">{adSet.billing_event || "N/A"}</span>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium mb-2">Ads</h4>
                                    {!ads[adSet.id] ? (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => fetchAds(adSet.id)}
                                        className="w-full"
                                      >
                                        Load Ads
                                      </Button>
                                    ) : ads[adSet.id]?.length === 0 ? (
                                      <div className="text-center py-2 text-muted-foreground">
                                        No ads found for this ad set.
                                      </div>
                                    ) : (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Creative</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {ads[adSet.id]?.map((ad) => (
                                            <TableRow key={ad.id}>
                                              <TableCell>{ad.name}</TableCell>
                                              <TableCell>{getStatusBadge(ad.status)}</TableCell>
                                              <TableCell>
                                                {ad.creative ? (
                                                  <div className="text-xs">
                                                    {ad.creative.title && (
                                                      <div className="font-medium">{ad.creative.title}</div>
                                                    )}
                                                    {ad.creative.body && (
                                                      <div className="text-muted-foreground line-clamp-2">
                                                        {ad.creative.body}
                                                      </div>
                                                    )}
                                                  </div>
                                                ) : (
                                                  "N/A"
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
} 