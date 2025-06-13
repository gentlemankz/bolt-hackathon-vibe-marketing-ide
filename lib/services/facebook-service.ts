import { SupabaseClient } from '@supabase/supabase-js';
import { 
  getUserAdAccounts, 
  getCampaigns, 
  getAdSets,
  getAds,
  FACEBOOK_API_BASE_URL
} from '../meta-api';
import { 
  FacebookAdAccount
} from '../types';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Ad Account response from Facebook API
 */
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

/**
 * Campaign response from Facebook API
 */
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

/**
 * Ad Set response from Facebook API
 */
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

/**
 * Ad response from Facebook API
 */
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

/**
 * Generic API response wrapper
 */
interface ApiResponse<T> {
  data: T[];
}

/**
 * Campaign creation data
 */
interface CampaignCreateData {
  name: string;
  objective: string;
  status?: 'ACTIVE' | 'PAUSED';
  special_ad_categories?: string[];
  daily_budget?: string;
  lifetime_budget?: string;
  buying_type?: string;
}

// ============================================================================
// FacebookService Class
// ============================================================================

/**
 * Service class for Facebook Marketing API integration with Supabase
 */
export class FacebookService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Save Facebook access token for a user
   */
  async saveAccessToken(userId: string, accessToken: string, expiresIn: number): Promise<void> {
    try {
      // Calculate expiration timestamp from expiresIn seconds
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Delete existing tokens for the user
      const { error: deleteError } = await this.supabase
        .from('facebook_tokens')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting existing tokens:', deleteError);
        throw new Error(`Failed to delete existing tokens: ${deleteError.message}`);
      }

      // Insert new token
      const { error: insertError } = await this.supabase
        .from('facebook_tokens')
        .insert({
          user_id: userId,
          access_token: accessToken,
          expires_at: expiresAt,
          has_ad_permissions: true
        });

      if (insertError) {
        console.error('Error saving access token:', insertError);
        throw new Error(`Failed to save access token: ${insertError.message}`);
      }

      console.log('Access token saved successfully for user:', userId);
    } catch (error) {
      console.error('Error in saveAccessToken:', error);
      throw error;
    }
  }

  /**
   * Get Facebook access token for a user
   */
  async getAccessToken(userId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('facebook_tokens')
        .select('access_token, expires_at, has_ad_permissions')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No token found
          return null;
        }
        console.error('Error fetching access token:', error);
        throw new Error(`Failed to fetch access token: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      if (now >= expiresAt) {
        console.log('Token expired, deleting...');
        
        // Delete expired token
        const { error: deleteError } = await this.supabase
          .from('facebook_tokens')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('Error deleting expired token:', deleteError);
        }

        return null;
      }

      // Log warning if token lacks ad permissions
      if (!data.has_ad_permissions) {
        console.warn('Token lacks ad permissions for user:', userId);
      }

      return data.access_token;
    } catch (error) {
      console.error('Error in getAccessToken:', error);
      throw error;
    }
  }

  /**
   * Get ad accounts for a user from database
   */
  async getAdAccounts(userId: string): Promise<FacebookAdAccount[]> {
    try {
      const { data, error } = await this.supabase
        .from('facebook_ad_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ad accounts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAdAccounts:', error);
      return [];
    }
  }

  /**
   * Connect and sync a Facebook ad account
   */
  async connectAdAccount(userId: string, adAccountId: string, accessToken: string): Promise<void> {
    try {
      console.log('Connecting ad account:', adAccountId, 'for user:', userId);

      // Fetch ad accounts from Facebook API
      const adAccountsResponse = await getUserAdAccounts(accessToken);
      
      // Find selected ad account by ID
      const selectedAccount = adAccountsResponse.data.find(
        (account: AdAccountResponse) => account.id === adAccountId || account.account_id === adAccountId
      );

      if (!selectedAccount) {
        throw new Error(`Ad account ${adAccountId} not found in user's accessible accounts`);
      }

      // Convert age to string to prevent type issues
      const accountData = {
        id: selectedAccount.id,
        name: selectedAccount.name,
        account_id: selectedAccount.account_id,
        account_status: selectedAccount.account_status,
        amount_spent: selectedAccount.amount_spent,
        balance: selectedAccount.balance,
        currency: selectedAccount.currency,
        business_city: selectedAccount.business_city,
        business_country_code: selectedAccount.business_country_code,
        owner: selectedAccount.owner,
        age: String(selectedAccount.age), // Convert to string
        user_id: userId,
        created_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      };

      // Upsert ad account data
      const { error: upsertError } = await this.supabase
        .from('facebook_ad_accounts')
        .upsert(accountData, {
          onConflict: 'id,user_id'
        });

      if (upsertError) {
        console.error('Error upserting ad account:', upsertError);
        throw new Error(`Failed to save ad account: ${upsertError.message}`);
      }

      console.log('Ad account saved successfully:', selectedAccount.id);

      // Fetch and save campaigns
      await this.fetchAndSaveCampaigns(selectedAccount.id, accessToken);

      // Auto-sync metrics using dynamic import
      try {
        const { FacebookMetricsService } = await import('./facebook-metrics-service');
        const metricsService = new FacebookMetricsService(this.supabase);
        await metricsService.syncMetrics(userId, selectedAccount.id);
        console.log('Metrics sync completed for ad account:', selectedAccount.id);
      } catch (metricsError) {
        console.error('Error syncing metrics:', metricsError);
        // Don't throw error for metrics sync failure
      }

    } catch (error) {
      console.error('Error in connectAdAccount:', error);
      throw error;
    }
  }

  /**
   * Fetch and save campaigns for an ad account
   */
  private async fetchAndSaveCampaigns(adAccountId: string, accessToken: string): Promise<void> {
    try {
      console.log('Fetching campaigns for ad account:', adAccountId);

      const campaignsResponse = await getCampaigns(adAccountId, accessToken);
      
      for (const campaign of campaignsResponse.data) {
        try {
          // Upsert campaign data
          const campaignData = {
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
            stop_time: campaign.stop_time,
            created_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString()
          };

          const { error: campaignError } = await this.supabase
            .from('facebook_campaigns')
            .upsert(campaignData, {
              onConflict: 'id'
            });

          if (campaignError) {
            console.error('Error upserting campaign:', campaign.id, campaignError);
            continue; // Don't throw, just log and continue
          }

          console.log('Campaign saved:', campaign.id);

          // Fetch and save ad sets for this campaign
          await this.fetchAndSaveAdSets(campaign.id, accessToken);

        } catch (campaignError) {
          console.error('Error processing campaign:', campaign.id, campaignError);
          // Continue with next campaign
        }
      }

      console.log('Campaigns fetch completed for ad account:', adAccountId);
    } catch (error) {
      console.error('Error in fetchAndSaveCampaigns:', error);
      // Don't throw errors, just log and continue
    }
  }

  /**
   * Fetch and save ad sets for a campaign
   */
  private async fetchAndSaveAdSets(campaignId: string, accessToken: string): Promise<void> {
    try {
      console.log('Fetching ad sets for campaign:', campaignId);

      const adSetsResponse = await getAdSets(campaignId, accessToken);
      
      for (const adSet of adSetsResponse.data) {
        try {
          // Upsert ad set data
          const adSetData = {
            id: adSet.id,
            campaign_id: campaignId,
            name: adSet.name,
            status: adSet.status,
            daily_budget: adSet.daily_budget,
            lifetime_budget: adSet.lifetime_budget,
            targeting: adSet.targeting,
            optimization_goal: adSet.optimization_goal,
            billing_event: adSet.billing_event,
            bid_amount: adSet.bid_amount,
            created_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString()
          };

          const { error: adSetError } = await this.supabase
            .from('facebook_ad_sets')
            .upsert(adSetData, {
              onConflict: 'id'
            });

          if (adSetError) {
            console.error('Error upserting ad set:', adSet.id, adSetError);
            continue;
          }

          console.log('Ad set saved:', adSet.id);

          // Fetch and save ads for this ad set
          await this.fetchAndSaveAds(adSet.id, campaignId, accessToken);

        } catch (adSetError) {
          console.error('Error processing ad set:', adSet.id, adSetError);
          // Continue with next ad set
        }
      }

      console.log('Ad sets fetch completed for campaign:', campaignId);
    } catch (error) {
      console.error('Error in fetchAndSaveAdSets:', error);
      // Handle errors gracefully
    }
  }

  /**
   * Fetch and save ads for an ad set
   */
  private async fetchAndSaveAds(adSetId: string, campaignId: string, accessToken: string): Promise<void> {
    try {
      console.log('Fetching ads for ad set:', adSetId);

      const adsResponse = await getAds(adSetId, accessToken);
      
      for (const ad of adsResponse.data) {
        try {
          // Upsert ad data
          const adData = {
            id: ad.id,
            ad_set_id: adSetId,
            name: ad.name,
            status: ad.status,
            creative: ad.creative,
            campaign_id: campaignId,
            bid_amount: ad.bid_amount,
            configured_status: ad.configured_status,
            created_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString()
          };

          const { error: adError } = await this.supabase
            .from('facebook_ads')
            .upsert(adData, {
              onConflict: 'id'
            });

          if (adError) {
            console.error('Error upserting ad:', ad.id, adError);
            continue;
          }

          console.log('Ad saved:', ad.id);

        } catch (adError) {
          console.error('Error processing ad:', ad.id, adError);
          // Continue with next ad
        }
      }

      console.log('Ads fetch completed for ad set:', adSetId);
    } catch (error) {
      console.error('Error in fetchAndSaveAds:', error);
      // Handle errors gracefully
    }
  }

  /**
   * Disconnect Facebook account and clean up data
   */
  async disconnectAccount(userId: string): Promise<{success: boolean; error?: string}> {
    try {
      console.log('Disconnecting Facebook account for user:', userId);

      // Delete sync jobs for user
      const { error: syncJobsError } = await this.supabase
        .from('facebook_sync_jobs')
        .delete()
        .eq('user_id', userId);

      if (syncJobsError) {
        console.error('Error deleting sync jobs:', syncJobsError);
      }

      // Get all ad accounts for user
      const { data: adAccounts, error: adAccountsError } = await this.supabase
        .from('facebook_ad_accounts')
        .select('id')
        .eq('user_id', userId);

      if (adAccountsError) {
        console.error('Error fetching ad accounts for deletion:', adAccountsError);
        return { success: false, error: `Failed to fetch ad accounts: ${adAccountsError.message}` };
      }

      // Delete ad accounts (with cascade deletes)
      if (adAccounts && adAccounts.length > 0) {
        const { error: deleteAccountsError } = await this.supabase
          .from('facebook_ad_accounts')
          .delete()
          .eq('user_id', userId);

        if (deleteAccountsError) {
          console.error('Error deleting ad accounts:', deleteAccountsError);
          return { success: false, error: `Failed to delete ad accounts: ${deleteAccountsError.message}` };
        }
      }

      // Delete access token
      const { error: tokenError } = await this.supabase
        .from('facebook_tokens')
        .delete()
        .eq('user_id', userId);

      if (tokenError) {
        console.error('Error deleting access token:', tokenError);
        return { success: false, error: `Failed to delete access token: ${tokenError.message}` };
      }

      console.log('Facebook account disconnected successfully for user:', userId);
      return { success: true };

    } catch (error) {
      console.error('Error in disconnectAccount:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create a new Facebook campaign
   */
  async createCampaign(
    userId: string,
    adAccountId: string,
    campaignData: CampaignCreateData
  ): Promise<{success: boolean; campaign?: Record<string, unknown>; error?: string}> {
    try {
      console.log('Creating campaign for user:', userId, 'ad account:', adAccountId);

      // Get access token for user
      const accessToken = await this.getAccessToken(userId);
      if (!accessToken) {
        return { success: false, error: 'No valid access token found. Please reconnect your Facebook account.' };
      }

      // Prepare campaign payload with defaults
      const campaignPayload = {
        name: campaignData.name,
        objective: campaignData.objective,
        status: campaignData.status || 'PAUSED',
        special_ad_categories: campaignData.special_ad_categories || [],
        buying_type: campaignData.buying_type || 'AUCTION',
        ...(campaignData.daily_budget && { daily_budget: campaignData.daily_budget }),
        ...(campaignData.lifetime_budget && { lifetime_budget: campaignData.lifetime_budget })
      };

      // Make POST request to Facebook Graph API v23.0
      const response = await fetch(`${FACEBOOK_API_BASE_URL}/${adAccountId}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(campaignPayload)
      });

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors
        }

        const errorMessage = errorData.error?.message || response.statusText;
        console.error('Facebook API error creating campaign:', errorData);
        return { success: false, error: `Failed to create campaign: ${errorMessage}` };
      }

      const createdCampaign = await response.json();
      console.log('Campaign created successfully:', createdCampaign.id);

      // Save created campaign to database
      try {
        const campaignDbData = {
          id: createdCampaign.id,
          ad_account_id: adAccountId,
          name: campaignData.name,
          status: campaignData.status || 'PAUSED',
          objective: campaignData.objective,
          buying_type: campaignData.buying_type || 'AUCTION',
          special_ad_categories: campaignData.special_ad_categories || [],
          daily_budget: campaignData.daily_budget || '',
          lifetime_budget: campaignData.lifetime_budget || '',
          start_time: '',
          stop_time: '',
          created_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString()
        };

        const { error: dbError } = await this.supabase
          .from('facebook_campaigns')
          .upsert(campaignDbData, {
            onConflict: 'id'
          });

        if (dbError) {
          console.error('Error saving campaign to database:', dbError);
          // Don't fail the entire operation for database save errors
        }
      } catch (dbError) {
        console.error('Error saving campaign to database:', dbError);
        // Don't fail the entire operation for database save errors
      }

      return { success: true, campaign: createdCampaign };

    } catch (error) {
      console.error('Error in createCampaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }
}

// Export default instance for convenience
export default FacebookService;