// Meta Marketing API related types

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

// New types for campaign creation
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
];

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

// Tavus AI Avatar related types

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
  error_message?: string;
  user_id: string;
  is_stock?: boolean;
  avatar_url?: string;
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
  replica_id: string;
  script: string;
  background_url?: string;
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
  type: 'follow-up';
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface AvatarCreationRequest {
  replica_id?: string;
  persona_id?: string;
  script: string;
  video_name: string;
  background_url?: string;
  conversational_context?: string;
  custom_greeting?: string;
}

// New types for ad set creation
export interface AdSetCreateRequest {
  name: string;
  campaign_id: string;
  targeting: AdSetTargeting;
  optimization_goal: string;
  billing_event: string;
  bid_amount?: string;
  bid_strategy?: 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'TARGET_COST';
  status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
}

export interface AdSetTargeting {
  geo_locations: {
    countries: string[];
    regions?: Array<{ key: string }>;
    cities?: Array<{ key: number; radius: number; distance_unit: string }>;
  };
  age_min?: number;
  age_max?: number;
  genders?: number[];
  facebook_positions?: string[];
  publisher_platforms?: string[];
  device_platforms?: string[];
  behaviors?: Array<{ id: number; name: string }>;
  interests?: Array<{ id: number; name: string }>;
  custom_audiences?: Array<{ id: string }>;
  excluded_custom_audiences?: Array<{ id: string }>;
  targeting_automation?: {
    advantage_audience: 0 | 1; // 0 = disabled, 1 = enabled
  };
}

// Optimization goals for ad sets
export const OPTIMIZATION_GOALS = [
  { value: 'REACH', label: 'Reach', description: 'Show your ad to as many people as possible', compatibleBillingEvents: ['IMPRESSIONS'] },
  { value: 'IMPRESSIONS', label: 'Impressions', description: 'Get the most impressions for your budget', compatibleBillingEvents: ['IMPRESSIONS'] },
  { value: 'LINK_CLICKS', label: 'Link Clicks', description: 'Get more people to click links to your website', compatibleBillingEvents: ['LINK_CLICKS', 'IMPRESSIONS'] },
  { value: 'POST_ENGAGEMENT', label: 'Post Engagement', description: 'Get more likes, comments, and shares', compatibleBillingEvents: ['IMPRESSIONS'] },
  { value: 'PAGE_LIKES', label: 'Page Likes', description: 'Get more people to like your page', compatibleBillingEvents: ['IMPRESSIONS'] },
  { value: 'APP_INSTALLS', label: 'App Installs', description: 'Get more people to install your app', compatibleBillingEvents: ['IMPRESSIONS'] },
  { value: 'LEAD_GENERATION', label: 'Lead Generation', description: 'Collect leads for your business', compatibleBillingEvents: ['IMPRESSIONS'] },
  { value: 'CONVERSIONS', label: 'Conversions', description: 'Get more conversions on your website', compatibleBillingEvents: ['IMPRESSIONS'] },
  { value: 'VIDEO_VIEWS', label: 'Video Views', description: 'Get more people to watch your videos', compatibleBillingEvents: ['IMPRESSIONS', 'VIDEO_VIEWS'] },
  { value: 'THRUPLAY', label: 'ThruPlay', description: 'Get more people to watch your videos to completion', compatibleBillingEvents: ['IMPRESSIONS', 'THRUPLAY'] },
] as const;

// Billing events for ad sets
export const BILLING_EVENTS = [
  { value: 'IMPRESSIONS', label: 'Impressions', description: 'Pay when your ads are shown' },
  { value: 'LINK_CLICKS', label: 'Link Clicks', description: 'Pay when people click your links' },
  { value: 'POST_ENGAGEMENT', label: 'Post Engagement', description: 'Pay when people engage with your posts' },
  { value: 'PAGE_LIKES', label: 'Page Likes', description: 'Pay when people like your page' },
  { value: 'APP_INSTALLS', label: 'App Installs', description: 'Pay when people install your app' },
  { value: 'VIDEO_VIEWS', label: 'Video Views', description: 'Pay when people watch your videos' },
  { value: 'THRUPLAY', label: 'ThruPlay', description: 'Pay when people watch videos to completion' },
] as const;

// Helper function to get compatible billing events for an optimization goal
export function getCompatibleBillingEvents(optimizationGoal: string): readonly string[] {
  const goal = OPTIMIZATION_GOALS.find(g => g.value === optimizationGoal);
  return goal?.compatibleBillingEvents || [];
}

// Helper function to validate optimization goal and billing event combination
export function isValidOptimizationBillingCombination(optimizationGoal: string, billingEvent: string): boolean {
  const compatibleEvents = getCompatibleBillingEvents(optimizationGoal);
  return compatibleEvents.includes(billingEvent);
}

// Countries for targeting
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
  { code: 'NL', name: 'Netherlands' },
] as const;

// Facebook positions for ad placement
export const FACEBOOK_POSITIONS = [
  { value: 'feed', label: 'Facebook Feed' },
  { value: 'right_hand_column', label: 'Facebook Right Column' },
  { value: 'instant_article', label: 'Facebook Instant Articles' },
  { value: 'marketplace', label: 'Facebook Marketplace' },
  { value: 'video_feeds', label: 'Facebook Video Feeds' },
  { value: 'story', label: 'Facebook Stories' },
  { value: 'search', label: 'Facebook Search Results' },
] as const;

// Publisher platforms
export const PUBLISHER_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'audience_network', label: 'Audience Network' },
  { value: 'messenger', label: 'Messenger' },
] as const;

// Bidding strategies
export const BIDDING_STRATEGIES = [
  {
    value: 'LOWEST_COST_WITHOUT_CAP',
    label: 'Lowest Cost (Automatic)',
    description: 'Get the most results for your budget automatically'
  },
  {
    value: 'LOWEST_COST_WITH_BID_CAP',
    label: 'Lowest Cost with Bid Cap',
    description: 'Set a maximum bid amount while optimizing for lowest cost'
  },
  {
    value: 'TARGET_COST',
    label: 'Target Cost',
    description: 'Maintain a specific average cost per result'
  }
] as const;

// Ad Creation Types
export interface AdCreateRequest {
  name: string;
  adset_id: string;
  creative: AdCreative;
  status?: 'ACTIVE' | 'PAUSED';
  tracking_specs?: TrackingSpec[];
}

export interface AdCreative {
  name: string;
  object_story_spec: ObjectStorySpec;
  degrees_of_freedom_spec?: {
    creative_features_spec?: {
      standard_enhancements?: {
        enroll_status: 'OPT_IN' | 'OPT_OUT';
      };
    };
  };
}

export interface ObjectStorySpec {
  page_id: string;
  link_data?: LinkData;
  video_data?: VideoData;
  photo_data?: PhotoData;
}

export interface LinkData {
  link: string;
  message?: string;
  name?: string; // Headline
  description?: string; // Primary text
  call_to_action?: CallToAction;
  image_hash?: string;
  child_attachments?: ChildAttachment[];
}

export interface VideoData {
  video_id: string;
  message?: string;
  call_to_action?: CallToAction;
  image_url?: string; // Thumbnail
}

export interface PhotoData {
  image_hash: string;
  message?: string;
  call_to_action?: CallToAction;
}

export interface CallToAction {
  type: string;
  value?: {
    link?: string;
    link_caption?: string;
    link_description?: string;
  };
}

export interface ChildAttachment {
  link: string;
  name?: string;
  description?: string;
  image_hash?: string;
}

export interface TrackingSpec {
  action_type: string[];
  fb_pixel?: string[];
  application?: string[];
}

// Call to Action types
export const CTA_TYPES = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'BOOK_TRAVEL', label: 'Book Travel' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'WATCH_MORE', label: 'Watch More' },
  { value: 'PLAY_GAME', label: 'Play Game' },
  { value: 'INSTALL_APP', label: 'Install App' },
  { value: 'USE_APP', label: 'Use App' },
  { value: 'INSTALL_MOBILE_APP', label: 'Install Mobile App' },
  { value: 'USE_MOBILE_APP', label: 'Use Mobile App' },
  { value: 'NO_BUTTON', label: 'No Button' },
] as const;

// Media formats
export const MEDIA_FORMATS = [
  { value: 'image', label: 'Single Image', description: 'JPG or PNG, recommended 1200x628px' },
  { value: 'video', label: 'Single Video', description: 'MP4, MOV, or GIF, max 4GB' },
  { value: 'carousel', label: 'Carousel', description: 'Multiple images or videos, 2-10 cards' },
  { value: 'collection', label: 'Collection', description: 'Cover image/video + product catalog' },
] as const;

// Facebook Pages and Instagram Account types
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
  connected_page_id?: string;
  connected_page_name?: string;
}

export interface FacebookPagesResponse {
  success: boolean;
  pages: FacebookPage[];
  instagramAccounts: InstagramAccount[];
  defaultPageId: string | null;
  defaultPageName: string | null;
  defaultPageType: 'facebook_page' | 'instagram_account' | null;
  totalAccounts: number;
} 