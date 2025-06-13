// Meta Marketing API related types

// ============================================================================
// Facebook/Meta Marketing API Types
// ============================================================================

export interface FacebookAdAccount {
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
  user_id: string;
  created_at: string;
  last_synced_at: string;
}

export interface FacebookCampaign {
  id: string;
  ad_account_id: string;
  name: string;
  status: string;
  objective: string;
  buying_type: string;
  special_ad_categories: string[];
  daily_budget: string;
  lifetime_budget: string;
  start_time: string;
  stop_time: string;
  created_at: string;
  last_synced_at: string;
}

export interface CampaignCreateRequest {
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED';
  special_ad_categories: string[];
  daily_budget?: string;
  lifetime_budget?: string;
  buying_type?: string;
}

export interface CampaignObjective {
  value: string;
  label: string;
  description: string;
}

export const CAMPAIGN_OBJECTIVES: CampaignObjective[] = [
  {
    value: 'OUTCOME_TRAFFIC',
    label: 'Traffic',
    description: 'Send people to a destination on or off Facebook'
  },
  {
    value: 'OUTCOME_ENGAGEMENT',
    label: 'Engagement',
    description: 'Get more post engagement, Page likes, event responses or offer claims'
  },
  {
    value: 'OUTCOME_LEADS',
    label: 'Lead Generation',
    description: 'Collect leads for your business or brand'
  },
  {
    value: 'OUTCOME_SALES',
    label: 'Sales',
    description: 'Find people likely to purchase your product or service'
  },
  {
    value: 'OUTCOME_APP_PROMOTION',
    label: 'App Promotion',
    description: 'Find new users or re-engage existing users of your app'
  },
  {
    value: 'OUTCOME_AWARENESS',
    label: 'Awareness',
    description: 'Increase awareness for your brand'
  }
] as const;

export interface FacebookAdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  daily_budget: string;
  lifetime_budget: string;
  targeting: Record<string, unknown>;
  optimization_goal: string;
  billing_event: string;
  bid_amount: string;
  created_at: string;
  last_synced_at: string;
}

export interface FacebookAd {
  id: string;
  ad_set_id: string;
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
  campaign_id: string;
  bid_amount: string;
  configured_status: string;
  created_at: string;
  last_synced_at: string;
}

export interface FacebookToken {
  id: string;
  user_id: string;
  access_token: string;
  expires_at: string;
  created_at: string;
}

export interface FacebookMetrics {
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  spend: string;
  cpc: string;
  cpm: string;
  cost_per_result: string;
  frequency: number;
  ctr: number;
  unique_ctr: number;
  conversion_rate: number;
  unique_clicks: number;
}

export interface FacebookCampaignMetrics extends FacebookMetrics {
  id: string;
  campaign_id: string;
  date: string;
  timestamp: string;
}

export interface FacebookAdSetMetrics extends FacebookMetrics {
  id: string;
  ad_set_id: string;
  date: string;
  timestamp: string;
}

export interface FacebookAdMetrics extends FacebookMetrics {
  id: string;
  ad_id: string;
  date: string;
  timestamp: string;
}

export interface FacebookSyncJob {
  id: string;
  user_id: string;
  ad_account_id: string;
  job_type: 'account' | 'campaign' | 'adset' | 'ad' | 'metrics';
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Tavus AI Avatar Types
// ============================================================================

export interface TavusConnection {
  id: string;
  user_id: string;
  api_key: string;
  is_connected: boolean;
  connection_status: 'pending' | 'connected' | 'disconnected' | 'error';
  error_message?: string;
  last_connected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TavusReplica {
  replica_id: string;
  replica_name: string;
  status: 'training' | 'ready' | 'error' | 'deprecated';
  training_progress: string;
  created_at: string;
  user_id: string;
  error_message?: string;
  avatar_url?: string;
  is_stock?: boolean;
}

export interface TavusPersona {
  persona_id: string;
  persona_name: string;
  system_prompt: string;
  context: string;
  created_at: string;
  user_id: string;
}

export interface TavusVideo {
  video_id: string;
  video_name: string;
  status: 'generating' | 'ready' | 'error';
  download_url?: string;
  stream_url?: string;
  hosted_url?: string;
  background_url?: string;
  replica_id: string;
  script: string;
  created_at: string;
  user_id: string;
}

export interface TavusStockPersona {
  persona_id: string;
  name: string;
  description: string;
  system_prompt: string;
  context: string;
  avatar_url?: string;
}

export interface LeadNurturingFile {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  type: 'follow-up';
}

export interface AvatarCreationRequest {
  script: string;
  video_name: string;
  replica_id?: string;
  persona_id?: string;
  background_url?: string;
  conversational_context?: string;
  custom_greeting?: string;
}

// ============================================================================
// Ad Set Creation Types
// ============================================================================

export interface AdSetTargeting {
  geo_locations: {
    countries: string[];
    regions?: { key: string }[];
    cities?: { key: number; radius: number; distance_unit: string }[];
  };
  age_min?: number;
  age_max?: number;
  genders?: number[];
  facebook_positions?: string[];
  publisher_platforms?: string[];
  device_platforms?: string[];
  behaviors?: { id: number; name: string }[];
  interests?: { id: number; name: string }[];
  custom_audiences?: { id: string }[];
  excluded_custom_audiences?: { id: string }[];
  targeting_automation?: {
    advantage_audience: 0 | 1;
  };
}

export interface AdSetCreateRequest {
  name: string;
  campaign_id: string;
  optimization_goal: string;
  billing_event: string;
  targeting: AdSetTargeting;
  bid_amount?: string;
  status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  bid_strategy?: 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'TARGET_COST';
}

// ============================================================================
// Constants for Ad Sets
// ============================================================================

export const OPTIMIZATION_GOALS = [
  {
    value: 'REACH',
    label: 'Reach',
    description: 'Show your ads to the maximum number of people',
    compatibleBillingEvents: ['IMPRESSIONS'] as const
  },
  {
    value: 'IMPRESSIONS',
    label: 'Impressions',
    description: 'Get the most impressions for your budget',
    compatibleBillingEvents: ['IMPRESSIONS'] as const
  },
  {
    value: 'LINK_CLICKS',
    label: 'Link Clicks',
    description: 'Drive traffic to your website or app',
    compatibleBillingEvents: ['LINK_CLICKS', 'IMPRESSIONS'] as const
  },
  {
    value: 'POST_ENGAGEMENT',
    label: 'Post Engagement',
    description: 'Get more likes, comments, shares, and other engagement',
    compatibleBillingEvents: ['POST_ENGAGEMENT', 'IMPRESSIONS'] as const
  },
  {
    value: 'PAGE_LIKES',
    label: 'Page Likes',
    description: 'Get more people to like your Facebook Page',
    compatibleBillingEvents: ['PAGE_LIKES', 'IMPRESSIONS'] as const
  },
  {
    value: 'APP_INSTALLS',
    label: 'App Installs',
    description: 'Get more people to install your app',
    compatibleBillingEvents: ['APP_INSTALLS', 'IMPRESSIONS'] as const
  },
  {
    value: 'LEAD_GENERATION',
    label: 'Lead Generation',
    description: 'Collect leads for your business',
    compatibleBillingEvents: ['IMPRESSIONS'] as const
  },
  {
    value: 'CONVERSIONS',
    label: 'Conversions',
    description: 'Get more conversions on your website',
    compatibleBillingEvents: ['IMPRESSIONS'] as const
  },
  {
    value: 'VIDEO_VIEWS',
    label: 'Video Views',
    description: 'Get more people to watch your videos',
    compatibleBillingEvents: ['VIDEO_VIEWS', 'THRUPLAY', 'IMPRESSIONS'] as const
  },
  {
    value: 'THRUPLAY',
    label: 'ThruPlay',
    description: 'Get more people to watch your videos to completion',
    compatibleBillingEvents: ['THRUPLAY', 'IMPRESSIONS'] as const
  }
] as const;

export const BILLING_EVENTS = [
  {
    value: 'IMPRESSIONS',
    label: 'Impressions',
    description: 'Pay when your ad is shown'
  },
  {
    value: 'LINK_CLICKS',
    label: 'Link Clicks',
    description: 'Pay when people click on links in your ad'
  },
  {
    value: 'POST_ENGAGEMENT',
    label: 'Post Engagement',
    description: 'Pay when people engage with your post'
  },
  {
    value: 'PAGE_LIKES',
    label: 'Page Likes',
    description: 'Pay when people like your Page'
  },
  {
    value: 'APP_INSTALLS',
    label: 'App Installs',
    description: 'Pay when people install your app'
  },
  {
    value: 'VIDEO_VIEWS',
    label: 'Video Views',
    description: 'Pay when people watch your video'
  },
  {
    value: 'THRUPLAY',
    label: 'ThruPlay',
    description: 'Pay when people watch your video to completion'
  }
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function getCompatibleBillingEvents(optimizationGoal: string): readonly string[] {
  const goal = OPTIMIZATION_GOALS.find(g => g.value === optimizationGoal);
  return goal?.compatibleBillingEvents || [];
}

export function isValidOptimizationBillingCombination(
  optimizationGoal: string, 
  billingEvent: string
): boolean {
  const compatibleEvents = getCompatibleBillingEvents(optimizationGoal);
  return compatibleEvents.includes(billingEvent);
}

// ============================================================================
// Countries Constant
// ============================================================================

export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'NL', name: 'Netherlands' }
] as const;

// ============================================================================
// Platform Constants
// ============================================================================

export const FACEBOOK_POSITIONS = [
  'feed',
  'right_hand_column',
  'instant_article',
  'marketplace',
  'video_feeds',
  'story',
  'search'
] as const;

export const PUBLISHER_PLATFORMS = [
  'facebook',
  'instagram',
  'audience_network',
  'messenger'
] as const;

export const BIDDING_STRATEGIES = [
  {
    value: 'LOWEST_COST_WITHOUT_CAP',
    label: 'Lowest Cost',
    description: 'Get the most results for your budget'
  },
  {
    value: 'LOWEST_COST_WITH_BID_CAP',
    label: 'Lowest Cost with Bid Cap',
    description: 'Control your maximum bid while getting the most results'
  },
  {
    value: 'TARGET_COST',
    label: 'Target Cost',
    description: 'Maintain a stable average cost per result'
  }
] as const;

// ============================================================================
// Ad Creation Types
// ============================================================================

export interface CallToAction {
  type: string;
  value?: {
    link?: string;
    link_caption?: string;
    link_description?: string;
    link_title?: string;
  };
}

export interface ChildAttachment {
  link?: string;
  name?: string;
  description?: string;
  image_hash?: string;
  video_id?: string;
  call_to_action?: CallToAction;
}

export interface LinkData {
  link?: string;
  message?: string;
  name?: string;
  description?: string;
  caption?: string;
  image_hash?: string;
  call_to_action?: CallToAction;
  child_attachments?: ChildAttachment[];
}

export interface VideoData {
  video_id?: string;
  image_url?: string;
  message?: string;
  call_to_action?: CallToAction;
}

export interface PhotoData {
  image_hash?: string;
  caption?: string;
  url?: string;
}

export interface ObjectStorySpec {
  page_id: string;
  link_data?: LinkData;
  video_data?: VideoData;
  photo_data?: PhotoData;
}

export interface AdCreative {
  name: string;
  object_story_spec: ObjectStorySpec;
  degrees_of_freedom_spec?: Record<string, unknown>;
}

export interface TrackingSpec {
  action_type: string[];
  fb_pixel?: string[];
  application?: string[];
}

export interface AdCreateRequest {
  name: string;
  adset_id: string;
  creative: AdCreative;
  status?: string;
  tracking_specs?: TrackingSpec[];
}

// ============================================================================
// Final Constants
// ============================================================================

export const CTA_TYPES = [
  'LEARN_MORE',
  'SHOP_NOW',
  'BOOK_TRAVEL',
  'DOWNLOAD',
  'SIGN_UP',
  'CONTACT_US',
  'DONATE',
  'SUBSCRIBE',
  'SAY_THANKS',
  'SELL_NOW',
  'SHARE',
  'PLAY_GAME',
  'INSTALL_APP',
  'USE_APP',
  'CALL_NOW'
] as const;

export const MEDIA_FORMATS = [
  'image',
  'video',
  'carousel',
  'collection'
] as const;

// ============================================================================
// Facebook Pages Types
// ============================================================================

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  type: 'facebook_page';
}

export interface InstagramAccount {
  id: string;
  name?: string;
  username: string;
  type: 'instagram_account';
  connected_facebook_page?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
}

export interface FacebookPagesResponse {
  facebook_pages: FacebookPage[];
  instagram_accounts: InstagramAccount[];
  total_facebook_pages: number;
  total_instagram_accounts: number;
  has_more_facebook_pages: boolean;
  has_more_instagram_accounts: boolean;
  default_facebook_page?: string;
  default_instagram_account?: string;
}