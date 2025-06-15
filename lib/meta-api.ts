// Facebook Marketing API v23 utilities

export const FACEBOOK_API_VERSION = 'v23.0';
export const FACEBOOK_API_BASE_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

// OAuth configuration
export const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
export const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
export const FACEBOOK_REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/facebook/callback`;

// Scopes needed for the marketing API
export const FACEBOOK_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'read_insights',
  'public_profile',
  'email'
].join(',');

// API response types
interface FacebookApiResponse<T> {
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

interface FacebookMetricsResponse {
  data: Array<{
    date_start: string;
    date_stop: string;
    campaign_id?: string;
    adset_id?: string;
    ad_id?: string;
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
    actions?: Array<{
      action_type: string;
      value: string;
    }>;
    conversions?: number;
    conversion_rate_ranking?: string;
    [key: string]: unknown;
  }>;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

// Generate OAuth URL
export const getFacebookOAuthUrl = () => {
  return `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&scope=${encodeURIComponent(FACEBOOK_SCOPES)}&response_type=code`;
};

// Exchange code for access token
export const exchangeCodeForToken = async (code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> => {
  const url = `${FACEBOOK_API_BASE_URL}/oauth/access_token`;
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    code,
  });

  const response = await fetch(`${url}?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to exchange code for token');
  }

  const data = await response.json();
  console.log('Raw Facebook token response:', data);
  
  // Ensure expires_in is a number
  const expires_in = typeof data.expires_in === 'string' 
    ? parseInt(data.expires_in, 10) 
    : data.expires_in;
  
  return {
    access_token: data.access_token,
    token_type: data.token_type || 'bearer',
    expires_in: isNaN(expires_in) ? 3600 : expires_in // Default to 1 hour if invalid
  };
};

// Get user's ad accounts
export const getUserAdAccounts = async (accessToken: string): Promise<FacebookApiResponse<FacebookAdAccount>> => {
  const response = await fetch(
    `${FACEBOOK_API_BASE_URL}/me/adaccounts?fields=id,name,account_id,account_status,amount_spent,balance,currency,business_city,business_country_code,owner,age&access_token=${accessToken}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch ad accounts');
  }

  return response.json();
};

// Get campaigns for an ad account
export const getCampaigns = async (adAccountId: string, accessToken: string): Promise<FacebookApiResponse<FacebookCampaign>> => {
  const response = await fetch(
    `${FACEBOOK_API_BASE_URL}/${adAccountId}/campaigns?fields=id,name,status,objective,buying_type,special_ad_categories,daily_budget,lifetime_budget,start_time,stop_time&access_token=${accessToken}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch campaigns');
  }

  return response.json();
};

// Get ad sets for a campaign
export const getAdSets = async (campaignId: string, accessToken: string): Promise<FacebookApiResponse<FacebookAdSet>> => {
  const response = await fetch(
    `${FACEBOOK_API_BASE_URL}/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount&access_token=${accessToken}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch ad sets');
  }

  return response.json();
};

// Get ads for an ad set
export const getAds = async (adSetId: string, accessToken: string): Promise<FacebookApiResponse<FacebookAd>> => {
  const response = await fetch(
    `${FACEBOOK_API_BASE_URL}/${adSetId}/ads?fields=id,name,status,creative{id,name,title,body,image_url,video_id},adset_id,campaign_id,bid_amount,configured_status&access_token=${accessToken}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch ads');
  }

  return response.json();
};

// Get metrics for campaigns
export const getCampaignMetrics = async (
  campaignIds: string[], 
  accessToken: string, 
  datePreset: string = 'last_30_days'
): Promise<FacebookMetricsResponse> => {
  // Handle batch requests if there are more than 10 campaigns
  if (campaignIds.length > 10) {
    const batches: Promise<FacebookMetricsResponse>[] = [];
    for (let i = 0; i < campaignIds.length; i += 10) {
      const batchCampaignIds = campaignIds.slice(i, i + 10);
      batches.push(getCampaignMetrics(batchCampaignIds, accessToken, datePreset));
    }
    
    try {
      const results = await Promise.all(batches);
      return {
        data: results.flatMap(result => result.data)
      };
    } catch (error) {
      console.error('Error in batch campaign metrics fetch:', error);
      throw error;
    }
  }
  
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
  
  const params = new URLSearchParams();
  params.append('access_token', accessToken);
  params.append('fields', fields);
  params.append('time_increment', '1');
  params.append('date_preset', datePreset);
  params.append('level', 'campaign');
  
  // Build the endpoint with campaign IDs
  const endpoint = `${FACEBOOK_API_BASE_URL}/insights?${params.toString()}&campaign_ids=[${campaignIds.map(id => `"${id}"`).join(',')}]`;
  
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const error = await response.json();
      
      // Check if it's a permission error
      if (error.error && (error.error.code === 200 || error.error.message.includes('permission'))) {
        console.error('Facebook permission error when fetching campaign metrics:', error.error);
        console.error('This is likely because the token lacks ads_management or ads_read permissions.');
        console.error('Please reconnect your Facebook account with the proper permissions.');
      } else {
        console.error('Error fetching campaign metrics:', error);
      }
      
      throw new Error(error.error?.message || 'Failed to fetch campaign metrics');
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to fetch campaign metrics:', error);
    throw error;
  }
};

// Get metrics for ad sets
export const getAdSetMetrics = async (
  adSetIds: string[], 
  accessToken: string, 
  datePreset: string = 'last_30_days'
): Promise<FacebookMetricsResponse> => {
  // Handle batch requests if there are more than 10 ad sets
  if (adSetIds.length > 10) {
    const batches: Promise<FacebookMetricsResponse>[] = [];
    for (let i = 0; i < adSetIds.length; i += 10) {
      const batchAdSetIds = adSetIds.slice(i, i + 10);
      batches.push(getAdSetMetrics(batchAdSetIds, accessToken, datePreset));
    }
    
    try {
      const results = await Promise.all(batches);
      return {
        data: results.flatMap(result => result.data)
      };
    } catch (error) {
      console.error('Error in batch ad set metrics fetch:', error);
      throw error;
    }
  }
  
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
  
  const params = new URLSearchParams();
  params.append('access_token', accessToken);
  params.append('fields', fields);
  params.append('time_increment', '1');
  params.append('date_preset', datePreset);
  params.append('level', 'adset');
  
  // Build the endpoint with ad set IDs
  const endpoint = `${FACEBOOK_API_BASE_URL}/insights?${params.toString()}&adset_ids=[${adSetIds.map(id => `"${id}"`).join(',')}]`;
  
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const error = await response.json();
      
      // Check if it's a permission error
      if (error.error && (error.error.code === 200 || error.error.message.includes('permission'))) {
        console.error('Facebook permission error when fetching ad set metrics:', error.error);
        console.error('This is likely because the token lacks ads_management or ads_read permissions.');
        console.error('Please reconnect your Facebook account with the proper permissions.');
      } else {
        console.error('Error fetching ad set metrics:', error);
      }
      
      throw new Error(error.error?.message || 'Failed to fetch ad set metrics');
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to fetch ad set metrics:', error);
    throw error;
  }
};

// Get metrics for ads
export const getAdMetrics = async (
  adIds: string[], 
  accessToken: string, 
  datePreset: string = 'last_30_days'
): Promise<FacebookMetricsResponse> => {
  // Handle batch requests if there are more than 10 ads
  if (adIds.length > 10) {
    const batches: Promise<FacebookMetricsResponse>[] = [];
    for (let i = 0; i < adIds.length; i += 10) {
      const batchAdIds = adIds.slice(i, i + 10);
      batches.push(getAdMetrics(batchAdIds, accessToken, datePreset));
    }
    
    try {
      const results = await Promise.all(batches);
      return {
        data: results.flatMap(result => result.data)
      };
    } catch (error) {
      console.error('Error in batch ad metrics fetch:', error);
      throw error;
    }
  }
  
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
  
  const params = new URLSearchParams();
  params.append('access_token', accessToken);
  params.append('fields', fields);
  params.append('time_increment', '1');
  params.append('date_preset', datePreset);
  params.append('level', 'ad');
  
  // Build the endpoint with ad IDs
  const endpoint = `${FACEBOOK_API_BASE_URL}/insights?${params.toString()}&ad_ids=[${adIds.map(id => `"${id}"`).join(',')}]`;
  
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      const error = await response.json();
      
      // Check if it's a permission error
      if (error.error && (error.error.code === 200 || error.error.message.includes('permission'))) {
        console.error('Facebook permission error when fetching ad metrics:', error.error);
        console.error('This is likely because the token lacks ads_management or ads_read permissions.');
        console.error('Please reconnect your Facebook account with the proper permissions.');
      } else {
        console.error('Error fetching ad metrics:', error);
      }
      
      throw new Error(error.error?.message || 'Failed to fetch ad metrics');
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to fetch ad metrics:', error);
    throw error;
  }
}; 