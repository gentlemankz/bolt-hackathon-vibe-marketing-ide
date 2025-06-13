import { useState, useCallback, useMemo } from 'react';
import { TaggedFile } from '@/lib/ai-api-client';
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd, LeadNurturingFile } from '@/lib/types';

type TaggableData = FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile;

export function useTaggedFiles() {
  const [taggedFiles, setTaggedFiles] = useState<TaggedFile[]>([]);

  const addTaggedFile = useCallback((
    id: string,
    name: string,
    type: 'campaign' | 'adset' | 'ad' | 'account' | 'file',
    data: TaggableData,
    metadata?: Record<string, unknown>
  ) => {
    const newFile: TaggedFile = {
      id,
      name,
      type,
      content: data as unknown as Record<string, unknown>,
      metadata: {
        ...metadata,
        taggedAt: new Date().toISOString(),
      },
      created_at: new Date(),
    };

    setTaggedFiles(prev => {
      // Check if already tagged
      const exists = prev.some(file => file.id === id && file.type === type);
      if (exists) return prev;
      
      return [...prev, newFile];
    });
  }, []);

  const removeTaggedFile = useCallback((id: string, type: string) => {
    setTaggedFiles(prev => prev.filter(file => !(file.id === id && file.type === type)));
  }, []);

  const clearTaggedFiles = useCallback(() => {
    setTaggedFiles([]);
  }, []);

  const isTagged = useCallback((id: string, type: string) => {
    return taggedFiles.some(file => file.id === id && file.type === type);
  }, [taggedFiles]);

  const toggleTaggedFile = useCallback((
    id: string,
    name: string,
    type: 'campaign' | 'adset' | 'ad' | 'account' | 'file',
    data: TaggableData,
    metadata?: Record<string, unknown>
  ) => {
    if (isTagged(id, type)) {
      removeTaggedFile(id, type);
    } else {
      addTaggedFile(id, name, type, data, metadata);
    }
  }, [isTagged, removeTaggedFile, addTaggedFile]);

  // Helper functions for specific entity types
  const tagCampaign = useCallback((campaign: FacebookCampaign, adAccountId?: string) => {
    addTaggedFile(
      campaign.id,
      campaign.name,
      'campaign',
      campaign,
      { adAccountId, entityType: 'campaign' }
    );
  }, [addTaggedFile]);

  const tagAdSet = useCallback((adSet: FacebookAdSet, campaignId?: string) => {
    addTaggedFile(
      adSet.id,
      adSet.name,
      'adset',
      adSet,
      { campaignId, entityType: 'adset' }
    );
  }, [addTaggedFile]);

  const tagAd = useCallback((ad: FacebookAd, adSetId?: string) => {
    addTaggedFile(
      ad.id,
      ad.name,
      'ad',
      ad,
      { adSetId, entityType: 'ad' }
    );
  }, [addTaggedFile]);

  const tagAccount = useCallback((account: FacebookAdAccount) => {
    addTaggedFile(
      account.id,
      account.name,
      'account',
      account,
      { entityType: 'account' }
    );
  }, [addTaggedFile]);

  const taggedFilesSummary = useMemo(() => {
    const summary = {
      total: taggedFiles.length,
      byType: taggedFiles.reduce((acc, file) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      names: taggedFiles.map(file => file.name),
    };
    
    return summary;
  }, [taggedFiles]);

  return {
    taggedFiles,
    taggedFilesSummary,
    addTaggedFile,
    removeTaggedFile,
    clearTaggedFiles,
    isTagged,
    toggleTaggedFile,
    tagCampaign,
    tagAdSet,
    tagAd,
    tagAccount,
    setTaggedFiles,
  };
} 