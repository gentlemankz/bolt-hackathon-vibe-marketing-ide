import { useState, useCallback, useMemo } from 'react';
import { TaggedFile } from '@/lib/ai-api-client';
import { FacebookAdAccount, FacebookCampaign, FacebookAdSet, FacebookAd, LeadNurturingFile } from '@/lib/types';

// Define TaggableData type as a union of all supported data types
type TaggableData = FacebookAdAccount | FacebookCampaign | FacebookAdSet | FacebookAd | LeadNurturingFile;

export function useTaggedFiles() {
  const [taggedFiles, setTaggedFiles] = useState<TaggedFile[]>([]);

  // Add a new tagged file only if it doesn't already exist (same id and type)
  const addTaggedFile = useCallback((
    id: string,
    name: string,
    type: string,
    data: TaggableData,
    metadata?: Record<string, unknown>
  ) => {
    setTaggedFiles(prev => {
      // Check if item already exists
      const exists = prev.some(file => file.id === id && file.type === type);
      if (exists) {
        return prev;
      }

      // Create new tagged file with timestamp
      const newTaggedFile: TaggedFile = {
        id,
        name,
        type,
        content: data,
        metadata: {
          ...metadata,
          taggedAt: new Date().toISOString(),
        },
        created_at: new Date(),
      };

      return [...prev, newTaggedFile];
    });
  }, []);

  // Remove a tagged file by id and type
  const removeTaggedFile = useCallback((id: string, type: string) => {
    setTaggedFiles(prev => prev.filter(file => !(file.id === id && file.type === type)));
  }, []);

  // Clear all tagged files
  const clearTaggedFiles = useCallback(() => {
    setTaggedFiles([]);
  }, []);

  // Check if an item is already tagged
  const isTagged = useCallback((id: string, type: string) => {
    return taggedFiles.some(file => file.id === id && file.type === type);
  }, [taggedFiles]);

  // Toggle inclusion in the tagged list
  const toggleTaggedFile = useCallback((
    id: string,
    name: string,
    type: string,
    data: TaggableData,
    metadata?: Record<string, unknown>
  ) => {
    if (isTagged(id, type)) {
      removeTaggedFile(id, type);
    } else {
      addTaggedFile(id, name, type, data, metadata);
    }
  }, [isTagged, removeTaggedFile, addTaggedFile]);

  // Convenience method to tag a FacebookCampaign
  const tagCampaign = useCallback((campaign: FacebookCampaign, adAccountId?: string) => {
    const metadata = adAccountId ? { adAccountId } : undefined;
    addTaggedFile(campaign.id, campaign.name, 'campaign', campaign, metadata);
  }, [addTaggedFile]);

  // Convenience method to tag a FacebookAdSet
  const tagAdSet = useCallback((adSet: FacebookAdSet, campaignId?: string) => {
    const metadata = campaignId ? { campaignId } : undefined;
    addTaggedFile(adSet.id, adSet.name, 'adset', adSet, metadata);
  }, [addTaggedFile]);

  // Convenience method to tag a FacebookAd
  const tagAd = useCallback((ad: FacebookAd, adSetId?: string) => {
    const metadata = adSetId ? { adSetId } : undefined;
    addTaggedFile(ad.id, ad.name, 'ad', ad, metadata);
  }, [addTaggedFile]);

  // Convenience method to tag a FacebookAdAccount
  const tagAccount = useCallback((account: FacebookAdAccount) => {
    addTaggedFile(account.id, account.name, 'account', account);
  }, [addTaggedFile]);

  // Compute tagged files summary
  const taggedFilesSummary = useMemo(() => {
    const total = taggedFiles.length;
    
    // Count by type
    const byType = taggedFiles.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Extract all names
    const names = taggedFiles.map(file => file.name);

    return {
      total,
      byType,
      names,
    };
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