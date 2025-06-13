import { useState, useEffect, useCallback, useMemo } from 'react';
import { ContextData } from '@/lib/ai-api-client';
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd } from '@/lib/types';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Selected item structure for legacy mode
 */
interface SelectedItem {
  type: 'account' | 'campaign' | 'adset' | 'ad';
  item: FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd;
  parentId?: string;
}

/**
 * Legacy props structure
 */
interface LegacyProps {
  selectedItem?: SelectedItem;
  adAccounts?: FacebookAdAccount[];
  campaigns?: FacebookCampaign[] | Record<string, FacebookCampaign[]>;
  adSets?: FacebookAdSet[] | Record<string, FacebookAdSet[]>;
  ads?: FacebookAd[] | Record<string, FacebookAd[]>;
  metrics?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  timeRange?: string;
  currentView?: string;
}

/**
 * New props structure with generateContext function
 */
interface NewProps {
  generateContext: () => ContextData;
  dependencies?: unknown[];
}

/**
 * Union type for all possible props
 */
type AIContextProps = NewProps | LegacyProps;

/**
 * Mentionable item structure
 */
interface MentionableItem {
  id: string;
  name: string;
  type: 'account' | 'campaign' | 'adset' | 'ad';
  parentName?: string;
}

/**
 * Context summary structure
 */
interface ContextSummary {
  accountsCount: number;
  campaignsCount: number;
  adsetsCount: number;
  adsCount: number;
  currentView: string;
  timeRange: string;
  description: string;
}

// ============================================================================
// Type Guard Functions
// ============================================================================

/**
 * Type guard to check if props contain generateContext function (new mode)
 */
function isNewProps(props: AIContextProps): props is NewProps {
  return 'generateContext' in props && typeof props.generateContext === 'function';
}

/**
 * Type guard to check if props are in legacy format
 */
function isLegacyProps(props: AIContextProps): props is LegacyProps {
  return !isNewProps(props);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Flatten arrays or objects of arrays into a single array
 */
function flattenToArray<T>(data: T[] | Record<string, T[]> | undefined): T[] {
  if (!data) return [];
  
  if (Array.isArray(data)) {
    return data;
  }
  
  // If it's an object with arrays as values, flatten all arrays
  return Object.values(data).flat();
}

/**
 * Generate current view name based on selected item
 */
function generateCurrentView(selectedItem?: SelectedItem, fallbackView?: string): string {
  if (!selectedItem) {
    return fallbackView || 'ad-accounts-overview';
  }
  
  const { type, item } = selectedItem;
  
  switch (type) {
    case 'account':
      return `account-${item.name.toLowerCase().replace(/\s+/g, '-')}`;
    case 'campaign':
      return `campaign-${item.name.toLowerCase().replace(/\s+/g, '-')}`;
    case 'adset':
      return `adset-${item.name.toLowerCase().replace(/\s+/g, '-')}`;
    case 'ad':
      return `ad-${item.name.toLowerCase().replace(/\s+/g, '-')}`;
    default:
      return 'marketing-overview';
  }
}

/**
 * Build selected items array from selectedItem prop
 */
function buildSelectedItems(selectedItem?: SelectedItem): Record<string, unknown>[] {
  if (!selectedItem) return [];
  
  return [{
    id: selectedItem.item.id,
    name: selectedItem.item.name,
    type: selectedItem.type,
    ...(selectedItem.parentId && { parentId: selectedItem.parentId }),
    ...selectedItem.item
  }];
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * AI Context Management Hook
 * 
 * Supports two modes:
 * 1. New Props Mode: Uses generateContext function
 * 2. Legacy Props Mode: Constructs context from individual props
 */
export function useAIContext(props: AIContextProps) {
  const [contextData, setContextData] = useState<ContextData>({});

  // ============================================================================
  // New Props Mode Logic
  // ============================================================================

  useEffect(() => {
    if (isNewProps(props)) {
      console.log('🔄 useAIContext: Running in new props mode');
      
      try {
        const newContext = props.generateContext();
        setContextData(newContext);
        
        console.log('✅ useAIContext: Context generated successfully', {
          campaigns: newContext.campaigns?.length || 0,
          adsets: newContext.adsets?.length || 0,
          ads: newContext.ads?.length || 0,
          ad_accounts: newContext.ad_accounts?.length || 0
        });
      } catch (error) {
        console.error('❌ useAIContext: Error generating context:', error);
        setContextData({});
      }
    }
  }, isNewProps(props) ? props.dependencies || [] : []);

  // ============================================================================
  // Legacy Props Mode Logic
  // ============================================================================

  useEffect(() => {
    if (isLegacyProps(props)) {
      console.log('🔄 useAIContext: Running in legacy props mode');
      
      try {
        // Flatten all data arrays
        const flattenedCampaigns = flattenToArray(props.campaigns);
        const flattenedAdSets = flattenToArray(props.adSets);
        const flattenedAds = flattenToArray(props.ads);
        const adAccounts = props.adAccounts || [];
        
        // Build context data
        const legacyContext: ContextData = {
          campaigns: flattenedCampaigns,
          adsets: flattenedAdSets,
          ads: flattenedAds,
          ad_accounts: adAccounts,
          metrics: props.metrics,
          selected_items: buildSelectedItems(props.selectedItem),
          current_view: generateCurrentView(props.selectedItem, props.currentView),
          date_range: {
            days: props.timeRange || "30"
          }
        };
        
        setContextData(legacyContext);
        
        console.log('✅ useAIContext: Legacy context built successfully', {
          campaigns: flattenedCampaigns.length,
          adsets: flattenedAdSets.length,
          ads: flattenedAds.length,
          ad_accounts: adAccounts.length,
          selected_items: legacyContext.selected_items?.length || 0,
          current_view: legacyContext.current_view
        });
      } catch (error) {
        console.error('❌ useAIContext: Error building legacy context:', error);
        setContextData({});
      }
    }
  }, [
    props,
    // Dependencies for legacy mode
    ...(isLegacyProps(props) ? [
      props.selectedItem,
      props.adAccounts,
      props.campaigns,
      props.adSets,
      props.ads,
      props.metrics,
      props.filters,
      props.timeRange,
      props.currentView
    ] : [])
  ]);

  // ============================================================================
  // Context Summary
  // ============================================================================

  const contextSummary = useMemo((): ContextSummary => {
    const accountsCount = contextData.ad_accounts?.length || 0;
    const campaignsCount = contextData.campaigns?.length || 0;
    const adsetsCount = contextData.adsets?.length || 0;
    const adsCount = contextData.ads?.length || 0;
    const currentView = contextData.current_view || 'overview';
    const timeRange = contextData.date_range?.days || '30';
    
    // Build description string
    const parts: string[] = [];
    if (accountsCount > 0) parts.push(`${accountsCount} Ad Account${accountsCount !== 1 ? 's' : ''}`);
    if (campaignsCount > 0) parts.push(`${campaignsCount} campaign${campaignsCount !== 1 ? 's' : ''}`);
    if (adsetsCount > 0) parts.push(`${adsetsCount} adset${adsetsCount !== 1 ? 's' : ''}`);
    if (adsCount > 0) parts.push(`${adsCount} ad${adsCount !== 1 ? 's' : ''}`);
    
    const description = parts.length > 0 
      ? `Context: ${parts.join(', ')}`
      : 'Context: No data available';
    
    return {
      accountsCount,
      campaignsCount,
      adsetsCount,
      adsCount,
      currentView,
      timeRange,
      description
    };
  }, [contextData]);

  // ============================================================================
  // Generate Context Function
  // ============================================================================

  const generateContext = useCallback((): ContextData => {
    if (isNewProps(props)) {
      return props.generateContext();
    }
    
    // For legacy mode, return current contextData
    return contextData;
  }, [props, contextData]);

  // ============================================================================
  // Get All Mentionable Items
  // ============================================================================

  const getAllMentionableItems = useCallback((): MentionableItem[] => {
    console.log('🔍 useAIContext: Collecting mentionable items...');
    
    const items: MentionableItem[] = [];
    
    // Create lookup maps for parent names
    const accountsMap = new Map<string, string>();
    const campaignsMap = new Map<string, { name: string; accountId: string }>();
    const adsetsMap = new Map<string, { name: string; campaignId: string }>();
    
    // Build account lookup
    if (contextData.ad_accounts) {
      contextData.ad_accounts.forEach(account => {
        accountsMap.set(account.id, account.name);
        items.push({
          id: account.id,
          name: account.name,
          type: 'account'
        });
      });
    }
    
    // Build campaign lookup and add campaigns
    if (contextData.campaigns) {
      contextData.campaigns.forEach(campaign => {
        const accountName = accountsMap.get(campaign.ad_account_id);
        campaignsMap.set(campaign.id, { 
          name: campaign.name, 
          accountId: campaign.ad_account_id 
        });
        
        items.push({
          id: campaign.id,
          name: campaign.name,
          type: 'campaign',
          parentName: accountName
        });
      });
    }
    
    // Build adset lookup and add adsets
    if (contextData.adsets) {
      contextData.adsets.forEach(adset => {
        const campaignInfo = campaignsMap.get(adset.campaign_id);
        adsetsMap.set(adset.id, { 
          name: adset.name, 
          campaignId: adset.campaign_id 
        });
        
        items.push({
          id: adset.id,
          name: adset.name,
          type: 'adset',
          parentName: campaignInfo?.name
        });
      });
    }
    
    // Add ads
    if (contextData.ads) {
      contextData.ads.forEach(ad => {
        const adsetInfo = adsetsMap.get(ad.ad_set_id);
        
        items.push({
          id: ad.id,
          name: ad.name,
          type: 'ad',
          parentName: adsetInfo?.name
        });
      });
    }
    
    console.log('✅ useAIContext: Mentionable items collected', {
      total: items.length,
      accounts: items.filter(i => i.type === 'account').length,
      campaigns: items.filter(i => i.type === 'campaign').length,
      adsets: items.filter(i => i.type === 'adset').length,
      ads: items.filter(i => i.type === 'ad').length
    });
    
    return items;
  }, [contextData]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    contextData,
    contextSummary,
    generateContext,
    getAllMentionableItems
  };
}