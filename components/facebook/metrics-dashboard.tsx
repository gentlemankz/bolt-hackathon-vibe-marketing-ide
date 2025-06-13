"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertCircle, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  DollarSign,
  MousePointer,
  Eye,
  Users,
  Target
} from 'lucide-react';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface MetricsProps {
  entityType: 'campaign' | 'adset' | 'ad';
  entityId: string;
  entityName: string;
  currency?: string;
}

interface ExtendedFacebookMetrics {
  id: string;
  date: string;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  spend: string;
  cpc: string;
  cpm: string;
  ctr: number;
  unique_clicks: number;
  unique_ctr: number;
  cost_per_result: string;
  conversions: number;
  conversion_rate: number;
  timestamp: string;
}

interface MetricsSummary {
  total_impressions: number;
  total_clicks: number;
  total_reach: number;
  total_spend: number;
  avg_cpc: number;
  avg_cpm: number;
  avg_ctr: number;
  total_conversions: number;
  avg_frequency: number;
  period_start: string;
  period_end: string;
}

interface ChartDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  conversions: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function MetricsDashboard({ entityType, entityId, entityName, currency = 'USD' }: MetricsProps) {
  console.log('📊 MetricsDashboard: Initializing for', entityType, entityId, entityName);

  // ============================================================================
  // State Management
  // ============================================================================

  const [metrics, setMetrics] = useState<ExtendedFacebookMetrics[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // ============================================================================
  // Supabase Client
  // ============================================================================

  const supabase = createClient();

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const formatCurrency = useCallback((amount: string | number, currencyCode: string = currency): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  }, [currency]);

  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }, []);

  const formatPercentage = useCallback((num: number): string => {
    return `${num.toFixed(2)}%`;
  }, []);

  const calculateTrend = useCallback((current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: 0, isPositive: true };
    const trend = ((current - previous) / previous) * 100;
    return { value: Math.abs(trend), isPositive: trend >= 0 };
  }, []);

  const getTableName = useCallback((type: string): string => {
    switch (type) {
      case 'campaign':
        return 'facebook_campaign_metrics';
      case 'adset':
        return 'facebook_adset_metrics';
      case 'ad':
        return 'facebook_ad_metrics';
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }
  }, []);

  const getEntityColumn = useCallback((type: string): string => {
    switch (type) {
      case 'campaign':
        return 'campaign_id';
      case 'adset':
        return 'ad_set_id';
      case 'ad':
        return 'ad_id';
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }
  }, []);

  // ============================================================================
  // Data Fetching Functions
  // ============================================================================

  const fetchMetrics = useCallback(async (days: string = timeRange) => {
    console.log('📡 MetricsDashboard: Fetching metrics for', entityType, entityId, 'days:', days);
    setLoading(true);
    setError(null);
    setPermissionError(false);

    try {
      const tableName = getTableName(entityType);
      const entityColumn = getEntityColumn(entityType);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(days));

      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .eq(entityColumn, entityId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (fetchError) {
        console.error('❌ MetricsDashboard: Error fetching metrics:', fetchError);
        throw fetchError;
      }

      console.log('✅ MetricsDashboard: Fetched', data?.length || 0, 'metrics records');
      setMetrics(data || []);

      // Calculate summary
      if (data && data.length > 0) {
        const summaryData = calculateSummary(data);
        setSummary(summaryData);
      } else {
        setSummary(null);
      }

    } catch (err) {
      console.error('❌ MetricsDashboard: Error in fetchMetrics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
      
      if (errorMessage.toLowerCase().includes('permission')) {
        setPermissionError(true);
        setError('Permission denied. Please reconnect your Facebook account with proper permissions.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, timeRange, supabase, getTableName, getEntityColumn]);

  const calculateSummary = useCallback((metricsData: ExtendedFacebookMetrics[]): MetricsSummary => {
    console.log('🧮 MetricsDashboard: Calculating summary for', metricsData.length, 'records');
    
    const totals = metricsData.reduce((acc, metric) => {
      acc.impressions += metric.impressions;
      acc.clicks += metric.clicks;
      acc.reach += metric.reach;
      acc.spend += parseFloat(metric.spend);
      acc.conversions += metric.conversions;
      acc.frequency += metric.frequency;
      return acc;
    }, {
      impressions: 0,
      clicks: 0,
      reach: 0,
      spend: 0,
      conversions: 0,
      frequency: 0
    });

    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
    const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const avgFrequency = metricsData.length > 0 ? totals.frequency / metricsData.length : 0;

    const summary: MetricsSummary = {
      total_impressions: totals.impressions,
      total_clicks: totals.clicks,
      total_reach: totals.reach,
      total_spend: totals.spend,
      avg_cpc: avgCpc,
      avg_cpm: avgCpm,
      avg_ctr: avgCtr,
      total_conversions: totals.conversions,
      avg_frequency: avgFrequency,
      period_start: metricsData[0]?.date || '',
      period_end: metricsData[metricsData.length - 1]?.date || ''
    };

    console.log('✅ MetricsDashboard: Summary calculated:', summary);
    return summary;
  }, []);

  const syncMetrics = useCallback(async () => {
    console.log('🔄 MetricsDashboard: Starting metrics sync for', entityType, entityId);
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch('/api/facebook/metrics/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType,
          entityId,
          timeRange
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync metrics');
      }

      console.log('✅ MetricsDashboard: Metrics sync completed');
      setLastSyncTime(new Date());
      
      // Refresh metrics after sync
      await fetchMetrics();

    } catch (err) {
      console.error('❌ MetricsDashboard: Error syncing metrics:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync metrics';
      setError(errorMessage);
    } finally {
      setSyncing(false);
    }
  }, [entityType, entityId, timeRange, fetchMetrics]);

  // ============================================================================
  // Chart Data Preparation
  // ============================================================================

  const chartData = useMemo((): ChartDataPoint[] => {
    console.log('📈 MetricsDashboard: Preparing chart data from', metrics.length, 'metrics');
    
    return metrics.map(metric => ({
      date: new Date(metric.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      impressions: metric.impressions,
      clicks: metric.clicks,
      spend: parseFloat(metric.spend),
      ctr: metric.ctr,
      cpc: parseFloat(metric.cpc),
      conversions: metric.conversions
    }));
  }, [metrics]);

  const pieChartData = useMemo(() => {
    if (!summary) return [];
    
    return [
      { name: 'Impressions', value: summary.total_impressions, color: '#8884d8' },
      { name: 'Clicks', value: summary.total_clicks, color: '#82ca9d' },
      { name: 'Conversions', value: summary.total_conversions, color: '#ffc658' },
    ].filter(item => item.value > 0);
  }, [summary]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    console.log('🔄 MetricsDashboard: Initial data fetch triggered');
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    console.log('🔄 MetricsDashboard: Time range changed to', timeRange);
    fetchMetrics(timeRange);
  }, [timeRange, fetchMetrics]);

  // Auto-sync when no metrics exist
  useEffect(() => {
    if (!loading && metrics.length === 0 && !error && autoSyncEnabled) {
      console.log('🤖 MetricsDashboard: No metrics found, triggering auto-sync');
      syncMetrics();
    }
  }, [loading, metrics.length, error, autoSyncEnabled, syncMetrics]);

  // Realtime subscription
  useEffect(() => {
    console.log('📡 MetricsDashboard: Setting up realtime subscription');
    
    const tableName = getTableName(entityType);
    const entityColumn = getEntityColumn(entityType);
    
    const channel = supabase
      .channel(`metrics-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `${entityColumn}=eq.${entityId}`
        },
        (payload) => {
          console.log('📡 MetricsDashboard: Realtime update received:', payload);
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      console.log('📡 MetricsDashboard: Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [entityType, entityId, supabase, getTableName, getEntityColumn, fetchMetrics]);

  // ============================================================================
  // Tooltip Formatters
  // ============================================================================

  const customTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'spend' 
                ? `${entry.name}: ${formatCurrency(entry.value)}`
                : entry.dataKey === 'ctr'
                ? `${entry.name}: ${formatPercentage(entry.value)}`
                : `${entry.name}: ${formatNumber(entry.value)}`
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  }, [formatCurrency, formatPercentage, formatNumber]);

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderPermissionError = () => (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Permission Required
        </CardTitle>
        <CardDescription>
          Your Facebook account needs additional permissions to access metrics data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          To view detailed metrics and analytics, please reconnect your Facebook account with the required permissions:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 mb-4">
          <li>• ads_management - Manage your ads</li>
          <li>• ads_read - Read your ad data</li>
          <li>• read_insights - Access performance metrics</li>
        </ul>
        <Button variant="outline" className="w-full">
          Reconnect Facebook Account
        </Button>
      </CardContent>
    </Card>
  );

  const renderMetricCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    trend?: { value: number; isPositive: boolean },
    subtitle?: string
  ) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-1">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {trend.value.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-primary/10 p-2">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard(
            'Total Impressions',
            formatNumber(summary.total_impressions),
            <Eye className="h-4 w-4" />,
            undefined,
            'Total ad views'
          )}
          {renderMetricCard(
            'Total Clicks',
            formatNumber(summary.total_clicks),
            <MousePointer className="h-4 w-4" />,
            undefined,
            `CTR: ${formatPercentage(summary.avg_ctr)}`
          )}
          {renderMetricCard(
            'Total Spend',
            formatCurrency(summary.total_spend),
            <DollarSign className="h-4 w-4" />,
            undefined,
            `Avg CPC: ${formatCurrency(summary.avg_cpc)}`
          )}
          {renderMetricCard(
            'Conversions',
            formatNumber(summary.total_conversions),
            <Target className="h-4 w-4" />,
            undefined,
            'Total conversions'
          )}
        </div>
      )}

      {/* Performance Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Overview
          </CardTitle>
          <CardDescription>
            Daily performance metrics over the selected time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={customTooltip} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="impressions" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Impressions"
                />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Clicks"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for the selected time period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Spend and CPC Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Spend & Cost Analysis</CardTitle>
          <CardDescription>
            Daily spend and cost per click trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={customTooltip} />
                <Legend />
                <Bar dataKey="spend" fill="#8884d8" name="Spend" />
                <Bar dataKey="cpc" fill="#82ca9d" name="CPC" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for the selected time period
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTR and Conversions Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Performance</CardTitle>
          <CardDescription>
            Click-through rate and conversion trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={customTooltip} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="ctr" 
                  stroke="#ff7300" 
                  strokeWidth={2}
                  name="CTR (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#00ff00" 
                  strokeWidth={2}
                  name="Conversions"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for the selected time period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderEngagementTab = () => (
    <div className="space-y-6">
      {/* Engagement Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Engagement Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of impressions, clicks, and conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No data available for the selected time period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderMetricCard(
            'Reach',
            formatNumber(summary.total_reach),
            <Users className="h-4 w-4" />,
            undefined,
            'Unique users reached'
          )}
          {renderMetricCard(
            'Frequency',
            summary.avg_frequency.toFixed(2),
            <Activity className="h-4 w-4" />,
            undefined,
            'Avg times shown per user'
          )}
          {renderMetricCard(
            'CPM',
            formatCurrency(summary.avg_cpm),
            <Eye className="h-4 w-4" />,
            undefined,
            'Cost per 1,000 impressions'
          )}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  console.log('🎨 MetricsDashboard: Rendering with state:', {
    entityType,
    entityId,
    metricsCount: metrics.length,
    loading,
    syncing,
    error,
    permissionError,
    timeRange,
    activeTab
  });

  if (permissionError) {
    return renderPermissionError();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {entityName} Metrics
          </h2>
          <p className="text-muted-foreground">
            Performance analytics for your {entityType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={syncMetrics}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Sync Status */}
      {lastSyncTime && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">
            Last synced: {lastSyncTime.toLocaleString()}
          </Badge>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading metrics...</span>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {renderOverviewTab()}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {renderPerformanceTab()}
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            {renderEngagementTab()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}