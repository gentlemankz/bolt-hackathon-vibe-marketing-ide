// Facebook Marketing API v23 utilities

// ============================================================================
// API Configuration Constants
// ============================================================================

export const FACEBOOK_API_VERSION = 'v23.0' as const;
export const FACEBOOK_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

export const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
export const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
export const FACEBOOK_REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/facebook/callback`;

export const FACEBOOK_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'read_insights',
  'public_profile',
  'email'
].join(',');

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface FacebookApiResponse<T> {
  data: T[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

interface FacebookAdAccount {
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
  age: string;
}

interface FacebookCampaign {
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

interface FacebookAdSet {
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

interface FacebookAd {
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

export interface FacebookMetricsResponse {
  data: {
    date_start: string;
    date_stop: string;
    campaign_id?: string;
    adset_id?: string;
    ad_id?: string;
    impressions: number;
    clicks: number;
    reach: number;
    frequency: number;
    ctr: number;
    unique_clicks: number;
    unique_ctr: number;
    spend: string;
    cpc: string;
    cpm: string;
    cost_per_result: string;
    actions?: {
      action_type: string;
      value: string;
    }[];
    conversions?: number;
    conversion_rate_ranking?: string;
    [key: string]: unknown;
  }[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate Facebook OAuth URL for user authorization
 */
export function getFacebookOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: encodeURIComponent(FACEBOOK_REDIRECT_URI),
    scope: encodeURIComponent(FACEBOOK_SCOPES),
    response_type: 'code',
    state: 'facebook_auth'
  });

  return `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  try {
    const params = new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      client_secret: FACEBOOK_APP_SECRET,
      redirect_uri: FACEBOOK_REDIRECT_URI,
      code
    });

    const response = await fetch(`${FACEBOOK_API_BASE_URL}/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }
      throw new Error(
        `Failed to exchange code for token: ${errorData.error?.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to exchange authorization code for access token');
  }
}

/**
 * Get user's ad accounts
 */
export async function getUserAdAccounts(
  accessToken: string
): Promise<FacebookApiResponse<FacebookAdAccount>> {
  try {
    const fields = [
      'id',
      'name',
      'account_id',
      'account_status',
      'amount_spent',
      'balance',
      'currency',
      'business_city',
      'business_country_code',
      'owner',
      'age'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      fields
    });

    const response = await fetch(`${FACEBOOK_API_BASE_URL}/me/adaccounts?${params.toString()}`);

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }
      throw new Error(
        `Failed to fetch ad accounts: ${errorData.error?.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user ad accounts:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch user ad accounts');
  }
}

/**
 * Get campaigns for an ad account
 */
export async function getCampaigns(
  adAccountId: string,
  accessToken: string
): Promise<FacebookApiResponse<FacebookCampaign>> {
  try {
    const fields = [
      'id',
      'name',
      'status',
      'objective',
      'buying_type',
      'special_ad_categories',
      'daily_budget',
      'lifetime_budget',
      'start_time',
      'stop_time'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      fields
    });

    const response = await fetch(`${FACEBOOK_API_BASE_URL}/${adAccountId}/campaigns?${params.toString()}`);

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }
      throw new Error(
        `Failed to fetch campaigns: ${errorData.error?.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch campaigns');
  }
}

/**
 * Get ad sets for a campaign
 */
export async function getAdSets(
  campaignId: string,
  accessToken: string
): Promise<FacebookApiResponse<FacebookAdSet>> {
  try {
    const fields = [
      'id',
      'name',
      'status',
      'daily_budget',
      'lifetime_budget',
      'targeting',
      'optimization_goal',
      'billing_event',
      'bid_amount'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      fields
    });

    const response = await fetch(`${FACEBOOK_API_BASE_URL}/${campaignId}/adsets?${params.toString()}`);

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }
      throw new Error(
        `Failed to fetch ad sets: ${errorData.error?.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ad sets:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch ad sets');
  }
}

/**
 * Get ads for an ad set
 */
export async function getAds(
  adSetId: string,
  accessToken: string
): Promise<FacebookApiResponse<FacebookAd>> {
  try {
    const fields = [
      'id',
      'name',
      'status',
      'creative{id,name,title,body,image_url,video_id}',
      'adset_id',
      'campaign_id',
      'bid_amount',
      'configured_status'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      fields
    });

    const response = await fetch(`${FACEBOOK_API_BASE_URL}/${adSetId}/ads?${params.toString()}`);

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }
      throw new Error(
        `Failed to fetch ads: ${errorData.error?.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ads:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch ads');
  }
}

// ============================================================================
// Metrics Functions with Batch Processing
// ============================================================================

/**
 * Get campaign metrics with batch processing for large datasets
 */
export async function getCampaignMetrics(
  campaignIds: string[],
  accessToken: string,
  datePreset: string = 'last_30_days'
): Promise<FacebookMetricsResponse> {
  console.log(`Fetching metrics for ${campaignIds.length} campaigns with date preset: ${datePreset}`);

  try {
    // Batch processing for more than 10 campaign IDs
    if (campaignIds.length > 10) {
      console.log('Processing campaigns in batches of 10');
      const batches: string[][] = [];
      for (let i = 0; i < campaignIds.length; i += 10) {
        batches.push(campaignIds.slice(i, i + 10));
      }

      const batchPromises = batches.map((batch, index) => {
        console.log(`Processing batch ${index + 1}/${batches.length} with ${batch.length} campaigns`);
        return getCampaignMetricsBatch(batch, accessToken, datePreset);
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Flatten results from all batches
      const combinedData = batchResults.flatMap(result => result.data);
      
      return {
        data: combinedData,
        paging: batchResults[batchResults.length - 1]?.paging
      };
    }

    return await getCampaignMetricsBatch(campaignIds, accessToken, datePreset);
  } catch (error) {
    console.error('Error in getCampaignMetrics:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch campaign metrics');
  }
}

/**
 * Internal function to fetch metrics for a batch of campaigns
 */
async function getCampaignMetricsBatch(
  campaignIds: string[],
  accessToken: string,
  datePreset: string
): Promise<FacebookMetricsResponse> {
  try {
    const fields = [
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'cpc',
      'cpm',
      'ctr',
      'unique_clicks',
      'unique_ctr',
      'cost_per_result',
      'actions',
      'action_values',
      'conversions',
      'conversion_rate_ranking',
      'date_start',
      'date_stop'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      fields,
      time_increment: '1',
      level: 'campaign',
      date_preset: datePreset,
      campaign_ids: JSON.stringify(campaignIds)
    });

    const url = `${FACEBOOK_API_BASE_URL}/insights?${params.toString()}`;
    console.log('Fetching campaign metrics from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }

      // Handle permission errors specifically
      if (errorData.error?.code === 200 || 
          (typeof errorData.error?.message === 'string' && 
           errorData.error.message.toLowerCase().includes('permission'))) {
        console.error('Permission error accessing campaign metrics:', errorData.error?.message);
        throw new Error(
          'Permission denied: Please reconnect your Facebook account with proper permissions (ads_management, ads_read)'
        );
      }

      console.error('Campaign metrics API error:', errorData);
      throw new Error(
        `Failed to fetch campaign metrics: ${errorData.error?.message || response.statusText}`
      );
    }

    const result = await response.json();
    console.log(`Successfully fetched metrics for ${result.data?.length || 0} campaign records`);
    return result;
  } catch (error) {
    console.error('Error in getCampaignMetricsBatch:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch campaign metrics batch');
  }
}

/**
 * Get ad set metrics with batch processing for large datasets
 */
export async function getAdSetMetrics(
  adSetIds: string[],
  accessToken: string,
  datePreset: string = 'last_30_days'
): Promise<FacebookMetricsResponse> {
  console.log(`Fetching metrics for ${adSetIds.length} ad sets with date preset: ${datePreset}`);

  try {
    // Batch processing for more than 10 ad set IDs
    if (adSetIds.length > 10) {
      console.log('Processing ad sets in batches of 10');
      const batches: string[][] = [];
      for (let i = 0; i < adSetIds.length; i += 10) {
        batches.push(adSetIds.slice(i, i + 10));
      }

      const batchPromises = batches.map((batch, index) => {
        console.log(`Processing batch ${index + 1}/${batches.length} with ${batch.length} ad sets`);
        return getAdSetMetricsBatch(batch, accessToken, datePreset);
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Flatten results from all batches
      const combinedData = batchResults.flatMap(result => result.data);
      
      return {
        data: combinedData,
        paging: batchResults[batchResults.length - 1]?.paging
      };
    }

    return await getAdSetMetricsBatch(adSetIds, accessToken, datePreset);
  } catch (error) {
    console.error('Error in getAdSetMetrics:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch ad set metrics');
  }
}

/**
 * Internal function to fetch metrics for a batch of ad sets
 */
async function getAdSetMetricsBatch(
  adSetIds: string[],
  accessToken: string,
  datePreset: string
): Promise<FacebookMetricsResponse> {
  try {
    const fields = [
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'cpc',
      'cpm',
      'ctr',
      'unique_clicks',
      'unique_ctr',
      'cost_per_result',
      'actions',
      'action_values',
      'conversions',
      'conversion_rate_ranking',
      'date_start',
      'date_stop'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      fields,
      time_increment: '1',
      level: 'adset',
      date_preset: datePreset,
      adset_ids: JSON.stringify(adSetIds)
    });

    const url = `${FACEBOOK_API_BASE_URL}/insights?${params.toString()}`;
    console.log('Fetching ad set metrics from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }

      // Handle permission errors specifically
      if (errorData.error?.code === 200 || 
          (typeof errorData.error?.message === 'string' && 
           errorData.error.message.toLowerCase().includes('permission'))) {
        console.error('Permission error accessing ad set metrics:', errorData.error?.message);
        throw new Error(
          'Permission denied: Please reconnect your Facebook account with proper permissions (ads_management, ads_read)'
        );
      }

      console.error('Ad set metrics API error:', errorData);
      throw new Error(
        `Failed to fetch ad set metrics: ${errorData.error?.message || response.statusText}`
      );
    }

    const result = await response.json();
    console.log(`Successfully fetched metrics for ${result.data?.length || 0} ad set records`);
    return result;
  } catch (error) {
    console.error('Error in getAdSetMetricsBatch:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch ad set metrics batch');
  }
}

/**
 * Get ad metrics with batch processing for large datasets
 */
export async function getAdMetrics(
  adIds: string[],
  accessToken: string,
  datePreset: string = 'last_30_days'
): Promise<FacebookMetricsResponse> {
  console.log(`Fetching metrics for ${adIds.length} ads with date preset: ${datePreset}`);

  try {
    // Batch processing for more than 10 ad IDs
    if (adIds.length > 10) {
      console.log('Processing ads in batches of 10');
      const batches: string[][] = [];
      for (let i = 0; i < adIds.length; i += 10) {
        batches.push(adIds.slice(i, i + 10));
      }

      const batchPromises = batches.map((batch, index) => {
        console.log(`Processing batch ${index + 1}/${batches.length} with ${batch.length} ads`);
        return getAdMetricsBatch(batch, accessToken, datePreset);
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Flatten results from all batches
      const combinedData = batchResults.flatMap(result => result.data);
      
      return {
        data: combinedData,
        paging: batchResults[batchResults.length - 1]?.paging
      };
    }

    return await getAdMetricsBatch(adIds, accessToken, datePreset);
  } catch (error) {
    console.error('Error in getAdMetrics:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch ad metrics');
  }
}

/**
 * Internal function to fetch metrics for a batch of ads
 */
async function getAdMetricsBatch(
  adIds: string[],
  accessToken: string,
  datePreset: string
): Promise<FacebookMetricsResponse> {
  try {
    const fields = [
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'cpc',
      'cpm',
      'ctr',
      'unique_clicks',
      'unique_ctr',
      'cost_per_result',
      'actions',
      'action_values',
      'conversions',
      'conversion_rate_ranking',
      'date_start',
      'date_stop'
    ].join(',');

    const params = new URLSearchParams({
      access_token: accessToken,
      fields,
      time_increment: '1',
      level: 'ad',
      date_preset: datePreset,
      ad_ids: JSON.stringify(adIds)
    });

    const url = `${FACEBOOK_API_BASE_URL}/insights?${params.toString()}`;
    console.log('Fetching ad metrics from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }

      // Handle permission errors specifically
      if (errorData.error?.code === 200 || 
          (typeof errorData.error?.message === 'string' && 
           errorData.error.message.toLowerCase().includes('permission'))) {
        console.error('Permission error accessing ad metrics:', errorData.error?.message);
        throw new Error(
          'Permission denied: Please reconnect your Facebook account with proper permissions (ads_management, ads_read)'
        );
      }

      console.error('Ad metrics API error:', errorData);
      throw new Error(
        `Failed to fetch ad metrics: ${errorData.error?.message || response.statusText}`
      );
    }

    const result = await response.json();
    console.log(`Successfully fetched metrics for ${result.data?.length || 0} ad records`);
    return result;
  } catch (error) {
    console.error('Error in getAdMetricsBatch:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch ad metrics batch');
  }
}