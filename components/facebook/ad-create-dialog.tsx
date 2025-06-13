"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, X, Image, Video, ExternalLink } from "lucide-react";
import { useCreateAd, useUploadMedia, useFacebookPages } from "@/lib/hooks/use-facebook-data";
import { 
  AdCreateRequest, 
  CTA_TYPES,
} from "@/lib/types";

interface ErrorWithResponse extends Error {
  response?: {
    data?: {
      troubleshooting?: {
        message: string;
        permissions?: string[];
        steps?: string[];
      };
    };
  };
}

interface AdCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adsetId: string;
  adsetName: string;
  adAccountId: string;
}

export function AdCreateDialog({
  open,
  onOpenChange,
  adsetId,
  adsetName,
  adAccountId,
}: AdCreateDialogProps) {
  const [formData, setFormData] = useState<{
    name: string;
    creativeName: string;
    mediaFormat: 'image' | 'video';
    primaryText: string;
    headline: string;
    description: string;
    websiteUrl: string;
    ctaType: string;
    displayLink: string;
    pageId: string;
  }>({
    name: "",
    creativeName: "",
    mediaFormat: "image",
    primaryText: "",
    headline: "",
    description: "",
    websiteUrl: "",
    ctaType: "LEARN_MORE",
    displayLink: "",
    pageId: "",
  });
  
  const [uploadedMedia, setUploadedMedia] = useState<{
    mediaId: string;
    mediaType: 'image' | 'video';
    fileName: string;
    fileSize: number;
  } | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createAdMutation = useCreateAd();
  const uploadMediaMutation = useUploadMedia();
  const pagesQuery = useFacebookPages(adAccountId);

  // Get the page ID - use manual input if available, otherwise use fetched page ID
  const pageId = formData.pageId || pagesQuery.data?.defaultPageId;
  
  // Get all available pages and Instagram accounts
  const allAccounts = [
    ...(pagesQuery.data?.pages || []),
    ...(pagesQuery.data?.instagramAccounts || [])
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    
    // Determine media type from file
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
    
    try {
      const result = await uploadMediaMutation.mutateAsync({
        file,
        adAccountId,
        mediaType,
      });
      
      setUploadedMedia({
        mediaId: result.mediaId,
        mediaType: result.mediaType,
        fileName: result.fileName,
        fileSize: result.fileSize,
      });
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        mediaFormat: mediaType,
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload media");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name?.trim()) {
      setError("Ad name is required");
      return;
    }

    if (!formData.creativeName?.trim()) {
      setError("Creative name is required");
      return;
    }

    if (!uploadedMedia) {
      setError("Please upload an image or video");
      return;
    }

    if (!formData.websiteUrl?.trim()) {
      setError("Website URL is required");
      return;
    }

    if (!pageId) {
      setError("Please select a Facebook page or Instagram account, or enter a page ID manually.");
      return;
    }

    try {
      // Prepare ad creative based on media type
      let objectStorySpec;
      
      if (uploadedMedia.mediaType === 'image') {
        objectStorySpec = {
          page_id: pageId,
          link_data: {
            link: formData.websiteUrl,
            message: formData.primaryText || undefined,
            name: formData.headline || undefined,
            description: formData.description || undefined,
            call_to_action: formData.ctaType !== 'NO_BUTTON' ? {
              type: formData.ctaType,
              value: {
                link: formData.websiteUrl,
                link_caption: formData.displayLink || undefined,
              }
            } : undefined,
            image_hash: uploadedMedia.mediaId,
          }
        };
      } else {
        objectStorySpec = {
          page_id: pageId,
          video_data: {
            video_id: uploadedMedia.mediaId,
            message: formData.primaryText || undefined,
            call_to_action: formData.ctaType !== 'NO_BUTTON' ? {
              type: formData.ctaType,
              value: {
                link: formData.websiteUrl,
                link_caption: formData.displayLink || undefined,
              }
            } : undefined,
          }
        };
      }

      const adData: AdCreateRequest = {
        name: formData.name,
        adset_id: adsetId,
        creative: {
          name: formData.creativeName,
          object_story_spec: objectStorySpec,
          degrees_of_freedom_spec: {
            creative_features_spec: {
              standard_enhancements: {
                enroll_status: 'OPT_OUT', // Disable automatic enhancements
              }
            }
          }
        },
        status: 'PAUSED',
      };

      await createAdMutation.mutateAsync({
        adsetId,
        adData,
      });

      // Reset form and close dialog
      setFormData({
        name: "",
        creativeName: "",
        mediaFormat: "image",
        primaryText: "",
        headline: "",
        description: "",
        websiteUrl: "",
        ctaType: "LEARN_MORE",
        displayLink: "",
        pageId: "",
      });
      setUploadedMedia(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ad");
    }
  };

  const removeMedia = () => {
    setUploadedMedia(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Ad</DialogTitle>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Ad Set: {adsetName}
            </p>
            {pagesQuery.isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-xs text-muted-foreground">Loading Facebook pages and Instagram accounts...</span>
              </div>
            ) : pagesQuery.data?.defaultPageName ? (
              <p className="text-xs text-muted-foreground">
                {pagesQuery.data.defaultPageType === 'instagram_account' ? 'Instagram' : 'Page'}: {pagesQuery.data.defaultPageName}
                {pagesQuery.data.totalAccounts > 1 && (
                  <span className="ml-1 text-blue-600">
                    (+{pagesQuery.data.totalAccounts - 1} more available)
                  </span>
                )}
              </p>
            ) : pagesQuery.error ? (
              <div className="space-y-1">
                <p className="text-xs text-orange-600">
                  Could not auto-detect pages. Please enter page ID manually below.
                </p>
                {pagesQuery.error && 'response' in pagesQuery.error && (pagesQuery.error as ErrorWithResponse)?.response?.data?.troubleshooting && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:underline">
                      View troubleshooting steps
                    </summary>
                    <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                      <p className="font-medium text-blue-800 mb-2">
                        {(pagesQuery.error as ErrorWithResponse).response?.data?.troubleshooting?.message}
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        {(pagesQuery.error as ErrorWithResponse).response?.data?.troubleshooting?.permissions?.map((permission: string, index: number) => (
                          <li key={index} className="font-mono text-xs">{permission}</li>
                        ))}
                      </ul>
                      <div className="mt-2 space-y-1">
                        {(pagesQuery.error as ErrorWithResponse).response?.data?.troubleshooting?.steps?.map((step: string, index: number) => (
                          <p key={index} className="text-xs">{step}</p>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-xs text-orange-600">
                No Facebook pages or Instagram accounts found. Please enter page ID manually below.
              </p>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ad-name">Ad Name *</Label>
                <Input
                  id="ad-name"
                  placeholder="Enter ad name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={createAdMutation.isPending}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="creative-name">Creative Name *</Label>
                <Input
                  id="creative-name"
                  placeholder="Enter creative name"
                  value={formData.creativeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, creativeName: e.target.value }))}
                  disabled={createAdMutation.isPending}
                />
              </div>
            </div>

            {/* Page/Instagram Account Selection */}
            {allAccounts.length > 1 ? (
              <div className="space-y-2">
                <Label htmlFor="page-select">Facebook Page / Instagram Account *</Label>
                <Select
                  value={formData.pageId || pagesQuery.data?.defaultPageId || ""}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pageId: value }))}
                  disabled={createAdMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a page or Instagram account" />
                  </SelectTrigger>
                  <SelectContent>
                    {pagesQuery.data?.pages?.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600 text-xs">FB</span>
                          <span>{page.name}</span>
                          <span className="text-xs text-muted-foreground">({page.category})</span>
                        </div>
                      </SelectItem>
                    ))}
                    {pagesQuery.data?.instagramAccounts?.map((ig) => (
                      <SelectItem key={ig.id} value={ig.id}>
                        <div className="flex items-center space-x-2">
                          <span className="text-pink-600 text-xs">IG</span>
                          <span>{ig.name || ig.username}</span>
                          {ig.username && <span className="text-xs text-muted-foreground">@{ig.username}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the Facebook page or Instagram account for your ad
                </p>
              </div>
            ) : allAccounts.length === 1 ? (
              <div className="space-y-2">
                <Label>Facebook Page / Instagram Account</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${pagesQuery.data?.defaultPageType === 'instagram_account' ? 'text-pink-600' : 'text-blue-600'}`}>
                      {pagesQuery.data?.defaultPageType === 'instagram_account' ? 'IG' : 'FB'}
                    </span>
                    <span className="font-medium">{pagesQuery.data?.defaultPageName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically selected
                  </p>
                </div>
              </div>
            ) : (
              /* Manual Page ID Input - show if no accounts found */
              (pagesQuery.error || (!pagesQuery.isLoading && allAccounts.length === 0)) && (
                <div className="space-y-2">
                  <Label htmlFor="page-id">Facebook Page ID *</Label>
                  <Input
                    id="page-id"
                    placeholder="Enter your Facebook page ID (e.g., 123456789)"
                    value={formData.pageId}
                    onChange={(e) => setFormData(prev => ({ ...prev, pageId: e.target.value }))}
                    disabled={createAdMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can find your page ID in Facebook Page Settings → Page Info, or{" "}
                    <a 
                      href="https://www.facebook.com/help/1503421039731588" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      follow this guide
                    </a>
                  </p>
                </div>
              )
            )}
          </div>

          {/* Media Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Media</h3>
            
            {!uploadedMedia ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Upload className="h-12 w-12 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium">Upload Media</h4>
                      <p className="text-sm text-muted-foreground">
                        Images: JPG, PNG, GIF (max 30MB)<br />
                        Videos: MP4, MOV, AVI (max 4GB)
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMediaMutation.isPending}
                    >
                      {uploadMediaMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {uploadedMedia.mediaType === 'image' ? (
                      <Image className="h-8 w-8 text-blue-500" aria-label="Image file" />
                    ) : (
                      <Video className="h-8 w-8 text-green-500" aria-label="Video file" />
                    )}
                    <div>
                      <p className="font-medium">{uploadedMedia.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(uploadedMedia.fileSize)} • {uploadedMedia.mediaType}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeMedia}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Creative Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Creative Content</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-text">Primary Text</Label>
                <Textarea
                  id="primary-text"
                  placeholder="Write your main ad copy here..."
                  value={formData.primaryText}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryText: e.target.value }))}
                  disabled={createAdMutation.isPending}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  The main text that appears with your ad
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    placeholder="Enter headline"
                    value={formData.headline}
                    onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                    disabled={createAdMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bold text that appears below your ad
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Enter description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={createAdMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional text below the headline
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Destination & CTA */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Destination & Call-to-Action</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website-url">Website URL *</Label>
                <div className="relative">
                  <Input
                    id="website-url"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                    disabled={createAdMutation.isPending}
                    className="pr-10"
                  />
                  <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Where people will go when they click your ad
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cta-type">Call-to-Action Button</Label>
                  <Select
                    value={formData.ctaType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ctaType: value }))}
                    disabled={createAdMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTA_TYPES.map((cta) => (
                        <SelectItem key={cta.value} value={cta.value}>
                          {cta.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="display-link">Display Link</Label>
                  <Input
                    id="display-link"
                    placeholder="example.com/page"
                    value={formData.displayLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, displayLink: e.target.value }))}
                    disabled={createAdMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Custom text to display as the link
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAdMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createAdMutation.isPending || 
                !formData.name?.trim() || 
                !formData.creativeName?.trim() ||
                !uploadedMedia ||
                !formData.websiteUrl?.trim() ||
                !pageId
              }
            >
              {createAdMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Ad
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 