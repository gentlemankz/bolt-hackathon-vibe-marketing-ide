import { SupabaseClient } from '@supabase/supabase-js';
import { 
  getUserAdAccounts, 
  getCampaigns, 
  getAdSets,
  getAds
} from '../meta-api';
import { 
  FacebookAdAccount
} from '../types';

// Define interface for API responses
interface AdAccountResponse {
  id: string;
  name: string;
  account_id: string;
  account_status: number;
  amount_spent: string;
  balance: string;
  currency: string;
  business_city: string;
  business_country_code: string;
  owner: string;
  age: string | number; // Handle both string and number formats
}

interface CampaignResponse {
  id: string;
  name: string;
  status: string;
  objective: string;
  buying_type: string;
  special_ad_categories: string[];
  daily_budget: string;
  lifetime_budget: string;
  start_time: string;
  stop_time: string;
}

interface AdSetResponse {
  id: string;
  name: string;
  status: string;
  daily_budget: string;
  lifetime_budget: string;
  targeting: Record<string, unknown>;
  optimization_goal: string;
  billing_event: string;
  bid_amount: string;
}

interface AdResponse {
  id: string;
  name: string;
  status: string;
  creative: {
    id: string;
    name: string;
    title: string;
    body: string;
    image_url: string;
    video_id: string;
  };
  adset_id: string;
  campaign_id: string;
  bid_amount: string;
  configured_status: string;
}

interface ApiResponse<T> {
  data: T[];
}

export class FacebookService {
  private supabase: SupabaseClient;
  
  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async saveAccessToken(userId: string, accessToken: string, expiresIn: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    
    // Delete any existing tokens for this user
    await this.supabase
      .from('facebook_tokens')
      .delete()
      .eq('user_id', userId);
    
    // Insert the new token
    const { error } = await this.supabase
      .from('facebook_tokens')
      .insert({
        user_id: userId,
        access_token: accessToken,
        expires_at: expiresAt
      });
    
    if (error) {
      console.error('Error saving Facebook access token:', error);
      throw new Error(`Failed to save access token: ${error.message}`);
    }
  }

  async getAccessToken(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('facebook_tokens')
      .select('access_token, expires_at, has_ad_permissions')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Check if token is expired
    if (new Date(data.expires_at) < new Date()) {
      await this.supabase
        .from('facebook_tokens')
        .delete()
        .eq('user_id', userId);
      return null;
    }
    
    // Log if token doesn't have ad permissions
    if (data.has_ad_permissions === false) {
      console.warn('Facebook token for user', userId, 'does not have ad permissions');
    }
    
    return data.access_token;
  }

  async getAdAccounts(userId: string): Promise<FacebookAdAccount[]> {
    const { data, error } = await this.supabase
      .from('facebook_ad_accounts')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error getting Facebook ad accounts:', error);
      throw new Error(`Failed to get ad accounts: ${error.message}`);
    }
    
    return data || [];
  }

  async connectAdAccount(userId: string, adAccountId: string, accessToken: string): Promise<void> {
    try {
      // Fetch the list of ad accounts from Facebook
      const response = await getUserAdAccounts(accessToken) as ApiResponse<AdAccountResponse>;
      
      // Find the selected ad account
      const selectedAdAccount = response.data.find((account) => account.id === adAccountId);
      
      if (!selectedAdAccount) {
        throw new Error('Selected ad account not found');
      }
      
      // Convert age to string to prevent type issues
      const ageValue = selectedAdAccount.age?.toString() || "";
      
      // Save the ad account
      const { error: adAccountError } = await this.supabase
        .from('facebook_ad_accounts')
        .upsert({
          id: selectedAdAccount.id,
          name: selectedAdAccount.name,
          account_id: selectedAdAccount.account_id,
          account_status: selectedAdAccount.account_status,
          amount_spent: selectedAdAccount.amount_spent,
          balance: selectedAdAccount.balance,
          currency: selectedAdAccount.currency,
          business_city: selectedAdAccount.business_city,
          business_country_code: selectedAdAccount.business_country_code,
          owner: selectedAdAccount.owner,
          age: ageValue,
          user_id: userId
        }, { onConflict: 'id,user_id' });
      
      if (adAccountError) {
        throw new Error(`Failed to save ad account: ${adAccountError.message}`);
      }
      
      // Fetch and save campaigns
      await this.fetchAndSaveCampaigns(selectedAdAccount.id, accessToken);
      
      // Auto-sync metrics after connecting the ad account
      try {
        const FacebookMetricsService = (await import('../services/facebook-metrics-service')).FacebookMetricsService;
        const metricsService = new FacebookMetricsService(this.supabase);
        await metricsService.syncAllMetrics(userId, selectedAdAccount.id, accessToken);
        console.log('Initial metrics sync completed for ad account:', selectedAdAccount.id);
      } catch (metricsError) {
        // Log but don't fail the connection if metrics sync fails
        console.error('Error during initial metrics sync:', metricsError);
      }
      
    } catch (error) {
      console.error('Error connecting ad account:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect ad account');
    }
  }

  private async fetchAndSaveCampaigns(adAccountId: string, accessToken: string): Promise<void> {
    try {
      const response = await getCampaigns(adAccountId, accessToken) as ApiResponse<CampaignResponse>;
      
      for (const campaign of response.data) {
        // Save the campaign
        const { error: campaignError } = await this.supabase
          .from('facebook_campaigns')
          .upsert({
            id: campaign.id,
            ad_account_id: adAccountId,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            buying_type: campaign.buying_type,
            special_ad_categories: campaign.special_ad_categories,
            daily_budget: campaign.daily_budget,
            lifetime_budget: campaign.lifetime_budget,
            start_time: campaign.start_time,
            stop_time: campaign.stop_time
          }, { onConflict: 'id' });
        
        if (campaignError) {
          console.error('Error saving campaign:', campaignError);
          continue;
        }
        
        // Fetch and save ad sets
        await this.fetchAndSaveAdSets(campaign.id, accessToken);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      // Don't throw - continue with other ad accounts
    }
  }

  private async fetchAndSaveAdSets(campaignId: string, accessToken: string): Promise<void> {
    try {
      const response = await getAdSets(campaignId, accessToken) as ApiResponse<AdSetResponse>;
      
      for (const adSet of response.data) {
        // Save the ad set
        const { error: adSetError } = await this.supabase
          .from('facebook_ad_sets')
          .upsert({
            id: adSet.id,
            campaign_id: campaignId,
            name: adSet.name,
            status: adSet.status,
            daily_budget: adSet.daily_budget,
            lifetime_budget: adSet.lifetime_budget,
            targeting: adSet.targeting,
            optimization_goal: adSet.optimization_goal,
            billing_event: adSet.billing_event,
            bid_amount: adSet.bid_amount
          }, { onConflict: 'id' });
        
        if (adSetError) {
          console.error('Error saving ad set:', adSetError);
          continue;
        }
        
        // Fetch and save ads
        await this.fetchAndSaveAds(adSet.id, campaignId, accessToken);
      }
    } catch (error) {
      console.error('Error fetching ad sets:', error);
      // Don't throw - continue with other campaigns
    }
  }

  private async fetchAndSaveAds(adSetId: string, campaignId: string, accessToken: string): Promise<void> {
    try {
      const response = await getAds(adSetId, accessToken) as ApiResponse<AdResponse>;
      
      for (const ad of response.data) {
        // Save the ad
        const { error: adError } = await this.supabase
          .from('facebook_ads')
          .upsert({
            id: ad.id,
            ad_set_id: adSetId,
            name: ad.name,
            status: ad.status,
            creative: ad.creative,
            campaign_id: campaignId,
            bid_amount: ad.bid_amount,
            configured_status: ad.configured_status
          }, { onConflict: 'id' });
        
        if (adError) {
          console.error('Error saving ad:', adError);
        }
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      // Don't throw - continue with other ad sets
    }
  }

  /**
   * Disconnect a user's Facebook account and delete all associated data
   * This removes the access token and all ad data for the user
   */
  async disconnectAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Start a transaction to delete all user data
      // Note: This relies on RLS policies and cascade deletes configured in the schema
      
      // 1. Delete all sync jobs for this user
      const { error: syncJobsError } = await this.supabase
        .from('facebook_sync_jobs')
        .delete()
        .eq('user_id', userId);
      
      if (syncJobsError) {
        console.error('Error deleting sync jobs:', syncJobsError);
        return { success: false, error: `Failed to delete sync jobs: ${syncJobsError.message}` };
      }
      
      // 2. Get all ad accounts for this user (for cascade delete reference)
      const { data: adAccounts, error: adAccountsError } = await this.supabase
        .from('facebook_ad_accounts')
        .select('id')
        .eq('user_id', userId);
      
      if (adAccountsError) {
        console.error('Error fetching ad accounts:', adAccountsError);
        return { success: false, error: `Failed to fetch ad accounts: ${adAccountsError.message}` };
      }
      
      const adAccountIds = adAccounts?.map(account => account.id) || [];
      
      // 3. Delete all ad accounts (this will cascade delete campaigns, ad sets, ads, and metrics)
      if (adAccountIds.length > 0) {
        const { error: deleteAdAccountsError } = await this.supabase
          .from('facebook_ad_accounts')
          .delete()
          .eq('user_id', userId);
        
        if (deleteAdAccountsError) {
          console.error('Error deleting ad accounts:', deleteAdAccountsError);
          return { success: false, error: `Failed to delete ad accounts: ${deleteAdAccountsError.message}` };
        }
      }
      
      // 4. Finally, delete the access token
      const { error: tokenError } = await this.supabase
        .from('facebook_tokens')
        .delete()
        .eq('user_id', userId);
      
      if (tokenError) {
        console.error('Error deleting access token:', tokenError);
        return { success: false, error: `Failed to delete access token: ${tokenError.message}` };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error disconnecting Facebook account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create a new campaign in Facebook Ads Manager
   */
  async createCampaign(
    userId: string, 
    adAccountId: string, 
    campaignData: {
      name: string;
      objective: string;
      status?: 'ACTIVE' | 'PAUSED';
      special_ad_categories?: string[];
      daily_budget?: string;
      lifetime_budget?: string;
      buying_type?: string;
    }
  ): Promise<{ success: boolean; campaign?: Record<string, unknown>; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      
      if (!accessToken) {
        return { success: false, error: 'Facebook access token not found' };
      }

      // Prepare campaign payload
      const campaignPayload = {
        name: campaignData.name,
        objective: campaignData.objective,
        status: campaignData.status || 'PAUSED',
        special_ad_categories: campaignData.special_ad_categories || [],
        ...(campaignData.daily_budget && { daily_budget: campaignData.daily_budget }),
        ...(campaignData.lifetime_budget && { lifetime_budget: campaignData.lifetime_budget }),
        ...(campaignData.buying_type && { buying_type: campaignData.buying_type }),
      };

      // Create campaign via Meta Marketing API
      const response = await fetch(
        `https://graph.facebook.com/v23.0/act_${adAccountId}/campaigns`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            ...campaignPayload,
            special_ad_categories: JSON.stringify(campaignPayload.special_ad_categories),
            access_token: accessToken,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Facebook API error:', errorData);
        return { 
          success: false, 
          error: `Failed to create campaign: ${errorData.error?.message || 'Unknown error'}` 
        };
      }

      const createdCampaign = await response.json();

      // Save the campaign to our database
      const { error: dbError } = await this.supabase
        .from('facebook_campaigns')
        .insert({
          id: createdCampaign.id,
          ad_account_id: adAccountId,
          name: campaignData.name,
          status: campaignData.status || 'PAUSED',
          objective: campaignData.objective,
          buying_type: campaignData.buying_type || 'AUCTION',
          special_ad_categories: campaignPayload.special_ad_categories,
          daily_budget: campaignData.daily_budget || null,
          lifetime_budget: campaignData.lifetime_budget || null,
          start_time: null,
          stop_time: null,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        // Campaign was created in Facebook but failed to save locally
        // We should still return success since the campaign exists
      }

      return {
        success: true,
        campaign: {
          id: createdCampaign.id,
          name: campaignData.name,
          status: campaignData.status || 'PAUSED',
          objective: campaignData.objective,
          ad_account_id: adAccountId,
        },
      };

    } catch (error) {
      console.error('Error creating campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
} 