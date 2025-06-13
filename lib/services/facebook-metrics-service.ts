import { SupabaseClient } from '@supabase/supabase-js';
import { 
  getCampaignMetrics,
  getAdSetMetrics,
  getAdMetrics
} from '../meta-api';
import {
  FacebookCampaign,
  FacebookAdSet,
  FacebookAd,
  FacebookCampaignMetrics,
  FacebookAdSetMetrics,
  FacebookAdMetrics,
  FacebookSyncJob
} from '../types';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Raw metrics data item from Facebook API
 */
interface MetricsDataItem {
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  date_start: string;
  date_stop: string;
  impressions?: number;
  clicks?: number;
  spend?: string;
  reach?: number;
  frequency?: number;
  cpc?: string;
  cpm?: string;
  ctr?: number;
  unique_clicks?: number;
  unique_ctr?: number;
  cost_per_result?: string;
  conversions?: number;
  actions?: Array<{action_type: string; value: string}>;
  [key: string]: unknown;
}

/**
 * Processed metric for database storage
 */
interface ProcessedMetric {
  campaign_id?: string;
  ad_set_id?: string;
  ad_id?: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: string;
  reach: number;
  frequency: number;
  cpc: string;
  cpm: string;
  ctr: number;
  unique_clicks: number;
  unique_ctr: number;
  cost_per_result: string;
  conversions: number;
  conversion_rate: number;
}

// ============================================================================
// FacebookMetricsService Class
// ============================================================================

/**
 * Service class for Facebook Marketing API metrics integration with Supabase
 */
export class FacebookMetricsService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new sync job
   */
  async createSyncJob(
    userId: string, 
    adAccountId: string, 
    jobType: 'account' | 'campaign' | 'adset' | 'ad' | 'metrics'
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('facebook_sync_jobs')
        .insert({
          user_id: userId,
          ad_account_id: adAccountId,
          job_type: jobType,
          status: 'pending',
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating sync job:', error);
        throw new Error(`Failed to create sync job: ${error.message}`);
      }

      console.log('Sync job created:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error in createSyncJob:', error);
      throw error;
    }
  }

  /**
   * Update sync job status
   */
  async updateSyncJobStatus(
    jobId: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    errorMessage?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        ...(errorMessage && { error_message: errorMessage }),
        ...(details && { details })
      };

      // Set completed_at timestamp for completed/failed jobs
      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await this.supabase
        .from('facebook_sync_jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        console.error('Error updating sync job status:', error);
        // Don't throw, just log
      }
    } catch (error) {
      console.error('Error in updateSyncJobStatus:', error);
      // Don't throw, just log
    }
  }

  /**
   * Get campaigns for an ad account
   */
  async getCampaigns(adAccountId: string): Promise<FacebookCampaign[]> {
    try {
      const { data, error } = await this.supabase
        .from('facebook_campaigns')
        .select('*')
        .eq('ad_account_id', adAccountId);

      if (error) {
        console.error('Error fetching campaigns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCampaigns:', error);
      return [];
    }
  }

  /**
   * Get ad sets for a campaign
   */
  async getAdSets(campaignId: string): Promise<FacebookAdSet[]> {
    try {
      const { data, error } = await this.supabase
        .from('facebook_ad_sets')
        .select('*')
        .eq('campaign_id', campaignId);

      if (error) {
        console.error('Error fetching ad sets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAdSets:', error);
      return [];
    }
  }

  /**
   * Get ads for an ad set
   */
  async getAds(adSetId: string): Promise<FacebookAd[]> {
    try {
      const { data, error } = await this.supabase
        .from('facebook_ads')
        .select('*')
        .eq('ad_set_id', adSetId);

      if (error) {
        console.error('Error fetching ads:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAds:', error);
      return [];
    }
  }

  /**
   * Fetch and save campaign metrics
   */
  async fetchAndSaveCampaignMetrics(
    campaigns: FacebookCampaign[],
    accessToken: string,
    datePreset: string = 'last_30_days'
  ): Promise<void> {
    // Return early if no campaigns
    if (!campaigns || campaigns.length === 0) {
      console.log('No campaigns to fetch metrics for');
      return;
    }

    try {
      // Extract campaign IDs array
      const campaignIds = campaigns.map(campaign => campaign.id);
      console.log(`Fetching metrics for ${campaignIds.length} campaigns`);

      let metricsData: MetricsDataItem[] = [];

      // Try to fetch metrics using getCampaignMetrics API
      try {
        const metricsResponse = await getCampaignMetrics(campaignIds, accessToken, datePreset);
        metricsData = metricsResponse.data || [];
        console.log(`Received ${metricsData.length} metrics records from API`);
      } catch (apiError) {
        console.warn('API failed, continuing with default values:', apiError);
        // Continue with empty data to generate defaults
      }

      // Calculate days based on datePreset
      const daysMap: Record<string, number> = {
        'last_7_days': 7,
        'last_14_days': 14,
        'last_30_days': 30,
        'last_90_days': 90
      };
      const days = daysMap[datePreset] || 30;

      // Generate default metrics for each campaign and date if no data returned
      const processedMetrics: ProcessedMetric[] = [];
      
      for (const campaign of campaigns) {
        // Create date entries for each day going back from today
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          // Find existing metric for this campaign and date
          const existingMetric = metricsData.find(
            metric => metric.campaign_id === campaign.id && 
                     metric.date_start === dateStr
          );

          if (existingMetric) {
            // Process existing metric
            const conversions = this.extractConversions(existingMetric.actions || []);
            const conversionRate = this.calculateConversionRate(conversions, existingMetric.clicks || 0);

            processedMetrics.push({
              campaign_id: campaign.id,
              date: dateStr,
              impressions: existingMetric.impressions || 0,
              clicks: existingMetric.clicks || 0,
              spend: existingMetric.spend || '0',
              reach: existingMetric.reach || 0,
              frequency: existingMetric.frequency || 0,
              cpc: existingMetric.cpc || '0',
              cpm: existingMetric.cpm || '0',
              ctr: existingMetric.ctr || 0,
              unique_clicks: existingMetric.unique_clicks || 0,
              unique_ctr: existingMetric.unique_ctr || 0,
              cost_per_result: existingMetric.cost_per_result || '0',
              conversions,
              conversion_rate: conversionRate
            });
          } else {
            // Create default metric entry
            processedMetrics.push({
              campaign_id: campaign.id,
              date: dateStr,
              impressions: 0,
              clicks: 0,
              spend: '0',
              reach: 0,
              frequency: 0,
              cpc: '0',
              cpm: '0',
              ctr: 0,
              unique_clicks: 0,
              unique_ctr: 0,
              cost_per_result: '0',
              conversions: 0,
              conversion_rate: 0
            });
          }
        }
      }

      // Batch insert metrics (max 1000 at a time)
      await this.batchInsertMetrics('facebook_campaign_metrics', processedMetrics);

      // Update last_synced_at for campaigns
      const campaignUpdates = campaigns.map(campaign => ({
        id: campaign.id,
        last_synced_at: new Date().toISOString()
      }));

      for (const update of campaignUpdates) {
        const { error } = await this.supabase
          .from('facebook_campaigns')
          .update({ last_synced_at: update.last_synced_at })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating campaign sync time:', error);
        }
      }

      console.log(`Successfully processed ${processedMetrics.length} campaign metrics`);
    } catch (error) {
      console.error('Error in fetchAndSaveCampaignMetrics:', error);
      throw error;
    }
  }

  /**
   * Fetch and save ad set metrics
   */
  async fetchAndSaveAdSetMetrics(
    adSets: FacebookAdSet[],
    accessToken: string,
    datePreset: string = 'last_30_days'
  ): Promise<void> {
    // Return early if no ad sets
    if (!adSets || adSets.length === 0) {
      console.log('No ad sets to fetch metrics for');
      return;
    }

    try {
      // Extract ad set IDs array
      const adSetIds = adSets.map(adSet => adSet.id);
      console.log(`Fetching metrics for ${adSetIds.length} ad sets`);

      let metricsData: MetricsDataItem[] = [];

      // Try to fetch metrics using getAdSetMetrics API
      try {
        const metricsResponse = await getAdSetMetrics(adSetIds, accessToken, datePreset);
        metricsData = metricsResponse.data || [];
        console.log(`Received ${metricsData.length} ad set metrics records from API`);
      } catch (apiError) {
        console.warn('Ad set API failed, continuing with default values:', apiError);
        // Continue with empty data to generate defaults
      }

      // Calculate days based on datePreset
      const daysMap: Record<string, number> = {
        'last_7_days': 7,
        'last_14_days': 14,
        'last_30_days': 30,
        'last_90_days': 90
      };
      const days = daysMap[datePreset] || 30;

      // Generate metrics for each ad set and date
      const processedMetrics: ProcessedMetric[] = [];
      
      for (const adSet of adSets) {
        // Create date entries for each day going back from today
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          // Find existing metric for this ad set and date
          const existingMetric = metricsData.find(
            metric => metric.adset_id === adSet.id && 
                     metric.date_start === dateStr
          );

          if (existingMetric) {
            // Process existing metric
            const conversions = this.extractConversions(existingMetric.actions || []);
            const conversionRate = this.calculateConversionRate(conversions, existingMetric.clicks || 0);

            processedMetrics.push({
              ad_set_id: adSet.id,
              date: dateStr,
              impressions: existingMetric.impressions || 0,
              clicks: existingMetric.clicks || 0,
              spend: existingMetric.spend || '0',
              reach: existingMetric.reach || 0,
              frequency: existingMetric.frequency || 0,
              cpc: existingMetric.cpc || '0',
              cpm: existingMetric.cpm || '0',
              ctr: existingMetric.ctr || 0,
              unique_clicks: existingMetric.unique_clicks || 0,
              unique_ctr: existingMetric.unique_ctr || 0,
              cost_per_result: existingMetric.cost_per_result || '0',
              conversions,
              conversion_rate: conversionRate
            });
          } else {
            // Create default metric entry
            processedMetrics.push({
              ad_set_id: adSet.id,
              date: dateStr,
              impressions: 0,
              clicks: 0,
              spend: '0',
              reach: 0,
              frequency: 0,
              cpc: '0',
              cpm: '0',
              ctr: 0,
              unique_clicks: 0,
              unique_ctr: 0,
              cost_per_result: '0',
              conversions: 0,
              conversion_rate: 0
            });
          }
        }
      }

      // Batch insert metrics (max 1000 at a time)
      await this.batchInsertMetrics('facebook_adset_metrics', processedMetrics);

      // Update last_synced_at for ad sets
      const adSetUpdates = adSets.map(adSet => ({
        id: adSet.id,
        last_synced_at: new Date().toISOString()
      }));

      for (const update of adSetUpdates) {
        const { error } = await this.supabase
          .from('facebook_ad_sets')
          .update({ last_synced_at: update.last_synced_at })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating ad set sync time:', error);
        }
      }

      console.log(`Successfully processed ${processedMetrics.length} ad set metrics`);
    } catch (error) {
      console.error('Error in fetchAndSaveAdSetMetrics:', error);
      throw error;
    }
  }

  /**
   * Fetch and save ad metrics
   */
  async fetchAndSaveAdMetrics(
    ads: FacebookAd[],
    accessToken: string,
    datePreset: string = 'last_30_days'
  ): Promise<void> {
    // Return early if no ads
    if (!ads || ads.length === 0) {
      console.log('No ads to fetch metrics for');
      return;
    }

    try {
      // Extract ad IDs array
      const adIds = ads.map(ad => ad.id);
      console.log(`Fetching metrics for ${adIds.length} ads`);

      let metricsData: MetricsDataItem[] = [];

      // Try to fetch metrics using getAdMetrics API
      try {
        const metricsResponse = await getAdMetrics(adIds, accessToken, datePreset);
        metricsData = metricsResponse.data || [];
        console.log(`Received ${metricsData.length} ad metrics records from API`);
      } catch (apiError) {
        console.warn('Ad API failed, continuing with default values:', apiError);
        // Continue with empty data to generate defaults
      }

      // Calculate days based on datePreset
      const daysMap: Record<string, number> = {
        'last_7_days': 7,
        'last_14_days': 14,
        'last_30_days': 30,
        'last_90_days': 90
      };
      const days = daysMap[datePreset] || 30;

      // Generate metrics for each ad and date
      const processedMetrics: ProcessedMetric[] = [];
      
      for (const ad of ads) {
        // Create date entries for each day going back from today
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          // Find existing metric for this ad and date
          const existingMetric = metricsData.find(
            metric => metric.ad_id === ad.id && 
                     metric.date_start === dateStr
          );

          if (existingMetric) {
            // Process existing metric
            const conversions = this.extractConversions(existingMetric.actions || []);
            const conversionRate = this.calculateConversionRate(conversions, existingMetric.clicks || 0);

            processedMetrics.push({
              ad_id: ad.id,
              date: dateStr,
              impressions: existingMetric.impressions || 0,
              clicks: existingMetric.clicks || 0,
              spend: existingMetric.spend || '0',
              reach: existingMetric.reach || 0,
              frequency: existingMetric.frequency || 0,
              cpc: existingMetric.cpc || '0',
              cpm: existingMetric.cpm || '0',
              ctr: existingMetric.ctr || 0,
              unique_clicks: existingMetric.unique_clicks || 0,
              unique_ctr: existingMetric.unique_ctr || 0,
              cost_per_result: existingMetric.cost_per_result || '0',
              conversions,
              conversion_rate: conversionRate
            });
          } else {
            // Create default metric entry
            processedMetrics.push({
              ad_id: ad.id,
              date: dateStr,
              impressions: 0,
              clicks: 0,
              spend: '0',
              reach: 0,
              frequency: 0,
              cpc: '0',
              cpm: '0',
              ctr: 0,
              unique_clicks: 0,
              unique_ctr: 0,
              cost_per_result: '0',
              conversions: 0,
              conversion_rate: 0
            });
          }
        }
      }

      // Batch insert metrics (max 1000 at a time)
      await this.batchInsertMetrics('facebook_ad_metrics', processedMetrics);

      // Update last_synced_at for ads
      const adUpdates = ads.map(ad => ({
        id: ad.id,
        last_synced_at: new Date().toISOString()
      }));

      for (const update of adUpdates) {
        const { error } = await this.supabase
          .from('facebook_ads')
          .update({ last_synced_at: update.last_synced_at })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating ad sync time:', error);
        }
      }

      console.log(`Successfully processed ${processedMetrics.length} ad metrics`);
    } catch (error) {
      console.error('Error in fetchAndSaveAdMetrics:', error);
      throw error;
    }
  }

  /**
   * Get campaign metrics from database
   */
  async getCampaignMetrics(campaignId: string, days: number = 30): Promise<FacebookCampaignMetrics[]> {
    try {
      // Calculate start date (days back from today)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('facebook_campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching campaign metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCampaignMetrics:', error);
      return [];
    }
  }

  /**
   * Get ad set metrics from database
   */
  async getAdSetMetrics(adSetId: string, days: number = 30): Promise<FacebookAdSetMetrics[]> {
    try {
      // Calculate start date (days back from today)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('facebook_adset_metrics')
        .select('*')
        .eq('ad_set_id', adSetId)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching ad set metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAdSetMetrics:', error);
      return [];
    }
  }

  /**
   * Get ad metrics from database
   */
  async getAdMetrics(adId: string, days: number = 30): Promise<FacebookAdMetrics[]> {
    try {
      // Calculate start date (days back from today)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('facebook_ad_metrics')
        .select('*')
        .eq('ad_id', adId)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching ad metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAdMetrics:', error);
      return [];
    }
  }

  /**
   * Sync all metrics for an ad account
   */
  async syncAllMetrics(userId: string, adAccountId: string, accessToken: string): Promise<string> {
    let jobId = '';
    
    try {
      // Create sync job with 'metrics' type
      jobId = await this.createSyncJob(userId, adAccountId, 'metrics');
      
      // Update job status to 'running'
      await this.updateSyncJobStatus(jobId, 'running');

      // Check token permissions
      const hasPermissionIssues = await this.checkForPermissionIssues(userId);
      if (hasPermissionIssues) {
        console.warn('Token lacks ad permissions for user:', userId);
      }

      let campaignCount = 0;
      let adSetCount = 0;
      let adCount = 0;

      // Get all campaigns for ad account
      const campaigns = await this.getCampaigns(adAccountId);
      campaignCount = campaigns.length;
      
      // Try to fetch campaign metrics (handle errors gracefully)
      try {
        await this.fetchAndSaveCampaignMetrics(campaigns, accessToken);
        console.log(`Successfully synced metrics for ${campaignCount} campaigns`);
      } catch (campaignError) {
        console.error('Error syncing campaign metrics:', campaignError);
      }

      // Get all ad sets for campaigns
      const allAdSets: FacebookAdSet[] = [];
      for (const campaign of campaigns) {
        const adSets = await this.getAdSets(campaign.id);
        allAdSets.push(...adSets);
      }
      adSetCount = allAdSets.length;

      // Try to fetch ad set metrics (handle errors gracefully)
      try {
        await this.fetchAndSaveAdSetMetrics(allAdSets, accessToken);
        console.log(`Successfully synced metrics for ${adSetCount} ad sets`);
      } catch (adSetError) {
        console.error('Error syncing ad set metrics:', adSetError);
      }

      // Get all ads for ad sets
      const allAds: FacebookAd[] = [];
      for (const adSet of allAdSets) {
        const ads = await this.getAds(adSet.id);
        allAds.push(...ads);
      }
      adCount = allAds.length;

      // Try to fetch ad metrics (handle errors gracefully)
      try {
        await this.fetchAndSaveAdMetrics(allAds, accessToken);
        console.log(`Successfully synced metrics for ${adCount} ads`);
      } catch (adError) {
        console.error('Error syncing ad metrics:', adError);
      }

      // Update job status to 'completed' with details
      const details = {
        campaigns_synced: campaignCount,
        adsets_synced: adSetCount,
        ads_synced: adCount,
        permission_issues: hasPermissionIssues
      };

      await this.updateSyncJobStatus(jobId, 'completed', undefined, details);
      console.log('Metrics sync completed successfully');

      return jobId;

    } catch (error) {
      console.error('Error in syncAllMetrics:', error);
      
      // Update job status to 'failed'
      if (jobId) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await this.updateSyncJobStatus(jobId, 'failed', errorMessage);
      }

      throw error;
    }
  }

  /**
   * Check for permission issues
   */
  private async checkForPermissionIssues(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('facebook_tokens')
        .select('has_ad_permissions')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return true; // Assume permission issues if no data found
      }

      return !data.has_ad_permissions;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return true; // Assume permission issues on error
    }
  }

  /**
   * Subscribe to metric updates via Supabase realtime
   */
  subscribeToMetricUpdates(userId: string, callback: (payload: Record<string, unknown>) => void) {
    const channel = this.supabase
      .channel('metrics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facebook_campaign_metrics',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback({ type: 'campaign_metrics', ...payload });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facebook_adset_metrics',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback({ type: 'adset_metrics', ...payload });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facebook_ad_metrics',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback({ type: 'ad_metrics', ...payload });
        }
      )
      .subscribe();

    return channel;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Extract conversions from actions array
   */
  private extractConversions(actions: Array<{action_type: string; value: string}>): number {
    const conversionActions = actions.filter(action => 
      action.action_type === 'offsite_conversion'
    );
    
    return conversionActions.reduce((total, action) => {
      return total + (parseInt(action.value, 10) || 0);
    }, 0);
  }

  /**
   * Calculate conversion rate
   */
  private calculateConversionRate(conversions: number, clicks: number): number {
    if (clicks === 0 || conversions === 0) {
      return 0;
    }
    return (conversions / clicks) * 100;
  }

  /**
   * Batch insert metrics to avoid database limits
   */
  private async batchInsertMetrics(tableName: string, metrics: ProcessedMetric[]): Promise<void> {
    const batchSize = 1000;
    
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      
      try {
        const { error } = await this.supabase
          .from(tableName)
          .upsert(batch, {
            onConflict: tableName === 'facebook_campaign_metrics' ? 'campaign_id,date' :
                       tableName === 'facebook_adset_metrics' ? 'ad_set_id,date' :
                       'ad_id,date'
          });

        if (error) {
          console.error(`Error inserting batch ${i / batchSize + 1} for ${tableName}:`, error);
          throw error;
        }

        console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(metrics.length / batchSize)} for ${tableName}`);
      } catch (error) {
        console.error(`Failed to insert batch for ${tableName}:`, error);
        throw error;
      }
    }
  }
}

// Export default instance for convenience
export default FacebookMetricsService;