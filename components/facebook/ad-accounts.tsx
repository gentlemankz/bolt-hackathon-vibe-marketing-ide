"use client";

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Facebook, 
  Target, 
  Eye,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  MousePointer
} from 'lucide-react';
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd } from '@/lib/types';

interface FacebookAdAccountsProps {
  initialAdAccounts: FacebookAdAccount[];
}

export function FacebookAdAccounts({ initialAdAccounts }: FacebookAdAccountsProps) {
  // State management
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>(initialAdAccounts);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Record<string, FacebookCampaign[]>>({});
  const [adSets, setAdSets] = useState<Record<string, FacebookAdSet[]>>({});
  const [ads, setAds] = useState<Record<string, FacebookAd[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [syncingMetrics, setSyncingMetrics] = useState<Set<string>>(new Set());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Helper functions
  const formatCurrency = (amount: string, currency: string = 'USD') => {
    const num = parseFloat(amount) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
      'ACTIVE': { variant: 'default', color: 'bg-green-500' },
      'PAUSED': { variant: 'secondary', color: 'bg-yellow-500' },
      'DELETED': { variant: 'destructive', color: 'bg-red-500' },
      'ARCHIVED': { variant: 'outline', color: 'bg-gray-500' },
    };

    const config = statusMap[status] || { variant: 'outline', color: 'bg-gray-500' };
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const getAccountStatusText = (status: number) => {
    const statusMap: Record<number, string> = {
      1: 'ACTIVE',
      2: 'DISABLED',
      3: 'UNSETTLED',
      7: 'PENDING_RISK_REVIEW',
      9: 'PENDING_SETTLEMENT',
      100: 'PENDING_CLOSURE',
      101: 'CLOSED',
      201: 'ANY_ACTIVE',
      202: 'ANY_CLOSED',
    };
    return statusMap[status] || 'UNKNOWN';
  };

  // Event handlers
  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
        // Load ad sets for this campaign if not already loaded
        if (!adSets[campaignId]) {
          fetchAdSets(campaignId);
        }
      }
      return newSet;
    });
  };

  const toggleAdSet = (adSetId: string) => {
    setExpandedAdSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(adSetId)) {
        newSet.delete(adSetId);
      } else {
        newSet.add(adSetId);
        // Load ads for this ad set if not already loaded
        if (!ads[adSetId]) {
          fetchAds(adSetId);
        }
      }
      return newSet;
    });
  };

  // API functions
  const refreshAdAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/facebook/ad-accounts/refresh', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh ad accounts: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAdAccounts(data.adAccounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh ad accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async (adAccountId: string) => {
    try {
      const response = await fetch(`/api/facebook/campaigns?adAccountId=${adAccountId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCampaigns(prev => ({
        ...prev,
        [adAccountId]: data.campaigns || []
      }));
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const fetchAdSets = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/facebook/adsets?campaignId=${campaignId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ad sets: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAdSets(prev => ({
        ...prev,
        [campaignId]: data.adSets || []
      }));
    } catch (err) {
      console.error('Error fetching ad sets:', err);
    }
  };

  const fetchAds = async (adSetId: string) => {
    try {
      const response = await fetch(`/api/facebook/ads?adSetId=${adSetId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ads: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAds(prev => ({
        ...prev,
        [adSetId]: data.ads || []
      }));
    } catch (err) {
      console.error('Error fetching ads:', err);
    }
  };

  const syncMetrics = async (accountId: string) => {
    setSyncingMetrics(prev => new Set(prev).add(accountId));
    
    try {
      const response = await fetch('/api/facebook/metrics/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adAccountId: accountId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync metrics: ${response.statusText}`);
      }
      
      // Optionally refresh data after sync
      await fetchCampaigns(accountId);
    } catch (err) {
      console.error('Error syncing metrics:', err);
    } finally {
      setSyncingMetrics(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  // Load campaigns for all accounts on initial render
  useEffect(() => {
    const loadInitialData = async () => {
      if (adAccounts.length > 0 && !initialLoadComplete) {
        setLoading(true);
        
        try {
          // Load campaigns for all ad accounts
          await Promise.all(
            adAccounts.map(account => fetchCampaigns(account.id))
          );
        } catch (err) {
          console.error('Error loading initial data:', err);
        } finally {
          setLoading(false);
          setInitialLoadComplete(true);
        }
      }
    };

    loadInitialData();
  }, [adAccounts, initialLoadComplete]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Facebook Ad Accounts</h2>
          <p className="text-muted-foreground">
            Manage your Facebook advertising campaigns, ad sets, and ads
          </p>
        </div>
        <Button 
          onClick={refreshAdAccounts} 
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Accounts
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Ad Accounts ({adAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="adsets-ads" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Ad Sets & Ads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Ad Accounts</CardTitle>
              <CardDescription>
                Your Facebook ad accounts and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Facebook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Ad Accounts Found</h3>
                  <p className="text-muted-foreground">
                    Connect your Facebook account to view your ad accounts
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Account ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Amount Spent</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell className="font-mono text-sm">{account.account_id}</TableCell>
                        <TableCell>
                          {getStatusBadge(getAccountStatusText(account.account_status))}
                        </TableCell>
                        <TableCell>{account.currency}</TableCell>
                        <TableCell>
                          {formatCurrency(account.amount_spent, account.currency)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(account.balance, account.currency)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncMetrics(account.id)}
                            disabled={syncingMetrics.has(account.id)}
                            className="flex items-center gap-2"
                          >
                            <TrendingUp className={`h-4 w-4 ${syncingMetrics.has(account.id) ? 'animate-pulse' : ''}`} />
                            {syncingMetrics.has(account.id) ? 'Syncing...' : 'Sync Metrics'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaigns Overview</CardTitle>
              <CardDescription>
                All campaigns across your ad accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Campaigns Found</h3>
                  <p className="text-muted-foreground">
                    Connect an ad account to view campaigns
                  </p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {adAccounts.map((account) => (
                    <AccordionItem key={account.id} value={account.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full mr-4">
                          <div className="flex items-center gap-3">
                            <Facebook className="h-5 w-5" />
                            <div className="text-left">
                              <div className="font-semibold">{account.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {campaigns[account.id]?.length || 0} campaigns
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(getAccountStatusText(account.account_status))}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {loading && !campaigns[account.id] ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin" />
                            <span className="ml-2">Loading campaigns...</span>
                          </div>
                        ) : campaigns[account.id]?.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Campaign Name</TableHead>
                                <TableHead>Objective</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Budget Type</TableHead>
                                <TableHead>Budget</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {campaigns[account.id].map((campaign) => (
                                <TableRow key={campaign.id}>
                                  <TableCell className="font-medium">{campaign.name}</TableCell>
                                  <TableCell>{campaign.objective}</TableCell>
                                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                                  <TableCell>
                                    {campaign.daily_budget ? 'Daily' : 'Lifetime'}
                                  </TableCell>
                                  <TableCell>
                                    {campaign.daily_budget 
                                      ? formatCurrency(campaign.daily_budget, account.currency)
                                      : formatCurrency(campaign.lifetime_budget, account.currency)
                                    }
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8">
                            <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No campaigns found for this account</p>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adsets-ads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ad Sets & Ads</CardTitle>
              <CardDescription>
                Detailed view of ad sets and individual ads
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Ad Sets Found</h3>
                  <p className="text-muted-foreground">
                    Connect an ad account to view ad sets and ads
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {adAccounts.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Facebook className="h-5 w-5" />
                          <div>
                            <h3 className="font-semibold">{account.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {campaigns[account.id]?.length || 0} campaigns
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(getAccountStatusText(account.account_status))}
                      </div>

                      {campaigns[account.id]?.map((campaign) => (
                        <div key={campaign.id} className="border-l-2 border-blue-200 pl-4 mb-4">
                          <div 
                            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                            onClick={() => toggleCampaign(campaign.id)}
                          >
                            <div className="flex items-center gap-2">
                              {expandedCampaigns.has(campaign.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <Target className="h-4 w-4" />
                              <span className="font-medium">{campaign.name}</span>
                              {getStatusBadge(campaign.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {adSets[campaign.id]?.length || 0} ad sets
                            </div>
                          </div>

                          {expandedCampaigns.has(campaign.id) && (
                            <div className="ml-6 mt-2 space-y-2">
                              {adSets[campaign.id]?.map((adSet) => (
                                <div key={adSet.id} className="border-l-2 border-green-200 pl-4">
                                  <div 
                                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                                    onClick={() => toggleAdSet(adSet.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      {expandedAdSets.has(adSet.id) ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                      <Users className="h-4 w-4" />
                                      <span className="font-medium">{adSet.name}</span>
                                      {getStatusBadge(adSet.status)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {ads[adSet.id]?.length || 0} ads
                                    </div>
                                  </div>

                                  {expandedAdSets.has(adSet.id) && (
                                    <div className="ml-6 mt-2">
                                      {ads[adSet.id]?.length > 0 ? (
                                        <div className="space-y-2">
                                          {ads[adSet.id].map((ad) => (
                                            <div key={ad.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                              <div className="flex items-center gap-2">
                                                <MousePointer className="h-4 w-4" />
                                                <span className="font-medium">{ad.name}</span>
                                                {getStatusBadge(ad.status)}
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                {ad.creative?.name || 'No creative'}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-4">
                                          <MousePointer className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                                          <p className="text-sm text-muted-foreground">No ads found</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )) || (
                                <div className="text-center py-4">
                                  <Users className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                                  <p className="text-sm text-muted-foreground">No ad sets found</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )) || (
                        <div className="text-center py-8">
                          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No campaigns found for this account</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}