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

// ============================================================================
// TypeScript Interfaces
// ============================================================================

type SelectedItem = FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile | null;

interface ContentViewProps {
  selectedItem: SelectedItem;
}

// ============================================================================
// Main Component
// ============================================================================

export function ContentView({ selectedItem }: ContentViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

  // Derive entity type and ID from selected item
  const entityType = selectedItem ? 
    'id' in selectedItem && 'ad_account_id' in selectedItem ? 'campaign' :
    'id' in selectedItem && 'campaign_id' in selectedItem ? 'adset' :
    'id' in selectedItem && 'ad_set_id' in selectedItem ? 'ad' :
    'id' in selectedItem && 'account_id' in selectedItem ? 'account' :
    null : null;

  const entityId = selectedItem && 'id' in selectedItem ? selectedItem.id : null;

  // Data fetching hooks
  const { 
    data: metricsData, 
    isLoading: metricsLoading, 
    refetch: refetchMetrics 
  } = useFacebookMetrics(entityType, entityId, 30);

  const { 
    data: metricsSummary, 
    isLoading: summaryLoading, 
    refetch: refetchSummary 
  } = useFacebookMetricsSummary(entityType, entityId, 30);

  // Prefetch data when selectedItem changes
  useEffect(() => {
    if (entityType && entityId) {
      prefetchMetrics(queryClient, entityType, entityId, 30);
      prefetchMetricsSummary(queryClient, entityType, entityId, 30);
    }
  }, [entityType, entityId, queryClient]);

  // Combined refresh function
  const refreshMetricsData = async () => {
    await Promise.all([
      refetchMetrics(),
      refetchSummary()
    ]);
  };

  // Metrics display components
  const renderMetricsSummary = () => {
    if (summaryLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!metricsSummary) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Impressions", value: "0", icon: BarChart2 },
            { label: "Clicks", value: "0", icon: MousePointerClick },
            { label: "Reach", value: "0", icon: Users },
            { label: "Spend", value: "$0.00", icon: DollarSign }
          ].map((metric, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-2">
                    <metric.icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impressions</p>
                <p className="text-2xl font-bold">{metricsSummary.impressions?.toLocaleString() || '0'}</p>
                <p className="text-sm text-muted-foreground">
                  CPM: ${metricsSummary.cpm || '0.00'}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <BarChart2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clicks</p>
                <p className="text-2xl font-bold">{metricsSummary.clicks?.toLocaleString() || '0'}</p>
                <p className="text-sm text-muted-foreground">
                  CPC: ${metricsSummary.cpc || '0.00'}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <MousePointerClick className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reach</p>
                <p className="text-2xl font-bold">{metricsSummary.reach?.toLocaleString() || '0'}</p>
                <p className="text-sm text-muted-foreground">
                  Frequency: {metricsSummary.frequency?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spend</p>
                <p className="text-2xl font-bold">
                  ${parseFloat(metricsSummary.spend || '0').toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  CTR: {(metricsSummary.ctr || 0).toFixed(2)}%
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-2">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMetricsTable = () => {
    if (metricsLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading metrics...</span>
        </div>
      );
    }

    if (!metricsData || metricsData.length === 0) {
      return (
        <Alert>
          <AlertDescription>
            No metrics data available for the selected time period.
          </AlertDescription>
        </Alert>
      );
    }

    // Sort by date (newest first)
    const sortedMetrics = [...metricsData].sort((a, b) => 
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
                <TableCell>{metric.ctr.toFixed(2)}%</TableCell>
                <TableCell>${parseFloat(metric.cpc).toFixed(2)}</TableCell>
                <TableCell>
                  ${parseFloat(metric.spend).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </TableCell>
                <TableCell>{metric.reach.toLocaleString()}</TableCell>
                <TableCell>{metric.frequency.toFixed(2)}</TableCell>
                <TableCell>{metric.conversions}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderMetricsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Performance Metrics</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshMetricsData}
          disabled={metricsLoading || summaryLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${(metricsLoading || summaryLoading) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {renderMetricsSummary()}
      
      <Card>
        <CardHeader>
          <CardTitle>Daily Metrics</CardTitle>
          <CardDescription>
            Detailed performance metrics over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderMetricsTable()}
        </CardContent>
      </Card>
    </div>
  );

  // No item selected
  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Item Selected</h3>
          <p className="text-muted-foreground">
            Select an account, campaign, ad set, or ad to view details
          </p>
        </div>
      </div>
    );
  }

  // Render based on item type
  if ('account_id' in selectedItem) {
    // Facebook Ad Account
    const account = selectedItem as FacebookAdAccount;
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ad Account Details</CardTitle>
              <CardDescription>
                Information about your Facebook ad account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Account ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">{account.account_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">{account.account_status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Currency</Label>
                  <p className="text-sm text-muted-foreground">{account.currency}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount Spent</Label>
                  <p className="text-sm text-muted-foreground">
                    {parseFloat(account.amount_spent).toLocaleString()} {account.currency}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Balance</Label>
                  <p className="text-sm text-muted-foreground">
                    {parseFloat(account.balance).toLocaleString()} {account.currency}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Business Location</Label>
                  <p className="text-sm text-muted-foreground">
                    {account.business_city}, {account.business_country_code}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  }

  if ('ad_account_id' in selectedItem) {
    // Facebook Campaign
    const campaign = selectedItem as FacebookCampaign;
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Information about your Facebook campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Objective</Label>
                  <p className="text-sm text-muted-foreground">{campaign.objective}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">{campaign.status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Daily Budget</Label>
                  <p className="text-sm text-muted-foreground">
                    {campaign.daily_budget ? `$${parseFloat(campaign.daily_budget).toFixed(2)}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Lifetime Budget</Label>
                  <p className="text-sm text-muted-foreground">
                    {campaign.lifetime_budget ? `$${parseFloat(campaign.lifetime_budget).toFixed(2)}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Start Time</Label>
                  <p className="text-sm text-muted-foreground">
                    {campaign.start_time ? new Date(campaign.start_time).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Stop Time</Label>
                  <p className="text-sm text-muted-foreground">
                    {campaign.stop_time ? new Date(campaign.stop_time).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {renderMetricsTab()}
        </TabsContent>
      </Tabs>
    );
  }

  if ('campaign_id' in selectedItem) {
    // Facebook Ad Set
    const adSet = selectedItem as FacebookAdSet;
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ad Set Details</CardTitle>
              <CardDescription>
                Information about your Facebook ad set
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Optimization Goal</Label>
                  <p className="text-sm text-muted-foreground">{adSet.optimization_goal}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Billing Event</Label>
                  <p className="text-sm text-muted-foreground">{adSet.billing_event}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Daily Budget</Label>
                  <p className="text-sm text-muted-foreground">
                    {adSet.daily_budget ? `$${parseFloat(adSet.daily_budget).toFixed(2)}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Lifetime Budget</Label>
                  <p className="text-sm text-muted-foreground">
                    {adSet.lifetime_budget ? `$${parseFloat(adSet.lifetime_budget).toFixed(2)}` : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Bid Amount</Label>
                  <p className="text-sm text-muted-foreground">
                    {adSet.bid_amount ? `$${parseFloat(adSet.bid_amount).toFixed(2)}` : 'Automatic'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">{adSet.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {renderMetricsTab()}
        </TabsContent>
      </Tabs>
    );
  }

  if ('ad_set_id' in selectedItem) {
    // Facebook Ad
    const ad = selectedItem as FacebookAd;
    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ad Details</CardTitle>
              <CardDescription>
                Information about your Facebook ad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">{ad.status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Configured Status</Label>
                  <p className="text-sm text-muted-foreground">{ad.configured_status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Bid Amount</Label>
                  <p className="text-sm text-muted-foreground">
                    {ad.bid_amount ? `$${parseFloat(ad.bid_amount).toFixed(2)}` : 'Automatic'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Creative Name</Label>
                  <p className="text-sm text-muted-foreground">{ad.creative?.name || 'No creative'}</p>
                </div>
              </div>

              {ad.creative && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Creative Preview</Label>
                    <div className="mt-2 p-4 border rounded-lg">
                      {ad.creative.image_url && (
                        <div className="mb-3">
                          <Image
                            src={ad.creative.image_url}
                            alt={ad.creative.title || 'Ad creative'}
                            width={300}
                            height={200}
                            className="rounded object-contain"
                          />
                        </div>
                      )}
                      {ad.creative.title && (
                        <h4 className="font-semibold mb-2">{ad.creative.title}</h4>
                      )}
                      {ad.creative.body && (
                        <p className="text-sm text-muted-foreground">{ad.creative.body}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {renderMetricsTab()}
        </TabsContent>
      </Tabs>
    );
  }

  if ('type' in selectedItem && selectedItem.type === 'follow-up') {
    // Lead Nurturing File
    return <AvatarConstructor />;
  }

  // Unknown item type
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Unknown Item Type</h3>
        <p className="text-muted-foreground">
          Unable to display details for this item type
        </p>
      </div>
    </div>
  );
}