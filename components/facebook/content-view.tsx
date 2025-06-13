"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart2, RefreshCw, MousePointerClick, Users, DollarSign } from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd, LeadNurturingFile } from "@/lib/types";
import Image from "next/image";
import { useFacebookMetrics, useFacebookMetricsSummary, prefetchMetrics, prefetchMetricsSummary } from "@/lib/hooks/use-facebook-data";
import { AvatarConstructor } from "@/components/tavus/avatar-constructor";

type SelectedItem = {
  type: 'account' | 'campaign' | 'adset' | 'ad' | 'lead-nurturing';
  item: FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile;
  parentId?: string;
} | null;

interface ContentViewProps {
  selectedItem: SelectedItem;
}

export function ContentView({ selectedItem }: ContentViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();
  
  // Get the entity type and ID for metrics queries
  const entityType = selectedItem?.type === 'account' || selectedItem?.type === 'lead-nurturing' ? null : selectedItem?.type || null;
  const entityId = selectedItem?.type === 'account' || selectedItem?.type === 'lead-nurturing' ? null : selectedItem?.item.id || null;
  
  // Use React Query hooks for metrics data
  const { 
    data: metrics = [], 
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics
  } = useFacebookMetrics(entityType as 'campaign' | 'adset' | 'ad' | null, entityId, 30);
  
  const {
    data: metricsSummary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary
  } = useFacebookMetricsSummary(entityType as 'campaign' | 'adset' | 'ad' | null, entityId, 30);
  
  // Prefetch metrics data when selectedItem changes
  useEffect(() => {
    if (selectedItem && selectedItem.type !== 'account' && selectedItem.type !== 'lead-nurturing') {
      const type = selectedItem.type as 'campaign' | 'adset' | 'ad';
      const id = selectedItem.item.id;
      
      // Prefetch metrics and summary data
      prefetchMetrics(queryClient, type, id, 30);
      prefetchMetricsSummary(queryClient, type, id, 30);
    }
  }, [selectedItem, queryClient]);
  
  // Refresh metrics data
  const refreshMetricsData = () => {
    refetchMetrics();
    refetchSummary();
  };

  const renderMetricsSummary = () => {
    if (isLoadingSummary) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-10 bg-muted rounded-md mb-2"></div>
                <div className="h-6 bg-muted rounded-md w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    
    if (!metricsSummary) {
      return null;
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Impressions</p>
                <h3 className="text-2xl font-bold">{metricsSummary.total_impressions.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <BarChart2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Clicks</p>
                <h3 className="text-2xl font-bold">{metricsSummary.total_clicks.toLocaleString()}</h3>
                <p className="text-sm text-muted-foreground mt-1">CTR: {metricsSummary.total_ctr}%</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <MousePointerClick className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Reach</p>
                <h3 className="text-2xl font-bold">{metricsSummary.total_reach.toLocaleString()}</h3>
                <p className="text-sm text-muted-foreground mt-1">Frequency: {metricsSummary.avg_frequency}</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Spend</p>
                <h3 className="text-2xl font-bold">${metricsSummary.total_spend}</h3>
                <p className="text-sm text-muted-foreground mt-1">CPC: ${metricsSummary.total_cpc}</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMetricsTable = () => {
    if (isLoadingMetrics) {
      return (
        <div className="flex justify-center items-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    if (!metrics.length) {
      return (
        <Alert>
          <AlertDescription>
            No metrics data available for the selected time period.
          </AlertDescription>
        </Alert>
      );
    }
    
    // Sort metrics by date in descending order
    const sortedMetrics = [...metrics].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Impressions</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>CTR</TableHead>
              <TableHead>CPC</TableHead>
              <TableHead>Spend</TableHead>
              <TableHead>Reach</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Conversions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((metric, index) => (
              <TableRow key={index}>
                <TableCell>{new Date(metric.date).toLocaleDateString()}</TableCell>
                <TableCell>{metric.impressions.toLocaleString()}</TableCell>
                <TableCell>{metric.clicks.toLocaleString()}</TableCell>
                <TableCell>{(metric.ctr * 100).toFixed(2)}%</TableCell>
                <TableCell>{metric.cpc === '0' ? '$0.00' : `$${parseFloat(metric.cpc).toFixed(2)}`}</TableCell>
                <TableCell>{metric.spend === '0' ? '$0.00' : `$${parseFloat(metric.spend).toFixed(2)}`}</TableCell>
                <TableCell>{metric.reach.toLocaleString()}</TableCell>
                <TableCell>{metric.frequency.toFixed(2)}</TableCell>
                <TableCell>{metric.conversions.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };
  
  if (!selectedItem) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <h3 className="text-lg font-medium mb-2">No Item Selected</h3>
          <p className="text-sm">Select an item from the sidebar to view details</p>
        </div>
      </div>
    );
  }

  // Common elements for all item types
  const renderMetricsTab = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Performance Metrics</h3>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={refreshMetricsData} 
            disabled={isLoadingMetrics || isLoadingSummary}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMetrics || isLoadingSummary ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {renderMetricsSummary()}
        {renderMetricsTable()}
      </div>
    );
  };

  // Simple rendering based on type
  switch (selectedItem.type) {
    case 'account':
      const account = selectedItem.item as FacebookAdAccount;
      return (
        <div>
          <h2 className="text-2xl font-bold mb-4">{account.name}</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                  <CardDescription>ID: {account.account_id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Status: {account.account_status === 1 ? "Active" : "Inactive"}</p>
                  <p>Currency: {account.currency}</p>
                  <p>Amount Spent: {account.amount_spent ? `$${account.amount_spent}` : 'N/A'}</p>
                  <p>Balance: {account.balance ? `$${account.balance}` : 'N/A'}</p>
                  <p>Country: {account.business_country_code || 'N/A'}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      );
      
    case 'campaign':
      const campaign = selectedItem.item as FacebookCampaign;
      return (
        <div>
          <h2 className="text-2xl font-bold mb-4">{campaign.name}</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                  <CardDescription>ID: {campaign.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Status: {campaign.status}</p>
                  <p>Objective: {campaign.objective || 'N/A'}</p>
                  <p>Buying Type: {campaign.buying_type || 'N/A'}</p>
                  <p>Daily Budget: {campaign.daily_budget ? `$${campaign.daily_budget}` : 'N/A'}</p>
                  <p>Lifetime Budget: {campaign.lifetime_budget ? `$${campaign.lifetime_budget}` : 'N/A'}</p>
                  {campaign.start_time && (
                    <p>Start Date: {new Date(campaign.start_time).toLocaleDateString()}</p>
                  )}
                  {campaign.stop_time && (
                    <p>End Date: {new Date(campaign.stop_time).toLocaleDateString()}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="metrics">
              {renderMetricsTab()}
            </TabsContent>
          </Tabs>
        </div>
      );
      
    case 'adset':
      const adSet = selectedItem.item as FacebookAdSet;
      return (
        <div>
          <h2 className="text-2xl font-bold mb-4">{adSet.name}</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Ad Set Details</CardTitle>
                  <CardDescription>ID: {adSet.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Status: {adSet.status}</p>
                  <p>Optimization Goal: {adSet.optimization_goal || 'N/A'}</p>
                  <p>Billing Event: {adSet.billing_event || 'N/A'}</p>
                  <p>Bid Amount: {adSet.bid_amount ? `$${adSet.bid_amount}` : 'N/A'}</p>
                  <p>Daily Budget: {adSet.daily_budget ? `$${adSet.daily_budget}` : 'N/A'}</p>
                  <p>Lifetime Budget: {adSet.lifetime_budget ? `$${adSet.lifetime_budget}` : 'N/A'}</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="metrics">
              {renderMetricsTab()}
            </TabsContent>
          </Tabs>
        </div>
      );
      
    case 'ad':
      const ad = selectedItem.item as FacebookAd;
      return (
        <div>
          <h2 className="text-2xl font-bold mb-4">{ad.name}</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Ad Details</CardTitle>
                  <CardDescription>ID: {ad.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Status: {ad.status}</p>
                  <p>Bid Amount: {ad.bid_amount ? `$${ad.bid_amount}` : 'N/A'}</p>
                  {ad.creative && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Creative</h3>
                      {ad.creative.title && <p>Title: {ad.creative.title}</p>}
                      {ad.creative.body && <p>Body: {ad.creative.body}</p>}
                      {ad.creative.image_url && (
                        <div className="mt-2">
                          <div className="relative w-full max-w-md h-64">
                            <Image 
                              src={ad.creative.image_url} 
                              alt="Ad Creative"
                              fill
                              className="object-contain rounded-md"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="metrics">
              {renderMetricsTab()}
            </TabsContent>
          </Tabs>
        </div>
      );
      
    case 'lead-nurturing':
      return (
        <div>
          <AvatarConstructor />
        </div>
      );
      
    default:
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <h3 className="text-lg font-medium mb-2">Unknown Item Type</h3>
            <p className="text-sm">The selected item type is not recognized</p>
          </div>
        </div>
      );
  }
} 