"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BarChart, LineChart, PieChart, 
  ResponsiveContainer, XAxis, YAxis, Tooltip, 
  Legend, Bar, Line, Pie, Cell 
} from "recharts";
import { RefreshCw, AlertCircle, Activity, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FacebookMetrics } from "@/lib/types";
import { FacebookConnectButton } from "@/components/facebook/connect-button";

interface MetricsProps {
  entityType: 'campaign' | 'adset' | 'ad';
  entityId: string;
  entityName: string;
  currency?: string;
}

interface ExtendedFacebookMetrics extends FacebookMetrics {
  date: string;
}

export function MetricsDashboard({ entityType, entityId, entityName, currency = 'USD' }: MetricsProps) {
  const [metrics, setMetrics] = useState<ExtendedFacebookMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30");
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState("overview");
  const [permissionError, setPermissionError] = useState<boolean>(false);

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch metrics data
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionError(false);
    
    try {
      const response = await fetch(
        `/api/facebook/metrics?type=${entityType}&id=${entityId}&days=${timeRange}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes("has NOT grant ads_management or ads_read permission")) {
          setPermissionError(true);
          throw new Error("Facebook permissions error: Missing required permissions for metrics");
        }
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data.metrics || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch metrics");
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, timeRange]);

  // Sync metrics
  const syncMetrics = useCallback(async () => {
    setSyncStatus('syncing');
    setPermissionError(false);
    
    try {
      // First, get the ad account ID based on entity type and ID
      let adAccountId = "";
      
      if (entityType === 'campaign') {
        const campaignResponse = await fetch(`/api/facebook/campaigns?campaignId=${entityId}`);
        if (!campaignResponse.ok) throw new Error("Failed to fetch campaign");
        const campaignData = await campaignResponse.json();
        adAccountId = campaignData.campaign?.ad_account_id;
      } else if (entityType === 'adset') {
        const adSetResponse = await fetch(`/api/facebook/adsets?adSetId=${entityId}`);
        if (!adSetResponse.ok) throw new Error("Failed to fetch ad set");
        const adSetData = await adSetResponse.json();
        
        if (adSetData.adSet?.campaign_id) {
          const campaignResponse = await fetch(`/api/facebook/campaigns?campaignId=${adSetData.adSet.campaign_id}`);
          if (!campaignResponse.ok) throw new Error("Failed to fetch campaign");
          const campaignData = await campaignResponse.json();
          adAccountId = campaignData.campaign?.ad_account_id;
        }
      } else if (entityType === 'ad') {
        const adResponse = await fetch(`/api/facebook/ads?adId=${entityId}`);
        if (!adResponse.ok) throw new Error("Failed to fetch ad");
        const adData = await adResponse.json();
        
        if (adData.ad?.campaign_id) {
          const campaignResponse = await fetch(`/api/facebook/campaigns?campaignId=${adData.ad.campaign_id}`);
          if (!campaignResponse.ok) throw new Error("Failed to fetch campaign");
          const campaignData = await campaignResponse.json();
          adAccountId = campaignData.campaign?.ad_account_id;
        }
      }
      
      if (!adAccountId) {
        throw new Error("Could not determine ad account ID");
      }
      
      // Trigger metrics sync
      const response = await fetch("/api/facebook/sync-metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adAccountId,
          datePreset: timeRangeToDatePreset(timeRange),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error && errorData.error.includes("has NOT grant ads_management or ads_read permission")) {
          setPermissionError(true);
          throw new Error("Facebook permissions error: Missing required permissions for metrics");
        }
        throw new Error(errorData.error || "Failed to sync metrics");
      }
      
      setSyncStatus('success');
      
      // Fetch updated metrics after a short delay
      setTimeout(fetchMetrics, 2000);
    } catch (error) {
      setSyncStatus('error');
      setError(error instanceof Error ? error.message : "Failed to sync metrics");
      console.error("Error syncing metrics:", error);
    }
  }, [entityType, entityId, timeRange, fetchMetrics]);

  useEffect(() => {
    fetchMetrics();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('metrics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: `facebook_${entityType}_metrics`,
          filter: `${entityType === 'adset' ? 'ad_set_id' : entityType + '_id'}=eq.${entityId}`
        },
        () => {
          // Refresh metrics when data changes
          fetchMetrics();
        }
      )
      .subscribe();
    
    return () => {
      // Clean up subscription
      supabase.removeChannel(channel);
    };
  }, [entityType, entityId, timeRange, fetchMetrics, supabase]);
  
  // Auto-sync metrics on first load if there are no metrics
  useEffect(() => {
    const autoSyncIfEmpty = async () => {
      // If we've loaded and there are no metrics, trigger a sync
      if (!loading && metrics.length === 0 && !error && !permissionError) {
        console.log('No metrics found, auto-syncing...');
        await syncMetrics();
      }
    };
    
    autoSyncIfEmpty();
  }, [loading, metrics.length, error, permissionError, syncMetrics]);

  // Convert days to Facebook date preset
  const timeRangeToDatePreset = (days: string): string => {
    switch (days) {
      case "7":
        return "last_7_days";
      case "14":
        return "last_14_days";
      case "30":
        return "last_30_days";
      case "90":
        return "last_90_days";
      case "180":
        return "last_6_months";
      case "365":
        return "last_year";
      default:
        return "last_30_days";
    }
  };

  // Format currency
  const formatCurrency = (value: string | number): string => {
    if (typeof value === 'string') {
      value = parseFloat(value);
    }
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return formatter.format(value);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Format large numbers
  const formatNumber = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toString();
    }
  };

  // Calculate total and average metrics
  const calculateTotals = () => {
    if (!metrics.length) return null;
    
    const totals = {
      impressions: 0,
      clicks: 0,
      spend: 0,
      reach: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      frequency: 0,
      conversion_rate: 0,
    };
    
    metrics.forEach((metric) => {
      totals.impressions += metric.impressions || 0;
      totals.clicks += metric.clicks || 0;
      totals.spend += parseFloat(metric.spend || '0');
      totals.reach += metric.reach || 0;
      totals.conversions += metric.conversions || 0;
    });
    
    // Calculate derived metrics
    totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
    totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    totals.frequency = totals.reach > 0 ? totals.impressions / totals.reach : 0;
    totals.conversion_rate = totals.clicks > 0 ? totals.conversions / totals.clicks : 0;
    
    return totals;
  };

  // Process metrics data for charts
  const prepareChartData = () => {
    if (!metrics.length) return [];
    
    // Sort by date ascending
    return [...metrics]
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      })
      .map((metric) => {
        const date = new Date(metric.date);
        return {
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          impressions: metric.impressions,
          clicks: metric.clicks,
          spend: parseFloat(metric.spend || '0'),
          conversions: metric.conversions,
          ctr: metric.ctr,
          cpc: parseFloat(metric.cpc || '0'),
        };
      });
  };

  // Prepare pie chart data
  const preparePieChartData = () => {
    const totals = calculateTotals();
    if (!totals) return [];
    
    return [
      { name: 'Clicks', value: totals.clicks },
      { name: 'No Action', value: totals.impressions - totals.clicks }
    ];
  };

  const chartData = prepareChartData();
  const pieData = preparePieChartData();
  const totals = calculateTotals();
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Add permission error card component
  const PermissionErrorCard = () => (
    <Card className="mt-6 border-orange-300">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center py-6">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Facebook Permissions Required</h3>
          <p className="text-center text-muted-foreground mt-2 mb-6 max-w-md">
            Your Facebook account doesn&apos;t have the required permissions to access metrics data. 
            Please reconnect your account with full permissions for ads insights.
          </p>
          <FacebookConnectButton 
            variant="default"
            requiresReconnect={true}
          >
            Reconnect with Full Permissions
          </FacebookConnectButton>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {error && !permissionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {permissionError && <PermissionErrorCard />}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">{entityName} Metrics</h2>
          <p className="text-muted-foreground text-sm">
            Performance data for this {entityType}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncMetrics}
            disabled={syncStatus === 'syncing' || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : !metrics.length && !permissionError ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="text-center py-6">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Metrics Available</h3>
                <p className="text-muted-foreground mt-2 mb-4">
                  There are no metrics available for this {entityType} in the selected time period.
                </p>
                <Button onClick={syncMetrics}>
                  Sync Metrics
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !permissionError ? (
          <>
            <TabsContent value="overview">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Impressions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && formatNumber(totals.impressions)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Clicks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && formatNumber(totals.clicks)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Spend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && formatCurrency(totals.spend)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Conversions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && formatNumber(totals.conversions)}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Over Time</CardTitle>
                    <CardDescription>
                      Impressions and clicks over the selected time period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              if (name === 'impressions' || name === 'clicks') {
                                return [formatNumber(value), name];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="impressions"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="clicks"
                            stroke="#82ca9d"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Click-Through Rate</CardTitle>
                    <CardDescription>
                      Percentage of impressions that resulted in clicks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="text-3xl font-bold mb-4">
                      {totals && formatPercentage(totals.ctr)}
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [formatNumber(value), 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="performance">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cost per Click (CPC)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && formatCurrency(totals.cpc)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      CTR
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && formatPercentage(totals.ctr)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Conversion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && formatPercentage(totals.conversion_rate)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cost per Conversion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && totals.conversions > 0 
                        ? formatCurrency(totals.spend / totals.conversions) 
                        : "N/A"}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Daily Performance</CardTitle>
                  <CardDescription>
                    Cost metrics over the selected time period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'spend') {
                              return [formatCurrency(value), 'Spend'];
                            } else if (name === 'cpc') {
                              return [formatCurrency(value), 'CPC'];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="spend"
                          fill="#8884d8"
                          name="Spend"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="cpc"
                          fill="#82ca9d"
                          name="CPC"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="engagement">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Reach
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && formatNumber(totals.reach)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Frequency
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && totals.frequency.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Clicks per User
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && totals.reach > 0 
                        ? (totals.clicks / totals.reach).toFixed(2) 
                        : "N/A"}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cost per Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="text-2xl font-bold">
                      {totals && totals.conversions > 0 
                        ? formatCurrency(totals.spend / totals.conversions) 
                        : "N/A"}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Daily Conversions</CardTitle>
                  <CardDescription>
                    Conversions and CTR over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 0.1]} />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'conversions') {
                              return [formatNumber(value), 'Conversions'];
                            } else if (name === 'ctr') {
                              return [formatPercentage(value), 'CTR'];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="conversions"
                          fill="#8884d8"
                          name="Conversions"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="ctr"
                          stroke="#ff7300"
                          name="CTR"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </div>
  );
} 