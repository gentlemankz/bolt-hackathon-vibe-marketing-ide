import { useCallback, useMemo, useEffect, useState } from 'react';
import { ContextData } from '@/lib/ai-api-client';
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd } from '@/lib/types';

interface UseAIContextPropsOld {
  selectedItem?: {
    type: 'account' | 'campaign' | 'adset' | 'ad';
    item: FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd;
    parentId?: string;
  } | null;
  adAccounts?: FacebookAdAccount[];
  campaigns?: Record<string, FacebookCampaign[]>;
  adSets?: Record<string, FacebookAdSet[]>;
  ads?: Record<string, FacebookAd[]>;
  metrics?: Record<string, unknown>;
  timeRange?: string;
  filters?: Record<string, unknown>;
  currentView?: string;
}

interface UseAIContextPropsNew {
  generateContext: () => ContextData;
  dependencies?: unknown[];
}

type UseAIContextProps = UseAIContextPropsOld | UseAIContextPropsNew;

function isNewProps(props: UseAIContextProps): props is UseAIContextPropsNew {
  return 'generateContext' in props;
}

export function useAIContext(props: UseAIContextProps = {}) {
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const isNew = isNewProps(props);
  
  // Extract props for both approaches
  const newProps = isNew ? props : null;
  const oldProps = !isNew ? props : null;
  
  // New approach effect
  useEffect(() => {
    if (newProps) {
      const newContext = newProps.generateContext();
      setContextData(newContext);
    }
  }, [newProps, ...(newProps?.dependencies || [])]);
  
  // Old approach context generation
  const generateContextOld = useCallback((): ContextData => {
    if (!oldProps) return {};
    
    const {
      selectedItem,
      adAccounts = [],
      campaigns = {},
      adSets = {},
      ads = {},
      metrics = {},
      timeRange = '30',
      currentView = 'dashboard'
    } = oldProps;
    
    // Flatten campaigns, ad sets, and ads for context
    const allCampaigns = Object.values(campaigns).flat();
    const allAdSets = Object.values(adSets).flat();
    const allAds = Object.values(ads).flat();
    
    // Build selected items array with more detailed context
    const selectedItems = [];
    if (selectedItem) {
      selectedItems.push({
        type: selectedItem.type,
        id: selectedItem.item.id,
        name: selectedItem.item.name,
        data: selectedItem.item,
        parentId: selectedItem.parentId
      });
    }

    // Generate dynamic current view based on selection
    let dynamicView = currentView;
    if (selectedItem) {
      switch (selectedItem.type) {
        case 'account':
          dynamicView = `ad-account-${selectedItem.item.name}`;
          break;
        case 'campaign':
          dynamicView = `campaign-${selectedItem.item.name}`;
          break;
        case 'adset':
          dynamicView = `adset-${selectedItem.item.name}`;
          break;
        case 'ad':
          dynamicView = `ad-${selectedItem.item.name}`;
          break;
        default:
          dynamicView = 'marketing-overview';
      }
    } else if (adAccounts.length > 0) {
      dynamicView = 'ad-accounts-overview';
    }
    
    return {
      campaigns: allCampaigns as unknown as Record<string, unknown>[],
      adsets: allAdSets as unknown as Record<string, unknown>[],
      ads: allAds as unknown as Record<string, unknown>[],
      metrics: metrics,
      current_view: dynamicView,
      selected_items: selectedItems,
      date_range: timeRange ? { period: timeRange } : undefined,
      ad_accounts: adAccounts as unknown as Record<string, unknown>[],
    };
  }, [oldProps]);

  const contextOld = useMemo(() => oldProps ? generateContextOld() : null, [generateContextOld, oldProps]);

  const getContextSummary = useCallback(() => {
    const currentContext = isNew ? contextData : contextOld;
    
    if (!currentContext) {
      return {
        accounts: 0,
        campaigns: 0,
        adSets: 0,
        ads: 0,
        selectedType: null,
        selectedName: null,
        timeRange: '30',
        currentView: 'loading',
        description: 'Loading...'
      };
    }
    
    const accounts = currentContext.ad_accounts?.length || 0;
    const campaigns = currentContext.campaigns?.length || 0;
    const adSets = currentContext.adsets?.length || 0;
    const ads = currentContext.ads?.length || 0;
    
    let description = 'Marketing Overview';
    if (accounts > 0) {
      const parts = [];
      if (accounts > 0) parts.push(`${accounts} Ad Account${accounts > 1 ? 's' : ''}`);
      if (campaigns > 0) parts.push(`${campaigns} campaign${campaigns > 1 ? 's' : ''}`);
      if (adSets > 0) parts.push(`${adSets} ad set${adSets > 1 ? 's' : ''}`);
      if (ads > 0) parts.push(`${ads} ad${ads > 1 ? 's' : ''}`);
      description = `Context: ${parts.join('\n')}`;
    }
    
    return {
      accounts,
      campaigns,
      adSets,
      ads,
      selectedType: null,
      selectedName: null,
      timeRange: currentContext.date_range?.period || '30',
      currentView: currentContext.current_view || 'marketing-dashboard',
      description
    };
  }, [isNew, contextData, contextOld]);
  
  // Get all available items for @ mentions
  const getAllMentionableItems = useCallback(() => {
    const currentContext = isNew ? contextData : contextOld;
    
    if (!currentContext) {
      console.log('getAllMentionableItems: No context data available');
      return [];
    }
    
    console.log('getAllMentionableItems: Processing context data:', {
      accounts: currentContext.ad_accounts?.length || 0,
      campaigns: currentContext.campaigns?.length || 0,
      adsets: currentContext.adsets?.length || 0,
      ads: currentContext.ads?.length || 0
    });
    
    const items: Array<{
      id: string;
      name: string;
      type: 'account' | 'campaign' | 'adset' | 'ad';
      parentName?: string;
    }> = [];

    // Add ad accounts
    currentContext.ad_accounts?.forEach((account: Record<string, unknown>) => {
      items.push({
        id: account.id as string,
        name: account.name as string,
        type: 'account'
      });
    });

    // Add campaigns
    currentContext.campaigns?.forEach((campaign: Record<string, unknown>) => {
      const account = currentContext.ad_accounts?.find((acc: Record<string, unknown>) => acc.id === campaign.ad_account_id);
      items.push({
        id: campaign.id as string,
        name: campaign.name as string,
        type: 'campaign',
        parentName: account?.name as string
      });
    });

    // Add ad sets
    currentContext.adsets?.forEach((adSet: Record<string, unknown>) => {
      const campaign = currentContext.campaigns?.find((c: Record<string, unknown>) => c.id === adSet.campaign_id);
      items.push({
        id: adSet.id as string,
        name: adSet.name as string,
        type: 'adset',
        parentName: campaign?.name as string
      });
    });

    // Add ads
    currentContext.ads?.forEach((ad: Record<string, unknown>) => {
      const adSet = currentContext.adsets?.find((as: Record<string, unknown>) => as.id === ad.ad_set_id);
      items.push({
        id: ad.id as string,
        name: ad.name as string,
        type: 'ad',
        parentName: adSet?.name as string
      });
    });

    console.log('getAllMentionableItems: Found', items.length, 'mentionable items:', items.map(i => `${i.type}: ${i.name}`));
    return items;
  }, [isNew, contextData, contextOld]);
  
  return {
    context: isNew ? contextData : contextOld,
    contextSummary: getContextSummary(),
    generateContext: isNew ? newProps?.generateContext : generateContextOld,
    getAllMentionableItems,
  };
} 